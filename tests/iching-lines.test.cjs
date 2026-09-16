const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../iching-lines.js');

const banned = /fortune|misfortune|\bblame|remorse|humiliation|you will|will happen|destined|\bdoom|\bluck|perseverance furthers|superior man/i;
const sentences = text => (text.match(/[.!?](?=\s|$)/g) || []).length;

test('every present hexagram has exactly six original, reflective line texts', () => {
  const all = [];
  for (const [key, set] of Object.entries(L.lines)) {
    const n = Number(key);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 64, `key ${key}`);
    assert.ok(Array.isArray(set) && set.length === 6, `hexagram ${n} has ${set && set.length} lines`);
    set.forEach((text, i) => {
      const where = `hexagram ${n} line ${i + 1}`;
      assert.ok(typeof text === 'string' && text.trim(), where);
      assert.doesNotMatch(text, banned, where);
      assert.doesNotMatch(text, /'/, `${where} uses a straight apostrophe`);
      const count = sentences(text);
      assert.ok(count >= 2 && count <= 3, `${where} has ${count} sentences`);
      all.push(text);
    });
  }
  assert.equal(new Set(all).size, all.length, 'every line text is unique');
});

test('forLine returns a text or null', () => {
  assert.equal(L.forLine(999, 0), null);
  assert.equal(L.forLine(1, -1), null);
  assert.equal(L.forLine(1, 6), null);
  assert.equal(L.forLine(1, 1.5), null);
  for (const key of Object.keys(L.lines)) {
    assert.equal(L.forLine(Number(key), 0), L.lines[key][0]);
    assert.equal(L.has(Number(key)), true);
  }
});

test('all 64 hexagrams have their six lines', () => {
  for (let n = 1; n <= 64; n++) assert.ok(L.has(n), `hexagram ${n} is missing`);
  assert.equal(Object.keys(L.lines).length, 64);
});

test('no line text repeats the position its kicker already names', () => {
  // The reading shows each text under 'Line n · <position>', and the study card lists all six, so a
  // stock position phrase reads as a template. The polish pass of 2026-09-16 removed every one.
  const stock = new RegExp(['at th(e|is) beginning', 'at th(e|is) start', 'at th(e|is) outset', 'at this early point',
    'at th(e|is) threshold', 'at th(e|is) inner (place|position)', 'from th(is|e) inner (place|position)', 'in this position',
    'from this position', 'from the position of', 'at the seat of authority', 'at th(e|is) far end', 'at the end',
    'at th(e|is) summit', 'at the top', 'at this point', 'at this stage', 'at th(e|is) cent(re|er)', 'from th(e|is) cent(re|er)',
    'here at', 'as you step (into a wider world|outward)', 'stepping (into wider affairs|outward)',
    'entering (the outer world|wider affairs)', 'this (first|second|third|fourth|fifth|sixth|top|bottom) line'].join('|'), 'i');
  for (const [key, set] of Object.entries(L.lines)) set.forEach((text, i) => assert.doesNotMatch(text, stock, `hexagram ${key} line ${i + 1}`));
  // No three-word opener may carry more than fourteen texts (the image-naming device sits at thirteen).
  const openers = {};
  for (const text of Object.values(L.lines).flat()) { const o = text.split(' ').slice(0, 3).join(' '); openers[o] = (openers[o] || 0) + 1; }
  for (const [opener, n] of Object.entries(openers)) assert.ok(n <= 14, `${n} texts open with "${opener}"`);
});
