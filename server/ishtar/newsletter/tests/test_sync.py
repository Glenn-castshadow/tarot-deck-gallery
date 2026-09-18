import io
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from newsletter.models import Subscriber


def row(email):
    return Subscriber.objects.create(email=email, consent_at=timezone.now(), consent_version='v', consent_text='t')


def run(audience, configured=True):
    out = io.StringIO()
    with mock.patch('newsletter.mailchimp.configured', return_value=configured), \
            mock.patch('newsletter.mailchimp.members', return_value=iter(audience)), \
            mock.patch('newsletter.mailchimp.push') as push, \
            mock.patch('newsletter.mailchimp.remove') as remove:
        call_command('sync_mailchimp', stdout=out)
    return push, remove, out.getvalue()


class SyncTests(TestCase):
    def test_database_only_row_is_pushed_without_resubscribe(self):
        new = row('new@example.com')
        push, remove, out = run([])
        push.assert_called_once_with(new)
        remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=1 removed=0 deleted=0')

    def test_live_mailchimp_member_missing_from_database_is_removed(self):
        push, remove, out = run([('gone@example.com', 'subscribed'), ('waiting@example.com', 'pending')])
        self.assertEqual(sorted(c.args[0] for c in remove.call_args_list), ['gone@example.com', 'waiting@example.com'])
        self.assertEqual(out.strip(), 'pushed=0 removed=2 deleted=0')

    def test_member_who_left_or_bounced_in_mailchimp_is_deleted_here(self):
        row('left@example.com'); row('bounced@example.com'); row('stays@example.com')
        push, remove, out = run([('left@example.com', 'unsubscribed'), ('bounced@example.com', 'cleaned'), ('stays@example.com', 'subscribed')])
        self.assertEqual(list(Subscriber.objects.values_list('email', flat=True)), ['stays@example.com'])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=2')

    def test_gone_on_both_sides_and_in_step_on_both_sides_do_nothing(self):
        row('both@example.com')
        push, remove, out = run([('both@example.com', 'pending'), ('old@example.com', 'unsubscribed')])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=0')

    def test_unconfigured_run_touches_nothing(self):
        row('keep@example.com')
        push, remove, out = run([], configured=False)
        push.assert_not_called()
        self.assertIn('not configured', out)

    def test_output_never_contains_an_address(self):
        row('secret@example.com')
        self.assertNotIn('secret', run([('other@example.com', 'subscribed')])[2])

    def test_an_api_error_propagates_so_cron_reports_it(self):
        row('new@example.com')
        with mock.patch('newsletter.mailchimp.configured', return_value=True), \
                mock.patch('newsletter.mailchimp.members', return_value=iter([])), \
                mock.patch('newsletter.mailchimp.push', side_effect=RuntimeError('down')), \
                self.assertRaises(RuntimeError):
            call_command('sync_mailchimp', stdout=io.StringIO())
