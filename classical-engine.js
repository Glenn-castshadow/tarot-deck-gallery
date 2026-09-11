/* Lilly's classical tables and conditions (Christian Astrology, 1647), presented as historical practice. */
const ClassicalEngine = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');

  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const rulers = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const exaltations = { Sun: [0, 19], Moon: [1, 3], Mercury: [5, 15], Venus: [11, 27], Mars: [9, 28], Jupiter: [3, 15], Saturn: [6, 21] };
  const triplicities = [['Sun', 'Jupiter'], ['Venus', 'Moon'], ['Saturn', 'Mercury'], ['Mars', 'Mars']]; // Fire, Earth, Air, Water: [day, night]

  // Ptolemy's terms, one row of five [planet, endDegree] pairs per sign, transcribed
  // verbatim from tools/build_horary_fixtures.py's TERMS table (the table the
  // pyswisseph-independent fixture dignities in tests/fixtures/horary-reference.json
  // were derived from).
  const terms = [
    [['Jupiter', 6], ['Venus', 14], ['Mercury', 21], ['Mars', 26], ['Saturn', 30]],
    [['Venus', 8], ['Mercury', 15], ['Jupiter', 22], ['Saturn', 26], ['Mars', 30]],
    [['Mercury', 7], ['Jupiter', 14], ['Venus', 21], ['Saturn', 25], ['Mars', 30]],
    [['Mars', 6], ['Jupiter', 13], ['Mercury', 20], ['Venus', 27], ['Saturn', 30]],
    [['Saturn', 6], ['Mercury', 13], ['Venus', 19], ['Jupiter', 25], ['Mars', 30]],
    [['Mercury', 7], ['Venus', 13], ['Jupiter', 18], ['Saturn', 24], ['Mars', 30]],
    [['Saturn', 6], ['Venus', 11], ['Jupiter', 19], ['Mercury', 24], ['Mars', 30]],
    [['Mars', 6], ['Jupiter', 14], ['Venus', 21], ['Mercury', 27], ['Saturn', 30]],
    [['Jupiter', 8], ['Venus', 14], ['Mercury', 19], ['Saturn', 25], ['Mars', 30]],
    [['Venus', 6], ['Mercury', 12], ['Jupiter', 19], ['Mars', 25], ['Saturn', 30]],
    [['Saturn', 6], ['Mercury', 12], ['Venus', 20], ['Jupiter', 25], ['Mars', 30]],
    [['Venus', 8], ['Jupiter', 14], ['Mercury', 20], ['Mars', 26], ['Saturn', 30]],
  ];

  // Chaldean order of the 36 decans (faces), starting from Mars at Aries 0 degrees,
  // repeating every seven decans across the zodiac.
  const faceOrder = ['Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter'];
  const faceRuler = (sign, deg) => faceOrder[(sign * 3 + Math.min(2, Math.floor(deg / 10))) % 7];

  const orbs = { Sun: 15, Moon: 12, Saturn: 9, Jupiter: 9, Mars: 7, Venus: 7, Mercury: 7 };
  const chaldean = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

  const houseMatters = [
    { house: 1, title: 'The querent', matters: 'the querent, the body, the beginning of the matter' },
    { house: 2, title: 'Money and movables', matters: 'money, movable goods, gain and loss' },
    { house: 3, title: 'Siblings, short journeys, letters', matters: 'siblings, short journeys, letters and news' },
    { house: 4, title: 'Father, home, land, lost things', matters: 'the father, home and land, and things lost' },
    { house: 5, title: 'Children, pleasure, messengers', matters: 'children, pleasure, amusement and messengers' },
    { house: 6, title: 'Sickness, servants, small animals', matters: 'sickness, servants and small animals' },
    { house: 7, title: 'Marriage, open enemies, the person asked about', matters: 'marriage, partnership, open enemies and the other party to the question' },
    { house: 8, title: 'Death, the partner’s estate, wills', matters: 'death, the partner’s estate, and wills' },
    { house: 9, title: 'Long journeys, learning, religion', matters: 'long journeys abroad, learning and religion' },
    { house: 10, title: 'Honour, profession, the mother', matters: 'honour, profession, public standing and the mother' },
    { house: 11, title: 'Friends and hopes', matters: 'friends, hopes and wishes' },
    { house: 12, title: 'Confinement, secret enemies, large animals', matters: 'confinement, self-undoing, secret enemies and large animals' },
  ];
  const housePoints = { 1: 5, 10: 5, 7: 4, 4: 4, 11: 4, 2: 3, 5: 3, 9: 2, 3: 1, 12: -5, 8: -2, 6: -2 };

  // Standard English ordinal suffix (handles the 11/12/13 "-th" exception generally,
  // not just for the house numbers 1-12 this module happens to call it with).
  function ordinal(n) {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  }

  function dignities(planet, longitude, sect = 'day') {
    if (!planets.includes(planet)) throw new RangeError('Choose one of the seven classical planets.');
    if (sect !== 'day' && sect !== 'night') throw new RangeError('Sect is day or night.');
    const l = natal.mod(longitude), signIndex = Math.floor(l / 30), degree = l - signIndex * 30;
    const ruler = rulers[signIndex] === planet, detriment = rulers[(signIndex + 6) % 12] === planet;
    const exaltation = exaltations[planet][0] === signIndex, fall = (exaltations[planet][0] + 6) % 12 === signIndex;
    const triplicity = triplicities[signIndex % 4][sect === 'day' ? 0 : 1] === planet;
    const term = terms[signIndex].find(([, end]) => degree < end)[0] === planet;
    const face = faceRuler(signIndex, degree) === planet;
    const peregrine = !(ruler || exaltation || triplicity || term || face) && !detriment && !fall;
    const score = (ruler ? 5 : 0) + (exaltation ? 4 : 0) + (triplicity ? 3 : 0) + (term ? 2 : 0) + (face ? 1 : 0)
      - (detriment ? 5 : 0) - (fall ? 4 : 0) - (peregrine ? 5 : 0);
    const words = [
      ruler && 'in its own sign',
      exaltation && 'exalted',
      triplicity && 'in its triplicity',
      term && 'in its own term',
      face && 'in its own face',
      detriment && 'in detriment',
      fall && 'in its fall',
      peregrine && 'peregrine',
    ].filter(Boolean);
    return { sign: natal.signNames[signIndex], signIndex, degree, ruler, exaltation, triplicity, term, face, detriment, fall, peregrine, score, words };
  }

  function sect(chart) {
    const sun = chart.points.find(p => p.name === 'Sun');
    return natal.houseFor(sun.longitude, chart.cusps) >= 7 ? 'day' : 'night';
  }

  function accidental(point, chart) {
    const sun = chart.points.find(p => p.name === 'Sun');
    const house = natal.houseFor(point.longitude, chart.cusps);
    const houseClass = [1, 4, 7, 10].includes(house) ? 'angular' : [2, 5, 8, 11].includes(house) ? 'succedent' : 'cadent';
    const separation = Math.abs(natal.delta(point.longitude, sun.longitude));
    const solar = point.name === 'Sun' ? null
      : separation <= 17 / 60 ? 'cazimi'
      : separation <= 8.5 ? 'combust'
      : separation <= 17 ? 'underBeams'
      : 'free';
    const motion = ['Sun', 'Moon'].includes(point.name) ? null : point.retrograde ? 'retrograde' : 'direct';
    const viaCombusta = point.name === 'Moon' && point.longitude >= 195 && point.longitude <= 225;
    const increasing = point.name === 'Moon' ? natal.mod(point.longitude - sun.longitude) < 180 : null;
    let score = housePoints[house] || 0;
    if (motion === 'direct') score += 4;
    if (motion === 'retrograde') score -= 5;
    if (solar === 'cazimi') score += 5;
    if (solar === 'combust') score -= 5;
    if (solar === 'underBeams') score -= 4;
    if (solar === 'free') score += 5;
    if (increasing === true) score += 2;
    if (increasing === false) score -= 2;
    const words = [
      `in the ${ordinal(house)} house (${houseClass})`,
      motion,
      solar === 'underBeams' ? 'under the Sun’s beams' : solar === 'free' ? 'free of the Sun’s beams' : solar,
      viaCombusta && 'in the via combusta',
      increasing === true && 'increasing in light',
      increasing === false && 'decreasing in light',
    ].filter(Boolean);
    return { house, houseClass, motion, solar, viaCombusta, increasing, score, words };
  }

  function reception(a, b, chart) {
    const bl = chart.points.find(p => p.name === b).longitude, signIndex = Math.floor(natal.mod(bl) / 30);
    const byRulership = rulers[signIndex] === a, byExaltation = exaltations[a]?.[0] === signIndex;
    return { byRulership, byExaltation, any: byRulership || byExaltation };
  }

  return { planets, rulers, exaltations, triplicities, terms, faceRuler, orbs, chaldean, houseMatters, housePoints, dignities, accidental, sect, reception };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ClassicalEngine;
