"""Prepare a resume queue from the selected dark Francis Bacon-inspired plan.

The checked-in plan is authoritative: never replace reviewed revisions with
the earlier warm studies. This script prepares prompts; it does not call an API.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    base = ROOT / "deck-art" / "expressive-figures"
    plan = json.loads((base / "generation-plan.json").read_text(encoding="utf-8"))["cards"]
    jobs = [entry for entry in plan if not (ROOT / entry["file"]).exists()]
    (base / "generation-queue.json").write_text(json.dumps(jobs, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(jobs)} remaining illustrations; selected dark revisions preserved.")

if __name__ == "__main__":
    main()
