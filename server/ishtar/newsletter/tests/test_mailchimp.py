import hashlib
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from newsletter import mailchimp
from newsletter.models import Subscriber

CONFIG = dict(MAILCHIMP_API_KEY='k-us1', MAILCHIMP_SERVER='us1', MAILCHIMP_AUDIENCE_ID='aud1')
HASH = hashlib.md5(b'reader@example.com').hexdigest()


def subscriber(sign='leo'):
    return Subscriber.objects.create(email='reader@example.com', consent_at=timezone.now(),
                                     consent_version='v', consent_text='t', sun_sign=sign)


class FakeLists:
    def __init__(self, status='pending', pages=None):
        self.status, self.pages, self.calls = status, pages or [], []

    def set_list_member(self, list_id, member_hash, body):
        self.calls.append(('set', list_id, member_hash, body))
        return {'status': self.status}

    def update_list_member(self, list_id, member_hash, body):
        self.calls.append(('update', list_id, member_hash, body))
        return {}

    def get_list_members_info(self, list_id, count, offset, fields):
        self.calls.append(('list', offset))
        return self.pages[offset // count]


def fake_client(lists):
    return mock.patch('newsletter.mailchimp._client', return_value=mock.Mock(lists=lists))


class UnconfiguredTests(TestCase):
    def test_no_key_means_no_client_and_no_calls(self):
        with mock.patch('mailchimp_marketing.Client') as sdk:
            self.assertFalse(mailchimp.configured())
            mailchimp.push(subscriber())
            mailchimp.remove('reader@example.com')
            self.assertEqual(list(mailchimp.members()), [])
            sdk.assert_not_called()


@override_settings(**CONFIG)
class ConfiguredTests(TestCase):
    def test_push_puts_pending_with_sign_and_unsubscribe_url(self):
        lists, row = FakeLists(), subscriber()
        with fake_client(lists):
            mailchimp.push(row)
        self.assertEqual(lists.calls, [('set', 'aud1', HASH, {
            'email_address': 'reader@example.com', 'status_if_new': 'pending',
            'merge_fields': {'SIGN': 'leo', 'UNSUB': 'https://ishtarinsights.com/unsubscribe.html#' + row.unsubscribe_token}})])

    def test_push_never_sends_status_so_an_unsubscribed_member_stays_out(self):
        lists = FakeLists(status='unsubscribed')
        with fake_client(lists):
            mailchimp.push(subscriber())
        self.assertEqual([c[0] for c in lists.calls], ['set'])
        self.assertNotIn('status', lists.calls[0][3])

    def test_resubscribe_moves_an_unsubscribed_member_back_to_pending(self):
        lists = FakeLists(status='unsubscribed')
        with fake_client(lists):
            mailchimp.push(subscriber(), resubscribe=True)
        self.assertEqual(lists.calls[1], ('update', 'aud1', HASH, {'status': 'pending'}))

    def test_resubscribe_leaves_a_subscribed_member_alone(self):
        lists = FakeLists(status='subscribed')
        with fake_client(lists):
            mailchimp.push(subscriber(), resubscribe=True)
        self.assertEqual([c[0] for c in lists.calls], ['set'])

    def test_remove_unsubscribes_and_treats_404_as_done(self):
        lists = FakeLists()
        with fake_client(lists):
            mailchimp.remove('Reader@Example.com')
        self.assertEqual(lists.calls, [('update', 'aud1', HASH, {'status': 'unsubscribed'})])

        from mailchimp_marketing.api_client import ApiClientError
        gone = mock.Mock()
        gone.update_list_member.side_effect = ApiClientError('missing', 404)
        with fake_client(gone):
            mailchimp.remove('reader@example.com')
        broken = mock.Mock()
        broken.update_list_member.side_effect = ApiClientError('boom', 500)
        with fake_client(broken), self.assertRaises(ApiClientError):
            mailchimp.remove('reader@example.com')

    def test_members_pages_until_total_and_lowercases(self):
        page = lambda n, total: {'total_items': total, 'members': [{'email_address': f'P{n}@Example.com', 'status': 'subscribed'}]}
        lists = FakeLists(pages=[page(0, 1001), page(1, 1001)])
        with fake_client(lists):
            self.assertEqual(list(mailchimp.members()), [('p0@example.com', 'subscribed'), ('p1@example.com', 'subscribed')])
        self.assertEqual(lists.calls, [('list', 0), ('list', 1000)])

    def test_client_is_built_with_a_five_second_timeout(self):
        with mock.patch('mailchimp_marketing.Client') as sdk:
            mailchimp._client()
        sdk.return_value.set_config.assert_called_once_with({'api_key': 'k-us1', 'server': 'us1', 'timeout': 5})
