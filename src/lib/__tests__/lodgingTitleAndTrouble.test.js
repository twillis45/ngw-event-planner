// ─── A NAME, AND A WAY TO SAY IT WENT WRONG ────────────────────────────────
//
// Two findings from the 1 August research artifacts, both acted on here.
//
// 1 · TITLE (lodging listing UI). The paste flow's weakest moment is the instant
//     after it works: a bare link carries no name, so a real house landed on the
//     shortlist called "Option 1" and the host had no reason to believe anything
//     had happened. Airbnb's card solves it with TYPE + PLACE — "Apartment in
//     San Juan" — which the research flags as "cheaper to extract AND more
//     scannable than whatever the host pasted".
//
// 2 · TROUBLE (Blink ExperienceOS addendum). "Report a Problem sits at the same
//     level as Mark As Complete… A surface that offers only resolve-or-ignore
//     trains hosts to mark things done that are not done, which corrupts the
//     readiness signal our whole product rests on." Lodging had exactly this
//     shape and no way to express it: a house gets taken, a rate lapses, a host
//     is outbid.
const { lodgingTitleFor, lodgingTrouble } = require('../lodgingIntel');

describe('a candidate gets a name a host recognises', () => {
  it('prefers what the host typed above everything', () => {
    expect(lodgingTitleFor({ label: 'The Ranch House', name: 'Cozy!', kind: 'cabin', place: 'McHenry' }))
      .toBe('The Ranch House');
  });

  it('then what the page said', () => {
    expect(lodgingTitleFor({ name: 'Lakefront A-frame', kind: 'cabin', place: 'McHenry' }))
      .toBe('Lakefront A-frame');
  });

  it('then Airbnb’s own pattern — type in place', () => {
    expect(lodgingTitleFor({ kind: 'cabin', place: 'McHenry' })).toBe('Cabin in McHenry');
    expect(lodgingTitleFor({ kind: 'home', place: 'Deep Creek Lake' })).toBe('Home in Deep Creek Lake');
  });

  it('falls back to the platform, and NEVER invents a place', () => {
    expect(lodgingTitleFor({ url: 'https://www.airbnb.com/rooms/111' })).toBe('Airbnb listing');
    expect(lodgingTitleFor({ url: 'https://www.vrbo.com/222' })).toBe('Vrbo listing');
    // nothing known at all — the surface must ask rather than label
    expect(lodgingTitleFor({})).toBe('');
    expect(lodgingTitleFor(null)).toBe('');
  });
});

const evt = (over) => ({
  id: 'ev-trouble', name: 'Mom’s 80th', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10,
  budget: [], vendors: [], guests: [], ...over,
});

describe('a place can go wrong without the plan ending', () => {
  it('is silent when nothing has gone wrong', () => {
    expect(lodgingTrouble(evt({ lodgingOptions: [{ id: 'a', label: 'A', status: 'option' }] }))).toBeNull();
    expect(lodgingTrouble(evt({ lodgingOptions: [] }))).toBeNull();
    expect(lodgingTrouble(evt({ isDestination: false, lodgingOptions: [{ id: 'a', status: 'gone' }] }))).toBeNull();
  });

  it('says a lost option is lost, and keeps it', () => {
    const t = lodgingTrouble(evt({ lodgingOptions: [
      { id: 'a', label: 'Casa Vista', status: 'gone' },
      { id: 'b', label: 'The Ranch House', status: 'option' },
    ] }));
    expect(t.state).toBe('option-gone');
    expect(t.headline).toMatch(/Casa Vista is gone/);
    expect(t.detail).toMatch(/kept on the list/i);
  });

  it('treats the PICK falling through as its own state — and never says start again', () => {
    const t = lodgingTrouble(evt({ lodgingOptions: [
      { id: 'a', label: 'The Ranch House', status: 'gone', wasChosen: true },
      { id: 'b', label: 'Casa Vista', status: 'option' },
      { id: 'c', label: 'Adobe on Canyon', status: 'option' },
    ] }));
    expect(t.state).toBe('pick-fell-through');
    expect(t.headline).toMatch(/The Ranch House fell through/);
    // the work is NOT lost, and the surface says so
    expect(t.detail).toMatch(/2 other places/);
    expect(t.detail).not.toMatch(/start again|start over/i);
    expect(t.act).toBe('Pick another');
  });

  it('is honest when the pick fell through and nothing else is left', () => {
    const t = lodgingTrouble(evt({ lodgingOptions: [
      { id: 'a', label: 'The Ranch House', status: 'gone', wasChosen: true },
    ] }));
    expect(t.detail).toMatch(/nothing else is on the shortlist/i);
    expect(t.act).toBe('Find more places');
  });

  it('never claims a name it does not have', () => {
    const t = lodgingTrouble(evt({ lodgingOptions: [{ id: 'a', label: '   ', status: 'gone' }] }));
    expect(t.headline).toMatch(/One of your places is gone/);
  });
});
