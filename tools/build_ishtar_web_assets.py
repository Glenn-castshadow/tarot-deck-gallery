"""Create lightweight web derivatives of the Ishtar Insights print cards."""

from csv import DictReader
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DECK = ROOT / "deck-art" / "ishtar-insights"
OUT = ROOT / "assets" / "ishtar-deck" / "cards"
OUT.mkdir(parents=True, exist_ok=True)

with (DECK / "manifest.csv").open(encoding="utf-8", newline="") as handle:
    cards = list(DictReader(handle))

for row in cards:
    source = DECK / row["print_front"]
    output = OUT / f'{int(row["index"]):02d}.jpg'
    image = Image.open(source).convert("RGB")
    image.thumbnail((360, 600), Image.Resampling.LANCZOS)
    image.save(output, format="JPEG", quality=88, optimize=True, progressive=True)

back = Image.open(DECK / "print-ready" / "back.png").convert("RGB")
back.thumbnail((360, 600), Image.Resampling.LANCZOS)
back.save(OUT.parent / "back.jpg", format="JPEG", quality=88, optimize=True, progressive=True)

print(f"Built {len(cards)} web card images and one back image.")
