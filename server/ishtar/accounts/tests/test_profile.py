import json

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

    def test_profile_surrogate_returns_4xx_not_500(self):
        # Fix round 2, Item B: same defect as readings' Item A, but for the
        # profile's 4 KB cap. json.loads does not validate UTF-16 surrogate
        # pairing, so a JSON body containing a literal \ud800 escape parses
        # cleanly into a Python str holding a lone surrogate; measuring its
        # UTF-8 byte size then raises UnicodeEncodeError unless something
        # catches it. Sending the literal backslash-u escape text below is
        # what a hostile client actually puts on the wire.
        body = '{"birthday": "\\ud800"}'
        response = self.client.put('/api/account/profile/', body, content_type='application/json')
        self.assertTrue(400 <= response.status_code < 500, response.status_code)
        self.assertIn('error', response.json())

    def test_profile_accented_text_under_true_byte_limit_is_accepted(self):
        # The naive char-count check (len(json.dumps(data))) escapes every
        # non-ASCII character to a 6-char \uXXXX sequence by default, wildly
        # over-counting accented text -- exactly what a real birthplace field
        # ("Bogota", "Reykjavik", ...) contains. Build a profile whose true
        # UTF-8 size is comfortably under the 4 KB cap but whose naive
        # escaped-character count is well over it, and confirm the naive
        # count really would have rejected it before asserting the fixed
        # check accepts it.
        data = {'place': 'á' * 1000}
        naive_char_count = len(json.dumps(data))
        true_byte_size = len(json.dumps(data, ensure_ascii=False).encode('utf-8'))
        self.assertGreater(naive_char_count, 4 * 1024)
        self.assertLess(true_byte_size, 3 * 1024)
        response = self.client.put('/api/account/profile/', data, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/account/').json()['profile'], data)
