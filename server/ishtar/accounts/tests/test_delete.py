from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.test import TestCase

from accounts.models import Entitlement, Profile
from newsletter.models import Subscriber
from newsletter.views import subscribe_email
from readings.models import Reading


class DeleteAccountTests(TestCase):
    def test_delete_cascades_and_keeps_subscriber(self):
        user = get_user_model().objects.create_user('reader@example.com')
        Profile.objects.create(user=user, data={'birthday': '1990-01-01'})
        Reading.objects.create(user=user, kind='runes', payload={'ids': [1]})
        Entitlement.objects.create(user=user, feature='member')
        subscribe_email('reader@example.com')
        self.client.force_login(user)
        self.assertEqual(self.client.post('/api/account/delete/', {'confirm': False}, content_type='application/json').status_code, 400)
        response = self.client.post('/api/account/delete/', {'confirm': True}, content_type='application/json')
        self.assertEqual(response.json(), {'ok': True})
        self.assertFalse(get_user_model().objects.filter(email='reader@example.com').exists())
        self.assertEqual(Profile.objects.count() + Reading.objects.count() + Entitlement.objects.count(), 0)
        self.assertTrue(Subscriber.objects.filter(email='reader@example.com').exists())
        self.assertEqual(self.client.get('/api/account/').status_code, 401)

    def test_delete_rejects_every_non_true_confirm_value(self):
        # `is not True` is a strict check, not a truthy check. A looser
        # `if not request.json.get('confirm')` guard would also reject False
        # and a missing key, but would wrongly accept "true" or 1. Cover the
        # values that actually distinguish the two implementations, plus a
        # genuinely empty body, and prove none of them deletes anything.
        user = get_user_model().objects.create_user('guarded@example.com')
        self.client.force_login(user)
        for body in ({}, {'confirm': False}, {'confirm': 'true'}, {'confirm': 1}):
            response = self.client.post('/api/account/delete/', body, content_type='application/json')
            self.assertEqual(response.status_code, 400, body)
            self.assertIn('error', response.json())
        # A literal JSON "null" body -- what json_view treats an actually-empty
        # body as (see its `json.loads(body or b'null')`) -- is rejected a step
        # earlier, by the shared decorator's own isinstance(dict) check, before
        # delete_account's confirm guard ever runs. Django's test Client cannot
        # send a truly zero-byte body with Content-Type set (its generic() only
        # attaches CONTENT_TYPE when the body is truthy), so "null" is the
        # faithful way to reach that same empty-body branch through the Client.
        empty = self.client.post('/api/account/delete/', 'null', content_type='application/json')
        self.assertEqual(empty.status_code, 400)
        self.assertIn('error', empty.json())
        self.assertTrue(get_user_model().objects.filter(email='guarded@example.com').exists())

    def test_delete_only_affects_the_authenticated_user(self):
        # No user id travels in the request body -- deletion must be scoped
        # to request.user, not to anything the client names. Prove it by
        # giving a second user the same three rows and checking they all
        # survive the first user's deletion.
        target = get_user_model().objects.create_user('target@example.com')
        Profile.objects.create(user=target, data={'birthday': '1990-01-01'})
        Reading.objects.create(user=target, kind='runes', payload={'ids': [1]})
        Entitlement.objects.create(user=target, feature='member')

        bystander = get_user_model().objects.create_user('bystander@example.com')
        Profile.objects.create(user=bystander, data={'birthday': '1991-02-02'})
        Reading.objects.create(user=bystander, kind='geomancy', payload={'ids': [2]})
        Entitlement.objects.create(user=bystander, feature='member')

        self.client.force_login(target)
        response = self.client.post('/api/account/delete/', {'confirm': True}, content_type='application/json')
        self.assertEqual(response.json(), {'ok': True})

        self.assertFalse(get_user_model().objects.filter(email='target@example.com').exists())
        self.assertTrue(get_user_model().objects.filter(email='bystander@example.com').exists())
        self.assertTrue(Profile.objects.filter(user=bystander).exists())
        self.assertTrue(Reading.objects.filter(user=bystander).exists())
        self.assertTrue(Entitlement.objects.filter(user=bystander).exists())

    def test_delete_flushes_the_server_side_session(self):
        # A 401 on the client's next request is necessary but not sufficient:
        # the auth middleware already returns AnonymousUser once the
        # session's user id fails to resolve, which is true the instant the
        # row is gone -- with or without an explicit logout() call. The only
        # thing that distinguishes "logged out" from "row vanished under a
        # still-live session" is whether the session itself was flushed from
        # the store, so check that directly rather than trusting the 401.
        user = get_user_model().objects.create_user('sessioned@example.com')
        self.client.force_login(user)
        session_key = self.client.session.session_key
        self.assertTrue(Session.objects.filter(session_key=session_key).exists())

        self.client.post('/api/account/delete/', {'confirm': True}, content_type='application/json')

        self.assertFalse(Session.objects.filter(session_key=session_key).exists())

    def test_delete_leaves_the_subscriber_token_unchanged(self):
        # The unsubscribe link already emailed to this address encodes the
        # token at signup time. If deletion ever touched the Subscriber row
        # -- even a delete-then-recreate that leaves a row with the same
        # email -- that link would silently stop working.
        user = get_user_model().objects.create_user('subscribed@example.com')
        subscribe_email('subscribed@example.com')
        token_before = Subscriber.objects.get(email='subscribed@example.com').unsubscribe_token
        self.client.force_login(user)

        response = self.client.post('/api/account/delete/', {'confirm': True}, content_type='application/json')

        # Tie the token check to proof that deletion actually ran -- otherwise
        # a broken route (everything 404s, nothing happens) would pass this
        # test for the wrong reason: the token trivially "survives" nothing.
        self.assertEqual(response.json(), {'ok': True})
        self.assertFalse(get_user_model().objects.filter(email='subscribed@example.com').exists())
        self.assertEqual(Subscriber.objects.get(email='subscribed@example.com').unsubscribe_token, token_before)

    def test_delete_logs_out_before_deleting_the_user_row(self):
        # user.delete() is the one irreversible step here, so it has to run
        # last: if it ran first and *then* logout() raised (a session-backend
        # hiccup, or some future user_logged_out receiver), the caller would
        # get a 500 for a deletion that had, in fact, already gone through.
        # logout() first means any such failure happens before the point of
        # no return, so nothing is deleted. Neither the response nor final DB
        # state differs between the two orderings -- request.session.flush()
        # doesn't touch the user row either way -- so only pinning the call
        # order itself catches a regression here.
        user = get_user_model().objects.create_user('ordered@example.com')
        self.client.force_login(user)
        calls = []
        with patch('accounts.views.logout', side_effect=lambda request: calls.append('logout')), \
                patch('accounts.models.User.delete', autospec=True,
                      side_effect=lambda self, *a, **k: calls.append('delete')):
            response = self.client.post('/api/account/delete/', {'confirm': True}, content_type='application/json')
        self.assertEqual(response.json(), {'ok': True})
        self.assertEqual(calls, ['logout', 'delete'])
