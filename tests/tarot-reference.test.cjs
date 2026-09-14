const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../tarot-reference.js');

// The real 78-card catalogue, built without booting the DOM application.
// Same harness as tests/tarot-readings.test.cjs.
const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(catalogue + '\ntarotCards', {
  TarotReadings: require('../tarot-readings.js'),
  majorArcana: require('../birth-lore.js').majorArcana
});

test('the reference names the same 78 cards, in the same order, as the real catalogue', () => {
  assert.equal(cards.length, 78, 'the catalogue itself changed size');
  for (let i = 0; i < 78; i++) {
    assert.equal(R.name(i), cards[i].name, `index ${i} disagrees with the catalogue`);
  }
  assert.equal(R.name(-1), '');
  assert.equal(R.name(78), '');
});

test('every card has a slug that round-trips back to its index', () => {
  const seen = new Set();
  for (let i = 0; i < 78; i++) {
    const slug = R.slug(i);
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `index ${i} produced the slug "${slug}"`);
    assert.ok(!seen.has(slug), `slug "${slug}" is used twice`);
    seen.add(slug);
    assert.equal(R.indexForSlug(slug), i);
  }
  assert.equal(R.indexForSlug('not-a-card'), -1);
  assert.equal(R.indexForSlug(''), -1);
  assert.equal(R.indexForSlug(null), -1);
});

test('slugs are the ones the URLs will use', () => {
  assert.equal(R.slug(0), 'the-fool');
  assert.equal(R.slug(10), 'wheel-of-fortune');
  assert.equal(R.slug(21), 'the-world');
  assert.equal(R.slug(22), 'ace-of-wands');
  assert.equal(R.slug(35), 'king-of-wands');
  assert.equal(R.slug(36), 'ace-of-cups');
  assert.equal(R.slug(77), 'king-of-pentacles');
});

// The traditional table, written out so the derivation is pinned to something
// other than itself. Golden Dawn decan attributions for the 36 pip cards.
const PIPS = [
  ['Two of Wands', 'Mars', 'Aries'], ['Three of Wands', 'Sun', 'Aries'], ['Four of Wands', 'Venus', 'Aries'],
  ['Five of Pentacles', 'Mercury', 'Taurus'], ['Six of Pentacles', 'Moon', 'Taurus'], ['Seven of Pentacles', 'Saturn', 'Taurus'],
  ['Eight of Swords', 'Jupiter', 'Gemini'], ['Nine of Swords', 'Mars', 'Gemini'], ['Ten of Swords', 'Sun', 'Gemini'],
  ['Two of Cups', 'Venus', 'Cancer'], ['Three of Cups', 'Mercury', 'Cancer'], ['Four of Cups', 'Moon', 'Cancer'],
  ['Five of Wands', 'Saturn', 'Leo'], ['Six of Wands', 'Jupiter', 'Leo'], ['Seven of Wands', 'Mars', 'Leo'],
  ['Eight of Pentacles', 'Sun', 'Virgo'], ['Nine of Pentacles', 'Venus', 'Virgo'], ['Ten of Pentacles', 'Mercury', 'Virgo'],
  ['Two of Swords', 'Moon', 'Libra'], ['Three of Swords', 'Saturn', 'Libra'], ['Four of Swords', 'Jupiter', 'Libra'],
  ['Five of Cups', 'Mars', 'Scorpio'], ['Six of Cups', 'Sun', 'Scorpio'], ['Seven of Cups', 'Venus', 'Scorpio'],
  ['Eight of Wands', 'Mercury', 'Sagittarius'], ['Nine of Wands', 'Moon', 'Sagittarius'], ['Ten of Wands', 'Saturn', 'Sagittarius'],
  ['Two of Pentacles', 'Jupiter', 'Capricorn'], ['Three of Pentacles', 'Mars', 'Capricorn'], ['Four of Pentacles', 'Sun', 'Capricorn'],
  ['Five of Swords', 'Venus', 'Aquarius'], ['Six of Swords', 'Mercury', 'Aquarius'], ['Seven of Swords', 'Moon', 'Aquarius'],
  ['Eight of Cups', 'Saturn', 'Pisces'], ['Nine of Cups', 'Jupiter', 'Pisces'], ['Ten of Cups', 'Mars', 'Pisces']
];

test('all 36 pip attributions match the traditional table', () => {
  assert.equal(PIPS.length, 36);
  const byName = new Map();
  for (let i = 0; i < 78; i++) {
    const a = R.attribution(i);
    if (a && a.kind === 'decan') byName.set(R.name(i), a);
  }
  assert.equal(byName.size, 36, 'exactly the 36 pip cards should carry a decan');
  for (const [card, ruler, sign] of PIPS) {
    const a = byName.get(card);
    assert.ok(a, `${card} has no decan attribution`);
    assert.equal(a.ruler, ruler, `${card} ruler`);
    assert.equal(a.sign, sign, `${card} sign`);
    assert.equal(a.line, `${ruler} in ${sign}`, `${card} line`);
  }
});

test('the derived decan rulers agree with the classical engine', () => {
  // classical-engine.js already carries the Chaldean face order and is covered by the
  // horary tests. If these two ever disagree, one of them has been edited wrongly.
  const faceRuler = require('../classical-engine.js').faceRuler;
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  for (let i = 0; i < 78; i++) {
    const a = R.attribution(i);
    if (!a || a.kind !== 'decan') continue;
    const signIndex = signs.indexOf(a.sign);
    const decan = PIPS.findIndex(p => p[0] === R.name(i)) % 3;
    assert.equal(a.ruler, faceRuler(signIndex, decan * 10 + 5), `${R.name(i)} disagrees with classical-engine`);
  }
});

test('every card has an attribution and each kind has the fields it claims', () => {
  const counts = {decan: 0, ace: 0, court: 0, major: 0};
  for (let i = 0; i < 78; i++) {
    const a = R.attribution(i);
    assert.ok(a, `${R.name(i)} (index ${i}) has no attribution`);
    assert.ok(a.line && a.line.length > 2, `${R.name(i)} has an empty line`);
    counts[a.kind]++;
    if (a.kind === 'decan') { assert.ok(a.sign); assert.ok(a.ruler); }
    if (a.kind === 'ace' || a.kind === 'court') assert.ok(a.element);
    if (a.kind === 'major') assert.ok(a.letter, `${R.name(i)} has no Hebrew letter`);
  }
  assert.deepEqual(counts, {decan: 36, ace: 4, court: 16, major: 22});
});

test('aces take the root of their element and courts the element-of-element form', () => {
  assert.equal(R.attribution(22).line, 'The root of the powers of Fire');   // Ace of Wands
  assert.equal(R.attribution(36).line, 'The root of the powers of Water');  // Ace of Cups
  assert.equal(R.attribution(50).line, 'The root of the powers of Air');    // Ace of Swords
  assert.equal(R.attribution(64).line, 'The root of the powers of Earth');  // Ace of Pentacles
  // King fire, Queen water, Knight air, Page earth, each over its suit's element.
  assert.equal(R.attribution(35).line, 'Fire of Fire');   // King of Wands
  assert.equal(R.attribution(34).line, 'Water of Fire');  // Queen of Wands
  assert.equal(R.attribution(33).line, 'Air of Fire');    // Knight of Wands
  assert.equal(R.attribution(32).line, 'Earth of Fire');  // Page of Wands
  assert.equal(R.attribution(76).line, 'Water of Earth'); // Queen of Pentacles
});

test('the majors follow Waite: Strength is VIII with Leo, Justice is XI with Libra', () => {
  const strength = R.attribution(8);
  assert.equal(R.name(8), 'Strength');
  assert.equal(strength.sign, 'Leo');
  assert.equal(strength.letter, 'Teth');
  const justice = R.attribution(11);
  assert.equal(R.name(11), 'Justice');
  assert.equal(justice.sign, 'Libra');
  assert.equal(justice.letter, 'Lamed');
  // Waite, not Crowley: The Emperor keeps Heh and Aries, The Star keeps Tzaddi and Aquarius.
  assert.equal(R.attribution(4).letter, 'Heh');
  assert.equal(R.attribution(4).sign, 'Aries');
  assert.equal(R.attribution(17).letter, 'Tzaddi');
  assert.equal(R.attribution(17).sign, 'Aquarius');
  // The three elemental majors carry an element, not a sign or planet.
  assert.equal(R.attribution(0).element, 'Air');    // The Fool
  assert.equal(R.attribution(12).element, 'Water'); // The Hanged Man
  assert.equal(R.attribution(20).element, 'Fire');  // Judgement
  // Every Hebrew letter is used exactly once across the 22.
  const letters = Array.from({length: 22}, (_, i) => R.attribution(i).letter);
  assert.equal(new Set(letters).size, 22);
});

test('a card URL parameter resolves to exactly one card, or to nothing', () => {
  const fromQuery = search => R.indexForSlug(new URLSearchParams(search).get('card') || '');
  assert.equal(fromQuery('?card=the-star'), 17);
  assert.equal(fromQuery('?card=five-of-wands'), 26);
  assert.equal(fromQuery('?card=wheel-of-fortune'), 10);
  assert.equal(fromQuery('?reading=42'), -1, 'the reading parameter must not be read as a card');
  assert.equal(fromQuery('?card=THE-STAR'), -1, 'slugs are lowercase only');
  assert.equal(fromQuery('?card=<script>'), -1);
  assert.equal(fromQuery(''), -1);
});

test('every card in the Major Arcana batch has a reference entry', () => {
  for (let i = 0; i <= 21; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});

test('every card in the Wands batch has a reference entry', () => {
  for (let i = 22; i <= 35; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});

test('every card in the Cups batch has a reference entry', () => {
  for (let i = 36; i <= 49; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});

test('every card in the Swords batch has a reference entry', () => {
  for (let i = 50; i <= 63; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});

test('every card in the Pentacles batch has a reference entry', () => {
  for (let i = 64; i <= 77; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});

test('all 78 cards have a reference entry, and no two share one', () => {
  const missing = [];
  for (let i = 0; i < 78; i++) if (!R.entry(i).reference) missing.push(R.name(i));
  assert.deepEqual(missing, [], 'cards without a reference entry');
  const texts = Array.from({length: 78}, (_, i) => R.entry(i).reference);
  assert.equal(new Set(texts).size, 78, 'two cards share the same entry');
});

test("no reference entry is a rearrangement of that card's own reading copy", () => {
  const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
  const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
  const cards = vm.runInNewContext(catalogue + '\ntarotCards', {
    TarotReadings: require('../tarot-readings.js'),
    majorArcana: require('../birth-lore.js').majorArcana
  });
  const shingles = text => new Set((text.toLowerCase().match(/[a-z]+/g) || [])
    .map((w, i, a) => a.slice(i, i + 4).join(' ')).filter(s => s.split(' ').length === 4));
  for (let i = 0; i < 78; i++) {
    const ref = shingles(R.entry(i).reference);
    const reading = shingles(`${cards[i].upright} ${cards[i].reversed}`);
    const shared = [...ref].filter(s => reading.has(s));
    assert.ok(shared.length <= 2,
      `${R.name(i)} shares ${shared.length} four-word runs with its reading copy: ${shared.slice(0, 3).join(' / ')}`);
  }
});

// A batch insert script once duplicated a whole block of assignments and every test
// still passed, because a repeated REFERENCE[36] = ... leaves one key in the object.
test('no REFERENCE index is assigned more than once', () => {
  const src = fs.readFileSync(require.resolve('../tarot-reference.js'), 'utf8');
  const assignments = src.match(/REFERENCE\[\d+\]\s*=/g) || [];
  assert.equal(assignments.length, new Set(assignments).size,
    'a REFERENCE index is assigned more than once');
});
