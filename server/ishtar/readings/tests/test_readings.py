import json

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

    def test_non_string_kind_returns_400_not_500(self):
        # Finding 1: `body['kind'] not in KINDS` raises TypeError when `kind`
        # is an unhashable type (e.g. a list), which without a type guard
        # escapes as an uncaught 500 instead of the normal validation 400.
        response = self.create(dict(SPREAD, kind=['tarot-spread']))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Unknown reading kind.'})

    def test_deeply_nested_json_returns_400_not_500_pre_auth(self):
        # Finding 2: json.loads inside ishtar.api.json_view raises
        # RecursionError on hostile nesting. json_view wraps auth_required
        # (parsing happens before the auth check), so this is reachable
        # without logging in -- confirmed here by logging out first.
        self.client.logout()
        nested = ('[' * 1200) + (']' * 1200)
        response = self.client.post('/api/readings/', nested, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Invalid JSON.'})

    def test_non_ascii_payload_under_true_byte_limit_is_accepted(self):
        # Finding 3: the payload cap must measure real UTF-8 bytes, not the
        # inflated character count `json.dumps` produces by default (every
        # non-ASCII codepoint becomes a 6-character \uXXXX escape). Build a
        # payload whose true UTF-8 size is comfortably under the 8 KB cap but
        # whose naive escaped-character count is well over it, and confirm
        # the naive count really would have rejected it before asserting the
        # fixed check accepts it.
        payload = {'blob': 'á' * 2048}
        naive_char_count = len(json.dumps(payload))
        true_byte_size = len(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        self.assertGreater(naive_char_count, 8 * 1024)
        self.assertLess(true_byte_size, 6 * 1024)
        response = self.create(dict(SPREAD, payload=payload))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['payload'], payload)
