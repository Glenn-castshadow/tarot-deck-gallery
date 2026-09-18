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

// The site's target is 250 to 300 words. The brief asks for 280 to 320 because Glimmer lands about a
// tenth under the figure it is given (measured 2026-09-18: asked 260 to 300, median 255).
const RULES = `You write one daily horoscope for a website called Ishtar Insights. Reasoning strength: low.

You are given a fact sheet: the phase of the Moon, the sector of the reader's chart the Moon is in today, the exact aspects the Moon makes today to other planets with the sector each planet is in, and any planet that changes sign or turns direct or retrograde today, again with its sector. Write only from these facts. Invent nothing about the sky.

Length and layout: 280 to 320 words in the second person and the present tense, as exactly three paragraphs separated by one blank line. No line breaks inside a paragraph. Drafts tend to come out short: reach at least 280 words, and make up the length in the scene and the advice, not by repeating the sky.

Paragraph one, the sky, 85 to 105 words:
- Open with one short sentence naming the mood or theme of the reader's day in plain words: how the day goes, or what it asks of them. It is a judgement about the day, not a scene; do not describe a place, the weather, traffic or the light.
- Then the mechanism and, in the same sentence, its effect: the Moon in the given sector, the aspect verb, the planet in its sector, then "and" plus what that produces in the reader's day. Use the sector names exactly as given, once each; after that refer to the area of life in ordinary words (work, home, money, friends). Aspect verbs: is with (conjunction), sextiles, squares, trines, opposes. With two aspects, state both in one sentence or the second in the next. If the fact sheet marks a planet's rulerInvolved as true, call it "your ruling planet". If the ruler listed is the Moon itself, you may call the Moon your ruling planet. If an event is listed, give it one sentence and name its sector. If there is no aspect, say where the Moon is and leave it at that.
- Close the paragraph with one sentence on which of these pulls is the stronger one today, or how they fit together.

Paragraph two, the scene, 130 to 150 words:
One concrete scene that shows that effect, set in the area of life the sectors name: work for the career or daily-work sectors, home for the home sector, a message or a call for the communication sector, a bill or a price for the money sectors, and so on. Give it a beginning, a turn and an end: what arrives, what the other person does next, and the last thing they say or do. End the scene on that person's action, never on an object that stays, sits, waits or remains open. Let the thing, the person or the event act; do not report that the reader notices, hears, rereads or finds themselves doing something. Commit to one object and one person and stay with them for the whole paragraph; never offer alternatives joined by "or". Do not give people names and do not assume relatives: say a friend, a colleague, someone at home, or a partner only when the partnership sector or the shared-money-and-intimacy sector is in the fact sheet. Do not use the device of something becoming clearer, smaller or easier by being said out loud. Everything in the scene happens now, in the present tense: people in it speak about what is in front of them, not about what comes later, and nothing is promised, planned or scheduled. Do not mention the sky in this paragraph.

Paragraph three, the advice, 80 to 95 words:
Name the Moon's phase as given, in lower case, and say in one sentence what that phase suits: a waxing Moon suits building and adding, a full Moon suits seeing a thing whole, a first quarter suits deciding and acting, a last quarter suits revising, a waning Moon suits finishing and clearing, a new Moon suits starting small. Then say how to handle the day's pull in practical terms, three or four sentences, tied to the scene's area of life. End with one short imperative sentence.

Rules: plain, warm, dry, specific. Short and medium sentences; no sentence over 35 words except the mechanism. No clock times, no degrees, no dates. Do not name any zodiac sign except the reader's own. Do not name any planet, aspect or event that is not in the fact sheet. Never use the word "will" anywhere, including inside the scene. No predictions, promises or guarantees. No medical, legal or financial advice. No em dashes, no headings, no lists, no emoji, no quotation marks. Output the three paragraphs only, nothing before or after them.`;

const EXAMPLE = `Example of the shape, written for a different day and a different sky:
Small talk turns useful today. The Moon in your communication sector sextiles Venus in your friends-and-groups sector, and the easy traffic of messages carries one that matters more than it looks. Nothing else in the sky leans on you, so this is the whole of the day's weather: light, sociable and quick. The pull toward friends is the stronger of the two, and the talk is only the road it travels on.

A friend you have been meaning to write to for a month writes first. The message is short and has a real question in it, about a flat they are thinking of taking and whether the street is as loud as they remember. You lived two doors down for three years. The rent is higher than it was in your day and the door has been painted green. The friend sends a second message before you have answered the first, with a photograph of the front door and the rent, and then a third that says no rush, the viewing is on Saturday. Nobody else they know has lived on that street, and the friend says so in a fourth message, with your old house number in it.

The Moon is a waxing crescent, which suits adding to something that has already begun. A friendship that has run on good intentions for a month counts as begun. Give the answer the length it deserves: the noise, the neighbours, the damp in the back room, the good bakery. Do not save it for the evening, when it turns into a chore and comes out as two lines and an apology. Say what you would want to be told if the keys were about to be yours. Write back properly, in more than one line.`;

const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'];
const FORBIDDEN = ['you will', 'will happen', 'is going to', 'the answer is', 'luck', 'fortune'];

// null when the paragraph may be published, otherwise the reason it may not.
function validate(text, sheet) {
  if (typeof text !== 'string') return 'not a string';
  const t = text.trim();
  const blocks = t.split(/\n[ \t]*\n/);
  if (blocks.length > 3 || blocks.some(b => /\n/.test(b))) return 'not up to three paragraphs separated by a blank line';
  const words = t.split(/\s+/).filter(Boolean).length;
  // The brief asks for 250 to 300. The bounds are wider on purpose: a 180-word reading is still
  // better than the template fallback, and a 120 ceiling once dropped Taurus from 2026-09-23.
  if (words < 150 || words > 350) return `${words} words`;
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
// Left to itself the model seats every scene at a kitchen table (6 of 12 on 2026-09-18). Thirteen
// places, so the rotation by sign and day never falls into step with the twelve signs.
const PLACES = ['on a doorstep', 'in a parked car', 'in a corridor', 'out on a walk', 'over the phone', 'in a queue', 'on a staircase',
  'at a bus stop', 'in a lift', 'on a bench outside', 'by an open window', 'in a car park', 'at a front gate'];
const SETTINGS = ['the area of life named by the Moon\'s sector', 'the area of life named by the other planet\'s sector, or the Moon\'s if there is no aspect'];

// The Moon's sign is deliberately withheld: the rules ban every sign name but the reader's own.
function buildMessages(sheet, moon, day = '1970-01-01') {
  const facts = {
    sign: sheet.sign, ruler: sheet.ruler, moonPhase: moon.phase, moonSector: sheet.moonSector.name,
    aspects: sheet.aspects.map(a => ({planet: a.planet, aspect: a.name, planetSector: a.planetSector.name, rulerInvolved: a.rulerInvolved})),
    events: sheet.events.map(e => ({body: e.body, what: e.detail, sector: e.sector.name, rulerInvolved: e.rulerInvolved}))
  };
  const i = Math.max(0, engine.signNames.indexOf(sheet.sign));
  const place = PLACES[(i + Math.round(Date.parse(day) / 864e5)) % PLACES.length];
  return [
    {role: 'system', content: `${RULES}\n\n${EXAMPLE}`},
    {role: 'user', content: `Fact sheet for ${sheet.sign}:\n${JSON.stringify(facts, null, 1)}\n\nWrite the three paragraphs: sky, scene, advice. Open with ${OPENINGS[i % OPENINGS.length]}. Set the scene in ${SETTINGS[i % SETTINGS.length]}, and have it happen ${place}.`}
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
  // max_tokens 2500: Glimmer's reasoning_content runs 300-400 tokens before it starts writing;
  // 700 was too tight and let reasoning alone exhaust the budget, leaving content empty or truncated
  // mid-sentence (observed 2026-09-17). 2500 leaves headroom for reasoning plus a full 350-word reading.
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, messages, temperature: 1.0, top_p: 0.95, top_k: 64, max_tokens: 2500, stream: false})
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
    // A sign omitted after three attempts is a gap, not a verdict: the next run over the same window
    // keeps what the file has and writes only the signs it lacks.
    let kept = {};
    if (fs.existsSync(file) && !o.force) { try { kept = JSON.parse(fs.readFileSync(file, 'utf8')).signs || {}; } catch { kept = {}; } }
    if (Object.keys(kept).length === 12) { console.log(`${day}: exists, skipped`); if (o.push) push(day, file); continue; }
    const sheet = engine.factSheet(day);
    const signs = {};
    for (const sg of sheet.signs) {
      if (typeof kept[sg.sign.toLowerCase()] === 'string') { signs[sg.sign.toLowerCase()] = kept[sg.sign.toLowerCase()]; continue; }
      let text = null, reason = '';
      for (let attempt = 1; attempt <= 3 && !text; attempt++) {
        let candidate;
        try { candidate = await complete(o.endpoint, o.model, buildMessages(sg, sheet.moon, day)); }
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

module.exports = {RULES, EXAMPLE, PLACES, validate, buildMessages, parseArgs, addDays, main};
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error); process.exit(1); });
