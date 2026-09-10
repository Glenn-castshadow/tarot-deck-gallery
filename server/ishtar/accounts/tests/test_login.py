from unittest.mock import patch

from allauth.account.adapter import DefaultAccountAdapter
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

REQUEST = '/_allauth/browser/v1/auth/code/request'
CONFIRM = '/_allauth/browser/v1/auth/code/confirm'
SESSION = '/_allauth/browser/v1/auth/session'


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class LoginByCodeTests(TestCase):
    def request_code(self, email):
        with patch.object(DefaultAccountAdapter, 'generate_login_code', return_value='ABCDEF'):
            return self.client.post(REQUEST, {'email': email}, content_type='application/json')

    def test_unknown_email_receives_code_and_signs_up_on_confirm(self):
        response = self.request_code('New@Example.com')
        self.assertEqual(response.status_code, 401)
        flows = response.json()['data']['flows']
        self.assertTrue(any(f['id'] == 'login_by_code' and f.get('is_pending') for f in flows))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['new@example.com'])
        self.assertIn('ABCDEF', mail.outbox[0].body)
        confirm = self.client.post(CONFIRM, {'code': 'ABCDEF'}, content_type='application/json')
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(confirm.json()['data']['user']['email'], 'new@example.com')
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
