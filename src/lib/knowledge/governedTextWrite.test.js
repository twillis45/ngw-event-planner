// ─── Governed text write integrity (Phase 5F.11 Part 1) ──────────────────────
//
// Every case below is reconstructed from the REAL corruption that happened while
// composing the Birthday claim note: a timed-out key-event write left a fragment, and
// the retry appended to it. The comparator has to name that shape, not just say
// "not equal", because the correct recovery (clear the field, rewrite) is different
// from the instinctive one (type it again).
import { verifyGovernedText, assertGovernedText, WRITE_FAILURES } from './governedTextWrite';

const NOTE = 'JollyChef states 1.3-1.5 dinner plates/guest for a buffet and 1.5 cups+cutlery/guest. '
  + 'The authored 1.5 sets/guest sits at that figure; value NOT changed. '
  + 'LIMITATION: the source recommends 3 napkins/guest, more than one set provides. '
  + 'CAVEAT: vendor-published and commercially interested in a higher multiplier - '
  + 'trade consensus among sellers, not independent corroboration.';

describe('the only passing case is byte-for-byte', () => {
  test('identical text passes', () => {
    const r = verifyGovernedText(NOTE, NOTE);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('exact');
  });

  test('a single trailing space FAILS — governed text is not normalised', () => {
    expect(verifyGovernedText(NOTE, `${NOTE} `).ok).toBe(false);
  });

  test('a changed dash FAILS — the host reads these characters', () => {
    expect(verifyGovernedText(NOTE, NOTE.replace('1.3-1.5', '1.3–1.5')).ok).toBe(false);
  });
});

describe('it names the failure, because the recovery differs by shape', () => {
  test('EMPTY — the write never took effect', () => {
    const r = verifyGovernedText(NOTE, '');
    expect(r.kind).toBe('empty');
    expect(r.detail).toMatch(/did not take effect/);
  });

  test('TRUNCATED — and it warns against the instinctive retry', () => {
    // Exactly what the timeout left behind.
    const r = verifyGovernedText(NOTE, NOTE.slice(0, 120));
    expect(r.kind).toBe('truncated');
    expect(r.detail).toMatch(/do NOT retry by typing again/);
    expect(r.detail).toMatch(/Clear the field first/);
  });

  test('APPENDED — the retry-on-a-fragment shape', () => {
    const r = verifyGovernedText(NOTE, `${NOTE} trade consensus among sellers.`);
    expect(r.kind).toBe('appended');
    expect(r.detail).toMatch(/field was not cleared/);
  });

  test('DUPLICATED — a governed note that repeats itself came from two writes', () => {
    const dup = `${NOTE} CAVEAT: vendor-published and commercially interested in a higher `
      + 'multiplier - trade consensus among sellers, not independent corroboration.';
    const r = verifyGovernedText(`${NOTE} extra tail to avoid the append branch.`, dup);
    expect(['duplicated', 'mismatched']).toContain(r.kind);
  });

  test('DUPLICATED is detected when a whole sentence recurs', () => {
    const sentence = 'CAVEAT: vendor-published and commercially interested in a higher multiplier.';
    const r = verifyGovernedText('something else entirely that is quite long indeed.',
      `${sentence} ${sentence}`);
    expect(r.kind).toBe('duplicated');
    expect(r.detail).toMatch(/appears more than once/);
  });

  test('SPLICED — the real corruption: head missing, tail present', () => {
    // The actual observed value: opening lost, a foreign fragment in the middle, the
    // intended ending intact.
    const spliced = '1.5 cups+cutlery/guest. The authored 1.5 sets/guest sits at that figure; '
      + 'value NOT changed.mmercially interested in a higher multiplier; other disposables '
      + 'retailers publish materially the same figures. '
      + 'LIMITATION: the source recommends 3 napkins/guest, more than one set provides. '
      + 'CAVEAT: vendor-published and commercially interested in a higher multiplier - '
      + 'trade consensus among sellers, not independent corroboration.';
    const r = verifyGovernedText(NOTE, spliced);
    expect(r.ok).toBe(false);
    expect(r.kind).toBe('spliced');
    expect(r.detail).toMatch(/opening of the intended text is missing/);
  });

  test('MISMATCHED reports where the two first diverge', () => {
    const r = verifyGovernedText('alpha bravo charlie delta echo', 'alpha bravo XXXXX delta echo');
    expect(r.kind).toBe('mismatched');
    expect(r.detail).toMatch(/First difference at index 12/);
  });

  test('every kind returned is a declared kind', () => {
    const cases = ['', NOTE.slice(0, 50), `${NOTE}x`, 'totally different text of some length'];
    for (const c of cases) {
      const r = verifyGovernedText(NOTE, c);
      expect(WRITE_FAILURES).toContain(r.kind);
    }
  });
});

describe('the gate a caller uses before submitting', () => {
  test('assert passes silently on an exact match', () => {
    expect(() => assertGovernedText(NOTE, NOTE, 'claim note')).not.toThrow();
  });

  test('assert throws with the NAMED failure, not a bare inequality', () => {
    expect(() => assertGovernedText(NOTE, NOTE.slice(0, 80), 'claim note'))
      .toThrow(/claim note: truncated/);
    expect(() => assertGovernedText(NOTE, '', 'claim note'))
      .toThrow(/claim note: empty/);
  });

  test('null and undefined are treated as empty, not as a crash', () => {
    expect(verifyGovernedText(NOTE, null).kind).toBe('empty');
    expect(verifyGovernedText(NOTE, undefined).kind).toBe('empty');
    expect(verifyGovernedText(null, null).ok).toBe(true);
  });
});
