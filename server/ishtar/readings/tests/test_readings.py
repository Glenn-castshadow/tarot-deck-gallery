from django.contrib.auth import get_user_model
from django.test import TestCase

from readings.models import Reading

SPREAD = {'kind': 'tarot-spread', 'deck': 'ishtar', 'layout': 'celtic', 'question': 'What next?', 'focus': 'work',
          'payload': {'id': 'celtic', 'question': 'What next?', 'focus': 'work', 'cards': [{'index': i, 'orientation': 'upright'} for i in range(10)]}}


class ReadingApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('reader@example.com')
        self.other = get_user_model().objects.create_user('other@example.com')
        self.client.force_login(self.user)

    def create(self, body=SPREAD):
        return self.client.post('/api/readings/', body, content_type='application/json')

    def test_create_list_get_patch_delete(self):
        created = self.create()
        self.assertEqual(created.status_code, 201)
        row = created.json()
        self.assertEqual(row['payload'], SPREAD['payload'])
        listing = self.client.get('/api/readings/').json()
        self.assertEqual(listing['count'], 1)
        self.assertNotIn('payload', listing['readings'][0])
        self.assertEqual(listing['readings'][0]['layout'], 'celtic')
        one = self.client.get(f"/api/readings/{row['id']}/").json()
        self.assertEqual(one['payload']['cards'][3]['index'], 3)
        patched = self.client.patch(f"/api/readings/{row['id']}/", {'note': 'Felt right.'}, content_type='application/json')
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.json()['note'], 'Felt right.')
        self.assertEqual(self.client.delete(f"/api/readings/{row['id']}/").json(), {'ok': True})
        self.assertEqual(self.client.get('/api/readings/').json()['count'], 0)

    def test_other_users_readings_are_404(self):
        row = self.create().json()
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(f"/api/readings/{row['id']}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/readings/{row['id']}/").status_code, 404)
        self.assertEqual(self.client.get('/api/readings/').json()['count'], 0)

    def test_validation(self):
        self.assertEqual(self.create(dict(SPREAD, kind='tea-leaves')).status_code, 400)
        self.assertEqual(self.create(dict(SPREAD, question='q' * 241)).status_code, 400)
        self.assertEqual(self.create(dict(SPREAD, payload={'blob': 'x' * 9000})).status_code, 400)
        self.assertEqual(self.create({'kind': 'runes', 'payload': {'ids': [1, 2, 3]}}).status_code, 201)
        self.assertEqual(self.create(dict(SPREAD, extra=1)).status_code, 400)
        long_note = self.client.patch(f"/api/readings/{self.create().json()['id']}/", {'note': 'n' * 4001}, content_type='application/json')
        self.assertEqual(long_note.status_code, 400)

    def test_cap_and_pagination(self):
        Reading.objects.bulk_create([Reading(user=self.user, kind='runes', payload={'ids': [i]}) for i in range(500)])
        self.assertEqual(self.create().status_code, 409)
        page = self.client.get('/api/readings/?page=2').json()
        self.assertEqual(page['page'], 2)
        self.assertEqual(page['pages'], 10)
        self.assertEqual(len(page['readings']), 50)

    def test_requires_login(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/readings/').status_code, 401)
