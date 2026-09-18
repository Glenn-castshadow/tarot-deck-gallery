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

Shape, in this order, as one paragraph of 80 to 110 words in the second person:
1. One short sentence naming the mood or theme of the reader's day in plain words: how the day goes, or what it asks of them. It is a judgement about the day, not a scene; do not describe a place, the weather, traffic or the light.
2. The mechanism, in plain words, and in the same sentence its effect: the Moon in the given sector, the aspect verb, the planet in its sector, then "and" plus what that produces in the reader's day. Use the sector names exactly as given. Aspect verbs: is with (conjunction), sextiles, squares, trines, opposes. With two aspects, state both in one sentence or the second in the next. If there is no aspect, say where the Moon is and what the phase asks, and leave it at that; when an aspect is present do not name the phase. If the fact sheet marks a planet's rulerInvolved as true, call it "your ruling planet". If the ruler listed is the Moon itself, you may call the Moon your ruling planet. If an event is listed, weave it into the same paragraph in one sentence and name its sector.
3. One concrete scene that shows that effect, set in the area of life the sectors name: work for the career or daily-work sectors, home for the home sector, a message or a call for the communication sector, a bill or a price for the money sectors, and so on. Let the thing, the person or the event act; do not report that the reader notices, hears, rereads or finds themselves doing something. Commit to one object and one person; never offer alternatives joined by "or". Do not give people names and do not assume relatives: say a friend, a colleague, someone at home, or a partner when the partnership sector is involved. Do not use the device of something becoming clearer, smaller or easier by being said out loud.
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
  // The ceiling is a runaway guard, not the target (RULES asks for 80 to 110): naming two aspects
  // and an event with long sector names spends about 50 words before the scene, and a 120 cap
  // dropped Taurus from 2026-09-23 after three attempts.
  if (words < 60 || words > 300) return `${words} words`;
  if (!/[.!?]$/.test(t)) return 'does not end in a full sentence';
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

// Each sign is a separate request with no view of the others, so variety across a day's twelve
// paragraphs is rotated in by sign rather than asked for: the opening kind and where the
// consequence scene is set differ from sign to sign.
const OPENINGS = ['how the day goes', 'what the day asks of the reader', 'a noun phrase naming the day\'s theme', 'a plain verdict on one part of the day'];
const SETTINGS = ['the area of life named by the Moon\'s sector', 'the area of life named by the other planet\'s sector, or the Moon\'s if there is no aspect'];

// The Moon's sign is deliberately withheld: the rules ban every sign name but the reader's own.
function buildMessages(sheet, moon) {
  const facts = {
    sign: sheet.sign, ruler: sheet.ruler, moonPhase: moon.phase, moonSector: sheet.moonSector.name,
    aspects: sheet.aspects.map(a => ({planet: a.planet, aspect: a.name, planetSector: a.planetSector.name, rulerInvolved: a.rulerInvolved})),
    events: sheet.events.map(e => ({body: e.body, what: e.detail, sector: e.sector.name, rulerInvolved: e.rulerInvolved}))
  };
  const i = Math.max(0, engine.signNames.indexOf(sheet.sign));
  return [
    {role: 'system', content: `${RULES}\n\n${EXAMPLE}`},
    {role: 'user', content: `Fact sheet for ${sheet.sign}:\n${JSON.stringify(facts, null, 1)}\n\nWrite the paragraph: mood, mechanism, consequence, imperative. Open with ${OPENINGS[i % OPENINGS.length]}. Set the scene in ${SETTINGS[i % SETTINGS.length]}.`}
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
  // max_tokens 1500: Glimmer's reasoning_content runs 300-400 tokens before it starts the paragraph;
  // 700 was too tight and let reasoning alone exhaust the budget, leaving content empty or truncated
  // mid-sentence (observed 2026-09-17). 1500 leaves headroom for reasoning plus a full 120-word paragraph.
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, messages, temperature: 1.0, top_p: 0.95, top_k: 64, max_tokens: 1500, stream: false})
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
