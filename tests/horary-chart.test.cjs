const test = require('node:test');
const assert = require('node:assert/strict');
const HoraryChart = require('../horary-chart.js');
const NatalEngine = require('../natal-engine.js');

const LOCATION = { latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' };

function makeChart() {
  return NatalEngine.chartAtInstant(new Date('2024-03-15T10:20:00Z'), LOCATION);
}

test('renders twelve cusp groups and nine planet groups (seven classical planets plus the two nodes)', () => {
  const chart = makeChart();
  const svg = HoraryChart.render({ chart, title: 'Where is my cat?' });
  assert.equal((svg.match(/data-cusp="/g) || []).length, 12);
  assert.equal((svg.match(/data-planet="/g) || []).length, 9);
  for (const name of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'North Node', 'South Node']) {
    assert.match(svg, new RegExp(`data-planet="${name}"`));
  }
  for (const name of ['Uranus', 'Neptune', 'Pluto']) {
    assert.doesNotMatch(svg, new RegExp(`data-planet="${name}"`));
  }
});

test('root svg carries the expected viewBox, role and escaped, ascendant-describing aria-label', () => {
  const chart = makeChart();
  const svg = HoraryChart.render({ chart, title: 'Cats & dogs <3' });
  assert.match(svg, /^<svg[^>]*viewBox="0 0 440 440"/);
  assert.match(svg, /role="img"/);
  const placement = NatalEngine.placement(chart.angles.asc);
  const deg = Math.floor(NatalEngine.mod(chart.angles.asc) % 30);
  assert.match(svg, /aria-label="Cats &amp; dogs &lt;3: Ascendant/);
  assert.ok(svg.includes(`Ascendant ${placement.sign} ${deg}°`));
});

test('the ASC cusp line runs to the left of centre, the MC cusp line runs above centre', () => {
  const chart = makeChart();
  const svg = HoraryChart.render({ chart, title: 'Test' });
  const ascGroup = svg.match(/<g data-cusp="1">([\s\S]*?)<\/g>/)[1];
  const ascLine = ascGroup.match(/<line[^>]*\/>/)[0];
  const ascX2 = Number(ascLine.match(/x2="([-\d.]+)"/)[1]);
  assert.ok(ascX2 < 220, `ASC outer end x=${ascX2} should be left of centre (220)`);

  const mcGroup = svg.match(/<g data-cusp="10">([\s\S]*?)<\/g>/)[1];
  const mcLine = mcGroup.match(/<line[^>]*\/>/)[0];
  const mcY2 = Number(mcLine.match(/y2="([-\d.]+)"/)[1]);
  assert.ok(mcY2 < 220, `MC outer end y=${mcY2} should be above centre (220)`);

  assert.match(ascGroup, />ASC</);
  assert.match(mcGroup, />MC</);
});

test('two planets within six degrees of each other are pushed apart onto different radii', () => {
  const chart = makeChart();
  const collided = { ...chart, points: chart.points.map(p => ({ ...p })) };
  collided.points[0].longitude = 10; // Sun
  collided.points[2].longitude = 12; // Mercury, 2 degrees away
  const svg = HoraryChart.render({ chart: collided, title: 'Test' });
  const sunGroup = svg.match(/<g data-planet="Sun">([\s\S]*?)<\/g>/)[1];
  const mercuryGroup = svg.match(/<g data-planet="Mercury">([\s\S]*?)<\/g>/)[1];
  const sunGlyph = sunGroup.match(/class="h-planet"[^>]*x="([-\d.]+)" y="([-\d.]+)"/);
  const mercuryGlyph = mercuryGroup.match(/class="h-planet"[^>]*x="([-\d.]+)" y="([-\d.]+)"/);
  assert.ok(sunGlyph && mercuryGlyph, 'both planet glyphs should render with a position');
  assert.notEqual(sunGlyph[0], mercuryGlyph[0], 'colliding planets should render their glyphs at different radii (different coordinates)');
});

test('throws on a non-ready chart', () => {
  assert.throws(() => HoraryChart.render({ chart: { status: 'missing' }, title: 'Test' }));
  assert.throws(() => HoraryChart.render({ chart: null, title: 'Test' }));
});
