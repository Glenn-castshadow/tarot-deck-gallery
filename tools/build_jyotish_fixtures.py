"""Independent Jyotish fixtures (development only). pyswisseph Moshier mode, SIDM_LAHIRI.
Positions come from Swiss Ephemeris; nakshatra, pada, navamsa and Vimshottari values are
computed here in Python from those sidereal longitudes as a second implementation of the
rules in docs/JYOTISH.md, independent of jyotish-engine.js.
Usage: PYTHONIOENCODING=utf-8 "$LOCALAPPDATA/Temp/jyotish-venv/Scripts/python" tools/build_jyotish_fixtures.py
"""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
import swisseph as swe

CASES = [
    ("millennium-greenwich", "2000-01-01", "12:00", 51.4779, 0, "Europe/London"),
    ("new-york-winter", "2024-01-15", "09:30", 40.7128, -74.006, "America/New_York"),
    ("new-york-summer", "2024-07-15", "09:30", 40.7128, -74.006, "America/New_York"),
    ("seattle-example", "1988-11-05", "14:30", 47.6062, -122.3321, "America/Los_Angeles"),
    ("southern-hemisphere", "1940-05-01", "06:00", -34.9285, 138.6007, "Australia/Adelaide"),
    ("early-range", "1901-01-01", "12:00", 0, 0, "UTC"),
    ("late-range", "2099-09-22", "12:00", 35.6762, 139.6503, "Asia/Tokyo"),
    ("polar-north", "2024-02-10", "12:00", 69.6492, 18.9553, "Europe/Oslo"),
    ("high-latitude-summer", "2024-06-21", "12:00", 64.1466, -21.9426, "Atlantic/Reykjavik"),
    ("sample-new-york", "1990-07-15", "14:30", 40.7143, -74.006, "America/New_York"),
    ("mumbai-1975", "1975-11-30", "06:15", 19.076, 72.8777, "Asia/Kolkata"),
    ("delhi-2010", "2010-03-03", "23:50", 28.6139, 77.209, "Asia/Kolkata"),
]
BODIES = [("Sun", swe.SUN), ("Moon", swe.MOON), ("Mars", swe.MARS), ("Mercury", swe.MERCURY), ("Jupiter", swe.JUPITER), ("Venus", swe.VENUS), ("Saturn", swe.SATURN), ("Rahu", swe.MEAN_NODE)]
LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}
SPAN = 360 / 27

def nakshatra(lon):
    index = int(lon // SPAN) % 27
    within = lon - index * SPAN
    return index, min(4, int(within // (SPAN / 4)) + 1), within / SPAN

def navamsa(lon):
    s = int(lon // 30); k = min(8, int((lon - s * 30) // (30 / 9)))
    return (9 * s + k) % 12

def dashas(moon_lon, birth_utc):
    index, _, fraction = nakshatra(moon_lon)
    lord = LORDS[index % 9]
    balance = (1 - fraction) * YEARS[lord]
    start = birth_utc - timedelta(days=fraction * YEARS[lord] * 365.25)
    out = []
    for i in range(9):
        l = LORDS[(index + i) % 9]
        end = start + timedelta(days=YEARS[l] * 365.25)
        out.append({"lord": l, "start": max(start, birth_utc).isoformat().replace("+00:00", "Z"), "end": end.isoformat().replace("+00:00", "Z")})
        start = end
    return lord, balance, out

swe.set_sid_mode(swe.SIDM_LAHIRI)
cases = []
for key, birthday, time, lat, lon, zone in CASES:
    utc = datetime.fromisoformat(f"{birthday}T{time}").replace(tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
    jd = swe.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600)
    ayan = swe.get_ayanamsa_ut(jd)
    points = {}
    for name, body in BODIES:
        data, _ = swe.calc_ut(jd, body, swe.FLG_MOSEPH | swe.FLG_SIDEREAL)
        points[name] = data[0]
    points["Ketu"] = (points["Rahu"] + 180) % 360
    cusps, axes = swe.houses_ex(jd, lat, lon, b"W", swe.FLG_SIDEREAL)
    asc = axes[0]
    rules = {name: {"nakshatra": nakshatra(l)[0], "pada": nakshatra(l)[1], "navamsa": navamsa(l)} for name, l in points.items()}
    rules["Lagna"] = {"nakshatra": nakshatra(asc)[0], "pada": nakshatra(asc)[1], "navamsa": navamsa(asc)}
    lord, balance, maha = dashas(points["Moon"], utc)
    cases.append({"id": key, "input": {"birthday": birthday, "time": time, "location": {"latitude": lat, "longitude": lon, "timeZone": zone}}, "utc": utc.isoformat().replace("+00:00", "Z"), "ayanamsa": ayan, "points": points, "asc": asc, "rules": rules, "dasha": {"firstLord": lord, "balanceYears": balance, "mahadashas": maha}})

t0 = swe.get_ayanamsa_ut(2435553.5)
target = Path(__file__).resolve().parents[1] / "tests/fixtures/jyotish-reference.json"
target.write_text(json.dumps({"source": "pyswisseph Moshier, SIDM_LAHIRI; rules recomputed in Python", "version": swe.version, "ayanamsaAtT0": t0, "cases": cases}, indent=2), encoding="utf-8")
print(f"ayanamsa at JD 2435553.5 = {t0}; wrote {len(cases)} cases")
