import hashlib
import io
import json
import tempfile
import urllib.error
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from newsletter import mailchimp

WEEK = '2026-09-21'
HTML = '<html><body>*|IF:SIGN=aries|*ram*|ELSE:|*none*|END:IF|*</body></html>'
TITLE = f'Ishtar Insights {WEEK}'


class FakeMailchimp:
    """Records every call and answers like the Marketing API for the endpoints the command uses."""
    def __init__(self, campaigns=(), members=2, ready=True, items=(), fail=None):
        self.calls, self.campaigns, self.members, self.ready, self.items, self.fail = [], list(campaigns), members, ready, list(items), fail

    def __call__(self, method, path, body=None, params=None):
        self.calls.append((method, path, body, params))
        if self.fail:
            fail_method, fail_suffix, fail_exception = self.fail
            if method == fail_method and path.endswith(fail_suffix):
                raise fail_exception
        if (method, path) == ('GET', '/campaigns'):
            return {'campaigns': self.campaigns}
        if (method, path) == ('POST', '/campaigns'):
            return {'id': 'new1', 'web_id': 4242, 'status': 'save'}
        if path.endswith('/send-checklist'):
            return {'is_ready': self.ready, 'items': self.items}
        if path.startswith('/lists/'):
            return {'stats': {'member_count': self.members}}
        return {}


class DraftCampaignTests(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        folder = Path(self.tmp.name) / WEEK
        folder.mkdir()
        (folder / 'issue.html').write_text(HTML, encoding='utf-8')
        self.manifest = {'week': WEEK, 'title': TITLE, 'subject': 'Start the week tidy', 'preview': 'A waxing Moon.',
                         'from_name': 'Ishtar Insights', 'reply_to': 'newsletter@ishtarinsights.com', 'bytes': len(HTML),
                         'signs_included': ['aries'] * 12, 'signs_missing': [],
                         'html_sha256': hashlib.sha256(HTML.encode()).hexdigest()}
        self.write_manifest()

    def write_manifest(self):
        (Path(self.tmp.name) / WEEK / 'issue.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def run_command(self, fake, *args, configured=True):
        out = io.StringIO()
        with override_settings(NEWSLETTER_ISSUE_DIR=self.tmp.name, MAILCHIMP_AUDIENCE_ID='aud1', MAILCHIMP_SERVER='us1'), \
                mock.patch('newsletter.mailchimp.configured', return_value=configured), \
                mock.patch('newsletter.mailchimp._request', fake):
            call_command('draft_campaign', WEEK, *args, stdout=out)
        return out.getvalue()

    def test_creates_the_draft_then_sets_its_content(self):
        fake = FakeMailchimp()
        out = self.run_command(fake)
        create = next(c for c in fake.calls if c[:2] == ('POST', '/campaigns'))
        self.assertEqual(create[2], {'type': 'regular', 'recipients': {'list_id': 'aud1'}, 'settings': {
            'subject_line': 'Start the week tidy', 'preview_text': 'A waxing Moon.', 'title': TITLE,
            'from_name': 'Ishtar Insights', 'reply_to': 'newsletter@ishtarinsights.com'}})
        self.assertIn(('PUT', '/campaigns/new1/content', {'html': HTML}, None), fake.calls)
        self.assertLess(fake.calls.index(create), fake.calls.index(('PUT', '/campaigns/new1/content', {'html': HTML}, None)))
        self.assertIn('draft ready', out)
        self.assertIn('https://us1.admin.mailchimp.com/campaigns/edit?id=4242', out)

    def test_never_sends_or_schedules(self):
        for args in ([], ['--test', 'owner@example.com'], ['--replace']):
            fake = FakeMailchimp(campaigns=[{'id': 'old1', 'web_id': 7, 'status': 'save', 'settings': {'title': TITLE}}] if args == ['--replace'] else [])
            self.run_command(fake, *args)
            self.assertGreaterEqual(len(fake.calls), 4)
            for method, path, _, _ in fake.calls:
                self.assertFalse(path.endswith('/actions/send') or path.endswith('/actions/schedule'), path)
                # Check that the call is one of the allowed endpoints
                allowed = (
                    (method, path) == ('GET', '/campaigns') or
                    (method, path) == ('POST', '/campaigns') or
                    (method == 'PATCH' and path.startswith('/campaigns/')) or
                    (method == 'PUT' and '/campaigns/' in path and path.endswith('/content')) or
                    (method == 'GET' and '/campaigns/' in path and path.endswith('/send-checklist')) or
                    (method == 'GET' and path.startswith('/lists/')) or
                    (method == 'POST' and '/actions/test' in path and args == ['--test', 'owner@example.com'])
                )
                self.assertTrue(allowed, f'Unexpected call: {method} {path}')

    def test_an_existing_draft_is_left_alone_without_replace_and_updated_with_it(self):
        draft = [{'id': 'old1', 'web_id': 7, 'status': 'save', 'settings': {'title': TITLE}}]
        with self.assertRaisesMessage(CommandError, '--replace'):
            self.run_command(FakeMailchimp(campaigns=draft))
        fake = FakeMailchimp(campaigns=draft)
        self.run_command(fake, '--replace')
        self.assertFalse([c for c in fake.calls if c[:2] == ('POST', '/campaigns')])
        self.assertTrue([c for c in fake.calls if c[:2] == ('PATCH', '/campaigns/old1')])
        self.assertIn(('PUT', '/campaigns/old1/content', {'html': HTML}, None), fake.calls)

    def test_a_campaign_already_sent_is_never_touched(self):
        fake = FakeMailchimp(campaigns=[{'id': 'old1', 'web_id': 7, 'status': 'sent', 'settings': {'title': TITLE}}])
        with self.assertRaisesMessage(CommandError, 'already sent'):
            self.run_command(fake, '--replace')
        self.assertEqual([c[0] for c in fake.calls], ['GET'])

    def test_prints_checklist_problems_and_readiness(self):
        out = self.run_command(FakeMailchimp(ready=False, items=[
            {'type': 'success', 'heading': 'List', 'details': 'fine'},
            {'type': 'error', 'heading': 'From address', 'details': 'is not verified'}]))
        self.assertIn('ERROR: From address is not verified', out)
        self.assertNotIn('fine', out)
        self.assertIn('NOT ready to send', out)

    def test_reports_the_audience_against_the_free_plan_and_warns_from_100(self):
        self.assertIn('2 subscribed; a weekly issue is about 9 sends a month', self.run_command(FakeMailchimp(members=2)))
        self.assertNotIn('WARNING', self.run_command(FakeMailchimp(members=99)))
        self.assertIn('WARNING', self.run_command(FakeMailchimp(members=100)))

    def test_test_send_goes_to_the_one_address_given(self):
        fake = FakeMailchimp()
        out = self.run_command(fake, '--test', 'owner@example.com')
        self.assertIn(('POST', '/campaigns/new1/actions/test', {'test_emails': ['owner@example.com'], 'send_type': 'html'}, None), fake.calls)
        self.assertIn('no-sign version', out)
        self.assertNotIn('owner@example.com', out)

    def test_a_tampered_or_missing_issue_stops_before_any_call(self):
        self.manifest['html_sha256'] = '0' * 64
        self.write_manifest()
        fake = FakeMailchimp()
        with self.assertRaisesMessage(CommandError, 'sha256'):
            self.run_command(fake)
        self.assertEqual(fake.calls, [])
        with self.assertRaisesMessage(CommandError, 'no pushed issue'):
            out = io.StringIO()
            with override_settings(NEWSLETTER_ISSUE_DIR=self.tmp.name), mock.patch('newsletter.mailchimp.configured', return_value=True), \
                    mock.patch('newsletter.mailchimp._request', fake):
                call_command('draft_campaign', '2026-09-28', stdout=out)
        with self.assertRaisesMessage(CommandError, 'YYYY-MM-DD'):
            call_command('draft_campaign', '../etc', stdout=io.StringIO())

    def test_without_a_key_it_does_nothing(self):
        fake = FakeMailchimp()
        self.assertIn('not configured', self.run_command(fake, configured=False))
        self.assertEqual(fake.calls, [])

    def test_missing_signs_are_named(self):
        self.manifest.update(signs_included=['aries'] * 11, signs_missing=['gemini'])
        self.write_manifest()
        self.assertIn('missing-reading panel: gemini', self.run_command(FakeMailchimp()))

    def http_error(self, code, body):
        return urllib.error.HTTPError('https://example.invalid', code, 'Bad Request', {}, io.BytesIO(body))

    def test_a_mailchimp_rejection_is_reported_in_mailchimps_words_without_a_traceback(self):
        fake = FakeMailchimp(fail=('PUT', '/content', self.http_error(400, b'{"detail": "Your HTML is too large."}')))
        with self.assertRaises(CommandError) as caught:
            self.run_command(fake)
        message = str(caught.exception)
        self.assertIn('400', message)
        self.assertIn('Your HTML is too large.', message)
        self.assertIn('--replace', message)

    def test_a_timeout_is_reported_without_a_traceback(self):
        fake = FakeMailchimp(fail=('GET', '/campaigns', urllib.error.URLError('timed out')))
        with self.assertRaisesMessage(CommandError, 'did not answer'):
            self.run_command(fake)

    def test_a_rejected_test_send_never_echoes_the_address(self):
        body = b'{"detail": "owner@example.com looks fake or invalid"}'
        fake = FakeMailchimp(fail=('POST', '/actions/test', self.http_error(400, body)))
        with self.assertRaises(CommandError) as caught:
            self.run_command(fake, '--test', 'owner@example.com')
        self.assertNotIn('owner@example.com', str(caught.exception))
        self.assertIn('test send', str(caught.exception))

    def test_a_truncated_manifest_is_caught_before_any_call(self):
        (Path(self.tmp.name) / WEEK / 'issue.json').write_text('{"week":', encoding='utf-8')
        fake = FakeMailchimp()
        with self.assertRaisesMessage(CommandError, 'no pushed issue'):
            self.run_command(fake)
        self.assertEqual(fake.calls, [])

    def test_a_missing_manifest_key_is_caught_before_any_call(self):
        del self.manifest['signs_missing']
        self.write_manifest()
        fake = FakeMailchimp()
        with self.assertRaises(CommandError) as caught:
            self.run_command(fake)
        self.assertIn('signs_missing', str(caught.exception))
        self.assertEqual(fake.calls, [])

    def test_hashes_the_pushed_bytes_and_preserves_crlf(self):
        html_with_crlf = '<html><body>line1\r\nline2</body></html>'
        (Path(self.tmp.name) / WEEK / 'issue.html').write_bytes(html_with_crlf.encode('utf-8'))
        self.manifest['html_sha256'] = hashlib.sha256(html_with_crlf.encode('utf-8')).hexdigest()
        self.manifest['bytes'] = len(html_with_crlf.encode('utf-8'))
        self.write_manifest()
        fake = FakeMailchimp()
        self.run_command(fake)
        content_call = next(c for c in fake.calls if c[0] == 'PUT' and '/content' in c[1])
        self.assertEqual(content_call[2]['html'], html_with_crlf)


class EmptyReplyTests(TestCase):
    """Mailchimp answers 204 with no body to a test send; _request must not choke on it."""
    @override_settings(MAILCHIMP_API_KEY='k-us1', MAILCHIMP_SERVER='us1', MAILCHIMP_AUDIENCE_ID='aud1')
    def test_an_empty_body_is_an_empty_dict(self):
        class Reply(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False
        with mock.patch('urllib.request.urlopen', return_value=Reply(b'')):
            self.assertEqual(mailchimp._request('POST', '/campaigns/x/actions/test', {'test_emails': ['a@example.com']}), {})
        with mock.patch('urllib.request.urlopen', return_value=Reply(b'{"id": "c1"}')):
            self.assertEqual(mailchimp._request('GET', '/campaigns/c1'), {'id': 'c1'})
