"""Public newsletter endpoints preserving the contract of the retired server/newsletter.py."""
import json
import re

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Subscriber

EMAIL = re.compile(r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+\Z")
TOKEN = re.compile(r'[A-Za-z0-9_-]{43}')
MAX_BODY = 1024


def clean_email(value):
    if not isinstance(value, str):
        raise ValueError('Enter a valid email address.')
    value = value.strip().lower()
    if len(value) > 254 or not EMAIL.fullmatch(value) or len(value.split('@')[0]) > 64:
        raise ValueError('Enter a valid email address.')
    return value


def subscribe_email(email):
    """Idempotent insert used by both the public endpoint and the account toggle."""
    Subscriber.objects.get_or_create(email=email, defaults={
        'consent_at': timezone.now(),
        'consent_version': settings.NEWSLETTER_CONSENT_VERSION,
        'consent_text': settings.NEWSLETTER_CONSENT_TEXT,
    })


def subscribe(data):
    if not isinstance(data, dict) or set(data) != {'email', 'consent', 'consentVersion'}:
        raise ValueError('Please submit only an email and signup permission.')
    email = clean_email(data['email'])
    if data['consent'] is not True or data['consentVersion'] != settings.NEWSLETTER_CONSENT_VERSION:
        raise ValueError('Please check the newsletter permission box.')
    subscribe_email(email)
    return {'ok': True}


def unsubscribe(data):
    if isinstance(data, dict) and set(data) == {'email'}:
        Subscriber.objects.filter(email=clean_email(data['email'])).delete()
        return {'ok': True}
    if not isinstance(data, dict) or set(data) != {'token'} or not isinstance(data['token'], str) or not TOKEN.fullmatch(data['token']):
        raise ValueError('Use the full unsubscribe link provided with your email.')
    Subscriber.objects.filter(unsubscribe_token=data['token']).delete()
    return {'ok': True}


def public(handler):
    @csrf_exempt
    @require_POST
    def view(request):
        # The Origin allowlist is the CSRF defence for these token-less public posts.
        if request.headers.get('Origin') not in settings.NEWSLETTER_ORIGINS:
            return JsonResponse({'error': 'Please use the form on Ishtar Insights.'}, status=403)
        if request.content_type != 'application/json':
            return JsonResponse({'error': 'JSON required.'}, status=415)
        if not request.body or len(request.body) > MAX_BODY:
            return JsonResponse({'error': 'Invalid request size.'}, status=413)
        try:
            return JsonResponse(handler(json.loads(request.body)))
        except (ValueError, UnicodeError):
            return JsonResponse({'error': 'Check your email and newsletter permission, then try again.'}, status=400)
    return view


subscribe_view = public(subscribe)
unsubscribe_view = public(unsubscribe)
