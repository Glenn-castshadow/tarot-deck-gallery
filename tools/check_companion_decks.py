"""Verify complete companion-deck inventories and all production derivatives."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image
from build_companion_decks import DECKS, H, PPI, ROOT, W


def main():
    hashes = set()
    for deck, (label, asset_folder, _, _) in DECKS.items():
        base = ROOT / "deck-art" / deck
        plan = json.loads((base / "generation-plan.json").read_text(encoding="utf-8"))["cards"]
        assert [row["index"] for row in plan] == list(range(79)), f"{deck}: incomplete or repeated card indices"
        assert Counter(row["category"] for row in plan) == {"major": 22, "wands": 14, "cups": 14, "swords": 14, "pentacles": 14, "back": 1}
        with (base / "manifest.csv").open(encoding="utf-8", newline="") as f:
            manifest = list(csv.DictReader(f))
        assert len(manifest) == 79, f"{deck}: incomplete export manifest"
        for entry, row in zip(plan, manifest):
            raw = ROOT / entry["file"]
            digest = hashlib.sha256(raw.read_bytes()).hexdigest()
            assert digest not in hashes, f"Duplicate source artwork: {raw}"
            hashes.add(digest)
            with Image.open(raw) as im:
                im.load()
                assert im.width >= 950 and im.height >= 1500, f"Low source resolution: {raw}"
                # Older decks came from the built-in tool at about 0.60; API decks are 1024x1536, 0.667.
                assert .58 <= im.width / im.height <= .68, f"Unexpected source proportions: {raw}"
                assert (im.width, im.height) == (int(row["native_width"]), int(row["native_height"]))
            assert row["name"] == entry["name"]
            with Image.open(base / row["print_file"]) as im:
                im.load()
                assert im.size == (W, H)
                assert all(abs(value - PPI) < .1 for value in im.info["dpi"])
            stem = f'{entry["index"]:02d}' if entry["index"] < 78 else "back"
            web = ROOT / "assets" / asset_folder
            for path in (web / ("cards" if stem != "back" else "") / f"{stem}.jpg", web / "large" / f"{stem}.jpg"):
                with Image.open(path) as im:
                    im.load()
                    assert im.width >= 350 and im.height >= 580, f"Invalid web image: {path}"
        print(f"PASS {label}: 78 unique fronts + back; complete suits; 79 print canvases; 158 valid web images; source resolution recorded.")
    print(f"PASS {len(hashes)} distinct original images across all companion decks.")


if __name__ == "__main__":
    main()
