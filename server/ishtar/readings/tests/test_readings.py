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
        iching = self.create({'kind': 'iching', 'layout': 'coins', 'payload': {'lines': [7, 8, 9, 6, 7, 8]}})
        self.assertEqual(iching.status_code, 201)
        fetched = self.client.get(f"/api/readings/{iching.json()['id']}/").json()
        self.assertEqual(fetched['kind'], 'iching')
        self.assertEqual(fetched['payload'], {'lines': [7, 8, 9, 6, 7, 8]})
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

    def test_surrogate_in_payload_returns_4xx_not_500(self):
        # Fix round 2, Item A: json.loads does not validate UTF-16 surrogate
        # pairing (a CPython quirk), so a JSON body containing a literal
        # \ud800 escape parses cleanly into a Python str holding a lone
        # surrogate. json_byte_size's json.dumps(..., ensure_ascii=False)
        # passes that character straight through, and .encode('utf-8') then
        # raises UnicodeEncodeError. Sending the literal backslash-u escape
        # text below -- what a hostile client actually puts on the wire --
        # rather than building '\ud800' as an in-memory Python string is what
        # makes this reach json.loads's real surrogate-tolerant behavior;
        # Django's test client would otherwise re-escape an in-memory
        # surrogate back to this same text anyway (ensure_ascii=True on the
        # way out), so this is also the more direct, less incidental route.
        body = '{"kind": "oracle", "payload": {"blob": "\\ud800"}}'
        response = self.client.post('/api/readings/', body, content_type='application/json')
        self.assertTrue(400 <= response.status_code < 500, response.status_code)
        self.assertIn('error', response.json())


from readings.kinds import KINDS, CATEGORIES

class KindsTests(TestCase):
    def test_every_kind_has_a_known_category(self):
        for kind, (label, category) in KINDS.items():
            self.assertIn(category, CATEGORIES, kind)
            self.assertTrue(label)
            self.assertLessEqual(len(kind), 32)

    def test_existing_kinds_are_still_present(self):
        for kind in ('tarot-daily', 'tarot-spread', 'lenormand', 'oracle', 'runes', 'geomancy', 'iching'):
            self.assertIn(kind, KINDS)

class SummaryCategoryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('reader@example.com')
        self.client.force_login(self.user)

    def test_summary_is_stored_and_category_derived(self):
        body = dict(SPREAD, summary='Celtic Cross · What next?')
        row = self.client.post('/api/readings/', body, content_type='application/json').json()
        self.assertEqual(row['summary'], 'Celtic Cross · What next?')
        self.assertEqual(row['category'], 'tarot')
        listed = self.client.get('/api/readings/').json()['readings'][0]
        self.assertEqual(listed['summary'], 'Celtic Cross · What next?')

    def test_summary_too_long_is_rejected(self):
        body = dict(SPREAD, summary='x' * 121)
        self.assertEqual(self.client.post('/api/readings/', body, content_type='application/json').status_code, 400)

    def test_category_filter(self):
        self.client.post('/api/readings/', SPREAD, content_type='application/json')
        self.client.post('/api/readings/', {'kind': 'runes', 'payload': {'ids': [1]}}, content_type='application/json')
        self.assertEqual(self.client.get('/api/readings/?category=divination').json()['count'], 1)
        self.assertEqual(self.client.get('/api/readings/?kind=tarot-spread').json()['count'], 1)
        self.assertEqual(self.client.get('/api/readings/?category=nope').status_code, 400)
