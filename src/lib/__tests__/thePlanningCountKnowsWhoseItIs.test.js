// ─── THE CANONICAL PLANNING COUNT MUST KNOW WHOSE NUMBER IT IS ──────────────
//
// SPRINT 0.5, DECISION 1. Sprint 0 reported that the repo had no explicit
// attendance semantics and that 29 consumers read the raw headcount field
// because "protection belongs at the boundary". Both halves were wrong in the
// same direction Sprint 0's other three corrections were — asserting absence
// after failing to find a module named after the concept.
//
// WHAT ACTUALLY EXISTS, and is already designated canonical:
//
//   guestCountFor(ev)   → { count, known, source, fromHost }
//                         the number AND WHOSE IT IS. Pure, cheap.
//   attendanceBand(ev)  → { basis, confirmed, planning, low, high, band,
//                           because, … }
//                         the PLANNING SEMANTICS: a confirmed count, a planning
//                         count, a provenance basis, and a status — the exact
//                         shape Sprint 0.5 asked whether we needed to invent.
//
// `HostShellV2:3887` calls attendanceBand "the canonical reader"; `:4040` says
// it "owns the question"; `:4029` records a prior migration TO it from a module
// that had been calling expectedFromPlanned around it. The semantics were never
// missing.
//
// ── THE REAL DEFECT: THE TWO LAYERS DO NOT COMPOSE ─────────────────────────
//
// MEASURED 2026-10-19. attendanceBand never reads `guestCountSource`, so for
// these two events — identical but for who supplied the 40 — it returned
// BYTE-IDENTICAL output:
//
//   { guestEstimate: 40, guestCountSource: 'host' }
//   { guestEstimate: 40, guestCountSource: 'playbook-typical' }
//     both → basis 'estimate', confirmed 0, planning 46, low 32, high 46
//
// So a consumer doing the RIGHT thing — using the canonical planning API
// instead of the raw field — still cannot tell a number the host gave from one
// the app made up. Migrating the 29 raw readers to attendanceBand would not
// have fixed that; it would have spread a provenance-blind reader wider.
//
// This is live, not theoretical. `orchestratorTools.js:36` exposes
// attendanceBand to an AI orchestrator as `get_headcount` — "the resolved guest
// count and the honest attendance band" — which is a number a model may quote.
//
// ── WHAT THIS FILE PINS ────────────────────────────────────────────────────
//
// The band now carries the provenance it always had access to, so the one
// canonical reader can answer both questions a consumer actually has: how many
// should I plan for, and may I say that number out loud. Planning still works
// on an estimate — that is the product, and withholding it would be the
// "useless planning experience" Sprint 0.5 explicitly refuses.
import { attendanceBand } from '../playbooks';
import { guestCountFor } from '../guestCountFor';

const cookout = (over = {}) => ({
  id: 'ev-band', type: 'Cookout', date: '2027-06-12',
  budget: [], vendors: [], guests: [],
  ...over,
});
const hostSaid = (n = 40) => cookout({ guestEstimate: n, guestCountSource: 'host' });
const appMadeUp = (n = 40) => cookout({ guestEstimate: n, guestCountSource: 'playbook-typical' });

describe('(premise) the two fixtures differ only in who supplied the number', () => {
  test('same count, different provenance', () => {
    expect(guestCountFor(hostSaid()).count).toBe(40);
    expect(guestCountFor(appMadeUp()).count).toBe(40);
    expect(guestCountFor(hostSaid()).fromHost).toBe(true);
    expect(guestCountFor(appMadeUp()).fromHost).toBe(false);
  });
});

describe('the canonical band reports whose number it is', () => {
  test('a host-stated estimate is marked as the host’s', () => {
    const b = attendanceBand(hostSaid());
    expect(b.countFromHost).toBe(true);
    expect(b.countSource).toBe('host');
  });

  test('an app-substituted estimate is marked as NOT the host’s', () => {
    // The assertion Sprint 0 could not have made: the two were identical.
    const b = attendanceBand(appMadeUp());
    expect(b.countFromHost).toBe(false);
    expect(b.countSource).toBe('playbook-typical');
  });

  test('and the two are no longer indistinguishable', () => {
    const a = attendanceBand(hostSaid());
    const b = attendanceBand(appMadeUp());
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  test('a LOCKED count is the host’s by construction', () => {
    const b = attendanceBand(cookout({ guestCount: 40, guestEstimate: 40, guestCountSource: 'playbook-typical' }));
    expect(b.countFromHost).toBe(true);
  });

  test('a ROSTER is the host’s by construction', () => {
    const b = attendanceBand(cookout({
      guestMode: 'list',
      guests: [{ id: 'a', name: 'A', rsvp: 'Yes' }, { id: 'b', name: 'B' }],
    }));
    expect(b.basis).toBe('rsvp');
    expect(b.countFromHost).toBe(true);
  });

  test('a legacy event that never recorded a source is not accused of invention', () => {
    // Unknown resolves the same way guestCountIsConfirmed resolves it: only a
    // number we recorded as OUR OWN substitution is doubted.
    const b = attendanceBand(cookout({ guestEstimate: 40 }));
    expect(b.countFromHost).toBe(true);
    expect(b.countSource).toBe(null);
  });

  test('no count at all claims nothing either way', () => {
    const b = attendanceBand(cookout());
    expect(b.applicable).toBe(false);
  });
});

describe('PLANNING STILL WORKS ON AN ESTIMATE — this is the product, not a leak', () => {
  // Sprint 0.5: "We absolutely do NOT want no confirmed count → no food
  // estimate → no seating preview → useless planning experience. We want
  // truthful planning uncertainty."
  test('an app-substituted count still produces a planning number and a band', () => {
    const b = attendanceBand(appMadeUp());
    expect(b.applicable).toBe(true);
    expect(b.planning).toBeGreaterThan(0);
    expect(b.band).toBe(true);
    expect(b.high).toBeGreaterThan(b.low);
  });

  test('the planning number is unchanged by this commit — provenance is ADDED, not applied', () => {
    // The band must not move. Adding provenance may not silently re-size
    // anybody's food plan; that would be a behaviour change smuggled in as a
    // correctness fix.
    const a = attendanceBand(hostSaid());
    const b = attendanceBand(appMadeUp());
    expect(b.planning).toBe(a.planning);
    expect(b.low).toBe(a.low);
    expect(b.high).toBe(a.high);
  });

  test('CONFIRMED is still zero for any estimate, however it arose', () => {
    // The pre-existing protection, re-proven: a consumer asking for confirmed
    // attendance never receives an estimate, so the dangerous read was always
    // `planning`, not `confirmed`.
    expect(attendanceBand(hostSaid()).confirmed).toBe(0);
    expect(attendanceBand(appMadeUp()).confirmed).toBe(0);
  });
});

describe('the host is told whose number the plan is using', () => {
  // NOTE ON THESE TWO ASSERTIONS. The first draft matched /typical/ and passed
  // before the change — the estimate branch's sentence already contains
  // "typically show", which is about no-show modelling and says nothing about
  // who supplied the number. Caught by reading why a red-first test was green.
  // They now assert a distinct phrase that only the substitution can produce.
  const SUBSTITUTED = /not a number you gave|we filled that in/i;

  test('an app-substituted count says so in the sentence the host reads', () => {
    // A band that knows the number was invented and still reads "Planned for
    // 40" is the app speaking in her voice.
    expect(attendanceBand(appMadeUp()).because).toMatch(SUBSTITUTED);
  });

  test('a host-stated count is not hedged', () => {
    expect(attendanceBand(hostSaid()).because).not.toMatch(SUBSTITUTED);
    // …and still carries the modelling sentence it always did.
    expect(attendanceBand(hostSaid()).because).toMatch(/Planned for 40/);
  });
});

describe('the AI orchestrator receives the provenance too', () => {
  // `orchestratorTools.js:36` exposes attendanceBand to a model as
  // `get_headcount` — "the resolved guest count and the honest attendance
  // band". Sprint 0 never examined this path. A model handed a bare 40 with no
  // indication the app invented it is the same failure as a vendor email
  // containing it, one step removed.
  // Driven through the real dispatcher rather than the tool object, so this
  // exercises the path a model actually takes.
  const { runTool, toolNames } = require('../orchestratorTools');
  const headcount = (event) => runTool('get_headcount', { event });

  test('(premise) the tool exists and dispatches', () => {
    expect(toolNames()).toContain('get_headcount');
    expect(headcount(hostSaid()).ok).toBe(true);
  });

  test('an app-substituted count reaches the model marked as ours, not hers', () => {
    const out = headcount(appMadeUp()).result;
    expect(out.countFromHost).toBe(false);
    expect(out.because).toMatch(/not a number you gave/i);
  });

  test('a host-stated count reaches it unmarked', () => {
    expect(headcount(hostSaid()).result.countFromHost).toBe(true);
  });
});
