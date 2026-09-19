const test = require('node:test');
const assert = require('node:assert/strict');
const {figures, licence} = require('../tools/data/zodiac-figures.json');
const Z = require('../tools/build_zodiac_figures.cjs');
const C = require('../tools/compose_sign_banners.cjs');

test('there are twelve figures, each vertex a position and a magnitude, and the licence travels with them', () => {
  assert.deepEqual(Object.keys(figures), Object.keys(Z.IDS));
  for (const [sign, polylines] of Object.entries(figures)) {
    assert.ok(polylines.length >= 1, sign);
    for (const [ra, dec, mag] of polylines.flat()) {
      assert.ok(ra >= -180 && ra <= 180 && dec >= -90 && dec <= 90, `${sign} position`);
      assert.ok(mag > -2 && mag < 6.6, `${sign} magnitude ${mag}`);
    }
  }
  assert.match(licence, /BSD-3-Clause/);
});

test('the brightest star of each figure is the one the published catalogues give', () => {
  const brightest = sign => Math.min(...figures[sign].flat().map(v => v[2]));
  // Published visual magnitudes: Aldebaran 0.87, Regulus 1.36, Spica 0.98, Antares 1.06, Hamal 2.01, Pollux 1.16.
  assert.deepEqual(['taurus', 'leo', 'virgo', 'scorpio', 'aries', 'gemini'].map(brightest), [0.87, 1.36, 0.98, 1.06, 2.01, 1.16]);
  // Aries is the short bent line of four stars, not the zigzag an image model draws.
  assert.deepEqual(figures.aries.map(line => line.length), [4]);
});

test('separation is the angle between two sky positions', () => {
  assert.ok(Math.abs(Z.separation([0, 0], [90, 0]) - 90) < 1e-9);
  assert.ok(Math.abs(Z.separation([10, 89], [190, 89]) - 2) < 1e-9);   // across the pole
  assert.ok(Math.abs(Z.separation([179.5, 0], [-179.5, 0]) - 1) < 1e-9);   // across the wrap in right ascension
});

test('the projection draws the sky as seen from the ground: north up, east to the left', () => {
  const box = {x: 0, y: 0, w: 100, h: 100};
  const [[west, east]] = C.project([[[10, 0, 1], [20, 0, 1]]], box);       // greater right ascension is further east
  assert.ok(east[0] < west[0], 'east is drawn to the left');
  const [[south, north]] = C.project([[[0, 10, 1], [0, 20, 1]]], box);
  assert.ok(north[1] < south[1], 'north is drawn higher');
  const [[a, b]] = C.project([[[179, 0, 1], [-179, 0, 1]]], box);          // two degrees apart, across the wrap
  assert.ok(Math.abs(a[0] - b[0]) <= 100 && b[0] < a[0]);
  for (const sign of Object.keys(figures)) for (const [x, y] of C.project(figures[sign]).flat()) {
    assert.ok(x >= C.BOX.x - 0.01 && x <= C.BOX.x + C.BOX.w + 0.01 && y >= C.BOX.y - 0.01 && y <= C.BOX.y + C.BOX.h + 0.01, `${sign} stays in its box`);
  }
});

test('a brighter star is drawn larger, within bounds', () => {
  assert.ok(C.starRadius(0.87) > C.starRadius(2.01) && C.starRadius(2.01) > C.starRadius(4.5));
  assert.equal(C.starRadius(-1.5), 7.2);
  assert.equal(C.starRadius(6.5), 2);
  const svg = C.overlaySvg(figures.aries);
  assert.equal((svg.match(/<circle/g) || []).length, 4 * 3);   // four stars, a disc and two halo rings each
  assert.match(svg, /^<svg [^>]*width="1200" height="520"/);
});
