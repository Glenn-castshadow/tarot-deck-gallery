/* The hub: the "today" strip and the category cards. Reads the shared birth profile for a
   Sun sign when one is stored, and nothing else -- the hub loads no room module. */
(() => {
  'use strict';
  const {zodiacSigns, moonNames, birthdayParts, zodiacFor} = BirthLore;

  // One mark per path: Phosphor Icons 2.1.1, Light weight (MIT License, Copyright (c) 2023 Phosphor Icons).
  const MARKS = {
    tarot: 'M208,90H48a14,14,0,0,0-14,14v96a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V104A14,14,0,0,0,208,90Zm2,110a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V104a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM50,64a6,6,0,0,1,6-6H200a6,6,0,0,1,0,12H56A6,6,0,0,1,50,64ZM66,32a6,6,0,0,1,6-6H184a6,6,0,0,1,0,12H72A6,6,0,0,1,66,32Z',
    sky: 'M238,96a6,6,0,0,1-6,6H214v18a6,6,0,0,1-12,0V102H184a6,6,0,0,1,0-12h18V72a6,6,0,0,1,12,0V90h18A6,6,0,0,1,238,96ZM144,54h10V64a6,6,0,0,0,12,0V54h10a6,6,0,0,0,0-12H166V32a6,6,0,0,0-12,0V42H144a6,6,0,0,0,0,12Zm71.25,100.28a6,6,0,0,1,1.07,6A94,94,0,1,1,95.76,39.68a6,6,0,0,1,7.94,6.79A90.11,90.11,0,0,0,192,154a90.9,90.9,0,0,0,17.53-1.7A6,6,0,0,1,215.25,154.28Zm-14.37,11.34q-4.42.38-8.88.38A102.12,102.12,0,0,1,90,64q0-4.45.38-8.88a82,82,0,1,0,110.5,110.5Z',
    charts: 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm0,192a90,90,0,1,1,90-90A90.1,90.1,0,0,1,128,218ZM173.32,74.63l-64,32a6,6,0,0,0-2.69,2.69l-32,64A6,6,0,0,0,80,182a6.06,6.06,0,0,0,2.68-.63l64-32a6,6,0,0,0,2.69-2.69l32-64a6,6,0,0,0-8.05-8.05Zm-33.79,64.9L93.42,162.58l23-46.11,46.11-23Z',
    eastern: 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26ZM38,128a90.1,90.1,0,0,1,90-90,42,42,0,0,1,0,84,54,54,0,0,0-44.88,84A90.06,90.06,0,0,1,38,128Zm90,90a42,42,0,0,1,0-84,54,54,0,0,0,44.88-84A90,90,0,0,1,128,218Zm10-42a10,10,0,1,1-10-10A10,10,0,0,1,138,176ZM118,80a10,10,0,1,1,10,10A10,10,0,0,1,118,80Z',
    numerology: 'M128,42a54,54,0,1,0,19.94,104.17l-33.17,58.88a6,6,0,1,0,10.46,5.89l49.54-88A54,54,0,0,0,128,42Zm0,96a42,42,0,1,1,42-42A42,42,0,0,1,128,138Z',
    divination: 'M138,168a10,10,0,1,1-10-10A10,10,0,0,1,138,168Zm76-52v36a86,86,0,0,1-172,0V76A26,26,0,0,1,82,54.11V44a26,26,0,0,1,51.41-5.51A26,26,0,0,1,174,60V94.11A26,26,0,0,1,214,116Zm-12,0a14,14,0,0,0-28,0v4a6,6,0,0,1-12,0V60a14,14,0,0,0-28,0v44a6,6,0,0,1-12,0V44a14,14,0,0,0-28,0v68a6,6,0,0,1-12,0V76a14,14,0,0,0-28,0v76a74,74,0,0,0,148,0Zm-20.63,49.32a6,6,0,0,1,0,5.36C180.65,172.12,163.3,206,128,206s-52.65-33.88-53.37-35.32a6,6,0,0,1,0-5.36C75.35,163.88,92.7,130,128,130S180.65,163.88,181.37,165.32ZM169.08,168c-4.46-7.12-18.41-26-41.08-26s-36.65,18.85-41.08,26c4.46,7.13,18.41,26,41.08,26S164.65,175.15,169.08,168Z',
    crystals: 'M233.92,118.14,137.86,22.08a14,14,0,0,0-19.72,0L22.08,118.14a14,14,0,0,0,0,19.72l96.06,96.06h0a14,14,0,0,0,19.72,0l96-96.06a13.94,13.94,0,0,0,0-19.72Zm-8.49,11.24-96.05,96.06a2,2,0,0,1-2.76,0L30.57,129.38a2,2,0,0,1,0-2.76l96.05-96.06a2,2,0,0,1,2.76,0l96.05,96.06a2,2,0,0,1,0,2.76Z',
    account: 'M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26ZM71.44,198a66,66,0,0,1,113.12,0,89.8,89.8,0,0,1-113.12,0ZM94,120a34,34,0,1,1,34,34A34,34,0,0,1,94,120Zm99.51,69.64a77.53,77.53,0,0,0-40-31.38,46,46,0,1,0-51,0,77.53,77.53,0,0,0-40,31.38,90,90,0,1,1,131,0Z',
    go: 'M220.24,132.24l-72,72a6,6,0,0,1-8.48-8.48L201.51,134H40a6,6,0,0,1,0-12H201.51L139.76,60.24a6,6,0,0,1,8.48-8.48l72,72A6,6,0,0,1,220.24,132.24Z'
  };
  const mark = (key, cls) => `<svg class="${cls}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${MARKS[key]}"/></svg>`;

  // The paths read as a constellation: each mark is a star, joined to the next by a dotted line.
  const cards = document.querySelector('#hub-cards');
  if (cards) cards.innerHTML = '<h2 class="hub-paths-title">Where would you like to begin?</h2><div class="hub-paths">' +
    SiteShell.NAV.filter(entry => entry.key !== 'hub').map(entry =>
      `<a class="hub-path" href="${entry.href}"><span class="hub-path-mark">${mark(entry.key, 'hub-path-icon')}</span><span class="hub-path-text"><strong>${entry.label}</strong><span>${entry.blurb}</span></span>${mark('go', 'hub-path-go')}</a>`).join('') +
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
