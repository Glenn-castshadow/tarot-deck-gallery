#!/usr/bin/env node
/* Writes the newsletter's weekly issue text with the local Muse Glimmer model: twelve sign
   readings, one overview, three subject lines and a preview. Design:
   docs/superpowers/specs/2026-09-18-newsletter-weekly-reading-design.md.
     node tools/write_weekly_prose.cjs [--week YYYY-MM-DD] [--force]
        [--endpoint http://127.0.0.1:8088/v1] [--model muse-glimmer-30b-local] [--out output/weekly-prose]
   --week must be a Monday; the default is the next Monday on or after today (UTC). Nothing is
   pushed anywhere: piece 3 reads the file from this machine. tools/proof_weekly_prose.cjs
   proofreads it afterwards under Qwen. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../daily-horoscope-engine.js');
const {commonProblems, addDays, servedAlias, complete} = require('./write_daily_prose.cjs');

const SN = engine.sectorNames;

// The briefs ask for a little more than the validators' floor: Glimmer lands about a tenth under
// the figure it is given (measured on the daily writer, 2026-09-18).
const RULES_SIGN = `You write one sign's weekly reading for an email newsletter called Ishtar Insights. Reasoning strength: low.

You are given a fact sheet for the coming week, Monday to Sunday: whether the Moon is waxing or waning as the week opens; the sector of the reader's chart that the Sun, Mercury, Venus and Mars are in as the week opens (and the reader's ruling planet, marked ruler), where a placement marked until holds only until that weekday, when the matching event moves the planet on, and every other placement holds all week; and the week's events, each with its weekday and the sector it falls in. Write only from these facts. Invent nothing about the sky.

Length and layout: 170 to 200 words in the second person and the present tense, as exactly two paragraphs separated by one blank line. No line breaks inside a paragraph.

Paragraph one, the shape of the week, 85 to 100 words: open with one plain sentence on what the week is for. Then say where the Sun opens the week for this reader, using the sector name exactly as given, and what that puts first; use one other placement if it helps, and call a planet marked ruler "your ruling planet". If a placement you mention is marked until, say until which weekday it holds. Say whether the Moon is waxing or waning and what that suits: a waxing Moon suits building and adding, a waning Moon suits finishing and clearing. Close on one concrete thing to do early in the week.

Paragraph two, the days that matter, 85 to 100 words: take the one or two most important events, name the weekday and the sector exactly as given, and say in practical terms what each day is good for. An event marked rulerInvolved matters most. If there are no events, say once, in your own words, that the week is a steady one, and give the rest of the paragraph to what a steady week is good for in the areas of life the planets are in. End with one short imperative sentence.

Rules: plain, warm, dry, specific. Short and medium sentences. Present tense throughout, with no future tense anywhere. The reader has never seen the fact sheet: speak of the Sun, the Moon, the planets and the days of the week, in a reader's words. Use each sector name exactly as given, once; after that say the area of life in ordinary words. Name no zodiac sign except the reader's own. Name no planet or event that is not in the fact sheet. No clock times, degrees or dates; weekdays only, and the only weekdays you name are Monday and the ones in the fact sheet. No predictions, promises or guarantees. No medical, legal or financial advice. No dashes used as punctuation, no headings, lists, emoji or quotation marks. Output the two paragraphs only.`;

const EXAMPLE_SIGN_SHEET = {
  sign: 'Taurus', ruler: 'Venus',
  backdrop: {moon: 'waning', placements: [
    {body: 'Sun', sector: {house: 5, name: SN[4]}, ruler: false}, {body: 'Mercury', sector: {house: 6, name: SN[5]}, ruler: false},
    {body: 'Venus', sector: {house: 5, name: SN[4]}, ruler: true, until: 'Thursday'}, {body: 'Mars', sector: {house: 3, name: SN[2]}, ruler: false}]},
  events: [
    {weekday: 'Thursday', kind: 'ingress', body: 'Venus', detail: 'enters a new sign', sector: {house: 6, name: SN[5]}, rulerInvolved: true},
    {weekday: 'Sunday', kind: 'phase', body: 'Moon', detail: 'New moon', sector: {house: 5, name: SN[4]}, rulerInvolved: false}]
};

const EXAMPLE_SIGN = `This is a week for finishing the enjoyable thing you started and then putting your days in better order. The Sun opens the week in ${SN[4]}, and Venus, your ruling planet, keeps it company there until Thursday, so what you make for pleasure counts for more than what you owe. The Moon is waning as the week opens, which suits completing over beginning. Pick the half-done project that still makes you smile, the song, the garden bed, the letter to someone you like, and give it the first three evenings. It is lighter on Monday than it is by the weekend.

On Thursday Venus, your ruling planet, enters ${SN[5]}, and the ordinary machinery of the week starts to feel kinder: a colleague is easier to ask, a routine is easier to change, and the body answers well to small, regular care. On Sunday the New moon falls in ${SN[4]}, a clean line under what you finished and a quiet place to begin the next thing. Keep Thursday for one practical change to how your days run. Keep Sunday small, and start something only because you want to.`;

const RULES_OVERVIEW = `You write the opening section of a weekly email newsletter called Ishtar Insights, read by people of every zodiac sign. Reasoning strength: low.

You are given the coming week's facts, Monday to Sunday: whether the Moon is waxing or waning as the week opens, the zodiac sign the Sun, Mercury, Venus and Mars are in as the week opens (a placement marked until changes on that weekday), and the week's events, each with its weekday and zodiac sign. Write only from these facts. Invent nothing about the sky.

Length and layout: 140 to 170 words, second person, present tense, exactly two paragraphs separated by one blank line. No line breaks inside a paragraph.

Paragraph one: one plain sentence on the character of the week, then the Sun's sign and the Moon's direction and what the early days suit. Paragraph two: the week's events in order, each with its weekday, said the way the fact sheet says it, and what that day is good for. With fewer than two events, say the week is steady and how to use that. End with one short imperative sentence.

Rules: plain, warm, dry, specific. Present tense throughout, with no future tense anywhere. The reader has never seen the fact sheet: speak of the Sun, the Moon, the planets and the days of the week, in a reader's words. This section is for every sign, so say nothing about houses or sectors of a chart. Name only the zodiac signs and planets in the fact sheet. No clock times, degrees or dates; weekdays only, and the only weekdays you name are Monday and the ones in the fact sheet. No predictions, promises or guarantees. No medical, legal or financial advice. No dashes used as punctuation, no headings, lists, emoji or quotation marks. Output the two paragraphs only.`;

const EXAMPLE_SHEET = {
  from: '2026-09-07', to: '2026-09-14',
  backdrop: {moon: 'waning', placements: [{body: 'Sun', sign: 'Virgo'}, {body: 'Mercury', sign: 'Virgo'}, {body: 'Venus', sign: 'Virgo', until: 'Thursday'}, {body: 'Mars', sign: 'Cancer'}]},
  events: [
    {weekday: 'Thursday', kind: 'ingress', body: 'Venus', detail: 'enters a new sign', sign: 'Libra'},
    {weekday: 'Sunday', kind: 'phase', body: 'Moon', detail: 'New moon', sign: 'Virgo'}]
};

const EXAMPLE_OVERVIEW = `The week turns on its weekend. The Sun is in Virgo as Monday opens and the Moon is waning, so the first days suit tidying: finish what is already on the table, send the overdue reply, and leave the grand new scheme in its drawer for now. Nothing in the sky pushes hard before Thursday, and a quiet start is a gift if you use it to clear ground.

On Thursday Venus enters a new sign, moving into Libra, and the tone between people softens; conversations that stalled last week move again, and a small courtesy goes further than an argument. Then on Sunday the New moon arrives in Virgo, the cleanest starting line of the month. Choose one thing to begin, make it modest and practical, and write it down where you can see it. Keep the plan small enough to start the same day.`;

const RULES_SUBJECTS = `You write subject lines for a weekly email newsletter called Ishtar Insights. Reasoning strength: low.

You are given the coming week's facts and the newsletter's opening section. Reply with one JSON object and nothing else: {"subjects": [three strings], "preview": string}.

Each subject is one line of 30 to 55 characters that says what the week is like or what to do with it, in plain words, the way a friend would title an email. The three take different angles. The preview is one sentence of 50 to 100 characters that adds to the subject instead of repeating it.

Rules: sentence case. Present tense, with no future tense. The email goes to readers of every sign, so name no zodiac sign in a subject; the preview may name a sign from the fact sheet. Name only planets from the fact sheet. No exclamation marks, no words in capitals, no emoji, no quotation marks inside the strings, no dashes used as punctuation, no promises. The only weekdays you name are Monday and the ones in the fact sheet.`;

// The model copies the example's phrasing (probe, 2026-09-18: two of three lines were the example
// with the nouns swapped), so the example rotates by week and no two weeks running copy the same one.
const EXAMPLE_SUBJECTS_SETS = [
  {subjects: ['A quiet start, then Venus changes the mood', "Clear the desk before Sunday's New moon", 'This week: finish first, begin on Sunday'],
   preview: 'The Sun in Virgo, a waning Moon, and a good day to ask a favour.'},
  {subjects: ['What Thursday changes, and what it leaves alone', 'Small completions count for more than big plans', 'Tidy up now, the fresh page arrives on Sunday'],
   preview: 'Venus moves on Thursday, and the New moon closes the week in Virgo.'},
  {subjects: ['A steady week with a soft landing at the end','Less starting and more finishing, until Sunday', 'The mood between people softens after midweek'],
   preview: 'A waning Moon for most of the week, then a New moon on Sunday to begin again.'}
].map(set => JSON.stringify(set));
const EXAMPLE_SUBJECTS = EXAMPLE_SUBJECTS_SETS[0];

function twoParagraphs(text, min, max) {
  if (typeof text !== 'string') return 'not a string';
  const t = text.trim(), blocks = t.split(/\n[ \t]*\n/);
  if (blocks.length !== 2 || blocks.some(b => /\n/.test(b))) return 'not exactly two paragraphs separated by a blank line';
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < min || words > max) return `${words} words`;
  if (!/[.!?]$/.test(t)) return 'does not end in a full sentence';
  return null;
}

// Words that belong to the fact sheet, not to the reader (probe: "the placements stay steady").
const SHEET_WORDING = /\bplacements?\b|\bfact sheet\b|\bis (full|new) moon\b/i;
const SHEET_WORDING_REASON = 'fact-sheet wording: the reader has never seen the fact sheet';

// A weekday in the text tells the reader that day matters, so it must be one the sheet gives: an
// event's day, the day a placement ends, or Monday, when the week opens. Probe, 2026-09-18: three
// readings set a deadline "before Wednesday" in weeks where nothing happens on a Wednesday.
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function strayWeekday(t, events, placements) {
  const allowed = new Set(['Monday', ...events.map(e => e.weekday), ...placements.filter(p => p.until).map(p => p.until)]);
  const stray = WEEKDAY_NAMES.find(day => !allowed.has(day) && new RegExp(`\\b${day}s?\\b`, 'i').test(t));
  return stray ? `names ${stray}, which is not a day in the sheet` : null;
}

// A placement marked `until` ends mid-week. Catch a sentence that names that planet and claims the week.
function overstays(t, placements) {
  const ending = placements.filter(p => p.until);
  if (!ending.length) return null;
  for (const sentence of t.split(/(?<=[.!?])\s+/)) {
    if (!/\ball (seven days|week)\b|\bwhole week\b|\bthroughout the week\b|\bthe entire week\b/i.test(sentence)) continue;
    const p = ending.find(p => new RegExp(`\\b${p.body}\\b`).test(sentence));
    if (p) return `says ${p.body} stays all week, but its placement ends on ${p.until}`;
  }
  return null;
}

// Each validator returns null when the block may be published, otherwise the reason it may not.
function validateSign(text, sg) {
  const shape = twoParagraphs(text, 120, 230);
  if (shape) return shape;
  const t = text.trim();
  const sectors = [...sg.backdrop.placements.map(p => p.sector.name), ...sg.events.map(e => e.sector.name)];
  if (!sectors.some(n => t.includes(n))) return 'names no sector from the sheet';
  if (sg.events.length && !sg.events.some(e => t.includes(e.weekday))) return 'names no weekday from the sheet';
  const bodies = new Set(['Moon', ...sg.backdrop.placements.map(p => p.body), ...sg.events.map(e => e.body)]);
  if (SHEET_WORDING.test(t)) return SHEET_WORDING_REASON;
  const stray = strayWeekday(t, sg.events, sg.backdrop.placements);
  if (stray) return stray;
  const overstay = overstays(t, sg.backdrop.placements);
  if (overstay) return overstay;
  return commonProblems(t, bodies, new Set([sg.sign]));
}

const sheetBodies = sheet => new Set(['Moon', ...sheet.backdrop.placements.map(p => p.body), ...sheet.events.map(e => e.body)]);
const sheetSigns = sheet => new Set([...sheet.backdrop.placements.map(p => p.sign), ...sheet.events.map(e => e.sign)]);

function validateOverview(text, sheet) {
  const shape = twoParagraphs(text, 120, 200);
  if (shape) return shape;
  const t = text.trim(), lower = t.toLowerCase();
  const named = sheet.events.filter(e => (e.kind !== 'ingress' && lower.includes(e.detail.toLowerCase())) || (t.includes(e.body) && t.includes(e.weekday))).length;
  const need = Math.min(2, sheet.events.length);
  if (named < need) return `names ${named} of the week's events, needs ${need}`;
  // sectorNames[0] is "your sign", which an overview may say.
  for (const n of SN.slice(1)) if (t.includes(n)) return `names a sector: ${n}`;
  if (SHEET_WORDING.test(t)) return SHEET_WORDING_REASON;
  const stray = strayWeekday(t, sheet.events, sheet.backdrop.placements);
  if (stray) return stray;
  const overstay = overstays(t, sheet.backdrop.placements);
  if (overstay) return overstay;
  return commonProblems(t, sheetBodies(sheet), sheetSigns(sheet));
}

// Models often wrap JSON in a code fence.
const unfence = raw => String(raw).trim().replace(/^`{3}(?:json)?\s*|\s*`{3}$/g, '');

function parseSubjects(raw) {
  let o;
  try { o = JSON.parse(unfence(raw)); } catch { return null; }
  if (!o || !Array.isArray(o.subjects) || o.subjects.length !== 3 || typeof o.preview !== 'string') return null;
  return {subjects: o.subjects, preview: o.preview};
}

function validateSubjects(raw, sheet) {
  try { JSON.parse(unfence(raw)); } catch { return 'not JSON'; }
  const o = parseSubjects(raw);
  if (!o) return 'not {subjects: [3], preview}';
  const bodies = sheetBodies(sheet);
  for (const s of o.subjects) {
    if (typeof s !== 'string' || /\n/.test(s)) return 'subject is not one line';
    if (s.length < 25 || s.length > 60) return `subject is ${s.length} characters`;
    if (/\p{Extended_Pictographic}/u.test(s)) return 'emoji in subject';
    if (s.includes('!')) return 'exclamation mark in subject';
    if (/\b[A-Z]{3,}\b/.test(s)) return 'all-caps word in subject';
    const problem = strayWeekday(s, sheet.events, sheet.backdrop.placements) || commonProblems(s, bodies, new Set());
    if (problem) return `subject: ${problem}`;
  }
  if (new Set(o.subjects.map(s => s.toLowerCase())).size !== 3) return 'subjects are not distinct';
  if (/\n/.test(o.preview) || o.preview.length < 40 || o.preview.length > 110) return `preview is ${o.preview.length} characters`;
  const problem = strayWeekday(o.preview, sheet.events, sheet.backdrop.placements) || commonProblems(o.preview, bodies, sheetSigns(sheet));
  return problem ? `preview: ${problem}` : null;
}

// Zodiac signs are withheld from a sign's facts: its rules ban every sign name but the reader's own.
function signMessages(sg, sheet) {
  const facts = {
    sign: sg.sign, ruler: sg.ruler, moon: sg.backdrop.moon,
    placements: sg.backdrop.placements.map(p => ({body: p.body, sector: p.sector.name, ruler: p.ruler, ...(p.until && {until: p.until})})),
    events: sg.events.map(e => ({weekday: e.weekday, body: e.body, what: e.detail, sector: e.sector.name, rulerInvolved: e.rulerInvolved}))
  };
  return [
    {role: 'system', content: `${RULES_SIGN}\n\nExample of the shape, written for a different week and a different sign:\n${EXAMPLE_SIGN}`},
    {role: 'user', content: `Fact sheet for ${sg.sign}, week of ${sheet.from}:\n${JSON.stringify(facts, null, 1)}\n\nWrite the two paragraphs: the shape of the week, then the days that matter.`}
  ];
}

const sharedFacts = sheet => ({moon: sheet.backdrop.moon, placements: sheet.backdrop.placements,
  events: sheet.events.map(e => ({weekday: e.weekday, body: e.body, what: e.detail, sign: e.sign}))});

function overviewMessages(sheet) {
  return [
    {role: 'system', content: `${RULES_OVERVIEW}\n\nExample of the shape, written for a different week:\n${EXAMPLE_OVERVIEW}`},
    {role: 'user', content: `Week sheet, week of ${sheet.from}:\n${JSON.stringify(sharedFacts(sheet), null, 1)}\n\nWrite the two paragraphs.`}
  ];
}

function subjectsMessages(sheet, overview) {
  const example = EXAMPLE_SUBJECTS_SETS[Math.round(Date.parse(sheet.from) / 6048e5) % EXAMPLE_SUBJECTS_SETS.length] || EXAMPLE_SUBJECTS;   // 6048e5 ms is one week
  return [
    {role: 'system', content: `${RULES_SUBJECTS}\n\nExample of the shape, written for a different week:\n${example}`},
    {role: 'user', content: `Subject lines, week of ${sheet.from}:\n${JSON.stringify(sharedFacts(sheet), null, 1)}\n\nOpening section:\n${overview || '(not written yet)'}\n\nReply with the JSON object.`}
  ];
}

function nextMonday(today) {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();   // 0 Sunday, 1 Monday
  return addDays(today, (8 - day) % 7);
}

function parseArgs(argv, today = new Date().toISOString().slice(0, 10)) {
  const o = {week: null, force: false, endpoint: 'http://127.0.0.1:8088/v1', model: 'muse-glimmer-30b-local', out: 'output/weekly-prose'};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (['--week', '--endpoint', '--model', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  o.week = o.week || nextMonday(today);
  return o;
}

// Three attempts at one block. A request that throws counts as an attempt, not an abort.
async function attempt(o, label, messages, check) {
  let reason = '';
  for (let n = 1; n <= 3; n++) {
    let candidate;
    try { candidate = await complete(o.endpoint, o.model, messages); }
    catch (error) { reason = `request failed: ${error.message}`; console.warn(`${o.week} ${label} attempt ${n}: ${reason}`); continue; }
    reason = check(candidate);
    if (!reason) return candidate;
    console.warn(`${o.week} ${label} attempt ${n}: ${reason}`);
  }
  console.error(`${o.week} ${label}: omitted after 3 attempts (${reason})`);
  return null;
}

async function main(argv) {
  const o = parseArgs(argv);
  const sheet = engine.weekSheet(o.week);
  if (sheet.status === 'not-monday') {
    const next = nextMonday(o.week);
    console.error(`${o.week} is not a Monday. Nearest: ${addDays(next, -7)} or ${next}.`);
    return 1;
  }
  const alias = await servedAlias(o.endpoint);
  if (alias !== o.model) { console.error(`Served model is "${alias}", not "${o.model}"; refusing to write.`); return 2; }
  fs.mkdirSync(o.out, {recursive: true});
  const file = path.join(o.out, `${o.week}.json`);
  // A block omitted after three attempts, or rejected by the proofreader, is a gap: a later run
  // keeps what the file has and writes only what it lacks.
  let kept = {};
  if (fs.existsSync(file) && !o.force) { try { kept = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch { kept = {}; } }

  const signs = {};
  for (const sg of sheet.signs) {
    const key = sg.sign.toLowerCase();
    if (typeof kept.signs?.[key] === 'string' && kept.signs[key]) { signs[key] = kept.signs[key]; continue; }
    const text = await attempt(o, sg.sign, signMessages(sg, sheet), c => validateSign(c, sg));
    if (text) signs[key] = text;
  }
  let overview = typeof kept.overview === 'string' ? kept.overview : '';
  if (!overview) overview = await attempt(o, 'overview', overviewMessages(sheet), c => validateOverview(c, sheet)) || '';
  let subjects = Array.isArray(kept.subjects) && kept.subjects.length === 3 ? kept.subjects : [], preview = subjects.length ? kept.preview : '';
  if (!subjects.length) {
    const parsed = parseSubjects(await attempt(o, 'subjects', subjectsMessages(sheet, overview), c => validateSubjects(c, sheet)) || '');
    if (parsed) ({subjects, preview} = parsed);
  }

  const {proof, originals, rejected, suggested} = kept;
  const out = {week: o.week, generated: new Date().toISOString(), model: o.model, overview, signs, subjects, preview,
    ...(proof && {proof}), ...(originals && {originals}), ...(rejected && {rejected}), ...(suggested && {suggested})};
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log(`${o.week}: ${Object.keys(signs).length}/12 signs, overview ${overview ? 'written' : 'missing'}, ${subjects.length} subjects`);
  return Object.keys(signs).length >= 10 && overview ? 0 : 3;
}

module.exports = {RULES_SIGN, RULES_OVERVIEW, RULES_SUBJECTS, EXAMPLE_SIGN, EXAMPLE_OVERVIEW, EXAMPLE_SUBJECTS, EXAMPLE_SUBJECTS_SETS, EXAMPLE_SHEET, EXAMPLE_SIGN_SHEET,
  validateSign, validateOverview, validateSubjects, parseSubjects, signMessages, overviewMessages, subjectsMessages, nextMonday, parseArgs, main};
if (require.main === module) main(process.argv.slice(2)).then(code => process.exit(code), error => { console.error(error); process.exit(1); });
