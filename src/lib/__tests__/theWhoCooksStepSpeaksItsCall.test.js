// ─── THE WHO-COOKS STEP SPEAKS ITS CALL (owner ruling 4a, 11/23/2026) ────────
//
// Thanksgiving walkthrough P2, "who-cooks worded three ways": Calls to make
// asked "Are you cooking the whole meal, or is it a potluck?", the checklist
// said "Decide who cooks: the whole meal, a split with assigned dishes, or a
// full potluck", and the hero card said "Who cooks: the whole meal, a split …"
// (the checklist words with the verb taken off). One call, three wordings.
//
// Ruling: the call's question is the single source. The step that IS the
// playbook's food-approach call (it is answered by that call and nothing else)
// speaks that question on the checklist row, and so on the hero built from
// the row. Swept over all 47 playbooks, every pick of the call.
import { ALL_PLAYBOOKS, getPlaybook, playbookChecklist, callQuestion, whoCooksCallId } from '../playbooks';
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const whoCooksSteps = (pb) => {
  const id = whoCooksCallId(pb.type);
  if (!id) return [];
  return (pb.tasks || []).filter((t) => Array.isArray(t.answeredBy) && t.answeredBy.length === 1 && t.answeredBy[0] === id);
};

test('PREMISE: five playbooks have a step that is their who-cooks call', () => {
  const found = ALL_PLAYBOOKS.flatMap((pb) => whoCooksSteps(pb).map((t) => `${pb.type}:${t.id}`)).sort();
  expect(found).toEqual(['Day Party:t_food', 'Friendsgiving:t_model', 'Holiday Party:t_menu_lock', 'Reunion:t-decide-food', 'Thanksgiving Hosting:t_model']);
});

test('the call has one wording: Thanksgiving asks its own question everywhere', () => {
  const d = getPlaybook('Thanksgiving Hosting').decisions.find((x) => x.id === 'hosting_model');
  expect(callQuestion(d)).toBe('Are you cooking the whole meal, or is it a potluck?');
});

test('every who-cooks step speaks its call’s question on the checklist, for every pick', () => {
  const bad = [];
  let n = 0;
  for (const pb of ALL_PLAYBOOKS) {
    const steps = whoCooksSteps(pb);
    if (!steps.length) continue;
    const callId = whoCooksCallId(pb.type);
    const d = pb.decisions.find((x) => x.id === callId);
    const want = callQuestion(d);
    const base = { id: 'wc', type: pb.type, name: 'N', date: daysFromNow(40), guests: [], vendors: [], guestMode: 'count', guestCount: 20 };
    const states = [base, { ...base, isDestination: true, travelMode: 'fly', kidsCount: 2 },
      ...(d.options || []).map((o) => ({ ...base, foodChoices: { [callId]: typeof o === 'string' ? o : (o.label || o.value) } }))];
    for (const ev of states) {
      const rows = playbookChecklist(ev) || [];
      for (const t of steps) {
        const r = rows.find((x) => x.id === `pbt-${ev.id}-${t.id}`);
        if (!r) continue;
        n++;
        if (r.task !== want) bad.push(`${pb.type}:${t.id} says "${r.task}", its call asks "${want}"`);
      }
    }
  }
  expect(bad).toEqual([]);
  expect(n).toBeGreaterThan(15);
});

test('the hero built from a late who-cooks step speaks the same question', () => {
  const bad = [];
  let heroes = 0;
  for (const pb of ALL_PLAYBOOKS) {
    const steps = whoCooksSteps(pb);
    if (!steps.length) continue;
    const d = pb.decisions.find((x) => x.id === whoCooksCallId(pb.type));
    const want = callQuestion(d);
    // Five days out on a plan made weeks ago, the unanswered call's step is
    // late and leads as a catch-up (the aChosenCallIsNotACatchUp seed).
    const seed = { id: 'wh', type: pb.type, name: 'N', date: daysFromNow(5), guestMode: 'count', guestEstimate: 12, guestCountSource: 'host', guests: [],
      venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', startTime: '16:00', startTimeSource: 'host',
      totalBudget: 400, budget: [], vendors: [], createdAt: daysFromNow(-40), foodChoices: {} };
    const rows = playbookChecklist(seed) || [];
    const ev = { ...seed, timeline: rows.map((r) => ({ id: r.id, task: r.task, leadDays: r.leadDays, week: r.week, category: r.category, done: false })) };
    const acts = (eventPlan(ev, buildExperienceContext(ev, null, 1)) || {}).nextActions || [];
    const all = acts.flatMap((a) => (a && Array.isArray(a.items) ? [a, ...a.items] : [a])).filter(Boolean);
    for (const t of steps) {
      const rowId = `pbt-${ev.id}-${t.id}`;
      for (const a of all.filter((x) => x.taskId === rowId || x.stepRowId === rowId || x.decisionId === rowId)) {
        heroes++;
        if (!String(a.title || '').includes(want)) bad.push(`${pb.type}:${t.id} hero says "${a.title}"`);
      }
    }
  }
  expect(bad).toEqual([]);
  expect(heroes).toBeGreaterThan(0);
});
