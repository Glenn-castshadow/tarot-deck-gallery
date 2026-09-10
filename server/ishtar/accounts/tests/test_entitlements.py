from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Entitlement


class EntitlementTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(self.user)

    def test_active_expired_and_future_entitlements(self):
        now = timezone.now()
        Entitlement.objects.create(user=self.user, feature='member', starts_at=now - timedelta(days=1))
        Entitlement.objects.create(user=self.user, feature='member', starts_at=now - timedelta(days=3), ends_at=now - timedelta(days=2))
        Entitlement.objects.create(user=self.user, feature='archive', starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=1))
        Entitlement.objects.create(user=self.user, feature='future', starts_at=now + timedelta(days=1))
        self.assertEqual(Entitlement.objects.active_features(self.user), ['archive', 'member'])
        self.assertEqual(self.client.get('/api/account/').json()['features'], ['archive', 'member'])

    def test_other_users_entitlements_are_not_listed(self):
        other = get_user_model().objects.create_user('other@example.com')
        Entitlement.objects.create(user=other, feature='member', starts_at=timezone.now())
        self.assertEqual(self.client.get('/api/account/').json()['features'], [])

    def test_two_simultaneously_active_entitlements_for_same_feature_collapse_to_one_key(self):
        # Distinct from the pair in test_active_expired_and_future_entitlements: there,
        # only one of the two 'member' rows is active at a time, so a buggy
        # active_features() that forgot to dedupe would still pass by accident. Here
        # both rows are active at once (one long-running manual grant, one newer
        # stripe grant layered on top), so the assertion only holds if the dedupe is real.
        now = timezone.now()
        Entitlement.objects.create(user=self.user, feature='member', starts_at=now - timedelta(days=10), ends_at=now + timedelta(days=10))
        Entitlement.objects.create(user=self.user, feature='member', starts_at=now - timedelta(days=1), source='stripe')
        self.assertEqual(Entitlement.objects.active_features(self.user), ['member'])
        self.assertEqual(self.client.get('/api/account/').json()['features'], ['member'])
