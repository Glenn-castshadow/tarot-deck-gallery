#!/usr/bin/env node
/* Generates a reading deck's 78 fronts and its back with OpenAI's image API, from
   deck-art/<deck>/scenes.json (a style preamble, one scene per card, a back). Writes
   deck-art/<deck>/generation-plan.json in the shape tools/build_companion_decks.py reads, the PNGs to
   raw-fronts/ and raw-backs/ (git-ignored natives), and one record per image to generation-records/.
   Resumable: an image that exists is skipped. The key is read from OPENAI_API_KEY and is never printed
   or written anywhere.
     node tools/make_deck_art.cjs <deck>                 everything still missing
     node tools/make_deck_art.cjs <deck> --only 13,45    just these indices (78 is the back)
     node tools/make_deck_art.cjs <deck> --only 13 --force   redo; the old image moves to rejected/
     --limit N   stop after N images      --quality low|medium|high (default medium)
     --max-output-tokens N   spending guard: stop starting new images once the run has used this many
                             image output tokens (default 375000) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const TarotReference = require('../tarot-reference.js');
const {majorArcana} = require('../birth-lore.js');

const args = process.argv.slice(2);
const deck = args.find(a => !a.startsWith('--') && !/^[\d,]+$/.test(a));
const flag = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const only = flag('only') ? flag('only').split(',').map(Number) : null;
const force = args.includes('--force');
const limit = flag('limit') ? Number(flag('limit')) : Infinity;
const quality = flag('quality') || 'medium';
const tokenCap = Number(flag('max-output-tokens') || 375000);
const MODEL = 'gpt-image-2', SIZE = '1024x1536', CONCURRENCY = 3;

if (!deck) { console.error('usage: node tools/make_deck_art.cjs <deck> [--only i,j] [--force] [--limit N] [--quality q]'); process.exit(2); }
const base = path.join(ROOT, 'deck-art', deck);
const spec = JSON.parse(fs.readFileSync(path.join(base, 'scenes.json'), 'utf8'));
if (spec.scenes.length !== 78) throw new Error(`${deck}: scenes.json holds ${spec.scenes.length} scenes, expected 78`);

const slugOf = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cards = spec.scenes.map((scene, i) => {
  const name = TarotReference.name(i);
  const category = i < 22 ? 'major' : TarotReference.SUITS[Math.floor((i - 22) / 14)].toLowerCase();
  const suitLine = category === 'major' ? '' : ` ${spec.suit_objects[category]}`;
  return {deck, index: i, number: i < 22 ? majorArcana[i].number : TarotReference.RANKS[(i - 22) % 14], name, category,
    file: `deck-art/${deck}/raw-fronts/${String(i).padStart(2, '0')}-${slugOf(name)}.png`,
    prompt: `${spec.style}${suitLine}\nCard: ${name.toUpperCase()}.\nScene: ${scene}`};
});
cards.push({deck, index: 78, number: '', name: 'Card back', category: 'back',
  file: `deck-art/${deck}/raw-backs/back.png`, prompt: `${spec.back_style}\nDesign: ${spec.back}`});
fs.writeFileSync(path.join(base, 'generation-plan.json'),
  JSON.stringify({tool: `OpenAI images API, ${MODEL}, ${SIZE}, quality ${quality}`, cards}, null, 2) + '\n');

let usedTokens = 0, made = 0, failed = [];
async function make(card) {
  const out = path.join(ROOT, card.file);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  const recordDir = path.join(base, 'generation-records');
  fs.mkdirSync(recordDir, {recursive: true});
  const t0 = Date.now();
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: {'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}`},
      body: JSON.stringify({model: MODEL, prompt: card.prompt, size: SIZE, quality, n: 1})
    });
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 8000 * attempt)); continue; }
    const json = await res.json();
    if (!res.ok) {
      // A refused prompt (400) is recorded and skipped; the run carries on with the other cards.
      const message = json.error ? `${json.error.code || res.status}: ${json.error.message}` : `HTTP ${res.status}`;
      fs.writeFileSync(path.join(recordDir, `${String(card.index).padStart(2, '0')}-error.json`), JSON.stringify({index: card.index, name: card.name, error: message, prompt: card.prompt}, null, 1));
      failed.push(`${card.index} ${card.name}: ${message}`);
      return;
    }
    if (fs.existsSync(out)) {
      const rejected = path.join(path.dirname(out), 'rejected');
      fs.mkdirSync(rejected, {recursive: true});
      fs.renameSync(out, path.join(rejected, `${path.basename(out, '.png')}-${Date.now()}.png`));
    }
    fs.writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'));
    const usage = json.usage || {};
    usedTokens += usage.output_tokens || 0;
    made++;
    fs.writeFileSync(path.join(recordDir, `${String(card.index).padStart(2, '0')}-${slugOf(card.name)}.json`),
      JSON.stringify({index: card.index, name: card.name, model: MODEL, size: SIZE, quality, usage, made_at: new Date().toISOString(), prompt: card.prompt}, null, 1));
    console.log(`${String(card.index).padStart(2, '0')} ${card.name}: ${((Date.now() - t0) / 1000).toFixed(0)}s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${usage.output_tokens || '?'} output tokens`);
    return;
  }
  failed.push(`${card.index} ${card.name}: gave up after retries`);
}

(async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const queue = cards.filter(card => (only ? only.includes(card.index) : true) && (force || !fs.existsSync(path.join(ROOT, card.file)))).slice(0, limit);
  console.log(`${deck}: ${queue.length} to make (${MODEL}, ${SIZE}, ${quality})`);
  const workers = Array.from({length: CONCURRENCY}, async () => {
    while (queue.length) {
      if (usedTokens >= tokenCap) { console.log(`spending guard: ${usedTokens} output tokens used, cap ${tokenCap}; not starting more`); return; }
      await make(queue.shift());
    }
  });
  await Promise.all(workers);
  console.log(`made ${made}, failed ${failed.length}, image output tokens this run ${usedTokens}`);
  failed.forEach(line => console.log(`FAILED ${line}`));
  process.exit(failed.length ? 1 : 0);
})().catch(error => { console.error(error.message); process.exit(1); });
