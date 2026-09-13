"""Every reading kind the journal accepts. Rooms in the browser register the same kinds
(rooms.js); a kind unknown here is rejected by the API. Add a kind here first."""

CATEGORIES = ('tarot', 'sky', 'charts', 'eastern', 'numerology', 'divination')

KINDS = {
    'tarot-daily': ('Daily card', 'tarot'),
    'tarot-spread': ('Tarot spread', 'tarot'),
    'lenormand': ('Lenormand', 'divination'),
    'oracle': ('Ishtar Reflection Oracle', 'divination'),
    'runes': ('Runes', 'divination'),
    'geomancy': ('Geomancy', 'divination'),
    'iching': ('I Ching', 'divination'),
    'natal': ('Birth chart', 'charts'),
    'solar-return': ('Solar return', 'charts'),
    'lunar-return': ('Lunar return', 'charts'),
    'progressed': ('Progressed chart', 'charts'),
    'synastry': ('Synastry', 'charts'),
    'horary': ('Horary chart', 'charts'),
    'jyotish': ('Jyotish chart', 'eastern'),
    'bazi': ('Four Pillars', 'eastern'),
    'numerology': ('Numerology', 'numerology'),
}

CHOICES = [(kind, label) for kind, (label, _category) in KINDS.items()]
