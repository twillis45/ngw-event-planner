// ─── budgetRecovery — safe host-purchase over-budget recovery (BUDGET-RECOVERY-1) ──
//
// When a host is over budget, "over budget" alone is a dead end. This derives
// the SAFEST places to adjust — using only source-backed, host-editable data —
// per BUDGET_RECOVERY_AUDIT_1's Outcome B scope:
//   safe_cut   · unbought, unlocked, host-controlled lines (supplies/capacity,
//                guest-count right-sizing) — real $ ranges from the same
//                playbook math the checklists render.
//   tradeoff   · unbought food/spread lines — cutting these changes the guest
//                experience, so the copy says what it costs the party.
//   ask        · vendors with a quote but NOTHING committed (unsigned, unpaid,
//                not confirmed) — savings never promised, amounts only quoted.
//   do_not_cut · paid money, signed contracts, rain/safety backup, honoree
//                moments — surfaced as protected, never as suggestions.
// HARD RULES (test-locked): no invented savings; no refund/cancel/negotiate
// language; estimates never called spent or owed; every $ traces to a source
// field; suggestions re-derive from source data (no stored recovery state, no
// fake "recovered"); host-only surface — never guest/vendor/public copy.
//
// This is a THIN COMPOSITION over hostSpending + playbookFoodPlan +
// playbookCapacity + guestCountResolved — not a new engine.

import { hostSpending } from './hostSpending';
import { playbookFoodPlan, playbookCapacity, guestCountResolved } from './playbooks';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const mid = (lo, hi) => {
  const l = num(lo); const h = num(hi);
  if (l <= 0 && h <= 0) return 0;
  return Math.round((l + (h > 0 ? h : l)) / 2);
};
const money = (n) => `$${Math.round(n).toLocaleString()}`;

const COMMITTED_VENDOR = (v) => /confirmed|booked|contracted|deposit/i.test(String(v.status || ''))
  || v.contractSigned === true || v.contract_signed === true
  || v.depositPaid === true || v.balancePaid === true;

export function buildBudgetRecoveryPlan(event, priceFactor) {
  const ev = event || {};
  const sp = hostSpending(ev, priceFactor);
  const total = num(sp && sp.total);
  const committed = num(sp && sp.committed);

  if (total <= 0) {
    return { status: 'needs_more_data', overBudgetAmount: 0, headline: null, summary: null,
      suggestions: [], protectedItems: [], missingData: ['A budget target — set one so overspend can be measured.'] };
  }
  if (committed <= total) {
    return { status: 'not_over_budget', overBudgetAmount: 0, headline: null, summary: null,
      suggestions: [], protectedItems: [], missingData: [] };
  }
  const over = committed - total;

  const counted = guestCountResolved(ev);
  const hasRealCount = (num(ev.guestCount) > 0) || (num(ev.guestEstimate) > 0)
    || (Array.isArray(ev.guests) && ev.guests.length > 0) || (counted && counted.resolved);

  const suggestions = [];
  const protectedItems = [];
  const missingData = [];

  // ── Guest sizing is the first domino: without a real count, quantity math is
  //    fiction — say what's missing instead of inventing savings.
  if (!hasRealCount) {
    missingData.push('A real guest count — food and supply costs are sized from it, so right-sizing needs it first.');
  }

  // ── safe_cut · unbought supplies/capacity lines (not checked, not owned, not
  //    skipped). Their $ ranges are the SAME numbers the checklist shows.
  try {
    const cap = playbookCapacity(ev);
    const checked = (ev.capacityChecked && typeof ev.capacityChecked === 'object') ? ev.capacityChecked : {};
    const owned = (ev.capacityOwned && typeof ev.capacityOwned === 'object') ? ev.capacityOwned : {};
    const locked = (ev.capacityLocked && typeof ev.capacityLocked === 'object') ? ev.capacityLocked : {};
    const items = (cap && Array.isArray(cap.groups)) ? cap.groups.flatMap(g => g.items || []) : [];
    const cuttable = items
      .filter(i => i && !i.skipped && !checked[i.key] && !owned[i.key] && !i.owned)
      .map(i => ({ ...i, saving: locked[i.key] ? num(locked[i.key]) : mid(i.costLow, i.costHigh), lockedPrice: !!locked[i.key] }))
      .filter(i => i.saving > 0)
      .sort((a, b) => b.saving - a.saving);
    cuttable.slice(0, 1).forEach(i => {
      suggestions.push({
        id: `cap-${i.key}`,
        class: i.lockedPrice ? 'ask' : 'safe_cut',
        label: i.lockedPrice ? `Rethink "${i.name || i.label || i.key}" — you priced it at ${money(i.saving)}` : `Skip or trim "${i.name || i.label || i.key}"`,
        why: i.lockedPrice
          ? 'You locked a price on this but haven’t bought it — a deliberate call, so unlocking it is your decision, not ours.'
          : 'Not bought yet and fully in your hands — skipping or reducing it changes nothing already committed.',
        estimatedSavings: i.saving,
        savingsConfidence: i.lockedPrice ? 'locked-price' : 'estimate-range',
        source: 'playbookCapacity (unbought line)',
        actionLabel: 'Open the list',
        route: { tab: 'Planning', focusField: `caprow-${i.key}` },
        risk: 'low',
      });
    });
  } catch { /* no capacity plan — nothing to suggest */ }

  // ── unbought food-plan lines. Supplies-group lines (cups, ice, foil) are
  //    host-controlled consumables → safe_cut; actual dishes are a guest-
  //    experience call → tradeoff. Cost fields mirror hostSpending's billing:
  //    item.locked when present, else the low/high midpoint.
  try {
    const plan = playbookFoodPlan(ev, priceFactor ? { priceFactor } : undefined);
    const got = (ev.foodGot && typeof ev.foodGot === 'object') ? ev.foodGot : {};
    const list = (plan && Array.isArray(plan.list)) ? plan.list : [];
    const priced = list
      .filter(i => i && !i.skipped && !got[i.id])
      .map(i => ({ ...i, saving: i.locked != null ? num(i.locked) : mid(i.low, i.high) }))
      .filter(i => i.saving > 0)
      .sort((a, b) => b.saving - a.saving);
    priced.filter(i => i.group === 'Supplies').slice(0, 1).forEach(i => {
      suggestions.push({
        id: `supply-${i.id}`,
        class: 'safe_cut',
        label: `Trim "${i.short || i.item || i.id}" from the supplies run`,
        why: 'Not bought yet and fully in your hands — a smaller run changes nothing already committed.',
        estimatedSavings: i.saving,
        savingsConfidence: 'estimate-range',
        source: 'playbookFoodPlan (unbought supplies line)',
        actionLabel: 'Open the list',
        route: { tab: 'Planning', focusField: `foodrow-${i.id}` },
        risk: 'low',
      });
    });
    const unbought = priced.filter(i => i.group !== 'Supplies');
    const boughtCount = list.filter(i => i && got[i.id]).length;
    unbought.slice(0, 1).forEach(i => {
      suggestions.push({
        id: `food-${i.id}`,
        class: 'tradeoff',
        label: `Trim or swap "${i.short || i.item || i.id}" on the spread`,
        why: boughtCount > 0
          ? `Not bought yet. The spread already has ${boughtCount} item${boughtCount === 1 ? '' : 's'} covered — fewer options is the tradeoff, not an empty table.`
          : 'Not bought yet. Cutting food thins the spread — a real tradeoff for your guests, so weigh it before skipping.',
        estimatedSavings: i.saving,
        savingsConfidence: 'estimate-range',
        source: 'playbookFoodPlan (unbought line)',
        actionLabel: 'Open the food plan',
        route: { tab: 'Planning', focusField: `foodrow-${i.id}` },
        risk: 'guest-experience',
      });
    });
  } catch { /* no food plan */ }

  // ── safe_cut · guest-count right-sizing — only with a real count AND a live
  //    roster showing fewer yeses than the number the plan is sized for.
  if (hasRealCount && Array.isArray(ev.guests) && ev.guests.length > 0) {
    const yes = ev.guests.filter(g => g && /^y/i.test(String(g.rsvp || ''))).length;
    const sized = num(ev.guestCount) || num(ev.guestEstimate) || ev.guests.length;
    const pendingReplies = counted && !counted.resolved;
    if (!pendingReplies && yes > 0 && yes < sized) {
      suggestions.push({
        id: 'guests-rightsize',
        class: 'safe_cut',
        label: `Re-size for ${yes} confirmed guests (plan is sized for ${sized})`,
        why: 'Food and supply quantities scale from the count — matching it to real yeses trims every unbought line at once.',
        estimatedSavings: null, // derived per-line after resize; no single honest number here
        savingsConfidence: 'recompute',
        source: 'guest roster (confirmed yeses vs sized count)',
        actionLabel: 'Update the count',
        route: { tab: 'Guests', focusField: 'guests-entry' },
        risk: 'low',
      });
    }
  }

  // ── ask · vendor with a quote and NOTHING committed. Quoted amount is stated
  //    as a quote; savings never promised.
  const vendors = (Array.isArray(ev.vendors) ? ev.vendors : []).filter(v => v && String(v.name || '').trim());
  vendors.filter(v => num(v.cost) > 0 && !COMMITTED_VENDOR(v)).slice(0, 1).forEach(v => {
    suggestions.push({
      id: `vendor-ask-${v.id}`,
      class: 'ask',
      label: `Nothing is committed to ${v.name} yet`,
      why: `Their quote is ${money(num(v.cost))} and no contract or deposit is on file. They may have scope options, but savings are not guaranteed — ask before changing the plan.`,
      estimatedSavings: null,
      savingsConfidence: 'none',
      source: 'vendor quote (uncommitted)',
      actionLabel: 'Open the vendor',
      route: { tab: 'Vendors', vendorId: v.id },
      risk: 'none-committed',
    });
  });

  // ── do_not_cut · protected spend, named so the host knows what NOT to touch.
  vendors.filter(v => COMMITTED_VENDOR(v) && (num(v.cost) > 0 || num(v.depositAmt) > 0)).forEach(v => {
    protectedItems.push({
      id: `vendor-protected-${v.id}`,
      label: v.name,
      why: v.depositPaid || v.balancePaid
        ? 'Money is already paid here. Keep this — recovery never assumes paid money comes back.'
        : 'This booking is committed (signed or confirmed). Changing it is a conversation with the vendor, not a line to cut.',
    });
  });
  if (String(ev.rainPlan || '').trim()) {
    protectedItems.push({ id: 'rain-backup', label: 'Rain backup', why: 'Keep this. It protects the whole event if the sky turns.' });
  }
  const honoree = String(ev.honoree || '').trim();
  if (honoree) {
    protectedItems.push({ id: 'honoree-moment', label: `${honoree}’s moment`, why: 'Keep this. It’s the reason for the event — recovery never touches it.' });
  }

  const safeCount = suggestions.filter(s => s.class === 'safe_cut' || s.class === 'tradeoff').length;
  const headline = `You’re ${money(over)} over your current plan.`;
  const summary = safeCount > 0
    ? 'Start with unbought items you can still adjust — they change nothing already committed.'
    : 'The remaining costs look committed or protected. Don’t assume savings without checking with the people involved.';

  return {
    status: 'recovery_available',
    overBudgetAmount: over,
    headline,
    summary,
    suggestions: suggestions.slice(0, 5),
    protectedItems,
    missingData,
  };
}
