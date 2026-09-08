"""Independent validation fixtures; Swiss Ephemeris is a test tool, not shipped code.

Run with pyswisseph installed in a validation environment. Uses Moshier mode,
which needs no downloaded ephemeris files. Fixtures are synthetic examples.
"""
import json
from datetime import datetime, timezone
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
    ("polar-south", "2024-12-21", "12:00", -78, 20, "UTC"),
]
NAMES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]


def main():
    fixtures = []
    for key, birthday, time, latitude, longitude, zone in CASES:
        utc = datetime.fromisoformat(f"{birthday}T{time}").replace(tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
        jd = swe.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600)
        system = "whole-sign" if abs(latitude) >= 66 else "placidus"
        cusps, axes = swe.houses_ex(jd, latitude, longitude, b"W" if system == "whole-sign" else b"P")
        points = {}
        for index, name in enumerate(NAMES):
            data, flags = swe.calc_ut(jd, index, swe.FLG_MOSEPH | swe.FLG_SPEED)
            points[name] = {"longitude": data[0], "speed": data[3]}
        fixtures.append({"id": key, "input": {"birthday": birthday, "time": time, "location": {"latitude": latitude, "longitude": longitude, "timeZone": zone}}, "utc": utc.isoformat().replace("+00:00", "Z"), "houseSystem": system, "cusps": cusps, "asc": axes[0], "mc": axes[1], "points": points})
    output = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    output.mkdir(parents=True, exist_ok=True)
    (output / "natal-reference.json").write_text(json.dumps({"source": "Swiss Ephemeris, Moshier mode", "version": swe.version, "cases": fixtures}, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(fixtures)} independent ephemeris fixtures")


if __name__ == "__main__":
    main()
