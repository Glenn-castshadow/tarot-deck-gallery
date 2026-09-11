/* Original reflective text for return and progressed charts. Traditional
   symbolism offered for reflection; not forecasts, not scores. */
const ChartInTimeText = (() => {
  const planetTheme = {Sun:'identity and expression',Moon:'emotional rhythms and care',Mercury:'communication and learning',Venus:'affection and shared values',Mars:'initiative and boundaries',Jupiter:'growth and perspective',Saturn:'responsibility and structure',Uranus:'independence and change',Neptune:'imagination and ideals',Pluto:'depth and renewal'};

  const returnSunHouse = {
    1: {title:'A year turned outward', body:'The return Sun in the first house is traditionally associated with visibility, appearance and the way a person meets the year on their own terms.', prompt:'What would you like to be recognised for this year?'},
    2: {title:'A year of what you hold', body:'The second house is traditionally associated with resources, worth and the practical ground a person stands on.', prompt:'What is genuinely worth your resources this year?'},
    3: {title:'A year of small conversations', body:'Third-house emphasis is traditionally associated with study, correspondence and the short journeys that fill ordinary weeks.', prompt:'Which conversation have you been putting off beginning?'},
    4: {title:'A year close to home', body:'Placed in the fourth house, the return Sun is traditionally read as attention drawn towards household, family and the private ground beneath everything else.', prompt:'What would make where you live feel more like yours?'},
    5: {title:'A year that asks to be enjoyed', body:'The fifth house is traditionally associated with play, creative work and affection offered for its own sake.', prompt:'What would you make if no one were assessing it?'},
    6: {title:'A year measured in days', body:'Sixth-house emphasis invites attention to routine, work and the care of the body, the small repetitions a year is actually built from.', prompt:'Which daily habit is quietly shaping the rest?'},
    7: {title:'A year read through others', body:'The return Sun in the seventh house is traditionally associated with partnership, agreement and the way identity is reflected back by someone else.', prompt:'What do your closest agreements ask of you now?'},
    8: {title:'A year of shared ground', body:'Eighth-house emphasis is traditionally read as depth: what is held jointly, what is inherited, and what is rarely said aloud.', prompt:'What would honesty cost you here, and what might it be worth?'},
    9: {title:'A year that widens', body:'Traditionally the ninth house is associated with travel, study and belief, the reach beyond what is already familiar.', prompt:'Which belief of yours would benefit from a wider view?'},
    10: {title:'A year in view', body:'With the return Sun in the tenth house, the tradition points towards vocation, responsibility and the part of a life other people can see.', prompt:'What would you like your work to stand for?'},
    11: {title:'A year among others', body:'The eleventh house is traditionally associated with friendship, collective effort and the futures people imagine together.', prompt:'Whose company makes a worthwhile future feel possible?'},
    12: {title:'A year with a quiet edge', body:'Twelfth-house emphasis invites rest, retreat and attention to whatever has been carried without examination.', prompt:'What are you ready to set down?'}
  };

  // Same twelve houses, read for a month rather than a year, and about
  // emotional weather rather than identity. Do not reuse the solar wording.
  const returnMoonHouse = {
    1: {title:'A month close to the surface', body:'The return Moon in the first house is traditionally associated with feeling more visible, and with moods that show before they are named.', prompt:'What are you feeling before you have words for it?'},
    2: {title:'A month wanting solid ground', body:'In the second house the return Moon is traditionally associated with comfort sought through tangible things: food, money, familiar objects and the reassurance of enough.', prompt:'What do you reach for when you want to feel steady?'},
    3: {title:'A month of restless attention', body:'Third-house placement invites talkative, quick-moving moods that tend to settle once something has been said out loud.', prompt:'Who would you feel lighter for having spoken to?'},
    4: {title:'A month that pulls indoors', body:'The fourth house is traditionally read as the Moon at home, where feeling runs close to memory and to the wish to be looked after.', prompt:'What does being cared for look like to you this month?'},
    5: {title:'A month of warmer weather', body:'Fifth-house emphasis is associated with feeling that wants an outlet, through affection, playfulness and the lift that arrives with an audience.', prompt:'What would you do purely because it lifts you?'},
    6: {title:'A month of small adjustments', body:'Traditionally the sixth house draws feeling into the body and the working day, where tiredness and worry tend to speak through routine.', prompt:'What is your body asking for that you keep deferring?'},
    7: {title:'A month spent in company', body:'With the return Moon in the seventh house, moods are traditionally read as responsive, coloured by whoever is close at hand.', prompt:'Whose mood have you been carrying as though it were yours?'},
    8: {title:'A month with undercurrents', body:'Eighth-house placement is associated with feeling that runs beneath the surface, including the quiet ways trust is built or tested.', prompt:'What have you not said because it felt too large to start?'},
    9: {title:'A month that wants air', body:'The ninth house invites moods that ease with distance, movement or a change of scene.', prompt:'Where would a little distance do you good?'},
    10: {title:'A month in a lit room', body:'Tenth-house emphasis is traditionally read as private feeling meeting public expectation, with moods more legible to others than usual.', prompt:'What would you rather not have to perform just now?'},
    11: {title:'A month of belonging', body:'Placed in the eleventh house, the return Moon is associated with feeling steadied, or unsettled, by the company a person keeps.', prompt:'Where do you feel most genuinely included?'},
    12: {title:'A month that asks for quiet', body:'The twelfth house is traditionally associated with feeling that needs solitude before it can be named.', prompt:'What might surface if you stopped filling the silence?'}
  };

  const returnAscendant = {
    Aries: {title:'Meeting it head on', body:'An Aries Ascendant on a return chart is traditionally associated with a direct, quick-starting approach to the period ahead.', prompt:'Where does starting matter more than planning?'},
    Taurus: {title:'Meeting it at your own pace', body:'With Taurus rising, the tradition reads the coming period as one approached slowly, through what is steady and sensory.', prompt:'What is worth doing slowly enough to enjoy?'},
    Gemini: {title:'Meeting it with questions', body:'A Gemini Ascendant invites a curious, conversational approach that gathers information before settling on a view.', prompt:'Which question are you most interested in just now?'},
    Cancer: {title:'Meeting it carefully', body:'Cancer rising is traditionally associated with an approach that protects first and opens later, guided by feeling and familiarity.', prompt:'What needs safeguarding before you can relax?'},
    Leo: {title:'Meeting it warmly', body:'Leo rising invites a generous, visible way of entering the period, with rather more attention on it than usual.', prompt:'What would you be glad to be seen doing?'},
    Virgo: {title:'Meeting it in detail', body:'Virgo rising is associated with a careful, practical approach that notices what needs adjusting.', prompt:'What deserves your attention, and what does not?'},
    Libra: {title:'Meeting it with others in mind', body:'A Libra Ascendant invites an approach shaped by fairness, comparison and the wish to keep things in proportion.', prompt:'Whose view are you weighing most heavily?'},
    Scorpio: {title:'Meeting it in your own time', body:'Scorpio rising is traditionally read as a reserved approach that observes at length before committing.', prompt:'What are you waiting to be sure of?'},
    Sagittarius: {title:'Meeting it with a wide view', body:'With Sagittarius rising, the tradition associates the period with an open, exploratory approach that prefers possibility to precision.', prompt:'What would you like to understand more broadly?'},
    Capricorn: {title:'Meeting it with a plan', body:'A Capricorn Ascendant is associated with a measured approach, taking responsibility early and building in stages.', prompt:'What are you willing to commit to for the long run?'},
    Aquarius: {title:'Meeting it on your own terms', body:'An Aquarius Ascendant is associated with an approach that keeps some distance, preferring its own reading of things to the expected one.', prompt:'Where would you rather not follow the usual pattern?'},
    Pisces: {title:'Meeting it by feel', body:'The tradition reads a Pisces Ascendant as a receptive, unhurried approach that takes its bearings from atmosphere rather than outline.', prompt:'What are you sensing that you cannot yet justify?'}
  };

  const lunation = {
    New: {title:'A beginning without a shape yet', body:'The progressed New phase is traditionally read as a start made before its outline is visible.', prompt:'What is beginning that you cannot describe yet?'},
    Crescent: {title:'Effort before proof', body:'The Crescent phase is traditionally associated with the first effort a beginning asks for, well before there is anything to show for it.', prompt:'What are you willing to keep doing without evidence yet?'},
    'First Quarter': {title:'A decision that costs something', body:'Tradition reads the First Quarter as the point where a beginning meets resistance and asks for a choice.', prompt:'What would you have to give up in order to go on?'},
    Gibbous: {title:'Refining what exists', body:'The Gibbous phase invites adjustment, the patient work of improving something already under way.', prompt:'What is nearly right, and what is still missing?'},
    Full: {title:'Seeing it whole', body:'The progressed Full phase is traditionally associated with clarity, and with meeting what a long effort has actually become.', prompt:'What can you see now that you could not at the start?'},
    Disseminating: {title:'Something to pass on', body:'Traditionally the Disseminating phase is read as the sharing of what has been learned.', prompt:'What do you know now that is worth telling someone?'},
    'Last Quarter': {title:'A reckoning', body:'The Last Quarter is associated with re-examination, when a commitment is weighed against what it has asked of you.', prompt:'What no longer matches the reason you began?'},
    Balsamic: {title:'Making room', body:'The Balsamic phase invites release and rest before another cycle begins.', prompt:'What are you ready to let close?'}
  };

  const progressedSunSign = {
    Aries: {title:'A chapter that begins things', body:'The progressed Sun in Aries is traditionally read as a stretch of years coloured by initiative, directness and an appetite to begin.', prompt:'What have you been waiting for permission to start?'},
    Taurus: {title:'A chapter that settles', body:'Moving through Taurus, the progressed Sun is associated with consolidation, patience and attention to what lasts.', prompt:'What are you ready to build slowly?'},
    Gemini: {title:'A chapter of questions', body:'Gemini invites years marked by curiosity, exchange and an appetite for several things at once.', prompt:'What would you learn if nothing had to come of it?'},
    Cancer: {title:'A chapter about belonging', body:'The progressed Sun in Cancer is traditionally associated with home, family and the care a person both gives and needs.', prompt:'Where do you most want to be at home?'},
    Leo: {title:'A chapter in the open', body:'Tradition reads a Leo stretch as one of expression, warmth and a growing willingness to be seen.', prompt:'What would you do if being noticed did not worry you?'},
    Virgo: {title:'A chapter of craft', body:'In Virgo, the progressed Sun is associated with refinement, usefulness and the quiet satisfaction of doing something well.', prompt:'What are you willing to become properly good at?'},
    Libra: {title:'A chapter with company', body:'A Libra stretch is traditionally read as years shaped by relationship, fairness and the negotiation between one person and another.', prompt:'What does fairness look like when it costs you something?'},
    Scorpio: {title:'A chapter that goes deeper', body:'The progressed Sun in Scorpio is associated with intensity, honesty and a willingness to look at what was avoided.', prompt:'What would you rather not examine, and why?'},
    Sagittarius: {title:'A chapter that travels', body:'Through Sagittarius the tradition reads a widening of horizons: belief, study and a taste for the unfamiliar.', prompt:'Which larger question is worth these years?'},
    Capricorn: {title:'A chapter of building', body:'Capricorn is traditionally associated with structure, responsibility and work that only makes sense over time.', prompt:'What are you prepared to be accountable for?'},
    Aquarius: {title:'A chapter of your own making', body:'The progressed Sun in Aquarius invites independence, and an interest in the group rather than the individual.', prompt:'Which convention no longer fits you?'},
    Pisces: {title:'A chapter with softer edges', body:'In Pisces, the progressed Sun is associated with imagination, compassion and the loosening of firm outlines.', prompt:'What are you ready to hold more lightly?'}
  };

  const contact = {
    Conjunction:{title:'A shared focus', body:'A conjunction places two symbols together. Consider how their themes blend, amplify or compete for attention.', prompt:'How could both needs have room?'},
    Sextile:{title:'An opening to explore', body:'A sextile is traditionally read as an invitation to cooperate.', prompt:'What small invitation could you act on?'},
    Square:{title:'A useful difference', body:'A square is traditionally read as tension between needs.', prompt:'What needs a more honest conversation?'},
    Trine:{title:'A familiar rhythm', body:'A trine is traditionally read as ease or affinity.', prompt:'What works well enough to appreciate aloud?'},
    Opposition:{title:'Two sides of a story', body:'An opposition is traditionally read as a dialogue between contrasting needs.', prompt:'What would a fair balance look like?'}
  };

  const method = {
    solar: {label:'Solar return', summary:'A chart for the moment the Sun returns to the exact degree it held at birth. Traditionally read as a frame for the year that follows.', conventions:'The return moment depends only on the Sun, so it is the same everywhere on Earth. The houses and angles depend on where the chart is cast, which is why the place you expect to be can be chosen above. This release does not precess the return.'},
    lunar: {label:'Lunar return', summary:'A chart for the moment the Moon returns to its natal degree, roughly every 27.3 days.', conventions:'Thirteen or fourteen lunar returns fall in a calendar year. As with the solar return, the moment is the same everywhere and only the houses and angles follow the chosen place.'},
    secondary: {label:'Secondary progressions', summary:'One day of movement after birth is read for one year of life.', conventions:'A year is the mean tropical year of 365.2422 days. The progressed Ascendant and Midheaven come from actual sidereal time at the progressed instant, cast for the birthplace. Naibod arc and solar-arc Midheaven are alternative conventions this release does not use.'},
    tertiary: {label:'Tertiary progressions', summary:'One day of movement after birth is read for one lunar month of life.', conventions:'A lunar month here is the sidereal month of 27.321582 days. A synodic definition of 29.530589 days also circulates under this name and produces different results.'},
    'solar-arc': {label:'Solar arc directions', summary:'Every natal placement advances by the same arc the progressed Sun has travelled.', conventions:'The arc is taken from the secondary progressed Sun. The Naibod variant, which substitutes mean solar motion, is not used. Directed points carry no daily motion, so applying and separating are not reported for this method.'}
  };

  return {planetTheme, returnSunHouse, returnMoonHouse, returnAscendant, lunation, progressedSunSign, contact, method};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartInTimeText;
