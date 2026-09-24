/* The sky portrait: the natal report and the sky-chart explorer, plus the other rooms
   that consume the resolved natal chart. Moved verbatim out of app.js.

   app.js called renderBirthdayProfile() explicitly after every BirthProfile write; here
   the render is a BirthProfile subscriber instead, so the birth form no longer reaches
   into this room.

   The site split loads this module on /charts/, /eastern/ and /sky/, which each carry a
   different subset of its sections, so every element it touches at load is guarded. The
   Chinese portrait and the numerology studio now have their own pages and fill their own
   containers, so the three-way #birthday-output view switcher is gone -- and with it
   window.NatalRoom, which existed only so mobile-sections.js could drive that switcher. */
(() => {
  'use strict';
  const {zodiacSigns, birthstones, moonNames, escapeHTML, birthdayParts, zodiacFor, decanFor, moonPhaseFor, tarotBirthCardFor, stoneLinks} = BirthLore;

  const birthdayOutput = document.querySelector("#birthday-output");
  // The sky explorer dialog, like the sections below, is not on every page that loads this
  // module. sky-chart.js dereferences the dialog immediately, so attach only when it is here.
  const skyDialog = document.querySelector("#sky-dialog");
  const skyExplorer = skyDialog ? SkyChart.attach({dialog:skyDialog,signs:zodiacSigns,themes:BirthdayInsights.westernThemes}) : null;
  // These sections live on the same page today, but a later task moves this module to a
  // page that will not carry all of them. Astrocartography, celestial extras, Jyotish and
  // horary all write root.innerHTML straight away and throw on a missing element, which
  // would kill this whole IIFE -- the render subscriber and the #birthday-output
  // delegation with it. Attach each only when its section is present.
  const astrocartographyRoom = document.querySelector("#astrocartography-room");
  if (astrocartographyRoom) {
    const worldAtlas = Astrocartography.attach(astrocartographyRoom);
    BirthProfile.subscribe(state => { worldAtlas.setBirthChart(state?.natal || null); });
  }
  const celestialExtrasRoom = document.querySelector("#celestial-extras");
  if (celestialExtrasRoom) {
    const celestialExtras = CelestialExtras.attach(celestialExtrasRoom);
    BirthProfile.subscribe(state => { celestialExtras.setBirthChart(state?.natal || null); });
  }
  const jyotishRoom = document.querySelector("#jyotish");
  if (jyotishRoom) {
    const jyotish = Jyotish.attach(jyotishRoom);
    BirthProfile.subscribe(state => { jyotish.setBirthChart(state?.natal || null); });
  }
  const horaryRoom = document.querySelector("#horary");
  if (horaryRoom) {
    const horary = Horary.attach(horaryRoom);
    BirthProfile.subscribe(state => { horary.setBirthChart(state?.natal || null); });
  }
  const dailyHoroscopeRoom = document.querySelector("#daily-horoscope");
  if (dailyHoroscopeRoom) {
    const dailyHoroscope = DailyHoroscope.attach(dailyHoroscopeRoom);
    BirthProfile.subscribe(state => {
      const parts = state ? birthdayParts(state.profile.birthday) : null;
      const sign = state?.natal?.status === "ready" ? zodiacSigns[state.natal.points[0].index] : parts ? zodiacFor(parts) : null;
      dailyHoroscope.setProfileSign(sign ? zodiacSigns.indexOf(sign) : null);
    });
  }

  let natalModel = null;
  let natalView = "placements";
  let natalAspectFilter = "all";
  let natalShowMinor = false;
  // The chosen profection year survives report refreshes and re-renders of the same profile;
  // it resets only when the birth profile itself changes.
  let profectionYear = null;
  let profectionProfileKey = null;
  const chartDepth = () => natalModel && typeof ChartDepth !== "undefined" ? ChartDepth.render(natalModel,{year:profectionYear}) : "";
  function refreshNatalReport() {
    if(natalModel) birthdayOutput.querySelector(".natal-report").outerHTML = NatalChart.report(natalModel,natalView,natalAspectFilter,natalShowMinor);
  }
  // Print every aspect type the minor-aspect toggle lists, preserving the on-screen filter afterward.
  let natalPrintFocus = false;
  window.addEventListener("beforeprint", () => {
    if (!natalModel) return;
    natalPrintFocus = Boolean(document.activeElement?.closest(".natal-report"));
    birthdayOutput.querySelector(".natal-report").outerHTML = NatalChart.report(natalModel,natalView,"all",natalShowMinor);
  });
  window.addEventListener("afterprint", () => {
    if (!natalModel) return;
    refreshNatalReport();
    if (natalPrintFocus) birthdayOutput.querySelector("[data-print-natal]")?.focus({preventScroll:true});
    natalPrintFocus = false;
  });
  let restored = null;   // {birth, natal} while a saved chart is open
  function renderPortrait(state, saved) {
    if (!birthdayOutput) return;
    const parts = birthdayParts(state?.profile?.birthday);
    natalModel = null;
    if (!parts) {
      // #birthday-output is on /charts/ only, so this names what /charts/ actually carries.
      birthdayOutput.innerHTML = `<div class="birthday-empty"><strong>Set your birthday</strong> to open your sky portrait and natal chart, and the charts that build on them: your world map, the sky today, two skies, Four Pillars, chart in time and horary. Your Chinese zodiac portrait is on <a href="/eastern/">Eastern</a>, and your numbers on <a href="/numerology/">Numerology</a>. Your birthday details stay in this browser.</div>`;
      return;
    }
    const { profile, natal } = state;
    if(natal.status === "ready") natalModel = natal;
    // Keyed on the birth details alone: house system, orb and return-location edits keep the year.
    const profileKey = [profile?.birthday, profile?.time, profile?.place].join("|");
    if (profileKey !== profectionProfileKey || profectionYear === null) {
      // Until the chart is ready the key stays unset, so the year is worked out again once it is.
      profectionProfileKey = natalModel ? profileKey : null;
      // The year whose birthday began the profection in effect today. A chart can be cast for a
      // future birth date (profection throws RangeError); the year list starts at the birth year.
      const birthYear = Number(parts.year) || 0;
      profectionYear = birthYear;
      if (natalModel && typeof ChartDepthEngine !== "undefined") {
        try { profectionYear = birthYear + ChartDepthEngine.profection(natalModel, new Date()).age; }
        catch (error) { if (!(error instanceof RangeError)) throw error; }
      }
    }
    const sign = natalModel ? zodiacSigns[natalModel.points[0].index] : zodiacFor(parts);
    const moon = natalModel ? {name:moonNames[Math.round(natalModel.moonPhase / 45) % 8],illumination:Math.round(natalModel.moonIllumination * 100)} : moonPhaseFor(parts.date);
    const decan = natalModel ? `${["1st","2nd","3rd"][Math.floor((natalModel.points[0].longitude % 30) / 10)]} decan` : decanFor(parts,sign);
    const birthCard = tarotBirthCardFor(parts);
    const chinese = BirthdayInsights.chineseProfile(parts);
    const dateLabel = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parts.date);
    const timeLabel = profile?.time ? ` · ${escapeHTML(profile.time)}` : "";
    const placeLabel = profile?.place ? ` · ${escapeHTML(profile.place)}` : "";
    const elementMarks = {Fire:"△",Earth:"♁",Air:"≋",Water:"▽"};
    const planetMarks = {Mars:"♂",Venus:"♀",Mercury:"☿",Moon:"☾",Sun:"☉",Jupiter:"♃",Saturn:"♄"};
    const facts = [
      ["Ruling planet", sign.ruler, "Traditional + modern ruler", planetMarks[sign.ruler.split(" · ")[0]] || "☉"],
      ["Birthstone", stoneLinks(birthstones[parts.month]), stoneLinks(sign.stones), "◇"],
      ["Birth flower", sign.flower, "Seasonal flower lore", "✿"],
      ["Moon phase", moon.name, `${natalModel ? "" : "Approx. "}${moon.illumination}% illuminated`, "☾"],
      ["Chinese zodiac", chinese ? `${chinese.phase.name} ${chinese.animal.name}` : "Unavailable", chinese ? `${chinese.polarity} · lunar year ${chinese.year}` : "Calendar not supported for this date", "☯"],
      ["Tarot birth card", `${birthCard.number} · ${birthCard.name}`, birthCard.keywords, "✧"]
    ];
    birthdayOutput.innerHTML = `<div id="birthday-sky" class="birthday-view sky-summary">
      ${saved ? ChartRooms.banner(`Saved chart · cast for ${ChartRooms.describe(saved.birth)}`, {live: 'natal'}) : ''}
      ${natalModel ? NatalChart.bigThree(natalModel) : `<div class="natal-notice" role="status"><strong>Your full natal chart</strong><p>${escapeHTML(natal.message)}</p></div>`}
      <div class="celestial-portrait">
        <div class="sky-chart-wrap"><button type="button" class="sky-chart-launch" ${natalModel ? 'data-open-natal="point" data-natal-key="Sun" aria-label="Explore your full natal chart"' : `data-open-sky="${sign.name}" aria-label="Explore your ${sign.name} sky chart"`}>${natalModel ? NatalChart.renderWheel(natalModel) : SkyChart.render(zodiacSigns,sign.name)}<span class="sky-chart-invitation"><span aria-hidden="true">⌕</span> ${natalModel ? "Explore your natal chart" : "Explore your zodiac guide"} <span aria-hidden="true">↗</span></span></button><p class="sky-chart-caption">${natalModel ? "Planets · houses · aspects · open to zoom & explore" : "Symbolic zodiac guide · birth time and location needed for a natal chart"}</p></div>
        <article class="horoscope-card"><p class="reading-label">Your sun sign · ${natalModel ? "calculated natal chart" : "birthday horoscope"}</p><h4>${sign.name}</h4><p class="zodiac-line">${dateLabel}${timeLabel}${placeLabel}</p><div class="sky-traits"><span><i aria-hidden="true">${elementMarks[sign.element]}</i> ${sign.element}</span><span>${sign.modality}</span><span>${decan}</span></div><div class="horoscope-copy"><p>${sign.horoscope}</p></div><p class="sky-mantra">${sign.mantra}<span aria-hidden="true">✦</span></p></article>
      </div>
      <dl class="sky-facts">${facts.map(([label, value, detail, mark]) => `<div class="sky-fact"><dt><span class="sky-fact-symbol" aria-hidden="true">${SkyChart.glyph(mark)}</span>${label}</dt><dd>${value}<small>${detail}</small></dd></div>`).join("")}</dl>
      <div class="horoscope-lenses">${["Connections", "Work & creativity", "Rest & growth"].map((label, index) => `<article><span class="lens-ornament" aria-hidden="true">${["☌","✷","☾"][index]}</span><div><h5>${label}</h5><p>${BirthdayInsights.westernThemes[sign.name][index]}</p></div></article>`).join("")}</div>
      ${natalModel ? NatalChart.report(natalModel,natalView,natalAspectFilter,natalShowMinor) + chartDepth() + ChartRooms.saveControl('natal', ChartRooms.NOTES.one) : '<details class="insight-method"><summary>About your sky portrait</summary><p>Without a birth time and confirmed location, sun signs and decans use approximate date ranges and moon phase uses an average lunar cycle. Enter those details to calculate planets, rising sign, houses and aspects.</p></details>'}
    </div>
    <p class="birthday-privacy">${saved ? "Showing a saved chart. Your birth profile is unchanged." : "Your birthday details are saved in this browser."}</p>`;
  }
  BirthProfile.subscribe(state => { if (restored) return; renderPortrait(state, null); });

  if (birthdayOutput) {
    birthdayOutput.addEventListener("click", event => {
      if (event.target.closest("[data-chart-live]")) {
        restored = null;
        renderPortrait(BirthProfile.current(), null);
        birthdayOutput.querySelector("[data-save-reading]")?.focus({preventScroll: true});
        return;
      }
      const natalButton = event.target.closest("[data-open-natal]");
      if(natalButton && natalModel) {skyExplorer.openNatal(natalModel,natalButton,{kind:natalButton.dataset.openNatal,key:natalButton.dataset.natalKey});return;}
      const reportButton = event.target.closest("[data-natal-view]");
      if(reportButton && natalModel) {natalView = reportButton.dataset.natalView;refreshNatalReport();birthdayOutput.querySelector(`[data-natal-view="${natalView}"]`).focus({preventScroll:true});return;}
      if(event.target.closest("[data-print-natal]")) {window.print();return;}
      const skyButton = event.target.closest("[data-open-sky]");
      if (skyButton) { skyExplorer.open(skyButton.dataset.openSky,skyButton); return; }
    });
    birthdayOutput.addEventListener("change",event=>{
      if(!natalModel) return;
      if(event.target.id === "natal-aspect-filter") {natalAspectFilter=event.target.value;refreshNatalReport();birthdayOutput.querySelector("#natal-aspect-filter").focus({preventScroll:true});return;}
      if(event.target.id === "natal-minor-aspects") {
        natalShowMinor=event.target.checked;
        if(!natalShowMinor && NatalEngine.minorAspectTypes.some(type=>type.name===natalAspectFilter)) natalAspectFilter="all";
        refreshNatalReport();birthdayOutput.querySelector("#natal-minor-aspects").focus({preventScroll:true});return;
      }
      if(event.target.matches("[data-profection-year]")) {
        const depth=birthdayOutput.querySelector(".chart-depth");
        if(!depth) return;
        profectionYear=Number(event.target.value);
        depth.outerHTML=chartDepth();
        birthdayOutput.querySelector("[data-profection-year]")?.focus({preventScroll:true});
      }
    });

    if (typeof Rooms !== "undefined") Rooms.register("natal", {
      label: "Birth chart", category: "charts",
      current: () => {
        const birth = restored ? restored.birth : ChartRooms.birthFromChart(natalModel);
        return natalModel && birth ? ChartRooms.reading("natal", {payload: {v: 1, birth}, summary: ChartRooms.summaries.natal(natalModel), layout: birth.houseSystem}) : null;
      },
      load: reading => {
        const payload = ChartRooms.validate("natal", reading?.payload);
        if (!payload) return false;
        const natal = ChartRooms.natalFrom(payload.birth);
        if (natal.status !== "ready") return false;
        restored = {birth: payload.birth, natal};
        const b = payload.birth;
        renderPortrait({profile: {birthday: b.date, time: b.time, place: b.place.name, placeLocation: ChartRooms.locationFrom(b.place), houseSystem: b.houseSystem, fold: b.fold, orbScale: b.orbScale}, natal}, restored);
        if (typeof MobileSections !== "undefined") MobileSections.reveal(birthdayOutput);
        return true;
      }
    });
  }
})();
