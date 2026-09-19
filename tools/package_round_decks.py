"""Assemble review documents from unchanged generated card images."""
import csv
import hashlib
import html
import json
from pathlib import Path
import zipfile
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DECKS = ['arcana-round', 'dia-de-los-muertos-round']
FONT = 'C:/Windows/Fonts/georgia.ttf'


def build(deck):
    base = ROOT / 'deck-art' / deck
    plan = json.loads((base / 'generation-plan.json').read_text(encoding='utf-8'))
    cards, missing, manifest, seen = [], [], [], set()
    for entry in plan['cards']:
        source = Path(entry['file']).resolve()
        if not source.exists():
            missing.append(entry['name'])
            continue
        with Image.open(source) as image:
            image.load()
            width, height = image.size
            if width != height:
                raise ValueError(f'Non-square image: {source} {image.size}')
            if min(width, height) < 1024:
                raise ValueError(f'Undersized image: {source} {image.size}')
        sha = hashlib.sha256(source.read_bytes()).hexdigest()
        if sha in seen:
            raise ValueError(f'Duplicate artwork: {source}')
        seen.add(sha)
        cards.append(entry)
        manifest.append(dict(index=entry['index'], name=entry['name'], category=entry['category'], file=source.relative_to(base).as_posix(), width=width, height=height, sha256=sha))
    if not manifest:
        return
    with (base / 'manifest.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(manifest[0]))
        writer.writeheader()
        writer.writerows(manifest)
    titlefont, labelfont = ImageFont.truetype(FONT, 34), ImageFont.truetype(FONT, 21)
    sheets = []
    for page, start in enumerate(range(0, len(cards), 8), 1):
        group = cards[start:start+8]
        sheet = Image.new('RGB', (1760, 1020), '#f8f4e9')
        draw = ImageDraw.Draw(sheet)
        draw.text((30, 24), f"{plan['label']} | {page:02d} | circular deck", font=titlefont, fill='#183d42')
        for cell, entry in enumerate(group):
            x, y = 20 + cell % 4 * 435, 85 + cell // 4 * 460
            with Image.open(entry['file']) as im:
                thumb = ImageOps.contain(im.convert('RGB'), (420, 420), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x+(420-thumb.width)//2, y))
            draw.text((x+210, y+436), f"{entry['index']:02d}  {entry['name']}", font=labelfont, fill='#183d42', anchor='mm')
        dest = base / 'contact-sheets' / f'{page:02d}.jpg'
        sheet.save(dest, quality=94, subsampling=0)
        sheets.append(dest)
    label = html.escape(plan['label'])
    figures = '\n'.join(f'<figure><a href="{m["file"]}" target="_blank"><img loading="lazy" src="{m["file"]}" alt="{html.escape(m["name"])}"></a><figcaption>{m["index"]:02d} · {html.escape(m["name"])}</figcaption></figure>' for m in manifest)
    gallery = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{label} — complete card gallery</title>
<style>body{{margin:0;background:#f8f4e9;color:#183d42;font-family:Georgia,serif}}header{{padding:36px 5vw 20px}}h1{{font-size:40px;margin:0 0 12px}}p{{line-height:1.5}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;padding:20px 4vw 50px}}figure{{margin:0}}img{{width:100%;display:block}}figcaption{{text-align:center;padding:12px}}a{{color:inherit}}@media print{{main{{grid-template-columns:repeat(3,1fr)}}figure{{break-inside:avoid}}}}</style>
<header><h1>{label}</h1><p>{len(cards)} of 79 designs · 78 tarot faces and one matching back.<br>Click any card to open its original image. These are artwork proofs; production cutting and bleed require the chosen printer's template.</p><p><a href="manifest.csv">Image manifest</a> · <a href="generation-plan.json">Prompts and card plan</a></p></header><main>{figures}</main></html>'''
    (base / 'index.html').write_text(gallery, encoding='utf-8')
    readme = f'''# {plan['label']}

Circular tarot artwork generated using the built-in image_gen tool, one image per card, from the approved concept reference.

Status: {len(cards)} of 79 designs saved. This set follows the traditional sequence: 22 Major Arcana, then Wands, Cups, Swords and Pentacles (Ace–Ten, Page, Knight, Queen, King), followed by the back.

- Open index.html for the complete local gallery.
- cards/ contains the untouched native PNG files.
- contact-sheets/ contains eight-card review sheets.
- manifest.csv records names, native pixel dimensions and SHA-256 checksums.
- generation-plan.json contains initial generation prompts and reference paths.
- generation-records/ records the latest generation or correction prompt and source path for each card.

These files are artwork proofs, not printer-specific production masters. Circular border positions, native resolution, lettering, icon counts and reversible back alignment need final production review before commercial printing. No upscaling or DPI tagging has been used to imply extra source detail.

Missing designs: {', '.join(missing) if missing else 'none'}.
'''
    (base / 'README.md').write_text(readme, encoding='utf-8')
    if not missing:
        output = ROOT / 'output' / 'round-decks'
        output.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output / f'{deck}.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
            for source in sorted(base.rglob('*')):
                if source.is_file() and 'rejected' not in source.parts:
                    archive.write(source, source.relative_to(base.parent))
    print(json.dumps({'deck': deck, 'saved': len(cards), 'missing': missing, 'sheets': len(sheets), 'gallery': str(base / 'index.html')}, ensure_ascii=False))


if __name__ == '__main__':
    for deck in DECKS:
        build(deck)
