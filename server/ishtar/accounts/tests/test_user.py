from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase


class UserModelTests(TestCase):
    def test_create_user_lowercases_email_and_has_unusable_password(self):
        user = get_user_model().objects.create_user('Reader@Example.com')
        self.assertEqual(user.email, 'reader@example.com')
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_staff)

    def test_email_is_unique_case_insensitively(self):
        get_user_model().objects.create_user('reader@example.com')
        with self.assertRaises(IntegrityError):
            get_user_model().objects.create_user('READER@example.com')

    def test_superuser_has_password_and_flags(self):
        admin = get_user_model().objects.create_superuser('admin@example.com', 'correct horse')
        self.assertTrue(admin.is_staff and admin.is_superuser)
        self.assertTrue(admin.check_password('correct horse'))

    def test_health_endpoint(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
