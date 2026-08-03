// ─── THE EVIDENCE ENVELOPE MUST SURVIVE THE BOUNDARY ─────────────────────────
//
// The intelligence audit (2026-07-31) proved that playbookDecisionBoard computes a
// priority score, the sentence explaining it, and thirteen grounded axes with cited
// sources — and that none of it reached a recommendation. Two seams dropped it:
// surfaceRegistry.raiseAll()'s explicit field list, and the absence of any carrier
// downstream of it.
//
// These gates pin the whole chain: board row → raiser → raiseAll → eventPlan action
// → resolveSelection (the render boundary). A field that stops arriving at any link
// turns one of these red, which is the property the audit found missing.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { playbookDecisionBoard, playbookTypicalGuests } from '../playbooks';
import { raiseAll } from '../surfaceRegistry';
import { evidenceFromDecisionRow, explainEvidence, GROUNDED_AXES } from '../decisionEvidence';
import { resolveSelection } from '../selectedAction';
import { heroAskFor } from '../heroAsk';
import { DEFERRED_DECISIONS } from '../decisionConfidence';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

// A reunion 45 days out with an event created 30 days ago: two decisions are
// genuinely past their easy window, so the decisions surface raises them and the
// full board→action chain runs. `venue-setting` is the grounded one (ADA access,
// venue capacity, NOAA weather); `food-model` is authored-but-ungrounded. Having
// both in one fixture is deliberate — the envelope must be honest about each.
const reunion = () => ({
  id: 'ev-evidence-reunion', type: 'Reunion', name: 'Reunion',
  date: daysFromNow(45), createdAt: daysFromNow(-30),
  guestMode: 'count', guestCount: playbookTypicalGuests('Reunion') || 20,
  guests: [], vendors: [], timeline: [], budget: [],
  venueCity: 'Atlanta', venueState: 'GA',
});

const planFor = (ev) => eventPlan(ev, (() => {
  try { return buildExperienceContext(ev, null, 1); } catch { return null; }
})());
const rowFor = (ev, id) => (playbookDecisionBoard(ev).open || []).find(r => r && r.id === id);
const actionFor = (plan, id) => (plan.nextActions || []).find(a => a && a.id === 'decision:' + id);

describe('the board row carries evidence worth keeping', () => {
  test('the fixture really does produce a grounded, scored, overdue decision', () => {
    const r = rowFor(reunion(), 'venue-setting');
    expect(r).toBeTruthy();
    expect(r.status).toBe('overdue');
    expect(r.priorityScore).toBeGreaterThan(0);
    expect(r.rankReason).toBeTruthy();
    // Three axes are grounded on this row — if the playbook changes, this gate
    // should be re-pointed at whatever IS grounded, never simply relaxed.
    const grounded = GROUNDED_AXES.filter(a => r[a + 'Grounded'] === true);
    expect(grounded).toEqual(expect.arrayContaining(['accessibility', 'venue', 'weather']));
  });

  test('the envelope reads the row and invents nothing', () => {
    const r = rowFor(reunion(), 'venue-setting');
    const ev = evidenceFromDecisionRow(r);
    expect(ev.decisionId).toBe('venue-setting');
    expect(ev.priorityScore).toBe(r.priorityScore);
    expect(ev.rankReason).toBe(r.rankReason);
    expect(ev.importanceBasis).toBe(r.importanceBasis);
    expect(ev.status).toBe('overdue');
    expect(ev.groundedAxes.map(a => a.axis)).toEqual(expect.arrayContaining(['accessibility', 'venue', 'weather']));
    // Cited ids resolve to REAL citations — an org and a URL, not just an id.
    expect(ev.sources.length).toBeGreaterThan(0);
    for (const s of ev.sources) {
      expect(s.resolved).toBe(true);
      expect(s.org).toBeTruthy();
      expect(String(s.url || '')).toMatch(/^https?:\/\//);
    }
  });

  test('a row with no decision returns null rather than an empty shell', () => {
    expect(evidenceFromDecisionRow(null)).toBeNull();
    expect(evidenceFromDecisionRow({})).toBeNull();
  });
});

describe('board metadata survives into the selected action', () => {
  test('raiseAll no longer drops the four fields it used to', () => {
    const raises = raiseAll(reunion()).filter(r => r && r.surface === 'decisions');
    expect(raises.length).toBeGreaterThan(0);
    const r = raises.find(x => x.key === 'venue-setting');
    expect(r).toBeTruthy();
    // THE REGRESSION: this normalizer copied 11 fields and silently dropped these.
    expect(Number.isFinite(r.priorityScore)).toBe(true);
    expect(r.priorityScore).toBeGreaterThan(0);
    expect(typeof r.gateHolder).toBe('boolean');
    expect(Number.isFinite(r.unlocks)).toBe(true);
    expect(r.ask).toBeTruthy();
    expect(r.evidence).toBeTruthy();
    expect(r.evidence.decisionId).toBe('venue-setting');
  });

  test('the eventPlan action carries the score and the envelope', () => {
    const ev = reunion();
    const a = actionFor(planFor(ev), 'venue-setting');
    expect(a).toBeTruthy();
    const row = rowFor(ev, 'venue-setting');
    // The exact number the board computed — not a re-derivation.
    expect(a.priorityScore).toBe(row.priorityScore);
    expect(a.evidence).toBeTruthy();
    expect(a.evidence.decisionId).toBe('venue-setting');
    expect(a.evidence.sources.length).toBeGreaterThan(0);
  });

  test('the ranker can actually see the score it ranks on', () => {
    // compareNextActions reads priorityScore/gateHolder/unlocks via
    // actionConsequence(). Before the carrier, every decision action arrived with
    // priorityScore null, so consequence collapsed to 0 and the array order
    // decided which call led. Any decision action that reaches the queue must now
    // carry a real number.
    const decisions = (planFor(reunion()).nextActions || [])
      .filter(a => a && String(a.id).startsWith('decision:'));
    expect(decisions.length).toBeGreaterThan(0);
    for (const a of decisions) {
      expect(Number.isFinite(a.priorityScore)).toBe(true);
    }
  });
});

describe('the render boundary does not lose evidence', () => {
  const selectionFor = (ev, action) => {
    const open = playbookDecisionBoard(ev).open || [];
    return resolveSelection(action, {
      boardRow: (i) => open.find(r => String(r.id) === String(i.decisionId)) || null,
      decisionND: () => null,
      actionAsk: (a) => heroAskFor(a, ev),
    });
  };

  test('resolveSelection carries the action’s own envelope through', () => {
    const ev = reunion();
    const a = actionFor(planFor(ev), 'venue-setting');
    const sel = selectionFor(ev, a);
    expect(sel.evidence).toBeTruthy();
    expect(sel.evidence.decisionId).toBe('venue-setting');
    // The envelope belongs to the decision the selection is ABOUT — the same
    // identity discipline PR #70 imposed on the ask and the panel.
    expect(sel.evidence.decisionId).toBe(a.evidence.decisionId);
  });

  test('a decision action with no envelope still gets one from its board row', () => {
    const ev = reunion();
    const bare = { id: 'decision:venue-setting', title: 'Resolve "Indoor or outdoor".' };
    const sel = selectionFor(ev, bare);
    expect(sel.evidence).toBeTruthy();
    expect(sel.evidence.decisionId).toBe('venue-setting');
  });

  test('an execution item honestly carries NO evidence', () => {
    // A shopping line is not a decision and has no decision evidence to show.
    // Manufacturing one here would be the exact defect PR #70 closed, one layer up.
    const ev = reunion();
    const sel = selectionFor(ev, {
      id: 'top:operational:p_snacks',
      title: 'Buy chips — 13 snack servings',
      route: { tab: 'Planning', foodFocus: 'p_snacks' },
    });
    expect(sel.decisionId).toBeNull();
    expect(sel.evidence).toBeNull();
  });
});

describe('uncertainty remains truthful', () => {
  test('a grounded row reports grounded, and claims no more', () => {
    const ev = evidenceFromDecisionRow(rowFor(reunion(), 'venue-setting'));
    expect(ev.confidence).toBe('grounded');
    expect(ev.uncertaintyReason).toBeNull();
  });

  test('an ungrounded but authored row says so instead of implying research', () => {
    const row = rowFor(reunion(), 'food-model');
    expect(row).toBeTruthy();
    const ev = evidenceFromDecisionRow(row);
    expect(ev.groundedAxes).toEqual([]);
    expect(ev.sources).toEqual([]);
    expect(ev.confidence).toBe('authored');
    expect(ev.uncertaintyReason).toMatch(/no axis .* is grounded to a cited source/i);
  });

  test('confidence never claims grounding without a resolvable citation', () => {
    for (const ev of [reunion()]) {
      for (const row of playbookDecisionBoard(ev).open || []) {
        const e = evidenceFromDecisionRow(row);
        if (e.confidence === 'grounded') {
          expect(e.groundedAxes.length).toBeGreaterThan(0);
          expect(e.sources.some(s => s.resolved)).toBe(true);
        } else {
          expect(e.uncertaintyReason).toBeTruthy();
        }
      }
    }
  });

  test('a derived-importance row is named as derived, not passed off as authored', () => {
    const e = evidenceFromDecisionRow({ id: 'x', importanceBasis: 'derived', priorityScore: 10 });
    expect(e.confidence).toBe('derived');
    expect(e.uncertaintyReason).toMatch(/derived from/i);
  });

  test('a deferred decision refuses to claim readiness', () => {
    // decisionConfidence's own deny-list: no persisted state ⇒ never "ready".
    expect(DEFERRED_DECISIONS.length).toBeGreaterThan(0);
    const e = evidenceFromDecisionRow({ id: DEFERRED_DECISIONS[0], importanceBasis: 'authored' });
    expect(e.uncertaintyReason).toMatch(/no persisted state/i);
  });
});

describe('a reviewer can answer "why did NGW recommend this?"', () => {
  test('the explanation names the reason, the score, the grounding and the sources', () => {
    const ev = reunion();
    const a = actionFor(planFor(ev), 'venue-setting');
    const why = explainEvidence(a.evidence).join('\n');
    expect(why).toMatch(/Why it ranks here: .{20,}/);
    expect(why).toMatch(/Priority score \d/);
    expect(why).toMatch(/Grounded on accessibility/);
    expect(why).toMatch(/Source: .+https?:\/\//);
    expect(why).toMatch(/Confidence: grounded/);
    // No placeholders reach a reviewer.
    expect(why).not.toMatch(/undefined|null|NaN|\[object Object\]/);
  });

  test('an empty envelope explains nothing rather than padding', () => {
    expect(explainEvidence(null)).toEqual([]);
  });
});
