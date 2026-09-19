# Newsletter Issue Builder and Draft Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the week's proofread issue file into one Mailchimp draft campaign in the approved "Night Sky" design, with an illustrated banner and true constellation for each sign, a local preview, and a test send; the owner sends.

**Architecture:** The PC builds the email (`tools/build_newsletter.cjs`, pure functions, one IF/ELSEIF chain over the `SIGN` merge field) and pushes two files to the VPS. A Django command there (`draft_campaign`) creates or updates the draft through the existing `newsletter/mailchimp.py`, where the API key already lives, runs Mailchimp's checklist and can send one test. The site serves the images. A refused proofreader correction is kept for the owner to accept or reject.

**Tech Stack:** Node CommonJS with `node --test`; ImageMagick (`magick`); OpenAI image API (`gpt-image-2`) for the one-off art; Django 5.2 management command and `TestCase`; Mailchimp Marketing API v3 over stdlib `urllib`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-newsletter-issue-and-campaign-design.md`. Read it first; this plan argues from it.

## Global Constraints

- No code path calls Mailchimp's `/actions/send` or `/actions/schedule`. The owner sends. (Glenn's decision; a test asserts it over every recorded call.)
- A block goes into an issue only when `proof.blocks[key].verdict` is `pass` and its `sha` equals the sha256 of the block's current text; for `subjects` the text is `JSON.stringify({subjects, preview})`. (Piece 2 spec.)
- Every email carries `*|UNSUB|*`, `*|SITEUNSUB|*`, `*|ARCHIVE|*`, `*|HTML:LIST_ADDRESS_HTML|*`, `*|REWARDS|*` and the sentence that one language model writes each issue and a second one proofreads it. (`docs/NEWSLETTER.md`; Mailchimp free plan; piece 2 spec.)
- Email HTML: one 600px table, all styles inline, no `<style>` or `<script>`, no CSS background images, no WebP or SVG, a background colour on every padded cell, every `<img>` with `alt`, `width` and an absolute `https://ishtarinsights.com/assets/newsletter/` URL, under 90 KB. (Claude's judgement from the research in the spec.)
- The Mailchimp API key stays only in `/etc/ishtar-app.env` on the VPS. Nothing on the PC holds it. `OPENAI_API_KEY` is read from the environment and never printed. (Claude's judgement; operating rules.)
- Dependencies are open source, and this plan adds none. Star data: d3-celestial, BSD-3-Clause; only the small derived `tools/data/zodiac-figures.json` is tracked, with the attribution inside it. (Glenn's global instructions.)
- Generated masters, the two d3-celestial source files and everything under `output/` stay out of git; `prompts.json`, the derived star file and the finished images under `assets/newsletter/` are tracked. (Existing repo practice.) Never `git add -A`: name the files.
- Subscriber addresses never appear in a log, a repo file or a test; tests use `example.com`. (`docs/NEWSLETTER.md`.)
- Expected astronomical values in tests are published literals (Aldebaran 0.87, Regulus 1.36, Spica 0.98, Antares 1.06, Hamal 2.01, Pollux 1.16), never computed by the code under test. (Project memory.)
- Every new test is run and seen to fail before the code that satisfies it. (Project memory.)
- Anything containing a backslash is written with the Edit or Write tool, never through an inline shell heredoc, which collapses `\\` to `\`. (Project memory, 2026-09-18.)
- JavaScript suite: `node --test tests/*.test.cjs` from the repo root. Django: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter accounts`.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `tools/build_zodiac_figures.cjs` (create) | derive the twelve figures with magnitudes from the d3-celestial files; fail on an unmatched vertex | 1 |
| `tools/data/zodiac-figures.json` (create, generated) | the derived star data, 4.5 KB, with source and licence | 1 |
| `tools/compose_sign_banners.cjs` (create) | crop a master to 1200x520 and draw the true constellation | 1 |
| `tests/zodiac-figures.test.cjs` (create) | data, projection orientation, star sizes | 1 |
| `tools/make_sign_art.cjs`, `tools/build_newsletter_assets.cjs` (create) | the one-off art generator; masthead, moon arc and glyph images | 2 |
| `assets/newsletter/**` (create) | masthead.jpg, moon-arc.jpg, `signs/*.jpg`, `glyphs/*.png` | 2 |
| `tools/build_newsletter.cjs`, `tests/newsletter-build.test.cjs` (create) | the email builder, manifest, preview, push | 3 |
| `tools/proof_weekly_prose.cjs` (modify), `tools/review_weekly_prose.cjs`, `tests/weekly-review.test.cjs` (create) | keep refused corrections; owner accepts or rejects | 4 |
| `server/ishtar/newsletter/management/commands/draft_campaign.py`, `newsletter/tests/test_draft_campaign.py` (create); `newsletter/mailchimp.py`, `ishtar/settings.py` (modify) | the draft command; empty-reply fix; `NEWSLETTER_ISSUE_DIR` | 5 |
| `docs/NEWSLETTER.md`, `docs/deployment.md` (modify) | runbook; the asset release and backend deploy | 6 |

Tasks 1, 3, 4 and 5 suit a subagent each. Tasks 2 and 6 are run by the controller: Task 2 uses paid image generation already done, ImageMagick on Glenn's PC and a visual check; Task 6 deploys and sends email with Glenn.

**Before Task 1 (controller):** copy `constellations.lines.json` and `stars.6.json` (d3-celestial, already downloaded with Glenn's permission) and the twelve `*-master.png` files and `prompts.json` into `output/imagegen/newsletter/`, and add the line `output/imagegen/newsletter/*` followed by `!output/imagegen/newsletter/prompts.json` to `.gitignore` under the existing imagegen lines. Verify: `git check-ignore output/imagegen/newsletter/stars.6.json` prints the path and `git check-ignore output/imagegen/newsletter/prompts.json` prints nothing.

---

### Task 1: The true constellation figures and the banner compositor

**Files:**
- Create: `tools/build_zodiac_figures.cjs`, `tools/data/zodiac-figures.json` (generated by it), `tools/compose_sign_banners.cjs`
- Test: `tests/zodiac-figures.test.cjs`

**Interfaces:**
- Consumes: `output/imagegen/newsletter/constellations.lines.json` (GeoJSON, one MultiLineString per constellation id, coordinates `[ra -180..180, dec]`) and `stars.6.json` (GeoJSON points with `properties.mag`).
- Produces: `tools/data/zodiac-figures.json` = `{source, licence, format, figures: {<sign>: [ [ [ra, dec, mag], ... ], ... ]}}` with the twelve lowercase signs in zodiac order; `build_zodiac_figures.cjs` exports `{IDS, build(lines, stars), separation(a, b)}`; `compose_sign_banners.cjs` exports `{W: 1200, H: 520, BOX, SHIFT, project(polylines, box?) -> same shape as [x, y, mag], starRadius(mag), overlaySvg(polylines) -> string}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/zodiac-figures.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {figures, licence} = require('../tools/data/zodiac-figures.json');
const Z = require('../tools/build_zodiac_figures.cjs');
const C = require('../tools/compose_sign_banners.cjs');

test('there are twelve figures, each vertex a position and a magnitude, and the licence travels with them', () => {
  assert.deepEqual(Object.keys(figures), Object.keys(Z.IDS));
  for (const [sign, polylines] of Object.entries(figures)) {
    assert.ok(polylines.length >= 1, sign);
    for (const [ra, dec, mag] of polylines.flat()) {
      assert.ok(ra >= -180 && ra <= 180 && dec >= -90 && dec <= 90, `${sign} position`);
      assert.ok(mag > -2 && mag < 6.6, `${sign} magnitude ${mag}`);
    }
  }
  assert.match(licence, /BSD-3-Clause/);
});

test('the brightest star of each figure is the one the published catalogues give', () => {
  const brightest = sign => Math.min(...figures[sign].flat().map(v => v[2]));
  // Published visual magnitudes: Aldebaran 0.87, Regulus 1.36, Spica 0.98, Antares 1.06, Hamal 2.01, Pollux 1.16.
  assert.deepEqual(['taurus', 'leo', 'virgo', 'scorpio', 'aries', 'gemini'].map(brightest), [0.87, 1.36, 0.98, 1.06, 2.01, 1.16]);
  // Aries is the short bent line of four stars, not the zigzag an image model draws.
  assert.deepEqual(figures.aries.map(line => line.length), [4]);
});

test('separation is the angle between two sky positions', () => {
  assert.ok(Math.abs(Z.separation([0, 0], [90, 0]) - 90) < 1e-9);
  assert.ok(Math.abs(Z.separation([10, 89], [190, 89]) - 2) < 1e-9);   // across the pole
  assert.ok(Math.abs(Z.separation([179.5, 0], [-179.5, 0]) - 1) < 1e-9);   // across the wrap in right ascension
});

test('the projection draws the sky as seen from the ground: north up, east to the left', () => {
  const box = {x: 0, y: 0, w: 100, h: 100};
  const [[west, east]] = C.project([[[10, 0, 1], [20, 0, 1]]], box);       // greater right ascension is further east
  assert.ok(east[0] < west[0], 'east is drawn to the left');
  const [[south, north]] = C.project([[[0, 10, 1], [0, 20, 1]]], box);
  assert.ok(north[1] < south[1], 'north is drawn higher');
  const [[a, b]] = C.project([[[179, 0, 1], [-179, 0, 1]]], box);          // two degrees apart, across the wrap
  assert.ok(Math.abs(a[0] - b[0]) <= 100 && b[0] < a[0]);
  for (const sign of Object.keys(figures)) for (const [x, y] of C.project(figures[sign]).flat()) {
    assert.ok(x >= C.BOX.x - 0.01 && x <= C.BOX.x + C.BOX.w + 0.01 && y >= C.BOX.y - 0.01 && y <= C.BOX.y + C.BOX.h + 0.01, `${sign} stays in its box`);
  }
});

test('a brighter star is drawn larger, within bounds', () => {
  assert.ok(C.starRadius(0.87) > C.starRadius(2.01) && C.starRadius(2.01) > C.starRadius(4.5));
  assert.equal(C.starRadius(-1.5), 7.2);
  assert.equal(C.starRadius(6.5), 2);
  const svg = C.overlaySvg(figures.aries);
  assert.equal((svg.match(/<circle/g) || []).length, 4 * 3);   // four stars, a disc and two halo rings each
  assert.match(svg, /^<svg [^>]*width="1200" height="520"/);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/zodiac-figures.test.cjs`
Expected: FAIL with `Cannot find module '../tools/data/zodiac-figures.json'`.

- [ ] **Step 3: Write the figure builder and run it**

Create `tools/build_zodiac_figures.cjs`:

```js
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
```

Run: `node tools/build_zodiac_figures.cjs`
Expected: `tools\data\zodiac-figures.json: 12 figures, 174 vertices, 4.5 KB`. If it throws "no catalogued star within 0.01 degrees", stop and report: do not loosen the tolerance.

- [ ] **Step 4: Write the compositor**

Create `tools/compose_sign_banners.cjs`:

```js
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
```

- [ ] **Step 5: Run the tests**

Run: `node --test tests/zodiac-figures.test.cjs`
Expected: 5 tests PASS. If a published magnitude disagrees with the data, stop and report; never edit the literal.

- [ ] **Step 6: Commit**

```bash
git add tools/build_zodiac_figures.cjs tools/compose_sign_banners.cjs tools/data/zodiac-figures.json tests/zodiac-figures.test.cjs
git commit -m "feat(newsletter): true zodiac constellation figures and the banner compositor"
```

---

### Task 2 (controller): The art tools and the released images

**Files:**
- Create: `tools/make_sign_art.cjs`, `tools/build_newsletter_assets.cjs`, `assets/newsletter/masthead.jpg`, `assets/newsletter/moon-arc.jpg`, `assets/newsletter/signs/<sign>.jpg` x12, `assets/newsletter/glyphs/<sign>.png` x12, `output/imagegen/newsletter/prompts.json` (tracked)

**Interfaces:**
- Consumes: the twelve masters already generated and approved by Glenn from the contact sheet (2026-09-18); `compose_sign_banners.cjs` from Task 1; `assets/celestial-hero.webp`, `assets/ishtar-insights-logo-hero.webp`.
- Produces: the image URLs Task 3 hard-codes: `/assets/newsletter/masthead.jpg` (1200x430), `/moon-arc.jpg` (1200x170), `/signs/<sign>.jpg` (1200x520), `/glyphs/<sign>.png` (136x136).

- [ ] **Step 1: Add the generator, for the record and for any re-roll**

Create `tools/make_sign_art.cjs` (no generation is needed now: every master exists, so a run prints "exists, skipped" twelve times and costs nothing):

```js
#!/usr/bin/env node
/* Generates the twelve per-sign newsletter banner masters with OpenAI's image API. Run once;
   the banners are reused every week. Masters and prompts.json go to output/imagegen/newsletter/
   (masters are git-ignored, prompts.json is tracked). tools/compose_sign_banners.cjs makes the banners.
   The key is read from OPENAI_API_KEY and is never printed or written anywhere.
     node tools/make_sign_art.cjs all | <sign> [<sign> ...]   (skips a sign whose master exists; --force redoes it) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const OUT = path.join('output', 'imagegen', 'newsletter');

// The preamble follows tools/prepare_divination_art.cjs, reworded for a wide banner. The look is
// the one Glenn approved from the Aries pilot: rich realistic painting, dark, ember and gold.
const BASE = 'Use case: stylized-concept. Asset: finished flat full-bleed wide landscape illustration for the Ishtar Insights newsletter. ' +
  'Create an exceptionally beautiful, interesting, collectible-quality image: a richly detailed, realistic digital painting with lovingly rendered texture, refined composition and luminous color. ' +
  'This is the complete artwork viewed perfectly straight on, not a photograph of a print, not a product mockup. ' +
  'No text, no letters, no numbers, no zodiac glyphs or symbols, no labels, no watermark, no border, no frame, no outside margin. ' +
  'No constellation lines and no connected stars anywhere: the sky holds only natural scattered stars and soft nebula dust. ' +
  'Composition: the image is cropped later to a very wide banner, so keep the whole subject inside the central horizontal band with generous empty sky above its highest point; ' +
  'the top fifth and the bottom sixth of the image hold only quiet night sky and quiet foreground that can be cut away. ' +
  'Place the main subject left of centre. Keep the upper right third of the image as calm, open, dark star-dusted sky with nothing in it, because a star chart is added there later. ' +
  'Palette: deep aubergine and plum night sky, teal-black shadows, warm antique gold, a band of ember-red, rose gold and apricot light low on the horizon; dark overall, so it sits inside a dark email. ';

const SUBJECTS = {
  aries: 'Aries, the ram, cardinal fire. A noble ram with great curled horns stands on a rocky ridge at the first edge of dawn, head lifted, the first green shoots of spring between the stones, small sparks drifting upward like the start of a fire.',
  taurus: 'Taurus, the bull, fixed earth. A powerful, calm bull with gilded crescent horns stands in a night meadow thick with spring flowers and tall grass, a garland of blossom resting on its neck, fireflies low over the field, rich dark soil and rolling hills behind.',
  gemini: 'Gemini, the twins, mutable air. Two young figures seen from behind sit side by side on a hilltop wall, leaning together and sharing one glowing lantern, their cloaks lifted by a light breeze, a few paper birds and loose pages drifting away on the wind toward the horizon.',
  cancer: 'Cancer, the crab, cardinal water. A large crab with a pearl-and-gold shell stands on a wet tidal shore at night, small waves drawing back around it, shells and sea-glass in the sand, the low light of the horizon mirrored on the water.',
  leo: 'Leo, the lion, fixed fire. A majestic lion lies on a high sun-warmed rock, head raised, its mane lit from behind like glowing embers, dry golden grass moving around the rock, sparks of warm light in the air.',
  virgo: 'Virgo, the maiden, mutable earth. A woman in a simple flowing dress, seen in three-quarter view from behind, walks through a field of ripe wheat at dusk carrying a sheaf of grain, one hand brushing the ears of wheat, fireflies rising around her.',
  libra: 'Libra, the scales, cardinal air. An antique gold balance scale stands perfectly level on a stone terrace balustrade overlooking a quiet night sea, a single rose petal resting in each pan, a few petals drifting on the evening breeze.',
  scorpio: 'Scorpio, the scorpion, fixed water. A scorpion with a dark garnet-and-gold carapace stands on a desert rock beside a still oasis pool that mirrors the stars, tail raised in a graceful curve, dark palms and dunes behind, deep garnet tones in the shadows.',
  sagittarius: 'Sagittarius, the archer, mutable fire. A centaur archer on a hilltop draws a great bow aimed high toward the open sky, the arrow tip glowing like a coal, mane and tail streaming, distant hills and a far road leading to the horizon.',
  capricorn: 'Capricorn, the sea-goat, cardinal earth. The mythical sea-goat, the forequarters of a great horned mountain goat flowing into a scaled, finned fish tail, rests on a rocky winter shoreline at the foot of snow-dusted peaks, its tail in the dark water, breath faintly visible in the cold air.',
  aquarius: 'Aquarius, the water bearer, fixed air. A robed figure seen from behind stands on a high terrace and pours a stream of water from a large urn out into the night; the falling water turns into a glittering river of light that runs away across the dark land below.',
  pisces: 'Pisces, the fishes, mutable water. Two graceful fish, one pale gold and one deep violet, circle each other in a dark still pool, joined by a thin ribbon of light, lotus flowers and their pads floating on the surface, the pool seen from a low angle with the horizon beyond.'
};

async function make(sign, model) {
  const out = path.join(OUT, `${sign}-master.png`);
  const t0 = Date.now();
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: {'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}`},
    body: JSON.stringify({model, prompt: `${BASE}Subject: ${SUBJECTS[sign]}`, size: '1536x1024', quality: 'medium', n: 1})
  });
  const json = await res.json();
  if (!res.ok) { console.error(`${sign}: API error ${res.status} ${JSON.stringify(json.error || json).slice(0, 300)}`); return false; }
  fs.writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`${sign}: ${((Date.now() - t0) / 1000).toFixed(0)}s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  return true;
}

(async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const args = process.argv.slice(2), force = args.includes('--force');
  const wanted = args.filter(a => !a.startsWith('--'));
  const signs = !wanted.length || wanted[0] === 'all' ? Object.keys(SUBJECTS) : wanted;
  fs.mkdirSync(OUT, {recursive: true});
  fs.writeFileSync(path.join(OUT, 'prompts.json'), JSON.stringify({model: 'gpt-image-2', quality: 'medium', size: '1536x1024', base: BASE, subjects: SUBJECTS}, null, 1));
  let ok = 0;
  for (const sign of signs) {
    if (!SUBJECTS[sign]) { console.error(`no subject for ${sign}`); continue; }
    if (!force && fs.existsSync(path.join(OUT, `${sign}-master.png`))) { console.log(`${sign}: exists, skipped`); ok++; continue; }
    if (await make(sign, 'gpt-image-2')) ok++;
  }
  console.log(`${ok}/${signs.length} done`);
})().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2: Add the fixed-image script**

Create `tools/build_newsletter_assets.cjs`:

```js
#!/usr/bin/env node
/* Makes the newsletter's fixed images from art the site already has, as JPG and PNG because
   Outlook on Windows shows neither WebP nor CSS background images:
     assets/newsletter/masthead.jpg   1200x430  the celestial hero with the lotus logo in its empty centre
     assets/newsletter/moon-arc.jpg   1200x170  the moon-phase arc from the foot of the hero
     assets/newsletter/glyphs/<sign>.png 136x136  each sign's glyph, gold on the panel colour
   The sign banners are made by tools/compose_sign_banners.cjs. Everything is shown at half size.
     node tools/build_newsletter_assets.cjs        (needs ImageMagick `magick` and the Segoe UI Symbol font) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const OUT = path.join('assets', 'newsletter');
const HERO = path.join('assets', 'celestial-hero.webp'), LOGO = path.join('assets', 'ishtar-insights-logo-hero.webp');
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const magick = args => execFileSync('magick', args, {stdio: ['ignore', 'inherit', 'inherit']});

fs.mkdirSync(path.join(OUT, 'glyphs'), {recursive: true});
// The hero is 1774x887; at 1200 wide it is 600 tall, and the moon arc is its last 170 rows.
magick([HERO, '-resize', '1200x600!', '-crop', '1200x430+0+0', '+repage',
  '(', LOGO, '-resize', '540x', ')', '-gravity', 'center', '-geometry', '+0-6', '-composite', '-strip', '-quality', '88', path.join(OUT, 'masthead.jpg')]);
magick([HERO, '-resize', '1200x600!', '-crop', '1200x170+0+430', '+repage', '-strip', '-quality', '88', path.join(OUT, 'moon-arc.jpg')]);
SIGNS.forEach((sign, i) => magick(['-size', '136x136', 'xc:#10252e', '-font', 'Segoe-UI-Symbol', '-pointsize', '96', '-fill', '#ddc389',
  '-gravity', 'center', '-annotate', '+0+2', String.fromCodePoint(0x2648 + i), '-strip', path.join(OUT, 'glyphs', `${sign}.png`)]));
for (const name of ['masthead.jpg', 'moon-arc.jpg', ...SIGNS.map(s => `glyphs/${s}.png`)]) console.log(`${name}: ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB`);
```

- [ ] **Step 3: Build everything**

```bash
node tools/make_sign_art.cjs all          # twelve "exists, skipped"; writes prompts.json
node tools/compose_sign_banners.cjs       # twelve banners, 89 to 129 KB each
node tools/build_newsletter_assets.cjs    # masthead about 123 KB, moon arc about 42 KB, glyphs 3 to 8 KB
```

- [ ] **Step 4: Look at them**

`magick montage assets/newsletter/signs/*.jpg -tile 3x4 -geometry 600x260+8+8 -background "#160c20" output/imagegen/newsletter/contact-sheet.jpg` and read it: every subject whole, every figure in the same upper-right patch, no banner's subject under its figure. Stack `masthead.jpg` over `moon-arc.jpg` (`magick ... -append`) and check the join. Append four glyphs (`+append`) and check they are gold text glyphs on the panel colour, not colour emoji.

- [ ] **Step 5: Commit** (binary assets: about 1.6 MB in all)

```bash
git add tools/make_sign_art.cjs tools/build_newsletter_assets.cjs output/imagegen/newsletter/prompts.json assets/newsletter
git commit -m "feat(newsletter): sign banners with true constellations, masthead, moon arc and glyph images"
```

---

### Task 3: The email builder

**Files:**
- Create: `tools/build_newsletter.cjs`
- Test: `tests/newsletter-build.test.cjs`

**Interfaces:**
- Consumes: `nextMonday(today)` from `tools/write_weekly_prose.cjs`; the week file of piece 2; the image URLs of Task 2.
- Produces: exports `{SIGNS, ASSETS, MAX_BYTES, sha, fitBlocks(week), pullQuote(text), signSection(sign, text), missingSignSection(sign), noSignSection(), footer(), renderEmail(fit, {subject, only?, fonts?}), headline(fit, pick?), previewPage(fit, subject, preview, localAssets), parseArgs(argv, today?), main(argv) -> exit code}`. Files: `<out>/<week>/issue.html`, `issue.json` = `{week, title: "Ishtar Insights <week>", subject, preview, from_name, reply_to, bytes, signs_included, signs_missing, html_sha256}`, `preview.html`. Exit codes: 0 built; 1 no file or not a Monday; 4 overview not fit; 5 a sign not fit without `--allow-missing`; 6 over 90 KB. Task 5 reads `issue.json` and `issue.html`.

- [ ] **Step 1: Write the failing tests**

Create `tests/newsletter-build.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const B = require('../tools/build_newsletter.cjs');

const KEYS = B.SIGNS.map(s => s.key);
const reading = key => `This is the ${key} week, plainly said. The Sun opens the week in your sign and asks for patience.\n\nOn Wednesday the ${key} day arrives. Keep it small.`;

// A week file as the writer and the proofreader leave it: every block passed, sha current.
function makeWeek(change = () => {}) {
  const week = {week: '2026-09-21', generated: 'x', model: 'muse-glimmer-30b-local',
    overview: 'The week builds slowly and then opens. The Sun is in Virgo as Monday opens.\n\nOn Saturday the Full moon arrives. Keep one task in view.',
    signs: Object.fromEntries(KEYS.map(k => [k, reading(k)])),
    subjects: ['Start the week tidy and let the middle soften', 'A second candidate subject line here', 'A third candidate subject line here'],
    preview: 'A waxing Moon for most of the week, then a Full moon on Saturday.'};
  change(week);
  const blocks = {overview: week.overview, subjects: JSON.stringify({subjects: week.subjects, preview: week.preview}), ...week.signs};
  week.proof = {model: 'qwen3.8-27b-local', checked: 'x', blocks: Object.fromEntries(Object.entries(blocks).map(([k, t]) => [k, {verdict: 'pass', reason: '', edited: false, sha: B.sha(t)}]))};
  return week;
}
const campaign = week => { const fit = B.fitBlocks(week); return B.renderEmail(fit, {subject: B.headline(fit).subject}); };

test('only blocks with a current pass are fit to send', () => {
  const week = makeWeek();
  week.proof.blocks.leo.verdict = 'fail';               // failed
  week.signs.virgo += ' Edited after proofing.';        // text changed since it was judged
  delete week.proof.blocks.libra;                       // never judged
  delete week.signs.pisces;                             // never written
  const fit = B.fitBlocks(week);
  assert.deepEqual(fit.missing, ['leo', 'virgo', 'libra', 'pisces']);
  assert.equal(Object.keys(fit.signs).length, 8);
  assert.equal(fit.overview, week.overview);
  week.preview += '!';                                  // the subjects block is one text: subjects and preview together
  assert.deepEqual([B.fitBlocks(week).subjects, B.fitBlocks(week).preview], [[], '']);
});

test('the campaign carries every sign inside one IF / ELSEIF chain, in zodiac order', () => {
  const html = campaign(makeWeek());
  const tags = html.match(/\*\|(?:IF|ELSEIF|ELSE|END):[^|]*\|\*/g);
  assert.deepEqual(tags, ['*|IF:SIGN=aries|*', ...KEYS.slice(1).map(k => `*|ELSEIF:SIGN=${k}|*`), '*|ELSE:|*', '*|END:IF|*']);
  const branches = html.split(/\*\|(?:IF|ELSEIF|ELSE|END):[^|]*\|\*/).slice(1, 14);   // 12 signs + the ELSE branch
  KEYS.forEach((key, i) => {
    assert.ok(branches[i].includes(`the ${key} week, plainly said`), `${key} text is in its own branch`);
    assert.ok(branches[i].includes(`${B.ASSETS}/signs/${key}.jpg`) && branches[i].includes(`${B.ASSETS}/glyphs/${key}.png`));
    for (const other of KEYS) if (other !== key) assert.equal(branches[i].includes(`the ${other} week`), false, `${other} leaked into ${key}`);
  });
  assert.match(branches[12], /Tell us your sign/);
});

test('the opening sentence is pulled out as a quote and the paragraph break survives', () => {
  const q = B.pullQuote('First sentence here. Second one. Third.\n\nNext paragraph.');
  assert.deepEqual(q, {quote: 'First sentence here.', rest: 'Second one. Third.\n\nNext paragraph.'});
  assert.deepEqual(B.pullQuote('Only one sentence here.\n\nNext.'), {quote: '', rest: 'Only one sentence here.\n\nNext.'});
  const section = B.signSection(B.SIGNS[0], 'First sentence here. Second one.\n\nNext paragraph.');
  assert.equal((section.match(/<p style="margin:0 0 16px/g) || []).length, 2);
});

test('reader text is escaped', () => {
  const html = campaign(makeWeek(w => { w.signs.aries = 'Less < more & "quoted". A second sentence follows here.\n\nNext.'; w.subjects[0] = 'Fish & chips <week>'; }));
  assert.ok(html.includes('Less &lt; more &amp; &quot;quoted&quot;.'));
  assert.ok(html.includes('Fish &amp; chips &lt;week&gt;'));
  assert.equal(html.includes('<week>'), false);
});

test('the footer holds what Mailchimp, the law and our own specs require', () => {
  const html = campaign(makeWeek());
  for (const tag of ['href="*|UNSUB|*"', 'href="*|SITEUNSUB|*"', 'href="*|ARCHIVE|*"', '*|HTML:LIST_ADDRESS_HTML|*', '*|REWARDS|*']) assert.ok(html.includes(tag), tag);
  assert.match(html, /One language model writes each issue[^<]*a second one proofreads it/);
  assert.ok(html.includes('https://ishtarinsights.com/newsletter-privacy.html'));
});

test('the HTML keeps to what mail clients render', () => {
  const html = campaign(makeWeek());
  assert.equal(/background-image|url\(/i.test(html), false, 'no CSS background images');
  assert.equal(/\.webp|<svg/i.test(html), false, 'no WebP, no SVG');
  assert.equal(/<(?:style|script)\b/i.test(html), false, 'styles are inline; no scripts');
  const imgs = html.match(/<img\b[^>]*>/g);
  assert.equal(imgs.length, 2 + 12 * 2);                 // masthead, moon arc, and a banner and a glyph per sign
  for (const img of imgs) {
    assert.match(img, /\salt="/, img); assert.match(img, /\swidth="\d+"/, img);
    assert.match(img, /src="https:\/\/ishtarinsights\.com\/assets\/newsletter\/[a-z\/-]+\.(?:jpg|png)"/, img);
  }
  assert.match(html, /<meta name="color-scheme" content="dark light">/);
  for (const cell of html.match(/<td\b[^>]*padding:[^>]*>/g)) assert.match(cell, /background:#[0-9a-f]{6}/, `a padded cell with no colour of its own: ${cell.slice(0, 80)}`);
});

test('a full issue of the longest readings stays under the Gmail clipping limit', () => {
  const long = Array.from({length: 2}, () => Array.from({length: 115}, (_, i) => `word${i}`).join(' ') + '.').join('\n\n');   // 230 words
  const html = campaign(makeWeek(w => { for (const k of KEYS) w.signs[k] = `Opening sentence for ${k}. ${long}`; }));
  assert.ok(Buffer.byteLength(html) < B.MAX_BYTES, `${Buffer.byteLength(html)} bytes`);
});

test('a sign that is not fit gets the missing-reading panel, never the invitation', () => {
  const week = makeWeek(); week.proof.blocks.scorpio.verdict = 'fail';
  const html = campaign(week);
  const scorpio = html.split('*|ELSEIF:SIGN=scorpio|*')[1].split('*|ELSEIF:SIGN=sagittarius|*')[0];
  assert.match(scorpio, /There is no Scorpio reading this week/);
  assert.equal(scorpio.includes('Tell us your sign'), false);
  assert.equal(scorpio.includes('/signs/scorpio.jpg'), false);
});

test('without fit subjects the subject is the dated one and the preview comes from the overview', () => {
  const week = makeWeek(); week.proof.blocks.subjects.verdict = 'fail';
  assert.deepEqual(B.headline(B.fitBlocks(week)), {subject: 'Your week ahead: 21 September', preview: 'The week builds slowly and then opens.'});
  assert.equal(B.headline(B.fitBlocks(makeWeek()), 2).subject, 'A second candidate subject line here');
  const long = B.headline(B.fitBlocks(makeWeek(w => { w.subjects = []; w.overview = `${'Long '.repeat(40)}sentence.\n\nNext.`; })));
  assert.ok(long.preview.length <= 110 && long.preview.endsWith('...'));
});

function inTemp(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-build-'));
  try { return run(path.join(dir, 'in'), path.join(dir, 'out')); } finally { fs.rmSync(dir, {recursive: true}); }
}
const write = (dir, week) => { fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, `${week.week}.json`), JSON.stringify(week)); };

test('main writes the campaign, a manifest whose sha matches it, and a preview', () => inTemp((src, out) => {
  write(src, makeWeek());
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 0);
  const html = fs.readFileSync(path.join(out, '2026-09-21', 'issue.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(out, '2026-09-21', 'issue.json'), 'utf8'));
  assert.equal(manifest.html_sha256, B.sha(html));
  assert.deepEqual([manifest.title, manifest.subject, manifest.from_name, manifest.reply_to, manifest.signs_missing],
    ['Ishtar Insights 2026-09-21', 'Start the week tidy and let the middle soften', 'Ishtar Insights', 'newsletter@ishtarinsights.com', []]);
  assert.equal(manifest.bytes, Buffer.byteLength(html));
  const preview = fs.readFileSync(path.join(out, '2026-09-21', 'preview.html'), 'utf8');
  assert.equal(preview.includes('*|IF:'), false, 'the preview shows one reader at a time, with no merge tags');
  assert.ok(preview.includes('assets/newsletter/signs/aries.jpg') && !preview.includes('https://ishtarinsights.com/assets/newsletter'));
}));

test('exit codes: 1 no file or not a Monday, 4 no overview, 5 a missing sign unless allowed', () => inTemp((src, out) => {
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 1);
  assert.equal(B.main(['--week', '2026-09-22', '--in', src, '--out', out]), 1);
  const noOverview = makeWeek(); noOverview.proof.blocks.overview.verdict = 'fail'; write(src, noOverview);
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 4);
  const oneDown = makeWeek(); delete oneDown.signs.gemini; write(src, oneDown);
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 5);
  assert.equal(fs.existsSync(path.join(out, '2026-09-21', 'issue.html')), false, 'nothing is written when the build stops');
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out, '--allow-missing']), 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, '2026-09-21', 'issue.json'), 'utf8')).signs_missing, ['gemini']);
  assert.throws(() => B.parseArgs(['--subject', '4']), /--subject/);
  assert.throws(() => B.parseArgs(['--send']), /unknown argument/);
}));
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/newsletter-build.test.cjs`
Expected: FAIL with `Cannot find module '../tools/build_newsletter.cjs'`.

- [ ] **Step 3: Write the builder**

Create `tools/build_newsletter.cjs`. The HTML strings are the approved design; transcribe them exactly, in one Write call.

```js
#!/usr/bin/env node
/* Builds the week's newsletter from the proofread issue file: the campaign HTML with Mailchimp's
   merge tags in place, a small manifest, and a local preview of what each reader gets.
     node tools/build_newsletter.cjs [--week YYYY-MM-DD] [--subject 1|2|3] [--allow-missing] [--push]
        [--in output/weekly-prose] [--out output/newsletter]
   One campaign goes to everyone; Mailchimp shows each reader the section for their SIGN. Nothing
   here talks to Mailchimp: --push copies the two files to the VPS, where `manage.py draft_campaign`
   makes the draft. Design: docs/superpowers/specs/2026-09-18-newsletter-issue-and-campaign-design.md.
   Exit codes: 0 built; 1 no issue file or not a Monday; 4 the overview is not fit to send;
   5 a sign is not fit to send and --allow-missing was not given; 6 the HTML is over 90 KB. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {nextMonday} = require('./write_weekly_prose.cjs');

const SITE = 'https://ishtarinsights.com';
const ASSETS = `${SITE}/assets/newsletter`;
const MAX_BYTES = 90 * 1024;   // Gmail clips a message at about 102 KB
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', Helvetica, Arial, sans-serif";
const MONO = "'DM Mono', 'Courier New', monospace";
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SIGNS = [
  ['aries', 'Aries', 'Fire', 'Cardinal', 'Mars', 'a ram on a ridge at first light'],
  ['taurus', 'Taurus', 'Earth', 'Fixed', 'Venus', 'a garlanded bull in a night meadow'],
  ['gemini', 'Gemini', 'Air', 'Mutable', 'Mercury', 'two figures sharing a lantern on a hilltop'],
  ['cancer', 'Cancer', 'Water', 'Cardinal', 'the Moon', 'a pearl-shelled crab on a tidal shore'],
  ['leo', 'Leo', 'Fire', 'Fixed', 'the Sun', 'a lion on a rock, its mane lit like embers'],
  ['virgo', 'Virgo', 'Earth', 'Mutable', 'Mercury', 'a woman carrying a sheaf through ripe wheat'],
  ['libra', 'Libra', 'Air', 'Cardinal', 'Venus', 'gold scales level on a terrace above the sea'],
  ['scorpio', 'Scorpio', 'Water', 'Fixed', 'Mars', 'a scorpion beside a still oasis pool'],
  ['sagittarius', 'Sagittarius', 'Fire', 'Mutable', 'Jupiter', 'a centaur archer aiming at the sky'],
  ['capricorn', 'Capricorn', 'Earth', 'Cardinal', 'Saturn', 'the sea-goat on a winter shore'],
  ['aquarius', 'Aquarius', 'Air', 'Fixed', 'Saturn', 'a figure pouring a river of light from an urn'],
  ['pisces', 'Pisces', 'Water', 'Mutable', 'Jupiter', 'two fish circling among lotus flowers']
].map(([key, name, element, modality, ruler, alt]) => ({key, name, element, modality, ruler, alt}));

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paragraphs = (text, style) => text.split(/\n\s*\n/).map(p => `<p style="${style}">${esc(p.trim())}</p>`).join('');
const weekLabel = monday => { const [, m, d] = monday.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };

// Piece 2's contract: a block is fit to send only when its verdict is pass and the recorded sha
// is that of the text now in the file.
function fitBlocks(week) {
  const proofed = (key, text) => Boolean(text) && week.proof?.blocks?.[key]?.verdict === 'pass' && week.proof.blocks[key].sha === sha(text);
  const signs = {};
  for (const {key} of SIGNS) if (proofed(key, week.signs?.[key])) signs[key] = week.signs[key];
  const subjectsText = week.subjects?.length === 3 ? JSON.stringify({subjects: week.subjects, preview: week.preview}) : '';
  const subjectsFit = proofed('subjects', subjectsText);
  return {
    week: week.week,
    overview: proofed('overview', week.overview) ? week.overview : '',
    signs, missing: SIGNS.map(s => s.key).filter(key => !signs[key]),
    subjects: subjectsFit ? week.subjects : [], preview: subjectsFit ? week.preview : '',
    suggested: Object.keys(week.suggested || {})
  };
}

// The reading's opening sentence is pulled out as a quote, when the paragraph has more to follow.
function pullQuote(text) {
  const [first, ...others] = text.split(/\n\s*\n/);
  const cut = first.search(/[.!?]\s/) + 1;
  if (cut <= 0) return {quote: '', rest: text};
  return {quote: first.slice(0, cut), rest: [first.slice(cut).trim(), ...others].join('\n\n')};
}

const panelOpen = 'background:#10252e;border:1px solid #3d5a5a;';
const button = (href, label, filled) => `<a href="${href}" style="display:inline-block;padding:13px 26px;border-radius:3px;font:600 15px ${SANS};text-decoration:none;` +
  (filled ? 'background:#e6b17e;color:#20152b;' : 'border:1px solid #d9c18e;color:#f4e8d1;') + `">${label}</a>`;
const kicker = text => `<p style="margin:0 0 2px;font:500 11px/1.6 ${MONO};letter-spacing:.08em;text-transform:uppercase;color:#d9c18e;">${text}</p>`;

function signHeading(sign) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td bgcolor="#10252e" style="background:#10252e;vertical-align:middle;padding-right:18px;"><img src="${ASSETS}/glyphs/${sign.key}.png" width="68" height="68" alt="" style="display:block;border:0;"></td>
    <td style="vertical-align:middle;">${kicker('Your sign this week')}
      <h2 style="margin:0;font:700 32px/1.1 ${SERIF};color:#f4e8d1;">${sign.name}</h2>
      <p style="margin:2px 0 0;font:13px/1.6 ${SANS};color:#9fb4ae;">${sign.element} &middot; ${sign.modality} &middot; ruled by ${sign.ruler}</p></td></tr></table>`;
}

function signSection(sign, text) {
  const {quote, rest} = pullQuote(text);
  return `<tr><td bgcolor="#10252e" style="${panelOpen}border-bottom:0;font-size:0;line-height:0;">
  <img src="${ASSETS}/signs/${sign.key}.jpg" width="600" alt="${esc(`${sign.name}: ${sign.alt}`)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;font:italic 600 16px/2.4 ${SERIF};color:#d9c18e;text-align:center;background:#10252e;">
</td></tr>
<tr><td bgcolor="#10252e" style="${panelOpen}border-top:0;padding:30px 34px;">
  ${signHeading(sign)}
  ${quote ? `<p style="margin:24px 0 20px;padding:2px 0 2px 18px;border-left:2px solid #d5b877;font:italic 600 20px/1.5 ${SERIF};color:#e2c990;">${esc(quote)}</p>` : '<p style="margin:0 0 20px;font-size:0;line-height:0;">&nbsp;</p>'}
  ${paragraphs(rest, `margin:0 0 16px;font:16px/1.7 ${SANS};color:#f4e8d1;`)}
  ${button(`${SITE}/sky/`, 'Read today&#39;s sky', false)}
</td></tr>`;
}

// A reader who chose a sign whose reading is not fit to send this week. Never the no-sign
// invitation: that would tell someone who told us their sign that they had not.
function missingSignSection(sign) {
  return `<tr><td bgcolor="#10252e" style="${panelOpen}padding:30px 34px;">
  ${signHeading(sign)}
  <p style="margin:22px 0 18px;font:16px/1.7 ${SANS};color:#f4e8d1;">There is no ${sign.name} reading this week: the one we wrote did not pass our own checks, and we would sooner send none than a poor one. The week&#39;s sky above holds for every sign, and today&#39;s reading for ${sign.name} is on the site.</p>
  ${button(`${SITE}/sky/`, 'Read today&#39;s sky', false)}
</td></tr>`;
}

function noSignSection() {
  return `<tr><td bgcolor="#10252e" style="${panelOpen}padding:34px;text-align:center;">
  ${kicker('Make it yours')}
  <h2 style="margin:0 0 12px;font:700 28px/1.15 ${SERIF};color:#f4e8d1;">Tell us your sign</h2>
  <p style="margin:0 0 20px;font:16px/1.7 ${SANS};color:#f4e8d1;">Each week there is a reading written for every sign. Choose yours once and it arrives here, under the week&#39;s sky.</p>
  ${button(`${SITE}/account/`, 'Choose your sign', true)}
</td></tr>`;
}

function footer() {
  const link = (href, label) => `<a href="${href}" style="color:#e6b17e;">${label}</a>`;
  return `<tr><td bgcolor="#160c20" style="padding:28px 32px 34px;background:#160c20;border-top:1px solid #3a2a47;font:12px/1.7 ${SANS};color:#a99bb3;text-align:center;">
  <p style="margin:0 0 10px;font:10px/1.6 ${MONO};letter-spacing:.12em;text-transform:uppercase;color:#e6b17e;">&#10022; Ishtar Insights &#10022;</p>
  <p style="margin:0 0 10px;">You are receiving this because you asked for the Ishtar Insights newsletter.<br>
  One language model writes each issue from the week&#39;s computed sky, and a second one proofreads it. The constellations are drawn from real star positions. Nobody&#39;s chart is stored with your address.</p>
  <p style="margin:0 0 10px;">${link('*|UNSUB|*', 'Unsubscribe')} &nbsp;&middot;&nbsp; ${link('*|SITEUNSUB|*', 'Unsubscribe on the site')} &nbsp;&middot;&nbsp; ${link('*|ARCHIVE|*', 'View in your browser')} &nbsp;&middot;&nbsp; ${link(`${SITE}/newsletter-privacy.html`, 'Privacy')}</p>
  <p style="margin:0 0 14px;">*|HTML:LIST_ADDRESS_HTML|*</p>
  <p style="margin:0;">*|REWARDS|*</p>
</td></tr>`;
}

// `only`: render one reader's email with no conditional tags (the preview). Otherwise the campaign:
// every sign's section inside Mailchimp's IF / ELSEIF chain, the no-sign invitation in ELSE.
function renderEmail(fit, {subject, only, fonts = false} = {}) {
  const section = sign => fit.signs[sign.key] ? signSection(sign, fit.signs[sign.key]) : missingSignSection(sign);
  const middle = only === 'none' ? noSignSection()
    : only ? section(SIGNS.find(s => s.key === only))
    : SIGNS.map((sign, i) => `*|${i ? 'ELSEIF' : 'IF'}:SIGN=${sign.key}|*\n${section(sign)}`).join('\n') + `\n*|ELSE:|*\n${noSignSection()}\n*|END:IF|*`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(subject)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
${fonts ? '<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">' : ''}
</head><body style="margin:0;padding:0;background:#160c20;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#160c20" style="background:#160c20;"><tr><td align="center" bgcolor="#160c20" style="background:#160c20;padding:24px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td bgcolor="#261336" style="background:#261336;font-size:0;line-height:0;">
  <img src="${ASSETS}/masthead.jpg" width="600" alt="Ishtar Insights" style="display:block;width:100%;max-width:600px;height:auto;border:0;font:700 30px/3 ${SERIF};color:#fffaf4;text-align:center;background:#261336;">
</td></tr>
<tr><td bgcolor="#20152b" style="background:#20152b;padding:34px 36px 10px;">
  <p style="margin:0 0 8px;font:500 11px/1.6 ${MONO};letter-spacing:.18em;text-transform:uppercase;color:#e6b17e;">Week of ${weekLabel(fit.week)}</p>
  <h1 style="margin:0 0 18px;font:700 30px/1.15 ${SERIF};letter-spacing:-.02em;color:#fffaf4;">${esc(subject)}</h1>
  ${paragraphs(fit.overview, `margin:0 0 16px;font:16px/1.7 ${SANS};color:#e9dfee;`)}
</td></tr>
<tr><td bgcolor="#261336" style="background:#261336;font-size:0;line-height:0;">
  <img src="${ASSETS}/moon-arc.jpg" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
${middle}
${footer()}
</table></td></tr></table></body></html>`;
}

// What the campaign is called, and what goes in the inbox.
function headline(fit, pick = 1) {
  if (fit.subjects.length) return {subject: fit.subjects[pick - 1], preview: fit.preview};
  const first = fit.overview.split(/(?<=[.!?])\s/)[0];
  return {subject: `Your week ahead: ${weekLabel(fit.week)}`, preview: first.length > 110 ? `${first.slice(0, 107).trimEnd()}...` : first};
}

// The preview: every reader's version side by side with a phone, from the same renderEmail.
// Images come from the repo's assets folder, so it works before the assets are released.
function previewPage(fit, subject, preview, localAssets) {
  const views = [...SIGNS.map(s => [s.key, s.name]), ['none', 'No sign chosen']];
  const local = html => html.split(ASSETS).join(localAssets)
    .replace('*|HTML:LIST_ADDRESS_HTML|*', 'Postal address from the Mailchimp account').replace('*|REWARDS|*', '[Mailchimp referral badge]')
    .replace(/href="\*\|[A-Z:_]+\|\*"/g, 'href="#"');
  const docs = fonts => views.map(([key]) => local(renderEmail(fit, {subject, only: key, fonts})));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Newsletter preview, week of ${weekLabel(fit.week)}</title>
<style>body{margin:0;padding:0 20px 60px;background:#e9e6e1;color:#20152b;font:15px/1.55 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.bar{position:sticky;top:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 -20px 20px;padding:12px 20px;background:#20152b;color:#fffaf4}
.bar button{padding:6px 12px;border:1px solid #6b5a78;border-radius:16px;background:transparent;color:#fffaf4;font:inherit;cursor:pointer}
.bar button[aria-pressed=true]{background:#e6b17e;border-color:#e6b17e;color:#20152b;font-weight:600}.bar i{flex-basis:100%;height:0}
.inbox{max-width:600px;margin:0 0 12px;padding:10px 14px;background:#fff;border:1px solid #d5d0c9;border-radius:6px;font-size:13px}.inbox b{display:block}.inbox span{color:#77707d}
.frames{display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start}iframe{display:block;border:1px solid #cfc8bf;background:#160c20;border-radius:4px}</style></head><body>
<div class="bar">${views.map(([, name], i) => `<button data-view="${i}" aria-pressed="${i === 0}">${name}</button>`).join('')}<i></i>
<button data-fonts="0" aria-pressed="true">Fallback fonts (Gmail, desktop Outlook)</button><button data-fonts="1" aria-pressed="false">Web fonts (Apple Mail, Outlook.com)</button></div>
<div class="inbox"><b>Ishtar Insights</b>${esc(subject)} <span>&ndash; ${esc(preview)}</span></div>
${fit.missing.length ? `<p><b>Not fit to send this week:</b> ${fit.missing.join(', ')}. Those readers get the missing-reading panel.</p>` : ''}
<div class="frames"><iframe id="desk" width="640" height="2000" title="desktop"></iframe><iframe id="phone" width="375" height="2000" title="phone"></iframe></div>
<script>const DOCS=${JSON.stringify([docs(false), docs(true)]).replace(/</g, '\\u003c')};let view=0,fonts=0;
const frames=[document.getElementById('desk'),document.getElementById('phone')];
const fit=f=>{try{f.height=50;f.height=f.contentDocument.documentElement.scrollHeight+4}catch(e){}};
frames.forEach(f=>f.addEventListener('load',()=>{fit(f);setTimeout(()=>fit(f),1200)}));
const render=()=>frames.forEach(f=>f.srcdoc=DOCS[fonts][view]);
for(const kind of ['view','fonts'])document.querySelectorAll('[data-'+kind+']').forEach(b=>b.onclick=()=>{if(kind==='view')view=+b.dataset.view;else fonts=+b.dataset.fonts;
document.querySelectorAll('[data-'+kind+']').forEach(x=>x.setAttribute('aria-pressed',x===b));render()});render();</script></body></html>`;
}

function parseArgs(argv, today = new Date().toISOString().slice(0, 10)) {
  const o = {week: null, subject: 1, allowMissing: false, push: false, in: 'output/weekly-prose', out: 'output/newsletter'};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allow-missing') o.allowMissing = true;
    else if (a === '--push') o.push = true;
    else if (a === '--subject') o.subject = Number(argv[++i]);
    else if (['--week', '--in', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if (![1, 2, 3].includes(o.subject)) throw new Error('--subject must be 1, 2 or 3');
  o.week = o.week || nextMonday(today);
  return o;
}

function push(week, dir) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new Error(`refusing to push a malformed week: ${week}`);
  const remote = `/var/lib/ishtar-app/newsletter/${week}`;
  execFileSync('ssh', ['vps', `install -d -m 755 /var/lib/ishtar-app/newsletter ${remote}`], {stdio: 'inherit'});
  for (const name of ['issue.html', 'issue.json']) {
    execFileSync('ssh', ['vps', `cat > ${remote}/${name}.tmp && chmod 644 ${remote}/${name}.tmp && mv -f ${remote}/${name}.tmp ${remote}/${name}`],
      {input: fs.readFileSync(path.join(dir, name)), stdio: ['pipe', 'inherit', 'inherit']});
  }
  console.log(`${week}: pushed to vps:${remote}`);
}

function main(argv) {
  const o = parseArgs(argv);
  const file = path.join(o.in, `${o.week}.json`);
  if (new Date(`${o.week}T00:00:00Z`).getUTCDay() !== 1 || !fs.existsSync(file)) { console.error(`${o.week}: not a Monday, or no issue file at ${file}.`); return 1; }
  const fit = fitBlocks(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!fit.overview) { console.error(`${o.week}: the overview is not fit to send (missing, failed, or changed since it was proofread). No issue.`); return 4; }
  if (fit.missing.length && !o.allowMissing) { console.error(`${o.week}: not fit to send: ${fit.missing.join(', ')}. Repair the week, or pass --allow-missing.`); return 5; }
  for (const key of fit.suggested) console.warn(`${o.week}: a correction for ${key} is waiting for your decision (node tools/review_weekly_prose.cjs --week ${o.week}).`);

  const {subject, preview} = headline(fit, o.subject);
  const html = renderEmail(fit, {subject});
  const bytes = Buffer.byteLength(html);
  if (bytes > MAX_BYTES) { console.error(`${o.week}: the email is ${bytes} bytes, over the ${MAX_BYTES} limit that keeps Gmail from clipping it.`); return 6; }

  const dir = path.join(o.out, o.week);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'issue.html'), html);
  fs.writeFileSync(path.join(dir, 'issue.json'), JSON.stringify({week: o.week, title: `Ishtar Insights ${o.week}`, subject, preview,
    from_name: 'Ishtar Insights', reply_to: 'newsletter@ishtarinsights.com', bytes,
    signs_included: Object.keys(fit.signs), signs_missing: fit.missing, html_sha256: sha(html)}, null, 1) + '\n');
  const localAssets = path.relative(dir, path.join('assets', 'newsletter')).split(path.sep).join('/');
  fs.writeFileSync(path.join(dir, 'preview.html'), previewPage(fit, subject, preview, localAssets));
  console.log(`${o.week}: ${(bytes / 1024).toFixed(1)} KB, ${Object.keys(fit.signs).length}/12 signs, subject "${subject}"`);
  console.log(`preview: ${path.join(dir, 'preview.html')}`);
  if (o.push) push(o.week, dir);
  return 0;
}

module.exports = {SIGNS, ASSETS, MAX_BYTES, sha, fitBlocks, pullQuote, signSection, missingSignSection, noSignSection, footer, renderEmail, headline, previewPage, parseArgs, main};
if (require.main === module) process.exit(main(process.argv.slice(2)));
```

- [ ] **Step 4: Run the tests, then the whole suite**

Run: `node --test tests/newsletter-build.test.cjs` then `node --test tests/*.test.cjs`
Expected: 11 new tests PASS; the suite stays green. The test "the HTML keeps to what mail clients render" is the one that catches a cell left without a colour: if it fails, fix the cell, not the test.

- [ ] **Step 5: Commit**

```bash
git add tools/build_newsletter.cjs tests/newsletter-build.test.cjs
git commit -m "feat(newsletter): build the week's campaign HTML, manifest and preview"
```

---

### Task 4: Keep a refused correction, and let the owner decide it

**Files:**
- Modify: `tools/proof_weekly_prose.cjs` (the correction block inside `main`, the helper above `parseArgs`, `module.exports`)
- Create: `tools/review_weekly_prose.cjs`
- Test: `tests/weekly-review.test.cjs` (create); `tests/weekly-proof.test.cjs` must pass unmodified

**Interfaces:**
- Consumes: from `proof_weekly_prose.cjs`: `blocks(week, sheet)` (each block has `key, text, check(t), canonical(t), set(t), clear()`), `sha`, `factWords`; `nextMonday`; `engine.weekSheet`.
- Produces: the week file gains `suggested: {<key>: {text, why}}`; an accepted block's proof entry is `{verdict: 'pass', reason: '', edited: true, accepted_by: 'owner', sha}`. `review_weekly_prose.cjs` exports `{wordDiff(before, after), parseArgs, main(argv, options?) -> exit code}`; exit 0 done, 1 no week file, 7 an accepted text failed the validator. `build_newsletter.cjs` (Task 3) already reads `Object.keys(week.suggested)` to remind the owner.

- [ ] **Step 1: Write the failing tests**

Create `tests/weekly-review.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const P = require('../tools/proof_weekly_prose.cjs');
const R = require('../tools/review_weekly_prose.cjs');
const W = require('../tools/write_weekly_prose.cjs');

const WEEK = '2026-09-07';
const SHEET = {...W.EXAMPLE_SHEET, signs: [W.EXAMPLE_SIGN_SHEET]};
// A grammar fix a person would take and the fact-word guard cannot clear: it drops a tracked word.
const CLUMSY = W.EXAMPLE_SIGN.replace('On Sunday the New moon falls', 'On Sunday Moon the New moon falls');
const TIDIED = W.EXAMPLE_SIGN;

function seed(dir, signText) {
  const sub = JSON.parse(W.EXAMPLE_SUBJECTS);
  fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify({week: WEEK, generated: 'x', model: 'muse-glimmer-30b-local',
    overview: W.EXAMPLE_OVERVIEW, signs: {taurus: signText}, subjects: sub.subjects, preview: sub.preview}));
}
const read = dir => JSON.parse(fs.readFileSync(path.join(dir, `${WEEK}.json`), 'utf8'));
const pass = corrected => JSON.stringify({verdict: 'pass', reason: '', corrected: corrected || ''});
function fakeQwen(reply) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: 'qwen3.8-27b-local'})};
    const user = JSON.parse(init.body).messages.find(m => m.role === 'user').content;
    return {ok: true, json: async () => ({choices: [{message: {content: reply(user.match(/^Block: (\w+)/)[1])}}]})};
  };
}
async function proofed(signText, reply, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-review-')), original = globalThis.fetch;
  try {
    seed(dir, signText);
    globalThis.fetch = fakeQwen(reply);
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    return await body(dir);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
}
const offerTidied = key => key === 'taurus' ? pass(TIDIED) : pass();

test('the fixture is what it claims: valid text, and a fix the fact-word guard refuses', () => {
  assert.equal(W.validateSign(CLUMSY, W.EXAMPLE_SIGN_SHEET), null);
  assert.equal(W.validateSign(TIDIED, W.EXAMPLE_SIGN_SHEET), null);
  assert.notEqual(P.factWords(CLUMSY), P.factWords(TIDIED));
});

test('a correction the guard refuses is kept as a suggestion, and the text stands', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const f = read(dir);
    assert.equal(f.signs.taurus, CLUMSY);
    assert.deepEqual(f.suggested, {taurus: {text: TIDIED, why: 'it changes a fact word'}});
    assert.deepEqual(f.proof.blocks.taurus, {verdict: 'pass', reason: '', edited: false, sha: P.sha(CLUMSY)});
    assert.equal(f.originals, undefined);
  });
});

test('a correction that breaks the validator is not kept: it could never be accepted', async () => {
  const broken = CLUMSY.replace('Keep Sunday small', 'Sunday will be small');
  await proofed(CLUMSY, key => key === 'taurus' ? pass(broken) : pass(), async dir => assert.equal(read(dir).suggested, undefined));
});

test('accepting puts the suggestion in place with a current pass, and keeps the writer\'s text', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--accept', 'taurus'], {sheet: SHEET}), 0);
    const f = read(dir);
    assert.equal(f.signs.taurus, TIDIED);
    assert.equal(f.originals.taurus, CLUMSY);
    assert.deepEqual(f.proof.blocks.taurus, {verdict: 'pass', reason: '', edited: true, accepted_by: 'owner', sha: P.sha(TIDIED)});
    assert.equal(f.suggested, undefined);
    // The proofreader sees a current pass and does not send the block again.
    const calls = []; const original = globalThis.fetch;
    try { globalThis.fetch = fakeQwen(key => { calls.push(key); return pass(); }); await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}); }
    finally { globalThis.fetch = original; }
    assert.deepEqual(calls, []);
  });
});

test('rejecting drops the suggestion and changes nothing else', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--reject', 'taurus'], {sheet: SHEET}), 0);
    const f = read(dir);
    assert.deepEqual([f.signs.taurus, f.suggested, f.originals], [CLUMSY, undefined, undefined]);
    assert.equal(f.proof.blocks.taurus.edited, false);
  });
});

test('an accepted text must still pass the validator; if not, it stays a suggestion and the exit code is 7', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const f = read(dir); f.suggested.taurus.text = 'Too short to be a reading.'; fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    assert.equal(R.main(['--week', WEEK, '--out', dir, '--accept', 'taurus'], {sheet: SHEET}), 7);
    assert.equal(read(dir).signs.taurus, CLUMSY);
    assert.ok(read(dir).suggested.taurus);
  });
});

test('a rewritten block drops the suggestion that was made for its old text', async () => {
  await proofed(CLUMSY, offerTidied, async dir => {
    const f = read(dir); f.signs.taurus = TIDIED.replace('better order', 'good order'); fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    const original = globalThis.fetch;
    try { globalThis.fetch = fakeQwen(() => pass()); await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}); } finally { globalThis.fetch = original; }
    assert.equal(read(dir).suggested?.taurus, undefined);
  });
});

test('wordDiff shows only what changed; listing and a missing file', async () => {
  assert.equal(R.wordDiff('keep the clear ups short today', 'keep the cleanups short, today'), '[clear ups short] -> [cleanups short,]');
  assert.equal(R.wordDiff('same words', 'same words'), '');
  assert.throws(() => R.parseArgs(['--send']), /unknown argument/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-review-'));
  try { assert.equal(R.main(['--week', WEEK, '--out', dir], {sheet: SHEET}), 1); } finally { fs.rmSync(dir, {recursive: true}); }
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-review.test.cjs`
Expected: FAIL with `Cannot find module '../tools/review_weekly_prose.cjs'`.

- [ ] **Step 3: Change the proofreader** (four edits, with the Edit tool)

In `main`, replace the line
```js
        else if (factWords(canonical) !== factWords(b.text)) console.warn(`${o.week} ${b.key}: correction discarded, it changes a fact word`);
```
with
```js
        else if (factWords(canonical) !== factWords(b.text)) suggest(week, o, b, canonical, 'it changes a fact word');
```
and the line
```js
          if (edits > limit) console.warn(`${o.week} ${b.key}: correction discarded, ${edits} word edits is over the limit of ${limit}`);
```
with
```js
          if (edits > limit) suggest(week, o, b, canonical, `${edits} word edits is over the limit of ${limit}`);
```
Directly after the existing line `    delete week.proof.blocks[b.key];` add
```js
    if (week.suggested) delete week.suggested[b.key];
```
Directly above `function parseArgs(` add
```js
// A correction the guards refused is not thrown away: the owner decides it (tools/review_weekly_prose.cjs).
// One that fails the block's validator is not kept, because it could not be accepted anyway.
function suggest(week, o, b, text, why) {
  week.suggested = {...week.suggested, [b.key]: {text, why}};
  console.warn(`${o.week} ${b.key}: correction not applied, ${why}; kept for your review`);
}
```
and add `blocks` to `module.exports` (after `sha`).

- [ ] **Step 4: Write the review tool**

Create `tools/review_weekly_prose.cjs`:

```js
#!/usr/bin/env node
/* Shows the corrections the proofreader offered and its guards refused, and lets the owner decide.
     node tools/review_weekly_prose.cjs [--week YYYY-MM-DD] [--out output/weekly-prose] [--accept KEY]... [--reject KEY]...
   With no --accept or --reject it only lists them, each as a word-level before and after. KEY is a
   lowercase sign, `overview` or `subjects`. An accepted text must still pass that block's code
   validator; Glimmer's text is kept under `originals`. The guards refuse what code cannot clear,
   a person can. Exit codes: 0 done; 1 no week file; 7 an accepted text failed the validator. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../daily-horoscope-engine.js');
const {nextMonday} = require('./write_weekly_prose.cjs');
const {blocks, sha} = require('./proof_weekly_prose.cjs');

// A compact before and after: "[clear ups] -> [cleanups]  [short] -> [short,]".
function wordDiff(before, after) {
  const a = before.trim().split(/\s+/), b = after.trim().split(/\s+/);
  const lcs = Array.from({length: a.length + 1}, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out = []; let gone = [], came = [], i = 0, j = 0;
  const flush = () => { if (gone.length || came.length) { out.push(`[${gone.join(' ')}] -> [${came.join(' ')}]`); gone = []; came = []; } };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { flush(); i++; j++; } else if (lcs[i + 1][j] >= lcs[i][j + 1]) gone.push(a[i++]); else came.push(b[j++]);
  }
  gone.push(...a.slice(i)); came.push(...b.slice(j)); flush();
  return out.join('  ');
}

function parseArgs(argv, today = new Date().toISOString().slice(0, 10)) {
  const o = {week: null, out: 'output/weekly-prose', accept: [], reject: []};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--accept' || a === '--reject') o[a.slice(2)].push(argv[++i]);
    else if (a === '--week' || a === '--out') o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  o.week = o.week || nextMonday(today);
  return o;
}

// `options.sheet` lets a test supply the facts; the tool itself always computes them.
function main(argv, options = {}) {
  const o = parseArgs(argv), file = path.join(o.out, `${o.week}.json`);
  if (!fs.existsSync(file)) { console.error(`${o.week}: no week file at ${file}.`); return 1; }
  const week = JSON.parse(fs.readFileSync(file, 'utf8'));
  week.signs = week.signs || {};
  const suggested = week.suggested || {};
  const byKey = Object.fromEntries(blocks(week, options.sheet || engine.weekSheet(o.week)).map(b => [b.key, b]));
  let code = 0;

  for (const key of [...o.accept, ...o.reject]) if (!suggested[key]) console.warn(`${o.week} ${key}: no suggestion is waiting.`);
  for (const key of o.reject.filter(k => suggested[k])) { delete suggested[key]; console.log(`${o.week} ${key}: rejected; Glimmer's text stands.`); }
  for (const key of o.accept.filter(k => suggested[k])) {
    const block = byKey[key], text = suggested[key].text;
    const problem = block ? block.check(text) : 'the block is no longer in the issue';
    if (problem) { console.error(`${o.week} ${key}: cannot accept, ${problem}. The suggestion is kept.`); code = 7; continue; }
    week.originals = {...week.originals, [key]: week.originals?.[key] || block.text};
    block.set(text);
    week.proof.blocks[key] = {verdict: 'pass', reason: '', edited: true, accepted_by: 'owner', sha: sha(text)};
    delete suggested[key];
    console.log(`${o.week} ${key}: accepted.`);
  }
  if (Object.keys(suggested).length) week.suggested = suggested; else delete week.suggested;
  if (o.accept.length || o.reject.length) fs.writeFileSync(file, JSON.stringify(week, null, 1) + '\n');

  for (const [key, s] of Object.entries(suggested)) {
    console.log(`\n${key}: refused because ${s.why}\n  ${byKey[key] ? wordDiff(byKey[key].text, s.text) : '(the block is no longer in the issue)'}`);
    console.log(`  node tools/review_weekly_prose.cjs --week ${o.week} --accept ${key}     or     --reject ${key}`);
  }
  if (!Object.keys(suggested).length) console.log(`${o.week}: no corrections are waiting.`);
  return code;
}

module.exports = {wordDiff, parseArgs, main};
if (require.main === module) process.exit(main(process.argv.slice(2)));
```

- [ ] **Step 5: Run the tests**

Run: `node --test tests/weekly-review.test.cjs tests/weekly-proof.test.cjs tests/weekly-prose.test.cjs`
Expected: 8 new tests PASS and the existing proofreader and writer tests PASS unmodified (the dry run confirmed it: a refused correction still leaves the text, `originals` and the proof entry exactly as before; only the new `suggested` key is added).

- [ ] **Step 6: Commit**

```bash
git add tools/proof_weekly_prose.cjs tools/review_weekly_prose.cjs tests/weekly-review.test.cjs
git commit -m "feat(weekly prose): keep a refused correction and let the owner accept or reject it"
```

---

### Task 5: The draft-campaign command

**Files:**
- Create: `server/ishtar/newsletter/management/commands/draft_campaign.py`
- Modify: `server/ishtar/newsletter/mailchimp.py` (`_request`'s last two lines), `server/ishtar/ishtar/settings.py` (after `MAILCHIMP_AUDIENCE_ID`)
- Test: `server/ishtar/newsletter/tests/test_draft_campaign.py`

**Interfaces:**
- Consumes: `mailchimp.configured()`, `mailchimp._request(method, path, body=None, params=None)`; `issue.json` and `issue.html` from Task 3 under `settings.NEWSLETTER_ISSUE_DIR/<week>/`.
- Produces: `manage.py draft_campaign <week> [--test ADDRESS] [--replace]`. Calls, in order: `GET /campaigns`, then `POST /campaigns` or `PATCH /campaigns/{id}`, `PUT /campaigns/{id}/content`, `GET /campaigns/{id}/send-checklist`, `GET /lists/{audience}`, and with `--test` `POST /campaigns/{id}/actions/test`. Never `/actions/send` or `/actions/schedule`.

- [ ] **Step 1: Write the failing tests**

Create `server/ishtar/newsletter/tests/test_draft_campaign.py`:

```python
import hashlib
import io
import json
import tempfile
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from newsletter import mailchimp

WEEK = '2026-09-21'
HTML = '<html><body>*|IF:SIGN=aries|*ram*|ELSE:|*none*|END:IF|*</body></html>'
TITLE = f'Ishtar Insights {WEEK}'


class FakeMailchimp:
    """Records every call and answers like the Marketing API for the endpoints the command uses."""
    def __init__(self, campaigns=(), members=2, ready=True, items=()):
        self.calls, self.campaigns, self.members, self.ready, self.items = [], list(campaigns), members, ready, list(items)

    def __call__(self, method, path, body=None, params=None):
        self.calls.append((method, path, body, params))
        if (method, path) == ('GET', '/campaigns'):
            return {'campaigns': self.campaigns}
        if (method, path) == ('POST', '/campaigns'):
            return {'id': 'new1', 'web_id': 4242, 'status': 'save'}
        if path.endswith('/send-checklist'):
            return {'is_ready': self.ready, 'items': self.items}
        if path.startswith('/lists/'):
            return {'stats': {'member_count': self.members}}
        return {}


class DraftCampaignTests(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        folder = Path(self.tmp.name) / WEEK
        folder.mkdir()
        (folder / 'issue.html').write_text(HTML, encoding='utf-8')
        self.manifest = {'week': WEEK, 'title': TITLE, 'subject': 'Start the week tidy', 'preview': 'A waxing Moon.',
                         'from_name': 'Ishtar Insights', 'reply_to': 'newsletter@ishtarinsights.com', 'bytes': len(HTML),
                         'signs_included': ['aries'] * 12, 'signs_missing': [],
                         'html_sha256': hashlib.sha256(HTML.encode()).hexdigest()}
        self.write_manifest()

    def write_manifest(self):
        (Path(self.tmp.name) / WEEK / 'issue.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def run_command(self, fake, *args, configured=True):
        out = io.StringIO()
        with override_settings(NEWSLETTER_ISSUE_DIR=self.tmp.name, MAILCHIMP_AUDIENCE_ID='aud1', MAILCHIMP_SERVER='us1'), \
                mock.patch('newsletter.mailchimp.configured', return_value=configured), \
                mock.patch('newsletter.mailchimp._request', fake):
            call_command('draft_campaign', WEEK, *args, stdout=out)
        return out.getvalue()

    def test_creates_the_draft_then_sets_its_content(self):
        fake = FakeMailchimp()
        out = self.run_command(fake)
        create = next(c for c in fake.calls if c[:2] == ('POST', '/campaigns'))
        self.assertEqual(create[2], {'type': 'regular', 'recipients': {'list_id': 'aud1'}, 'settings': {
            'subject_line': 'Start the week tidy', 'preview_text': 'A waxing Moon.', 'title': TITLE,
            'from_name': 'Ishtar Insights', 'reply_to': 'newsletter@ishtarinsights.com'}})
        self.assertIn(('PUT', '/campaigns/new1/content', {'html': HTML}, None), fake.calls)
        self.assertLess(fake.calls.index(create), fake.calls.index(('PUT', '/campaigns/new1/content', {'html': HTML}, None)))
        self.assertIn('draft ready', out)
        self.assertIn('https://us1.admin.mailchimp.com/campaigns/edit?id=4242', out)

    def test_never_sends_or_schedules(self):
        for args in ([], ['--test', 'owner@example.com'], ['--replace']):
            fake = FakeMailchimp(campaigns=[{'id': 'old1', 'web_id': 7, 'status': 'save', 'settings': {'title': TITLE}}] if args == ['--replace'] else [])
            self.run_command(fake, *args)
            for method, path, _, _ in fake.calls:
                self.assertFalse(path.endswith('/actions/send') or path.endswith('/actions/schedule'), path)

    def test_an_existing_draft_is_left_alone_without_replace_and_updated_with_it(self):
        draft = [{'id': 'old1', 'web_id': 7, 'status': 'save', 'settings': {'title': TITLE}}]
        with self.assertRaisesMessage(CommandError, '--replace'):
            self.run_command(FakeMailchimp(campaigns=draft))
        fake = FakeMailchimp(campaigns=draft)
        self.run_command(fake, '--replace')
        self.assertFalse([c for c in fake.calls if c[:2] == ('POST', '/campaigns')])
        self.assertTrue([c for c in fake.calls if c[:2] == ('PATCH', '/campaigns/old1')])
        self.assertIn(('PUT', '/campaigns/old1/content', {'html': HTML}, None), fake.calls)

    def test_a_campaign_already_sent_is_never_touched(self):
        fake = FakeMailchimp(campaigns=[{'id': 'old1', 'web_id': 7, 'status': 'sent', 'settings': {'title': TITLE}}])
        with self.assertRaisesMessage(CommandError, 'already sent'):
            self.run_command(fake, '--replace')
        self.assertEqual([c[0] for c in fake.calls], ['GET'])

    def test_prints_checklist_problems_and_readiness(self):
        out = self.run_command(FakeMailchimp(ready=False, items=[
            {'type': 'success', 'heading': 'List', 'details': 'fine'},
            {'type': 'error', 'heading': 'From address', 'details': 'is not verified'}]))
        self.assertIn('ERROR: From address is not verified', out)
        self.assertNotIn('fine', out)
        self.assertIn('NOT ready to send', out)

    def test_reports_the_audience_against_the_free_plan_and_warns_from_100(self):
        self.assertIn('2 subscribed; a weekly issue is about 9 sends a month', self.run_command(FakeMailchimp(members=2)))
        self.assertNotIn('WARNING', self.run_command(FakeMailchimp(members=99)))
        self.assertIn('WARNING', self.run_command(FakeMailchimp(members=100)))

    def test_test_send_goes_to_the_one_address_given(self):
        fake = FakeMailchimp()
        out = self.run_command(fake, '--test', 'owner@example.com')
        self.assertIn(('POST', '/campaigns/new1/actions/test', {'test_emails': ['owner@example.com'], 'send_type': 'html'}, None), fake.calls)
        self.assertIn('no-sign version', out)
        self.assertNotIn('owner@example.com', out)

    def test_a_tampered_or_missing_issue_stops_before_any_call(self):
        self.manifest['html_sha256'] = '0' * 64
        self.write_manifest()
        fake = FakeMailchimp()
        with self.assertRaisesMessage(CommandError, 'sha256'):
            self.run_command(fake)
        self.assertEqual(fake.calls, [])
        with self.assertRaisesMessage(CommandError, 'no pushed issue'):
            out = io.StringIO()
            with override_settings(NEWSLETTER_ISSUE_DIR=self.tmp.name), mock.patch('newsletter.mailchimp.configured', return_value=True), \
                    mock.patch('newsletter.mailchimp._request', fake):
                call_command('draft_campaign', '2026-09-28', stdout=out)
        with self.assertRaisesMessage(CommandError, 'YYYY-MM-DD'):
            call_command('draft_campaign', '../etc', stdout=io.StringIO())

    def test_without_a_key_it_does_nothing(self):
        fake = FakeMailchimp()
        self.assertIn('not configured', self.run_command(fake, configured=False))
        self.assertEqual(fake.calls, [])

    def test_missing_signs_are_named(self):
        self.manifest.update(signs_included=['aries'] * 11, signs_missing=['gemini'])
        self.write_manifest()
        self.assertIn('missing-reading panel: gemini', self.run_command(FakeMailchimp()))


class EmptyReplyTests(TestCase):
    """Mailchimp answers 204 with no body to a test send; _request must not choke on it."""
    @override_settings(MAILCHIMP_API_KEY='k-us1', MAILCHIMP_SERVER='us1', MAILCHIMP_AUDIENCE_ID='aud1')
    def test_an_empty_body_is_an_empty_dict(self):
        class Reply(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False
        with mock.patch('urllib.request.urlopen', return_value=Reply(b'')):
            self.assertEqual(mailchimp._request('POST', '/campaigns/x/actions/test', {'test_emails': ['a@example.com']}), {})
        with mock.patch('urllib.request.urlopen', return_value=Reply(b'{"id": "c1"}')):
            self.assertEqual(mailchimp._request('GET', '/campaigns/c1'), {'id': 'c1'})
```

- [ ] **Step 2: Run them and see them fail**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter.tests.test_draft_campaign`
Expected: errors: `Unknown command: 'draft_campaign'`, and `EmptyReplyTests` fails with a `JSONDecodeError`.

- [ ] **Step 3: Let `_request` take an empty reply**

In `server/ishtar/newsletter/mailchimp.py`, replace
```python
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)
```
with
```python
    with urllib.request.urlopen(request, timeout=5) as response:
        body = response.read()
    # A test send and a few other actions answer 204 with no body.
    return json.loads(body) if body.strip() else {}
```

- [ ] **Step 4: Add the setting**

In `server/ishtar/ishtar/settings.py`, directly after the `MAILCHIMP_AUDIENCE_ID = ...` line:
```python
# Where tools/build_newsletter.cjs --push leaves each week's issue.html and issue.json.
NEWSLETTER_ISSUE_DIR = os.environ.get('NEWSLETTER_ISSUE_DIR', '/var/lib/ishtar-app/newsletter')
```

- [ ] **Step 5: Write the command**

Create `server/ishtar/newsletter/management/commands/draft_campaign.py`:

```python
import hashlib
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from newsletter import mailchimp

# A weekly issue is about 4.35 sends per subscriber per month, and the free plan allows 500 a month.
SENDS_PER_MEMBER_PER_MONTH = 52 / 12
FREE_PLAN_MONTHLY_SENDS = 500
WARN_FROM_MEMBERS = 100


class Command(BaseCommand):
    help = ('Create or update the DRAFT Mailchimp campaign for a week from the files pushed by '
            'tools/build_newsletter.cjs, run the send checklist, and optionally send one test. '
            'It never sends or schedules a campaign: the owner does that in Mailchimp.')

    def add_arguments(self, parser):
        parser.add_argument('week', help='The Monday the issue is for, YYYY-MM-DD.')
        parser.add_argument('--test', metavar='ADDRESS', help='Send one test email to this address.')
        parser.add_argument('--replace', action='store_true', help='Overwrite an existing draft for this week.')

    def handle(self, week, test=None, replace=False, **options):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', week):
            raise CommandError('week must be YYYY-MM-DD')
        if not mailchimp.configured():
            self.stdout.write('Mailchimp not configured; nothing to do.')
            return
        folder = Path(settings.NEWSLETTER_ISSUE_DIR) / week
        try:
            manifest = json.loads((folder / 'issue.json').read_text(encoding='utf-8'))
            html = (folder / 'issue.html').read_text(encoding='utf-8')
        except OSError as error:
            raise CommandError(f'no pushed issue for {week}: {error}')
        if hashlib.sha256(html.encode('utf-8')).hexdigest() != manifest['html_sha256']:
            raise CommandError('issue.html does not match the sha256 in issue.json; push the issue again')

        campaign = self.existing(manifest['title'])
        if campaign and campaign['status'] != 'save':
            raise CommandError(f"a campaign titled {manifest['title']!r} is already {campaign['status']}; not touching it")
        if campaign and not replace:
            raise CommandError(f"a draft titled {manifest['title']!r} exists; pass --replace to overwrite it")
        details = {'subject_line': manifest['subject'], 'preview_text': manifest['preview'], 'title': manifest['title'],
                   'from_name': manifest['from_name'], 'reply_to': manifest['reply_to']}
        if campaign:
            mailchimp._request('PATCH', f"/campaigns/{campaign['id']}", {'settings': details})
        else:
            campaign = mailchimp._request('POST', '/campaigns', {
                'type': 'regular', 'recipients': {'list_id': settings.MAILCHIMP_AUDIENCE_ID}, 'settings': details})
        mailchimp._request('PUT', f"/campaigns/{campaign['id']}/content", {'html': html})
        self.stdout.write(f"draft ready: {manifest['title']} ({manifest['bytes']} bytes, "
                          f"{len(manifest['signs_included'])}/12 signs)")
        if manifest['signs_missing']:
            self.stdout.write('  readers of these signs get the missing-reading panel: ' + ', '.join(manifest['signs_missing']))

        checklist = mailchimp._request('GET', f"/campaigns/{campaign['id']}/send-checklist")
        for item in checklist.get('items', []):
            if item.get('type') != 'success':
                self.stdout.write(f"  {item.get('type', '?').upper()}: {item.get('heading', '')} {item.get('details', '')}".rstrip())
        self.stdout.write('Mailchimp checklist: ' + ('ready to send' if checklist.get('is_ready') else 'NOT ready to send'))

        members = mailchimp._request('GET', f'/lists/{settings.MAILCHIMP_AUDIENCE_ID}',
                                     params={'fields': 'stats.member_count'})['stats']['member_count']
        monthly = round(members * SENDS_PER_MEMBER_PER_MONTH)
        self.stdout.write(f'audience: {members} subscribed; a weekly issue is about {monthly} sends a month '
                          f'of the free plan\'s {FREE_PLAN_MONTHLY_SENDS}')
        if members >= WARN_FROM_MEMBERS:
            self.stdout.write('  WARNING: the free plan carries a weekly newsletter to about 115 subscribers')

        if test:
            mailchimp._request('POST', f"/campaigns/{campaign['id']}/actions/test",
                               {'test_emails': [test], 'send_type': 'html'})
            self.stdout.write('test sent. A test shows the no-sign version whatever the recipient\'s sign: '
                              'Mailchimp does not fill merge fields in a test.')
        self.stdout.write(f"review and send it yourself: https://{settings.MAILCHIMP_SERVER}.admin.mailchimp.com/"
                          f"campaigns/edit?id={campaign.get('web_id', '')}")

    def existing(self, title):
        found = mailchimp._request('GET', '/campaigns', params={
            'list_id': settings.MAILCHIMP_AUDIENCE_ID, 'count': 1000, 'sort_field': 'create_time', 'sort_dir': 'DESC',
            'fields': 'campaigns.id,campaigns.web_id,campaigns.status,campaigns.settings.title'})
        for campaign in found.get('campaigns', []):
            if campaign.get('settings', {}).get('title') == title:
                return campaign
        return None
```

- [ ] **Step 6: Run the Django suites**

Run: `cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter accounts`
Expected: 89 tests, OK (78 existing and 11 new).

- [ ] **Step 7: Commit**

```bash
git add server/ishtar/newsletter/management/commands/draft_campaign.py server/ishtar/newsletter/tests/test_draft_campaign.py server/ishtar/newsletter/mailchimp.py server/ishtar/ishtar/settings.py
git commit -m "feat(newsletter): draft_campaign makes the Mailchimp draft, runs the checklist, can send one test"
```

---

### Task 6 (controller, with Glenn): Release, document, and send the first sample issue

Nothing in this task is automatic: a static release, a backend deploy, a test email and a real send each need Glenn's word at the time.

- [ ] **Step 1: Static delta release of `assets/newsletter/`** by the established procedure in `docs/deployment.md` (hardlink copy of the current release, `rm -f` then extract, sha256 gate on every file, a gate that the previous release is untouched). The directory is new, so there is nothing to `rm -f`; create it. Validate: `curl -s -o /dev/null -w '%{http_code}'` returns 200 for `masthead.jpg`, `moon-arc.jpg`, all twelve banners and all twelve glyphs.
- [ ] **Step 2: Backend deploy** by the documented `git archive` path and `sh /tmp/deploy-app.sh` (Task 5 changed `mailchimp.py`, `settings.py` and added the command). Health check `{"ok": true}`; run `sync_mailchimp` once by hand to prove `_request` still works.
- [ ] **Step 3: Build and preview.** `node tools/review_weekly_prose.cjs` and decide anything waiting; `node tools/build_newsletter.cjs --push`; open `output/newsletter/<monday>/preview.html` and read every sign.
- [ ] **Step 4: Draft and test.** On the VPS, as the service account with the environment loaded (the pattern of the `sync_mailchimp` cron line): `manage.py draft_campaign <monday> --test <Glenn's address>`. Read the checklist output.
- [ ] **Step 5: The client check the mockups could not do.** Glenn reads the test in Gmail (web, and the phone app in light and in dark mode), Apple Mail and Outlook. Record what each does to the colours. Fix in `build_newsletter.cjs`, rebuild, `--push`, `draft_campaign --replace --test`.
- [ ] **Step 6: Prove the sign branches.** In Mailchimp, preview the draft with live merge data as each of our own subscribers: each sees their own sign's section; a member with no sign sees the invitation.
- [ ] **Step 7: Glenn sends.** Afterwards: both inboxes got the right section; both unsubscribe links work (then resubscribe on the site).
- [ ] **Step 8: Document.** `docs/NEWSLETTER.md` gains "Building and drafting an issue (piece 3)": the commands in order, the exit codes, the review tool, what a test send can and cannot show, the free-plan ceiling (about 115 subscribers) and where the images live and how to re-roll one (`make_sign_art.cjs <sign> --force`, then `compose_sign_banners.cjs <sign>`, then a static release). `docs/deployment.md` gains the release and deploy entries with their validation. Commit.

---

## Self-Review

**Spec coverage.** Art and assets, star data and attribution: Tasks 1 and 2. Builder, fit-to-send rule, missing-sign panel, dated fallback subject, manifest, preview, push, 90 KB limit: Task 3. Refused corrections and the review tool: Task 4. `draft_campaign`, idempotency by title, checklist, audience warning, test send, no send path, the empty-reply fix the test endpoint needs: Task 5. Asset release, runbook, first sample issue, the dark-mode client check: Task 6. Out-of-scope items have no task.

**Departures from the spec, made while prototyping, to be written back into it:** the fixed-image script is Node (`build_newsletter_assets.cjs`), not PowerShell, because passing the zodiac characters to ImageMagick is reliable from Node; the masthead is 1200x430 and the moon arc 1200x170 (the cut line sits above the arc's centre moon); the builder has a sixth exit code for an over-size email.

**Dry run.** Every code block in Tasks 1, 3, 4 and 5 was run before this plan was written, in a throwaway worktree of `main`: JavaScript suite 669 of 669 (645 existing, 24 new), Django 89 of 89 (78 existing, 11 new). The builder produced a 40.5 KB campaign from the real issue of 2026-09-21. Task 2's scripts were run and their output looked at. A subagent that finds a block failing should suspect its transcription first.

**Type consistency.** `figures[sign]` is a list of polylines of `[ra, dec, mag]` in the builder script, the JSON, the compositor and the tests. `fitBlocks` returns `{week, overview, signs, missing, subjects, preview, suggested}` and `renderEmail`, `headline` and `previewPage` read only those. `issue.json`'s keys are the ones `draft_campaign` reads: `title, subject, preview, from_name, reply_to, bytes, signs_included, signs_missing, html_sha256`. `blocks` is exported by the proofreader in Task 4 and imported by the review tool in the same task.
