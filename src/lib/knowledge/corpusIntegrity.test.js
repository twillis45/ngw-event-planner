// ─── CORPUS INTEGRITY — the committed corpus cannot lie (Phase 5F.4) ─────────
//
// WHY. Two records were published citing APPROVED sources on a non-researched tier
// (The Cookout at `trade-heuristic`, Quinceanera at `norm`). Traced end to end:
//
//   published KCR -> tier="trade-heuristic" sources=["reddy-ice-2026"]
//   predicate     -> wouldGround = false
//   host output   -> qtyGrounded=false, no Sourced line, sources STILL listed
//
// A record that lists sources and cannot ground is the exact failure this program
// exists to prevent. `groundingHonesty` now blocks new ones at the publish gate — but
// a gate only guards the door. This guards the ROOM: it asserts the same property over
// the corpus that is actually committed, so a record that arrives by any other route
// (a hand edit, a bad merge, an import, a future tool) fails CI.
//
// Gate = prospective. This = retrospective. Both are needed; neither replaces the other.
import corpus from './publishedKcrs.json';
import snapshot from './publishedKnowledge.json';
import { groundingHonesty, wouldGround, axisForField } from './sourceAuthority';

const sourced = (v) => !!(v && typeof v === 'object'
  && Array.isArray(v.sources) && v.sources.filter(Boolean).length);

describe('the committed corpus', () => {
  test('is not empty — a vacuous pass would hide everything below', () => {
    expect(Array.isArray(corpus)).toBe(true);
    expect(corpus.length).toBeGreaterThan(0);
  });

  test('NO published record has approved sources while failing grounding', () => {
    // The headline invariant. Reported per-record so a failure names the offender
    // rather than just the count.
    const bad = [];
    for (const k of corpus) {
      const v = k.proposal && k.proposal.newValue;
      if (!/\.provenance$/.test(String(k.fieldPath || ''))) continue;
      if (!sourced(v)) continue;                       // unsourced is honest
      if (!axisForField(k.fieldPath)) continue;        // no axis claims authority
      if (!wouldGround(k.fieldPath, v)) {
        bad.push(`${k.assetId} | ${k.fieldPath} | tier=${JSON.stringify(v.tier)} `
          + `| sources=${JSON.stringify(v.sources)} -> lists sources, does not ground`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every sourced record would also pass the publish gate today', () => {
    // Catches the inverse drift: a record that grounds but whose sources are no longer
    // approved (a registry entry removed under it).
    const bad = [];
    for (const k of corpus) {
      const v = k.proposal && k.proposal.newValue;
      if (!/\.provenance$/.test(String(k.fieldPath || '')) || !sourced(v)) continue;
      const g = groundingHonesty(k.fieldPath, v);
      if (!g.ok) bad.push(`${k.assetId} | ${k.fieldPath} -> ${g.error}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('the baked snapshot — what runtime actually serves', () => {
  test('NO snapshot entry lists sources without grounding', () => {
    // The corpus is the input; the snapshot is what a host reads. Checked separately
    // because a bake could in principle diverge, and the snapshot is the thing that
    // decides whether a "Sourced -" line appears.
    const bad = [];
    for (const e of (snapshot.entries || [])) {
      if (!/\.provenance$/.test(String(e.fieldPath || '')) || !sourced(e.value)) continue;
      if (!axisForField(e.fieldPath)) continue;
      if (!wouldGround(e.fieldPath, e.value)) {
        bad.push(`${e.assetId} | ${e.fieldPath} | tier=${JSON.stringify(e.value.tier)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('a Sourced line appears if and only if the predicate passes', () => {
    // hostv2 renders on `qtyGrounded && provenance.note`. Asserting the biconditional
    // rather than one direction: a sourced record must ground, and a grounding record
    // must carry the note the host needs to render.
    for (const e of (snapshot.entries || [])) {
      if (!/\.provenance$/.test(String(e.fieldPath || ''))) continue;
      const grounds = wouldGround(e.fieldPath, e.value);
      if (grounds) expect(String((e.value && e.value.note) || '').length).toBeGreaterThan(0);
      if (sourced(e.value) && axisForField(e.fieldPath)) expect(grounds).toBe(true);
    }
  });
});
