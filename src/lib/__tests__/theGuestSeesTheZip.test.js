// ─── THE GUEST SEES THE ZIP (owner's invite, 11/24/2026) ─────────────────────
//
// The invite email's WHERE read "street, City, ST" with no ZIP. Every guest
// surface reads the one place line (venueFor.formatVenueAddress): the invite
// card, the invite text, the email facts (backend outward.place_line, held to
// the same fixture rows), the RSVP page and its calendar file. With venueZip
// stored, each prints it (the RSVP page and its calendar files:
// hostv2/e2e/theGuestSeesTheWholeAddress.spec.mjs). Made-up places only.
import { formatVenueAddress } from '../venueFor';
import { inviteCardModel } from '../inviteCard';
import { draftInvite } from '../doItForMe';

const HOME = {
  name: 'Aunt Rosa’s Dinner', type: 'Dinner Party', recordKind: 'host_event', date: '2027-12-04',
  startTime: '18:00', startTimeSource: 'host', venueKind: 'home',
  venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150',
};
const LINE = '42 Elm Ct, Springfield, VA 22150';

describe('every guest surface prints the ZIP', () => {
  test('the one line', () => {
    expect(formatVenueAddress(HOME)).toBe(LINE);
  });
  test('the invite card', () => {
    const where = inviteCardModel(HOME).facts.find((f) => f.label === 'Where');
    expect(where.value).toBe(LINE);
  });
  test('the invite text, at home with no name for the place', () => {
    expect(draftInvite(HOME, null).body).toContain(LINE);
    expect(draftInvite(HOME, null, { voice: 'tighter' }).body).toContain(LINE);
  });
  test('the invite text, at a home she named', () => {
    const ev = { ...HOME, venue: 'Mom’s house' };
    expect(draftInvite(ev, null).body).toContain(`Mom’s house, ${LINE}`);
  });
  test('a town with a ZIP and no street', () => {
    expect(formatVenueAddress({ recordKind: 'host_event', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150' }))
      .toBe('At home in Springfield, VA 22150');
  });
  test('a name that carries its town', () => {
    expect(formatVenueAddress({ venue: 'VFW Post 3150 — Alexandria, VA', venueZip: '22314' }))
      .toBe('VFW Post 3150 — Alexandria, VA 22314');
  });
});
