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
render();
