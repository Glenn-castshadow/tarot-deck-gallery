#!/usr/bin/env node
/* Corrects one generated illustration by giving OpenAI's image edit API the existing PNG and an
   instruction, so the style and composition are kept and only the named fault changes (used for cards that
   show the wrong number of suit objects). The original moves to a rejected/ folder beside it; a record of
   the instruction and usage goes to <deck>/generation-records/. The key is read from OPENAI_API_KEY and is
   never printed or written anywhere.
     node tools/edit_card_art.cjs <path-to-raw.png> "<instruction>" [--quality medium|high] [--keep]
   --keep writes <name>-candidate.png beside the original instead of replacing it. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const [file, instruction] = args.filter(a => !a.startsWith('--') && a !== 'medium' && a !== 'high');
const quality = args.includes('--quality') ? args[args.indexOf('--quality') + 1] : 'high';
const keep = args.includes('--keep');
if (!file || !instruction) { console.error('usage: node tools/edit_card_art.cjs <raw.png> "<instruction>" [--quality q] [--keep]'); process.exit(2); }

const PREAMBLE = 'Edit this tarot card illustration. Keep the same painting style, palette, lighting, figure, pose, background and composition; change only what the instruction names, and blend the change in so it looks original to the painting. The result must contain no text, letters, numbers, watermark, border or frame. Instruction: ';

(async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const source = path.resolve(file);
  const send = async extra => {
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', PREAMBLE + instruction);
    form.append('size', '1024x1536');
    form.append('quality', quality);
    form.append('n', '1');
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    form.append('image', new Blob([fs.readFileSync(source)], {type: 'image/png'}), path.basename(source));
    return fetch('https://api.openai.com/v1/images/edits', {method: 'POST', headers: {authorization: `Bearer ${process.env.OPENAI_API_KEY}`}, body: form});
  };
  const t0 = Date.now();
  let res = await send({input_fidelity: 'high'});
  if (res.status === 400) res = await send({}); // a model that does not take input_fidelity
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ? `${json.error.code || res.status}: ${json.error.message}` : `HTTP ${res.status}`);
  const png = Buffer.from(json.data[0].b64_json, 'base64');
  const dir = path.dirname(source), stem = path.basename(source, '.png');
  let out = source;
  if (keep) out = path.join(dir, `${stem}-candidate.png`);
  else {
    fs.mkdirSync(path.join(dir, 'rejected'), {recursive: true});
    fs.renameSync(source, path.join(dir, 'rejected', `${stem}-${Date.now()}.png`));
  }
  fs.writeFileSync(out, png);
  const records = path.join(dir, '..', 'generation-records');
  fs.mkdirSync(records, {recursive: true});
  fs.writeFileSync(path.join(records, `${stem}-edit-${Date.now()}.json`),
    JSON.stringify({file: path.basename(out), model: 'gpt-image-2', quality, usage: json.usage || {}, made_at: new Date().toISOString(), instruction}, null, 1));
  console.log(`${path.basename(out)}: ${((Date.now() - t0) / 1000).toFixed(0)}s, ${(png.length / 1024).toFixed(0)} KB, ${(json.usage || {}).output_tokens || '?'} output tokens`);
})().catch(error => { console.error(error.message); process.exit(1); });
