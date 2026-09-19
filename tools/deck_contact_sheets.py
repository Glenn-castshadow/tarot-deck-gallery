"""Contact sheets for reviewing a generated deck: deck-art/<deck>/contact-sheets/sheet-N.jpg, each a
grid of labelled raw illustrations. Used to check every card by eye for stray lettering, malformed hands,
the wrong cast and the wrong number of suit objects before the deck is built and wired in.
    python tools/deck_contact_sheets.py earth-warden [--per-sheet 8] [--only 13,45]"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = "C:/Windows/Fonts/georgia.ttf"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck")
    parser.add_argument("--per-sheet", type=int, default=8)
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    base = ROOT / "deck-art" / args.deck
    plan = json.loads((base / "generation-plan.json").read_text(encoding="utf-8"))["cards"]
    wanted = {int(i) for i in args.only.split(",") if i} if args.only else None
    cards = [c for c in plan if (ROOT / c["file"]).exists() and (wanted is None or c["index"] in wanted)]
    out = base / "contact-sheets"
    out.mkdir(exist_ok=True)
    cols = min(4, args.per_sheet)
    cell_w, cell_h, label_h, gap = 440, 660, 34, 14
    face = ImageFont.truetype(FONT, 22)
    for n in range(0, len(cards), args.per_sheet):
        group = cards[n:n + args.per_sheet]
        rows = -(-len(group) // cols)
        sheet = Image.new("RGB", (cols * (cell_w + gap) + gap, rows * (cell_h + label_h + gap) + gap), (14, 20, 13))
        draw = ImageDraw.Draw(sheet)
        for k, card in enumerate(group):
            x = gap + (k % cols) * (cell_w + gap)
            y = gap + (k // cols) * (cell_h + label_h + gap)
            with Image.open(ROOT / card["file"]) as im:
                sheet.paste(im.convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS), (x, y))
            draw.text((x + 4, y + cell_h + 5), f'{card["index"]:02d}  {card["name"]}', font=face, fill=(217, 196, 138))
        name = out / (f"sheet-{n // args.per_sheet + 1:02d}.jpg" if wanted is None else f"redo-{'-'.join(str(c['index']) for c in group)}.jpg")
        sheet.save(name, quality=88)
        print(name.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
