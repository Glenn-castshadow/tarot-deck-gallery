from django.contrib.auth import get_user_model
from django.test import TestCase

PROFILE = {'birthday': '1990-05-04', 'time': '07:30', 'place': 'Portland, Oregon',
           'placeLocation': {'source': 'city', 'label': 'Portland, Oregon', 'latitude': 45.5, 'longitude': -122.6, 'timeZone': 'America/Los_Angeles'},
           'houseSystem': 'placidus', 'orbScale': 1, 'fold': ''}


class ProfileApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(self.user)

    def test_summary_requires_login(self):
        self.client.logout()
        response = self.client.get('/api/account/')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {'error': 'Sign in to continue.'})

    def test_summary_shape_and_csrf_cookie(self):
        response = self.client.get('/api/account/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'email': 'reader@example.com', 'features': [], 'profile': None, 'newsletter': False})
        self.assertIn('csrftoken', response.cookies)

    def test_profile_round_trip(self):
        put = self.client.put('/api/account/profile/', PROFILE, content_type='application/json')
        self.assertEqual(put.status_code, 200)
        self.assertTrue(put.json()['ok'])
        self.assertEqual(self.client.get('/api/account/').json()['profile'], PROFILE)
        delete = self.client.delete('/api/account/profile/')
        self.assertEqual(delete.status_code, 200)
        self.assertIsNone(self.client.get('/api/account/').json()['profile'])

    def test_profile_rejects_unknown_keys_and_oversize(self):
        bad = self.client.put('/api/account/profile/', dict(PROFILE, name='x'), content_type='application/json')
        self.assertEqual(bad.status_code, 400)
        big = self.client.put('/api/account/profile/', dict(PROFILE, place='x' * 5000), content_type='application/json')
        self.assertEqual(big.status_code, 400)
        self.assertIn('error', big.json())

    def test_profile_requires_json_object(self):
        response = self.client.put('/api/account/profile/', '[1]', content_type='application/json')
        self.assertEqual(response.status_code, 400)
