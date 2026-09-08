const test = require('node:test');
const assert = require('node:assert/strict');
const insights = require('../birthday-insights.js');
const profile = date => insights.chineseProfile(insights.parseDate(date));

test('civil dates reject overflow and accept actual leap days without a local time-zone shift', () => {
  for (const value of ['', '2024-2-10', '2023-02-29', '2024-04-31', '0000-01-01', '2024-13-01']) {
    assert.equal(insights.parseDate(value), null, value);
  }
  assert.equal(insights.parseDate('2024-02-29').date.toISOString(), '2024-02-29T12:00:00.000Z');
  assert.equal(insights.parseDate('0099-01-01').year, 99);
});

// Published Hong Kong Observatory calendar boundaries, not January 1 or Li Chun.
test('2024 Lunar New Year changes Yin Water Rabbit to Yang Wood Dragon on February 10', () => {
  const before = profile('2024-02-09');
  const after = profile('2024-02-10');
  assert.deepEqual([before.year, before.animal.name, before.phase.name, before.polarity, before.beforeNewYear], [2023, 'Rabbit', 'Water', 'Yin', true]);
  assert.deepEqual([after.year, after.animal.name, after.phase.name, after.polarity, after.day, after.position], [2024, 'Dragon', 'Wood', 'Yang', 1, 41]);
  assert.equal(after.beforeNewYear, false);
  assert.deepEqual(after.stem, ['甲', 'Jia']);
  assert.deepEqual(after.branch, ['辰', 'Chen']);
  assert.equal(profile('2024-02-04').animal.name, 'Rabbit');
});

test('2020 January boundary changes Earth Pig to Metal Rat', () => {
  assert.deepEqual([profile('2020-01-24').animal.name, profile('2020-01-24').phase.name], ['Pig', 'Earth']);
  const rat = profile('2020-01-25');
  assert.deepEqual([rat.animal.name, rat.phase.name, rat.polarity, rat.day], ['Rat', 'Metal', 'Yang', 1]);
});

test('pre-1984 dates wrap the sexagenary cycle and leap lunar months stay labelled', () => {
  const dragon = profile('1940-02-08');
  assert.deepEqual([dragon.animal.name, dragon.phase.name, dragon.position], ['Dragon', 'Metal', 17]);
  assert.match(profile('2023-03-22').month, /leap/i);
  assert.equal(profile('2023-03-22').day, 1);
});

test('unsupported calendar/date inputs fail gracefully rather than inventing a zodiac', () => {
  assert.equal(profile('1900-06-01'), null);
  assert.equal(profile('2101-01-01'), null);
  assert.equal(insights.chineseProfile(null), null);
  const date = insights.parseDate('2024-02-10');
  assert.equal(insights.chineseProfile(date, null), null);
  assert.equal(insights.chineseProfile(date, {formatToParts: () => [{type:'year', value:'2024'}]}), null);
  assert.equal(insights.chineseProfile(date, {formatToParts: () => { throw Error('Unavailable'); }}), null);
  assert.match(insights.renderChinese(null, ''), /unavailable/);
});

test('birth-hour association changes on odd hours and wraps midnight', () => {
  for (const time of ['23:00', '23:59', '00:00', '00:59']) {
    assert.equal(insights.birthHour(time).animal, 'Rat', time);
    assert.equal(insights.birthHour(time).range, '23:00–01:00');
  }
  assert.equal(insights.birthHour('01:00').animal, 'Ox');
  assert.equal(insights.birthHour('14:30').animal, 'Goat');
  assert.equal(insights.birthHour('22:59').animal, 'Pig');
  for (const time of ['', '24:00', '12:60', '1:30', 'not a time']) assert.equal(insights.birthHour(time), null);
});

test('Gregorian digits retain zero counts and reduce repeated sums to one digit', () => {
  const study = insights.numberStudy(insights.parseDate('1988-11-05'));
  assert.equal(study.dateDigits, '19881105');
  assert.deepEqual(study.counts, [1,3,0,0,0,1,0,0,2,1]);
  assert.deepEqual(study.steps, [33,6]);
  assert.equal(study.root, 6);
  assert.deepEqual(study.repeated, [1,8]);
  assert.deepEqual(study.absent, [2,3,4,6,7]);
  const zeroHeavy = insights.numberStudy(insights.parseDate('2000-02-05'));
  assert.equal(zeroHeavy.counts[0], 5);
  assert.equal(zeroHeavy.counts[2], 2);
  assert.equal(zeroHeavy.root, 9);
  assert.equal(insights.numberStudy(insights.parseDate('2000-02-07')).root, 2); // 11 reduces too.
});

test('Lo Shu uses each digit once and every row, column and main diagonal totals 15', () => {
  const grid = insights.square;
  assert.deepEqual([...grid].sort(), [1,2,3,4,5,6,7,8,9]);
  for (const cells of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
    assert.equal(cells.reduce((sum,index) => sum+grid[index], 0), 15);
  }
});

test('a selected number uses the current date count, and absent digits are not character defects', () => {
  const study = insights.numberStudy(insights.parseDate('1988-11-05'));
  assert.match(insights.numberDetail(study, 8), /2 occurrences/);
  assert.match(insights.numberDetail(study, 4), /does not occur/);
  assert.match(insights.numberDetail(study, 4), /does not predict misfortune/);
  assert.equal(insights.numberDetail(study, 0), '');
});
