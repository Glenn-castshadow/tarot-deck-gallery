/* The /crystals/ page: crystal of the day, your stones and the filterable grid. The helpers are
   exported for Node tests and for tools/build_reference_pages.cjs; attach() runs only on the page. */
(function(root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.Crystals = api; })(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  // FNV-1a, the hash tarot.js uses for the daily card. The prefix keeps the two picks independent.
  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  const dailyIndex = (dateKey, count) => hashString(`crystal-${dateKey}`) % count;

  function stonesFor(crystals, lore, {month, sign} = {}) {
    const bySlug = new Map(crystals.map(c => [c.slug, c]));
    const pick = text => (text ? text.split(' · ') : []).map(name => bySlug.get(lore.stoneSlug(name))).filter(Boolean);
    const birthstone = month ? pick(lore.birthstones[month]) : [];
    const signStones = sign ? pick(sign.stones) : [];
    const listed = new Set([...birthstone, ...signStones]);
    const kindred = sign ? crystals.filter(c => c.signs.includes(sign.name) && !listed.has(c)) : [];
    return {birthstone, signStones, kindred};
  }

  function filter(crystals, {q = '', chakra = '', sign = '', element = ''} = {}) {
    const needle = q.trim().toLowerCase();
    return crystals.filter(c => (!needle || [c.name, ...c.aka].some(name => name.toLowerCase().includes(needle)))
      && (!chakra || c.chakras.includes(chakra)) && (!sign || c.signs.includes(sign)) && (!element || c.element === element));
  }

  const swatch = colours => colours.length === 1 ? colours[0] : `linear-gradient(135deg, ${colours.join(', ')})`;

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SIGN_KEY = 'ishtar-sun-sign-v1'; // shared with the hub's sign picker

  function attach() {
    const {crystals, chakras} = CrystalData;
    const {zodiacSigns, escapeHTML: esc, birthdayParts, zodiacFor, localDateKey} = BirthLore;
    const byName = [...crystals].sort((a, b) => a.name.localeCompare(b.name));
    const card = c => `<a class="crystal-card" href="/crystals/${c.slug}/"><span class="crystal-swatch" style="background:${swatch(c.colours)}" aria-hidden="true"></span><strong>${esc(c.name)}</strong><small>${esc(c.keyword)}</small></a>`;

    const today = crystals[dailyIndex(localDateKey(), crystals.length)];
    document.querySelector('#crystal-day-output').innerHTML = `<div class="crystal-day">
      <span class="crystal-swatch" style="background:${swatch(today.colours)}" aria-hidden="true"></span>
      <div><h3>${esc(today.name)}</h3><p class="crystal-keyword">${esc(today.keyword)}</p><p>${esc(today.meaning)}</p>
      <p class="crystal-prompt">${esc(today.prompt)}</p><p><a href="/crystals/${today.slug}/">Read about ${esc(today.name)} ↗</a></p></div></div>`;

    const mine = document.querySelector('#your-stones-output');
    let latest = null, month = 0;
    function storedSign() {
      const index = Number(IshtarStorage.getItem(SIGN_KEY) ?? -1);
      return Number.isInteger(index) && index >= 0 && index < 12 ? zodiacSigns[index] : null;
    }
    function renderMine(state) {
      latest = state;
      const parts = birthdayParts(state?.profile?.birthday);
      const sign = parts ? (state.natal?.status === 'ready' ? zodiacSigns[state.natal.points[0].index] : zodiacFor(parts)) : storedSign();
      const m = parts ? parts.month : month;
      const pickers = parts ? '' : `<div class="crystal-pickers">
        <label><span>Birth month</span><select id="crystal-month"><option value="">Choose a month</option>${MONTHS.map((name, i) => `<option value="${i + 1}"${m === i + 1 ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
        <label><span>Sun sign</span><select id="crystal-sign"><option value="">Choose your sign</option>${zodiacSigns.map((z, i) => `<option value="${i}"${z === sign ? ' selected' : ''}>${z.symbol} ${z.name}</option>`).join('')}</select></label></div>`;
      const {birthstone, signStones, kindred} = stonesFor(crystals, BirthLore, {month: m, sign});
      const group = (title, list) => list.length ? `<h3>${esc(title)}</h3><div class="crystal-grid">${list.map(card).join('')}</div>` : '';
      mine.innerHTML = pickers
        + (m ? group(`${MONTHS[m - 1]} birthstone`, birthstone) : '')
        + (sign ? group(`${sign.name} stones`, signStones) + group(`Also linked with ${sign.name}`, kindred) : '')
        + (!m && !sign ? '<p class="crystal-empty">Choose a month or a sign, or enter your birth date on the <a href="/charts/#birthday-room">Charts page</a>.</p>' : '');
    }
    mine.addEventListener('change', event => {
      const id = event.target.id;
      if (id === 'crystal-month') month = Number(event.target.value) || 0;
      else if (id === 'crystal-sign') {
        if (event.target.value === '') IshtarStorage.removeItem(SIGN_KEY); else IshtarStorage.setItem(SIGN_KEY, event.target.value);
      } else return;
      renderMine(latest);
      mine.querySelector(`#${id}`)?.focus();
    });
    BirthProfile.subscribe(renderMine);

    const form = document.querySelector('#crystal-filters');
    const options = list => list.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');
    form.elements.chakra.insertAdjacentHTML('beforeend', options(chakras.map(c => [c.key, c.name])));
    form.elements.sign.insertAdjacentHTML('beforeend', options(zodiacSigns.map(z => [z.name, z.name])));
    form.elements.element.insertAdjacentHTML('beforeend', options(['Fire', 'Earth', 'Air', 'Water'].map(e => [e, e])));
    const grid = document.querySelector('#crystal-grid'), count = document.querySelector('#crystal-count');
    function renderGrid() {
      const list = filter(byName, Object.fromEntries(new FormData(form)));
      grid.innerHTML = list.map(card).join('');
      count.textContent = `${list.length} of ${crystals.length} crystals`;
    }
    form.addEventListener('input', renderGrid);
    form.addEventListener('submit', event => event.preventDefault());
    renderGrid();
  }
  if (typeof document !== 'undefined' && document.querySelector('#crystal-room')) attach();

  return {dailyIndex, stonesFor, filter, swatch};
});
