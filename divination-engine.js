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
  // Payload-to-state transform for replaying a saved lenormand/oracle/runes draw: validates
  // the id list (in range, no duplicates, within the layouts the UI offers) and, if valid,
  // returns a sanitised copy plus the "every slot revealed" set a replayed reading starts
  // from. Returns null on anything invalid so the caller knows to reject the load outright.
  function loadIds(ids, size) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 5 || new Set(ids).size !== ids.length || !ids.every(id => Number.isInteger(id) && id >= 0 && id < size)) return null;
    return {ids: [...ids], revealed: new Set(ids.map((_, i) => i))};
  }
  // I Ching. Lines: 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing). Bottom line first.
  function castLine(method, random = randomInt) {
    if (method === 'coins') return 6 + random(2) + random(2) + random(2);           // each coin: tails 2, heads 3
    if (method === 'yarrow') { const n = random(16); return n === 0 ? 6 : n < 6 ? 7 : n < 13 ? 8 : 9; } // 1/16, 5/16, 7/16, 3/16
    throw Error('Unknown casting method');
  }
  function castHexagram(method, random = randomInt) { return Array.from({length:6}, () => castLine(method, random)); }
  function validLines(values) { return Array.isArray(values) && values.length === 6 && values.every(v => Number.isInteger(v) && v >= 6 && v <= 9); }
  function hexagramIndex(symbol, hexagrams) { const i = hexagrams.findIndex(h => h.symbol === symbol); if (i < 0) throw Error('Unknown hexagram'); return i; }
  function readLines(values, hexagrams) {
    if (!validLines(values)) throw Error('Six lines of 6, 7, 8 or 9 required');
    const primarySymbol = values.map(v => v % 2 ? '1' : '0').join('');
    const changing = values.flatMap((v, i) => v === 6 || v === 9 ? [i] : []);
    const relatingSymbol = changing.length ? values.map(v => v === 6 ? '1' : v === 9 ? '0' : v % 2 ? '1' : '0').join('') : null;
    return {primary: hexagramIndex(primarySymbol, hexagrams), primarySymbol, changing, relating: relatingSymbol ? hexagramIndex(relatingSymbol, hexagrams) : null, relatingSymbol};
  }
  function loadLines(values) { return validLines(values) ? [...values] : null; }
  return {randomInt, draw, combine, shield, cast, loadIds, castLine, castHexagram, readLines, loadLines, hexagramIndex};
});
