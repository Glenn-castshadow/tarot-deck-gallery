const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const P = require('../tools/proof_weekly_prose.cjs');
const W = require('../tools/write_weekly_prose.cjs');

test('wordEdits counts deleted plus inserted words', () => {
  assert.equal(P.wordEdits('a b c d', 'a b c d'), 0);
  assert.equal(P.wordEdits('a b c d', 'a x c d'), 2);    // one word replaced
  assert.equal(P.wordEdits('a b c d', 'a b c d e'), 1);
  assert.equal(P.wordEdits('a b c d', 'd c b a'), 6);
});

test('parseVerdict accepts fenced or chatty JSON and rejects anything else', () => {
  assert.deepEqual(P.parseVerdict('{"verdict":"pass","reason":"","corrected":"x"}'), {verdict: 'pass', reason: '', corrected: 'x'});
  const fence = '`'.repeat(3);
  assert.deepEqual(P.parseVerdict(`Here you go:\n${fence}json\n{"verdict":"fail","reason":"wrong weekday"}\n${fence}`), {verdict: 'fail', reason: 'wrong weekday', corrected: ''});
  assert.equal(P.parseVerdict('{"verdict":"maybe"}'), null);
  assert.equal(P.parseVerdict('no json here'), null);
});

// A valid week file built from the writer's own examples, so every block passes its validator.
const WEEK = '2026-09-07';
function seed(dir, extra = {}) {
  const sub = JSON.parse(W.EXAMPLE_SUBJECTS);
  const file = {week: WEEK, generated: 'x', model: 'muse-glimmer-30b-local', overview: W.EXAMPLE_OVERVIEW,
    signs: {taurus: W.EXAMPLE_SIGN}, subjects: sub.subjects, preview: sub.preview, ...extra};
  fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(file));
}
const read = dir => JSON.parse(fs.readFileSync(path.join(dir, `${WEEK}.json`), 'utf8'));

// A stand-in for Qwen. `reply(key, text)` returns the raw string the model answers with.
function fakeQwen(reply, {alias = 'qwen3.8-27b-local', calls = []} = {}) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: alias})};
    const body = JSON.parse(init.body), user = body.messages.find(m => m.role === 'user').content;
    const key = user.match(/^Block: (\w+)/)[1], text = user.slice(user.indexOf('TEXT:\n') + 6);
    calls.push({key, temperature: body.temperature});
    return {ok: true, json: async () => ({choices: [{message: {content: reply(key, text)}}]})};
  };
}
async function run(reply, options, body, seedExtra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-proof-')), original = globalThis.fetch;
  try {
    seed(dir, seedExtra);
    // The engine's real sheet for that week differs from the examples' sheet, so hand the tool the
    // example sheets: main accepts a sheet override for tests through options.sheet.
    globalThis.fetch = fakeQwen(reply, options);
    return await body(dir);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
}
const SHEET = {...W.EXAMPLE_SHEET, signs: [W.EXAMPLE_SIGN_SHEET]};
const pass = () => JSON.stringify({verdict: 'pass', reason: '', corrected: ''});

test('a pass records the verdict and the sha of the text, at a low temperature', async () => {
  const calls = [];
  await run(pass, {calls}, async dir => {
    assert.equal(await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}), 3);   // one sign is fewer than ten
    const f = read(dir);
    assert.deepEqual(Object.keys(f.proof.blocks).sort(), ['overview', 'subjects', 'taurus']);
    assert.deepEqual(f.proof.blocks.taurus, {verdict: 'pass', reason: '', edited: false, sha: P.sha(W.EXAMPLE_SIGN)});
    assert.equal(f.proof.model, 'qwen3.8-27b-local');
    assert.equal(calls[0].temperature, 0.2);
  });
});

test('a fail moves the text to rejected and out of the issue', async () => {
  const reply = key => key === 'taurus' ? JSON.stringify({verdict: 'fail', reason: 'says Friday, the sheet says Thursday'}) : pass();
  await run(reply, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const f = read(dir);
    assert.equal('taurus' in f.signs, false);
    assert.deepEqual(f.rejected.taurus, {text: W.EXAMPLE_SIGN, reason: 'says Friday, the sheet says Thursday'});
    assert.equal(f.proof.blocks.taurus.verdict, 'fail');
  });
});

test('a small valid correction is applied and the original kept', async () => {
  const fixed = W.EXAMPLE_SIGN.replace('better order', 'good order');
  const reply = key => key === 'taurus' ? JSON.stringify({verdict: 'pass', reason: '', corrected: fixed}) : pass();
  await run(reply, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const f = read(dir);
    assert.equal(f.signs.taurus, fixed);
    assert.equal(f.originals.taurus, W.EXAMPLE_SIGN);
    assert.deepEqual([f.proof.blocks.taurus.edited, f.proof.blocks.taurus.sha], [true, P.sha(fixed)]);
  });
});

test('a correction that rewrites too much, or breaks the validator, is discarded', async () => {
  const rewritten = W.EXAMPLE_SIGN.split(' ').map((w, i) => i % 5 === 0 ? 'indeed' : w).join(' ');   // about 20% of the words
  const broken = W.EXAMPLE_SIGN.replace('Keep Sunday small', 'Sunday will be small');               // two words, but uses "will"
  for (const corrected of [rewritten, broken]) {
    const reply = key => key === 'taurus' ? JSON.stringify({verdict: 'pass', reason: '', corrected}) : pass();
    await run(reply, {}, async dir => {
      await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
      const f = read(dir);
      assert.equal(f.signs.taurus, W.EXAMPLE_SIGN);
      assert.equal(f.originals?.taurus, undefined);
      assert.deepEqual([f.proof.blocks.taurus.verdict, f.proof.blocks.taurus.edited], ['pass', false]);
    });
  }
});

test('a block with a current pass is not sent again; a block whose text changed is', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-proof-')), original = globalThis.fetch;
  try {
    seed(dir);
    globalThis.fetch = fakeQwen(pass);
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const calls = [];
    globalThis.fetch = fakeQwen(pass, {calls});
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.deepEqual(calls, []);
    const f = read(dir);
    f.overview = f.overview.replace('cleanest', 'clearest');
    fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.deepEqual(calls.map(c => c.key), ['overview']);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
});

test('a re-proofed pass clears an old rejection for that block', async () => {
  await run(pass, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.equal(read(dir).rejected?.taurus, undefined);
  }, {rejected: {taurus: {text: 'old', reason: 'old'}}});
});

test('unparsable replies use up three attempts and leave the block unproofed', async () => {
  const calls = [];
  const reply = key => key === 'overview' ? 'I think it is fine.' : pass();
  await run(reply, {calls}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.equal(calls.filter(c => c.key === 'overview').length, 3);
    const f = read(dir);
    assert.equal('overview' in f.proof.blocks, false);
    assert.equal(f.overview, W.EXAMPLE_OVERVIEW);
  });
});

test('exit codes: 2 for the wrong model, 1 for a missing file', async () => {
  await run(pass, {alias: 'muse-glimmer-30b-local'}, async dir => {
    assert.equal(await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}), 2);
    assert.equal('proof' in read(dir), false);
  });
  await run(pass, {}, async dir => assert.equal(await P.main(['--week', '2026-09-14', '--out', dir], {sheet: SHEET}), 1));
});

test('a corrected subjects block is hashed in its canonical form and is not sent again', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-proof-')), original = globalThis.fetch;
  try {
    seed(dir);
    // First run: Qwen corrects one word in subjects but pretty-prints the reply
    const sub = JSON.parse(W.EXAMPLE_SUBJECTS);
    const corrected = {subjects: [sub.subjects[0].replace('changes the mood', 'lifts the mood'), ...sub.subjects.slice(1)], preview: sub.preview};
    const fence = '`'.repeat(3);
    const correctedReply = key => key === 'subjects' ? JSON.stringify({verdict: 'pass', reason: '', corrected: `${fence}json\n${JSON.stringify(corrected, null, 2)}\n${fence}`}) : pass();
    globalThis.fetch = fakeQwen(correctedReply);
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    let f = read(dir);
    assert.equal(f.subjects[0], corrected.subjects[0]);
    assert.equal(f.proof.blocks.subjects.edited, true);
    assert.equal(f.proof.blocks.subjects.sha, P.sha(JSON.stringify({subjects: f.subjects, preview: f.preview})));
    assert.equal(f.originals.subjects, W.EXAMPLE_SUBJECTS);
    // Second run: verify subjects is not re-sent (no correction needed, sha now matches canonical)
    const calls = [];
    globalThis.fetch = fakeQwen(pass, {calls});
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.deepEqual(calls.map(c => c.key), []);  // no subjects call
    f = read(dir);
    assert.equal(f.originals.subjects, W.EXAMPLE_SUBJECTS);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
});

test('a fenced, reformatted subjects reply with identical values leaves edited false', async () => {
  const sub = JSON.parse(W.EXAMPLE_SUBJECTS);
  const fence = '`'.repeat(3);
  const correctedReply = key => key === 'subjects' ? JSON.stringify({verdict: 'pass', reason: '', corrected: `${fence}json\n${JSON.stringify(sub, null, 2)}\n${fence}`}) : pass();
  await run(correctedReply, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const f = read(dir);
    assert.equal(f.proof.blocks.subjects.edited, false);
    assert.equal(f.originals?.subjects, undefined);
  });
});

test('ten passed signs and a passed overview return 0', async () => {
  const names = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn'];
  const sheet = {...W.EXAMPLE_SHEET, signs: names.map(n => ({...W.EXAMPLE_SIGN_SHEET, sign: n[0].toUpperCase() + n.slice(1)}))};
  await run(pass, {}, async dir => {
    assert.equal(await P.main(['--week', WEEK, '--out', dir], {sheet}), 0);
  }, {signs: Object.fromEntries(names.map(n => [n, W.EXAMPLE_SIGN]))});
});
