import io
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
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
        self.assertEqual(out.strip(), 'pushed=1 removed=0 deleted=0 failed=0')

    def test_live_mailchimp_member_missing_from_database_is_removed(self):
        row('stays@example.com')
        push, remove, out = run([('gone@example.com', 'subscribed'), ('waiting@example.com', 'pending'),
                                  ('stays@example.com', 'subscribed')])
        self.assertEqual(sorted(c.args[0] for c in remove.call_args_list), ['gone@example.com', 'waiting@example.com'])
        self.assertEqual(out.strip(), 'pushed=0 removed=2 deleted=0 failed=0')

    def test_member_who_left_or_bounced_in_mailchimp_is_deleted_here(self):
        row('left@example.com'); row('bounced@example.com'); row('stays@example.com')
        push, remove, out = run([('left@example.com', 'unsubscribed'), ('bounced@example.com', 'cleaned'), ('stays@example.com', 'subscribed')])
        self.assertEqual(list(Subscriber.objects.values_list('email', flat=True)), ['stays@example.com'])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=2 failed=0')

    def test_gone_on_both_sides_and_in_step_on_both_sides_do_nothing(self):
        row('both@example.com')
        push, remove, out = run([('both@example.com', 'pending'), ('old@example.com', 'unsubscribed')])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=0 failed=0')

    def test_unconfigured_run_touches_nothing(self):
        row('keep@example.com')
        push, remove, out = run([], configured=False)
        push.assert_not_called()
        self.assertIn('not configured', out)

    def test_output_never_contains_an_address(self):
        row('secret@example.com')
        self.assertNotIn('secret', run([('other@example.com', 'subscribed')])[2])

    def test_no_subscribers_but_a_live_audience_refuses_to_unsubscribe_everyone(self):
        with mock.patch('newsletter.mailchimp.configured', return_value=True), \
                mock.patch('newsletter.mailchimp.members',
                            return_value=iter([('a@example.com', 'subscribed'), ('b@example.com', 'pending')])), \
                mock.patch('newsletter.mailchimp.push') as push, \
                mock.patch('newsletter.mailchimp.remove') as remove, \
                self.assertRaises(CommandError):
            call_command('sync_mailchimp', stdout=io.StringIO())
        remove.assert_not_called()
        push.assert_not_called()

    def test_a_rejected_push_does_not_stop_the_run_but_still_fails_the_command(self):
        row('bad@example.com')
        row('ok@example.com')
        row('gone@example.com')

        def flaky_push(subscriber):
            if subscriber.email == 'bad@example.com':
                raise RuntimeError('400 invalid address')

        with mock.patch('newsletter.mailchimp.configured', return_value=True), \
                mock.patch('newsletter.mailchimp.members', return_value=iter([('gone@example.com', 'unsubscribed')])), \
                mock.patch('newsletter.mailchimp.push', side_effect=flaky_push) as push, \
                mock.patch('newsletter.mailchimp.remove') as remove:
            out = io.StringIO()
            with self.assertRaises(CommandError):
                call_command('sync_mailchimp', stdout=out)
            self.assertEqual(out.getvalue().strip(), 'pushed=1 removed=0 deleted=1 failed=1')
        self.assertEqual(push.call_count, 2)
        remove.assert_not_called()
        remaining = list(Subscriber.objects.values_list('email', flat=True))
        self.assertIn('bad@example.com', remaining)
        self.assertIn('ok@example.com', remaining)
        self.assertNotIn('gone@example.com', remaining)

    def test_a_failing_members_call_aborts_before_any_action(self):
        row('keep@example.com')
        with mock.patch('newsletter.mailchimp.configured', return_value=True), \
                mock.patch('newsletter.mailchimp.members', side_effect=RuntimeError('down')), \
                mock.patch('newsletter.mailchimp.push') as push, \
                mock.patch('newsletter.mailchimp.remove') as remove, \
                self.assertRaises(RuntimeError):
            call_command('sync_mailchimp', stdout=io.StringIO())
        push.assert_not_called()
        remove.assert_not_called()
        self.assertEqual(list(Subscriber.objects.values_list('email', flat=True)), ['keep@example.com'])
