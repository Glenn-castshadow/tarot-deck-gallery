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
