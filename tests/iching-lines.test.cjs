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
