/* Room registry: every saveable room registers its kind here. account.js saves through
   current() and opens through load(); rooms.js also knows which page owns each kind and
   what to call it. The journal lives on /account/, which loads no room module, so the
   label has to be available without a registration. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rooms = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CATEGORIES = ['tarot', 'sky', 'charts', 'eastern', 'numerology', 'divination'];
  // Mirrors server/ishtar/readings/kinds.py. Kinds added by later sub-projects join both lists.
  const PAGES = {
    'tarot-daily': '/tarot/', 'tarot-spread': '/tarot/',
    'transit-calendar': '/sky/',
    lenormand: '/divination/', oracle: '/divination/', runes: '/divination/', geomancy: '/divination/', iching: '/divination/',
    'grand-tableau': '/divination/', 'geomancy-houses': '/divination/', cartomancy: '/divination/',
    natal: '/charts/', 'solar-return': '/charts/', 'lunar-return': '/charts/', progressed: '/charts/', synastry: '/charts/', composite: '/charts/', davison: '/charts/', horary: '/charts/',
    // BaZi is one tab of the CelestialExtras component, which lives whole on /charts/.
    jyotish: '/eastern/', bazi: '/charts/',
    numerology: '/numerology/'
  };
  // Mirrors the labels in server/ishtar/readings/kinds.py.
  const LABELS = {
    'tarot-daily': 'Daily card', 'tarot-spread': 'Tarot spread',
    'transit-calendar': 'Transit calendar',
    lenormand: 'Lenormand', oracle: 'Ishtar Reflection Oracle', runes: 'Runes', geomancy: 'Geomancy', iching: 'I Ching',
    'grand-tableau': 'Grand Tableau', 'geomancy-houses': 'Geomantic house chart', cartomancy: 'Playing cards',
    natal: 'Birth chart', 'solar-return': 'Solar return', 'lunar-return': 'Lunar return', progressed: 'Progressed chart', synastry: 'Synastry', composite: 'Composite chart', davison: 'Davison chart', horary: 'Horary chart',
    jyotish: 'Jyotish chart', bazi: 'Four Pillars',
    numerology: 'Numerology'
  };
  let rooms = new Map();
  function register(kind, room) {
    if (!CATEGORIES.includes(room.category)) throw new Error(`Unknown category for ${kind}`);
    if (rooms.has(kind)) throw new Error(`Room already registered: ${kind}`);
    if (typeof room.current !== 'function' || typeof room.load !== 'function') throw new Error(`Room ${kind} needs current() and load()`);
    rooms.set(kind, {kind, ...room});
  }
  async function openFromQuery({search, getReading, scrollTo}) {
    const id = Number(new URLSearchParams(search).get('reading'));
    if (!Number.isInteger(id) || id <= 0) return 'none';
    const result = await getReading(id);
    if (!result.ok) return 'failed';
    const room = rooms.get(result.reading.kind);
    if (!room) return 'unknown';
    if (!room.load(result.reading)) return 'failed';
    scrollTo(room);
    return 'opened';
  }
  return {
    CATEGORIES, register, openFromQuery,
    get: kind => rooms.get(kind) || null,
    list: () => Array.from(rooms.values()),
    pageFor: kind => PAGES[kind] || null,
    labelFor: kind => rooms.get(kind)?.label || LABELS[kind] || null,
    _reset: () => { rooms = new Map(); }
  };
});
