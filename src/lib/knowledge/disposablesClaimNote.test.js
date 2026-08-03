// ─── Canonical disposables claim note (Phase 5F.11 Part 2) ───────────────────
import { buildDisposablesClaimNote, buildDisposablesReason } from './disposablesClaimNote';
import corpus from './publishedKcrs.json';

const birthday = corpus.find((k) => k.assetId === 'Birthday' && k.fieldPath === 'p_tableware.provenance');

describe('it reproduces the approved wording exactly', () => {
  test('THE ANCHOR: it regenerates the committed Birthday note byte-for-byte', () => {
    // Birthday was composed by hand, reviewed, approved, published and host-verified.
    // If the builder cannot reproduce it exactly, the builder has drifted from the
    // wording a human actually signed off — which is the only reason to trust it for
    // the other nine.
    expect(birthday).toBeTruthy();
    const built = buildDisposablesClaimNote({ authoredValue: 1.5, unit: 'sets/guest' });
    expect(built).toBe(birthday.proposal.newValue.note);
  });

  test('it regenerates the committed Birthday reason byte-for-byte', () => {
    const built = buildDisposablesReason({ purchaseId: 'p_tableware', authoredValue: 1.5 });
    expect(built).toBe(birthday.reason);
  });
});

describe('every required disclosure is present', () => {
  const note = buildDisposablesClaimNote({ authoredValue: 1.5 });

  test('it states what the source says, not a paraphrase', () => {
    expect(note).toContain('1.3-1.5 dinner plates/guest for a buffet');
    expect(note).toContain('1.5 cups+cutlery/guest');
  });

  test('it states the value did not move', () => {
    expect(note).toMatch(/value NOT changed/);
  });

  test('the commercial CAVEAT is unconditional', () => {
    for (const opts of [{ authoredValue: 1.5 }, { authoredValue: 1.5, bundlesNapkins: false }]) {
      expect(buildDisposablesClaimNote(opts)).toMatch(/CAVEAT: vendor-published and commercially interested/);
      expect(buildDisposablesClaimNote(opts)).toMatch(/not independent corroboration/);
    }
  });

  test('it never claims independence or certainty', () => {
    expect(note).not.toMatch(/\b(proven|universally|guaranteed|definitive)\b/i);
  });
});

describe('the LIMITATION appears only where it is true', () => {
  test('a bundled SET discloses the napkin shortfall', () => {
    expect(buildDisposablesClaimNote({ authoredValue: 1.5, bundlesNapkins: true }))
      .toMatch(/LIMITATION: the source recommends 3 napkins\/guest/);
  });

  test('a CUPS-only line does NOT — it buys no napkins to be short of', () => {
    // Asserting a napkin shortfall on a line that does not include napkins would be a
    // caveat about something the host is not buying: noise dressed as rigour.
    const cups = buildDisposablesClaimNote({ authoredValue: 1.5, unit: 'sets/guest', bundlesNapkins: false });
    expect(cups).not.toMatch(/LIMITATION/);
    expect(cups).not.toMatch(/napkins/);
    expect(cups).toMatch(/CAVEAT/);
  });
});

describe('it refuses inputs it cannot state truthfully', () => {
  test('a non-numeric authored value throws — the note quotes it verbatim', () => {
    expect(() => buildDisposablesClaimNote({ authoredValue: '1.5' })).toThrow(/must be a number/);
    expect(() => buildDisposablesClaimNote({})).toThrow(/must be a number/);
  });

  test('an unknown source throws rather than inventing figures', () => {
    expect(() => buildDisposablesClaimNote({ authoredValue: 1.5, source: 'made-up' }))
      .toThrow(/unknown source/);
  });

  test('a reason without a purchase id throws', () => {
    expect(() => buildDisposablesReason({ authoredValue: 1.5 })).toThrow(/purchaseId is required/);
  });

  test('the authored value is quoted exactly, not rounded', () => {
    expect(buildDisposablesClaimNote({ authoredValue: 1.5 })).toContain('The authored 1.5 sets/guest');
    expect(buildDisposablesClaimNote({ authoredValue: 2 })).toContain('The authored 2 sets/guest');
  });
});
