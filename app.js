const decks = [
  { id: "rws", category: "historical", name: "Rider–Waite–Smith", period: "1909–1910", artist: "A. E. Waite / Pamela Colman Smith", tradition: "Golden Dawn influenced illustrated English tarot", uses: "General readings, teaching, symbolism reference, comparative deck study", note: "The fully illustrated pip cards made narrative readings accessible and established the visual grammar most English-language readers recognize today.", front: "tarot-decks/historical/rider-waite-smith/front/17-the-star.jpg", back: "tarot-decks/historical/rider-waite-smith/back/roses-and-lilies.jpg", source: "https://commons.wikimedia.org/wiki/File:RWS_Tarot_17_Star.jpg", rights: "Wikimedia Commons marks these scans public domain." },
  { id: "dodal", category: "historical", name: "Tarot de Marseille", period: "1701–1715", artist: "Jean Dodal workshop", tradition: "French woodcut Marseille; pip-focused", uses: "Historical study, Marseille-style reading, iconographic comparison", note: "Early French woodcut linework, French titles, and pip cards make this a useful ancestor for studying how Marseille reading differs from illustrated systems.", front: "tarot-decks/historical/tarot-de-marseille/front/09-l-hermite.png", back: "tarot-decks/historical/tarot-de-marseille/back/jean-dodal-reverse.jpg", source: "https://commons.wikimedia.org/wiki/File:Jean_Dodal_Tarot_reverse.jpg", rights: "Wikimedia Commons PD-Art/public-domain source; jurisdiction rules can differ." },
  { id: "sola", category: "historical", name: "Sola Busca", period: "c. 1491", artist: "Unknown North Italian workshop", tradition: "Renaissance illustrated tarot; named scenes and figures", uses: "Renaissance symbolism, art history, comparative iconography", note: "The earliest surviving complete illustrated tarot, with named figures and narrative minors that likely influenced later illustrated decks.", front: "tarot-decks/historical/sola-busca/front/card-64.jpg", back: "tarot-decks/historical/sola-busca/back/deck-detail-composite.jpg", source: "https://commons.wikimedia.org/wiki/File:Sola_Busca_tarot_card_64.jpg", rights: "Wikimedia Commons public-domain reproductions." },
  { id: "nouveau", category: "historical", name: "Tarot Nouveau", period: "1898", artist: "Grimaud, France", tradition: "French tarot nouveau pattern; scenic courts", uses: "Playing-card history, European tarot comparison, visual motif research", note: "A bridge between gaming decks and divinatory tarot, with scenic courts and an ornate late nineteenth-century print language.", front: "tarot-decks/historical/tarot-nouveau/front/14-trump.jpg", back: "tarot-decks/historical/tarot-nouveau/back/card-back.jpg", source: "https://commons.wikimedia.org/wiki/Category:Tarot_nouveau", rights: "Wikimedia Commons public-domain/PD-Art source." },
  { id: "piedmontese", category: "historical", name: "Piedmontese Tarot", period: "1865", artist: "Solesio, Piedmont", tradition: "Italian-suited regional tarot", uses: "Regional history, Marseille family comparison, print-style reference", note: "A regional pattern with restrained linework and a traditional trump sequence, useful for tracing how tarot changed across borders.", front: "tarot-decks/historical/piedmontese-solesio/front/20-judgement.jpg", back: "tarot-decks/historical/piedmontese-solesio/back/card-back.jpg", source: "https://commons.wikimedia.org/wiki/Category:Piedmontese_tarot_deck", rights: "Wikimedia Commons public-domain/PD-Art source." },
  { id: "gassmann", category: "historical", name: "Gassmann Swiss Marseille", period: "c. 1840–1870", artist: "François Gassmann, Geneva", tradition: "Swiss hand-colored Type II Marseille", uses: "Color restoration studies, antique reproduction reference", note: "Hand-colored woodblock printing, square corners, and patterned backs show how physical production shaped the deck's character.", front: "tarot-decks/historical/gassmann-swiss/front/major-arcana.jpg", back: "tarot-decks/historical/gassmann-swiss/back/deck-back-detail.jpg", source: "https://mccloskys.com/products/c-1870-gassmann-swiss-tarot-de-marseille-complete", rights: "Merchant-hosted reference photography; verify rights before reuse." },
  { id: "muller", category: "historical", name: "J. Müller Schaffhausen", period: "c. 1900", artist: "J. Müller & Cie.", tradition: "Swiss-Marseille continuity", uses: "Print history, condition reference, deck-back comparison", note: "A late nineteenth/early twentieth-century continuation of Marseille traditions, especially useful for studying borders, wear, and backs.", front: "tarot-decks/historical/schaffhausen-muller/front/major-arcana.jpg", back: "tarot-decks/historical/schaffhausen-muller/back/deck-back-detail.jpg", source: "https://mccloskys.com/products/c-1900-tarot-de-marseilles-schaffhausen-j-muller-ce-1", rights: "Merchant-hosted reference photography; verify rights before reuse." },
  { id: "thoth", category: "modern", name: "Thoth Tarot", period: "1938–1969", artist: "Aleister Crowley / Frieda Harris", tradition: "Hermetic, astrological, Qabalistic, Egyptian", uses: "Occult study, ceremonial symbolism, advanced readings", note: "Frieda Harris's dense, abstract color language turns Hermetic and astrological correspondences into a visual system built for close study.", front: "tarot-decks/modern/thoth/front/front-and-back-product.jpg", back: "tarot-decks/modern/thoth/back/front-and-back-product.jpg", source: "https://pentacle.jp/?pid=61423445", rights: "Product photography; artwork remains copyrighted." },
  { id: "modern-witch", category: "modern", name: "Modern Witch Tarot", period: "2019–2020", artist: "Lisa Sterle", tradition: "Inclusive contemporary Rider–Waite reinterpretation", uses: "Beginner teaching, representation studies, modern visual language", note: "Fashion-forward scenes and inclusive casting translate familiar Rider–Waite symbolism into contemporary life.", front: "tarot-decks/modern/modern-witch/front/front-and-back-product.jpg", back: "tarot-decks/modern/modern-witch/back/front-and-back-product.jpg", source: "https://pentacle.jp/?pid=155286424", rights: "Product photography; artwork remains copyrighted." },
  { id: "wild-unknown", category: "modern", name: "The Wild Unknown", period: "2012", artist: "Kim Krans", tradition: "Minimal animal and botanical linework", uses: "Intuitive readings, animal symbolism, minimalist design", note: "Minimal linework and selective color made this indie deck's animal-centered visual language especially influential in modern tarot design.", front: "tarot-decks/modern/wild-unknown/front/front-and-back-product.jpg", back: "tarot-decks/modern/wild-unknown/back/front-and-back-product.jpg", source: "https://pentacle.jp/?pid=128894578", rights: "Product photography; artwork remains copyrighted." },
  { id: "light-seers", category: "modern", name: "The Light Seer's Tarot", period: "2018–2019", artist: "Chris-Anne", tradition: "Boho psychological Rider–Waite reinterpretation", uses: "Self-reflection, journaling, contemporary archetype study", note: "A psychologically oriented deck that pairs a light-and-shadow theme with saturated color and boho visual cues.", front: "tarot-decks/modern/light-seers/front/front-and-back-product.jpg", back: "tarot-decks/modern/light-seers/back/front-and-back-product.jpg", source: "https://pentacle.jp/?pid=181691180", rights: "Product photography; artwork remains copyrighted." },
  { id: "mystic-mondays", category: "modern", name: "Mystic Mondays", period: "2018", artist: "Grace Duong", tradition: "Neon gradients and geometric modern tarot", uses: "Beginner readings, color and shape studies, social content", note: "Neon gradients, bold geometry, and an optimistic tone make the system immediately legible in digital and social contexts.", front: "tarot-decks/modern/mystic-mondays/front/front-and-back-product.png", back: "tarot-decks/modern/mystic-mondays/back/front-and-back-product.png", source: "https://curiouscauldron.com.au/products/mystic-mondays-tarot", rights: "Product photography; artwork remains copyrighted." },
  { id: "everyday-witch", category: "modern", name: "Everyday Witch Tarot", period: "2017", artist: "Deborah Blake / Elisabeth Alba", tradition: "Playful witchcraft Rider–Waite structure", uses: "Beginner practice, positive guidance, witchcraft-themed readings", note: "Cats, brooms, and approachable scenes create a playful witchcraft world while preserving a familiar Rider–Waite structure.", front: "tarot-decks/modern/everyday-witch/front/front-and-back-product.jpg", back: "tarot-decks/modern/everyday-witch/back/front-and-back-product.jpg", source: "https://www.edankest.com/everyday-witch-tarot-deck-with-instruction-book.html", rights: "Product photography; artwork remains copyrighted." },
  { id: "golden-thread", category: "modern", name: "Golden Thread Tarot", period: "2015–2019", artist: "Tina Gong / Labyrinthos", tradition: "Minimal black-and-gold digital-first system", uses: "Digital readings, study deck, interface and icon research", note: "Designed alongside a companion app, its reduced black-and-gold language makes it a useful reference for digital tarot experiences.", front: "tarot-decks/modern/golden-thread/front/front-and-back-product.jpg", back: "tarot-decks/modern/golden-thread/back/front-and-back-product.jpg", source: "https://www.goodreads.com/book/show/48747230-golden-thread-tarot", rights: "Product photography; artwork remains copyrighted." }
];

const majorArcana = [
  { number: "0", name: "The Fool", sigil: "✦", keywords: "beginnings · trust · possibility", upright: "A fresh start is asking for your attention. Follow curiosity, keep your pack light, and let the first step teach you what the map cannot.", reversed: "The wish to begin is real, but the footing may need checking. Slow down long enough to notice the edge, then choose your leap with care.", prompt: "What would you try if you did not need the whole path first?" },
  { number: "I", name: "The Magician", sigil: "✧", keywords: "agency · skill · focus", upright: "You already have a useful tool in hand. Name the result you want, gather your attention, and turn one small action into momentum.", reversed: "Scattered energy is diluting your influence. Choose one honest intention and make sure your tools are serving it rather than performing around it.", prompt: "Which resource have you been treating as unavailable?" },
  { number: "II", name: "The High Priestess", sigil: "☾", keywords: "intuition · stillness · knowing", upright: "The answer is taking shape beneath the noise. Leave a little room for silence, dreams, and the knowledge that does not need to prove itself yet.", reversed: "Too much outside commentary may be drowning out your inner signal. Step back from the feed and listen for what remains when the noise drops away.", prompt: "What do you know before anyone else weighs in?" },
  { number: "III", name: "The Empress", sigil: "❀", keywords: "nourishment · creativity · abundance", upright: "Something grows when it receives steady care. Make room for pleasure, making, and the relationships that return your energy instead of only asking for it.", reversed: "Your giving may have outpaced your reserves. Restore the soil: rest, receive, and let a good thing develop at a human pace.", prompt: "What deserves tending before it deserves judging?" },
  { number: "IV", name: "The Emperor", sigil: "♜", keywords: "structure · boundaries · stewardship", upright: "A clear container will help your ambition breathe. Set the boundary, name the next rule, and use structure as support rather than control.", reversed: "A structure has become too rigid or too absent. Rework the rule so it protects what matters without turning the whole room into a test.", prompt: "Which boundary would make your next decision easier?" },
  { number: "V", name: "The Hierophant", sigil: "☉", keywords: "tradition · teaching · belonging", upright: "A trusted practice or teacher can give your question a useful frame. Learn the lineage, then decide what you want to carry forward.", reversed: "A borrowed rule may no longer fit the life you are actually living. Question the script without dismissing the wisdom that shaped it.", prompt: "Which tradition helps you feel more like yourself?" },
  { number: "VI", name: "The Lovers", sigil: "∞", keywords: "choice · alignment · connection", upright: "The important choice is the one that brings your actions into alignment with your values. Let honesty be more persuasive than urgency.", reversed: "A split between desire and values is asking to be acknowledged. Stop negotiating against yourself and name the choice you can stand behind.", prompt: "What would an aligned yes look like in practice?" },
  { number: "VII", name: "The Chariot", sigil: "➤", keywords: "direction · resolve · movement", upright: "Two strong forces can move together when you take the reins. Pick a direction, protect your attention, and let consistent motion do the convincing.", reversed: "Competing pulls are making forward motion feel like friction. Pause to choose the destination before asking more effort from yourself.", prompt: "Where could less steering create more progress?" },
  { number: "VIII", name: "Strength", sigil: "♡", keywords: "courage · patience · compassion", upright: "Gentle persistence is the power available today. Meet the difficult part without making it an enemy, and your patience will become a kind of courage.", reversed: "You may be trying to overpower a tender problem. Trade force for a steadier hand, especially in the way you speak to yourself.", prompt: "What would become possible with a kinder inner voice?" },
  { number: "IX", name: "The Hermit", sigil: "⌁", keywords: "solitude · guidance · perspective", upright: "A little chosen solitude will clarify what constant input has blurred. Carry the lantern close and look for the next true step, not the whole staircase.", reversed: "Withdrawal may be protecting an old pattern rather than offering insight. Keep the quiet, but let one trusted person know where you are.", prompt: "What question needs your undistracted attention?", image: "tarot-decks/historical/tarot-de-marseille/front/09-l-hermite.png" },
  { number: "X", name: "Wheel of Fortune", sigil: "◌", keywords: "change · cycles · timing", upright: "The wheel is moving. Meet the changing conditions with flexibility, notice the opening, and remember that a season is not a permanent identity.", reversed: "A repeating loop is showing you where agency can return. Name the pattern, then change one part of the turn instead of waiting for luck to do it.", prompt: "What cycle are you ready to interrupt?" },
  { number: "XI", name: "Justice", sigil: "⚖", keywords: "truth · balance · consequence", upright: "Clarity comes from telling the truth about the tradeoff. Let evidence and values sit at the same table, then make the cleanest decision you can.", reversed: "Something is being rationalized instead of faced. Restore balance by naming your part, correcting what you can, and releasing the story that avoids consequence.", prompt: "What fact would make this decision more honest?" },
  { number: "XII", name: "The Hanged Man", sigil: "⟡", keywords: "surrender · pause · new perspective", upright: "A pause can reveal the angle effort has hidden. Release the need to force timing and let a different perspective rearrange the problem.", reversed: "Waiting has become a substitute for choosing. Keep the insight you gained, then make the small move that turns suspension into change.", prompt: "What could you see if you stopped trying to solve it head-on?", image: "tarot-decks/historical/rider-waite-smith/front/12-the-hanged-man.png" },
  { number: "XIII", name: "Death", sigil: "✺", keywords: "ending · release · transformation", upright: "An old form is ready to end so the living part can continue. Grieve what is complete, clear the space, and let the next shape be different.", reversed: "You may be carrying a chapter past its natural ending. Ask what the attachment is protecting, then loosen your grip one honest inch.", prompt: "What is finished even if you have not named it?" },
  { number: "XIV", name: "Temperance", sigil: "∿", keywords: "balance · synthesis · healing", upright: "The next answer is a blend rather than a swing between extremes. Adjust the mixture patiently until it supports the life you want to keep living.", reversed: "The ingredients are out of proportion. Restore one daily rhythm, one relationship, or one promise before attempting a total reset.", prompt: "Where would a small adjustment create relief?" },
  { number: "XV", name: "The Devil", sigil: "⛓", keywords: "attachment · appetite · agency", upright: "Look clearly at the bargain underneath the habit. Naming what has power over you is the beginning of taking your choice back.", reversed: "A chain is loosening because you can finally see its link. Replace shame with a practical boundary and choose the next free action.", prompt: "What promise does this attachment make, and what does it cost?" },
  { number: "XVI", name: "The Tower", sigil: "⚡", keywords: "revelation · disruption · truth", upright: "A structure that cannot hold is showing you the truth quickly. Let the false certainty fall, protect what is alive, and build from what remains real.", reversed: "You may be bracing against a necessary change. Soften the resistance enough to choose what comes down and what you want to save.", prompt: "Which truth is asking to be seen before it gets louder?" },
  { number: "XVII", name: "The Star", sigil: "☆", keywords: "hope · renewal · openness", upright: "Hope is practical here: make the small repair, share the honest wish, and let your future receive a little more light than your past did.", reversed: "The light is still present, but fatigue may be narrowing your view. Rest, reconnect to a simple source of meaning, and let hope be quiet for a while.", prompt: "What small sign of renewal can you make visible today?", image: "tarot-decks/historical/rider-waite-smith/front/17-the-star.jpg" },
  { number: "XVIII", name: "The Moon", sigil: "☽", keywords: "dreams · uncertainty · imagination", upright: "Not every shape in the dark is a threat. Move slowly, check the story your fear is telling, and trust what becomes clear through patient attention.", reversed: "The fog is beginning to lift. Let new information revise the story, and avoid turning a half-seen worry into a permanent conclusion.", prompt: "What part of this story still needs daylight?" },
  { number: "XIX", name: "The Sun", sigil: "☼", keywords: "vitality · clarity · joy", upright: "Let the good news be uncomplicated. Make the work visible, spend time where your energy returns, and allow warmth to count as evidence.", reversed: "Joy may be present but hard to receive. Lower the demand for perfection and let one clear, ordinary pleasure be enough for today.", prompt: "Where can you choose more directness and warmth?" },
  { number: "XX", name: "Judgement", sigil: "♢", keywords: "calling · reckoning · renewal", upright: "A past version of the question is ready to be answered differently. Hear the call, take the lesson, and step forward without requiring your old self to disappear.", reversed: "Self-judgement is making the next chapter sound like a verdict. Separate accountability from punishment and answer the part of you asking to live more fully.", prompt: "What are you ready to answer for, and what are you ready to answer to?" },
  { number: "XXI", name: "The World", sigil: "◎", keywords: "completion · integration · wholeness", upright: "A cycle has gathered enough wisdom to be honored. Mark the completion, take the learning with you, and let the next horizon open from solid ground.", reversed: "The final stitch is still waiting. Finish the small piece that keeps you from feeling complete, then stop asking an old chapter for new instructions.", prompt: "What completion deserves to be acknowledged before you move on?" }
];

const suitProfiles = {
  Wands: { sigil: "♨", element: "fire", focus: "passion, creativity, and initiative", noun: "your spark and momentum" },
  Cups: { sigil: "◒", element: "water", focus: "emotion, connection, and imagination", noun: "your emotional current" },
  Swords: { sigil: "⚔", element: "air", focus: "thought, truth, and communication", noun: "your mental weather" },
  Pentacles: { sigil: "✹", element: "earth", focus: "body, work, resources, and home", noun: "your material foundation" }
};

const rankProfiles = {
  Ace: { key: "seed", upright: "A seed of possibility is available", reversed: "The seed is real, but it needs more space or care", prompt: "What beginning could you protect" },
  Two: { key: "choice", upright: "A choice or pairing asks for your attention", reversed: "A split or imbalance is making the next step harder", prompt: "Where could you make a cleaner choice" },
  Three: { key: "collaboration", upright: "Shared effort can turn an idea into something visible", reversed: "A contribution or collaboration needs clearer expectations", prompt: "Who could make this stronger with you" },
  Four: { key: "stability", upright: "Stability and a deliberate pause can restore your strength", reversed: "Holding too tightly is keeping useful movement out", prompt: "What kind of rest or structure would help" },
  Five: { key: "friction", upright: "A friction point reveals what needs to change", reversed: "The struggle is lingering longer than the lesson requires", prompt: "What would make this conflict more useful" },
  Six: { key: "exchange", upright: "An exchange can restore balance and dignity", reversed: "Give-and-take may be uneven or carrying an old debt", prompt: "Where could generosity become more mutual" },
  Seven: { key: "assessment", upright: "A test of patience asks you to assess what is worth continuing", reversed: "Doubt or impatience is tempting you to abandon the work too soon", prompt: "What deserves one more honest look" },
  Eight: { key: "momentum", upright: "Momentum grows through repetition and clear movement", reversed: "The current is blocked by distraction, delay, or overwork", prompt: "What simple rhythm would move this forward" },
  Nine: { key: "ripening", upright: "Nearness to completion invites both pride and care", reversed: "Fatigue or overreach is making success feel harder to receive", prompt: "What would let you enjoy how far you have come" },
  Ten: { key: "culmination", upright: "A full cycle brings a visible result and a new responsibility", reversed: "A load has become too heavy to carry in its current form", prompt: "What can be completed, shared, or set down" },
  Page: { key: "message", upright: "A curious message or learner brings a fresh angle", reversed: "Inexperience or mixed signals need patience and a direct question", prompt: "What are you ready to learn" },
  Knight: { key: "pursuit", upright: "Movement and pursuit put your values into motion", reversed: "Rushed or scattered movement is burning energy without direction", prompt: "Where should your effort actually go" },
  Queen: { key: "embodiment", upright: "Mature inner command lets you hold this suit with generosity", reversed: "Your gifts need firmer boundaries before you can share them freely", prompt: "How can you lead from a steadier center" },
  King: { key: "mastery", upright: "Responsible mastery turns experience into dependable guidance", reversed: "Control or certainty is crowding out listening and adaptation", prompt: "What would wise stewardship look like" }
};

const minorArcana = Object.entries(suitProfiles).flatMap(([suit, suitProfile]) => Object.entries(rankProfiles).map(([rank, rankProfile]) => ({
  type: "minor",
  suit,
  rank,
  number: rank,
  name: `${rank} of ${suit}`,
  sigil: suitProfile.sigil,
  keywords: `${suitProfile.element} · ${suitProfile.focus} · ${rankProfile.key}`,
  upright: `${rankProfile.upright} in the realm of ${suitProfile.focus}. Tend ${suitProfile.noun} with intention.`,
  reversed: `${rankProfile.reversed} in the realm of ${suitProfile.focus}. Let the response be practical rather than punitive.`,
  prompt: `${rankProfile.prompt} when it comes to ${suitProfile.focus}?`
})));

const tarotCards = [...majorArcana.map(card => ({ ...card, type: "major" })), ...minorArcana];
const cardImages = Object.fromEntries(tarotCards.map((card, index) => [card.name, `assets/ishtar-deck/cards/${String(index).padStart(2, "0")}.jpg`]));

const zodiacSigns = [
  { name: "Aries", symbol: "♈", start: [3, 21], element: "Fire", modality: "Cardinal", ruler: "Mars", stones: "Diamond · bloodstone", flower: "Sweet pea", mantra: "I begin", horoscope: "Your spark is useful when it has somewhere to go. Give the brave idea a small, visible first move, then let momentum answer the doubts." },
  { name: "Taurus", symbol: "♉", start: [4, 20], element: "Earth", modality: "Fixed", ruler: "Venus", stones: "Emerald · rose quartz", flower: "Poppy", mantra: "I build", horoscope: "Your steady attention is a creative force. Choose what is worth tending, protect your pace, and let pleasure become part of the plan." },
  { name: "Gemini", symbol: "♊", start: [5, 21], element: "Air", modality: "Mutable", ruler: "Mercury", stones: "Agate · tiger's eye", flower: "Lavender", mantra: "I connect", horoscope: "Curiosity is opening more than one door. Follow the conversation that makes you sharper, and give your many interests one thread to follow." },
  { name: "Cancer", symbol: "♋", start: [6, 21], element: "Water", modality: "Cardinal", ruler: "Moon", stones: "Ruby · moonstone", flower: "Delphinium", mantra: "I feel", horoscope: "Your sensitivity is information, not an inconvenience. Make a warm boundary around what matters and let care guide the next choice." },
  { name: "Leo", symbol: "♌", start: [7, 23], element: "Fire", modality: "Fixed", ruler: "Sun", stones: "Peridot · onyx", flower: "Sunflower", mantra: "I shine", horoscope: "There is room for your full-hearted contribution. Let the work be seen, share the credit generously, and make joy part of your leadership." },
  { name: "Virgo", symbol: "♍", start: [8, 23], element: "Earth", modality: "Mutable", ruler: "Mercury", stones: "Sapphire · moss agate", flower: "Morning glory", mantra: "I refine", horoscope: "A thoughtful edit can free more energy than another push. Make the useful improvement, then leave enough room for life to surprise you." },
  { name: "Libra", symbol: "♎", start: [9, 23], element: "Air", modality: "Cardinal", ruler: "Venus", stones: "Opal · lapis lazuli", flower: "Rose", mantra: "I balance", horoscope: "Harmony starts with a clear yes and a clear no. Name the value you are protecting, then let that value shape the room around you." },
  { name: "Scorpio", symbol: "♏", start: [10, 23], element: "Water", modality: "Fixed", ruler: "Mars · Pluto", stones: "Topaz · obsidian", flower: "Chrysanthemum", mantra: "I transform", horoscope: "You can tell which truth has weight by the way it keeps returning. Meet it directly, release the old armor, and let your next version be simpler." },
  { name: "Sagittarius", symbol: "♐", start: [11, 22], element: "Fire", modality: "Mutable", ruler: "Jupiter", stones: "Turquoise · tanzanite", flower: "Carnation", mantra: "I seek", horoscope: "A wider horizon is calling, but the meaningful adventure begins with a direction. Choose the experience that expands your understanding, not just your itinerary." },
  { name: "Capricorn", symbol: "♑", start: [12, 22], element: "Earth", modality: "Cardinal", ruler: "Saturn", stones: "Garnet · smoky quartz", flower: "Pansy", mantra: "I make real", horoscope: "Your long view is an advantage. Break the mountain into a promise you can keep this week, and let earned trust replace the need to rush." },
  { name: "Aquarius", symbol: "♒", start: [1, 20], element: "Air", modality: "Fixed", ruler: "Saturn · Uranus", stones: "Amethyst · garnet", flower: "Orchid", mantra: "I imagine", horoscope: "The unusual solution deserves a fair hearing. Share the idea with people who can help it become useful, then keep enough freedom to revise it." },
  { name: "Pisces", symbol: "♓", start: [2, 19], element: "Water", modality: "Mutable", ruler: "Jupiter · Neptune", stones: "Aquamarine · amethyst", flower: "Water lily", mantra: "I dream", horoscope: "Your imagination is picking up a meaningful signal. Give the dream a container—a page, a ritual, or a first sketch—so it can meet the real world." }
];

const birthstones = {
  1: "Garnet", 2: "Amethyst", 3: "Aquamarine", 4: "Diamond", 5: "Emerald", 6: "Pearl · moonstone", 7: "Ruby", 8: "Peridot", 9: "Sapphire", 10: "Opal · tourmaline", 11: "Topaz · citrine", 12: "Turquoise · zircon"
};

const chineseAnimals = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
const moonNames = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
const chartOrder = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const gallery = document.querySelector("#gallery");
const emptyState = document.querySelector("#empty-state");
const resultTitle = document.querySelector("#result-title");
const resultCount = document.querySelector("#result-count");
const search = document.querySelector("#search");
const dialog = document.querySelector("#detail-dialog");
const dialogContent = document.querySelector("#dialog-content");
const birthdayForm = document.querySelector("#birthday-form");
const birthdayInput = document.querySelector("#birthday-input");
const birthTimeInput = document.querySelector("#birth-time");
const birthPlaceInput = document.querySelector("#birth-place");
const birthdayOutput = document.querySelector("#birthday-output");

function cardTemplate(deck, index) {
  const era = deck.category === "historical" ? "Historical" : "Modern";
  return `<article class="deck-card" style="animation-delay:${Math.min(index * 35, 450)}ms">
    <div class="deck-visual">
      <div class="visual-frame"><img src="${deck.front}" alt="${deck.name} face-up card reference" loading="lazy"><span class="visual-label">Front</span></div>
      <div class="visual-frame back-frame"><img src="${deck.back}" alt="${deck.name} card back reference" loading="lazy"><span class="visual-label">Back</span></div>
    </div>
    <div class="deck-copy">
      <div class="deck-meta"><span>${era}</span><span>${deck.period}</span></div>
      <h3>${deck.name}</h3>
      <p class="deck-artist">${deck.artist}</p>
      <div class="deck-tags"><span class="tag">${deck.tradition}</span></div>
      <button class="card-action" data-open="${deck.id}">Open deck notes</button>
    </div>
  </article>`;
}

function render() {
  const active = document.querySelector(".filter.active")?.dataset.filter || "all";
  const query = search.value.trim().toLowerCase();
  const filtered = decks.filter(deck => {
    const matchesFilter = active === "all" || deck.category === active;
    const haystack = [deck.name, deck.artist, deck.tradition, deck.uses, deck.period].join(" ").toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  gallery.innerHTML = filtered.map(cardTemplate).join("");
  emptyState.hidden = filtered.length > 0;
  resultCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
  resultTitle.textContent = query ? `Results for “${search.value.trim()}”` : active === "all" ? "Every deck, every lineage" : active === "historical" ? "History in the hands" : "Modern ways of seeing";
}

function openDetails(id) {
  const deck = decks.find(item => item.id === id);
  if (!deck) return;
  dialogContent.innerHTML = `<div class="detail-layout">
    <div class="detail-images">
      <figure><img src="${deck.front}" alt="${deck.name} front reference"><figcaption>Face / front</figcaption></figure>
      <figure><img src="${deck.back}" alt="${deck.name} back reference"><figcaption>Back / reverse</figcaption></figure>
    </div>
    <div class="detail-copy">
      <div class="deck-meta"><span>${deck.category === "historical" ? "Historical deck" : "Modern deck"}</span><span>${deck.period}</span></div>
      <h2>${deck.name}</h2>
      <p class="detail-artist">${deck.artist}</p>
      <dl>
        <dt>Tradition</dt><dd>${deck.tradition}</dd>
        <dt>Useful for</dt><dd>${deck.uses}</dd>
        <dt>Rights</dt><dd>${deck.rights}</dd>
      </dl>
      <p class="detail-note">${deck.note}</p>
      <a class="source-link" href="${deck.source}" target="_blank" rel="noreferrer">View source ↗</a>
    </div>
  </div>`;
  dialog.showModal();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
}

function birthdayParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day, date };
}

function zodiacFor(parts) {
  const value = parts.month * 100 + parts.day;
  const ordered = [...zodiacSigns].sort((a, b) => (a.start[0] * 100 + a.start[1]) - (b.start[0] * 100 + b.start[1]));
  let match = ordered[ordered.length - 1];
  ordered.forEach(sign => {
    if (value >= sign.start[0] * 100 + sign.start[1]) match = sign;
  });
  return match;
}

function decanFor(parts, sign) {
  const signIndex = zodiacSigns.findIndex(item => item.name === sign.name);
  const next = zodiacSigns[(signIndex + 1) % zodiacSigns.length];
  const start = new Date(Date.UTC(parts.year, sign.start[0] - 1, sign.start[1], 12));
  const birthday = parts.date;
  if (sign.name === "Capricorn" && birthday < start) start.setUTCFullYear(parts.year - 1);
  const days = Math.max(0, Math.floor((birthday - start) / 86400000));
  return `${Math.min(3, Math.floor(days / 10) + 1)}${Math.min(3, Math.floor(days / 10) + 1) === 1 ? "st" : Math.min(3, Math.floor(days / 10) + 1) === 2 ? "nd" : "rd"} decan`;
}

function moonPhaseFor(date) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const synodicMonth = 29.530588853;
  const age = ((date.getTime() - knownNewMoon) / 86400000) % synodicMonth;
  const normalized = (age + synodicMonth) % synodicMonth;
  const index = Math.round(normalized / synodicMonth * 8) % 8;
  const illumination = Math.round((1 - Math.cos(normalized / synodicMonth * Math.PI * 2)) / 2 * 100);
  return { name: moonNames[index], illumination };
}

function chineseZodiacFor(year) {
  return chineseAnimals[((year - 4) % chineseAnimals.length + chineseAnimals.length) % chineseAnimals.length];
}

function tarotBirthCardFor(parts) {
  const digits = `${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}`.split("").reduce((sum, digit) => sum + Number(digit), 0);
  let number = digits;
  while (number > 21) number = String(number).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return majorArcana[number] || majorArcana[0];
}

function starChartFor(sign) {
  const active = chartOrder.indexOf(sign.name);
  const center = 180;
  const radius = 128;
  const points = chartOrder.map((name, index) => {
    const angle = (-90 + index * 30) * Math.PI / 180;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const isActive = index === active;
    return { name, index, x, y, isActive };
  });
  const labels = points.map(point => `<text class="chart-label${point.isActive ? " active" : ""}" x="${point.x.toFixed(1)}" y="${(point.y + 3).toFixed(1)}">${zodiacSigns[chartOrder.indexOf(point.name)].symbol} ${point.name.slice(0, 3)}</text>`).join("");
  const stars = Array.from({ length: 26 }, (_, index) => {
    const x = 36 + (hashString(`${sign.name}-x-${index}`) % 248);
    const y = 36 + (hashString(`${sign.name}-y-${index}`) % 248);
    const size = index % 7 === 0 ? 2.2 : index % 3 === 0 ? 1.5 : 1;
    return `<circle class="chart-star${index % 7 === 0 ? " is-bright" : ""}" cx="${x}" cy="${y}" r="${size}" />`;
  }).join("");
  const constellation = [0, 4, 7, 11].map((offset, index, items) => {
    const from = points[(active + offset) % points.length];
    const to = points[(active + items[(index + 1) % items.length]) % points.length];
    return `<line class="chart-line" x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" />`;
  }).join("");
  const spokes = points.map(point => `<line class="chart-spoke" x1="180" y1="180" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" />`).join("");
  return `<svg class="star-chart" viewBox="0 0 360 360" role="img" aria-label="Symbolic birthday sky chart with ${sign.name} highlighted"><circle class="chart-ring" cx="180" cy="180" r="145" /><circle class="chart-ring" cx="180" cy="180" r="92" /><circle class="chart-ring" cx="180" cy="180" r="37" />${spokes}${constellation}${stars}<circle cx="180" cy="180" r="4" fill="var(--gold-light)" />${labels}</svg>`;
}

function renderBirthdayProfile(saved = null) {
  const parts = birthdayParts(saved?.birthday || birthdayInput.value);
  if (!parts) {
    birthdayOutput.innerHTML = `<div class="birthday-empty"><strong>Set your birthday</strong> to open a personal sky cabinet with your sun sign, birthstone, moon phase, tarot birth card, and zodiac wheel.</div>`;
    return;
  }
  const sign = zodiacFor(parts);
  const moon = moonPhaseFor(parts.date);
  const birthCard = tarotBirthCardFor(parts);
  const dateLabel = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parts.date);
  const timeLabel = saved?.time ? ` · ${saved.time}` : "";
  const placeLabel = saved?.place ? ` · ${escapeHTML(saved.place)}` : "";
  const facts = [
    ["Sun sign", `${sign.symbol} ${sign.name}`, `${decanFor(parts, sign)} · ${sign.mantra}`],
    ["Element", sign.element, `${sign.modality} modality`],
    ["Ruling planet", sign.ruler, "traditional + modern ruler"],
    ["Birthstone", birthstones[parts.month], sign.stones],
    ["Birth flower", sign.flower, "seasonal flower lore"],
    ["Moon phase", moon.name, `${moon.illumination}% illuminated`],
    ["Chinese zodiac", chineseZodiacFor(parts.year), `${parts.year} cycle · solar approximation`],
    ["Tarot birth card", `${birthCard.number} · ${birthCard.name}`, birthCard.keywords]
  ];
  birthdayOutput.innerHTML = `<div class="sky-summary">
    <div class="sky-chart-wrap">${starChartFor(sign)}</div>
    <dl class="sky-facts">${facts.map(([label, value, detail]) => `<div class="sky-fact"><dt>${label}</dt><dd>${value}<small>${detail}</small></dd></div>`).join("")}</dl>
    <article class="horoscope-card"><div><p class="reading-label">Birthday horoscope</p><h4>${sign.symbol} ${sign.name}</h4><p class="zodiac-line">${dateLabel}${timeLabel}${placeLabel}</p></div><div class="horoscope-copy"><p>${sign.horoscope}</p><p class="horoscope-meta">${sign.element} · ${sign.modality} · ruled by ${sign.ruler} · ${sign.mantra}</p></div></article>
    <p class="birthday-footnote"><span>✧</span> This is a symbolic solar sky chart based on the birthday alone. An exact natal chart needs birth time and birthplace; the optional fields are saved here so we can add that layer next.</p>
  </div>`;
}

birthdayForm.addEventListener("submit", event => {
  event.preventDefault();
  const saved = { birthday: birthdayInput.value, time: birthTimeInput.value, place: birthPlaceInput.value.trim() };
  try { localStorage.setItem("arcana-birthday-profile-v1", JSON.stringify(saved)); } catch (error) { /* no-op */ }
  renderBirthdayProfile(saved);
});

try {
  const savedBirthday = JSON.parse(localStorage.getItem("arcana-birthday-profile-v1"));
  if (savedBirthday?.birthday) {
    birthdayInput.value = savedBirthday.birthday;
    birthTimeInput.value = savedBirthday.time || "";
    birthPlaceInput.value = savedBirthday.place || "";
    renderBirthdayProfile(savedBirthday);
  } else {
    renderBirthdayProfile();
  }
} catch (error) {
  renderBirthdayProfile();
}

const readingOutput = document.querySelector("#reading-output");
const drawReadingButton = document.querySelector("#draw-reading");
let readingMode = "daily";
let currentPick3 = null;

function localDateKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function orientationFor(seed) {
  return hashString(seed) % 5 === 0 ? "reversed" : "upright";
}

function randomInt(maxExclusive) {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    const range = 0x100000000;
    const limit = Math.floor(range / maxExclusive) * maxExclusive;
    do { window.crypto.getRandomValues(values); } while (values[0] >= limit);
    return values[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function getDailyReading() {
  const key = `arcana-daily-v2-${localDateKey()}`;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isInteger(saved.index) && tarotCards[saved.index]) return saved;
  } catch (error) {
    // Private browsing can disable localStorage; the draw still works for this session.
  }
  const index = hashString(localDateKey()) % tarotCards.length;
  const reading = { index, orientation: orientationFor(`${localDateKey()}-orientation`) };
  try { localStorage.setItem(key, JSON.stringify(reading)); } catch (error) { /* no-op */ }
  return reading;
}

function drawPick3() {
  const order = tarotCards.map((card, index) => ({ card, index }));
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order.slice(0, 3).map((item, index) => ({
    index: item.index,
    orientation: randomInt(5) === 0 ? "reversed" : "upright",
    position: ["Past / what shaped this", "Present / what needs attention", "Future / what is taking shape"][index]
  }));
}

function cardVisual(card, orientation, compact = false) {
  const className = `drawn-card${orientation === "reversed" ? " is-reversed" : ""}`;
  if (cardImages[card.name]) {
    return `<div class="${className}"><div class="drawn-card-inner"><img src="${cardImages[card.name]}" alt="${card.name} card artwork"></div></div>`;
  }
  return `<div class="${className}"><div class="drawn-card-inner"><span class="drawn-number">${card.number}</span><span class="drawn-sigil">${card.sigil}</span><span class="drawn-name">${card.name}</span></div></div>`;
}

function readingCopy(card, orientation) {
  return orientation === "upright" ? card.upright : card.reversed;
}

function renderReading() {
  if (readingMode === "daily") {
    const reading = getDailyReading();
    const card = tarotCards[reading.index];
    readingOutput.innerHTML = `<div class="daily-reading">
      ${cardVisual(card, reading.orientation)}
      <div class="reading-copy">
        <p class="reading-label">Today · ${localDateKey()}</p>
        <h3>${card.name}</h3>
        <span class="orientation">${reading.orientation}</span>
        <p>${readingCopy(card, reading.orientation)}</p>
        <p class="prompt"><strong>Try this:</strong> ${card.prompt}</p>
      </div>
    </div>`;
    drawReadingButton.innerHTML = "<span>✦</span> Show today's card";
    drawReadingButton.setAttribute("aria-label", "Show today's card");
    return;
  }

  if (!currentPick3) {
    readingOutput.innerHTML = `<div class="reading-empty"><p class="reading-label">Three-card spread</p><p>Set an intention, then draw three cards for context, attention, and direction.</p></div>`;
    drawReadingButton.innerHTML = "<span>✦</span> Draw 3 cards";
    drawReadingButton.setAttribute("aria-label", "Draw three cards");
    return;
  }

  const cards = currentPick3.map(item => ({ ...item, card: tarotCards[item.index] }));
  readingOutput.innerHTML = `<div class="pick3-reading">${cards.map(item => `<article class="pick3-item">
    ${cardVisual(item.card, item.orientation, true)}
    <div><p class="reading-label">${item.position}</p><h3>${item.card.name}</h3><span class="orientation">${item.orientation}</span><p>${readingCopy(item.card, item.orientation)}</p></div>
  </article>`).join("")}<p class="pick3-summary"><span class="reading-label">Read the thread</span> Notice how the three positions speak to one another. The spread is a prompt for reflection, so keep the parts that feel useful and leave the rest.</p></div>`;
  drawReadingButton.innerHTML = "<span>✦</span> Draw another 3";
  drawReadingButton.setAttribute("aria-label", "Draw another three-card spread");
}

document.querySelectorAll(".reading-tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".reading-tab").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  readingMode = button.dataset.readingMode;
  if (readingMode === "daily") currentPick3 = null;
  renderReading();
}));
drawReadingButton.addEventListener("click", () => {
  if (readingMode === "pick3") currentPick3 = drawPick3();
  renderReading();
});

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  render();
}));
search.addEventListener("input", render);
document.querySelector("#clear-search").addEventListener("click", () => { search.value = ""; render(); search.focus(); });
gallery.addEventListener("click", event => { const button = event.target.closest("[data-open]"); if (button) openDetails(button.dataset.open); });
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
document.addEventListener("keydown", event => { if (event.key === "/" && document.activeElement !== search) { event.preventDefault(); search.focus(); } });
renderReading();
render();
