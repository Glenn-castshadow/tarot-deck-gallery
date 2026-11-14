const test = require('node:test');
const assert = require('node:assert/strict');
const NatalEngine = require('../natal-engine.js');
const ClassicalEngine = require('../classical-engine.js');
const ChartDepthEngine = require('../chart-depth-engine.js');
const E = require('../time-lords-engine.js');
const View = require('../time-lords.js');

const NY = {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York'};
const dayChart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: NY});
const nightChart = NatalEngine.calculate({birthday: '1990-07-15', time: '23:30', location: NY});
const lon = (chart, name) => chart.points.find(p => p.name === name).longitude;
const close = (a, b) => assert.ok(Math.abs(NatalEngine.delta(a, b)) < 1e-9, `${a} is not ${b}`);
const DAY = 86400000;

test('the fixtures are one day chart and one night chart', () => {
  assert.equal(dayChart.status, 'ready');
  assert.equal(ClassicalEngine.sect(dayChart), 'day');
  assert.equal(ClassicalEngine.sect(nightChart), 'night');
});

test('the seven lots follow Paulus by day and reverse by night', () => {
  for (const chart of [dayChart, nightChart]) {
    const result = E.lots(chart), by = Object.fromEntries(result.lots.map(l => [l.name, l.longitude]));
    const asc = chart.angles.asc, p = name => lon(chart, name), day = result.sect === 'day', arc = (to, from) => day ? asc + to - from : asc + from - to;
    assert.deepEqual(result.lots.map(l => l.name), ['Fortune', 'Spirit', 'Eros', 'Necessity', 'Courage', 'Victory', 'Nemesis']);
    assert.deepEqual(result.lots.map(l => l.planet), ['Moon', 'Sun', 'Venus', 'Mercury', 'Mars', 'Jupiter', 'Saturn']);
    close(by.Fortune, arc(p('Moon'), p('Sun')));
    close(by.Spirit, arc(p('Sun'), p('Moon')));
    close(by.Eros, arc(p('Venus'), by.Spirit));
    close(by.Necessity, arc(by.Fortune, p('Mercury')));
    close(by.Courage, arc(by.Fortune, p('Mars')));
    close(by.Victory, arc(p('Jupiter'), by.Spirit));
    close(by.Nemesis, arc(by.Fortune, p('Saturn')));
    // Fortune agrees with the Part of Fortune the report already shows.
    close(by.Fortune, ChartDepthEngine.partOfFortune(chart).longitude);
    // Fortune and Spirit are mirror images across the Ascendant.
    close(by.Fortune - asc, asc - by.Spirit);
    for (const lot of result.lots) assert.ok(lot.house >= 1 && lot.house <= 12 && lot.sign && lot.degrees && lot.formula.startsWith('Ascendant + '));
  }
  assert.equal(E.lots(dayChart).lots[0].formula, 'Ascendant + Moon − Sun');
  assert.equal(E.lots(nightChart).lots[0].formula, 'Ascendant + Sun − Moon');
  assert.equal(E.lots(null).status, 'missing');
});

test('firdaria give seventy-five years in the day and night orders', () => {
  assert.deepEqual(E.firdarSequence('day'), ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'North Node', 'South Node']);
  assert.deepEqual(E.firdarSequence('night'), ['Moon', 'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'North Node', 'South Node']);
  assert.equal(Object.values(E.FIRDAR_YEARS).reduce((a, b) => a + b, 0), 75);
  const birth = new Date(dayChart.date);
  const result = E.firdaria(dayChart, new Date('2026-11-14T18:00:00Z'));
  assert.equal(+result.periods[0].start, +birth);
  assert.equal(result.periods.at(-1).toAge, 75);
  assert.equal(result.periods.at(-1).end.toISOString(), '2065-07-15T18:30:00.000Z', 'birthday to birthday');
  result.periods.forEach((p, i) => { if (i) assert.equal(+p.start, +result.periods[i - 1].end, 'periods abut'); });
  // Age 36: Sun 0-10, Venus 10-18, Mercury 18-31, Moon 31-40.
  assert.equal(result.current.lord, 'Moon');
  assert.deepEqual([result.current.fromAge, result.current.toAge], [31, 40]);
});

test('each planet’s firdar is cut into seven equal parts beginning with itself; the nodes are not cut', () => {
  const result = E.firdaria(dayChart, new Date('2026-11-14T18:00:00Z'));
  for (const p of result.periods) {
    if (p.lord.endsWith('Node')) { assert.equal(p.subs.length, 0); continue; }
    assert.equal(p.subs.length, 7);
    assert.equal(p.subs[0].lord, p.lord);
    assert.equal(new Set(p.subs.map(s => s.lord)).size, 7);
    assert.equal(+p.subs[0].start, +p.start);
    assert.ok(Math.abs(+p.subs[6].end - +p.end) < 2);
    const length = +p.subs[0].end - +p.subs[0].start;
    for (const s of p.subs) assert.ok(Math.abs((+s.end - +s.start) - length) < 2);
  }
  assert.deepEqual(result.periods[0].subs.map(s => s.lord), ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars']);
  // The Moon's nine years: Moon, Saturn, Jupiter, Mars, Sun... five and a third years in is the Sun's part.
  assert.equal(result.currentSub.lord, 'Sun');
});

test('after seventy-five years the firdaria begin again', () => {
  const result = E.firdaria(dayChart, new Date('2070-01-01T00:00:00Z'));
  assert.equal(result.cycle, 1);
  assert.equal(result.periods[0].fromAge, 75);
  assert.equal(result.current.lord, 'Sun');
  assert.equal(E.firdaria(dayChart, new Date('1980-01-01T00:00:00Z')).current, null, 'nothing is current before birth');
});

test('zodiacal releasing gives each sign its ruler’s count, in 360-day years', () => {
  assert.deepEqual(E.ZR_COUNT, [15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12]);
  assert.equal(E.ZR_COUNT.reduce((a, b) => a + b, 0), 211);
  const birth = new Date(dayChart.date);
  // Released from 2° Aquarius: Aquarius 30, Pisces 12, Aries 15, Taurus 8...
  const result = E.zodiacalReleasing(dayChart, 302, {now: new Date('2026-11-14T18:00:00Z')});
  assert.equal(result.startSign, 'Aquarius');
  assert.deepEqual(result.periods.slice(0, 4).map(p => p.sign), ['Aquarius', 'Pisces', 'Aries', 'Taurus']);
  assert.deepEqual(result.periods.slice(0, 4).map(p => p.lord), ['Saturn', 'Jupiter', 'Mars', 'Venus']);
  assert.equal(+result.periods[0].start, +birth);
  assert.equal(+result.periods[0].end - +birth, 30 * 360 * DAY);
  assert.equal(+result.periods[1].end - +result.periods[1].start, 12 * 360 * DAY);
  assert.ok(+result.periods.at(-1).end >= +birth + 110 * 365.25 * DAY, 'covers a long life');
  assert.equal(result.current.sign, 'Pisces');
  assert.throws(() => E.zodiacalReleasing(dayChart, NaN), RangeError);
});

test('the shorter periods start in the long period’s own sign, run in 30-day months and stop when it ends', () => {
  const result = E.zodiacalReleasing(dayChart, 302);
  for (const period of result.periods) {
    assert.equal(period.subs[0].signIndex, period.signIndex);
    assert.equal(+period.subs[0].start, +period.start);
    assert.equal(+period.subs.at(-1).end, +period.end, 'the last one is cut off with its parent');
    period.subs.forEach((s, i) => {
      if (i) assert.equal(+s.start, +period.subs[i - 1].end);
      if (i < period.subs.length - 1) assert.equal(+s.end - +s.start, E.ZR_COUNT[s.signIndex] * 30 * DAY);
    });
  }
});

test('the loosing of the bond: after a full circuit the run jumps to the opposite sign, once', () => {
  const result = E.zodiacalReleasing(dayChart, 302);
  const aquarius = result.periods[0];   // 30 years = 360 months, longer than the 211 of one circuit
  assert.deepEqual(aquarius.subs.slice(0, 12).map(s => s.sign), ['Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn']);
  assert.equal(+aquarius.subs[12].start - +aquarius.start, 211 * 30 * DAY);
  assert.equal(aquarius.subs[12].sign, 'Leo', 'opposite Aquarius, not Aquarius again');
  assert.equal(aquarius.subs[12].loosing, true);
  assert.equal(aquarius.subs[13].sign, 'Virgo');
  assert.equal(aquarius.subs.filter(s => s.loosing).length, 1);
  // Pisces is 12 years = 144 months: never reaches a full circuit, so no loosing.
  assert.equal(result.periods[1].subs.some(s => s.loosing), false);
  const counts = {Aries: 15, Taurus: 8, Gemini: 20, Cancer: 25, Leo: 19, Virgo: 20, Libra: 8, Scorpio: 15, Sagittarius: 12, Capricorn: 27, Aquarius: 30, Pisces: 12};
  for (const p of result.periods) assert.equal(p.subs.some(s => s.loosing), counts[p.sign] * 12 > 211, p.sign);
});

test('peaks are the first, fourth, seventh and tenth signs from the Lot of Fortune, unranked', () => {
  const leo = 4;   // Fortune in Leo
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(sign => E.peakOf(sign, leo)), [1, 4, 7, 10], 'Taurus, Leo, Scorpio, Aquarius');
  assert.equal(E.peakOf(5, null), false);
  const result = E.zodiacalReleasing(dayChart, 302, {fortuneLongitude: 131});
  assert.equal(result.periods.find(p => p.sign === 'Taurus').peak, true);
  assert.equal(result.periods.find(p => p.sign === 'Pisces').peak, false);
});

test('when Spirit and Fortune share a sign, Spirit is released from the next one', () => {
  assert.deepEqual(E.releasingStarts(131, 302), {fortune: 4, spirit: 10, moved: false});
  assert.deepEqual(E.releasingStarts(131, 140), {fortune: 4, spirit: 5, moved: true});
  assert.deepEqual(E.releasingStarts(345, 359), {fortune: 11, spirit: 0, moved: true}, 'Pisces wraps to Aries');
  // A chart built so the Sun and Moon are conjunct: both lots then fall on the Ascendant.
  const chart = {...dayChart, points: dayChart.points.map(p => p.name === 'Moon' ? {...p, longitude: lon(dayChart, 'Sun')} : p)};
  const html = View.render(chart, {now: new Date('2026-11-14T18:00:00Z')});
  assert.match(html, /Spirit and Fortune share Scorpio in this chart, so Spirit is released from the next sign, Sagittarius\./);
});

test('published dates: Al Gore’s loosing of the bond, 10 March 1992 to 30 March 1994', () => {
  // Brennan (Astrology Podcast ep. 192) gives Spirit in Scorpio, a Capricorn period from 1974 to
  // spring 2001, and these two dates. The birth date, 31 March 1948, is not from that source.
  const chart = {status: 'ready', date: '1948-03-31T12:00:00Z'};
  const result = E.zodiacalReleasing(chart, 7 * 30 + 15);
  assert.deepEqual(result.periods.slice(0, 3).map(p => p.sign), ['Scorpio', 'Sagittarius', 'Capricorn']);
  const capricorn = result.periods[2], loosing = capricorn.subs.find(s => s.loosing);
  assert.equal(capricorn.start.toISOString().slice(0, 10), '1974-11-10');
  assert.equal(capricorn.end.toISOString().slice(0, 7), '2001-06', 'spring of 2001');
  assert.equal(loosing.sign, 'Cancer');
  assert.equal(loosing.start.toISOString().slice(0, 10), '1992-03-10');
  assert.equal(loosing.end.toISOString().slice(0, 10), '1994-03-30');
});

test('the view names the present period in all three techniques and marks it in the lists', () => {
  const html = View.render(dayChart, {now: new Date('2026-11-14T18:00:00Z')});
  assert.match(html, /class="time-lords"/);
  assert.equal((html.match(/<tr>/g) || []).length, 8, 'a header row and seven lots');
  assert.match(html, /The firdar of <span aria-hidden="true">☽<\/span> Moon, ages 31 to 40/);
  assert.match(html, /From the Lot of Spirit, in Aquarius/);
  assert.match(html, /From the Lot of Fortune, in Leo/);
  assert.match(html, /loosing of the bond/);
  assert.doesNotMatch(html, /<\/em>\.<\/p>/, 'no full stop trails a label');
  assert.ok((html.match(/aria-current="true"/g) || []).length >= 6, 'firdar and sub-period, and both levels of both releasings');
  assert.match(html, /This is a day chart/);
  assert.match(View.render(nightChart, {now: new Date('2026-11-14T18:00:00Z')}), /This is a night chart/);
  assert.equal(View.render(null), '');
  assert.equal(View.render({status: 'missing'}), '');
});

test('the traditional techniques section carries the time lords inside it when they are loaded', () => {
  const ChartDepth = require('../chart-depth.js');
  assert.doesNotMatch(ChartDepth.render(dayChart), /time-lords/);
  globalThis.TimeLords = View;
  try {
    const html = ChartDepth.render(dayChart);
    assert.match(html, /class="time-lords"/);
    assert.ok(html.indexOf('class="time-lords"') > html.indexOf('class="chart-depth"') && html.trimEnd().endsWith('</section></section>'), 'nested, so the report’s own re-render keeps it');
  } finally { delete globalThis.TimeLords; }
});
