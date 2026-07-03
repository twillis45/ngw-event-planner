// ─── Knowledge Domain System (KPP-1 Bundle A) ──────────────────────────────────
// A Domain is a named cluster of related playbooks that share knowledge fields.
// Domain Campaigns target entire domains instead of single playbooks: they discover
// cross-playbook coverage gaps, aggregate research needs, and generate batch KCRs.
//
// Doctrine: domains NEVER duplicate data. They IDENTIFY shared knowledge + shared gaps.
// Everything routes through the existing KCR pipeline. No new lifecycle, no new registry.

import { playbookResearch, playbookWeaknesses, playbookGrounding, playbookHealth } from '../playbooks/playbookRegistry';
import { evaluateAsset } from './dimensions';
import { blastRadius } from './dependencyEngine';

// ── Domain definitions ────────────────────────────────────────────────────────
// Each domain groups playbook types + provides context for research scope.
// playbookTypes: must match pb.type exactly (or a substring for fuzzy match).
export const KNOWLEDGE_DOMAINS = [
  {
    id: 'outdoor-cooking',
    label: 'Outdoor Cooking Events',
    description: 'Open-fire, steaming, boiling, and grilling events. Shared knowledge: fire safety, weather, supplies, food quantities for outdoor prep.',
    playbookTypes: ['Crab Feast', 'Cookout', 'Backyard Barbecue', 'Fish Fry', 'Crawfish Boil', 'Low Country Boil', 'Juneteenth Cookout', 'Day Party'],
    sharedFields: ['p_*.unitCostRange', 'p_*.qtyPerGuest', 'risks', 'tasks'],
    researchPriority: 'high',
    tags: ['outdoor', 'food', 'cooking', 'fire'],
  },
  {
    id: 'cultural-traditions',
    label: 'Cultural Tradition Events',
    description: 'Events grounded in cultural heritage with specific food, ritual, and vendor needs. Shared knowledge: cultural sourcing, authenticity, specialty vendors.',
    playbookTypes: ['Ethiopian Coffee Ceremony', 'Pupusa Gathering', 'Kwanzaa Gathering', 'Juneteenth Cookout', 'Quinceañera', 'Repast'],
    sharedFields: ['vendors', 'decisions', 'knowledge.sources'],
    researchPriority: 'high',
    tags: ['cultural', 'heritage', 'tradition'],
  },
  {
    id: 'milestone-celebrations',
    label: 'Milestone Celebrations',
    description: 'Life-stage milestones: showers, graduations, sweet sixteens, retirements. Shared: invitations, decoration, catering, activity planning.',
    playbookTypes: ['Baby Shower', 'Bridal Shower', 'Gender Reveal', 'Graduation', 'Sweet 16', 'Retirement Party'],
    sharedFields: ['purchases', 'tasks', 'decisions'],
    researchPriority: 'med',
    tags: ['milestone', 'celebration', 'shower'],
  },
  {
    id: 'intimate-gatherings',
    label: 'Intimate Gatherings',
    description: 'Small-group, home-hosted social events. Shared: seating, food quantity, atmosphere, hospitality.',
    playbookTypes: ['Dinner Party', 'Sunday Dinner', 'Card Party', 'Watch Party', 'Game Night'],
    sharedFields: ['p_*.qtyPerGuest', 'decisions', 'tasks'],
    researchPriority: 'low',
    tags: ['intimate', 'home', 'social'],
  },
  {
    id: 'lifecycle-partnerships',
    label: 'Lifecycle Partnership Events',
    description: 'Wedding, proposal, and commitment ceremonies. Shared: venue, vendor coordination, catering, photography.',
    playbookTypes: ['Wedding', 'Elopement', 'Vow Renewal', 'Engagement Party', 'Anniversary', 'Surprise Proposal'],
    sharedFields: ['vendors', 'decisions', 'purchases', 'tasks'],
    researchPriority: 'high',
    tags: ['wedding', 'partnership', 'ceremony'],
  },
  {
    id: 'professional-events',
    label: 'Professional Events',
    description: 'Corporate and professional gatherings. Shared: AV, catering, scheduling, compliance, vendor contracts.',
    playbookTypes: ['Board Meeting', 'Conference', 'Team Retreat'],
    sharedFields: ['vendors', 'tasks', 'decisions', 'risks'],
    researchPriority: 'med',
    tags: ['corporate', 'professional', 'workplace'],
  },
  {
    id: 'social-celebrations',
    label: 'Social Celebrations',
    description: 'Broad social and holiday gatherings. Shared: invitations, food, decoration, guest management.',
    playbookTypes: ['Birthday', 'Housewarming', 'Bachelorette Party', 'Bachelor Party', 'Reunion', 'Holiday Party', 'House Party'],
    sharedFields: ['purchases', 'decisions', 'tasks'],
    researchPriority: 'low',
    tags: ['social', 'celebration', 'holiday'],
  },
];

// ── Domain lookup ──────────────────────────────────────────────────────────────
export function getDomain(id) { return KNOWLEDGE_DOMAINS.find((d) => d.id === id); }

// Which domains does a playbook belong to?
export function domainsForPlaybook(pb) {
  return KNOWLEDGE_DOMAINS.filter((d) =>
    d.playbookTypes.some((t) => pb.type === t || pb.type.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(pb.type.toLowerCase()))
  );
}

// ── Domain Coverage Analysis ───────────────────────────────────────────────────
// For every playbook in a domain, collect all dimensions + research needs.
// Returns an aggregate picture of what the domain knows and doesn't know.
export function domainCoverage(domain, allPlaybooks, asOf) {
  const playbooks = resolveDomainPlaybooks(domain, allPlaybooks);
  if (playbooks.length === 0) return { domain: domain.id, playbooks: [], found: 0, coverage: null };

  const perAsset = playbooks.map((pb) => {
    const dims = evaluateAsset(pb, 'playbook', asOf);
    const research = playbookResearch(pb, asOf);
    const grounding = playbookGrounding(pb);
    const health = playbookHealth(pb, asOf);
    return {
      type: pb.type,
      gapCount: dims.filter((d) => d.status === 'gap').length,
      warnCount: dims.filter((d) => d.status === 'warn').length,
      dimensions: dims,
      research,
      grounding,
      status: health.gaps > 0 ? 'gap' : health.warns > 0 ? 'warn' : 'ok',
    };
  });

  // Aggregate research needs by kind (cross-playbook dedup by kind)
  const researchByKind = {};
  for (const a of perAsset) {
    for (const r of a.research) {
      const key = r.kind;
      if (!researchByKind[key]) researchByKind[key] = { kind: r.kind, priority: r.priority, assets: [], reason: r.reason };
      researchByKind[key].assets.push(a.type);
    }
  }

  // Cross-domain shared gaps: fields where >1 playbook has the SAME gap
  const sharedGaps = findSharedGaps(perAsset);

  const totalGaps = perAsset.reduce((s, a) => s + a.gapCount, 0);
  const totalWarns = perAsset.reduce((s, a) => s + a.warnCount, 0);
  const fullyOk = perAsset.filter((a) => a.status === 'ok').length;

  return {
    domain: domain.id,
    label: domain.label,
    found: playbooks.length,
    playbooks: perAsset,
    researchByKind,
    sharedGaps,
    totalGaps,
    totalWarns,
    fullyOk,
    coverageScore: playbooks.length > 0 ? Math.round(fullyOk / playbooks.length * 100) : 100,
  };
}

// ── Domain Research Aggregation ────────────────────────────────────────────────
// Aggregate research needs across all playbooks in a domain.
// Deduplicates by (assetId, kind) — same research item from 2 playbooks = 1 task.
export function domainResearch(domain, allPlaybooks, asOf) {
  const playbooks = resolveDomainPlaybooks(domain, allPlaybooks);
  const seen = new Set();
  const items = [];
  for (const pb of playbooks) {
    for (const item of playbookResearch(pb, asOf)) {
      const key = `${pb.type}::${item.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...item, assetId: pb.type });
    }
  }
  // Sort: high first, then by asset count of the same kind across domain
  const kindCount = items.reduce((m, i) => { m[i.kind] = (m[i.kind] || 0) + 1; return m; }, {});
  return items.sort((a, b) => {
    const pOrder = { high: 0, med: 1, low: 2 };
    const pa = pOrder[a.priority] ?? 1; const pb_ = pOrder[b.priority] ?? 1;
    if (pa !== pb_) return pa - pb_;
    return (kindCount[b.kind] || 0) - (kindCount[a.kind] || 0);
  });
}

// ── Domain Report ──────────────────────────────────────────────────────────────
// Produces a structured research report for a domain — the output of a domain campaign.
export function generateDomainReport(domain, allPlaybooks, asOf) {
  const coverage = domainCoverage(domain, allPlaybooks, asOf);
  const research = domainResearch(domain, allPlaybooks, asOf);

  // Top fields by blast radius (which fields matter most across the domain)
  const fieldBlasts = [];
  for (const pb of resolveDomainPlaybooks(domain, allPlaybooks)) {
    for (const r of research.filter((i) => i.assetId === pb.type)) {
      let blast = { engines: 0 };
      try { blast = blastRadius(pb, r.fieldPath || r.kind); } catch { /* unmappable */ }
      if (blast.engines > 0) fieldBlasts.push({ assetId: pb.type, fieldPath: r.fieldPath || r.kind, engines: blast.engines, kind: r.kind });
    }
  }
  fieldBlasts.sort((a, b) => b.engines - a.engines);

  return {
    domain: domain.id,
    label: domain.label,
    asOf,
    playbooksFound: coverage.found,
    playbooksOk: coverage.fullyOk,
    totalGaps: coverage.totalGaps,
    totalWarns: coverage.totalWarns,
    coverageScore: coverage.coverageScore,
    researchItems: research.length,
    researchByKind: coverage.researchByKind,
    sharedGaps: coverage.sharedGaps,
    topFields: fieldBlasts.slice(0, 10),
    summary: buildReportSummary(domain, coverage, research),
  };
}

function buildReportSummary(domain, coverage, research) {
  const pct = coverage.coverageScore;
  const highCount = research.filter((r) => r.priority === 'high').length;
  const parts = [
    `${coverage.found} playbooks in domain.`,
    pct === 100 ? 'All fully covered.' : `${pct}% fully covered (${coverage.fullyOk}/${coverage.found}).`,
    coverage.totalGaps > 0 ? `${coverage.totalGaps} dimensional gaps.` : null,
    research.length > 0 ? `${research.length} research items (${highCount} high-priority).` : 'No research needed.',
    coverage.sharedGaps.length > 0 ? `${coverage.sharedGaps.length} gaps shared across ≥2 playbooks.` : null,
  ];
  return parts.filter(Boolean).join(' ');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveDomainPlaybooks(domain, allPlaybooks) {
  return allPlaybooks.filter((pb) =>
    domain.playbookTypes.some((t) => pb.type === t || pb.type.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(pb.type.toLowerCase()))
  );
}

function findSharedGaps(perAsset) {
  // A shared gap: same dimension gap/warn in ≥2 playbooks
  const dimCounts = {};
  for (const a of perAsset) {
    for (const d of a.dimensions) {
      if (d.status === 'gap' || d.status === 'warn') {
        if (!dimCounts[d.id]) dimCounts[d.id] = { id: d.id, status: d.status, assets: [] };
        dimCounts[d.id].assets.push(a.type);
      }
    }
  }
  return Object.values(dimCounts).filter((g) => g.assets.length >= 2)
    .sort((a, b) => b.assets.length - a.assets.length);
}
