/* Original symbolic readings from the tropical sky. No network or birth data required. */
const DailyHoroscopeEngine = (() => {
  'use strict';
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  // Each row describes one whole-sign solar house, starting with the selected sign.
  const houses = [
    ['Begin with yourself', 'Notice what you need before agreeing to another demand.', 'Let someone see the real you, even in a small way.', 'Put your own idea into words before seeking a second opinion.', 'Choose a direction that feels like your own.', 'Take one small step you have been waiting to begin.'],
    ['Tend what sustains you', 'Simple comforts can help you find a steadier pace.', 'Show appreciation through a thoughtful, practical gesture.', 'Review the time and materials a project actually needs.', 'Ask what is worth your attention, beyond its price.', 'Care for something you already have.'],
    ['Make room for a conversation', 'Name the feeling; it may be easier to carry once it has words.', 'Ask a sincere question and leave room for the answer.', 'Write the message, clarify the brief, or learn one useful thing.', 'Let curiosity loosen an assumption.', 'Finish one small errand or send a clear message.'],
    ['Return to your foundations', 'Give yourself somewhere quiet to land.', 'A familiar ritual can make time together feel warmer.', 'Create a calmer base for the work you want to do.', 'Notice which old habits still offer support.', 'Make one corner of your space more welcoming.'],
    ['Follow a little delight', 'Make space for a feeling that does not need to be useful.', 'Share something you enjoy without needing to impress.', 'Try the playful version of an idea before editing it.', 'Let yourself be a beginner at something enjoyable.', 'Spend ten minutes making something just for the pleasure of it.'],
    ['Find a kinder rhythm', 'A manageable routine can offer more comfort than a perfect plan.', 'A small act of care can say what a grand gesture cannot.', 'Simplify a recurring task and make the next step easy to find.', 'Consider which daily habits leave you feeling supported.', 'Remove one unnecessary step from your day.'],
    ['Meet in the middle', 'Notice how you feel in company without losing sight of your needs.', 'Make a request clearly, and invite an honest response.', 'Check that a shared agreement means the same thing to both people.', 'Practice cooperation with room for difference.', 'Give a shared plan a clear next step.'],
    ['Leave room for honesty', 'You do not have to untangle every feeling at once.', 'Trust grows through respecting both openness and privacy.', 'Clarify responsibilities wherever a project relies on shared resources.', 'Reflect on what you are ready to set down.', 'Name one boundary that would make a commitment easier to hold.'],
    ['Look beyond the familiar', 'A different perspective may give a persistent feeling more room.', 'Explore an idea or experience that is new to both of you.', 'Ask the larger question before getting lost in the details.', 'Revisit a belief with curiosity instead of certainty.', 'Read, walk, or learn your way into a fresh perspective.'],
    ['Choose what deserves your effort', 'Separate your feelings about achievement from your value as a person.', 'Respect each other’s ambitions without making connection another task.', 'Define what finished looks like for one meaningful piece of work.', 'Consider how you want your contribution to be remembered.', 'Move one visible priority forward by a manageable amount.'],
    ['Find your people', 'Notice where you feel included and where you can offer welcome.', 'Reach toward a friendship that allows you to be yourself.', 'Invite a useful perspective from someone outside your usual circle.', 'Give a long-term hope a practical shape.', 'Contribute something small to a group you care about.'],
    ['Let the day breathe', 'Allow some quiet before asking yourself for another answer.', 'Gentleness and a little space can be forms of care.', 'Make time to reflect before adding more to your list.', 'Notice what becomes clearer when you stop forcing a conclusion.', 'Close one open loop, then leave room to rest.']
  ];
  const phases = [
    ['New Moon', 'Set one modest intention and allow it time to take shape.'],
    ['Waxing crescent', 'Nurture an early idea with a small, repeatable action.'],
    ['First quarter', 'Choose one adjustment that helps an intention meet everyday life.'],
    ['Waxing gibbous', 'Refine what is already growing without demanding perfection.'],
    ['Full Moon', 'Notice what has become visible before deciding what it means.'],
    ['Waning gibbous', 'Share what you have learned, and make room to listen.'],
    ['Last quarter', 'Reconsider a habit that no longer supports your direction.'],
    ['Waning crescent', 'Finish gently; a pause can be part of the process.']
  ];
  const questions = [
    'What would make today feel a little more like your own?',
    'Where could a smaller step be enough?',
    'What deserves your attention, and what can wait?',
    'What could you approach with more curiosity?',
    'Where would a clear request help?',
    'What is one thing you can appreciate as it is?',
    'What would you like to carry into tomorrow?'
  ];
  let cachedSky;
  function localDateKey(date = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(+date)) throw new RangeError('A valid date is required.');
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function skyFor(day) {
    const instant = new Date(`${day}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(+instant) || instant.toISOString().slice(0,10) !== day || instant.getUTCFullYear() < 1901 || instant.getUTCFullYear() > 2100) {
      throw new RangeError('Choose a valid calendar date from 1901 to 2100.');
    }
    if (cachedSky?.day === day) return cachedSky;
    const points = ['Sun','Moon','Mercury','Venus','Mars'].map(name => ({name, ...natal.placement(astro.Ecliptic(astro.GeoVector(name,instant,true)).elon)}));
    const phaseAngle = astro.MoonPhase(instant);
    cachedSky = {day, instant:instant.toISOString(), points, phaseAngle, illumination:Math.round(astro.Illumination('Moon',instant).phase_fraction*100)};
    return cachedSky;
  }
  function calculate(signIndex, day = localDateKey()) {
    if (!Number.isInteger(signIndex) || signIndex < 0 || signIndex > 11) throw new RangeError('Choose one of the twelve zodiac signs.');
    const sky = skyFor(day);
    const points = sky.points.map(point => ({...point, solarHouse:natal.mod(point.index-signIndex,12)+1}));
    const point = name => points.find(p => p.name === name);
    const text = (name,column) => houses[point(name).solarHouse-1][column];
    const phase = phases[Math.round(sky.phaseAngle/45)%8];
    return {
      day, instant:sky.instant, signIndex, sign:natal.signNames[signIndex], glyph:natal.signGlyphs[signIndex]+'\uFE0E', points,
      title:text('Moon',0), overview:text('Moon',1), action:text('Mars',5),
      phase:phase[0], phasePrompt:phase[1], phaseAngle:sky.phaseAngle, illumination:sky.illumination,
      lenses:[{title:'Relationships', text:text('Venus',2), planet:'Venus'}, {title:'Work & creativity', text:text('Mercury',3), planet:'Mercury'}, {title:'Personal growth', text:text('Sun',4), planet:'Sun'}],
      question:questions[natal.mod(Math.floor(Date.parse(sky.instant)/86400000)+signIndex,questions.length)]
    };
  }
  return {calculate, localDateKey, signNames:natal.signNames, signGlyphs:natal.signGlyphs};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DailyHoroscopeEngine;
