// ─── `vendors` NEVER MET `vendor`, AND NOTHING SAID SO ──────────────────────
//
// `blocks` says what is waiting on a decision. It is authored on 250 of 260
// decisions and feeds the dependency graph, the role scorer, and the
// `blastRadius` the schema spec wants. It never had a controlled vocabulary:
// 147 distinct targets across 471 uses, 78 of them used exactly once.
//
// MEASURED 2026-09-24: `vendors` is the corpus's SECOND most-used target (28
// uses), and every consumer that looks it up by exact key spells it `vendor` —
// BLOCK_ROLE_MAP, and the coordinator role's own decisionBlocks list. They have
// never matched. Twenty-eight vendor decisions scored zero for role relevance,
// for every role, on a lookup that reads correctly in both files.
//
// The vocabulary is TOKENS now (BLOCK), imported by both consumers, so the same
// name cannot be spelled two ways in two files again.
import { ALL_PLAYBOOKS } from '../playbooks';
import { normalizeBlock, normalizeBlocks, keyedBlockNames, BLOCK, CANONICAL_BLOCKS } from '../blockVocabulary';
import { BLOCK_ROLE_KEYS, scoreDecision } from '../experience/decisionIntelligence';
import { ROLES } from '../experience/experienceContext';

// Read off the real code. A hardcoded copy here would be the very drift this
// file exists to stop — and the first version of this probe did exactly that.
const keyed = () => keyedBlockNames(BLOCK_ROLE_KEYS, Object.values(ROLES).map((r) => r.decisionBlocks));
const uses = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
    for (const b of (d.blocks || [])) out.push(String(b).toLowerCase());
  }
  return out;
};

describe('(premise) the mismatch was real and this is its size', () => {
  test('the corpus says `vendors` and no consumer does', () => {
    const all = uses();
    expect(all.filter((b) => b === 'vendors').length).toBe(28);
    expect(all.filter((b) => b === 'vendor').length).toBe(0);
    expect(keyed()).toContain(BLOCK.VENDOR);
  });

  test('…and as authored, four fifths of the field reaches no consumer at all', () => {
    const k = keyed();
    const all = uses();
    const raw = all.filter((b) => k.includes(b)).length;
    expect(all.length).toBe(471);
    expect(raw).toBe(91);                       // 19%
  });
});

describe('THE FIX: one spelling, reached through one accessor', () => {
  test('normalizing lifts the reach, and by exactly the vendor rows', () => {
    const k = keyed();
    const all = uses();
    const raw = all.filter((b) => k.includes(b)).length;
    const norm = ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || [])
      .flatMap((d) => normalizeBlocks(d.blocks))).filter((b) => k.includes(b)).length;
    expect(norm).toBeGreaterThan(raw);
    // 28 vendors + 2 headcount + 1 guestcount = 31 rows that were invisible.
    expect(norm - raw).toBe(31);
  });

  test('the folds go the direction the RULE says, not by coin flip', () => {
    // Toward a consumer's spelling where one exists…
    expect(normalizeBlock('vendors')).toBe(BLOCK.VENDOR);
    expect(normalizeBlock('headcount')).toBe(BLOCK.GUESTS);
    expect(normalizeBlock('guestcount')).toBe(BLOCK.GUESTS);
    // …and toward the corpus majority where none does.
    expect(normalizeBlock('rental')).toBe(BLOCK.RENTALS);       // 4 -> 24
    expect(normalizeBlock('beverages')).toBe(BLOCK.BEVERAGE);   // 1 -> 9
    expect(normalizeBlock('purchases')).toBe(BLOCK.PURCHASING); // 3 -> 5
  });

  test('IT NEVER GUESSES AT A PLURAL IT WAS NOT TOLD ABOUT', () => {
    // A blind /s$/ strip would invent `logistic` and `game`, two targets that
    // appear nowhere, and would break the one consumer key that ends in s.
    expect(normalizeBlock('logistics')).toBe(BLOCK.LOGISTICS);
    expect(normalizeBlock('games')).toBe('games');
    expect(normalizeBlock('menu')).toBe('menu');
    expect(normalizeBlock('decor')).toBe('decor');
  });

  test('an unknown name passes through exactly as authored', () => {
    // 78 targets are used once. Folding them into something near-by would be
    // inventing a meaning; they stay as written and read as unmapped.
    expect(normalizeBlock('concessions')).toBe('concessions');
    expect(normalizeBlock('  Griddle ')).toBe('griddle');       // trimmed, lowered, kept
    expect(normalizeBlock('')).toBe('');
    expect(normalizeBlock(null)).toBe('');
  });

  test('normalizeBlocks de-duplicates what folds together', () => {
    expect(normalizeBlocks(['vendors', 'vendor', 'food'])).toEqual([BLOCK.VENDOR, BLOCK.FOOD]);
    expect(normalizeBlocks(null)).toEqual([]);
  });
});

describe('THE CONSUMER ACTUALLY USES IT — the module being right is not enough', () => {
  // ADDED AFTER RED-PROOFING FOUND THIS FILE TOO WEAK. Reverting
  // `normalizeBlocks(decision.blocks)` back to `decision.blocks || []` inside
  // scoreDecision left all eleven tests GREEN: they proved the vocabulary
  // module was correct and never that anything called it. A guard that passes
  // with the fix removed is the defect it was written to catch.
  const DEC = (blocks) => ({ id: 'd', label: 'Book the caterer', when: 'T-30d', blocks });

  test('a `vendors` decision now scores for the role that keys on `vendor`', () => {
    // coordinator.decisionBlocks contains BLOCK.VENDOR. Before normalization
    // this decision — written the way the corpus writes it — matched nothing.
    const withPlural = scoreDecision(DEC(['vendors']), 'coordinator', 'planning', []);
    const withSingular = scoreDecision(DEC(['vendor']), 'coordinator', 'planning', []);
    expect(withPlural).toBe(withSingular);
    expect(withPlural).toBeGreaterThan(scoreDecision(DEC(['griddle']), 'coordinator', 'planning', []));
  });

  test('and `headcount` scores for the role that keys on `guests`', () => {
    const a = scoreDecision(DEC(['headcount']), 'host', 'planning', []);
    const b = scoreDecision(DEC(['guests']), 'host', 'planning', []);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(scoreDecision(DEC(['griddle']), 'host', 'planning', []));
  });

  test('an unmapped name still scores nothing — normalization is not a bonus', () => {
    // If folding started lifting everything, the scorer would stop
    // discriminating and this whole exercise would have made it worse.
    expect(scoreDecision(DEC(['menu']), 'coordinator', 'planning', []))
      .toBe(scoreDecision(DEC(['concessions']), 'coordinator', 'planning', []));
  });
});

describe('ONE SOURCE — the tokens, not three copies of the strings', () => {
  test('every consumer key is a token, so a typo is a build error', () => {
    for (const k of BLOCK_ROLE_KEYS) expect(CANONICAL_BLOCKS).toContain(k);
  });

  test('and every role list is too', () => {
    for (const r of Object.values(ROLES)) {
      for (const b of (r.decisionBlocks || [])) expect(CANONICAL_BLOCKS).toContain(b);
    }
  });

  test('CANONICAL_BLOCKS is derived from the tokens, never a second list', () => {
    expect(CANONICAL_BLOCKS).toEqual(Object.values(BLOCK));
  });
});

describe('what is STILL unreached — recorded, not hidden', () => {
  test('the consumers key on far less than the corpus writes', () => {
    // Normalizing took reach from 19% to 26%. The rest is not a spelling
    // problem: `rentals`(24), `menu`(16), `decor`(8) and 100+ others have no
    // role entry at all, and adding one is a judgement about which roles care —
    // authoring, not normalization. Pinned so the number moves visibly.
    const k = keyed();
    const all = uses();
    const norm = ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || [])
      .flatMap((d) => normalizeBlocks(d.blocks))).filter((b) => k.includes(b)).length;
    expect(Math.round((100 * norm) / all.length)).toBe(26);
    expect(keyed().length).toBe(8);
  });
});
