const test = require('node:test');
const assert = require('node:assert/strict');
const Crystals = require('../crystals.js');
const BirthLore = require('../birth-lore.js');

// A fixture, not the real data, so these tests do not move when the copy does.
const fixture = [
  {slug: 'amethyst', name: 'Amethyst', aka: ['purple quartz'], signs: ['Aquarius', 'Pisces'], chakras: ['crown'], element: 'Air', colours: ['#9966cc']},
  {slug: 'garnet', name: 'Garnet', aka: [], signs: ['Capricorn'], chakras: ['root'], element: 'Fire', colours: ['#7b1e2b', '#b33a3a']},
  {slug: 'labradorite', name: 'Labradorite', aka: ['spectrolite'], signs: ['Aquarius'], chakras: ['third-eye', 'throat'], element: 'Water', colours: ['#4a5a6a']},
  {slug: 'pearl', name: 'Pearl', aka: [], signs: ['Cancer'], chakras: ['sacral'], element: 'Water', colours: ['#f4efe6']},
  {slug: 'moonstone', name: 'Moonstone', aka: [], signs: ['Cancer'], chakras: ['sacral', 'crown'], element: 'Water', colours: ['#e6e8ef']}
];
const sign = name => BirthLore.zodiacSigns.find(s => s.name === name);

test('the daily crystal is stable for a date, in range, and moves across days', () => {
  assert.equal(Crystals.dailyIndex('2026-09-24', 100), Crystals.dailyIndex('2026-09-24', 100));
  const seen = new Set();
  for (let d = 1; d <= 60; d++) {
    const key = `2026-${d <= 30 ? '09' : '10'}-${String(((d - 1) % 30) + 1).padStart(2, '0')}`;
    const index = Crystals.dailyIndex(key, 100);
    assert.ok(Number.isInteger(index) && index >= 0 && index < 100, key);
    seen.add(index);
  }
  assert.ok(seen.size >= 30, `only ${seen.size} different stones in 60 days`);
});

test('your stones: month birthstone, sign stones, then other stones of the sign', () => {
  // June is "Pearl · moonstone"; Aquarius is "Amethyst · garnet".
  const out = Crystals.stonesFor(fixture, BirthLore, {month: 6, sign: sign('Aquarius')});
  assert.deepEqual(out.birthstone.map(c => c.slug), ['pearl', 'moonstone']);
  assert.deepEqual(out.signStones.map(c => c.slug), ['amethyst', 'garnet']);
  assert.deepEqual(out.kindred.map(c => c.slug), ['labradorite'], 'amethyst is already listed, so only labradorite');
  const none = Crystals.stonesFor(fixture, BirthLore, {});
  assert.deepEqual([none.birthstone, none.signStones, none.kindred], [[], [], []]);
});

test('filter by name or other name, chakra, sign and element', () => {
  const slugs = f => Crystals.filter(fixture, f).map(c => c.slug);
  assert.equal(slugs({}).length, 5);
  assert.deepEqual(slugs({q: 'SPECTRO'}), ['labradorite']);
  assert.deepEqual(slugs({q: '  moon '}), ['moonstone']);
  assert.deepEqual(slugs({chakra: 'crown'}), ['amethyst', 'moonstone']);
  assert.deepEqual(slugs({sign: 'Cancer', element: 'Water'}), ['pearl', 'moonstone']);
  assert.deepEqual(slugs({sign: 'Leo'}), []);
});
