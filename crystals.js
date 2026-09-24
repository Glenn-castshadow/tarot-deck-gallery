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

  return {dailyIndex, stonesFor, filter, swatch};
});
