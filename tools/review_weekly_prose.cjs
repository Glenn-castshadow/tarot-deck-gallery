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
    if (a === '--accept' || a === '--reject') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error(`${a} needs a block name`);
      o[a.slice(2)].push(val);
    } else if (a === '--week' || a === '--out') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error(`${a} needs a value`);
      o[a.slice(2)] = val;
    } else throw new Error(`unknown argument ${a}`);
  }
  o.accept = [...new Set(o.accept)];
  o.reject = [...new Set(o.reject)];
  for (const key of o.accept) if (o.reject.includes(key)) throw new Error(`cannot both accept and reject ${key}`);
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

  week.proof = week.proof || {blocks: {}};
  week.proof.blocks = week.proof.blocks || {};

  for (const key of [...o.accept, ...o.reject]) if (!suggested[key]) console.warn(`${o.week} ${key}: no suggestion is waiting.`);
  for (const key of o.reject.filter(k => suggested[k])) { delete suggested[key]; console.log(`${o.week} ${key}: rejected; Glimmer's text stands.`); }
  for (const key of o.accept.filter(k => suggested[k])) {
    const block = byKey[key], raw = suggested[key].text;
    const problem = block ? block.check(raw) : 'the block is no longer in the issue (you can still --reject it)';
    if (problem) { console.error(`${o.week} ${key}: cannot accept, ${problem}. The suggestion is kept.`); code = 7; continue; }
    const text = block.canonical(raw);
    week.originals = {...week.originals, [key]: week.originals?.[key] || block.text};
    block.set(text);
    week.proof.blocks[key] = {verdict: 'pass', reason: '', edited: true, accepted_by: 'owner', sha: sha(text)};
    delete suggested[key];
    console.log(`${o.week} ${key}: accepted.`);
  }
  if (Object.keys(suggested).length) week.suggested = suggested; else delete week.suggested;
  if (o.accept.length || o.reject.length) fs.writeFileSync(file, JSON.stringify(week, null, 1) + '\n');

  const show = (key, t) => { if (key !== 'subjects') return t; try { return JSON.stringify(JSON.parse(t), null, 1); } catch { return t; } };
  for (const [key, s] of Object.entries(suggested)) {
    console.log(`\n${key}: refused because ${s.why}\n  ${byKey[key] ? wordDiff(show(key, byKey[key].text), show(key, s.text)) : '(the block is no longer in the issue)'}`);
    console.log(`  node tools/review_weekly_prose.cjs --week ${o.week} --accept ${key}     or     --reject ${key}`);
  }
  if (!Object.keys(suggested).length) console.log(`${o.week}: no corrections are waiting.`);
  return code;
}

module.exports = {wordDiff, parseArgs, main};
if (require.main === module) { try { process.exit(main(process.argv.slice(2))); } catch (error) { console.error(error.message); process.exit(1); } }
