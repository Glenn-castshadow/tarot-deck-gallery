#!/usr/bin/env node
/* Writes the daily prose horoscope with the local Muse Glimmer model and, with --push, sends
   each day's file to the VPS. Design: docs/superpowers/specs/2026-09-17-daily-prose-design.md.
     node tools/write_daily_prose.cjs [--from YYYY-MM-DD] [--days 7] [--push] [--force]
        [--endpoint http://127.0.0.1:8088/v1] [--model muse-glimmer-30b-local] [--out output/daily-prose]
   Refuses to run unless the served model alias equals --model, so it can never publish another
   model's prose under Glimmer's name. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const engine = require('../daily-horoscope-engine.js');

const RULES = `You write one short daily horoscope paragraph for a website called Ishtar Insights. Reasoning strength: low.

You are given a fact sheet: the phase of the Moon, the sector of the reader's chart the Moon is in today, the exact aspects the Moon makes today to other planets with the sector each planet is in, and any planet that changes sign or turns direct or retrograde today, again with its sector. Write only from these facts. Invent nothing.

Shape, in this order, as one paragraph of 60 to 120 words in the second person:
1. One short sentence naming the mood of the day.
2. The mechanism, in plain words: the Moon in the given sector, the aspect verb, the planet, and the planet's sector, using the sector names exactly as given. Aspect verbs: is with (conjunction), sextiles, squares, trines, opposes. If there is no aspect, say where the Moon is and what the phase asks, and leave it at that. If the fact sheet marks a planet's rulerInvolved as true, call it "your ruling planet". If the ruler listed is the Moon itself, you may call the Moon your ruling planet. If an event is listed, weave it into the same paragraph in one sentence and name its sector.
3. One concrete consequence: a small, specific scene from ordinary life, not a generality.
4. One imperative sentence telling the reader what to do with the day.

Rules: plain, warm, dry, specific. No clock times, no degrees, no dates. Do not name any zodiac sign except the reader's own. Do not name any planet, aspect or event that is not in the fact sheet. Never use the word "will". No predictions, promises or guarantees. No medical, legal or financial advice. No em dashes, no headings, no lists, no emoji, no quotation marks. Output the paragraph only, nothing before or after it.`;

const EXAMPLE = `Example of the shape, written for a different day and a different sky:
Small talk turns useful. The Moon in your communication sector sextiles Venus in your friends-and-groups sector, and the person you keep meaning to message is the one who messages you first, with a question you can actually answer. Answer it properly, in more than one line, and let that be the day's one piece of real correspondence.`;

const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'];
const FORBIDDEN = ['you will', 'will happen', 'is going to', 'the answer is', 'luck', 'fortune'];

// null when the paragraph may be published, otherwise the reason it may not.
function validate(text, sheet) {
  if (typeof text !== 'string') return 'not a string';
  const t = text.trim();
  if (/\n/.test(t)) return 'more than one paragraph';
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 60 || words > 120) return `${words} words`;
  if (!/\bMoon\b/.test(t)) return 'does not mention the Moon';
  if (!t.includes(sheet.moonSector.name)) return `does not name ${sheet.moonSector.name}`;
  const lower = t.toLowerCase();
  for (const f of FORBIDDEN) if (lower.includes(f)) return `forbidden phrase: ${f}`;
  if (/\bwill\b/i.test(t)) return 'uses "will"';
  const allowed = new Set(['Moon', ...sheet.aspects.map(a => a.planet), ...sheet.events.map(e => e.body)]);
  for (const p of PLANETS) if (!allowed.has(p) && new RegExp(`\\b${p}\\b`).test(t)) return `names ${p}, which is not in the sheet`;
  for (const s of engine.signNames) if (s !== sheet.sign && new RegExp(`\\b${s}\\b`).test(t)) return `names ${s}`;
  if (t.includes('—')) return 'em dash';
  if (/\b\d{1,2}:\d{2}\b/.test(t)) return 'clock time';
  if (/\d\s*°|\b\d+\s*degrees?\b/i.test(t)) return 'degree';
  return null;
}

// The Moon's sign is deliberately withheld: the rules ban every sign name but the reader's own.
function buildMessages(sheet, moon) {
  const facts = {
    sign: sheet.sign, ruler: sheet.ruler, moonPhase: moon.phase, moonSector: sheet.moonSector.name,
    aspects: sheet.aspects.map(a => ({planet: a.planet, aspect: a.name, planetSector: a.planetSector.name, rulerInvolved: a.rulerInvolved})),
    events: sheet.events.map(e => ({body: e.body, what: e.detail, sector: e.sector.name, rulerInvolved: e.rulerInvolved}))
  };
  return [
    {role: 'system', content: `${RULES}\n\n${EXAMPLE}`},
    {role: 'user', content: `Fact sheet for ${sheet.sign}:\n${JSON.stringify(facts, null, 1)}\n\nWrite the paragraph: mood, mechanism, consequence, imperative.`}
  ];
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const o = {from: new Date().toISOString().slice(0, 10), days: 7, endpoint: 'http://127.0.0.1:8088/v1',
             model: 'muse-glimmer-30b-local', out: 'output/daily-prose', push: false, force: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--push' || a === '--force') o[a.slice(2)] = true;
    else if (a === '--days') o.days = Number(argv[++i]);
    else if (['--from', '--endpoint', '--model', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if (!Number.isInteger(o.days) || o.days < 1 || o.days > 31) throw new Error('--days must be 1 to 31');
  return o;
}

async function servedAlias(endpoint) {
  const res = await fetch(endpoint.replace(/\/v1\/?$/, '') + '/props');
  if (!res.ok) throw new Error(`/props returned ${res.status}`);
  return (await res.json()).model_alias || '';
}

async function complete(endpoint, model, messages) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, messages, temperature: 1.0, top_p: 0.95, top_k: 64, max_tokens: 700, stream: false})
  });
  if (!res.ok) throw new Error(`${res.status} from ${endpoint}/chat/completions`);
  const json = await res.json();
  return String(json.choices?.[0]?.message?.content || '').trim();
}

function push(day, file) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`refusing to push a malformed day: ${day}`);
  const remote = `/opt/tarot-game/daily/${day}.json`;
  execFileSync('ssh', ['vps', `mkdir -p /opt/tarot-game/daily && cat > ${remote}.tmp && mv -f ${remote}.tmp ${remote}`],
    {input: fs.readFileSync(file), stdio: ['pipe', 'inherit', 'inherit']});
  console.log(`${day}: pushed`);
}

async function main(argv) {
  const o = parseArgs(argv);
  const alias = await servedAlias(o.endpoint);
  if (alias !== o.model) { console.error(`Served model is "${alias}", not "${o.model}"; refusing to write.`); process.exit(2); }
  fs.mkdirSync(o.out, {recursive: true});
  for (let i = 0; i < o.days; i++) {
    const day = addDays(o.from, i), file = path.join(o.out, `${day}.json`);
    if (fs.existsSync(file) && !o.force) { console.log(`${day}: exists, skipped`); if (o.push) push(day, file); continue; }
    const sheet = engine.factSheet(day);
    const signs = {};
    for (const sg of sheet.signs) {
      let text = null, reason = '';
      for (let attempt = 1; attempt <= 3 && !text; attempt++) {
        let candidate;
        try { candidate = await complete(o.endpoint, o.model, buildMessages(sg, sheet.moon)); }
        catch (error) { reason = `request failed: ${error.message}`; console.warn(`${day} ${sg.sign} attempt ${attempt}: ${reason}`); continue; }
        reason = validate(candidate, sg);
        if (reason) console.warn(`${day} ${sg.sign} attempt ${attempt}: ${reason}`); else text = candidate;
      }
      if (text) signs[sg.sign.toLowerCase()] = text; else console.error(`${day} ${sg.sign}: omitted after 3 attempts (${reason})`);
    }
    fs.writeFileSync(file, JSON.stringify({day, generated: new Date().toISOString(), model: o.model, signs}, null, 1) + '\n');
    console.log(`${day}: ${Object.keys(signs).length}/12 signs written`);
    if (o.push) push(day, file);
  }
}

module.exports = {RULES, EXAMPLE, validate, buildMessages, parseArgs, addDays, main};
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error); process.exit(1); });
