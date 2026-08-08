/**
 * THE LODGING DEEP LINK MUST SURVIVE THE PAGE LOAD (2026-08-08).
 *
 * Every other sheet kind keeps its `focus` because the dispatcher builds
 * `{ kind, focus }` and hands it to setSheet — component state, same page. The
 * cockpit is a different animal: `goToLodgingCockpit` assigns
 * window.location.href, so the hand-off crosses a page load and anything not in
 * the URL is gone. It was gone. The dispatcher called it with no argument, ONE
 * LINE above the generic path that preserves focus for everything else.
 *
 * What that cost: surfaceRegistry.js:436 raises the group-rate obligation with
 * `focusField:'lodging-deadline'`; routeResolver.js:98 turns that into
 * {kind:'lodging', focus:'deadline'}; the dispatcher then dropped it and the
 * host landed on whatever stage the cockpit derived, with no anchor — having
 * tapped a dated warning about a deadline. The only consumer of
 * `sheet.focus === 'deadline'` in the shell is inside the lodging sheet the
 * file itself calls unreachable, so nothing caught it.
 *
 * THIS IS A CROSS-FILE CONTRACT and that is why it is a source test. Neither
 * file is wrong alone: HostShellV2 may legitimately navigate away, and the
 * cockpit may legitimately derive its own stage. The defect lives in the seam,
 * so a test that reads one file could never see it — the same shape as
 * worryLaneCarriesTheAsk.test.js.
 */
const fs = require('fs');
const path = require('path');

const SHELL = fs.readFileSync(
  path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
const COCKPIT = fs.readFileSync(
  path.join(__dirname, '../../../hostv2/src/LodgingCockpit.jsx'), 'utf8');
const RESOLVER = fs.readFileSync(
  path.join(__dirname, '../routeResolver.js'), 'utf8');

describe('the sender carries focus across the page load', () => {
  test('the dispatcher passes the route focus, it does not call bare', () => {
    // The exact line that was wrong. `goToLodgingCockpit()` with empty parens
    // in the dispatcher is the defect, restored verbatim.
    const dispatch = SHELL.match(/if \(r\.kind === 'lodging'\) \{[^}]*\}/);
    expect(dispatch).not.toBeNull();
    expect(dispatch[0]).toMatch(/goToLodgingCockpit\(\s*r\.focus\s*\)/);
    expect(dispatch[0]).not.toMatch(/goToLodgingCockpit\(\s*\)/);
  });

  test('goToLodgingCockpit puts focus in the URL, since state cannot cross a reload', () => {
    const fn = SHELL.match(/const goToLodgingCockpit = \([\s\S]*?\n  \};/);
    expect(fn).not.toBeNull();
    const body = fn[0];
    expect(body).toMatch(/searchParams\.set\('demo', 'lodging'\)/);
    // Both halves: set when present, and DELETE when absent — a stale focus
    // left on the URL would drag every later arrival to an old row.
    expect(body).toMatch(/searchParams\.set\('focus'/);
    expect(body).toMatch(/searchParams\.delete\('focus'\)/);
    // The catch path is the one that actually runs on a malformed href, and it
    // is where a hand-built query string forgets to encode.
    expect(body).toMatch(/encodeURIComponent\(f\)/);
  });
});

describe('the receiver reads it and lands on it', () => {
  test('the cockpit reads focus from the URL', () => {
    expect(COCKPIT).toMatch(/new URLSearchParams\(window\.location\.search\)\.get\('focus'\)/);
  });

  test('focus is read once into state, never re-read on every render', () => {
    // A param re-read each render would re-assert itself forever and drag the
    // host back to the same row after every write — the opposite of landing.
    expect(COCKPIT).toMatch(/useState\(\(\) => \{[\s\S]{0,240}?get\('focus'\)/);
  });

  test('acting clears the focus, the same way it clears a stage peek', () => {
    const patchFn = COCKPIT.match(/const patch = useCallback\([\s\S]*?\}, \[eventId\]\);/);
    expect(patchFn).not.toBeNull();
    expect(patchFn[0]).toMatch(/setViewing\(null\)/);
    expect(patchFn[0]).toMatch(/setFocus\(null\)/);
  });

  test('both anchors exist — the deadline field and the guest row', () => {
    // 'deadline' lands on the rate field...
    expect(COCKPIT).toMatch(/focus === 'deadline'[\s\S]{0,80}scrollIntoView/);
    // ...and a guest id lands on that guest's roster row, STRING-compared,
    // because an id that survives a URL is text and `5 === '5'` is false.
    expect(COCKPIT).toMatch(/String\(focus\) === String\(r\.guestId\)/);
  });

  test('a focus may not claim the host is further along than they are', () => {
    // The guard: only honour the focus stage when the event is already at or
    // past it. Otherwise Picked renders "Nothing picked yet" and WhosBooked has
    // no rate to chase, and the link would have invented a stage.
    const guard = COCKPIT.match(/const focusStage = \(\(\) => \{[\s\S]*?\}\)\(\);/);
    expect(guard).not.toBeNull();
    expect(guard[0]).toMatch(/at !== 'picked' && at !== 'booked'/);
    expect(guard[0]).toMatch(/return null/);
  });
});

describe('the two focus shapes are the two the router actually emits', () => {
  test('routeResolver still emits deadline and a guest id for lodging', () => {
    // If this changes, the cockpit is anchoring on shapes nobody sends and the
    // landing silently stops working — so the contract is pinned at the source.
    expect(RESOLVER).toMatch(/kind: 'lodging'/);
    expect(RESOLVER).toMatch(/focus: 'deadline'|lodging-deadline/);
  });
});
