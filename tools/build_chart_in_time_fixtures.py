"""Independent validation fixtures; Swiss Ephemeris is a test tool, not shipped code.

Run with pyswisseph installed in a validation environment. Uses Moshier mode,
which needs no downloaded ephemeris files. Fixtures are synthetic examples.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import swisseph as swe

CASES = [
    ("solar-nyc", "1990-07-15", "14:30", 40.7143, -74.006, "America/New_York", "solar", "2024-03-01"),
    ("solar-southern", "1975-11-02", "06:15", -33.8688, 151.2093, "Australia/Sydney", "solar", "2020-01-15"),
    ("solar-leap-birth", "1992-02-29", "12:00", 51.5085, -0.1257, "Europe/London", "solar", "2023-06-01"),
    ("lunar-nyc", "1990-07-15", "14:30", 40.7143, -74.006, "America/New_York", "lunar", "2024-03-01"),
    ("lunar-early-range", "1905-04-10", "09:45", 35.6762, 139.6503, "Asia/Tokyo", "lunar", "1950-08-20"),
]
BODIES = {"Sun": swe.SUN, "Moon": swe.MOON}
FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED


def julian(moment):
    return swe.julday(moment.year, moment.month, moment.day,
                      moment.hour + moment.minute / 60 + moment.second / 3600 + moment.microsecond / 3.6e9)


def from_julian(jd):
    year, month, day, hours = swe.revjul(jd)
    return datetime(year, month, day, tzinfo=timezone.utc) + timedelta(hours=hours)


def main():
    cases = []
    for key, birthday, time, latitude, longitude, zone, kind, reference in CASES:
        birth = datetime.fromisoformat(f"{birthday}T{time}").replace(tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
        body = "Sun" if kind == "solar" else "Moon"
        natal_longitude = swe.calc_ut(julian(birth), BODIES[body], FLAGS)[0][0]

        # The governing return: the last crossing at or before the reference date.
        reference_jd = julian(datetime.fromisoformat(f"{reference}T00:00:00").replace(tzinfo=timezone.utc))
        period = 365.2422 if kind == "solar" else 27.321582
        cross = swe.solcross_ut if kind == "solar" else swe.mooncross_ut
        found = cross(natal_longitude, reference_jd - period, FLAGS)
        while True:
            following = cross(natal_longitude, found + 1, FLAGS)
            if following > reference_jd:
                break
            found = following

        moment = from_julian(found)
        longitudes = {name: swe.calc_ut(found, index, FLAGS)[0][0] for name, index in
                      [("Sun", swe.SUN), ("Moon", swe.MOON), ("Mercury", swe.MERCURY), ("Venus", swe.VENUS),
                       ("Mars", swe.MARS), ("Jupiter", swe.JUPITER), ("Saturn", swe.SATURN),
                       ("Uranus", swe.URANUS), ("Neptune", swe.NEPTUNE), ("Pluto", swe.PLUTO)]}
        cases.append({
            "id": key, "kind": kind, "reference": reference,
            "input": {"birthday": birthday, "time": time,
                      "location": {"latitude": latitude, "longitude": longitude, "timeZone": zone}},
            "moment": moment.isoformat().replace("+00:00", "Z"),
            "chartLongitudes": longitudes,
        })
    output = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    output.mkdir(parents=True, exist_ok=True)
    (output / "chart-in-time-reference.json").write_text(
        json.dumps({"swissVersion": swe.version, "cases": cases}, indent=2) + "\n")
    print(f"wrote {len(cases)} cases, Swiss Ephemeris {swe.version}")


if __name__ == "__main__":
    main()
