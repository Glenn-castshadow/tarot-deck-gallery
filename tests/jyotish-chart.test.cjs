const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../jyotish-chart.js');

function makeHouses() {
  return Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    signIndex: (4 + i) % 12,
    grahas: i === 0 ? ['Sun', 'Rahu'] : i === 6 ? ['Moon'] : [],
  }));
}

test('chart renderer places every sign once and the lagna mark in both formats', () => {
  const houses = makeHouses();
  for (const format of ['south', 'north']) {
    const svg = C.render({
      format,
      houses,
      lagnaSignIndex: 4,
      abbreviations: { Sun: 'Su', Moon: 'Mo', Rahu: 'Ra' },
      retrograde: ['Rahu'],
      title: 'Rashi',
    });
    assert.match(svg, /^<svg[^>]*viewBox="0 0 400 400"/);
    for (let s = 0; s < 12; s++) {
      assert.equal(
        (svg.match(new RegExp(`data-sign="${s}"`, 'g')) || []).length,
        1,
        `${format} sign ${s} once`
      );
    }
    assert.match(svg, /data-house="1"[^>]*data-sign="4"[^>]*data-lagna="true"/);
    assert.match(svg, /Su/);
    assert.match(svg, /Ra ?R|RaR/);
    assert.match(svg, /Mo/);
    assert.match(svg, /aria-label="[^"]*Simha/);
  }
  assert.throws(() => C.render({ format: 'east', houses, lagnaSignIndex: 4 }));
});

test('throws when houses is not exactly twelve entries', () => {
  const houses = makeHouses().slice(0, 11);
  assert.throws(() => C.render({ format: 'south', houses, lagnaSignIndex: 0 }));
  assert.throws(() => C.render({ format: 'north', houses: 'nope', lagnaSignIndex: 0 }));
});

test('south format: only the lagna house carries a diagonal corner mark, and the empty centre carries the title', () => {
  const houses = makeHouses();
  const svg = C.render({ format: 'south', houses, lagnaSignIndex: 4, title: 'Rashi' });
  const lagnaGroup = svg.match(/<g[^>]*data-lagna="true"[^>]*>[\s\S]*?<\/g>/)[0];
  assert.match(lagnaGroup, /<line/);
  const nonLagnaGroups = [...svg.matchAll(/<g data-house="(\d+)" data-sign="\d+">([\s\S]*?)<\/g>/g)].filter(
    (m) => m[1] !== '1'
  );
  assert.ok(nonLagnaGroups.length === 11);
  for (const [, , body] of nonLagnaGroups) assert.doesNotMatch(body, /<line/);
  assert.match(svg, />Rashi</);
});

test('north format: bhava 1 (the top rhombus) is always labelled Asc regardless of which sign lands there', () => {
  const houses = makeHouses();
  const svg = C.render({ format: 'north', houses, lagnaSignIndex: 4, title: 'Rashi' });
  assert.match(svg, /<g data-house="1" data-sign="4"[^>]*data-lagna="true"[^>]*>[\s\S]*?Asc[\s\S]*?<\/g>/);
  // diamond and diagonals present
  assert.match(svg, /<line/);
});

test('signs render as western abbreviations in south, and as sign numbers in north', () => {
  const houses = makeHouses();
  const south = C.render({ format: 'south', houses, lagnaSignIndex: 4 });
  const north = C.render({ format: 'north', houses, lagnaSignIndex: 4 });
  assert.match(south, />Sag</); // signIndex (4+8)%12=0? just check some abbreviation exists
  assert.match(south, />Ari</);
  assert.match(north, />5</); // house index 1 has signIndex 4 -> displayed as 5
});

test('graha labels fit a crowded house in both formats, and a three-graha house still renders three labels', () => {
  const nineNames = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];
  const threeNames = ['Su', 'Mo', 'Ma'];
  const housesWithBhava9 = (names) =>
    Array.from({ length: 12 }, (_, i) => ({ index: i + 1, signIndex: i, grahas: i === 8 ? names : [] }));

  for (const format of ['south', 'north']) {
    const svgNine = C.render({ format, houses: housesWithBhava9(nineNames), lagnaSignIndex: 0 });
    const groupNine = svgNine.match(/<g data-house="9"[^>]*>([\s\S]*?)<\/g>/)[1];
    const ys = [...groupNine.matchAll(/<text[^>]*\sy="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    assert.ok(ys.length > 0, `${format}: some text rendered for a nine-graha house`);
    // SOUTH_CELLS[8] = [0, 300] (cy=300); NORTH_CENTERS[9] = [350, 300] (cy=300).
    const cy = 300;
    for (const y of ys) {
      if (format === 'south') assert.ok(y >= cy && y <= cy + 100, `south y ${y} within [${cy}, ${cy + 100}]`);
      else assert.ok(Math.abs(y - cy) <= 40, `north y ${y} within 40px of ${cy}`);
    }
    for (const name of nineNames) assert.match(groupNine, new RegExp(name), `${format} nine-graha house includes ${name}`);

    const svgThree = C.render({ format, houses: housesWithBhava9(threeNames), lagnaSignIndex: 0 });
    const groupThree = svgThree.match(/<g data-house="9"[^>]*>([\s\S]*?)<\/g>/)[1];
    for (const name of threeNames) assert.match(groupThree, new RegExp(name), `${format} three-graha house still shows ${name}`);
  }
});

test('lagnaSignIndex must be an integer from 0 to 11', () => {
  const houses = makeHouses();
  for (const format of ['south', 'north']) {
    assert.throws(() => C.render({ format, houses, lagnaSignIndex: -1 }), RangeError);
    assert.throws(() => C.render({ format, houses, lagnaSignIndex: 12 }), RangeError);
    assert.throws(() => C.render({ format, houses, lagnaSignIndex: 4.5 }), RangeError);
    assert.throws(() => C.render({ format, houses, lagnaSignIndex: undefined }), RangeError);
    assert.doesNotThrow(() => C.render({ format, houses, lagnaSignIndex: 0 }));
    assert.doesNotThrow(() => C.render({ format, houses, lagnaSignIndex: 11 }));
  }
});
