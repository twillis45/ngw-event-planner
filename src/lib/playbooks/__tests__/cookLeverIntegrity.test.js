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
