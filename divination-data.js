/* Traditional symbol names; original Ishtar Insights interpretations and prompts. */
(function(root, factory) { const data = factory(); if (typeof module === 'object' && module.exports) module.exports = data; else root.DivinationData = data; })(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const parse = text => text.trim().split('\n').map((line, id) => { const [name, symbol, keyword, meaning, prompt] = line.split('|'); return {id, name, symbol, keyword, meaning, prompt}; });
  const lenormand = parse(`
Rider|rider|News|Something is arriving: a message, visitor or fresh piece of information. Make room to receive it before deciding what it means.|What news needs a thoughtful response rather than an immediate reaction?
Clover|clover|Opportunity|A small opening may be easy to overlook. This card invites a modest experiment rather than a gamble on a guaranteed outcome.|What low-stakes opportunity could I try while it is available?
Ship|ship|Distance|Travel, trade and longing widen the horizon. Distance can offer perspective, but moving away does not automatically resolve what travels with you.|What am I moving toward, and what would I carry with me?
House|house|Home|Home represents your base: routines, belonging and the structures that make life feel held. Look at the quality of that foundation.|What would make my everyday environment more supportive?
Tree|tree|Roots|Slow development asks for steady care. Think about habits and connections that grow over time, without reading the tree as a medical diagnosis.|Which small habit would I like to see take root?
Clouds|clouds|Uncertainty|Visibility is limited. Separate what you know from what you are guessing, and avoid turning a temporary lack of clarity into a fixed conclusion.|What information would help clear this confusion?
Snake|snake|Complexity|A situation may have a winding route or competing interests. Attend to boundaries and observable behavior rather than assuming hidden betrayal.|Where would a more careful route serve me?
Coffin|coffin|Ending|A chapter may need closure, rest or release. Treat this as a symbolic ending, never a prediction of physical death.|What has run its course, and how can I close it with care?
Bouquet|bouquet|Appreciation|Kindness, welcome and beauty can change the tone of an exchange. Notice what is offered freely and what you can genuinely appreciate.|Who or what deserves a specific expression of thanks?
Scythe|scythe|Decision|A clean cut can separate what is useful from what is no longer workable. Precision matters more than speed or dramatic gestures.|What boundary or decision needs a clear edge?
Whip|whip|Repetition|Repeated effort can become practice or friction. Notice whether returning to the same issue is developing skill or deepening a difficult pattern.|What repeated interaction needs a different approach?
Birds|birds|Conversation|Exchanges, chatter and shared concern fill the air. A direct conversation may be more useful than interpreting fragments or rehearsing worries.|What could I ask plainly instead of speculating about?
Child|child|Beginning|Something new needs room to learn. Simplicity, curiosity and small steps are useful; inexperience also benefits from support.|What would a beginner's first step look like here?
Fox|fox|Discernment|Practical intelligence helps you notice incentives and details. Check the fit between appearances and evidence without treating everyone as a threat.|What assumption should I verify before committing?
Bear|bear|Resources|Strength may appear through protection, authority or material support. Consider how power is held and whether your resources are being used sustainably.|Where can I be firm without becoming controlling?
Stars|stars|Direction|An orienting idea can help scattered efforts form a pattern. Inspiration becomes useful when translated into a concrete next step.|What guiding aim can I put into practice this week?
Stork|stork|Change|A shift is taking shape through movement, adjustment or renewal. Look for what can change gradually instead of expecting instant transformation.|Which change is ready for practical support?
Dog|dog|Trust|Dependability grows through consistent action. Consider friendship, mutual help and the difference between loyalty and losing your own boundaries.|Where is trust supported by what people actually do?
Tower|tower|Structure|Institutions, boundaries and solitude create distance. Structure can protect your time, while excessive separation may make support harder to reach.|Which boundary helps me, and which one isolates me?
Garden|garden|Community|Public spaces, networks and shared interests bring encounters. Choose where and how you participate rather than trying to belong everywhere.|Which community would benefit from my presence and contribution?
Mountain|mountain|Obstacle|A substantial difficulty calls for pacing, preparation or another route. Delay can be real without making the whole journey impossible.|What is the obstacle, and what is one workable way around it?
Crossroads|crossroads|Choice|Several routes deserve consideration. Clarify your criteria before treating indecision as a sign that there is no good choice.|Which value should guide the next decision?
Mice|mice|Erosion|Small drains on time, attention or resources can accumulate. Find the manageable leak rather than treating worry as proof of disaster.|What small loss of energy can I address today?
Heart|heart|Affection|Care, attraction and emotional investment deserve honesty. Let warmth coexist with the practical conditions a relationship or project needs.|How can I express care without ignoring my needs?
Ring|ring|Commitment|An agreement gains meaning through repetition and follow-through. Examine the promises being made, including the ones you have made to yourself.|What am I agreeing to, and is that agreement still clear?
Book|book|Knowledge|There is more to learn. Study and patient inquiry can help, while privacy reminds you that not every unanswered question is yours to resolve.|What can I learn responsibly before drawing a conclusion?
Letter|letter|Message|Written words make an exchange concrete. Look closely at the wording, context and practical response a message requires.|What needs to be written clearly or read more carefully?
Man|man|Person|Traditionally a male significator. Here it may represent you or another relevant person of any gender, chosen by context rather than assumed identity.|Whose perspective am I considering, and what do I actually know about it?
Woman|woman|Person|Traditionally a female significator. Here it may represent you or another relevant person of any gender; the card does not identify a stranger or predict a partner.|What would help me understand this person's stated needs?
Lily|lily|Maturity|Patience, peace and considered experience can soften urgency. Look for the response that respects both desire and longer-term values.|What would a calmer, more experienced response look like?
Sun|sun|Vitality|Visibility and energy can make progress easier to recognize. Let confidence support action without becoming a promise that nothing will go wrong.|Where can I put my available energy to good use?
Moon|moon|Recognition|Feeling, imagination and recognition color the situation. Notice the difference between meaningful appreciation and depending entirely on outside approval.|What contribution do I value even when it is not applauded?
Key|key|Opening|An important insight may make a next step more accessible. An opening still needs your judgment about whether and how to enter.|What practical action becomes possible with what I now understand?
Fish|fish|Flow|Money, exchange and movement of resources come into focus. Consider circulation and stewardship rather than reading this as a financial forecast.|Where would a clearer exchange of time or resources help?
Anchor|anchor|Stability|A steady point can support sustained work. Check whether staying put is giving you security or keeping you attached to an exhausted arrangement.|What is worth maintaining, and what could become more flexible?
Cross|cross|Responsibility|A burden, duty or matter of meaning asks to be acknowledged. Responsibility becomes more workable when chosen commitments are separated from unnecessary guilt.|Which responsibility is mine, and where could I ask for help?
`);
  const runes = parse(`
Fehu|ᚠ|Stewardship|Resources become useful through care and circulation. Notice what you have, what it costs to maintain, and how it can support a meaningful effort.|What resource can I use more deliberately?
Uruz|ᚢ|Strength|Strength includes endurance and the ability to work within your limits. Build capacity through manageable effort rather than proving yourself through exhaustion.|What would sustainable strength look like today?
Thurisaz|ᚦ|Boundary|A threshold asks for attention before action. Pause long enough to distinguish a useful protective boundary from an impulsive defensive response.|Where would a pause protect what matters?
Ansuz|ᚨ|Expression|Listen for language that clarifies rather than impresses. Learning, conversation and careful expression can change how a problem is understood.|What needs to be said or heard more clearly?
Raidho|ᚱ|Journey|Movement becomes a journey when direction and rhythm work together. Review your route and the agreements that help you travel with others.|What adjustment would make the next stage more workable?
Kenaz|ᚲ|Illumination|A focused light reveals detail. Craft, study and curiosity can make a vague idea easier to shape into something useful.|What skill or question would illuminate this situation?
Gebo|ᚷ|Exchange|A gift changes a relationship through the way it is offered and received. Look for reciprocity that leaves both people free.|What would a fair and freely chosen exchange involve?
Wunjo|ᚹ|Belonging|Joy can emerge from shared purpose and small satisfactions. Notice the relationships and practices in which you do not need to perform belonging.|Where do I feel both welcome and able to be myself?
Hagalaz|ᚺ|Disruption|An interruption may expose what needs protection or repair. Work with the actual conditions rather than demanding that everything continue as planned.|What can I stabilize while conditions change?
Nauthiz|ᚾ|Necessity|A constraint can clarify essentials. Start with what is needed, and avoid confusing a temporary limitation with your whole identity.|What is necessary now, and what can wait?
Isa|ᛁ|Stillness|A pause may preserve energy or reveal a stuck pattern. Give stillness a purpose, then decide what would signal readiness to move.|What can I notice when I stop pushing?
Jera|ᛃ|Season|Effort and outcome unfold on different schedules. Attend to repetition, timing and what can be tended now without forcing the harvest.|What cycle am I in, and what work belongs to it?
Eihwaz|ᛇ|Continuity|A dependable inner structure can help you meet transitions. Flexibility and persistence need not cancel one another.|What steady value can support me through this change?
Perthro|ᛈ|Uncertainty|Not everything is visible in advance. Leave room for discovery while taking responsibility for the choices you can make now.|What uncertainty can I allow without surrendering my judgment?
Algiz|ᛉ|Protection|Protection can be active and relational: asking for support, noticing limits and creating room to respond. It is a practice, not invulnerability.|What support or boundary would help me feel better resourced?
Sowilo|ᛊ|Clarity|A clear aim can gather scattered effort. Let confidence grow from what you can observe and practice rather than an expectation of guaranteed success.|What is the clearest useful action available to me?
Tiwaz|ᛏ|Integrity|A principle becomes real through a choice that honors it. Consider fairness, accountability and the cost you are actually willing to carry.|What would acting fairly require of me?
Berkano|ᛒ|Nurture|New growth benefits from shelter and repeated care. This is an invitation to cultivate, not a prediction of pregnancy or family events.|What emerging part of my life needs gentle attention?
Ehwaz|ᛖ|Cooperation|Shared movement depends on trust, communication and compatible pace. Discuss the route rather than assuming everyone wants the same destination.|Which agreement would improve our cooperation?
Mannaz|ᛗ|Humanity|Self-understanding develops alongside other people. Make room for your limits, contributions and the perspectives that challenge your assumptions.|What can I learn about myself through an honest exchange?
Laguz|ᛚ|Flow|Feelings can carry useful information without deciding every action. Give them room, then choose a channel that supports you.|What feeling needs acknowledgment before I act?
Ingwaz|ᛜ|Potential|Some efforts need a protected interval before they are shared. Gather resources and let development have its own pace.|What am I preparing that is not ready for display?
Dagaz|ᛞ|Perspective|A change in light can reveal another way to understand familiar circumstances. Try a new frame without dismissing what you already know.|What becomes possible if I reconsider the frame?
Othala|ᛟ|Inheritance|What you inherit may include place, stories, skills and expectations. Choose what to carry forward and what no longer fits your values.|Which inherited pattern do I want to preserve or revise?
`);
  const oracle = parse(`
The Lantern|1|Attention|You do not need to illuminate the entire road. Bring your attention to the part close enough to meet with care, and let that be sufficient for this step.|What deserves my full attention for ten minutes?
The Threshold|2|Readiness|An opening does not require an immediate crossing. Feel the difference between hesitation that protects you and delay that has become a habit.|What would help me enter this next chapter willingly?
The Well|3|Replenishment|Giving from a depleted place can make even meaningful work feel heavy. Return to something that restores capacity without asking you to earn the rest.|What reliably replenishes me?
The Thread|4|Connection|A small contact can hold a larger story together. Follow one thread of interest, care or unfinished conversation before seeking a complete pattern.|Which connection would I like to tend?
The Seed|5|Possibility|Potential asks for conditions, not applause. Choose a small beginning and give it light, time and a realistic place in your life.|What can I begin at a scale I can sustain?
The Mirror|6|Honesty|Look without rushing to praise or condemn. A useful reflection lets you see a pattern while remembering that you are more than that pattern.|What can I acknowledge without judging myself?
The Shore|7|Boundary|A boundary can be a place of meeting as well as separation. Decide what comes in, what goes out and where you need firmer ground.|What boundary would allow more ease?
The Ember|8|Devotion|A quiet interest may need tending rather than a dramatic reinvention. Protect a little time for what continues to matter when novelty fades.|What small act would keep this interest alive?
The Garden|9|Cultivation|Your attention shapes the conditions around you. Notice what you are feeding through repetition, and choose what deserves continued care.|What am I cultivating through my everyday choices?
The Vessel|10|Capacity|You cannot hold everything equally well at once. Choosing what belongs in your hands now can be a form of care for everything else.|What can I set down to hold this well?
The Window|11|Perspective|A wider view need not invalidate your experience. Invite a different angle and see which part of the picture becomes more understandable.|Whose perspective could broaden my own?
The Bridge|12|Repair|Connection may be rebuilt through a specific, proportionate action. A bridge requires willing ground on both sides; you need not construct it alone.|What repair is both possible and mutual?
The Nest|13|Shelter|Safety often grows from ordinary arrangements: a place to rest, a trusted person, a dependable routine. Honor the conditions that help you soften.|What makes rest feel more possible?
The Compass|14|Values|When every option has tradeoffs, a value can orient the choice. Choose a direction you can explain to yourself with honesty.|Which value should guide this decision?
The Rain|15|Release|Some feelings need room to pass through before they can be organized. Let expression be simple, and postpone the demand to make it meaningful.|What am I ready to let move through me?
The Mountain Path|16|Pacing|A worthwhile journey can include switchbacks. Break the effort into stages and measure progress by the ground you can actually cover.|What is the next manageable stretch?
The Loom|17|Integration|Different parts of your life may be asking to work together. Try combining two existing strengths before searching for a completely new answer.|What could I bring together in a useful way?
The Bell|18|Awakening|Something ordinary may be calling your attention again. Respond to the specific signal rather than waiting for certainty about the whole story.|What have I been noticing but not responding to?
The Hearth|19|Welcome|Warmth does not need to be elaborate. An invitation, a meal or an unhurried conversation can make care tangible.|How could I make someone, including myself, feel welcome?
The Open Hand|20|Allowance|Holding too tightly can make adjustment difficult. Release one demand about how the process must unfold while keeping your values in view.|Where could I allow more room?
The Orchard|21|Receiving|You may be more practiced at effort than receiving its results. Notice what has become available and let appreciation be part of the work.|What good thing can I receive without minimizing it?
The Still Lake|22|Presence|A quieter surface can help you notice what is already there. Give yourself a brief interval without needing it to solve anything.|What do I notice when I stop adding more input?
The Returning Bird|23|Renewal|Returning is not always going backward. You can revisit a place, practice or relationship with new information and different boundaries.|What would I like to return to differently?
The Morning Door|24|Choice|A fresh start can be a small decision made inside an ordinary day. Choose one action that makes the next hour more aligned with your intentions.|What would a beginning look like right now?
`);
  const figures = parse(`
Via|1111|Movement|The Way emphasizes change and passage. A flexible route may suit this situation better than an attempt to make every condition permanent.|Where can I allow a useful change of direction?
Populus|2222|Collective|The People emphasizes the surrounding group and its rhythms. Listen to shared experience while keeping your own judgment available.|What belongs to the group, and what is my own response?
Fortuna Major|2211|Lasting support|Greater Fortune suggests strength developed through sustained foundations. Look for the resources that remain useful after immediate enthusiasm passes.|What dependable support can I build upon?
Fortuna Minor|1122|Passing support|Lesser Fortune suggests help tied to a particular moment or condition. Use the opening thoughtfully while preparing to carry your own momentum.|How can I make good use of temporary support?
Conjunctio|2112|Meeting|Conjunction brings paths into contact. An exchange or combination may be useful if the terms and intentions are made clear.|What connection would make this situation more workable?
Carcer|1221|Containment|Prison points to restriction or a firm container. A limit may focus effort, but examine whether it is protective, chosen or ready to change.|Which limit needs acceptance, and which needs revision?
Acquisitio|2121|Gathering|Gain invites attention to what you are taking in. More is useful only when it serves a purpose you can sustain.|What is worth adding to my life now?
Amissio|1212|Letting go|Loss asks what can be released or spent. A chosen letting-go may create room, while an unwanted change deserves acknowledgment.|What can I release with care?
Laetitia|1222|Uplift|Joy brings an upward movement of spirit. Let encouragement support a real action rather than treating a good feeling as proof of an outcome.|What lifts my attention toward possibility?
Tristitia|2221|Grounding|Sorrow brings weight and stillness. Meet disappointment gently and look for practical support rather than forcing optimism.|What support would make this heaviness easier to carry?
Albus|2212|Composure|White suggests calm observation and measured response. A quieter approach can reveal distinctions that urgency has obscured.|What becomes clearer when I slow my response?
Rubeus|2122|Intensity|Red brings heat, appetite and agitation. Strong feeling asks for a constructive channel, especially before making an irreversible choice.|How can I give this intensity a useful outlet?
Puer|1121|Initiative|The Boy emphasizes directness and forceful beginnings. Courage works best when it includes awareness of consequences.|Where can I act decisively without rushing?
Puella|1211|Harmony|The Girl emphasizes attraction, ease and relationship. Seek an honest peace that does not require avoiding a necessary conversation.|What would make harmony more than an appearance?
Caput Draconis|2111|Entry|The Dragon's Head marks an opening and a movement inward. Consider what conditions would make a beginning welcome and sustainable.|What am I ready to let into my life?
Cauda Draconis|1112|Departure|The Dragon's Tail marks completion and a movement outward. Finish what needs finishing before carrying it into a new setting.|What ending would allow a cleaner beginning?
`);
  return {lenormand, runes, oracle, figures};
});
