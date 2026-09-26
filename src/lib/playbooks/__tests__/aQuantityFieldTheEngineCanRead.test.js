// ─── A QUANTITY RULE THE ENGINE CANNOT READ IS A QUANTITY OF ONE ────────────
//
// `playbooks/index.js:383` scales a per-N line only when BOTH fields are numbers:
//
//     if (typeof p.qtyFlat === 'number' && typeof p.qtyPer === 'number') {
//       return Math.ceil(guests / p.qtyPer) * p.qtyFlat;
//     }
//
// Two Reunion lines wrote the rule as PROSE in the `qtyPer` slot — `'per 12
// guests'` and `'per table'` — so the branch never fired, the earlier
// `qtyFlat`-only branch returned 1, and the line was frozen at one unit at every
// event size. There is no error and nothing looks wrong; the author's intent is
// sitting right there in the field, in the wrong type.
//
// MEASURED 2026-09-26 on Reunion, before the fix:
//
//     24 guests   p_trashbags   1 bag   $0-1
//     60 guests   p_trashbags   1 bag   $0-1
//    120 guests   p_trashbags   1 bag   $0-1
//
// One bag of trash for a hundred and twenty people, at a dollar, and a
// disposable tablecloth count that never grew past one. Reunion is a real
// playbook a host can open today.
//
// After (`qtyPer: 12`, the author's own stated number, and `qtyPer: 8` for the
// tablecloths — an ASSUMPTION of eight guests to a picnic table, recorded as one
// because no table count exists in the event model to derive it from):
//
//     24 guests   p_trashbags    2 bags   $1-1
//     60 guests   p_trashbags    5 bags   $2-3
//    120 guests   p_trashbags   10 bags   $3-6
//
// STILL OPEN AND NOT INVENTED HERE: $0.30-0.60 a bag is low for something the
// line itself calls "heavy-duty". That is a price question with a real answer
// somebody has to look up, not a type error, so the band is left alone and named
// instead of quietly adjusted.
//
// WHY A TYPE GATE AND NOT A REVIEW. The corpus has 62 `qtyPer` values across 45
// playbooks and 60 of them were already numbers. A rule this easy to write in
// prose will be written in prose again, by a human or by an admin authoring
// path, and it fails SILENTLY — the only symptom is a quantity that does not
// move, which no existing test looks for.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../index';

const NUMERIC_QTY_FIELDS = ['qtyPer', 'qtyPerGuest', 'qtyFlat'];

describe('every quantity field the engine reads is a number', () => {
  test('(premise) the corpus really does use per-N scaling', () => {
    // Without this the assertion below could pass over an empty set — the
    // failure mode that made three "absent" findings in this project wrong.
    let perN = 0;
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        if (typeof p.qtyFlat === 'number' && typeof p.qtyPer === 'number') perN += 1;
      }
    }
    expect(perN).toBeGreaterThan(20);
  });

  test('NO purchase writes a quantity rule as prose', () => {
    const prose = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        for (const f of NUMERIC_QTY_FIELDS) {
          if (p[f] === undefined || p[f] === null) continue;
          if (typeof p[f] !== 'number') prose.push(`${pb.type} · ${p.id} · ${f}: ${JSON.stringify(p[f])}`);
        }
      }
    }
    // Named, not counted — a red build has to say which line to fix.
    expect(prose).toEqual([]);
  });

  test('THE SYMPTOM: a per-N line MOVES when the guest count moves', () => {
    // The behaviour behind the type rule, so this file still guards something if
    // the type check is ever satisfied by a cast. A line that scales per N
    // guests must produce a different quantity at 24 and at 120.
    const frozen = [];
    for (const pb of ALL_PLAYBOOKS) {
      const plan = (g) => {
        try {
          return playbookFoodPlan({
            id: 'x', type: pb.type, date: '2026-11-06', guestMode: 'count',
            guestCount: g, guestCountLocked: true, totalBudget: 5000,
            foodChoices: {}, foodLocked: {}, foodSkip: {},
          });
        } catch (_e) { return null; }
      };
      const small = plan(24); const large = plan(120);
      if (!small || !large) continue;
      const byId = new Map((large.list || []).map((l) => [l.id, l]));
      for (const p of (pb.purchases || [])) {
        // Only lines the engine is SUPPOSED to scale per N.
        if (!(typeof p.qtyFlat === 'number' && typeof p.qtyPer === 'number')) continue;
        // A rule coarser than the span cannot move across it — 1 per 200 guests
        // is legitimately 1 at both ends, and flagging it would be noise.
        if (p.qtyPer >= 120) continue;
        const a = (small.list || []).find((l) => l.id === p.id);
        const b = byId.get(p.id);
        if (!a || !b || a.skipped || b.skipped) continue;
        if (Number(a.qty) === Number(b.qty)) frozen.push(`${pb.type} · ${p.id} (qtyPer ${p.qtyPer}) stuck at ${a.qty}`);
      }
    }
    expect(frozen).toEqual([]);
  });
});
