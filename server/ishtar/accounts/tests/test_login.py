from unittest.mock import patch

from allauth.account.adapter import DefaultAccountAdapter
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

REQUEST = '/_allauth/browser/v1/auth/code/request'
CONFIRM = '/_allauth/browser/v1/auth/code/confirm'
SESSION = '/_allauth/browser/v1/auth/session'


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class LoginByCodeTests(TestCase):
    def setUp(self):
        # allauth's rate limiter lives in Django's cache (settings.py has no
        # CACHES override, so it's the process-wide LocMemCache), which
        # Django's TestCase does not reset between tests on its own. Every
        # test in this class hits the same 'request_login_code' IP bucket via
        # the shared test-client IP, so without this, an earlier test's real
        # ratelimit.consume() calls would silently shrink the headroom a later
        # test (e.g. test_rate_limited_request_creates_no_user_row) sees --
        # exactly the kind of cross-test, order-dependent flakiness a
        # rate-limit test must not have.
        cache.clear()

    def request_code(self, email):
        with patch.object(DefaultAccountAdapter, 'generate_login_code', return_value='ABCDEF'):
            return self.client.post(REQUEST, {'email': email}, content_type='application/json')

    def test_unknown_email_receives_code_and_signs_up_on_confirm(self):
        response = self.request_code('New@Example.com')
        self.assertEqual(response.status_code, 401)
        # Exactly one row for the request, not zero (the fix's gate must let a
        # well-formed, non-rate-limited unknown address through) and not more
        # than one (get_or_create must not be called more than once per email).
        self.assertEqual(get_user_model().objects.count(), 1)
        flows = response.json()['data']['flows']
        self.assertTrue(any(f['id'] == 'login_by_code' and f.get('is_pending') for f in flows))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['new@example.com'])
        self.assertIn('ABCDEF', mail.outbox[0].body)
        confirm = self.client.post(CONFIRM, {'code': 'ABCDEF'}, content_type='application/json')
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(confirm.json()['data']['user']['email'], 'new@example.com')
        # Locks in the single-write fix: make_password(None) must leave the new
        # account with an unusable password, not the '' that a bare
        # get_or_create() (with no `defaults`) would have left behind.
        self.assertFalse(confirm.json()['data']['user']['has_usable_password'])
        self.assertTrue(get_user_model().objects.filter(email='new@example.com').exists())
        self.assertEqual(self.client.get(SESSION).status_code, 200)

    def test_existing_user_signs_in(self):
        get_user_model().objects.create_user('reader@example.com')
        self.request_code('reader@example.com')
        confirm = self.client.post(CONFIRM, {'code': 'abcdef'}, content_type='application/json')
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_wrong_code_is_rejected_and_attempts_are_limited(self):
        self.request_code('reader@example.com')
        for _ in range(3):
            bad = self.client.post(CONFIRM, {'code': 'ZZZZZZ'}, content_type='application/json')
            self.assertIn(bad.status_code, (400, 409))
        again = self.client.post(CONFIRM, {'code': 'ABCDEF'}, content_type='application/json')
        self.assertNotEqual(again.status_code, 200)
        self.assertEqual(self.client.get(SESSION).status_code, 401)

    def test_confirm_without_request_is_not_pending(self):
        response = self.client.post(CONFIRM, {'code': 'ABCDEF'}, content_type='application/json')
        self.assertEqual(response.status_code, 409)

    def test_logout(self):
        self.request_code('reader@example.com')
        self.client.post(CONFIRM, {'code': 'ABCDEF'}, content_type='application/json')
        self.assertEqual(self.client.delete(SESSION).status_code, 401)
        self.assertEqual(self.client.get(SESSION).status_code, 401)

    def test_invalid_email_is_a_400(self):
        response = self.client.post(REQUEST, {'email': 'not-an-email'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['errors'][0]['param'], 'email')

    def test_malformed_email_with_at_sign_creates_no_user(self):
        # "foo@" contains "@", so the pre-fix `'@' in email` prefilter alone
        # would have created a junk row for it, even though allauth's own
        # EmailField rejects it with the same 400 shape as "not-an-email" in
        # test_invalid_email_is_a_400 above. The dispatch() gate now runs
        # Django's validate_email() first, so no row should be left behind.
        response = self.client.post(REQUEST, {'email': 'foo@'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['errors'][0]['param'], 'email')
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_rate_limited_request_creates_no_user_row(self):
        # ACCOUNT_RATE_LIMITS['request_login_code'] defaults to "20/m/ip,3/m/key"
        # (allauth/account/app_settings.py) and isn't overridden in settings.py.
        # Distinct emails keep the per-key (3/m) bucket out of play, so 20 real
        # requests from this test client (one shared IP under the Django test
        # client's default REMOTE_ADDR) exactly exhausts the per-IP (20/m)
        # bucket. This depends only on issuing fewer than 20 requests' worth of
        # work before the 60-second window rolls over -- true by a wide margin
        # for a few dozen in-process test requests -- not on any sleep or race
        # against a timer, so it isn't wall-clock-flaky.
        self.addCleanup(cache.clear)  # don't leak an exhausted bucket into other tests
        for i in range(20):
            self.request_code(f'ratelimit{i}@example.com')
        self.assertEqual(get_user_model().objects.count(), 20)
        overflow = self.request_code('ratelimit-overflow@example.com')
        self.assertEqual(overflow.status_code, 400)
        self.assertEqual(overflow.json()['errors'][0]['code'], 'too_many_login_attempts')
        self.assertEqual(get_user_model().objects.count(), 20)
        self.assertFalse(
            get_user_model().objects.filter(email='ratelimit-overflow@example.com').exists()
        )
