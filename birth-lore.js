/* Shared birthday lore: the static tables and pure helpers that more than one room needs.
   The sky portrait, the Chinese portrait, the daily-horoscope wiring and the tarot reading
   room all read from here, so none of them can own these values. Moved verbatim out of
   app.js when it was split into per-room modules. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BirthLore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const majorArcana = [
    { number: "0", name: "The Fool", sigil: "✦", keywords: "beginnings · trust · possibility", upright: "A fresh start is asking for your attention. Follow curiosity, keep your pack light, and let the first step teach you what the map cannot.", reversed: "The wish to begin is real, but the footing may need checking. Slow down long enough to notice the edge, then choose your leap with care.", prompt: "What would you try if you did not need the whole path first?" },
    { number: "I", name: "The Magician", sigil: "✧", keywords: "agency · skill · focus", upright: "You already have a useful tool in hand. Name the result you want, gather your attention, and turn one small action into momentum.", reversed: "Scattered energy is diluting your influence. Choose one honest intention and make sure your tools are serving it rather than performing around it.", prompt: "Which resource have you been treating as unavailable?" },
    { number: "II", name: "The High Priestess", sigil: "☾", keywords: "intuition · stillness · knowing", upright: "The answer is taking shape beneath the noise. Leave a little room for silence, dreams, and the knowledge that does not need to prove itself yet.", reversed: "Too much outside commentary may be drowning out your inner signal. Step back from the feed and listen for what remains when the noise drops away.", prompt: "What do you know before anyone else weighs in?" },
    { number: "III", name: "The Empress", sigil: "❀", keywords: "nourishment · creativity · abundance", upright: "Something grows when it receives steady care. Make room for pleasure, making, and the relationships that return your energy instead of only asking for it.", reversed: "Your giving may have outpaced your reserves. Restore the soil: rest, receive, and let a good thing develop at a human pace.", prompt: "What deserves tending before it deserves judging?" },
    { number: "IV", name: "The Emperor", sigil: "♜", keywords: "structure · boundaries · stewardship", upright: "A clear container will help your ambition breathe. Set the boundary, name the next rule, and use structure as support rather than control.", reversed: "A structure has become too rigid or too absent. Rework the rule so it protects what matters without turning the whole room into a test.", prompt: "Which boundary would make your next decision easier?" },
    { number: "V", name: "The Hierophant", sigil: "☉", keywords: "tradition · teaching · belonging", upright: "A trusted practice or teacher can give your question a useful frame. Learn the lineage, then decide what you want to carry forward.", reversed: "A borrowed rule may no longer fit the life you are actually living. Question the script without dismissing the wisdom that shaped it.", prompt: "Which tradition helps you feel more like yourself?" },
    { number: "VI", name: "The Lovers", sigil: "∞", keywords: "choice · alignment · connection", upright: "The important choice is the one that brings your actions into alignment with your values. Let honesty be more persuasive than urgency.", reversed: "A split between desire and values is asking to be acknowledged. Stop negotiating against yourself and name the choice you can stand behind.", prompt: "What would an aligned yes look like in practice?" },
    { number: "VII", name: "The Chariot", sigil: "➤", keywords: "direction · resolve · movement", upright: "Two strong forces can move together when you take the reins. Pick a direction, protect your attention, and let consistent motion do the convincing.", reversed: "Competing pulls are making forward motion feel like friction. Pause to choose the destination before asking more effort from yourself.", prompt: "Where could less steering create more progress?" },
    { number: "VIII", name: "Strength", sigil: "♡", keywords: "courage · patience · compassion", upright: "Gentle persistence is the power available today. Meet the difficult part without making it an enemy, and your patience will become a kind of courage.", reversed: "You may be trying to overpower a tender problem. Trade force for a steadier hand, especially in the way you speak to yourself.", prompt: "What would become possible with a kinder inner voice?" },
    { number: "IX", name: "The Hermit", sigil: "⌁", keywords: "solitude · guidance · perspective", upright: "A little chosen solitude will clarify what constant input has blurred. Carry the lantern close and look for the next true step, not the whole staircase.", reversed: "Withdrawal may be protecting an old pattern rather than offering insight. Keep the quiet, but let one trusted person know where you are.", prompt: "What question needs your undistracted attention?", image: "/tarot-decks/historical/tarot-de-marseille/front/09-l-hermite.png" },
    { number: "X", name: "Wheel of Fortune", sigil: "◌", keywords: "change · cycles · timing", upright: "The wheel is moving. Meet the changing conditions with flexibility, notice the opening, and remember that a season is not a permanent identity.", reversed: "A repeating loop is showing you where agency can return. Name the pattern, then change one part of the turn instead of waiting for luck to do it.", prompt: "What cycle are you ready to interrupt?" },
    { number: "XI", name: "Justice", sigil: "⚖", keywords: "truth · balance · consequence", upright: "Clarity comes from telling the truth about the tradeoff. Let evidence and values sit at the same table, then make the cleanest decision you can.", reversed: "Something is being rationalized instead of faced. Restore balance by naming your part, correcting what you can, and releasing the story that avoids consequence.", prompt: "What fact would make this decision more honest?" },
    { number: "XII", name: "The Hanged Man", sigil: "⟡", keywords: "surrender · pause · new perspective", upright: "A pause can reveal the angle effort has hidden. Release the need to force timing and let a different perspective rearrange the problem.", reversed: "Waiting has become a substitute for choosing. Keep the insight you gained, then make the small move that turns suspension into change.", prompt: "What could you see if you stopped trying to solve it head-on?", image: "/tarot-decks/historical/rider-waite-smith/front/12-the-hanged-man.png" },
    { number: "XIII", name: "Death", sigil: "✺", keywords: "ending · release · transformation", upright: "An old form is ready to end so the living part can continue. Grieve what is complete, clear the space, and let the next shape be different.", reversed: "You may be carrying a chapter past its natural ending. Ask what the attachment is protecting, then loosen your grip one honest inch.", prompt: "What is finished even if you have not named it?" },
    { number: "XIV", name: "Temperance", sigil: "∿", keywords: "balance · synthesis · healing", upright: "The next answer is a blend rather than a swing between extremes. Adjust the mixture patiently until it supports the life you want to keep living.", reversed: "The ingredients are out of proportion. Restore one daily rhythm, one relationship, or one promise before attempting a total reset.", prompt: "Where would a small adjustment create relief?" },
    { number: "XV", name: "The Devil", sigil: "⛓", keywords: "attachment · appetite · agency", upright: "Look clearly at the bargain underneath the habit. Naming what has power over you is the beginning of taking your choice back.", reversed: "A chain is loosening because you can finally see its link. Replace shame with a practical boundary and choose the next free action.", prompt: "What promise does this attachment make, and what does it cost?" },
    { number: "XVI", name: "The Tower", sigil: "⚡", keywords: "revelation · disruption · truth", upright: "A structure that cannot hold is showing you the truth quickly. Let the false certainty fall, protect what is alive, and build from what remains real.", reversed: "You may be bracing against a necessary change. Soften the resistance enough to choose what comes down and what you want to save.", prompt: "Which truth is asking to be seen before it gets louder?" },
    { number: "XVII", name: "The Star", sigil: "☆", keywords: "hope · renewal · openness", upright: "Hope is practical here: make the small repair, share the honest wish, and let your future receive a little more light than your past did.", reversed: "The light is still present, but fatigue may be narrowing your view. Rest, reconnect to a simple source of meaning, and let hope be quiet for a while.", prompt: "What small sign of renewal can you make visible today?", image: "/tarot-decks/historical/rider-waite-smith/front/17-the-star.jpg" },
    { number: "XVIII", name: "The Moon", sigil: "☽", keywords: "dreams · uncertainty · imagination", upright: "Not every shape in the dark is a threat. Move slowly, check the story your fear is telling, and trust what becomes clear through patient attention.", reversed: "The fog is beginning to lift. Let new information revise the story, and avoid turning a half-seen worry into a permanent conclusion.", prompt: "What part of this story still needs daylight?" },
    { number: "XIX", name: "The Sun", sigil: "☼", keywords: "vitality · clarity · joy", upright: "Let the good news be uncomplicated. Make the work visible, spend time where your energy returns, and allow warmth to count as evidence.", reversed: "Joy may be present but hard to receive. Lower the demand for perfection and let one clear, ordinary pleasure be enough for today.", prompt: "Where can you choose more directness and warmth?" },
    { number: "XX", name: "Judgement", sigil: "♢", keywords: "calling · reckoning · renewal", upright: "A past version of the question is ready to be answered differently. Hear the call, take the lesson, and step forward without requiring your old self to disappear.", reversed: "Self-judgement is making the next chapter sound like a verdict. Separate accountability from punishment and answer the part of you asking to live more fully.", prompt: "What are you ready to answer for, and what are you ready to answer to?" },
    { number: "XXI", name: "The World", sigil: "◎", keywords: "completion · integration · wholeness", upright: "A cycle has gathered enough wisdom to be honored. Mark the completion, take the learning with you, and let the next horizon open from solid ground.", reversed: "The final stitch is still waiting. Finish the small piece that keeps you from feeling complete, then stop asking an old chapter for new instructions.", prompt: "What completion deserves to be acknowledged before you move on?" }
  ];

  const zodiacSigns = [
    { name: "Aries", symbol: "♈", start: [3, 21], element: "Fire", modality: "Cardinal", ruler: "Mars", stones: "Diamond · bloodstone", flower: "Sweet pea", mantra: "I begin", horoscope: "Your spark is useful when it has somewhere to go. Give the brave idea a small, visible first move, then let momentum answer the doubts." },
    { name: "Taurus", symbol: "♉", start: [4, 20], element: "Earth", modality: "Fixed", ruler: "Venus", stones: "Emerald · rose quartz", flower: "Poppy", mantra: "I build", horoscope: "Your steady attention is a creative force. Choose what is worth tending, protect your pace, and let pleasure become part of the plan." },
    { name: "Gemini", symbol: "♊", start: [5, 21], element: "Air", modality: "Mutable", ruler: "Mercury", stones: "Agate · tiger's eye", flower: "Lavender", mantra: "I connect", horoscope: "Curiosity is opening more than one door. Follow the conversation that makes you sharper, and give your many interests one thread to follow." },
    { name: "Cancer", symbol: "♋", start: [6, 21], element: "Water", modality: "Cardinal", ruler: "Moon", stones: "Ruby · moonstone", flower: "Delphinium", mantra: "I feel", horoscope: "Your sensitivity is information, not an inconvenience. Make a warm boundary around what matters and let care guide the next choice." },
    { name: "Leo", symbol: "♌", start: [7, 23], element: "Fire", modality: "Fixed", ruler: "Sun", stones: "Peridot · onyx", flower: "Sunflower", mantra: "I shine", horoscope: "There is room for your full-hearted contribution. Let the work be seen, share the credit generously, and make joy part of your leadership." },
    { name: "Virgo", symbol: "♍", start: [8, 23], element: "Earth", modality: "Mutable", ruler: "Mercury", stones: "Sapphire · moss agate", flower: "Morning glory", mantra: "I refine", horoscope: "A thoughtful edit can free more energy than another push. Make the useful improvement, then leave enough room for life to surprise you." },
    { name: "Libra", symbol: "♎", start: [9, 23], element: "Air", modality: "Cardinal", ruler: "Venus", stones: "Opal · lapis lazuli", flower: "Rose", mantra: "I balance", horoscope: "Harmony starts with a clear yes and a clear no. Name the value you are protecting, then let that value shape the room around you." },
    { name: "Scorpio", symbol: "♏", start: [10, 23], element: "Water", modality: "Fixed", ruler: "Mars · Pluto", stones: "Topaz · obsidian", flower: "Chrysanthemum", mantra: "I transform", horoscope: "You can tell which truth has weight by the way it keeps returning. Meet it directly, release the old armor, and let your next version be simpler." },
    { name: "Sagittarius", symbol: "♐", start: [11, 22], element: "Fire", modality: "Mutable", ruler: "Jupiter", stones: "Turquoise · tanzanite", flower: "Carnation", mantra: "I seek", horoscope: "A wider horizon is calling, but the meaningful adventure begins with a direction. Choose the experience that expands your understanding, not just your itinerary." },
    { name: "Capricorn", symbol: "♑", start: [12, 22], element: "Earth", modality: "Cardinal", ruler: "Saturn", stones: "Garnet · smoky quartz", flower: "Pansy", mantra: "I make real", horoscope: "Your long view is an advantage. Break the mountain into a promise you can keep this week, and let earned trust replace the need to rush." },
    { name: "Aquarius", symbol: "♒", start: [1, 20], element: "Air", modality: "Fixed", ruler: "Saturn · Uranus", stones: "Amethyst · garnet", flower: "Orchid", mantra: "I imagine", horoscope: "The unusual solution deserves a fair hearing. Share the idea with people who can help it become useful, then keep enough freedom to revise it." },
    { name: "Pisces", symbol: "♓", start: [2, 19], element: "Water", modality: "Mutable", ruler: "Jupiter · Neptune", stones: "Aquamarine · amethyst", flower: "Water lily", mantra: "I dream", horoscope: "Your imagination is picking up a meaningful signal. Give the dream a container—a page, a ritual, or a first sketch—so it can meet the real world." }
  ];

  const birthstones = {
    1: "Garnet", 2: "Amethyst", 3: "Aquamarine", 4: "Diamond", 5: "Emerald", 6: "Pearl · moonstone", 7: "Ruby", 8: "Peridot", 9: "Sapphire", 10: "Opal · tourmaline", 11: "Topaz · citrine", 12: "Turquoise · zircon"
  };

  const moonNames = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
  }

  // A stone's crystal page: "Tiger's eye" -> /crystals/tigers-eye/. crystal-data.js slugs match.
  function stoneSlug(name) {
    return String(name).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function stoneLinks(text) {
    return String(text).split(" · ").map(name => `<a href="/crystals/${stoneSlug(name)}/">${escapeHTML(name)}</a>`).join(" · ");
  }

  function birthdayParts(value) {
    return BirthdayInsights.parseDate(value);
  }

  function zodiacFor(parts) {
    const value = parts.month * 100 + parts.day;
    const ordered = [...zodiacSigns].sort((a, b) => (a.start[0] * 100 + a.start[1]) - (b.start[0] * 100 + b.start[1]));
    let match = ordered[ordered.length - 1];
    ordered.forEach(sign => {
      if (value >= sign.start[0] * 100 + sign.start[1]) match = sign;
    });
    return match;
  }

  function decanFor(parts, sign) {
    const signIndex = zodiacSigns.findIndex(item => item.name === sign.name);
    const next = zodiacSigns[(signIndex + 1) % zodiacSigns.length];
    const start = new Date(Date.UTC(parts.year, sign.start[0] - 1, sign.start[1], 12));
    const birthday = parts.date;
    if (sign.name === "Capricorn" && birthday < start) start.setUTCFullYear(parts.year - 1);
    const days = Math.max(0, Math.floor((birthday - start) / 86400000));
    return `${Math.min(3, Math.floor(days / 10) + 1)}${Math.min(3, Math.floor(days / 10) + 1) === 1 ? "st" : Math.min(3, Math.floor(days / 10) + 1) === 2 ? "nd" : "rd"} decan`;
  }

  function moonPhaseFor(date) {
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
    const synodicMonth = 29.530588853;
    const age = ((date.getTime() - knownNewMoon) / 86400000) % synodicMonth;
    const normalized = (age + synodicMonth) % synodicMonth;
    const index = Math.round(normalized / synodicMonth * 8) % 8;
    const illumination = Math.round((1 - Math.cos(normalized / synodicMonth * Math.PI * 2)) / 2 * 100);
    return { name: moonNames[index], illumination };
  }

  function tarotBirthCardFor(parts) {
    const digits = `${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}`.split("").reduce((sum, digit) => sum + Number(digit), 0);
    let number = digits;
    while (number > 21) number = String(number).split("").reduce((sum, digit) => sum + Number(digit), 0);
    return majorArcana[number] || majorArcana[0];
  }

  function localDateKey() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  return {majorArcana, zodiacSigns, birthstones, moonNames, escapeHTML, stoneSlug, stoneLinks, birthdayParts, zodiacFor, decanFor, moonPhaseFor, tarotBirthCardFor, localDateKey};
});
