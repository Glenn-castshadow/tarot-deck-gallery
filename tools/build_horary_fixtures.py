"""Independent horary fixtures (development only): pyswisseph Moshier Regiomontanus cusps,
sunrise/sunset, and Lilly's essential dignities re-derived in Python from the same tables
as classical-engine.js (a transcription check; the ephemeris values are the independent part).
Usage: PYTHONIOENCODING=utf-8 "$LOCALAPPDATA/Temp/horary-venv/Scripts/python" tools/build_horary_fixtures.py

swe.rise_trans call verified against the installed pyswisseph 2.10.03 signature:
    rise_trans(tjdut, body, rsmi, geopos, atpress=0.0, attemp=0.0, flags=FLG_SWIEPH)
matching the positional form used below; no adaptation was needed.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import swisseph as swe

CASES = [  # the ten natal reference births, plus an eleventh polar case for the Regiomontanus fixture
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
    ("polar-85", "2024-06-21", "12:00", 85, 20, "UTC"),
]
RISE_SET = [("London", 51.5085, -0.1257), ("New York", 40.7143, -74.006), ("Adelaide", -34.9285, 138.6007)]
RISE_DATES = ["2000-01-01", "2024-06-21", "2024-12-21"]
PLANETS = [("Sun", swe.SUN), ("Moon", swe.MOON), ("Mercury", swe.MERCURY), ("Venus", swe.VENUS), ("Mars", swe.MARS), ("Jupiter", swe.JUPITER), ("Saturn", swe.SATURN)]
RULERS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]
EXALT = {"Sun": 0, "Moon": 1, "Mercury": 5, "Venus": 11, "Mars": 9, "Jupiter": 3, "Saturn": 6}
TRIP = [("Sun", "Jupiter"), ("Venus", "Moon"), ("Saturn", "Mercury"), ("Mars", "Mars")]
TERMS = [[("Jupiter", 6), ("Venus", 14), ("Mercury", 21), ("Mars", 26), ("Saturn", 30)], [("Venus", 8), ("Mercury", 15), ("Jupiter", 22), ("Saturn", 26), ("Mars", 30)],
         [("Mercury", 7), ("Jupiter", 14), ("Venus", 21), ("Saturn", 25), ("Mars", 30)], [("Mars", 6), ("Jupiter", 13), ("Mercury", 20), ("Venus", 27), ("Saturn", 30)],
         [("Saturn", 6), ("Mercury", 13), ("Venus", 19), ("Jupiter", 25), ("Mars", 30)], [("Mercury", 7), ("Venus", 13), ("Jupiter", 18), ("Saturn", 24), ("Mars", 30)],
         [("Saturn", 6), ("Venus", 11), ("Jupiter", 19), ("Mercury", 24), ("Mars", 30)], [("Mars", 6), ("Jupiter", 14), ("Venus", 21), ("Mercury", 27), ("Saturn", 30)],
         [("Jupiter", 8), ("Venus", 14), ("Mercury", 19), ("Saturn", 25), ("Mars", 30)], [("Venus", 6), ("Mercury", 12), ("Jupiter", 19), ("Mars", 25), ("Saturn", 30)],
         [("Saturn", 6), ("Mercury", 12), ("Venus", 20), ("Jupiter", 25), ("Mars", 30)], [("Venus", 8), ("Jupiter", 14), ("Mercury", 20), ("Mars", 26), ("Saturn", 30)]]
FACES = ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"]

def house_for(lon, cusps):
    for i in range(12):
        if (lon - cusps[i]) % 360 < (cusps[(i + 1) % 12] - cusps[i]) % 360:
            return i + 1
    return None

def dignities(planet, lon, sect):
    sign, deg = int(lon // 30) % 12, lon % 30
    term = next(p for p, end in TERMS[sign] if deg < end)
    d = {"ruler": RULERS[sign] == planet, "detriment": RULERS[(sign + 6) % 12] == planet, "exaltation": EXALT[planet] == sign,
         "fall": (EXALT[planet] + 6) % 12 == sign, "triplicity": TRIP[sign % 4][0 if sect == "day" else 1] == planet,
         "term": term == planet, "face": FACES[(sign * 3 + min(2, int(deg // 10))) % 7] == planet}
    d["peregrine"] = not any(d[k] for k in ("ruler", "exaltation", "triplicity", "term", "face")) and not d["detriment"] and not d["fall"]
    return d

def jd_of(date, time, zone):
    utc = datetime.fromisoformat(f"{date}T{time}").replace(tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
    return swe.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600), utc

def iso(jd):
    y, m, d, h = swe.revjul(jd)
    hh = int(h); mm = int((h - hh) * 60); ss = round(((h - hh) * 60 - mm) * 60)
    return datetime(y, m, d, hh, mm, min(ss, 59), tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

cases = []
for key, date, time, lat, lon, zone in CASES:
    jd, utc = jd_of(date, time, zone)
    cusps, axes = swe.houses_ex(jd, lat, lon, b"R")
    points = {name: swe.calc_ut(jd, body, swe.FLG_MOSEPH)[0][0] for name, body in PLANETS}
    sun_house = house_for(points["Sun"], cusps)
    sect = "day" if sun_house is not None and sun_house >= 7 else "night"
    cases.append({"id": key, "input": {"birthday": date, "time": time, "location": {"latitude": lat, "longitude": lon, "timeZone": zone}},
                  "utc": utc.isoformat().replace("+00:00", "Z"), "cusps": list(cusps), "asc": axes[0], "mc": axes[1], "points": points, "sect": sect,
                  "dignities": {name: dignities(name, l, sect) for name, l in points.items()}})

rise_set = []
for name, lat, lon in RISE_SET:
    for date in RISE_DATES:
        jd0 = swe.julday(*map(int, date.split("-")), 0.0)
        flags = swe.FLG_MOSEPH
        _, rise = swe.rise_trans(jd0, swe.SUN, swe.CALC_RISE, (lon, lat, 0), 0, 0, flags)
        _, sets = swe.rise_trans(rise[0], swe.SUN, swe.CALC_SET, (lon, lat, 0), 0, 0, flags)
        _, next_rise = swe.rise_trans(rise[0] + 0.01, swe.SUN, swe.CALC_RISE, (lon, lat, 0), 0, 0, flags)
        rise_set.append({"place": name, "latitude": lat, "longitude": lon, "date": date, "sunrise": iso(rise[0]), "sunset": iso(sets[0]), "nextSunrise": iso(next_rise[0])})

target = Path(__file__).resolve().parents[1] / "tests/fixtures/horary-reference.json"
target.write_text(json.dumps({"source": "pyswisseph Moshier; Regiomontanus b'R'; rise_trans; Lilly tables re-derived in Python", "version": swe.version, "cases": cases, "riseSet": rise_set}, indent=2), encoding="utf-8")
print(f"wrote {len(cases)} cases and {len(rise_set)} rise/set rows")
