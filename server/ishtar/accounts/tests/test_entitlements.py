from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

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
        Entitlement.objects.create(user=self.user, feature='lapsed', starts_at=now - timedelta(days=3), ends_at=now - timedelta(days=2))
        Entitlement.objects.create(user=self.user, feature='archive', starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=1))
        Entitlement.objects.create(user=self.user, feature='future', starts_at=now + timedelta(days=1))
        result = Entitlement.objects.active_features(self.user)
        self.assertEqual(result, ['archive', 'member'])
        self.assertNotIn('lapsed', result)
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

    @patch('django.utils.timezone.now')
    def test_starts_at_equal_to_now_is_active(self, mock_now):
        # Boundary test: an entitlement starting exactly at 'now' (starts_at == now)
        # should be active, per the rule "starts_at <= now".
        frozen_time = datetime(2026, 9, 9, 12, 0, 0, tzinfo=dt_timezone.utc)
        mock_now.return_value = frozen_time

        Entitlement.objects.create(user=self.user, feature='ontime', starts_at=frozen_time)
        result = Entitlement.objects.active_features(self.user)
        self.assertEqual(result, ['ontime'])

    @patch('django.utils.timezone.now')
    def test_ends_at_equal_to_now_is_not_active(self, mock_now):
        # Boundary test: an entitlement ending exactly at 'now' (ends_at == now)
        # should NOT be active, per the rule "ends_at in future" (strict >).
        frozen_time = datetime(2026, 9, 9, 12, 0, 0, tzinfo=dt_timezone.utc)
        mock_now.return_value = frozen_time

        Entitlement.objects.create(user=self.user, feature='expired', starts_at=frozen_time - timedelta(days=1), ends_at=frozen_time)
        result = Entitlement.objects.active_features(self.user)
        self.assertEqual(result, [])
        self.assertNotIn('expired', result)
