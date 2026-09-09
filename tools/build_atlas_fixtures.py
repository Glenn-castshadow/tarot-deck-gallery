"""Independent test data only. Requires pyswisseph and lunar_python; neither ships to the browser."""
import json
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
import swisseph as swe
from lunar_python import Solar

dates = ['1902-02-03T04:00:00Z', '1950-06-20T18:30:00Z', '2000-01-01T12:00:00Z', '2024-02-04T08:30:00Z', '2099-12-21T23:45:00Z']
names = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
ephemeris = []
for text in dates:
    date = datetime.fromisoformat(text.replace('Z', '+00:00'))
    jd = date.timestamp() / 86400 + 2440587.5
    points = {}
    for index, name in enumerate(names):
        values, flags = swe.calc_ut(jd, index, swe.FLG_MOSEPH | swe.FLG_EQUATORIAL)
        points[name] = {'ra': values[0] / 15, 'dec': values[1]}
    ephemeris.append({'utc': text, 'siderealDegrees': swe.sidtime(jd) * 15, 'points': points})

births = [(1902, 2, 3, 12, 0), (1950, 6, 20, 18, 30), (1990, 7, 15, 14, 30), (2000, 1, 7, 12, 0), (2024, 2, 4, 14, 0), (2024, 2, 4, 18, 0), (2024, 3, 5, 8, 0), (2024, 3, 5, 14, 0), (2024, 2, 10, 22, 59), (2024, 2, 10, 23, 0), (2024, 2, 11, 0, 0), (2099, 12, 21, 23, 45)]
bazi = []
for y, m, d, h, minute in births:
    chart = Solar.fromYmdHms(y, m, d, h, minute, 0).getLunar().getEightChar()
    chart.setSect(1)  # Day rollover at 23:00.
    bazi.append({'birthday': f'{y:04}-{m:02}-{d:02}', 'time': f'{h:02}:{minute:02}', 'location': {'latitude': 31.23, 'longitude': 121.47, 'timeZone': 'Asia/Shanghai'}, 'pillars': [chart.getYear(), chart.getMonth(), chart.getDay(), chart.getTime()]})

target = Path(__file__).resolve().parents[1] / 'tests/fixtures/atlas-reference.json'
target.write_text(json.dumps({'sources': {'swisseph': swe.version, 'lunar_python': version('lunar_python'), 'baziConvention': 'Asia/Shanghai civil time; day changes 23:00 (sect 1)'}, 'ephemeris': ephemeris, 'bazi': bazi}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(ephemeris)} ephemeris and {len(bazi)} BaZi reference cases.')
