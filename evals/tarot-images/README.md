# Tarot image model trials

A repeatable loop for choosing models for our decks: **generate → inspect → record the verdict → make one targeted correction → compare the results**. The local queue and report keep every attempt. Generation runs through the chosen image tool; this Python program does not call APIs or spend credits unattended.

The default suite has seven challenges, three independent repetitions each, and a maximum of two attempts per trial (21 first attempts, at most 42 total per candidate). It covers saturated minimal illustration, Arts and Crafts borders, dark expressive painting, exact symbol counts, a reversible back, and a precise edit with a fixed starting image. Use the same frozen inputs for every candidate. A small pilot with fewer cases is useful for checking the workflow but cannot establish a model ranking.

## Run a comparison

From the project directory, with Python and Pillow available:

```powershell
python tools/image_eval.py init evals/tarot-images/runs/my-comparison
python tools/image_eval.py queue evals/tarot-images/runs/my-comparison
```

The candidate list is `evals/tarot-images/candidates.json`. Before creating a run, add the exact provider/model IDs and settings actually available. Use `undisclosed` for an unknown model version. The built-in image tool has no model selector or seed control; we cannot use its label to claim a comparison between specific OpenAI model versions. Additional providers need an explicitly selected tool/API workflow.

`init` copies and hashes the suite and reference images, creates independent trials, and shuffles their execution order with a fixed order seed. That seed only shuffles the queue; it is **not** an image-generation seed. It refuses to overwrite an existing run. Native references live on the project NAS and are not committed to Git; missing references fail initialization with an explicit path.

For each `generate`/`retry` job, send the exact `prompt` and `reference` to the chosen tool. Reference roles are explicit: style reference for generation; edit target for the edit case or a visual correction. With the built-in tool, inspect local inputs first, call `image_gen`, then record the returned native file. Do not quietly reroll, rewrite prompts, change settings or select the nicest of several outputs. Record a provider failure too. If a provider cannot meet the input/output requirements, record that limitation rather than changing only its tests.

```powershell
python tools/image_eval.py record evals/tarot-images/runs/my-comparison TRIAL-ID --image C:/path/output.png --seconds 125
# Or, if generation failed:
python tools/image_eval.py record evals/tarot-images/runs/my-comparison TRIAL-ID --error "Provider returned a timeout"
```

Only record measured latency and reported dollar cost (`--usd`); omit either when unavailable. Parallel-call latency includes any provider queuing. Keep a single writer for `record`/`review`; parallel generation is fine, but submit the resulting records sequentially. All image attempts are copied into the run and retained. The loop never replaces a production deck image.

## Review each output

Pixel checks validate decodability, native dimensions, portrait ratio and exact duplicate pixels. They **cannot count objects, judge artistic merit, prove symmetry or certify UV print quality**. An exact duplicate is an independence/data-quality failure, and is retained in the record. Inspect the whole image at full size and at card size. For a back, compare it after rotating it 180 degrees; for an edit, compare it to the fixed target. Record any ambiguous count as a failure.

Create a review JSON with one Boolean for each case requirement in its listed order:

```json
{
  "reviewer": "Glenn",
  "reviewer_kind": "human",
  "requirements": [false, true],
  "quality": {"style": 4, "composition": 4, "detail": 4},
  "clean": true,
  "feedback": "Seven fence wands plus one held = eight total. Add one fence wand; preserve the person and botanical border."
}
```

Use `reviewer_kind: "assistant"` when Codex performs the visual review. These are attributed subjective reviews, not independent human approval. Score each quality dimension from 1–5: 1 unusable, 2 substantial problems, 3 usable with reservations, 4 strong, 5 exceptional. `style` measures reference/palette/medium adherence; `composition` measures scene clarity and safe framing; `detail` measures readable contours and distracting artifacts at native resolution. `clean` means no unwanted text, watermark, frame clipping or obvious unintended visual defects.

```powershell
python tools/image_eval.py review evals/tarot-images/runs/my-comparison TRIAL-ID --file C:/path/review.json
python tools/image_eval.py queue evals/tarot-images/runs/my-comparison
python tools/image_eval.py report evals/tarot-images/runs/my-comparison
```

A pass requires every explicit requirement, `clean: true`, and at least 3 in all quality dimensions. A high aesthetic score cannot compensate for the wrong symbol count. A visual failure queues an edit of that exact attempt with the review's correction instructions. A corrupt/undersized/duplicate output or generation error queues the original request again. The retry cap then stops the trial as passed or exhausted. Successful trials stop; they are never silently rerolled.

The clickable `report.html` shows large cards, all attempts, requirements, technical results, feedback, settings and separate first-pass/final success counts. `summary.json` is machine-readable. Pending trials remain visible and in the planned denominator. Missing cost/time is unavailable, not zero. Compare cases and generation versus editing separately before choosing a model; a single aggregate score can hide a style-specific weakness. The report deliberately does not declare a winner from a small or incomplete sample.

## Maintain the suite

`python tools/build_image_eval_suite.py` rebuilds the starting suite from the existing deck art direction. Existing runs retain their copied inputs. If prompts, references, thresholds or review policy change, create a new run for every candidate. Never mix historical hand-picked deck revisions into fresh model comparisons.

```powershell
python -m unittest discover -s tests -p test_image_eval.py -v
```

Generated trial images and copied references remain local on the NAS. Prompts, reviews, run state, summaries and the HTML report can be committed; the report needs its local image folders to display images. Printing still requires a physical proof: enlarging a source onto a 600-PPI canvas does not create native 600-PPI detail.
