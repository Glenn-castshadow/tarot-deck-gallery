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
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\|/g, '&#124;');
const paragraphs = (text, style) => text.split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p style="${style}">${esc(p.trim())}</p>`).join('');
const weekLabel = monday => { const [, m, d] = monday.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };

// Piece 2's contract: a block is fit to send only when its verdict is pass and the recorded sha
// is that of the text now in the file.
function fitBlocks(week, monday = week.week) {
  const proofed = (key, text) => typeof text === 'string' && text && week.proof?.blocks?.[key]?.verdict === 'pass' && week.proof.blocks[key].sha === sha(text);
  const signs = {};
  for (const {key} of SIGNS) if (proofed(key, week.signs?.[key])) signs[key] = week.signs[key];
  const subjectsText = Array.isArray(week.subjects) && week.subjects.length === 3 && week.subjects.every(s => typeof s === 'string') && typeof week.preview === 'string' ? JSON.stringify({subjects: week.subjects, preview: week.preview}) : '';
  const subjectsFit = proofed('subjects', subjectsText);
  return {
    week: monday,
    overview: proofed('overview', week.overview) ? week.overview : '',
    signs, missing: SIGNS.map(s => s.key).filter(key => !signs[key]),
    subjects: subjectsFit ? week.subjects : [], preview: subjectsFit ? week.preview : '',
    suggested: Object.keys(week.suggested || {})
  };
}

// The reading's opening sentence is pulled out as a quote, when the paragraph has more to follow.
function pullQuote(text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);
  if (!paragraphs.length) return {quote: '', rest: text};
  const first = paragraphs[0];
  const others = paragraphs.slice(1);
  const match = first.slice(25).match(/[.!?]\s/);
  if (!match) return {quote: '', rest: paragraphs.join('\n\n')};
  const cut = 25 + match.index + 1;
  const after = first.slice(cut).trim();
  if (!after) return {quote: '', rest: paragraphs.join('\n\n')};
  return {quote: first.slice(0, cut), rest: [after, ...others].join('\n\n')};
}

const panelOpen = 'background:#10252e;border:1px solid #3d5a5a;';
// Outlined, light on dark, and never filled: in dark mode a mail app darkens a filled gold button to
// brown and flips its dark label to white (seen in the first real test send, 2026-09-18).
const button = (href, label) => `<a href="${href}" style="display:inline-block;padding:13px 26px;border-radius:3px;font:600 15px ${SANS};text-decoration:none;border:1px solid #d9c18e;color:#f4e8d1;">${label}</a>`;

// Outlook.com, the new Outlook and the Gmail apps recolour solid backgrounds in dark mode, even on a
// design that is already dark: #20152b arrived as a washed grey-purple. They never touch a background
// image, and a gradient is one, so every solid colour gets a same-colour gradient on top of it. A client
// that does not know gradients (Outlook on Windows) ignores the second declaration and shows the first.
const lockColours = html => html.replace(/background:(#[0-9a-f]{6});/g, (all, colour) => `${all}background-image:linear-gradient(${colour},${colour});`);
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
  ${button(`${SITE}/sky/`, 'Read today&#39;s sky')}
</td></tr>`;
}

// A reader who chose a sign whose reading is not fit to send this week. Never the no-sign
// invitation: that would tell someone who told us their sign that they had not.
function missingSignSection(sign) {
  return `<tr><td bgcolor="#10252e" style="${panelOpen}padding:30px 34px;">
  ${signHeading(sign)}
  <p style="margin:22px 0 18px;font:16px/1.7 ${SANS};color:#f4e8d1;">There is no ${sign.name} reading this week: the one we wrote did not pass our own checks, and we would sooner send none than a poor one. The week&#39;s sky above holds for every sign, and today&#39;s reading for ${sign.name} is on the site.</p>
  ${button(`${SITE}/sky/`, 'Read today&#39;s sky')}
</td></tr>`;
}

function noSignSection() {
  return `<tr><td bgcolor="#10252e" style="${panelOpen}padding:34px;text-align:center;">
  ${kicker('Make it yours')}
  <h2 style="margin:0 0 12px;font:700 28px/1.15 ${SERIF};color:#f4e8d1;">Tell us your sign</h2>
  <p style="margin:0 0 20px;font:16px/1.7 ${SANS};color:#f4e8d1;">Each week there is a reading written for every sign. Choose yours once and it arrives here, under the week&#39;s sky.</p>
  ${button(`${SITE}/account/`, 'Choose your sign')}
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
  return lockColours(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(subject)}</title>
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
</table></td></tr></table></body></html>`);
}

// What the campaign is called, and what goes in the inbox.
function headline(fit, pick = 1) {
  const plain = s => s.replace(/\|/g, '');
  if (fit.subjects.length) return {subject: plain(fit.subjects[pick - 1]), preview: plain(fit.preview)};
  const first = fit.overview.split(/(?<=[.!?])\s/)[0];
  return {subject: `Your week ahead: ${weekLabel(fit.week)}`, preview: plain(first.length > 110 ? `${first.slice(0, 107).trimEnd()}...` : first)};
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
  // The HTML goes first. If the push dies between the two, the server holds a manifest whose sha256 does not match (or none), and draft_campaign refuses it. The other order would not be safe.
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
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    console.error(`${o.week}: ${file} is not valid JSON.`);
    return 1;
  }
  if (parsed.week !== o.week) { console.error(`${o.week}: ${file} says it is for week ${parsed.week}.`); return 1; }
  const fit = fitBlocks(parsed, o.week);
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
if (require.main === module) { try { process.exit(main(process.argv.slice(2))); } catch (error) { console.error(error.message); process.exit(1); } }
