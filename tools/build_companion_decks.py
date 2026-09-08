"""Typeset complete generated illustrations and export print and web copies.

This is a production layout step, not creative image editing. Every source
illustration is preserved uncropped and unmodified in raw-fronts/raw-backs.
600 PPI describes the output canvas, not the generated source resolution.
"""
import argparse
import csv
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PPI = 600
W, H = round(76 / 25.4 * PPI), round(126 / 25.4 * PPI)
BLEED = round(3 / 25.4 * PPI)
FONT = "C:/Windows/Fonts/georgia.ttf"
DECKS = {"light-minimal": ("Moebius-inspired", "light-minimal-deck", "#fff9eb", "#394e5a"),
         "arts-and-crafts": ("Arts & Crafts", "arts-and-crafts-deck", "#e6d2a6", "#203c30"),
         "expressive-figures": ("Francis Bacon-inspired", "expressive-figures-deck", "#080709", "#bbaa8b")}


def layout(source, entry, background, ink):
    image = Image.new("RGB", (W, H), background)
    # Fit the WHOLE illustration inside trim, with a separate title below.
    botanical = entry["deck"] == "arts-and-crafts"
    footer = 180 if entry["index"] < 78 and not botanical else 0
    safe = BLEED + 38
    art = ImageOps.contain(source, (W - 2 * safe, H - 2 * safe - footer), Image.Resampling.LANCZOS)
    art_y = safe + (H - 2 * safe - footer - art.height) // 2
    image.paste(art, ((W - art.width) // 2, art_y))
    if botanical and entry["index"] < 78:
        # The generated botanical frame reserves this cartouche for type.
        draw = ImageDraw.Draw(image)
        words = entry["name"].upper().split()
        lines = [" ".join(words)]
        face = ImageFont.truetype(FONT, 64)
        max_width = art.width * .36
        if draw.textlength(lines[0], font=face) > max_width:
            split = min(range(1, len(words)), key=lambda k: max(len(" ".join(words[:k])), len(" ".join(words[k:]))))
            lines = [" ".join(words[:split]), " ".join(words[split:])]
        center_y = art_y + art.height * .928
        for line_index, line in enumerate(lines):
            draw.text((W / 2, center_y + (line_index - (len(lines) - 1) / 2) * 60), line, font=face, fill=ink, anchor="mm")
    if footer:
        draw = ImageDraw.Draw(image)
        title = f'{entry["number"]}  ·  {entry["name"].upper()}' if entry["category"] == "major" else entry["name"].upper()
        size = 72
        while draw.textbbox((0, 0), title, font=ImageFont.truetype(FONT, size))[2] > W - 2 * safe and size > 30:
            size -= 1
        face = ImageFont.truetype(FONT, size)
        draw.text((W / 2, H - safe - footer / 2), title, font=face, fill=ink, anchor="mm")
    return image


def build(deck, partial=False, web_only=False):
    label, webfolder, paper, ink = DECKS[deck]
    base = ROOT / "deck-art" / deck
    plan = json.loads((base / "generation-plan.json").read_text(encoding="utf-8"))["cards"]
    missing = [entry["name"] for entry in plan if not (ROOT / entry["file"]).exists()]
    if missing and not partial:
        raise SystemExit(f"{label}: missing {len(missing)} illustrations: {', '.join(missing)}")
    manifest = []
    for entry in plan:
        raw = ROOT / entry["file"]
        if not raw.exists():
            continue
        with Image.open(raw) as original:
            original.load()
            native_size = original.size
            card = layout(original.convert("RGB"), entry, paper, ink)
        index = entry["index"]
        stem = f"{index:02d}" if index < 78 else "back"
        print_path = base / "print-ready" / ("fronts" if index < 78 else "") / f"{stem}.png"
        if not web_only:
            print_path.parent.mkdir(parents=True, exist_ok=True)
            card.save(print_path, dpi=(PPI, PPI))
        webbase = ROOT / "assets" / webfolder
        for category, bounds, quality in (("cards", (360, 597), 89), ("large", (1080, 1791), 94)):
            out = webbase / (category if index < 78 or category == "large" else "") / f"{stem}.jpg"
            out.parent.mkdir(parents=True, exist_ok=True)
            ImageOps.contain(card, bounds, Image.Resampling.LANCZOS).save(out, quality=quality, optimize=True)
        manifest.append({"index": stem, "name": entry["name"], "category": entry["category"],
                         "source": raw.relative_to(base).as_posix(), "native_width": native_size[0], "native_height": native_size[1],
                         "print_file": print_path.relative_to(base).as_posix(), "canvas_width": W, "canvas_height": H, "canvas_ppi": PPI})
    with (base / "manifest.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(manifest[0]))
        writer.writeheader()
        writer.writerows(manifest)
    print(f"{label}: {len(manifest)} of 79 artworks exported; {len(plan) - len(manifest)} remaining. Canvas {W} x {H} at {PPI} PPI; source dimensions recorded separately.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--partial", action="store_true", help="Export only existing artwork during generation")
    parser.add_argument("--web-only", action="store_true")
    parser.add_argument("--deck", choices=DECKS)
    args = parser.parse_args()
    for name in ([args.deck] if args.deck else DECKS):
        build(name, args.partial, args.web_only)
