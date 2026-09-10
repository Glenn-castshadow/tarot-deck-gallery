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
"""
import json

from allauth.headless.account.views import RequestLoginCodeView
from django.contrib.auth import get_user_model


class SignupOrRequestLoginCodeView(RequestLoginCodeView):
    def dispatch(self, request, *args, **kwargs):
        if request.method == 'POST':
            try:
                data = json.loads(request.body or b'{}')
            except (ValueError, UnicodeDecodeError):
                data = None
            email = data.get('email') if isinstance(data, dict) else None
            if isinstance(email, str) and '@' in email:
                user, created = get_user_model().objects.get_or_create(email=email.strip().lower())
                if created:
                    # get_or_create() constructs the model directly, bypassing
                    # UserManager.create_user() -- so the password field is left
                    # as '' rather than properly marked unusable. An empty
                    # string is not None and doesn't start with Django's "!"
                    # unusable-password prefix, so has_usable_password() (which
                    # the headless API exposes verbatim) would wrongly report
                    # True for a passwordless account. Mark it explicitly.
                    user.set_unusable_password()
                    user.save(update_fields=['password'])
        return super().dispatch(request, *args, **kwargs)
