"""Local, resumable image trial queue. Generation and visual review are explicit inputs.

No model API is called by this program. Run `--help` and see evals/tarot-images/README.md.
"""
import argparse
import hashlib
import html
import json
import math
import random
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def now():
    return datetime.now(timezone.utc).isoformat()


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    path = Path(path)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    temp.replace(path)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def suite_digest(suite):
    # Git may translate CRLF/LF on checkout; freeze JSON content, not line endings.
    return hashlib.sha256(json.dumps(suite, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')).hexdigest()


def identifier(value):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value):
        raise ValueError('IDs must contain lowercase words/digits separated by hyphens.')
    return value


def inside(root, value):
    target = (Path(root) / value).resolve()
    if not target.is_relative_to(Path(root).resolve()):
        raise ValueError('Path must stay inside its root.')
    return target


def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError('Metrics must be finite nonnegative numbers.')
    return value


def init_run(root, suite_path, candidates_path, run_dir, cases=None, repeats=None, seed=42):
    suite, config = read(suite_path), read(candidates_path)
    candidates = config['candidates']
    if not candidates or len({identifier(c['id']) for c in candidates}) != len(candidates):
        raise ValueError('Supply at least one candidate with a unique ID.')
    for c in candidates:
        if not all(c.get(k) for k in ('label', 'provider', 'model')) or not isinstance(c.get('settings'), dict):
            raise ValueError('Each candidate needs label, provider, model and settings. Use undisclosed when unknown.')
    if len({identifier(c['id']) for c in suite['cases']}) != len(suite['cases']):
        raise ValueError('Case IDs must be unique.')
    chosen = cases or [c['id'] for c in suite['cases']]
    if set(chosen) - {c['id'] for c in suite['cases']}:
        raise ValueError('Unknown test case.')
    suite['cases'] = [c for c in suite['cases'] if c['id'] in chosen]
    count = repeats if repeats is not None else suite['repeats']
    if not isinstance(count, int) or not 1 <= count <= 20:
        raise ValueError('Repeats must be between 1 and 20.')
    if not isinstance(suite['max_attempts'], int) or not 1 <= suite['max_attempts'] <= 4:
        raise ValueError('Attempt cap must be between 1 and 4.')
    # Resolve every input before making a run directory.
    refs = [(c, inside(root, c['reference'])) for c in suite['cases']]
    for _, source in refs:
        if not source.is_file():
            raise ValueError(f'Missing local reference: {source}')
    run_dir = Path(run_dir)
    run_dir.mkdir(parents=True, exist_ok=False)
    (run_dir / 'references').mkdir()
    (run_dir / 'images').mkdir()
    for case, source in refs:
        target = Path('references') / (case['id'] + source.suffix.lower())
        shutil.copy2(source, run_dir / target)
        case['reference_origin'] = case['reference']
        case['reference'] = target.as_posix()
        case['reference_sha256'] = digest(run_dir / target)
    trials = [dict(id=f'{c["id"]}--{case["id"]}--{r}', candidate=c['id'], case=case['id'], repeat=r, attempts=[])
              for c in candidates for case in suite['cases'] for r in range(1, count + 1)]
    random.Random(seed).shuffle(trials)
    write(run_dir / 'suite.json', suite)
    state = dict(version=1, created=now(), suite_sha256=suite_digest(suite),
                 repeats=count, order_seed=seed, candidates=candidates, trials=trials)
    write(run_dir / 'run.json', state)
    return state


def load_run(run_dir):
    run_dir = Path(run_dir)
    state, suite = read(run_dir / 'run.json'), read(run_dir / 'suite.json')
    if suite_digest(suite) != state['suite_sha256']:
        raise ValueError('Frozen suite changed. Start a new run instead of changing this one.')
    for case in suite['cases']:
        if digest(inside(run_dir, case['reference'])) != case['reference_sha256']:
            raise ValueError('Frozen reference changed: ' + case['id'])
    for trial in state['trials']:
        for attempt in trial['attempts']:
            if 'image' in attempt and digest(inside(run_dir, attempt['image'])) != attempt['artifact_sha256']:
                raise ValueError('Recorded artifact changed: ' + trial['id'])
    return state, suite


def trial_status(trial, cap):
    attempts = trial['attempts']
    if not attempts:
        return 'generate'
    last = attempts[-1]
    if 'review' not in last and 'error' not in last and last.get('technical', {}).get('pass'):
        return 'review'
    if last.get('review', {}).get('pass'):
        return 'passed'
    return 'exhausted' if len(attempts) >= cap else 'retry'


def jobs(run_dir, state, suite):
    cases = {c['id']: c for c in suite['cases']}
    candidates = {c['id']: c for c in state['candidates']}
    result = []
    for trial in state['trials']:
        status = trial_status(trial, suite['max_attempts'])
        if status in ('passed', 'exhausted'):
            continue
        case = cases[trial['case']]
        previous = trial['attempts'][-1] if trial['attempts'] else None
        prompt, ref = case['prompt'], case['reference']
        mode = case['mode']
        if status == 'retry' and previous.get('image') and previous.get('technical', {}).get('pass'):
            mode, ref = 'edit', previous['image']
            prompt = ('Use case: precise-object-edit. Edit the attached previous attempt. Correct only the listed failures; '
                      'preserve the successful composition, style and objects.\nFailures: ' + previous['review']['feedback'] +
                      '\nOriginal specification for context:\n' + case['prompt'])
        result.append(dict(trial=trial['id'], status=status, candidate=candidates[trial['candidate']],
                           attempt=len(trial['attempts']) + (status != 'review'), mode=mode, prompt=prompt,
                           reference=str(inside(run_dir, ref)), requirements=case['requirements'],
                           image=str(inside(run_dir, previous['image'])) if status == 'review' else None))
    return result


def technical_check(path, policy):
    try:
        with Image.open(path) as img:
            img.load()
            width, height = img.size
            # Pixel digest catches an identical image saved under different metadata or encoding.
            rgb = img.convert('RGB')
            pixels = hashlib.sha256(f'{width}x{height}:'.encode() + rgb.tobytes()).hexdigest()
        checks = dict(resolution=width >= policy['min_width'] and height >= policy['min_height'],
                      aspect=policy['aspect_min'] <= width / height <= policy['aspect_max'])
        return dict(width=width, height=height, sha256=digest(path), pixels_sha256=pixels,
                    checks=checks, **{'pass': all(checks.values())})
    except (OSError, ValueError) as exc:
        return {'pass': False, 'error': str(exc)}


def find_trial(state, trial_id):
    return next(t for t in state['trials'] if t['id'] == trial_id)


def record_attempt(run_dir, trial_id, image=None, error=None, seconds=None, usd=None, note=''):
    state, suite = load_run(run_dir)
    trial = find_trial(state, trial_id)
    if trial_status(trial, suite['max_attempts']) not in ('generate', 'retry'):
        raise ValueError('This trial needs review or is already finished; an attempt cannot be overwritten.')
    if bool(image) == bool(error):
        raise ValueError('Supply exactly one image or generation error.')
    for value in (seconds, usd):
        if value is not None:
            finite_number(value)
    job = next(j for j in jobs(run_dir, state, suite) if j['trial'] == trial_id)
    attempt = dict(number=len(trial['attempts']) + 1, recorded=now(), prompt=job['prompt'], mode=job['mode'],
                   reference=Path(job['reference']).relative_to(Path(run_dir).resolve()).as_posix(),
                   reference_sha256=digest(job['reference']), seconds=seconds, usd=usd, note=note)
    if error:
        attempt['error'] = error
    else:
        source = Path(image)
        if not source.is_file():
            raise ValueError('Image file does not exist.')
        # Keep every attempt as supplied; technical failures remain in the denominator.
        dest = Path('images') / (trial_id + f'--a{attempt["number"]}' + source.suffix.lower())
        target = inside(run_dir, dest)
        if target.exists():
            raise ValueError('Artifact already exists; do not overwrite trial evidence.')
        shutil.copy2(source, target)
        attempt['image'] = dest.as_posix()
        attempt['artifact_sha256'] = digest(target)
        attempt['technical'] = technical_check(target, suite['technical'])
        sha = attempt['technical'].get('pixels_sha256')
        duplicates = [t['id'] for t in state['trials'] for a in t['attempts']
                      if sha and a.get('technical', {}).get('pixels_sha256') == sha]
        attempt['technical']['duplicates'] = duplicates
        if duplicates:
            attempt['technical']['pass'] = False
    trial['attempts'].append(attempt)
    write(Path(run_dir) / 'run.json', state)
    return attempt


def review_attempt(run_dir, trial_id, review):
    state, suite = load_run(run_dir)
    trial = find_trial(state, trial_id)
    if trial_status(trial, suite['max_attempts']) != 'review':
        raise ValueError('Only a technically valid, unreviewed attempt can receive visual review.')
    case = next(c for c in suite['cases'] if c['id'] == trial['case'])
    if not review.get('reviewer') or review.get('reviewer_kind') not in ('human', 'assistant'):
        raise ValueError('Identify the reviewer and reviewer_kind (human or assistant).')
    requirements = review.get('requirements')
    if not isinstance(requirements, list) or len(requirements) != len(case['requirements']) or any(type(v) is not bool for v in requirements):
        raise ValueError('Supply one true/false value for every case requirement, in order.')
    quality = review.get('quality', {})
    if set(quality) != set(suite['quality_dimensions']):
        raise ValueError('Quality scores must match the suite dimensions exactly.')
    for dimension in suite['quality_dimensions']:
        if type(quality.get(dimension)) is not int or not 1 <= quality[dimension] <= 5:
            raise ValueError('Score every quality dimension from 1 to 5.')
    if type(review.get('clean')) is not bool or not str(review.get('feedback', '')).strip():
        raise ValueError('Supply clean=true/false and concrete visual feedback (including counts).')
    attempt = trial['attempts'][-1]
    if digest(inside(run_dir, attempt['image'])) != attempt['technical']['sha256']:
        raise ValueError('Recorded artifact changed; restore it before reviewing.')
    review = {k: review[k] for k in ('reviewer', 'reviewer_kind', 'requirements', 'quality', 'clean', 'feedback')}
    review['pass'] = all(requirements) and review['clean'] and min(quality.values()) >= suite['minimum_quality']
    review['recorded'] = now()
    attempt['review'] = review
    write(Path(run_dir) / 'run.json', state)
    return review


def metrics(state, suite):
    rows = []
    for c in state['candidates']:
        trials = [t for t in state['trials'] if t['candidate'] == c['id']]
        attempts = [a for t in trials for a in t['attempts']]
        statuses = [trial_status(t, suite['max_attempts']) for t in trials]
        first = sum(bool(t['attempts'] and t['attempts'][0].get('review', {}).get('pass')) for t in trials)
        row = dict(candidate=c['id'], planned=len(trials), first_pass=first, final_pass=statuses.count('passed'),
                   exhausted=statuses.count('exhausted'), pending=sum(s not in ('passed', 'exhausted') for s in statuses),
                   attempts=len(attempts), technical_failures=sum('technical' in a and not a['technical']['pass'] for a in attempts),
                   generation_errors=sum('error' in a for a in attempts),
                   assistant_reviews=sum(a.get('review', {}).get('reviewer_kind') == 'assistant' for a in attempts))
        for field in ('seconds', 'usd'):
            values = [a[field] for a in attempts if a.get(field) is not None]
            row[field + '_total'] = sum(values) if values else None
            row[field + '_coverage'] = f'{len(values)}/{len(attempts)}'
        rows.append(row)
    return rows


def report(run_dir):
    state, suite = load_run(run_dir)
    rows = metrics(state, suite)
    write(Path(run_dir) / 'summary.json', rows)
    esc = lambda v: html.escape(str(v), quote=True)
    header = ''.join('<th>' + esc(t) + '</th>' for t in ['Candidate', 'First pass / planned', 'After retries / planned', 'Pending', 'Attempts', 'Recorded seconds', 'Recorded USD'])
    body = ''
    for row in rows:
        vals = [row['candidate'], f'{row["first_pass"]}/{row["planned"]}', f'{row["final_pass"]}/{row["planned"]}', row['pending'], row['attempts'],
                f'{row["seconds_total"] if row["seconds_total"] is not None else "Unavailable"} ({row["seconds_coverage"]})',
                f'{row["usd_total"] if row["usd_total"] is not None else "Unavailable"} ({row["usd_coverage"]})']
        body += '<tr>' + ''.join('<td>' + esc(v) + '</td>' for v in vals) + '</tr>'
    cards = ''
    cases = {c['id']: c for c in suite['cases']}
    for t in state['trials']:
        case = cases[t['case']]
        status = trial_status(t, suite['max_attempts'])
        label = {'exhausted': 'Failed · attempt limit reached', 'passed': 'Passed', 'review': 'Awaiting review', 'retry': 'Correction queued', 'generate': 'Awaiting generation'}[status]
        cards += '<article><h2>' + esc(case['name']) + '</h2><p><strong>' + esc(label) + '</strong> · repetition ' + str(t['repeat']) + ' · ' + esc(t['candidate']) + '</p>'
        cards += '<details><summary>Reference, prompt and requirements</summary><a href="' + esc(case['reference']) + '"><img loading="lazy" alt="Test reference" src="' + esc(case['reference']) + '"></a><pre>' + esc(case['prompt']) + '</pre><ul>'
        cards += ''.join('<li>' + esc(r) + '</li>' for r in case['requirements']) + '</ul></details><div class="attempts">'
        for a in t['attempts']:
            cards += '<section><h3>Attempt ' + str(a['number']) + '</h3>'
            if 'image' in a:
                cards += '<a href="' + esc(a['image']) + '"><img loading="lazy" src="' + esc(a['image']) + '" alt="' + esc(case['name']) + '"></a>'
            if 'review' in a:
                review = a['review']
                cards += '<p><strong>' + ('Pass' if review['pass'] else 'Fail') + '</strong> · reviewed by ' + esc(review['reviewer']) + ' (' + esc(review['reviewer_kind']) + ')</p><p>' + esc(review['feedback']) + '</p>'
                cards += '<p>' + ' · '.join(esc(k.title()) + ' ' + str(v) + '/5' for k, v in review['quality'].items()) + '</p>'
            elif 'error' in a:
                cards += '<p>Generation failed: ' + esc(a['error']) + '</p>'
            else:
                cards += '<p>' + ('Awaiting visual review' if a['technical']['pass'] else 'File or independence check failed') + '</p>'
            cards += '<details><summary>Full attempt record</summary><pre>' + esc(json.dumps(a, indent=2)) + '</pre></details></section>'
        cards += '</div></article>'
    content = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tarot image trials</title><style>
body{margin:0;background:#131217;color:#f1ebe0;font:16px/1.55 system-ui}main{max-width:1400px;margin:auto;padding:32px}h1{font:44px Georgia}h2{font:28px Georgia}
a{color:#ebca92}table{border-collapse:collapse;width:100%}td,th{padding:12px;text-align:left;border-bottom:1px solid #4a414c}.scroll{overflow:auto}
article{padding:28px 0;border-top:1px solid #4a414c;margin-top:32px}.attempts{display:flex;gap:28px;flex-wrap:wrap}.attempts section{flex:1;min-width:260px;max-width:650px}
img{max-width:100%;width:420px;height:auto;display:block;margin:16px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.5 monospace}summary{cursor:pointer;color:#ebca92}
.note{max-width:85ch;color:#c9c0cb}code{overflow-wrap:anywhere}@media(max-width:600px){main{padding:18px}h1{font-size:34px}}
</style><main><p>ISHTAR INSIGHTS · ART LAB</p><h1>Tarot image trials</h1>
<p class="note">Each card links to its full image. First-pass success and success after corrections are separate. Pending trials remain in the planned denominator; incomplete runs cannot establish a winner. Reviews are subjective and identify their reviewer. This is a small challenge set, not a general model ranking.</p>
<p class="note">Pixel checks cover size, ratio and exact duplicates only. They do not count symbols, assess style or certify print quality. Reversible backs require visual comparison after a 180° turn and may need production correction. Missing cost or time is unavailable, not zero.</p>'''
    content += '<p>' + str(len(state['candidates'])) + ' candidate(s) · ' + str(len(suite['cases'])) + ' cases · ' + str(state['repeats']) + ' repetitions · ' + str(suite['max_attempts']) + ' attempts maximum per trial</p>'
    content += '<div class="scroll"><table><thead><tr>' + header + '</tr></thead><tbody>' + body + '</tbody></table></div>'
    content += '<details><summary>Candidate settings and provenance</summary><pre>' + esc(json.dumps(state['candidates'], indent=2)) + '</pre></details>' + cards + '</main></html>'
    dest = Path(run_dir) / 'report.html'
    dest.write_text(content, encoding='utf-8')
    return dest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('init', help='Freeze prompts/references and create an ordered run queue.')
    p.add_argument('run'); p.add_argument('--suite', default=str(ROOT / 'evals/tarot-images/suite.json'))
    p.add_argument('--candidates', default=str(ROOT / 'evals/tarot-images/candidates.json'))
    p.add_argument('--cases', nargs='+'); p.add_argument('--repeats', type=int); p.add_argument('--seed', type=int, default=42)
    p = sub.add_parser('queue', help='Show next generation/review actions; never calls an API.')
    p.add_argument('run')
    p = sub.add_parser('record', help='Record every output or generation failure before reviewing.')
    p.add_argument('run'); p.add_argument('trial')
    p.add_argument('--image'); p.add_argument('--error'); p.add_argument('--seconds', type=float); p.add_argument('--usd', type=float); p.add_argument('--note', default='')
    p = sub.add_parser('review', help='Apply an explicit visual review JSON; failed checks queue a correction.')
    p.add_argument('run'); p.add_argument('trial'); p.add_argument('--file', required=True)
    p = sub.add_parser('report', help='Write a local full-size review gallery and machine-readable summary.')
    p.add_argument('run')
    args = parser.parse_args()
    try:
        if args.command == 'init':
            value = init_run(ROOT, args.suite, args.candidates, args.run, args.cases, args.repeats, args.seed)
            print(f'Created {len(value["trials"])} trials in {args.run}')
        elif args.command == 'queue':
            print(json.dumps(jobs(args.run, *load_run(args.run)), indent=2))
        elif args.command == 'record':
            print(json.dumps(record_attempt(args.run, args.trial, args.image, args.error, args.seconds, args.usd, args.note), indent=2))
        elif args.command == 'review':
            print(json.dumps(review_attempt(args.run, args.trial, read(args.file)), indent=2))
        elif args.command == 'report':
            print(report(args.run))
    except (ValueError, OSError, KeyError, StopIteration) as exc:
        parser.exit(1, f'Error: {exc}\n')


if __name__ == '__main__':
    main()
