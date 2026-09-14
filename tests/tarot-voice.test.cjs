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

// The general FORBIDDEN list scans for a forecast; the one-card draw's own risk is a verdict,
// which needs its own phrase list. The brief's own ten phrases catch verbatim reintroductions
// of a yes/no answer. A review of this spread found that list too narrow: it would miss a
// verdict that crept back in differently worded, so nine more are added here — checked first
// against all six spreads' copy and the 78 reference entries, where none of the ten produced a
// hit (see docs/superpowers/sdd/2026-09-14-tarot-draws/task-7-report.md). 'confirms' is in both
// lists; it appears once below rather than twice.
//
// This list is a fixed-phrase scan, not a tense or modal analyser, and it does not claim to be
// one — the same limitation docs/TAROT-REFERENCE.md states plainly for the general gate. A
// verdict phrased in words not on this list (a qualified form like "a clear yes", a verb variant
// like "leaning toward" or "tilts toward", or any other wording this list was not written
// against) will pass this test untouched. Adding every such variant as another bare phrase would
// only recreate the problem fixed below, so the list stays a known-incomplete net rather than
// growing indefinitely; new gaps are a case for a reviewer reading the copy, the same way
// docs/TAROT-REFERENCE.md records its own gate being caught out twice by present-simple
// forecasts with no listed phrase in them.
test('the one-card draw never offers an answer or a lean', () => {
  const spread = require('../tarot-readings.js').spreads.question;
  const text = `${spread.name} ${spread.subtitle} ${spread.description} ${spread.tradition} ${spread.positions.map(p => `${p.name} ${p.short} ${p.lens} ${p.question}`).join(' ')}`.toLowerCase();
  for (const phrase of [
    'yes or no', 'leans toward', 'leans away', 'the answer is', 'says yes', 'says no', 'confirms', 'rules out',
    'favourable', 'unfavourable', 'overturns', 'a good sign', 'a bad sign', 'tips toward', 'in your favour'
  ]) {
    assert.ok(!text.includes(phrase), `"${phrase}" appears in the one-card draw copy`);
  }
  // 'a yes' and 'a no' cannot be bare substrings: "a no" matches "a normal", "a note", "a nod",
  // and both match "it is not a yes or a no" — the natural paraphrase of this spread's own
  // disclaimer. 'points to a yes'/'points to a no' carry the same collision, one step removed:
  // "points to a novel idea" and "points to a note of caution" both contain "points to a no". A
  // gate that blocks the sentence it exists to protect is the failure docs/TAROT-REFERENCE.md
  // describes: it gets switched off by the first person it blocks. So none of these four are
  // plain phrase-array strings; 'points to' instead joins the asserting-verb alternation below,
  // which requires the verb immediately before "a yes"/"a no" — do not "restore" it to the list
  // above as a bare string, that reintroduces the exact collision this comment describes.
  // The alternation also covers the contraction ("it's a yes") and two more asserting forms
  // ("comes out as a no", "turns out to be a no") that a literal "is" alone would miss.
  // "it['’]s" accepts both the straight apostrophe and the curly one (U+2019): this
  // codebase's own prose is written with curly apostrophes throughout (see the existing spread
  // copy), so a straight-apostrophe-only branch would be dead against any contraction a real
  // author actually writes. The trailing (?![\w-]) is a negative lookahead, not \b, because \b
  // treats a hyphen as a word boundary: without it, "a no-brainer" or "a no-show" would each
  // read as the verdict "a no" followed by a boundary and fail the gate on ordinary English that
  // states no verdict at all.
  assert.ok(!/\b(is|it['’]s|reads as|amounts to|comes out(?: as)?|turns out to be|points to) a (yes|no)(?![\w-])/i.test(text),
    'the one-card draw copy states a verdict');
});
