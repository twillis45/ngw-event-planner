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
import { deriveHelperResponsibilities } from './helperResponsibility';
import { isVendorBooked } from './workstreams';
import { effectiveDone } from './taskEngine';

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
  // RECON-I2: count on effectiveDone (ticked OR engine-satisfied), the SAME
  // predicate the hero and Coming up score on — raw t.done made this counter
  // disagree with every other checklist number on the screen. Known residual:
  // the V2 shell layers two local extras on top (arrivals-grid, buy/shop
  // resolution) that stay V2-side; this engine reads the shared predicate only.
  const timeline = Array.isArray(ev.timeline) ? ev.timeline.filter(t => t && t.task) : [];
  const openTasks = timeline.filter(t => {
    try { return !effectiveDone(ev, t); } catch { return !t.done; }
  });

  // 2 · Still to get — unbought food lines + unchecked supplies (same single
  // sources the Plan tab checks off against).
  // RECON-I5: the food count matches playbookFoodPlan's own itemCount/boughtCount
  // scope (isFood — the list's Supplies group is a separate $ line there); the
  // list's Supplies lines count with the capacity gear instead. openFood +
  // openSupplies decompose the row so the UI can name each part.
  let unboughtFood = 0; let unboughtListSupplies = 0; let unboughtGear = 0; let firstUnboughtFoodId = null;
  try {
    const plan = playbookFoodPlan(ev);
    if (plan && Array.isArray(plan.list)) {
      const unboughtList = plan.list.filter(i => i && !i.skipped && !((ev.foodGot || {})[i.id]));
      const unboughtFoodList = unboughtList.filter(i => i.group !== 'Supplies');
      unboughtFood = unboughtFoodList.length;
      unboughtListSupplies = unboughtList.length - unboughtFood;
      const firstLine = unboughtFoodList[0] || unboughtList[0] || null;
      firstUnboughtFoodId = firstLine ? firstLine.id : null;
    }
  } catch (e) { /* no playbook — honest zero */ }
  try {
    const cap = playbookCapacity(ev);
    const checked = (ev.capacityChecked && typeof ev.capacityChecked === 'object') ? ev.capacityChecked : {};
    const owned = (ev.capacityOwned && typeof ev.capacityOwned === 'object') ? ev.capacityOwned : {};
    const items = (cap && Array.isArray(cap.groups)) ? cap.groups.flatMap(g => g.items || []) : [];
    unboughtGear = items.filter(i => i && !i.skipped && !checked[i.key] && !owned[i.key] && !i.owned).length;
  } catch (e) { /* honest zero */ }
  const unboughtSupplies = unboughtListSupplies + unboughtGear;
  const stillToGet = unboughtFood + unboughtSupplies;

  // 3 · Vendor gaps — explicit fields only, first-undone ordering.
  // RECON-I5: the "of N" denominator is the rollup's (workstreams.js counts every
  // vendor entry) — the old unnamed-vendor filter made this row's denominator
  // disagree with the vendor readiness rollup on the same screen.
  const vendors = (Array.isArray(ev.vendors) ? ev.vendors : []).filter(Boolean);
  // POP-1C: isVendorBooked is the canonical vendor-status reader (workstreams.js) —
  // the inline regex here used to miss 'Deposit Paid' and 'Contracted'.
  const vendorGaps = vendors.filter(v =>
    !isVendorBooked(v)
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
      // RECON-I5 split: openFood matches playbookFoodPlan's itemCount − boughtCount
      // exactly; openSupplies = the list's Supplies lines + unowned capacity gear.
      openFood: unboughtFood, openSupplies: unboughtSupplies,
      detail: stillToGet
        ? `${stillToGet} item${stillToGet === 1 ? '' : 's'} not checked off — one store run covers it.`
        : 'Everything’s bought or in hand.',
      // ROW-LEVEL CTA RULE (Todd, 2026-07-07): land on the first unbought food
      // LINE (foodFocus); supplies-only remainder lands on the supplies card.
      route: stillToGet
        ? (firstUnboughtFoodId
          ? { tab: 'Planning', foodFocus: firstUnboughtFoodId }
          : { tab: 'Planning', focusField: `cap-hero-${ev.id}` })
        : null,
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
    // HELPER-RESPONSIBILITY-1: people bringing things. Assigned is not
    // handled — the day before is exactly when "Confirm Marcus is still
    // bringing ice" matters. Explicit owner data only; section hidden when
    // nobody is helping.
    ...((() => {
      let resp = [];
      try { resp = deriveHelperResponsibilities(ev).responsibilities; } catch (e) { resp = []; }
      if (!resp.length) return [];
      const unconfirmed = resp.filter(r => r.status === 'assigned');
      const first = unconfirmed[0];
      return [{
        key: 'helpers', label: 'People bringing things', open: unconfirmed.length,
        detail: first
          ? `Confirm ${first.helperName} is still bringing ${first.label}${unconfirmed.length > 1 ? ` — and ${unconfirmed.length - 1} more to confirm` : ''}.`
          : 'Everyone who’s bringing something has confirmed — mark items brought as they land.',
        // ROW-LEVEL CTA RULE: all-confirmed still lands on the first helper's
        // own row (mark-it-brought lives there), never the food-plan section top.
        route: first ? first.route : ((resp[0] && resp[0].route) || { tab: 'Planning', focusField: 'food-plan' }),
        cta: first ? `Confirm with ${first.helperName}` : 'See the list',
      }];
    })()),
    {
      key: 'guests', label: 'Tell your guests', open: 0,
      detail: 'A final-details note is written for you — where, when, what to bring.',
      route: { tab: 'Guests', focusField: `guests-invites-${ev.id}` },
      cta: 'Open the note',
    },
  ];

  const openCount = sections.reduce((n, s) => n + (s.open || 0), 0);
  // MOMENT-PROTECT-1 (annotate-only): the host-NAMED moment rides along so the
  // day-before plan can keep the point of the event visible under the task
  // pressure. Only explicit fields — nothing inferred, nothing invented.
  const mustHave = String(ev.must_have_moment || '').trim();
  const honoree = String(ev.honoree || '').trim();
  const song = String(ev.honoree_song || ev.honoreeSong || '').trim();
  const drink = String(ev.honoree_drink || ev.honoreeDrink || '').trim();
  const touches = [song && `their song: ${song}`, drink && `their drink: ${drink}`].filter(Boolean).join(' · ');
  const moment = mustHave
    ? { text: mustHave, sub: honoree && touches ? `${honoree} — ${touches}` : (touches || null) }
    : honoree
      ? { text: `${honoree}\u2019s moment`, sub: touches || null }
      : null;
  return {
    applicable: true, daysOut, sections, openCount, moment,
    headline: daysOut === 0
      ? 'It’s today. Here’s what still matters.'
      : openCount === 0
        ? 'You’re ready. Nothing left that matters — rest up.'
        : `${openCount} thing${openCount === 1 ? '' : 's'} still matter${openCount === 1 ? 's' : ''} before ${daysOut === 1 ? 'tomorrow' : 'the day'}.`,
  };
}
