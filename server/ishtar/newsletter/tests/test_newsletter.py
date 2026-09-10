import io
import sqlite3
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from newsletter.models import Subscriber

ORIGIN = 'https://ishtarinsights.com'
PAYLOAD = {'email': 'Test@example.com', 'consent': True, 'consentVersion': '2026-09-09-v1'}


@override_settings(NEWSLETTER_ORIGINS={ORIGIN})
class PublicNewsletterTests(TestCase):
    def post(self, path, body, origin=ORIGIN, content_type='application/json'):
        return self.client.post(path, body, content_type=content_type, HTTP_ORIGIN=origin)

    def test_subscribe_is_idempotent_and_records_consent(self):
        for _ in range(2):
            response = self.post('/api/newsletter/subscribe', PAYLOAD)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {'ok': True})
        rows = list(Subscriber.objects.all())
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].email, 'test@example.com')
        self.assertEqual(rows[0].consent_version, '2026-09-09-v1')
        self.assertEqual(len(rows[0].unsubscribe_token), 43)

    def test_validation_matches_old_service(self):
        for bad in [dict(PAYLOAD, consent=False), dict(PAYLOAD, birthday='1990-01-01'), dict(PAYLOAD, email='bad'), dict(PAYLOAD, consentVersion='old')]:
            self.assertEqual(self.post('/api/newsletter/subscribe', bad).status_code, 400)
        self.assertEqual(self.post('/api/newsletter/subscribe', PAYLOAD, origin='https://evil.example').status_code, 403)
        self.assertEqual(self.post('/api/newsletter/subscribe', 'email=x', content_type='application/x-www-form-urlencoded').status_code, 415)
        self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, email='a' * 1100 + '@example.com')).status_code, 413)

    def test_unsubscribe_by_token_and_email(self):
        self.post('/api/newsletter/subscribe', PAYLOAD)
        token = Subscriber.objects.get().unsubscribe_token
        self.assertEqual(self.post('/api/newsletter/unsubscribe', {'token': token}).json(), {'ok': True})
        self.assertEqual(Subscriber.objects.count(), 0)
        self.post('/api/newsletter/subscribe', PAYLOAD)
        self.assertEqual(self.post('/api/newsletter/unsubscribe', {'email': 'Test@example.com'}).status_code, 200)
        self.assertEqual(Subscriber.objects.count(), 0)
        self.assertEqual(self.post('/api/newsletter/unsubscribe', {'token': 'short'}).status_code, 400)


class AccountNewsletterTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(self.user)

    def test_toggle_reflects_in_summary(self):
        self.assertFalse(self.client.get('/api/account/').json()['newsletter'])
        on = self.client.post('/api/account/newsletter/', {'subscribed': True}, content_type='application/json')
        self.assertEqual(on.json(), {'ok': True, 'newsletter': True})
        self.assertTrue(Subscriber.objects.filter(email='reader@example.com').exists())
        self.assertTrue(self.client.get('/api/account/').json()['newsletter'])
        off = self.client.post('/api/account/newsletter/', {'subscribed': False}, content_type='application/json')
        self.assertEqual(off.json(), {'ok': True, 'newsletter': False})
        self.assertFalse(Subscriber.objects.exists())

    def test_toggle_validation(self):
        self.assertEqual(self.client.post('/api/account/newsletter/', {'subscribed': 'yes'}, content_type='application/json').status_code, 400)


class ImportExportTests(TestCase):
    def test_import_is_idempotent_and_export_lists_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            old = Path(tmp) / 'subscribers.sqlite3'
            db = sqlite3.connect(old)
            db.execute('CREATE TABLE subscribers (email TEXT PRIMARY KEY, consent_at TEXT NOT NULL, consent_version TEXT NOT NULL, consent_text TEXT NOT NULL, unsubscribe_token TEXT NOT NULL UNIQUE)')
            db.execute('INSERT INTO subscribers VALUES (?, ?, ?, ?, ?)',
                       ('old@example.com', '2026-09-09T18:00:00+00:00', '2026-09-09-v1', 'consent', 'A' * 43))
            db.commit(); db.close()
            out = io.StringIO()
            call_command('import_subscribers', str(old), stdout=out)
            call_command('import_subscribers', str(old), stdout=out)
        self.assertEqual(Subscriber.objects.count(), 1)
        self.assertIn('imported 1', out.getvalue())
        self.assertIn('imported 0', out.getvalue())
        csv_out = io.StringIO()
        call_command('export_subscribers', stdout=csv_out)
        self.assertIn('old@example.com', csv_out.getvalue())
        self.assertIn('https://ishtarinsights.com/unsubscribe.html#' + 'A' * 43, csv_out.getvalue())
