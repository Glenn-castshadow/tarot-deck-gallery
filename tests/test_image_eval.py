"""Exercise the review/retry state machine and prevent misleading trial results."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import image_eval as ev


class ImageEvalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run = self.root / 'run'
        self.art = self.root / 'art.png'
        self.other = self.root / 'other.png'
        Image.new('RGB', (96, 160), '#aa3355').save(self.art)
        Image.new('RGB', (96, 160), '#3355aa').save(self.other)
        self.suite = self.root / 'suite.json'
        self.config = self.root / 'candidates.json'
        ev.write(self.suite, dict(version=1, repeats=2, max_attempts=2,
                                 technical=dict(min_width=95, min_height=150, aspect_min=.58, aspect_max=.62),
                                 quality_dimensions=['style', 'composition', 'detail'], minimum_quality=3,
                                 cases=[dict(id='count-test', name='Count test', mode='generate', reference='art.png',
                                             prompt='Draw exactly seven swords.', requirements=['Exactly seven swords.'])]))
        ev.write(self.config, {'candidates': [dict(id='test-model', label='Test', provider='Unit fixture', model='fixture', settings={})]})
        ev.init_run(self.root, self.suite, self.config, self.run)
        self.trial = 'test-model--count-test--1'

    def review(self, success=True):
        return dict(reviewer='Fixture reviewer', reviewer_kind='human', requirements=[success],
                    quality=dict(style=4, composition=4, detail=4), clean=True,
                    feedback='Seven swords visible.' if success else 'Six visible; add one sword at the left.')

    def state(self):
        return ev.load_run(self.run)

    def test_failed_count_queues_targeted_edit_then_passes_without_hiding_first_failure(self):
        ev.record_attempt(self.run, self.trial, image=self.art, usd=.1)
        ev.review_attempt(self.run, self.trial, self.review(False))
        job = next(j for j in ev.jobs(self.run, *self.state()) if j['trial'] == self.trial)
        self.assertEqual(job['mode'], 'edit')
        self.assertIn('add one sword at the left', job['prompt'])
        self.assertIn('images', job['reference'])
        ev.record_attempt(self.run, self.trial, image=self.other, usd=.1)
        ev.review_attempt(self.run, self.trial, self.review())
        row = ev.metrics(*self.state())[0]
        self.assertEqual((row['first_pass'], row['final_pass'], row['planned'], row['pending']), (0, 1, 2, 1))
        self.assertAlmostEqual(row['usd_total'], .2)
        with self.assertRaises(ValueError):
            ev.record_attempt(self.run, self.trial, image=self.art)

    def test_no_overwrite_or_skipping_visual_review(self):
        ev.record_attempt(self.run, self.trial, image=self.art)
        with self.assertRaises(ValueError):
            ev.record_attempt(self.run, self.trial, image=self.other)
        row = ev.metrics(*self.state())[0]
        self.assertEqual((row['first_pass'], row['final_pass'], row['pending']), (0, 0, 2))
        bad = self.review(); bad['requirements'] = ['true']
        with self.assertRaises(ValueError):
            ev.review_attempt(self.run, self.trial, bad)

    def test_technical_and_api_failures_are_bounded_and_still_count(self):
        small = self.root / 'small.png'
        Image.new('RGB', (20, 20)).save(small)
        ev.record_attempt(self.run, self.trial, image=small)
        with self.assertRaises(ValueError):
            ev.review_attempt(self.run, self.trial, self.review())
        ev.record_attempt(self.run, self.trial, error='Provider timeout', seconds=30)
        state, suite = self.state()
        self.assertEqual(ev.trial_status(ev.find_trial(state, self.trial), 2), 'exhausted')
        self.assertEqual(ev.metrics(state, suite)[0]['technical_failures'], 1)
        self.assertEqual(ev.metrics(state, suite)[0]['generation_errors'], 1)
        self.assertNotIn(self.trial, [j['trial'] for j in ev.jobs(self.run, state, suite)])

    def test_duplicate_pixels_cannot_be_counted_as_another_independent_success(self):
        ev.record_attempt(self.run, self.trial, image=self.art)
        result = ev.record_attempt(self.run, 'test-model--count-test--2', image=self.art)
        self.assertFalse(result['technical']['pass'])
        self.assertEqual(result['technical']['duplicates'], [self.trial])

    def test_corrupt_file_is_recorded_as_failure(self):
        self.other.write_bytes(b'not an image')
        result = ev.record_attempt(self.run, self.trial, image=self.other)
        self.assertFalse(result['technical']['pass'])
        self.assertEqual(ev.metrics(*self.state())[0]['technical_failures'], 1)

    def test_reference_and_artifact_tampering_is_detected(self):
        ev.record_attempt(self.run, self.trial, image=self.other)
        state, suite = self.state()
        artifact = self.run / ev.find_trial(state, self.trial)['attempts'][0]['image']
        artifact.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'artifact changed'):
            self.state()
        artifact.write_bytes(self.other.read_bytes())
        (self.run / suite['cases'][0]['reference']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'reference changed'):
            self.state()

    def test_suite_is_frozen_and_runs_cannot_be_reinitialized(self):
        with self.assertRaises(FileExistsError):
            ev.init_run(self.root, self.suite, self.config, self.run)
        frozen = self.run / 'suite.json'
        data = ev.read(frozen); data['max_attempts'] = 20; ev.write(frozen, data)
        with self.assertRaisesRegex(ValueError, 'Frozen suite changed'):
            self.state()

    def test_git_line_ending_conversion_does_not_change_suite_identity(self):
        frozen = self.run / 'suite.json'
        frozen.write_bytes(frozen.read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n'))
        self.assertEqual(len(self.state()[0]['trials']), 2)

    def test_bad_ids_and_traversal_are_rejected(self):
        with self.assertRaises(ValueError):
            ev.identifier('../outside')
        with self.assertRaises(ValueError):
            ev.inside(self.root, '../outside')
        with self.assertRaises(ValueError):
            ev.init_run(self.root, self.suite, self.config, self.root / 'bad', ['missing'])
        self.assertFalse((self.root / 'bad').exists())

    def test_missing_metrics_are_unavailable_and_report_escapes_feedback(self):
        ev.record_attempt(self.run, self.trial, image=self.art)
        review = self.review(); review['feedback'] = '<script>alert(1)</script>'
        ev.review_attempt(self.run, self.trial, review)
        row = ev.metrics(*self.state())[0]
        self.assertIsNone(row['usd_total'])
        self.assertEqual(row['usd_coverage'], '0/1')
        output = ev.report(self.run).read_text()
        self.assertIn('&lt;script&gt;', output)
        self.assertNotIn('<script>', output)
        self.assertIn('Unavailable', output)

    def test_invalid_costs_and_low_quality_cannot_pass(self):
        for invalid in (-1, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                ev.record_attempt(self.run, self.trial, image=self.art, usd=invalid)
        ev.record_attempt(self.run, self.trial, image=self.art)
        review = self.review(); review['quality']['detail'] = 2
        self.assertFalse(ev.review_attempt(self.run, self.trial, review)['pass'])

    def test_two_models_receive_identical_frozen_trials_and_separate_totals(self):
        config = ev.read(self.config)
        config['candidates'].append(dict(id='second-model', label='Second', provider='Fixture', model='two', settings={}))
        ev.write(self.config, config)
        second_run = self.root / 'comparison'
        ev.init_run(self.root, self.suite, self.config, second_run)
        queue = ev.jobs(second_run, *ev.load_run(second_run))
        self.assertEqual(len(queue), 4)
        self.assertEqual(len({j['prompt'] for j in queue}), 1)
        self.assertEqual(len({j['reference'] for j in queue}), 1)
        ev.record_attempt(second_run, self.trial, image=self.art)
        ev.review_attempt(second_run, self.trial, self.review())
        rows = ev.metrics(*ev.load_run(second_run))
        self.assertEqual([(r['candidate'], r['first_pass'], r['planned']) for r in rows], [('test-model', 1, 2), ('second-model', 0, 2)])


if __name__ == '__main__':
    unittest.main()
