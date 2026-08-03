// ─── The canonical inventory (Phase 5F.6 W2) ─────────────────────────────────
//
// THE INVARIANT UNDER TEST: the denominator never shrinks because evidence is missing.
// Every prior counter in this repo violated that in some way, and each violation made
// the corpus look better understood than it is.
import { ALL_PLAYBOOKS } from '../playbooks/index';
import snapshot from './publishedKnowledge.json';
import {
  knowledgeInventory, lineState, directlyCitedShare, inventoryTree, INVENTORY_STATES,
} from './knowledgeInventory';

const pb = (type, purchases) => ({ type, purchases });
const line = (id, extra = {}) => ({
  id, item: id, category: 'food', essential: true,
  unitCostRange: [1, 2], qtyPerGuest: 1, ...extra,
});
const prov = (tier, sources) => ({ tier, verificationStatus: tier, sources, note: 'n' });

describe('the denominator is every authored line, always', () => {
  test('counts sum to the total — no line is uncounted', () => {
    const inv = knowledgeInventory(ALL_PLAYBOOKS, snapshot.entries || []);
    const sum = INVENTORY_STATES.reduce((a, s) => a + inv.counts[s], 0);
    expect(sum).toBe(inv.total);
  });

  test('the total equals the authored purchase-line count, independent of evidence', () => {
    const authored = ALL_PLAYBOOKS.reduce((a, p) => a + (p.purchases || []).length, 0);
    // Same total with a full snapshot and with NO snapshot at all. This is the whole
    // point: removing every piece of evidence must not shrink the denominator.
    expect(knowledgeInventory(ALL_PLAYBOOKS, snapshot.entries || []).total).toBe(authored);
    expect(knowledgeInventory(ALL_PLAYBOOKS, []).total).toBe(authored);
  });

  test('stripping evidence MOVES lines between states and changes no total', () => {
    const withEv = knowledgeInventory(ALL_PLAYBOOKS, snapshot.entries || []);
    const without = knowledgeInventory(ALL_PLAYBOOKS, []);
    expect(without.total).toBe(withEv.total);
    expect(without.counts['directly-cited']).toBeLessThanOrEqual(withEv.counts['directly-cited']);
  });

  test('every line lands in exactly one DECLARED state', () => {
    const inv = knowledgeInventory(ALL_PLAYBOOKS, snapshot.entries || []);
    for (const r of inv.rows) expect(INVENTORY_STATES).toContain(r.state);
    expect(inv.rows.length).toBe(inv.total);
  });

  test('per-playbook counts reconcile to the global counts', () => {
    const inv = knowledgeInventory(ALL_PLAYBOOKS, snapshot.entries || []);
    for (const s of INVENTORY_STATES) {
      const summed = inv.byPlaybook.reduce((a, p) => a + p.counts[s], 0);
      expect(summed).toBe(inv.counts[s]);
    }
  });
});

describe('states are derived from the HOST predicate, not a parallel notion', () => {
  const keys = new Set();

  test('grounded requires the same predicate the host renders on', () => {
    expect(lineState('A', line('p_x', { provenance: prov('researched', ['reddy-ice-2026']) }), keys)).toBe('directly-cited');
    // researched tier but an UNREGISTERED source does not ground
    expect(lineState('A', line('p_x', { provenance: prov('researched', ['made-up-2026']) }), keys)).toBe('ambiguous');
  });

  test('AMBIGUOUS is the looks-sourced-but-is-not class', () => {
    // The 5F.4 defect shape: approved source, wrong tier.
    expect(lineState('A', line('p_x', { provenance: prov('trade-heuristic', ['reddy-ice-2026']) }), keys))
      .toBe('ambiguous');
  });

  test('NEEDS-SOURCE covers both the object form and the bare STRING form', () => {
    expect(lineState('A', line('p_x', { provenance: prov('norm', []) }), keys)).toBe('needs-source');
    // 21 corpus lines carry provenance as a string; they declare something and cite
    // nothing, so they belong here and not in "no provenance at all".
    expect(lineState('A', line('p_x', { provenance: 'synthesized' }), keys)).toBe('needs-source');
  });

  test('NEEDS-PROVENANCE is a real value with nothing said about it', () => {
    expect(lineState('A', line('p_x'), keys)).toBe('needs-provenance');
  });

  test('UNSUPPORTED is a line with no costed and no quantified claim', () => {
    const bare = { id: 'p_x', item: 'x', category: 'decor' };
    expect(lineState('A', bare, keys)).toBe('unsupported');
  });

  test('EFFECTIVE provenance wins over authored — a governed line counts as grounded', () => {
    // Phase 5F.11. This read the AUTHORED provenance while a host reads the governed
    // value overlaid on top. Measured after Wave 0 committed three grounded ice
    // records: `grounded` stayed at 38 and `reviewed` went 1 -> 4, so the three lines
    // governance had just fixed were reported as "does not ground". The inventory was
    // reporting something other than what the runtime serves.
    const published = new Set(['A p_ice.provenance']);
    const authoredUngrounded = line('p_ice');                       // no provenance at all
    const governed = prov('researched', ['reddy-ice-2026']);
    expect(lineState('A', authoredUngrounded, published, governed)).toBe('directly-cited');
    // and without the governed overlay it is only "reviewed"
    expect(lineState('A', authoredUngrounded, published)).toBe('reviewed');
  });

  test('ENTRIES STRIPPED OF `value` silently understate grounding (5F.11)', () => {
    // The console passed a list mapped down to {assetId, fieldPath} for the picker and
    // reused it here. `value` was gone, so the governed lookup returned undefined,
    // every governed line fell back to its authored provenance, and the console read
    // "grounded 38 · reviewed 8" while the corpus measured 46 and 0.
    //
    // The inventory cannot detect a caller that drops the field — but it CAN be shown
    // to depend on it, so the dependency is documented rather than folklore.
    const pbs = [pb('A', [line('p_ice', { provenance: null })])];
    const full = [{ assetId: 'A', fieldPath: 'p_ice.provenance', value: prov('researched', ['reddy-ice-2026']) }];
    const stripped = full.map((e) => ({ assetId: e.assetId, fieldPath: e.fieldPath }));

    expect(knowledgeInventory(pbs, full).counts['directly-cited']).toBe(1);
    expect(knowledgeInventory(pbs, stripped).counts['directly-cited']).toBe(0);
    expect(knowledgeInventory(pbs, stripped).counts.reviewed).toBe(1);
  });

  test('a governed provenance that does NOT ground still reads reviewed', () => {
    const published = new Set(['A p_ice.provenance']);
    const weak = prov('trade-heuristic', ['reddy-ice-2026']);
    expect(lineState('A', line('p_ice'), published, weak)).toBe('reviewed');
  });

  test('REVIEWED means governance published on this line without grounding it', () => {
    const published = new Set(['A p_x.qtyPerGuest']);
    expect(lineState('A', line('p_x'), published)).toBe('reviewed');
    // and grounding still wins over reviewed
    expect(lineState('A', line('p_x', { provenance: prov('researched', ['reddy-ice-2026']) }), published))
      .toBe('directly-cited');
  });

  test('REVIEWED does not leak across purchases with a shared id prefix', () => {
    // 'A p_ice_extra.qtyPerGuest' must not mark 'p_ice' as reviewed.
    const published = new Set(['A p_ice_extra.qtyPerGuest']);
    expect(lineState('A', line('p_ice'), published)).toBe('needs-provenance');
  });
});

describe('against the REAL corpus', () => {
  const inv = knowledgeInventory(ALL_PLAYBOOKS, snapshot.entries || []);

  test('the corpus is large enough that a vacuous pass would be obvious', () => {
    expect(inv.total).toBeGreaterThan(500);
    expect(inv.byPlaybook.length).toBe(ALL_PLAYBOOKS.length);
  });

  test('the grounded share is reported honestly against the FULL denominator', () => {
    const share = directlyCitedShare(inv);
    expect(share).toBeGreaterThan(0);
    // If this ever reads like a healthy number, check the denominator before celebrating.
    expect(share).toBeLessThan(50);
  });

  test('the AMBIGUOUS class is non-empty — it is the one that misleads', () => {
    // Authored lines that list sources and do not ground. Guarded as a ratchet in
    // `authoredCorpusIntegrity.test.js`; counted here so it cannot hide inside a total.
    expect(inv.counts.ambiguous).toBeGreaterThan(0);
  });

  test('no published entry is orphaned from its authored line', () => {
    expect(inv.orphanedPublished).toEqual([]);
  });

  test('the tree shows the denominator FIRST and every state, including the zeros', () => {
    const t = inventoryTree(inv);
    expect(t.split('\n')[0]).toMatch(/^TOTAL CANDIDATES/);
    for (const s of INVENTORY_STATES) expect(t).toContain(s);
  });
});

describe('it does not repeat the old miscounts', () => {
  test('a line is NOT dropped for carrying an unrecognised verificationStatus', () => {
    // groundingAudit.mjs drops 'researched' and 'partial' entirely. Here they count.
    const one = pb('A', [line('p_x', { provenance: { tier: 'researched', verificationStatus: 'partial', sources: [] } })]);
    const inv = knowledgeInventory([one], []);
    expect(inv.total).toBe(1);
    expect(inv.counts['needs-source']).toBe(1);
  });

  test('a line with a provenance object but zero sources is COUNTED, not skipped', () => {
    // The 97 lines the "237" figure omitted.
    const one = pb('A', [line('p_x', { provenance: prov('trade-heuristic', []) })]);
    expect(knowledgeInventory([one], []).counts['needs-source']).toBe(1);
  });

  test('an empty corpus reports zero rather than dividing by zero', () => {
    const inv = knowledgeInventory([], []);
    expect(inv.total).toBe(0);
    expect(directlyCitedShare(inv)).toBe(0);
  });
});
