// ─── The cook lever is declared once and injected, never copied ──────────────
//
// The first rollout (2026-09-18) pasted the decision, five tasks and a risk into
// fourteen playbook files — ~25 duplicated lines each. That is the defect this
// corpus already carries elsewhere (byte-identical claim text across The
// Cookout, Repast and Reunion), so it was refactored: the engine owns the
// content, each playbook declares one line. These tests keep it that way.
import { ALL_PLAYBOOKS, playbookChecklist, playbookRisks, playbookDecisionBoard } from '../index';
import { cookLeverOf, cookDecisionFor, cookTasksFor } from '../cookLever';

const withLever = ALL_PLAYBOOKS.filter((pb) => pb && pb.cookLever);
const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

test('the lever is declared by real playbooks and resolves for every one', () => {
  expect(withLever.length).toBeGreaterThanOrEqual(14);
  for (const pb of withLever) {
    // A lever naming a decision or an answer the playbook does not offer is a
    // dangling gate that would silently never fire. cookLeverOf refuses it.
    expect({ type: pb.type, resolved: !!cookLeverOf(pb) }).toEqual({ type: pb.type, resolved: true });
  }
});

test('NO playbook authors the decision or its tasks inline — it is injected', () => {
  for (const pb of ALL_PLAYBOOKS) {
    const ids = (pb.decisions || []).map((d) => d && d.id);
    expect({ type: pb.type, inline: ids.filter((i) => i === 'cook_method' || i === 'fire_type') })
      .toEqual({ type: pb.type, inline: [] });
    const tids = (pb.tasks || []).map((t) => t && t.id).filter((i) => /^t_(cm|ft)_/.test(i || ''));
    expect({ type: pb.type, inline: tids }).toEqual({ type: pb.type, inline: [] });
  }
});

test('each lever yields exactly one decision of the right shape for its kind', () => {
  for (const pb of withLever) {
    const d = cookDecisionFor(pb);
    const want = pb.cookLever.kind === 'grill' ? 'fire_type' : 'cook_method';
    expect({ type: pb.type, id: d.id, blocks: d.blocks }).toEqual({ type: pb.type, id: want, blocks: ['cook_schedule'] });
    // Every task carries BOTH gates — cooking at all, AND this method.
    for (const t of cookTasksFor(pb)) {
      expect(Array.isArray(t.whenChoice)).toBe(true);
      expect(t.whenChoice).toHaveLength(2);
      expect(t.milestoneId).toBeTruthy();
    }
  }
});

test('the grill playbooks get fire_type, and their fuel tasks reach a host', () => {
  const ev = { id: 'g', type: 'The Cookout', date: iso(7), guestMode: 'count', guestCount: 30,
    foodChoices: { grill_master: 'Host grills', fire_type: 'Gas / propane grill' } };
  const tasks = (playbookChecklist(ev) || []).map((r) => r.task);
  expect(tasks.some((t) => /propane/i.test(t))).toBe(true);
  expect(tasks.some((t) => /chimney/i.test(t))).toBe(false);   // the charcoal task must NOT fire
});

test('a hired pitmaster is never asked what fuel to use', () => {
  const ev = { id: 'h', type: 'The Cookout', date: iso(7), guestMode: 'count', guestCount: 30,
    foodChoices: { grill_master: 'Hire a pitmaster / caterer' } };
  expect((playbookChecklist(ev) || []).filter((r) => /^t_ft_/.test(String(r.id).replace(/^pbt-h-/, ''))))
    .toHaveLength(0);
  const b = playbookDecisionBoard(ev);
  expect([...b.open, ...b.locked, ...b.deferred].map((r) => r.id)).not.toContain('fire_type');
});

test('the CO risk rides the indoor lever only — the cookouts author their own fire safety', () => {
  const indoor = { id: 'i', type: 'Birthday', date: iso(7), guestMode: 'count', guestCount: 20,
    foodChoices: { food_style: 'Cook/grill yourself', cook_method: 'Grill or smoker outside' } };
  const r = playbookRisks(indoor);
  expect(((r && r.items) || []).map((x) => x.id)).toContain('r_cm_grill_indoors');
});

// ── Guards for the five defects the review board found (2026-09-18) ──────────

test('fire_type cites a source that actually resolves', () => {
  // It was registered into the object resolveTimingProvenance RETURNS, not into
  // TIMING_SOURCES — so `tier: 'cited'` pointed at nothing and every
  // resolver-grounded decision carried a stray grill-preheat key.
  // eslint-disable-next-line global-require
  const { resolveGroundingSource } = require('../../knowledge/groundingSources');
  expect(resolveGroundingSource('grill-preheat-2026')).toBeTruthy();
  for (const pb of withLever.filter((p) => p.cookLever.kind === 'grill')) {
    for (const id of (cookDecisionFor(pb).priorityBasis.sources || [])) {
      expect({ type: pb.type, id, resolves: !!resolveGroundingSource(id) })
        .toEqual({ type: pb.type, id, resolves: true });
    }
  }
});

test('a stale method pick cannot outlive the answer that gates it', () => {
  // Watch Party's r_grill_cold and the injected CO risk are twins; when only one
  // carried the paired gate, a pizza host with a leftover cook_method saw one and
  // not the other.
  const ev = { id: 's', type: 'Watch Party', date: iso(7), guestMode: 'count', guestCount: 12,
    foodChoices: { menu: 'Pizza + finger food', cook_method: 'Grill or smoker outside' } };
  const ids = ((playbookRisks(ev) || {}).items || []).map((r) => r.id);
  expect(ids.filter((i) => /grill/.test(i))).toEqual([]);
});

test('no playbook states a fire-up lead that its own fuel task contradicts', () => {
  const ev = { id: 'g', type: 'Get-Together', date: iso(7), guestMode: 'count', guestCount: 20,
    foodChoices: { food_style: 'Host grills everything', fire_type: 'Gas / propane grill' } };
  const tasks = (playbookChecklist(ev) || []).map((r) => r.task);
  expect(tasks.filter((t) => /45 min/.test(t))).toEqual([]);
  expect(tasks.some((t) => /5-10 minutes/.test(t))).toBe(true);
});

test('both lever kinds reach the food card, not just the indoor one', () => {
  // fire_type failed isMenuDecision on its id/label, so the cookouts' board and
  // food card disagreed about the same event.
  // eslint-disable-next-line global-require
  const { playbookFoodPlan } = require('../index');
  for (const [type, fc, want] of [
    ['The Cookout', { grill_master: 'Host grills' }, 'fire_type'],
    ['Birthday', { food_style: 'Cook/grill yourself' }, 'cook_method'],
  ]) {
    const ids = ((playbookFoodPlan({ id: 'f', type, date: iso(7), guestMode: 'count', guestCount: 20, foodChoices: fc }) || {}).choices || []).map((c) => c.id);
    expect({ type, has: ids.includes(want) }).toEqual({ type, has: true });
  }
});

test('a partially-stale lever REFUSES rather than quietly covering fewer hosts', () => {
  const pb = { type: 'Probe', decisions: [{ id: 'food_style', options: ['Host cooks', 'Potluck'] }],
    cookLever: { decision: 'food_style', hostCooks: ['Host cooks', 'Renamed away'], kind: 'indoor' } };
  expect(cookLeverOf(pb)).toBeNull();
});
