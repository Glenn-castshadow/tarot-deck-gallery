# C3b Charts: composite and Davison relationship charts

Date: 2026-09-14. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C3 (split
in `2026-09-14-chart-depth-design.md`: C3a shipped, this is C3b).

## Purpose

The Two skies tab on `/charts/` compares two birth charts by synastry: one person's planets against
the other's. Composite and Davison charts answer a different question. Each builds **one** chart
for the relationship itself, which is then read like a birth chart.

- A **composite** chart takes the midpoint of each pair of placements. It shows no real sky at any
  moment; it is a symbolic construction.
- A **Davison** chart is the real sky at the midpoint in time between the two births, seen from the
  midpoint between the two birthplaces.

## What exists, and what that bounds

- `celestial-extras.js` already carries the partner form, the sample pair, a partner chart
  computed with the reader's house system (`houseSystem: chart?.houseSystem`), and the synastry
  view. C3b adds two more ways of reading the same two charts, so it lives in that tab and reuses
  that form. It needs no second form and no new state for the second person.
- `NatalChart.renderWheel(model)` draws a single chart from `angles`, `points`, `axes`, `cusps` and
  `aspects`. A composite model in that shape draws with no renderer change. The program spec asks
  for "the existing bi-wheel and single-wheel renderers"; composite and Davison are single charts,
  so only the single wheel applies.
- `NatalEngine.chartAtInstant(date, location, {houseSystem, orbScale})` casts a full chart for any
  instant and place. The Davison chart is exactly one call to it.
- **Nothing on the charts page saves** (recorded in the C3a spec). The program spec's `composite`
  journal kind stays unbuilt, for the same reason C3a added none.

## Decisions

Every decision here is mine, taken under Glenn's instruction to complete C3 unattended. Each is
recorded with its cost if wrong.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Where it lives | A method switch in Two skies: Synastry (default, unchanged), Composite, Davison | A reader looking for a separate tab has to find the switch |
| Composite planets | The near midpoint of each pair, along the shorter arc | None; this is the universal convention |
| Exactly opposed pair | Midpoint 90° forward of the first person's placement | The far-side choice is equally arbitrary; the About names the rule |
| Composite angles | Near midpoint of the two Midheavens; near midpoint of the two Ascendants, turned 180° if it would fall west of the composite Midheaven | Some software derives the Ascendant from the composite MC at a chosen latitude instead |
| Composite houses, quadrant systems | Midpoints of corresponding cusps, each taken on the side that keeps the houses in order | Derived-house composites place cusps differently |
| Composite houses, Whole Sign or Equal | Recast from the composite Ascendant in that system | None; those systems are defined by the Ascendant alone |
| The two charts use different house systems | Equal houses from the composite Ascendant, with a notice | A reader who changed house system after entering a partner sees Equal houses until they recompare |
| Davison moment | The midpoint of the two resolved UTC birth instants | None; this is Davison's definition |
| Davison place | The mean of the latitudes; the near midpoint of the longitudes | A great-circle midpoint differs slightly for distant birthplaces |
| Davison house system and orbs | The reader's own chart's settings | None |
| Composite aspects | The five majors at the reader's orb scale, between the ten composite planets, the Ascendant and the Midheaven; no applying or separating | Composite placements do not move, so motion is meaningless |
| Saving | None | None until the chart-page saving gap is closed |

### Midpoints

```
near midpoint of a and b:   a + delta(b, a) / 2       (delta is the signed shortest arc, -180..180)
exactly opposed (delta = ±180):   a + 90
```

`NatalEngine.delta(a, b)` already returns `mod(a − b + 180) − 180`, which is −180 at exact
opposition. The engine must therefore handle ±180 explicitly, so the tie rule does not depend on
the sign returned at the boundary.

### Composite angles and houses

Both natal charts satisfy `mod(asc − mc)` in (0°, 180°): the Ascendant lies east of the Midheaven.
The near midpoint of two such Ascendants usually keeps that relation with the near midpoint of the
Midheavens, but not always. When it does not, the composite Ascendant is turned 180°.

For Placidus and Regiomontanus, each composite cusp is the near midpoint of the corresponding
cusps, or that point turned 180°. The engine keeps whichever candidate lies closer to
`compositeAsc + meanOffset`, where `meanOffset` is the mean of the two charts' arcs from their own
Ascendant to that cusp. This keeps the twelve cusps in order around the wheel. Cusp 1 is the
composite Ascendant and cusp 10 the composite Midheaven.

### Davison

```
instant   = (tA + tB) / 2                                  (UTC milliseconds)
latitude  = (latA + latB) / 2
longitude = near midpoint of lonA and lonB, on the −180..180 scale
```

The chart is cast with `chartAtInstant` at that instant and place. The time zone is `UTC`, and the
page shows the instant in UTC with the coordinates. Both births fall within 1901–2100, so their
midpoint does too. If Placidus is unavailable at the Davison latitude, `chartAtInstant`'s existing
Whole Sign fallback and its notice apply unchanged.

## Architecture

**`relationship-charts-engine.js`**, a pure UMD module with no DOM access:

```
RelationshipChartsEngine.nearMidpoint(a, b)        -> longitude
RelationshipChartsEngine.composite(first, second)  -> chart model | {status:'missing', message}
RelationshipChartsEngine.davison(first, second)    -> chart model | {status:'missing', message}
```

Both methods take two ready charts from `NatalEngine.calculate` and return a model in the shape
`NatalChart.renderWheel` reads. The composite model is
`{status:'ready', method:'composite', houseSystem, notice, angles:{asc, mc}, points, axes, cusps, aspects}`,
where each point carries `NatalEngine.placement` fields and its `house`. The Davison model is the
`chartAtInstant` result with `method:'davison'` and `location` added.

**`relationship-charts.js`**, a pure UMD render module: `render(model)` returns the HTML for one
chart. That HTML holds the wheel, a placements table (body, sign and degree, house), the aspect
list tightest first with a short reflective line per aspect type, and an About disclosure. The
disclosure names the method, the midpoint and house conventions above, and the sources. It is
testable under Node, as `chart-depth.js` is.

**`celestial-extras.js`** adds the method switch to the Two skies view and calls the engine and
render module for Composite and Davison. Synastry's rendering is unchanged.

## Copy

Reflective and never predictive, in British spelling, with curly apostrophes and spaced em dashes.
The composite is described as a symbolic chart of the relationship, and the Davison as the sky at
a real moment and place between the two births. Neither is described as a verdict on the
relationship.

Sources named in the About:

- the composite midpoint chart was popularised by Robert Hand's *Planets in Composite* (1975);
- the Davison relationship chart is named for Ronald Davison, who described it in *Synastry* (1977).

No other attributions.

**No sentence may claim a position, count or direction the data does not support.** In
particular, the page must not claim that a composite house matches either person's houses.

## Testing

`tests/relationship-charts.test.cjs`:

- **Midpoints.** The near midpoint across the 0° boundary (350°, 10° → 0°), the ordinary case, the
  far-side avoidance (10°, 200° → 285°, not 105°), and the exact-opposition rule in both argument
  orders.
- **A composite of a chart with itself is that chart**: every planet, both angles and every cusp,
  to 1e-9. This is the strongest single check on the angle and cusp logic.
- **The composite is symmetric**: swapping the two charts gives the same points, angles and cusps,
  except for exactly opposed pairs.
- **Composite houses.** Cusps increase in order from the Ascendant for Placidus fixture pairs.
  Cusp 1 equals the Ascendant and cusp 10 the Midheaven. The Ascendant lies east of the Midheaven,
  including a constructed pair where the plain midpoint of the Ascendants would fall west. Whole
  Sign pairs recast from the composite Ascendant; mismatched systems give Equal houses and a
  notice.
- **A Davison of a chart with itself is that chart**: the same instant, place and planet
  positions.
- **The Davison uses the right moment and place**, computed independently in the test from the two
  charts' `date` and `location`. This includes a pair whose longitudes straddle 180° (Tokyo and
  Honolulu), where an arithmetic mean would put the place in the wrong ocean.
- **Composite aspects** equal `NatalEngine.aspectsFor` over the composite points, with `applying`
  null.
- **Render.** For every fixture pair, the HTML carries the wheel, ten placement rows, the aspect
  list and the About with both sources. Copy is scanned for predictive phrasing. A not-ready model
  renders an empty string.

Browser verification: with the sample pair and with a saved profile plus a partner, switching
Synastry, Composite and Davison changes the view and back without losing the partner. The wheel
draws. The layout holds at 390px and 1400px, and the phone fold for "More astrology charts" still
works.

## Files

| File | Change |
|---|---|
| `relationship-charts-engine.js` | Create |
| `relationship-charts.js` | Create |
| `celestial-extras.js` | Modify: the method switch and wiring |
| `celestial-extras.css` | Modify: the switch and the single-chart layout |
| `charts/index.html` | Modify: script tags and cache keys |
| `tests/relationship-charts.test.cjs` | Create |
| `tests/pages.test.cjs` | Modify: script-order dependencies for the two new files |
| `docs/EXTENDED-ATLAS.md` | Modify: composite and Davison conventions and sources |
| `docs/SITE-STRUCTURE.md` | Modify: the `/charts/` script chain |

## Out of scope

Saving. Composite nodes, lots and minor aspects. Derived-house composites. Great-circle Davison
midpoints. Comparing a composite against either natal chart, or against transits. Anything on the
eastern page (C3c).

## Constraints

Part E of the program spec binds unchanged: no new dependencies, pure UMD engines tested under
`node --test`, an About disclosure naming conventions and sources, a copy test for forbidden
phrasing, keyboard operable and reduced-motion respecting, verified at 390px and 1400px, cache keys
bumped on every changed file, docs updated, and commits ending with the co-author line.
