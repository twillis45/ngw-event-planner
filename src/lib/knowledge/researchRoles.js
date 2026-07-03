// ─── Research Roles (KMP-1 Bundle I) ─────────────────────────────────────────
// Knowledge steward role definitions for the research production organization.
// Defines WHO does WHAT, what each role can propose vs. approve vs. publish.
//
// Canonical rule: AI proposes, humans approve. No role — including AI Research
// Assistant — can publish knowledge without human sign-off.
//
// Complements kcrRoles.js (which governs KCR lifecycle permissions);
// researchRoles.js governs the RESEARCH WORKFLOW phase that precedes KCR creation.

export const RESEARCH_ROLES = {

  'research-steward': {
    label: 'Research Steward',
    description: 'Owns the research queue; prioritizes campaigns and playbooks; ensures pipeline health.',
    responsibilities: [
      'Prioritize research backlog by impact and freshness debt',
      'Launch and cancel campaigns',
      'Assign research playbooks to domain experts',
      'Monitor pipeline stage progress',
      'Escalate blocked pipelines',
      'Report research production metrics',
    ],
    canPropose: true,
    canReview: false,
    canPublish: false,
    canLaunchCampaigns: true,
    canAssignReviewers: true,
    aiAssistAllowed: true,
    aiCanAutomate: ['prioritization', 'gap-detection', 'campaign-launch'],
  },

  'domain-expert': {
    label: 'Domain Expert',
    description: 'Deep knowledge in a specific event domain. Validates findings against domain expertise. Produces high-confidence evidence.',
    responsibilities: [
      'Validate findings against domain knowledge',
      'Resolve contradictions between competing sources',
      'Provide SME evidence via expert interviews',
      'Review KCRs in assigned domain before governance committee',
      'Identify missing or outdated knowledge in their domain',
    ],
    canPropose: true,
    canReview: true,
    canPublish: false,
    canLaunchCampaigns: false,
    canAssignReviewers: false,
    aiAssistAllowed: true,
    aiCanAutomate: ['evidence-normalization', 'contradiction-flagging'],
  },

  'commercial-reviewer': {
    label: 'Commercial Reviewer',
    description: 'Reviews pricing and commercial knowledge for accuracy and commercial bias. Validates cost ranges against market reality.',
    responsibilities: [
      'Review all pricing KCRs before publication',
      'Flag commercially biased sources',
      'Cross-reference wholesale and retail pricing evidence',
      'Validate regional pricing claims',
      'Ensure pricing knowledge is appropriately ranged (not point estimates)',
    ],
    canPropose: true,
    canReview: true,
    canPublish: false,
    canLaunchCampaigns: false,
    canAssignReviewers: false,
    aiAssistAllowed: true,
    aiCanAutomate: ['source-bias-detection', 'price-range-validation'],
  },

  'food-safety-reviewer': {
    label: 'Food Safety Reviewer',
    description: 'Signs off on all food safety knowledge. Ensures guidance aligns with current FDA, USDA, and CDC standards.',
    responsibilities: [
      'Review all food safety KCRs before publication',
      'Verify citations against current FDA/USDA/CDC documents',
      'Flag any guidance that contradicts current health authority standards',
      'Track FDA recall alerts and generate emergency KCRs when needed',
      'Ensure food temperature, timing, and handling guidance is accurate',
    ],
    canPropose: true,
    canReview: true,
    canPublish: false,
    canLaunchCampaigns: false,
    canAssignReviewers: false,
    aiAssistAllowed: true,
    aiCanAutomate: ['recall-scanning', 'citation-verification'],
  },

  'regional-reviewer': {
    label: 'Regional Reviewer',
    description: 'Validates regional knowledge claims. Ensures regional overrides are accurate for their assigned geography.',
    responsibilities: [
      'Review regional KCRs and scope overrides for accuracy',
      'Flag national claims that should be regionalized',
      'Validate pricing ranges for regional market differences',
      'Identify missing regional coverage in the corpus',
      'Corroborate community-sourced regional evidence',
    ],
    canPropose: true,
    canReview: true,
    canPublish: false,
    canLaunchCampaigns: false,
    canAssignReviewers: false,
    aiAssistAllowed: true,
    aiCanAutomate: ['regional-gap-detection', 'coverage-scoring'],
  },

  'governance-publisher': {
    label: 'Governance Publisher',
    description: 'Final gate. Reviews the complete KCR audit trail and publishes to the corpus. The last human checkpoint before knowledge becomes canonical.',
    responsibilities: [
      'Review the full KCR package (evidence + findings + KCR + reviews)',
      'Confirm all required reviewers have signed off',
      'Publish approved KCRs to the production corpus',
      'Reject KCRs that fail review criteria with written rationale',
      'Maintain the publication log and changelog',
    ],
    canPropose: false,
    canReview: true,
    canPublish: true,
    canLaunchCampaigns: false,
    canAssignReviewers: false,
    aiAssistAllowed: false,
    aiCanAutomate: [],
  },

  'validation-reviewer': {
    label: 'Validation Reviewer',
    description: 'Tracks post-publication knowledge validation. Monitors runtime usage, user feedback, and evidence that confirmed or contradicted published knowledge.',
    responsibilities: [
      'Track validation events for published KCRs',
      'Flag knowledge that has been contradicted by field evidence',
      'Initiate freshness review when knowledge exceeds its freshness policy',
      'Generate failure-triggered KCRs from validated incidents',
      'Report validation coverage and aging knowledge',
    ],
    canPropose: true,
    canReview: false,
    canPublish: false,
    canLaunchCampaigns: true,
    canAssignReviewers: false,
    aiAssistAllowed: true,
    aiCanAutomate: ['freshness-monitoring', 'contradiction-detection'],
  },

  'ai-research-assistant': {
    label: 'AI Research Assistant',
    description: 'Performs automated research, normalization, gap detection, and draft generation. AI proposes ONLY — never approves or publishes.',
    responsibilities: [
      'Generate gap detection reports from dimension analysis',
      'Draft research campaign plans from playbook templates',
      'Normalize and deduplicate collected evidence',
      'Flag contradictions between competing sources',
      'Draft finding summaries for human review',
      'Draft KCRs for human governance review — NEVER auto-publishes',
    ],
    canPropose: true,
    canReview: false,
    canPublish: false,
    canLaunchCampaigns: false,
    canAssignReviewers: false,
    aiAssistAllowed: true,
    aiCanAutomate: ['gap-detection', 'normalization', 'deduplication', 'finding-draft', 'kcr-draft'],
    constraint: 'AI PROPOSES — HUMANS APPROVE. No AI output becomes canonical without human sign-off.',
  },
};

// ── Lookup utilities ──────────────────────────────────────────────────────────
export function getResearchRole(id) {
  return RESEARCH_ROLES[id] || null;
}

export function canPerform(roleId, action) {
  const role = RESEARCH_ROLES[roleId];
  if (!role) return false;
  switch (action) {
    case 'propose':          return role.canPropose === true;
    case 'review':           return role.canReview === true;
    case 'publish':          return role.canPublish === true;
    case 'launch-campaigns': return role.canLaunchCampaigns === true;
    case 'assign-reviewers': return role.canAssignReviewers === true;
    default:                 return false;
  }
}

export function publishingRoles() {
  return Object.entries(RESEARCH_ROLES)
    .filter(([, r]) => r.canPublish)
    .map(([id, r]) => ({ id, label: r.label }));
}

export function reviewingRoles() {
  return Object.entries(RESEARCH_ROLES)
    .filter(([, r]) => r.canReview)
    .map(([id, r]) => ({ id, label: r.label }));
}

export function aiAssistRoles() {
  return Object.entries(RESEARCH_ROLES)
    .filter(([, r]) => r.aiAssistAllowed)
    .map(([id, r]) => ({ id, label: r.label, automatable: r.aiCanAutomate }));
}
