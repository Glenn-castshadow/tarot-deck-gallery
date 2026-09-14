/* The chart-depth section under the natal report: this year's profection, the Part of Fortune
   and aspect patterns. Pure: returns an HTML string and touches no DOM, so its copy is tested
   under Node. The engine does the arithmetic; conventions are in docs/NATAL-CHART.md. */
const ChartDepth = (() => {
  const engine = typeof ChartDepthEngine !== 'undefined' ? ChartDepthEngine : require('./chart-depth-engine.js');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ordinal = n => `${n}${['st', 'nd', 'rd'][n - 1] || 'th'}`;
  const definitions = {
    Stellium: 'Three or more of the ten planets share one sign.',
    'Grand trine': 'Three planets, each a trine from the other two.',
    'T-square': 'Two planets in opposition, both square a third planet at the apex.',
    'Grand cross': 'Four planets joined by two oppositions and four squares.',
    Yod: 'Two planets in sextile, both quincunx a third planet at the apex.'
  };

  function profectionPart(chart, year, currentYear) {
    const [birthYear, month, day] = String(chart.birthday).split('-').map(Number);
    const last = Math.max(birthYear, currentYear) + 10;
    const options = Array.from({length: last - birthYear + 1}, (_, i) => birthYear + i)
      .map(y => `<option value="${esc(y)}"${y === year ? ' selected' : ''}>${esc(y)}</option>`).join('');
    let result = '';
    try {
      const p = engine.profection(chart, new Date(year, month - 1, day));
      if (p.status === 'ready') {
        const lord = chart.points.find(point => point.name === p.lord);
        const houses = chart.houseSystem === 'whole-sign'
          ? 'Your chart also uses Whole Sign houses, so this numbering matches the chart’s own houses.'
          : 'Profections count whole signs from the Ascendant, whatever house system the chart displays, so this house number can differ from the chart’s own houses.';
        result = `<p class="natal-panel-hint">From your ${esc(year)} birthday to your ${esc(year + 1)} birthday · age ${esc(p.age)}</p>
          <dl><div><dt>Profected house</dt><dd>${esc(ordinal(p.house))} house</dd></div><div><dt>Sign</dt><dd>${esc(p.sign)}</dd></div><div><dt>Time lord</dt><dd>${esc(p.lord)}</dd></div></dl>
          <p>${esc(p.lord)} rules ${esc(p.sign)}, so it is the time lord of this year.${lord ? ` In your chart ${esc(p.lord)} is in ${esc(lord.sign)}, in house ${esc(lord.house)} of the chart’s own houses — a place to return to as you reflect on the year.` : ''}</p>
          <p>A profection year gives one house’s themes, and the planet that rules its sign, a year of attention. It is a lens for reflection, not a forecast of events.</p>
          <p class="natal-panel-hint">${esc(houses)}</p>`;
      }
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
    return `<article class="chart-depth-part"><h5>The year’s profection</h5><label class="natal-aspect-filter">Year <select data-profection-year>${options}</select></label>${result}</article>`;
  }

  function fortunePart(chart) {
    const lot = engine.partOfFortune(chart);
    if (lot.status !== 'ready') return '';
    return `<article class="chart-depth-part"><h5>The Part of Fortune</h5>
      <dl><div><dt>Sign</dt><dd>${esc(lot.sign)}</dd></div><div><dt>Degree</dt><dd>${esc(lot.degrees)}</dd></div><div><dt>House</dt><dd>${esc(lot.house)}</dd></div></dl>
      <p class="natal-panel-hint">The house is counted in the chart’s own houses.</p>
      <p>Traditionally the Lot of Fortune is read for the body, circumstance and material life — a place to notice what you have to work with.</p>
      <p class="natal-panel-hint">Calculated as ${esc(lot.formula)}.</p></article>`;
  }

  function patternsPart(chart) {
    const found = engine.patterns([...chart.aspects, ...(chart.minorAspects || [])], chart.points);
    const body = found.length
      ? `<ul class="chart-depth-patterns">${found.map(p => `<li><strong>${esc(p.type)}</strong><span>${p.members.map(esc).join(' · ')}</span>${p.apex ? `<small>Apex: ${esc(p.apex)}</small>` : ''}<small>${esc(definitions[p.type] || '')}</small></li>`).join('')}</ul>`
      : '<p>No stellium, grand trine, T-square, grand cross or yod among the ten planets in this chart.</p>';
    return `<article class="chart-depth-part"><h5>Aspect patterns</h5>${body}</article>`;
  }

  // The year whose birthday began the profection in effect today; the birth year for a future birth.
  function yearInEffect(chart) {
    const birthYear = Number(String(chart.birthday).split('-')[0]);
    try {
      return birthYear + engine.profection(chart, new Date()).age;
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return birthYear;
    }
  }

  function render(chart, {year, currentYear = new Date().getFullYear()} = {}) {
    if (!chart || chart.status !== 'ready') return '';
    if (!Number.isFinite(year)) year = yearInEffect(chart);
    return `<section class="chart-depth" aria-labelledby="chart-depth-title"><header><p class="reading-label">Traditional techniques</p><h4 id="chart-depth-title">The year, the Lot and the patterns</h4></header>
      <div class="chart-depth-grid">${profectionPart(chart, year, currentYear)}${fortunePart(chart)}${patternsPart(chart)}</div>
      <details class="insight-method"><summary>About these techniques</summary>
        <p>Profections count whole signs from the Ascendant: the first year of life is given to the rising sign, the next year to the sign after it, one sign a year, returning to the rising sign every twelve years. Each profection year runs from one birthday to the next, and its time lord is the traditional ruler of the profected sign.</p>
        <p>The Part of Fortune is sect-sensitive. A chart counts as a day chart when the Sun is above the horizon, and the Lot is then Ascendant + Moon − Sun; for a night chart it is Ascendant + Sun − Moon. Many modern programs use the day formula for every chart.</p>
        <p>Patterns are read from the ten planets’ major and minor aspects together — a yod needs quincunxes — so this list does not change with the minor-aspect setting in the Aspects panel. Minor aspects use a fixed 2° orb. The lunar nodes and chart angles are not counted.</p>
        <p>Profections and the day and night reversal of the Lot of Fortune follow the Hellenistic tradition as Vettius Valens set it out in his <cite>Anthology</cite> (2nd century CE); the names of the aspect patterns — T-square, grand cross, yod and the rest — are modern.</p>
        <p>Sources: <a href="docs/NATAL-CHART.md" target="_blank" rel="noopener">methods &amp; validation</a></p>
      </details></section>`;
  }

  return {render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartDepth;
