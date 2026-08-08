// ─── THE HOST AND THE ENGINE MUST NAME THE SAME NEXT DECISION (2026-08-06) ──
//
// The acceptance bar for the decision-intelligence audit includes "the host sees
// the same selected decision the engine selected". `adminHostParity` was the
// obvious place to look, and it does not check that: it verifies five
// ORIENTATION fields, and it verifies them against the very object the rows were
// built from —
//
//     const o = orientation(cues, queue);
//     rows = [ ['lifecycleLabel', …, show(o.lifecycleLabel), 'host'], … ]
//     check('lifecycleLabel', o.lifecycleLabel)   // compares show(o.x) to show(o.x)
//
// — so those five can only fail if show() is non-deterministic. They prove the
// row table is faithful to orientation, which is a real if narrow property, and
// they cannot prove agreement between two derivations. There is no admin surface
// to disagree with yet either (AdminConsole has zero adminTruth references).
//
// This is the third test of that shape found today, after the vacuous
// order-independence test and the priority relationship nothing asserted.
//
// So this file compares two GENUINELY INDEPENDENT derivations of the same
// question — "what is next?":
//
//   host    orientation(deriveEventPhaseProgress(ev)).primaryAction   (the cue ladder)
//   engine  selectEventNextAction(ev)                                 (the full plan)
//
// They are computed by different modules through different pipelines. If they
// can name different things, the host is being shown something the engine did
// not choose — which is the exact failure this audit exists to catch.
import { selectEventNextAction, eventPlan } from '../../CommandCenter';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { orientation } from '../eventOrientation';
import { STAY_FROM_CONFIRMATION } from '../lodgingIntel';

const NOW = new Date(2026, 7, 6, 9, 0, 0);

// The recovered real event's facts (id anonymised — the facts are the fixture).
const recovered = (extra) => ({
  id: 'parity-dest', type: 'Birthday', name: 'A destination birthday',
  isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
  foodChoices: { sourcing: 'host cooks' },
  ...extra,
});

const hostSide = (ev) => {
  const cues = deriveEventPhaseProgress(ev, NOW);
  const o = orientation(cues, []);
  return o && o.primaryAction ? o.primaryAction : null;
};
const engineSide = (ev) => selectEventNextAction(ev);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();

describe('host and engine name the same next decision', () => {
  test('the recovered real event: both say lodging, neither says menu', () => {
    const ev = recovered();
    const host = hostSide(ev);
    const engine = engineSide(ev);

    expect(host).toBeTruthy();
    expect(engine).toBeTruthy();

    // Same subject, expressed in each side's own vocabulary: the host cue names
    // the AXIS ('lodging'), the engine names the ACT ('Sort where everyone
    // stays'). Asserting each in its own terms is the honest comparison —
    // normalising them into one string would just hide a real divergence.
    expect(norm(host.cueLabel || host.id)).toMatch(/lodging|where everyone stays/);
    expect(norm(engine.title || engine.label)).toContain('where everyone stays');
    // …and explicitly NOT the menu, which is what was reported.
    expect(norm(engine.title || engine.label)).not.toContain('serving');
    expect(norm(engine.title || engine.label)).not.toContain('menu');
  });

  test('they MOVE TOGETHER — the real proof, since agreeing once could be luck', () => {
    // Hold the rooms. Both derivations must advance to the same next subject.
    const held = recovered({ lodging: { hotelName: 'The Eldorado', from: STAY_FROM_CONFIRMATION } });
    const host = hostSide(held);
    const engine = engineSide(held);

    expect(norm(host.cueLabel || host.id)).not.toContain('where everyone stays');
    expect(norm(engine.title || engine.label)).not.toContain('where everyone stays');
    // Both land on food, which is now genuinely next.
    expect(norm(host.cueLabel || host.id)).toMatch(/serving|food|dietary/);
    expect(norm(engine.title || engine.label)).toMatch(/serving|food|dietary/);
  });

  test('and again on a local event, where the whole chain is different', () => {
    const local = recovered({ isDestination: false });
    const host = hostSide(local);
    const engine = engineSide(local);
    expect(norm(host.cueLabel || host.id)).toMatch(/serving|food|dietary/);
    expect(norm(engine.title || engine.label)).toMatch(/serving|food|dietary/);
  });

  test('the engine’s own head and the plan’s first action are the same action', () => {
    // A third derivation of the same question, for the same reason.
    const ev = recovered();
    const plan = eventPlan(ev);
    const head = (plan.nextActions || [])[0];
    expect(head).toBeTruthy();
    expect(norm(engineSide(ev).title || '')).toContain(norm(head.title || head.label));
  });
});
