/* Original historical copy for Horary astrology, William Lilly's method as
   set out in Christian Astrology (1647). This is a record of how Lilly's
   tradition read a chart, past tense, third person; it never addresses the
   reader's own outcome and offers no yes-or-no verdicts. Tables and
   considerations are paraphrased from Lilly, Book I and Book II, never
   quoted at length. */
const HoraryText = (() => {
  const banner = 'Horary astrology, as William Lilly set it out in Christian Astrology (1647), read a chart cast for the exact moment a question was put, treating the sky at that instant as a figure to be reasoned through by rule. What follows reconstructs that seventeenth-century method step by step: how a chart was tested for fitness, how its significators were judged, and how a matter was said, in Lilly’s terms, to perfect or fail. This section shows how such a chart was read; it does not read your future.';

  const houseMatters = {
    1: {title:'The querent', lilly:'Lilly assigned the first house to the querent, the person who asked the question, and to their own body, life and general condition.'},
    2: {title:'Money and movables', lilly:'The second house was Lilly’s house of money and movable goods, governing what a person owned and what might be gained or lost of it.'},
    3: {title:'Siblings, short journeys, letters', lilly:'Lilly gave the third house to brothers and sisters, to short journeys near at hand, and to letters or news carried between people.'},
    4: {title:'Father, home, land, lost things', lilly:'The fourth house belonged to the father, to home and land, and to anything lost, which Lilly said this house helped to recover.'},
    5: {title:'Children, pleasure, messengers', lilly:'Lilly read the fifth house as governing children, pleasure and amusement, and messengers sent on another’s behalf.'},
    6: {title:'Sickness, servants, small animals', lilly:'The sixth house was Lilly’s house of sickness, of servants and hired help, and of small animals kept about a household.'},
    7: {title:'Marriage, open enemies, the person asked about', lilly:'Lilly assigned the seventh house to marriage and partnership, to open enemies, and to whatever other person the question itself concerned.'},
    8: {title:'Death, the partner’s estate, wills', lilly:'The eighth house governed death, the estate a partner brought to a marriage, and matters of wills, in Lilly’s scheme of the wheel.'},
    9: {title:'Long journeys, learning, religion', lilly:'Lilly gave the ninth house to long journeys abroad, to learning and the higher sciences, and to religion and the church.'},
    10: {title:'Honour, profession, the mother', lilly:'The tenth house stood for honour, profession and public standing, and, by an older convention Lilly kept, for the mother.'},
    11: {title:'Friends and hopes', lilly:'Lilly read the eleventh house as the house of friends, and of hopes, wishes and the trust placed in other people.'},
    12: {title:'Confinement, secret enemies, large animals', lilly:'The twelfth house belonged to confinement and self-undoing, to secret enemies, and to large animals, in Lilly’s account of the wheel.'}
  };

  const dignity = {
    ruler: {title:'Essential dignity by rulership', text:'Lilly held a planet posted in the sign it ruled to be strong and capable, its business likely to proceed and its testimony as significator given full weight.'},
    exaltation: {title:'Exaltation', text:'In its exaltation a planet was read as raised to unusual honour, Lilly comparing the dignity to a guest greatly esteemed though standing on ground not properly his own.'},
    triplicity: {title:'Triplicity', text:'Triplicity gave a lesser strength than rulership or exaltation, Lilly’s tables assigning fire, earth, air and water each to rulers by day and by night.'},
    term: {title:'The term, or bound', text:'Term, called the bound in older books, granted a modest dignity confined to a narrow arc of degrees, enough to help a matter along but never to carry it alone.'},
    face: {title:'The face, or decan', text:'Weakest of the five essential dignities, the face offered only slight assistance, Lilly’s thirty-six decans following the Chaldean order from Mars at the first degree of Aries.'},
    detriment: {title:'Detriment', text:'A planet fell into detriment opposite the sign of its rulership, and Lilly read the placement as a debility that hindered the matter and weakened the planet’s testimony.'},
    fall: {title:'Fall', text:'Fall placed a planet opposite its exaltation, and Lilly took the condition for an abasement, its natural vigour spent and its promises given little credit.'},
    peregrine: {title:'Peregrine', text:'Wanting the five essential dignities, and not already in detriment or fall, a planet was peregrine -- this section follows Lilly’s point table, keeping detriment and fall apart from peregrine, not doubled.'},
    angular: {title:'Angular houses', text:'Posited in the first, fourth, seventh or tenth, a planet stood angular, a seat Lilly read as vigorous, quick to act and apt to carry its matter forward swiftly.'},
    succedent: {title:'Succedent houses', text:'The second, fifth, eighth and eleventh were succedent, a middling seat Lilly judged steadier than angular but slower, its strength arriving only after some delay.'},
    cadent: {title:'Cadent houses', text:'Third, sixth, ninth and twelfth were cadent, the weakest houses for action, and Lilly read a planet so placed as feeble, its business scattered or set aside.'},
    direct: {title:'Direct motion', text:'Direct motion carried Lilly’s full approval, the planet moving forward through the zodiac much as a matter was expected to move forward through its own course.'},
    retrograde: {title:'Retrograde motion', text:'Retrograde motion reversed that expectation, and Lilly read a planet turned backward as one whose matter was withdrawn, undone, or returned to an earlier state.'},
    combust: {title:'Combustion', text:'Within eight and a half degrees of the Sun a planet was combust, a condition Lilly regarded as severe, its light overwhelmed and its business scorched or suppressed.'},
    underBeams: {title:'Under the Sun’s beams', text:'Between eight and a half and seventeen degrees of the Sun a planet lay under the beams, obscured by nearness, though Lilly judged the hurt gentler than combustion’s.'},
    cazimi: {title:'Cazimi', text:'Within seventeen minutes of the Sun’s own degree a planet was cazimi, in the heart of the Sun, and Lilly counted this rare closeness a dignity rather than a hurt.'},
    free: {title:'Free of the beams', text:'Clear of the Sun’s rays altogether, a planet stood free of the beams, its own light and counsel undimmed, a condition Lilly reckoned wholly to its credit.'},
    viaCombusta: {title:'The via combusta', text:'From the fifteenth degree of Libra to the fifteenth of Scorpio lay the via combusta, a stretch Lilly described as rough and ill-governed, particularly troublesome for the Moon.'},
    increasing: {title:'The Moon increasing in light', text:'Growing fuller between new and full, the Moon was said to increase in light, and Lilly read this waxing as an addition of strength to whatever she then signified.'},
    decreasing: {title:'The Moon decreasing in light', text:'Falling back toward the new Moon, she was said to decrease in light, and Lilly read this waning as a gradual loss of the strength she carried at the full.'}
  };

  const considerations = {
    ascEarly: {title:'The Ascendant too early', present:'When the Ascendant fell within the first three degrees of its sign, Lilly judged the matter not yet ripe, the question raised before its business had properly begun.', absent:'Once the Ascendant stood clear of those first degrees, that particular caution fell away, and Lilly went on to judge the figure as it stood.'},
    ascLate: {title:'The Ascendant too late', present:'When the Ascendant lay within the final three degrees of its sign, Lilly read the matter as already spent or decided, the question arriving too late to alter it.', absent:'Short of those closing degrees, the Ascendant gave nothing to suggest a matter already settled, and judgment went forward on its ordinary footing.'},
    saturnAngular: {title:'Saturn in the first or seventh', present:'Saturn posited in the ascendant or the seventh house made Lilly wary, a placement he associated with a question insincerely put or a matter already privately resolved.', absent:'With Saturn away from those two houses, Lilly set aside that particular wariness and read the chart on its other merits.'},
    moonVoid: {title:'The Moon void of course', present:'A Moon void of course, applying to nothing further before leaving her sign, was read by Lilly as a mark that little would follow from the business asked about.', absent:'A Moon still applying to another planet before changing sign kept her ordinary force, and Lilly took her testimony as active.'},
    viaCombusta: {title:'The Moon in the via combusta', present:'Found between the fifteenth degree of Libra and the fifteenth of Scorpio, the Moon was said by Lilly to pass through rough, ill-governed ground, her testimony weakened there.', absent:'Outside that stretch of the zodiac, the Moon’s testimony stood free of that particular hazard, weighed only by her other conditions.'},
    radical: {title:'Radicality: the hour ruler’s agreement', present:'When the ruler of the planetary hour agreed with the Ascendant’s own ruler, or with a triplicity lord of the Ascendant, Lilly counted the figure radical and fit to be judged.', absent:'Absent that agreement, Lilly still judged many a chart, noting the want of radicality rather than refusing the question outright.'}
  };

  const perfection = {
    byAspect: {title:'Perfection by aspect', text:'Where the significators applied to a perfecting Ptolemaic aspect, completing it before either changed sign, Lilly took this for the plainest evidence that the matter was accomplished.'},
    byReception: {title:'Perfection by reception', text:'Where the significators fell into mutual reception, each disposed of by the other’s rulership or exaltation, Lilly read a friendliness between them that carried the matter forward even absent a perfecting aspect.'},
    translation: {title:'Translation of light', text:'When a swifter planet separated from one significator and applied next to the other, Lilly described it as carrying, or translating, the first significator’s light across to complete the business between them.'},
    collection: {title:'Collection of light', text:'When both significators applied instead to a slower planet that received them both, Lilly read that third planet as collecting their light, drawing the matter together through its own mediation.'},
    none: {title:'Perfection wanting', text:'Where the significators formed none of these—without a perfecting aspect completed, without reception, without translation, without collection—Lilly recorded the chart as lacking the testimony his method required, the question left unresolved by the figure itself.'}
  };

  const planet = {
    Sun: {asSignificator:'As significator Lilly read the Sun for kings, noblemen and men of authority or high office, for fathers, and for persons of a fair, sanguine complexion and generous bearing.'},
    Moon: {asSignificator:'Lilly took the Moon as significator of common people, of women generally, of travellers and messengers, and, in horary practice, as co-significator of the querent alongside the Ascendant’s ruler.'},
    Mercury: {asSignificator:'As significator Mercury stood, for Lilly, for students, clerks, tradesmen and quick-witted persons, and for matters of writing, contracts, reckoning and the exchange of news.'},
    Venus: {asSignificator:'Lilly read Venus as significator of young women, lovers and musicians, of matters touching love, courtship and adornment, and of persons given to ease and pleasant company.'},
    Mars: {asSignificator:'As significator Lilly assigned Mars to soldiers, surgeons and smiths, to hasty, choleric persons quick to anger, and to matters of conflict, iron and sudden violence.'},
    Jupiter: {asSignificator:'Lilly took Jupiter as significator of judges, clergy and men of law, of persons wealthy, generous or devout, and of matters touching religion, counsel and honest increase.'},
    Saturn: {asSignificator:'As significator Saturn stood, for Lilly, for old men, farmers and labourers, for persons melancholic, slow or miserly, and for matters of land, delay, restriction and death.'}
  };

  const hours = 'Planetary hours divided each day, reckoned from sunrise to the following sunrise, into twenty-four unequal parts, twelve running through daylight and twelve through the night, each ruled in turn by one of the seven classical planets. The day itself took its ruler from the weekday—Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn, in the sequence Lilly gave for Sunday through Saturday—and the hours that followed cycled through the same seven planets in the older Chaldean order, Saturn, Jupiter, Mars, Sun, Venus, Mercury and Moon, repeating from the day’s first hour onward. Lilly consulted the ruling planet of the hour a question was asked chiefly as a test of radicality, looking for its agreement with the Ascendant’s own ruler or triplicity lord as one mark that a chart was fit to be judged, and electional astrologers turned to the same table to choose hours suited to the business they had in hand.';

  const electional = 'An astrologer electing a moment looked, in Lilly’s tradition, for a well-dignified planet fit to rule the matter in hand, posited in an angle or otherwise strong, and for the Moon increasing in light, free of the Sun’s beams, and applying to a benefic planet rather than separating from a hard aspect to one of the malefics. Saturn and Mars were kept from the angles where their influence could do the greatest harm, the Ascendant’s ruler was kept strong and unafflicted, and the hour itself was chosen, where practicable, to agree with the matter’s own ruling planet—the same care given a birth chart turned instead toward choosing a moment rather than reading one already given.';

  const closing = 'What follows is a record of how Lilly’s method read a particular figure, set down for the querent to weigh against the question that was actually theirs to ask.';

  return {banner, houseMatters, dignity, considerations, perfection, planet, hours, electional, closing};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HoraryText;
