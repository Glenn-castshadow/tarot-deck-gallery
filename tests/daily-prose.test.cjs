const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const E = require('../sky-calendar-engine.js');
const natal = require('../natal-engine.js');

test('moonAspects lists every exact Moon aspect in a window, sorted, and agrees with voidPeriods', () => {
  const from = new Date('2026-03-01T00:00:00Z'), to = new Date('2026-03-08T00:00:00Z');
  const hits = E.moonAspects(from, to, E.CLASSICAL_PLANETS);
  // Independent oracle: an hourly scan of the Moon-planet separation, counting every upward
  // crossing of the eight separations that are Ptolemaic aspects. Must agree with the search.
  let expected = 0;
  for (const planet of E.CLASSICAL_PLANETS) for (const target of [0, 60, 90, 120, 180, 240, 270, 300]) {
    let prev = null;
    for (let t = +from; t < +to; t += 3600e3) {
      const d = new Date(t), g = natal.delta(natal.mod(E.lonOf('Moon', d) - E.lonOf(planet, d)), target);
      if (prev !== null && prev < 0 && g >= 0 && g - prev < 45) expected++;
      prev = g;
    }
  }
  assert.equal(hits.length, expected);
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].date >= hits[i - 1].date, 'not sorted');
  for (const h of hits) {
    const t = new Date(h.date);
    assert.ok(t >= from && t < to, 'hit outside the window');
    const sep = natal.mod(E.lonOf('Moon', t) - E.lonOf(h.planet, t));
    const off = Math.min(Math.abs(sep - h.aspect), Math.abs(sep - (360 - h.aspect)));
    assert.ok(off < 0.01, `${h.planet} ${h.aspect} is ${off} degrees from exact`);
  }
  // Cross-check against existing code: the closing aspect of each void-of-course period
  // must be the last hit before that period's sign ingress.
  const periods = E.voidPeriods(from, to, E.CLASSICAL_PLANETS).filter(p => !p.clipped && p.lastAspect);
  assert.ok(periods.length >= 1);
  for (const p of periods) {
    const before = hits.filter(h => h.date < p.end);
    const last = before[before.length - 1];
    assert.ok(Math.abs(new Date(last.date) - new Date(p.start)) < 2000, `${p.sign}: ${last.date} vs ${p.start}`);
    assert.deepEqual({planet: last.planet, aspect: last.aspect}, p.lastAspect);
  }
});

test('moonAspects refuses out-of-range input with an empty list', () => {
  assert.deepEqual(E.moonAspects(new Date('1900-12-31T00:00:00Z'), new Date('1901-01-02T00:00:00Z'), E.CLASSICAL_PLANETS), []);
});

const engine = require('../daily-horoscope-engine.js');
const classical = require('../classical-engine.js');
const astro = require('../vendor/astronomy-engine/astronomy.js');
const ASPECT_NAMES = {0: 'conjunction', 60: 'sextile', 90: 'square', 120: 'trine', 180: 'opposition'};

test('factSheet: twelve signs, wrapped sectors, classical rulers, partner sectors and ruler flags agree', () => {
  const s = engine.factSheet('2026-09-17');
  assert.equal(s.signs.length, 12);
  assert.equal(engine.sectorNames.length, 12);
  assert.equal(new Set(engine.sectorNames).size, 12);
  assert.equal(s.moon.sign, engine.calculate(0, '2026-09-17').points.find(p => p.name === 'Moon').sign);
  assert.equal(s.moon.phase, engine.calculate(0, '2026-09-17').phase);
  assert.equal(s.instant, '2026-09-17T12:00:00.000Z');
  for (const a of s.aspects) {
    assert.ok(a.date >= '2026-09-17T00:00:00' && a.date < '2026-09-18T00:00:00', a.date);
    assert.equal(a.name, ASPECT_NAMES[a.aspect]);
    assert.ok(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(a.planet));
  }
  for (const [i, sg] of s.signs.entries()) {
    assert.equal(sg.sign, engine.signNames[i]);
    assert.equal(sg.ruler, classical.rulers[i]);
    const next = s.signs[(i + 1) % 12];
    assert.equal(next.moonSector.house, (sg.moonSector.house + 10) % 12 + 1, 'sectors do not wrap');
    assert.equal(sg.moonSector.name, engine.sectorNames[sg.moonSector.house - 1]);
    assert.equal(sg.aspects.length, s.aspects.length);
    sg.aspects.forEach((a, j) => {
      const top = s.aspects[j];
      assert.equal(a.planet, top.planet);
      assert.equal(a.name, top.name);
      assert.equal(a.planetSector.house, natal.mod(engine.signNames.indexOf(top.planetSign) - i, 12) + 1);
      assert.equal(a.planetSector.name, engine.sectorNames[a.planetSector.house - 1]);
      assert.equal(a.rulerInvolved, a.planet === sg.ruler);
    });
    assert.equal(sg.events.length, s.events.length);
    sg.events.forEach((e, j) => {
      assert.equal(e.body, s.events[j].body);
      assert.equal(e.sector.house, natal.mod(s.events[j].signIndex - i, 12) + 1);
      assert.equal(e.rulerInvolved, e.body === sg.ruler);
      assert.ok(!/[A-Z]/.test(e.detail.slice(1)), `detail leaks a name: ${e.detail}`);
    });
  }
});

test('factSheet lists the Sun ingress on the equinox day, seen from each sign', () => {
  const day = astro.Seasons(2026).sep_equinox.date.toISOString().slice(0, 10);
  const s = engine.factSheet(day);
  const sun = s.events.find(e => e.body === 'Sun');
  assert.ok(sun, 'no Sun ingress on the equinox day');
  assert.equal(sun.kind, 'ingress');
  assert.equal(sun.sign, 'Libra');
  assert.equal(sun.detail, 'enters a new sign');
  assert.equal(s.signs[6].events.find(e => e.body === 'Sun').sector.house, 1);      // Libra: its own sign
  assert.equal(s.signs[4].events.find(e => e.body === 'Sun').rulerInvolved, true);  // Leo: the Sun rules it
  assert.equal(s.signs[0].events.find(e => e.body === 'Sun').sector.house, 7);      // Aries: partnership sector
});

test('factSheet refuses a bad day', () => {
  for (const day of ['2026-02-29', 'bad', '1900-12-31']) assert.throws(() => engine.factSheet(day), RangeError);
});

const W = require('../tools/write_daily_prose.cjs');
const SHEET = {sign: 'Aries', ruler: 'Mars', moonSector: {house: 9, name: 'your travel-and-belief sector'},
  aspects: [{planet: 'Saturn', name: 'trine', planetSector: {house: 1, name: 'your sign'}, rulerInvolved: false}], events: []};
const GOOD = 'Discipline sits easily today. The Moon in your travel-and-belief sector trines Saturn in your sign, and the rule you set yourself last week, the early start or the no-phone hour, holds without any effort on your part, which is rare enough to notice. The course you keep meaning to book looks affordable when you finally open the page and read the price instead of guessing it. Book it before lunch, then go for the walk you said you would take, the long way round.';

test('validate accepts a paragraph in the brief shape', () => {
  assert.equal(W.validate(GOOD, SHEET), null);
});

test('validate rejects each rule breach with a reason', () => {
  const cases = [
    ['The Moon in your travel-and-belief sector trines Saturn in your sign. Go.', /words/],
    [GOOD.slice(0, GOOD.lastIndexOf(',')), /full sentence/],
    [GOOD + '\n\nMore.', /paragraph/],
    [GOOD.replace('The Moon in', 'Your luminary in'), /Moon/],
    [GOOD.replace('travel-and-belief', 'ninth'), /travel-and-belief/],
    [GOOD + ' Good luck.', /luck/],
    [GOOD.replace('holds', 'will hold'), /will/],
    [GOOD.replace('Saturn in your sign', 'Venus in your sign'), /Venus/],
    [GOOD.replace('in your sign,', 'in Libra,'), /Libra/],
    [GOOD.replace(', and', ' — and'), /em dash/],
    [GOOD.replace('before lunch', 'at 14:02'), /clock time/],
    [GOOD.replace('before lunch', 'at 12 degrees'), /degree/],
    [42, /string/]
  ];
  for (const [text, reason] of cases) assert.match(String(W.validate(text, SHEET)), reason, String(text).slice(0, 40));
});

test('the rules name no sign and no planet but the Moon, and the model never sees another sign name', () => {
  for (const s of engine.signNames) assert.ok(!W.RULES.includes(s), `RULES names ${s}`);
  for (const p of ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) assert.ok(!new RegExp(`\\b${p}\\b`).test(W.RULES), `RULES names ${p}`);
  const [system, user] = W.buildMessages(SHEET, {sign: 'Pisces', phase: 'First quarter', illumination: 52});
  assert.equal(system.role, 'system');
  assert.ok(system.content.includes(W.RULES) && system.content.includes(W.EXAMPLE));
  assert.equal(user.role, 'user');
  assert.ok(user.content.includes('your travel-and-belief sector'));
  assert.ok(user.content.includes('First quarter'));
  assert.ok(!user.content.includes('Pisces'), 'the Moon sign leaks to the model');
  assert.ok(!/\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/.test(user.content), 'a date or time leaks to the model');
});

test('buildMessages rotates the opening/scene-setting hint by sign', () => {
  const moon = {sign: 'Pisces', phase: 'First quarter', illumination: 52};
  const hintOf = content => content.slice(content.indexOf('Write the paragraph:'));
  const ariesHint = hintOf(W.buildMessages({...SHEET, sign: 'Aries'}, moon)[1].content);
  const taurusHint = hintOf(W.buildMessages({...SHEET, sign: 'Taurus'}, moon)[1].content);
  assert.notEqual(ariesHint, taurusHint, 'Aries and Taurus got the same hint sentence');
  assert.ok(ariesHint.includes('how the day goes'), ariesHint);
  assert.ok(ariesHint.includes("the area of life named by the Moon's sector"), ariesHint);
});

test('parseArgs defaults and addDays', () => {
  const o = W.parseArgs([]);
  assert.equal(o.days, 7); assert.equal(o.endpoint, 'http://127.0.0.1:8088/v1'); assert.equal(o.model, 'muse-glimmer-30b-local');
  assert.equal(o.push, false); assert.equal(o.force, false); assert.match(o.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(W.parseArgs(['--from', '2026-12-30', '--days', '3', '--push', '--force', '--out', 'x']), {...o, from: '2026-12-30', days: 3, push: true, force: true, out: 'x'});
  assert.equal(W.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(W.addDays('2024-02-28', 1), '2024-02-29');
});

test('a failed HTTP request counts as one attempt, not the whole run', async () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-prose-'));
  const originalFetch = globalThis.fetch;
  let chatCount = 0, firstAttemptFailed = false, lastMaxTokens;
  try {
    globalThis.fetch = async (url, init) => {
      if (url.includes('/props')) {
        return {ok: true, json: async () => ({model_alias: 'muse-glimmer-30b-local'})};
      }
      if (url.includes('/chat/completions')) {
        chatCount++;
        // On the very first chat attempt for Aries, throw an error; on the second, succeed.
        // For other signs, always succeed on the first attempt.
        if (chatCount === 1 && !firstAttemptFailed) {
          firstAttemptFailed = true;
          throw new Error('Network timeout');
        }
        const body = JSON.parse(init.body);
        lastMaxTokens = body.max_tokens;
        const userMsg = body.messages.find(m => m.role === 'user').content;
        // Extract the sign from the user message
        const match = userMsg.match(/Fact sheet for (\w+)/);
        const sign = match ? match[1] : 'Aries';
        // Return a paragraph that mentions the sector name from the request
        const sectorMatch = userMsg.match(/"moonSector":\s*"([^"]+)"/);
        const sector = sectorMatch ? sectorMatch[1] : 'your sign';
        const text = `Discipline sits easily today. The Moon in ${sector} makes an easy contact with the planetary influence, and the rule you set yourself last week, the commitment to consistency, holds without any effort on your part, which is noteworthy. The course you keep meaning to pursue looks more affordable than you expected when you finally check. Pursue it before lunch, then take the long walk you promised yourself, the one you have been putting off.`;
        return {
          ok: true,
          json: async () => ({
            choices: [{message: {content: text}}]
          })
        };
      }
      throw new Error('Unexpected fetch: ' + url);
    };
    const defaultFrom = new Date().toISOString().slice(0, 10);
    await W.main(['--from', defaultFrom, '--days', '1', '--out', tmpdir]);
    const file = path.join(tmpdir, `${defaultFrom}.json`);
    assert.ok(fs.existsSync(file), 'output file not created');
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(content.signs.aries, 'aries sign not in output');
    assert.ok(chatCount >= 2, `expected at least 2 chat attempts, got ${chatCount}`);
    assert.equal(lastMaxTokens, 1500);
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(tmpdir, {recursive: true});
  }
});
