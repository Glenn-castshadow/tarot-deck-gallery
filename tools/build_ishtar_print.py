"""Build print-ready Ishtar Insights tarot cards and EufyMake sheet layouts.

Raw generated art is kept intact. This script adds production typography, a
trim-safe ornamental frame, 3 mm bleed, and 600 PPI output for each card.
"""

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DECK = ROOT / "deck-art" / "ishtar-insights"
RAW = DECK / "raw-fronts"
OUT = DECK / "print-ready"
FRONTS = OUT / "fronts"
SHEETS = OUT / "sheets"

# 70 x 120 mm finished size with 3 mm bleed on each edge, rendered at 600 PPI.
PPI = 600
CARD_W = round(76 / 25.4 * PPI)
CARD_H = round(126 / 25.4 * PPI)
TRIM_X = round(3 / 25.4 * PPI)
TRIM_Y = round(3 / 25.4 * PPI)

CARDS = [
    ("00", "The Fool", "00-the-fool-art.png", "major"),
    ("I", "The Magician", "01-the-magician-art.png", "major"),
    ("II", "The High Priestess", "02-the-high-priestess-art.png", "major"),
    ("III", "The Empress", "03-the-empress-art.png", "major"),
    ("IV", "The Emperor", "04-the-emperor-art.png", "major"),
    ("V", "The Hierophant", "05-the-hierophant-art.png", "major"),
    ("VI", "The Lovers", "06-the-lovers-art.png", "major"),
    ("VII", "The Chariot", "07-the-chariot-art.png", "major"),
    ("VIII", "Strength", "08-strength-art.png", "major"),
    ("IX", "The Hermit", "09-the-hermit-art.png", "major"),
    ("X", "Wheel of Fortune", "10-wheel-of-fortune-art.png", "major"),
    ("XI", "Justice", "11-justice-art.png", "major"),
    ("XII", "The Hanged Man", "12-the-hanged-man-art.png", "major"),
    ("XIII", "Death", "13-death-art.png", "major"),
    ("XIV", "Temperance", "14-temperance-art.png", "major"),
    ("XV", "The Devil", "15-the-devil-art.png", "major"),
    ("XVI", "The Tower", "16-the-tower-art.png", "major"),
    ("XVII", "The Star", "17-the-star-art.png", "major"),
    ("XVIII", "The Moon", "18-the-moon-art.png", "major"),
    ("XIX", "The Sun", "19-the-sun-art.png", "major"),
    ("XX", "Judgement", "20-judgement-art.png", "major"),
    ("XXI", "The World", "21-the-world-art.png", "major"),
]

for suit in ("Wands", "Cups", "Swords", "Pentacles"):
    slug = suit.lower()
    for rank, rank_slug in (("Ace", "ace"), ("Two", "02"), ("Three", "03"), ("Four", "04"), ("Five", "05"), ("Six", "06"), ("Seven", "07"), ("Eight", "08"), ("Nine", "09"), ("Ten", "10"), ("Page", "page"), ("Knight", "knight"), ("Queen", "queen"), ("King", "king")):
        filename = f"{slug}-{rank_slug}-art.png"
        CARDS.append((rank, f"{rank} of {suit}", filename, suit.lower()))


FONT_DIR = Path("C:/Windows/Fonts")
FONT_SERIF = FONT_DIR / "georgia.ttf"
FONT_SERIF_BOLD = FONT_DIR / "georgiab.ttf"
FONT_MONO = FONT_DIR / "consola.ttf"


def font(path: Path, size: int):
    return ImageFont.truetype(str(path), size)


def fit_art(path: Path):
    image = Image.open(path).convert("RGB")
    return ImageOps.fit(image, (CARD_W, CARD_H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))


def text_center(draw, xy, text, typeface, fill, stroke=0, stroke_fill=None):
    box = draw.textbbox((0, 0), text, font=typeface)
    draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1] - (box[3] - box[1]) / 2), text, font=typeface, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)


def suit_color(kind):
    return {"wands": (239, 177, 92), "cups": (111, 222, 222), "swords": (208, 221, 242), "pentacles": (224, 192, 105)}.get(kind, (230, 177, 126))


def build_card(number, name, filename, kind):
    image = fit_art(RAW / filename)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    accent = suit_color(kind)
    cream = (255, 250, 244, 245)
    dark = (22, 12, 35, 205)

    # Subtle title bands keep typography legible without flattening the artwork.
    band_h = round(CARD_H * 0.11)
    for y in range(band_h):
        alpha = round(215 * (1 - y / band_h))
        draw.rectangle((0, y, CARD_W, y + 1), fill=(22, 12, 35, alpha))
        draw.rectangle((0, CARD_H - y - 1, CARD_W, CARD_H - y), fill=(22, 12, 35, alpha))

    # Trim-safe double rule and corner accents.
    inset = TRIM_X + round(3 / 25.4 * PPI)
    draw.rounded_rectangle((inset, inset, CARD_W - inset, CARD_H - inset), radius=round(PPI * 1.3), outline=(*accent, 205), width=max(3, round(PPI / 120)))
    inner = inset + round(PPI * 0.06)
    draw.rounded_rectangle((inner, inner, CARD_W - inner, CARD_H - inner), radius=round(PPI * 0.9), outline=(255, 250, 244, 125), width=max(2, round(PPI / 220)))

    # Small deck signature, card index, and crisp title are production text.
    text_center(draw, (CARD_W / 2, TRIM_Y + round(PPI * 0.20)), "ISHTAR INSIGHTS", font(FONT_MONO, round(PPI * 0.09)), (*accent, 235))
    text_center(draw, (CARD_W / 2, TRIM_Y + round(PPI * 0.48)), number.upper(), font(FONT_SERIF_BOLD, round(PPI * 0.16)), cream, stroke=2, stroke_fill=dark)
    title_size = round(PPI * (0.19 if len(name) < 17 else 0.16))
    text_center(draw, (CARD_W / 2, CARD_H - TRIM_Y - round(PPI * 0.32)), name.upper(), font(FONT_SERIF_BOLD, title_size), cream, stroke=2, stroke_fill=dark)
    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    return image.convert("RGB")


def build_back():
    image = fit_art(DECK / "raw-backs" / "ishtar-insights-mirrored-back.png")
    draw = ImageDraw.Draw(image)
    accent = (230, 177, 126)
    inset = TRIM_X + round(3 / 25.4 * PPI)
    draw.rounded_rectangle((inset, inset, CARD_W - inset, CARD_H - inset), radius=round(PPI * 1.3), outline=accent, width=max(3, round(PPI / 120)))
    draw.rounded_rectangle((inset + round(PPI * 0.06), inset + round(PPI * 0.06), CARD_W - inset - round(PPI * 0.06), CARD_H - inset - round(PPI * 0.06)), radius=round(PPI * 0.9), outline=(255, 250, 244), width=max(2, round(PPI / 220)))
    return image


def build_sheets(front_paths):
    # At 300 PPI, 3 columns x 2 rows fits comfortably on the E1's 330 x 420 mm bed.
    sheet_ppi = 300
    sheet_w = round(330 / 25.4 * sheet_ppi)
    sheet_h = round(420 / 25.4 * sheet_ppi)
    card_w = round(CARD_W / 2)
    card_h = round(CARD_H / 2)
    gap = round(5 / 25.4 * sheet_ppi)
    margin_x = (sheet_w - 3 * card_w - 2 * gap) // 2
    margin_y = (sheet_h - 2 * card_h - gap) // 2
    for index in range(0, len(front_paths), 6):
        sheet = Image.new("RGB", (sheet_w, sheet_h), (244, 237, 228))
        draw = ImageDraw.Draw(sheet)
        draw.text((margin_x, round(8 / 25.4 * sheet_ppi)), f"ISHTAR INSIGHTS · SHEET {index // 6 + 1:02d}", font=font(FONT_MONO, round(sheet_ppi * 0.08)), fill=(52, 29, 63))
        for slot, path in enumerate(front_paths[index:index + 6]):
            card = Image.open(path).resize((card_w, card_h), Image.Resampling.LANCZOS)
            x = margin_x + (slot % 3) * (card_w + gap)
            y = margin_y + (slot // 3) * (card_h + gap)
            sheet.paste(card, (x, y))
            draw.rectangle((x, y, x + card_w - 1, y + card_h - 1), outline=(120, 77, 120), width=2)
        sheet.save(SHEETS / f"sheet-{index // 6 + 1:02d}.png", dpi=(sheet_ppi, sheet_ppi), optimize=True)


def main():
    FRONTS.mkdir(parents=True, exist_ok=True)
    SHEETS.mkdir(parents=True, exist_ok=True)
    built = []
    for number, name, filename, kind in CARDS:
        output = FRONTS / filename
        build_card(number, name, filename, kind).save(output, dpi=(PPI, PPI), optimize=True)
        built.append(output)
    build_back().save(OUT / "back.png", dpi=(PPI, PPI), optimize=True)
    build_sheets(built)
    manifest = ["index,name,raw_front,print_front,category"]
    for index, (number, name, filename, kind) in enumerate(CARDS):
        manifest.append(f'{index:02d},"{name}",raw-fronts/{filename},print-ready/fronts/{filename},{kind}')
    (DECK / "manifest.csv").write_text("\n".join(manifest) + "\n", encoding="utf-8")
    print(f"Built {len(built)} fronts, 1 back, and {math.ceil(len(built) / 6)} E1 sheet layouts at {PPI} PPI.")
    print(f"Card canvas: {CARD_W} x {CARD_H} px (76 x 126 mm including bleed).")


if __name__ == "__main__":
    main()
