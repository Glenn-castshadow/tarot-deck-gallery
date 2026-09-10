import json

from django.core.paginator import Paginator
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from ishtar.api import auth_required, error, json_view
from .models import Reading

KINDS = {k for k, _ in Reading.KINDS}
CREATE_KEYS = {'kind', 'deck', 'layout', 'question', 'focus', 'payload'}
PAYLOAD_MAX_BYTES = 8 * 1024
NOTE_MAX = 4000
PER_USER_CAP = 500
PAGE_SIZE = 50


def serialize(reading, with_payload=False):
    row = {'id': reading.id, 'kind': reading.kind, 'deck': reading.deck, 'layout': reading.layout,
           'question': reading.question, 'focus': reading.focus, 'note': reading.note,
           'created_at': reading.created_at.isoformat()}
    if with_payload:
        row['payload'] = reading.payload
    return row


def text(value, limit, name):
    if value is None:
        return ''
    if not isinstance(value, str):
        raise ValueError(f'{name} must be text.')
    if len(value) > limit:
        raise ValueError(f'{name} is too long (limit {limit} characters).')
    return value.strip()


@json_view(methods=('GET', 'POST'))
@auth_required
def collection(request):
    if request.method == 'GET':
        paginator = Paginator(Reading.objects.filter(user=request.user), PAGE_SIZE)
        try:
            page = paginator.page(int(request.GET.get('page', '1')))
        except (ValueError, Exception):
            return error('That page does not exist.', 404)
        return JsonResponse({'readings': [serialize(r) for r in page.object_list], 'page': page.number,
                             'pages': paginator.num_pages, 'count': paginator.count})
    body = request.json
    if set(body) - CREATE_KEYS or 'kind' not in body or 'payload' not in body:
        return error('Send kind, payload and optional deck, layout, question, focus.')
    if body['kind'] not in KINDS:
        return error('Unknown reading kind.')
    if not isinstance(body['payload'], dict) or len(json.dumps(body['payload'])) > PAYLOAD_MAX_BYTES:
        return error('The reading payload must be an object under 8 KB.')
    try:
        fields = {'deck': text(body.get('deck'), 40, 'Deck'), 'layout': text(body.get('layout'), 40, 'Layout'),
                  'question': text(body.get('question'), 240, 'Question'), 'focus': text(body.get('focus'), 40, 'Focus')}
    except ValueError as exc:
        return error(str(exc))
    # Wrapped in one atomic block so the cap check and the insert are not two
    # independent transactions: settings.py opens SQLite transactions in
    # IMMEDIATE mode, so a concurrent request's atomic() block queues behind
    # this one (up to the configured busy_timeout) instead of both reading the
    # same pre-insert count and both slipping past the cap.
    with transaction.atomic():
        if Reading.objects.filter(user=request.user).count() >= PER_USER_CAP:
            return error('Your journal is full. Delete a saved reading to make room.', 409)
        reading = Reading.objects.create(user=request.user, kind=body['kind'], payload=body['payload'], **fields)
    return JsonResponse(serialize(reading, with_payload=True), status=201)


@json_view(methods=('GET', 'PATCH', 'DELETE'))
@auth_required
def item(request, reading_id):
    reading = get_object_or_404(Reading, id=reading_id, user=request.user)
    if request.method == 'GET':
        return JsonResponse(serialize(reading, with_payload=True))
    if request.method == 'DELETE':
        reading.delete()
        return JsonResponse({'ok': True})
    if set(request.json) != {'note'}:
        return error('Only the note can be changed.')
    try:
        reading.note = text(request.json['note'], NOTE_MAX, 'Note')
    except ValueError as exc:
        return error(str(exc))
    reading.save(update_fields=['note'])
    return JsonResponse(serialize(reading, with_payload=True))
