#!/usr/bin/env node
/* Proofreads the week's newsletter text with the second local model (Qwen): passes or fails each
   block against the facts it was written from, and applies small corrections. Design:
   docs/superpowers/specs/2026-09-18-newsletter-weekly-reading-design.md.
     node tools/proof_weekly_prose.cjs [--week YYYY-MM-DD]
        [--endpoint http://127.0.0.1:8088/v1] [--model qwen3.8-27b-local] [--out output/weekly-prose]
   Refuses to run unless the served model alias equals --model, so the writer never marks its own work. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('../daily-horoscope-engine.js');
const {servedAlias, complete, PLANETS} = require('./write_daily_prose.cjs');
const {validateSign, validateOverview, validateSubjects, parseSubjects, nextMonday} = require('./write_weekly_prose.cjs');

const MAX_EDIT_SHARE = 0.08;   // of the original's word count

// The words a spelling or grammar fix never needs to touch. A correction must leave every one of
// them in place and in the same ORDER; otherwise it changed a fact, and Glimmer's text stands.
// Order, not count: swapping Thursday with Sunday keeps every count and moves an event two days.
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SKY_WORDS = ['new moon', 'first quarter', 'full moon', 'third quarter', 'waxing', 'waning', 'direct', 'retrograde', 'eclipse', 'until'];
// Longest first, so "sunday" is matched whole and never as "sun".
const FACT_WORD = new RegExp([...WEEKDAYS, ...PLANETS, ...engine.signNames, ...engine.sectorNames, ...SKY_WORDS]
  .sort((a, b) => b.length - a.length).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|\\d+', 'gi');
function factWords(text) {
  return (text.match(FACT_WORD) || []).map(word => word.toLowerCase()).join('|');
}

const JUDGE = `You are the proofreader for a weekly astrology newsletter. Another writer produced the TEXT from the FACTS. Reply with one JSON object and nothing else:
{"verdict": "pass" or "fail", "reason": string, "corrected": string}

Fail the text only for one of these, and name the sentence in "reason":
1. It states something about the sky that the FACTS do not contain or that contradicts them: a weekday, a planet, a sector, a sign, a direction or an event that differs from the FACTS.
2. It predicts, promises or guarantees an outcome.
3. It gives medical, legal or financial advice.
4. Its tone is fearful, fatalistic or threatening.
Everyday advice, scenes and examples are the writer's to invent and are not errors. A fact left out is not an error.

Otherwise the verdict is pass and "reason" is empty. In "corrected", return the full text with spelling, grammar and punctuation mistakes fixed and nothing else changed: the same sentences, the same words wherever they are correct, the same paragraph breaks. If there is nothing to fix, return an empty string. Never rephrase, shorten, lengthen or improve the style. When the verdict is fail, "corrected" is an empty string.`;

const sha = text => crypto.createHash('sha256').update(text).digest('hex');

// Words deleted from a plus words inserted to reach b, from the longest common subsequence.
function wordEdits(a, b) {
  const x = a.trim().split(/\s+/), y = b.trim().split(/\s+/);
  let prev = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const row = [0];
    for (let j = 1; j <= y.length; j++) row[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    prev = row;
  }
  return x.length + y.length - 2 * prev[y.length];
}

function parseVerdict(raw) {
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  let o;
  try { o = JSON.parse(match[0]); } catch { return null; }
  if (!o || (o.verdict !== 'pass' && o.verdict !== 'fail')) return null;
  return {verdict: o.verdict, reason: typeof o.reason === 'string' ? o.reason : '', corrected: typeof o.corrected === 'string' ? o.corrected : ''};
}

// One block of the week file: its text, the facts it was written from, its validator, and how to
// put a text back or take it out.
function blocks(file, sheet) {
  const shared = {moon: sheet.backdrop.moon, placements: sheet.backdrop.placements, events: sheet.events};
  const out = [];
  for (const sg of sheet.signs) {
    const key = sg.sign.toLowerCase();
    out.push({key, text: file.signs?.[key] || '', facts: {sign: sg.sign, ruler: sg.ruler, backdrop: sg.backdrop, events: sg.events},
      check: t => validateSign(t, sg), canonical: t => t, set: t => { file.signs[key] = t; }, clear: () => { delete file.signs[key]; }});
  }
  out.push({key: 'overview', text: file.overview || '', facts: shared, check: t => validateOverview(t, sheet),
    canonical: t => t, set: t => { file.overview = t; }, clear: () => { file.overview = ''; }});
  out.push({key: 'subjects', text: file.subjects?.length === 3 ? JSON.stringify({subjects: file.subjects, preview: file.preview}) : '', facts: shared,
    check: t => validateSubjects(t, sheet), canonical: t => JSON.stringify(parseSubjects(t)),
    set: t => { Object.assign(file, parseSubjects(t)); }, clear: () => { file.subjects = []; file.preview = ''; }});
  return out.filter(b => b.text);
}

function parseArgs(argv, today = new Date().toISOString().slice(0, 10)) {
  const o = {week: null, endpoint: 'http://127.0.0.1:8088/v1', model: 'qwen3.8-27b-local', out: 'output/weekly-prose'};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--week', '--endpoint', '--model', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  o.week = o.week || nextMonday(today);
  return o;
}

// `options.sheet` lets a test supply the facts; the tool itself always computes them.
async function main(argv, options = {}) {
  const o = parseArgs(argv);
  const file = path.join(o.out, `${o.week}.json`);
  const sheet = options.sheet || engine.weekSheet(o.week);
  if (sheet.status === 'not-monday' || !fs.existsSync(file)) { console.error(`${o.week}: no week file at ${file}, or not a Monday.`); return 1; }
  const alias = await servedAlias(o.endpoint);
  if (alias !== o.model) { console.error(`Served model is "${alias}", not "${o.model}"; refusing to proofread.`); return 2; }
  const week = JSON.parse(fs.readFileSync(file, 'utf8'));
  week.signs = week.signs || {};
  week.proof = {model: o.model, checked: new Date().toISOString(), blocks: week.proof?.blocks || {}};

  for (const b of blocks(week, sheet)) {
    const had = week.proof.blocks[b.key];
    if (had && had.sha === sha(b.text)) continue;   // already judged, text unchanged
    delete week.proof.blocks[b.key];
    let verdict = null;
    for (let n = 1; n <= 3 && !verdict; n++) {
      try {
        verdict = parseVerdict(await complete(o.endpoint, o.model, [
          {role: 'system', content: JUDGE},
          {role: 'user', content: `Block: ${b.key}\nFACTS:\n${JSON.stringify(b.facts, null, 1)}\n\nTEXT:\n${b.text}`}
        ], {temperature: 0.2}));
        if (!verdict) console.warn(`${o.week} ${b.key} attempt ${n}: reply was not a verdict`);
      } catch (error) { console.warn(`${o.week} ${b.key} attempt ${n}: request failed: ${error.message}`); }
    }
    if (!verdict) { console.error(`${o.week} ${b.key}: no verdict after 3 attempts, left unproofed`); continue; }

    if (verdict.verdict === 'fail') {
      week.rejected = {...week.rejected, [b.key]: {text: b.text, reason: verdict.reason}};
      b.clear();
      week.proof.blocks[b.key] = {verdict: 'fail', reason: verdict.reason, edited: false, sha: sha(b.text)};
      console.warn(`${o.week} ${b.key}: FAIL (${verdict.reason})`);
      continue;
    }
    let text = b.text, edited = false;
    const fixed = verdict.corrected.trim();
    if (fixed && fixed !== b.text.trim()) {
      const canonical = b.canonical(fixed);
      if (canonical !== b.text) {
        const problem = b.check(canonical);
        if (problem) console.warn(`${o.week} ${b.key}: correction discarded, it fails the validator (${problem})`);
        else if (factWords(canonical) !== factWords(b.text)) console.warn(`${o.week} ${b.key}: correction discarded, it changes a fact word`);
        else {
          const edits = wordEdits(b.text, canonical), limit = Math.ceil(b.text.trim().split(/\s+/).length * MAX_EDIT_SHARE);
          if (edits > limit) console.warn(`${o.week} ${b.key}: correction discarded, ${edits} word edits is over the limit of ${limit}`);
          else { b.set(canonical); week.originals = {...week.originals, [b.key]: b.text}; text = canonical; edited = true; }
        }
      }
    }
    if (week.rejected) delete week.rejected[b.key];
    week.proof.blocks[b.key] = {verdict: 'pass', reason: '', edited, sha: sha(text)};
    console.log(`${o.week} ${b.key}: pass${edited ? ', corrected' : ''}`);
  }

  fs.writeFileSync(file, JSON.stringify(week, null, 1) + '\n');
  const current = blocks(week, sheet).filter(b => week.proof.blocks[b.key]?.verdict === 'pass' && week.proof.blocks[b.key].sha === sha(b.text)).map(b => b.key);
  const signsPassed = current.filter(k => k !== 'overview' && k !== 'subjects').length;
  console.log(`${o.week}: ${signsPassed} signs passed, overview ${current.includes('overview') ? 'passed' : 'not passed'}`);
  return signsPassed >= 10 && current.includes('overview') ? 0 : 3;
}

module.exports = {JUDGE, MAX_EDIT_SHARE, WEEKDAYS, SKY_WORDS, factWords, wordEdits, parseVerdict, sha, parseArgs, main};
if (require.main === module) main(process.argv.slice(2)).then(code => process.exit(code), error => { console.error(error); process.exit(1); });
