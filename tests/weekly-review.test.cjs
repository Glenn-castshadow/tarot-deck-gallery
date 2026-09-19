const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const P = require('../tools/proof_weekly_prose.cjs');
const R = require('../tools/review_weekly_prose.cjs');
const W = require('../tools/write_weekly_prose.cjs');

const WEEK = '2026-09-07';
const SHEET = {...W.EXAMPLE_SHEET, signs: [W.EXAMPLE_SIGN_SHEET]};
// A grammar fix a person would take and the fact-word guard cannot clear: it drops a tracked word.
const CLUMSY = W.EXAMPLE_SIGN.replace('On Sunday the New moon falls', 'On Sunday Moon the New moon falls');
const TIDIED = W.EXAMPLE_SIGN;

function seed(dir, signText) {
  const sub = JSON.parse(W.EXAMPLE_SUBJECTS);
  fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify({week: WEEK, generated: 'x', model: 'muse-glimmer-30b-local',
    overview: W.EXAMPLE_OVERVIEW, signs: {taurus: signText}, subjects: sub.subjects, preview: sub.preview}));
}
const read = dir => JSON.parse(fs.readFileSync(path.join(dir, `${WEEK}.json`), 'utf8'));
const pass = corrected => JSON.stringify({verdict: 'pass', reason: '', corrected: corrected || ''});
function fakeQwen(reply) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: 'qwen3.8-27b-local'})};
    const user = JSON.parse(init.body).messages.find(m => m.role === 'user').content;
    return {ok: true, json: async () => ({choices: [{message: {content: reply(user.match(/^Block: (\w+)/)[1])}}]})};
  };
}
async function proofed(signText, reply, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-review-')), original = globalThis.fetch;
  try {
    seed(dir, signText);
    globalThis.fetch = fakeQwen(reply);
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    return await body(dir);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
}
const offerTidied = key => key === 'taurus' ? pass(TIDIED) : pass();

test('the fixture is what it claims: valid text, and a fix the fact-word guard refuses', () => {
  assert.equal(W.validateSign(CLUMSY, W.EXAMPLE_SIGN_SHEET), null);
  assert.equal(W.validateSign(TIDIED, W.EXAMPLE_SIGN_SHEET), null);
  assert.notEqual(P.factWords(CLUMSY), P.factWords(TIDIED));
});

test('a correction the guard refuses is kept as a suggestion, and the text stands', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const f = read(dir);
    assert.equal(f.signs.taurus, CLUMSY);
    assert.deepEqual(f.suggested, {taurus: {text: TIDIED, why: 'it changes a fact word'}});
    assert.deepEqual(f.proof.blocks.taurus, {verdict: 'pass', reason: '', edited: false, sha: P.sha(CLUMSY)});
    assert.equal(f.originals, undefined);
  });
});

test('a correction that breaks the validator is not kept: it could never be accepted', async () => {
  const broken = CLUMSY.replace('Keep Sunday small', 'Sunday will be small');
  await proofed(CLUMSY, key => key === 'taurus' ? pass(broken) : pass(), async dir => assert.equal(read(dir).suggested, undefined));
});

test('accepting puts the suggestion in place with a current pass, and keeps the writer\'s text', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--accept', 'taurus'], {sheet: SHEET}), 0);
    const f = read(dir);
    assert.equal(f.signs.taurus, TIDIED);
    assert.equal(f.originals.taurus, CLUMSY);
    assert.deepEqual(f.proof.blocks.taurus, {verdict: 'pass', reason: '', edited: true, accepted_by: 'owner', sha: P.sha(TIDIED)});
    assert.equal(f.suggested, undefined);
    // The proofreader sees a current pass and does not send the block again.
    const calls = []; const original = globalThis.fetch;
    try { globalThis.fetch = fakeQwen(key => { calls.push(key); return pass(); }); await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}); }
    finally { globalThis.fetch = original; }
    assert.deepEqual(calls, []);
  });
});

test('rejecting drops the suggestion and changes nothing else', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--reject', 'taurus'], {sheet: SHEET}), 0);
    const f = read(dir);
    assert.deepEqual([f.signs.taurus, f.suggested, f.originals], [CLUMSY, undefined, undefined]);
    assert.equal(f.proof.blocks.taurus.edited, false);
  });
});

test('an accepted text must still pass the validator; if not, it stays a suggestion and the exit code is 7', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const f = read(dir); f.suggested.taurus.text = 'Too short to be a reading.'; fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--accept', 'taurus'], {sheet: SHEET}), 7);
    assert.equal(read(dir).signs.taurus, CLUMSY);
    assert.ok(read(dir).suggested.taurus);
  });
});

test('a rewritten block drops the suggestion that was made for its old text', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const f = read(dir); f.signs.taurus = TIDIED.replace('better order', 'good order'); fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    const original = globalThis.fetch;
    try { globalThis.fetch = fakeQwen(() => pass()); await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}); } finally { globalThis.fetch = original; }
    assert.equal(read(dir).suggested?.taurus, undefined);
  });
});

test('wordDiff shows only what changed; listing and a missing file', async () => {
  assert.equal(R.wordDiff('keep the clear ups short today', 'keep the cleanups short, today'), '[clear ups short] -> [cleanups short,]');
  assert.equal(R.wordDiff('same words', 'same words'), '');
  assert.throws(() => R.parseArgs(['--send']), /unknown argument/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-review-'));
  try { assert.equal(R.main(['--week', WEEK, '--out', dir], {sheet: SHEET}), 1); } finally { fs.rmSync(dir, {recursive: true}); }
});

test('a key given twice is accepted once, and the accept is kept', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--accept', 'taurus', '--accept', 'taurus'], {sheet: SHEET}), 0);
    assert.equal(read(dir).signs.taurus, TIDIED);
    assert.equal(read(dir).suggested, undefined);
  });
});

test('contradictory or incomplete instructions are refused before anything changes', async () => {
  assert.throws(() => R.parseArgs(['--accept']), /needs a block name/);
  assert.throws(() => R.parseArgs(['--accept', 'taurus', '--reject', 'taurus']), /both accept and reject taurus/);
  assert.deepEqual(R.parseArgs(['--accept', 'taurus', '--accept', 'taurus', '--reject', 'leo'], '2026-09-19').accept, ['taurus']);
});

test('an accepted subjects suggestion stores its canonical text', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const good = JSON.parse(W.EXAMPLE_SUBJECTS);
    const changed = good.subjects[0].replace('changes the mood', 'lifts the mood');
    const reversed = JSON.stringify({preview: good.preview, subjects: [changed, good.subjects[1], good.subjects[2]]});
    const f = read(dir);
    f.suggested = {subjects: {text: reversed, why: 'test'}};
    fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--accept', 'subjects'], {sheet: SHEET}), 0);
    const updated = read(dir);
    assert.equal(updated.proof.blocks.subjects.sha, P.sha(JSON.stringify({subjects: updated.subjects, preview: updated.preview})));
    assert.equal(updated.subjects[0], changed);
  });
});

test('wordDiff of pretty-printed subjects JSON shows only changed words', async () => {
  const good = JSON.parse(W.EXAMPLE_SUBJECTS);
  const before = JSON.stringify({subjects: good.subjects, preview: good.preview}, null, 1);
  const changed = good.subjects[0].replace('changes', 'shifts');
  const after = JSON.stringify({subjects: [changed, good.subjects[1], good.subjects[2]], preview: good.preview}, null, 1);
  const diff = R.wordDiff(before, after);
  assert(diff.length < 60, `diff is ${diff.length} chars, expected under 60`);
  assert(diff.includes('changes'), `diff does not include the changed word: ${diff}`);
});
