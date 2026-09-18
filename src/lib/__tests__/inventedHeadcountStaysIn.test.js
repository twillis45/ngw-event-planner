// ─── AN INVENTED HEADCOUNT MAY NOT REACH A VENDOR ────────────────────────────
//
// MEASURED 2026-09-18 (inputs-vs-engine-needs audit). A host who types eight
// words — "Cookout on June 12, 2027" — gets a STORED headcount of 40, substituted
// by the creation seam from the playbook's typical. Everything downstream then
// treats it as fact: a 32–46 attendance band, $2,320 committed, a priced vendor
// plan, `countSet: true` in the return narration — and
//
//     draftVendorOutreach  ->  "for about 40 guests"
//
// Of everything this app derives, that is the ONLY measured case where a number
// the app invented leaves the app in the host's name. A caterer quotes against it.
//
// `startTime` had exactly this bug and solved it with a source field plus an
// outward gate (startTimeIsConfirmed). The headcount had neither — `grep
// guestEstimateSource` over the repo returned ZERO hits, so no surface could have
// consulted the fact even if it had wanted to.
import {
  guestCountFor, guestCountIsConfirmed, guestCountNotice,
  SOURCE_HOST, SOURCE_PLAYBOOK_TYPICAL,
} from '../guestCountFor';
import { draftVendorOutreach, draftShoppingList } from '../doItForMe';

const BASE = { id: 'g', type: 'The Cookout', name: 'Cookout', date: '2027-06-12', venueCity: 'Decatur', venueState: 'GA' };
const OURS = { ...BASE, guestEstimate: 40, guestCountSource: SOURCE_PLAYBOOK_TYPICAL };
const THEIRS = { ...BASE, guestEstimate: 40, guestCountSource: SOURCE_HOST };
const LEGACY = { ...BASE, guestEstimate: 40 };                    // no source ever recorded
const LOCKED = { ...BASE, guestEstimate: 40, guestCount: 40, guestCountSource: SOURCE_PLAYBOOK_TYPICAL };
const ROSTER = { ...BASE, guests: [{ id: 1 }, { id: 2 }, { id: 3 }] };

describe('whose number is it', () => {
  test('the app substituted it — known, but not the host’s', () => {
    const g = guestCountFor(OURS);
    expect(g.count).toBe(40);
    expect(g.known).toBe(true);
    expect(g.source).toBe(SOURCE_PLAYBOOK_TYPICAL);
    expect(g.fromHost).toBe(false);
  });

  test('the host gave it', () => {
    expect(guestCountFor(THEIRS).fromHost).toBe(true);
  });

  test('LEGACY events count as the host’s — the conservative direction', () => {
    // Treating unknown as derived would withhold real headcounts from real vendor
    // briefs on every event created before today. That is a worse failure than
    // the one this fixes, and a silent one. Same rule as startTimeIsConfirmed.
    expect(guestCountFor(LEGACY).source).toBe(null);
    expect(guestCountIsConfirmed(LEGACY)).toBe(true);
  });

  test('a LOCKED count is the host’s even if a stale source says otherwise', () => {
    // guestCount is only ever written by the lock control. The source field
    // describes the ESTIMATE slot and may not cast doubt on a locked number.
    expect(guestCountFor(LOCKED).fromHost).toBe(true);
  });

  test('a roster is the host’s — they entered those people one at a time', () => {
    const g = guestCountFor(ROSTER);
    expect(g.count).toBe(3);
    expect(g.source).toBe(SOURCE_HOST);
  });

  test('no number anywhere claims nothing — null, not zero', () => {
    const g = guestCountFor(BASE);
    expect(g.count).toBe(null);
    expect(g.known).toBe(false);
    expect(g.source).toBe(null);
  });

  test('junk does not throw', () => {
    for (const e of [null, undefined, {}, { guestEstimate: 'lots', guests: 'nope' }]) {
      expect(() => guestCountFor(e)).not.toThrow();
      expect(guestCountFor(e).known).toBe(false);
    }
  });

  test('resolution order is unchanged — no number moves anywhere', () => {
    // The whole point: this file adds a FACT, it does not change a COUNT.
    // guestCount || guestEstimate || guests.length, exactly as every reader does.
    expect(guestCountFor({ guestCount: 7, guestEstimate: 9, guests: [1, 2, 3] }).count).toBe(7);
    expect(guestCountFor({ guestEstimate: 9, guests: [1, 2, 3] }).count).toBe(9);
    expect(guestCountFor({ guests: [1, 2, 3] }).count).toBe(3);
  });
});

describe('the vendor never hears our number', () => {
  test('THE DEFECT: a substituted headcount is not stated to a vendor', () => {
    const d = draftVendorOutreach(OURS, { name: 'Aurora', category: 'Catering' });
    expect(d.body).not.toMatch(/about 40 guests/);
    expect(d.body).not.toMatch(/\b40\b/);
  });

  test('…and the draft is still a usable inquiry, not a stub', () => {
    // Withholding must not produce a broken message. The caterer simply asks.
    const d = draftVendorOutreach(OURS, { name: 'Aurora', category: 'Catering' });
    expect(d.body).toMatch(/Aurora/);
    expect(d.body).toMatch(/cookout/i);
    expect(d.body).toMatch(/available that date/i);
    expect(d.subject).toMatch(/catering inquiry/i);
  });

  test('the HOST is told why — silence would read as "they were told"', () => {
    const d = draftVendorOutreach(OURS, { name: 'Aurora', category: 'Catering' });
    expect(d.notice).toBeTruthy();
    expect(d.notice).toMatch(/40/);
    expect(d.notice).toMatch(/typical/i);
  });

  test('NEGATIVE CONTROL: the host’s own number DOES go to the vendor', () => {
    // A gate that withholds everything is not a gate, it is a deletion.
    const d = draftVendorOutreach(THEIRS, { name: 'Aurora', category: 'Catering' });
    expect(d.body).toMatch(/for about 40 guests/);
    expect(d.notice).toBe(null);
  });

  test('NEGATIVE CONTROL: a legacy event still sends its headcount', () => {
    expect(draftVendorOutreach(LEGACY, { name: 'Aurora', category: 'Catering' }).body)
      .toMatch(/for about 40 guests/);
  });

  test('a locked count reaches the vendor even with a stale typical source', () => {
    expect(draftVendorOutreach(LOCKED, { name: 'Aurora', category: 'Catering' }).body)
      .toMatch(/for about 40 guests/);
  });
});

describe('the host’s OWN documents still use the working number', () => {
  test('the shopping list is inward — it may plan against the typical', () => {
    // Deliberate, and the distinction is the whole design: the gate is about
    // SPEAKING FOR THE HOST TO SOMEONE ELSE, not about the app doing its job.
    // The host reads this list, sees the quantities, and corrects them. A vendor
    // cannot — they just quote.
    const d = draftShoppingList(OURS);
    expect(d).toBeTruthy();
    expect(typeof (d.body || d)).toBe('string');
  });
});

describe('the notice speaks only when the app supplied the number', () => {
  test('nothing to say for a host number', () => {
    expect(guestCountNotice(THEIRS)).toBe(null);
    expect(guestCountNotice(LEGACY)).toBe(null);
    expect(guestCountNotice(BASE)).toBe(null);
  });
});
