# Tarot deck image reference library

This folder is organized for visual research and prototyping:

```text
tarot-decks/
  historical/<deck-name>/{front,back}/
  modern/<deck-name>/{front,back}/
```

The historical set favors scans and photographs hosted by Wikimedia Commons. The modern set uses product or publisher photography so the visual language of contemporary decks can be compared quickly. Modern product images are copyrighted reference material; check the rights before publishing, training, or shipping them with an app. Several modern source images show face-up and face-down cards together, so the same composite is placed in both subfolders for easy browsing.

## Deck notes

| Deck | Period / artist | Tradition and useful context | Typical uses | Rights note |
|---|---|---|---|---|
| Rider–Waite–Smith | 1909–1910; A. E. Waite / Pamela Colman Smith | Golden Dawn influenced; the most influential English-language illustrated tarot. Fully illustrated pip cards made narrative readings accessible. | General readings, teaching, symbolism reference, comparative deck study | Wikimedia Commons marks the scans public domain. |
| Tarot de Marseille (Jean Dodal) | 1701–1715; Jean Dodal workshop, Lyon | Early French woodcut tradition with bold linework, pips, and French titles. A key ancestor of modern Marseille practice. | Historical study, Marseille-style reading, iconographic comparison | Wikimedia Commons PD-Art/public-domain source; jurisdiction rules can differ. |
| Sola Busca | c. 1491; unknown North Italian workshop | Earliest surviving complete illustrated tarot; Renaissance scenes and named figures strongly influenced later illustrated minors. | Renaissance symbolism, art history, comparative iconography | Wikimedia Commons public-domain reproductions. |
| Tarot Nouveau (Grimaud) | 1898; Grimaud, France | French tarot nouveau pattern with scenic courts and ornate trumps; bridges gaming decks and divinatory tarot. | Playing-card history, European tarot comparison, visual motif research | Wikimedia Commons public-domain/PD-Art source. |
| Piedmontese Tarot (Solesio) | 1865; Solesio, Piedmont | Italian-suited regional pattern with restrained linework and traditional trump sequence. | Regional history, Marseille family comparison, print-style reference | Wikimedia Commons public-domain/PD-Art source. |
| Gassmann Swiss Tarot de Marseille | c. 1840–1870; François Gassmann, Geneva | Hand-colored stencil/woodblock Type II Marseille with square corners and distinctive patterned backs. | Color restoration studies, antique reproduction reference | Merchant-hosted reference photos; verify rights before reuse. |
| J. Müller / Schaffhausen Tarot de Marseille | c. 1900; J. Müller & Cie. | Late nineteenth/early twentieth-century Swiss-Marseille continuity; useful for studying aging, borders, and backs. | Print history, condition reference, deck-back comparison | Merchant-hosted reference photo; verify rights before reuse. |
| Thoth Tarot | Designed 1938–43, first published 1969; Aleister Crowley / Frieda Harris | Hermetic, astrological, Qabalistic, and Egyptian symbolism rendered in Harris's dense abstract color language. | Occult study, ceremonial symbolism, advanced comparative readings | Product photography; artwork remains copyrighted. |
| Modern Witch Tarot | 2019–20; Lisa Sterle | Inclusive, fashion-forward Rider–Waite reinterpretation with contemporary people and scenes. | Beginner teaching, representation studies, modern visual language | Product photography; artwork remains copyrighted. |
| The Wild Unknown | 2012; Kim Krans | Minimalist animal and botanical linework with selective color; highly influential indie-modern aesthetic. | Intuitive readings, animal symbolism, minimalist design study | Product photography; artwork remains copyrighted. |
| The Light Seer's Tarot | 2018–19; Chris-Anne | Boho, psychologically oriented Rider–Waite reinterpretation balancing light and shadow. | Self-reflection, journaling, contemporary archetype study | Product photography; artwork remains copyrighted. |
| Mystic Mondays | 2018; Grace Duong | Neon gradients, geometric forms, and approachable keywords emphasize immediacy and optimism. | Beginner readings, color/shape studies, social content | Product photography; artwork remains copyrighted. |
| Everyday Witch Tarot | 2017; Deborah Blake / Elisabeth Alba | Playful witchcraft world built on Rider–Waite structure, with cats, brooms, and accessible scenes. | Beginner practice, positive guidance, witchcraft-themed readings | Product photography; artwork remains copyrighted. |
| Golden Thread Tarot | 2015–19; Tina Gong / Labyrinthos | Minimal black-and-gold system designed for digital learning; paired with a companion app. | Digital readings, study decks, interface and icon research | Product photography; artwork remains copyrighted. |

## Sources

Historical source pages:

- [RWS Star](https://commons.wikimedia.org/wiki/File:RWS_Tarot_17_Star.jpg), [RWS Hanged Man](https://commons.wikimedia.org/wiki/File:The_Hanged_Man_(Rider-Waite_Smith_tarot_deck).png), [RWS Roses and Lilies back](https://commons.wikimedia.org/wiki/File:Waite%E2%80%93Smith_Tarot_Roses_and_Lilies.jpg)
- [Jean Dodal L'Hermite](https://commons.wikimedia.org/wiki/File:L%27Hermite_-_Tarot_de_Marseille.png), [Jean Dodal reverse](https://commons.wikimedia.org/wiki/File:Jean_Dodal_Tarot_reverse.jpg)
- [Sola Busca card 64](https://commons.wikimedia.org/wiki/File:Sola_Busca_tarot_card_64.jpg)
- [Tarot Nouveau Grimaud files](https://commons.wikimedia.org/wiki/Category:Tarot_nouveau)
- [Piedmontese Solesio files](https://commons.wikimedia.org/wiki/Category:Piedmontese_tarot_deck)

Modern source pages:

- [Modern Witch Tarot product image](https://pentacle.jp/?pid=155286424)
- [The Wild Unknown product image](https://pentacle.jp/?pid=128894578)
- [Thoth Tarot product image](https://pentacle.jp/?pid=61423445)
- [The Light Seer's Tarot product image](https://pentacle.jp/?pid=181691180)
- [Mystic Mondays product image](https://curiouscauldron.com.au/products/mystic-mondays-tarot)
- [Everyday Witch Tarot product image](https://www.edankest.com/everyday-witch-tarot-deck-with-instruction-book.html)
- [Golden Thread Tarot product image](https://www.goodreads.com/book/show/48747230-golden-thread-tarot)

## Extending this for new decks

The gallery and the reading engine are intentionally separate. Deck entries describe artwork, provenance, and rights; the reading engine uses a standard 78-card core with suit and rank meanings. To add an original deck, add its metadata and front/back assets to `app.js` and the matching folders here. If a deck needs its own interpretive voice, add a deck-specific meaning map keyed by the same card names (`The Fool`, `Ace of Wands`, and so on) rather than changing the draw or spread logic. This keeps historical references, original artwork, and future app content in one browsable system.
