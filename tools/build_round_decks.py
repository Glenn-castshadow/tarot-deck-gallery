"""Export web copies of the circular decks: crop each square source to its painted circle.

The sources are circles painted on a cream square, and the circle drifts and is slightly
elliptical from card to card, so each one is cropped to its own bounding box and resized to an
exact square. The site clips the corners with border-radius, so JPEG is enough. No print canvases:
these sources are proofs, not production masters (see each deck's README).
"""
import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DECKS = {"arcana-round": ("Arcana", "arcana-round-deck"),
         "dia-de-los-muertos-round": ("Día de los Muertos", "dia-de-los-muertos-round-deck")}
SIZES = (("cards", 600, 89), ("large", 1200, 94))
INSET = 6  # source px trimmed inside the detected edge, to lose the anti-aliased cream fringe


def circle(source):
    paper = source.getpixel((4, 4))
    diff = ImageChops.difference(source, Image.new("RGB", source.size, paper)).convert("L")
    mask = diff.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MedianFilter(5))
    left, top, right, bottom = mask.getbbox()
    assert right - left > source.width * .9 and bottom - top > source.height * .9, "circle not found"
    assert abs((right - left) - (bottom - top)) < source.width * .04, "circle is too elliptical to square up"
    return source.crop((left + INSET, top + INSET, right - INSET, bottom - INSET)), paper


def rim_is_clean(square, paper):
    """No cream on the ring just inside where the CSS circle cuts: fails if a crop is off-centre."""
    r = square.width / 2
    points = [(r + r * .985 * math.cos(a / 180 * math.pi), r + r * .985 * math.sin(a / 180 * math.pi)) for a in range(360)]
    cream = sum(all(abs(c - p) < 24 for c, p in zip(square.getpixel((int(x), int(y))), paper)) for x, y in points)
    return cream <= 6


def build(deck):
    label, webfolder = DECKS[deck]
    plan = json.loads((ROOT / "deck-art" / deck / "generation-plan.json").read_text(encoding="utf-8"))["cards"]
    assert [row["index"] for row in plan] == list(range(79)), f"{deck}: incomplete or repeated card indices"
    assert Counter(row["category"] for row in plan) == {"major": 22, "wands": 14, "cups": 14, "swords": 14, "pentacles": 14, "back": 1}
    hashes, dirty = set(), []
    for entry in plan:
        raw = ROOT / "deck-art" / deck / "cards" / Path(entry["file"]).name  # plan paths are absolute to Codex's checkout
        hashes.add(hashlib.sha256(raw.read_bytes()).hexdigest())
        with Image.open(raw) as original:
            art, paper = circle(original.convert("RGB"))
        stem = f'{entry["index"]:02d}' if entry["index"] < 78 else "back"
        for category, size, quality in SIZES:
            out = ROOT / "assets" / webfolder / (category if stem != "back" or category == "large" else "") / f"{stem}.jpg"
            out.parent.mkdir(parents=True, exist_ok=True)
            square = art.resize((size, size), Image.Resampling.LANCZOS)
            square.save(out, quality=quality, optimize=True)
        if not rim_is_clean(square, paper):
            dirty.append(entry["name"])
    assert len(hashes) == 79, f"{deck}: duplicate source artwork"
    assert not dirty, f"{deck}: cream shows inside the circle on: {', '.join(dirty)}"
    print(f"PASS {label}: 78 unique fronts + back, 158 web images, every rim clean.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--deck", choices=DECKS)
    args = parser.parse_args()
    for name in ([args.deck] if args.deck else DECKS):
        build(name)
