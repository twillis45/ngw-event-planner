// ─── NO FABRICATED ACQUISITION PATH (Phase 5F.1 guard) ───────────────────────
//
// WHY THIS EXISTS.
//
// `providerIntegration.js` shipped a header reading "Real data fetching from
// external APIs: FDA, government data, retail pricing" and made ZERO network
// calls. It returned 6 hardcoded statements carrying 11 facts stamped
// `confidence: 'high'`, attributed to opendata.fda.gov, ams.usda.gov/market-news,
// fisheries.noaa.gov, instacart.com, restaurantdepot.com and reddit.com/r/maryland
// — naming nine real organisations inside invented records.
//
// **It passed every gate in the repository.** 300 suites and 4,616 tests, a
// knowledge bake gate, a hostv2 drift gate, an ownership contract and a runtime
// governance contract that sweeps 1,269 field/purchase pairs — and not one of them
// could see it. The runtime contract test asks "does a governed value reach the
// host?", which is a question about OUTPUT. This was a question about CAPABILITY:
// a module that could mint authority was sitting one wire away from the governed
// path, and the only thing stopping it was a *different* defect (a merge handler
// that wrote nothing).
//
// The system was protected by a bug. That is not protection, and the next person
// to fix that bug would have connected a fabricator to a publisher.
//
// So this file gates the CAPABILITY, not the output. It asserts what the
// acquisition layer must never be able to do, regardless of whether anything
// currently calls it.
import fs from 'fs';
import path from 'path';

const KNOWLEDGE = path.resolve(__dirname);

// The acquisition/research layer: modules whose job is to bring the outside world
// in. None of them may mint authority.
const ACQUISITION_MODULES = [
  'providerIntegration.js',
  'providers.js',
  'providerNormalizers.js',
  'providerIntelligence.js',
  'providerHealth.js',
  'providerMonitor.js',
  'researchBlueprint.js',
];

/** Source with comments stripped — a rule about code must not be tripped by prose ABOUT the rule. */
function code(file) {
  const raw = fs.readFileSync(path.join(KNOWLEDGE, file), 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const present = ACQUISITION_MODULES.filter((m) => fs.existsSync(path.join(KNOWLEDGE, m)));

describe('the acquisition layer cannot mint authority', () => {
  test('the modules under guard actually exist — a vacuous pass is a silent failure', () => {
    expect(present.length).toBeGreaterThanOrEqual(6);
  });

  test('NO acquisition module fabricates a confidence level', () => {
    // The exact defect: prepareEvidenceForReview stamped confidence:'high' on every
    // record it touched, so a pasted forum post and a federal register entry left it
    // indistinguishable. Confidence is a reviewer's judgement, made in the composer.
    const bad = [];
    for (const m of present) {
      const hits = code(m).match(/confidence\s*:\s*['"](high|medium|low)['"]/g);
      if (hits) bad.push(`${m}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  test('NO acquisition module marks anything grounded, verified or cited', () => {
    const bad = [];
    for (const m of present) {
      const hits = code(m).match(/(qtyGrounded|isGrounded\w*)\s*[:(=]|verificationStatus\s*:\s*['"]|tier\s*:\s*['"](researched|cited|primary)['"]/g);
      if (hits) bad.push(`${m}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  test('NO acquisition module creates a KCR or writes knowledge state', () => {
    // A provider produces observations. It never authors the governed unit, and it
    // never persists to the knowledge store — that is the correction workflow's job,
    // behind three review gates.
    const bad = [];
    for (const m of present) {
      const hits = code(m).match(/\b(createKCR|upsertKCR|publishKCR|openCorrection|saveKcrs|correctPublishedKCR)\s*\(/g);
      if (hits) bad.push(`${m}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  test('NO acquisition module writes a knowledge export or snapshot', () => {
    const bad = [];
    for (const m of present) {
      const hits = code(m).match(/publishedKcrs|publishedKnowledge|serializePublishedExport|writeFileSync/g);
      if (hits) bad.push(`${m}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  test('NO acquisition module authors a source statement', () => {
    // THE ORIGINAL DEFECT. A `statement:` literal in an acquisition module is a
    // fabricated observation by construction — the module's contract is to normalize
    // records handed IN, so it has no business authoring one.
    const bad = [];
    for (const m of present) {
      const stmts = code(m).match(/statement\s*:\s*['"`]/g);
      if (stmts) bad.push(`${m}: ${stmts.length} hardcoded statement literal(s)`);
    }
    expect(bad).toEqual([]);
  });

  test('a hardcoded authority URL never sits beside hardcoded DATA', () => {
    // The first version of this rule flagged any authority URL and immediately caught
    // `providerNormalizers.js` — wrongly. That module PARSES pasted API responses
    // ("paste the full FDA API response") and builds every value from the parsed
    // input (`r.product_description`, `row.price`); the URL is attribution for real
    // data the human supplied. That is the INVERSE of the defect, where the data was
    // invented and a real URL lent it credibility.
    //
    // So the signature is not "authority URL" — it is "authority URL in a module that
    // also authors its own statements". The statement rule above is the load-bearing
    // one; this pairs with it so the combination cannot recur. Kept as its own test
    // because the near-miss is instructive: an over-broad guard that has to be
    // relaxed under pressure is how a real rule gets deleted.
    const AUTHORITIES = /(fda\.gov|usda\.gov|ams\.usda|noaa\.gov|fisheries\.noaa|instacart\.com|restaurantdepot\.com|reddit\.com|walmart\.com)/i;
    const bad = [];
    for (const m of present) {
      const src = code(m);
      const authorsStatements = /statement\s*:\s*['"`]/.test(src);
      if (!authorsStatements) continue;                       // transforming, not authoring
      const urls = src.match(new RegExp(`url\\s*:\\s*['"\`][^'"\`]*${AUTHORITIES.source}[^'"\`]*['"\`]`, 'gi'));
      if (urls) bad.push(`${m}: authored statements AND authority URLs ${urls.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  test('NGW does not crawl — no acquisition module opens a network connection', () => {
    // `providers.js` states the contract: "the fetch itself is executed by an
    // agent/backend and handed in — the app never crawls". Pinned, so a future
    // "just one small fetch" is a failing test rather than a review comment.
    const bad = [];
    for (const m of present) {
      const hits = code(m).match(/\b(fetch|axios|XMLHttpRequest|WebSocket|EventSource)\s*\(/g);
      if (hits) bad.push(`${m}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('the repaired transport behaves honestly', () => {
  const { fetchProviderData, prepareEvidenceForReview } = require('./providerIntegration');

  test('an un-fed provider returns empty AND says it never looked', () => {
    // "we did not look" and "we looked and found nothing" are different claims.
    // Collapsing them teaches an operator that absence was checked when it was not.
    return fetchProviderData(['data.gov', 'market-pricing'], { at: '2026-08-01' }).then((r) => {
      expect(r['data.gov'].records).toEqual([]);
      expect(r['data.gov'].unfetched).toBe(true);
      expect(r['data.gov'].why).toMatch(/does not fetch/i);
      expect(r['market-pricing'].unfetched).toBe(true);
    });
  });

  test('handed-in records pass through and are NOT marked unfetched', () => {
    return fetchProviderData(['retail'], {
      at: '2026-08-01',
      handedIn: { retail: [{ statement: 'a human pasted this', url: 'https://example.com' }] },
    }).then((r) => {
      expect(r.retail.records).toHaveLength(1);
      expect(r.retail.unfetched).toBe(false);
      expect(r.retail.why).toBeNull();
    });
  });

  test('review candidates default to UNVERIFIED and are never governed evidence', () => {
    const providers = [{ id: 'retail', authorityLevel: 'trade', freshnessDays: 45 }];
    const out = prepareEvidenceForReview(
      { retail: { at: '2026-08-01', records: [{ statement: 's', url: 'https://x' }] } },
      providers,
    );
    expect(out[0].confidence).toBe('unverified');
    expect(out[0].reviewCandidate).toBe(true);
  });

  test('a record’s OWN confidence is carried, never overwritten or upgraded', () => {
    const providers = [{ id: 'retail', authorityLevel: 'trade', freshnessDays: 45 }];
    const out = prepareEvidenceForReview(
      { retail: { at: '2026-08-01', records: [{ statement: 's', confidence: 'low' }] } },
      providers,
    );
    expect(out[0].confidence).toBe('low');
  });
});

describe('the merge path cannot claim a save it did not make', () => {
  test('AdminConsole has no handler that reports a merge without persisting', () => {
    // The removed defect: a button labelled "Accept & Merge into Playbook" whose
    // handler set React state and reported "Evidence merged into playbook ... now
    // marked as researched". Any future merge handler must write through the
    // governed path; this pins that the old shape has not come back.
    const admin = fs.readFileSync(path.resolve(__dirname, '../../admin/AdminConsole.jsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(admin).not.toMatch(/merged into playbook/i);
    expect(admin).not.toMatch(/const handleMerge\s*=/);
  });
});
