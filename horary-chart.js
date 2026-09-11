/* Single-ring horary wheel: sign ring, cusp lines (house-system agnostic), and the
   seven classical planets plus the two lunar nodes. Outer planets are omitted --
   classical horary judgment does not use them. */
const HoraryChart = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const CENTER = 220;
  const CLASSICAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const NODES = ['North Node', 'South Node'];
  const RING_OUTER = 200, RING_INNER = 175, SIGN_LABEL_RADIUS = (RING_OUTER + RING_INNER) / 2;
  const CUSP_INNER = 60, ANGLE_LABEL_RADIUS = 210, HOUSE_NUMBER_RADIUS = 75;
  const PLANET_RADIUS = 150, PLANET_RADIUS_PUSHED = PLANET_RADIUS - 18, DEGREE_LABEL_RADIUS = 130;
  const COLLISION_ORB = 6;

  // Screen angle: the Ascendant sits at 9 o'clock and the zodiac runs anticlockwise
  // as longitude increases, matching the rest of this codebase's wheel renderers
  // (see natal-chart.js's `point` helper).
  function project(longitude, radius, asc) {
    const angle = (180 - (longitude - asc)) * Math.PI / 180;
    return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
  }

  function render({ chart, title }) {
    if (!chart || chart.status !== 'ready') throw new Error('HoraryChart.render requires a ready chart.');
    const asc = chart.angles.asc;
    const at = (longitude, radius) => project(longitude, radius, asc);
    const fmt = n => n.toFixed(2);

    const signRing = natal.signGlyphs.map((glyph, index) => {
      const [x, y] = at(index * 30 + 15, SIGN_LABEL_RADIUS);
      return `<text class="h-sign" x="${fmt(x)}" y="${fmt(y + 6)}" text-anchor="middle" font-size="16">${glyph}</text>`;
    }).join('');

    const cusps = chart.cusps.map((cusp, index) => {
      const houseNumber = index + 1;
      const isAsc = houseNumber === 1, isMc = houseNumber === 10;
      const [ix, iy] = at(cusp, CUSP_INNER);
      const [ox, oy] = at(cusp, RING_INNER);
      const angleLabel = isAsc || isMc
        ? (() => { const [lx, ly] = at(cusp, ANGLE_LABEL_RADIUS); return `<text class="h-angle-label" x="${fmt(lx)}" y="${fmt(ly + 4)}" text-anchor="middle" font-size="12">${isAsc ? 'ASC' : 'MC'}</text>`; })()
        : '';
      const gap = natal.mod(chart.cusps[(index + 1) % 12] - cusp);
      const [mx, my] = at(natal.mod(cusp + gap / 2), HOUSE_NUMBER_RADIUS);
      return `<g data-cusp="${houseNumber}"><line x1="${fmt(ix)}" y1="${fmt(iy)}" x2="${fmt(ox)}" y2="${fmt(oy)}" class="h-cusp${isAsc || isMc ? ' h-angle' : ''}" stroke-width="${isAsc || isMc ? 2.5 : 1}"/>${angleLabel}<text class="h-house-number" x="${fmt(mx)}" y="${fmt(my + 4)}" text-anchor="middle" font-size="10">${houseNumber}</text></g>`;
    }).join('');

    const chartPoints = chart.points.filter(p =>
      (p.kind === 'planet' && CLASSICAL_PLANETS.includes(p.name)) ||
      (p.kind === 'node' && NODES.includes(p.name))
    );
    // Collision rule: sorted by longitude, a point within COLLISION_ORB degrees of
    // its predecessor is pushed inward; the push alternates on/off so a run of close
    // points fans out instead of stacking arbitrarily deep.
    const sorted = [...chartPoints].sort((a, b) => a.longitude - b.longitude);
    let pushed = false;
    const radii = sorted.map((point, index) => {
      if (index === 0) { pushed = false; return PLANET_RADIUS; }
      const gap = Math.abs(natal.delta(point.longitude, sorted[index - 1].longitude));
      pushed = gap < COLLISION_ORB ? !pushed : false;
      return pushed ? PLANET_RADIUS_PUSHED : PLANET_RADIUS;
    });
    const planets = sorted.map((point, index) => {
      const [gx, gy] = at(point.longitude, radii[index]);
      const [dx, dy] = at(point.longitude, DEGREE_LABEL_RADIUS);
      const degree = Math.floor(natal.mod(point.longitude) % 30);
      return `<g data-planet="${esc(point.name)}"><text class="h-planet" x="${fmt(gx)}" y="${fmt(gy + 5)}" text-anchor="middle" font-size="18">${point.symbol}</text><text class="h-degree" x="${fmt(dx)}" y="${fmt(dy + 4)}" text-anchor="middle" font-size="9">${degree}°</text></g>`;
    }).join('');

    const ascPlacement = natal.placement(asc);
    const ascDegree = Math.floor(natal.mod(asc) % 30);
    const ariaLabel = `${esc(title)}: Ascendant ${ascPlacement.sign} ${ascDegree}°`;

    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-wheel" viewBox="0 0 440 440" role="img" aria-label="${ariaLabel}"><circle cx="${CENTER}" cy="${CENTER}" r="${RING_OUTER}" fill="none" class="h-ring"/><circle cx="${CENTER}" cy="${CENTER}" r="${RING_INNER}" fill="none" class="h-ring"/><circle cx="${CENTER}" cy="${CENTER}" r="${CUSP_INNER}" fill="none" class="h-ring"/>${signRing}${cusps}${planets}</svg>`;
  }

  return { render };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HoraryChart;
