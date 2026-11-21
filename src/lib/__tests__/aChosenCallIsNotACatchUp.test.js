// ─── A CHOSEN CALL IS NOT A CATCH-UP (owner's iPad, 11/21/2026) ──────────────
//
// Thanksgiving Hosting, five days out, "Host cooks the whole meal" picked. The
// hero read "Catch up on this step. — past its window" over the checklist step
// "Decide who cooks: the whole meal, a split with assigned dishes, or a full
// potluck", and its options showed that very pick marked "chosen". Owner: "Make
// sure ask is not repeated. Say chosen already".
//
// A checklist step that IS a playbook call names it (`answeredBy` on the
// authored task), and the step is handled when that call is answered: the
// host's pick, or a record that settles it (decisionSettledByData) — the same
// test openFoodChoices uses. One rule, read by timelineStepResolved, so the
// overdue policy and every hero tier agree.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { ALL_PLAYBOOKS, getPlaybook, playbookChecklist, decisionAnswered } from '../playbooks';
import { timelineStepResolved } from '../taskEngine';
import { taskIsOverdue } from '../taskLead';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const seed = (type, picks) => {
  const ev = {
    id: 'chosen-' + type.replace(/\W/g, ''), name: type, type, date: daysFromNow(5),
    guestMode: 'count', guestEstimate: 12, guestCountSource: 'host', guests: [],
    venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', startTime: '16:00', startTimeSource: 'host',
    totalBudget: 400, budget: [], vendors: [], createdAt: daysFromNow(-40), foodChoices: picks || {},
  };
  const rows = playbookChecklist(ev) || [];
  return { ...ev, timeline: rows.map((r) => ({ id: r.id, task: r.task, leadDays: r.leadDays, week: r.week, category: r.category, done: false })) };
};
const step = (ev, taskId) => (ev.timeline || []).find((t) => t.id === `pbt-${ev.id}-${taskId}`);
const plan = (ev) => eventPlan(ev, buildExperienceContext(ev, null, 1)) || {};

describe('Thanksgiving: who cooks', () => {
  test('PREMISE: unanswered, the step is late and leads as a catch-up', () => {
    const ev = seed('Thanksgiving Hosting');
    const t = step(ev, 't_model');
    expect(t).toBeTruthy();
    expect(taskIsOverdue(t, ev)).toBe(true);
    expect((plan(ev).nextActions || []).map((a) => a.id)).toContain(`decision:${t.id}`);
  });

  test('"Host cooks the whole meal" picked: the step is handled, and no tier asks it', () => {
    const ev = seed('Thanksgiving Hosting', { hosting_model: 'Host cooks the whole meal' });
    const t = step(ev, 't_model');
    expect(decisionAnswered(ev, 'hosting_model')).toBe(true);
    expect(timelineStepResolved(ev, t)).toBe(true);
    expect(taskIsOverdue(t, ev)).toBe(false);
    const p = plan(ev);
    const all = [...(p.nextActions || []), ...(p.worries || [])];
    expect(all.map((a) => a.id)).not.toContain(`decision:${t.id}`);
    expect(all.map((a) => `${a.title || ''} ${a.ask || ''}`).join('\n')).not.toMatch(/who cooks/i);
  });

  test('the authored default is not a pick', () => {
    const ev = seed('Thanksgiving Hosting');
    expect(decisionAnswered(ev, 'hosting_model')).toBe(false);
  });
});

describe('every step that names a call', () => {
  const linked = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const t of (pb.tasks || [])) if (t && Array.isArray(t.answeredBy)) linked.push([pb.type, t.id, t.answeredBy]);
  }

  test('the decide steps are linked', () => {
    expect(linked.map(([type, id]) => `${type}:${id}`).sort()).toEqual([
      'Friendsgiving:t_money', 'Friendsgiving:t_model', "New Year's Eve Party:t_model",
      'Reunion:t-decide-food',
      'Sunday Dinner:t-pick-main', 'Thanksgiving Hosting:t_model',
    ].sort());
  });

  test.each(linked)('%s %s names real calls, and clears once they are picked', (type, taskId, ids) => {
    const decs = getPlaybook(type).decisions || [];
    for (const id of ids) expect(decs.some((d) => d.id === id)).toBe(true);
    const picks = Object.fromEntries(ids.map((id) => [id, decs.find((d) => d.id === id).options[0]]));
    const ev = seed(type, picks);
    const t = step(ev, taskId);
    expect(t).toBeTruthy();
    expect(timelineStepResolved(ev, t)).toBe(true);
    // One call of two answered is not the step.
    if (ids.length > 1) {
      const half = seed(type, { [ids[0]]: picks[ids[0]] });
      expect(timelineStepResolved(half, step(half, taskId))).toBe(false);
    }
  });
});

// REUNION, SPLIT IN TWO (owner ruling, 11/21/2026): "Decide potluck vs
// host-cooked BBQ vs catered and tell guests" was a call and a send in one row,
// so a pick could not honestly clear it. The call clears on the pick; telling
// guests is its own step, due when the old one was, open until it is ticked.
describe('Reunion: the food call and telling guests are two steps', () => {
  const PICK = () => getPlaybook('Reunion').decisions.find((d) => d.id === 'food-model').options[0];
  test('the call clears on the pick', () => {
    const ev = seed('Reunion', { 'food-model': PICK() });
    const t = step(ev, 't-decide-food');
    expect(t.task).toBe('Decide potluck vs host-cooked BBQ vs catered');
    expect(timelineStepResolved(ev, t)).toBe(true);
  });
  test('telling guests stays open until it is ticked, due when the old step was', () => {
    const ev = seed('Reunion', { 'food-model': PICK() });
    const tell = step(ev, 't-tell-food');
    expect(tell && tell.task).toBe('Tell guests the food plan');
    expect(tell.leadDays).toBe(step(ev, 't-decide-food').leadDays);
    expect(timelineStepResolved(ev, tell)).toBe(false);
    expect(timelineStepResolved(ev, { ...tell, done: true })).toBe(true);
  });
});
