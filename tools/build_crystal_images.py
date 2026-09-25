"""Build the crystal catalog's web images from local generated PNG masters.

The masters live in crystal-art/raw/ and are intentionally not versioned. The prompt
manifest and the optimized WebP assets are versioned with the site.
"""

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "crystal-art" / "prompts.json"
RAW = ROOT / "crystal-art" / "raw"
ASSETS = ROOT / "assets" / "crystals"


def build():
    manifest = json.loads(PROMPTS.read_text(encoding="utf-8"))
    slugs = list(manifest["appearance"])
    if len(slugs) != 100 or len(slugs) != len(set(slugs)):
        raise ValueError("The prompt manifest must contain exactly 100 unique stones")

    missing = [slug for slug in slugs if not (RAW / f"{slug}.png").is_file()]
    if missing:
        raise FileNotFoundError(f"Missing {len(missing)} PNG masters: {', '.join(missing)}")

    (ASSETS / "thumbs").mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    for slug in slugs:
        with Image.open(RAW / f"{slug}.png") as source:
            source = ImageOps.exif_transpose(source)
            if source.width != source.height or source.width < 800:
                raise ValueError(f"{slug}: expected a square source at least 800 px wide")
            source = source.convert("RGB")
            for width, folder in ((800, ASSETS), (320, ASSETS / "thumbs")):
                target = folder / f"{slug}.webp"
                source.resize((width, width), Image.Resampling.LANCZOS).save(
                    target, "WEBP", quality=82, method=6
                )
                total_bytes += target.stat().st_size

    print(f"Built {len(slugs)} full images and {len(slugs)} thumbnails ({total_bytes / 1048576:.1f} MiB)")


if __name__ == "__main__":
    build()
