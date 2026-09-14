"""Independent test data only (development-only): pyswisseph quarter moons, sign ingresses,
station points and eclipses, checked against sky-calendar-engine.js's Astronomy-Engine-based
output. pyswisseph never ships to the browser; this script and its venv are throwaway, the
same convention as tools/build_atlas_fixtures.py, tools/build_jyotish_fixtures.py and
tools/build_horary_fixtures.py.

The bisection here is a plain numerical root-finder written from scratch in Python -- it does
not call, import or in any way share code with the vendored Astronomy Engine or
sky-calendar-engine.js. All positions and speeds come from pyswisseph's Moshier ephemeris.

Usage: PYTHONIOENCODING=utf-8 "$LOCALAPPDATA/Temp/skyfix/Scripts/python" tools/build_sky_fixtures.py
"""
import json
import math
from datetime import datetime, timedelta, timezone
from importlib.metadata import version
from pathlib import Path
import swisseph as swe

YEARS = [1902, 1950, 2000, 2026, 2099]
SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio',
              'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
BODIES = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY, 'Venus': swe.VENUS,
          'Mars': swe.MARS, 'Jupiter': swe.JUPITER, 'Saturn': swe.SATURN,
          'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE, 'Pluto': swe.PLUTO}
FLAGS = swe.FLG_MOSEPH


def jd_of(year, month, day, hour=0.0):
    return swe.julday(year, month, day, hour)


def iso_of(jd):
    y, m, d, h = swe.revjul(jd)
    dt = datetime(y, m, d, tzinfo=timezone.utc) + timedelta(hours=h)
    return dt.replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def lon_of(jd, body):
    data, _ = swe.calc_ut(jd, body, FLAGS)
    return data[0] % 360


def speed_of(jd, body):
    data, _ = swe.calc_ut(jd, body, FLAGS | swe.FLG_SPEED)
    return data[3]


def delta(a, b):
    """Signed shortest a-b, wrapped to [-180, 180) -- same convention as natal.delta in JS."""
    d = (a - b) % 360
    return d - 360 if d >= 180 else d


def bisect(f, lo, hi, iterations=60):
    """f(lo) < 0 <= f(hi) assumed (a single ascending root in [lo, hi])."""
    for _ in range(iterations):
        mid = (lo + hi) / 2
        if f(mid) < 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# --- Quarter moons: bisect the Moon-Sun elongation crossing 0/90/180/270, restricted to one
# calendar month at a time (mirrors monthEvents' own per-month framing). ---------------------

def elongation(jd):
    return (lon_of(jd, swe.MOON) - lon_of(jd, swe.SUN)) % 360


def quarters_in_month(year, month):
    start = jd_of(year, month, 1, 0.0)
    end = jd_of(year + 1, 1, 1, 0.0) if month == 12 else jd_of(year, month + 1, 1, 0.0)
    step = 0.5  # max elongation rate ~14.4 deg/day * 0.5 day = 7.2 deg, well under 90
    jd = start - 3
    prev_e = elongation(jd)
    prev_unwrapped = prev_e
    out = []
    while jd < end + 3:
        jd_next = jd + step
        e_next = elongation(jd_next)
        d = e_next - prev_e
        if d < 0:
            d += 360  # elongation only ever increases (Moon's synodic speed is always positive)
        unwrapped_next = prev_unwrapped + d
        k = math.floor(prev_unwrapped / 90) + 1
        while k * 90 <= unwrapped_next:
            target = k * 90
            base_e, base_unwrapped, base_jd = prev_e, prev_unwrapped, jd

            def f(x, target=target, base_e=base_e, base_unwrapped=base_unwrapped):
                dd = elongation(x) - base_e
                if dd < 0:
                    dd += 360
                return (base_unwrapped + dd) - target

            root = bisect(f, jd, jd_next)
            if start <= root < end:
                out.append((root, k % 4))
            k += 1
        jd, prev_e, prev_unwrapped = jd_next, e_next, unwrapped_next
    return out


# --- Sign ingresses: the next crossing of a 30-degree cusp after a given start, forward or
# backward (a retrograde re-entry), same dual-search idiom ingresses() uses in the JS engine.
#
# Fix round 1, finding 1: the original fixture only ever took the FIRST ingress after Jan 1
# per body per year, which put 13 of 15 rows in January and never tested a cardinal cusp (the
# equinoxes and solstices -- the single most independently checkable ingresses there are). Two
# helpers below fix that: `ingress_into_sign` walks forward however many cusps it takes to land
# on a *specific* target sign (used to pin the Sun's four cardinal ingresses directly, however
# far into the year they fall), and `ingress_from_seed` starts the search from a chosen seed
# date instead of always Jan 1, so a body's rows spread across the calendar rather than
# clustering at the start of the year. ---------------------------------------------------------

def next_ingress(body_name, start):
    """The next ingress (forward, or a retrograde backward re-entry) after `start`."""
    body = BODIES[body_name]
    step_days = {'Sun': 1, 'Moon': 0.1, 'Mercury': 0.5, 'Venus': 0.5, 'Mars': 1,
                 'Jupiter': 2, 'Saturn': 2, 'Uranus': 2, 'Neptune': 2, 'Pluto': 2}[body_name]
    idx = int(lon_of(start, body) // 30)
    floor_deg = idx * 30
    upper = (floor_deg + 30) % 360

    def g_up(t):
        return delta(lon_of(t, body), upper)

    def g_down(t):
        return delta(floor_deg, lon_of(t, body))

    t = start
    prev_up, prev_down = g_up(t), g_down(t)
    # Long enough to cover the body's own longest sign transit: ~1 month for the Moon up to
    # ~30 years for Pluto in Taurus. 900 days covers everything through Saturn (~2.5 years a
    # sign); the outer three need far more, which is the whole reason they were left out
    # before -- a 900-day window never finds a Uranus ingress from a Jan 1 seed at all.
    max_days = {'Uranus': 3300, 'Neptune': 6500, 'Pluto': 12000}.get(body_name, 900)
    while t < start + max_days:
        t_next = t + step_days
        up_n, down_n = g_up(t_next), g_down(t_next)
        hit_up = prev_up < 0 <= up_n and (up_n - prev_up) < 45
        hit_down = prev_down < 0 <= down_n and (down_n - prev_down) < 45
        if hit_up or hit_down:
            root_up = bisect(g_up, t, t_next) if hit_up else None
            root_down = bisect(g_down, t, t_next) if hit_down else None
            if root_up is not None and (root_down is None or root_up <= root_down):
                return root_up, (idx + 1) % 12
            return root_down, (idx - 1) % 12
        t, prev_up, prev_down = t_next, up_n, down_n
    return None, None


def ingress_into_sign(year, body_name, target_index, max_hops=14):
    """Walks forward from Jan 1 of `year`, one ingress at a time, until landing on
    `target_index` (0=Aries/spring equinox, 3=Cancer/summer solstice, 6=Libra/autumn equinox,
    9=Capricorn/winter solstice for the Sun) -- however many hops that takes."""
    t = jd_of(year, 1, 1, 0.0)
    for _ in range(max_hops):
        root, entered = next_ingress(body_name, t)
        if root is None:
            return None
        if entered == target_index:
            return root
        t = root + 0.01
    return None


def ingress_from_seed(year, body_name, month, day=1):
    """The next ingress after the given seed date -- used to spread a fast body's sample
    rows across the calendar instead of always starting from Jan 1."""
    root, entered = next_ingress(body_name, jd_of(year, month, day, 0.0))
    if root is None:
        return None, None
    return root, SIGN_NAMES[entered]


# --- Stations: FLG_SPEED longitude speed, sign change of that speed, then bisect. ------------

def first_station(year, body_name):
    body = BODIES[body_name]
    start = jd_of(year, 1, 1, 0.0)
    step_days = 1
    t = start
    prev = speed_of(t, body)
    max_days = 700  # covers every station_bodies' synodic cycle with margin
    while t < start + max_days:
        t_next = t + step_days
        nxt = speed_of(t_next, body)
        if (prev < 0) != (nxt < 0):
            sign = 1 if prev < 0 else -1

            def f(x, sign=sign):
                return sign * speed_of(x, body)

            root = bisect(f, t, t_next)
            direction = 'direct' if prev < 0 else 'retrograde'
            return root, direction
        prev, t = nxt, t_next
    return None, None


# --- Eclipses: swe.lun_eclipse_when / swe.sol_eclipse_when_glob. -----------------------------

def eclipses_for_year(year, count=2):
    start = jd_of(year, 1, 1, 0.0)
    out = []
    jd = start
    for _ in range(count):
        retflag, tret = swe.lun_eclipse_when(jd, FLAGS, 0, False)
        peak = tret[0]
        if retflag & swe.ECL_TOTAL:
            kind = 'total'
        elif retflag & swe.ECL_PARTIAL:
            kind = 'partial'
        else:
            kind = 'penumbral'
        out.append({'utc': iso_of(peak), 'body': 'Moon', 'kind': kind})
        jd = peak + 1
    jd = start
    for _ in range(count):
        retflag, tret = swe.sol_eclipse_when_glob(jd, FLAGS, 0, False)
        peak = tret[0]
        if retflag & swe.ECL_TOTAL:
            kind = 'total'
        elif retflag & swe.ECL_ANNULAR_TOTAL:
            # Hybrid: Astronomy Engine has no separate hybrid category and classifies purely
            # off the umbra k value at closest approach, so it always reads 'total' or
            # 'annular' for one of these, never both -- a known, documented difference, not a
            # bug in either engine.
            kind = 'total'
        elif retflag & swe.ECL_ANNULAR:
            kind = 'annular'
        else:
            kind = 'partial'
        out.append({'utc': iso_of(peak), 'body': 'Sun', 'kind': kind})
        jd = peak + 1
    return out


quarters = []
for year in YEARS:
    for month in (1, 7):
        for jd, q in quarters_in_month(year, month):
            quarters.append({'utc': iso_of(jd), 'quarter': q})

ingresses = []
for year in YEARS:
    # The Sun's four cardinal ingresses: spring equinox (Aries), summer solstice (Cancer),
    # autumn equinox (Libra), winter solstice (Capricorn) -- the most independently checkable
    # ingresses there are, and previously untested entirely.
    for target_index in (0, 3, 6, 9):
        jd = ingress_into_sign(year, 'Sun', target_index)
        if jd is not None:
            ingresses.append({'utc': iso_of(jd), 'body': 'Sun', 'sign': SIGN_NAMES[target_index]})
    # Moon: one ingress from each quarter of the year, so rows spread across all four seasons
    # rather than clustering in January.
    for month in (1, 4, 7, 10):
        jd, sign = ingress_from_seed(year, 'Moon', month)
        if jd is not None:
            ingresses.append({'utc': iso_of(jd), 'body': 'Moon', 'sign': sign})
    # Mars: one ingress from each half of the year.
    for month in (1, 7):
        jd, sign = ingress_from_seed(year, 'Mars', month)
        if jd is not None:
            ingresses.append({'utc': iso_of(jd), 'body': 'Mars', 'sign': sign})
    # Fix round 2: Uranus, Neptune and Pluto had no fixture row of either kind, even though
    # their long retrograde arcs are the reason STEP_DAYS was cut from 1200 to 40 in the JS
    # engine. They change sign once every 7, 14 and 12-30 years, so there is no useful "one
    # ingress per sampled year" for them -- instead take the first ingress at or after Jan 1 of
    # the sampled year, however far ahead it falls, and keep it only if it lands inside the
    # engine's supported 1901-2100 range. Rows repeated across two seeds are dropped below.
    for body_name in ('Uranus', 'Neptune', 'Pluto'):
        jd, sign = ingress_from_seed(year, body_name, 1)
        if jd is not None and 1901 <= swe.revjul(jd)[0] <= 2100:
            ingresses.append({'utc': iso_of(jd), 'body': body_name, 'sign': sign})

_seen = set()
ingresses = [row for row in ingresses
             if not ((row['utc'], row['body']) in _seen or _seen.add((row['utc'], row['body'])))]

stations = []
for year in YEARS:
    # Fix round 2: the outer three were missing here too.
    for body_name in ('Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
                      'Uranus', 'Neptune', 'Pluto'):
        jd, direction = first_station(year, body_name)
        if jd is not None:
            stations.append({'utc': iso_of(jd), 'body': body_name, 'direction': direction})

eclipses = []
for year in YEARS:
    eclipses.extend(eclipses_for_year(year))

target = Path(__file__).resolve().parents[1] / 'tests/fixtures/sky-reference.json'
target.write_text(json.dumps({
    'versions': {'pyswisseph': version('pyswisseph')},
    'source': 'pyswisseph Moshier (FLG_MOSEPH); quarters/ingresses/stations bisected in Python, '
              'eclipses from swe.lun_eclipse_when/sol_eclipse_when_glob',
    'quarters': quarters, 'ingresses': ingresses, 'stations': stations, 'eclipses': eclipses
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(quarters)} quarters, {len(ingresses)} ingresses, '
      f'{len(stations)} stations, {len(eclipses)} eclipses.')
