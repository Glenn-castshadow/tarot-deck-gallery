/* The Chinese zodiac portrait. Moved verbatim out of the sky portrait's template in
   app.js, where it was one interpolation inside #birthday-output.

   The portrait now has its own page and its own #birthday-chinese container; this fills
   it on every profile change. It also appends the /eastern/ animal-year relations
   (chinese-year.js) below the portrait, when that module is loaded and the profile is
   valid: typeof-guarded, so the portrait keeps working unchanged wherever chinese-year.js
   is not present. */
(() => {
  'use strict';
  const {birthdayParts, localDateKey} = BirthLore;

  let chosenYear = null;   // the year shown in the animal-year control; null means "use the default"
  let lastBirthday;        // detects a birthday change, to reset chosenYear
  let current = null;      // {birthBranch, birthYear} behind the currently rendered .chinese-year section

  function defaultYear() {
    const todayParts = birthdayParts(localDateKey());
    const todayProfile = todayParts && BirthdayInsights.chineseProfile(todayParts);
    return todayProfile ? todayProfile.year : new Date().getFullYear();
  }

  function clampYear(value) {
    const n = Math.trunc(Number(value));
    return String(value).trim() !== '' && Number.isFinite(n) ? Math.min(2100, Math.max(1901, n)) : null;
  }

  BirthProfile.subscribe(state => {
    const panel = document.querySelector("#birthday-chinese");
    if (!panel) return;
    const birthday = state?.profile?.birthday;
    if (birthday !== lastBirthday) { chosenYear = null; lastBirthday = birthday; }
    const parts = birthdayParts(birthday);
    if (!parts) {
      // The portrait keeps its existing no-birthday behaviour; only the year section is withdrawn.
      chosenYear = null; current = null;
      panel.querySelector(".chinese-year")?.remove();
      return;
    }
    const profile = BirthdayInsights.chineseProfile(parts);
    current = null;
    let section = '';
    if (profile && typeof ChineseYear !== 'undefined') {
      const birthBranch = ChineseYear.ANIMALS.findIndex(a => a.hanzi === profile.branch[0]);
      if (birthBranch >= 0) {
        if (chosenYear === null) chosenYear = defaultYear();
        current = {birthBranch, birthYear: profile.year};
        section = ChineseYear.render({...current, year: chosenYear});
      }
    }
    panel.innerHTML = BirthdayInsights.renderChinese(profile, state.profile.time || "") + section;
  });

  // Refresh only the heading and relations: the control stays in place, so focus and scroll are untouched.
  function applyYear(rawValue) {
    const panel = document.querySelector("#birthday-chinese");
    const result = panel?.querySelector(".chinese-year-result");
    const input = panel?.querySelector("[data-chinese-year]");
    if (!result || !input || !current) return;
    const clamped = clampYear(rawValue);
    if (clamped !== null) chosenYear = clamped;
    input.value = chosenYear;
    result.innerHTML = ChineseYear.renderResult({birthBranch: current.birthBranch, year: chosenYear});
  }

  const panel = document.querySelector("#birthday-chinese");
  panel?.addEventListener('change', event => {
    const input = event.target.closest('[data-chinese-year]');
    if (input) applyYear(input.value);
  });
  panel?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const input = event.target.closest('[data-chinese-year]');
    if (!input) return;
    event.preventDefault();
    applyYear(input.value);
  });
  panel?.addEventListener('click', event => {
    const button = event.target.closest('[data-chinese-year-step]');
    if (!button || !current) return;
    applyYear(chosenYear + Number(button.dataset.chineseYearStep));
  });
})();
