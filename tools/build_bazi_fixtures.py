"""Independent BaZi reference data from lunar_python (development only, never shipped).

Usage (Git Bash):  py -3 -m venv "$LOCALAPPDATA/Temp/bazi-venv"
                   "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" -m pip install lunar_python
                   PYTHONIOENCODING=utf-8 "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" tools/build_bazi_fixtures.py
Conventions: Asia/Shanghai civil time, sect 1 (day rolls at 23:00), the same as tools/build_atlas_fixtures.py.

Verified against lunar_python 1.4.8: every method name below (getYearHideGan, getYearShiShenGan,
getYearShiShenZhi, getYun, getDaYun, isForward, getStartYear/Month/Day, getGanZhi, getStartAge) exists
unchanged on EightChar/Yun/DaYun in this version, so no adaptation was needed. getShiShen* return
simplified characters (e.g. 偏财, 劫财, 七杀, 伤官) in this version; GOD_KEYS maps both simplified and
traditional spellings to the site's keys regardless.
"""
import json
from importlib.metadata import version
from pathlib import Path
from lunar_python import Solar

# The twelve births already used by tests/fixtures/atlas-reference.json, plus four for luck-pillar coverage:
# one within an hour before a Jie (2024-03-05 10:00, Jingzhe at ~10:22 CST), one just after a Jie,
# a yang-year female (backward), a yin-year male (backward).
BIRTHS = [(1902, 2, 3, 12, 0), (1950, 6, 20, 18, 30), (1990, 7, 15, 14, 30), (2000, 1, 7, 12, 0),
          (2024, 2, 4, 14, 0), (2024, 2, 4, 18, 0), (2024, 3, 5, 8, 0), (2024, 3, 5, 14, 0),
          (2024, 2, 10, 22, 59), (2024, 2, 10, 23, 0), (2024, 2, 11, 0, 0), (2099, 12, 21, 23, 45),
          (2024, 3, 5, 10, 0), (2024, 3, 5, 10, 45), (1988, 8, 8, 8, 8), (1975, 11, 30, 6, 15)]

# lunar_python uses simplified characters for some gods; the site uses traditional. Map both to the site's keys.
GOD_KEYS = {'比肩': 'friend', '劫财': 'robWealth', '劫財': 'robWealth', '食神': 'eatingGod', '伤官': 'hurtingOfficer', '傷官': 'hurtingOfficer',
            '偏财': 'indirectWealth', '偏財': 'indirectWealth', '正财': 'directWealth', '正財': 'directWealth', '七杀': 'sevenKillings', '七殺': 'sevenKillings',
            '正官': 'directOfficer', '偏印': 'indirectResource', '正印': 'directResource'}


def yun_for(chart, gender):
    yun = chart.getYun(gender, 1)
    da_yun = yun.getDaYun()
    return {'forward': bool(yun.isForward()), 'startYears': yun.getStartYear(), 'startMonths': yun.getStartMonth(), 'startDays': yun.getStartDay(),
            'pillars': [d.getGanZhi() for d in da_yun[1:6]],
            # getStartAge() is 虚岁 (nominal/counted age: 1 at birth, incremented at each Lunar New Year), not the
            # site's 0-based fromAge. Recorded here for reference only; nothing in tests/bazi.test.cjs compares it.
            'startAges': [d.getStartAge() for d in da_yun[1:6]]}


cases = []
for y, m, d, h, minute in BIRTHS:
    chart = Solar.fromYmdHms(y, m, d, h, minute, 0).getLunar().getEightChar()
    chart.setSect(1)
    cases.append({
        'birthday': f'{y:04}-{m:02}-{d:02}', 'time': f'{h:02}:{minute:02}',
        'location': {'latitude': 31.23, 'longitude': 121.47, 'timeZone': 'Asia/Shanghai'},
        'pillars': [chart.getYear(), chart.getMonth(), chart.getDay(), chart.getTime()],
        'hidden': [chart.getYearHideGan(), chart.getMonthHideGan(), chart.getDayHideGan(), chart.getTimeHideGan()],
        'godsStems': [GOD_KEYS[chart.getYearShiShenGan()], GOD_KEYS[chart.getMonthShiShenGan()], None, GOD_KEYS[chart.getTimeShiShenGan()]],
        'godsHidden': [[GOD_KEYS[g] for g in chart.getYearShiShenZhi()], [GOD_KEYS[g] for g in chart.getMonthShiShenZhi()],
                       [GOD_KEYS[g] for g in chart.getDayShiShenZhi()], [GOD_KEYS[g] for g in chart.getTimeShiShenZhi()]],
        'yun': {'male': yun_for(chart, 1), 'female': yun_for(chart, 0)},
    })

target = Path(__file__).resolve().parents[1] / 'tests/fixtures/bazi-reference.json'
target.write_text(json.dumps({'sources': {'lunar_python': version('lunar_python'), 'convention': 'Asia/Shanghai civil time; sect 1 (day rolls 23:00); luck pillars getYun(gender, 1)'},
                              'cases': cases}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(cases)} BaZi reference cases.')
