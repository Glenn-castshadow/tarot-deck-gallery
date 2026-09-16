/* The 52-card deck for cartomancy: data, pip layouts and original vector card faces.
   No third-party artwork and no image requests. Conventions: docs/DIVINATION.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlayingCards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SUITS = [
    {key: 'hearts', name: 'Hearts', colour: 'red', path: 'M50 88C12 60 6 38 20 24c10-10 24-6 30 6 6-12 20-16 30-6 14 14 8 36-30 64Z'},
    {key: 'diamonds', name: 'Diamonds', colour: 'red', path: 'M50 8 82 50 50 92 18 50Z'},
    {key: 'clubs', name: 'Clubs', colour: 'black', path: 'M50 10a17 17 0 0 1 16 23 17 17 0 1 1-8 30l6 25H36l6-25a17 17 0 1 1-8-30A17 17 0 0 1 50 10Z'},
    {key: 'spades', name: 'Spades', colour: 'black', path: 'M50 8C70 30 88 42 88 58a17 17 0 0 1-30 10l6 22H36l6-22a17 17 0 0 1-30-10c0-16 18-28 38-50Z'}
  ];
  const RANKS = [
    {key: 'A', name: 'Ace', value: 1}, {key: '2', name: 'Two', value: 2}, {key: '3', name: 'Three', value: 3},
    {key: '4', name: 'Four', value: 4}, {key: '5', name: 'Five', value: 5}, {key: '6', name: 'Six', value: 6},
    {key: '7', name: 'Seven', value: 7}, {key: '8', name: 'Eight', value: 8}, {key: '9', name: 'Nine', value: 9},
    {key: '10', name: 'Ten', value: 10}, {key: 'J', name: 'Jack', value: 11}, {key: 'Q', name: 'Queen', value: 12},
    {key: 'K', name: 'King', value: 13}
  ];
  // The standard pip arrangements, as fractions of the face (x across, y down).
  const COLS = [0.25, 0.75];
  const two = y => COLS.map(x => [x, y]);
  const LAYOUTS = {
    2: [[.5, .2], [.5, .8]],
    3: [[.5, .2], [.5, .5], [.5, .8]],
    4: [...two(.2), ...two(.8)],
    5: [...two(.2), ...two(.8), [.5, .5]],
    6: [...two(.2), ...two(.5), ...two(.8)],
    7: [...two(.2), ...two(.5), ...two(.8), [.5, .35]],
    8: [...two(.2), ...two(.5), ...two(.8), [.5, .35], [.5, .65]],
    9: [...two(.2), ...two(.4), ...two(.6), ...two(.8), [.5, .5]],
    10: [...two(.2), ...two(.4), ...two(.6), ...two(.8), [.5, .3], [.5, .7]]
  };
  function pips(rank) {
    if (rank === 1) return [[.5, .5]];
    if (rank >= 11 && rank <= 13) return [];
    if (!LAYOUTS[rank]) throw new RangeError('Rank runs 1–13.');
    return LAYOUTS[rank].map(p => [...p]);
  }
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Face area inside a 200×300 card: x 30–170, y 40–260.
  const FACE = {x: 30, y: 40, w: 140, h: 220};
  function svg(card) {
    const suit = SUITS.find(s => s.key === card.suit), rank = RANKS.find(r => r.value === card.rank);
    if (!suit || !rank) throw new RangeError('Unknown card.');
    const mark = (cx, cy, size, flip) => `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})${flip ? ' rotate(180 50 50)' : ''}"><path d="${suit.path}"/></g>`;
    const corner = `<text x="16" y="34" class="pc-rank">${esc(rank.key)}</text>${mark(24, 50, 18, false)}`;
    const faceMarks = card.rank >= 11
      ? `<rect x="52" y="82" width="96" height="136" rx="10" class="pc-court"/><text x="100" y="160" class="pc-monogram">${esc(rank.key)}</text>${mark(100, 192, 30, false)}`
      : pips(card.rank).map(([x, y]) => mark(FACE.x + x * FACE.w, FACE.y + y * FACE.h, card.rank === 1 ? 70 : 30, y > .5)).join('');
    return `<svg class="pc-card pc-${suit.colour}" viewBox="0 0 200 300" role="img" aria-label="${esc(card.name)}"><title>${esc(card.name)}</title><rect x="2" y="2" width="196" height="296" rx="14" class="pc-face"/>${corner}<g transform="rotate(180 100 150)">${corner}</g>${faceMarks}</svg>`;
  }
  // Original reflective copy, index-aligned with cards: suit then rank, ace first.
  const COPY = [
    // Hearts: feeling and relationships.
    {keyword: 'Opening Heart', meaning: 'A new feeling or connection is beginning to take shape. It does not need a name yet; it needs room and a little honesty.', prompt: 'What feeling is asking to be noticed for the first time?'},
    {keyword: 'Mutual Regard', meaning: 'Two people, or two parts of yourself, meet on equal terms. Attention given freely in both directions is the ground this card stands on.', prompt: 'Where is care flowing both ways, and where only one way?'},
    {keyword: 'Shared Joy', meaning: 'Friendship and celebration widen the circle. Gladness grows when it is shared, and so does support.', prompt: 'Who would I like to share a good moment with?'},
    {keyword: 'Settled Feeling', meaning: 'Feeling has settled into a steady pattern that can be comfortable or quietly stale. Notice whether contentment is resting or simply avoiding change.', prompt: 'Is this calm restful, or am I holding something back?'},
    {keyword: 'Tender Ground', meaning: 'A disappointment in feeling or connection asks for gentleness. What did not go as hoped can still be understood without blame.', prompt: 'What would it mean to be kind to myself about this?'},
    {keyword: 'Remembered Warmth', meaning: 'Old affections and familiar comforts come back into view. Memory can nourish the present when it is visited rather than lived in.', prompt: 'What from the past still warms me, and what have I outgrown?'},
    {keyword: 'Longing', meaning: 'Many wishes compete for the heart’s attention at once. Some are invitations and some are daydreams — naming them helps tell them apart.', prompt: 'Which of my wishes is ready to be acted on?'},
    {keyword: 'Gentle Departure', meaning: 'A feeling that once fitted may no longer hold what matters. Stepping away from it can be an act of care rather than rejection.', prompt: 'What am I ready to let go of with gratitude?'},
    {keyword: 'Contentment', meaning: 'Emotional needs are largely met, and there is space to enjoy that. Satisfaction becomes steadier when it is noticed and named.', prompt: 'What am I quietly grateful for right now?'},
    {keyword: 'Belonging', meaning: 'Feeling reaches its fullness in a sense of home among others. Relationships that have been tended can hold and shelter the people within them.', prompt: 'Where do I feel most at home with people?'},
    {keyword: 'Heartfelt Message', meaning: 'Feeling is carried here as curiosity and a readiness to learn. It points to a tender thing worth saying aloud, even imperfectly.', prompt: 'What kind word have I been waiting to say?'},
    {keyword: 'Compassion', meaning: 'Feeling is carried as care that has become a steady inner skill. Emotional understanding lets you hold other people’s feelings without losing your own.', prompt: 'How can I care for someone without carrying what is theirs?'},
    {keyword: 'Steady Heart', meaning: 'Feeling is carried as responsibility: warmth expressed through fair and reliable conduct. Steadiness of heart helps others feel safe around strong emotion.', prompt: 'Where can I offer calm leadership in a heated moment?'},
    // Diamonds: resources and practical work.
    {keyword: 'Fresh Resource', meaning: 'A practical opening appears: a skill, a tool or a sum that can be put to work. Its value grows with the care given to its first use.', prompt: 'What resource have I only just noticed?'},
    {keyword: 'Balancing', meaning: 'Two practical demands pull on the same time or money. Juggling becomes easier once priorities are written down rather than carried in the head.', prompt: 'What needs to be weighed before I commit?'},
    {keyword: 'Craft', meaning: 'Work improves through skill, collaboration and attention to detail. Good results come from doing the ordinary parts well.', prompt: 'Which small task deserves more of my skill?'},
    {keyword: 'Security', meaning: 'Resources are held steady, perhaps tightly. Saving has its place, and so does noticing when holding on stops serving you.', prompt: 'What am I protecting, and does it still need protecting?'},
    {keyword: 'Scarcity', meaning: 'Something practical feels thin or stretched. Asking plainly for help and looking at what is still available can widen the view.', prompt: 'Where could I ask for practical support?'},
    {keyword: 'Generosity', meaning: 'Resources move between people through giving and receiving. Fair exchange keeps both sides dignified.', prompt: 'Where is giving and receiving in balance for me?'},
    {keyword: 'Patient Growth', meaning: 'Effort has been planted and the harvest is not yet visible. Assessing progress honestly helps decide whether to keep tending or change course.', prompt: 'What investment of effort needs more time?'},
    {keyword: 'Diligence', meaning: 'Steady practice builds competence one repetition at a time. The work may be unglamorous, and it is still shaping real skill.', prompt: 'What skill am I building through repetition?'},
    {keyword: 'Self-Reliance', meaning: 'Work has created a measure of comfort and independence. It is worth enjoying what has been earned and recognising the discipline behind it.', prompt: 'What have I built that I can now enjoy?'},
    {keyword: 'Legacy', meaning: 'Practical work reaches its fullness in something that lasts beyond a single season. Resources, skills and habits become a foundation others can build on.', prompt: 'What am I building that could outlast my own effort?'},
    {keyword: 'Apprentice', meaning: 'Resources and work are carried here as study and early practice. Being a beginner is a practical strength when it keeps you asking questions.', prompt: 'What would I like to learn to do well?'},
    {keyword: 'Resourcefulness', meaning: 'Practical care is carried as confident stewardship of a home, a budget or a shared project. Mastery here shows in clear decisions about what to keep, what to spend and what to share.', prompt: 'What choice about my resources would serve others as well as me?'},
    {keyword: 'Enterprise', meaning: 'Resources are carried as outward responsibility for work that others rely on. Sound decisions about money and effort make room for everyone involved.', prompt: 'What practical decision is mine to make well?'},
    // Clubs: effort, growth and exchange.
    {keyword: 'Spark', meaning: 'Energy gathers for a new effort or venture. The first step matters less for its size than for being taken.', prompt: 'What effort am I ready to begin?'},
    {keyword: 'Planning', meaning: 'An idea stands at the edge of action, with a wider field in view. Mapping the options before moving helps effort go where it counts.', prompt: 'Which direction do I want my energy to take?'},
    {keyword: 'Expansion', meaning: 'Early effort begins to reach further than first imagined. Partners, trade or new contacts can carry the work outward.', prompt: 'Where could my effort find a wider audience?'},
    {keyword: 'Milestone', meaning: 'A stage of growth is complete enough to mark. Pausing to recognise it renews the energy for what comes next.', prompt: 'What progress deserves to be celebrated?'},
    {keyword: 'Friction', meaning: 'Competing ideas and efforts rub against one another. Disagreement can sharpen the work when it stays about the work.', prompt: 'What could this disagreement teach me?'},
    {keyword: 'Acknowledgement', meaning: 'Effort is seen and valued by others. Accepting recognition gracefully makes room to share the credit.', prompt: 'Who has helped me get this far?'},
    {keyword: 'Standing Firm', meaning: 'Growth brings challenge, and a position may need defending. Holding ground works best when you know exactly what you are defending and why.', prompt: 'What principle is worth standing up for here?'},
    {keyword: 'Momentum', meaning: 'Effort gathers speed and many things move at once. A swift exchange of messages and ideas can carry the work, provided attention keeps up.', prompt: 'What needs a quick response, and what can wait?'},
    {keyword: 'Persistence', meaning: 'Effort has been long and there is still some way to go. Resilience grows from rest taken at the right moment as much as from pushing on.', prompt: 'Where do I need rest in order to continue?'},
    {keyword: 'Full Load', meaning: 'Growth reaches its fullest extent, and the weight of it shows. Some responsibilities can be shared, set down or handed on.', prompt: 'What am I carrying that could be shared?'},
    {keyword: 'Enthusiasm', meaning: 'Effort and growth are carried as curiosity and a readiness to try. An eagerness to exchange ideas can open doors that careful planning does not.', prompt: 'What new idea am I curious to explore?'},
    {keyword: 'Encouragement', meaning: 'Growth is carried as warm, confident care for other people’s efforts. Inner mastery shows in how easily energy is shared rather than hoarded.', prompt: 'Whose effort could I encourage today?'},
    {keyword: 'Vision', meaning: 'Effort is carried as outward leadership that sets a direction and invites others in. Responsibility here means keeping the larger aim in view while respecting everyone’s work.', prompt: 'What larger aim am I willing to take responsibility for?'},
    // Spades: difficulty, decisions and clear thought. Difficulty is named as something to work with.
    {keyword: 'Clarity', meaning: 'A clear thought cuts through confusion and opens a decision. Seeing a situation plainly is the first step to working with it.', prompt: 'What truth is becoming clear to me?'},
    {keyword: 'Indecision', meaning: 'Two options sit in balance and neither yet feels right. Choosing becomes easier once you admit what you already know.', prompt: 'What am I avoiding looking at in this choice?'},
    {keyword: 'Hard Truth', meaning: 'Something painful asks to be acknowledged. Naming a hurt honestly is often where working with it begins.', prompt: 'What difficult truth can I face with care?'},
    {keyword: 'Pause', meaning: 'Difficulty calls for a pause to gather thought. Stepping back is a practical choice, not an escape from the problem.', prompt: 'What would a deliberate rest make possible?'},
    {keyword: 'Conflict', meaning: 'A disagreement may have left someone feeling unheard. Consider what winning would cost, and whether understanding matters more.', prompt: 'What would a fair resolution look like?'},
    {keyword: 'Transition', meaning: 'Difficulty eases as you move from one state of mind to another. The move may be quiet and gradual, and it is still progress.', prompt: 'What am I ready to move away from?'},
    {keyword: 'Strategy', meaning: 'A problem invites cleverness, but not every shortcut is sound. Check that your plans are honest as well as effective.', prompt: 'Is my approach both smart and fair?'},
    {keyword: 'Restriction', meaning: 'Thoughts may feel boxed in by rules or fears. Some limits are firmer in the mind than in fact, and one small move can test that.', prompt: 'Which limit could I test with a small step?'},
    {keyword: 'Worry', meaning: 'Anxious thoughts can grow largest at night and in isolation. Writing them down or speaking them aloud often shrinks them to a workable size.', prompt: 'Who could I share this worry with?'},
    {keyword: 'Turning Point', meaning: 'Difficulty reaches its fullest point, and the pattern becomes clear to see. What has run its course can be set down so something new can start.', prompt: 'What am I ready to call finished?'},
    {keyword: 'Inquiry', meaning: 'Clear thought is carried as sharp curiosity and careful listening. Checking the facts before passing a message on is a skill worth practising.', prompt: 'What do I need to find out before I decide?'},
    {keyword: 'Discernment', meaning: 'Clear thought is carried as inner mastery won through experience. Honesty and kindness can travel together when boundaries are clear.', prompt: 'Where would a clearer boundary help?'},
    {keyword: 'Fair Judgement', meaning: 'Clear thought is carried as outward responsibility for decisions that affect others. Fairness depends on hearing every side before reaching a conclusion.', prompt: 'What decision needs my most careful reasoning?'}
  ];
  const cards = SUITS.flatMap((suit, s) => RANKS.map((rank, r) => ({id: s * 13 + r, rank: rank.value, rankKey: rank.key, suit: suit.key, name: `${rank.name} of ${suit.name}`, ...COPY[s * 13 + r]})));
  return {SUITS, RANKS, cards, pips, svg};
});
