/* The animal-year relations for the /eastern/ page: which traditional relation, if any, a
   birth-year branch carries with a chosen lunar year's branch. Pure: returns HTML strings and
   touches no DOM, so its copy is tested under Node. */
const ChineseYear = (() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const mod = (v, m) => ((v % m) + m) % m;
  const ANIMALS = [['Rat','子','Zi'],['Ox','丑','Chou'],['Tiger','寅','Yin'],['Rabbit','卯','Mao'],['Dragon','辰','Chen'],['Snake','巳','Si'],
    ['Horse','午','Wu'],['Goat','未','Wei'],['Monkey','申','Shen'],['Rooster','酉','You'],['Dog','戌','Xu'],['Pig','亥','Hai']]
    .map(([name, hanzi, pinyin]) => ({name, hanzi, pinyin}));
  const ORDER = ['same', 'trine', 'harmony', 'clash', 'harm', 'punishment', 'selfPunishment', 'destruction'];
  const PUNISHMENT_GROUPS = [[2, 5, 8], [1, 7, 10], [0, 3]];
  const SELF_PUNISHMENT = [4, 6, 9, 11];
  const yearBranch = year => mod(year - 1984, 12);

  function relations(a, b) {
    if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < 12)) throw new RangeError('Branch indices run 0–11.');
    const d = mod(b - a, 12), found = new Set();
    if (a === b) found.add('same');
    if (d === 4 || d === 8) found.add('trine');
    if (mod(a + b, 12) === 1) found.add('harmony');
    if (d === 6) found.add('clash');
    if (mod(a + b, 12) === 7) found.add('harm');
    if (a !== b && PUNISHMENT_GROUPS.some(g => g.includes(a) && g.includes(b))) found.add('punishment');
    if (a === b && SELF_PUNISHMENT.includes(a)) found.add('selfPunishment');
    // Destruction pairs each yang (even) branch with the branch three places before it.
    const even = a % 2 === 0 ? a : b, odd = a % 2 === 0 ? b : a;
    if (a % 2 !== b % 2 && odd === mod(even - 3, 12)) found.add('destruction');
    return ORDER.filter(key => found.has(key));
  }

  const COPY = {
    same: {title: 'Same animal', hanzi: '本命年',
      line: 'The year’s animal is your own birth animal. Tradition marks such a year as one worth meeting with a little extra attention.'},
    trine: {title: 'Trine', hanzi: '三合',
      line: 'These two animals belong to the same trine, one of the traditional groups of animals bound by affinity. Tradition reads this as an easy accord between the year and the year you were born.'},
    harmony: {title: 'Six harmony', hanzi: '六合',
      line: 'These two animals form one of six fixed partnerships in the twelve-branch cycle. Tradition treats the pairing as a natural complement.'},
    clash: {title: 'Clash', hanzi: '六沖',
      line: 'These two animals sit six places apart, directly across the cycle from each other. Tradition names this the sharpest of the relations, a meeting worth sitting with rather than rushing past.'},
    harm: {title: 'Harm', hanzi: '六害',
      line: 'Tradition pairs these two animals as a quieter friction, less direct than a clash but still worth noticing as the year unfolds.'},
    punishment: {title: 'Punishment', hanzi: '刑',
      line: 'These animals fall into one of the traditional punishment groupings, read as a strain that can build gradually rather than arrive all at once.'},
    selfPunishment: {title: 'Self-punishment', hanzi: '自刑',
      line: 'This animal is one of four that tradition says can strain against itself, so the relation appears when the year’s animal and your own are the same.'},
    destruction: {title: 'Destruction', hanzi: '破',
      line: 'Tradition reads this pairing as a disruption to plans or arrangements already under way, more about timing than about the animals themselves.'},
    none: {title: 'No named relation', hanzi: '',
      line: 'This year’s animal and your birth animal carry none of the eight traditional relations — a year without a named relation to reflect on.'}
  };

  // The heading and relations list only, so the page can refresh them without replacing the year control.
  function renderResult({birthBranch, year}) {
    const yb = yearBranch(year);
    const yearAnimal = ANIMALS[yb], birthAnimal = ANIMALS[birthBranch];
    const found = relations(birthBranch, yb);
    const items = (found.length ? found : ['none']).map(key => {
      const c = COPY[key];
      return `<li><strong>${esc(c.title)}</strong>${c.hanzi ? ` <span lang="zh">${esc(c.hanzi)}</span>` : ''}<p>${esc(c.line)}</p></li>`;
    }).join('');
    return `<h5 id="chinese-year-title">${esc(yearAnimal.name)} year ${esc(year)} · <span lang="zh">${esc(yearAnimal.hanzi)}</span> and your ${esc(birthAnimal.name)}</h5>
  <ul class="chinese-year-relations">${items}</ul>`;
  }

  function render({birthBranch, year}) {
    return `<section class="chinese-year" aria-labelledby="chinese-year-title">
  <p class="reading-label">Your animal and the chosen year</p>
  <div class="chinese-year-control"><label>Year <input type="number" data-chinese-year min="1901" max="2100" value="${esc(year)}"></label><button type="button" data-chinese-year-step="-1" aria-label="Previous year">◂</button><button type="button" data-chinese-year-step="1" aria-label="Next year">▸</button></div>
  <div class="chinese-year-result" aria-live="polite">${renderResult({birthBranch, year})}</div>
  <details class="insight-method"><summary>About the animal-year relations</summary><p>The animal year begins at Lunar New Year, as in the portrait above, so a year number here can start partway through the civil year. These relations come from the traditional pairings of the twelve earthly branches that the animals stand for; a pair can carry more than one relation at once, as the list above shows when it happens. They are traditional associations, not predictions.</p></details>
</section>`;
  }

  return {ANIMALS, relations, yearBranch, COPY, render, renderResult};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ChineseYear;
