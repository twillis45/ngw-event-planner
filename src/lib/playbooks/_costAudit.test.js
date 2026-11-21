import { ALL_PLAYBOOKS, playbookFoodPlan } from './index';

// DEEP effectiveness audit (not shipped as a guard — a report). For every costFactors decision across
// every playbook it checks: (1) REACHABILITY — does each `affects` id appear in the costed list at
// default choices? An unreachable id (foodApproach collapsed it into fa-*) can only silently no-op.
// (2) EFFECT — set each non-default option and see if the food total actually moves, and in the
// direction the factor implies (>1 up, <1 down). Classifies each into WORKS / NO-OP / WRONG-DIR.
const mk = (type, fc) => ({ id: 'x', type, guestCount: 30, guestCountLocked: true, guestEstimate: 30, foodChoices: fc || {}, foodLocked: {}, foodSkip: {} });
const plan = (type, fc) => { try { return playbookFoodPlan(mk(type, fc)) || {}; } catch { return {}; } };

test('cost-effectiveness audit across all playbooks', () => {
  const rows = [];
  let nFactors = 0, nWorks = 0, nNoop = 0, nWrong = 0, nUnreachable = 0;
  for (const pb of ALL_PLAYBOOKS) {
    const type = pb.type;
    const base = plan(type, {});
    const listIds = new Set((base.list || []).map((i) => i.id));
    for (const d of (pb.decisions || [])) {
      if (!d.costFactors) continue;
      const affects = Array.isArray(d.affects) ? d.affects : [];
      const reachable = affects.filter((a) => listIds.has(a));
      const unreachable = affects.filter((a) => !listIds.has(a));
      for (const opt of Object.keys(d.costFactors)) {
        nFactors++;
        const f = Number(d.costFactors[opt]);
        const v = plan(type, { [d.id]: opt });
        const dHi = (v.foodHigh || 0) - (base.foodHigh || 0);
        const moved = dHi !== 0 || (v.foodLow || 0) !== (base.foodLow || 0);
        const wantUp = f > 1;
        let verdict;
        if (!moved) { verdict = 'NO-OP'; nNoop++; }
        else if ((wantUp && dHi > 0) || (!wantUp && dHi < 0)) { verdict = 'works'; nWorks++; }
        else { verdict = 'WRONG-DIR'; nWrong++; }
        if (verdict !== 'works') rows.push(`${verdict.padEnd(9)} ${type} · ${d.id}="${opt}" (×${f}) ${base.foodLow}-${base.foodHigh}→${v.foodLow}-${v.foodHigh}${unreachable.length ? ` [affects unreachable: ${unreachable.join(',')}]` : ''}`);
      }
      if (unreachable.length && reachable.length === 0) nUnreachable++;
    }
  }
  // REPOINTED (A9, 11/21/2026). This audited only `costFactors`, and the no-ops
  // it found (Get-Together food_style/menu, Vow Renewal "Restaurant", Low Country
  // seasoning) were factors on lines the pick had already removed. Those are line
  // rules now, so the audit reads them too: each option of a `costViaLines`
  // decision must move the plan (food or drinks) away from the default pick.
  const sig = (fp) => (fp.list || []).filter((l) => !l.skipped).map((l) => `${l.id}:${l.low}-${l.high}`).join(' ');
  let nLines = 0; const lineNoops = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) {
      if (!d.costViaLines) continue;
      const def = sig(plan(pb.type, { [d.id]: d.default }));
      for (const opt of d.options || []) {
        if (opt === d.default) continue;
        nLines++;
        if (sig(plan(pb.type, { [d.id]: opt })) === def) lineNoops.push(`LINE-NO-OP ${pb.type} · ${d.id}="${opt}"`);
      }
    }
  }
  console.error(`\n=== COST-EFFECTIVENESS AUDIT ===\nfactors=${nFactors}  works=${nWorks}  NO-OP=${nNoop}  WRONG-DIR=${nWrong}  decisions-with-all-affects-unreachable=${nUnreachable}\nline-rule options=${nLines}  LINE-NO-OP=${lineNoops.length}\n\nNON-WORKING (${rows.length + lineNoops.length}):\n${[...rows, ...lineNoops].join('\n')}\n`);
  expect(nFactors).toBeGreaterThan(0);
  expect(nLines).toBeGreaterThan(0);
});
