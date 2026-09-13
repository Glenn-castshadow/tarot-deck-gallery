/* The hub: the "today" strip and the category cards. Reads the shared birth profile for a
   Sun sign when one is stored, and nothing else -- the hub loads no room module. */
(() => {
  'use strict';
  const {zodiacSigns, moonNames, birthdayParts, zodiacFor} = BirthLore;

  const cards = document.querySelector('#hub-cards');
  if (cards) cards.innerHTML = SiteShell.NAV.filter(entry => entry.key !== 'hub').map(entry =>
    `<a class="hub-card" href="${entry.href}"><em aria-hidden="true">✦</em><strong>${entry.label}</strong><span>${entry.blurb}</span></a>`).join('');

  const today = document.querySelector('#hub-today');
  if (!today) return;

  function moonNow() {
    try { return moonNames[Math.round(Astronomy.MoonPhase(new Date()) / 45) % 8]; }
    catch { return null; }
  }
  function sunSign(state) {
    if (!state) return null;
    if (state.natal?.status === 'ready') return zodiacSigns[state.natal.points[0].index];
    const parts = birthdayParts(state.profile?.birthday);
    return parts ? zodiacFor(parts) : null;
  }
  function render(state) {
    const moon = moonNow();
    const sign = sunSign(state);
    today.innerHTML = `${moon ? `<p class="hub-today-item"><span class="section-kicker">The Moon tonight</span><strong>${moon}</strong><small>Calculated in your browser. <a href="/sky/">Today's sky ↗</a></small></p>` : ''}
      ${sign ? `<p class="hub-today-item"><span class="section-kicker">Your Sun sign</span><strong>${sign.symbol} ${sign.name}</strong><small>${sign.mantra} <a href="/charts/">Your birth chart ↗</a></small></p>`
        : `<p class="hub-today-item"><span class="section-kicker">Your Sun sign</span><strong>Add your birthday</strong><small>Your details stay in this browser. <a href="/charts/">Start your birth chart ↗</a></small></p>`}
      <p class="hub-today-item"><span class="section-kicker">Today's card</span><strong>One card, once a day</strong><small>The same card until tomorrow. <a href="/tarot/">Draw today's card ↗</a></small></p>`;
  }
  BirthProfile.subscribe(render);
})();
