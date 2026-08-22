// ─── WHO HAVE YOU ACTUALLY TOLD? ────────────────────────────────────────────
//
// The transport board (2026-08-21) deferred guest sending and authorized this
// instead: the app remembers who the host says they told. The failure mode it
// closes is the one that actually ruins an event — forgetting a person on a
// list of forty.
//
// Everything here defends one line: this is the HOST'S word, never the app's.
// The moment a told record reads as a delivery claim, the product has lied
// about something it cannot know, on the surface where being wrong costs the
// most.
import { recordTold, clearTold, isTold, guestToldMap, toldRollup, toldLine } from '../guestTold';

const ev = (guests, guestTold) => ({ id: 'e1', guests, guestTold });
const reachable = (id, name) => ({ id, name, phone: '555-0100' });

describe('recording', () => {
  test('it writes the host as the source, explicitly', () => {
    const m = recordTold({}, 'g1', 'text', '2026-08-22T10:00:00.000Z');
    expect(m.g1.attested).toBe(true);
    expect(m.g1.channel).toBe('text');
    expect(m.g1.at).toBe('2026-08-22T10:00:00.000Z');
    // Nothing in the record may imply the message arrived.
    expect(JSON.stringify(m)).not.toMatch(/delivered|sent|verified/i);
  });

  test('telling someone twice keeps the FIRST time', () => {
    // The first telling is the one that answers "have they had a chance to
    // reply?" — which is what a host is really asking when they look. A later
    // tap must not reset that clock and make a three-day silence look fresh.
    const a = recordTold({}, 'g1', 'text', '2026-08-20T10:00:00.000Z');
    const b = recordTold(a, 'g1', 'email', '2026-08-22T10:00:00.000Z');
    expect(b.g1.at).toBe('2026-08-20T10:00:00.000Z');
    expect(b.g1.channel).toBe('email');        // but the latest channel is true
  });

  test('it is undoable', () => {
    // A mis-tap has to be reversible or hosts stop tapping honestly, and then
    // the record is worth less than no record.
    const a = recordTold({}, 'g1', 'text', '2026-08-22T10:00:00.000Z');
    expect(isTold(a, 'g1')).toBe(true);
    const b = clearTold(a, 'g1');
    expect(isTold(b, 'g1')).toBe(false);
    expect(clearTold(b, 'g1')).toBe(b);        // clearing twice changes nothing
  });

  test('it never invents a record from a missing id', () => {
    expect(recordTold({}, '', 'text')).toEqual({});
    expect(recordTold({}, null, 'text')).toEqual({});
    expect(guestToldMap({})).toEqual({});
    expect(guestToldMap(null)).toEqual({});
  });
});

describe('the rollup counts only people who can BE told', () => {
  test('a guest with no phone and no email is not "still to tell"', () => {
    // They are unreachable, not outstanding. Counting them in a number the
    // host is meant to drive to zero turns a fact into a nag they can never
    // satisfy.
    const r = toldRollup(ev([
      reachable('g1'), reachable('g2'),
      { id: 'g3', name: 'No contact details' },
    ], {}));
    expect(r.total).toBe(2);
    expect(r.left).toBe(2);
  });

  test('an email alone is reachable', () => {
    const r = toldRollup(ev([{ id: 'g1', email: 'a@b.co' }], {}));
    expect(r.total).toBe(1);
  });

  test('it counts what was actually recorded', () => {
    const map = recordTold(recordTold({}, 'g1', 'text'), 'g2', 'email');
    const r = toldRollup(ev([reachable('g1'), reachable('g2'), reachable('g3')], map));
    expect(r).toMatchObject({ told: 2, total: 3, left: 1 });
  });

  test('a told record for a guest who has LEFT the roster is not counted', () => {
    // Deleting a guest must not leave a phantom in the numerator, which would
    // read as "told 3 of 2".
    const map = recordTold({}, 'gone', 'text');
    const r = toldRollup(ev([reachable('g1')], map));
    expect(r.told).toBe(0);
    expect(r.total).toBe(1);
  });
});

describe('the sentence', () => {
  test('the ruling copy, exactly', () => {
    expect(toldLine(24, 41, 17)).toBe('Told 24 of 41 — 17 still to tell');
    expect(toldLine(0, 41, 41)).toBe('Nobody marked told yet — the app remembers as you go');
    expect(toldLine(41, 41, 0)).toBe('Told all 41');
  });

  test('nobody reachable says NOTHING, rather than "Told 0 of 0"', () => {
    expect(toldLine(0, 0, 0)).toBe('');
    expect(toldRollup(ev([{ id: 'g1', name: 'no contact' }], {})).line).toBe('');
  });

  test('no state anywhere says "Sent"', () => {
    // The standing rail across the whole outlet: the app never claims delivery
    // it cannot verify, and a host-attested record is the furthest thing from
    // verified.
    for (const line of [toldLine(24, 41, 17), toldLine(0, 41, 41), toldLine(41, 41, 0)]) {
      expect(line).not.toMatch(/\bsent\b/i);
      expect(line).not.toMatch(/delivered|received|confirmed/i);
    }
  });
});
