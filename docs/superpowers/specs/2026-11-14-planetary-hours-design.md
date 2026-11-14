# Planetary hours on /sky/ (short design)

**Intent.** Glenn asked to "add planetary hours to the site" after a research pass ranked it the cheapest
new discipline: the calculation already existed, reachable only from a cast horary chart. This makes it
something any visitor can open.

**Approved 2026-11-14** (Glenn: "Yes, build it") as proposed, with one later change noted below.

## What it is

A third section on `/sky/`, after "The sky this month": the current hour's ruler with its start and end,
the day's ruler, sunrise and sunset, and a table of all 24 hours with the current one marked. A date
picker shows another day. One paragraph on the system's source (Chaldean order; Agrippa II.34) and one
line of traditional association per planet.

## Approaches considered

1. **Own section on /sky/, city picker** (chosen). Reuses `ClassicalEngine.planetaryHours` and
   `BirthplaceSearch`; no new dependency.
2. A fifth tab inside the sky calendar. Rejected: that section is about the month and already has four
   tabs; hours are about the day and need their own place input.
3. Browser geolocation. Rejected: the site's `Permissions-Policy` header disables it on purpose.

## Constraints, and where each comes from

- No geolocation: the codebase already enforces it (`server/harden-nginx.sh`).
- No advice or "good time for" wording: Claude's judgement, to match the site's historical framing and
  avoid outcome claims. Glenn was told and did not object.
- No new browser storage key: Claude's judgement, made during the build. The proposal said the chosen
  city would be remembered when saving is allowed; doing that properly means adding the key to the
  allow-list in `storage-preferences.js`, which is cached under one key on 266 pages. The section starts
  from the saved birthplace, or New York, on each visit. Revisit if Glenn wants it remembered.
- No library added: nothing to solve that the vendored Astronomy Engine and the existing engine do not.

## Left out

A journal room, notifications, and electional "best hour" search.
