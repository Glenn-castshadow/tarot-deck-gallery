const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const N = require('../natal-engine.js');
const reference = require('./fixtures/natal-reference.json');

// natal-chart.js is browser-only (a top-level const reading the NatalEngine global).
const NatalChart = vm.runInNewContext(`${fs.readFileSync(path.join(__dirname, '..', 'natal-chart.js'), 'utf8')}\nNatalChart`, {NatalEngine: N});
const charts = reference.cases.map(c => N.calculate(c.input)).filter(c => c.status === 'ready');

test('the keepsake edition prints five pages for every reference chart, in both palettes', () => {
  assert.ok(charts.length > 3);
  for (const model of charts) {
    for (const palette of ['ivory', 'midnight']) {
      for (const showMinor of [false, true]) {
        const html = NatalChart.keepsake(model, {place: 'Portland, Oregon', palette, showMinor});
        assert.equal(html.match(/class="nk-page/g).length, 5, `${model.birthday}: page count`);
        assert.doesNotMatch(html, /undefined|NaN/, `${model.birthday}: leaked value`);
        assert.equal(/class="natal-wheel ivory"/.test(html), palette === 'ivory', `${model.birthday}: ${palette} wheel`);
        // Every listed aspect appears once in the list; the grid holds one cell per pair.
        const listed = showMinor ? model.aspects.length + model.minorAspects.length : model.aspects.length;
        assert.equal((html.match(/<li class="/g) || []).length, listed, `${model.birthday}: aspect list`);
        assert.equal((html.match(/<td class="/g) || []).length, listed, `${model.birthday}: aspect grid`);
      }
    }
  }
});

test('the birthplace is escaped and the title names the birth date', () => {
  const html = NatalChart.keepsake(charts[0], {place: '<img src=x onerror=alert(1)>'});
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x/);
  assert.match(NatalChart.keepsakeTitle(charts[0]), /^Natal chart · .*2000.* · Ishtar Insights$/);
});

test('the keepsake panel offers print, the two palettes and the SVG download', () => {
  const html = NatalChart.keepsakePanel(charts[0], 'midnight');
  assert.match(html, /data-print-natal/);
  assert.match(html, /data-natal-download/);
  assert.match(html, /data-keepsake-palette="ivory" aria-pressed="false"/);
  assert.match(html, /data-keepsake-palette="midnight" aria-pressed="true"/);
  assert.doesNotMatch(html, /natal-wheel ivory/);
});
