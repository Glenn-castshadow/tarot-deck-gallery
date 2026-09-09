const decks = ArchiveDecks;
const latestArchiveBatch = decks.map(deck => deck.addedBatch).filter(Boolean).sort().at(-1);
const isNewArchiveDeck = deck => Boolean(latestArchiveBatch && deck.addedBatch === latestArchiveBatch);

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
}))).map(TarotReadings.enrichMinor);

const tarotCards = [...majorArcana.map(card => ({ ...card, type: "major" })), ...minorArcana];
const readingDecks = {
  ishtar: { name: "Ishtar Insights", assets: "assets/ishtar-deck", description: "A luminous world of lotus symbolism, deep violet and holographic reflections.", back: "The shared mirrored lotus back for all 78 cards." },
  moebius: { name: "Moebius-inspired", assets: "assets/light-minimal-deck", description: "Fine ink, open skies and strange horizons. A light, minimal deck with clear cerulean, coral and lavender color.", back: "Floating stone forms and celestial geometry echo the deck’s open skies in a reversible design." },
  "arts-and-crafts": { name: "Arts & Crafts", assets: "assets/arts-and-crafts-deck", description: "Botanical woodcut scenes in forest green, madder red and ochre, with quiet references to craft, initiation and Masonic geometry.", back: "A botanical repeat with acacia, oak, drawing compasses and measured geometry, designed for both orientations." },
  bacon: { name: "Francis Bacon-inspired", assets: "assets/expressive-figures-deck", description: "Erased faces, dragged paint and isolated figures inhabit deep black spaces. Bruised violet, oxblood and harsh ochre give familiar tarot symbols an unsettling psychological intensity.", back: "Opposed gestural figures and geometric enclosures carry the deck’s painterly tension into an abstract two-way back." }
};
let activeReadingDeck = "ishtar";
const requestedDeck = new URLSearchParams(location.search).get("deck");
if (Object.hasOwn(readingDecks, requestedDeck)) activeReadingDeck = requestedDeck;
else {
  try {
    const savedDeck = IshtarStorage.getItem("arcana-reading-deck-v1");
    if (Object.hasOwn(readingDecks, savedDeck)) activeReadingDeck = savedDeck;
  } catch { /* The room also works when storage is unavailable. */ }
}

function readingArt(index, size = "cards") {
  const base = readingDecks[activeReadingDeck].assets;
  return index === tarotCards.length ? `${base}/${size === "large" ? "large/" : ""}back.jpg` : `${base}/${size}/${String(index).padStart(2, "0")}.jpg`;
}

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

const moonNames = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];

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
const birthplacePicker = BirthplaceSearch.attach({input:birthPlaceInput,list:document.querySelector("#birth-city-list"),status:document.querySelector("#birth-city-status")});
const skyExplorer = SkyChart.attach({dialog:document.querySelector("#sky-dialog"),signs:zodiacSigns,themes:BirthdayInsights.westernThemes});
const worldAtlas = Astrocartography.attach(document.querySelector("#astrocartography-room"));
const celestialExtras = CelestialExtras.attach(document.querySelector("#celestial-extras"));

function cardTemplate(deck, index) {
  const era = deck.category === "historical" ? "Historical" : "Modern";
  return `<article class="deck-card" style="animation-delay:${Math.min(index * 35, 450)}ms">
    <div class="deck-visual">
      <div class="visual-frame"><img src="${deck.front}" alt="${deck.name}: ${deck.frontCaption || 'face-up card reference'}" loading="lazy"><span class="visual-label">Front</span></div>
      <div class="visual-frame back-frame"><img src="${deck.back}" alt="${deck.name}: ${deck.backCaption || 'card back reference'}" loading="lazy"><span class="visual-label">${deck.backLabel || 'Back'}</span></div>
    </div>
    <div class="deck-copy">
      <div class="deck-meta"><span>${era}</span><span>${deck.period}</span></div>
      <h3>${deck.name}</h3>
      <p class="deck-artist">${deck.artist}</p>
      <div class="deck-tags">${isNewArchiveDeck(deck) ? '<span class="tag new-deck-tag">New addition</span>' : ''}${deck.cardCount ? `<span class="tag">${deck.cardCount} cards</span>` : ''}<span class="tag">${deck.tradition}</span></div>
      <button class="card-action" data-open="${deck.id}">Open deck notes</button>
    </div>
  </article>`;
}

function render() {
  const active = document.querySelector(".filter.active")?.dataset.filter || "all";
  const query = search.value.trim().toLowerCase();
  const filtered = decks.filter(deck => {
    const matchesFilter = active === "all" || (active === "new" ? isNewArchiveDeck(deck) : deck.category === active);
    const haystack = [deck.name, deck.artist, deck.tradition, deck.uses, deck.period, deck.note, deck.edition, deck.cardCount].join(" ").toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  gallery.innerHTML = filtered.map(cardTemplate).join("");
  emptyState.hidden = filtered.length > 0;
  resultCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
  resultTitle.textContent = query ? `Results for “${search.value.trim()}”` : active === "all" ? "Every deck, every lineage" : active === "new" ? "New arrivals in the archive" : active === "historical" ? "History in the hands" : "Modern ways of seeing";
}

function openDetails(id) {
  const deck = decks.find(item => item.id === id);
  if (!deck) return;
  deckReviewIndex = null;
  cardDetailState = null;
  dialog.classList.remove("is-card-view");
  dialog.setAttribute("aria-label", `${deck.name} notes`);
  dialog.removeAttribute("aria-labelledby");
  dialogContent.innerHTML = `<div class="detail-layout">
    <div class="detail-images">
      <figure><a href="${deck.front}" target="_blank" rel="noopener" aria-label="Open ${deck.name} front image large"><img src="${deck.front}" alt="${deck.name} front reference"></a><figcaption>${deck.frontCaption || 'Face / front'} ↗</figcaption></figure>
      <figure><a href="${deck.back}" target="_blank" rel="noopener" aria-label="Open ${deck.name} back image large"><img src="${deck.back}" alt="${deck.name} back reference"></a><figcaption>${deck.backCaption || 'Back / reverse'} ↗</figcaption></figure>
    </div>
    <div class="detail-copy">
      <div class="deck-meta"><span>${deck.category === "historical" ? "Historical deck" : "Modern deck"}</span><span>${deck.period}</span></div>
      <h2>${deck.name}</h2>
      <p class="detail-artist">${deck.artist}</p>
      <dl>
        ${deck.cardCount ? `<dt>Deck size</dt><dd>${deck.cardCount} cards · selected visual references</dd>` : ''}
        ${deck.edition ? `<dt>Edition</dt><dd>${deck.edition}</dd>` : ''}
        <dt>Tradition</dt><dd>${deck.tradition}</dd>
        <dt>Useful for</dt><dd>${deck.uses}</dd>
        <dt>Rights</dt><dd>${deck.rights}</dd>
      </dl>
      <p class="detail-note">${deck.note}</p>
      ${deck.imageCredit ? `<p class="image-credit">${deck.imageCredit}</p>` : ''}
      <div class="archive-source-links">${(deck.sources || [{label:'View source',url:deck.source}]).map(source=>`<a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.label} ↗</a>`).join('')}</div>
    </div>
  </div>`;
  dialog.showModal();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
}

function birthdayParts(value) {
  return BirthdayInsights.parseDate(value);
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

function tarotBirthCardFor(parts) {
  const digits = `${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}`.split("").reduce((sum, digit) => sum + Number(digit), 0);
  let number = digits;
  while (number > 21) number = String(number).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return majorArcana[number] || majorArcana[0];
}


let birthdayView = location.hash === "#birthday-numbers" ? "numbers" : location.hash === "#birthday-chinese" ? "chinese" : "sky";
let numerologyRoom = null;
let birthdayProfileParts = null;
let natalModel = null;
let natalView = "placements";
let natalAspectFilter = "all";
const houseSystemInput = document.querySelector("#birth-house-system");
const orbScaleInput = document.querySelector("#birth-orb-scale");
const foldInput = document.querySelector("#birth-fold");
const manualLocationInput = document.querySelector("#birth-manual-enabled");
const manualFields = document.querySelector("#birth-manual-fields");
function refreshNatalReport() {
  if(natalModel) birthdayOutput.querySelector(".natal-report").outerHTML = NatalChart.report(natalModel,natalView,natalAspectFilter);
}
// Include every major aspect in print, preserving the on-screen filter afterward.
let natalPrintFocus = false;
window.addEventListener("beforeprint", () => {
  if (!natalModel) return;
  natalPrintFocus = Boolean(document.activeElement?.closest(".natal-report"));
  birthdayOutput.querySelector(".natal-report").outerHTML = NatalChart.report(natalModel,natalView,"all");
});
window.addEventListener("afterprint", () => {
  if (!natalModel) return;
  refreshNatalReport();
  if (natalPrintFocus) birthdayOutput.querySelector("[data-print-natal]")?.focus({preventScroll:true});
  natalPrintFocus = false;
});
const birthdayViews = [["sky", "Your sky"], ["chinese", "Chinese zodiac"], ["numbers", "Numerology"]];
function setBirthdayView(view) {
  if (!birthdayViews.some(([key]) => key === view)) return;
  birthdayView = view;
  birthdayOutput.querySelectorAll("[data-birthday-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.birthdayView === view)));
  birthdayOutput.querySelectorAll(".birthday-view").forEach(panel => { panel.hidden = panel.id !== `birthday-${view}`; });
}

function renderBirthdayProfile(saved = null) {
  const numberState = numerologyRoom?.getState();
  numerologyRoom?.destroy();
  numerologyRoom = null;
  const parts = birthdayParts(saved?.birthday || birthdayInput.value);
  birthdayProfileParts = parts;
  natalModel = null;
  if (!parts) {
    worldAtlas.setBirthChart(null);
    celestialExtras.setBirthChart(null);
    birthdayOutput.innerHTML = `<div class="birthday-empty"><strong>Set your birthday</strong> to open your sky portrait, Chinese zodiac and numerology studio. Numerology needs only your birth date. Your birthday details stay in this browser.</div>`;
    return;
  }
  const natal = NatalEngine.calculate({birthday:saved?.birthday || birthdayInput.value,time:saved?.time || "",location:saved?.placeLocation,houseSystem:saved?.houseSystem || "placidus",fold:saved?.fold || "",orbScale:saved?.orbScale || 1});
  if(natal.status === "ready") natalModel = natal;
  worldAtlas.setBirthChart(natal);
  celestialExtras.setBirthChart(natal);
  document.querySelector("#birth-fold-field").hidden = natal.status !== "ambiguous" && !natal.ambiguousTime;
  const sign = natalModel ? zodiacSigns[natalModel.points[0].index] : zodiacFor(parts);
  const moon = natalModel ? {name:moonNames[Math.round(natalModel.moonPhase / 45) % 8],illumination:Math.round(natalModel.moonIllumination * 100)} : moonPhaseFor(parts.date);
  const decan = natalModel ? `${["1st","2nd","3rd"][Math.floor((natalModel.points[0].longitude % 30) / 10)]} decan` : decanFor(parts,sign);
  const birthCard = tarotBirthCardFor(parts);
  const chinese = BirthdayInsights.chineseProfile(parts);
  const dateLabel = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parts.date);
  const timeLabel = saved?.time ? ` · ${escapeHTML(saved.time)}` : "";
  const placeLabel = saved?.place ? ` · ${escapeHTML(saved.place)}` : "";
  const elementMarks = {Fire:"△",Earth:"♁",Air:"≋",Water:"▽"};
  const planetMarks = {Mars:"♂",Venus:"♀",Mercury:"☿",Moon:"☾",Sun:"☉",Jupiter:"♃",Saturn:"♄"};
  const facts = [
    ["Ruling planet", sign.ruler, "Traditional + modern ruler", planetMarks[sign.ruler.split(" · ")[0]] || "☉"],
    ["Birthstone", birthstones[parts.month], sign.stones, "◇"],
    ["Birth flower", sign.flower, "Seasonal flower lore", "✿"],
    ["Moon phase", moon.name, `${natalModel ? "" : "Approx. "}${moon.illumination}% illuminated`, "☾"],
    ["Chinese zodiac", chinese ? `${chinese.phase.name} ${chinese.animal.name}` : "Unavailable", chinese ? `${chinese.polarity} · lunar year ${chinese.year}` : "Calendar not supported for this date", "☯"],
    ["Tarot birth card", `${birthCard.number} · ${birthCard.name}`, birthCard.keywords, "✧"]
  ];
  birthdayOutput.innerHTML = `<div class="birthday-navigation" role="group" aria-label="Birthday perspectives">${birthdayViews.map(([key, label]) => `<button type="button" data-birthday-view="${key}" aria-controls="birthday-${key}" aria-pressed="${key === birthdayView}">${label}</button>`).join("")}</div>
  <div id="birthday-sky" class="birthday-view sky-summary"${birthdayView === "sky" ? "" : " hidden"}>
    ${natalModel ? NatalChart.bigThree(natalModel) : `<div class="natal-notice" role="status"><strong>Your full natal chart</strong><p>${escapeHTML(natal.message)}</p></div>`}
    <div class="celestial-portrait">
      <div class="sky-chart-wrap"><button type="button" class="sky-chart-launch" ${natalModel ? 'data-open-natal="point" data-natal-key="Sun" aria-label="Explore your full natal chart"' : `data-open-sky="${sign.name}" aria-label="Explore your ${sign.name} sky chart"`}>${natalModel ? NatalChart.renderWheel(natalModel) : SkyChart.render(zodiacSigns,sign.name)}<span class="sky-chart-invitation"><span aria-hidden="true">⌕</span> ${natalModel ? "Explore your natal chart" : "Explore your zodiac guide"} <span aria-hidden="true">↗</span></span></button><p class="sky-chart-caption">${natalModel ? "Planets · houses · aspects · open to zoom & explore" : "Symbolic zodiac guide · birth time and location needed for a natal chart"}</p></div>
      <article class="horoscope-card"><p class="reading-label">Your sun sign · ${natalModel ? "calculated natal chart" : "birthday horoscope"}</p><h4>${sign.name}</h4><p class="zodiac-line">${dateLabel}${timeLabel}${placeLabel}</p><div class="sky-traits"><span><i aria-hidden="true">${elementMarks[sign.element]}</i> ${sign.element}</span><span>${sign.modality}</span><span>${decan}</span></div><div class="horoscope-copy"><p>${sign.horoscope}</p></div><p class="sky-mantra">${sign.mantra}<span aria-hidden="true">✦</span></p></article>
    </div>
    <dl class="sky-facts">${facts.map(([label, value, detail, mark]) => `<div class="sky-fact"><dt><span class="sky-fact-symbol" aria-hidden="true">${SkyChart.glyph(mark)}</span>${label}</dt><dd>${value}<small>${detail}</small></dd></div>`).join("")}</dl>
    <div class="horoscope-lenses">${["Connections", "Work & creativity", "Rest & growth"].map((label, index) => `<article><span class="lens-ornament" aria-hidden="true">${["☌","✷","☾"][index]}</span><div><h5>${label}</h5><p>${BirthdayInsights.westernThemes[sign.name][index]}</p></div></article>`).join("")}</div>
    ${natalModel ? NatalChart.report(natalModel,natalView,natalAspectFilter) : '<details class="insight-method"><summary>About your sky portrait</summary><p>Without a birth time and confirmed location, sun signs and decans use approximate date ranges and moon phase uses an average lunar cycle. Enter those details to calculate planets, rising sign, houses and aspects.</p></details>'}
  </div>
  <div id="birthday-chinese" class="birthday-view"${birthdayView === "chinese" ? "" : " hidden"}>${BirthdayInsights.renderChinese(chinese, saved?.time || "")}</div>
  <div id="birthday-numbers" class="birthday-view"${birthdayView === "numbers" ? "" : " hidden"}></div>
  <p class="birthday-privacy">Your birthday details are saved in this browser. Choose a perspective to explore another tradition.</p>`;
  numerologyRoom = Numerology.attach(birthdayOutput.querySelector("#birthday-numbers"), parts, numberState);
}

birthdayInput.max = localDateKey();
birthdayOutput.addEventListener("click", event => {
  const natalButton = event.target.closest("[data-open-natal]");
  if(natalButton && natalModel) {skyExplorer.openNatal(natalModel,natalButton,{kind:natalButton.dataset.openNatal,key:natalButton.dataset.natalKey});return;}
  const reportButton = event.target.closest("[data-natal-view]");
  if(reportButton && natalModel) {natalView = reportButton.dataset.natalView;refreshNatalReport();birthdayOutput.querySelector(`[data-natal-view="${natalView}"]`).focus({preventScroll:true});return;}
  if(event.target.closest("[data-print-natal]")) {window.print();return;}
  const skyButton = event.target.closest("[data-open-sky]");
  if (skyButton) { skyExplorer.open(skyButton.dataset.openSky,skyButton); return; }
  const viewButton = event.target.closest("[data-birthday-view]");
  if (viewButton) { setBirthdayView(viewButton.dataset.birthdayView); return; }
  const numberButton = event.target.closest("[data-lo-shu]");
  if (!numberButton || !birthdayProfileParts) return;
  birthdayOutput.querySelectorAll("[data-lo-shu]").forEach(button => button.setAttribute("aria-pressed", String(button === numberButton)));
  birthdayOutput.querySelector("#lo-shu-detail").innerHTML = BirthdayInsights.numberDetail(BirthdayInsights.numberStudy(birthdayProfileParts), Number(numberButton.dataset.loShu));
});
 birthdayOutput.addEventListener("change",event=>{if(event.target.id === "natal-aspect-filter") {natalAspectFilter=event.target.value;refreshNatalReport();birthdayOutput.querySelector("#natal-aspect-filter").focus({preventScroll:true});}});
manualLocationInput.addEventListener("change",()=>{manualFields.disabled = !manualLocationInput.checked;manualFields.hidden = !manualLocationInput.checked;});
birthdayForm.addEventListener("invalid",event=>{const details=event.target.closest("details");if(details) details.open=true;},true);
for(const input of [birthdayInput,birthTimeInput,birthPlaceInput]) input.addEventListener("input",()=>{foldInput.value="";});
try {document.querySelector("#birth-timezones").innerHTML=["UTC",...Intl.supportedValuesOf("timeZone")].map(zone=>`<option value="${zone}"></option>`).join("");} catch { /* Manual IANA names remain usable. */ }

birthdayForm.addEventListener("submit", event => {
  event.preventDefault();
  const manual = manualLocationInput.checked ? {source:"manual",label:birthPlaceInput.value.trim() || "Custom location",latitude:Number(document.querySelector("#birth-latitude").value),longitude:Number(document.querySelector("#birth-longitude").value),timeZone:document.querySelector("#birth-timezone").value.trim()} : null;
  const saved = { birthday: birthdayInput.value, time: birthTimeInput.value, place: birthPlaceInput.value.trim() || manual?.label || "", placeLocation: manual || birthplacePicker.getSelection(),houseSystem:houseSystemInput.value,orbScale:Number(orbScaleInput.value),fold:foldInput.value };
  try { IshtarStorage.setItem("arcana-birthday-profile-v1", JSON.stringify(saved)); } catch (error) { /* no-op */ }
  renderBirthdayProfile(saved);
});

try {
  const savedBirthday = JSON.parse(IshtarStorage.getItem("arcana-birthday-profile-v1"));
  if (savedBirthday?.birthday) {
    birthdayInput.value = savedBirthday.birthday;
    birthTimeInput.value = savedBirthday.time || "";
    birthPlaceInput.value = savedBirthday.place || "";
    birthplacePicker.restore(savedBirthday.placeLocation);
    houseSystemInput.value = ["placidus","whole-sign","equal"].includes(savedBirthday.houseSystem) ? savedBirthday.houseSystem : "placidus";
    orbScaleInput.value = [0.75,1,1.25].includes(Number(savedBirthday.orbScale)) ? String(savedBirthday.orbScale) : "1";
    foldInput.value = savedBirthday.fold || "";
    if(savedBirthday.placeLocation?.source === "manual") {
      manualLocationInput.checked=true;manualFields.disabled=false;manualFields.hidden=false;
      document.querySelector("#birth-latitude").value=savedBirthday.placeLocation.latitude;
      document.querySelector("#birth-longitude").value=savedBirthday.placeLocation.longitude;
      document.querySelector("#birth-timezone").value=savedBirthday.placeLocation.timeZone;
    }
    renderBirthdayProfile(savedBirthday);
    if(!savedBirthday.placeLocation && savedBirthday.time && savedBirthday.place) birthplacePicker.resolveSaved().then(location=>{
      if(!location || birthdayInput.value!==savedBirthday.birthday || birthTimeInput.value!==savedBirthday.time) return;
      savedBirthday.placeLocation=location;savedBirthday.place=location.label;
      try {IshtarStorage.setItem("arcana-birthday-profile-v1",JSON.stringify(savedBirthday));} catch { /* no-op */ }
      renderBirthdayProfile(savedBirthday);
    });
  } else {
    renderBirthdayProfile();
  }
} catch (error) {
  renderBirthdayProfile();
}

const readingOutput = document.querySelector("#reading-output");
const drawReadingButton = document.querySelector("#draw-reading");
let readingMode = "daily";
let currentSpread = null;
let revealedDailyDate = null;
const revealedSpread = new Set();
const tarotSettings = document.querySelector("#tarot-settings");
const tarotSpreadSelect = document.querySelector("#tarot-spread");
const tarotFocusSelect = document.querySelector("#tarot-focus");
const tarotQuestionInput = document.querySelector("#tarot-question");
const ishtarLibrary = document.querySelector("#ishtar-deck");
const ishtarGrid = document.querySelector("#ishtar-grid");
const ishtarSearch = document.querySelector("#ishtar-search");
let ishtarFilter = "all";
let ishtarVisibleIndices = [];
let deckReviewIndex = null;
let cardDetailState = null;

function selectReadingDeck(id) {
  if (!Object.hasOwn(readingDecks, id)) return;
  activeReadingDeck = id;
  try { IshtarStorage.setItem("arcana-reading-deck-v1", id); } catch { /* no-op */ }
  const url = new URL(location.href);
  url.searchParams.set("deck", id);
  try { history.replaceState(null, "", url); } catch { /* Direct file previews can restrict history updates. */ }
  renderReading();
  if (dialog.open && cardDetailState) {
    const { index, orientation, browsing } = cardDetailState;
    openCardDetails(index, orientation, browsing);
  }
}

function renderIshtarDeck() {
  const deck = readingDecks[activeReadingDeck];
  document.querySelector("#ishtar-title").textContent = deck.name;
  document.querySelector("#reading-deck-description").textContent = deck.description + " Explore all 78 cards and the matching back.";
  const query = ishtarSearch.value.trim().toLowerCase();
  ishtarVisibleIndices = tarotCards.flatMap((card, index) => {
    const matchesGroup = ishtarFilter === "all" || card.type === ishtarFilter || card.suit === ishtarFilter;
    return matchesGroup && `${card.name} ${card.keywords}`.toLowerCase().includes(query) ? [index] : [];
  });
  const showBack = (ishtarFilter === "all" || ishtarFilter === "back") && `card back ${deck.name} ${deck.back}`.toLowerCase().includes(query);
  if (showBack) ishtarVisibleIndices.push(tarotCards.length);
  const frontCount = ishtarVisibleIndices.length - Number(showBack);
  document.querySelector("#ishtar-results").textContent = `${frontCount} card${frontCount === 1 ? "" : "s"}${showBack ? " + card back" : ""}`;
  document.querySelector("#ishtar-empty").hidden = ishtarVisibleIndices.length > 0;
  ishtarGrid.innerHTML = ishtarVisibleIndices.map(index => {
    const card = tarotCards[index];
    const name = card?.name || "Card back";
    const group = card ? (card.type === "major" ? `Major Arcana · ${card.number}` : `${card.suit} · ${card.number}`) : "The matching back";
    const source = readingArt(index);
    return `<button type="button" class="ishtar-card" data-ishtar-card="${index}" aria-label="View ${name} large">
      <img src="${source}" alt="${name} artwork" loading="lazy" decoding="async" width="360" height="597">
      <span class="ishtar-card-group">${group}</span><span class="ishtar-card-name">${name}</span>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-ishtar-filter]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.ishtarFilter === ishtarFilter));
  });
}

function setReadingMode(mode) {
  readingMode = mode;
  document.querySelectorAll("[data-reading-mode]").forEach(button => {
    const active = button.dataset.readingMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderReading();
}

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
    const saved = JSON.parse(IshtarStorage.getItem(key));
    if (saved && Number.isInteger(saved.index) && tarotCards[saved.index]) return saved;
  } catch (error) {
    // Private browsing can disable localStorage; the draw still works for this session.
  }
  const index = hashString(localDateKey()) % tarotCards.length;
  const reading = { index, orientation: orientationFor(`${localDateKey()}-orientation`) };
  try { IshtarStorage.setItem(key, JSON.stringify(reading)); } catch (error) { /* no-op */ }
  return reading;
}

function dealSpread() {
  currentSpread = TarotReadings.deal(tarotSpreadSelect.value, tarotCards, randomInt, tarotQuestionInput.value, tarotFocusSelect.value);
  revealedSpread.clear();
  renderReading(true);
}

function cardVisual(card, orientation, slot = "daily") {
  const cardIndex = tarotCards.indexOf(card);
  const revealed = slot === "daily" ? revealedDailyDate === localDateKey() : revealedSpread.has(slot);
  const positionLabel = slot === "daily" ? "your daily card" : `${slot + 1}: ${TarotReadings.spreads[currentSpread.id].positions[slot].name}`;
  return `<button type="button" class="drawn-card drawn-card-button flip-card${revealed ? " is-revealed" : ""}" data-card-view="${cardIndex}" data-card-orientation="${orientation}" data-reveal-slot="${slot}" aria-label="${revealed ? `View ${card.name}, ${orientation}, large` : `Reveal ${positionLabel}`}">
    <span class="flip-card-rotor">
      <span class="flip-card-side flip-card-back" aria-hidden="true"><img src="${readingArt(tarotCards.length)}" alt=""></span>
      <span class="flip-card-side flip-card-front${orientation === "reversed" ? " is-reversed" : ""}" aria-hidden="true"><img src="${readingArt(cardIndex)}" alt=""></span>
    </span>
  </button>`;
}

function revealCard(button) {
  if (!button || button.classList.contains("is-revealed")) return;
  const slot = button.dataset.revealSlot;
  if (slot === "daily") revealedDailyDate = localDateKey();
  else revealedSpread.add(Number(slot));
  button.classList.add("is-revealed");
  button.setAttribute("aria-label", `View ${tarotCards[Number(button.dataset.cardView)].name}, ${button.dataset.cardOrientation}, large`);
  if (slot === "daily") {
    const container = button.closest(".daily-reading");
    container.querySelector(".reveal-invitation").hidden = true;
    container.querySelector(".revealed-copy").hidden = false;
    container.querySelector(".reading-copy").setAttribute("aria-live", "polite");
  } else updateSpreadReport(Number(slot));
}

function updateSpreadReport(lastSlot) {
  if (readingMode !== "spread" || !currentSpread) return;
  const complete = revealedSpread.size === currentSpread.cards.length;
  readingOutput.querySelector("#tarot-reading-report").innerHTML = TarotReadings.reportHTML(currentSpread, tarotCards, revealedSpread);
  const last = Number.isInteger(lastSlot) ? currentSpread.cards[lastSlot] : null;
  readingOutput.querySelector("#tarot-reveal-status").textContent = `${revealedSpread.size} of ${currentSpread.cards.length} cards revealed${last ? ` · ${tarotCards[last.index].name}, ${last.orientation}` : ""}${complete ? " · Your full reading is ready below." : ""}`;
  readingOutput.querySelectorAll("[data-tarot-position]").forEach(button => {
    const slot = Number(button.dataset.tarotPosition), open = revealedSpread.has(slot);
    const position = TarotReadings.spreads[currentSpread.id].positions[slot];
    button.classList.toggle("is-open", open);
    button.querySelector("small").textContent = open ? "Read meaning ↓" : "Turn over";
    button.setAttribute("aria-label", open ? `Read ${slot+1}: ${position.name}, ${tarotCards[currentSpread.cards[slot].index].name}` : `Reveal ${slot+1}: ${position.name}`);
  });
  readingOutput.querySelectorAll('[data-tarot-action="next"], [data-tarot-action="all"]').forEach(button=>{button.disabled=complete;});
  window.MobileSections?.enhance();
}

function readingCopy(card, orientation) {
  return orientation === "upright" ? card.upright : card.reversed;
}

function openCardDetails(index, orientation = "upright", browsing = false) {
  const card = tarotCards[index];
  const isBack = index === tarotCards.length;
  if (!card && !isBack) return;
  deckReviewIndex = browsing ? index : null;
  cardDetailState = { index, orientation, browsing };
  const name = card?.name || "Card back";
  const deck = readingDecks[activeReadingDeck];
  const image = readingArt(index, "large");
  const imageMarkup = `<img src="${image}" alt="${name} artwork large" class="card-detail-image${orientation === "reversed" ? " is-reversed" : ""}">`;
  const reviewPosition = ishtarVisibleIndices.indexOf(index);
  const navigation = browsing ? `<nav class="deck-review-nav" aria-label="Deck review navigation">
    <button type="button" data-review-step="-1" ${reviewPosition <= 0 ? "disabled" : ""}>← Previous</button>
    <span role="status">${reviewPosition + 1} of ${ishtarVisibleIndices.length}</span>
    <button type="button" data-review-step="1" ${reviewPosition >= ishtarVisibleIndices.length - 1 ? "disabled" : ""}>Next →</button>
  </nav>` : "";
  const deckSwitcher = `<label class="card-deck-switcher" for="card-detail-deck">
    <span>Deck</span>
    <select id="card-detail-deck" aria-describedby="card-deck-help">
      ${Object.entries(readingDecks).map(([id, item]) => `<option value="${id}" ${id === activeReadingDeck ? "selected" : ""}>${item.name}</option>`).join("")}
    </select>
    <small id="card-deck-help">Same card, another deck</small>
  </label>`;
  const notes = isBack ? `<div class="deck-meta"><span>${deck.name}</span><span>Reverse side</span></div>
      <h2 id="card-detail-title">Card back</h2><p class="detail-note">${deck.back}</p>` : `
      <div class="deck-meta"><span>${card.type === "major" ? "Major arcana" : `Minor arcana · ${card.suit}`}</span><span>${orientation}</span></div>
      <h2 id="card-detail-title">${card.name}</h2>
      <p class="detail-artist">${card.number} · ${card.keywords}</p>
      <dl>
        <dt>Keywords</dt><dd>${card.keywords}</dd>
        <dt>Upright</dt><dd>${card.upright}</dd>
        <dt>Reversed</dt><dd>${card.reversed}</dd>
      </dl>
      <p class="detail-note"><strong>Reflection prompt:</strong> ${card.prompt}</p>`;
  dialogContent.innerHTML = `<div class="card-detail-toolbar">${navigation}${deckSwitcher}</div><div class="card-detail-layout">
    <div class="card-detail-art">${imageMarkup}<span class="card-detail-zoom">${deck.name} · full artwork</span></div>
    <div class="detail-copy">
      ${notes}
      <a class="source-link" href="${image}" target="_blank" rel="noopener">Open large artwork ↗</a>
    </div>
  </div>`;
  dialog.classList.add("is-card-view");
  dialog.removeAttribute("aria-label");
  dialog.setAttribute("aria-labelledby", "card-detail-title");
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function stepDeckReview(step) {
  if (deckReviewIndex === null) return;
  const nextIndex = ishtarVisibleIndices[ishtarVisibleIndices.indexOf(deckReviewIndex) + step];
  if (nextIndex === undefined) return;
  openCardDetails(nextIndex, "upright", true);
  const nextButton = dialogContent.querySelector(`[data-review-step="${step}"]:not(:disabled)`)
    || dialogContent.querySelector("[data-review-step]:not(:disabled)");
  nextButton?.focus({ preventScroll: true });
}

function renderReading(animateDeal = false) {
  document.querySelector(".reading-room").dataset.deck = activeReadingDeck;
  document.querySelector(".reading-badge").textContent = `${readingDecks[activeReadingDeck].name} · 78 cards`;
  document.querySelectorAll("[data-reading-deck]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.readingDeck === activeReadingDeck));
  });
  const browsing = readingMode === "deck";
  tarotSettings.hidden = readingMode !== "spread";
  ishtarLibrary.hidden = !browsing;
  readingOutput.hidden = browsing;
  drawReadingButton.hidden = browsing;
  if (browsing) {
    renderIshtarDeck();
    return;
  }
  if (readingMode === "daily") {
    const reading = getDailyReading();
    const card = tarotCards[reading.index];
    readingOutput.innerHTML = `<div class="daily-reading">
      ${cardVisual(card, reading.orientation)}
      <div class="reading-copy">
        <div class="reveal-invitation" ${revealedDailyDate === localDateKey() ? "hidden" : ""}><p class="reading-label">Today · ${localDateKey()}</p><h3>A moment for you</h3><p>Take a breath, then tap the deck to turn over your daily card.</p></div>
        <div class="revealed-copy" ${revealedDailyDate === localDateKey() ? "" : "hidden"}>
        <p class="reading-label">Today · ${localDateKey()}</p>
        <h3>${card.name}</h3>
        <span class="orientation">${reading.orientation}</span>
        <p>${readingCopy(card, reading.orientation)}</p>
        <p class="prompt"><strong>Try this:</strong> ${card.prompt}</p>
        <div class="tarot-daily-depth"><p><strong>A theme to carry:</strong> ${card.keywords}.</p><p>Notice one moment today when this theme comes into view. Before bed, return to the card and write down what you noticed, what surprised you, and one choice you want to carry into tomorrow.</p></div></div>
      </div>
    </div>`;
    drawReadingButton.innerHTML = "<span>✦</span> Show today's card";
    drawReadingButton.setAttribute("aria-label", "Show today's card");
    return;
  }

  if (!currentSpread) {
    currentSpread = TarotReadings.deal(tarotSpreadSelect.value, tarotCards, randomInt, tarotQuestionInput.value, tarotFocusSelect.value);
    animateDeal = true;
  }
  readingOutput.innerHTML = TarotReadings.tableHTML(currentSpread, tarotCards, revealedSpread, cardVisual, animateDeal);
  updateSpreadReport();
  drawReadingButton.innerHTML = "<span>✦</span> Shuffle &amp; deal";
  drawReadingButton.setAttribute("aria-label", "Shuffle and deal a new reading with your selected focus and question");
}

document.querySelectorAll("[data-reading-deck]").forEach(button => button.addEventListener("click", () => {
  selectReadingDeck(button.dataset.readingDeck);
}));
document.querySelectorAll(".reading-tab").forEach(button => button.addEventListener("click", () => {
  setReadingMode(button.dataset.readingMode);
}));
ishtarLibrary.addEventListener("click", event => {
  const filter = event.target.closest("[data-ishtar-filter]");
  if (filter) {
    ishtarFilter = filter.dataset.ishtarFilter;
    renderIshtarDeck();
  }
  const card = event.target.closest("[data-ishtar-card]");
  if (card) openCardDetails(Number(card.dataset.ishtarCard), "upright", true);
});
ishtarSearch.addEventListener("input", renderIshtarDeck);
document.querySelector("#ishtar-reset").addEventListener("click", () => {
  ishtarFilter = "all";
  ishtarSearch.value = "";
  renderIshtarDeck();
  ishtarSearch.focus();
});
dialogContent.addEventListener("click", event => {
  const button = event.target.closest("[data-review-step]");
  if (button) stepDeckReview(Number(button.dataset.reviewStep));
});
dialogContent.addEventListener("change", event => {
  if (event.target.id !== "card-detail-deck") return;
  selectReadingDeck(event.target.value);
  dialogContent.querySelector("#card-detail-deck")?.focus({ preventScroll: true });
});

dialog.addEventListener("close", () => {
  const card = cardDetailState;
  deckReviewIndex = null;
  cardDetailState = null;
  if (card) {
    const selector = card.browsing ? `[data-ishtar-card="${card.index}"]` : `[data-card-view="${card.index}"]`;
    document.querySelector(selector)?.focus({ preventScroll: true });
  }
});
dialog.addEventListener("keydown", event => {
  if (deckReviewIndex !== null && ["ArrowLeft", "ArrowRight"].includes(event.key)
      && !event.target.closest("input, textarea, select, [contenteditable]")) {
    event.preventDefault();
    stepDeckReview(event.key === "ArrowRight" ? 1 : -1);
  }
});
drawReadingButton.addEventListener("click", () => {
  if (readingMode === "daily") {
    const button = readingOutput.querySelector("[data-reveal-slot]");
    if (button?.classList.contains("is-revealed")) openCardDetails(Number(button.dataset.cardView), button.dataset.cardOrientation);
    else revealCard(button);
    return;
  }
  dealSpread();
});
tarotSpreadSelect.addEventListener("change", dealSpread);
readingOutput.addEventListener("click", event => {
  const positionButton = event.target.closest("[data-tarot-position]");
  if (positionButton) {
    const slot=Number(positionButton.dataset.tarotPosition);
    if (!revealedSpread.has(slot)) revealCard(readingOutput.querySelector(`[data-reveal-slot="${slot}"]`));
    const chapter = readingOutput.querySelector(`#tarot-position-${slot}`);
    const chapterTarget = window.MobileSections?.reveal(chapter) || chapter;
    if (chapterTarget === chapter) chapter.setAttribute("tabindex", "-1");
    chapterTarget.focus({preventScroll:true});
    chapterTarget.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    return;
  }
  const actionButton = event.target.closest("[data-tarot-action]");
  if (actionButton) {
    const action=actionButton.dataset.tarotAction;
    if (action === "zoom") {
      const table=readingOutput.querySelector(".tarot-layout-scroll");
      const enlarged=table.classList.toggle("is-enlarged");
      actionButton.setAttribute("aria-pressed", String(enlarged));
      actionButton.textContent=enlarged?'Fit layout':'Enlarge layout';
      return;
    }
    const pending=[...readingOutput.querySelectorAll('[data-reveal-slot]:not(.is-revealed)')];
    if(action==='next') revealCard(pending[0]);
    if(action==='all') {
      const draw=currentSpread;
      actionButton.disabled=true;
      const interval=matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;
      pending.forEach((button,i)=>setTimeout(()=>{if(button.isConnected && currentSpread===draw)revealCard(button);},i*interval));
    }
    return;
  }
  const button = event.target.closest("[data-card-view]");
  if (!button) return;
  if (!button.classList.contains("is-revealed")) revealCard(button);
  else openCardDetails(Number(button.dataset.cardView), button.dataset.cardOrientation);
});

function setArchiveFilter(filter) {
  const selected = ["all", "new", "historical", "modern"].includes(filter) ? filter : "all";
  document.querySelectorAll(".filter").forEach(item => {
    const active = item.dataset.filter === selected;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  render();
}
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => setArchiveFilter(button.dataset.filter)));
search.addEventListener("input", render);
document.querySelector("#clear-search").addEventListener("click", () => { search.value = ""; render(); search.focus(); });
gallery.addEventListener("click", event => { const button = event.target.closest("[data-open]"); if (button) openDetails(button.dataset.open); });
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
document.addEventListener("keydown", event => {
  if (event.key === "/" && !dialog.open && !document.querySelector("#sky-dialog").open && !event.target.closest("input, textarea, select, [contenteditable]")) {
    event.preventDefault();
    const target = readingMode === "deck" ? ishtarSearch : search;
    window.MobileSections?.reveal(target);
    target.focus();
  }
});
window.addEventListener("hashchange", () => {
  if (location.hash === "#ishtar-deck") setReadingMode("deck");
  if (location.hash === "#birthday-numbers") {
    setBirthdayView("numbers");
    (document.querySelector("#birthday-numbers") || document.querySelector("#birthday-room")).scrollIntoView({block:"start"});
  }
});
setReadingMode(location.hash === "#ishtar-deck" ? "deck" : "daily");
const archiveCounts = {all:decks.length,new:decks.filter(isNewArchiveDeck).length,historical:decks.filter(deck=>deck.category==='historical').length,modern:decks.filter(deck=>deck.category==='modern').length};
Object.entries(archiveCounts).forEach(([key,count]) => {document.querySelector(`#${key}-count`).textContent=count;});
document.querySelector("#archive-total").textContent = `${decks.length} decks`;
setArchiveFilter(new URLSearchParams(location.search).get("archive"));
