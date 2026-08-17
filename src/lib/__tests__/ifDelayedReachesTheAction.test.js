// ─── A CONSUMER WAITING FOR A PRODUCER THAT CANNOT BE ONE LINE ──────────────
//
// `actionReason.js:153` says of its own RISK branch:
//
//   "risk.ifDelayed is authored on 278 playbook blocks and, as of 2026-07-31,
//    reaches NO action object ... a CONSUMER WAITING FOR ITS PRODUCER. It is
//    written now so that carrying the field later is a ONE-LINE ENGINE CHANGE."
//
// I tried to make that one-line change on 2026-08-17. **It is not one line, and
// this file records why so the next attempt starts from the map.**
//
// WHAT IS TRUE: `risk: { ifDelayed, severity }` is authored across 42 playbook
// data files, and the LEGACY host renders it (App.js:3002, "If delayed: …").
//
// WHY IT CANNOT BE WIRED CHEAPLY — the chain is dead at the far end, measured:
//
//   playbook.milestones      authored, 42 files, carries risk.ifDelayed
//     +- playbookMilestones() reads m.risk for `severity` ONLY, drops the sentence
//         +- playbookAreaNextStep() drops it again
//             +- consumed ONLY by src/App.js (the FROZEN legacy host)
//
//   `playbookMilestones` has NO other consumer in the repo — grep across src/ and
//   hostv2/src returns nothing. **v2 never reads milestones at all**, so there is
//   no v2 action for the field to ride on. The missing piece is a CONSUMER, not a
//   projection. Three wires were written and reverted rather than ship inert code
//   that looks like a fix.
//
// NOTE the near-miss: `playbookChecklist` iterates `playbook.tasks`, a DIFFERENT
// collection (label/when, not name/offsetDays). Zero tasks carry `risk` —
// `grep -c "label:.*when:.*risk:"` is 0 — so wiring it there is a no-op that
// would have looked like success.
//
// What this file asserts: the consumer genuinely works when fed, and the corpus
// genuinely still has nothing feeding it. When a real v2 consumer lands, the last
// test flips red and should be updated — deliberately.
import { getActionReason, reasonCoverage } from '../actionReason';
import { playbookChecklist } from '../playbooks';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const EV = (over = {}) => ({
  id: 'ev-ifd', type: 'Wedding', date: isoIn(45),
  venue: 'The Hall', venueCity: 'Santa Fe, NM',
  guestMode: 'count', guestCount: 60, totalBudget: 15000, ...over,
});

describe('the RISK branch works — nothing feeds it', () => {
  test('THE CONSUMER WORKS when an action carries the field', () => {
    const r = getActionReason(
      { title: 'Prep for "line up shaping hands".', ifDelayed: 'The comal backs up' },
      { event: EV() },
    );
    expect(r.type).toBe('risk');
    expect(r.source).toBe('risk.ifDelayed');
    expect(r.confidence).toBe('authored');
  });

  test('AUTHORED BEATS BOILERPLATE — risk (4) outranks consequence (5)', () => {
    // The prize, if it were ever wired: the milestone hero's generic line
    // ("staying ahead ... feels quiet") loses to what the author actually wrote.
    const boiler = 'Staying ahead by one step makes the rest of the timeline feel quiet.';
    const withIt = getActionReason({ title: 'Prep for "x".', ifDelayed: 'Vendors stop holding the date', consequence: boiler }, { event: EV() });
    const without = getActionReason({ title: 'Prep for "x".', consequence: boiler }, { event: EV() });
    expect(withIt.type).toBe('risk');
    expect(without && without.type).not.toBe('risk');
  });

  test('it is never invented — no authored line, no risk reason', () => {
    const r = getActionReason({ title: 'Prep for "x".' }, { event: EV() });
    expect(r === null || r.type !== 'risk').toBe(true);
  });

  test('THE MISLEADING NEAR-MISS — playbook.tasks carry no risk at all', () => {
    // Wiring `playbookChecklist` looks like the fix and is a no-op. Asserted so
    // the next person does not spend the hour I did discovering it.
    const rows = playbookChecklist(EV()) || [];
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.some((t) => t && t.risk && t.risk.ifDelayed)).toBe(false);
  });

  test('STILL UNREALISED — the engine says so itself', () => {
    // actionReason ships its own coverage reporter and already names this source
    // as unrealised. When a real v2 consumer lands this flips red and should be
    // updated — that is the point, not a nuisance.
    const rep = reasonCoverage([{ title: 'Prep for "x".', consequence: 'A thing.' }], { event: EV() });
    expect(rep.unrealisedSources).toContain('risk.ifDelayed');
  });
});
