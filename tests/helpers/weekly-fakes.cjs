'use strict';

// A stand-in for Glimmer: reads the facts out of the request and answers with a block that the
// validators accept. `fail` names blocks to answer badly ('Aries', 'overview', 'subjects'). `seed`
// (default 0, reproducing the original wording exactly) picks between two equally valid openings,
// so a test that regenerates the same sign twice from a fresh fakeGlimmer() instance can tell the
// two replies apart, the way two real sampled completions never collide.
const FILLER = 'Keep the pace even, finish one thing before starting the next, and let the small jobs stay small. ';
function fakeGlimmer({alias = 'muse-glimmer-30b-local', fail = [], calls = [], seed = 0} = {}) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: alias})};
    const user = JSON.parse(init.body).messages.find(m => m.role === 'user').content;
    const facts = JSON.parse(user.slice(user.indexOf('{'), user.lastIndexOf('}') + 1));
    let label, content;
    if (user.startsWith('Fact sheet for')) {
      label = user.match(/^Fact sheet for (\w+)/)[1];
      const day = facts.events[0] ? `On ${facts.events[0].weekday} the sky marks a turn. ` : '';
      const open = seed % 2 === 0 ? 'The week asks for steady hands.' : 'The week asks for a steady hand.';
      content = `${open} The Sun spends the week in ${facts.placements[0].sector}, and the Moon is ${facts.moon} as it opens. ${FILLER.repeat(3)}\n\n${day}${FILLER.repeat(3)}Rest when the work is done.`;
    } else if (user.startsWith('Week sheet')) {
      label = 'overview';
      content = `The week keeps an even keel. The Moon is ${facts.moon} as it opens. ${FILLER.repeat(3)}\n\n${facts.events.map(e => `On ${e.weekday} the ${e.body} ${e.what}.`).join(' ')} ${FILLER.repeat(3)}Rest when the work is done.`;
    } else {
      label = 'subjects';
      content = JSON.stringify({subjects: ['A steady week with one clear turning point', 'Finish first, then begin: the week ahead', 'Your week: even pace and a weekend shift'],
        preview: 'An even start, a turn at the weekend, and one thing worth finishing.'});
    }
    calls.push(label);
    if (fail.includes(label)) content = 'It will be fine.';
    return {ok: true, json: async () => ({choices: [{message: {content}}]})};
  };
}

module.exports = {FILLER, fakeGlimmer};
