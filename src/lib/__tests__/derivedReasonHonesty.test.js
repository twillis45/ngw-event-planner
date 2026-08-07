// ─── A HEALTH QUESTION IS NOT AN ALLERGY QUESTION (2026-08-06, board) ───────
//
// Seen in a live trace of the real host event: the destination altitude
// question — "Any guests with heart or lung conditions?" — carried the reason
//
//     "Worth settling early — allergies gate the menu."
//
// `_derivedReason: 'diet'` is set by DIETARY_SAFETY_RE, which is a SAFETY regex
// and deliberately matches heart / lung / condition / mobility / health as well
// as allergy / dietary. The reason sentence assumed safety meant food.
//
// A fabricated rationale on a MEDICAL row is the sharpest form of what
// 06_AI_GROUNDING bans — confident, specific, and about someone's health. The
// regex is correct and untouched; the sentence now knows which half matched.
import { playbookDecisionBoard } from '../playbooks';

const NOW = new Date(2026, 7, 6, 9, 0, 0);
const dayFrom = (d) => {
  const x = new Date(NOW); x.setDate(x.getDate() + d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
const destEvent = {
  id: 'dr-1', type: 'Birthday', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM',
  date: dayFrom(318), endDate: dayFrom(322),
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
};

const rowsOf = (ev) => {
  const b = playbookDecisionBoard(ev) || {};
  return [...(b.open || []), ...(b.deferred || []), ...(b.locked || [])];
};
const reasonFor = (ev, id) => {
  const r = rowsOf(ev).find((x) => x.id === id);
  return r ? String(r.rankReason || (r.priorityBasis && r.priorityBasis.rationale) || '') : null;
};

describe('a derived reason names the right kind of risk', () => {
  test('the altitude/health row no longer talks about the menu', () => {
    const reason = reasonFor(destEvent, 'dest_health');
    expect(reason).toBeTruthy();
    expect(reason).not.toMatch(/allerg/i);
    expect(reason).not.toMatch(/menu/i);
  });

  test('…and says something true about what it does affect', () => {
    expect(reasonFor(destEvent, 'dest_health')).toMatch(/who can do what/i);
  });

  test('a genuine dietary row still gets the dietary reason', () => {
    // The fix must be a split, not a blanket removal — allergies really do gate
    // the menu, and that sentence is correct where it belongs.
    const rows = rowsOf(destEvent);
    const dietRow = rows.find((r) => /allerg|dietary/i.test(`${r.id} ${r.label || ''}`));
    expect(dietRow).toBeTruthy();
    const reason = String(dietRow.rankReason || (dietRow.priorityBasis && dietRow.priorityBasis.rationale) || '');
    // It is authored ('One unflagged nut or dairy allergy…') or derived — either
    // way it must be about food, not about mobility.
    expect(reason).toMatch(/allerg|menu|food/i);
  });
});
