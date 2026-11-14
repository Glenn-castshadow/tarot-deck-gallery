/* Oracles of the book on /divination/: the Homer oracle (three dice choose one of 216 verses)
   and the Sortes Virgilianae (one line of the Aeneid, drawn at random). The Homer table is
   homer-oracle-data.js; the Aeneid is fetched once, on first use, from
   assets/texts/aeneid-dryden.json. Nothing is stored and nothing leaves the browser.
   Conventions and sources: docs/DIVINATION.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BookOracles = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  /* ---- Homer oracle ------------------------------------------------------------------- */
  const validRoll = roll => Array.isArray(roll) && roll.length === 3 && roll.every(n => Number.isInteger(n) && n >= 1 && n <= 6);
  // The table runs 1-1-1, 1-1-2 … 6-6-6: the first throw counts most, as the papyrus lists them.
  function rollIndex(roll) {
    if (!validRoll(roll)) throw new RangeError('Three throws of one to six are needed.');
    return (roll[0] - 1) * 36 + (roll[1] - 1) * 6 + (roll[2] - 1);
  }
  // randomInt(max) returns an unbiased integer from 0 to max - 1 (DivinationEngine.randomInt).
  const throwDice = randomInt => [randomInt(6) + 1, randomInt(6) + 1, randomInt(6) + 1];
  function homerVerse(table, roll) {
    const entry = table[rollIndex(roll)];
    if (!entry) throw new RangeError('The table has no verse for that throw.');
    return entry;
  }

  /* ---- Sortes Virgilianae ---------------------------------------------------------------- */
  // Every line of the poem is equally likely, so longer books are drawn from more often.
  function drawLine(books, randomInt) {
    let n = randomInt(books.reduce((sum, book) => sum + book.length, 0));
    for (let b = 0; b < books.length; b++) { if (n < books[b].length) return {book: b + 1, line: n + 1}; n -= books[b].length; }
    throw new RangeError('The text is empty.');
  }
  // The drawn line with up to `around` lines either side, never crossing into another book.
  function passage(books, {book, line}, around = 2) {
    const verse = books[book - 1];
    if (!verse || !verse[line - 1]) throw new RangeError('No such line.');
    const first = Math.max(1, line - around), last = Math.min(verse.length, line + around);
    return {book, line, lines: verse.slice(first - 1, last).map((text, i) => ({number: first + i, text, drawn: first + i === line}))};
  }

  /* ---- Views -------------------------------------------------------------------------- */
  function renderHomer(entry, roll) {
    const threw = `<p class="bo-label">You threw <span class="bo-dice" aria-hidden="true">${roll.map(n => PIPS[n]).join(' ')}</span> ${roll.join(' · ')}</p>`;
    if (entry.lost) return `<figure class="bo-result bo-silent">${threw}
        <p class="bo-line">The verse for this throw is lost.</p>
        <figcaption>No surviving papyrus preserves it; ten of the 216 are missing. The oracle has nothing to say here. Throw again if you wish.</figcaption>
      </figure>`;
    if (entry.withheld) return `<figure class="bo-result bo-silent">${threw}
        <p class="bo-line">This verse is not offered as an answer.</p>
        <figcaption>${esc(entry.withheld)} The verse is Homer, <cite>${esc(entry.work)}</cite> ${entry.book}.${entry.line}. Throw again if you wish.</figcaption>
      </figure>`;
    return `<figure class="bo-result">
        ${threw}
        <blockquote><p class="bo-line">${esc(entry.english)}</p><p class="bo-greek" lang="grc">${esc(entry.greek)}</p></blockquote>
        <figcaption>Homer, <cite>${esc(entry.work)}</cite> ${entry.book}.${entry.line}${entry.note ? ` · ${esc(entry.note)}` : ''}</figcaption>
      </figure>`;
  }
  function renderVirgil(found) {
    return `<figure class="bo-result">
        <p class="bo-label">The book fell open at</p>
        <blockquote>${found.lines.map(l => `<p class="${l.drawn ? 'bo-line' : 'bo-context'}">${esc(l.text)}</p>`).join('')}</blockquote>
        <figcaption>Virgil, <cite>Aeneid</cite>, book ${NUMERALS[found.book - 1]}, line ${found.line} of Dryden’s translation (1697). The lines around it are shown for sense.</figcaption>
      </figure>`;
  }

  const shell = () => `<header class="bo-heading">
      <p class="section-kicker">Oracles of the book</p>
      <h2 id="book-oracles-title">Ask the poets.</h2>
      <p>Long before cards, people took a line of a revered poem as an answer: chosen by dice, or by letting the book fall open. Two of the oldest ways are here. They are offered as the tradition used them, a line to think with, not a prediction.</p>
    </header>
    <div class="bo-grid">
      <article class="bo-part" aria-labelledby="bo-homer-title">
        <p class="bo-kicker">Dice · 216 verses</p>
        <h3 id="bo-homer-title">The Homer oracle</h3>
        <p>A dice oracle from Roman Egypt, preserved in a magical handbook of the third or fourth century (the papyrus known as PGM VII). Hold a question in mind, throw one die three times, and the three numbers pick one verse of the <cite>Iliad</cite> or <cite>Odyssey</cite>.</p>
        <form id="bo-homer-form" class="bo-form">
          <fieldset><legend>Your three throws, in order</legend>
            ${[1, 2, 3].map(i => `<label><span class="bo-visually-hidden">Throw ${i}</span><select id="bo-die-${i}" aria-label="Throw ${i}"><option value="">–</option>${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}">${n}</option>`).join('')}</select></label>`).join('')}
          </fieldset>
          <button type="button" id="bo-homer-roll">Throw the dice for me</button>
          <button type="submit">Read my own throws</button>
        </form>
        <p id="bo-homer-status" class="bo-status" role="status"></p>
        <div id="bo-homer-output" aria-live="polite"></div>
        <details class="dv-method"><summary>About this oracle</summary>
          <p>The table follows Franco Maltomini’s 1995 edition, which pieces the oracle together from three papyri. Ten of the 216 verses survive in none of them, and those throws are shown as lost, not filled in. Six identifications are disputed between editions, and Maltomini’s reading is used.</p>
          <p>The Greek is the standard text of Homer; the papyrus spells about fifty verses a little differently. The English was translated for this site, one verse at a time, and is meant to be plain, not poetic. The verses were chosen in antiquity to be read out of context, so many are abrupt, some are grim, and a few speak of women or enemies as their age did. One verse, which describes a suicide, is listed but not given as an answer.</p>
          <p>The throws are read in the order thrown. The papyri add a prayer to Apollo and lists of permitted days and hours, which are left out here.</p>
        </details>
      </article>
      <article class="bo-part" aria-labelledby="bo-virgil-title">
        <p class="bo-kicker">Bibliomancy · the Aeneid</p>
        <h3 id="bo-virgil-title">The Virgilian lots</h3>
        <p>The <i>Sortes Virgilianae</i>: opening Virgil at random and taking the first line the eye meets. Late Roman biographies have emperors consulting it, and the habit lasted in Europe into the seventeenth century. Hold a question in mind and let the book fall open.</p>
        <form id="bo-virgil-form" class="bo-form"><button type="submit">Open the book</button></form>
        <p id="bo-virgil-status" class="bo-status" role="status"></p>
        <div id="bo-virgil-output" aria-live="polite"></div>
        <details class="dv-method"><summary>About these lots</summary>
          <p>The text is John Dryden’s English <cite>Aeneid</cite> of 1697, all 13,699 lines, in the public domain. Every line is equally likely. Line numbers count Dryden’s verse, which runs longer than Virgil’s Latin, so they will not match a Latin edition.</p>
        </details>
      </article>
    </div>`;

  // table: the 216 Homer entries. randomInt: unbiased integer below max. loadAeneid: () => Promise<{books}>.
  function attach(section, {table, randomInt, loadAeneid}) {
    section.innerHTML = shell();
    const $ = selector => section.querySelector(selector);
    const dice = [1, 2, 3].map(i => $(`#bo-die-${i}`));
    const readHomer = roll => {
      dice.forEach((select, i) => { select.value = String(roll[i]); });
      $('#bo-homer-status').textContent = '';
      $('#bo-homer-output').innerHTML = renderHomer(homerVerse(table, roll), roll);
    };
    $('#bo-homer-roll').addEventListener('click', () => readHomer(throwDice(randomInt)));
    $('#bo-homer-form').addEventListener('submit', event => {
      event.preventDefault();
      const roll = dice.map(select => Number(select.value));
      if (!validRoll(roll)) { $('#bo-homer-output').innerHTML = ''; $('#bo-homer-status').textContent = 'Choose a number from one to six for each of the three throws.'; return; }
      readHomer(roll);
    });

    let aeneid = null;
    $('#bo-virgil-form').addEventListener('submit', async event => {
      event.preventDefault();
      const status = $('#bo-virgil-status');
      try {
        if (!aeneid) { status.textContent = 'Fetching the book…'; aeneid = loadAeneid(); }
        const {books} = await aeneid;
        status.textContent = '';
        $('#bo-virgil-output').innerHTML = renderVirgil(passage(books, drawLine(books, randomInt)));
      } catch (error) {
        aeneid = null;
        status.textContent = 'The book could not be fetched. Check your connection and try again.';
      }
    });
    return {readHomer};
  }

  if (typeof document !== 'undefined') {
    const section = document.querySelector('#book-oracles');
    if (section && typeof HomerOracleData !== 'undefined' && typeof DivinationEngine !== 'undefined') {
      attach(section, {table: HomerOracleData, randomInt: DivinationEngine.randomInt,
        loadAeneid: () => fetch('/assets/texts/aeneid-dryden.json?v=1', {credentials: 'omit'}).then(response => {
          if (!response.ok) throw new Error('Aeneid text unavailable');
          return response.json();
        }).then(data => { if (!Array.isArray(data.books) || data.books.length !== 12) throw new Error('Invalid Aeneid text'); return data; })});
    }
  }

  return {validRoll, rollIndex, throwDice, homerVerse, drawLine, passage, renderHomer, renderVirgil, attach};
});
