// ─── A GUESS IS NOT A DESTINATION, AND THE RULE CANNOT LIVE IN A SHELL ───────
//
// THE INVARIANT. `smartParseEvent` fires `isDestination: true` for ANY bare
// resolved city — deliberately, because a miss silently deletes the whole
// travel stack (travelFieldsToPersist's own header records that `isDestination`
// is read by 25 modules). It marks that case `destinationBasis: 'place-named'`.
//
// Runtime-measured 2026-10-18: "birthday party, 40 guests in Bethesda MD"
// → isDestination true, destinationBasis 'place-named'.
//
// WHY THAT MATTERS BEYOND TRAVEL. `passGate.passVerdictAtCreation` reads
// `ev.isDestination === true` as door 2 of Model D and STAMPS THE VERDICT ONCE,
// at creation. By the grandfather rule it is never recomputed. So a persisted
// guess is not a wrong flag that can be corrected later — it is a permanent,
// un-correctable "this event owes $39" on a local party.
//
// WHERE THE RULE LIVED, AND WHY THAT WAS THE RISK. Until this file, the only
// thing standing between the parser's guess and that permanent stamp was ONE
// LINE IN THE SHELL BEING REPLACED:
//
//   HostShellV2.jsx:1724  destinationIsGuess = destinationBasis === 'place-named'
//   HostShellV2.jsx:1726  effIsDestination = fIsDestination ?? (destinationIsGuess ? null : …)
//
// `passGate.js:72` documents the contract as "isDestination — heard at intake,
// never inferred." That sentence was true only because the shell made it true.
// A redesigned creation surface that passes the parser's own `isDestination`
// straight through would look completely correct and would permanently
// mis-stamp local events. The 2026-10-18 planning gate ranked this P0 for
// exactly that reason.
//
// SO THE RULE IS ENFORCED AT THE PERSISTENCE BOUNDARY TOO. `travelFieldsToPersist`
// already owns "what the creation seam may write down about travel" and already
// receives `destinationBasis`. It now refuses to persist a guessed true no
// matter what the caller resolved. The shell keeps its own downgrade — it needs
// the tri-state for the chip's "unanswered" display — but the shell is no
// longer the thing preventing the defect.
import { travelFieldsToPersist } from '../travelFieldsToPersist';
import { passVerdictAtCreation } from '../passGate';

// What the shell would pass if a future rewrite forgot the downgrade: the
// parser's raw finding, straight through.
const asIfShellForgot = (over = {}) => travelFieldsToPersist({
  effIsDestination: true,
  manualIsDestination: null,
  destinationBasis: 'place-named',
  ...over,
});

describe('1 — a guessed place-name cannot become confirmed destination truth', () => {
  test('a place-named guess is NOT persisted, even when the caller resolved it true', () => {
    // This is the whole point: the module does not trust its caller.
    expect(asIfShellForgot()).not.toHaveProperty('isDestination');
  });

  test('…and no basis rides along either', () => {
    // A basis with no flag is a reason for a claim nobody made.
    expect(asIfShellForgot()).not.toHaveProperty('destinationBasis');
  });

  test('…and travelMode is withheld, because it is meaningless without the flag', () => {
    expect(asIfShellForgot({ travelMode: 'fly' })).not.toHaveProperty('travelMode');
  });

  test('the CURRENT shell composition (downgraded to null) also persists nothing', () => {
    // Characterisation of today's behaviour, so the fix is provably a
    // safety net and not a behaviour change.
    const out = travelFieldsToPersist({
      effIsDestination: null, manualIsDestination: null, destinationBasis: 'place-named',
    });
    expect(out).not.toHaveProperty('isDestination');
  });
});

describe('2 — a guess cannot permanently trigger destination / pass state', () => {
  test('the pass verdict stamped from a guessed creation is NOT pass-required', () => {
    // The full chain, end to end: parser guess → persistence → Model D door 2.
    const persisted = { id: 'cust-local-1', type: 'Birthday', date: '2027-06-01', ...asIfShellForgot() };
    const verdict = passVerdictAtCreation(persisted, []);
    expect(verdict.passRequired).toBe(false);
    expect(verdict.passReasons).not.toContain('destination');
  });

  test('and that holds even with travelMode and a basis offered', () => {
    const persisted = {
      id: 'cust-local-2', type: 'Birthday', date: '2027-06-01',
      ...asIfShellForgot({ travelMode: 'drive' }),
    };
    expect(passVerdictAtCreation(persisted, []).passRequired).toBe(false);
  });
});

describe('3 — grounded destination evidence still works, unchanged', () => {
  test("travel-language commits: the host's own words are not a guess", () => {
    const out = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: null,
      destinationBasis: 'travel-language', travelMode: 'fly',
    });
    expect(out.isDestination).toBe(true);
    expect(out.destinationBasis).toBe('travel-language');
    expect(out.travelMode).toBe('fly');
  });

  test('place-differs-from-your-area commits: it is grounded in her profile', () => {
    const out = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: null,
      destinationBasis: 'place-differs-from-your-area',
    });
    expect(out.isDestination).toBe(true);
    expect(out.destinationBasis).toBe('place-differs-from-your-area');
  });

  test('landmark-named commits — Disneyland is not a bare city guess', () => {
    const out = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: null, destinationBasis: 'landmark-named',
    });
    expect(out.isDestination).toBe(true);
  });

  test('a grounded destination DOES stamp the pass verdict — door 2 still fires', () => {
    // The guard must not have disarmed Model D for real destination events.
    const persisted = {
      id: 'cust-dest-1', type: 'Birthday', date: '2027-06-14',
      ...travelFieldsToPersist({
        effIsDestination: true, manualIsDestination: null, destinationBasis: 'travel-language',
      }),
    };
    const verdict = passVerdictAtCreation(persisted, []);
    expect(verdict.passRequired).toBe(true);
    expect(verdict.passReasons).toContain('destination');
  });
});

describe('4 — the host OWNS the answer, and prior valid decisions stay valid', () => {
  test('a host who taps "Destination event" on a place-named guess is believed', () => {
    // The guard suppresses the APP's guess, never the host's statement.
    const out = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: true, destinationBasis: 'place-named',
    });
    expect(out.isDestination).toBe(true);
  });

  test("…and no basis is attached to the host's own choice", () => {
    // Pre-existing rule, re-pinned: attaching the parser's reason to the host's
    // answer would be putting words in her mouth.
    const out = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: true, destinationBasis: 'place-named',
    });
    expect(out).not.toHaveProperty('destinationBasis');
  });

  test('a host who taps "Local event" is still recorded as a real false', () => {
    const out = travelFieldsToPersist({
      effIsDestination: false, manualIsDestination: false, destinationBasis: null,
    });
    expect(out.isDestination).toBe(false);
  });

  test('an event persisted EARLIER with isDestination true keeps its verdict', () => {
    // The grandfather rule cuts both ways. This guard changes what gets
    // WRITTEN at creation; it must never retroactively invalidate an event
    // that already carries a legitimate destination decision.
    const existing = {
      id: 'cust-old-1', type: 'Birthday', date: '2027-06-14',
      isDestination: true, destinationBasis: 'place-named',
    };
    const verdict = passVerdictAtCreation(existing, []);
    expect(verdict.passRequired).toBe(true);
    expect(verdict.passReasons).toContain('destination');
  });
});

describe('(premise) the module is really being exercised', () => {
  test('a grounded true and a guessed true differ ONLY by basis', () => {
    // If this ever passes trivially — both empty, both full — the suite above
    // is asserting nothing.
    const grounded = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: null, destinationBasis: 'travel-language',
    });
    const guessed = travelFieldsToPersist({
      effIsDestination: true, manualIsDestination: null, destinationBasis: 'place-named',
    });
    expect(grounded.isDestination).toBe(true);
    expect(guessed.isDestination).toBeUndefined();
  });
});
