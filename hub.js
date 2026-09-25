/* The hub: the "today" strip and the category cards. Reads the shared birth profile for a
   Sun sign when one is stored, and nothing else -- the hub loads no room module. */
(() => {
  'use strict';
  const {zodiacSigns, moonNames, birthdayParts, zodiacFor} = BirthLore;

  const {mark, PATH_MARKS} = SiteShell;

  // The paths read as a constellation: each mark is a star, joined to the next by a dotted line.
  const cards = document.querySelector('#hub-cards');
  if (cards) cards.innerHTML = '<h2 class="hub-paths-title">Where would you like to begin?</h2><div class="hub-paths">' +
    SiteShell.NAV.filter(entry => entry.key !== 'hub').map(entry =>
      `<a class="hub-path" href="${entry.href}"><span class="hub-path-mark">${mark(PATH_MARKS[entry.key], 'hub-path-icon')}</span><span class="hub-path-text"><strong>${entry.label}</strong><span>${entry.blurb}</span></span>${mark('arrow-right', 'hub-path-go')}</a>`).join('') +
    '</div>';

  const today = document.querySelector('#hub-today');
  if (!today) return;

  function moonNow() {
    try { return moonNames[Math.round(Astronomy.MoonPhase(new Date()) / 45) % 8]; }
    catch { return null; }
  }
  const signKey = 'ishtar-sun-sign-v1';
  let latest = null;
  function pickedSign() {
    const index = Number(IshtarStorage.getItem(signKey) ?? -1);
    return Number.isInteger(index) && index >= 0 && index < 12 ? zodiacSigns[index] : null;
  }
  const horoscopeLink = sign => `<a href="/sky/?sign=${sign.name.toLowerCase()}#daily-horoscope">Today's ${sign.name} horoscope ↗</a>`;
  function sunSign(state) {
    if (!state) return null;
    if (state.natal?.status === 'ready') return zodiacSigns[state.natal.points[0].index];
    const parts = birthdayParts(state.profile?.birthday);
    return parts ? zodiacFor(parts) : null;
  }
  function render(state) {
    latest = state;
    const moon = moonNow();
    const sign = sunSign(state), picked = sign ? null : pickedSign();
    today.innerHTML = `${moon ? `<p class="hub-today-item"><span class="section-kicker">The Moon tonight</span><strong>${moon}</strong><small>Calculated in your browser. <a href="/sky/#sky-calendar">Today's sky ↗</a></small></p>` : ''}
      ${sign ? `<p class="hub-today-item"><span class="section-kicker">Your Sun sign</span><strong>${sign.symbol} ${sign.name}</strong><small>${sign.mantra}. ${horoscopeLink(sign)} · <a href="/charts/#birthday-room">Your birth chart ↗</a></small></p>`
        : `<p class="hub-today-item"><span class="section-kicker">Your Sun sign</span><strong><label class="sr-only" for="hub-sign">Your Sun sign</label><select id="hub-sign"><option value="">Choose your sign</option>${zodiacSigns.map((z, i) => `<option value="${i}"${z === picked ? ' selected' : ''}>${z.symbol} ${z.name}</option>`).join('')}</select></strong><small>${picked ? horoscopeLink(picked) : 'No birth details needed.'} · <a href="/charts/#birthday-room">Start your birth chart ↗</a></small></p>`}
      <p class="hub-today-item"><span class="section-kicker">Today's card</span><strong>One card, once a day</strong><small>The same card until tomorrow. <a href="/tarot/#tarot-readings">Draw today's card ↗</a></small></p>
      <p class="hub-today-item"><span class="section-kicker">Today's crystal</span><strong>One stone for everyone</strong><small>A new stone at midnight. <a href="/crystals/#crystal-day">See today's crystal ↗</a></small></p>`;
  }
  today.addEventListener('change', event => {
    if (event.target.id !== 'hub-sign') return;
    if (event.target.value === '') IshtarStorage.removeItem(signKey); else IshtarStorage.setItem(signKey, event.target.value);
    render(latest);
    today.querySelector('#hub-sign')?.focus();
  });
  BirthProfile.subscribe(render);
})();
