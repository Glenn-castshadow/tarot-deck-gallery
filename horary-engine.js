/* Casting the horary question chart: Lilly's considerations before judgment, significators,
   and perfection by aspect, reception, translation and collection (Christian Astrology, 1647). */
const HoraryEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const C = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');

  const aspects = [0, 60, 90, 120, 180];
  const { ordinal } = C;

  function applyingAspect(a, b) {
    const separation = Math.abs(natal.delta(a.longitude, b.longitude));
    let best = null;
    for (const aspect of aspects) { const orb = Math.abs(separation - aspect); if (!best || orb < best.orb) best = { aspect, orb }; }
    const moiety = ((C.orbs[a.name] || 7) + (C.orbs[b.name] || 7)) / 2;
    const later = Math.abs(natal.delta(a.longitude + a.speed / 24, b.longitude + b.speed / 24));
    // Within a single arcminute the aspect is partile (exact for practical purposes); the
    // ordinary "is the projected separation an hour from now still closing" test is numerically
    // unreliable right at exact (an exact aspect can read as trivially separating by fractions of
    // an arcminute), so partile is always reported as applying.
    const partile = best.orb < 1 / 60;
    const applying = partile ? true : Math.abs(later - best.aspect) < best.orb;
    return { aspect: best.orb <= moiety ? best.aspect : null, orb: best.orb, moiety, withinOrb: best.orb <= moiety, applying, partile, separation };
  }

  const SIGN_EXIT_CAP_DAYS = 1100;

  // The instant a planet next leaves its present sign, in days from t0 -- forward, if it is
  // moving toward the sign's far edge, or backward past the sign's near edge if retrograde
  // motion carries it out the way it came in. Both directions are searched regardless of the
  // planet's current motion (a station can flip the direction before the exit happens), and
  // the earlier of the two crossings wins. If neither edge is crossed within the cap, the cap
  // itself stands in as the exit distance, so a search bound is always available.
  function signExitDays(name, t0, lon) {
    const l0 = natal.mod(lon(name, t0)), signStart = Math.floor(l0 / 30) * 30, signEnd = signStart + 30;
    // Bracket first, in whole-day steps, then hand Astronomy Engine's Search the tight bracket --
    // calling Search directly across the full (up to 1100-day) span risks "Excessive iteration"
    // when a planet's own retrograde loops give the objective function more than one crossing
    // over that long a stretch, the same reason perfects() below brackets before searching.
    const bracket = g => {
      let prevT = t0, prevG = g(t0);
      for (let x = t0.AddDays(1); x.ut <= t0.ut + SIGN_EXIT_CAP_DAYS; x = x.AddDays(1)) {
        const gx = g(x);
        if ((prevG < 0 && gx >= 0 || prevG > 0 && gx <= 0) && Math.abs(gx - prevG) < 45) {
          const hit = astro.Search(prevG < 0 ? g : t => -g(t), prevT, x, { dt_tolerance_seconds: 1 });
          if (hit) return hit;
        }
        prevT = x; prevG = gx;
      }
      return null;
    };
    const forward = bracket(t => natal.delta(lon(name, t), signEnd));
    const backward = bracket(t => natal.delta(signStart, lon(name, t)));
    const hits = [forward, backward].filter(Boolean);
    if (!hits.length) return SIGN_EXIT_CAP_DAYS;
    const earliest = hits.reduce((best, h) => (!best || h.ut < best.ut) ? h : best, null);
    return earliest.ut - t0.ut;
  }

  function perfects(a, b, aspect, chart) {
    // The instant the aspect becomes exact, if before either significator changes sign (capped
    // at SIGN_EXIT_CAP_DAYS when neither is found to exit). Astronomy Engine's Search only finds
    // ascending zero-crossings, so both chiralities of a non-conjunction/opposition aspect
    // (leading vs. trailing) are searched by negating the target; this also covers retrograde
    // pairs, where the crossing direction can otherwise go the "wrong" way. Both chiralities are
    // walked to completion (each stopping at its own first bracket hit) and the chronologically
    // earliest of the two candidate crossings wins -- returning on the first chirality to find a
    // hit (as the brief's pseudocode did) is wrong whenever the *other* chirality's crossing
    // comes first, which happens routinely for fast-moving pairs like the Moon.
    const t0 = astro.MakeTime(new Date(chart.date)), lon = (n, t) => astro.Ecliptic(astro.GeoVector(n, t, true)).elon;
    const sign = x => Math.floor(natal.mod(x) / 30);
    const searchedDays = Math.min(signExitDays(a.name, t0, lon), signExitDays(b.name, t0, lon));
    const hits = [];
    for (const s of (aspect === 0 || aspect === 180 ? [1] : [1, -1])) {
      const g = t => natal.delta(lon(a.name, t) - lon(b.name, t), s * aspect);
      for (let x = t0; x.ut < t0.ut + searchedDays; x = x.AddDays(0.5)) {
        const yCandidate = x.AddDays(0.5);
        const y = yCandidate.ut < t0.ut + searchedDays ? yCandidate : t0.AddDays(searchedDays);
        const ga = g(x), gb = g(y);
        if ((ga < 0 && gb >= 0 || ga > 0 && gb <= 0) && Math.abs(gb - ga) < 45) {
          const hit = astro.Search(ga < 0 ? g : t => -g(t), x, y, { dt_tolerance_seconds: 1 });
          if (hit) { hits.push(hit); break; }
        }
      }
    }
    // A null date means the aspect does not perfect before a sign change; searchedDays still
    // reports how far ahead that boundary was, so the caller can tell "checked and found nothing
    // within 30 days" (the old flat cap) apart from "the sign changes in a week, so there was
    // barely time to look."
    if (!hits.length) return { date: null, beforeSignChange: false, searchedDays };
    const earliest = hits.reduce((best, h) => (!best || h.ut < best.ut) ? h : best, null);
    return { date: earliest.date.toISOString(), beforeSignChange: sign(lon(a.name, earliest)) === sign(a.longitude) && sign(lon(b.name, earliest)) === sign(b.longitude), searchedDays };
  }

  function significatorFor(chart, house) {
    const cuspSign = Math.floor(natal.mod(chart.cusps[house - 1]) / 30);
    return { planet: C.rulers[cuspSign], sign: natal.signNames[cuspSign], house, why: `ruler of ${natal.signNames[cuspSign]} on the cusp of the ${ordinal(house)} house` };
  }

  function translation(chart, nameA, nameB) {
    const A = chart.points.find(p => p.name === nameA), B = chart.points.find(p => p.name === nameB);
    for (const P of chart.points.filter(p => C.planets.includes(p.name) && p.name !== nameA && p.name !== nameB)) {
      if (Math.abs(P.speed) <= Math.abs(A.speed) || Math.abs(P.speed) <= Math.abs(B.speed)) continue;
      const toA = applyingAspect(P, A), toB = applyingAspect(P, B);
      if (toA.aspect !== null && !toA.applying && toB.aspect !== null && toB.applying) return { planet: P.name, from: nameA, to: nameB };
      if (toB.aspect !== null && !toB.applying && toA.aspect !== null && toA.applying) return { planet: P.name, from: nameB, to: nameA };
    }
    return null;
  }

  function collection(chart, nameA, nameB) {
    const A = chart.points.find(p => p.name === nameA), B = chart.points.find(p => p.name === nameB);
    for (const P of chart.points.filter(p => C.planets.includes(p.name) && p.name !== nameA && p.name !== nameB)) {
      if (Math.abs(P.speed) >= Math.abs(A.speed) || Math.abs(P.speed) >= Math.abs(B.speed)) continue;
      const fromA = applyingAspect(A, P), fromB = applyingAspect(B, P);
      if (fromA.aspect === null || !fromA.applying || fromB.aspect === null || !fromB.applying) continue;
      // Lilly's collection requires the slower third planet to actually receive both
      // significators (be their dispositor by rulership or exaltation), not merely stand in
      // applying aspect to both -- otherwise it is receiving nothing to "collect."
      if (C.reception(P.name, nameA, chart).any && C.reception(P.name, nameB, chart).any) return { planet: P.name };
    }
    return null;
  }

  function cast({ date, location, houseMatter }) {
    if (!Number.isInteger(houseMatter) || houseMatter < 1 || houseMatter > 12) throw new RangeError('Choose a house from 1 to 12.');
    const chart = natal.chartAtInstant(date, location, { houseSystem: 'regiomontanus' });
    if (chart.status !== 'ready') return chart;
    const sect = C.sect(chart), hour = C.planetaryHours(new Date(chart.date), location), moon = C.moonCondition(chart);
    const ascSign = Math.floor(chart.angles.asc / 30), ascDegree = chart.angles.asc - ascSign * 30;
    const querent = { ...significatorFor(chart, 1), why: `ruler of the Ascendant, ${natal.signNames[ascSign]}` };
    let quesited = significatorFor(chart, houseMatter);
    if (houseMatter === 1) {
      // The first house is the querent's own house, so its ruler is the querent's own
      // significator -- querent and quesited are necessarily one and the same, not a case of
      // Lilly's shared-ruler workaround below (which only applies when a *different* house
      // happens to share the Ascendant's ruler).
      quesited = { ...quesited, shared: true, why: `${quesited.why}; the first house is the querent, so querent and quesited are one` };
    } else if (quesited.planet === querent.planet) {
      const s = Math.floor(natal.mod(chart.cusps[houseMatter - 1]) / 30);
      const ex = Object.entries(C.exaltations).find(([, v]) => v[0] === s);
      if (ex) {
        quesited = { ...quesited, planet: ex[0], why: `${quesited.why}; the sign’s ruler already signifies the querent, so its exaltation ruler stands for the quesited, a remedy consistent with Lilly's use of the exaltation lord as a secondary significator` };
      } else {
        quesited = { ...quesited, shared: true };
      }
    }
    const saturnHouse = natal.houseFor(chart.points.find(p => p.name === 'Saturn').longitude, chart.cusps);
    const tripRuler = C.triplicities[ascSign % 4][sect === 'day' ? 0 : 1];
    const considerations = [
      { key: 'ascEarly', present: ascDegree < 3, detail: `Ascendant at ${ascDegree.toFixed(1)}° of ${natal.signNames[ascSign]}` },
      { key: 'ascLate', present: ascDegree > 27, detail: `Ascendant at ${ascDegree.toFixed(1)}° of ${natal.signNames[ascSign]}` },
      { key: 'saturnAngular', present: saturnHouse === 1 || saturnHouse === 7, detail: `Saturn in the ${ordinal(saturnHouse)} house` },
      { key: 'moonVoid', present: moon.voidOfCourse, detail: moon.nextAspect ? `the Moon next perfects a ${moon.nextAspect.aspect}° aspect with ${moon.nextAspect.planet}` : 'the Moon perfects no aspect before leaving its sign' },
      { key: 'viaCombusta', present: moon.viaCombusta, detail: 'Moon between 15° Libra and 15° Scorpio' },
      { key: 'radical', present: hour.status === 'ready' ? (hour.hours[hour.current]?.ruler === querent.planet || hour.hours[hour.current]?.ruler === tripRuler) : null, detail: hour.status === 'ready' ? `hour of ${hour.hours[hour.current]?.ruler || 'an hour outside the table'}; Ascendant ruler ${querent.planet}, triplicity ruler ${tripRuler}` : 'planetary hour undefined here' },
    ];
    const P = name => chart.points.find(p => p.name === name);
    const sig = (s, name) => ({ ...s, point: P(name), essential: C.dignities(name, P(name).longitude, sect), accidental: C.accidental(P(name), chart) });
    const significators = { querent: sig(querent, querent.planet), moon: sig({ planet: 'Moon', why: 'co-significator of the querent and of the matter' }, 'Moon'), quesited: sig(quesited, quesited.planet) };
    const pairs = [['querent', 'quesited'], ['moon', 'quesited'], ['querent', 'moon']];
    const rawAspects = pairs.filter(([x, y]) => significators[x].planet !== significators[y].planet).map(([x, y]) => {
      const a = significators[x].point, b = significators[y].point, r = applyingAspect(a, b);
      const p = r.aspect !== null && r.applying ? perfects(a, b, r.aspect, chart) : null;
      return { a: a.name, b: b.name, roles: [x, y], ...r, perfects: p?.date ?? null, beforeSignChange: p?.beforeSignChange ?? false, searchedDays: p?.searchedDays ?? null };
    });
    // When querent and quesited resolve to the same planet (house 1, or Lilly's shared-ruler
    // fallback), the ['moon','quesited'] and ['querent','moon'] role-pairs above are the same
    // physical planet pair computed twice; collapse them into one row rather than showing the
    // same aspect twice under different role labels, merging every role that touched it.
    const aspectsOut = [];
    for (const asp of rawAspects) {
      const key = [asp.a, asp.b].sort().join('|');
      const existing = aspectsOut.find(e => [e.a, e.b].sort().join('|') === key);
      if (existing) existing.roles = [...new Set([...existing.roles, ...asp.roles])];
      else aspectsOut.push(asp);
    }
    const receptions = [['querent', 'quesited'], ['quesited', 'querent']].filter(([x, y]) => significators[x].planet !== significators[y].planet).map(([x, y]) => ({ from: significators[x].planet, to: significators[y].planet, ...C.reception(significators[x].planet, significators[y].planet, chart) }));
    // Found by the actual querent/quesited planet names, not by role-tag membership: after the
    // de-duplication above, a merged row can carry both the 'querent' and 'quesited' role tags
    // (inherited from the moon-pairs) without ever being the querent-quesited pair itself, which
    // never exists as a row when the two share one planet -- a planet cannot aspect itself.
    const main = significators.querent.planet === significators.quesited.planet ? undefined
      : aspectsOut.find(x => (x.a === significators.querent.planet && x.b === significators.quesited.planet) || (x.a === significators.quesited.planet && x.b === significators.querent.planet));
    const perfection = {
      byAspect: Boolean(main && main.aspect !== null && main.applying && main.beforeSignChange),
      byReception: receptions.length === 2 && receptions.every(r => r.any),
      translation: significators.querent.planet !== significators.quesited.planet ? translation(chart, significators.querent.planet, significators.quesited.planet) : null,
      collection: significators.querent.planet !== significators.quesited.planet ? collection(chart, significators.querent.planet, significators.quesited.planet) : null,
    };
    return { status: 'ready', chart, sect, hour, moon, considerations, significators, receptions, aspects: aspectsOut, perfection, houseMatter };
  }

  return { cast, significatorFor, applyingAspect, perfects, translation, collection };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HoraryEngine;
