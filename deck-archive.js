/* The deck archive: the reference gallery, its filters and search, and the deck-notes
   dialog. Moved verbatim out of app.js. The dialog element is shared with the tarot
   reading room's card detail view, which owns its own listeners on it. */
(() => {
  'use strict';
  const decks = ArchiveDecks;
  const latestArchiveBatch = decks.map(deck => deck.addedBatch).filter(Boolean).sort().at(-1);
  const isNewArchiveDeck = deck => Boolean(latestArchiveBatch && deck.addedBatch === latestArchiveBatch);

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
    // Opening deck notes replaces whatever the tarot room had in this shared dialog, so
    // its card-detail state has to be dropped with it. app.js did this with two local
    // assignments; across files it is the reading room's own reset.
    window.TarotRoom?.clearCardDetail?.();
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

  const archiveCounts = {all:decks.length,new:decks.filter(isNewArchiveDeck).length,historical:decks.filter(deck=>deck.category==='historical').length,modern:decks.filter(deck=>deck.category==='modern').length};
  Object.entries(archiveCounts).forEach(([key,count]) => {document.querySelector(`#${key}-count`).textContent=count;});
  // The live deck count sits in the hub's hero masthead, which the tarot page does not carry.
  const archiveTotal = document.querySelector("#archive-total");
  if (archiveTotal) archiveTotal.textContent = `${decks.length} decks`;
  // The archive mobile fold's subtitle mirrors that live count; set before mobile-sections.js runs.
  document.querySelector("#archive").dataset.foldSubtitle = `Browse ${decks.length} decks across five centuries`;
  setArchiveFilter(new URLSearchParams(location.search).get("archive"));
})();
