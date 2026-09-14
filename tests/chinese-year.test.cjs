const test = require('node:test');
const assert = require('node:assert/strict');
const CY = require('../chinese-year.js');

const all = [];
for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) all.push([a, b]);
const pairsWith = key => all.filter(([a, b]) => CY.relations(a, b).includes(key)).map(([a, b]) => `${a}-${b}`).sort();
const both = list => list.flatMap(([a, b]) => a === b ? [`${a}-${b}`] : [`${a}-${b}`, `${b}-${a}`]).sort();

test('each relation matches the traditional pair list exactly', () => {
  assert.deepEqual(pairsWith('same'), both([[0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11]]));
  assert.deepEqual(pairsWith('trine'), both([[8,0],[0,4],[4,8],[11,3],[3,7],[7,11],[2,6],[6,10],[10,2],[5,9],[9,1],[1,5]]));
  assert.deepEqual(pairsWith('harmony'), both([[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]]));
  assert.deepEqual(pairsWith('clash'), both([[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]));
  assert.deepEqual(pairsWith('harm'), both([[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]]));
  assert.deepEqual(pairsWith('punishment'), both([[2,5],[5,8],[2,8],[1,10],[10,7],[1,7],[0,3]]));
  assert.deepEqual(pairsWith('selfPunishment'), both([[4,4],[6,6],[9,9],[11,11]]));
  assert.deepEqual(pairsWith('destruction'), both([[0,9],[3,6],[5,8],[2,11],[1,4],[7,10]]));
});

test('pairs that carry two relations list both, in the fixed order', () => {
  assert.deepEqual(CY.relations(2, 11), ['harmony', 'destruction']);   // 寅亥
  assert.deepEqual(CY.relations(2, 5), ['harm', 'punishment']);        // 寅巳
  assert.deepEqual(CY.relations(5, 8), ['harmony', 'punishment', 'destruction']); // 巳申
  assert.deepEqual(CY.relations(4, 4), ['same', 'selfPunishment']);    // 辰辰
  assert.deepEqual(CY.relations(0, 0), ['same']);                      // 子子
  assert.deepEqual(CY.relations(0, 2), []);                            // 子寅
});

test('years map to branches from 1984, 甲子, in both directions', () => {
  assert.equal(CY.yearBranch(1984), 0);
  assert.equal(CY.yearBranch(2026), 6);   // 午, Horse
  assert.equal(CY.yearBranch(1901), 1);   // 丑, Ox
  assert.equal(CY.ANIMALS[6].name, 'Horse');
  assert.equal(CY.ANIMALS[1].hanzi, '丑');
  assert.throws(() => CY.relations(12, 0), RangeError);
});

const PREDICTIVE = /\bluck|\blucky|unlucky|fortune|you will|will happen|is going to|destined|doomed|guarantee|misfortune|bad year|good year/i;

test('every relation has copy, and the rendered section stays reflective', () => {
  for (const key of ['same','trine','harmony','clash','harm','punishment','selfPunishment','destruction','none']) {
    assert.ok(CY.COPY[key] && CY.COPY[key].title && CY.COPY[key].line, `copy for ${key}`);
    assert.doesNotMatch(`${CY.COPY[key].title} ${CY.COPY[key].line}`, PREDICTIVE, key);
  }
  for (let b = 0; b < 12; b++) for (const year of [2024, 2026, 2031]) {
    const html = CY.render({birthBranch: b, birthYear: 1990, year});
    assert.match(html, /class="chinese-year"/);
    assert.match(html, new RegExp(CY.ANIMALS[CY.yearBranch(year)].name));
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE);
  }
});

test('each relation\'s hanzi appears exactly once per item, not duplicated in the title', () => {
  for (let b = 0; b < 12; b++) for (const year of [2024, 2026, 2031]) {
    const html = CY.render({birthBranch: b, birthYear: 1990, year});
    const items = html.split('<li').slice(1);
    const keys = CY.relations(b, CY.yearBranch(year));
    (keys.length ? keys : ['none']).forEach((key, i) => {
      const hanzi = CY.COPY[key].hanzi;
      if (!hanzi) return;
      const count = items[i].split(hanzi).length - 1;
      assert.equal(count, 1, `${key} hanzi should appear exactly once, found ${count}`);
    });
  }
});

test('relation copy asserts only the positions its definition supports', () => {
  assert.doesNotMatch(CY.COPY.trine.line, /three/i);                  // trine members sit four apart
  assert.doesNotMatch(CY.COPY.harmony.line, /opposite|across/i);      // six-harmony pairs are never opposite
  assert.match(CY.COPY.clash.line, /six places apart/);               // the one relation that is a fixed distance
  assert.match(CY.COPY.clash.line, /across/);
  for (const key of Object.keys(CY.COPY).filter(k => k !== 'clash')) {
    assert.doesNotMatch(CY.COPY[key].line, /opposite|across|apart|adjacent|next to|places|signs away/i, key);
  }
});

test('renderResult re-renders the heading and relations without the year control', () => {
  for (let b = 0; b < 12; b++) for (const year of [1901, 2026, 2100]) {
    const html = CY.renderResult({birthBranch: b, year});
    const keys = CY.relations(b, CY.yearBranch(year));
    assert.match(html, new RegExp(`${CY.ANIMALS[CY.yearBranch(year)].name} year ${year}`));
    assert.match(html, new RegExp(`your ${CY.ANIMALS[b].name}`));
    assert.match(html, /<span lang="zh">[子丑寅卯辰巳午未申酉戌亥]<\/span>/);
    for (const key of keys.length ? keys : ['none']) assert.ok(html.includes(CY.COPY[key].title), `${b}/${year} ${key}`);
    assert.doesNotMatch(html, /data-chinese-year/);
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE);
  }
  const full = CY.render({birthBranch: 6, birthYear: 1990, year: 2026});
  assert.ok(full.includes(`<div class="chinese-year-result" aria-live="polite">${CY.renderResult({birthBranch: 6, year: 2026})}</div>`));
  assert.match(full, /data-chinese-year min="1901"/);
  assert.doesNotMatch(full, /year ahead/i);
});
