const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sky-calendar-engine.js');

test('quarters lists the lunar quarters inside a window, against a published ephemeris', () => {
  const hits = E.quarters(new Date('2026-09-21T00:00:00Z'), new Date('2026-09-28T00:00:00Z'));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'Full moon');
  assert.equal(hits[0].quarter, 2);
  // Published: Full moon 2026-09-26 16:49 UTC.
  assert.equal(hits[0].date.slice(0, 16), '2026-09-26T16:49');
});

test('quarters returns nothing for a week that holds no quarter', () => {
  // Published: Third quarter 2026-11-01, New moon 2026-11-09 07:02 UTC. Nothing between.
  assert.deepEqual(E.quarters(new Date('2026-11-02T00:00:00Z'), new Date('2026-11-09T00:00:00Z')), []);
});

const H = require('../daily-horoscope-engine.js');

test('weekSheet refuses a day that is not a Monday and throws on a malformed one', () => {
  assert.deepEqual(H.weekSheet('2026-09-22'), {status: 'not-monday'});
  assert.throws(() => H.weekSheet('2026-9-21'), RangeError);
});

test('weekSheet lists the week\'s headline events with weekday and sign', () => {
  const s = H.weekSheet('2026-09-21');
  assert.equal(s.from, '2026-09-21');
  assert.equal(s.to, '2026-09-28');
  // Published: Sun enters Libra Wed 2026-09-23; Full moon Sat 2026-09-26 in Aries. No Moon ingresses.
  assert.deepEqual(s.events, [
    {weekday: 'Wednesday', kind: 'ingress', body: 'Sun', detail: 'enters a new sign', sign: 'Libra'},
    {weekday: 'Saturday', kind: 'phase', body: 'Moon', detail: 'Full moon', sign: 'Aries'}
  ]);
});

test('weekSheet backdrop gives the Monday placements and the Moon\'s direction', () => {
  const s = H.weekSheet('2026-09-21');
  assert.equal(s.backdrop.moon, 'waxing');   // first quarter was 2026-09-18, full moon is 2026-09-26
  assert.deepEqual(s.backdrop.placements, [
    {body: 'Sun', sign: 'Virgo'}, {body: 'Mercury', sign: 'Libra'}, {body: 'Venus', sign: 'Scorpio'}, {body: 'Mars', sign: 'Cancer'}
  ]);
});

test('weekSheet gives each sign whole-sign houses, its ruler first, and no zodiac signs', () => {
  const s = H.weekSheet('2026-09-21');
  assert.equal(s.signs.length, 12);
  const by = name => s.signs.find(x => x.sign === name);
  // Aries: Virgo is its 6th, Libra its 7th, Scorpio its 8th, Cancer its 4th. Mars rules Aries.
  assert.deepEqual(by('Aries').backdrop.placements, [
    {body: 'Sun', sector: {house: 6, name: 'your daily-work-and-health sector'}, ruler: false},
    {body: 'Mercury', sector: {house: 7, name: 'your partnership sector'}, ruler: false},
    {body: 'Venus', sector: {house: 8, name: 'your shared-money-and-intimacy sector'}, ruler: false},
    {body: 'Mars', sector: {house: 4, name: 'your home sector at the base of your chart'}, ruler: true}
  ]);
  // Neither event involves Mars, so the phase outranks the ingress.
  assert.deepEqual(by('Aries').events.map(e => [e.weekday, e.sector.house, e.rulerInvolved]), [['Saturday', 1, false], ['Wednesday', 7, false]]);
  // Leo is ruled by the Sun: the Sun's ingress comes first. Libra is Leo's 3rd, Aries its 9th.
  assert.deepEqual(by('Leo').events.map(e => [e.body, e.sector.house, e.rulerInvolved]), [['Sun', 3, true], ['Moon', 9, false]]);
  // Cancer is ruled by the Moon: the Full moon comes first.
  assert.equal(by('Cancer').events[0].body, 'Moon');
  assert.equal(by('Cancer').events[0].rulerInvolved, true);
  // Jupiter rules Sagittarius and is in Leo, its 9th; Saturn rules Capricorn and is in Aries, its 4th.
  assert.deepEqual(by('Sagittarius').backdrop.placements.at(-1), {body: 'Jupiter', sector: {house: 9, name: 'your travel-and-belief sector'}, ruler: true});
  assert.deepEqual(by('Capricorn').backdrop.placements.at(-1), {body: 'Saturn', sector: {house: 4, name: 'your home sector at the base of your chart'}, ruler: true});
  for (const sg of s.signs) {
    for (const e of sg.events) assert.equal('sign' in e, false);
    for (const p of sg.backdrop.placements) assert.equal('sign' in p, false);
  }
});

test('weekSheet still returns a usable sheet for a week with no events', () => {
  const s = H.weekSheet('2026-11-02');
  assert.deepEqual(s.events, []);
  assert.equal(s.backdrop.placements.length, 4);
  for (const sg of s.signs) { assert.deepEqual(sg.events, []); assert.ok(sg.backdrop.placements.length >= 4); }
});

const D = require('../tools/write_daily_prose.cjs');

test('commonProblems reports each shared rule and passes clean text', () => {
  const bodies = new Set(['Sun', 'Moon']), signs = new Set(['Aries']);
  assert.equal(D.commonProblems('The Sun warms Aries all week.', bodies, signs), null);
  assert.match(D.commonProblems('Good luck arrives.', bodies, signs), /forbidden phrase: luck/);
  assert.match(D.commonProblems('It will pass.', bodies, signs), /will/);
  assert.match(D.commonProblems('Venus smiles.', bodies, signs), /names Venus/);
  assert.match(D.commonProblems('The Sun enters Libra.', bodies, signs), /names Libra/);
  assert.equal(D.commonProblems('A pause — then go.', bodies, signs), 'em dash');
  assert.equal(D.commonProblems('Meet at 9:30.', bodies, signs), 'clock time');
  assert.equal(D.commonProblems('The Sun at 12 degrees.', bodies, signs), 'degree');
});

test('commonProblems catches the future tense however it is spelled', () => {
  const bodies = new Set(['Sun', 'Moon']), signs = new Set(['Aries']);
  for (const t of ["You'll find the money you need.", "It'll pass and they'll agree.", "It won't last.",
    'Thursday shall bring news.', 'You’ll see.']) {
    assert.match(D.commonProblems(t, bodies, signs), /future tense/, t);
  }
  assert.equal(D.commonProblems('It will pass.', bodies, signs), 'uses "will"');
  assert.equal(D.commonProblems('A quiet start – then the mood lifts.', bodies, signs), 'dash used as punctuation');
  for (const t of ['The shallow end is warm.', 'A well-worn path.', 'Pages 3–5 are dull.', 'Goodwill goes a long way.']) {
    assert.equal(D.commonProblems(t, bodies, signs), null, t);
  }
});

test('complete merges sampling overrides over its defaults', async () => {
  const original = globalThis.fetch;
  let sent;
  try {
    globalThis.fetch = async (url, init) => { sent = JSON.parse(init.body); return {ok: true, json: async () => ({choices: [{message: {content: ' ok '}}]})}; };
    assert.equal(await D.complete('http://x/v1', 'm', [{role: 'user', content: 'hi'}], {temperature: 0.2}), 'ok');
    assert.equal(sent.temperature, 0.2);
    assert.equal(sent.max_tokens, 2500);
    await D.complete('http://x/v1', 'm', []);
    assert.equal(sent.temperature, 1.0);
  } finally { globalThis.fetch = original; }
});

const W = require('../tools/write_weekly_prose.cjs');

test('each brief\'s example passes its own validator', () => {
  assert.equal(W.validateSign(W.EXAMPLE_SIGN, W.EXAMPLE_SIGN_SHEET), null);
  assert.equal(W.validateOverview(W.EXAMPLE_OVERVIEW, W.EXAMPLE_SHEET), null);
  assert.equal(W.validateSubjects(W.EXAMPLE_SUBJECTS, W.EXAMPLE_SHEET), null);
});

test('validateSign rejects each broken shape and fact', () => {
  const sg = W.EXAMPLE_SIGN_SHEET, ok = W.EXAMPLE_SIGN, [p1, p2] = ok.split('\n\n');
  assert.match(W.validateSign(p1, sg), /two paragraphs/);
  assert.match(W.validateSign(`${p1}\n\n${p2}\n\n${p2}`, sg), /two paragraphs/);
  assert.match(W.validateSign('Short.\n\nToo short.', sg), /words/);
  assert.match(W.validateSign(`${ok} ${ok}`.replace('\n\n', ' '), sg), /words/);
  assert.match(W.validateSign(ok.replace(/\.$/, ''), sg), /full sentence/);
  assert.match(W.validateSign(ok.replaceAll(sg.backdrop.placements[0].sector.name, 'one corner').replaceAll(sg.events[0].sector.name, 'another corner'), sg), /no sector/);
  assert.match(W.validateSign(ok.replaceAll('Thursday', 'one day').replaceAll('Sunday', 'another day'), sg), /no weekday/);
  assert.match(W.validateSign(ok.replace('Two days matter most.', 'Jupiter matters most.'), sg), /names Jupiter/);
  assert.match(W.validateSign(ok.replace('Keep Sunday small', 'Sunday will be small'), sg), /will/);
});

test('validateSign asks for no weekday when the sign has no events', () => {
  const quiet = {...W.EXAMPLE_SIGN_SHEET, events: []};
  const text = W.EXAMPLE_SIGN.replaceAll('Thursday', 'one day').replaceAll('Sunday', 'another day');
  assert.equal(W.validateSign(text, quiet), null);
});

test('validateOverview needs two of the week\'s events, no sector name, and only the sheet\'s signs', () => {
  const sheet = W.EXAMPLE_SHEET, ok = W.EXAMPLE_OVERVIEW;
  // Venus's event is matched by its wording or by "Venus" plus "Thursday"; take both away.
  assert.match(W.validateOverview(ok.replace('enters a new sign, moving into Libra', 'changes').replaceAll('Thursday', 'midweek'), sheet), /names 1 of the week's events/);
  assert.match(W.validateOverview(ok.replace('in its drawer', 'in your partnership sector'), sheet), /names a sector/);
  assert.match(W.validateOverview(ok.replace('in its drawer', 'in Gemini'), sheet), /names Gemini/);
  assert.equal(W.validateOverview(ok.replace('On Thursday Venus enters a new sign, moving into Libra', 'Midweek the mood lifts').replace('the New moon arrives in Virgo', 'a fresh start arrives'), {...sheet, events: []}), null);
});

test('validateSubjects checks the JSON, the three lines and the preview', () => {
  const sheet = W.EXAMPLE_SHEET, good = JSON.parse(W.EXAMPLE_SUBJECTS);
  const v = o => W.validateSubjects(JSON.stringify(o), sheet);
  const fence = '`'.repeat(3);   // models often wrap JSON in a code fence
  assert.equal(W.validateSubjects(`${fence}json\n${W.EXAMPLE_SUBJECTS}\n${fence}`, sheet), null);
  assert.equal(W.validateSubjects('not json', sheet), 'not JSON');
  assert.match(v({...good, subjects: good.subjects.slice(0, 2)}), /subjects: \[3\]/);
  assert.match(v({...good, subjects: ['Too short', good.subjects[1], good.subjects[2]]}), /characters/);
  assert.match(v({...good, subjects: ['A steady week with one clear turning point!', good.subjects[1], good.subjects[2]]}), /exclamation/);
  assert.match(v({...good, subjects: ['A STEADY week with one clear turning point', good.subjects[1], good.subjects[2]]}), /all-caps/);
  assert.match(v({...good, subjects: ['A steady week for Taurus and everyone else', good.subjects[1], good.subjects[2]]}), /names Taurus/);
  assert.match(v({...good, subjects: ['A steady week with one turning point 🌙', good.subjects[1], good.subjects[2]]}), /emoji/);
  assert.match(v({...good, subjects: [good.subjects[0], good.subjects[0].toUpperCase().toLowerCase(), good.subjects[2]]}), /distinct/);
  assert.match(v({...good, preview: 'Too short.'}), /preview is/);
});

test('the sign brief carries the facts as JSON and withholds zodiac signs', () => {
  const sheet = H.weekSheet('2026-09-21'), sg = sheet.signs[0];
  const [system, user] = W.signMessages(sg, sheet);
  assert.equal(system.role, 'system');
  assert.match(user.content, /^Fact sheet for Aries, week of 2026-09-21:/);
  const facts = JSON.parse(user.content.slice(user.content.indexOf('{'), user.content.lastIndexOf('}') + 1));
  assert.equal(facts.moon, 'waxing');
  assert.equal(facts.placements[3].sector, 'your home sector at the base of your chart');
  assert.equal(facts.placements[3].ruler, true);
  assert.equal(facts.events[0].weekday, 'Saturday');
  assert.doesNotMatch(user.content, /Virgo|Libra|Scorpio/);
});

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('nextMonday and parseArgs', () => {
  assert.equal(W.nextMonday('2026-09-21'), '2026-09-21');   // a Monday
  assert.equal(W.nextMonday('2026-09-20'), '2026-09-21');   // a Sunday
  assert.equal(W.nextMonday('2026-09-22'), '2026-09-28');   // a Tuesday
  assert.equal(W.parseArgs([], '2026-09-19').week, '2026-09-21');
  const o = W.parseArgs(['--week', '2026-11-02', '--force', '--out', 'x'], '2026-09-19');
  assert.deepEqual([o.week, o.force, o.out, o.model], ['2026-11-02', true, 'x', 'muse-glimmer-30b-local']);
  assert.throws(() => W.parseArgs(['--push']), /unknown argument/);
});

// A stand-in for Glimmer: reads the facts out of the request and answers with a block that the
// validators accept. `fail` names blocks to answer badly ('Aries', 'overview', 'subjects').
const FILLER = 'Keep the pace even, finish one thing before starting the next, and let the small jobs stay small. ';
function fakeGlimmer({alias = 'muse-glimmer-30b-local', fail = [], calls = []} = {}) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: alias})};
    const user = JSON.parse(init.body).messages.find(m => m.role === 'user').content;
    const facts = JSON.parse(user.slice(user.indexOf('{'), user.lastIndexOf('}') + 1));
    let label, content;
    if (user.startsWith('Fact sheet for')) {
      label = user.match(/^Fact sheet for (\w+)/)[1];
      const day = facts.events[0] ? `On ${facts.events[0].weekday} the sky marks a turn. ` : '';
      content = `The week asks for steady hands. The Sun spends the week in ${facts.placements[0].sector}, and the Moon is ${facts.moon} as it opens. ${FILLER.repeat(3)}\n\n${day}${FILLER.repeat(3)}Rest when the work is done.`;
    } else if (user.startsWith('Week sheet')) {
      label = 'overview';
      content = `The week keeps an even keel. The Moon is ${facts.moon} as it opens. ${FILLER.repeat(3)}\n\n${facts.events.map(e => `On ${e.weekday} the ${e.body} ${e.what}.`).join(' ')} ${FILLER.repeat(3)}Rest when the work is done.`;
    } else {
      label = 'subjects';
      content = JSON.stringify({subjects: ['A steady week with one clear turning point', 'Finish first, then begin: the week ahead', 'Your week: even pace and a weekend shift'],
        preview: 'An even start, a turn at the weekend, and one thing worth finishing.'});
    }
    calls.push(label);
    if (fail.includes(label)) content = 'It will be fine.';
    return {ok: true, json: async () => ({choices: [{message: {content}}]})};
  };
}

async function withFake(options, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-prose-')), original = globalThis.fetch;
  try { globalThis.fetch = fakeGlimmer(options); return await run(dir); }
  finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
}
const read = (dir, week) => JSON.parse(fs.readFileSync(path.join(dir, `${week}.json`), 'utf8'));

test('the writer writes the contract file and returns 0', async () => {
  await withFake({}, async dir => {
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 0);
    const f = read(dir, '2026-09-21');
    assert.deepEqual([f.week, f.model], ['2026-09-21', 'muse-glimmer-30b-local']);
    assert.equal(Object.keys(f.signs).length, 12);
    assert.ok(f.signs.aries.includes('your daily-work-and-health sector'));
    assert.ok(f.overview.includes('Full moon'));
    assert.equal(f.subjects.length, 3);
    assert.ok(f.preview.length >= 40);
  });
});

test('a week with no events still writes twelve signs', async () => {
  await withFake({}, async dir => {
    assert.equal(await W.main(['--week', '2026-11-02', '--out', dir]), 0);
    assert.equal(Object.keys(read(dir, '2026-11-02').signs).length, 12);
  });
});

test('a block that fails three times is left out, and a re-run fills only the gaps', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-prose-')), original = globalThis.fetch;
  try {
    const first = [];
    globalThis.fetch = fakeGlimmer({fail: ['Aries', 'subjects'], calls: first});
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 0);   // 11 signs and the overview
    let f = read(dir, '2026-09-21');
    assert.equal('aries' in f.signs, false);
    assert.deepEqual([f.subjects, f.preview], [[], '']);
    assert.equal(first.filter(l => l === 'Aries').length, 3);
    assert.equal(first.filter(l => l === 'subjects').length, 3);
    const taurus = f.signs.taurus;

    const second = [];
    globalThis.fetch = fakeGlimmer({calls: second});
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 0);
    f = read(dir, '2026-09-21');
    assert.deepEqual(second, ['Aries', 'subjects']);
    assert.equal(f.signs.taurus, taurus);
    assert.ok(f.signs.aries);
    assert.equal(f.subjects.length, 3);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
});

test('--force rewrites every block and drops the proof fields; a plain re-run keeps them', async () => {
  await withFake({}, async dir => {
    await W.main(['--week', '2026-09-21', '--out', dir]);
    const file = path.join(dir, '2026-09-21.json');
    fs.writeFileSync(file, JSON.stringify({...read(dir, '2026-09-21'), proof: {blocks: {}}, originals: {aries: 'x'}, rejected: {}}));
    await W.main(['--week', '2026-09-21', '--out', dir]);
    assert.deepEqual(read(dir, '2026-09-21').originals, {aries: 'x'});
    await W.main(['--week', '2026-09-21', '--out', dir, '--force']);
    assert.equal('proof' in read(dir, '2026-09-21'), false);
    assert.equal('originals' in read(dir, '2026-09-21'), false);
  });
});

test('exit codes: 1 for a non-Monday, 2 for the wrong model, 3 for a weak week', async () => {
  await withFake({}, async dir => assert.equal(await W.main(['--week', '2026-09-22', '--out', dir]), 1));
  await withFake({alias: 'qwen3.8-27b-local'}, async dir => {
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 2);
    assert.equal(fs.existsSync(path.join(dir, '2026-09-21.json')), false);
  });
  await withFake({fail: ['overview']}, async dir => {
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 3);
    assert.equal(read(dir, '2026-09-21').overview, '');
  });
  await withFake({fail: ['Aries', 'Taurus', 'Gemini']}, async dir => assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 3));
});
