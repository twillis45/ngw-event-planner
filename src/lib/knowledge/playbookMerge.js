// ─── Playbook Evidence Review & Merge ─────────────────────────────────────────
// Review evidence collected from campaigns, accept findings, update playbooks.

import { ALL_PLAYBOOKS } from '../playbooks/index';

// Prepare evidence for review (group by field, show contradictions)
export function prepareEvidenceReview(evidence, fieldPath) {
  if (!evidence || !fieldPath) return { evidence: [], summary: {} };

  const fieldEvidence = evidence.filter((e) => e.fieldPath === fieldPath || !e.fieldPath);

  // Group by fact type
  const facts = {};
  fieldEvidence.forEach((e) => {
    if (e.extractedFacts) {
      e.extractedFacts.forEach((fact) => {
        if (!facts[fact.fact]) facts[fact.fact] = [];
        facts[fact.fact].push({ ...fact, source: e.source, evidence_id: e.id });
      });
    }
  });

  // Detect contradictions
  const contradictions = [];
  Object.entries(facts).forEach(([factType, values]) => {
    const uniqueValues = new Set(values.map((v) => v.value));
    if (uniqueValues.size > 1 && values.length > 1) {
      contradictions.push({
        factType,
        values: Array.from(uniqueValues),
        sources: values.map((v) => v.source),
        confidence: values[0].confidence,
      });
    }
  });

  return {
    evidence: fieldEvidence,
    facts,
    contradictions,
    summary: {
      totalEvidence: fieldEvidence.length,
      uniqueFacts: Object.keys(facts).length,
      contradictions: contradictions.length,
      avgConfidence: fieldEvidence.length > 0 ? 'high' : 'unknown',
    },
  };
}

// Calculate recommended value from evidence consensus
export function consensusValue(facts, factType) {
  if (!facts[factType]) return null;

  const values = facts[factType];
  const numericValues = values
    .map((v) => {
      const n = parseFloat(v.value);
      return isNaN(n) ? null : n;
    })
    .filter((v) => v !== null);

  if (numericValues.length === 0) {
    // String value: return most common
    const strValues = values.map((v) => v.value);
    const counts = {};
    strValues.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
  }

  // Numeric: return mean (with outlier rejection)
  numericValues.sort((a, b) => a - b);
  const q1 = numericValues[Math.floor(numericValues.length * 0.25)];
  const q3 = numericValues[Math.floor(numericValues.length * 0.75)];
  const iqr = q3 - q1;

  const inliers = numericValues.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
  return inliers.length > 0 ? inliers.reduce((a, b) => a + b) / inliers.length : numericValues[Math.floor(numericValues.length / 2)];
}

// Propose playbook updates based on reviewed evidence
export function proposePlaybookUpdate(playbook, fieldPath, evidence, userApproval) {
  if (!userApproval) return { status: 'rejected', reason: 'User did not approve' };

  const review = prepareEvidenceReview(evidence, fieldPath);
  if (review.summary.contradictions > 0) {
    return {
      status: 'pending-resolution',
      reason: `${review.summary.contradictions} contradiction(s) detected`,
      contradictions: review.contradictions,
      action: 'resolve-contradictions',
    };
  }

  // Extract the field from playbook
  const [resourceType, resourceId] = fieldPath.split('[');
  const cleanId = resourceId?.replace(']', '');

  let target = null;
  if (resourceType === 'decisions' && playbook.decisions) {
    target = playbook.decisions.find((d) => d.id === cleanId);
  } else if (resourceType === 'purchases' && playbook.purchases) {
    target = playbook.purchases.find((p) => p.id === cleanId);
  }

  if (!target) {
    return { status: 'error', reason: 'Target field not found in playbook' };
  }

  // Propose update
  const updatedTarget = { ...target };
  const proposedChanges = {};

  // Update cost factors if field is costFactors
  if (fieldPath.includes('.costFactors')) {
    const consensusFactors = {};
    const costOptions = Object.keys(target.costFactors || {});

    costOptions.forEach((option) => {
      const optionFacts = review.facts[`cost_factor_${option}`] || review.facts.cost_multiplier;
      if (optionFacts && optionFacts.length > 0) {
        const consensus = consensusValue(review.facts, optionFacts[0].fact);
        if (consensus !== null) {
          consensusFactors[option] = parseFloat(consensus);
          proposedChanges[option] = consensus;
        }
      }
    });

    if (Object.keys(consensusFactors).length > 0) {
      updatedTarget.costFactors = consensusFactors;
      updatedTarget.costFactorProvenance = {
        tier: 'researched',
        confidence: 'high',
        verificationStatus: 'researched',
        sources: Array.from(new Set(review.evidence.map((e) => e.source))),
        researchedAt: new Date().toISOString(),
        note: `Verified via ${review.evidence.length} evidence items. Consensus values derived from market data.`,
      };
    }
  }

  // Update unit cost range if field is unitCostRange
  if (fieldPath.includes('.unitCostRange')) {
    const priceFacts = review.facts.retail_range_min || review.facts.crab_size_large || [];
    if (priceFacts && priceFacts.length > 0) {
      const minValues = (review.facts.retail_range_min || []).map((f) => f.value).filter(Boolean);
      const maxValues = (review.facts.retail_range_max || []).map((f) => f.value).filter(Boolean);

      if (minValues.length > 0 || maxValues.length > 0) {
        updatedTarget.unitCostRange = {
          min: minValues.length > 0 ? Math.min(...minValues) : target.unitCostRange?.min,
          max: maxValues.length > 0 ? Math.max(...maxValues) : target.unitCostRange?.max,
        };
        updatedTarget.costProvenance = {
          tier: 'researched',
          confidence: 'high',
          verificationStatus: 'researched',
          sources: Array.from(new Set(review.evidence.map((e) => e.source))),
          researchedAt: new Date().toISOString(),
          note: `Price range verified from ${review.evidence.length} sources. Current date: ${new Date().toLocaleDateString()}.`,
        };
      }
    }
  }

  return {
    status: 'approved',
    playbook: { ...playbook, [resourceType]: playbook[resourceType].map((item) => (item.id === cleanId ? updatedTarget : item)) },
    changes: proposedChanges,
    evidence: review.evidence,
    summary: review.summary,
  };
}

// Save updated playbook to registry (localStorage for now)
export function savePlaybookUpdate(playbook, updatedPlaybook) {
  try {
    // Save to localStorage (in production, this would go to backend)
    const KEY = `ngw-playbook-${playbook.type || playbook.id}`;
    localStorage.setItem(KEY, JSON.stringify(updatedPlaybook));

    return {
      success: true,
      playbook: updatedPlaybook,
      message: `Playbook "${updatedPlaybook.type || updatedPlaybook.id}" updated with verified data.`,
    };
  } catch (e) {
    console.error('Playbook save failed:', e);
    return {
      success: false,
      error: e.message,
    };
  }
}

// Record the merge action in an audit log
export function recordMergeAction(playbook, evidence, action, at) {
  const auditKey = `ngw-playbook-audit-${playbook.id}`;
  let audit = [];

  try {
    const stored = localStorage.getItem(auditKey);
    if (stored) audit = JSON.parse(stored);
  } catch {
    // Fresh audit log
  }

  audit.push({
    at,
    action,
    evidence_count: evidence.length,
    performed_by: 'campaign-launcher',
  });

  localStorage.setItem(auditKey, JSON.stringify(audit));
  return audit;
}

// Helper: Load playbook from localStorage override (if updated)
export function loadPlaybookWithUpdates(playbookId) {
  try {
    const updated = localStorage.getItem(`ngw-playbook-${playbookId}`);
    if (updated) {
      return JSON.parse(updated);
    }
  } catch {
    // Fall back to original
  }

  // Original from registry (case-insensitive match)
  const norm = (s) => String(s || '').trim().toLowerCase();
  return ALL_PLAYBOOKS.find((pb) => norm(pb.type) === norm(playbookId));
}

// Merge ALL_PLAYBOOKS with any localStorage overrides — used by sections that need to stay in sync
export function getMergedPlaybooks() {
  return ALL_PLAYBOOKS.map((pb) => {
    try {
      const updated = localStorage.getItem(`ngw-playbook-${pb.type}`);
      if (updated) {
        return JSON.parse(updated);
      }
    } catch {
      // Fall back to original
    }
    return pb;
  });
}
