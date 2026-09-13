/* The Chinese zodiac portrait. Moved verbatim out of the sky portrait's template in
   app.js, where it was one interpolation inside #birthday-output.

   The portrait now has its own page and its own #birthday-chinese container; this fills
   it on every profile change. */
(() => {
  'use strict';
  const {birthdayParts} = BirthLore;

  BirthProfile.subscribe(state => {
    const panel = document.querySelector("#birthday-chinese");
    if (!panel) return;
    const parts = birthdayParts(state?.profile?.birthday);
    if (!parts) return;
    panel.innerHTML = BirthdayInsights.renderChinese(BirthdayInsights.chineseProfile(parts), state.profile.time || "");
  });
})();
