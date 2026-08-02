// ─── RECONCILING BROWSER-ONLY GOVERNANCE (Phase 5F.6) ────────────────────────
//
// THE SITUATION. Published KCRs live in three places that can disagree: the admin
// store (browser localStorage), the baked snapshot, and the committed corpus.
// `governanceDivergence.js` detects the disagreement and `firstGovernanceGuard`
// stops new ones being created. Neither resolves what is already there.
//
// Measured 2026-08-01: the store held EIGHT published records; the corpus held three
// resolving to two snapshot entries. **Seven of the eight exist only in a browser.**
// (An earlier report said six. It was wrong — see the count test.)
//
// WHAT THIS MODULE DOES. For each browser-only record it assembles a dossier and a
// RECOMMENDED action. Every recommendation is derived from a CHECKABLE fact:
//
//   - would it pass today's publish gate?          groundingHonesty
//   - does the field still drive runtime?          fieldOwnership
//   - is the recorded "before" the right SHAPE?    structural check
//   - is that field already governed in the corpus? corpus lookup
//
// WHAT IT DOES NOT DO. It never decides whether a NUMBER is right, never decides
// whether a SOURCE's scope reaches an event, and never acts. Where the answer needs
// either, it returns `requires-human-decision` and says which question is open.
// A recommendation is an argument put in front of a person, not a verdict.
//
// PURE: no I/O, no storage, no UI.
import { groundingHonesty } from './sourceAuthority';
import { fieldOwnership } from './governedOwnership';
import { SUBJECT_SOURCES } from './backfillClassification';

const keyOf = (assetId, fieldPath) => `${assetId} ${fieldPath}`;

/** The fate an operator can assign. Ordered from most to least preserving. */
export const RECONCILE_ACTIONS = Object.freeze([
  'promote',    // evidence is valid; it should become canonical
  'archive',    // useful history; must not become production knowledge
  'reject',     // invalid or a test artifact
]);

/** Why a record cannot simply be promoted. Each is a CHECKABLE defect, not an opinion. */
export const BLOCKERS = Object.freeze([
  'fails-publish-gate',      // would be refused if published today
  'corrupt-prior',           // the recorded "before" is the wrong shape for the field
  'mismatched-evidence',     // the attached evidence is about a DIFFERENT subject
  'already-in-corpus',       // that field is already governed
  'no-runtime-consumer',     // the field no longer drives anything a host sees
  'no-evidence',             // published with zero evidence records attached
]);

/**
 * evidenceSubjectMismatch(fieldPath, evidence) -> string[] of offending source ids
 *
 * ADDED 5F.7, because 5F.6 missed a real one. `Crab Feast p_ice.provenance` carries
 * `webstaurant-protein-2026` — a PROTEIN portion guide — as the only evidence for an
 * ICE claim, inherited from the `p_crabs` row the correction was opened from. The
 * shape check passed it: a provenance-object prior is valid for a provenance field,
 * even when its CONTENT belongs to another purchase entirely.
 *
 * Checkable, not judgemental: it uses the declared subject map, and only reports a
 * mismatch when BOTH the field's purchase and the evidence source have a declared
 * subject AND those subjects differ. An unmapped source or purchase says nothing.
 */
export function evidenceSubjectMismatch(fieldPath, evidence) {
  const purchaseId = String(fieldPath || '').split('.')[0];
  const mine = SUBJECT_SOURCES.find((s) => s.ids.includes(purchaseId));
  if (!mine) return [];                                   // no declared subject: no claim
  // Sources that legitimately speak to THIS subject: its primary plus anything the
  // registry declares as also covering it. A source may serve several subjects —
  // `bar-provision-2026` is a drinks guide whose claim also states an ice rate — and
  // assuming otherwise produced a false positive on a correct record in 5F.10.
  const accepted = new Set([mine.source, ...(mine.alsoCovers || [])]);
  const out = [];
  for (const ev of (evidence || [])) {
    const id = ev && ev.id;
    if (!id || accepted.has(id)) continue;
    // Flag only if the id is declared for a DIFFERENT subject. An unmapped source
    // says nothing either way.
    const theirs = SUBJECT_SOURCES.find((s) => s.source === id || (s.alsoCovers || []).includes(id));
    if (theirs && theirs.subject !== mine.subject) out.push(id);
  }
  return out;
}

/** Is `value` a plausible prior for `fieldPath`? Shape only — never a value judgement. */
export function priorShapeOk(fieldPath, value) {
  const f = String(fieldPath || '');
  if (value === undefined || value === null) return true;   // "there was nothing" is valid
  if (/\.provenance$/.test(f)) return typeof value === 'object';
  if (/\.(qtyPerGuest|qtyFlat)$/.test(f)) return typeof value === 'number';
  if (/\.unitCostRange$/.test(f)) return Array.isArray(value);
  return true;                                              // unknown field: no claim
}

/**
 * reconciliationCandidates(storeKcrs, snapshotEntries, corpusKcrs) -> dossier[]
 *
 * One entry per PUBLISHED store record that the baked snapshot does not serve.
 * Sorted most-blocked first so the hardest decisions are not buried.
 */
export function reconciliationCandidates(storeKcrs = [], snapshotEntries = [], corpusKcrs = []) {
  const served = new Set((snapshotEntries || [])
    .filter((e) => e && e.assetId && e.fieldPath).map((e) => keyOf(e.assetId, e.fieldPath)));
  const inCorpus = new Set((corpusKcrs || [])
    .filter((k) => k && k.assetId && k.fieldPath).map((k) => keyOf(k.assetId, k.fieldPath)));

  const out = [];
  for (const k of (storeKcrs || [])) {
    if (!k || k.status !== 'published' || !k.assetId || !k.fieldPath) continue;
    const key = keyOf(k.assetId, k.fieldPath);
    if (served.has(key)) continue;                          // it is serving; not browser-only

    const value = k.proposal ? k.proposal.newValue : undefined;
    const prov = /\.provenance$/.test(k.fieldPath) ? value : null;
    const own = fieldOwnership(k.assetId, k.fieldPath);
    const gate = groundingHonesty(k.fieldPath, value);
    const evidenceCount = Array.isArray(k.evidence) ? k.evidence.length : 0;

    const wrongEvidence = evidenceSubjectMismatch(k.fieldPath, k.evidence);

    const blockers = [];
    if (!gate.ok) blockers.push('fails-publish-gate');
    if (!priorShapeOk(k.fieldPath, k.currentValue)) blockers.push('corrupt-prior');
    if (wrongEvidence.length) blockers.push('mismatched-evidence');
    if (inCorpus.has(key)) blockers.push('already-in-corpus');
    if (!own.drivesRuntime) blockers.push('no-runtime-consumer');
    if (!evidenceCount) blockers.push('no-evidence');

    out.push({
      key,
      assetId: k.assetId,
      fieldPath: k.fieldPath,
      id: k.id,
      value,
      tier: prov && typeof prov === 'object' ? (prov.tier == null ? null : prov.tier) : null,
      sources: prov && Array.isArray(prov.sources) ? prov.sources.filter(Boolean) : [],
      priorValue: k.currentValue,
      lineage: (k.correctionOf || k.rollbackTo) ? 'child' : 'root',
      publishedVersion: k.publishedVersion || null,
      // A version id that names a DIFFERENT field is a 5E-era cross-field artifact. The
      // record is a root, but its id claims descent from something unrelated.
      versionIdMismatch: versionIdNamesAnotherField(k),
      evidenceCount,
      wrongEvidence,
      drivesRuntime: !!own.drivesRuntime,
      hostImpact: hostImpactOf(k.fieldPath, own, gate),
      gate: gate.ok ? (gate.status || 'passes') : gate.error,
      blockers,
      recommended: recommendFor(blockers),
      why: whyFor(blockers),
    });
  }

  const weight = (d) => -d.blockers.length;
  out.sort((a, b) => weight(a) - weight(b) || a.key.localeCompare(b.key));
  return out;
}

/** Does the record's own version id name a different field than the record governs? */
function versionIdNamesAnotherField(k) {
  const v = String(k.publishedVersion || '');
  if (!v) return false;
  const field = String(k.fieldPath || '').split('.')[0];    // e.g. p_oldbay
  if (!field) return false;
  // A version id normally embeds its own purchase id. If it embeds a DIFFERENT
  // `p_*` id instead, it was minted from an unrelated published row.
  const embedded = v.match(/p-[a-z0-9]+(?:-[a-z0-9]+)*?(?=-(?:provenance|qty|unit|correction|v\d))/gi);
  if (!embedded || !embedded.length) return false;
  const mine = field.replace(/_/g, '-');
  return !embedded.some((e) => e.toLowerCase().startsWith(mine.toLowerCase()));
}

function hostImpactOf(fieldPath, own, gate) {
  if (!own.drivesRuntime) return 'none — no runtime consumer reads this field';
  if (/\.provenance$/.test(fieldPath)) {
    return gate.ok
      ? 'a "Sourced —" line appears on the host\'s shopping line; no number moves'
      : 'none — it would list sources and show no Sourced line';
  }
  return 'the quantity or cost on the host\'s shopping line changes';
}

/**
 * A recommendation, never a decision. `requires-human-decision` is a real outcome and
 * the most common one — a clean record still needs someone to say the source's scope
 * reaches the event.
 */
function recommendFor(blockers) {
  if (blockers.includes('fails-publish-gate')) return 'reject';
  if (blockers.includes('corrupt-prior')) return 'archive';
  if (blockers.includes('mismatched-evidence')) return 'archive';
  if (blockers.includes('already-in-corpus')) return 'archive';
  if (blockers.includes('no-runtime-consumer')) return 'archive';
  // PROMOTED TO A BLOCKER IN 5F.7, BY TRYING IT. `no-evidence` was reported in 5F.6 as
  // informational — "a real weakness, but not a defect that decides". Promoting the
  // cleanest evidence-less record into the corpus disproved that: `canReachCited`
  // requires at least one evidence entry with a source and a citation-type, and
  // `publishedExport.test.js` asserts EVERY committed entry can round-trip into a
  // future correction. An evidence-less record breaks that invariant — the field could
  // never be corrected again. The suite refused the promotion.
  if (blockers.includes('no-evidence')) return 'archive';
  return 'requires-human-decision';
}

function whyFor(blockers) {
  if (blockers.includes('fails-publish-gate')) {
    return 'It would be refused if published today. Promoting it would put a record in the '
      + 'corpus that the corpus\'s own gate rejects.';
  }
  if (blockers.includes('corrupt-prior')) {
    return 'The recorded "before" is the wrong shape for this field, so the change it '
      + 'describes is not the change it made. The value may well be right — the AUDIT TRAIL '
      + 'is what is wrong, and that cannot be repaired after the fact.';
  }
  if (blockers.includes('mismatched-evidence')) {
    return 'The attached evidence is about a different subject than the field it supports, '
      + 'inherited from the row this correction was opened from. The new value may be sound, '
      + 'but nothing here evidences it.';
  }
  if (blockers.includes('already-in-corpus')) {
    return 'That field is already governed in the committed corpus. Promoting this would '
      + 'create a second root lineage.';
  }
  if (blockers.includes('no-runtime-consumer')) {
    return 'No runtime consumer reads this field, so promoting it would publish an '
      + 'authoritative value that changes nothing.';
  }
  if (blockers.includes('no-evidence')) {
    return 'Published with no evidence record attached. The corpus requires every entry to '
      + 'be able to round-trip into a future correction, and that needs at least one cited '
      + 'evidence entry — so this cannot enter the corpus as it stands. Redo it through the '
      + 'composer with the source attached as evidence; the value and reasoning still hold.';
  }
  return 'No checkable defect. What remains is judgement a machine must not make: does '
    + 'this source\'s scope actually reach this event, and is the value right?';
}

/**
 * reconcile(dossier, action, reason) -> a decision record
 *
 * NO DELETION WITHOUT AN AUDIT REASON. This is the only way to retire a browser-only
 * record, and it refuses to produce a decision without a stated reason — including for
 * `reject`, which is the case most likely to be waved through.
 */
export function reconcile(dossier, action, reason, by = 'operator', asOf = null) {
  if (!dossier || !dossier.key) throw new Error('reconcile: a candidate dossier is required');
  if (!RECONCILE_ACTIONS.includes(action)) {
    throw new Error(`reconcile: action must be one of ${RECONCILE_ACTIONS.join(', ')}`);
  }
  if (!reason || !String(reason).trim()) {
    throw new Error('reconcile: a decision must state its reason — no record is retired silently');
  }
  return Object.freeze({
    key: dossier.key,
    assetId: dossier.assetId,
    fieldPath: dossier.fieldPath,
    kcrId: dossier.id,
    action,
    reason: String(reason).trim(),
    by,
    at: asOf,
    // What the machine had said, kept beside what the human chose, so a later reader can
    // see where the two differed.
    recommended: dossier.recommended,
    overrodeRecommendation: dossier.recommended !== action,
    blockers: dossier.blockers.slice(),
  });
}

/** One line for an operator. Reports; never instructs. */
export function reconciliationSummary(candidates) {
  const list = candidates || [];
  if (!list.length) return 'No browser-only governance records. Store and runtime agree.';
  const n = (a) => list.filter((c) => c.recommended === a).length;
  const parts = [];
  if (n('reject')) parts.push(`${n('reject')} would fail today's gate`);
  if (n('archive')) parts.push(`${n('archive')} cannot be promoted as-is`);
  if (n('requires-human-decision')) parts.push(`${n('requires-human-decision')} need a human decision`);
  return `${list.length} browser-only published record(s): ${parts.join(', ')}. `
    + 'Nothing is promoted or discarded automatically.';
}
