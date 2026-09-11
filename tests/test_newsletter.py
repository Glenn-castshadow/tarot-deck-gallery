"""Tests for the retired stdlib newsletter service (server/newsletter.py). Retired 2026-09; the live contract tests are in server/ishtar/newsletter/tests."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('newsletter', Path(__file__).parents[1] / 'server/newsletter.py')
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)
class SignupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        service.DB = str(Path(self.tmp.name) / 'test.sqlite3')
        self.payload = {'email': 'Test@example.com', 'consent': True, 'consentVersion': service.CONSENT_VERSION}
    def tearDown(self):
        self.tmp.cleanup()
    def test_consent_and_no_birth_data(self):
        for payload in [dict(self.payload, consent=False), dict(self.payload, birthday='1990-01-01'), dict(self.payload, email='bad'), dict(self.payload, consentVersion='old')]:
            with self.assertRaises(ValueError): service.subscribe(payload)
    def test_idempotent_and_consent_record(self):
        service.subscribe(self.payload); service.subscribe(self.payload)
        with service.connect() as db:
            rows=db.execute('select * from subscribers').fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][0], 'test@example.com')
        self.assertEqual(rows[0][3], service.CONSENT_TEXT)
        self.assertTrue(rows[0][1])
    def test_remove_by_token_and_email(self):
        service.subscribe(self.payload)
        with service.connect() as db: token=db.execute('select unsubscribe_token from subscribers').fetchone()[0]
        service.unsubscribe({'token': token})
        service.subscribe(self.payload)
        service.unsubscribe({'email': 'Test@example.com'})
        with service.connect() as db: self.assertEqual(db.execute('select count(*) from subscribers').fetchone()[0],0)
if __name__ == '__main__': unittest.main()
