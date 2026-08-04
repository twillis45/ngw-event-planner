// ─── "WHERE" IS A POSITION WORD, NOT A PLACE WORD ──────────────────────────
//
// Driven live 2026-08-03 (?stage=phone, Santa Fe 80th). The hero read:
//
//     Add the location.                     <- h2.ask
//     Sort where everyone stays             <- .hero-card h3
//     Open where everyone stays             <- the card's CTA
//
// One item — queue[0].id was `readiness:sort-where-everyone-stays` — speaking
// with two voices. The card title and its CTA agreed with each other; the ASK
// was the outlier, because heroAskFor classified the title by prose and the
// bare word `where` matched the location branch.
//
// This is the same failure the file already documents for seating: a surface
// whose DOMAIN is not its JOB gets answered wrong. "Who sits where" produced
// "Add the location." too.
//
// The rule: an ask must be about the item it sits above.
const { heroAskFor } = require('../heroAsk');

const EV = { id: 'ev-where', name: 'Mom’s 80th', type: 'Birthday', date: '2028-06-17' };
const ask = (title, extra) => heroAskFor({ title, ...(extra || {}) }, EV);

describe('the hero ask is about the item it sits above', () => {
  it('does not answer a lodging cue with "Add the location."', () => {
    expect(ask('Sort where everyone stays')).not.toBe('Add the location.');
  });

  it('does not answer a seating cue with "Add the location." either', () => {
    expect(ask('Who sits where')).not.toBe('Add the location.');
    expect(ask('2 confirmed guests still need seats', { domain: 'guests' })).not.toBe('Add the location.');
  });

  it('still asks for the location when the item really is the location', () => {
    expect(ask('Add the location')).toBe('Add the location.');
    expect(ask('Set the venue')).toBe('Add the location.');
    expect(ask('Where is it happening?')).toBe('Add the location.');
  });

  it('an authored ask always wins, whatever the prose says', () => {
    // The structural remedy this file prescribes: a surface that knows its own
    // job says so, and no regex gets a vote.
    expect(ask('Sort where everyone stays', { ask: 'Sort where everyone stays.' }))
      .toBe('Sort where everyone stays.');
  });
});
