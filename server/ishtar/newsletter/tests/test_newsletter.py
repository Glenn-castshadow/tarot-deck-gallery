import io
import sqlite3
import tempfile
from pathlib import Path
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from newsletter.models import Subscriber
from newsletter.views import MAX_BODY

ORIGIN = 'https://ishtarinsights.com'
PAYLOAD = {'email': 'Test@example.com', 'consent': True, 'consentVersion': '2026-09-18-v2'}


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
        self.assertEqual(rows[0].consent_version, '2026-09-18-v2')
        self.assertEqual(len(rows[0].unsubscribe_token), 43)

    def test_validation_matches_old_service(self):
        for bad in [dict(PAYLOAD, consent=False), dict(PAYLOAD, birthday='1990-01-01'), dict(PAYLOAD, email='bad'), dict(PAYLOAD, consentVersion='old')]:
            self.assertEqual(self.post('/api/newsletter/subscribe', bad).status_code, 400)
        self.assertEqual(self.post('/api/newsletter/subscribe', PAYLOAD, origin='https://evil.example').status_code, 403)
        self.assertEqual(self.post('/api/newsletter/subscribe', 'email=x', content_type='application/x-www-form-urlencoded').status_code, 415)
        self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, email='a' * 1100 + '@example.com')).status_code, 413)

        # Combined violations pin the full Origin -> content-type -> size ordering.
        # Each single-violation assertion above only ever breaks one rule, so none of
        # them would fail if any two checks were swapped -- these three send two
        # violations at once each, so the assertion only passes if the earlier-in-order
        # rule wins over the later one:
        #   - foreign origin + oversize body must stay 403, not 413        (Origin < size)
        #   - wrong content-type + oversize body must stay 415, not 413    (content-type < size)
        #   - foreign origin + wrong content-type must stay 403, not 415   (Origin < content-type)
        # A 3-step chain has exactly three pairwise orderings; pinning all three forces
        # the one order consistent with them all (Origin, then content-type, then size),
        # which is what makes this the full chain and not just "size loses to everything".
        # Each request is checked against the request Django actually built (not just the
        # payload passed in) before trusting its response, since the Django test client
        # only sets CONTENT_LENGTH/CONTENT_TYPE when the body is truthy.
        foreign_and_oversize = self.post('/api/newsletter/subscribe', dict(PAYLOAD, email='a' * 1100 + '@example.com'), origin='https://evil.example')
        self.assertGreater(len(foreign_and_oversize.wsgi_request.body), MAX_BODY)
        self.assertEqual(foreign_and_oversize.status_code, 403)

        wrong_type_and_oversize = self.post('/api/newsletter/subscribe', 'x=' + 'a' * 1100, content_type='application/x-www-form-urlencoded')
        self.assertEqual(wrong_type_and_oversize.wsgi_request.content_type, 'application/x-www-form-urlencoded')
        self.assertGreater(len(wrong_type_and_oversize.wsgi_request.body), MAX_BODY)
        self.assertEqual(wrong_type_and_oversize.status_code, 415)

        foreign_and_wrong_type = self.post('/api/newsletter/subscribe', 'x=1', origin='https://evil.example', content_type='application/x-www-form-urlencoded')
        self.assertEqual(foreign_and_wrong_type.wsgi_request.content_type, 'application/x-www-form-urlencoded')
        self.assertLessEqual(len(foreign_and_wrong_type.wsgi_request.body), MAX_BODY)
        self.assertEqual(foreign_and_wrong_type.status_code, 403)

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


@override_settings(NEWSLETTER_ORIGINS={ORIGIN})
class MailchimpHookTests(TestCase):
    def post(self, path, body):
        return self.client.post(path, body, content_type='application/json', HTTP_ORIGIN=ORIGIN)

    def test_subscribe_stores_the_sign_and_pushes_with_resubscribe(self):
        with mock.patch('newsletter.mailchimp.push') as push:
            self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign='leo')).status_code, 200)
        row = Subscriber.objects.get(email='test@example.com')
        self.assertEqual(row.sun_sign, 'leo')
        push.assert_called_once_with(row, resubscribe=True)

    def test_repeat_signup_updates_the_sign_but_a_blank_one_keeps_it(self):
        with mock.patch('newsletter.mailchimp.push'):
            self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign='leo'))
            self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign='virgo'))
            self.assertEqual(Subscriber.objects.get().sun_sign, 'virgo')
            self.post('/api/newsletter/subscribe', PAYLOAD)
            self.assertEqual(Subscriber.objects.get().sun_sign, 'virgo')

    def test_a_sign_outside_the_twelve_is_rejected_and_nothing_is_stored(self):
        with mock.patch('newsletter.mailchimp.push') as push:
            for bad in ['Leo', 'ophiuchus', '', 5, None]:
                self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, sunSign=bad)).status_code, 400)
        self.assertEqual(Subscriber.objects.count(), 0)
        push.assert_not_called()

    def test_signup_survives_a_mailchimp_failure_and_logs_no_address(self):
        with mock.patch('newsletter.mailchimp.push', side_effect=RuntimeError('test@example.com down')), \
                self.assertLogs('newsletter', level='WARNING') as logs:
            self.assertEqual(self.post('/api/newsletter/subscribe', PAYLOAD).json(), {'ok': True})
        self.assertTrue(Subscriber.objects.filter(email='test@example.com').exists())
        self.assertNotIn('test@example.com', ''.join(logs.output))

    def test_unsubscribe_by_email_and_by_token_both_remove_the_address(self):
        for key in ('email', 'token'):
            with mock.patch('newsletter.mailchimp.push'):
                self.post('/api/newsletter/subscribe', PAYLOAD)
            row = Subscriber.objects.get()
            body = {'email': 'Test@example.com'} if key == 'email' else {'token': row.unsubscribe_token}
            with mock.patch('newsletter.mailchimp.remove') as remove:
                self.assertEqual(self.post('/api/newsletter/unsubscribe', body).status_code, 200)
            remove.assert_called_once_with('test@example.com')
            self.assertEqual(Subscriber.objects.count(), 0)

    def test_unsubscribe_survives_a_mailchimp_failure(self):
        with mock.patch('newsletter.mailchimp.push'):
            self.post('/api/newsletter/subscribe', PAYLOAD)
        with mock.patch('newsletter.mailchimp.remove', side_effect=RuntimeError('down')):
            self.assertEqual(self.post('/api/newsletter/unsubscribe', {'email': 'test@example.com'}).json(), {'ok': True})
        self.assertEqual(Subscriber.objects.count(), 0)

    def test_an_unknown_token_makes_no_mailchimp_call(self):
        with mock.patch('newsletter.mailchimp.remove') as remove:
            self.assertEqual(self.post('/api/newsletter/unsubscribe', {'token': 'a' * 43}).status_code, 200)
        remove.assert_not_called()

    def test_account_toggle_passes_the_sign_and_removes_when_turned_off(self):
        user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(user)
        with mock.patch('newsletter.mailchimp.push') as push:
            on = self.client.post('/api/account/newsletter/', {'subscribed': True, 'sunSign': 'pisces'}, content_type='application/json')
        self.assertEqual(on.json(), {'ok': True, 'newsletter': True})
        self.assertEqual(Subscriber.objects.get().sun_sign, 'pisces')
        push.assert_called_once()
        bad = self.client.post('/api/account/newsletter/', {'subscribed': True, 'sunSign': 'x'}, content_type='application/json')
        self.assertEqual(bad.status_code, 400)
        with mock.patch('newsletter.mailchimp.remove') as remove:
            self.client.post('/api/account/newsletter/', {'subscribed': False}, content_type='application/json')
        remove.assert_called_once_with('reader@example.com')
        self.assertEqual(Subscriber.objects.count(), 0)
