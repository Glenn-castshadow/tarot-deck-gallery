const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../horary-text.js');

// Hardcoded rather than required from horary-engine.js / classical-engine.js:
// engine and text are built concurrently by separate implementers (see
// .superpowers/sdd/2026-09-12-horary/task-6-brief.md).
const DIGNITY_KEYS = ['ruler','exaltation','triplicity','term','face','detriment','fall','peregrine','angular','succedent','cadent','direct','retrograde','combust','underBeams','cazimi','free','viaCombusta','increasing','decreasing'];
const CONSIDERATION_KEYS = ['ascEarly','ascLate','saturnAngular','moonVoid','viaCombusta','radical'];
const PERFECTION_KEYS = ['byAspect','byReception','translation','collection','none'];
const PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];

const BANNED = /you will|will happen|is going to|the answer is|\byes\b|\bno\b|luck|fortune/i;

test('horary copy is complete with the historical, non-verdict voice', () => {
  assert.ok(typeof T.banner === 'string' && T.banner.length > 0, 'banner');

  for (let h = 1; h <= 12; h++) {
    const m = T.houseMatters[h];
    assert.ok(m && m.title && m.lilly, `houseMatters[${h}]`);
  }

  for (const k of DIGNITY_KEYS) {
    const d = T.dignity[k];
    assert.ok(d && d.title && d.text, `dignity.${k}`);
    assert.ok(d.text.length >= 90 && d.text.length <= 220, `dignity.${k} text length ${d.text.length} in 90-220`);
  }

  for (const k of CONSIDERATION_KEYS) {
    const c = T.considerations[k];
    assert.ok(c && c.title && c.present && c.absent, `considerations.${k}`);
  }

  for (const k of PERFECTION_KEYS) {
    const p = T.perfection[k];
    assert.ok(p && p.title && p.text, `perfection.${k}`);
  }

  for (const p of PLANETS) {
    const pl = T.planet[p];
    assert.ok(pl && pl.asSignificator, `planet.${p}`);
    assert.ok(pl.asSignificator.length >= 120 && pl.asSignificator.length <= 240, `planet.${p} asSignificator length ${pl.asSignificator.length} in 120-240`);
  }

  assert.ok(typeof T.hours === 'string' && T.hours.length > 0, 'hours');
  assert.ok(typeof T.electional === 'string' && T.electional.length > 0, 'electional');
  assert.ok(typeof T.closing === 'string' && T.closing.length > 0, 'closing');

  const all = JSON.stringify(T);
  assert.doesNotMatch(all, BANNED);
});

test('dignity copy varies its openings rather than repeating a template', () => {
  const openings = DIGNITY_KEYS.map(k => T.dignity[k].text.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
  const counts = {};
  openings.forEach(o => counts[o] = (counts[o] || 0) + 1);
  const maxShared = Math.max(...Object.values(counts));
  assert.ok(maxShared <= 4, `dignity opening over-shared: ${JSON.stringify(counts)}`);
});
