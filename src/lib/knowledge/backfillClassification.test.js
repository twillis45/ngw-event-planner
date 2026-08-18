// ─── Backfill classification (Phase 5F.6 W4) ─────────────────────────────────
import { ALL_PLAYBOOKS } from '../playbooks/index';
import snapshot from './publishedKnowledge.json';
import { knowledgeInventory } from './knowledgeInventory';
import { resolveGroundingSource } from './groundingSources';
import { isGroundedCost } from './costProvenance';
import {
  backfillClassification, classifyLine, effortEstimate, classificationSummary,
  SUBJECT_SOURCES, RECORDED_CONFLICTS, BACKFILL_TYPES, INTERACTIONS_PER_CORRECTION,
} from './backfillClassification';

const ENTRIES = snapshot.entries || [];
const line = (id, extra = {}) => ({ id, item: id, category: 'food', unitCostRange: [1, 2], qtyPerGuest: 1, ...extra });

describe('the declared subject map is real', () => {
  test('every source named in the subject map exists in a registry', () => {
    // The map is a human claim; this stops it claiming a source that was renamed or
    // never registered.
    for (const s of SUBJECT_SOURCES) {
      expect(resolveGroundingSource(s.source)).toBeTruthy();
    }
  });

  test('no purchase id is claimed by two subjects', () => {
    const seen = new Set();
    for (const s of SUBJECT_SOURCES) {
      for (const id of s.ids) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  test('every recorded conflict names a reason a human could act on', () => {
    for (const c of RECORDED_CONFLICTS) {
      expect(c.assets.length).toBeGreaterThan(0);
      expect(c.why.length).toBeGreaterThan(40);
    }
  });
});

describe('classification assigns WORK, never a verdict on evidence', () => {
  test('Type A says a source EXISTS — never that the line is correct or ready', () => {
    const c = classifyLine('Fish Fry', line('p_ice'), 'needs-provenance');
    expect(c.type).toBe('A');
    expect(c.source).toBe('reddy-ice-2026');
    expect(c.why).toMatch(/still a human decision/);
  });

  test('no classification ever asserts a value is right', () => {
    const cls = backfillClassification(ALL_PLAYBOOKS, ENTRIES);
    for (const r of cls.rows) {
      expect(r.why).not.toMatch(/\b(is correct|is right|verified|confirmed|ready to publish)\b/i);
      expect(r.action).not.toMatch(/publish|approve/i);
    }
  });

  test('Type B is honest that speed cannot help it', () => {
    const c = classifyLine('Wedding', line('p_cleanup', { category: 'cleanup' }), 'needs-provenance');
    expect(c.type).toBe('B');
    expect(c.why).toMatch(/no amount of workflow speed reaches it/);
  });

  test('Type C fires on a RECORDED conflict, and carries its reason', () => {
    const c = classifyLine('Repast', line('p_ice'), 'needs-provenance');
    expect(c.type).toBe('C');
    expect(c.action).toBe('manual decision');
    expect(c.why).toMatch(/dry or indoor/);
  });

  test('a conflict OUTWEIGHS having a source — Crawfish Boil ice is a decision, not a workflow', () => {
    expect(classifyLine('Crawfish Boil', line('p_ice'), 'needs-provenance').type).toBe('C');
    // ...but the same purchase on an uncontested asset stays Type A
    expect(classifyLine('The Cookout', line('p_ice'), 'needs-provenance').type).toBe('A');
  });

  test('Type D covers both "nothing reads it" and "nothing to ground"', () => {
    expect(classifyLine('A', line('p_x'), 'blocked').type).toBe('D');
    expect(classifyLine('A', line('p_x'), 'unsupported').type).toBe('D');
    expect(classifyLine('A', line('p_x'), 'blocked').action).toBe('leave ungrounded');
  });
});

describe('it reconciles with the inventory rather than floating free', () => {
  const inv = knowledgeInventory(ALL_PLAYBOOKS, ENTRIES);
  const cls = backfillClassification(ALL_PLAYBOOKS, ENTRIES);

  test('total matches the inventory total exactly', () => {
    expect(cls.total).toBe(inv.total);
  });

  test('needsWork = total minus what is already cited or reviewed', () => {
    // This reconciliation is the guard that caught the Phase 5G-B rename drift: the
    // classifier still tested for the literal 'grounded', so all 52 settled lines
    // silently re-entered the backlog and were reported as a bigger backlog, not an
    // error. Keep it reconciling against the inventory, never against a fixed number.
    expect(cls.needsWork).toBe(inv.total - inv.counts['directly-cited'] - inv.counts.reviewed);
  });

  test('the four types partition needsWork with nothing left over', () => {
    const sum = BACKFILL_TYPES.reduce((a, t) => a + cls.counts[t], 0);
    expect(sum).toBe(cls.needsWork);
  });

  test('every row carries a declared type', () => {
    for (const r of cls.rows) expect(BACKFILL_TYPES).toContain(r.type);
  });

  test('per-category counts reconcile to the totals', () => {
    for (const t of BACKFILL_TYPES) {
      const summed = Object.values(cls.byCategory).reduce((a, c) => a + c[t], 0);
      expect(summed).toBe(cls.counts[t]);
    }
  });
});

describe('the shape of the real backlog', () => {
  const cls = backfillClassification(ALL_PLAYBOOKS, ENTRIES);

  test('Type B is the LARGEST class — the backlog is short of sources, not of speed', () => {
    // The headline finding of 5F.5, now asserted rather than narrated. If this ever
    // flips, the bottleneck has genuinely moved and the plan should change with it.
    expect(cls.counts.B).toBeGreaterThan(cls.counts.A);
  });

  test('THE KIT LINES stay Type B — there is no per-guest claim to ground', () => {
    // The 5F.7 finding, and the reason no "cleanup supplies" source was registered.
    // `p_cleanup`, `p_paper`, `p_trash`, `p_clean` and `p_dish` are all
    // `qtyFlat: 1, unit: 'kit'` — one kit per event, a packaging decision rather than
    // a per-guest rate. A quantity source cannot ground "1 kit", so mapping one onto
    // them would be a source with no grounding ability. Their $8-15/kit range is a
    // COST-axis question.
    //
    // Originally written as "cleanup/rental/decor/logistics are entirely Type B",
    // which FAILED once `jollychef-disposables-2026` landed — because `p_tableware`
    // and `p_napkins` are filed under those categories and are genuinely reachable.
    // Category was the wrong unit; the kit shape is the real boundary.
    //
    // WAS `expect(kit.length).toBeGreaterThan(40)` — a pin on 44, which is every
    // kit line in the corpus. It broke on 2026-08-16 at 25, and the pin was right
    // to break: `lineState` now reports a line as directly-cited when its PRICE is
    // cited, and 19 of these kit lines carry exactly that. Their "$8-15/kit range
    // is a COST-axis question", as this comment already said — so the moment the
    // cost axis became visible, they stopped being outstanding work.
    //
    // So the count is derived instead of pinned. The PROPERTY is what mattered all
    // along: whatever kit lines remain outstanding are Type B, because no quantity
    // source can ground "1 kit". A line leaving this backlog must leave because its
    // price got cited — never because a per-guest rate was invented for a kit.
    const KIT_IDS = ['p_cleanup', 'p_paper', 'p_trash', 'p_clean', 'p_dish'];
    const kit = cls.rows.filter((r) => KIT_IDS.includes(r.id));
    const allKit = ALL_PLAYBOOKS.flatMap((pb) => (pb.purchases || []).filter((p) => KIT_IDS.includes(p.id)));
    const priced = allKit.filter((p) => isGroundedCost(p.costProvenance) || isGroundedCost(p.provenance));
    expect(allKit.length).toBeGreaterThan(40);          // the shape is still large
    expect(priced.length).toBeGreaterThan(0);           // ...and partly cost-cited
    expect(kit.length).toBe(allKit.length - priced.length);
    expect(kit.every((r) => r.type === 'B')).toBe(true);
  });

  test('the new disposables source reaches exactly the PER-GUEST place settings', () => {
    // 20 since Batch 2 (5F.11) grounded ten p_tableware lines — a grounded
    // line leaves `needsWork`, which is the count moving in the right direction.
    // Pinned so it cannot move without somebody noticing.
    //
    // 2026-08-16: somebody noticed, twice in one day. First p_tableware went 8 -> 6
    // when `lineState` became cost-aware. Then the disposables citation batch landed
    // cost blocks on five more p_tableware lines (Retirement, Sweet 16, Quinceanera,
    // Pupusa, Bachelorette) and two p_cups lines (Graduation, Day Party), taking the
    // pin to 1 and 2. Both moves are the same direction — work leaving the backlog
    // because it is genuinely done — so the pin is re-set rather than loosened, and
    // it stays a pin. When it moves again, check the citations before the code.
    const reached = cls.rows.filter((r) => r.source === 'jollychef-disposables-2026');
    const byId = {};
    for (const r of reached) byId[r.id] = (byId[r.id] || 0) + 1;
    // Third move in one day, same direction every time: the second citation batch
    // took another p_cups line (Day Party) and a p_napkins line (Vow Renewal) out
    // of the backlog. The pin is doing exactly what its comment asks — refusing to
    // let coverage change without somebody looking at why.
    // Fourth move today, still the same direction. This round cited the last
    // p_cups line and three more p_napkins lines (Engagement, Card Party, Sunday
    // Dinner) against the disposables and cleaning registries, so they left the
    // backlog. When only p_tableware and p_napkins remain and both are small, the
    // disposables seam is close to worked out.
    // Fifth move, 2026-08-18, same direction. The napkin rows in Anniversary and
    // Dinner Party left the backlog when `linen-rental-2026` and
    // `linen-rental-sizes-2026` were registered. Those two sources exist because
    // the disposables claim deliberately EXCLUDES linens as a different product,
    // which is correct and is what had left every cloth-napkin row unsourceable.
    // Checked before re-pinning, as the comment above asks: the citations are new
    // and real, the classifier did not change.
    // Sixth move, 2026-08-18. Same direction again: one more p_napkins line left
    // the backlog when the crawfish and low-country cleanup kits were grounded
    // against the heavy-duty bag and glove sources. Checked before re-pinning —
    // the citations are new and real, the classifier did not change.
    // The p_tableware line left too, in the same batch — the low-country boil
    // per-guest set was grounded against the bulk plate and cleaning sources.
    // What remains reachable through jollychef-disposables-2026 is a single
    // p_napkins line, so the disposables seam is now genuinely worked out.
    // Seventh and final move. The last p_napkins line left the backlog when the
    // game-night cocktail-napkin row was grounded. THE DISPOSABLES SEAM IS NOW
    // EMPTY — nothing reachable through jollychef-disposables-2026 remains
    // uncited, which is the end state this pin was built to track rather than a
    // number to keep adjusting.
    expect(byId).toEqual({});
    expect(reached.length).toBe(0);
  });

  test('effort is estimated for reachable work and REFUSED for research', () => {
    const e = effortEstimate(cls);
    expect(e.reachableInteractions).toBe(e.reachableLines * INTERACTIONS_PER_CORRECTION);
    // Putting a number on unstarted research would invent one.
    expect(e.blockedInteractions).toBeNull();
    expect(e.blockedLines).toBe(cls.counts.B + cls.counts.C);
  });

  test('the summary names the limit of what it did', () => {
    expect(classificationSummary(cls)).toMatch(/Classification sorts WORK, not evidence/);
  });

  test('an empty corpus classifies as nothing outstanding', () => {
    expect(classificationSummary(backfillClassification([], []))).toBe('Nothing outstanding.');
  });
});
