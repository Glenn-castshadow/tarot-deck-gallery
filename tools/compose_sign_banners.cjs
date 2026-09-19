#!/usr/bin/env node
/* Turns each sign's generated master into the newsletter banner: crops it to 1200x520 and draws
   the sign's TRUE constellation in the calm upper-right sky, from tools/data/zodiac-figures.json.
     node tools/compose_sign_banners.cjs [sign ...] [--masters output/imagegen/newsletter] [--out assets/newsletter/signs]
   Needs ImageMagick (`magick`) on PATH. Design: docs/superpowers/specs/2026-09-18-newsletter-issue-and-campaign-design.md. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const W = 1200, H = 520;                        // the banner, shown at 600x260
const BOX = {x: 790, y: 44, w: 350, h: 200};    // where the figure sits, the same in every banner
const MASTER = {w: 1536, h: 1024}, WINDOW_ROWS = 666;   // 1536x666 is the banner's shape
// The window is centred unless the centred window clipped the subject (negative moves it up).
// The figure is drawn after the crop, so it stays in the same place in all twelve.
const SHIFT = {taurus: -60, capricorn: -45, sagittarius: 95, pisces: 150};
const rad = d => d * Math.PI / 180;

// Stereographic projection about the figure's own centre, north up, EAST TO THE LEFT: the sky as
// seen looking up from the ground, which is how every star chart draws a constellation.
// In: polylines of [ra, dec, mag]. Out: the same shape, as [x, y, mag] in banner pixels.
function project(polylines, box = BOX) {
  let cx = 0, cy = 0, cz = 0;
  for (const [ra, dec] of polylines.flat()) { cx += Math.cos(rad(dec)) * Math.cos(rad(ra)); cy += Math.cos(rad(dec)) * Math.sin(rad(ra)); cz += Math.sin(rad(dec)); }
  const ra0 = Math.atan2(cy, cx), dec0 = Math.atan2(cz, Math.hypot(cx, cy));
  const flat = polylines.map(line => line.map(([ra, dec, mag]) => {
    const a = rad(ra) - ra0, d = rad(dec);
    const k = 2 / (1 + Math.sin(dec0) * Math.sin(d) + Math.cos(dec0) * Math.cos(d) * Math.cos(a));
    return [-k * Math.cos(d) * Math.sin(a), -k * (Math.cos(dec0) * Math.sin(d) - Math.sin(dec0) * Math.cos(d) * Math.cos(a)), mag];   // y grows downward
  }));
  const xs = flat.flat().map(p => p[0]), ys = flat.flat().map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(box.w / (maxX - minX || 1), box.h / (maxY - minY || 1));
  const offX = box.x + (box.w - (maxX - minX) * scale) / 2, offY = box.y + (box.h - (maxY - minY) * scale) / 2;
  return flat.map(line => line.map(([x, y, mag]) => [offX + (x - minX) * scale, offY + (y - minY) * scale, mag]));
}

// Magnitude 0 is a 7px disc and magnitude 5 a 2px one: each magnitude is about 2.5 times fainter
// and the eye reads area, so the radius falls by about a pixel a magnitude.
const starRadius = mag => Math.max(2, Math.min(7.2, 7 - mag));

function overlaySvg(polylines) {
  const lines = project(polylines), f = n => n.toFixed(1);
  const stars = new Map();
  for (const [x, y, mag] of lines.flat()) stars.set(`${f(x)},${f(y)}`, {x, y, mag});
  const d = lines.map(line => 'M' + line.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')).join(' ');
  const discs = [...stars.values()].sort((a, b) => b.mag - a.mag).map(({x, y, mag}) => {
    const r = starRadius(mag), halo = mag < 2.2 ? 0.34 : 0.2;
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.4)}" fill="#f6d9a0" fill-opacity="${(halo * 0.4).toFixed(2)}"/>` +
           `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.9)}" fill="#f6d9a0" fill-opacity="${halo}"/>` +
           `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff4d8"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<path d="${d}" fill="none" stroke="#e9c486" stroke-opacity="0.72" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>${discs}</svg>`;
}

function main(argv) {
  const opt = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
  const masters = opt('--masters', 'output/imagegen/newsletter'), out = opt('--out', 'assets/newsletter/signs');
  const {figures} = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'zodiac-figures.json'), 'utf8'));
  const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  fs.mkdirSync(out, {recursive: true});
  for (const sign of (named.length ? named : Object.keys(figures))) {
    const master = path.join(masters, `${sign}-master.png`);
    if (!figures[sign]) throw new Error(`unknown sign ${sign}`);
    if (!fs.existsSync(master)) { console.log(`${sign}: no master at ${master}`); continue; }
    const svg = path.join(masters, `${sign}-figure.svg`), banner = path.join(out, `${sign}.jpg`);
    fs.writeFileSync(svg, overlaySvg(figures[sign]));
    const top = Math.max(0, Math.min(MASTER.h - WINDOW_ROWS, (MASTER.h - WINDOW_ROWS) / 2 + (SHIFT[sign] || 0)));
    execFileSync('magick', [master, '-crop', `${MASTER.w}x${WINDOW_ROWS}+0+${top}`, '+repage', '-resize', `${W}x${H}!`,
      '(', '-background', 'none', svg, ')', '-gravity', 'northwest', '-composite', '-strip', '-quality', '86', banner]);
    console.log(`${sign}: ${(fs.statSync(banner).size / 1024).toFixed(0)} KB`);
  }
}

module.exports = {W, H, BOX, SHIFT, project, starRadius, overlaySvg};
if (require.main === module) main(process.argv.slice(2));
