"""Views that patch a narrow gap in allauth headless's login-by-code flow.

allauth's own ``RequestLoginCodeForm.clean_email`` (allauth/account/forms.py)
looks up the user by email during input validation, which Django runs inside
``dispatch()`` before any ``post()`` method -- ours or allauth's own -- ever
executes. For an email with no matching user, that lookup leaves ``self._user``
as ``None``, and the login-by-code flow then sends allauth's enumeration-safe
"unknown account" notice instead of a real code, and never creates a user. An
``AccountAdapter.send_mail`` override cannot fix this: it never even sees the
``login_code`` template for an unknown address, because the flow branches on
that same ``None`` user before send_mail is called at all (verified against
allauth 65.19.2 by probing both hooks against server/ishtar/accounts/tests/test_login.py).

So the fix has to run earlier than allauth's own view code: create the user in
``dispatch()``, before ``super().dispatch()`` hands off to input validation.
Once the user row exists, allauth's own lookup (filter_users_by_email) finds it
via the plain User table query, and the rest of the built-in flow -- sending
the real login code, confirming it, signing in -- proceeds unmodified.

Row creation is gated on two checks, so an anonymous caller cannot use this
pre-create step to persist unlimited junk rows, or to create a permanent
account for a third party's real address and cause them to receive an
unsolicited login-code email:

- ``django.core.validators.validate_email`` -- the same well-formedness check
  Django's own ``EmailField`` applies -- runs before we touch the database.
  ``RequestLoginCodeForm``'s ``EmailField`` rejects a malformed address (e.g.
  ``"foo@"``) with a 400 further down, inside ``super().dispatch()``, no
  matter what we do here; this just makes sure we don't leave a row behind
  for an address that is about to be rejected anyway.
- ``allauth.core.ratelimit.consume(..., dry_run=True)`` -- a read-only peek at
  allauth's own already-configured ``request_login_code`` bucket
  (``ACCOUNT_RATE_LIMITS``, default ``"20/m/ip,3/m/key"``). The real
  consumption still happens downstream, in ``RequestLoginCodeForm.clean_email``
  (``allauth/account/forms.py``), which is what actually enforces the limit --
  our dry run only decides whether creating a row here is still worthwhile.
  Consulting rather than consuming means we never halve the effective limit
  for legitimate callers.

Neither check changes what ``super().dispatch()`` returns: this view never
short-circuits or builds its own response, so a request that skips row
creation (bad format, or the bucket already exhausted) gets exactly the
response allauth would have produced anyway. That is also what keeps known
and unknown emails on the same code path -- the anti-enumeration property the
Task 2 review verified.
"""
import json

from allauth.core import ratelimit
from allauth.headless.account.views import RequestLoginCodeView
from django.contrib.auth import get_user_model, logout
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from ishtar.api import auth_required, error, json_byte_size, json_view
from .models import Entitlement, Profile

PROFILE_KEYS = {'birthday', 'time', 'place', 'placeLocation', 'houseSystem', 'orbScale', 'fold'}
PROFILE_MAX_BYTES = 4 * 1024


class SignupOrRequestLoginCodeView(RequestLoginCodeView):
    def dispatch(self, request, *args, **kwargs):
        if request.method == 'POST':
            try:
                data = json.loads(request.body or b'{}')
            except RecursionError:
                # allauth's own RESTView._parse_json (allauth/headless/internal/
                # restkit/views.py) independently re-parses request.body inside
                # super().dispatch() below, and its except clause only catches
                # (UnicodeDecodeError, json.JSONDecodeError) -- not RecursionError.
                # Left alone, the same hostile body blows the recursion limit a
                # second time, a few stack frames deeper, and crashes there
                # instead (confirmed empirically: identical traceback shape, from
                # allauth/headless/internal/restkit/views.py:62 rather than the
                # line below). request.body is a cached property
                # (django.http.request.HttpRequest.body sets self._body once and
                # returns that same value on every later read), so overwriting
                # the cache with the same empty-object fallback already used
                # above stops the second parse from ever seeing those bytes
                # again. Scoped to RecursionError only: allauth's own _parse_json
                # already handles ValueError/UnicodeDecodeError without crashing,
                # so those keep producing exactly the response they do today.
                request._body = b'{}'
                data = None
            except (ValueError, UnicodeDecodeError):
                data = None
            raw_email = data.get('email') if isinstance(data, dict) else None
            email = None
            if isinstance(raw_email, str):
                candidate = raw_email.strip().lower()
                try:
                    validate_email(candidate)
                    email = candidate
                except ValidationError:
                    pass  # malformed -- super().dispatch() below produces the 400, no row.
            if email and ratelimit.consume(
                request, action='request_login_code', key=email, dry_run=True,
            ):
                # Single atomic write: make_password(None) is the same "!"-prefixed
                # unusable-password value UserManager.create_user() writes via
                # set_unusable_password(), so has_usable_password() is False from
                # the moment the row exists, instead of a separate save() leaving
                # a brief window where the row has password=''.
                get_user_model().objects.get_or_create(
                    email=email, defaults={'password': make_password(None)},
                )
        return super().dispatch(request, *args, **kwargs)


def account_summary(user):
    profile = Profile.objects.filter(user=user).first()
    return {
        'email': user.email,
        'features': Entitlement.objects.active_features(user),
        'profile': profile.data if profile else None,
        'newsletter': Subscriber.objects.filter(email=user.email).exists(),
    }


@ensure_csrf_cookie
@require_http_methods(['GET'])
@auth_required
def account(request):
    return JsonResponse(account_summary(request.user))


def validate_profile(data):
    if not isinstance(data, dict):
        return 'A profile object is required.'
    extra = set(data) - PROFILE_KEYS
    if extra:
        return 'Unexpected profile fields: ' + ', '.join(sorted(extra)) + '.'
    try:
        oversized = json_byte_size(data) > PROFILE_MAX_BYTES
    except ValueError:
        # data contains text that cannot be encoded as UTF-8 (e.g. a lone
        # surrogate that survived json.loads -- see json_byte_size's
        # docstring in ishtar/api.py). Not valid content either way, so it
        # gets the same message an oversize profile gets, rather than
        # propagating as an uncaught 500.
        oversized = True
    if oversized:
        return 'The profile is too large to save.'
    return None


@json_view(methods=('PUT', 'DELETE'))
@auth_required
def profile(request):
    if request.method == 'DELETE':
        Profile.objects.filter(user=request.user).delete()
        return JsonResponse({'ok': True})
    message = validate_profile(request.json)
    if message:
        return error(message)
    saved, _ = Profile.objects.update_or_create(user=request.user, defaults={'data': request.json, 'version': 1})
    return JsonResponse({'ok': True, 'updated_at': saved.updated_at.isoformat()})


from newsletter.models import Subscriber
from newsletter.views import subscribe_email


@json_view(methods=('POST',))
@auth_required
def newsletter(request):
    if set(request.json) != {'subscribed'} or not isinstance(request.json['subscribed'], bool):
        return error('Send {"subscribed": true or false}.')
    if request.json['subscribed']:
        subscribe_email(request.user.email)
    else:
        Subscriber.objects.filter(email=request.user.email).delete()
    return JsonResponse({'ok': True, 'newsletter': request.json['subscribed']})


@json_view(methods=('POST',))
@auth_required
def delete_account(request):
    if request.json.get('confirm') is not True:
        return error('Confirm deletion to continue.')
    user = request.user
    logout(request)
    user.delete()
    return JsonResponse({'ok': True})
