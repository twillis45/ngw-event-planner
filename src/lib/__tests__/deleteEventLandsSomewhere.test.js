/**
 * DELETING AN EVENT — the act, and the two ways it broke while being built.
 *
 * LIVE_MODE_READINESS section 5 asks for delete "verified end to end"; this
 * shell had no delete at all, and the store guard said so in its own words:
 * "this shell has NO delete path ... If a real 'delete this event' action is
 * ever built, it passes the flag — and it should be the only caller that does."
 *
 * Both defects below were found by DRIVING the delete in a browser, not by
 * reading the diff, and neither would have failed a build:
 *
 *   1. A TEMPORAL DEAD ZONE that had been latent in the file for months.
 *      `base` (HostShellV2) reads `hydratedEvents` as its THIRD operand and the
 *      declaration sat AFTER it. Harmless forever, because operands one and two
 *      always answered: eventId named a custom event or a sample. Deleting the
 *      current event is the first act that can leave eventId naming NEITHER —
 *      and the shell died with "Cannot access 'hydratedEvents' before
 *      initialization", whole screen to the error boundary.
 *
 *   2. The delete left eventId pointing at the row it had just removed when no
 *      custom events remained, which is what reached defect 1.
 */
const fs = require('fs');
const path = require('path');

const SHELL = fs.readFileSync(
  path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
const STORE = fs.readFileSync(path.join(__dirname, '../customEventStore.js'), 'utf8');

describe('the declaration order that the crash exposed', () => {
  test('hydratedEvents is declared BEFORE the base that reads it', () => {
    // The whole defect in one assertion. Cheap, and it is the only thing that
    // stands between this file and the same crash returning the next time
    // someone tidies the state declarations back together.
    const decl = SHELL.indexOf('const [hydratedEvents, setHydratedEvents]');
    const base = SHELL.indexOf('const base = activeCustom');
    expect(decl).toBeGreaterThan(-1);
    expect(base).toBeGreaterThan(-1);
    expect(decl).toBeLessThan(base);
  });

  test('base still reads hydratedEvents — if it stops, this guard is moot', () => {
    const line = SHELL.split('\n').find(l => l.includes('const base = activeCustom'));
    expect(line).toMatch(/hydratedEvents\.find/);
  });
});

describe('deleting an event', () => {
  const FN = (() => {
    const i = SHELL.indexOf('const deleteThisEvent =');
    return i < 0 ? '' : SHELL.slice(i, i + 2600);
  })();

  test('the delete helper exists', () => {
    expect(FN).not.toBe('');
  });

  test('it is the ONLY caller that may shrink the store', () => {
    // The store refuses a write that drops user events unless the caller says
    // so explicitly. That refusal is the safety net for every other write path
    // in the shell, so exactly one caller may lift it.
    expect(STORE).toMatch(/allowRemovingUserEvents/);
    expect(FN).toMatch(/allowRemovingUserEvents: true/);
    // Count the OPTION being passed, not the word: the guard's own comment
    // above the customs effect discusses `allowRemovingUserEvents` by name, and
    // the first version of this assertion counted those mentions and failed on
    // correct code. Only `allowRemovingUserEvents:` is a real lift.
    const lifts = SHELL.match(/allowRemovingUserEvents\s*:/g) || [];
    expect(lifts.length).toBe(1);
  });

  test('a refused write does not lie about having deleted anything', () => {
    expect(FN).toMatch(/res\.ok === false/);
    expect(FN).toMatch(/still here/);
  });

  test('it always lands the host on a real event, never a dangling id', () => {
    // Defect 2. The ladder must end at something that always resolves; a bare
    // setSheet(null) here is what reached the crash.
    expect(FN).toMatch(/BOOT_EVENT_ID/);
    expect(FN).toMatch(/switchEvent\(to\)/);
    expect(FN).not.toMatch(/else setSheet\(null\)/);
  });

  test('it writes a tombstone, because a queued cloud delete leaves the row up', () => {
    expect(FN).toMatch(/LS_DELETED/);
    expect(FN).toMatch(/cloudDeleteEvent\(id\)/);
  });
});

describe('the tombstone actually does something', () => {
  test('hydrate skips tombstoned ids, or the delete undoes itself', () => {
    // A tombstone nothing reads is decoration. This is the read.
    const i = SHELL.indexOf('const tombstoned = readDeletedIds()');
    expect(i).toBeGreaterThan(-1);
    const fresh = SHELL.slice(i, i + 400);
    expect(fresh).toMatch(/!tombstoned\.has\(e\.id\)/);
  });

  test('an id is released only once the cloud confirms the row is gone', () => {
    const i = SHELL.indexOf('const deleteThisEvent =');
    const fn = SHELL.slice(i, i + 2600);
    // The release sits in the .then of the cloud delete, never before it.
    expect(fn).toMatch(/\.then\(\(\) => \{[\s\S]{0,400}?filter\(x => x !== id\)/);
  });
});
