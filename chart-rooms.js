/* Shared saving contract for the chart rooms on /charts/ and /eastern/: the payload shape
   and its validation, a chart computed from a saved birth, the journal summaries, the
   save control and restored banner markup, and the gate that keeps a reopened chart on
   screen while the live profile changes. Spec: docs/superpowers/specs/2026-09-16-chart-saving-design.md */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./natal-engine.js'));
  else root.ChartRooms = factory(NatalEngine);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (natal) {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  const HOUSE_SYSTEMS = ['placidus', 'whole-sign', 'equal', 'regiomontanus'];
  const METHODS = ['secondary', 'tertiary', 'solar-arc'];
  const JYOTISH_TABS = ['rashi', 'nakshatras', 'dashas', 'navamsa', 'gochar'];
  const KINDS = ['natal', 'solar-return', 'lunar-return', 'progressed', 'synastry', 'composite', 'davison', 'horary', 'jyotish', 'bazi'];
  const NOTES = {
    one: 'Saving stores the birth details this chart was cast from.',
    two: 'Saving stores both people’s birth details.',
    horary: 'Saving stores the moment, the place and your question.'
  };

  const clip = (value, max) => String(value ?? '').slice(0, max);
  const isDate = value => typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
  const isTime = value => typeof value === 'string' && TIME.test(value);

  function place(value) {
    if (!value || typeof value !== 'object') return null;
    const lat = Number(value.lat), lon = Number(value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (typeof value.tz !== 'string' || !value.tz.trim() || value.tz.length > 64) return null;
    return {name: clip(typeof value.name === 'string' ? value.name : '', 120), lat, lon, tz: value.tz};
  }
  function birth(value) {
    if (!value || typeof value !== 'object') return null;
    const where = place(value.place);
    if (!isDate(value.date) || !isTime(value.time) || !where) return null;
    if (!HOUSE_SYSTEMS.includes(value.houseSystem) || !['', 'earlier', 'later'].includes(value.fold)) return null;
    const orbScale = Number(value.orbScale);
    if (![0.75, 1, 1.25].includes(orbScale)) return null;
    return {date: value.date, time: value.time, place: where, houseSystem: value.houseSystem, fold: value.fold, orbScale};
  }
  const integer = (value, min, max) => { const n = Number(value); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

  // A sanitised payload for the kind, or null. Fields the table does not name are dropped.
  function validate(kind, payload) {
    if (!KINDS.includes(kind) || !payload || typeof payload !== 'object' || payload.v !== 1) return null;
    if (kind === 'horary') {
      const moment = payload.moment && typeof payload.moment === 'object' ? payload.moment : null;
      const where = moment && place(moment.place), house = integer(payload.house, 1, 12);
      if (!moment || !isDate(moment.date) || !isTime(moment.time) || !where || house === null) return null;
      return {v: 1, moment: {date: moment.date, time: moment.time, place: where}, house};
    }
    const own = birth(payload.birth);
    if (!own) return null;
    const out = {v: 1, birth: own};
    if (kind === 'solar-return' || kind === 'lunar-return') {
      const offset = integer(payload.offset, -1000, 1000);
      if (!isDate(payload.target) || offset === null) return null;
      const override = payload.place === null || payload.place === undefined ? null : place(payload.place);
      if (payload.place && !override) return null;
      return {...out, target: payload.target, offset, place: override};
    }
    if (kind === 'progressed') {
      if (!isDate(payload.target) || !METHODS.includes(payload.method)) return null;
      return {...out, target: payload.target, method: payload.method};
    }
    if (kind === 'synastry' || kind === 'composite' || kind === 'davison') {
      const partner = birth(payload.partner);
      return partner ? {...out, partner} : null;
    }
    if (kind === 'jyotish') {
      if (!JYOTISH_TABS.includes(payload.tab) || !isDate(payload.gochar)) return null;
      const gocharYear = Number(payload.gochar.slice(0, 4));
      if (gocharYear < 1901 || gocharYear > 2100) return null;
      return {...out, tab: payload.tab, gochar: payload.gochar};
    }
    if (kind === 'bazi') {
      const pillar = integer(payload.pillar, 0, 3);
      return pillar === null ? null : {...out, pillar};
    }
    return out;
  }

  const placeFrom = location => ({name: location.label || '', lat: location.latitude, lon: location.longitude, tz: location.timeZone});
  const locationFrom = where => ({latitude: where.lat, longitude: where.lon, timeZone: where.tz, label: where.name});
  function birthFromChart(chart) {
    if (!chart || chart.status !== 'ready' || !chart.location) return null;
    return {date: chart.birthday, time: chart.time, place: placeFrom(chart.location), houseSystem: chart.houseSystem, fold: chart.fold || '', orbScale: chart.orbScale};
  }
  const natalFrom = value => natal.calculate({birthday: value.date, time: value.time, location: locationFrom(value.place), houseSystem: value.houseSystem, fold: value.fold, orbScale: value.orbScale});

  const reading = (kind, {payload, summary = '', layout = '', question = ''}) =>
    ({kind, deck: '', layout: clip(layout, 40), question: clip(question, 240), focus: '', summary: clip(summary, 120), payload});

  // Fixed tables, not toLocaleDateString: newer ICU spells September "Sept" in en-GB.
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const longDate = date => { const d = new Date(date + 'T00:00:00Z'); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const shortDate = value => { const d = new Date(value); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`; };
  const whereText = where => where.name || `${where.lat}, ${where.lon}`;
  const describe = value => `${longDate(value.date)} at ${value.time}, ${whereText(value.place)}`;
  const describeMoment = describe;

  const summaries = {
    natal: chart => `Sun ${chart.points[0].sign} · Moon ${chart.points[1].sign} · Ascendant ${chart.axes[0].sign}`,
    solarReturn: model => `Solar return ${new Date(model.moment).getUTCFullYear()} · Ascendant ${model.chart.axes[0].sign}`,
    lunarReturn: model => `Lunar return ${shortDate(model.moment)} · Ascendant ${model.chart.axes[0].sign}`,
    progressed: ({target, method}) => `Progressed to ${target.slice(0, 4)} · ${method}`,
    horary: ({result, house, date}) => `House ${house} · Ascendant ${result.chart.axes[0].sign} · ${shortDate(date + 'T00:00:00Z')}`,
    twoPerson: (kind, birth, partner) => `${{synastry: 'Synastry', composite: 'Composite', davison: 'Davison'}[kind]} · ${shortDate(birth.date + 'T00:00:00Z')} · ${shortDate(partner.date + 'T00:00:00Z')}`,
    bazi: model => { const p = model.pillars[2]; return `Day pillar ${p.characters} · ${p.stem[1]} ${p.branch[1]}`; },
    jyotish: model => `Lagna ${model.lagna.sign} · Moon in ${model.grahas.find(g => g.name === 'Moon').nakshatra.name}`
  };

  const saveLabel = () => typeof IshtarAccount !== 'undefined' && IshtarAccount.state().signedIn ? 'Save this chart to my journal' : 'Sign in to save this chart';
  const saveControl = (kind, note) => `<p class="save-reading"><button type="button" data-save-reading="${kind}">${saveLabel()}</button><span role="status" aria-live="polite"></span><span class="save-note">${esc(note)}</span></p>`;
  const banner = (text, {live} = {}) => `<p class="restored-chart" role="status">${esc(text)}${live ? ` <button type="button" data-chart-live="${live}">Use my chart</button>` : ''}</p>`;

  // saveControl bakes the label in at render time; a sign-in/out elsewhere on the page
  // leaves already-rendered save buttons stale until the next re-render. Relabel them in
  // place on the account-change event the other rooms already listen for.
  if (typeof document !== 'undefined') {
    document.addEventListener('ishtar-account-change', () => {
      document.querySelectorAll('.save-reading .save-note').forEach(note => {
        const button = note.closest('.save-reading')?.querySelector('[data-save-reading]');
        if (button) button.textContent = saveLabel();
      });
    });
  }

  // While a reopened chart is on screen, profile pushes leave it alone; "Use my chart" clears it.
  function restoredGate() {
    let value = null;
    return {set(next) { value = next; }, clear() { value = null; }, get: () => value, active: () => value !== null};
  }

  return {KINDS, NOTES, validate, birthFromChart, placeFrom, locationFrom, natalFrom, reading, describe, describeMoment, summaries, saveControl, banner, restoredGate};
});
