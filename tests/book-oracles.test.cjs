const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../book-oracles.js');
const aeneid = require('../assets/texts/aeneid-dryden.json');
const HomerOracleData = require('../homer-oracle-data.js');

// A scripted random source: returns the queued values in turn and checks each bound.
const scripted = (...values) => max => { const v = values.shift(); assert.ok(Number.isInteger(v) && v >= 0 && v < max, `scripted ${v} out of range for ${max}`); return v; };

test('three throws index the table in the papyrus’s order, 1-1-1 to 6-6-6', () => {
  assert.equal(B.rollIndex([1, 1, 1]), 0);
  assert.equal(B.rollIndex([1, 1, 6]), 5);
  assert.equal(B.rollIndex([1, 2, 1]), 6);
  assert.equal(B.rollIndex([2, 1, 1]), 36);
  assert.equal(B.rollIndex([6, 6, 6]), 215);
  const seen = new Set();
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) seen.add(B.rollIndex([a, b, c]));
  assert.equal(seen.size, 216);
  for (const bad of [[0, 1, 1], [1, 7, 1], [1, 1], [1, 1, 1, 1], [1, 2.5, 3], ['1', 1, 1], null]) assert.throws(() => B.rollIndex(bad), RangeError);
  assert.deepEqual(B.throwDice(scripted(0, 5, 2)), [1, 6, 3]);
});

const LOST = ['216', '223', '224', '225', '226', '254', '255', '256', '261', '262'];

test('the Homer table has a row for all 216 throws: 205 verses, ten lost, one withheld', () => {
  assert.equal(HomerOracleData.length, 216);
  assert.deepEqual(HomerOracleData.filter(e => e.lost).map(e => e.roll), LOST);
  assert.deepEqual(HomerOracleData.filter(e => e.withheld).map(e => e.roll), ['621']);
  assert.equal(HomerOracleData.filter(e => e.english).length, 205);
  assert.deepEqual([2, 1, 0].map(n => HomerOracleData.filter(e => e.support === n).length), [177, 23, 6]);
  HomerOracleData.forEach((entry, i) => {
    const roll = [Math.floor(i / 36) + 1, Math.floor(i / 6) % 6 + 1, i % 6 + 1];
    assert.equal(entry.roll, roll.join(''), `entry ${i} is out of order`);
    assert.equal(B.homerVerse(HomerOracleData, roll), entry);
    if (entry.lost) { assert.deepEqual(Object.keys(entry), ['roll', 'lost'], `${entry.roll}: a lost throw carries nothing else`); return; }
    assert.ok(['Iliad', 'Odyssey'].includes(entry.work), `${entry.roll}: work`);
    assert.ok(Number.isInteger(entry.book) && entry.book >= 1 && entry.book <= 24, `${entry.roll}: book`);
    assert.ok(Number.isInteger(entry.line) && entry.line >= 1 && entry.line <= 909, `${entry.roll}: line`);
    assert.ok(/[Ͱ-Ͽἀ-῿]/.test(entry.greek) && entry.greek.length > 15, `${entry.roll}: Greek`);
    if (entry.withheld) { assert.equal(entry.english, undefined); return; }
    assert.ok(/^[A-Z“‘]/.test(entry.english) && /[.?!]$/.test(entry.english) && entry.english.length > 15 && !/[Ͱ-Ͽἀ-῿]/.test(entry.english), `${entry.roll}: English`);
  });
});

test('the first throw is Iliad 24.369, as in Maltomini, and verses the oracle repeats are translated alike', () => {
  assert.deepEqual([HomerOracleData[0].work, HomerOracleData[0].book, HomerOracleData[0].line], ['Iliad', 24, 369]);
  const byRef = new Map();
  for (const e of HomerOracleData.filter(e => e.english)) {
    const key = `${e.work} ${e.book}.${e.line}`;
    if (byRef.has(key)) assert.equal(e.english, byRef.get(key).english, `${key} at ${e.roll} and ${byRef.get(key).roll}`);
    else byRef.set(key, e);
  }
  assert.equal(byRef.size, 202, '205 translated verses, three of them repeats');
});

test('a lost throw and the withheld verse are said plainly, with no verse shown', () => {
  const lost = B.renderHomer(B.homerVerse(HomerOracleData, [2, 2, 3]), [2, 2, 3]);
  assert.match(lost, /The verse for this throw is lost\./);
  assert.match(lost, /2 · 2 · 3/);
  assert.doesNotMatch(lost, /lang="grc"|<blockquote/);
  const withheld = B.renderHomer(B.homerVerse(HomerOracleData, [6, 2, 1]), [6, 2, 1]);
  assert.match(withheld, /not offered as an answer/);
  assert.match(withheld, /<cite>Odyssey<\/cite> 11\.278/);
  assert.doesNotMatch(withheld, /lang="grc"|<blockquote/);
});

test('the Aeneid text is twelve books of verse with nothing of the edition left in it', () => {
  assert.equal(aeneid.books.length, 12);
  assert.equal(aeneid.books.reduce((n, b) => n + b.length, 0), 13699);
  assert.match(aeneid.books[0][0], /^Arms, and the man I sing/);
  assert.match(aeneid.books[11].at(-1), /^And the disdainful soul came rushing through the wound\.$/);
  for (const line of aeneid.books.flat()) assert.ok(line.length >= 20 && line.length < 96 && !/Gutenberg|ARGUMENT|^BOOK /.test(line), line);
});

test('a line is drawn uniformly over the whole poem', () => {
  const total = 13699, first = aeneid.books[0].length;
  assert.deepEqual(B.drawLine(aeneid.books, scripted(0)), {book: 1, line: 1});
  assert.deepEqual(B.drawLine(aeneid.books, scripted(first - 1)), {book: 1, line: first});
  assert.deepEqual(B.drawLine(aeneid.books, scripted(first)), {book: 2, line: 1});
  assert.deepEqual(B.drawLine(aeneid.books, scripted(total - 1)), {book: 12, line: aeneid.books[11].length});
  assert.throws(() => B.drawLine([[], []], () => 0), RangeError);
});

test('a passage shows the drawn line with its neighbours and stays inside its book', () => {
  const middle = B.passage(aeneid.books, {book: 4, line: 10});
  assert.deepEqual(middle.lines.map(l => l.number), [8, 9, 10, 11, 12]);
  assert.deepEqual(middle.lines.filter(l => l.drawn).map(l => l.number), [10]);
  assert.deepEqual(B.passage(aeneid.books, {book: 1, line: 1}).lines.map(l => l.number), [1, 2, 3]);
  const last = aeneid.books[11].length;
  assert.deepEqual(B.passage(aeneid.books, {book: 12, line: last}).lines.map(l => l.number), [last - 2, last - 1, last]);
  assert.throws(() => B.passage(aeneid.books, {book: 13, line: 1}), RangeError);
  assert.throws(() => B.passage(aeneid.books, {book: 1, line: 99999}), RangeError);
});

test('the views give the verse, its reference and the throw, and escape what they show', () => {
  const homer = B.renderHomer({work: 'Iliad', book: 4, line: 101, greek: 'εὔχεο δ᾽ Ἀπόλλωνι', english: 'Pray to <Apollo> & vow'}, [3, 1, 6]);
  assert.match(homer, /Homer, <cite>Iliad<\/cite> 4\.101/);
  assert.match(homer, /3 · 1 · 6/);
  assert.ok(homer.includes('Pray to &lt;Apollo&gt; &amp; vow') && homer.includes('lang="grc"'));
  const virgil = B.renderVirgil(B.passage(aeneid.books, {book: 6, line: 1}));
  assert.match(virgil, /book VI, line 1 of Dryden’s translation/);
  assert.equal((virgil.match(/class="bo-line"/g) || []).length, 1);
  assert.equal((virgil.match(/class="bo-context"/g) || []).length, 2);
});

test('attach reads thrown or entered dice, refuses incomplete throws, and fetches the Aeneid once', async () => {
  const listeners = {}, nodes = {};
  const section = {innerHTML: '', querySelector(selector) {
    return nodes[selector] || (nodes[selector] = {value: '', innerHTML: '', textContent: '', addEventListener(type, fn) { listeners[`${selector}:${type}`] = fn; }});
  }};
  let fetches = 0;
  B.attach(section, {table: HomerOracleData, randomInt: scripted(1, 2, 3, 0), loadAeneid: () => { fetches++; return Promise.resolve(aeneid); }});

  listeners['#bo-homer-roll:click']();
  assert.deepEqual(['#bo-die-1', '#bo-die-2', '#bo-die-3'].map(s => nodes[s].value), ['2', '3', '4']);
  assert.ok(nodes['#bo-homer-output'].innerHTML.includes(HomerOracleData[B.rollIndex([2, 3, 4])].greek));

  nodes['#bo-homer-output'].innerHTML = '';
  nodes['#bo-die-2'].value = '';
  listeners['#bo-homer-form:submit']({preventDefault() {}});
  assert.match(nodes['#bo-homer-status'].textContent, /Choose a number from one to six/);
  assert.equal(nodes['#bo-homer-output'].innerHTML, '');
  nodes['#bo-die-1'].value = '6'; nodes['#bo-die-2'].value = '6'; nodes['#bo-die-3'].value = '6';
  listeners['#bo-homer-form:submit']({preventDefault() {}});
  assert.ok(nodes['#bo-homer-output'].innerHTML.includes(HomerOracleData[215].greek));
  assert.equal(nodes['#bo-homer-status'].textContent, '');

  await listeners['#bo-virgil-form:submit']({preventDefault() {}});
  assert.match(nodes['#bo-virgil-output'].innerHTML, /Arms, and the man I sing/);
  assert.equal(fetches, 1);
});

test('a failed fetch says so and lets the reader try again', async () => {
  const listeners = {}, nodes = {};
  const section = {innerHTML: '', querySelector(selector) {
    return nodes[selector] || (nodes[selector] = {value: '', innerHTML: '', textContent: '', addEventListener(type, fn) { listeners[`${selector}:${type}`] = fn; }});
  }};
  let attempts = 0;
  B.attach(section, {table: HomerOracleData, randomInt: scripted(0), loadAeneid: () => ++attempts === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(aeneid)});
  await listeners['#bo-virgil-form:submit']({preventDefault() {}});
  assert.match(nodes['#bo-virgil-status'].textContent, /could not be fetched/);
  await listeners['#bo-virgil-form:submit']({preventDefault() {}});
  assert.equal(attempts, 2);
  assert.match(nodes['#bo-virgil-output'].innerHTML, /Arms, and the man I sing/);
});
