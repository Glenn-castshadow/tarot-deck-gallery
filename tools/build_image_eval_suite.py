"""Freeze a small tarot challenge suite from the project's established art direction."""
import json
from pathlib import Path

from plan_companion_decks import BACKS, SCENES, STYLES
from build_ishtar_print import CARDS

ROOT = Path(__file__).resolve().parents[1]


def main():
    dark = json.loads((ROOT / 'deck-art/expressive-figures/generation-records/03-dark-v2.json').read_text())
    styles = {**STYLES, 'expressive-figures': dark['prompt'].split('\nCard:')[0]}
    references = {
        'light-minimal': 'deck-art/light-minimal/proofs/v2/01-the-magician.png',
        'arts-and-crafts': 'deck-art/arts-and-crafts/proofs/01-the-magician.png',
        'expressive-figures': 'deck-art/expressive-figures/raw-fronts/01-the-magician-dark-v2.png',
    }
    specs = [
        ('light-eight-wands', 'light-minimal', 29, ['Exactly eight separate flying wooden wands; no extra sticks.', 'Airy composition with visibly saturated cerulean, coral and lavender.']),
        ('craft-nine-wands', 'arts-and-crafts', 30, ['Exactly nine wands: eight in the fence and one held.', 'Coherent botanical border and a blank bottom cartouche.']),
        ('craft-ten-swords', 'arts-and-crafts', 59, ['Exactly ten distinct swords, each traceable from hilt to blade.', 'Symbolic clothed figure; no wounds or gore; blank cartouche.']),
        ('dark-star', 'expressive-figures', 17, ['Exactly one large eight-pointed star and seven smaller stars.', 'Two pitchers pouring separately onto land and into water.', 'Dark dragged paint and distorted features; stars and vessels remain readable.']),
        ('dark-seven-swords', 'expressive-figures', 56, ['Exactly five carried swords and two planted swords; no ambiguous overlapping duplicates.', 'Deep black, bruised violet and scraped paint; subject and swords remain legible.']),
        ('craft-reversible-back', 'arts-and-crafts', 78, ['Design looks the same rotated 180 degrees, including corners and geometry.', 'Botanical pattern, compasses and set squares; no text, upright-only emblem or face.']),
    ]
    cases = []
    for case_id, deck, index, requirements in specs:
        name = CARDS[index][1] if index < 78 else 'Card back'
        prompt = (styles[deck] + '\nCard: ' + name.upper() + '.\nScene: ' + SCENES[index]) if index < 78 else BACKS[deck]
        cases.append(dict(id=case_id, deck=deck, name=name, mode='generate',
                          reference=references[deck], prompt=prompt, requirements=requirements))
    cases.append(dict(
        id='dark-eight-wands-edit', deck='expressive-figures', name='Eight of Wands — precise edit', mode='edit',
        reference='deck-art/expressive-figures/raw-fronts/29-eight-of-wands-dark-v3.png',
        prompt='Use case: precise-object-edit. The attached image is the EDIT TARGET. Correct it to show exactly EIGHT distinct flying wooden wands. Add only the missing wand. Preserve the existing seven wands, their spacing, dark background, dragged paint texture, palette and composition. No lettering, border, new figures or other objects. Return one full portrait 3:5 artwork at highest available resolution.',
        requirements=['Exactly eight separate wands after the edit.', 'Existing seven wands and the surrounding composition preserved; only one new wand added.']))
    suite = dict(version=1, title='Tarot image model trials', repeats=3, max_attempts=2,
                 technical=dict(min_width=950, min_height=1500, aspect_min=.58, aspect_max=.62),
                 quality_dimensions=['style', 'composition', 'detail'], minimum_quality=3,
                 cases=cases)
    dest = ROOT / 'evals/tarot-images/suite.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(suite, indent=2) + '\n', encoding='utf-8')
    print(dest)


if __name__ == '__main__':
    main()
