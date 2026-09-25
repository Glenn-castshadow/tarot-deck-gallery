# Crystal catalog images

The catalog has one AI-generated mineral depiction for each of the 100 entries in
`crystal-data.js`. Glenn chose a clean mineral photography style. The images were
generated with Codex's built-in `image_gen` tool on 2026-09-24. They are visual
depictions, not photographs of verified specimens, and the site says so.

- `prompts.json` records the stone-specific appearance briefs.
- `contact-sheet.jpg` previews all 100 finished thumbnails in catalog order.
- `raw/<slug>.png` holds the 1254 px square generation masters locally. This
  directory is ignored by Git because it is about 198 MiB.
- `assets/crystals/<slug>.webp` is the versioned 800 px detail image;
  `assets/crystals/thumbs/<slug>.webp` is the versioned 320 px thumbnail.

The prompt for each stone used this exact template. `{name}`, `{appearance}` and
`{colours}` came from `crystal-data.js` and `prompts.json`:

```text
Use case: product-mockup
Asset type: square mineral specimen photograph for the Ishtar Insights crystal reference catalog.
Primary request: one true-to-life, geologically recognizable {name} specimen: {appearance}. Characteristic colors approximately {colours}.
Scene/backdrop: seamless warm ivory studio background near #fffaf4.
Style/medium: photorealistic natural history museum specimen photography, authentic mineral texture and small imperfections; avoid artificial fantasy glow or generic quartz points when this stone has a different habit.
Composition/framing: one specimen fully visible and centered with generous margin on all sides, square frame; suitable for catalog thumbnail and larger detail view.
Lighting/mood: soft directional studio light, subtle grounding shadow.
Constraints: no hands, people, jewelry, tools, labels, text, watermark, border, pedestal, or decorative props.
```

Rebuild the web assets from the local masters with
`python tools/build_crystal_images.py`, then run
`node tools/build_reference_pages.cjs` and
`node tools/build_reference_pages.cjs --check`.
