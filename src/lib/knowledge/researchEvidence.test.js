// ─── THE AUTHORING PATH AND THE READING PATHS MUST AGREE ────────────────────
//
// THIS IS THE TEST THAT WAS MISSING. The badge and the research ratchet both
// read `costProvenance.sources`, and both were tested with hand-built fixtures
// carrying real registry ids. Nothing ever tested the object the ADMIN CONSOLE
// actually writes. Each half was correct against its own idea of the field, and
// the seam between them went unexercised — the same shape as the UTC bug closed
// the same morning.
//
// Measured before the fix, on exactly what AdminConsole.jsx:5225 wrote:
//
//     isGroundedCost .............. false
//     hostLabel ................... "Needs confirmation"
//     source ids resolving ........ 0 of 2
//     ratchet counts it a claim ... true
//     ratchet uncorroborated ...... true   (one provider family, the common case)
//
// A successful research run made the host's badge WORSE and the governance
// number worse at the same time.
import { classifyClaim, HOST_LABELS } from './claimBasis';
import { isGroundedCost, COST_SOURCES } from './costProvenance';
import { recordResearchRun, hasResearchEvidence, researchEvidenceNote, RESEARCH_EVIDENCE_FIELD } from './researchEvidence';

// The two readers, reproduced from their own files so this test fails if either
// changes its mind about what a claim is.
const claimsResearch = (p) => !!(p && typeof p === 'object'
  && (p.verificationStatus === 'cited' || p.verificationStatus === 'researched'));
const sourceCount = (p) => (Array.isArray(p.sources) ? p.sources.length : (p.sources ? 1 : 0));

// What the console has in hand after a run: provider FAMILY LABELS, not ids.
const PROVIDER_LABELS = ['Retail price guides', 'Government data'];

const unresearchedCost = () => ({
  tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized',
  claim: 'An authored estimate that no one has cited',
});

const citedCost = () => ({
  tier: 'researched', confidence: 'high', verificationStatus: 'cited',
  sources: Object.keys(COST_SOURCES).slice(0, 2),
  lastVerified: '2026-08-18',
  claim: 'A real cost claim citing registered cost sources',
});

describe('a research run records what it found and claims nothing', () => {
  test('(premise) provider labels are NOT registry ids — the whole defect', () => {
    // If these ever became real ids this test is guarding a problem that no
    // longer exists, and should say so rather than pass silently.
    for (const label of PROVIDER_LABELS) expect(COST_SOURCES[label]).toBeUndefined();
  });

  test('THE DEFECT: it never writes `sources`', () => {
    const out = recordResearchRun(unresearchedCost(), { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4 });
    expect(out.sources).toBeUndefined();
  });

  test('and never claims a verificationStatus no id backs (option C)', () => {
    const before = unresearchedCost();
    const out = recordResearchRun(before, { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4 });
    expect(out.verificationStatus).toBe(before.verificationStatus);
    expect(out.tier).toBe(before.tier);
  });

  test('and does not stamp researchedAt — freshness belongs to the SOURCES', () => {
    // Stamping it would freshen a claim nothing re-verified. The ratchet reads
    // `researchedAt` as a date on the claim, so this is the same overclaim in a
    // third place.
    const out = recordResearchRun(unresearchedCost(), { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4 });
    expect(out.researchedAt).toBeUndefined();
  });

  test('a run on an ALREADY-CITED block leaves every claim field intact', () => {
    // The case that would quietly destroy real grounding if this spread wrong.
    const before = citedCost();
    const out = recordResearchRun(before, { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 2 });
    expect(out.sources).toEqual(before.sources);
    expect(out.lastVerified).toBe(before.lastVerified);
    expect(out.verificationStatus).toBe(before.verificationStatus);
    expect(isGroundedCost(out)).toBe(true);
  });

  test('the input is not mutated', () => {
    const before = unresearchedCost();
    const snapshot = JSON.stringify(before);
    recordResearchRun(before, { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 1 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('THE SEAM: what the authoring path writes, judged by both readers', () => {
  const written = () => recordResearchRun(unresearchedCost(), {
    providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4,
  });

  test('the badge does not move — a run that cited nothing proves nothing', () => {
    const before = classifyClaim(unresearchedCost(), unresearchedCost()).hostLabel;
    const after = classifyClaim(written(), written()).hostLabel;
    expect(after).toBe(before);
  });

  test('and it is NOT dropped to the most doubtful label, which is what happened', () => {
    // The old behaviour: 0 of 2 source ids resolved, so the row fell out of
    // every sourced label and landed here — on a row that had just been
    // researched. Pinned so it cannot come back.
    const cited = citedCost();
    const after = classifyClaim(cited, recordResearchRun(cited, { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4 }));
    expect(after.hostLabel).not.toBe(HOST_LABELS.NEEDS_CONFIRMATION);
  });

  test('the ratchet does not count it as a research claim', () => {
    const out = written();
    expect(claimsResearch(out)).toBe(false);
    expect(sourceCount(out)).toBe(0);
  });

  test('THE INVARIANT: the two readers agree about whether this is a citation', () => {
    // The check the audit named. A block the badge refuses to ground must not
    // be counted by the ratchet as a claim, in either direction — that
    // disagreement IS the defect class, whatever field it happens in.
    for (const providers of [[], PROVIDER_LABELS, [PROVIDER_LABELS[0]]]) {
      const out = recordResearchRun(unresearchedCost(), { providers, at: '2026-09-26', evidenceCount: 3 });
      expect(isGroundedCost(out)).toBe(claimsResearch(out));
    }
  });

  test('RED-PROOF: writing provider labels into `sources` breaks the invariant', () => {
    // The exact object the console used to write. If someone restores it, the
    // invariant above is the thing that goes red, so this documents what that
    // failure means.
    const old = {
      ...unresearchedCost(),
      verificationStatus: 'researched', tier: 'researched',
      sources: PROVIDER_LABELS, researchedAt: '2026-09-26',
    };
    expect(isGroundedCost(old)).toBe(false);   // badge: not a citation
    expect(claimsResearch(old)).toBe(true);    // ratchet: a claim
    expect(isGroundedCost(old)).not.toBe(claimsResearch(old));
    expect(classifyClaim(old, old).hostLabel).toBe(HOST_LABELS.NEEDS_CONFIRMATION);
  });
});

describe('the run is legible to a surface that wants to show it', () => {
  test('it records who, when, how many — and that it added nothing registered', () => {
    const out = recordResearchRun(unresearchedCost(), { providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4 });
    expect(hasResearchEvidence(out)).toBe(true);
    expect(out[RESEARCH_EVIDENCE_FIELD]).toEqual({
      providers: PROVIDER_LABELS, at: '2026-09-26', evidenceCount: 4, addedRegisteredSources: false,
    });
  });

  test('the note says what it is, and says nothing when there is nothing', () => {
    const out = recordResearchRun(unresearchedCost(), { providers: ['Retail price guides'], at: '2026-09-26', evidenceCount: 1 });
    expect(researchEvidenceNote(out)).toBe(
      'Checked 1 result via Retail price guides on 2026-09-26 — no registered source added.',
    );
    expect(researchEvidenceNote(recordResearchRun(unresearchedCost(), { providers: [], evidenceCount: 0 }))).toBeNull();
    expect(researchEvidenceNote(unresearchedCost())).toBeNull();
  });
});
