(function(root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.DivinationEngine = api; })(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  function randomInt(max) {
    if (!Number.isInteger(max) || max < 1 || max > 65536) throw Error('Invalid random range');
    const value = new Uint32Array(1), limit = Math.floor(4294967296 / max) * max;
    do { globalThis.crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % max;
  }
  function draw(size, count, random = randomInt) {
    if (!Number.isInteger(size) || !Number.isInteger(count) || count < 1 || count > size) throw Error('Invalid draw');
    const pool = Array.from({length:size}, (_, i) => i);
    for (let i = 0; i < count; i++) {
      const n = random(size - i);
      if (!Number.isInteger(n) || n < 0 || n >= size - i) throw Error('Invalid random result');
      const j = i + n; [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }
  function validFigure(f) { return Array.isArray(f) && f.length === 4 && f.every(n => n === 1 || n === 2); }
  function combine(a, b) {
    if (!validFigure(a) || !validFigure(b)) throw Error('Four rows of one or two points required');
    return a.map((n, i) => (n + b[i]) % 2 === 0 ? 2 : 1);
  }
  function shield(input) {
    if (!Array.isArray(input) || input.length !== 4 || !input.every(validFigure)) throw Error('Four mothers required');
    const mothers = input.map(f => [...f]);
    const daughters = [0,1,2,3].map(row => mothers.map(f => f[row]));
    const first = [...mothers, ...daughters];
    const nieces = [0,2,4,6].map(i => combine(first[i], first[i+1]));
    const witnesses = [combine(nieces[0], nieces[1]), combine(nieces[2], nieces[3])];
    const judge = combine(...witnesses), reconciler = combine(mothers[0], judge);
    return {mothers, daughters, nieces, witnesses, judge, reconciler, all:[...first,...nieces,...witnesses,judge,reconciler]};
  }
  function cast(random = randomInt) {
    return shield(Array.from({length:4}, () => Array.from({length:4}, () => random(2) + 1)));
  }
  return {randomInt, draw, combine, shield, cast};
});
