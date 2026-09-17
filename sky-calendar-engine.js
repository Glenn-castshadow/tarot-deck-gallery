/* Sky calendar engine: where the Moon is now, this month's sky, retrogrades, and the exact
   moments that touch a reader's birth chart. Task 1 builds the module skeleton and moonNow.
   Later tasks add void-of-course, month events, stations, eclipses, a retrograde tracker and
   personal transits to this same file. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SkyCalendarEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');

  const MIN_YEAR = 1901, MAX_YEAR = 2100;
  // Character-identical to BirthLore.moonNames (birth-lore.js:53) so the hub's today strip
  // and this section can never disagree about what a Moon phase is called.
  const PHASE_NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const QUARTER_NAMES = ['New moon', 'First quarter', 'Full moon', 'Third quarter'];
  const signNames = natal.signNames;

  const lonOf = (body, time) => astro.Ecliptic(astro.GeoVector(body, time, true)).elon;
  const inRange = date => date instanceof Date && Number.isFinite(+date)
    && date.getUTCFullYear() >= MIN_YEAR && date.getUTCFullYear() <= MAX_YEAR;
  const signOf = longitude => Math.floor(natal.mod(longitude) / 30);

  // Void-of-course: Lilly's six classical planets, and the modern list that adds the outers.
  const CLASSICAL_PLANETS = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const MODERN_PLANETS = CLASSICAL_PLANETS.concat(['Uranus', 'Neptune', 'Pluto']);
  const ASPECTS = [0, 60, 90, 120, 180];

  const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  // Per-step search window for ingresses(). The brief sized these to "certain to cover 30
  // degrees" using each body's mean direct speed, but that isn't actually what safety here
  // requires: the loop below re-searches from the real current position every iteration (see
  // ingresses), so an undersized step just costs an extra retry, never a missed event. What
  // an OVERSIZED step risks is bracketing a whole retrograde loop -- out, back, and out again
  // through the same cusp -- inside one astro.Search call, which only ever resolves a single
  // ascending root and would silently pick (or fail to find) the wrong one of two. Jupiter's
  // station-to-station retrograde alone runs ~120 days, Saturn's ~140, Uranus's ~150,
  // Neptune's and Pluto's ~160 -- so the brief's 120/240/600/1200/1200 day steps for those
  // five bodies could each swallow a full loop. Shrunk to 40 days, comfortably under even
  // Jupiter's shortest loop, so no window can ever contain more than one same-direction
  // crossing of a given cusp. Sun and Moon never retrograde in ecliptic longitude, so that
  // hazard can't occur for them regardless of window size; Mercury/Venus/Mars keep the
  // brief's values because each is already well under that body's own retrograde duration
  // (Mercury ~21-24d loop vs 10d step, Venus ~40-43d vs 15d, Mars ~60-80d vs 30d).
  const STEP_DAYS = {Sun: 20, Moon: 1.5, Mercury: 10, Venus: 15, Mars: 30,
                     Jupiter: 40, Saturn: 40, Uranus: 40, Neptune: 40, Pluto: 40};

  // Degrees per day, the same central difference natal-engine.js uses for its retrograde flag
  // (natal-engine.js:123: speed = delta(longitudeAt(name, t+12h), longitudeAt(name, t-12h))).
  const speedAt = (body, time) =>
    natal.delta(lonOf(body, time.AddDays(0.5)), lonOf(body, time.AddDays(-0.5)));

  // Every sign ingress a body makes in [from, to), including retrograde re-entries into a
  // sign it just left. astro.Search only ever resolves an ascending zero-crossing, so each
  // step searches both this sign's upper cusp (the forward exit) and its lower cusp, found by
  // searching the flipped difference so a backward (descending) crossing also reads as
  // ascending. Whichever comes first in time is the real next event; a retrograde ingress
  // found this way is a genuine event, not a duplicate of the forward one.
  function ingresses(from, to, bodies = BODIES) {
    const out = [];
    const end = astro.MakeTime(to);
    for (const body of bodies) {
      let t = astro.MakeTime(from);
      while (t.ut < end.ut) {
        const currentIndex = signOf(lonOf(body, t));
        const floorDeg = currentIndex * 30;
        const upper = natal.mod(floorDeg + 30);
        const window = t.AddDays(STEP_DAYS[body]);
        const limit = window.ut < end.ut ? window : end;
        const hitUp = astro.Search(x => natal.delta(lonOf(body, x), upper), t, limit, {dt_tolerance_seconds: 1});
        const hitDown = astro.Search(x => natal.delta(floorDeg, lonOf(body, x)), t, limit, {dt_tolerance_seconds: 1});
        const hit = hitUp && (!hitDown || hitUp.ut <= hitDown.ut) ? hitUp : hitDown;
        if (!hit) { t = window; continue; }
        const enteredIndex = hit === hitUp ? (currentIndex + 1) % 12 : (currentIndex + 11) % 12;
        out.push({
          type: 'ingress', body, sign: signNames[enteredIndex], signIndex: enteredIndex,
          date: hit.date.toISOString(), retrograde: speedAt(body, hit) < 0
        });
        t = hit.AddDays(0.01);
      }
    }
    return out;
  }

  // Bodies that retrograde and so can station; the Sun and Moon never do (global constraint).
  const STATION_BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  // Every retrograde/direct station in [from, to). astro.Search only resolves ascending zero
  // crossings, so each day-long bracket that changes sign is searched with a flipped multiplier
  // when speed is descending through zero (direct -> retrograde), the same sign-flip idiom
  // ingresses() uses for its backward crossings. Stations are weeks apart for every listed
  // body (Mercury's ~21-24 day retrograde loop is the shortest), so a one-day bracket can never
  // straddle two stations. The last bracket is clamped to `to` (not left at a full day past it)
  // so a non-day-aligned window -- e.g. Task 5's tracker windows anchored to "now" -- can never
  // report a station at or after the caller's own upper bound.
  function stations(from, to, bodies = STATION_BODIES) {
    const out = [];
    const end = astro.MakeTime(to);
    for (const body of bodies) {
      let t = astro.MakeTime(from), prev = speedAt(body, t);
      while (t.ut < end.ut) {
        const next = t.AddDays(1);
        const limit = next.ut < end.ut ? next : end;   // clamp the bracket to `to`, same as ingresses()
        const speed = speedAt(body, limit);
        if ((prev < 0) !== (speed < 0)) {
          const hit = astro.Search(x => (prev < 0 ? 1 : -1) * speedAt(body, x), t, limit, {dt_tolerance_seconds: 60});
          if (hit && hit.ut < end.ut) {
            const longitude = lonOf(body, hit);
            out.push({type: 'station', body, direction: prev < 0 ? 'direct' : 'retrograde',
                      date: hit.date.toISOString(), longitude, sign: signNames[signOf(longitude)]});
          }
        }
        prev = speed; t = next;
      }
    }
    return out.sort((a, b) => a.date < b.date ? -1 : 1);
  }

  // Task 5: retrograde tracker with shadow periods.
  //
  // retrogradeState() needs to find, per body, the pair of stations (retrograde start, direct
  // end) that bracket a query date -- either the pair the body is currently inside, or the
  // next upcoming pair. It does this by asking `stations()` for a window around the date, so
  // it never reimplements station-finding. Two tables size that window, and the shadow
  // searches that follow, per body -- both derived from the real station record over the
  // whole 1901-2100 range (`node --test` scratch run against E.stations, see task-5-report.md),
  // not the flat 400-day figure the brief's Pluto-only justification suggests, because Venus's
  // and Mars's synodic periods make their direct arcs far longer than Pluto's ever gets.
  //
  // STATION_BRACKET_DAYS: `back` must clear the body's longest observed direct-arc gap (so the
  // most recent station before the date is always inside the window); `fwd` must clear a full
  // direct arc plus a full retrograde arc (so, when the date isn't retrograde, both the next
  // retrograde station and the direct station that ends it land inside the window). Observed
  // worst cases (maxDirectArc / maxRetroArc, in days): Mercury 101.8/24.2, Venus 545.1/43.1,
  // Mars 745.4/81.2, Jupiter 284.7/123.6, Saturn 245.8/141.4, Uranus 220.9/154.3,
  // Neptune 211.1/160.3, Pluto 211.7/165.5. Each width below clears its body's sum with margin.
  const STATION_BRACKET_DAYS = {
    Mercury: {back: 110, fwd: 140}, Venus: {back: 560, fwd: 600}, Mars: {back: 760, fwd: 850},
    Jupiter: {back: 295, fwd: 420}, Saturn: {back: 255, fwd: 400}, Uranus: {back: 230, fwd: 385},
    Neptune: {back: 220, fwd: 380}, Pluto: {back: 220, fwd: 390}
  };

  // SHADOW_WINDOW_DAYS: how far each shadow search reaches from its station. Measured actual
  // shadow durations top out around (days): Mercury 19, Venus 33, Mars 67.5, Jupiter 88,
  // Saturn 98, Uranus 108.5, Neptune 113, Pluto 114.5 -- always shorter than the retrograde arc
  // itself, because the body crosses the same span at its ordinary (faster) direct speed
  // rather than the decelerated speed it shows nearer the station. Each width clears its
  // body's observed max with 30-40% margin while staying well inside that body's shortest
  // direct arc (87.8 for Mercury up to 200.8 for Pluto, same scan), so a search can never
  // wander past the adjacent retrograde loop into the wrong crossing.
  const SHADOW_WINDOW_DAYS = {
    Mercury: 35, Venus: 55, Mars: 100, Jupiter: 130, Saturn: 140, Uranus: 150, Neptune: 155, Pluto: 150
  };

  // Both shadow searches look for the body crossing a fixed longitude while it is moving
  // direct (increasing longitude) throughout the bracket, exactly like a forward sign
  // ingress: delta(lonOf(body, t), target) rises from negative to positive, which is already
  // the ascending root astro.Search resolves. No sign flip is needed here (contrast the
  // descending re-entries ingresses()/stations() handle by negating their search function).
  function retrogradeState(date) {
    if (!inRange(date)) return {status: 'out-of-range'};
    return STATION_BODIES.flatMap(body => {
      const {back, fwd} = STATION_BRACKET_DAYS[body];
      const from = new Date(date.getTime() - back * 86400000);
      const to = new Date(date.getTime() + fwd * 86400000);
      const list = stations(from, to, [body]);

      let prev = null, next = null, nextNext = null;
      for (let i = 0; i < list.length; i++) {
        if (new Date(list[i].date) <= date) { prev = list[i]; continue; }
        next = list[i]; nextNext = list[i + 1] || null; break;
      }

      const isRetrograde = !!prev && prev.direction === 'retrograde';
      const retroStation = isRetrograde ? prev : next;
      const directStation = isRetrograde ? next : nextNext;

      // Every STATION_BRACKET_DAYS window is sized from the real station record over the whole
      // supported range, so both ends of the pair are always found today. If one were ever
      // narrowed past that, drop the body rather than dereference a null -- this function
      // contracts to return a result, not to throw.
      if (!retroStation || !directStation) return [];

      const retroTime = astro.MakeTime(new Date(retroStation.date));
      const directTime = astro.MakeTime(new Date(directStation.date));
      const w = SHADOW_WINDOW_DAYS[body];

      const preShadow = astro.Search(t => natal.delta(lonOf(body, t), directStation.longitude),
        retroTime.AddDays(-w), retroTime, {dt_tolerance_seconds: 60}) || retroTime;
      const postShadow = astro.Search(t => natal.delta(lonOf(body, t), retroStation.longitude),
        directTime, directTime.AddDays(w), {dt_tolerance_seconds: 60}) || directTime;

      return [{
        body, isRetrograde,
        period: {
          start: retroStation.date, end: directStation.date,
          startSign: retroStation.sign, endSign: directStation.sign,
          preShadow: preShadow.date.toISOString(), postShadow: postShadow.date.toISOString()
        }
      }];
    });
  }

  // Every lunar and global solar eclipse peaking in [from, to). "Global" solar circumstances
  // only (kind/obscuration/where the axis meets the geoid) -- this section never claims local
  // visibility, so no observer-specific fields are computed or returned.
  function eclipses(from, to) {
    const out = [];
    const start = astro.MakeTime(from), end = astro.MakeTime(to);

    let lunar = astro.SearchLunarEclipse(start);
    while (lunar.peak.ut < end.ut) {
      out.push({type: 'eclipse', kind: lunar.kind, body: 'Moon',
                date: lunar.peak.date.toISOString(), obscuration: lunar.obscuration});
      lunar = astro.NextLunarEclipse(lunar.peak);
    }

    let solar = astro.SearchGlobalSolarEclipse(start);
    while (solar.peak.ut < end.ut) {
      out.push({type: 'eclipse', kind: solar.kind, body: 'Sun', date: solar.peak.date.toISOString(),
                obscuration: solar.obscuration, latitude: solar.latitude, longitude: solar.longitude});
      solar = astro.NextGlobalSolarEclipse(solar.peak);
    }

    return out.sort((a, b) => a.date < b.date ? -1 : 1);
  }

  // Quarters, ingresses, stations and eclipses for one calendar month (1-12), UTC bounds,
  // sorted ascending.
  // A void band is an INTERVAL, so it is returned as a sibling of `events` rather than an entry
  // in it: every member of `events` is an instant with a single `date`, and the local-day
  // bucketing, the sort and the tests all rely on that. Both traditions are computed over one
  // window, so they walk the same ingresses and pair by shared end instant; the modern band
  // always begins at or after the classical one and ends with it (see voidPeriods).
  // The window is padded so a band that opens late in the previous month, or closes early in the
  // next, is still offered to this month's reader. Four days exceeds the Moon's ~2.2-day sign
  // transit, so the padded run's own clipped first period always closes before `from` and is
  // filtered out; `!clipped` is kept as well because a clipped period's null lastAspect would
  // otherwise read as a genuinely aspectless sign.
  const VOID_PAD_MS = 4 * 86400000;
  function voidBands(from, to) {
    const wideFrom = new Date(+from - VOID_PAD_MS), wideTo = new Date(+to + VOID_PAD_MS);
    const classical = voidPeriodsCore(wideFrom, wideTo, CLASSICAL_PLANETS);
    const modernByEnd = new Map(voidPeriodsCore(wideFrom, wideTo, MODERN_PLANETS).map(p => [p.end, p]));
    return classical
      .filter(p => !p.clipped && new Date(p.end) > from && new Date(p.start) < to)
      .map(p => {
        const modern = modernByEnd.get(p.end);
        return {
          start: p.start,
          modernStart: modern ? modern.start : p.start,
          end: p.end,
          sign: p.sign,
          lastAspect: p.lastAspect,
          modernLastAspect: modern ? modern.lastAspect : null
        };
      });
  }

  function monthEvents(year, month) {
    // Same guard as personalTransits: both halves have to be real integers in range, or
    // month 0 quietly returns last December, 13 next January and 5.5 rounds to May.
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return {status: 'out-of-range'};
    if (!Number.isInteger(month) || month < 1 || month > 12) return {status: 'out-of-range'};
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));

    const events = [];
    let mq = astro.SearchMoonQuarter(from);
    while (mq.time.ut < astro.MakeTime(to).ut) {
      events.push({type: 'quarter', quarter: mq.quarter, name: QUARTER_NAMES[mq.quarter], date: mq.time.date.toISOString()});
      mq = astro.NextMoonQuarter(mq);
    }

    events.push(...ingresses(from, to), ...stations(from, to), ...eclipses(from, to));
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    // `voids` is a lazy, memoised getter rather than an eager property. A month's bands cost an
    // aspect search per sign transit -- about a second -- and the month view slices three UTC
    // months for its events, so computing bands eagerly would charge three seconds to a caller
    // that never reads them. The shape the docs describe is unchanged: `result.voids` is an
    // array on a ready month and absent on an out-of-range one.
    const result = {status: 'ready', events};
    let bands = null;
    Object.defineProperty(result, 'voids', {
      enumerable: true,
      get() { return bands || (bands = voidBands(from, to)); }
    });
    return result;
  }

  function moonIngresses(from, to) {
    const out = [];
    let t = astro.MakeTime(from), end = astro.MakeTime(to);
    while (t.ut < end.ut) {
      const signEnd = Math.floor(natal.mod(lonOf('Moon', t)) / 30) * 30 + 30;
      const hit = astro.Search(x => natal.delta(lonOf('Moon', x), natal.mod(signEnd)), t, t.AddDays(3.5), {dt_tolerance_seconds: 1});
      if (!hit || hit.ut >= end.ut) break;
      out.push(hit);
      t = hit.AddDays(0.01);            // step past the boundary so the next search advances
    }
    return out;
  }

  // The last exact Ptolemaic aspect the Moon makes to any listed planet inside [a, b].
  // Brackets every six hours and searches both chiralities of each non-symmetric aspect,
  // because a sextile is two distinct separations (+60 and -60) -- the same method
  // classical-engine.js uses (see docs/HORARY.md). Chirality is which target is enumerated;
  // it is independent of the direction the function crosses zero.
  //
  // Only the ASCENDING crossing is searched here, and no sign-flipped pass is needed, because
  // the Moon-minus-planet differential is strictly increasing over this planet list: the Moon
  // outruns every one of them at every instant, so g can only ever cross zero upward. Measured
  // over 2026 at hourly resolution the differential's minimum rate is +9.85 deg/day, against
  // Mercury on 2026-05-06 (a fast direct Mercury; the Sun's own minimum is +10.77 and every
  // outer planet is above +11.6).
  //
  // That is a property of THIS planet list, not of the method. Reused for planet-to-planet
  // aspects the differential changes sign at every station, descending crossings become real,
  // and this function would silently miss half of them -- it would then need the sign-flip
  // idiom ingresses()/stations() use.
  // Unguarded core shared by moonAspects (public, range-checked) and lastAspectBefore
  // (private; its callers pad their windows and may step outside 1901-2100, see voidStateFor).
  function moonAspectsCore(a, b, planets) {
    const from = astro.MakeTime(a), to = astro.MakeTime(b);
    const out = [];
    for (const planet of planets) for (const aspect of ASPECTS) for (const sign of (aspect === 0 || aspect === 180 ? [1] : [1, -1])) {
      const g = t => natal.delta(lonOf('Moon', t) - lonOf(planet, t), sign * aspect);
      for (let s = from; s.ut < to.ut; s = s.AddDays(0.25)) {
        const e = s.AddDays(0.25).ut < to.ut ? s.AddDays(0.25) : to;
        const gs = g(s), ge = g(e);
        if (gs < 0 && ge >= 0 && ge - gs < 45) {
          const hit = astro.Search(g, s, e, {dt_tolerance_seconds: 1});
          if (hit) out.push({time: hit, planet, aspect});
        }
      }
    }
    return out.sort((x, y) => x.time.ut - y.time.ut);
  }

  function lastAspectBefore(a, b, planets) {
    const hits = moonAspectsCore(a, b, planets);
    return hits.length ? hits[hits.length - 1] : null;
  }

  // Unguarded core: computes periods over [from, to] with no regard for the public 1901-2100
  // range. Used directly by voidStateFor, whose padded search window can briefly step outside
  // that range even for a `date` that itself is comfortably in range (see voidPeriods below).
  function voidPeriodsCore(from, to, planets) {
    const ingresses = moonIngresses(from, to);
    const periods = [];
    let prev = astro.MakeTime(from);
    let first = true;
    for (const ingress of ingresses) {
      const last = lastAspectBefore(prev, ingress, planets);
      periods.push({
        start: (last ? last.time.date : prev.date).toISOString(),
        end: ingress.date.toISOString(),
        sign: signNames[signOf(lonOf('Moon', prev.AddDays(0.01)))],
        lastAspect: last ? {planet: last.planet, aspect: last.aspect} : null,
        // The first period is bounded by `from`, not a real sign ingress, so a null
        // lastAspect here does not mean the transit was genuinely void -- see docs.
        clipped: first
      });
      prev = ingress;
      first = false;
    }
    return periods;
  }

  function voidPeriods(from, to, planets) {
    if (!inRange(from) || !inRange(to)) return [];
    return voidPeriodsCore(from, to, planets);
  }

  // The void state covering `t0`, for one tradition's planet list. Looks back far enough
  // (7 days, comfortably more than one sign transit) to find the real previous ingress
  // rather than clipping into the middle of the current void period, and stops just past
  // the already-known next ingress (`exit`) so the search doesn't run further than needed.
  //
  // `t0` already passed moonNow's own inRange gate -- the public range contract governs the
  // date being asked about, not this internal search window, which can briefly step outside
  // 1901-2100 for a `date` within about a week of either edge. So this calls voidPeriodsCore
  // directly rather than voidPeriods, which would otherwise re-apply that gate to the padded
  // window and silently report "not void" for a date the module claims to support.
  function voidStateFor(t0, exit, planets) {
    const periods = voidPeriodsCore(t0.AddDays(-7).date, exit.AddDays(0.5).date, planets);
    const current = periods[periods.length - 1];
    if (!current) return {isVoid: false, since: null, until: exit.date.toISOString()};
    return {isVoid: t0.date >= new Date(current.start), since: current.start, until: current.end};
  }

  function moonNow(date) {
    if (!inRange(date)) return {status: 'out-of-range'};

    const t0 = astro.MakeTime(date);
    const phaseAngle = astro.MoonPhase(date);
    // Same eighth-of-a-circle bucketing as BirthLore.moonPhaseFor (birth-lore.js:90), but
    // driven off the actual ecliptic phase angle instead of a mean synodic-month estimate.
    const phaseName = PHASE_NAMES[Math.round(phaseAngle / 45) % 8];
    const illumination = astro.Illumination('Moon', date).phase_fraction;

    const longitude = lonOf('Moon', t0);
    const signIndex = signOf(longitude);
    const degree = longitude - signIndex * 30;

    let mq = astro.SearchMoonQuarter(date);
    const quarters = [{quarter: mq.quarter, name: QUARTER_NAMES[mq.quarter], date: mq.time.date.toISOString()}];
    for (let i = 1; i < 4; i++) {
      mq = astro.NextMoonQuarter(mq);
      quarters.push({quarter: mq.quarter, name: QUARTER_NAMES[mq.quarter], date: mq.time.date.toISOString()});
    }

    // Next sign ingress: same search idiom as classical-engine.js's moonCondition.
    const signEnd = Math.floor(longitude / 30) * 30 + 30;
    const exit = astro.Search(t => natal.delta(lonOf('Moon', t), signEnd), t0, t0.AddDays(3.5), {dt_tolerance_seconds: 1});
    const nextIngress = {sign: signNames[(signIndex + 1) % 12], date: exit.date.toISOString()};

    return {
      status: 'ready', phaseAngle, phaseName, illumination,
      longitude, sign: signNames[signIndex], signIndex, degree,
      quarters, nextIngress,
      void: {
        classical: voidStateFor(t0, exit, CLASSICAL_PLANETS),
        modern: voidStateFor(t0, exit, MODERN_PLANETS)
      }
    };
  }

  // Task 6: personal transits -- the exact moments in one month when a transiting body
  // perfects a major aspect to a point in the reader's own birth chart.
  //
  // The nine bodies that transit by default; the Moon is the tenth and sits behind a flag,
  // because it perfects roughly sixty exact aspects a month and would bury everything slower.
  // S1 ruling: a reader who gave only a birthday still gets planet transits. NatalEngine
  // refuses to place anything without a birth time AND a birthplace (calculate() returns
  // {status:'missing'} with no `points` at all), so natalTargets() below builds its own natal
  // longitudes from this same list at noon UTC on the birth date, which needs no location.
  const TRANSIT_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const ASPECT_NAMES = {0: 'conjunction', 60: 'sextile', 90: 'square', 120: 'trine', 180: 'opposition'};

  // Largest jump in the aspect function a single sampling step may show and still be read as a
  // real crossing. natal.delta is a sawtooth: it runs from -180 to 180 and drops 360 at the
  // antipode, so a wrap shows as a jump of about 360 minus the body's motion (>= 315 for every
  // body and step below), while a genuine crossing shows only that motion -- at most 2.21 deg
  // for a one-day step (Mercury) or 3.85 deg for the Moon's six-hour step. 45 sits an order of
  // magnitude clear of both edges.
  const WRAP_GUARD_DEG = 45;

  // The natal points a {chart, birthday} source can supply: the chart's own placements when it
  // is ready, else the noon-UTC fallback below. Returns null when neither half is usable, and
  // `approximate` records which path produced the longitudes -- the other two facts Task 9's
  // UI states (angles, natalMoon) are read off the targets themselves in personalTransits.
  function natalTargets(source) {
    const chart = source && source.chart;
    const points = (chart && chart.status === 'ready' && Array.isArray(chart.points) ? chart.points : [])
      // kind 'node' is skipped here: the mean nodes are excluded from natal targets.
      .filter(p => p && p.kind === 'planet' && Number.isFinite(p.longitude));
    if (points.length) {
      const targets = points.map(p => ({name: p.name, longitude: p.longitude, kind: 'planet'}));
      for (const axis of (Array.isArray(chart.axes) ? chart.axes : [])) {
        if (axis && Number.isFinite(axis.longitude)) targets.push({name: axis.name, longitude: axis.longitude, kind: 'angle'});
      }
      return {targets, approximate: false};
    }

    const birthday = source && source.birthday;
    if (typeof birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
    const noon = new Date(`${birthday}T12:00:00Z`);
    // Rejects both an unparseable date and a real-looking one that rolled over (2026-02-31).
    if (!inRange(noon) || noon.toISOString().slice(0, 10) !== birthday) return null;
    const t = astro.MakeTime(noon);
    // The same nine bodies that transit, and for the same reason the transiting Moon is a
    // separate case: the natal Moon is deliberately absent.
    //
    // How far off noon UTC can be: `birthday` is a LOCAL calendar date, so the true instant is
    // anywhere in that local day, at any IANA offset. Enumerating the 418 zones Node ships,
    // over 1901-2100 only, the offsets run from -12:00 (Pacific/Enderbury, 1938) to +14:00
    // (Asia/Anadyr, 1981; Pacific/Kiritimati today). UTC instant = local naive - offset, so the
    // easternmost zone at local 00:00 lands 12 + 14 = 26 hours BEFORE noon UTC and the
    // westernmost at local 24:00 lands 12 + 12 = 24 hours after. The bound is 26 hours, not 12.
    //
    // Worst-case error is therefore the largest longitude displacement over any 26-hour window
    // in the supported range, measured directly (not extrapolated from a daily speed):
    //   Moon 16.67 | Mercury 2.39 | Venus 1.36 | Sun 1.11 | Mars 0.86 | Jupiter 0.26 |
    //   Saturn 0.14 | Uranus 0.07 | Neptune 0.04 | Pluto 0.04  (degrees)
    //
    // At +/-16.7 deg the natal Moon is not a point at all -- it can be most of a sign away, and
    // an "exact" hit to it would be wrong by days for a slow transiting body, which is worse
    // than silence. The nine that remain are accurate to a degree or better EXCEPT Mercury
    // (2.39), Venus (1.36) and the Sun (1.11): still far better than nothing, but Task 9 must
    // not tell the reader "about a degree" without qualifying those three. The angles need a
    // birthplace, and there is no defensible approximation of an Ascendant, so they are out too.
    return {
      targets: TRANSIT_BODIES.map(name => ({name, longitude: lonOf(name, t), kind: 'planet'})),
      approximate: true
    };
  }

  // A refusal reports no targets, because none were used -- the three flags describe what went
  // into the hits, and there are none.
  const REFUSED = status => ({status, hits: [], angles: false, natalMoon: false, approximate: false});

  // Every exact major aspect a transiting body perfects to a natal point inside calendar month
  // `month` (1-12) of `year`, UTC bounds, sorted ascending. `source` is the {chart, birthday}
  // pair BirthProfile holds. The transiting Moon perfects roughly sixty of these a month and
  // would bury everything slower, so it is behind `includeMoon`.
  //
  // Each body's longitude is sampled once per step and every target/aspect pair is tested
  // against those cached values; astro.Search only runs where two consecutive samples actually
  // bracket a crossing. The naive alternative is a root search per body/target/aspect/direction
  // -- over two thousand of them for a full chart -- and would visibly freeze the page.
  //
  // Step sizes: one day for the nine planets (fastest is Mercury at 2.21 deg/day) and six
  // hours for the Moon (15.38 deg/day). Sampling cannot skip a crossing outright -- a
  // continuous path of a few degrees over a fixed longitude always flips the sign of the
  // aspect function -- so the only step-size hazard is a crossing and re-crossing inside one
  // bracket, which needs a station within about 0.024 deg of the natal aspect point (measured
  // worst case, Mercury; every slower body is under 0.006). See task-6-report.md.
  //
  // Both chiralities of each non-symmetric aspect are searched, because a sextile to a natal
  // point is two distinct longitudes (natal+60 and natal-60); 0 and 180 are self-inverse, so
  // searching them once is the whole set. That alone is not enough: astro.Search resolves only
  // ASCENDING roots, and a retrograde body crosses its aspect longitude with longitude
  // DECREASING. So a descending bracket is searched with the sign-flipped function, the same
  // idiom ingresses()/stations() use (and astronomy.js's own SearchMoonNode).
  function personalTransits(source, year, month, {includeMoon = false} = {}) {
    const natalPoints = natalTargets(source);
    if (!natalPoints) return REFUSED('no-chart');
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return REFUSED('out-of-range');
    if (!Number.isInteger(month) || month < 1 || month > 12) return REFUSED('out-of-range');

    const start = astro.MakeTime(new Date(Date.UTC(year, month - 1, 1)));
    const stop = astro.MakeTime(new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, 1)));
    const hits = [];

    for (const body of (includeMoon ? ['Moon'].concat(TRANSIT_BODIES) : TRANSIT_BODIES)) {
      const stepDays = body === 'Moon' ? 0.25 : 1;
      const samples = [];
      for (let t = start; t.ut < stop.ut; t = t.AddDays(stepDays)) samples.push({t, lon: lonOf(body, t)});
      samples.push({t: stop, lon: lonOf(body, stop)});

      for (const target of natalPoints.targets) {
        for (const aspect of ASPECTS) {
          for (const chirality of (aspect === 0 || aspect === 180 ? [1] : [1, -1])) {
            // The longitude the transiting body has to reach for this exact contact.
            const perfection = natal.mod(target.longitude + chirality * aspect);
            const g = lon => natal.delta(lon, perfection);
            for (let i = 1; i < samples.length; i++) {
              const ga = g(samples[i - 1].lon), gb = g(samples[i].lon);
              // `gb >= 0` / `gb <= 0` put a root that lands exactly on a sample boundary in the
              // EARLIER bracket; the next bracket then has ga === 0, which satisfies neither
              // test, so it is found once and never twice. The one cost: a root landing exactly
              // on the month's first instant is in no bracket of this month and is excluded
              // from the previous month by `hit.ut < stop.ut`, so it is dropped from both.
              // Measure-zero (a perfection to the microsecond at midnight on the 1st), accepted.
              const rising = ga < 0 && gb >= 0 && gb - ga < WRAP_GUARD_DEG;      // body direct
              const falling = ga > 0 && gb <= 0 && ga - gb < WRAP_GUARD_DEG;     // body retrograde
              if (!rising && !falling) continue;
              const direction = rising ? 1 : -1;
              const hit = astro.Search(t => direction * g(lonOf(body, t)),
                samples[i - 1].t, samples[i].t, {dt_tolerance_seconds: 1});
              if (!hit || hit.ut < start.ut || hit.ut >= stop.ut) continue;
              hits.push({
                date: hit.date.toISOString(), body, aspect, aspectName: ASPECT_NAMES[aspect],
                target: target.name, targetKind: target.kind, natalLongitude: target.longitude,
                retrograde: speedAt(body, hit) < 0
              });
            }
          }
        }
      }
    }

    hits.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    return {
      status: 'ready', hits,
      angles: natalPoints.targets.some(t => t.kind === 'angle'),
      natalMoon: natalPoints.targets.some(t => t.kind === 'planet' && t.name === 'Moon'),
      approximate: natalPoints.approximate
    };
  }

  // Every exact Ptolemaic aspect the Moon makes to any listed planet inside [from, to),
  // oldest first. Same search as the void-of-course code (see the comment above), exposed
  // for the daily prose fact sheet (docs/DAILY-HOROSCOPE.md).
  function moonAspects(from, to, planets) {
    if (!inRange(from) || !inRange(to)) return [];
    return moonAspectsCore(from, to, planets).map(h => ({planet: h.planet, aspect: h.aspect, date: h.time.date.toISOString()}));
  }

  return {
    moonNow, lonOf, inRange, signOf, signNames, MIN_YEAR, MAX_YEAR,
    CLASSICAL_PLANETS, MODERN_PLANETS, voidPeriods, voidBands, moonAspects,
    BODIES, speedAt, ingresses, monthEvents, stations, eclipses, retrogradeState, personalTransits
  };
});
