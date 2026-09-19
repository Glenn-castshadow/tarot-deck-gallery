# Weekly reading: live probes, 2026-09-18

Measured on GLENNHOMEPC (RTX 5080), llama.cpp on 127.0.0.1:8088. Writer: `muse-glimmer-30b-local`. Proofreader:
`qwen3.8-27b-local`. Three Monday weeks chosen to differ: 2026-09-21 (two events), 2026-10-19 (three events, no
lunar quarter, two planets changing sign) and 2026-11-02 (no events at all). Each week is 14 blocks: twelve sign
readings, the overview, and the subject lines with the preview.

## Writer

| Run | Briefs | First-attempt passes | Written | Time per week |
|---|---|---|---|---|
| 1 | as planned | 42 of 42 | 42 of 42 | about 5 min 20 s |
| 2 | after the fix wave and the first brief revision | 39 of 42 | 42 of 42 | 5 to 8 min |
| 3 | final (weeks 2026-10-19 and 2026-11-02 only) | 23 of 28 | 28 of 28 | 7 to 8 min |

Run 1 passed every code check and was wrong in every reading of two weeks: 24 of 24 sign readings in the weeks
where the Sun changes sign said "The Sun spends all seven days in ..." although the Sun left that sector on the
Wednesday or the Friday. The phrase was copied from the brief's example, and the fact sheet never said a
placement could end. Run 1 also showed fact-sheet words in reader prose ("the placements stay steady"), a quiet
week described three times in one paragraph, and subject lines that were the example with the nouns swapped.

Changes made: placements carry `until`; the example says "opens the week in"; `overstays()`; a check for
fact-sheet wording; a quiet week is said once; the subject example rotates across three sets.

Run 2's three rejections were real catches: two by `overstays()` ("says Venus stays all week, but its placement
ends on Sunday"), one "you will", and one reading that was not two paragraphs. All 24 readings in the two
sign-change weeks said "until <day>". No fact-sheet wording. Subject lines no longer copied an example. Sign
readings: medians 177, 179 and 182 words; 33 of 36 inside 150 to 200; extremes 146 and 208.

An independent strong-model read of run 2's 42 blocks against the sheets found week 2026-09-21 fully sound and
two habits elsewhere: five readings opened their second paragraph with "Two days matter most." (copied from the
example) in a week with three marked days, and three readings set a deadline "before Wednesday" in weeks where
nothing happens on a Wednesday. One reading promised outcomes ("invitations appear, groups ask for your input").
Every placement, ruling planet, event day, sector, direction and Moon direction in all 42 blocks was correct.

Changes made: the example no longer states a count of days; `strayWeekday()` allows only Monday and the sheet's
own weekdays, in readings, the overview, subjects and the preview.

## Proofreader

70 blocks judged in five runs; every reply parsed as a verdict; 20 to 25 seconds a block, 6 to 8 minutes a week.

| Set | Result |
|---|---|
| Six seeded errors, one per sign, each passing the code validator (wrong weekday, wrong sector, wrong planet, a promise, medical advice, a doom sentence) | 6 of 6 failed, each reason naming the sentence |
| The six untouched signs and the overview in the same week | 7 of 7 passed |
| Run 1's week 2026-09-21 as first written (the real "all seven days" error, judged against facts that carry `until`) | 12 of 12 failed, each citing the sentence and the Wednesday boundary; the overview, which was correct, passed |
| Run 2's three clean weeks | 42 of 42 passed |

Against the spec's thresholds: catch rate 6 of 6 (needs 5 of 6); false fails on clean blocks 0 of 49 (allows 1 in
10). The judge's brief was not changed.

What Qwen did not catch: the seven blocks the independent read flagged in run 2 (the copied "Two days" opener
and the invented "before Wednesday" deadlines) and the one mild promise. Qwen is reliable on a direct
contradiction of a day, planet, sector or duration, and does not count events or notice a weekday that carries
no meaning. Both misses are things code checks exactly, which is where they were fixed.

Corrections Qwen applied (14): "Full moon" to "full moon" (several), "self interest" to "self-interest",
"follow through" to "follow-through", "check in" to "check-in", "moon" to "Moon", an added comma, an inserted
"are". Two corrections were discarded by the fact-word guard. No applied correction changed a fact. While
planning the weekday rule it became clear the guard compared counts of fact words, which a swap of Thursday
with Sunday leaves unchanged; it now compares their order.

## Run 3

Weeks 2026-10-19 and 2026-11-02, written again under the final briefs and checks (the weekday rule, no count in
the example): 23 of 28 blocks passed first time and 28 of 28 were written, in 8 and 7 minutes. All five retries
were real catches: three invented weekdays ("names Wednesday, which is not a day in the sheet", twice for one
sign, and a Thursday in the week with no events), one "Venus stays all week" and two readings that were not two
paragraphs. No reading opens with a count of days, and no weekday outside the sheet survives. Sign readings:
medians 172 and 188 words, extremes 154 and 216.

The first-attempt rate fell from 39 of 42 to 23 of 28 as the checks grew stricter, and no block was lost. A
sign uses at most three attempts, so the cost is time, about two minutes a week.

## After the probes

An independent review of the probe-driven commits found the fact-word guard still blind to small words ("is not
waning", "Before Thursday", "out of Libra") and to whole-word boundaries ("boundaries" contains "aries"). The
guard now matches whole words and tracks those hinge words and spelled-out numbers. It remains a tripwire beside
the validator and the 8% budget, not a proof that a correction kept the meaning. The proofreader probe above ran
before this change; its 14 applied corrections were re-read by hand and none touches a hinge word except the
inserted "are", which is not one.
