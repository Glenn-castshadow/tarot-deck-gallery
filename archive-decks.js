/* Reference gallery metadata. Original reading decks are configured separately in tarot.js. */
const ArchiveDecks = [
  {
    "id": "rws",
    "category": "historical",
    "name": "Rider–Waite–Smith",
    "period": "1909–1910",
    "artist": "A. E. Waite / Pamela Colman Smith",
    "tradition": "Golden Dawn influenced illustrated English tarot",
    "uses": "General readings, teaching, symbolism reference, comparative deck study",
    "note": "The fully illustrated pip cards made narrative readings accessible and established the visual grammar most English-language readers recognize today.",
    "front": "/tarot-decks/historical/rider-waite-smith/front/17-the-star.jpg",
    "back": "/tarot-decks/historical/rider-waite-smith/back/roses-and-lilies.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:RWS_Tarot_17_Star.jpg",
    "rights": "Wikimedia Commons marks these scans public domain."
  },
  {
    "id": "dodal",
    "category": "historical",
    "name": "Tarot de Marseille",
    "period": "1701–1715",
    "artist": "Jean Dodal workshop",
    "tradition": "French woodcut Marseille; pip-focused",
    "uses": "Historical study, Marseille-style reading, iconographic comparison",
    "note": "Early French woodcut linework, French titles, and pip cards make this a useful ancestor for studying how Marseille reading differs from illustrated systems.",
    "front": "/tarot-decks/historical/tarot-de-marseille/front/09-l-hermite.png",
    "back": "/tarot-decks/historical/tarot-de-marseille/back/jean-dodal-reverse.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Jean_Dodal_Tarot_reverse.jpg",
    "rights": "Wikimedia Commons PD-Art/public-domain source; jurisdiction rules can differ."
  },
  {
    "id": "sola",
    "category": "historical",
    "name": "Sola Busca",
    "period": "c. 1491",
    "artist": "Unknown North Italian workshop",
    "tradition": "Renaissance illustrated tarot; named scenes and figures",
    "uses": "Renaissance symbolism, art history, comparative iconography",
    "note": "The earliest surviving complete illustrated tarot, with named figures and narrative minors that likely influenced later illustrated decks.",
    "front": "/tarot-decks/historical/sola-busca/front/card-64.jpg",
    "back": "/tarot-decks/historical/sola-busca/back/deck-detail-composite.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Sola_Busca_tarot_card_64.jpg",
    "rights": "Wikimedia Commons public-domain reproductions."
  },
  {
    "id": "nouveau",
    "category": "historical",
    "name": "Tarot Nouveau",
    "period": "1898",
    "artist": "Grimaud, France",
    "tradition": "French tarot nouveau pattern; scenic courts",
    "uses": "Playing-card history, European tarot comparison, visual motif research",
    "note": "A bridge between gaming decks and divinatory tarot, with scenic courts and an ornate late nineteenth-century print language.",
    "front": "/tarot-decks/historical/tarot-nouveau/front/14-trump.jpg",
    "back": "/tarot-decks/historical/tarot-nouveau/back/card-back.jpg",
    "source": "https://commons.wikimedia.org/wiki/Category:Tarot_nouveau",
    "rights": "Wikimedia Commons public-domain/PD-Art source."
  },
  {
    "id": "piedmontese",
    "category": "historical",
    "name": "Piedmontese Tarot",
    "period": "1865",
    "artist": "Solesio, Piedmont",
    "tradition": "Italian-suited regional tarot",
    "uses": "Regional history, Marseille family comparison, print-style reference",
    "note": "A regional pattern with restrained linework and a traditional trump sequence, useful for tracing how tarot changed across borders.",
    "front": "/tarot-decks/historical/piedmontese-solesio/front/20-judgement.jpg",
    "back": "/tarot-decks/historical/piedmontese-solesio/back/card-back.jpg",
    "source": "https://commons.wikimedia.org/wiki/Category:Piedmontese_tarot_deck",
    "rights": "Wikimedia Commons public-domain/PD-Art source."
  },
  {
    "id": "gassmann",
    "category": "historical",
    "name": "Gassmann Swiss Marseille",
    "period": "c. 1840–1870",
    "artist": "François Gassmann, Geneva",
    "tradition": "Swiss hand-colored Type II Marseille",
    "uses": "Color restoration studies, antique reproduction reference",
    "note": "Hand-colored woodblock printing, square corners, and patterned backs show how physical production shaped the deck's character.",
    "front": "/tarot-decks/historical/gassmann-swiss/front/major-arcana.jpg",
    "back": "/tarot-decks/historical/gassmann-swiss/back/deck-back-detail.jpg",
    "source": "https://mccloskys.com/products/c-1870-gassmann-swiss-tarot-de-marseille-complete",
    "rights": "Merchant-hosted reference photography; verify rights before reuse."
  },
  {
    "id": "muller",
    "category": "historical",
    "name": "J. Müller Schaffhausen",
    "period": "c. 1900",
    "artist": "J. Müller & Cie.",
    "tradition": "Swiss-Marseille continuity",
    "uses": "Print history, condition reference, deck-back comparison",
    "note": "A late nineteenth/early twentieth-century continuation of Marseille traditions, especially useful for studying borders, wear, and backs.",
    "front": "/tarot-decks/historical/schaffhausen-muller/front/major-arcana.jpg",
    "back": "/tarot-decks/historical/schaffhausen-muller/back/deck-back-detail.jpg",
    "source": "https://mccloskys.com/products/c-1900-tarot-de-marseilles-schaffhausen-j-muller-ce-1",
    "rights": "Merchant-hosted reference photography; verify rights before reuse."
  },
  {
    "id": "thoth",
    "category": "modern",
    "name": "Thoth Tarot",
    "period": "1938–1969",
    "artist": "Aleister Crowley / Frieda Harris",
    "tradition": "Hermetic, astrological, Qabalistic, Egyptian",
    "uses": "Occult study, ceremonial symbolism, advanced readings",
    "note": "Frieda Harris's dense, abstract color language turns Hermetic and astrological correspondences into a visual system built for close study.",
    "front": "/tarot-decks/modern/thoth/front/front-and-back-product.jpg",
    "back": "/tarot-decks/modern/thoth/back/front-and-back-product.jpg",
    "source": "https://pentacle.jp/?pid=61423445",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "modern-witch",
    "category": "modern",
    "name": "Modern Witch Tarot",
    "period": "2019–2020",
    "artist": "Lisa Sterle",
    "tradition": "Inclusive contemporary Rider–Waite reinterpretation",
    "uses": "Beginner teaching, representation studies, modern visual language",
    "note": "Fashion-forward scenes and inclusive casting translate familiar Rider–Waite symbolism into contemporary life.",
    "front": "/tarot-decks/modern/modern-witch/front/front-and-back-product.jpg",
    "back": "/tarot-decks/modern/modern-witch/back/front-and-back-product.jpg",
    "source": "https://pentacle.jp/?pid=155286424",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "wild-unknown",
    "category": "modern",
    "name": "The Wild Unknown",
    "period": "2012",
    "artist": "Kim Krans",
    "tradition": "Minimal animal and botanical linework",
    "uses": "Intuitive readings, animal symbolism, minimalist design",
    "note": "Minimal linework and selective color made this indie deck's animal-centered visual language especially influential in modern tarot design.",
    "front": "/tarot-decks/modern/wild-unknown/front/front-and-back-product.jpg",
    "back": "/tarot-decks/modern/wild-unknown/back/front-and-back-product.jpg",
    "source": "https://pentacle.jp/?pid=128894578",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "light-seers",
    "category": "modern",
    "name": "The Light Seer's Tarot",
    "period": "2018–2019",
    "artist": "Chris-Anne",
    "tradition": "Boho psychological Rider–Waite reinterpretation",
    "uses": "Self-reflection, journaling, contemporary archetype study",
    "note": "A psychologically oriented deck that pairs a light-and-shadow theme with saturated color and boho visual cues.",
    "front": "/tarot-decks/modern/light-seers/front/front-and-back-product.jpg",
    "back": "/tarot-decks/modern/light-seers/back/front-and-back-product.jpg",
    "source": "https://pentacle.jp/?pid=181691180",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "mystic-mondays",
    "category": "modern",
    "name": "Mystic Mondays",
    "period": "2018",
    "artist": "Grace Duong",
    "tradition": "Neon gradients and geometric modern tarot",
    "uses": "Beginner readings, color and shape studies, social content",
    "note": "Neon gradients, bold geometry, and an optimistic tone make the system immediately legible in digital and social contexts.",
    "front": "/tarot-decks/modern/mystic-mondays/front/front-and-back-product.png",
    "back": "/tarot-decks/modern/mystic-mondays/back/front-and-back-product.png",
    "source": "https://curiouscauldron.com.au/products/mystic-mondays-tarot",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "everyday-witch",
    "category": "modern",
    "name": "Everyday Witch Tarot",
    "period": "2017",
    "artist": "Deborah Blake / Elisabeth Alba",
    "tradition": "Playful witchcraft Rider–Waite structure",
    "uses": "Beginner practice, positive guidance, witchcraft-themed readings",
    "note": "Cats, brooms, and approachable scenes create a playful witchcraft world while preserving a familiar Rider–Waite structure.",
    "front": "/tarot-decks/modern/everyday-witch/front/front-and-back-product.jpg",
    "back": "/tarot-decks/modern/everyday-witch/back/front-and-back-product.jpg",
    "source": "https://www.edankest.com/everyday-witch-tarot-deck-with-instruction-book.html",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "golden-thread",
    "category": "modern",
    "name": "Golden Thread Tarot",
    "period": "2015–2019",
    "artist": "Tina Gong / Labyrinthos",
    "tradition": "Minimal black-and-gold digital-first system",
    "uses": "Digital readings, study deck, interface and icon research",
    "note": "Designed alongside a companion app, its reduced black-and-gold language makes it a useful reference for digital tarot experiences.",
    "front": "/tarot-decks/modern/golden-thread/front/front-and-back-product.jpg",
    "back": "/tarot-decks/modern/golden-thread/back/front-and-back-product.jpg",
    "source": "https://www.goodreads.com/book/show/48747230-golden-thread-tarot",
    "rights": "Product photography; artwork remains copyrighted."
  },
  {
    "id": "visconti-restored",
    "category": "historical",
    "name": "Visconti Tarot",
    "period": "15th-century origins",
    "artist": "Visconti workshop tradition / restoration by A. A. Atanassov",
    "tradition": "Italian Renaissance; gold-ground courtly imagery",
    "uses": "Renaissance iconography, allegory, restoration and border design comparison",
    "note": "The Visconti-Sforza cards grew out of aristocratic card play in fifteenth-century Italy. This example is Lo Scarabeo’s restored, gold-foil edition, with artwork restored by Atanassov. Its ornate reverse belongs to the modern edition and should not be read as a documented fifteenth-century back.",
    "cardCount": 78,
    "edition": "Lo Scarabeo restored edition; modern printing after historical artwork",
    "frontCaption": "Justice · restored edition",
    "backCaption": "Reverse of the modern restored edition",
    "front": "/tarot-decks/historical/visconti-restored/front/front-reference.jpg",
    "back": "/tarot-decks/historical/visconti-restored/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/i-tarocchi-dei-visconti",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/i-tarocchi-dei-visconti"
      },
      {
        "label": "Historical context",
        "url": "https://www.themorgan.org/collection/tarot-cards"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "minchiate-fiorentine",
    "category": "historical",
    "name": "Minchiate Fiorentine",
    "period": "c. 1860",
    "artist": "Florentine print tradition; historical maker unspecified",
    "tradition": "Florentine Minchiate; expanded 97-card game",
    "uses": "Comparing tarot variants, trump sequences, pip design and historical card games",
    "note": "A facsimile of a Tuscan deck dated around 1860 by its publisher. Minchiate’s 97-card structure makes it an especially useful counterpoint to the familiar 78-card tarot. Compare the numbered allegories and patterned reverse with the Marseille examples already in the archive.",
    "cardCount": 97,
    "edition": "Lo Scarabeo Anima Antiqua facsimile; notes by Giordano Berti",
    "frontCaption": "Temperance · trump VI",
    "backCaption": "Patterned reverse · facsimile edition",
    "front": "/tarot-decks/historical/minchiate-fiorentine/front/front-reference.jpg",
    "back": "/tarot-decks/historical/minchiate-fiorentine/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/minchiate-fiorentine-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/minchiate-fiorentine-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "etteilla",
    "category": "historical",
    "name": "Etteilla Tarot",
    "period": "c. 1880 printing",
    "artist": "Etteilla system of Jean-Baptiste Alliette; later Parisian printing",
    "tradition": "French occult tarot; Etteilla’s distinctive ordering and keywords",
    "uses": "Divinatory history, alternative numbering, upright/reversed keyword comparison",
    "note": "This facsimile reproduces a Paris printing from around 1880, following the tarot system associated with Jean-Baptiste Alliette, known as Etteilla. Printed meanings at both ends of the cards make orientation part of their visual design. It provides a different historical route into divinatory tarot from the Marseille and Waite-Smith traditions.",
    "cardCount": 78,
    "edition": "Lo Scarabeo Anima Antiqua facsimile; notes by Giordano Berti",
    "frontCaption": "La Justice · Etteilla numbering",
    "backCaption": "Small repeating pattern · facsimile reverse",
    "front": "/tarot-decks/historical/etteilla/front/front-reference.jpg",
    "back": "/tarot-decks/historical/etteilla/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/tarot-etteilla-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/tarot-etteilla-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "vacchetta-naibi",
    "category": "historical",
    "name": "Naibi di Giovanni Vacchetta",
    "period": "Late 19th century",
    "artist": "Giovanni Vacchetta",
    "tradition": "Italian decorative illustration; illustrated minor cards",
    "uses": "Line drawing, ornament, illustrated-pip history and Arts & Crafts comparisons",
    "note": "Vacchetta illustrated the minor cards before the Waite-Smith deck, approaching tarot as a decorative and artistic project. The restrained drawing and dense ornament offer a useful comparison with our Arts & Crafts direction. These images show the publisher’s facsimile edition, including its matching reverse.",
    "cardCount": 78,
    "edition": "Lo Scarabeo Anima Antiqua facsimile",
    "frontCaption": "La Luna · XVIII",
    "backCaption": "Ornamental reverse · facsimile edition",
    "front": "/tarot-decks/historical/vacchetta-naibi/front/front-reference.jpg",
    "back": "/tarot-decks/historical/vacchetta-naibi/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/naibi-di-giovanni-vacchetta-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/naibi-di-giovanni-vacchetta-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "steinberger",
    "category": "historical",
    "name": "Steinberger Tarock",
    "period": "c. 1820",
    "artist": "Steinberger, Frankfurt",
    "tradition": "German tarock; mythological scenes and double-ended figures",
    "uses": "Tarock game history, reversible composition, engraving and stencil-color study",
    "note": "The publisher dates this Frankfurt design to around 1820 and describes metal engraving followed by stencil coloring. Mythological scenes replace the familiar English tarot narratives, while double-ended compositions emphasize use at the card table. The reproduction is listed as a 54-card edition in the publisher’s specifications.",
    "cardCount": 54,
    "edition": "Lo Scarabeo Anima Antiqua facsimile; 54 cards per publisher specifications",
    "frontCaption": "Trump III · double-ended scene",
    "backCaption": "Fine repeating pattern · facsimile reverse",
    "front": "/tarot-decks/historical/steinberger/front/front-reference.jpg",
    "back": "/tarot-decks/historical/steinberger/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/tarot-steinberger-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/tarot-steinberger-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "besancon-gaudais",
    "category": "historical",
    "name": "Besançon Tarot — Gaudais",
    "period": "c. 1870",
    "artist": "Gaudais, Paris",
    "tradition": "Besançon pattern; diagonally mirrored figures",
    "uses": "Regional tarot comparison, symmetry, print design and court-card composition",
    "note": "A Parisian Besançon-pattern deck distinguished by a diagonal bar across many trumps and court cards. The opposing figures make the mirrored construction particularly clear. The publisher dates the reproduced printing to around 1870; the red patterned back is shown from the same facsimile edition.",
    "cardCount": 78,
    "edition": "Lo Scarabeo Anima Antiqua facsimile; notes by Giordano Berti",
    "frontCaption": "Trump 5 · diagonal mirror design",
    "backCaption": "Red patterned reverse · facsimile edition",
    "front": "/tarot-decks/historical/besancon-gaudais/front/front-reference.jpg",
    "back": "/tarot-decks/historical/besancon-gaudais/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/tarot-de-besancon-gaudais-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/tarot-de-besancon-gaudais-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "recchi-marseille",
    "category": "historical",
    "name": "Fratelli Recchi Marseille",
    "period": "1830",
    "artist": "Fratelli Recchi, Oneglia / Turin",
    "tradition": "Northwestern Italian Marseille pattern",
    "uses": "Regional print workshops, Marseille iconography, maker marks and color comparison",
    "note": "The Recchi brothers’ 1830 printing brings a northwestern Italian voice to the Marseille family. Its maker names, narrow frames and limited palette are useful details to compare with Dodal, Gassmann and the Piedmontese deck. These are photographs of the modern facsimile, rather than scans of an original surviving pack.",
    "cardCount": 78,
    "edition": "Lo Scarabeo Anima Antiqua facsimile",
    "frontCaption": "L’Impératrice",
    "backCaption": "Blue geometric reverse · facsimile edition",
    "front": "/tarot-decks/historical/recchi-marseille/front/front-reference.jpg",
    "back": "/tarot-decks/historical/recchi-marseille/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/tarocchi-marsigliesi-fratelli-recchi-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/tarocchi-marsigliesi-fratelli-recchi-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "mitelli-tarocchino",
    "category": "historical",
    "name": "Mitelli Tarocchino",
    "period": "17th century",
    "artist": "Giuseppe Maria Mitelli, Bologna",
    "tradition": "Bolognese tarocchino; 62-card copper-engraved design",
    "uses": "Tarocchino history, figure drawing, allegory and alternative deck structures",
    "note": "Mitelli’s copper-engraved Bolognese deck belongs to the shorter, 62-card tarocchino tradition. Tall figures and spacious compositions make it a strong visual contrast with compact Marseille woodcuts. The publisher’s reproduction is presented here with its printed reverse, which is specific to the facsimile edition shown.",
    "cardCount": 62,
    "edition": "Lo Scarabeo Anima Antiqua facsimile",
    "frontCaption": "Allegorical figure · Tarocchino facsimile",
    "backCaption": "Printed reverse of the facsimile edition",
    "front": "/tarot-decks/historical/mitelli-tarocchino/front/front-reference.jpg",
    "back": "/tarot-decks/historical/mitelli-tarocchino/back/back-reference.jpg",
    "source": "https://www.loscarabeo.com/products/tarocchino-mitelli-edizione-limitata",
    "imageCredit": "Publisher preview images: Lo Scarabeo. Artwork credited above.",
    "rights": "Copyrighted Lo Scarabeo edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.loscarabeo.com/products/tarocchino-mitelli-edizione-limitata"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "aquarian",
    "category": "modern",
    "name": "Aquarian Tarot",
    "period": "1970",
    "artist": "David Palladini",
    "tradition": "Art Deco revival; Waite-Smith-related symbolism",
    "uses": "Modern tarot history, restrained palettes, portrait framing and beginner comparison",
    "note": "First introduced in 1970, Palladini’s deck recasts older tarot motifs through an Art Deco visual vocabulary. Compare its close framing and pale spaces with the warmer, borderless Morgan–Greer deck. The blue-and-white reverse shown here is from the current publisher’s edition.",
    "cardCount": 78,
    "edition": "U.S. Games Systems edition",
    "frontCaption": "The Magician · I",
    "backCaption": "Blue-and-white patterned reverse",
    "front": "/tarot-decks/modern/aquarian/front/front-reference.webp",
    "back": "/tarot-decks/modern/aquarian/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/tarot-and-inspiration/aquarian-tarot-deck.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/tarot-and-inspiration/aquarian-tarot-deck.html"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "morgan-greer",
    "category": "modern",
    "name": "Morgan–Greer Tarot",
    "period": "1979",
    "artist": "Bill F. Greer / Lloyd Morgan",
    "tradition": "Borderless Waite-Smith reinterpretation; saturated color",
    "uses": "Color-led reading, close-up figure design and 1970s tarot comparison",
    "note": "Greer’s borderless scenes use close framing and saturated color to draw attention to gesture and expression. The publisher identifies Waite and Paul Foster Case as influences on the system and its color choices. Its star-patterned reverse offers a simple contrast to the dense pictorial fronts.",
    "cardCount": 78,
    "edition": "U.S. Games Systems edition",
    "frontCaption": "The Magician · I",
    "backCaption": "White stars on blue",
    "front": "/tarot-decks/modern/morgan-greer/front/front-reference.webp",
    "back": "/tarot-decks/modern/morgan-greer/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/tarot-and-inspiration/Tarot-Decks/morgan-greer_tarot_deck.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/tarot-and-inspiration/Tarot-Decks/morgan-greer_tarot_deck.html"
      },
      {
        "label": "Historical context",
        "url": "https://tarotgarden.com/morgan-greer-tarot/"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "deviant-moon",
    "category": "modern",
    "name": "Deviant Moon Tarot",
    "period": "21st century",
    "artist": "Patrick Valenza",
    "tradition": "Surreal, moon-faced characters; photographic textures",
    "uses": "Surreal narrative, dream journaling, character design and darker visual references",
    "note": "Valenza builds strange theatrical figures from manipulated photographs, including textures drawn from old tombstones and abandoned architecture. The moon-faced cast and symmetrical lunar reverse give the deck a coherent visual world. The bordered cards shown here belong to the original design, also packaged in the Premier Edition.",
    "cardCount": 78,
    "edition": "U.S. Games Systems bordered design",
    "frontCaption": "The Magician · bordered edition",
    "backCaption": "Symmetrical lunar reverse",
    "front": "/tarot-decks/modern/deviant-moon/front/front-reference.webp",
    "back": "/tarot-decks/modern/deviant-moon/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/deviant-moon-tarot-deck-premier-edition.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/deviant-moon-tarot-deck-premier-edition.html"
      },
      {
        "label": "Additional source",
        "url": "https://www.usgamesinc.com/tarot-and-inspiration/deviant-moon-tarot-deck.html"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "ethereal-visions",
    "category": "modern",
    "name": "Ethereal Visions Tarot",
    "period": "21st century",
    "artist": "Matt Hughes",
    "tradition": "Art Nouveau illustration; gold foil and botanical frames",
    "uses": "Decorative illustration, foil planning, framing and expanded-major comparison",
    "note": "Hughes combines hand-drawn Art Nouveau ornament with gold foil. This edition contains 80 cards, adding two Major Arcana to the usual structure. The reverse is visible in the publisher’s product photograph; that image is deliberately labelled as a layout rather than an isolated back scan.",
    "cardCount": 80,
    "edition": "U.S. Games Systems Illuminated Tarot; expanded guidebook edition pictured",
    "frontCaption": "The Magician · I",
    "backCaption": "Card back shown in publisher layout",
    "backLabel": "Back in layout",
    "front": "/tarot-decks/modern/ethereal-visions/front/front-reference.webp",
    "back": "/tarot-decks/modern/ethereal-visions/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/tarot-and-inspiration/ethereal-tarot.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/tarot-and-inspiration/ethereal-tarot.html"
      }
    ]
  },
  {
    "id": "mystical-moments",
    "category": "modern",
    "name": "Tarot of Mystical Moments",
    "period": "21st century",
    "artist": "Catrin Welz-Stein",
    "tradition": "Surreal digital collage; feminine reinterpretations",
    "uses": "Collage composition, dreamlike symbolism, journaling and alternate court comparison",
    "note": "Welz-Stein’s collage scenes combine botanical forms, unexpected scale and a feminine perspective on familiar tarot meanings. The 83-card edition includes alternative female versions of the Emperor and four Kings. Compare its borderless fronts with the restrained, symmetrical pattern on the reverse.",
    "cardCount": 83,
    "edition": "U.S. Games Systems full-size edition; five alternative cards included",
    "frontCaption": "The Fool · 0",
    "backCaption": "Pale symmetrical patterned reverse",
    "front": "/tarot-decks/modern/mystical-moments/front/front-reference.webp",
    "back": "/tarot-decks/modern/mystical-moments/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/tarot-and-inspiration/Tarot-Decks/tarot-of-mystical-moments.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/tarot-and-inspiration/Tarot-Decks/tarot-of-mystical-moments.html"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "fyodor-pavlov",
    "category": "modern",
    "name": "Fyodor Pavlov Tarot",
    "period": "2022 edition",
    "artist": "Fyodor Pavlov",
    "tradition": "Watercolor and ink; inclusive classic tarot illustration",
    "uses": "Inclusive archetypes, figure drawing, limited palettes and narrative symbolism",
    "note": "Pavlov’s watercolor-and-ink illustrations reinterpret familiar tarot imagery through a broad range of bodies, genders and identities. The artist’s queer and trans experience informs the work. The result is useful for studying how traditional compositions can carry more inclusive stories; the pictured edition has a blue-and-gold star reverse.",
    "cardCount": 78,
    "edition": "U.S. Games Systems edition; 2022 copyright on pictured reverse",
    "frontCaption": "The Fool · 0",
    "backCaption": "Gold stars on blue · 2022 edition",
    "front": "/tarot-decks/modern/fyodor-pavlov/front/front-reference.webp",
    "back": "/tarot-decks/modern/fyodor-pavlov/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/tarot-and-inspiration/all-products/fyodor-pavlov-tarot",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/tarot-and-inspiration/all-products/fyodor-pavlov-tarot"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "crow-tarot",
    "category": "modern",
    "name": "Crow Tarot",
    "period": "21st century",
    "artist": "MJ Cullinane",
    "tradition": "Digital collage; crow and raven reinterpretations",
    "uses": "Animal symbolism, nature journaling and translating human archetypes into creatures",
    "note": "Cullinane places crows and ravens within compositions that retain familiar Waite-Smith symbolism. Digital collage gives the scenes layered textures and an atmospheric setting. Compare how each bird’s posture carries meaning without a human face, and how the dark feather-like repeat unifies the reverse.",
    "cardCount": 78,
    "edition": "U.S. Games Systems full-size edition",
    "frontCaption": "The Magician · I",
    "backCaption": "Dark feather-like repeating reverse",
    "front": "/tarot-decks/modern/crow-tarot/front/front-reference.webp",
    "back": "/tarot-decks/modern/crow-tarot/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/crow-tarot.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/crow-tarot.html"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "hermetic",
    "category": "modern",
    "name": "The Hermetic Tarot",
    "period": "Artwork completed 1977",
    "artist": "Godfrey Dowson",
    "tradition": "Golden Dawn; astrological and Qabalistic correspondences",
    "uses": "Correspondence study, monochrome illustration, symbolism and astrology–tarot comparison",
    "note": "Dowson completed the original artwork in 1977. Dense black-and-white drawings bring astrological signs, elemental associations and other Golden Dawn correspondences into the card faces. It is a useful reference for studying explicit symbol systems alongside the archive’s more intuitive, image-led decks.",
    "cardCount": 78,
    "edition": "U.S. Games Systems reissue",
    "frontCaption": "The Magician · I",
    "backCaption": "Monochrome ornamental reverse",
    "front": "/tarot-decks/modern/hermetic/front/front-reference.webp",
    "back": "/tarot-decks/modern/hermetic/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/hermetic-tarot-deck.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/hermetic-tarot-deck.html"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "cat-people",
    "category": "modern",
    "name": "Tarot of the Cat People",
    "period": "1980s",
    "artist": "Karen Kuykendall",
    "tradition": "Science-fiction fantasy; the imagined Outer Regions",
    "uses": "World-building, costume design, feline symbolism and narrative reading",
    "note": "Kuykendall locates this deck in an invented world called the Outer Regions, where cats are central companions. Ornate costumes and jewelry distinguish its figures, while felines participate in the scenes. Its complete fictional setting makes it a useful reference for developing a deck with a consistent world and cast.",
    "cardCount": 78,
    "edition": "U.S. Games Systems edition",
    "frontCaption": "The Magician · I",
    "backCaption": "Mirrored cat design",
    "front": "/tarot-decks/modern/cat-people/front/front-reference.webp",
    "back": "/tarot-decks/modern/cat-people/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/tarot-of-the-cat-people.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/tarot-of-the-cat-people.html"
      },
      {
        "label": "Additional source",
        "url": "https://www.usgamesinc.com/files/attachments/481/CP78_Booklet.pdf"
      }
    ],
    "backLabel": "Back"
  },
  {
    "id": "herbcrafters",
    "category": "modern",
    "name": "The Herbcrafter’s Tarot",
    "period": "21st century",
    "artist": "Latisha Guthrie / Joanna Powell Colbert",
    "tradition": "Botanical tarot; plants, tools and traditional handcrafts",
    "uses": "Botanical observation, seasonal journaling, craft motifs and nature-based symbolism",
    "note": "Guthrie and Colbert build tarot scenes around plants, working spaces, tools and folk crafts. The cards foreground a relationship with the botanical world rather than conventional portraits. The Four of Air’s lavender scene is a useful example of translating a tarot theme through objects and plants; these notes treat plant associations as cultural symbolism.",
    "cardCount": 78,
    "edition": "U.S. Games Systems deck and book set",
    "frontCaption": "Four of Air · Lavender",
    "backCaption": "Botanical specimen pattern",
    "front": "/tarot-decks/modern/herbcrafters/front/front-reference.webp",
    "back": "/tarot-decks/modern/herbcrafters/back/back-reference.webp",
    "source": "https://www.usgamesinc.com/the-herbcrafter-s-tarot.html",
    "imageCredit": "Publisher preview images: U.S. Games Systems. Artwork credited above.",
    "rights": "Copyrighted U.S. Games Systems edition / promotional images; research references, no reuse license granted.",
    "addedBatch": "2026-09-08",
    "sources": [
      {
        "label": "Publisher / pictured edition",
        "url": "https://www.usgamesinc.com/the-herbcrafter-s-tarot.html"
      }
    ],
    "backLabel": "Back"
  }
];
if (typeof module !== "undefined" && module.exports) module.exports = ArchiveDecks;
