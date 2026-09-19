#!/usr/bin/env node
/* Builds tools/data/zodiac-figures.json: the twelve zodiac constellations' stick figures with the
   magnitude of every star in them. Run once, and again only if the source data changes.
     node tools/build_zodiac_figures.cjs [--src output/imagegen/newsletter]
   Source data (not tracked; about 680 KB): constellations.lines.json and stars.6.json from
   d3-celestial, https://github.com/ofrohn/d3-celestial, BSD-3-Clause. Each line vertex is a real
   star, so its magnitude is that of the catalogued star at the same position; the build fails if
   any vertex has no catalogued star within 0.01 degrees. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const IDS = {aries: 'Ari', taurus: 'Tau', gemini: 'Gem', cancer: 'Cnc', leo: 'Leo', virgo: 'Vir', libra: 'Lib', scorpio: 'Sco',
  sagittarius: 'Sgr', capricorn: 'Cap', aquarius: 'Aqr', pisces: 'Psc'};
const TOLERANCE = 0.01;   // degrees
const rad = d => d * Math.PI / 180;

function separation([ra1, dec1], [ra2, dec2]) {
  const c = Math.sin(rad(dec1)) * Math.sin(rad(dec2)) + Math.cos(rad(dec1)) * Math.cos(rad(dec2)) * Math.cos(rad(ra1 - ra2));
  return Math.acos(Math.min(1, Math.max(-1, c))) * 180 / Math.PI;
}

function build(lines, stars) {
  const catalogue = stars.features.map(f => ({at: f.geometry.coordinates, mag: f.properties.mag}));
  const figures = {};
  for (const [sign, id] of Object.entries(IDS)) {
    const feature = lines.features.find(f => f.id === id);
    if (!feature) throw new Error(`no figure for ${id}`);
    figures[sign] = feature.geometry.coordinates.map(polyline => polyline.map(vertex => {
      let best = null, off = Infinity;
      for (const star of catalogue) { const d = separation(vertex, star.at); if (d < off) { off = d; best = star; } }
      if (off > TOLERANCE) throw new Error(`${sign}: no catalogued star within ${TOLERANCE} degrees of ${JSON.stringify(vertex)} (nearest is ${off.toFixed(3)} away)`);
      return [vertex[0], vertex[1], best.mag];
    }));
  }
  return {
    source: 'd3-celestial (https://github.com/ofrohn/d3-celestial): constellations.lines.json and stars.6.json',
    licence: 'BSD-3-Clause, Copyright (c) 2015, Olaf Frohn',
    format: 'figures[sign] is a list of polylines; a vertex is [right ascension in degrees, -180 to 180; declination in degrees; visual magnitude]',
    figures
  };
}

function main(argv) {
  const at = argv.indexOf('--src'), src = at >= 0 ? argv[at + 1] : 'output/imagegen/newsletter';
  const read = name => JSON.parse(fs.readFileSync(path.join(src, name), 'utf8'));
  const data = build(read('constellations.lines.json'), read('stars.6.json'));
  const out = path.join(__dirname, 'data', 'zodiac-figures.json');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, JSON.stringify(data) + '\n');
  const stars = Object.values(data.figures).flat(2).length;
  console.log(`${out}: 12 figures, ${stars} vertices, ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
}

module.exports = {IDS, build, separation};
if (require.main === module) main(process.argv.slice(2));
