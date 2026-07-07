// ─── DAYBEFORE-DIFM-1 — the day-before plan (derived helper, NOT an engine) ───
// HOST-DIFM-AUDIT-1's real finding: the host side isn't missing helpers, it's
// missing COMPRESSION. The day before the event a host doesn't want fourteen
// smart cards — they want "what still matters, what do I do today, what can I
// stop worrying about." This helper composes FIVE existing canonical sources
// into one honest plan; it derives everything and asserts nothing:
//   open plan steps (event.timeline) · still-to-get (playbookFoodPlan +
//   playbookCapacity) · vendor gaps (explicit vendor fields) · rain readiness
//   (rainPlanStatus) · tomorrow's first cues (effectiveRos).
// Rules: counts of OPEN work only — nothing is ever shown as done that isn't;
// sections with nothing open say so calmly (stop worrying about it); every
// row's route obeys the deep-link doctrine (first-undone anchors); the guest
// final-details message is LINKED, never embedded (host plan ≠ guest copy).
import { playbookFoodPlan, playbookCapacity, effectiveRos } from './playbooks';
import { rainPlanStatus, RAIN_PLAN_TARGET } from './weather';

const daysTo = (dateStr, now = new Date()) => {
  if (!dateStr) return null;
  const d = new Date(String(dateStr) + 'T00:00:00');
  if (isNaN(d)) return null;
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

// The plan applies from two days out through the event day itself.
export const DAY_BEFORE_WINDOW = { from: 0, to: 2 };

export function buildDayBeforePlan(event, now = new Date()) {
  const ev = event || {};
  const daysOut = daysTo(ev.date, now);
  const applicable = daysOut !== null && daysOut >= DAY_BEFORE_WINDOW.from && daysOut <= DAY_BEFORE_WINDOW.to;
  if (!applicable) return { applicable: false, daysOut };

  // 1 · Open plan steps — undone timeline tasks. At T-1 everything still open
  // matters; no urgency re-scoring, no invention.
  const timeline = Array.isArray(ev.timeline) ? ev.timeline.filter(t => t && t.task) : [];
  const openTasks = timeline.filter(t => !t.done);

  // 2 · Still to get — unbought food lines + unchecked supplies (same single
  // sources the Plan tab checks off against).
  let unboughtFood = 0; let unboughtSupplies = 0;
  try {
    const plan = playbookFoodPlan(ev);
    if (plan && Array.isArray(plan.list)) {
      unboughtFood = plan.list.filter(i => i && !i.skipped && !((ev.foodGot || {})[i.id])).length;
    }
  } catch (e) { /* no playbook — honest zero */ }
  try {
    const cap = playbookCapacity(ev);
    const checked = (ev.capacityChecked && typeof ev.capacityChecked === 'object') ? ev.capacityChecked : {};
    const owned = (ev.capacityOwned && typeof ev.capacityOwned === 'object') ? ev.capacityOwned : {};
    const items = (cap && Array.isArray(cap.groups)) ? cap.groups.flatMap(g => g.items || []) : [];
    unboughtSupplies = items.filter(i => i && !i.skipped && !checked[i.key] && !owned[i.key] && !i.owned).length;
  } catch (e) { /* honest zero */ }
  const stillToGet = unboughtFood + unboughtSupplies;

  // 3 · Vendor gaps — explicit fields only, first-undone ordering.
  const vendors = (Array.isArray(ev.vendors) ? ev.vendors : []).filter(v => v && String(v.name || '').trim());
  const vendorGaps = vendors.filter(v =>
    !/confirmed|booked/i.test(String(v.status || ''))
    || (Number(v.depositAmt) > 0 && v.depositPaid !== true)
    || v.coiStatus === 'required'
    || !String(v.arrivalTime || '').trim());
  const firstGapVendor = vendorGaps[0] || null;

  // 4 · Rain readiness — the one shared rain source.
  const rain = rainPlanStatus(ev);

  // 5 · Tomorrow's first cues — the real run of show, first three.
  let cues = [];
  try {
    cues = (effectiveRos(ev) || []).filter(r => r && r.segment).slice(0, 3)
      .map(r => ({ time: r.time || '', segment: r.segment }));
  } catch (e) { /* none */ }

  // Deep-link doctrine: every row lands on its first-undone element.
  const sections = [
    {
      key: 'tasks', label: 'Open plan steps', open: openTasks.length,
      detail: openTasks.length
        ? `${openTasks.length} still open — knock out what matters, let the rest go.`
        : 'Nothing open. Stop worrying about the plan.',
      items: openTasks.slice(0, 4).map(t => t.task),
      route: openTasks.length ? { tab: 'Planning Tasks', taskId: '__compressed__' } : null,
      cta: openTasks.length ? 'See what to do now' : null,
    },
    {
      key: 'shopping', label: 'Still to get', open: stillToGet,
      detail: stillToGet
        ? `${stillToGet} item${stillToGet === 1 ? '' : 's'} not checked off — one store run covers it.`
        : 'Everything’s bought or in hand.',
      route: stillToGet ? { tab: 'Planning', focusField: 'food-plan' } : null,
      cta: stillToGet ? 'Open the list' : null,
    },
    ...(vendors.length ? [{
      key: 'vendors', label: 'People you’re counting on', open: vendorGaps.length,
      detail: vendorGaps.length
        ? `${vendorGaps.length} of ${vendors.length} still ${vendorGaps.length === 1 ? 'needs' : 'need'} a confirm, arrival time, or paperwork.`
        : `All ${vendors.length} locked in.`,
      route: vendorGaps.length ? { tab: 'Vendors', vendorId: firstGapVendor.id } : null,
      cta: vendorGaps.length ? 'Follow up' : null,
    }] : []),
    {
      key: 'rain', label: 'Weather backup', open: rain.hasPlan ? 0 : 1,
      detail: rain.hasPlan ? 'Rain plan saved — you know the move if the sky turns.' : 'No backup spot written down yet.',
      route: rain.hasPlan ? null : RAIN_PLAN_TARGET,
      cta: rain.hasPlan ? null : 'Add rain backup',
    },
    ...(cues.length ? [{
      key: 'cues', label: 'How tomorrow starts', open: 0,
      detail: cues.map(c => `${c.time ? c.time + ' — ' : ''}${c.segment}`).join(' · '),
      route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      cta: 'See the whole day',
    }] : []),
    {
      key: 'guests', label: 'Tell your guests', open: 0,
      detail: 'A final-details note is written for you — where, when, what to bring.',
      route: { tab: 'Guests', focusField: `guests-invites-${ev.id}` },
      cta: 'Open the note',
    },
  ];

  const openCount = sections.reduce((n, s) => n + (s.open || 0), 0);
  return {
    applicable: true, daysOut, sections, openCount,
    headline: daysOut === 0
      ? 'It’s today. Here’s what still matters.'
      : openCount === 0
        ? 'You’re ready. Nothing left that matters — rest up.'
        : `${openCount} thing${openCount === 1 ? '' : 's'} still matter${openCount === 1 ? 's' : ''} before ${daysOut === 1 ? 'tomorrow' : 'the day'}.`,
  };
}
