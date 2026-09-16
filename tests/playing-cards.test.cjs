const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../playing-cards.js');

test('the deck is 52 cards in suit then rank order', () => {
  assert.equal(P.cards.length, 52);
  assert.deepEqual(P.cards.map(c => c.id), Array.from({length: 52}, (_, i) => i));
  assert.equal(new Set(P.cards.map(c => c.name)).size, 52);
  assert.equal(P.cards[0].name, 'Ace of Hearts');
  assert.equal(P.cards[12].name, 'King of Hearts');
  assert.equal(P.cards[13].name, 'Ace of Diamonds');
  assert.equal(P.cards[50].name, 'Queen of Spades');
  assert.deepEqual(P.SUITS.map(s => s.key), ['hearts', 'diamonds', 'clubs', 'spades']);
  assert.deepEqual(P.SUITS.map(s => s.colour), ['red', 'red', 'black', 'black']);
});

test('pip layouts: one per rank value for 2–10, one for an ace, none for courts, all inside the face', () => {
  assert.equal(P.pips(1).length, 1);
  for (let rank = 2; rank <= 10; rank++) {
    const p = P.pips(rank);
    assert.equal(p.length, rank, `rank ${rank}`);
    assert.equal(new Set(p.map(([x, y]) => `${x},${y}`)).size, rank, `rank ${rank} has a duplicate pip`);
    for (const [x, y] of p) assert.ok(x > 0 && x < 1 && y > 0 && y < 1, `rank ${rank} pip outside the face`);
  }
  for (const rank of [11, 12, 13]) assert.deepEqual(P.pips(rank), []);
  assert.throws(() => P.pips(0), RangeError);
  assert.throws(() => P.pips(14), RangeError);
});

test('each card face names itself and carries its colour class', () => {
  for (const card of P.cards) {
    const s = P.svg(card);
    assert.match(s, new RegExp(`<title>${card.name}</title>`));
    assert.match(s, new RegExp(`class="pc-card pc-${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'}"`));
    assert.match(s, new RegExp(`class="pc-rank">${card.rankKey}<`));
    const pathCount = (s.match(/<path /g) || []).length;
    const expected = 2 + (card.rank >= 11 ? 1 : card.rank);   // two corner marks, then face marks
    assert.equal(pathCount, expected, `${card.name}: ${pathCount} suit marks`);
  }
  assert.throws(() => P.svg({rank: 14, suit: 'hearts', name: 'x'}), RangeError);
});

test('every card has original, reflective copy', () => {
  const banned = /you will|will happen|is going to|\bluck|fortune|misfortune|death|\bdie\b|illness|disease|curse|doom|destined|guarantee/i;
  for (const card of P.cards) {
    for (const field of ['keyword', 'meaning', 'prompt']) {
      assert.ok(typeof card[field] === 'string' && card[field].trim(), `${card.name} ${field}`);
      assert.doesNotMatch(card[field], banned, `${card.name} ${field}`);
      assert.doesNotMatch(card[field], /'/, `${card.name} ${field} uses a straight apostrophe`);
    }
    assert.ok(card.prompt.trim().endsWith('?'), `${card.name} prompt is a question`);
  }
  assert.equal(new Set(P.cards.map(c => c.keyword)).size, 52);
  assert.equal(new Set(P.cards.map(c => c.meaning)).size, 52);
});
