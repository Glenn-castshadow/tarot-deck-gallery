# C3c Eastern depth: the Chinese year, the BaZi annual pillar and Gochar

Date: 2026-09-14. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C3 (split
in `2026-09-14-chart-depth-design.md`: C3a and C3b shipped; this is C3c, the last).

## Purpose

Three year- and day-scale readings, each built on a chart the site already computes:

- **The Chinese year**: how a chosen year's animal relates to the reader's birth animal (the same
  animal, trine, six harmony, clash, harm, punishment, destruction), as traditional association.
- **The BaZi annual pillar (流年)**: the stem and branch of a chosen solar year, and its Ten God
  relative to the reader's Day Master.
- **Gochar**: the day's sidereal transits of the nine grahas, counted from the reader's natal Moon
  sign.

## Page ownership, decided

The program spec's page table places BaZi on `/eastern/`. **The codebase says otherwise:** the
Four Pillars tab is part of `celestial-extras.js` on `/charts/`, and `rooms.js` routes the `bazi`
kind to `/charts/`. The table is stale.

| Feature | Page | Why |
|---|---|---|
| BaZi annual pillar | `/charts/`, inside the Four Pillars tab | It needs the Day Master that tab already computes, and a reader looking for 流年 is already in BaZi |
| Chinese year | `/eastern/`, under the Chinese zodiac portrait | It relates the chosen year to the portrait's own birth animal |
| Gochar | `/eastern/`, a fifth Jyotish tab | It reads against the Rashi chart's natal Moon |

`docs/JYOTISH.md` lists "transits (gochar)" as out of scope. **This spec reverses that for Gochar
only**; the rest of that list stands.

## What exists

- `BirthdayInsights.chineseProfile(parts)` gives the birth animal by **lunar year**, using the
  browser's Chinese calendar. The boundary is Lunar New Year, and the portrait says so.
- `CelestialExtrasEngine.bazi(chart)` gives the pillars by **solar year**, with Li Chun (315°) as
  the boundary. It also provides `dayStemIndex`, `tenGod(dayStem, stem)`, `hiddenStems`, `gods`, and
  `jieBoundary(date, direction)`, which searches for a solar-term instant.
- `JyotishEngine.sidereal(chart)` gives the nine grahas with sidereal sign indices (Lahiri) from any
  `NatalEngine` chart. `NatalEngine.chartAtInstant(date, location)` casts the transit sky.
- **Nothing on these pages saves.** No `Rooms.register` exists for `jyotish` or `bazi`, and the
  program spec's `chinese-year` kind was never added to `kinds.py`. C3c adds no kind and no payload,
  for the reason recorded in the C3a spec.

## Decisions

Every decision here is mine, taken under Glenn's instruction to complete C3 unattended.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Chinese year boundary | The lunar year, matching the portrait's birth animal. The chosen year is "the lunar year that begins at Lunar New Year in Y" | A reader who expects Li Chun years sees the neighbouring animal between late January and early February |
| Chinese year default | The lunar year in effect today, from the same Chinese-calendar formatter | None |
| Relations shown | Every traditional relation that applies, in a fixed order, because some pairs carry two (寅亥 is both six harmony and destruction) | Readers may expect one headline relation |
| Relation copy | Original reflective copy per relation, framed as traditional association, with no fortune or luck language | None |
| Annual pillar boundary | The solar year from Li Chun, matching the Four Pillars tab. The page shows that year's Li Chun instant | None; this is the BaZi convention the tab already uses |
| Annual pillar content | The pillar, the stem's Ten God, and the branch's hidden stems with their Ten Gods | Luck-pillar context is left out |
| Gochar instant | 12:00 UTC on the chosen day, like the existing transits tab | The Moon can change sign within the day; the page says positions are for 12:00 UTC |
| Gochar reference | Houses counted whole-sign from the natal Moon's sidereal sign (Chandra) | Counting from the Lagna is a different, less common reading |
| Gochar table | The classical houses from the Moon in which each graha's transit was counted as supportive: Sun 3, 6, 10, 11; Moon 1, 3, 6, 7, 10, 11; Mars 3, 6, 11; Mercury 2, 4, 6, 8, 10, 11; Jupiter 2, 5, 7, 9, 11; Venus 1, 2, 3, 4, 5, 8, 9, 11, 12; Saturn, Rahu and Ketu 3, 6, 11 | Other texts vary at the margins |
| Vedha | Not applied, and the page says so | A traditional reader would apply it |
| Sade Sati | Noted when transiting Saturn is in the 12th, 1st or 2nd sign from the natal Moon | None |
| Gochar wording | "Tradition counted this transit as supportive" or "…as more demanding", in the past tense and third person, as the horary copy does | None |
| Saving | None | None |

### Branch relations

Branch indices run 0–11: Zi, Chou, Yin, Mao, Chen, Si, Wu, Wei, Shen, You, Xu, Hai.

| Relation | Pairs (by index) |
|---|---|
| Same animal (本命年) | b = a |
| Trine (三合) | (b − a) mod 12 is 4 or 8 |
| Six harmony (六合) | (a + b) mod 12 = 1: 0–1, 2–11, 3–10, 4–9, 5–8, 6–7 |
| Clash (六沖) | (b − a) mod 12 = 6 |
| Harm (六害) | (a + b) mod 12 = 7: 0–7, 1–6, 2–5, 3–4, 8–11, 9–10 |
| Punishment (刑) | Within {2, 5, 8} or within {1, 7, 10}, distinct members; or the pair 0–3 |
| Self-punishment (自刑) | b = a and a ∈ {4, 6, 9, 11} |
| Destruction (破) | 0–9, 3–6, 5–8, 2–11, 1–4, 7–10 |

When no relation applies, the page says the tradition names none for this pair. It never calls the
pair lucky or unlucky.

### Annual pillar

```
index      = (Y − 1984) mod 60          (1984 is 甲子)
stem       = index mod 10, branch = index mod 12
god        = tenGod(dayStemIndex, stem)
hidden     = hiddenStems[branch], each with tenGod(dayStemIndex, s)
Li Chun Y  = the instant the apparent solar longitude reaches 315° after 1 January Y (UTC)
```

The year selector runs from 1901 to 2100.

### Gochar

```
transit    = NatalEngine.chartAtInstant(Date(Y-M-DT12:00:00Z), chart.location, {houseSystem:'whole-sign'})
t          = JyotishEngine.sidereal(transit).grahas
moonSign   = JyotishEngine.sidereal(chart).grahas Moon signIndex
house(g)   = (t[g].signIndex − moonSign) mod 12 + 1
supportive = house(g) ∈ TABLE[g]
sadeSati   = house(Saturn) ∈ {12, 1, 2}
```

The date control mirrors the existing transits tab: previous day, next day, today and a date
input, within 1901–2100.

## Architecture

| Module | Role |
|---|---|
| `chinese-year.js` (create) | Pure UMD: `relations(birthBranch, yearBranch)` → ordered keys; the relation copy; `render(profile, year)` → HTML |
| `chinese-room.js` (modify) | Mounts the Chinese year section under the portrait, with a year selector |
| `celestial-extras-engine.js` (modify) | `annualPillar(chart, year)` → `{status, year, index, pillar, god, hidden:[{stemIndex, stem, god}], liChun}` |
| `celestial-extras.js` (modify) | An annual pillar block in the Four Pillars tab, with a year selector |
| `jyotish-engine.js` (modify) | `GOCHAR_SUPPORTIVE` and `gochar(chart, day)` → `{status, day, moonSign, grahas:[{name, signIndex, sign, western, degrees, retrograde, house, supportive}], sadeSati}` |
| `jyotish-text.js` (modify) | Gochar copy: a graha line, the supportive and demanding framings, the Sade Sati note, and the method text |
| `jyotish.js` (modify) | A fifth tab, Gochar, with the date control and table |

Every engine stays pure and tested under `node --test`.

## Sources and framing

- The Chinese year and annual pillar copy calls the branch relations and Ten Gods **traditional
  associations** and makes no claim to measure fortune. It names no source text beyond the
  tradition, as the existing BaZi section does.
- The Gochar method text names the table as the classical Gochara scheme counted from the Moon, as
  summarised in Mantreswara's *Phaladeepika*. It says Vedha is not applied, and it avoids verdicts.

## Testing

- `tests/chinese-year.test.cjs`:
  - Every relation's pair set matches the table above, checked against a literal list of pairs,
    not by recomputing the formula.
  - Every relation is symmetric; trines give each branch exactly two partners; six harmony, clash,
    harm and destruction each have exactly six pairs.
  - 寅–亥 returns both six harmony and destruction.
  - 辰–辰 returns same animal and self-punishment; 子–子 returns same animal only.
  - The rendered copy passes a predictive and luck-language scan, and every relation key has copy.
- `tests/bazi.test.cjs` (appended):
  - 1984 is 甲子, 2026 is 丙午, 2100 is 庚申, and 1901 is 辛丑, each checked against literal
    characters.
  - The Ten God is checked against hand-picked Day Master pairs, not only through `tenGod`.
  - Li Chun 2026 is within two minutes of 2026-02-03T20:02Z, the published instant (04:02 on 4 February, China Standard Time).
  - Hidden stems match the table.
- `tests/gochar.test.cjs`:
  - Table sizes per graha are 4, 6, 3, 6, 5, 9, 3, 3 and 3.
  - Houses from the Moon are hand-computed for constructed sign indices, including the wrap.
  - Sade Sati is true only for 12, 1 and 2.
  - On 2026-09-14 transiting sidereal Saturn is in Meena (Pisces), an independent sanity anchor.
  - `gochar` refuses a chart that is not ready and a malformed day.
  - The copy passes the predictive scan.

Browser verification: the three sections render for the sample and a saved profile; the year
selectors and the day control change the output; there is no overflow at 390px or 1400px; and the
existing Four Pillars, portrait and Jyotish tabs are unchanged.

## Files

| File | Change |
|---|---|
| `chinese-year.js`, `tests/chinese-year.test.cjs` | Create |
| `chinese-room.js`, `eastern/index.html` | Modify: mount, script tag, cache keys |
| `celestial-extras-engine.js`, `celestial-extras.js`, `celestial-extras.css`, `charts/index.html` | Modify: the annual pillar and cache keys |
| `tests/bazi.test.cjs` | Modify: the annual pillar tests |
| `jyotish-engine.js`, `jyotish-text.js`, `jyotish.js`, `jyotish.css` | Modify: Gochar |
| `tests/gochar.test.cjs` | Create |
| `tests/pages.test.cjs` | Modify: script-order dependencies |
| `docs/JYOTISH.md`, `docs/EXTENDED-ATLAS.md`, `docs/BIRTHDAY-INSIGHTS.md`, `docs/SITE-STRUCTURE.md` | Modify |

## Out of scope

Saving. Vedha, Ashtakavarga-weighted transits, and transits counted from the Lagna. Luck-pillar
context for the annual pillar, and monthly (流月) and daily pillars. Combinations of branches
beyond the pairs above, such as three-branch meetings and half-trines. Any compatibility score.

## Constraints

Part E of the program spec binds unchanged: no new dependencies, pure UMD engines tested under
`node --test`, an About disclosure naming conventions and sources, a copy test for forbidden
phrasing, keyboard operable and reduced-motion respecting, verified at 390px and 1400px, cache keys
bumped on every changed file, docs updated, and commits ending with the co-author line.
