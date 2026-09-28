// ─── ANYTHING OUTGOING CARRIES WHO SENT IT ────────────────────────────────
//
// Host, 2026-09-28: "need host carried to anything outgoing."
//
// draftLodgingNote took `event` alone, so it COULD NOT sign. It is the one
// deliverable of the lodging cockpit — a host copies it into the group chat,
// telling sixteen people where to stay, what the rate is and when the block
// expires — and it went out from nobody in particular, while every other
// draft in doItForMe (invite, run-of-show, the vendor notes) already ended
// with the host's name.
import {
  draftLodgingNote, draftVendorPaymentReminder, draftVendorBriefAsk,
  draftGuestUpdate, draftRidesNote, draftGettingHereNote, draftParkingInstructions,
} from '../doItForMe';

const EV = {
  name: 'the 50th', lodging: { hotelName: 'The Anaheim Grand', rate: 189, code: 'NGW50', from: 'negotiated' },
};

describe('the host signs what goes out', () => {
  test('the note ends with the host when we know who they are', () => {
    const { body } = draftLodgingNote(EV, { name: 'Rita' });
    expect(body.trimEnd().endsWith('— Rita')).toBe(true);
  });

  test('and says nothing rather than something empty when we do not', () => {
    for (const p of [null, undefined, {}, { name: '' }, { name: '   ' }]) {
      const { body } = draftLodgingNote(EV, p);
      expect(body).not.toMatch(/—\s*$/);
      expect(body.trimEnd().endsWith('Just reply here.')).toBe(true);
    }
  });

  test('the sign-off is the LAST thing, after the practical detail', () => {
    // A name buried mid-note is not a signature. It follows the questions
    // line, the way the other drafts in this file do.
    const { body } = draftLodgingNote(EV, { name: 'Rita' });
    const lines = body.trim().split('\n').filter(Boolean);
    expect(lines[lines.length - 1]).toBe('— Rita');
    expect(lines[lines.length - 2]).toMatch(/reply here/i);
  });

  test('signing changes nothing else about the note', () => {
    const unsigned = draftLodgingNote(EV, null).body;
    const signed = draftLodgingNote(EV, { name: 'Rita' }).body;
    expect(signed.startsWith(unsigned.trimEnd())).toBe(true);
  });

  test('no hotel, no note — a signature never conjures one', () => {
    expect(draftLodgingNote({ name: 'x' }, { name: 'Rita' }).body).toBe('');
  });
});


// ─── AND EVERY OTHER THING THAT LEAVES ────────────────────────────────────
//
// Seven drafts took no profile and could not sign. Six of them are messages
// and are signed now; the seventh is not a message at all.
describe('the rest of what goes out', () => {
  const P = { name: 'Rita' };
  const EV = {
    name: 'the 50th', date: '2027-11-06',
    venueCity: 'Anaheim', state: 'CA',
    travel: { providing: true },
    lodging: { hotelName: 'The Anaheim Grand', rate: 189, code: 'NGW50' },
  };

  test('a vendor payment note is signed at every one of its three endings', () => {
    // It composes its body from array literals rather than the `lines`
    // accumulator, at three separate returns — the shape most likely to get
    // one ending signed and two forgotten.
    for (const v of [
      { name: 'Grand', booked: true, depositAmt: 500, depositPaid: false },
      { name: 'Grand', booked: true, cost: 2000, depositAmt: 500, depositPaid: true, balancePaid: false },
      { name: 'Grand' },
    ]) {
      const { body } = draftVendorPaymentReminder(EV, v, P);
      expect(body.trimEnd().endsWith('— Rita')).toBe(true);
    }
  });

  test('a vendor brief ask and a guest update are signed', () => {
    expect(draftVendorBriefAsk(EV, { name: 'Grand' }, P).body.trimEnd().endsWith('— Rita')).toBe(true);
    const gu = draftGuestUpdate(EV, {}, P).body;
    if (gu.trim()) expect(gu.trimEnd().endsWith('— Rita')).toBe(true);
  });

  test('PARKING IS NOT SIGNED, because it is not a message', () => {
    // App.js writes this straight into the `parkingNotes` FIELD. A signature
    // there would land mid-paragraph inside whatever embeds it. Not every
    // function called draft* is something a host sends.
    const parking = draftParkingInstructions(EV);
    expect(typeof parking).toBe('string');
    expect(parking).not.toMatch(/— Rita/);
  });

  test('unsigned stays clean when no name is on file', () => {
    for (const fn of [draftRidesNote, draftGettingHereNote]) {
      const body = fn(EV, null).body || '';
      expect(body).not.toMatch(/—\s*$/);
    }
  });
});
