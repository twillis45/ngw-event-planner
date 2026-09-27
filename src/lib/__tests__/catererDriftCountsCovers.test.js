// ── The caterer's number is compared against COVERS, never against ROWS ───────
//
// MEASURED 2026-09-27 on the demo event (ev-x-retirement-party). The hero read,
// verbatim:
//
//   "The caterer is set for 60, but 5 guests have said yes. Until those match,
//    seating, meal counts, and the day's timing are all working from the wrong
//    number."
//
// The 60 is right. The 5 was not. `catererCount` counts PLATES (that event's own
// vendor note: "Plated dinner for 60 + 2 vegetarian/GF counts"), and it was being
// compared to `guests.filter(rsvp === 'Yes').length` — a count of ROWS. A roster
// row is one invited ADULT: its filled `plusOne` is a second adult and its `kids`
// are additive mouths. The canonical band resolved SEVEN confirmed people on that
// event, and one of the five Yes rows literally asks for "Two kids' meals".
//
// This is the fourth instance of the repo's recurring "one field, two meanings"
// class, and the third of this exact row-vs-person collision: attendanceBand()
// and crabPlan.rosterHeadcount() were both fixed for it on 2026-07-27, each with
// an audit note. This predicate was the last reader still counting rows.
//
// The headcount-mode half of the same measurement: guestMode 'count' with
// guestCount 40 and catererCount 40 — two numbers in perfect agreement — raised
// catererDrift === true, because a count-only host has no yes ROWS at all.
import { deriveCommandCenterData, eventPlan } from '../../CommandCenter';
const { SAMPLE_EVENTS_EXTRA } = require('../../data/sampleEventsExtra.js');

const ev = (extra) => ({
  id: 'e1', name: 'Gala', type: 'Birthday Party', date: '2026-12-01',
  vendors: [{ id: 'v1', name: 'Acme Catering', category: 'Catering', status: 'Contracted', cost: 1000 }],
  guests: [], budget: [], timeline: [],
  ...extra,
});
const g = (id, rsvp, extra = {}) => ({ id, name: id, rsvp, kids: 0, plusOne: '', ...extra });

describe('caterer drift counts covers, not roster rows', () => {
  it('a Yes row brings its kids: one row plus two kids is three covers, and three plates match', () => {
    const d = deriveCommandCenterData(ev({
      catererCount: 3,
      guests: [g('a', 'Yes', { kids: 2 })],
    }));
    expect(d.confirmedHeadcount).toBe(3);
    expect(d.catererDrift).toBe(false);
  });

  it('a Yes row brings its plusOne too — 1 row, 1 plusOne, 1 kid is 3 covers', () => {
    const d = deriveCommandCenterData(ev({
      catererCount: 3,
      guests: [g('a', 'Yes', { kids: 1, plusOne: 'Sam' })],
    }));
    expect(d.confirmedHeadcount).toBe(3);
    expect(d.catererDrift).toBe(false);
  });

  it('only a CONFIRMED row\'s party counts — a Maybe and its kids are not covers yet', () => {
    const d = deriveCommandCenterData(ev({
      catererCount: 1,
      guests: [g('a', 'Yes'), g('b', 'Maybe', { kids: 4 })],
    }));
    expect(d.confirmedHeadcount).toBe(1);
    expect(d.catererDrift).toBe(false);
  });

  it('the headcount-mode host has no yeses, so the caterer is read against THEIR number', () => {
    const d = deriveCommandCenterData(ev({ guestMode: 'count', guestCount: 40, catererCount: 40 }));
    expect(d.confirmedHeadcount).toBe(40);
    expect(d.catererDrift).toBe(false);
  });

  it('no number on the guest side at all raises no mismatch — there is nothing to disagree with', () => {
    const d = deriveCommandCenterData(ev({ catererCount: 60 }));
    expect(d.confirmedHeadcount).toBe(null);
    expect(d.catererDrift).toBe(false);
  });

  // NEGATIVE CONTROLS — a real disagreement must still be raised, or the
  // assertions above would pass on a predicate that never fires.
  it('a real disagreement still fires, and the delta is in covers', () => {
    const d = deriveCommandCenterData(ev({
      catererCount: 10,
      guests: [g('a', 'Yes', { kids: 2 }), g('b', 'Yes')],
    }));
    expect(d.confirmedHeadcount).toBe(4);
    expect(d.catererDrift).toBe(true);
    expect(d.cateringDriftDelta).toBe(-6);
  });

  it('a headcount-mode host whose caterer holds a different number is still told', () => {
    const d = deriveCommandCenterData(ev({ guestMode: 'count', guestCount: 40, catererCount: 60 }));
    expect(d.catererDrift).toBe(true);
    expect(d.cateringDriftDelta).toBe(-20);
  });

  // THE HOST-REACHABLE CLAIM. The number the host reads in the hero is the cover
  // count, and the sentence never again states a row count as if it were people.
  it('the demo event states 7 covers, not 5 rows', () => {
    const demo = SAMPLE_EVENTS_EXTRA.find((e) => e.id === 'ev-x-retirement-party');
    expect(deriveCommandCenterData(demo).confirmedHeadcount).toBe(7);
    // The engine string, where the reported sentence is authored — the voice layer
    // (lib/nextActionRenderer) may rephrase it, but it never invents a number.
    const caterer = eventPlan(demo).nextActions.find((a) => a.category === 'caterer');
    expect(caterer).toBeTruthy();
    expect(caterer.consequence).toContain('set for 60');
    expect(caterer.consequence).toContain('comes to 7');
    expect(caterer.consequence).not.toMatch(/said yes/);
  });
});
