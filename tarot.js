/* The tarot reading room: the 78-card catalogue, the reading decks, the daily card, the
   spreads, the Ishtar deck browser and the card detail dialog. Moved verbatim out of
   app.js. #detail-dialog is shared with the deck archive, which owns its own listeners
   on it and clears this room's card-detail state through window.TarotRoom. */
(() => {
  'use strict';
  const {majorArcana, localDateKey} = BirthLore;

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
    ishtar: { name: "Ishtar Insights", assets: "/assets/ishtar-deck", description: "A luminous world of lotus symbolism, deep violet and holographic reflections.", back: "The shared mirrored lotus back for all 78 cards." },
    moebius: { name: "Moebius-inspired", assets: "/assets/light-minimal-deck", description: "Fine ink, open skies and strange horizons. A light, minimal deck with clear cerulean, coral and lavender color.", back: "Floating stone forms and celestial geometry echo the deck’s open skies in a reversible design." },
    "arts-and-crafts": { name: "Arts & Crafts", assets: "/assets/arts-and-crafts-deck", description: "Botanical woodcut scenes in forest green, madder red and ochre, with quiet references to craft, initiation and Masonic geometry.", back: "A botanical repeat with acacia, oak, drawing compasses and measured geometry, designed for both orientations." },
    bacon: { name: "Francis Bacon-inspired", assets: "/assets/expressive-figures-deck", description: "Erased faces, dragged paint and isolated figures inhabit deep black spaces. Bruised violet, oxblood and harsh ochre give familiar tarot symbols an unsettling psychological intensity.", back: "Opposed gestural figures and geometric enclosures carry the deck’s painterly tension into an abstract two-way back." }
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
  const dialog = document.querySelector("#detail-dialog");
  const dialogContent = document.querySelector("#dialog-content");
  const readingOutput = document.querySelector("#reading-output");
  const drawReadingButton = document.querySelector("#draw-reading");
  let readingMode = "daily";
  let currentSpread = null;
  let loadedDaily = null;
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

  const forgetCardInUrl = () => {
    const url = new URL(location.href);
    url.searchParams.delete("card");
    try { history.replaceState(null, "", url); } catch { /* Direct file previews can restrict history updates. */ }
  };

  function selectReadingDeck(id, { render = true } = {}) {
    if (!Object.hasOwn(readingDecks, id)) return;
    activeReadingDeck = id;
    try { IshtarStorage.setItem("arcana-reading-deck-v1", id); } catch { /* no-op */ }
    const url = new URL(location.href);
    url.searchParams.set("deck", id);
    try { history.replaceState(null, "", url); } catch { /* Direct file previews can restrict history updates. */ }
    if (render) renderReading();
    if (dialog.open && cardDetailState) {
      const { index, orientation, browsing } = cardDetailState;
      openCardDetails(index, orientation, browsing);
    }
  }

  function renderIshtarDeck() {
    const deck = readingDecks[activeReadingDeck];
    document.querySelector("#ishtar-title").textContent = deck.name;
    document.querySelector("#reading-deck-description").textContent = deck.description + " Choose any of the 78 cards to read its entry, or the matching back.";
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

  function setReadingMode(mode, { render = true } = {}) {
    loadedDaily = null;
    readingMode = mode;
    document.querySelectorAll("[data-reading-mode]").forEach(button => {
      const active = button.dataset.readingMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (render) renderReading();
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

  function dailyRevealed() { return loadedDaily ? true : revealedDailyDate === localDateKey(); }

  const dealOptions = () => ({
    reversals: document.querySelector("#tarot-reversals")?.checked !== false,
    majorsOnly: document.querySelector("#tarot-majors")?.checked === true,
    dealtAt: localDateKey()
  });

  function dealSpread() {
    currentSpread = TarotReadings.deal(tarotSpreadSelect.value, tarotCards, randomInt, tarotQuestionInput.value, tarotFocusSelect.value, dealOptions());
    revealedSpread.clear();
    renderReading(true);
  }

  function cardVisual(card, orientation, slot = "daily") {
    const cardIndex = tarotCards.indexOf(card);
    const revealed = slot === "daily" ? dailyRevealed() : revealedSpread.has(slot);
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

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  // dealtAt is a local YYYY-MM-DD key. The wheel starts with the month AFTER it, so month+i
  // indexes the following month directly: for a September deal, month is 9 and MONTH_NAMES[9]
  // is October. Math.floor(m / 12) carries the year over at the December boundary.
  function yearMonthLabels(dealtAt) {
    const [year, month] = String(dealtAt).split("-").map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return [];
    return Array.from({length: 12}, (_, i) => {
      const m = month + i;
      return `${MONTH_NAMES[m % 12]} ${year + Math.floor(m / 12)}`;
    });
  }

  // updateSpreadReport is the one function that runs after both a fresh table render (right
  // after tableHTML writes readingOutput.innerHTML) and every later reveal, so it is also the
  // single place to relabel the year wheel's twelve month positions. Doing it here means the
  // aria-label it builds carries the month directly, instead of a correct label being
  // overwritten back to the engine's date-agnostic ordinal ("The first month ahead") the next
  // time a card is revealed.
  function updateSpreadReport(lastSlot) {
    if (readingMode !== "spread" || !currentSpread) return;
    const complete = revealedSpread.size === currentSpread.cards.length;
    readingOutput.querySelector("#tarot-reading-report").innerHTML = TarotReadings.reportHTML(currentSpread, tarotCards, revealedSpread);
    const last = Number.isInteger(lastSlot) ? currentSpread.cards[lastSlot] : null;
    readingOutput.querySelector("#tarot-reveal-status").textContent = `${revealedSpread.size} of ${currentSpread.cards.length} cards revealed${last ? ` · ${tarotCards[last.index].name}, ${last.orientation}` : ""}${complete ? " · Your full reading is ready below." : ""}`;
    // Index 0 is the theme at the centre and is left alone; the twelve months follow it. A
    // malformed or missing date leaves the ordinal labels in place rather than blanking them.
    const monthLabels = currentSpread.id === "year" ? yearMonthLabels(currentSpread.dealtAt) : [];
    if (monthLabels.length === 12) {
      readingOutput.querySelectorAll(".tarot-table-label").forEach((place, i) => {
        if (i >= 1 && i <= 12) place.textContent = monthLabels[i - 1];
      });
    }
    readingOutput.querySelectorAll("[data-tarot-position]").forEach(button => {
      const slot = Number(button.dataset.tarotPosition), open = revealedSpread.has(slot);
      const position = TarotReadings.spreads[currentSpread.id].positions[slot];
      const monthLabel = monthLabels.length === 12 && slot >= 1 && slot <= 12 ? monthLabels[slot - 1] : null;
      const label = monthLabel || position.name;
      button.classList.toggle("is-open", open);
      button.querySelector("small").textContent = open ? "Read meaning ↓" : "Turn over";
      if (monthLabel && button.childNodes[1]) button.childNodes[1].textContent = monthLabel;
      button.setAttribute("aria-label", open ? `Read ${slot+1}: ${label}, ${tarotCards[currentSpread.cards[slot].index].name}` : `Reveal ${slot+1}: ${label}`);
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
    const ref = typeof TarotReference !== 'undefined' && !isBack ? TarotReference.entry(index) : null;
    const referenceMarkup = ref ? `
        ${ref.attribution ? `<p class="card-attribution"><span>Attribution</span> ${ref.attribution.line}</p>` : ''}
        ${ref.reference ? `<p class="card-reference">${ref.reference}</p>` : ''}` : '';
    const notes = isBack ? `<div class="deck-meta"><span>${deck.name}</span><span>Reverse side</span></div>
        <h2 id="card-detail-title">Card back</h2><p class="detail-note">${deck.back}</p>` : `
        <div class="deck-meta"><span>${card.type === "major" ? "Major arcana" : `Minor arcana · ${card.suit}`}</span><span>${orientation}</span></div>
        <h2 id="card-detail-title">${card.name}</h2>
        <p class="detail-artist">${card.number} · ${card.keywords}</p>${referenceMarkup}
        <dl>
          <dt>Keywords</dt><dd>${card.keywords}</dd>
          <dt>Upright</dt><dd>${card.upright}</dd>
          <dt>Reversed</dt><dd>${card.reversed}</dd>
          <dt>Reflection</dt><dd>${card.prompt}</dd>
        </dl>`;
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
    if (browsing && isBack) forgetCardInUrl();
    else if (browsing && typeof TarotReference !== 'undefined') {
      const url = new URL(location.href);
      url.searchParams.set("card", TarotReference.slug(index));
      try { history.replaceState(null, "", url); } catch { /* Direct file previews can restrict history updates. */ }
    }
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

  function appendSaveControl() {
    const kind = readingMode === "daily" ? "tarot-daily" : "tarot-spread";
    const signedIn = window.IshtarAccount?.state().signedIn;
    const label = signedIn ? "Save this reading to my journal" : "Sign in to save this reading";
    readingOutput.insertAdjacentHTML("beforeend", `<p class="save-reading"><button type="button" data-save-reading="${kind}">${label}</button><span role="status" aria-live="polite"></span></p>`);
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
      const reading = loadedDaily || getDailyReading();
      const dateLabel = loadedDaily ? `Saved · ${loadedDaily.date}` : `Today · ${localDateKey()}`;
      const card = tarotCards[reading.index];
      readingOutput.innerHTML = `<div class="daily-reading">
        ${cardVisual(card, reading.orientation)}
        <div class="reading-copy">
          <div class="reveal-invitation" ${dailyRevealed() ? "hidden" : ""}><p class="reading-label">${dateLabel}</p><h3>A moment for you</h3><p>Take a breath, then tap the deck to turn over your daily card.</p></div>
          <div class="revealed-copy" ${dailyRevealed() ? "" : "hidden"}>
          <p class="reading-label">${dateLabel}</p>
          <h3>${card.name}</h3>
          <span class="orientation">${reading.orientation}</span>
          <p>${readingCopy(card, reading.orientation)}</p>
          <p class="prompt"><strong>Try this:</strong> ${card.prompt}</p>
          <div class="tarot-daily-depth"><p><strong>A theme to carry:</strong> ${card.keywords}.</p><p>Notice one moment today when this theme comes into view. Before bed, return to the card and write down what you noticed, what surprised you, and one choice you want to carry into tomorrow.</p></div></div>
        </div>
      </div>`;
      drawReadingButton.innerHTML = "<span>✦</span> Show today's card";
      drawReadingButton.setAttribute("aria-label", "Show today's card");
      appendSaveControl();
      return;
    }

    if (!currentSpread) {
      currentSpread = TarotReadings.deal(tarotSpreadSelect.value, tarotCards, randomInt, tarotQuestionInput.value, tarotFocusSelect.value, dealOptions());
      animateDeal = true;
    }
    readingOutput.innerHTML = TarotReadings.tableHTML(currentSpread, tarotCards, revealedSpread, cardVisual, animateDeal);
    updateSpreadReport();
    appendSaveControl();
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
    forgetCardInUrl();
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

  window.TarotRoom = {
    // The deck archive shares #detail-dialog and replaces its contents, so it clears the
    // card-detail state through here.
    clearCardDetail() { deckReviewIndex = null; cardDetailState = null; forgetCardInUrl(); },
    currentDraw() {
      if (readingMode === "daily") {
        const reading = loadedDaily || getDailyReading();
        const card = tarotCards[reading.index];
        return { kind: "tarot-daily", deck: activeReadingDeck, layout: "", question: "", focus: "", payload: { index: reading.index, orientation: reading.orientation, date: loadedDaily?.date || localDateKey() }, summary: `${card.name} · ${reading.orientation}` };
      }
      if (readingMode === "spread" && currentSpread) {
        const spreadName = TarotReadings.spreads[currentSpread.id].name;
        return { kind: "tarot-spread", deck: activeReadingDeck, layout: currentSpread.id, question: currentSpread.question, focus: currentSpread.focus, payload: currentSpread, summary: `${spreadName} · ${currentSpread.question || "no question"}`.slice(0, 120) };
      }
      return null;
    },
    loadDraw(reading) {
      const payload = reading?.payload;
      // Validate first, in both branches. Nothing below this point may run (deck switch,
      // mode switch, currentSpread/loadedDaily assignment, or any render) until we already
      // know the load will succeed, so a malformed payload leaves the deck, URL, storage, and
      // the reading currently on screen completely untouched.
      if (reading?.kind === "tarot-daily") {
        if (!payload || !Number.isInteger(payload.index) || !tarotCards[payload.index] || !["upright", "reversed"].includes(payload.orientation)) return false;
        if (Object.hasOwn(readingDecks, reading.deck)) selectReadingDeck(reading.deck, { render: false });
        setReadingMode("daily", { render: false });
        loadedDaily = { index: payload.index, orientation: payload.orientation, date: /^\d{4}-\d{2}-\d{2}$/.test(payload.date || "") ? payload.date : "earlier" };
        renderReading();
      } else if (reading?.kind === "tarot-spread") {
        const loaded = TarotReadings.loadSpread(payload, tarotCards.length);
        if (!loaded) return false;
        if (Object.hasOwn(readingDecks, reading.deck)) selectReadingDeck(reading.deck, { render: false });
        setReadingMode("spread", { render: false });
        currentSpread = loaded.spread;
        revealedSpread.clear();
        loaded.revealed.forEach(slot => revealedSpread.add(slot));
        tarotSpreadSelect.value = currentSpread.id; tarotFocusSelect.value = currentSpread.focus; tarotQuestionInput.value = currentSpread.question;
        renderReading(false);
      } else return false;
      const target = document.querySelector("#tarot-readings");
      (window.MobileSections?.reveal(target) || target).scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
  };
  for (const kind of ["tarot-daily", "tarot-spread"]) Rooms.register(kind, {
    label: kind === "tarot-daily" ? "Daily card" : "Tarot spread", category: "tarot",
    current: () => { const draw = window.TarotRoom.currentDraw(); return draw && draw.kind === kind ? draw : null; },
    load: reading => window.TarotRoom.loadDraw(reading)
  });
  document.addEventListener("ishtar-account-change", () => { if (readingMode !== "deck") renderReading(false); });

  document.addEventListener("keydown", event => {
    if (event.key === "/" && !dialog.open && !document.querySelector("#sky-dialog")?.open && !event.target.closest("input, textarea, select, [contenteditable]")) {
      event.preventDefault();
      const target = readingMode === "deck" ? ishtarSearch : document.querySelector("#search");
      window.MobileSections?.reveal(target);
      target.focus();
    }
  });
  window.addEventListener("hashchange", () => {
    if (location.hash === "#ishtar-deck") setReadingMode("deck");
  });
  const namedCard = typeof TarotReference !== 'undefined'
    ? TarotReference.indexForSlug(new URLSearchParams(location.search).get("card") || "")
    : -1;
  setReadingMode(namedCard >= 0 || location.hash === "#ishtar-deck" ? "deck" : "daily");
  if (namedCard >= 0) openCardDetails(namedCard, "upright", true);
})();
