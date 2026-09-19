import hashlib
import io
import json
import tempfile
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
    def __init__(self, campaigns=(), members=2, ready=True, items=()):
        self.calls, self.campaigns, self.members, self.ready, self.items = [], list(campaigns), members, ready, list(items)

    def __call__(self, method, path, body=None, params=None):
        self.calls.append((method, path, body, params))
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
            for method, path, _, _ in fake.calls:
                self.assertFalse(path.endswith('/actions/send') or path.endswith('/actions/schedule'), path)

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
