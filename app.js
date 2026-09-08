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

const cardImages = Object.fromEntries(majorArcana.filter(card => card.image).map(card => [card.name, card.image]));

const gallery = document.querySelector("#gallery");
const emptyState = document.querySelector("#empty-state");
const resultTitle = document.querySelector("#result-title");
const resultCount = document.querySelector("#result-count");
const search = document.querySelector("#search");
const dialog = document.querySelector("#detail-dialog");
const dialogContent = document.querySelector("#dialog-content");

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

function getDailyReading() {
  const key = `arcana-daily-${localDateKey()}`;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isInteger(saved.index) && majorArcana[saved.index]) return saved;
  } catch (error) {
    // Private browsing can disable localStorage; the draw still works for this session.
  }
  const index = hashString(localDateKey()) % majorArcana.length;
  const reading = { index, orientation: orientationFor(`${localDateKey()}-orientation`) };
  try { localStorage.setItem(key, JSON.stringify(reading)); } catch (error) { /* no-op */ }
  return reading;
}

function drawPick3() {
  const seed = `${Date.now()}-${Math.random()}`;
  const order = majorArcana.map((card, index) => ({ card, index, sort: hashString(`${seed}-${index}`) })).sort((a, b) => a.sort - b.sort);
  return order.slice(0, 3).map((item, index) => ({
    index: item.index,
    orientation: orientationFor(`${seed}-${index}-orientation`),
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
    const card = majorArcana[reading.index];
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

  const cards = currentPick3.map(item => ({ ...item, card: majorArcana[item.index] }));
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
