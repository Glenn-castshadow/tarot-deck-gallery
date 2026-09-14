/* Original reflective copy for the sky section. Traditional names, associations and
   structures are data; every sentence here is written for this site. Nothing forecasts,
   promises or diagnoses: each entry says what a moment is traditionally associated with
   and hands the reader a question rather than a verdict. Pure data — no DOM, no logic. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SkyCalendarText = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Index 0-7, and `title` character-identical to BirthLore.moonNames (birth-lore.js:53)
  // and SkyCalendarEngine.PHASE_NAMES, so the hub strip and this section agree on names.
  const phases = [
    {
      title: 'New moon',
      body: 'The Moon stands with the Sun and turns its unlit side toward us, which is why the tradition reads this point as the opening of a cycle rather than the close of one. It has long been kept for what is still only intended, private and unproven.',
      prompt: 'What is still only an intention, and what would the first small step be?'
    },
    {
      title: 'Waxing crescent',
      body: 'A thin edge of light returns a few days after the conjunction, and older almanacs marked its reappearance as the point where an intention becomes visible enough to be acted on. The tradition associates it with early effort that still needs protecting.',
      prompt: 'What have you begun that is not yet sturdy enough to explain to everyone?'
    },
    {
      title: 'First quarter',
      body: 'Half the disc is lit and the Moon stands square to the Sun, an angle astrologers have long read as productive friction rather than trouble. This point is traditionally associated with the moment a plan meets real resistance and has to be worked rather than imagined.',
      prompt: 'Where is the resistance telling you something useful about the plan?'
    },
    {
      title: 'Waxing gibbous',
      body: 'Past the halfway mark the Moon fills steadily toward fullness, and the tradition gives this stretch to refinement: adjusting, testing and correcting something already under way. It is associated less with starting than with getting the details of a thing right.',
      prompt: 'What would you adjust if you looked once more before calling it finished?'
    },
    {
      title: 'Full moon',
      body: 'The Moon stands opposite the Sun and shows a fully lit face. Tradition reads that opposition as the point of greatest visibility, when whatever has been developing can be seen whole — culmination here means clarity rather than completion.',
      prompt: 'What can you see clearly now that was harder to make out two weeks ago?'
    },
    {
      title: 'Waning gibbous',
      body: 'Light begins to withdraw and the tradition turns this phase outward, associating it with telling, teaching and passing on whatever the full moon made visible. It is read as the part of the cycle where something gathered gets given away.',
      prompt: 'What have you understood recently that someone else could use?'
    },
    {
      title: 'Last quarter',
      body: 'Half lit again and square to the Sun from the other side, this phase is traditionally read as a point of honest reassessment: the cycle has run far enough that what is working and what is merely habit have become distinguishable.',
      prompt: 'What have you been continuing out of habit rather than intent?'
    },
    {
      title: 'Waning crescent',
      body: 'The last sliver before the Moon disappears into the Sun’s light has long been kept for rest and for endings, the part of the cycle deliberately left empty. Older practice treated it as poorly suited to beginnings and well suited to clearing ground.',
      prompt: 'What could you set down before the next cycle starts?'
    }
  ];

  // Index 0-11 in NatalEngine.signNames order (Aries..Pisces). Each body is written to be
  // read after the moving body has been named -- "Mars enters Aries" then this entry --
  // so nothing here assumes which planet is doing the travelling.
  const ingressSigns = [
    {
      title: 'Aries, a direct start',
      body: 'Cardinal fire under Mars: tradition describes a body crossing this cusp as taking on initiative, bluntness and a preference for moving before the ground has been fully surveyed. Whatever the body stands for is read here as wanting to begin.',
      prompt: 'Where would starting teach you more than planning further?'
    },
    {
      title: 'Taurus, a slower register',
      body: 'Fixed earth under Venus, and the least hurried stretch of the zodiac. A body travelling here is traditionally read as steadying — settling into what can be touched, kept and enjoyed without rushing. Consolidation rather than motion is the association.',
      prompt: 'What is worth keeping steady while other things move?'
    },
    {
      title: 'Gemini, more than one idea',
      body: 'Mutable air ruled by Mercury, traditionally associated with talk, exchange and holding several threads at once. A body passing through this sign is described as quick and curious, gathering information well before committing to a view.',
      prompt: 'Which conversation have you been meaning to have?'
    },
    {
      title: 'Cancer, turned toward home',
      body: 'Cardinal water under the Moon, read as protective and tidal. Tradition describes a body here as turning toward household, memory and the people it looks after, with feeling reaching the matter before reasoning does.',
      prompt: 'Who or what are you quietly looking after at the moment?'
    },
    {
      title: 'Leo, willing to be seen',
      body: 'Fixed fire and the Sun’s own sign, traditionally associated with warmth, display and the willingness to be watched doing something. A body crossing here is read as acting more visibly and more personally than it had been.',
      prompt: 'What would you do differently if being seen doing it felt safe?'
    },
    {
      title: 'Virgo, craft and repair',
      body: 'Mutable earth under Mercury, the tradition’s sign of sorting, skill and maintenance. A body moving through it is described as becoming precise and practical, more interested in how a thing actually works than in what it promises.',
      prompt: 'What small repair have you been postponing?'
    },
    {
      title: 'Libra, the other person',
      body: 'Cardinal air ruled by Venus and traditionally given to the other party: weighing, comparing, and looking for an arrangement both sides can live with. A body here is read as turning outward toward agreement rather than acting alone.',
      prompt: 'Which decision are you holding open because it involves someone else?'
    },
    {
      title: 'Scorpio, held close',
      body: 'Fixed water, assigned to Mars in the classical scheme, and associated with depth, privacy and whatever is not said aloud. Tradition reads a body passing through this sign as concentrated, slower to show its hand and harder to distract.',
      prompt: 'What have you been circling without saying directly?'
    },
    {
      title: 'Sagittarius, a wider view',
      body: 'Mutable fire under Jupiter, traditionally associated with distance, belief and an appetite for the larger picture. A body crossing this cusp is described as reaching past the familiar, more taken with meaning than with detail.',
      prompt: 'What would a wider view of this change?'
    },
    {
      title: 'Capricorn, built to last',
      body: 'Cardinal earth under Saturn, the tradition’s sign of structure, patience and consequence. A body travelling here is read as deliberate, measuring effort against time and preferring what can be maintained to what merely impresses.',
      prompt: 'What are you building that should still stand in five years?'
    },
    {
      title: 'Aquarius, the pattern behind it',
      body: 'Fixed air, Saturn’s other sign in the classical scheme, associated with principle, pattern and the group rather than the single person. A body moving through it is described as stepping back far enough to see the system it has been standing inside.',
      prompt: 'Which of your habits belongs to a group rather than to you?'
    },
    {
      title: 'Pisces, edges dissolving',
      body: 'Mutable water under Jupiter, traditionally the sign of softened outlines, imagination and fellow feeling. A body here is read as losing some of its definition, less occupied with boundaries and more receptive to whatever it is near.',
      prompt: 'Where have your edges gone soft, and is that rest or drift?'
    }
  ];

  const retrogrades = {
    Mercury: {
      title: 'Mercury retrograde',
      body: 'Three times a year Mercury appears to travel backward for about three weeks — an effect of the earth overtaking it, not a change in the planet. Its modern reputation for things breaking is a good deal louder than the tradition, which read the period more plainly as a season for review: revisiting, rereading, and finishing what was already begun.',
      prompt: 'What is worth going back over before you carry it any further?'
    },
    Venus: {
      title: 'Venus retrograde',
      body: 'Venus reverses for roughly six weeks about every eighteen months, the rarest of the inner-planet retrogrades. Tradition associates the stretch with looking again at what is valued and who is close, and with matters of attachment coming round for a second reading rather than a first.',
      prompt: 'What do you value now that you would not have named a year ago?'
    },
    Mars: {
      title: 'Mars retrograde',
      body: 'Mars turns backward for around two and a half months every couple of years. The tradition reads the period as one where effort runs inward or back over itself instead of straight ahead, and associates it with plans reconsidered and with irritation that has an older source than today.',
      prompt: 'Where is your effort meeting itself rather than the task?'
    },
    Jupiter: {
      title: 'Jupiter retrograde',
      body: 'Jupiter spends roughly four months of each year in apparent retreat, so about a third of its cycle is passed going back over ground already covered. Astrologers have read that stretch inwardly: growth and belief examined from within rather than extended outward.',
      prompt: 'What do you believe that you have not examined lately?'
    },
    Saturn: {
      title: 'Saturn retrograde',
      body: 'Saturn is retrograde for about four and a half months a year. Tradition associates the period with structures reviewed rather than raised — commitments re-examined, and the difference between chosen discipline and plain endurance becoming easier to tell apart.',
      prompt: 'Which of your commitments would you choose again today?'
    },
    Uranus: {
      title: 'Uranus retrograde',
      body: 'Uranus appears to move backward for roughly five months of every year, often enough that the condition is ordinary rather than notable. The outer planets’ reversals have generally been read as a turn from outward disruption toward the quieter, internal form of the same restlessness.',
      prompt: 'What restlessness have you kept to yourself?'
    },
    Neptune: {
      title: 'Neptune retrograde',
      body: 'Neptune spends close to half of each year retrograde. Tradition associates the period less with events than with perception — imagination, longing and self-deception turned back on themselves, and an occasion to notice where a hope has been standing in for a fact.',
      prompt: 'Where might a hope be standing in for something you actually know?'
    },
    Pluto: {
      title: 'Pluto retrograde',
      body: 'Pluto is retrograde for about five months a year, so a great many charts carry it that way and the condition says little on its own. Tradition associates the stretch with slow internal work: what is being outgrown, and what is being gripped past the point where it still helps.',
      prompt: 'What are you holding on to past the point where it helps?'
    }
  };

  // Keys are SkyCalendarEngine's `${body === 'Sun' ? 'solar' : 'lunar'}-${kind}` pairs.
  const eclipses = {
    'solar-total': {
      title: 'Total solar eclipse',
      body: 'The Moon covers the Sun’s disc completely and, for a few minutes along a narrow track, the corona becomes visible in daylight. These are the most carefully recorded of celestial events; the tradition treats an eclipse as emphasis laid on a moment rather than as instruction about it.',
      prompt: 'What has been in plain sight so long that you have stopped looking at it?'
    },
    'solar-annular': {
      title: 'Annular solar eclipse',
      body: 'When the Moon is near the far end of its orbit it looks too small to cover the Sun, and a ring of light stays visible all the way around it. Traditions that watched eclipses closely kept this covering distinct from a total one: the light is reduced here, never removed.',
      prompt: 'What has been dimmed in your week rather than taken out of it?'
    },
    'solar-partial': {
      title: 'Partial solar eclipse',
      body: 'A bite is taken out of the Sun’s disc, and without a filter the change is easy to miss entirely. It is traditionally read as a lesser register of the same event — a reminder that something can be measurably altered and still look ordinary from where you happen to stand.',
      prompt: 'What has shifted slightly without announcing itself?'
    },
    'lunar-total': {
      title: 'Total lunar eclipse',
      body: 'The Moon passes entirely into the earth’s shadow and usually turns a dull copper red, lit only by sunlight bent through the whole rim of our atmosphere. Tradition associates the darkening of a full moon with what becomes visible once the usual light is taken away.',
      prompt: 'What do you understand differently in the dark than you do in daylight?'
    },
    'lunar-partial': {
      title: 'Partial lunar eclipse',
      body: 'Only part of the Moon enters the deep shadow, so a curved edge of darkness crosses the disc and then withdraws, tracing the earth’s own shape as it goes. Tradition treats it as the same event at lesser strength: marked, and passing.',
      prompt: 'What is partly obscured just now, and what is still lit?'
    },
    'lunar-penumbral': {
      title: 'Penumbral lunar eclipse',
      body: 'The Moon enters only the outer, weaker part of the earth’s shadow, and the dimming is so slight that many people looking straight at it notice nothing unusual. Of the six kinds this is the one the tradition weights least, and the one most often missed.',
      prompt: 'What quiet change have you noticed that others seem to have walked past?'
    }
  };

  const voidFraming = {
    title: 'Void of course, by two different rules',
    body: 'A void-of-course Moon is the gap between the last exact aspect the Moon makes to a planet and the moment it leaves the sign it is travelling through — a stretch with nothing further to complete before it begins again in fresh territory. Two traditions measure that gap differently, and they genuinely disagree. The classical rule, as William Lilly set it out in the seventeenth century, counts only the bodies visible to the naked eye: the Sun, Mercury, Venus, Mars, Jupiter and Saturn. The modern rule adds Uranus, Neptune and Pluto, all discovered long after Lilly wrote. Because the modern list is the classical list plus three more planets, the Moon has more chances to make a final aspect, and an extra chance can only fall at the same moment as the classical one or later — never earlier. Both periods end together, at the ingress. So the modern void always begins at or after the classical void begins, which makes it the shorter of the two and places it wholly inside the longer one. This section shows both and labels which is which, rather than quietly picking a side.',
    prompt: 'When two traditions disagree about where a boundary falls, what would make you trust one of them over the other?'
  };

  // Index 0-4, matching SkyCalendarEngine's ASPECTS order [0, 60, 90, 120, 180]; titles
  // match ASPECT_NAMES apart from capitalisation.
  const aspects = [
    {
      title: 'Conjunction',
      body: 'Two bodies at the same zodiacal degree are read as fused rather than in conversation. Tradition treats a conjunction as one mixed influence instead of two, with the faster body carrying the slower one’s colouring for as long as the two stay close.',
      prompt: 'Which two parts of your life are currently hard to tell apart?'
    },
    {
      title: 'Sextile',
      body: 'Sixty degrees apart, a sextile links signs of compatible elements and is traditionally read as an opening that still has to be taken up. It is described as the mildest of the major angles, easy to miss precisely because it applies so little pressure.',
      prompt: 'What has been available to you that you have not picked up?'
    },
    {
      title: 'Square',
      body: 'Ninety degrees apart, a square sets two bodies in signs that share a quality and little else, and tradition reads the angle as friction: two impulses both live, both pulling crosswise. The older books called it hard; the more useful word is probably demanding.',
      prompt: 'Which two things you want are pulling against each other?'
    },
    {
      title: 'Trine',
      body: 'A hundred and twenty degrees apart, in signs of one element, the trine is traditionally the easiest of the angles — cooperation arriving without having been asked for. Its reputation for ease carries a caution in the older texts: what flows freely is rarely examined.',
      prompt: 'What comes so easily to you that you have never looked at it closely?'
    },
    {
      title: 'Opposition',
      body: 'Bodies at opposite ends of the zodiac are read as facing one another across the chart, each in full view of the other and neither able to look away. Tradition associates the angle with awareness gained through contrast rather than with conflict for its own sake.',
      prompt: 'What gets clearer when you hold two opposed views at the same time?'
    }
  ];

  return {phases, ingressSigns, retrogrades, eclipses, voidFraming, aspects};
});
