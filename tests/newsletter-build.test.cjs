const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const B = require('../tools/build_newsletter.cjs');

const KEYS = B.SIGNS.map(s => s.key);
const reading = key => `This is the ${key} week, plainly said. The Sun opens the week in your sign and asks for patience.\n\nOn Wednesday the ${key} day arrives. Keep it small.`;

// A week file as the writer and the proofreader leave it: every block passed, sha current.
function makeWeek(change = () => {}) {
  const week = {week: '2026-09-21', generated: 'x', model: 'muse-glimmer-30b-local',
    overview: 'The week builds slowly and then opens. The Sun is in Virgo as Monday opens.\n\nOn Saturday the Full moon arrives. Keep one task in view.',
    signs: Object.fromEntries(KEYS.map(k => [k, reading(k)])),
    subjects: ['Start the week tidy and let the middle soften', 'A second candidate subject line here', 'A third candidate subject line here'],
    preview: 'A waxing Moon for most of the week, then a Full moon on Saturday.'};
  change(week);
  const blocks = {overview: week.overview, subjects: JSON.stringify({subjects: week.subjects, preview: week.preview}), ...week.signs};
  week.proof = {model: 'qwen3.8-27b-local', checked: 'x', blocks: Object.fromEntries(Object.entries(blocks).map(([k, t]) => [k, {verdict: 'pass', reason: '', edited: false, sha: B.sha(t)}]))};
  return week;
}
const campaign = week => { const fit = B.fitBlocks(week); return B.renderEmail(fit, {subject: B.headline(fit).subject}); };

test('only blocks with a current pass are fit to send', () => {
  const week = makeWeek();
  week.proof.blocks.leo.verdict = 'fail';               // failed
  week.signs.virgo += ' Edited after proofing.';        // text changed since it was judged
  delete week.proof.blocks.libra;                       // never judged
  delete week.signs.pisces;                             // never written
  const fit = B.fitBlocks(week);
  assert.deepEqual(fit.missing, ['leo', 'virgo', 'libra', 'pisces']);
  assert.equal(Object.keys(fit.signs).length, 8);
  assert.equal(fit.overview, week.overview);
  week.preview += '!';                                  // the subjects block is one text: subjects and preview together
  assert.deepEqual([B.fitBlocks(week).subjects, B.fitBlocks(week).preview], [[], '']);
});

test('the campaign carries every sign inside one IF / ELSEIF chain, in zodiac order', () => {
  const html = campaign(makeWeek());
  const tags = html.match(/\*\|(?:IF|ELSEIF|ELSE|END):[^|]*\|\*/g);
  assert.deepEqual(tags, ['*|IF:SIGN=aries|*', ...KEYS.slice(1).map(k => `*|ELSEIF:SIGN=${k}|*`), '*|ELSE:|*', '*|END:IF|*']);
  const branches = html.split(/\*\|(?:IF|ELSEIF|ELSE|END):[^|]*\|\*/).slice(1, 14);   // 12 signs + the ELSE branch
  KEYS.forEach((key, i) => {
    assert.ok(branches[i].includes(`the ${key} week, plainly said`), `${key} text is in its own branch`);
    assert.ok(branches[i].includes(`${B.ASSETS}/signs/${key}.jpg`) && branches[i].includes(`${B.ASSETS}/glyphs/${key}.png`));
    for (const other of KEYS) if (other !== key) assert.equal(branches[i].includes(`the ${other} week`), false, `${other} leaked into ${key}`);
  });
  assert.match(branches[12], /Tell us your sign/);
});

test('the opening sentence is pulled out as a quote and the paragraph break survives', () => {
  const q = B.pullQuote('First sentence here. Second one. Third.\n\nNext paragraph.');
  assert.deepEqual(q, {quote: 'First sentence here.', rest: 'Second one. Third.\n\nNext paragraph.'});
  assert.deepEqual(B.pullQuote('Only one sentence here.\n\nNext.'), {quote: '', rest: 'Only one sentence here.\n\nNext.'});
  const section = B.signSection(B.SIGNS[0], 'First sentence here. Second one.\n\nNext paragraph.');
  assert.equal((section.match(/<p style="margin:0 0 16px/g) || []).length, 2);
});

test('reader text is escaped', () => {
  const html = campaign(makeWeek(w => { w.signs.aries = 'Less < more & "quoted". A second sentence follows here.\n\nNext.'; w.subjects[0] = 'Fish & chips <week>'; }));
  assert.ok(html.includes('Less &lt; more &amp; &quot;quoted&quot;.'));
  assert.ok(html.includes('Fish &amp; chips &lt;week&gt;'));
  assert.equal(html.includes('<week>'), false);
});

test('the footer holds what Mailchimp, the law and our own specs require', () => {
  const html = campaign(makeWeek());
  for (const tag of ['href="*|UNSUB|*"', 'href="*|SITEUNSUB|*"', 'href="*|ARCHIVE|*"', '*|HTML:LIST_ADDRESS_HTML|*', '*|REWARDS|*']) assert.ok(html.includes(tag), tag);
  assert.match(html, /One language model writes each issue[^<]*a second one proofreads it/);
  assert.ok(html.includes('https://ishtarinsights.com/newsletter-privacy.html'));
});

test('the HTML keeps to what mail clients render', () => {
  const html = campaign(makeWeek());
  assert.equal(/background-image|url\(/i.test(html), false, 'no CSS background images');
  assert.equal(/\.webp|<svg/i.test(html), false, 'no WebP, no SVG');
  assert.equal(/<(?:style|script)\b/i.test(html), false, 'styles are inline; no scripts');
  const imgs = html.match(/<img\b[^>]*>/g);
  assert.equal(imgs.length, 2 + 12 * 2);                 // masthead, moon arc, and a banner and a glyph per sign
  for (const img of imgs) {
    assert.match(img, /\salt="/, img); assert.match(img, /\swidth="\d+"/, img);
    assert.match(img, /src="https:\/\/ishtarinsights\.com\/assets\/newsletter\/[a-z\/-]+\.(?:jpg|png)"/, img);
  }
  assert.match(html, /<meta name="color-scheme" content="dark light">/);
  for (const cell of html.match(/<td\b[^>]*padding:[^>]*>/g)) assert.match(cell, /background:#[0-9a-f]{6}/, `a padded cell with no colour of its own: ${cell.slice(0, 80)}`);
});

test('a full issue of the longest readings stays under the Gmail clipping limit', () => {
  const long = Array.from({length: 2}, () => Array.from({length: 115}, (_, i) => `word${i}`).join(' ') + '.').join('\n\n');   // 230 words
  const html = campaign(makeWeek(w => { for (const k of KEYS) w.signs[k] = `Opening sentence for ${k}. ${long}`; }));
  assert.ok(Buffer.byteLength(html) < B.MAX_BYTES, `${Buffer.byteLength(html)} bytes`);
});

test('a sign that is not fit gets the missing-reading panel, never the invitation', () => {
  const week = makeWeek(); week.proof.blocks.scorpio.verdict = 'fail';
  const html = campaign(week);
  const scorpio = html.split('*|ELSEIF:SIGN=scorpio|*')[1].split('*|ELSEIF:SIGN=sagittarius|*')[0];
  assert.match(scorpio, /There is no Scorpio reading this week/);
  assert.equal(scorpio.includes('Tell us your sign'), false);
  assert.equal(scorpio.includes('/signs/scorpio.jpg'), false);
});

test('without fit subjects the subject is the dated one and the preview comes from the overview', () => {
  const week = makeWeek(); week.proof.blocks.subjects.verdict = 'fail';
  assert.deepEqual(B.headline(B.fitBlocks(week)), {subject: 'Your week ahead: 21 September', preview: 'The week builds slowly and then opens.'});
  assert.equal(B.headline(B.fitBlocks(makeWeek()), 2).subject, 'A second candidate subject line here');
  const long = B.headline(B.fitBlocks(makeWeek(w => { w.subjects = []; w.overview = `${'Long '.repeat(40)}sentence.\n\nNext.`; })));
  assert.ok(long.preview.length <= 110 && long.preview.endsWith('...'));
});

function inTemp(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-build-'));
  try { return run(path.join(dir, 'in'), path.join(dir, 'out')); } finally { fs.rmSync(dir, {recursive: true}); }
}
const write = (dir, week) => { fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, `${week.week}.json`), JSON.stringify(week)); };

test('main writes the campaign, a manifest whose sha matches it, and a preview', () => inTemp((src, out) => {
  write(src, makeWeek());
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 0);
  const html = fs.readFileSync(path.join(out, '2026-09-21', 'issue.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(out, '2026-09-21', 'issue.json'), 'utf8'));
  assert.equal(manifest.html_sha256, B.sha(html));
  assert.deepEqual([manifest.title, manifest.subject, manifest.from_name, manifest.reply_to, manifest.signs_missing],
    ['Ishtar Insights 2026-09-21', 'Start the week tidy and let the middle soften', 'Ishtar Insights', 'newsletter@ishtarinsights.com', []]);
  assert.equal(manifest.bytes, Buffer.byteLength(html));
  const preview = fs.readFileSync(path.join(out, '2026-09-21', 'preview.html'), 'utf8');
  assert.equal(preview.includes('*|IF:'), false, 'the preview shows one reader at a time, with no merge tags');
  assert.ok(preview.includes('assets/newsletter/signs/aries.jpg') && !preview.includes('https://ishtarinsights.com/assets/newsletter'));
}));

test('exit codes: 1 no file or not a Monday, 4 no overview, 5 a missing sign unless allowed', () => inTemp((src, out) => {
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 1);
  assert.equal(B.main(['--week', '2026-09-22', '--in', src, '--out', out]), 1);
  const noOverview = makeWeek(); noOverview.proof.blocks.overview.verdict = 'fail'; write(src, noOverview);
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 4);
  const oneDown = makeWeek(); delete oneDown.signs.gemini; write(src, oneDown);
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out]), 5);
  assert.equal(fs.existsSync(path.join(out, '2026-09-21', 'issue.html')), false, 'nothing is written when the build stops');
  assert.equal(B.main(['--week', '2026-09-21', '--in', src, '--out', out, '--allow-missing']), 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, '2026-09-21', 'issue.json'), 'utf8')).signs_missing, ['gemini']);
  assert.throws(() => B.parseArgs(['--subject', '4']), /--subject/);
  assert.throws(() => B.parseArgs(['--send']), /unknown argument/);
}));
