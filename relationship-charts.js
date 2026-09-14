/* One relationship chart for the Two skies view: the composite (a chart of midpoints) or the
   Davison (the sky at the midpoint in time and place). Pure: returns an HTML string and touches no
   DOM, so its copy is tested under Node. The arithmetic is in relationship-charts-engine.js;
   conventions and sources are in docs/EXTENDED-ATLAS.md. */
const RelationshipCharts = (() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const systemNames = {placidus: 'Placidus', regiomontanus: 'Regiomontanus', 'whole-sign': 'Whole Sign', equal: 'Equal'};
  const aspectLines = {
    Conjunction: 'Two themes sit together here, blended into a single note.',
    Sextile: 'Two themes stand within easy reach of each other — an opening that asks to be used.',
    Square: 'Two themes meet at a right angle — a point of friction worth noticing and working with.',
    Trine: 'Two themes run in the same current — a flow that is easy to take for granted.',
    Opposition: 'Two themes face each other across the chart — a pull between sides that asks for balance.'
  };
  const views = {
    composite: {
      eyebrow: 'Composite chart',
      title: 'A chart of midpoints',
      intro: 'Each placement lies at the midpoint of the two people’s placements — a symbolic chart of the relationship, not the sky at any moment.',
      about: `<p>Each composite planet is the midpoint of the two people’s placements of that planet, taken along the shorter arc between them. When the two placements are exactly opposed there is no shorter arc, so the point 90° forward of the first person’s placement is used.</p>
        <p>The composite Midheaven is the midpoint of the two Midheavens, and the Ascendant the midpoint of the two Ascendants, turned 180° if needed to keep it east of the Midheaven. With Placidus or Regiomontanus houses, each cusp is the midpoint of the corresponding cusps, kept in order around the wheel; Whole Sign and Equal houses are recast from the composite Ascendant. When the two charts use different house systems, Equal houses are used, unless one chart uses Whole Sign only because Placidus could not be drawn for that birth; then the composite uses Whole Sign houses, and a notice above the wheel says so.</p>
        <p>Aspects are the five majors among the ten composite planets, and between those planets and the Ascendant and Midheaven. Composite placements do not move, so no aspect is marked as applying or separating.</p>
        <p>The composite is a symbolic chart, not the sky at any moment.</p>`
    },
    davison: {
      eyebrow: 'Davison chart',
      title: 'The sky between two births',
      intro: 'The real sky at the moment halfway between the two births, seen from a place midway between the two birthplaces in latitude and longitude.',
      about: `<p>The Davison chart is the sky at the moment halfway between the two births in UTC, seen from the mean of the two birthplaces’ latitudes and the midpoint of their longitudes, taken the shorter way round. It is cast in the house system the reader chose, even if the reader’s own chart had to fall back to Whole Sign; where that system cannot be drawn for this moment and place, a notice above the wheel names the houses used instead.</p>
        <p>Unlike the composite, it is an actual moment and place, so its placements are those of a real sky. The table uses the ten planets, the Ascendant and the Midheaven, and the aspect list the five majors among those planets, and between them and the Ascendant and Midheaven.</p>`
    }
  };

  const coordinate = (value, positive, negative) => `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`;

  function render(model, {wheel = () => ''} = {}) {
    if (!model || model.status !== 'ready') return '';
    const view = views[model.method];
    const planets = model.points.filter(p => p.kind === 'planet');
    const rows = [...planets, ...model.axes.slice(0, 2)]
      .map(p => `<tr><th scope="row">${esc(p.symbol)} ${esc(p.name)}</th><td>${esc(p.sign)} ${esc(p.degrees)}</td><td>${esc(p.house)}</td></tr>`).join('');
    // Both models carry only planets and angles (the engine drops the Davison nodes), so every aspect is listed.
    const aspects = [...model.aspects].sort((x, y) => x.orb - y.orb);
    const types = [...new Set(aspects.map(a => a.type))];
    const aspectBody = aspects.length
      ? `<ul class="relationship-aspects">${aspects.map(a => `<li>${esc(a.a)} ${esc(a.symbol)} ${esc(a.b)} · ${esc(a.type)} · orb ${esc(a.orb.toFixed(2))}°</li>`).join('')}</ul>
        <ul class="relationship-aspect-notes">${types.map(t => `<li><strong>${esc(t)}</strong> ${esc(aspectLines[t] || '')}</li>`).join('')}</ul>`
      : '<p>No major aspects fall within orb in this chart.</p>';
    const moment = model.method === 'davison'
      ? `<p class="natal-calculation-line">Cast for ${esc(model.date.slice(0, 16).replace('T', ' '))} UTC at ${esc(coordinate(model.location.latitude, 'N', 'S'))}, ${esc(coordinate(model.location.longitude, 'E', 'W'))}</p>`
      : '';
    return `<div class="relationship-chart" data-relationship-method="${esc(model.method)}">
      <header><p class="reading-label">${esc(view.eyebrow)}</p><h5>${esc(view.title)}</h5><p>${esc(view.intro)}</p></header>
      ${moment}${model.notice ? `<p class="natal-notice">${esc(model.notice)}</p>` : ''}
      <figure class="relationship-wheel">${wheel(model)}</figure>
      <div class="cx-table-wrap"><table><caption>Placements · ${esc(systemNames[model.houseSystem] || model.houseSystem)} houses</caption>
        <thead><tr><th scope="col">Body</th><th scope="col">Sign &amp; degree</th><th scope="col">House</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="reading-label">Aspects, tightest first</p>${aspectBody}
      <details class="cx-method"><summary>About this chart</summary>${view.about}
        <p>The composite midpoint chart was popularised by Robert Hand’s <cite>Planets in Composite</cite> (1975). The Davison relationship chart is named for Ronald Davison, who described it in <cite>Synastry</cite> (1977).</p>
        <p>Neither chart is a verdict on the relationship — each offers one pattern to reflect on.</p>
      </details></div>`;
  }

  return {render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RelationshipCharts;
