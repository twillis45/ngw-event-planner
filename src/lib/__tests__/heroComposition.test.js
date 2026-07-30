// ─── HERO COMPOSITION — board rulings A and B (2026-07-30) ───────────────────
//
// Both rulings were issued, both were left unbuilt, and the board re-sat and scored
// the composition 4/10 *because* they were unbuilt. These are source gates on the two
// specific expressions, so "ruled but not shipped" cannot happen to them a second time.
//
// RULING A — collapse to ONE disclosure, and stop lying about navigation.
//   The hero carried TWO grey disclosures a few px apart, both reading "3":
//     :1562  "See 3 other ways ›"  → other ANSWERS to this decision (setDecDiscloseId)
//     :5982  "See all 3 ›"         → other DECISIONS in the bundle    (setBundleOpen)
//   They are disjoint offers; both reading "3" was coincidence, and :5982's count
//   included the on-screen one so it offered 3 where 2 were new. The Grandmother seat
//   ruled she could not tell them apart and would shut the laptop.
//   SHIPPED HERE: :1562 loses its count and its glyph and becomes "Other ways ▸" —
//   the closed twin of the "Other ways ▾" the SAME control already wore when open.
//   The `›` was false navigation: the handler toggles decDiscloseId IN PLACE.
//   NOT SHIPPED: deleting :5982 / :5944. Its stated premise ("those rows already live
//   under the .efold handle") was driven and is FALSE — see the note on that test.
//
// RULING B — keep the chip, cut the duplicated scold.
//   The guide said "a few decisions are past their easy window" while the line directly
//   below said "Was due 5 days ago." — the same scold twice, once vague, once with a
//   number. Rams' dissent sustained: keep the instance, cut the generalisation.
const fs = require('fs');
const path = require('path');

const SHELL = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');

describe('ruling A — one disclosure, and no glyph on a handler that does not route', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  // Code only: the comments deliberately quote the OLD strings ("See 3 other ways ›")
  // as the record of what was wrong, so the gate must read past them.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  // Every <button className="decopt-disc" …>…</button> as written, so the assertions
  // below are scoped to the control itself rather than to the whole 15k-line file.
  const discButtons = src.match(/<button className="decopt-disc"[\s\S]*?<\/button>/g) || [];

  it('finds the disclosure control it is meant to police', () => {
    // Two: the closed (open-it) state and the open (fold-it) state.
    expect(discButtons.length).toBe(2);
  });

  it('the in-place "other ways" control renders ▸ closed and ▾ open — one control', () => {
    const closed = discButtons.find(b => b.includes('setDecDiscloseId(nd.id)'));
    const open = discButtons.find(b => b.includes('setDecDiscloseId(null)'));
    expect(closed).toMatch(/>Other ways\s+▸</);
    expect(open).toMatch(/>Other ways\s+▾</);
  });

  it('it carries NO count and NO navigation glyph', () => {
    const closed = discButtons.find(b => b.includes('setDecDiscloseId(nd.id)'));
    // `alts.length` in the label is the count; `›` is the false navigation (this
    // handler toggles in place and routes nowhere). Neither may return.
    expect(closed).not.toMatch(/alts\.length/);
    expect(closed).not.toContain('›');
    // The old expression, in any form, anywhere.
    expect(src).not.toMatch(/'See '\s*\+\s*alts\.length/);
  });

  it('the decopt disclosure is the ONLY control feeding setDecDiscloseId a value', () => {
    // Guards against a second entry point growing back with its own label/glyph.
    const opens = (src.match(/setDecDiscloseId\((?!null)/g) || []).length;
    expect(opens).toBe(1);
  });

  // ── THE HALF OF A THAT IS DELIBERATELY NOT SHIPPED ────────────────────────────
  // A also ordered the sibling-decisions disclosure (:5982 decision hero, :5944
  // conflict hero) DELETED, on the stated premise that "those rows already live under
  // the existing .efold 'The rest of your plan' handle". The handoff itself said
  // "verify that before deleting, or you strip access."
  //
  // DRIVEN 2026-07-30 on Game Night (T-2d, pristine, 3 open decisions bundled). The
  // premise is FALSE:
  //   • the .efold handle is only a scrollBy button — it renders no rows itself
  //   • the "Then, in order" block maps queue.slice(1); the bundle IS queue[0], so its
  //     KIDS are structurally excluded from it
  //   • inside the day-before window that block stands down entirely (nearDayPlan) —
  //     .ef-sect and .ef-list rendered EMPTY
  //   • the section chips offer Date & time / Venue / Guests / Food / Shopping / Rain
  //     plan / Budget — there is NO decisions door
  //   • expanding "the rest of your list · 6 more" did not surface them either
  // So on that screen "See all 3 ›" is the ONLY path to 2 of 3 open decisions.
  // Deleting it strips access. This test PINS the row in place so a future pass cannot
  // delete it on the stale premise — remove this test only together with a real door.
  it('the sibling-decisions disclosure REMAINS until a decisions door exists', () => {
    const laterRows = src.match(/setBundleOpen\(m => \(\{ \.\.\.m, \[key\]: !open \}\)\)/g) || [];
    expect(laterRows.length).toBeGreaterThanOrEqual(2); // decision hero + conflict hero
    expect(src).toMatch(/Fold them away/);
  });
});

describe('ruling B — the overdue scold is said once, not twice', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the vague decisions clause is suppressed when the hero IS that overdue decision', () => {
    expect(src).toMatch(/heroSpeaksThisOverdue\s*=\s*!!\(heroDecisionRow && heroDecisionRow\.status === 'overdue'\)/);
    expect(src).toMatch(/if \(od && !heroSpeaksThisOverdue\) slips\.push\(/);
  });

  it('the guard is STRUCTURAL — heroDecisionRow, never a title regex', () => {
    // The whole class of bug ruling C closed was classification by title prose. B must
    // not reintroduce it: the suppression rides the resolved decision row.
    expect(src).toMatch(/const heroDecisionRow = \(\(\) => \{/);
    // heroDecisionRow yields null whenever an earlier ask rung owns the hero, so the
    // guard can never claim a hero that is talking about something else.
    const block = src.slice(src.indexOf('const heroDecisionRow'), src.indexOf('const heroAskText'));
    for (const rung of ['days === 0', 'blocker:', 'conflict', 'coi']) {
      expect(block).toContain(rung);
    }
  });

  it('ONE derivation — the ask ladder reads the same heroDecisionRow, not its own copy', () => {
    // Ruling C's lesson applied forward: if the ask ladder re-derived the decision row
    // separately, B could suppress against a row the H1 is not actually speaking.
    expect(src).toMatch(/if \(elegantMode && heroDecisionRow\) \{/);
    const askBlock = src.slice(src.indexOf('const heroAskText'), src.indexOf('heroAskFor(q0, event)'));
    expect(askBlock).not.toMatch(/decisionBoard\.open \|\| \[\]\)\.find/);
  });

  it('only the DECISIONS clause is suppressed — time and spending slips survive', () => {
    expect(src).toMatch(/slips\.push\('time got tight'\)/);
    expect(src).toMatch(/slips\.push\('spending is past your number'\)/);
  });

  it('the specific instance is KEPT — the hero still prints the decision because-line', () => {
    // "Was due 5 days ago." comes from dec.because on the decision hero. B cuts the
    // generalisation ABOVE it, never this.
    expect(src).toMatch(/dec\.because && <p className="because">\{dec\.because\}<\/p>/);
  });
});
