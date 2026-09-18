import base64
import hashlib
from unittest import mock
from urllib.error import HTTPError
from urllib.parse import urlparse

from django.test import TestCase, override_settings
from django.utils import timezone

from newsletter import mailchimp
from newsletter.models import Subscriber

CONFIG = dict(MAILCHIMP_API_KEY='k-us1', MAILCHIMP_SERVER='us1', MAILCHIMP_AUDIENCE_ID='aud1')
HASH = hashlib.md5(b'reader@example.com').hexdigest()
PATH = f'/lists/aud1/members/{HASH}'


def subscriber(sign='leo'):
    return Subscriber.objects.create(email='reader@example.com', consent_at=timezone.now(),
                                     consent_version='v', consent_text='t', sun_sign=sign)


class FakeRequest:
    """Records every call and returns the next queued result (or {})."""
    def __init__(self, results=None):
        self.calls = []
        self._results = list(results or [])

    def __call__(self, method, path, body=None, params=None):
        self.calls.append((method, path, body, params))
        return self._results.pop(0) if self._results else {}


class UnconfiguredTests(TestCase):
    def test_no_key_means_no_request_and_no_calls(self):
        with mock.patch('newsletter.mailchimp._request') as request:
            self.assertFalse(mailchimp.configured())
            mailchimp.push(subscriber())
            mailchimp.remove('reader@example.com')
            self.assertEqual(list(mailchimp.members()), [])
            request.assert_not_called()


@override_settings(**CONFIG)
class ConfiguredTests(TestCase):
    def test_push_puts_pending_with_sign_and_unsubscribe_url(self):
        row = subscriber()
        fake = FakeRequest()
        with mock.patch('newsletter.mailchimp._request', fake):
            mailchimp.push(row)
        self.assertEqual(fake.calls, [('PUT', PATH, {
            'email_address': 'reader@example.com', 'status_if_new': 'pending',
            'merge_fields': {'SIGN': 'leo', 'UNSUB': 'https://ishtarinsights.com/unsubscribe.html#' + row.unsubscribe_token}}, None)])

    def test_push_never_sends_status_so_an_unsubscribed_member_stays_out(self):
        fake = FakeRequest(results=[{'status': 'unsubscribed'}])
        with mock.patch('newsletter.mailchimp._request', fake):
            mailchimp.push(subscriber())
        self.assertEqual([c[0] for c in fake.calls], ['PUT'])
        self.assertNotIn('status', fake.calls[0][2])

    def test_resubscribe_moves_an_unsubscribed_member_back_to_pending(self):
        fake = FakeRequest(results=[{'status': 'unsubscribed'}])
        with mock.patch('newsletter.mailchimp._request', fake):
            mailchimp.push(subscriber(), resubscribe=True)
        self.assertEqual(fake.calls[1], ('PATCH', PATH, {'status': 'pending'}, None))

    def test_resubscribe_leaves_a_subscribed_member_alone(self):
        fake = FakeRequest(results=[{'status': 'subscribed'}])
        with mock.patch('newsletter.mailchimp._request', fake):
            mailchimp.push(subscriber(), resubscribe=True)
        self.assertEqual([c[0] for c in fake.calls], ['PUT'])

    def test_remove_unsubscribes_and_treats_404_as_done(self):
        fake = FakeRequest()
        with mock.patch('newsletter.mailchimp._request', fake):
            mailchimp.remove('Reader@Example.com')
        self.assertEqual(fake.calls, [('PATCH', PATH, {'status': 'unsubscribed'}, None)])

        gone = mock.Mock(side_effect=HTTPError('url', 404, 'missing', None, None))
        with mock.patch('newsletter.mailchimp._request', gone):
            mailchimp.remove('reader@example.com')

        broken = mock.Mock(side_effect=HTTPError('url', 500, 'boom', None, None))
        with mock.patch('newsletter.mailchimp._request', broken), self.assertRaises(HTTPError):
            mailchimp.remove('reader@example.com')

    def test_members_pages_until_total_and_lowercases(self):
        page = lambda n, total: {'total_items': total, 'members': [{'email_address': f'P{n}@Example.com', 'status': 'subscribed'}]}
        fake = FakeRequest(results=[page(0, 1001), page(1, 1001)])
        with mock.patch('newsletter.mailchimp._request', fake):
            self.assertEqual(list(mailchimp.members()), [('p0@example.com', 'subscribed'), ('p1@example.com', 'subscribed')])
        self.assertEqual(fake.calls, [
            ('GET', '/lists/aud1/members', None, {'count': 1000, 'offset': 0, 'fields': 'members.email_address,members.status,total_items'}),
            ('GET', '/lists/aud1/members', None, {'count': 1000, 'offset': 1000, 'fields': 'members.email_address,members.status,total_items'}),
        ])

    def test_request_hits_the_configured_server_with_basic_auth_and_a_five_second_timeout(self):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b'{}'
        with mock.patch('urllib.request.urlopen', return_value=response) as urlopen:
            mailchimp._request('GET', '/ping')
        request = urlopen.call_args.args[0]
        self.assertEqual(urlopen.call_args.kwargs.get('timeout'), 5)
        parsed = urlparse(request.full_url)
        self.assertEqual(parsed.hostname, 'us1.api.mailchimp.com')
        self.assertTrue(parsed.path.startswith('/3.0/ping'))
        auth_header = request.get_header('Authorization')
        self.assertTrue(auth_header.startswith('Basic '))
        self.assertEqual(base64.b64decode(auth_header.split(' ', 1)[1]).decode(), 'anystring:k-us1')
