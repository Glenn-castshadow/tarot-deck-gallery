/* Calendar facts and original reflection copy. Conventions/sources: docs/BIRTHDAY-INSIGHTS.md. */
const BirthdayInsights = (() => {
  const mod = (n, d) => ((n % d) + d) % d;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const animals = [
    {name:'Rat', glyph:'鼠', words:'Resourcefulness · curiosity · observation', reflection:'Look for the small opening others have overlooked. Resourcefulness becomes more useful when it is shared.', prompt:'What could you make possible with what is already at hand?'},
    {name:'Ox', glyph:'牛', words:'Patience · care · persistence', reflection:'Let steady attention carry a meaningful promise. Leave room to change your method while staying true to the work.', prompt:'Which commitment deserves a sustainable pace?'},
    {name:'Tiger', glyph:'虎', words:'Courage · initiative · independence', reflection:'Give your courage a clear purpose. A brave step can be quiet, measured and chosen with care.', prompt:'Where would one honest action serve you better than a dramatic leap?'},
    {name:'Rabbit', glyph:'兔', words:'Sensitivity · grace · discernment', reflection:'Notice the spaces in which you can soften without disappearing. Gentleness can coexist with a firm boundary.', prompt:'What would help you feel both connected and protected?'},
    {name:'Dragon', glyph:'龍', words:'Imagination · presence · possibility', reflection:'Make room for a larger vision, then give it a form someone else can understand. Invite others into the making.', prompt:'What is the first tangible shape of your big idea?'},
    {name:'Snake', glyph:'蛇', words:'Attention · renewal · deliberation', reflection:'Let a period of observation inform your next move. Release a role or expectation that has become too small.', prompt:'What are you ready to outgrow without needing to reject your past?'},
    {name:'Horse', glyph:'馬', words:'Movement · expression · freedom', reflection:'Follow the direction that restores your energy. Balance the pleasure of movement with a place to return and rest.', prompt:'Where does freedom need a little structure to flourish?'},
    {name:'Goat', glyph:'羊', words:'Creativity · tenderness · community', reflection:'Make something that offers comfort or beauty. Your contribution can be subtle and still change the atmosphere.', prompt:'What kind of care would make your creative work easier?'},
    {name:'Monkey', glyph:'猴', words:'Ingenuity · play · adaptability', reflection:'Try the unexpected route and stay curious about the result. Finish one experiment before collecting too many new ones.', prompt:'What could a playful experiment teach you this week?'},
    {name:'Rooster', glyph:'雞', words:'Clarity · craft · attentiveness', reflection:'Bring a neglected detail into focus. Let precision improve the work without becoming a demand for perfection.', prompt:'Which small refinement would make the biggest difference?'},
    {name:'Dog', glyph:'狗', words:'Loyalty · fairness · guardianship', reflection:'Protect the relationships and values you can stand behind. Include your own needs in the circle of care.', prompt:'Where would a clear agreement strengthen trust?'},
    {name:'Pig', glyph:'豬', words:'Generosity · enjoyment · sincerity', reflection:'Receive the good that is already available. Share from a full cup and give simple pleasures your attention.', prompt:'What would enough feel like today?'}
  ];
  const stems = [['甲','Jia'],['乙','Yi'],['丙','Bing'],['丁','Ding'],['戊','Wu'],['己','Ji'],['庚','Geng'],['辛','Xin'],['壬','Ren'],['癸','Gui']];
  const branches = [['子','Zi'],['丑','Chou'],['寅','Yin'],['卯','Mao'],['辰','Chen'],['巳','Si'],['午','Wu'],['未','Wei'],['申','Shen'],['酉','You'],['戌','Xu'],['亥','Hai']];
  const phases = [
    {name:'Wood', glyph:'木', theme:'Make room to grow', prompt:'Choose one idea to tend. What conditions would help it take root?'},
    {name:'Fire', glyph:'火', theme:'Give something expression', prompt:'Share a thought, a story or a piece of work with someone who can receive it.'},
    {name:'Earth', glyph:'土', theme:'Care for what sustains you', prompt:'Tend one ordinary source of steadiness: a meal, a space or a reliable routine.'},
    {name:'Metal', glyph:'金', theme:'Refine what matters', prompt:'Keep the essential part and release one distraction. What becomes clearer?'},
    {name:'Water', glyph:'水', theme:'Listen before moving', prompt:'Allow a little quiet. Which question changes when you stop rushing its answer?'}
  ];
  const westernThemes = {
    Aries:['Ask directly for what you need, and leave room for an honest response.','Choose one clear beginning instead of several competing starts.','Practice a pause that helps your next action become intentional.'],
    Taurus:['Let affection show through consistent, tangible care.','Build a rhythm you can maintain after the initial enthusiasm.','Notice where comfort supports you and where it keeps you still.'],
    Gemini:['Follow curiosity with a question that invites depth.','Give your many ideas a shared thread and a place to land.','Make room for a conversation without a screen or a second task.'],
    Cancer:['Offer care without taking responsibility for every feeling in the room.','Protect a calm setting for the work that matters to you.','Ask for the tenderness you are so ready to give.'],
    Leo:['Be generous with attention as well as with your own expression.','Let a piece of work be seen before it feels flawless.','Find a source of pleasure that asks for no audience.'],
    Virgo:['Ask whether help is wanted before offering the solution.','Make one useful improvement, then recognize what is already working.','Let rest be part of your practice rather than a reward for finishing.'],
    Libra:['Name your preference early enough for a real conversation.','Use your sense of balance to clarify a difficult tradeoff.','A gentle no can protect a more wholehearted yes.'],
    Scorpio:['Let trust grow through clear agreements and honest disclosure.','Bring sustained attention to the question beneath the obvious task.','Choose a private way to release what you have been carrying.'],
    Sagittarius:['Share the discovery, and stay interested in a different viewpoint.','Connect the immediate task to a horizon worth moving toward.','Give yourself an experience that renews curiosity without adding pressure.'],
    Capricorn:['Let reliability include warmth, not only responsibility.','Break the long project into one promise you can keep this week.','Make room for a part of life that does not need to become productive.'],
    Aquarius:['Bring your unusual perspective into a conversation grounded in care.','Test the idea with the people who might actually use it.','Balance time with a community and time to think independently.'],
    Pisces:['Be compassionate while keeping your own needs in view.','Give imagination a container: a sketch, a draft or a small ritual.','Choose a grounding sensory practice when the day feels diffuse.']
  };
  const square = [4,9,2,3,5,7,8,1,6];
  const numbers = {
    1:{glyph:'一', pinyin:'yī', title:'Begin with one', context:'In this square, 1 sits opposite 9. Opposite cells add to 10, with 5 at the centre.', prompt:'What deserves your undivided attention?'},
    2:{glyph:'二', pinyin:'èr', title:'Notice the pair', context:'The square places 2 opposite 8. Use their relationship as a starting point for thinking about exchange and balance.', prompt:'Which partnership would benefit from a clearer exchange?'},
    3:{glyph:'三', pinyin:'sān', title:'Find a new possibility', context:'The row 3–5–7 adds to 15. Its two outer numbers balance around the centre.', prompt:'What third possibility exists beyond the two choices you first noticed?'},
    4:{glyph:'四', pinyin:'sì', title:'Give a thought a structure', context:'Four can be avoided in some Chinese-speaking settings because sì resembles sǐ, meaning death. Beliefs vary with language and context; a birthday digit does not predict misfortune.', prompt:'What supportive structure would help you feel more at ease?'},
    5:{glyph:'五', pinyin:'wǔ', title:'Return to the centre', context:'Five occupies the centre of the Lo Shu. Every row, column and main diagonal totals 15.', prompt:'What brings you back to a sense of enough?'},
    6:{glyph:'六', pinyin:'liù', title:'Let things move smoothly', context:'Six is commonly associated with smooth progress in Chinese number symbolism. Here it remains a cultural association, not a guarantee of an outcome.', prompt:'Where could a small adjustment reduce unnecessary friction?'},
    7:{glyph:'七', pinyin:'qī', title:'Look a little closer', context:'Seven sits opposite 3 in the square. Their sum is 10, the same as every other opposite pair.', prompt:'Which assumption would reward a second look?'},
    8:{glyph:'八', pinyin:'bā', title:'Consider prosperity', context:'Eight is prized in many Chinese-speaking communities because its sound evokes prospering or making a fortune, particularly through Cantonese wordplay.', prompt:'What kind of abundance matters to you beyond accumulation?'},
    9:{glyph:'九', pinyin:'jiǔ', title:'Think about what lasts', context:'Nine shares its Mandarin sound with jiǔ, meaning long-lasting. It also has a long history in imperial and longevity symbolism.', prompt:'What would you like your present effort to leave behind?'}
  };

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const [year,month,day] = match.slice(1).map(Number);
    const date = new Date(`${value}T12:00:00Z`);
    if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth()+1 !== month || date.getUTCDate() !== day) return null;
    return {year,month,day,date};
  }

  function calendarFormatter() {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-chinese', {calendar:'chinese', year:'numeric', month:'long', day:'numeric', timeZone:'UTC'});
      return formatter.resolvedOptions().calendar === 'chinese' ? formatter : null;
    } catch { return null; }
  }

  function chineseProfile(parts, formatter = calendarFormatter()) {
    if (!parts || parts.year < 1901 || parts.year > 2100 || !formatter) return null;
    try {
      const tokens = formatter.formatToParts(parts.date);
      const get = key => tokens.find(part => part.type === key)?.value;
      const year = Number(get('relatedYear'));
      const day = Number(get('day'));
      const month = get('month');
      if (!Number.isInteger(year) || ![parts.year,parts.year-1].includes(year) || !month || day < 1 || day > 30 || !Number.isInteger(day)) return null;
      const stemIndex = mod(year-1984,10), branchIndex = mod(year-1984,12);
      return {year, day, month:month.replace(/bis$/, ' (leap)'), animal:animals[branchIndex], phase:phases[Math.floor(stemIndex/2)], polarity:stemIndex%2 ? 'Yin' : 'Yang', stem:stems[stemIndex], branch:branches[branchIndex], position:mod(year-1984,60)+1, beforeNewYear:year < parts.year};
    } catch { return null; }
  }

  function birthHour(time) {
    const match = /^(\d{2}):(\d{2})$/.exec(time || '');
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
    const index = Math.floor((Number(match[1])+1)%24/2);
    const start = mod(index*2-1,24), end = mod(start+2,24);
    return {animal:animals[index].name, branch:branches[index], range:`${String(start).padStart(2,'0')}:00–${String(end).padStart(2,'0')}:00`};
  }

  function numberStudy(parts) {
    if (!parts) return null;
    const dateDigits = `${String(parts.year).padStart(4,'0')}${String(parts.month).padStart(2,'0')}${String(parts.day).padStart(2,'0')}`;
    const counts = Array(10).fill(0);
    for (const digit of dateDigits) counts[Number(digit)]++;
    let value = [...dateDigits].reduce((sum,digit) => sum+Number(digit),0);
    const steps = [value];
    while (value > 9) { value = [...String(value)].reduce((sum,digit) => sum+Number(digit),0); steps.push(value); }
    return {dateDigits, counts, steps, root:value, repeated:square.filter(n=>counts[n]>1).sort(), absent:square.filter(n=>counts[n]===0).sort()};
  }

  function numberDetail(study, number) {
    const item = numbers[number];
    if (!item || !study) return '';
    const count = study.counts[number];
    return `<p class="reading-label">Explore number ${number} · ${item.glyph} ${item.pinyin}</p><h5>${item.title}</h5><p class="number-count">${count ? `${count} occurrence${count===1?'':'s'} in your birth date` : 'This digit does not occur in your birth date'}</p><p>${item.context}</p><p class="insight-prompt"><strong>Journal prompt</strong> ${item.prompt}</p>`;
  }

  function renderNumbers(parts) {
    const study = numberStudy(parts);
    return `<div class="insight-intro"><p class="reading-label">Chinese number symbolism · a modern birthday overlay</p><h4>Look for patterns. Give them meaning.</h4><p>The Lo Shu is a nine-cell magic square. Explore its numbers, then see how often each appears in your Gregorian birth date.</p></div>
      <div class="number-study"><div><div class="lo-shu-grid" role="group" aria-label="Explore the nine Lo Shu numbers">${square.map(n=>`<button type="button" data-lo-shu="${n}" aria-pressed="${n===5}" aria-label="Number ${n}, ${study.counts[n]} occurrences"><span class="lo-shu-digit">${n}</span><span class="lo-shu-glyph" aria-hidden="true">${numbers[n].glyph}</span><small>${study.counts[n] ? `${study.counts[n]} in date` : 'Not in date'}</small></button>`).join('')}</div><p class="insight-caption">4–9–2 / 3–5–7 / 8–1–6<br>Each row, column and main diagonal adds to 15.</p></div>
      <article id="lo-shu-detail" class="number-detail" aria-live="polite">${numberDetail(study,5)}</article></div>
      <div class="number-summary"><article><p class="reading-label">Birth-date root</p><strong class="root-number">${study.root}</strong><p>${[...study.dateDigits].join(' + ')} = ${study.steps.join(' → ')}</p></article><article><p class="reading-label">Repeated digits</p><h5>${study.repeated.join(' · ') || 'None'}</h5><p>${study.repeated.length ? 'These digits occur more than once. Choose one in the square to explore its meaning.' : 'Each non-zero digit occurs at most once in this date.'}</p></article><article><p class="reading-label">Digits not in this date</p><h5>${study.absent.join(' · ') || 'None'}</h5><p>These are simply absent digits. Every number remains available as a reflection.</p></article></div>
      <details class="insight-method"><summary>How to read this number study</summary><p>The magic square and Chinese number associations are cultural material. Placing the digits of a Gregorian birthday into the square is a modern interpretive exercise; it is not an ancient Chinese personality test. Zero is counted in the date but has no cell in the 1–9 square (${study.counts[0]} zero${study.counts[0]===1?'':'s'} here).</p><p>The birth-date root repeatedly adds all digits until one remains. This page reduces 11, 22 and 33 too. The titles and journal prompts are original Ishtar Insights reflections, not predictions or fixed traits.</p><p>Read more: <a href="https://mathworld.wolfram.com/LoShu.html" target="_blank" rel="noopener">Wolfram MathWorld: Lo Shu</a> · <a href="https://www.open.edu/openlearn/languages/chinese-the-tip-your-tongue-culture-behind-the-numbers" target="_blank" rel="noopener">Open University: number culture</a> · <a href="https://chinaheritage.net/journal/counting-up-to-nine/" target="_blank" rel="noopener">China Heritage: nine</a></p></details>`;
  }

  function renderChinese(profile, time) {
    if (!profile) return `<div class="birthday-empty">Chinese-calendar details are unavailable for this date or browser. This feature supports 1901–2100 in browsers with a Chinese calendar. Your sky portrait and number study remain available.</div>`;
    const {animal,phase,polarity,stem,branch,year,month,day,position,beforeNewYear} = profile;
    const hour = birthHour(time);
    return `<div class="chinese-portrait"><div class="animal-seal" aria-hidden="true"><span>${animal.glyph}</span><small>${stem[0]}${branch[0]}</small></div><div class="insight-intro"><p class="reading-label">Your Chinese zodiac year</p><h4>${phase.name} ${animal.name}</h4><p class="animal-keywords">${animal.words}</p><p>${animal.reflection}</p><p class="insight-prompt"><strong>Journal prompt</strong> ${animal.prompt}</p></div></div>
      <dl class="chinese-facts"><div><dt>Lunar year</dt><dd>${year}<small>${beforeNewYear ? 'Your birthday falls before Lunar New Year in '+(year+1) : 'Animal-year boundary: Lunar New Year'}</small></dd></div><div><dt>Lunar birthday</dt><dd>${escape(month)} · day ${day}<small>Chinese-calendar equivalent of your entered date</small></dd></div><div><dt>Year stem</dt><dd>${stem[0]} ${stem[1]} · ${polarity} ${phase.name}<small>Year-stem phase, not a complete element profile</small></dd></div><div><dt>Earthly branch</dt><dd>${branch[0]} ${branch[1]} · ${animal.name}<small>${stem[1]}-${branch[1]} · ${position} of the 60-year cycle</small></dd></div>${hour ? `<div><dt>Birth-hour association</dt><dd>${hour.branch[0]} ${hour.branch[1]} · ${hour.animal}<small>${hour.range} · entered clock time</small></dd></div>` : ''}</dl>
      <article class="phase-reflection"><span aria-hidden="true">${phase.glyph}</span><div><p class="reading-label">${polarity} ${phase.name} · a reflection</p><h5>${phase.theme}</h5><p>${phase.prompt}</p><p class="insight-caption">${polarity==='Yang' ? 'Try an outward gesture: initiate, express or make something visible.' : 'Try a receptive gesture: observe, listen or allow something to develop.'}</p></div></article>
      <details class="insight-method"><summary>Calendar tradition, interpretation & sources</summary><p>This profile uses Lunar New Year for the animal-year change, so January and February birthdays can belong to the preceding lunar year. Chinese astrology schools may use a different boundary: BaZi commonly uses Li Chun (Beginning of Spring) for its year pillar. This is an animal-year portrait, not a Four Pillars or Day Master calculation.</p><p>Wood, Fire, Earth, Metal and Water are the five phases, often translated as elements. Yin and yang describe complementary qualities in this tradition, not a gender assignment. The animal and element journal prompts here are original reflective writing. If a birth time is entered, its two-hour association uses that clock time without birthplace, time-zone or solar-time correction.</p><p>Calendar conversion supports 1901–2100 and treats your entry as a civil date. Birthplace is saved for future chart work but does not alter these calculations. Near a calendar boundary, check a specialist calendar for the convention you intend to use.</p><p>Sources: <a href="https://www.hko.gov.hk/en/gts/time/12animals.htm" target="_blank" rel="noopener">Hong Kong Observatory: animal cycle</a> · <a href="https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm" target="_blank" rel="noopener">stems, branches & hours</a> · <a href="https://joeyyap.com/dlll267/Joey%20Yap%27s%20Meet%20The%2010%20Stems_.pdf" target="_blank" rel="noopener">year-stem element terminology</a></p></details>`;
  }

  return {parseDate, chineseProfile, birthHour, numberStudy, numberDetail, renderNumbers, renderChinese, westernThemes, square};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = BirthdayInsights;
