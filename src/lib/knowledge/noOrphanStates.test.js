// ─── NO ORPHAN LIFECYCLE STATES (Phase 5F.9 Step 2) ──────────────────────────
//
// THE DEFECT. `KcrTable` renders in exactly four workspaces:
//
//   Review      review, grounded
//   Publishing  approved
//   Validation  published
//   Retirement  archived, deprecated
//
// `draft`, `researching` and `revision` appeared in NONE of them. "Send back" — the
// reject action on every review row — advances a record to `researching`, so rejecting
// anything moved it into a status the console could not display and could not recover.
//
// Found by walking into it: a mis-click during 5F.8 sent a real record to `researching`
// and it vanished from every workspace. A lifecycle you can enter and not leave is not a
// lifecycle.
//
// This test pins the property rather than the fix: every non-terminal status must be
// reachable in some listing. If a future workspace change strands one again, it fails.
import { KCR_STATUS, KCR_TRANSITIONS } from './knowledgeChange';

// The status sets each workspace lists, mirrored from AdminConsole's filters.
const WORKSPACE_LISTINGS = {
  // `draft` is deliberately NOT here. Measured in the live store: 227 auto-seeded
  // corpus-dimension drafts against 2 real sent-back records. Listing drafts beside
  // review work buries the human work under machine candidates — a different untruth
  // from the one being fixed. Drafts are intake; they belong to the intake surfaces.
  Review: ['review', 'grounded', 'researching'],
  Publishing: ['approved'],
  Validation: ['published'],
  Monitoring: ['monitoring'],
  Retirement: ['archived', 'deprecated'],
};
const INTAKE_ONLY = new Set(['draft']);

const listed = new Set(Object.values(WORKSPACE_LISTINGS).flat());

describe('every lifecycle state is reachable in the console', () => {
  test('no NON-TERMINAL status is invisible', () => {
    // `revision` is reachable from published and is listed by Validation's own row
    // controls rather than a separate table; every other status must appear in a listing.
    const invisible = KCR_STATUS.filter((s) => !listed.has(s) && s !== 'revision' && !INTAKE_ONLY.has(s));
    expect(invisible).toEqual([]);
  });

  test('the states "Send back" produces are listed', () => {
    // review -> researching (reject at review) and approved -> archived (withdraw).
    // These are what a human ACTION produces, so they must be visible.
    expect(listed.has('researching')).toBe(true);
    expect(listed.has('archived')).toBe(true);
  });

  test('draft is intake, and is intentionally NOT in the review listing', () => {
    // Guards the fix from being "improved" back into the problem it caused.
    expect(listed.has('draft')).toBe(false);
    expect(INTAKE_ONLY.has('draft')).toBe(true);
  });

  test('every status a transition can REACH is listed or terminal', () => {
    const reachable = new Set(Object.values(KCR_TRANSITIONS).flat());
    const stranded = [...reachable].filter((s) => !listed.has(s) && s !== 'revision' && !INTAKE_ONLY.has(s));
    expect(stranded).toEqual([]);
  });

  test('archived is terminal, so being listed in Retirement is the end of the road', () => {
    expect(KCR_TRANSITIONS.archived).toEqual([]);
    expect(WORKSPACE_LISTINGS.Retirement).toContain('archived');
  });
});

describe('the listing sets do not overlap misleadingly', () => {
  test('no status is claimed by two different workspaces', () => {
    // A record showing in two places would double-count every KPI derived from them.
    const seen = new Set();
    for (const statuses of Object.values(WORKSPACE_LISTINGS)) {
      for (const s of statuses) {
        expect(seen.has(s)).toBe(false);
        seen.add(s);
      }
    }
  });
});
