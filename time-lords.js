/* The lots, firdaria and zodiacal releasing under the natal report's traditional techniques.
   Pure: returns an HTML string and touches no DOM, so its copy is tested under Node. The engine
   does the arithmetic; conventions and sources are in docs/NATAL-CHART.md. */
const TimeLords = (() => {
  const engine = typeof TimeLordsEngine !== 'undefined' ? TimeLordsEngine : require('./time-lords-engine.js');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const GLYPH = {Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', 'North Node': '☊', 'South Node': '☋'};
  const day = date => new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'short', day: 'numeric'}).format(date);
  const span = p => `${day(p.start)} to ${day(p.end)}`;
  const here = (p, current) => p === current ? ' aria-current="true"' : '';
  const glyph = name => `<span aria-hidden="true">${GLYPH[name] || ''}</span> ${esc(name)}`;

  function lotsPart(chart) {
    const result = engine.lots(chart);
    if (result.status !== 'ready') return '';
    const rows = result.lots.map(lot => `<tr><th scope="row">${esc(lot.name)}</th><td>${glyph(lot.planet)}</td><td>${esc(lot.degrees)} ${esc(lot.sign)}</td><td>${esc(lot.house)}</td><td>${esc(lot.formula)}</td></tr>`).join('');
    return `<article class="tl-part"><h5>The seven lots</h5>
      <p>A lot is a point found by measuring the distance between two places in the chart and laying it off from the Ascendant. These seven, one for each classical planet, come from Paulus of Alexandria (4th century CE). This is a ${esc(result.sect)} chart; every formula reverses for the other sect.</p>
      <div class="tl-table"><table><thead><tr><th scope="col">Lot</th><th scope="col">Planet</th><th scope="col">Position</th><th scope="col">House</th><th scope="col">Formula used</th></tr></thead><tbody>${rows}</tbody></table></div>
      <ul class="tl-matters">${result.lots.map(lot => `<li><strong>${esc(lot.name)}</strong> was read for ${esc(lot.matter)}.</li>`).join('')}</ul>
      <p class="natal-panel-hint">Houses are counted in the chart’s own houses.</p></article>`;
  }

  function firdariaPart(chart, now) {
    const result = engine.firdaria(chart, now);
    if (result.status !== 'ready') return '';
    const nowLine = result.current
      ? `<p class="tl-now"><span>Now</span> The firdar of ${glyph(result.current.lord)}, ages ${result.current.fromAge} to ${result.current.toAge}${result.currentSub ? `, in the sub-period of ${glyph(result.currentSub.lord)} until ${esc(day(result.currentSub.end))}` : ''}.</p>`
      : '';
    const items = result.periods.map(p => `<li${here(p, result.current)}><p><strong>${glyph(p.lord)}</strong> <span>ages ${p.fromAge} to ${p.toAge} · ${esc(span(p))}</span></p>${p.subs.length
      ? `<ol>${p.subs.map(s => `<li${here(s, result.currentSub)}>${glyph(s.lord)} <span>from ${esc(day(s.start))}</span></li>`).join('')}</ol>` : ''}</li>`).join('');
    return `<article class="tl-part"><h5>Firdaria</h5>
      <p>A Persian scheme, known in the West through Abu Maʿshar (9th century), that gives seventy-five years of life to the seven planets and the Moon’s two nodes in turn. A day chart begins with the Sun and a night chart with the Moon. Each planet’s years are shared out again among all seven, beginning with itself.</p>
      ${nowLine}
      <details class="tl-more"><summary>All nine periods${result.cycle ? ', second time round' : ''}</summary><ol class="tl-periods">${items}</ol></details></article>`;
  }

  const flags = p => `${p.loosing ? ' <em class="tl-flag">loosing of the bond</em>' : ''}${p.peak ? ' <em class="tl-flag">peak</em>' : ''}`;
  // startSign: the sign released from, which for Spirit can be one on from the lot's own sign.
  function releasingBlock(chart, lot, fortune, now, startSign = lot.signIndex) {
    const moved = startSign !== lot.signIndex;
    const result = engine.zodiacalReleasing(chart, startSign * 30 + 15, {fortuneLongitude: fortune.longitude, now});
    if (result.status !== 'ready') return '';
    const c = result.current, s = result.currentSub;
    const nowLine = c ? `<p class="tl-now"><span>Now</span> ${esc(c.sign)}, ruled by ${glyph(c.lord)}, ${esc(span(c))}${flags(c)}${s ? `; within it ${esc(s.sign)} (${glyph(s.lord)}) until ${esc(day(s.end))}${flags(s)}` : ''}.</p>` : '';
    const level1 = result.periods.map(p => `<li${here(p, c)}><strong>${esc(p.sign)}</strong> <span>${glyph(p.lord)} · ${esc(span(p))}</span>${flags(p)}</li>`).join('');
    const level2 = c ? c.subs.map(p => `<li${here(p, s)}><strong>${esc(p.sign)}</strong> <span>${glyph(p.lord)} · from ${esc(day(p.start))}</span>${flags(p)}</li>`).join('') : '';
    return `<div class="tl-release"><h6>From the Lot of ${esc(lot.name)}, in ${esc(lot.sign)}</h6>${moved ? `<p class="natal-panel-hint">Spirit and Fortune share ${esc(lot.sign)} in this chart, so Spirit is released from the next sign, ${esc(result.startSign)}.</p>` : ''}
      ${nowLine}
      <details class="tl-more"><summary>The long periods</summary><ol class="tl-periods tl-flat">${level1}</ol></details>
      ${level2 ? `<details class="tl-more"><summary>The shorter periods inside ${esc(c.sign)}</summary><ol class="tl-periods tl-flat">${level2}</ol></details>` : ''}</div>`;
  }
  function releasingPart(chart, now) {
    const result = engine.lots(chart);
    if (result.status !== 'ready') return '';
    const fortune = result.lots.find(l => l.name === 'Fortune'), spirit = result.lots.find(l => l.name === 'Spirit');
    const starts = engine.releasingStarts(fortune.longitude, spirit.longitude);
    return `<article class="tl-part"><h5>Zodiacal releasing</h5>
      <p>From Vettius Valens (2nd century CE). Time is released from the sign that holds a lot and passes round the zodiac a sign at a time, each sign lasting the number of years that belongs to its ruler. Inside each long period the same count runs again in months. Spirit was released for what a person does, Fortune for the body and circumstance.</p>
      ${releasingBlock(chart, spirit, fortune, now, starts.spirit)}${releasingBlock(chart, fortune, fortune, now)}
      <p class="natal-panel-hint">Years here are 360 days and months 30, as the technique counts them, so the dates drift from birthdays. A “peak” is a sign that is the first, fourth, seventh or tenth from the Lot of Fortune. The “loosing of the bond” is the point where a run of shorter periods has been all the way round and jumps to the opposite sign.</p></article>`;
  }

  function render(chart, {now = new Date()} = {}) {
    if (!chart || chart.status !== 'ready') return '';
    return `<section class="time-lords" aria-labelledby="time-lords-title"><header><p class="reading-label">Lots and time lords</p><h4 id="time-lords-title">Which planet keeps the time</h4>
      <p>Three older techniques for reading a life in chapters. Each names a planet or sign as “lord” of a stretch of time. They are offered as a lens for reflection, the way the tradition framed a period, not as a forecast of events.</p></header>
      <div class="tl-grid">${lotsPart(chart)}${firdariaPart(chart, now)}${releasingPart(chart, now)}</div>
      <details class="insight-method"><summary>About these techniques</summary>
        <p>All three depend on sect: whether the Sun was above the horizon at birth. They need an exact birth time, because the Ascendant enters every lot and a few minutes can move a lot into the next sign.</p>
        <p>The lots follow Paulus of Alexandria’s set of seven. Valens and Firmicus each give different formulas for Eros and Necessity; those are not used here.</p>
        <p>Firdaria years run from birthday to birthday. In a night chart the two node periods are placed at the end, after Mercury, as in Abu Maʿshar; a reading of Bonatti places them after Mars instead. After seventy-five years the sequence begins again.</p>
        <p>Zodiacal releasing is shown to two levels. The tradition continues to two finer levels, of days and of hours, which are left out.</p>
        <p>Sources: <a href="docs/NATAL-CHART.md" target="_blank" rel="noopener">methods &amp; validation</a></p>
      </details></section>`;
  }

  return {render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TimeLords;
