// ─── THE INVITE TEXT SAYS WHAT EVERY OTHER SCREEN SAYS (audit 2, lanes D + E) ──
//
// D-05: a multi-day event printed only its first day. D-08: the invite text
// decided "is this her home?" with its own regex, so a funeral home read as
// "our place". D-13 / D-14: "Hosted by" and the signature skipped the host
// line every other screen reads (hostNameFor). Fictional sample data only.
import { draftInvite, fmtLongSpan, placePhrase, placeLine } from '../doItForMe';
import { inviteCardModel } from '../inviteCard';
import { buildHelperAsk } from '../helperAsk';

const BASE = {
  id: 'ev-t', name: 'Sample Weekend', type: 'Family Reunion', date: '2027-12-13', endDate: '2027-12-15',
  startTime: '18:00', startTimeSource: 'host', venue: 'The Loft', venueKind: 'venue', venueCity: 'Bowie, MD',
};

describe('one date range', () => {
  test('a multi-day event prints first through last day', () => {
    expect(fmtLongSpan(BASE)).toBe('Monday, December 13 – Wednesday, December 15');
  });
  test('a one-day event prints one day', () => {
    expect(fmtLongSpan({ ...BASE, endDate: '' })).toBe('Monday, December 13');
    expect(fmtLongSpan({ ...BASE, endDate: '2027-12-12' })).toBe('Monday, December 13');
  });
  test('the invite text, the card and the helper ask all carry the range', () => {
    expect(draftInvite(BASE, null).body).toContain('Monday, December 13 – Wednesday, December 15');
    for (const voice of ['tighter', 'warmer', 'playful', 'formal']) {
      expect(draftInvite(BASE, null, { voice }).body).toContain('Wednesday, December 15');
    }
    const when = inviteCardModel(BASE).facts.find((f) => f.label === 'When');
    expect(when.value).toBe(fmtLongSpan(BASE));
    const ask = buildHelperAsk({ event: BASE, hostName: 'Dana Reed', helperName: 'Sam', jobs: [{ kind: 'task', label: 'Ice' }], url: '' });
    expect(ask).toContain('Wednesday, December 15');
  });
});

describe('"our place" only for her home', () => {
  test('a funeral home is a venue, never "our place"', () => {
    const ev = { ...BASE, type: 'Repast', venue: 'Marshall Funeral Home', venueKind: 'venue', venueCity: 'Petersburg, VA' };
    expect(placePhrase(ev)).not.toBe('our place');
    expect(draftInvite(ev, null).body).toContain('Marshall Funeral Home');
  });
  test('a backyard at home is "our place"', () => {
    expect(placePhrase({ ...BASE, venue: 'Backyard', venueKind: 'home' })).toBe('our place');
  });
  test('at home with a street, the guest still gets the street', () => {
    const ev = { ...BASE, venue: 'Our place', venueKind: 'home', venueStreet: '12 Elm St', venueCity: 'Bowie, MD' };
    expect(placeLine(ev)).toBe('our place, 12 Elm St, Bowie, MD');
    expect(draftInvite(ev, null).body).toContain('our place, 12 Elm St, Bowie, MD');
  });
  // A host at home who typed her street as the place's name got it twice:
  // "12 Elm St, 12 Elm St, Springfield, VA" (seen 11/28/2026 rendering the kit's invite).
  test('a home named by its street prints the street once', () => {
    const ev = { ...BASE, venue: '12 Elm St', venueKind: 'home', venueCity: 'Springfield, VA' };
    expect(placeLine(ev)).toBe('12 Elm St, Springfield, VA');
    const named = { ...BASE, venue: '12 Elm St', venueKind: 'home', venueStreet: '12 Elm St', venueCity: 'Springfield, VA' };
    expect(placeLine(named)).toBe('12 Elm St, Springfield, VA');
    expect(draftInvite(ev, null).body).not.toContain('12 Elm St, 12 Elm St');
  });
  test('a named home still keeps its name and its street', () => {
    const ev = { ...BASE, venue: 'Mom’s house', venueKind: 'home', venueStreet: '12 Elm St', venueCity: 'Bowie, MD' };
    expect(placeLine(ev)).toBe('Mom’s house, 12 Elm St, Bowie, MD');
  });
});

describe('the host line', () => {
  const ev = { ...BASE, host: 'Dana Reed' };
  test('the card says who hosts it from the event', () => {
    expect(inviteCardModel(ev).facts.find((f) => f.label === 'Hosted by').value).toBe('Dana Reed');
  });
  test('the invite text is signed by the host, not the account holder', () => {
    expect(draftInvite(ev, null).body).toMatch(/— Dana Reed$/);
    expect(draftInvite({ ...ev, hostName: 'Dana & Lee' }, { name: 'Account Holder' }).body).toMatch(/— Dana & Lee$/);
    expect(draftInvite(BASE, { name: 'Pat Lin' }).body).toMatch(/— Pat Lin$/);
  });
});
