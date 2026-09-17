const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../daily-horoscope-engine.js');
const natal = require('../natal-engine.js');
const vm = require('node:vm');
const fs = require('node:fs');

test('all twelve signs have complete, distinct readings with wrapped solar houses', () => {
  const readings = engine.signNames.map((_,i)=>engine.calculate(i,'2026-09-12'));
  assert.equal(new Set(readings.map(r=>r.title)).size,12);
  for (const [i,r] of readings.entries()) {
    assert.equal(r.sign,engine.signNames[i]);
    assert.equal(r.lenses.length,3);
    assert.ok(r.overview && r.action && r.question && r.phasePrompt);
    assert.ok(r.lenses.every(l=>l.text));
    assert.ok(r.points.every(p=>p.solarHouse>=1 && p.solarHouse<=12));
    const next=readings[(i+1)%12];
    r.points.forEach((p,j)=>assert.equal(next.points[j].solarHouse,(p.solarHouse+10)%12+1));
  }
});

test('daily sky agrees with the existing natal ephemeris at the declared snapshot', () => {
  const r=engine.calculate(5,'2026-09-12');
  const chart=natal.chartAtInstant(new Date(r.instant),{latitude:0,longitude:0,timeZone:'UTC'});
  for (const p of r.points) assert.ok(Math.abs(p.longitude-chart.points.find(c=>c.name===p.name).longitude)<1e-9);
  assert.equal(r.illumination,Math.round(chart.moonIllumination*100));
  assert.equal(r.phaseAngle,chart.moonPhase);
});

test('readings remain stable on the same date and refresh on the next date', () => {
  const today=engine.calculate(0,'2026-12-31');
  assert.deepEqual(engine.calculate(0,'2026-12-31'),today);
  const tomorrow=engine.calculate(0,'2027-01-01');
  assert.notEqual(today.question,tomorrow.question);
  assert.notEqual(today.points[1].longitude,tomorrow.points[1].longitude);
  assert.equal(tomorrow.instant,'2027-01-01T12:00:00.000Z');
});

test('calendar validation covers leap days, invalid dates and supported boundaries', () => {
  for(const day of ['2024-02-29','1901-01-01','2100-12-31']) assert.equal(engine.calculate(0,day).day,day);
  for(const day of ['2026-02-29','2026-04-31','bad','2026-13-01','1900-12-31','2101-01-01']) assert.throws(()=>engine.calculate(0,day),RangeError);
  for(const sign of [-1,12,1.5,'Aries',null,NaN]) assert.throws(()=>engine.calculate(sign,'2026-09-12'),RangeError);
});

test('date key uses the device calendar rather than its UTC date', () => {
  const before=new Date(2026,8,12,23,59,59);
  const after=new Date(2026,8,13,0,0,0);
  assert.equal(engine.localDateKey(before),'2026-09-12');
  assert.equal(engine.localDateKey(after),'2026-09-13');
  assert.throws(()=>engine.localDateKey(new Date('bad')),RangeError);
});

test('callers cannot mutate the cached sky through a returned reading', () => {
  const r=engine.calculate(0,'2026-09-12');
  const longitude=r.points[0].longitude;
  r.points[0].longitude=999;
  assert.equal(engine.calculate(0,'2026-09-12').points[0].longitude,longitude);
});

test('open-page rollover, hidden-tab resume and profile clearing update the displayed reading', () => {
  let clock = new Date(2026,8,12,23,59,59).getTime(), scheduled;
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
  const nodes = new Map();
  const root = {innerHTML:'', querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector,{innerHTML:'',textContent:'',hidden:false,value:'',listeners:{},addEventListener(name,callback){this.listeners[name]=callback;}});
    return nodes.get(selector);
  }};
  const document = {hidden:false,listeners:{},addEventListener(name,callback){this.listeners[name]=callback;}};
  const context=vm.createContext({Date:ClockDate,Intl,document,window:{addEventListener(){}},clearTimeout(){},setTimeout(callback,delay){scheduled={callback,delay};return 1;},DailyHoroscopeEngine:{...engine,localDateKey:()=>engine.localDateKey(new Date(clock)),calculate:sign=>engine.calculate(sign,engine.localDateKey(new Date(clock)))}});
  vm.runInContext(fs.readFileSync(require.resolve('../daily-horoscope.js'),'utf8')+'\nthis.attachHoroscope = DailyHoroscope.attach;',context);
  const ui=context.attachHoroscope(root), output=nodes.get('[data-dh-reading]');
  assert.match(output.innerHTML,/2026-09-12/);
  assert.ok(scheduled.delay<=1100);
  clock+=2000; scheduled.callback();
  assert.match(output.innerHTML,/2026-09-13/);
  document.hidden=true; clock+=86400000; scheduled.callback();
  assert.match(output.innerHTML,/2026-09-13/);
  document.hidden=false; document.listeners.visibilitychange();
  assert.match(output.innerHTML,/2026-09-14/);
  ui.setProfileSign(3);
  assert.match(output.innerHTML,/Today · Cancer/);
  ui.setProfileSign(null);
  assert.match(output.innerHTML,/Today · Aries/);
  assert.equal(nodes.get('[data-dh-profile]').hidden,true);
});

function mount({fetch, setTimeout = () => 1, clock = new Date(2026, 8, 17, 12, 0, 0).getTime()} = {}) {
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
  const nodes = new Map();
  const root = {innerHTML: '', querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {innerHTML: '', textContent: '', hidden: false, value: '', listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }});
    return nodes.get(selector);
  }};
  const document = {hidden: false, listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }};
  const context = vm.createContext({Date: ClockDate, Intl, document, window: {addEventListener() {}}, clearTimeout() {}, setTimeout, AbortController, fetch,
    DailyHoroscopeEngine: {...engine, localDateKey: () => engine.localDateKey(new Date(clock)), calculate: sign => engine.calculate(sign, engine.localDateKey(new Date(clock)))}});
  vm.runInContext(fs.readFileSync(require.resolve('../daily-horoscope.js'), 'utf8') + '\nthis.attachHoroscope = DailyHoroscope.attach;', context);
  const ui = context.attachHoroscope(root);
  return {ui, output: nodes.get('[data-dh-reading]'), select: nodes.get('select')};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a model-written paragraph replaces the lens cards and keeps the phase line and question', async () => {
  const day = '2026-09-17';
  const paragraph = 'Discipline sits easily today. The Moon in your travel-and-belief sector trines Saturn in your sign.';
  let requested;
  const page = mount({fetch: async url => { requested = url; return {ok: true, json: async () => ({day, signs: {aries: paragraph}})}; }});
  assert.equal(page.output.innerHTML, '', 'drew before the fetch settled');
  await settle();
  assert.equal(requested, `/sky/daily/${day}.json`);
  assert.ok(page.output.innerHTML.includes(`<p class="dh-prose">${paragraph}</p>`));
  assert.ok(!page.output.innerHTML.includes('dh-lenses') && !page.output.innerHTML.includes('dh-action'));
  assert.match(page.output.innerHTML, /dh-moon/);
  assert.match(page.output.innerHTML, /<blockquote>/);
  page.select.value = '3'; page.select.listeners.change();          // Cancer has no paragraph: template, synchronously
  assert.match(page.output.innerHTML, /Today · Cancer/);
  assert.match(page.output.innerHTML, /dh-lenses/);
  assert.ok(!page.output.innerHTML.includes('dh-prose'));
});

test('no file, a timeout, or no fetch at all render the template reading byte for byte', async () => {
  const none = mount({fetch: undefined});
  assert.match(none.output.innerHTML, /dh-lenses/, 'no fetch: must draw synchronously');
  const missing = mount({fetch: async () => ({ok: false, status: 404, json: async () => { throw new Error('no body'); }})});
  const broken = mount({fetch: async () => ({ok: true, json: async () => ({day: '2026-09-17', signs: {aries: 7}})})});
  const slow = mount({
    fetch: (url, {signal}) => signal.aborted ? Promise.reject(new Error('aborted')) : new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    setTimeout: callback => { callback(); return 1; }                 // the two-second abort fires at once
  });
  await settle();
  assert.equal(missing.output.innerHTML, none.output.innerHTML);
  assert.equal(broken.output.innerHTML, none.output.innerHTML);
  assert.equal(slow.output.innerHTML, none.output.innerHTML);
});

test('the disclosure says when the paragraph is model-written and what happens when it is not', () => {
  const source = fs.readFileSync(require.resolve('../daily-horoscope.js'), 'utf8');
  assert.match(source, /language model running on our own hardware/);
  assert.match(source, /shorter template reading appears instead/);
});
