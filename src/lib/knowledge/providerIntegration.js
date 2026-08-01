// ─── Provider Data Integration — HONEST-EMPTY (Phase 5F.1 truth repair) ───────
//
// WHAT THIS FILE USED TO DO, and why it was deleted rather than flagged.
//
// Its header read "Real data fetching from external APIs: FDA, government data,
// retail pricing." It made ZERO network calls. Four exported `fetch*` functions
// returned hardcoded literals — 6 fabricated statements carrying 11 facts stamped
// `confidence: 'high'` — attributed to real, authoritative URLs: opendata.fda.gov,
// ams.usda.gov/market-news, fisheries.noaa.gov, instacart.com, restaurantdepot.com,
// reddit.com/r/maryland.
//
// Nine real organisations were named inside invented records: FDA, USDA, NOAA,
// Whole Foods, Safeway, Harris Teeter, Restaurant Depot, Reddit, and a named local
// business quoted saying something nobody said:
//
//   "USDA Market News: Blue crabs (Maryland) seasonal average June-July 2026:
//    Large grade $7.92-$8.17/lb..."          -> ams.usda.gov, confidence: 'high'
//   "Community reports (Reddit r/maryland): 'Buy live from <named shop>, they're
//    $0.50-1.00/lb cheaper than Wharf...'"   -> reddit.com/r/maryland
//
// None of it was fetched. It was literals in this file wearing federal and
// commercial citations. Nothing downstream could tell the difference: the records
// had the same shape, the same `url` field, and a HIGHER confidence stamp than
// most genuine provenance in the corpus.
//
// It had not yet reached a host only because a SEPARATE defect blocked it — the
// admin merge step wrote nothing. The system was protected by a bug rather than by
// a gate, which is not protection.
//
// THE RULE THIS FILE NOW ENFORCES: synthetic data must never create evidence,
// create claims, influence confidence, or publish through a KCR. The cheapest way
// to guarantee that is for the synthetic data not to exist. Deleted, not flagged —
// a flagged simulator is one config change from being live again, and this module's
// own header already demonstrated that a label is not a gate.
//
// WHAT REPLACES IT: nothing, deliberately. `providers.js` already states the real
// contract — "External providers normalize FETCHED source records (the fetch itself
// is executed by an agent/backend and handed in — the app never crawls)." This
// module now honours that contract instead of contradicting it. With no records
// handed in, every provider returns empty, and a research run visibly finds
// nothing, which is the truth.
//
// Real acquisition today is the path proven in Phase 5F: a human reads a source,
// registers it in a source registry, and authors a governed correction through the
// Admin composer. See PHASE_5F_ACQUISITION_REPORT.md and
// SOURCE_REGISTRY_ARCHITECTURE.md. The original file is preserved outside the repo
// for the audit record only.

/**
 * fetchProviderData(providerIds, { campaign, at, handedIn }) -> { [providerId]: {...} }
 *
 * HONEST-EMPTY BY DEFAULT. NGW does not crawl. A provider yields records only when
 * a human or a backend agent HANDS THEM IN via `handedIn`, keyed by provider id —
 * exactly the shape `providers.js#normalizeToObservations` already expects.
 *
 * `unfetched` is returned so a surface can say "nothing was fetched" instead of
 * rendering an empty list that reads as "we looked and found nothing". Those are
 * different claims, and a research tool that conflates them teaches its operator
 * that absence of evidence was checked when it was not.
 */
export async function fetchProviderData(providerIds, { campaign, at, handedIn = {} } = {}) {
  const results = {};
  for (const providerId of providerIds || []) {
    const records = Array.isArray(handedIn[providerId]) ? handedIn[providerId] : [];
    results[providerId] = {
      records,
      source: providerId,
      at,
      unfetched: records.length === 0,
      why: records.length === 0
        ? 'No records handed in. NGW does not fetch — paste or import source records to research this provider.'
        : null,
    };
  }
  return results;
}

/**
 * prepareEvidenceForReview(providedData, providers) -> reviewCandidate[]
 *
 * CONFIDENCE IS NO LONGER MINTED HERE. This function used to stamp
 * `confidence: 'high'` on EVERY record it touched, regardless of provider, source
 * or content — so a pasted forum post and a federal register entry left this
 * function indistinguishable, both "high".
 *
 * Confidence is a judgement about how far a source supports a claim. A reviewer
 * makes it, at correction time, in the composer. A transport function has no
 * standing to assert it, so a record's own confidence is carried through and
 * `unverified` is the default.
 *
 * The objects returned are REVIEW CANDIDATES, not KnowledgeEvidence, and are
 * marked `reviewCandidate: true` so nothing downstream mistakes one for a governed
 * evidence record.
 */
export function prepareEvidenceForReview(providedData, providers) {
  const evidence = [];
  for (const [providerId, data] of Object.entries(providedData || {})) {
    const provider = (providers || []).find((p) => p.id === providerId);
    if (!provider) continue;
    for (const record of (data.records || [])) {
      evidence.push({
        id: `cand-${providerId}-${(record && record.id) || evidence.length}`,
        source: providerId,
        sourceType: provider.authorityLevel,
        statement: record.statement,
        url: record.url || null,
        fieldPath: record.fieldPath || null,
        extractedFacts: record.extractedFacts || [],
        confidence: record.confidence || 'unverified',
        reviewCandidate: true,
        at: data.at,
        expiresAt: data.at && provider.freshnessDays
          ? new Date(new Date(data.at).getTime() + provider.freshnessDays * 86400000).toISOString()
          : null,
      });
    }
  }
  return evidence;
}
