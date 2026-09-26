// ─── A DERIVED RULE MUST MATCH THE SENTENCE IT WAS DERIVED FROM ─────────────
//
// `recommendedWhen` lets a decision's proposal move with the event instead of
// returning a literal. On 2026-09-24 the corpus had THREE rules against 128
// decisions flagged `difmCapable: 'can-derive'`, so 125 proposed the same answer
// for a 4-guest home dinner and a 400-guest destination gala.
//
// ── WHERE THE NEW RULES CAME FROM, AND WHY THAT IS NOT INVENTION ────────────
//
// The evidence was already authored, in prose. All three shipping rules encode
// one shape — a numeric GUEST threshold that the decision's own `why` states in
// words — and each rule's `because` is nearly verbatim from that sentence:
//
//   "For 8+ guests, assigned seating…"          → guests gte 8
//   "at 24+ guests a host cannot…"              → guests gte 24
//
// Scanning every decision for that sentence shape found SEVEN. Three had rules.
// The four that did not are the ones added here, each with its threshold taken
// from its own text rather than chosen:
//
//   Get-Together/food_style   "for 25+ guests … a pitmaster"        → 25
//   Engagement Party/help     "For 30-40 guests one host cannot…"   → 30
//   Holiday Party/food_format "For 20-50 guests a full host-cooked
//                              spread is a brutal solo lift"        → 20
//   Retirement Party/help     "For 40-50 mostly-older guests one
//                              host cannot run a buffet…"           → 40
//
// ── THE ONE INFERENCE, NAMED, AND ITS PRECEDENT ─────────────────────────────
//
// Three of the four state the threshold for the HIRE and already default to it,
// so the rule is the inverse: below the number, the host can still do it alone.
// The prose says "at N one host cannot"; the rule says "under N, they can."
// That step is an inference, and it is the same one Anniversary/help already
// ships — "at 24+ a host cannot cook, tend bar, run the slideshow AND host"
// became `lt 24 → Fully DIY`. Following a shipped precedent, not inventing a
// new move. Named here so a reviewer can disagree with it in one place.
//
// ── WHAT THIS GUARD IS FOR ──────────────────────────────────────────────────
//
// Not that the rules exist — `recommendedPick.test.js` already checks every rule
// names a real option and a known operator. This checks the rules still match
// THE SENTENCE THAT JUSTIFIES THEM. Edit the prose and leave the number, or move
// the number and leave the prose, and the rule stops being derived from anything.
import { ALL_PLAYBOOKS, decisionProposal } from '../playbooks';

const findDecision = (type, id) => {
  const pb = ALL_PLAYBOOKS.find((p) => p.type === type);
  return { pb, d: pb && (pb.decisions || []).find((x) => x.id === id) };
};

// The four added 2026-09-24, and the threshold each one's own prose states.
const DERIVED = [
  // NOTE: the file is data/backyardBbq.js but the playbook TYPE is 'Get-Together'.
  // Caught by this test's own premise check — the filename is not the type.
  { type: 'Get-Together',     id: 'food_style',  threshold: 25, op: 'gte' },
  { type: 'Engagement Party', id: 'help',        threshold: 30, op: 'lt'  },
  { type: 'Holiday Party',    id: 'food_format', threshold: 20, op: 'lt'  },
  { type: 'Retirement Party', id: 'help',        threshold: 40, op: 'lt'  },
];

const prose = (d) => [d.why, d.defaultWhy, d.priorityBasis && d.priorityBasis.rationale]
  .filter(Boolean).join('  ');

describe('a derived rule matches its own sentence', () => {
  test('(premise) all four decisions exist and are flagged can-derive', () => {
    // Without this every assertion below passes over an undefined.
    for (const { type, id } of DERIVED) {
      const { d } = findDecision(type, id);
      expect(`${type}/${id}: ${d ? d.difmCapable : 'MISSING'}`).toBe(`${type}/${id}: can-derive`);
    }
  });

  test('THE GUARD: every threshold still appears in the decision\'s own prose', () => {
    // The anti-invention check. A rule whose number is not in its own text is a
    // number somebody chose, and this is where that shows up.
    for (const { type, id, threshold } of DERIVED) {
      const { d } = findDecision(type, id);
      const said = new RegExp(`\\b${threshold}\\b`).test(prose(d));
      expect(`${type}/${id} states ${threshold}: ${said}`).toBe(`${type}/${id} states ${threshold}: true`);
    }
  });

  test('and the rule encodes that same number', () => {
    for (const { type, id, threshold, op } of DERIVED) {
      const { d } = findDecision(type, id);
      const rules = Array.isArray(d.recommendedWhen) ? d.recommendedWhen : [];
      const encoded = rules.map((r) => r.when && r.when.guests && r.when.guests[op]);
      expect(`${type}/${id} ${op}: ${JSON.stringify(encoded)}`).toBe(`${type}/${id} ${op}: ${JSON.stringify([threshold])}`);
    }
  });

  test('THE BEHAVIOUR: each one actually moves between a small and a large event', () => {
    // The point of the whole exercise. A rule that parses but never fires has
    // changed nothing — and that is exactly what 125 decisions were doing.
    const ev = (type, guests) => ({ id: 'e', type, date: '2027-06-12', guestCount: guests });
    for (const { type, id, threshold } of DERIVED) {
      const { pb, d } = findDecision(type, id);
      const below = decisionProposal(ev(type, Math.max(2, threshold - 5)), pb, d);
      const above = decisionProposal(ev(type, threshold + 5), pb, d);
      expect(`${type}/${id}: "${below.pick}" vs "${above.pick}"`)
        .not.toBe(`${type}/${id}: "${below.pick}" vs "${below.pick}"`);
    }
  });

  test('AND AN UNKNOWN HEADCOUNT STILL REFUSES — the honesty rule, re-proved here', () => {
    // recommendedPick refuses a rule on an unknown fact rather than comparing it
    // as zero. Re-asserted on the NEW rules specifically, because a rule that
    // quietly fired the small-party branch on an event with no headcount would
    // be the fabrication this whole field exists to prevent.
    for (const { type, id } of DERIVED) {
      const { pb, d } = findDecision(type, id);
      const out = decisionProposal({ id: 'e', type, date: '2027-06-12' }, pb, d);
      expect(`${type}/${id}: ${out.pick} (${out.basis})`).toBe(`${type}/${id}: ${d.default} (authored-default)`);
    }
  });

  test('CORPUS COUNT: seven decisions now respond to the event, where three did', () => {
    // Pinned so a silent regression — a rule deleted, a fact key renamed, the
    // engine stopping short — shows up as a number rather than as nothing.
    const small = (type) => ({ id: 'e', type, date: '2027-06-12', guestCount: 4, budget: 400, venueKind: 'home', isDestination: false, overnight: false, hostCapacity: 'solo' });
    const large = (type) => ({ id: 'e', type, date: '2027-06-12', guestCount: 400, budget: 120000, venueKind: 'venue', isDestination: true, overnight: true, hostCapacity: 'lots-of-help' });
    let canDerive = 0; const moved = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (d.difmCapable !== 'can-derive') continue;
        canDerive++;
        const a = decisionProposal(small(pb.type), pb, d);
        const b = decisionProposal(large(pb.type), pb, d);
        if ((a && a.pick) !== (b && b.pick)) moved.push(`${pb.type}/${d.id}`);
      }
    }
    expect(canDerive).toBe(129);
    expect(`${moved.length} of ${canDerive} move: ${moved.sort().join(', ')}`).toBe(
      `7 of 129 move: ${[
        'Anniversary/help', 'Get-Together/food_style', 'Day Party/food',
        'Dinner Party/seating', 'Engagement Party/help', 'Holiday Party/food_format',
        'Retirement Party/help',
      ].sort().join(', ')}`,
    );
  });
});
