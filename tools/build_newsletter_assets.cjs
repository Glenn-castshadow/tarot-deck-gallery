#!/usr/bin/env node
/* Makes the newsletter's fixed images from art the site already has, as JPG and PNG because
   Outlook on Windows shows neither WebP nor CSS background images:
     assets/newsletter/masthead.jpg   1200x430  the celestial hero with the lotus logo in its empty centre
     assets/newsletter/moon-arc.jpg   1200x170  the moon-phase arc from the foot of the hero
     assets/newsletter/glyphs/<sign>.png 136x136  each sign's glyph, gold on the panel colour
   The sign banners are made by tools/compose_sign_banners.cjs. Everything is shown at half size.
     node tools/build_newsletter_assets.cjs        (needs ImageMagick `magick` and the Segoe UI Symbol font) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const OUT = path.join('assets', 'newsletter');
const HERO = path.join('assets', 'celestial-hero.webp'), LOGO = path.join('assets', 'ishtar-insights-logo-hero.webp');
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const magick = args => execFileSync('magick', args, {stdio: ['ignore', 'inherit', 'inherit']});

fs.mkdirSync(path.join(OUT, 'glyphs'), {recursive: true});
// The hero is 1774x887; at 1200 wide it is 600 tall, and the moon arc is its last 170 rows.
magick([HERO, '-resize', '1200x600!', '-crop', '1200x430+0+0', '+repage',
  '(', LOGO, '-resize', '540x', ')', '-gravity', 'center', '-geometry', '+0-6', '-composite', '-strip', '-quality', '88', path.join(OUT, 'masthead.jpg')]);
magick([HERO, '-resize', '1200x600!', '-crop', '1200x170+0+430', '+repage', '-strip', '-quality', '88', path.join(OUT, 'moon-arc.jpg')]);
SIGNS.forEach((sign, i) => magick(['-size', '136x136', 'xc:#10252e', '-font', 'Segoe-UI-Symbol', '-pointsize', '96', '-fill', '#ddc389',
  '-gravity', 'center', '-annotate', '+0+2', String.fromCodePoint(0x2648 + i), '-strip', path.join(OUT, 'glyphs', `${sign}.png`)]));
for (const name of ['masthead.jpg', 'moon-arc.jpg', ...SIGNS.map(s => `glyphs/${s}.png`)]) console.log(`${name}: ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB`);
