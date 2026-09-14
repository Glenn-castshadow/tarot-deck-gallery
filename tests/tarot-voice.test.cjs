const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../tarot-reference.js');

// Phrases that name an OUTCOME. Deliberately not bare words: "luck" and "fortune" both
// occur correctly in existing copy (the Wheel of Fortune is a card, and one line tells the
// reader not to wait for luck), and "you will" is correct when the verb is the reader's own
// action. See docs/superpowers/specs/2026-09-13-tarot-reference-design.md.
const FORBIDDEN = [
  'you will meet', 'you will receive', 'you will find', 'you will be given',
  'you will get', 'is going to happen', 'will happen to you',
  'the answer is yes', 'the answer is no', 'means yes',
  // Not 'means no' (matches "means nothing", "means nobody") and not the bare word
  // 'guaranteed' (matches the disclaimer "no outcome is guaranteed"). The verdict sense of
  // both is already covered by 'the answer is no' and 'is guaranteed to'.
  'definitely will', 'certainly will', 'is destined to', 'is guaranteed to',
  'you will win', 'you will lose', 'you will succeed', 'you will fail',
  'you are going to', 'will bring you', 'is certain to', 'without a doubt',
  'your future holds', 'in your future', 'fated to', 'the outcome will be'
];

const scan = (text, where) => {
  const lower = String(text).toLowerCase();
  for (const phrase of FORBIDDEN) {
    assert.ok(!lower.includes(phrase), `"${phrase}" appears in ${where}`);
  }
};

const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(catalogue + '\ntarotCards', {
  TarotReadings: require('../tarot-readings.js'),
  majorArcana: require('../birth-lore.js').majorArcana
});

test('no reference entry predicts an outcome or returns a verdict', () => {
  for (const [index, text] of Object.entries(R.REFERENCE)) {
    scan(text, `the reference entry for ${R.name(Number(index))}`);
  }
});

test('no existing reading copy predicts an outcome or returns a verdict', () => {
  // The card's own name is not scanned: "Wheel of Fortune" is a name, not a claim.
  for (const card of cards) {
    scan(`${card.upright} ${card.reversed} ${card.prompt} ${card.keywords}`, card.name);
  }
  const T = require('../tarot-readings.js');
  for (const spread of Object.values(T.spreads)) {
    scan(`${spread.description} ${spread.tradition}`, spread.name);
    for (const position of spread.positions) scan(`${position.lens} ${position.question}`, `${spread.name}: ${position.name}`);
  }
  for (const focus of Object.values(T.focuses)) scan(focus.lens, focus.label);
  for (const [suit, theme] of Object.entries(T.suitThemes)) {
    scan(`${theme.name} ${theme.topic} ${theme.practice}`, `suit theme ${suit}`);
  }
});
