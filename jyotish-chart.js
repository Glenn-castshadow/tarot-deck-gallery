/* South Indian and North Indian Vedic chart renderer. Plain-data in, SVG string out — no engine dependency. */
const JyotishChart = (() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const SIGN_ABBR = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const RASHI_NAMES = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];

  // South Indian fixed cell top-left corner, keyed by signIndex. 100x100 cells on a 400x400 grid.
  const SOUTH_CELLS = {
    11:[0,0],   0:[100,0],  1:[200,0],  2:[300,0],
    3:[300,100],4:[300,200],5:[300,300],
    6:[200,300],7:[100,300],8:[0,300],
    9:[0,200],  10:[0,100],
  };

  // North Indian house centre, keyed by house (bhava) number 1-12.
  const NORTH_CENTERS = {
    1:[200,100], 2:[100,50],  3:[50,100],  4:[100,200],
    5:[50,300],  6:[100,350], 7:[200,300], 8:[300,350],
    9:[350,300], 10:[300,200],11:[350,100],12:[300,50],
  };

  function grahaLabel(name, abbreviations, retroSet) {
    const abbr = (abbreviations && abbreviations[name]) || name;
    return retroSet.has(name) ? `${abbr}R` : abbr;
  }

  function stackedText(x, startY, lineHeight, lines, extraAttrs = '') {
    return lines.map((line, i) => `<text x="${x}" y="${startY + i * lineHeight}" text-anchor="middle"${extraAttrs}>${esc(line)}</text>`).join('');
  }

  // Pack names two-per-row once there are more than `threshold` of them, so a crowded
  // house grows in row count (then, if needed, shrinks its line height) instead of running
  // labels past the shape that contains them.
  function packRows(names, threshold) {
    if (names.length <= threshold) return names;
    const rows = [];
    for (let i = 0; i < names.length; i += 2) rows.push(names.slice(i, i + 2).join(' '));
    return rows;
  }

  // South Indian cell is a 100x100 square; keep the whole stack within cy..cy+100.
  function southGrahaText(cx, cy, names) {
    if (names.length <= 3) return stackedText(cx + 50, cy + 46, 16, names, ' font-size="14"');
    const rows = packRows(names, 3);
    const lh = Math.min(16, 78 / rows.length);
    const fontSize = Math.min(13, lh - 2);
    const span = (rows.length - 1) * lh;
    const startY = cy + 58 - span / 2;
    return stackedText(cx + 50, startY, lh, rows, ` font-size="${fontSize}"`);
  }

  // North Indian houses are diamonds/triangles centred on `cy`; keep rows within
  // `maxOffset` px of that centre (22px for the eight corner triangles, 36px for the
  // four rhombi along the main axes).
  function northGrahaText(cx, cy, names, maxOffset) {
    if (names.length <= 2) return stackedText(cx, cy + 14, 14, names, ' font-size="13"');
    const rows = packRows(names, 2);
    const lh = rows.length > 1 ? Math.min(14, (maxOffset * 2) / (rows.length - 1)) : 14;
    const fontSize = Math.min(11, lh - 2);
    const span = (rows.length - 1) * lh;
    const startY = cy - span / 2;
    return stackedText(cx, startY, lh, rows, ` font-size="${fontSize}"`);
  }

  function renderSouth(houses, lagnaSignIndex, abbreviations, retroSet, title) {
    const grid = [
      `<rect x="0" y="0" width="400" height="400" fill="none" stroke="currentColor"/>`,
      `<line x1="100" y1="0" x2="100" y2="400" stroke="currentColor"/>`,
      `<line x1="300" y1="0" x2="300" y2="400" stroke="currentColor"/>`,
      `<line x1="0" y1="100" x2="400" y2="100" stroke="currentColor"/>`,
      `<line x1="0" y1="300" x2="400" y2="300" stroke="currentColor"/>`,
      `<line x1="200" y1="0" x2="200" y2="100" stroke="currentColor"/>`,
      `<line x1="200" y1="300" x2="200" y2="400" stroke="currentColor"/>`,
      `<line x1="0" y1="200" x2="100" y2="200" stroke="currentColor"/>`,
      `<line x1="300" y1="200" x2="400" y2="200" stroke="currentColor"/>`,
    ].join('');

    const cells = houses.map(house => {
      const cell = SOUTH_CELLS[house.signIndex];
      if (!cell) throw new Error(`No South Indian cell for signIndex ${house.signIndex}`);
      const [cx, cy] = cell;
      const isLagna = house.signIndex === lagnaSignIndex;
      const signText = `<text x="${cx + 86}" y="${cy + 16}" text-anchor="middle" font-size="10" opacity="0.6">${esc(SIGN_ABBR[house.signIndex])}</text>`;
      const grahaLines = house.grahas.map(name => grahaLabel(name, abbreviations, retroSet));
      const grahaText = southGrahaText(cx, cy, grahaLines);
      const lagnaMark = isLagna ? `<line x1="${cx}" y1="${cy}" x2="${cx + 22}" y2="${cy + 22}" stroke="currentColor"/>` : '';
      return `<g data-house="${house.index}" data-sign="${house.signIndex}"${isLagna ? ' data-lagna="true"' : ''}>${lagnaMark}${signText}${grahaText}</g>`;
    }).join('');

    const titleText = title ? `<text x="200" y="200" text-anchor="middle" font-size="16">${esc(title)}</text>` : '';
    return `${grid}${cells}${titleText}`;
  }

  function renderNorth(houses, lagnaSignIndex, abbreviations, retroSet, title) {
    const grid = [
      `<rect x="0" y="0" width="400" height="400" fill="none" stroke="currentColor"/>`,
      `<line x1="0" y1="0" x2="400" y2="400" stroke="currentColor"/>`,
      `<line x1="400" y1="0" x2="0" y2="400" stroke="currentColor"/>`,
      `<line x1="200" y1="0" x2="400" y2="200" stroke="currentColor"/>`,
      `<line x1="400" y1="200" x2="200" y2="400" stroke="currentColor"/>`,
      `<line x1="200" y1="400" x2="0" y2="200" stroke="currentColor"/>`,
      `<line x1="0" y1="200" x2="200" y2="0" stroke="currentColor"/>`,
    ].join('');

    const cells = houses.map(house => {
      const centre = NORTH_CENTERS[house.index];
      if (!centre) throw new Error(`No North Indian house centre for house ${house.index}`);
      const [cx, cy] = centre;
      const isLagna = house.index === 1;
      const ascLabel = isLagna ? `<text x="${cx}" y="${cy - 18}" text-anchor="middle" font-size="9" opacity="0.7">Asc</text>` : '';
      const signText = `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="11">${house.signIndex + 1}</text>`;
      const grahaLines = house.grahas.map(name => grahaLabel(name, abbreviations, retroSet));
      const isRhombus = house.index === 1 || house.index === 4 || house.index === 7 || house.index === 10;
      const grahaText = northGrahaText(cx, cy, grahaLines, isRhombus ? 36 : 22);
      return `<g data-house="${house.index}" data-sign="${house.signIndex}"${isLagna ? ' data-lagna="true"' : ''}>${ascLabel}${signText}${grahaText}</g>`;
    }).join('');

    const titleText = title ? `<text x="200" y="204" text-anchor="middle" font-size="14" opacity="0.8">${esc(title)}</text>` : '';
    return `${grid}${cells}${titleText}`;
  }

  function render({format, houses, lagnaSignIndex, abbreviations = {}, retrograde, title} = {}) {
    if (format !== 'south' && format !== 'north') throw new Error(`Unknown Jyotish chart format: ${format}`);
    if (!Array.isArray(houses) || houses.length !== 12) throw new Error('houses must be an array of exactly 12 entries');
    if (!Number.isInteger(lagnaSignIndex) || lagnaSignIndex < 0 || lagnaSignIndex > 11) throw new RangeError('lagnaSignIndex must be an integer from 0 to 11');

    const retroSet = retrograde instanceof Set ? retrograde : new Set(retrograde || []);
    const lagnaName = RASHI_NAMES[lagnaSignIndex];
    const formatName = format === 'south' ? 'South Indian' : 'North Indian';
    const chartName = title ? title.split(' · ')[0] : null;
    const label = chartName ? `${chartName} chart, ${formatName} format, Lagna ${lagnaName}` : `${formatName} chart, Lagna ${lagnaName}`;

    const body = format === 'south'
      ? renderSouth(houses, lagnaSignIndex, abbreviations, retroSet, title)
      : renderNorth(houses, lagnaSignIndex, abbreviations, retroSet, title);

    return `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(label)}">${body}</svg>`;
  }

  return {render, SIGN_ABBR, RASHI_NAMES};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = JyotishChart;
