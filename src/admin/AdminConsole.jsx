// ─── Admin / Support Console — v1 (A1: role + auth gate) ──────────────────────
// Mounted only at ?admin=1 (see index.js), wrapped in AuthGate so it has the
// Supabase session. Renders only for users whose app_metadata.role is admin or
// support; everyone else gets an honest "not authorized" screen.
//
// A1 scope = the gate + a whoami probe + a read-only audit view that prove the
// end-to-end path works. The Providers tab is the Knowledge Acquisition operational console
// (KEP-3); Studio is the Knowledge Factory manufacturing floor.
import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, isAdminApiConfigured } from '../lib/adminApi';
import {
  playbookCoverage, culturalMix, locationSpread, memoryDepth, funnelContent,
} from '../lib/analyticsReader';
import { evaluationAudit, conversionAudit } from '../lib/intelEval';
import { hostShellOn, planV2On } from '../lib/presentationNav';
import { getEventSyncStatus, makeEventSyncRow, SYNC_STATUS_LABEL } from '../lib/syncStatus';
import { getLastSyncTime } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { buildPlaybookRegistry, HEALTH } from '../lib/playbooks/playbookRegistry';
import { researchQueueToKCRs } from '../lib/knowledge/researchIntake';
import { syncIntake, loadKCRs, loadLocalKCRs, upsertKCR } from '../lib/knowledge/kcrStore';
import { kcrBacklogMetrics } from '../lib/knowledge/kcrGovernance';
import { kcrGateStatus, addEvidence, setProposal, recordReview, advanceKCR, publishKCR } from '../lib/knowledge/knowledgeChange';
// `mergePublishedKnowledge` is no longer called from here: Phase 5D moved the merge
// INSIDE `exportBase`, which combines the committed export with the snapshot
// reconstruction in the load-bearing order. The import outlived the call, which is
// what the CRA warning gate caught. `snapshotEntryToKcr` STAYS — the correction flow
// below still reconstructs a prior KCR with it.
import { publishedKcrsForExport, serializePublishedExport, exportSummary, EXPORT_FILENAME,
  snapshotEntryToKcr, publishedInventory, exportBase, lineageHistory, rollbackTarget } from '../lib/knowledge/publishedExport';
import { publishedEntries } from '../lib/knowledge/publishedSnapshot';
import { openCorrection, openAuthoredGovernance } from '../lib/knowledge/correctionWorkflow';
import { rollbackKCR } from '../lib/knowledge/knowledgeChange';
import { fieldTypeFor, validateForEditor, CONFIDENCE_LEVELS } from '../lib/knowledge/governedFieldTypes';
import { acquisitionTree, acquisitionSummary, GOVERNANCE_STATES } from '../lib/knowledge/knowledgeAcquisition';
import { approvedSourcesFor, validateSourcesFor, wouldGround, evidenceFromSources, provenanceMirror } from '../lib/knowledge/sourceAuthority';
import { detectDivergence, divergenceSummary, firstGovernanceGuard } from '../lib/knowledge/governanceDivergence';
import { reconciliationCandidates, reconciliationSummary } from '../lib/knowledge/governanceReconciliation';
import { knowledgeInventory, directlyCitedShare, INVENTORY_STATES } from '../lib/knowledge/knowledgeInventory';
import { backfillClassification, classificationSummary } from '../lib/knowledge/backfillClassification';
import { sourceFreshness, freshnessSummary, needsRecheck } from '../lib/knowledge/sourceFreshness';
// The COMMITTED corpus — what a clean checkout ships. Distinct from both the admin store
// and the baked snapshot; reconciliation needs all three to tell them apart.
import publishedCorpus from '../lib/knowledge/publishedKcrs.json';
import { fieldOwnership, blockedMessage } from '../lib/knowledge/governedOwnership';
import { kcrCan, canPublish } from '../lib/knowledge/kcrRoles';
import { corpusDimensionKCRs, qualityManufacturing } from '../lib/knowledge/dimensions';
import { buildFactory } from '../lib/knowledge/factory';
import { buildProviders } from '../lib/knowledge/providers';
import { loadCampaigns, saveCampaigns, createCampaign, runCampaign, recordCampaign, getFieldPaths, PROVIDER_FAMILIES, CAMPAIGN_PRIORITIES, CAMPAIGN_TRIGGERS } from '../lib/knowledge/campaign';
import { loadObservations, loadObservationsAsync } from '../lib/knowledge/observation';
import { resolveConflict, buildConsensusPacket } from '../lib/knowledge/consensusResolver';
import { getMergedPlaybooks } from '../lib/knowledge/playbookMerge';
import { detectGapsInPlaybook, parseFieldPath, getPlaybookField, setPlaybookField, isHighConfidenceProvenance, playbookReadinessForResearch, getResearchIntent, getTemplatesForIntent, getRelevantProvidersForGap } from '../lib/knowledge/playbookSchema';
import { calculateEvidenceQualityScore, describeEvidenceQuality, STATUS_COLOR, FRESHNESS_COLOR, whyEvidenceUntrustworthy, CONNECTION_STATUS, DATA_FRESHNESS, COMPLETENESS } from '../lib/knowledge/dataQuality';
import { analyzeFinding, explainFinding, whyInsufficientForGap, suggestBetterProviders } from '../lib/knowledge/findingAnalysis';
import { generateResearchQuestion, scoreRelevance, categorizeEvidenceRelevance, whyQuestionUnansswered, campaignExplainerText } from '../lib/knowledge/researchQuestion';
import { loadEvidence, loadEvidenceAsync } from '../lib/knowledge/evidence';
import { isKasApiConfigured } from '../lib/api/kas';
import { ALL_PLAYBOOKS } from '../lib/playbooks/index';
import { buildKnowledgeGraph } from '../lib/knowledge/knowledgeGraph';
import { blastRadius } from '../lib/knowledge/dependencyEngine';
import { simulatePublish } from '../lib/knowledge/simulation';
import { resolveField, explainField } from '../lib/knowledge/runtimeKnowledge';
import { detectContradictions, analyzeEvidence } from '../lib/knowledge/evidenceIntelligence';
import { runCopilot, acceptProposal } from '../lib/knowledge/copilot';
import { CAMPAIGN_TEMPLATES, suggestTemplates, applyTemplate } from '../lib/knowledge/campaignTemplates';
import { loadSchedules, recordSchedule, removeSchedule, createSchedule, evaluateSchedule, buildScheduleCoverage, SCHEDULE_FREQUENCIES } from '../lib/knowledge/schedule';
import { loadProviderEvents, recordProviderEvent, createProviderEvent, buildProviderHealth, PROVIDER_OUTCOME_TYPES } from '../lib/knowledge/providerHealth';
import { generateRoadmap, roadmapSummary } from '../lib/knowledge/roadmap';
import { KNOWLEDGE_DOMAINS, getDomain, domainCoverage, generateDomainReport } from '../lib/knowledge/domain';
import { FAILURE_CATEGORIES, createFailureRecord, failureToKCR, analyzeFailures, loadFailures, recordFailure, clearFailures as clearFailureStore } from '../lib/knowledge/failureIntelligence';
import { corpusScopeCoverage } from '../lib/knowledge/knowledgeScope';
import { ROLES, PHASES, SITUATION_TYPES, createContext } from '../lib/experience/experienceContext';
import { RESEARCH_PLAYBOOKS, getResearchPlaybook, suggestPlaybooks, playbooksForDomain, validatePlaybook } from '../lib/knowledge/researchPlaybooks';
import { SOURCE_CATALOG, sourcesForDomain, sourcesForProvider, highReliabilitySources, unbiasedSources, catalogSummary, getProviderFamilyForSource } from '../lib/knowledge/sourceCatalog';
import { PIPELINE_STAGES, STAGE_LABELS, createPipelineManifest, advanceStage, blockStage, getPipelineProgress, buildPipelineMetrics, loadManifests, upsertManifest, clearManifests } from '../lib/knowledge/researchPipeline';
import { RESEARCH_ROLES, canPerform, publishingRoles } from '../lib/knowledge/researchRoles';
import { WORKER_TYPES, createWorkerInstance, buildFleetHealth, buildFleetMetrics, loadWorkers, upsertWorker, clearWorkers, toggleWorker, loadRuns, clearRuns, createWorkerRun, completeWorkerRun, addRun } from '../lib/knowledge/knowledgeWorkers';
import { PROVIDER_MONITOR_RULES, overdueProviders, providerHealthSummary } from '../lib/knowledge/providerMonitor';
import { buildOvernightActivity, buildManufacturingQueue, buildKnowledgeHealth, buildPublishingQueue, buildKnowledgeAging, generateCampaignsFromQueue, buildResearchSession, buildExecutiveReport } from '../lib/knowledge/missionControl';
import { createBatch, startBatch, completeBatch, getBatchProgress, upsertBatch, getActiveBatch } from '../lib/knowledge/batchTracking';
import { batchByFilter, runCampaigns, autoCorroborate, runSummaryLabel } from '../lib/knowledge/researchRunner';
import { generateResearchBlueprint, blueprintToGoal, blueprintStatusLabel } from '../lib/knowledge/researchBlueprint';
import { runAutonomousCampaign, computeQueueItemState, QUEUE_STATES, QUEUE_STATE_COLORS, buildPerformanceReport, batchRunAutonomous } from '../lib/knowledge/campaignRunner';
import { isResearchApiConfigured, createResearchRun, startResearchRun, getResearchRun, retryProvider as retryResearchProvider, fetchServerObservations, updateObservationStatus as serverUpdateObsStatus } from '../lib/api/research';
import { autoNormalize, pasteHintFor } from '../lib/knowledge/providerNormalizers';
import { loadProviderIntel, saveProviderIntel, recordProviderRun, extractProviderRunStats, providerIntelligenceSummary, getProviderStats } from '../lib/knowledge/providerIntelligence';
import { prepareReviewPacket, formatReviewPacketText } from '../lib/knowledge/reviewPacket';
import { fetchProviderData, prepareEvidenceForReview } from '../lib/knowledge/providerIntegration';
import { loadPlaybookWithUpdates } from '../lib/knowledge/playbookMerge';
import { experienceView, simulateExperience, diffExperience } from '../lib/experience/experienceView';
import { type } from '../design/tokens';

// hasSupabaseSession: synchronous localStorage check — matches the App.js impl.
function hasSupabaseSession() {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && /^sb-.*-auth-token$/.test(k) && window.localStorage.getItem(k)) return true;
    }
  } catch { /* localStorage blocked */ }
  return false;
}

// Dark palette aligned with AuthGate's login screen so the console feels native.
const D = {
  bg: '#0d0e12', surface: '#16181f', surface2: '#1d2029', border: '#2a2d38',
  text: '#e8eaf0', muted: '#9aa0b4', faint: '#6b7184',
  accent: '#4a90d9', good: '#22c55e', warn: '#f59e0b', bad: '#ef4444',
  ff: "'Inter', system-ui, sans-serif",
  mono: "'SF Mono', ui-monospace, Menlo, monospace",
};

function Banner({ tone = 'muted', children }) {
  const c = tone === 'warn' ? D.warn : tone === 'bad' ? D.bad : D.muted;
  return (
    <div style={{
      border: `1px solid ${c}33`, background: `${c}11`, color: c,
      borderRadius: 8, padding: '10px 14px', fontSize: type.size.caption, lineHeight: 1.5,
      fontFamily: D.ff, marginBottom: 16,
    }}>{children}</div>
  );
}

function Centered({ title, body }) {
  return (
    <div style={{
      minHeight: '100vh', background: D.bg, color: D.text, fontFamily: D.ff,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: type.size['2xl'], fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: type.size.base, color: D.muted, lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );
}

// ─── Playbook Command Center (Playbook OS) ────────────────────────────────────
// Admin-only observability over the playbook corpus. READ-ONLY — derives everything
// from buildPlaybookRegistry() (the single source). See docs/architecture/PLAYBOOK_OPERATING_SYSTEM.md.
const PB_STATUS_COLOR = { production: D.good, 'review-needed': D.warn, 'research-needed': D.accent, draft: D.bad, archived: D.faint, deprecated: D.faint };
const HEALTH_COLOR = { [HEALTH.OK]: D.good, [HEALTH.WARN]: D.warn, [HEALTH.GAP]: D.bad, [HEALTH.NA]: D.faint };

function PBKpi({ label, value, tone, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ flex: '1 1 120px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px', cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ fontSize: type.size['2xl'], fontWeight: 700, color: tone || D.text, fontFamily: D.mono, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: D.muted, marginTop: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}{onClick && value > 0 ? ' →' : ''}</div>
    </div>
  );
}

function PBHealthDots({ components }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {components.map((c, i) => (
        <span key={i} title={`${c.component}: ${c.status} — ${c.reason}`}
          style={{ width: 8, height: 8, borderRadius: 2, background: HEALTH_COLOR[c.status] || D.faint, display: 'inline-block' }} />
      ))}
    </span>
  );
}

function PBDetail({ entry }) {
  const row = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: `1px solid ${D.border}55`, fontSize: type.size.caption };
  return (
    <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 16, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Health</div>
          {entry.health.components.map((c, i) => (
            <div key={i} style={row}>
              <span style={{ color: D.muted }}>{c.component}</span>
              <span style={{ color: HEALTH_COLOR[c.status], fontFamily: D.mono, textAlign: 'right' }}>{c.status} · <span style={{ color: D.faint }}>{c.reason}</span></span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Grounding</div>
          <div style={row}><span style={{ color: D.muted }}>Priced items</span><span style={{ fontFamily: D.mono }}>{entry.grounding.pricedItems}</span></div>
          <div style={row}><span style={{ color: D.muted }}>Cited / synth / consensus</span><span style={{ fontFamily: D.mono }}>{entry.grounding.cited} / {entry.grounding.synthesized} / {entry.grounding.consensus}</span></div>
          <div style={row}><span style={{ color: D.muted }}>Grounded %</span><span style={{ fontFamily: D.mono, color: entry.grounding.groundedPct > 0 ? D.good : D.warn }}>{entry.grounding.groundedPct}%</span></div>
          <div style={row}><span style={{ color: D.muted }}>knowledge.sources</span><span style={{ fontFamily: D.mono, color: entry.grounding.hasSources ? D.good : D.bad }}>{entry.grounding.hasSources ? 'present' : 'empty'}</span></div>

          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '12px 0 6px' }}>Engine coverage ({entry.coverage.supportedCount}/{entry.coverage.total})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {entry.coverage.engines.map((e) => (
              <span key={e.id} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: D.mono, background: e.supported ? `${D.good}22` : `${D.faint}18`, color: e.supported ? D.good : D.faint }}>{e.label}</span>
            ))}
          </div>

          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '12px 0 6px' }}>Governance</div>
          <div style={{ fontSize: type.size.caption, color: entry.governance.set ? D.muted : D.warn, fontFamily: D.mono }}>
            {entry.governance.set ? `owner ${entry.governance.owner || '—'} · reviewed ${entry.governance.lastReviewed || '—'} · every ${entry.governance.reviewIntervalDays || '—'}d` : 'No governance block — cadence unset'}
          </div>
        </div>
      </div>

      {!!entry.weaknesses.length && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Known weaknesses</div>
          {entry.weaknesses.map((w, i) => <div key={i} style={{ fontSize: type.size.caption, color: D.muted, padding: '2px 0' }}>• {w}</div>)}
        </div>
      )}
      {!!entry.research.length && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Research queue</div>
          {entry.research.map((r, i) => (
            <div key={i} style={{ fontSize: type.size.caption, padding: '2px 0' }}>
              <span style={{ fontFamily: D.mono, color: r.priority === 'high' ? D.bad : r.priority === 'med' ? D.warn : D.faint }}>[{r.priority}] {r.kind}</span>
              <span style={{ color: D.muted }}> — {r.reason}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14, fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>
        Field validation & change history: {entry.validation.note}
      </div>
    </div>
  );
}

function BatchReceiptModal({ batch, onClose, onShowProgress }) {
  if (!batch) return null;
  const isActive = batch.state === 'running';
  const isComplete = batch.state === 'completed';
  const isFailed = batch.state === 'failed';
  const estimatedTime = Math.ceil((batch.totalItems / 10) * 6);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, fontFamily: D.ff,
    }}>
      <div style={{
        background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12,
        padding: '24px', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>
            {isActive ? '🚀 Batch Running' : isComplete ? '✓ Batch Complete' : isFailed ? '✗ Batch Failed' : '⏳ Batch Queued'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.muted, fontSize: 16, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Batch ID</div>
          <div style={{ fontSize: 12, fontFamily: D.mono, color: D.text, wordBreak: 'break-all' }}>{batch.id}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: D.faint, marginBottom: 4 }}>Type</div>
            <div style={{ fontSize: 12, color: D.accent, fontWeight: 600 }}>{batch.intentType}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: D.faint, marginBottom: 4 }}>Items</div>
            <div style={{ fontSize: 12, color: D.text, fontWeight: 600 }}>{batch.totalItems}</div>
          </div>
        </div>

        {isActive && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: D.faint, marginBottom: 6 }}>Progress</div>
              <div style={{ background: D.surface2, borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ background: D.accent, height: '100%', width: '15%', transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 10, color: D.muted, textAlign: 'center' }}>~{estimatedTime}m remaining</div>
            </div>
          </>
        )}

        {isComplete && (
          <div style={{ fontSize: 11, color: D.good, marginBottom: 12 }}>
            All {batch.totalItems} campaigns completed. Results are being processed.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '8px 12px', borderRadius: 6,
            background: D.surface2, color: D.text, border: `1px solid ${D.border}`,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: D.ff,
          }}>
            {isComplete ? 'View Results' : 'Dismiss'}
          </button>
          {isActive && (
            <button onClick={() => { onShowProgress?.(); onClose(); }} style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              background: `${D.accent}22`, color: D.accent, border: `1px solid ${D.accent}`,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: D.ff,
            }}>
              Tracker
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BatchProgressPanel({ batch, onClose }) {
  const [liveProgress, setLiveProgress] = useState(null);

  useEffect(() => {
    if (!batch?.id) return;

    // Always fetch fresh progress from storage (recalculates stats)
    const fresh = getBatchProgress(batch.id);
    if (fresh) {
      setLiveProgress(fresh);
    }

    // Only poll while running; once complete, stop polling
    if (batch.state !== 'running') {
      return;
    }

    // Poll for fresh batch progress every 100ms while running
    const interval = setInterval(() => {
      const freshProgress = getBatchProgress(batch.id);
      if (freshProgress) {
        setLiveProgress(freshProgress);
        // Stop polling when batch completes
        if (freshProgress.state !== 'running') {
          clearInterval(interval);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [batch?.id, batch?.state]);

  if (!batch) return null;
  const display = liveProgress || batch;
  const isActive = display.state === 'running';

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 350, maxHeight: 500,
      background: D.surface, border: `1px solid ${D.accent}66`, borderRadius: 10,
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)', fontFamily: D.ff, zIndex: 9998,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: 14, borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: D.accent, fontWeight: 700 }}>● {isActive ? 'RUNNING' : 'COMPLETE'}</div>
          <div style={{ fontSize: 10, color: D.faint, fontFamily: D.mono }}>{display.id.slice(0, 12)}...</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>

      {/* Stats Grid */}
      <div style={{ padding: 12, borderBottom: `1px solid ${D.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Queued', value: display.stats?.queued || 0, color: D.muted },
          { label: 'Running', value: display.stats?.running || 0, color: D.accent },
          { label: 'Done', value: display.stats?.completed || 0, color: D.good },
          { label: 'Failed', value: display.stats?.failed || 0, color: D.bad },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: D.faint, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{ padding: 12, borderBottom: `1px solid ${D.border}` }}>
        <div style={{ fontSize: 9, color: D.faint, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>Progress</span>
          <span>{display.pctComplete || 0}%</span>
        </div>
        <div style={{ background: D.surface2, borderRadius: 3, height: 6, overflow: 'hidden' }}>
          <div style={{ background: D.accent, height: '100%', width: `${display.pctComplete || 0}%`, transition: 'width 0.2s' }} />
        </div>
      </div>

      {/* Recent Runs */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <div style={{ fontSize: 8, color: D.faint, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>Recent</div>
        {(display.recentRuns || []).slice(0, 5).map((run, i) => (
          <div key={i} style={{ fontSize: 9, padding: '4px 8px', marginBottom: 2, background: D.bg, borderRadius: 4, borderLeft: `3px solid ${run.state === 'completed' ? D.good : run.state === 'failed' ? D.bad : D.accent}` }}>
            <div style={{ color: D.text, fontFamily: D.mono, wordBreak: 'break-word' }}>{run.id?.slice(-8)}</div>
          </div>
        ))}
        {(!display.recentRuns || display.recentRuns.length === 0) && (
          <div style={{ fontSize: 9, color: D.faint, padding: '8px 4px' }}>No runs yet</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: 10, borderTop: `1px solid ${D.border}`, display: 'flex', gap: 6 }}>
        {isActive && (
          <>
            <button style={{
              flex: 1, padding: '6px 10px', borderRadius: 5,
              background: `${D.warn}22`, color: D.warn, border: `1px solid ${D.warn}`,
              fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: D.ff,
            }}>
              Pause
            </button>
            <button style={{
              flex: 1, padding: '6px 10px', borderRadius: 5,
              background: `${D.bad}22`, color: D.bad, border: `1px solid ${D.bad}`,
              fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: D.ff,
            }}>
              Cancel
            </button>
          </>
        )}
        <button onClick={onClose} style={{
          flex: 1, padding: '6px 10px', borderRadius: 5,
          background: D.surface2, color: D.text, border: `1px solid ${D.border}`,
          fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: D.ff,
        }}>
          {isActive ? 'Minimize' : 'Close'}
        </button>
      </div>
    </div>
  );
}

function PlaybooksPanel() {
  const asOf = new Date().toISOString().slice(0, 10);
  const [reg] = useState(() => {
    const pbsWithUpdates = ALL_PLAYBOOKS.map(pb => loadPlaybookWithUpdates(pb.type)).filter(Boolean);
    return buildPlaybookRegistry(asOf, pbsWithUpdates);
  });
  const [open, setOpen] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const order = ['draft', 'research-needed', 'review-needed', 'production', 'archived', 'deprecated'];
  const shown = reg.entries
    .filter((e) => statusFilter === 'all' || e.status === statusFilter)
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.type.localeCompare(b.type));

  const th = { textAlign: 'left', fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` };
  const td = { padding: '8px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, verticalAlign: 'middle' };

  return (
    <div>
      <Banner>Playbook Command Center — read-only observability over the {reg.count}-playbook corpus. Everything is derived from the data objects (Playbook OS). No playbook output is affected.</Banner>

      <div>

      {/* KPI strip — health of the whole corpus in one glance */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <PBKpi label="Playbooks" value={reg.count} />
        <PBKpi label="Production" value={reg.byStatus.production || 0} tone={D.good} />
        <PBKpi label="Research needed" value={reg.byStatus['research-needed'] || 0} tone={D.accent} />
        <PBKpi label="Review needed" value={reg.byStatus['review-needed'] || 0} tone={D.warn} />
        <PBKpi label="Draft / gaps" value={reg.criticalGaps} tone={reg.criticalGaps ? D.bad : D.faint} />
        <PBKpi label="Grounded %" value={`${reg.groundingCoveragePct}%`} tone={reg.groundingCoveragePct > 0 ? D.good : D.warn} />
        <PBKpi label="Reviews overdue" value={reg.reviewsOverdue} tone={reg.reviewsOverdue ? D.warn : D.faint} />
        <PBKpi label="Research open" value={reg.researchOpen} tone={reg.researchOpen ? D.warn : D.faint} />
        <PBKpi label="With governance" value={`${reg.withGovernance}/${reg.count}`} tone={reg.withGovernance === reg.count ? D.good : D.warn} />
      </div>

      {/* Engine coverage across the corpus */}
      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Engine coverage (playbooks feeding each)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {reg.engineCoverage.map((e) => (
            <span key={e.id} style={{ fontSize: 11, fontFamily: D.mono, padding: '3px 8px', borderRadius: 5, background: D.surface2, color: e.playbooks === reg.count ? D.good : e.playbooks === 0 ? D.faint : D.muted, border: `1px solid ${D.border}` }}>
              {e.label} <span style={{ color: D.text }}>{e.playbooks}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {['all', ...order].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            background: statusFilter === s ? D.surface2 : 'transparent', color: statusFilter === s ? D.text : D.muted,
            border: `1px solid ${statusFilter === s ? D.border : 'transparent'}`, borderRadius: 6, padding: '4px 10px',
            fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
          }}>{s}{s !== 'all' ? ` (${reg.byStatus[s] || 0})` : ''}</button>
        ))}
      </div>

      {/* Playbook table */}
      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Playbook</th><th style={th}>Status</th><th style={th}>Category</th>
            <th style={th}>Ver</th><th style={th}>Grounded</th><th style={th}>Coverage</th><th style={th}>Health</th>
          </tr></thead>
          <tbody>
            {shown.map((e) => (
              <Fragment key={e.id}>
                <tr onClick={() => setOpen(open === e.id ? null : e.id)} style={{ cursor: 'pointer', background: open === e.id ? D.surface2 : 'transparent' }}>
                  <td style={{ ...td, color: D.text, fontWeight: 600 }}>{e.type}</td>
                  <td style={td}><span style={{ color: PB_STATUS_COLOR[e.status] || D.muted, fontFamily: D.mono, fontSize: 11 }}>● {e.status}</span></td>
                  <td style={{ ...td, color: D.muted, fontFamily: D.mono, fontSize: 11 }}>{e.category}</td>
                  <td style={{ ...td, color: D.faint, fontFamily: D.mono, fontSize: 11 }}>{e.version}</td>
                  <td style={{ ...td, fontFamily: D.mono, color: e.grounding.groundedPct > 0 ? D.good : D.warn }}>{e.grounding.pricedItems ? `${e.grounding.groundedPct}%` : '—'}</td>
                  <td style={{ ...td, fontFamily: D.mono, color: D.muted }}>{e.coverage.supportedCount}/{e.coverage.total}</td>
                  <td style={td}><PBHealthDots components={e.health.components} /></td>
                </tr>
                {open === e.id && <tr><td colSpan={7} style={{ padding: '0 10px 12px' }}><PBDetail entry={e} /></td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Users', 'Workspaces', 'Invitations', 'Activation', 'Analytics', 'Intelligence', 'Playbooks', 'Studio', 'Metrics', 'Errors', 'Providers', 'Audit', 'Settings'];

const inputStyle = {
  background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.text, fontSize: type.size.base, padding: '7px 11px', outline: 'none',
  fontFamily: D.ff, flex: 1, minWidth: 160,
};
const btnStyle = (primary) => ({
  background: primary ? D.accent : D.surface2, color: primary ? '#fff' : D.muted,
  border: `1px solid ${primary ? D.accent : D.border}`, borderRadius: 6,
  padding: '7px 14px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
});
const fmtTs = (t) => (t ? String(t).replace('T', ' ').slice(0, 19) : '—');

// ─── Users tab — A3 User Lookup + Support Notes ───────────────────────────────
function UsersPanel({ initialUserId }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [coverage, setCoverage] = useState('');
  const [selected, setSelected] = useState(null);   // full user detail payload
  const [notes, setNotes] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (term) => {
    setBusy(true); setErr(null);
    try {
      const r = await adminApi.users(term ?? q);
      setResults(r?.users || []);
      setCoverage(r?.coverage || '');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [q]);

  // Initial load: most recent signups.
  useEffect(() => { search(''); }, [search]);

  const openUser = useCallback(async (id) => {
    setBusy(true); setErr(null); setSelected(null); setNotes(null);
    try {
      const [detail, n] = await Promise.all([adminApi.user(id), adminApi.notes(id)]);
      setSelected(detail);
      setNotes(n?.notes || []);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);

  // Deep-link from Triage: open the requested user once on arrival.
  useEffect(() => { if (initialUserId) openUser(initialUserId); }, [initialUserId, openUser]);

  const addNote = useCallback(async () => {
    const id = selected?.user?.id;
    if (!id || !noteBody.trim()) return;
    setBusy(true); setErr(null);
    try {
      await adminApi.addNote(id, noteBody.trim());
      setNoteBody('');
      const n = await adminApi.notes(id);
      setNotes(n?.notes || []);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [selected, noteBody]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={inputStyle} placeholder="Search email, name, or user id…"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }}
        />
        <button style={btnStyle(true)} disabled={busy} onClick={() => search()}>
          {busy ? '…' : 'Search'}
        </button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Results list */}
        <div style={{ flex: '0 0 320px' }}>
          {results && results.length === 0 && (
            <div style={{ fontSize: type.size.caption, color: D.faint }}>No users found.</div>
          )}
          {results && results.map(u => (
            <button key={u.id} onClick={() => openUser(u.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.user?.id === u.id ? D.surface2 : D.surface,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px',
              marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <div style={{ fontSize: type.size.base, color: D.text, fontWeight: 600 }}>
                {u.email || '(no email)'}
                {u.role && <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{u.role}</span>}
              </div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>
                {u.name || '—'} · {u.event_count} synced event{u.event_count === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 2, fontFamily: D.mono }}>
                joined {fmtTs(u.created_at)}
              </div>
            </button>
          ))}
        </div>

        {/* Detail + notes */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && (
            <div style={{ fontSize: type.size.caption, color: D.faint }}>Select a user to see details and notes.</div>
          )}
          {selected && (
            <div>
              <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.text }}>
                {selected.user.email}
              </div>
              <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 4, lineHeight: 1.7 }}>
                <div>name: {selected.user.name || '—'} · role: {selected.user.role || 'planner'} · provider: {selected.user.provider || '—'}</div>
                <div style={{ fontFamily: D.mono, fontSize: type.size.sm, color: D.faint }}>id: {selected.user.id}</div>
                <div>joined {fmtTs(selected.user.created_at)} · last sign-in {fmtTs(selected.user.last_sign_in_at)} · email confirmed {selected.user.email_confirmed_at ? 'yes' : 'no'}</div>
                <div>{selected.event_count} server-synced event{selected.event_count === 1 ? '' : 's'} · {selected.workspaces.length} workspace{selected.workspaces.length === 1 ? '' : 's'}</div>
              </div>

              {selected.workspaces.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: type.size.sm, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Workspaces</div>
                  {selected.workspaces.map(w => (
                    <div key={w.id} style={{ fontSize: type.size.caption, color: D.muted, padding: '3px 0' }}>
                      {w.name} <span style={{ color: D.faint }}>· {w.plan} · {w.role}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.coverage && (
                <div style={{ marginTop: 12, fontSize: type.size.sm, color: D.warn, lineHeight: 1.5 }}>
                  ⚠ {selected.coverage}
                </div>
              )}

              {/* Support notes */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${D.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: type.size.base, fontWeight: 700, marginBottom: 4 }}>Support notes</div>
                <div style={{ fontSize: type.size.sm, color: D.faint, marginBottom: 10 }}>Append-only — corrections are new notes, never edits.</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    style={inputStyle} placeholder="Add a note about this user…"
                    value={noteBody} onChange={e => setNoteBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                  />
                  <button style={btnStyle(true)} disabled={busy || !noteBody.trim()} onClick={addNote}>Add</button>
                </div>
                {notes && notes.length === 0 && (
                  <div style={{ fontSize: type.size.caption, color: D.faint }}>No notes yet.</div>
                )}
                {notes && notes.map(n => (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: `1px solid ${D.border}` }}>
                    <div style={{ fontSize: type.size.base, color: D.text, lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                      {n.author_name || n.author_id} · {fmtTs(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {coverage && !selected && (
        <div style={{ marginTop: 14, fontSize: type.size.sm, color: D.faint }}>{coverage}</div>
      )}
    </div>
  );
}

// ─── Workspaces tab — S2 Event / Workspace diagnostics ───────────────────────
// Master-detail like Users: search studios → see members + the synced-event
// pointers across them. Honest by construction: studios are server-synced, but
// event *contents* are localStorage-first, so events show as pointers only.
function WorkspacesPanel({ onOpenUser }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (term) => {
    setBusy(true); setErr(null);
    try { const r = await adminApi.workspaces(term ?? q); setResults(r?.workspaces || []); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [q]);
  useEffect(() => { search(''); }, [search]);

  const openWs = useCallback(async (id) => {
    setBusy(true); setErr(null); setSelected(null);
    try { setSelected(await adminApi.workspace(id)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={inputStyle} placeholder="Search workspace name…"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }} />
        <button style={btnStyle(true)} disabled={busy} onClick={() => search()}>{busy ? '…' : 'Search'}</button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ flex: '0 0 300px' }}>
          {results && results.length === 0 && <div style={{ fontSize: type.size.caption, color: D.faint }}>No workspaces found.</div>}
          {results && results.map(w => (
            <button key={w.id} onClick={() => openWs(w.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.workspace?.id === w.id ? D.surface2 : D.surface,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px',
              marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <div style={{ fontSize: type.size.base, color: D.text, fontWeight: 600 }}>
                {w.name || '(unnamed)'}
                <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{w.plan}</span>
              </div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>
                {w.member_count} member{w.member_count === 1 ? '' : 's'} · created {fmtTs(w.created_at)}
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && <div style={{ fontSize: type.size.caption, color: D.faint }}>Select a workspace to see members and synced events.</div>}
          {selected && (
            <div>
              <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.text }}>
                {selected.workspace.name || '(unnamed)'}
                <span style={{ color: D.accent, fontSize: type.size.sm, marginLeft: 8 }}>{selected.workspace.plan}</span>
              </div>
              <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                id: {selected.workspace.id} · created {fmtTs(selected.workspace.created_at)}
              </div>

              {/* Members */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: type.size.sm, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Members ({selected.members.length})
                </div>
                {selected.members.map(m => (
                  <button key={m.user_id} onClick={() => m.user_id && onOpenUser?.(m.user_id)} style={{
                    display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'baseline',
                    background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8,
                    padding: '8px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: D.ff,
                  }}>
                    <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email || '(no email)'}{m.name ? <span style={{ color: D.muted, fontWeight: 400 }}> · {m.name}</span> : null}
                    </span>
                    <span style={{ fontSize: type.size.sm, color: D.accent }}>{m.role}</span>
                  </button>
                ))}
              </div>

              {/* Synced events (pointers only) */}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: type.size.sm, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Synced events ({selected.events.length})
                </div>
                <div style={{ fontSize: type.size.sm, color: D.warn, marginBottom: 8, lineHeight: 1.5 }}>⚠ {selected.events_note}</div>
                {selected.events.length === 0 && <div style={{ fontSize: type.size.caption, color: D.faint }}>No synced events.</div>}
                {selected.events.map(ev => (
                  <div key={ev.event_id} style={{
                    display: 'flex', gap: 12, alignItems: 'baseline',
                    padding: '6px 0', borderBottom: `1px solid ${D.border}`, fontSize: type.size.caption,
                  }}>
                    <span style={{ flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: D.muted }}>{ev.name || ev.event_id}</span>
                      {ev.name && <span style={{ color: D.faint, fontFamily: D.mono }}> · {ev.event_id}</span>}
                    </span>
                    <span style={{ color: D.faint }}>{ev.owner_email || ev.owner_id}</span>
                    <span style={{ color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>{fmtTs(ev.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Invitations tab — S3 Invitation ops ─────────────────────────────────────
// All pending studio invitations. The actionable signal is "stuck": the invitee
// already signed up but the invite never attached (the claim_pending noise). Ops
// can revoke (audit-logged). No resend — the backend can't send Supabase OTP mail,
// and a button that can't send would be dishonest.
function InvitationsPanel({ onOpenUser }) {
  const [scope, setScope] = useState('pending');
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (sc) => {
    setBusy(true); setErr(null);
    try { const r = await adminApi.invitations(sc); setRows(r?.invitations || []); setNote(r?.note || ''); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(scope); }, [load, scope]);

  const revoke = useCallback(async (inv) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Revoke the invitation to ${inv.email}? This deletes the pending invite.`)) return;
    setBusy(true); setErr(null);
    try { await adminApi.revokeInvitation(inv.id); await load(scope); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [load, scope]);

  const stuckCount = (rows || []).filter(r => r.stuck).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {['pending', 'all'].map(sc => (
          <button key={sc} onClick={() => setScope(sc)} style={{
            ...btnStyle(scope === sc), textTransform: 'capitalize',
          }}>{sc}</button>
        ))}
        <button onClick={() => load(scope)} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {stuckCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.bad, fontWeight: 700 }}>
            {stuckCount} stuck
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}
      {note && <Banner tone="warn">{note}</Banner>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: type.size.caption, color: D.faint }}>No {scope === 'all' ? '' : 'pending '}invitations.</div>
      )}
      {rows && rows.map(inv => (
        <div key={inv.id} style={{
          display: 'flex', gap: 12, alignItems: 'center',
          background: D.surface, border: `1px solid ${D.border}`,
          borderLeft: `2px solid ${inv.stuck ? D.bad : inv.used_at ? D.good : D.border}`,
          borderRadius: 8, padding: '10px 12px', marginBottom: 6,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: type.size.base, color: D.text, fontWeight: 600 }}>
              {inv.invitee_user_id ? (
                <button onClick={() => onOpenUser?.(inv.invitee_user_id)} style={{
                  background: 'none', border: 'none', color: D.text, fontWeight: 600,
                  fontSize: type.size.base, cursor: 'pointer', fontFamily: D.ff, padding: 0, textAlign: 'left',
                }}>{inv.email}</button>
              ) : inv.email}
              <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{inv.role}</span>
              {inv.stuck && (
                <span style={{ color: D.bad, fontSize: type.size.xs, marginLeft: 8, fontWeight: 700,
                  border: `1px solid ${D.bad}55`, borderRadius: 4, padding: '1px 5px' }}>STUCK</span>
              )}
              {inv.used_at && (
                <span style={{ color: D.good, fontSize: type.size.xs, marginLeft: 8 }}>claimed</span>
              )}
            </div>
            <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>
              {inv.studio_name || '(unknown workspace)'}
              {inv.invited_by_email ? ` · by ${inv.invited_by_email}` : ''} · invited {fmtTs(inv.created_at)}
            </div>
            {inv.stuck && (
              <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 3 }}>
                Signed up {fmtTs(inv.invitee_signed_up_at)} but the invite never attached — revoke if stale.
              </div>
            )}
          </div>
          {!inv.used_at && (
            <button onClick={() => revoke(inv)} disabled={busy} style={{
              ...btnStyle(false), color: D.bad, borderColor: `${D.bad}55`, flexShrink: 0,
            }}>Revoke</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Metrics tab — A1 Activation funnel (P1; A2 AI-cost section lands here too) ─
// Honest beta health from server-synced state. Tiny-N is shown truthfully (Tufte:
// "3 of 7", never a vanity curve). "Synced an event" is a proxy — the server can't
// tell a real event from the sample, and the row says so.
function MetricsPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { setData(await adminApi.activation()); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const funnel = data?.funnel;
  const top = funnel?.[0]?.count || 0;
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activation</div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {data?.new_signups && (
          <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.muted }}>
            <span style={{ color: D.good, fontWeight: 700 }}>+{data.new_signups.d7}</span> in 7d
            {' · '}<span style={{ color: D.muted, fontWeight: 700 }}>+{data.new_signups.d30}</span> in 30d
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {data && top === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No signups yet.</div>}

      {data && top > 0 && (
        <div>
          {funnel.map((s, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            return (
              <div key={s.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{s.count}</span>
                  <span style={{ fontSize: type.size.sm, color: D.faint, width: 92, textAlign: 'right' }}>
                    {pct(s.count, top)}% of signups
                    {prev !== null && <span style={{ color: prev > 0 && s.count < prev ? D.warn : D.faint }}> · {pct(s.count, prev)}→</span>}
                  </span>
                </div>
                <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(s.count, top)}%`, background: D.accent, borderRadius: 4 }} />
                </div>
                {s.note && <div style={{ fontSize: type.size.xs, color: D.warn, marginTop: 4 }}>⚠ {s.note}</div>}
              </div>
            );
          })}
          <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 14, lineHeight: 1.5 }}>{data.coverage}</div>
        </div>
      )}
    </div>
  );
}

// ─── Activation tab — per-planner funnel board ("First 50 Real Events" sprint) ──
// The Metrics tab shows the AGGREGATE funnel; this shows WHO is where, so a recruit
// who stalls is visible by name. Built from /api/admin/users (server truth: joined,
// last active, synced-event count) — no new endpoint. Honest limit: the server can't
// see a real event vs the sample (event bodies are localStorage-first), so "synced
// events" is a proxy for activity, never proof of a real qualified event. The strict
// real-event funnel (EVENT_QUALIFIED → SECOND_EVENT_CREATED) lives in PostHog.
const _daysSince = (t) => { if (!t) return null; const ms = Date.now() - Date.parse(t); return Number.isFinite(ms) ? Math.floor(ms / 86400000) : null; };
const _stageOf = (u) => {
  const events = Number(u.event_count) || 0;
  const idle = _daysSince(u.last_sign_in_at);
  if (events > 0 && idle !== null && idle <= 14) return { key: 'active', label: 'Active · has events', color: D.good };
  if (events > 0)                                 return { key: 'has_events', label: 'Has events', color: D.accent };
  if (u.last_sign_in_at)                          return { key: 'returned', label: 'Signed in, no event', color: D.warn };
  return { key: 'signed_up', label: 'Signed up only', color: D.muted };
};

function ActivationPanel({ onOpenUser }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { const r = await adminApi.users(''); setRows(r?.users || []); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tally = (rows || []).reduce((acc, u) => { acc[_stageOf(u).key] = (acc[_stageOf(u).key] || 0) + 1; return acc; }, {});
  const total = (rows || []).length;
  const withEvents = (tally.active || 0) + (tally.has_events || 0);
  // Most-at-risk first: stalled (signed-in, no event) and idle accounts to the top.
  const sorted = [...(rows || [])].sort((a, b) => {
    const ra = _stageOf(a).key === 'returned' ? 0 : 1;
    const rb = _stageOf(b).key === 'returned' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (_daysSince(b.last_sign_in_at) ?? 1e9) - (_daysSince(a.last_sign_in_at) ?? 1e9);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activation — by planner</div>
        <button onClick={load} disabled={busy} style={{ background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm, cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline' }}>{busy ? 'loading…' : 'refresh'}</button>
        {rows && <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.muted }}><span style={{ color: D.good, fontWeight: 700 }}>{withEvents}</span> of {total} have synced an event</span>}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}
      {rows && total === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No accounts yet. Recruiting (Workstream A) is the unblock.</div>}

      {rows && total > 0 && (
        <>
          {/* mini per-person funnel tally */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { k: 'signed_up', label: 'Signed up only', c: D.muted },
              { k: 'returned', label: 'No event yet', c: D.warn },
              { k: 'has_events', label: 'Has events', c: D.accent },
              { k: 'active', label: 'Active · has events', c: D.good },
            ].map(s => (
              <div key={s.k} style={{ flex: '1 1 120px', background: D.surface, border: `1px solid ${D.border}`, borderLeft: `2px solid ${s.c}`, borderRadius: 8, padding: '8px 11px' }}>
                <div style={{ fontSize: type.size['2xl'], fontWeight: 700, color: D.text, fontFamily: D.mono }}>{tally[s.k] || 0}</div>
                <div style={{ fontSize: type.size.xs, color: D.muted, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {sorted.map(u => {
            const st = _stageOf(u);
            const idle = _daysSince(u.last_sign_in_at);
            return (
              <button key={u.id} onClick={() => onOpenUser && onOpenUser(u.id)} style={{
                display: 'block', width: '100%', textAlign: 'left', background: D.surface,
                border: `1px solid ${D.border}`, borderLeft: `2px solid ${st.color}`, borderRadius: 8,
                padding: '9px 12px', marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: type.size.base, color: D.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email || '(no email)'}{u.role && <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{u.role}</span>}
                  </span>
                  <span style={{ fontSize: type.size.xs, fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.label}</span>
                </div>
                <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                  {u.event_count} synced · joined {fmtTs(u.created_at).slice(0, 10)} · {idle === null ? 'never signed in' : idle === 0 ? 'active today' : `idle ${idle}d`}
                </div>
              </button>
            );
          })}
          <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 12, lineHeight: 1.5 }}>
            ⚠ "Synced an event" is a server proxy — it can't tell a real qualified event from the sample. The strict real-event funnel (qualified → completed → second event) is in PostHog.
          </div>
        </>
      )}
    </div>
  );
}

// ─── Errors tab — A3-err server-side error feed ──────────────────────────────
// admin_error_log: AI-proxy, email, payments, unhandled API exceptions. Honest
// scope — browser errors (CSP, frontend crashes) are NOT here; they live in
// Sentry, and the panel says so rather than implying full coverage.
const SOURCE_COLOR = (src) =>
  src === 'ai_proxy' ? D.accent : src === 'api' ? D.bad : src === 'email' ? D.warn : D.muted;

function ErrorsPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState(168);

  const load = useCallback(async (h) => {
    setBusy(true); setErr(null);
    try { setData(await adminApi.errors(h)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(hours); }, [load, hours]);

  const rows = data?.errors;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {[[24, '24h'], [168, '7d'], [720, '30d']].map(([h, lbl]) => (
          <button key={h} onClick={() => setHours(h)} style={btnStyle(hours === h)}>{lbl}</button>
        ))}
        <button onClick={() => load(hours)} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
      </div>

      {data?.sentry_note && <Banner tone="muted">{data.sentry_note}</Banner>}
      {data?.note && <Banner tone="warn">{data.note}</Banner>}
      {err && <Banner tone="bad">Error: {err}</Banner>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: type.size.base, color: D.good, fontWeight: 600, marginTop: 8 }}>
          No server-side errors in this window.
        </div>
      )}
      {rows && rows.map(e => (
        <div key={e.id} style={{
          background: D.surface, border: `1px solid ${D.border}`,
          borderLeft: `2px solid ${e.level === 'warning' ? D.warn : D.bad}`,
          borderRadius: 8, padding: '9px 12px', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ fontSize: type.size.xs, fontWeight: 700, color: SOURCE_COLOR(e.source),
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{e.source}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: type.size.base, color: D.text }}>{e.message}</span>
            <span style={{ fontSize: type.size.xs, color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>{fmtTs(e.created_at)}</span>
          </div>
          {e.context && Object.keys(e.context).length > 0 && (
            <div style={{ fontSize: type.size.xs, color: D.faint, fontFamily: D.mono, marginTop: 3 }}>
              {Object.entries(e.context).map(([k, v]) => `${k}=${v}`).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Overview tab — S1 Triage ("who needs me right now") ──────────────────────
// The operator's landing hero. ONE hero (the needs-you count), evidence whispers
// (bucket rows), empty = caught-up reward. Buckets come from the backend; each is
// honest that an empty list means "nothing visible server-side," not "all fine."
const toneColor = (t) => (t === 'bad' ? D.bad : t === 'warn' ? D.warn : D.muted);

function TriagePanel({ onOpenUser, onGoErrors }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [whoami, setWhoami] = useState(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { setData(await adminApi.triage()); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const runGate = useCallback(async () => {
    try { const w = await adminApi.whoami(); setWhoami(w?.principal || null); }
    catch (e) { setWhoami({ error: e.message }); }
  }, []);

  const needsYou = data?.needs_you ?? 0;

  return (
    <div>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          What needs you
        </div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'refreshing…' : 'refresh'}</button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {data && (
        <>
          {needsYou === 0 ? (
            <div style={{ padding: '28px 0 8px' }}>
              <div style={{ fontSize: type.size['3xl'], fontWeight: 700, color: D.good }}>Caught up</div>
              <div style={{ fontSize: type.size.base, color: D.muted, marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                Nobody's stuck at the front door, stalled in onboarding, or going quiet —
                as far as server-synced state can see.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 40 /* display numeral */, fontWeight: 800, color: D.text, lineHeight: 1.1, margin: '6px 0 18px' }}>
              {needsYou}
              <span style={{ fontSize: type.size.lg, fontWeight: 600, color: D.muted, marginLeft: 10 }}>
                {needsYou === 1 ? 'person needs a look' : 'people need a look'}
              </span>
            </div>
          )}

          {/* Buckets */}
          {data.buckets.map(b => (
            <div key={b.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
                <span style={{
                  fontSize: type.size.base, fontWeight: 700,
                  color: b.total > 0 ? toneColor(b.tone) : D.faint,
                }}>{b.label}</span>
                <span style={{ fontSize: type.size.caption, color: D.faint, fontFamily: D.mono }}>
                  {b.total}{b.total > b.items.length ? ` · showing ${b.items.length}` : ''}
                </span>
              </div>
              <div style={{ fontSize: type.size.sm, color: D.faint, marginBottom: 8 }}>{b.hint}</div>
              {b.items.length === 0 ? (
                <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>None.</div>
              ) : b.items.map(it => (
                <button key={it.id} onClick={() => onOpenUser?.(it.id)} style={{
                  display: 'flex', width: '100%', textAlign: 'left', gap: 12, alignItems: 'baseline',
                  background: D.surface, border: `1px solid ${D.border}`, borderLeft: `2px solid ${toneColor(b.tone)}`,
                  borderRadius: 8, padding: '8px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: D.ff,
                }}>
                  <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.email || '(no email)'}{it.name ? <span style={{ color: D.muted, fontWeight: 400 }}> · {it.name}</span> : null}
                  </span>
                  <span style={{ fontSize: type.size.xs, color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>
                    {b.key === 'going_quiet' ? `last seen ${fmtTs(it.last_sign_in_at)}`
                      : b.key === 'stuck_invites' ? `invited ${fmtTs(it.created_at)}`
                      : `joined ${fmtTs(it.created_at)}`}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {/* System health stat — server-side errors (A3-err), not a person bucket. */}
          {data.system && (
            <button onClick={() => onGoErrors?.()} style={{
              display: 'block', width: '100%', textAlign: 'left', marginTop: 14,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <span style={{ fontSize: type.size.caption, fontWeight: 700, color: data.system.errors_24h > 0 ? D.bad : D.faint }}>
                {data.system.errors_24h > 0
                  ? `⚠ ${data.system.errors_24h} server error${data.system.errors_24h === 1 ? '' : 's'} in last 24h →`
                  : '✓ No server errors in last 24h'}
              </span>
            </button>
          )}

          <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 14, lineHeight: 1.5 }}>
            {data.coverage}
          </div>

          {/* De-emphasized debug affordance — the old whoami gate-check, tucked away */}
          <div style={{ marginTop: 22, borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
            <button onClick={() => { setShowGate(v => !v); if (!whoami) runGate(); }} style={{
              background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
              cursor: 'pointer', fontFamily: D.ff,
            }}>{showGate ? '▾' : '▸'} Gate check (debug)</button>
            {showGate && (
              <pre style={{
                marginTop: 8, background: D.surface, border: `1px solid ${D.border}`,
                borderRadius: 8, padding: 12, fontSize: type.size.sm, color: D.muted, fontFamily: D.mono, overflowX: 'auto',
              }}>{whoami ? JSON.stringify(whoami, null, 2) : '— probing… —'}</pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Analytics suite (ANALYTICS-1) ────────────────────────────────────────────
// One top-level tab with horizontal sub-tabs. Executive reads the SERVER funnel
// (activation API). Funnel/Friction are LINK-OUTS to PostHog (behavioral data is
// write-only server-side — we never fabricate it here). Playbook/Memory/Cultural/
// Location read THIS browser's 'ngw-events' book via analyticsReader and carry a
// loud honesty banner: book-only, not a fleet metric.
const A_SUBTABS = ['Executive', 'Funnel', 'Friction', 'Playbook', 'Memory', 'Cultural', 'Location'];
const POSTHOG_URL = 'https://us.posthog.com';

// Read the local book once per render of a panel. Defensive parse.
function readLocalBook() {
  try { return JSON.parse(localStorage.getItem('ngw-events') || '[]'); }
  catch { return []; }
}

const BOOK_ONLY_NOTE = "This browser's book only — not a fleet metric.";

// Compact stat row used by the local-data panels.
function Stat({ label, value, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0',
      borderBottom: `1px solid ${D.border}`,
    }}>
      <span style={{ fontSize: type.size.base, color: D.text, flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: type.size.sm, color: D.faint }}>{sub}</span>}
      <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{value}</span>
    </div>
  );
}

// Mini horizontal bar for a { key: count } map.
function MiniBars({ map }) {
  const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
  const top = entries.length ? Math.max(...entries.map(([, n]) => n)) : 0;
  if (!entries.length) return <div style={{ fontSize: type.size.caption, color: D.faint }}>None.</div>;
  return (
    <div>
      {entries.map(([k, n]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
            <span style={{ fontSize: type.size.caption, color: D.text, flex: 1, wordBreak: 'break-word' }}>{k}</span>
            <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{n}</span>
          </div>
          <div style={{ height: 7, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${top > 0 ? Math.round((n / top) * 100) : 0}%`, background: D.accent, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBook() {
  return (
    <div style={{ fontSize: type.size.base, color: D.faint, padding: '24px 0', lineHeight: 1.6 }}>
      No events in this browser's book yet. Open or create an event in the app, then
      reload this console.
    </div>
  );
}

const BookBanner = () => <Banner tone="warn">{BOOK_ONLY_NOTE}</Banner>;

// Executive — KPI strip from the SERVER activation funnel (server-synced proxy).
// Tries the future overview endpoint first, degrades to activation()/triage().
function ExecutivePanel() {
  const [data, setData] = useState(null);
  const [triage, setTriage] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    // Executive overview is a future endpoint — try it, but fall back gracefully.
    try { await adminApi.overview(); } catch { /* expected 404 today — ignore */ }
    try { setData(await adminApi.activation()); }
    catch (e) { setErr(e.message); }
    try { setTriage(await adminApi.triage()); } catch { /* optional */ }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const funnel = data?.funnel;
  const top = funnel?.[0]?.count || 0;
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const triageTotal = triage?.buckets
    ? triage.buckets.reduce((a, b) => a + (Number(b.total) || (b.items || []).length), 0)
    : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Executive</div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {data?.new_signups && (
          <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.muted }}>
            <span style={{ color: D.good, fontWeight: 700 }}>+{data.new_signups.d7}</span> in 7d
            {' · '}<span style={{ color: D.muted, fontWeight: 700 }}>+{data.new_signups.d30}</span> in 30d
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {/* KPI strip — stacks on mobile via flex-wrap */}
      {data && top > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          {funnel.map((s) => (
            <div key={s.key} style={{
              flex: '1 1 120px', minWidth: 120, background: D.surface2,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: D.text, fontFamily: D.mono }}>{s.count}</div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 2 }}>{pct(s.count, top)}% of signups</div>
            </div>
          ))}
          {triageTotal !== null && (
            <div style={{
              flex: '1 1 120px', minWidth: 120, background: D.surface2,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: triageTotal > 0 ? D.warn : D.text, fontFamily: D.mono }}>{triageTotal}</div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>Need attention now</div>
              <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 2 }}>from Triage</div>
            </div>
          )}
        </div>
      )}

      {/* Funnel bars — reuse the MetricsPanel rendering. */}
      {data && top > 0 && (
        <div>
          {funnel.map((s, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            return (
              <div key={s.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{s.count}</span>
                  <span style={{ fontSize: type.size.sm, color: D.faint, width: 92, textAlign: 'right' }}>
                    {pct(s.count, top)}% of signups
                    {prev !== null && <span style={{ color: prev > 0 && s.count < prev ? D.warn : D.faint }}> · {pct(s.count, prev)}→</span>}
                  </span>
                </div>
                <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(s.count, top)}%`, background: D.accent, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && top === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No signups yet.</div>}

      <Banner tone="muted">
        {data?.coverage || 'Server-synced proxy — "synced an event" cannot tell a real qualified event from the sample. The strict behavioral funnel lives in PostHog.'}
      </Banner>
    </div>
  );
}

// Funnel / Friction — PostHog link-outs. Behavioral data is write-only server-side;
// we never fabricate it. Each is a short explainer + an "Open in PostHog ↗" button.
function PostHogLinkPanel({ title, body }) {
  return (
    <div>
      <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{title}</div>
      <Banner tone="muted">
        The behavioral {title.toLowerCase()} lives in PostHog. NGW writes events to
        PostHog server-side (write-only) — this console cannot read them back, so no
        numbers are shown here. Open PostHog for the live charts.
      </Banner>
      <div style={{ fontSize: type.size.base, color: D.muted, lineHeight: 1.6, marginBottom: 16 }}>{body}</div>
      <a href={POSTHOG_URL} target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-block', background: D.accent, color: '#fff', textDecoration: 'none',
        border: `1px solid ${D.accent}`, borderRadius: 6, padding: '8px 16px',
        fontSize: type.size.base, fontWeight: 600, fontFamily: D.ff,
      }}>Open in PostHog ↗</a>
    </div>
  );
}

// Funnel / Friction via the PostHog HogQL proxy. Tries the server proxy; if it isn't
// configured (key absent) or errors, falls back to the honest PostHogLinkPanel.
function PostHogPanel({ mode }) {  // mode: 'funnel' | 'friction'
  const [data, setData] = useState(null);
  const [breakdowns, setBreakdowns] = useState(null);
  const [state, setState] = useState('loading');  // loading | native | fallback

  const load = useCallback(async () => {
    setState('loading');
    try {
      const f = await adminApi.posthogFunnel(30);
      if (!f || f.configured === false || !Array.isArray(f.funnel)) { setState('fallback'); return; }
      setData(f);
      if (mode === 'funnel') {
        const [voice, market, host] = await Promise.all([
          adminApi.posthogBreakdown('voice', 30).catch(() => null),
          adminApi.posthogBreakdown('market', 30).catch(() => null),
          adminApi.posthogBreakdown('is_host', 30).catch(() => null),
        ]);
        setBreakdowns({ voice, market, host });
      }
      setState('native');
    } catch { setState('fallback'); }
  }, [mode]);
  useEffect(() => { load(); }, [load]);

  if (state === 'loading') return <div style={{ fontSize: type.size.base, color: D.faint }}>Loading from PostHog…</div>;
  if (state === 'fallback') {
    return mode === 'friction'
      ? <PostHogLinkPanel title="Friction" body="Where users stall, drop off, or rage-click. Session and event-stream analysis lives in PostHog — open it to inspect paths and retention." />
      : <PostHogLinkPanel title="Funnel" body="Sign-up → first event → qualified → completed → second event. Each step is a server-side PostHog event; the conversion funnel is built and filtered in PostHog." />;
  }

  const funnel = data.funnel || [];
  const top = funnel[0]?.count || 0;
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const bdRows = (b) => (b && b.configured && Array.isArray(b.rows)) ? b.rows : [];

  if (mode === 'friction') {
    return (
      <div>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Friction — where they drop (PostHog · 30d)</div>
        <button onClick={load} style={{ background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm, cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline', marginBottom: 12 }}>refresh</button>
        {funnel.slice(1).map((s, i) => {
          const prev = funnel[i];
          const conv = pct(s.count, prev.count);
          const drop = 100 - conv;
          const worst = drop >= 40;
          return (
            <div key={s.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: type.size.base, color: D.text, marginBottom: 4 }}>
                <span>{prev.label} → {s.label}</span>
                <span style={{ color: worst ? D.warn : D.muted, fontWeight: 700, fontFamily: D.mono }}>{conv}% kept · {drop}% lost{worst ? ' ◀ biggest leak' : ''}</span>
              </div>
              <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${conv}%`, background: worst ? D.warn : D.accent, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Real-event funnel (PostHog · 30d)</div>
      <button onClick={load} style={{ background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm, cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline', marginBottom: 12 }}>refresh</button>
      {top === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No events in this window yet.</div>}
      {funnel.map((s, i) => (
        <div key={s.key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{s.count}</span>
            <span style={{ fontSize: type.size.sm, color: D.faint, width: 96, textAlign: 'right' }}>{pct(s.count, top)}% of top{i > 0 && funnel[i - 1].count > 0 ? ` · ${pct(s.count, funnel[i - 1].count)}→` : ''}</span>
          </div>
          <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct(s.count, top)}%`, background: D.accent, borderRadius: 4 }} />
          </div>
        </div>
      ))}
      {breakdowns && ['voice', 'market', 'host'].map(k => {
        const rows = bdRows(breakdowns[k]);
        if (!rows.length) return null;
        const label = k === 'host' ? 'Host vs planner' : k === 'voice' ? 'By occasion' : 'By market';
        const map = {}; rows.forEach(r => { map[r.value] = r.count; });
        return (
          <div key={k} style={{ marginTop: 16 }}>
            <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
            <MiniBars map={map} />
          </div>
        );
      })}
    </div>
  );
}

function PlaybookPanel({ book }) {
  const c = playbookCoverage(book);
  if (c.total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  const matched = c.total - c.unmatchedTypes.reduce((a, t) => a + (c.byType[t] || 0), 0);
  const f = funnelContent(book);
  return (
    <div>
      <BookBanner />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label="Events in book" value={c.total} />
      </div>
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 0 8px' }}>Events by type</div>
      <MiniBars map={c.byType} />
      <div style={{ marginTop: 16 }}>
        <Stat label="Events with a matched playbook" value={matched} sub={`${c.total - matched} unmatched`} />
      </div>
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Local content completeness</div>
      <Stat label="Qualified (has date + guest count)" value={f.qualified} sub={`of ${f.total}`} />
      <Stat label="Has a run-of-show" value={f.withRos} sub={`of ${f.total}`} />
      <Stat label="Has captured outcomes" value={f.withOutcomes} sub={`of ${f.total}`} />
      <Stat label="Has recorded decisions" value={f.withDecisions} sub={`of ${f.total}`} />
      {c.unmatchedTypes.length > 0 && (
        <Banner tone="muted">
          No playbook for: {c.unmatchedTypes.join(', ')}. These types fall back to the
          generic path — candidates for a new playbook data file.
        </Banner>
      )}
    </div>
  );
}

function MemoryPanel({ book }) {
  const m = memoryDepth(book);
  const total = playbookCoverage(book).total;
  if (total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  return (
    <div>
      <BookBanner />
      <Stat label="Events with captured outcomes" value={m.eventsWithOutcomes} />
      <Stat label="Events with a written lesson" value={m.eventsWithLessons} />
      <Stat label="Confirmed vendors tracked" value={m.vendorsTracked} />
      <Stat label="Vendors rehired (≥2 events)" value={m.rehiredVendors} />
      <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 12, lineHeight: 1.5 }}>
        Rehires are the compounding signal — a vendor confirmed across two or more
        events in this private book.
      </div>
    </div>
  );
}

function CulturalPanel({ book }) {
  const m = culturalMix(book);
  if (m.total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  return (
    <div>
      <BookBanner />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 120px', minWidth: 120, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: D.text, fontFamily: D.mono }}>{m.festive}</div>
          <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>Festive</div>
        </div>
        <div style={{ flex: '1 1 120px', minWidth: 120, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: D.text, fontFamily: D.mono }}>{m.sombre}</div>
          <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>Sombre / remembrance</div>
        </div>
      </div>
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 0 8px' }}>By voice</div>
      <MiniBars map={m.byVoice} />
    </div>
  );
}

function LocationPanel({ book }) {
  const s = locationSpread(book);
  if (s.total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  const pct = (x) => `${Math.round(x * 100)}%`;
  return (
    <div>
      <BookBanner />
      <Stat label="At-home share" value={pct(s.atHomeShare)} />
      <Stat label="Missing-venue share" value={pct(s.missingVenueShare)} />
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>By market</div>
      <MiniBars map={s.byMarket} />
    </div>
  );
}

// ── INTEL-QA-1 Stage 1A — Intelligence Observatory (evaluation CAPTURE visibility) ───────────────
// Admin-only (this panel renders only inside the role-gated AdminConsole). Reads THIS browser's book
// via evaluationAudit — a pure, capture-only reader. NO scoring, NO grades, NO learning: the copy is
// deliberately honest about that. Never crashes on missing/malformed intelEvaluations.
const IE = { eyebrow: { fontSize: type.size.eyebrow || type.size.caption, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.muted, margin: '22px 0 10px' } };
function IntelKpi({ label, value, tone }) {
  return (
    <div style={{ background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '11px 13px', minWidth: 118, flex: '1 0 118px' }}>
      <div style={{ fontSize: type.size.xl, fontWeight: 700, color: tone || D.text, fontFamily: D.mono }}>{value}</div>
      <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}
function IEBlock({ title, obj }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 4 }}>{title}</div>
      <pre style={{ margin: 0, fontSize: type.size.sm, color: D.text, fontFamily: D.mono, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(obj ?? null, null, 2)}</pre>
    </div>
  );
}
function IntelligencePanel({ book }) {
  const [filter, setFilter] = useState('');
  const [decision, setDecision] = useState('All');
  const [sel, setSel] = useState(null); // { eventId, recId }
  // Stage 1C — server-fleet first, client-book fallback. The server endpoint may 404 until the
  // backend implements it; on ANY failure we degrade to this browser's book. Never fakes fleet data.
  const [server, setServer] = useState({ status: isAdminApiConfigured() ? 'loading' : 'unconfigured', data: null });
  useEffect(() => {
    if (!isAdminApiConfigured()) return undefined;
    let live = true;
    adminApi.intelligence()
      .then((d) => { if (live) setServer({ status: 'ok', data: d }); })
      .catch(() => { if (live) setServer({ status: 'error', data: null }); });
    return () => { live = false; };
  }, []);
  const useServer = server.status === 'ok' && !!server.data && !!(server.data.audit || server.data.totals);
  let audit = null, conv = null;
  if (useServer) {
    const d = server.data.audit || server.data;
    audit = { totals: d.totals || {}, funnel: Array.isArray(d.funnel) ? d.funnel : [], records: Array.isArray(d.records) ? d.records : [], integrity: Array.isArray(d.integrity) ? d.integrity : [], scannedEvents: d.scannedEvents ?? null, eventsWithEvaluations: d.eventsWithEvaluations ?? null };
    conv = server.data.conversion || null;
  } else {
    try { audit = evaluationAudit(book); } catch { audit = null; }
    try { conv = conversionAudit(book); } catch { conv = null; }
  }
  const src = useServer ? 'Server Fleet' : 'This Browser';
  const srcMsg = useServer ? 'Server fleet data — admin scope.'
    : server.status === 'error' ? 'Fleet intelligence unavailable — showing this browser only.'
    : server.status === 'loading' ? 'Loading fleet data…'
    : 'Admin API not configured — showing this browser only.';
  const SourceBadge = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: type.size.caption, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: useServer ? `${D.good}22` : `${D.warn}22`, color: useServer ? D.good : D.warn }}>{src}</span>
      <span style={{ fontSize: type.size.caption, color: D.muted }}>{srcMsg}</span>
    </div>
  );
  if (!audit) return (<div><SourceBadge /><Banner tone="bad">Could not read evaluation data (safe fallback — nothing scored).</Banner></div>);
  const T = audit.totals || {};
  const pendingActualsCount = (audit.integrity || []).filter(i => i.code === 'missing_actual').length;
  const ctrl = { background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '7px 10px', fontFamily: D.ff, outline: 'none' };

  if (!T.records) {
    return (
      <div>
        <SourceBadge />
        {!useServer && <BookBanner />}
        <Banner tone="muted">Capture only — Scoring not started · Learning loop not active yet.</Banner>
        <div style={{ fontSize: type.size.base, color: D.faint, padding: '24px 0', lineHeight: 1.6 }}>No recommendation records {useServer ? 'in the fleet scope' : "in this browser's book"} yet. When R1 shows a recommendation on an event, a record is frozen.</div>
      </div>
    );
  }

  const rows = audit.records.filter((r) => (decision === 'All' || r.decision === decision) && (!filter || `${r.eventLabel} ${r.reader} ${r.recommendationType}`.toLowerCase().includes(filter.toLowerCase())));
  const drill = sel ? (() => { const e = (book || []).find((x) => x && x.id === sel.eventId); const rec = e && (e.intelEvaluations || []).find((r) => r && r.id === sel.recId); return rec ? { rec, event: e } : null; })() : null;
  const th = { textAlign: 'left', padding: '7px 10px', fontSize: type.size.caption, color: D.muted, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', fontSize: type.size.caption, color: D.text, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' };

  return (
    <div>
      <SourceBadge />
      {!useServer && <BookBanner />}
      <Banner tone="muted">Capture + integrity only. Scoring not started · Learning loop not active yet · Better-than-baseline pending (Stage 2).</Banner>
      {useServer && (
        <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 12, lineHeight: 1.5, padding: '8px 12px', borderRadius: 7, background: D.surface2, border: `1px solid ${D.border}` }}>
          <strong style={{ color: D.text }}>Server Fleet scope:</strong> Server Fleet only includes server-synced events. Local-only and sample events are not included in fleet counts or recommendation records.
        </div>
      )}
      {!useServer && (
        <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 12, lineHeight: 1.5, padding: '8px 12px', borderRadius: 7, background: D.surface2, border: `1px solid ${D.border}` }}>
          <strong style={{ color: D.text }}>Browser book scope:</strong> This view shows only this browser's local events. Local-only and sample events are included here; they are excluded from Server Fleet counts.
        </div>
      )}

      <div style={IE.eyebrow}>Overview</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        <IntelKpi label="Events scanned" value={audit.scannedEvents} />
        <IntelKpi label="Events w/ evaluations" value={audit.eventsWithEvaluations} />
        <IntelKpi label="Recommendation records" value={T.records} />
        <IntelKpi label="Shown" value={T.shown} />
        <IntelKpi label="Accepted" value={T.accepted} />
        <IntelKpi label="Reverted" value={T.reverted} />
        <IntelKpi label="Overridden" value={T.overridden} />
        <IntelKpi label="Actuals attached" value={T.actualsAttached} />
        <IntelKpi label="Evaluation-ready" value={T.evaluationReady} />
        <IntelKpi label="Malformed" value={T.malformed} tone={T.malformed ? D.bad : undefined} />
        <IntelKpi label="Duplicate warnings" value={T.duplicateWarnings} tone={T.duplicateWarnings ? D.bad : undefined} />
        <IntelKpi label="Pending actuals" value={pendingActualsCount} tone={pendingActualsCount > 0 ? D.warn : undefined} />
      </div>

      {pendingActualsCount > 0 && (
        <Banner tone="warn">
          {pendingActualsCount} accepted recommendation{pendingActualsCount !== 1 ? 's' : ''} on past event{pendingActualsCount !== 1 ? 's' : ''} {pendingActualsCount === 1 ? 'is' : 'are'} missing actual outcomes — evaluation readiness is blocked until hosts enter their final guest count.
        </Banner>
      )}

      <div style={IE.eyebrow}>Recommendation lifecycle funnel</div>
      {audit.funnel.map((f) => (
        <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          <span style={{ width: 128, flexShrink: 0, fontSize: type.size.caption, color: D.muted, textTransform: 'capitalize' }}>{f.stage}</span>
          {f.available ? (
            <>
              <div style={{ height: 13, background: D.accent, borderRadius: 3, width: `${Math.max(2, Math.round(((f.value || 0) / Math.max(1, T.records)) * 240))}px`, opacity: 0.85 }} />
              <span style={{ fontFamily: D.mono, fontSize: type.size.sm, color: D.text }}>{f.value}</span>
            </>
          ) : (
            <span style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>unavailable — {f.note}</span>
          )}
        </div>
      ))}

      <div style={IE.eyebrow}>Data integrity</div>
      {audit.integrity.length === 0
        ? <div style={{ fontSize: type.size.base, color: D.good }}>✓ No integrity issues detected.</div>
        : audit.integrity.map((i, idx) => (
          <div key={idx} style={{ fontSize: type.size.caption, color: i.level === 'error' ? D.bad : D.warn, padding: '3px 0' }}>
            {i.level === 'error' ? '✕' : '⚠'} <span style={{ fontFamily: D.mono }}>[{i.code}]</span> {i.message} <span style={{ color: D.faint }}>· {i.eventId || '—'}</span>
          </div>
        ))}

      <div style={IE.eyebrow}>Evaluation records</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by event / reader / type…" style={{ ...ctrl, flex: 1 }} />
        <select value={decision} onChange={(e) => setDecision(e.target.value)} style={ctrl}>{['All', 'Accepted', 'Reverted', 'Overridden', 'Pending'].map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
          <thead><tr>{['Event', 'Type', 'Reader', 'Recommendation', 'Baseline', 'Decision', 'Actual', 'Eval-ready', 'Engine', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.eventId + i}>
                <td style={td}>{r.eventLabel}</td>
                <td style={td}>{r.recommendationType}</td>
                <td style={td}>{r.reader}</td>
                <td style={td}>{r.snapshot ? `${r.snapshot.from} → ${r.snapshot.to}` : '—'}</td>
                <td style={td}>{r.baselinePresent ? 'yes' : <span style={{ color: D.warn }}>no</span>}</td>
                <td style={td}>{r.decision}</td>
                <td style={td}>{r.actualAttached ? 'attached' : <span style={{ color: D.faint }}>pending</span>}</td>
                <td style={td}>{r.evaluationReady ? 'ready' : <span style={{ color: D.faint }}>pending</span>}</td>
                <td style={td}>{r.reader} v{r.engine ?? '?'} · rec v{r.version ?? '?'}</td>
                <td style={td}><button onClick={() => setSel({ eventId: r.eventId, recId: `${r.reader}:${r.eventId}` })} style={{ ...ctrl, cursor: 'pointer', padding: '4px 10px' }}>view</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conv && (
        <>
          <div style={IE.eyebrow}>Conversion — local acceptance &amp; reconciliation</div>
          <div style={{ fontSize: type.size.caption, color: D.faint, marginBottom: 8, lineHeight: 1.5 }}>This browser only · "conversion" = the recommendation's lifecycle outcome, NOT a purchase. Paid / CTA / signup conversion is behavioral (PostHog) — see Unavailable below.</div>
          {conv.funnel.map((f) => (
            <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <span style={{ width: 180, flexShrink: 0, fontSize: type.size.caption, color: D.muted }}>{f.stage}</span>
              <span style={{ fontFamily: D.mono, fontSize: type.size.sm, color: D.text }}>{f.value}</span>
              {f.pct != null && <span style={{ fontSize: type.size.caption, color: D.faint }}>· {f.pct}%</span>}
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {Object.values(conv.rates).map((r) => <IntelKpi key={r.label} label={r.label} value={r.pct == null ? '—' : r.pct + '%'} />)}
          </div>
          {['byType', 'byConfidence', 'byReader', 'byEngine'].map((dim) => {
            const rows = conv.byDimension[dim]; if (!rows.length) return null;
            const title = { byType: 'By type', byConfidence: 'By confidence', byReader: 'By reader', byEngine: 'By engine' }[dim];
            return (
              <div key={dim} style={{ marginTop: 12 }}>
                <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 4 }}>{title}</div>
                {rows.map((g) => <div key={g.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: type.size.caption, color: D.text, padding: '3px 0' }}><span>{g.key}</span><span style={{ color: D.muted }}>{g.shown} shown · {g.accepted} acc · {g.reverted} rev · {g.acceptRate == null ? '—' : g.acceptRate + '%'}</span></div>)}
              </div>
            );
          })}
          <div style={{ ...IE.eyebrow, marginTop: 18 }}>Unavailable — behavioral conversion (PostHog)</div>
          {conv.unavailable.map((u, i) => (
            <div key={i} style={{ padding: '6px 0', borderTop: `1px solid ${D.border}` }}>
              <div style={{ fontSize: type.size.caption, color: D.warn, fontWeight: 700 }}>⚠ {u.metric}</div>
              <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 2 }}>{u.reason}</div>
              <div style={{ fontSize: type.size.caption, color: D.faint, marginTop: 2 }}>Needs: {u.needs}</div>
            </div>
          ))}
        </>
      )}

      {/* INTEL-QA-1 Sync Status Visibility — dev/debug sync list (never shown in production) */}
      {process.env.NODE_ENV !== 'production' && Array.isArray(book) && book.length > 0 && (() => {
        const _isCloud = isSupabaseConfigured() && hasSupabaseSession();
        const _hasSynced = !!getLastSyncTime();
        const _lastSync = getLastSyncTime();
        const syncRows = book.map(e => makeEventSyncRow(e, { isSample: false, isCloudSession: _isCloud, hasSynced: _hasSynced }, _lastSync));
        const thDev = { textAlign: 'left', padding: '5px 8px', fontSize: type.size.caption, color: D.muted, borderBottom: `1px solid ${D.border}` };
        const tdDev = { padding: '5px 8px', fontSize: type.size.caption, color: D.text, borderBottom: `1px solid ${D.border}`, fontFamily: D.mono };
        return (
          <div style={{ marginTop: 18 }}>
            <div style={IE.eyebrow}>Dev — Event sync status list</div>
            <div style={{ fontSize: type.size.caption, color: D.faint, marginBottom: 8, lineHeight: 1.5 }}>
              Dev/QA only · No PII · Derived from session state (isCloudSession={String(_isCloud)}, hasSynced={String(_hasSynced)}, lastSync={_lastSync || 'none'})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr>
                  {['ID', 'Name', 'Sync status', 'Has intel', 'Last sync'].map(h => <th key={h} style={thDev}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {syncRows.map(r => (
                    <tr key={r.id}>
                      <td style={tdDev}>{r.id}</td>
                      <td style={{ ...tdDev, fontFamily: 'inherit' }}>{r.name || '—'}</td>
                      <td style={{ ...tdDev, color: r.syncStatus === 'server-synced' ? D.good : r.syncStatus === 'unknown' ? D.warn : D.muted }}>
                        {SYNC_STATUS_LABEL[r.syncStatus] || r.syncStatus}
                      </td>
                      <td style={{ ...tdDev, color: r.hasIntel ? D.good : D.faint }}>{r.hasIntel ? 'yes' : 'no'}</td>
                      <td style={tdDev}>{r.updatedAt || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {drill && (
        <div style={{ marginTop: 18, border: `1px solid ${D.border}`, borderRadius: 8, padding: 14, background: D.surface }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: D.text }}>{drill.rec.id} <span style={{ color: D.faint, fontWeight: 400 }}>· {drill.rec.readerId}</span></div>
            <button onClick={() => setSel(null)} style={{ ...ctrl, cursor: 'pointer' }}>close</button>
          </div>
          <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 4 }}>Actual attached: {drill.rec.actual ? 'yes' : 'no'} · Better-than-baseline pending (Stage 2 scoring not started)</div>
          <IEBlock title="Frozen recommendation snapshot" obj={drill.rec.recommendation} />
          <IEBlock title="Baseline (today's default)" obj={drill.rec.baseline} />
          <IEBlock title="Counterfactual (default / reader / host / actual)" obj={drill.rec.counterfactual} />
          <IEBlock title="Lifecycle (append-only history)" obj={drill.rec.lifecycle} />
          <IEBlock title="Actual (write-once, real only)" obj={drill.rec.actual} />
          <IEBlock title="Reserved — evaluation (Stage 2)" obj={drill.rec.evaluation} />
          <IEBlock title="Reserved — utility (future)" obj={drill.rec.utility} />
          {(() => { const iss = audit.integrity.filter((x) => x.recId === drill.rec.id); return iss.length ? <IEBlock title="Integrity warnings" obj={iss} /> : <div style={{ marginTop: 10, fontSize: type.size.caption, color: D.good }}>✓ No integrity issues on this record.</div>; })()}
        </div>
      )}
    </div>
  );
}

// ── Admin Settings — session, environment, feature flags, and safe actions ───────────────────────
function AdminSettingsPanel() {
  const { user, bypass, signOut, configured } = useAuth();
  const role = (user && user.app_metadata && user.app_metadata.role) || '—';
  const email = (user && user.email) || '—';
  const flag = (fn) => { try { return fn() ? 'on' : 'off'; } catch { return '?'; } };
  const piFlags = (() => { try { return Object.keys(localStorage).filter((k) => /^ngw-pi-/.test(k)).map((k) => [k.replace(/^ngw-/, ''), localStorage.getItem(k)]); } catch { return []; } })();
  const Head = ({ children }) => <div style={{ fontSize: type.size.caption, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, margin: '22px 0 8px' }}>{children}</div>;
  const btn = { background: D.surface2, border: `1px solid ${D.border}`, color: D.text, borderRadius: 8, padding: '9px 15px', cursor: 'pointer', fontFamily: D.ff, fontSize: type.size.caption };
  return (
    <div style={{ maxWidth: 560 }}>
      <Head>Session</Head>
      <Stat label="Signed in as" value={email} />
      <Stat label="Role" value={role} />
      <Stat label="Session type" value={bypass ? 'Dev bypass' : 'Supabase'} />
      <Head>Environment</Head>
      <Stat label="Admin API" value={isAdminApiConfigured() ? 'configured' : 'not configured (local-only)'} />
      <Stat label="Auth backend" value={configured ? 'Supabase' : 'bypass'} />
      <Head>Feature flags (read-only)</Head>
      <Stat label="pi.shell — host shell" value={flag(hostShellOn)} />
      <Stat label="pi.planV2 — plan v2" value={flag(planV2On)} />
      {piFlags.length > 0
        ? piFlags.map(([k, v]) => <Stat key={k} label={k} value={String(v)} />)
        : <div style={{ fontSize: type.size.caption, color: D.faint, padding: '6px 0' }}>No pi-* overrides set in this browser.</div>}
      <div style={{ fontSize: type.size.caption, color: D.faint, marginTop: 8, lineHeight: 1.5 }}>Flags are set via env / URL (e.g. <span style={{ fontFamily: D.mono }}>?devrole=admin</span>), not edited here — this panel shows their resolved state.</div>
      <Head>Console</Head>
      <div style={{ fontSize: type.size.base, color: D.muted, lineHeight: 1.5 }}>The <strong style={{ color: D.text }}>Intelligence</strong> tab shows evaluation capture health for this browser's book. Behavioral trust (accept vs revert) lives in PostHog.</div>
      <Head>Actions</Head>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button style={btn} onClick={() => window.location.reload()}>Reload console</button>
        {signOut && <button style={{ ...btn, background: 'transparent' }} onClick={() => { if (window.confirm('Sign out of the admin console?')) signOut(); }}>Sign out</button>}
      </div>
      <div style={{ marginTop: 18 }}><Banner tone="muted">Admin settings are per-session. Flags are read-only here (set via env/URL). Extend this panel as operator controls are needed.</Banner></div>
    </div>
  );
}

function AnalyticsSuite() {
  const [sub, setSub] = useState('Executive');
  // Read the local book once per sub-tab change (cheap; panels re-derive).
  const book = readLocalBook();

  return (
    <div>
      {/* Sub-tabs — horizontally scrollable on mobile */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 18, paddingBottom: 6,
        overflowX: 'auto', borderBottom: `1px solid ${D.border}`, WebkitOverflowScrolling: 'touch',
      }}>
        {A_SUBTABS.map(s => (
          <button key={s} onClick={() => setSub(s)} style={{
            flex: '0 0 auto',
            background: sub === s ? D.surface2 : 'transparent',
            color: sub === s ? D.text : D.muted,
            border: `1px solid ${sub === s ? D.border : 'transparent'}`,
            borderRadius: 6, padding: '6px 12px', fontSize: type.size.caption, cursor: 'pointer',
            fontFamily: D.ff, whiteSpace: 'nowrap',
          }}>{s}</button>
        ))}
      </div>

      {sub === 'Executive' && <ExecutivePanel />}
      {sub === 'Funnel' && <PostHogPanel mode="funnel" />}
      {sub === 'Friction' && <PostHogPanel mode="friction" />}
      {sub === 'Playbook' && <PlaybookPanel book={book} />}
      {sub === 'Memory' && <MemoryPanel book={book} />}
      {sub === 'Cultural' && <CulturalPanel book={book} />}
      {sub === 'Location' && <LocationPanel book={book} />}
    </div>
  );
}

// ─── KCR Studio — the governed knowledge production backlog (KCR-2 gap 5) ─────
// A READ view of the KCR pipeline: the Command Center research queue (+ future sources)
// reconciled into the persisted backlog, shown by lifecycle stage. No publish action UI
// yet (parked) — this proves the intake→backlog→pipeline surface. Reuses the admin palette.
const KCR_STATUS_COLOR = {
  draft: D.faint, researching: D.accent, grounded: '#7aa2c8', review: D.warn,
  approved: D.good, published: D.good, monitoring: D.muted, revision: D.warn, archived: D.faint,
};

// KEP-3 — Knowledge Acquisition operational console. The production admin surface for the
// acquisition layer: provider families + status, acquisition health, campaign participation,
// and observation/evidence/finding/KCR counts. HONEST-EMPTY — no fabricated metrics; where
// nothing has been collected it says "No data collected yet" / "Awaiting acquisition", and
// architecture-only capabilities read "Available" / "Configured", never "running". Read-only,
// admin. Reuses buildProviders / campaigns / observation+evidence stores — no parallel model.
function AcquisitionConsole() {
  const providers = buildProviders();
  const campaigns = loadCampaigns();
  const observations = loadObservations();
  const evidence = loadEvidence();
  const findings = campaigns.filter((c) => c.finding).length;
  const generatedKCRs = campaigns.filter((c) => c.result && c.result.kcr).length;
  const serverOn = isKasApiConfigured();

  const bySource = (list, id) => list.filter((x) => x.source === id).length;
  const campaignsFor = (id) => campaigns.filter((c) => (c.providerIds || []).includes(id)).length;
  const statusOf = (p) => {
    if (bySource(observations, p.id) || bySource(evidence, p.id)) return { label: 'Active', tone: D.good };
    if (p.family === 'internal-validation') return { label: 'Configured', tone: D.accent };
    return { label: 'Available', tone: D.muted }; // interface ready, awaiting acquisition (not running)
  };
  const families = [...new Set(providers.map((p) => p.family))];

  const th = { textAlign: 'left', fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` };
  const td = { padding: '8px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55` };
  const empty = (n, unit) => (n ? `${n} ${unit}` : <span style={{ color: D.faint, fontStyle: 'italic' }}>No data collected yet</span>);

  return (
    <div>
      <Banner>Knowledge Acquisition — the operational console for how knowledge enters the platform. Providers produce Observations only; everything flows through the KCR pipeline (nothing auto-publishes). No fabricated metrics: empty means no acquisition has run yet.</Banner>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <PBKpi label="Providers" value={providers.length} />
        <PBKpi label="Families" value={families.length} />
        <PBKpi label="Campaigns" value={campaigns.length} tone={campaigns.length ? D.accent : D.faint} />
        <PBKpi label="Observations" value={observations.length} tone={observations.length ? D.text : D.faint} />
        <PBKpi label="Evidence" value={evidence.length} tone={evidence.length ? D.text : D.faint} />
        <PBKpi label="Findings" value={findings} tone={findings ? D.text : D.faint} />
        <PBKpi label="KCRs generated" value={generatedKCRs} tone={generatedKCRs ? D.good : D.faint} />
      </div>

      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: type.size.caption, color: D.muted, fontFamily: D.mono }}>
        acquisition health · external acquisition <span style={{ color: D.good }}>ON</span> · server sync {serverOn ? <span style={{ color: D.good }}>configured</span> : <span style={{ color: D.faint }}>local-only (awaiting backend)</span>} · providers route to KCR (no auto-publish)
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${D.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Provider', 'Family', 'Authority', 'Freshness', 'Status', 'Observations', 'Evidence', 'Campaigns'].map((h) => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {providers.map((p) => {
              const s = statusOf(p);
              const o = bySource(observations, p.id); const e = bySource(evidence, p.id); const c = campaignsFor(p.id);
              return (
                <tr key={p.id}>
                  <td style={{ ...td, color: D.text, fontWeight: 600 }}>{p.id}</td>
                  <td style={{ ...td, color: D.muted, fontFamily: D.mono, fontSize: 11 }}>{p.family}</td>
                  <td style={{ ...td, color: D.muted, fontFamily: D.mono, fontSize: 11 }}>{p.authorityLevel}</td>
                  <td style={{ ...td, color: D.faint, fontFamily: D.mono, fontSize: 11 }}>{p.freshnessDays}d</td>
                  <td style={td}><span style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${s.tone}1e`, color: s.tone }}>{s.label}</span></td>
                  <td style={{ ...td, color: o ? D.text : D.faint, fontFamily: D.mono }}>{o || '—'}</td>
                  <td style={{ ...td, color: e ? D.text : D.faint, fontFamily: D.mono }}>{e || '—'}</td>
                  <td style={{ ...td, color: c ? D.accent : D.faint, fontFamily: D.mono }}>{c || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: type.size.caption, color: D.faint }}>
        Observations across all providers: {empty(observations.length, 'collected')} · Evidence: {empty(evidence.length, 'records')}. External providers are <strong style={{ color: D.muted }}>Available</strong> (interface configured, run via a campaign); <strong style={{ color: D.muted }}>internal-validation</strong> derives from our own event outcomes. Fetch executes via agent/backend — the app never crawls.
      </div>

      {/* Provider Health (Bundle C) */}
      <ProviderHealthPanel providers={providers} />
    </div>
  );
}

function ProviderHealthPanel({ providers }) {
  const events = loadProviderEvents();
  const health = buildProviderHealth(events, providers);
  const STATUS_COLOR = { healthy: D.good, 'low-yield': D.warn, degraded: D.bad, 'no-data': D.faint };
  const th = { textAlign: 'left', fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` };
  const td = { padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55` };
  const hasData = events.length > 0;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Provider health (Bundle C)</div>
      {!hasData && <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic', marginBottom: 10 }}>No acquisition events recorded yet. Health metrics populate as campaigns run through providers.</div>}
      <div style={{ overflowX: 'auto', border: `1px solid ${D.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Provider', 'Status', 'Runs', 'Success %', 'Avg evidence', 'Empty', 'Errors', 'Last run'].map((h) => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {health.map((h) => (
              <tr key={h.id}>
                <td style={{ ...td, color: D.text, fontWeight: 600 }}>{h.id}</td>
                <td style={td}><span style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${STATUS_COLOR[h.status]}1e`, color: STATUS_COLOR[h.status] }}>{h.status}</span></td>
                <td style={{ ...td, color: h.totalRuns ? D.text : D.faint, fontFamily: D.mono }}>{h.totalRuns || '—'}</td>
                <td style={{ ...td, color: h.successRate != null ? (h.successRate >= 70 ? D.good : h.successRate >= 40 ? D.warn : D.bad) : D.faint, fontFamily: D.mono }}>{h.successRate != null ? `${h.successRate}%` : '—'}</td>
                <td style={{ ...td, color: h.avgEvidence != null ? D.muted : D.faint, fontFamily: D.mono }}>{h.avgEvidence ?? '—'}</td>
                <td style={{ ...td, color: h.emptyCount ? D.warn : D.faint, fontFamily: D.mono }}>{h.emptyCount || '—'}</td>
                <td style={{ ...td, color: h.errorCount ? D.bad : D.faint, fontFamily: D.mono }}>{h.errorCount || '—'}</td>
                <td style={{ ...td, color: D.faint, fontFamily: D.mono, fontSize: 10 }}>{h.lastRunAt || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// KCR-6 — the governed publishing action bar. Renders the actions for the KCR's current
// stage, gated by BOTH the pipeline gate (kcrGateStatus) AND the caller's role capability
// (kcrCan). Every action applies a PURE transition then upsertKCR (optimistic concurrency
// + server audit). The pipeline fns throw if a gate is unmet, surfaced as a "Blocked:" note
// — so the UI can never weaken governance (hard rule). Nothing publishes without an
// approved KCR; no auto-mutation.
function KcrActions({ kcr, role, asOf, onChanged }) {
  const [ev, setEv] = useState('');
  const [prop, setProp] = useState('');
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retireReason, setRetireReason] = useState('');   // 5F.8 — a retirement states its reason
  const gate = kcrGateStatus(kcr);

  const run = async (mutator, label) => {
    setBusy(true); setNote(null);
    try {
      const next = mutator(kcr);
      const res = await upsertKCR(next);
      setNote(res && res.conflict ? '⚠ Another admin changed this — refreshed to their version.' : `${label} ✓`);
      await onChanged();
    } catch (e) { setNote(`Blocked: ${e.message}`); }
    finally { setBusy(false); }
  };

  const B = ({ label, on, cap, enabled = true, primary = false }) => {
    const allowed = kcrCan(role, cap) && enabled && !busy;
    return (
      <button type="button" disabled={!allowed} onClick={on}
        title={kcrCan(role, cap) ? '' : `Requires ${cap} (your role: ${role || 'none'})`}
        style={{ padding: '5px 11px', borderRadius: 6, fontSize: type.size.caption, fontFamily: D.ff,
          border: `1px solid ${primary ? D.accent : D.border}`, background: primary && allowed ? D.accent : 'transparent',
          color: primary && allowed ? '#fff' : allowed ? D.text : D.faint, cursor: allowed ? 'pointer' : 'not-allowed', opacity: allowed ? 1 : 0.5 }}>
        {label}
      </button>
    );
  };
  const input = (val, setVal, ph) => (
    <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={ph}
      style={{ flex: 1, minWidth: 120, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 8px', fontFamily: D.ff }} />
  );
  const s = kcr.status;
  const revRow = (g, label) => {
    const dec = kcr.review && kcr.review[g];
    return (
      <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
        <span style={{ fontSize: type.size.caption, color: D.muted, width: 90 }}>{label}</span>
        {dec ? <span style={{ fontFamily: D.mono, fontSize: 11, color: dec.decision === 'approve' ? D.good : D.bad }}>{dec.decision} · {dec.by}</span>
          : <>
            <B label="Approve" cap={`review:${g}`} on={() => run((k) => recordReview(k, g, { by: role || 'admin', decision: 'approve' }, asOf), `${label} approved`)} />
            <B label="Reject" cap={`review:${g}`} on={() => run((k) => recordReview(k, g, { by: role || 'admin', decision: 'reject' }, asOf), `${label} rejected`)} />
          </>}
      </div>
    );
  };

  return (
    <div style={{ border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, background: D.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pipeline</span>
        <span style={{ fontFamily: D.mono, fontSize: 11, color: D.text }}>{gate.stage}{gate.next ? ` → ${gate.next}` : ''}</span>
        {gate.blocked && <span style={{ fontSize: type.size.caption, color: D.warn }}>· {gate.blocked}</span>}
      </div>

      {s === 'draft' && <B label="Start research" primary cap="request-review" on={() => run((k) => advanceKCR(k, 'researching', { by: role, asOf }), 'Started research')} />}

      {s === 'researching' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {input(ev, setEv, 'Evidence source / citation')}
          <B label="Add evidence" cap="evidence" enabled={!!ev.trim()} on={() => run((k) => addEvidence(k, { source: ev.trim(), sourceType: 'citation', by: role }, asOf), 'Evidence added').then(() => setEv(''))} />
          <B label="Mark grounded" primary cap="request-review" enabled={!gate.blocked} on={() => run((k) => advanceKCR(k, 'grounded', { by: role, asOf }), 'Grounded')} />
        </div>
      )}

      {s === 'grounded' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {input(prop, setProp, 'Proposed value / rationale')}
          <B label="Set proposal" cap="proposal" enabled={!!prop.trim()} on={() => run((k) => setProposal(k, { newValue: prop.trim(), verificationStatus: 'cited', sources: (k.evidence || []).map((e) => e.id), rationale: prop.trim(), by: role }, asOf), 'Proposal set')} />
          <B label="Request review" primary cap="request-review" enabled={!gate.blocked} on={() => run((k) => advanceKCR(k, 'review', { by: role, asOf }), 'Sent to review')} />
        </div>
      )}

      {s === 'review' && (
        <div>
          {revRow('sme', 'SME')}
          {revRow('editorial', 'Editorial')}
          {revRow('governance', 'Governance')}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <B label="Mark approved" primary cap="request-review" enabled={!(gate.reviewsNeeded || []).length} on={() => run((k) => advanceKCR(k, 'approved', { by: role, asOf }), 'Approved')} />
            <B label="Send back" cap="reject" on={() => run((k) => advanceKCR(k, 'researching', { by: role, note: 'sent back', asOf }), 'Sent back')} />
            {/* RETIRE FROM REVIEW (5F.10). `review -> archived` is legal and had no
                control, so a record that should never publish could only be bounced
                back to `researching` forever. Hit during Wave 0: an in-flight record
                predating the evidence fix carried `evidence: []`, so it would fail at
                publish, and there was no way to withdraw it. Same required reason as
                every other retirement. */}
            <B label="Archive" cap="reject"
              on={() => {
                const why = (retireReason || '').trim();
                if (!why) return undefined;
                return run((k) => advanceKCR(k, 'archived', { by: role, note: why, asOf }), 'Archived');
              }} />
          </div>
          <input value={retireReason} onChange={(e) => setRetireReason(e.target.value)}
            placeholder="to archive instead: why is this being retired? (required)"
            style={{ marginTop: 6, width: '100%', fontSize: 10, fontFamily: D.mono, background: D.surface,
              color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: '4px 8px' }} />
        </div>
      )}

      {s === 'approved' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {/* LINEAGE FIX (Phase 5C.4). `prevVersion` was `k.rollbackTo` — the version the
              CURRENT one already replaced, i.e. the grandparent. On a first publish both are
              null so the bug is invisible; on a RE-publish (every correction) it chained the
              new version to its grandparent and left the parent unsuperseded. Since
              publishedSnapshotBuild selects by lineage, that produced TWO LIVE HEADS on one
              field. The parent is `publishedVersion`. */}
          <B label="Publish" primary cap="publish" enabled={!gate.blocked}
            on={() => run((k) => publishKCR(k, { versionId: `${k.id}-v${(k.audit || []).length}`, prevVersion: k.correctionOf || k.publishedVersion || null, by: role, asOf }).kcr, 'Published')} />
          <B label="Send back" cap="reject" on={() => run((k) => advanceKCR(k, 'archived', { by: role, note: 'withdrawn', asOf }), 'Withdrawn')} />
        </div>
      )}

      {s === 'published' && <B label="Move to monitoring" cap="view" on={() => run((k) => advanceKCR(k, 'monitoring', { by: role, asOf }), 'Monitoring')} />}
      {/* RETIREMENT WAS UNREACHABLE (Phase 5F.8). The console could publish a record and
          then never retire it: `published` legally advances only to `monitoring` or
          `revision`, and neither state offered an archive control. So seven browser-only
          records could be neither promoted nor withdrawn through the UI.
          `KCR_TRANSITIONS` already permits `monitoring -> archived` and
          `revision -> archived`; this surfaces the transition that existed, and adds no
          new path — `published -> archived` stays illegal, as it should.
          NOTE: two records archived in 5F.4 carry a DIRECT published -> archived audit
          entry, which this table forbids. They were written outside `advanceKCR`. */}
      {(s === 'monitoring' || s === 'revision') && (
        <div style={{ display: 'flex', gap: 6 }}>
          <B label={s === 'monitoring' ? 'Open a revision' : 'Re-research'} cap="request-review" on={() => run((k) => advanceKCR(k, s === 'monitoring' ? 'revision' : 'researching', { by: role, asOf }), 'Advanced')} />
          <B label="Archive" cap="reject"
            on={() => {
              // A retirement states its reason, like every other governance decision.
              const why = (retireReason || '').trim();
              if (!why) { return; }
              return run((k) => advanceKCR(k, 'archived', { by: role, note: why, asOf }), 'Archived');
            }} />
        </div>
      )}
      {(s === 'monitoring' || s === 'revision') && (
        <input value={retireReason} onChange={(e) => setRetireReason(e.target.value)}
          placeholder="why is this being retired? (required)"
          style={{ marginTop: 6, width: '100%', fontSize: 10, fontFamily: D.mono, background: D.surface,
            color: D.text, border: `1px solid ${retireReason.trim() ? D.border : D.warn}`, borderRadius: 5, padding: '4px 8px' }} />
      )}

      {note && <div style={{ marginTop: 8, fontSize: type.size.caption, color: note.startsWith('Blocked') || note.startsWith('⚠') ? D.warn : D.good }}>{note}</div>}
      {!kcrCan(role, 'publish') && s === 'approved' && <div style={{ marginTop: 6, fontSize: type.size.caption, color: D.faint }}>Only a governance/publisher role can publish.</div>}
    </div>
  );
}

// ─── Bundle C: Manufacturing Studio — 15 operational workspaces ───────────────
const STUDIO_WS = [
  'Mission Control', 'Research Session', 'Research Ops',
  'Inbox', 'Observations', 'Evidence', 'Findings', 'Conflicts',
  // ACQUISITION (Phase 5F.2) sits before Review because it is where governed work
  // now STARTS. Publishing lists what is already governed — 2 assets of 39 — so
  // discovery anchored there could only ever re-correct knowledge that already
  // existed. This browses the AUTHORED corpus with published knowledge as an overlay.
  'Acquisition',
  'Review', 'Publishing', 'Validation', 'Monitoring', 'Quality',
  'Copilot', 'Analytics', 'Retirement', 'Campaigns', 'Campaign Research',
  'Dep. Explorer', 'Graph', 'Runtime Preview', 'Simulator',
  'Schedules', 'Roadmap',
  'Domains', 'Failures',
  'Research', 'Corpus',
  'Workers',
  'Experience',
];

function KcrStudioPanel() {
  const asOf = new Date().toISOString().slice(0, 10);
  const { user } = useAuth();
  const role = user?.app_metadata?.role;

  // ── shared data ─────────────────────────────────────────────────────────────
  const [kcrs, setKcrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { try { setKcrs(await loadKCRs()); } catch { /* keep current */ } }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await syncIntake([...researchQueueToKCRs(asOf), ...corpusDimensionKCRs(asOf)]); const list = await loadKCRs(); if (!cancelled) setKcrs(list); }
      catch { if (!cancelled) setKcrs([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Server-first KAS stores — async, refresh alongside KCRs; fall back to localStorage on failure.
  const [observations, setObservations] = useState(() => loadObservations());
  const [evidence, setEvidence] = useState(() => loadEvidence());
  const campaigns = loadCampaigns(); // campaigns stay local-only for now (no server path yet)
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadObservationsAsync(), loadEvidenceAsync()]).then(([obs, ev]) => {
      if (!cancelled) { setObservations(obs); setEvidence(ev); }
    }).catch(() => { /* keep localStorage values */ });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  console.log('DEBUG: Before buildFactory, ALL_PLAYBOOKS=', ALL_PLAYBOOKS);
  let factory, graph, conflicts, evidenceIntel, quality;
  try {
    console.log('DEBUG: buildFactory starting, playbooks=', ALL_PLAYBOOKS?.length);
    factory = buildFactory(asOf, { playbooks: ALL_PLAYBOOKS, kcrs });
    console.log('DEBUG: buildFactory complete');
  } catch (e) {
    console.error('ERROR in buildFactory:', e);
    factory = null;
  }

  try {
    console.log('DEBUG: buildKnowledgeGraph starting');
    graph = buildKnowledgeGraph({ assets: ALL_PLAYBOOKS, evidence, kcrs });
    console.log('DEBUG: buildKnowledgeGraph complete');
  } catch (e) {
    console.error('ERROR in buildKnowledgeGraph:', e);
    graph = null;
  }

  try {
    conflicts = detectContradictions(evidence);
  } catch (e) {
    console.error('ERROR in detectContradictions:', e);
    conflicts = null;
  }

  try {
    evidenceIntel = analyzeEvidence(evidence, asOf);
  } catch (e) {
    console.error('ERROR in analyzeEvidence:', e);
    evidenceIntel = null;
  }

  try {
    console.log('DEBUG: qualityManufacturing starting, playbooks=', ALL_PLAYBOOKS?.length);
    quality = qualityManufacturing(ALL_PLAYBOOKS, asOf);
    console.log('DEBUG: qualityManufacturing complete');
  } catch (e) {
    console.error('ERROR in qualityManufacturing:', e);
    quality = null;
  }
  const [copilotResult, setCopilotResult] = useState(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [acceptedProposals, setAcceptedProposals] = useState({}); // { [proposalId]: kcrId }

  const byStatus = kcrs.reduce((m, k) => { m[k.status] = (m[k.status] || 0) + 1; return m; }, {});
  const metrics = kcrBacklogMetrics(kcrs, asOf);

  // ── workspace state ──────────────────────────────────────────────────────────
  const [ws, setWs] = useState('Mission Control');
  const [open, setOpen] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Dep. Explorer state
  const [depType, setDepType] = useState('Crab Feast');
  const [depField, setDepField] = useState('p_crabs.unitCostRange');
  const [depResult, setDepResult] = useState(null);

  // Correction composer state (Phase 5C.7). Deliberately NOT window.prompt: a modal
  // dialog blocks the page, is untestable through automation, and cannot show the
  // version being superseded while the reason is written.
  const [correctRow, setCorrectRow] = useState(null);
  const [correctReason, setCorrectReason] = useState('');
  const [correctNote, setCorrectNote] = useState(null);
  // Typed value editor (Phase 5E). `correctDraft` holds the EDITOR-shaped value
  // (strings from inputs); the field type parses it back into the engine shape
  // on submit. Keeping those separate is what stops "0.5" reaching runtime.
  // PHASE 5E.3: an admin must be able to govern a field that has never been
  // published. The inventory only lists LIVE entries, so before this the composer
  // could only ever re-correct the two fields already in the snapshot — which is
  // why the host proof kept getting pushed. `correctPurchase` retargets the whole
  // correction at any governable purchase in the same playbook.
  const [correctPurchase, setCorrectPurchase] = useState(null);
  // ACQUISITION (5F.2). `acqTarget` is how the picker hands the composer an
  // asset+field that may have NO published row — the case the composer could not
  // previously represent at all.
  const [acqAsset, setAcqAsset] = useState('');
  const [acqState, setAcqState] = useState('');
  const [acqQuery, setAcqQuery] = useState('');
  const [acqTarget, setAcqTarget] = useState(null);
  const [correctField, setCorrectField] = useState('provenance');
  const [correctDraft, setCorrectDraft] = useState(null);
  // Rollback composer (Phase 5D P1): withdrawing a published version is at least as
  // consequential as publishing one, so it takes the same shape — see the target,
  // state a reason, confirm. It never deletes: rollbackKCR moves the head to
  // 'revision' and the record stays on disk, so the action is reversible.
  const [rollbackRow, setRollbackRow] = useState(null);
  const [rollbackReason, setRollbackReason] = useState('');

  // Runtime Preview state
  const [rtType, setRtType] = useState('Crab Feast');
  const [rtField, setRtField] = useState('p_crabs.unitCostRange');
  const [rtResult, setRtResult] = useState(null);

  // Impact Simulator state
  const [simType, setSimType] = useState('Crab Feast');
  const [simField, setSimField] = useState('p_crabs.unitCostRange');
  const [simVal, setSimVal] = useState('[3, 8]');
  const [simResult, setSimResult] = useState(null);
  const [simErr, setSimErr] = useState(null);

  // Campaign form state
  const [campGoal, setCampGoal] = useState('');
  const [campAsset, setCampAsset] = useState(ALL_PLAYBOOKS[0]?.type || '');
  const [campField, setCampField] = useState('');
  const [campGapType, setCampGapType] = useState(['pricing']);
  const [campPriority, setCampPriority] = useState('med');
  const [campTrigger, setCampTrigger] = useState('research');
  const [campProviders, setCampProviders] = useState(['internal', 'government', 'food-safety', 'commercial', 'industry', 'academic', 'community']);
  const [campBatchProviderSelection, setCampBatchProviderSelection] = useState(false);
  const [campRunning, setCampRunning] = useState(false);
  const [campRunResult, setCampRunResult] = useState(null);
  const [campList, setCampList] = useState(() => loadCampaigns());
  const [campTemplate, setCampTemplate] = useState('');
  // Manual evidence submission (for external providers that need backend data)
  const [campRawProvider, setCampRawProvider] = useState('');
  const [campRawJson, setCampRawJson] = useState('');
  const [campRawError, setCampRawError] = useState('');
  const [campRawPreview, setCampRawPreview] = useState(null);  // { records, error } from autoNormalize
  const [campWorkflow, setCampWorkflow] = useState('manual'); // 'manual' or 'gap-detect'
  const [campDetectedGaps, setCampDetectedGaps] = useState([]);
  const [campSelectedGap, setCampSelectedGap] = useState(null);
  const [campCampaignEvidence, setCampCampaignEvidence] = useState([]);
  const [campReviewStep, setCampReviewStep] = useState(false);

  // Campaign run progress tracking (KRE-3 UX)
  // campRunStageIdx: -1=error, 0=Queued, 1=Starting, 2=Running providers,
  //   3=Collecting observations, 4=Creating evidence, 5=Deriving finding, 6=Drafting KCR, 7=Done
  const [campRunStageIdx, setCampRunStageIdx] = useState(-2); // -2 = idle (no run in progress)
  const [campRunMode, setCampRunMode] = useState(null);       // 'server' | 'local'
  const [campRunInfo, setCampRunInfo] = useState(null);       // { goal, asset, fieldPath, providers }
  const [campServerRunId, setCampServerRunId] = useState(null);
  const [campToast, setCampToast] = useState(null);           // { type, msg }
  const campToastTimerRef = useRef(null);
  const campPollRef = useRef(null);

  // Multi-gap batch processing
  const [campSelectedGaps, setCampSelectedGaps] = useState([]);
  const [campBatchRunning, setCampBatchRunning] = useState(false);
  const [campBatchProgress, setCampBatchProgress] = useState({ current: 0, total: 0 });
  const [campBatchResults, setCampBatchResults] = useState([]);
  const [campFormattedResults, setCampFormattedResults] = useState(null);
  const [campShowJsonResults, setCampShowJsonResults] = useState(false);
  const [campExpandedEvidenceDetails, setCampExpandedEvidenceDetails] = useState(new Set());
  const [campConflictResolutions, setCampConflictResolutions] = useState({});
  const [campExpandedConflicts, setCampExpandedConflicts] = useState(new Set());
  const [mergedPlaybooks, setMergedPlaybooks] = useState(() => getMergedPlaybooks());

  // Batch run state (KRA-1 Bundle A/I)
  const [batchRunResult, setBatchRunResult] = useState(null);   // last batch run summary
  const [batchRunning, setBatchRunning] = useState(false);
  const [copiedKcrId, setCopiedKcrId] = useState(null);         // tracks last-copied packet
  const [selectedGapPath, setSelectedGapPath] = useState(null); // Research Session selected gap
  const [inboxActions, setInboxActions] = useState({});         // Evidence Inbox: { [obsId]: 'accept'|'reject'|'merge'|'flag' }
  const [opsRunResult, setOpsRunResult] = useState(null);       // Research Ops last batch run
  const [opsRunning, setOpsRunning] = useState(false);
  const [serverObs, setServerObs] = useState([]);              // Evidence Inbox: server-fetched observations (KRE-2)

  // Mission Control batch selection
  const [mcSelectedGaps, setMcSelectedGaps] = useState([]);      // selected gap keys for batch launch

  // Batch tracking (receipt modal + progress)
  const [activeBatch, setActiveBatch] = useState(() => getActiveBatch());
  const [batchReceipt, setBatchReceipt] = useState(null);        // receipt modal state
  const [batchProgress, setBatchProgress] = useState(null);      // live progress data
  const [showProgressPanel, setShowProgressPanel] = useState(false); // show/hide progress sidebar
  const [kpiRefreshKey, setKpiRefreshKey] = useState(0);        // force KPI recalculation

  // ── Batch auto-run schedule ────────────────────────────────────────────────
  const BATCH_SCHED_KEY = 'ngw-kas-batch-schedule';
  const loadBatchSchedule = () => { try { return JSON.parse(localStorage.getItem(BATCH_SCHED_KEY) || 'null'); } catch { return null; } };
  const [batchSchedule, setBatchSchedule] = useState(loadBatchSchedule);

  const refreshEvidence = useCallback(() => {
    setEvidence(loadEvidence());
    setCampList(loadCampaigns());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshPlaybooks = useCallback(() => {
    setMergedPlaybooks(getMergedPlaybooks());
  }, []);

  const refreshAll = useCallback(() => {
    refreshEvidence();
    refreshPlaybooks();
  }, [refreshEvidence, refreshPlaybooks]);

  // Refresh merged playbooks whenever workspace changes (so Mission Control stays in sync)
  useEffect(() => {
    refreshPlaybooks();
  }, [ws, refreshPlaybooks]);

  // Poll server run status every 2.5s while a server-side campaign run is active (KRE-3).
  // Clears itself on terminal states: complete / partial / failed / cancelled.
  useEffect(() => {
    if (!campServerRunId) return;
    const STAGE_MAP = { queued: 0, starting: 1, running: 2, collecting: 3, evidencing: 4, finding: 5, drafting: 6, complete: 7, partial: 7, failed: -1, cancelled: -1 };
    const poll = async () => {
      const run = await getResearchRun(campServerRunId);
      if (!run) return;
      const idx = STAGE_MAP[run.state] ?? 2;
      if (['complete', 'partial', 'failed', 'cancelled'].includes(run.state)) {
        clearInterval(campPollRef.current);
        campPollRef.current = null;
        setCampRunStageIdx(run.state === 'failed' || run.state === 'cancelled' ? -1 : 7);
        setCampRunResult(run.result || run);
        setCampList(loadCampaigns());
        setCampRunning(false);
        const toastType = run.state === 'complete' ? 'complete' : run.state === 'partial' ? 'partial' : 'failed';
        const toastMsg = { complete: 'Campaign complete', partial: 'Campaign partial — some providers ran', failed: 'Campaign failed', cancelled: 'Campaign cancelled' }[run.state] || run.state;
        if (campToastTimerRef.current) clearTimeout(campToastTimerRef.current);
        setCampToast({ type: toastType, msg: toastMsg });
        campToastTimerRef.current = setTimeout(() => setCampToast(null), 4500);
      } else {
        setCampRunStageIdx(idx);
      }
    };
    poll(); // immediate check
    campPollRef.current = setInterval(poll, 2500);
    return () => { if (campPollRef.current) { clearInterval(campPollRef.current); campPollRef.current = null; } };
  }, [campServerRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select relevant providers when gaps are selected
  // This implements: "default to or provide only the providers that will directly associate with the playbook gap"
  useEffect(() => {
    if (campSelectedGaps.length > 0 && campAsset) {
      const basePb = ALL_PLAYBOOKS.find((p) => p.type === campAsset);
      if (!basePb) return;

      const selectedPb = loadPlaybookWithUpdates(basePb);
      const allGaps = detectGapsInPlaybook(selectedPb);
      const selectedGapObjects = allGaps.filter(g => campSelectedGaps.includes(g.id));

      if (selectedGapObjects.length > 0) {
        // Collect all relevant providers across selected gaps
        const relevantProvidersSet = new Set();
        selectedGapObjects.forEach(gap => {
          const providers = getRelevantProvidersForGap(gap);
          providers.forEach(p => relevantProvidersSet.add(p));
        });

        // Update campProviders to only include relevant ones
        if (relevantProvidersSet.size > 0) {
          setCampProviders(Array.from(relevantProvidersSet));
        }
      }
    }
  }, [campSelectedGaps, campAsset]);

  const runHighPriorityBatch = useCallback(() => {
    const asOfNow = new Date().toISOString().slice(0, 10);
    // Step 1: auto-generate campaign drafts for HIGH gaps that don't yet have one
    const allEv = loadEvidence();
    const q = buildManufacturingQueue(ALL_PLAYBOOKS, allEv, loadCampaigns(), asOfNow);
    const ungapped = Array.isArray(q) ? q.filter((x) => x.priority === 'HIGH' && !x.hasCampaign) : [];
    if (ungapped.length) {
      const generated = generateCampaignsFromQueue(ungapped, { priorities: ['HIGH'], limit: 10, at: asOfNow });
      generated.forEach((c) => recordCampaign(c));
    }
    // Step 2: run all HIGH campaigns (including just-generated ones)
    const allCamps = loadCampaigns();
    const toRun = batchByFilter(allCamps, { priority: 'high' });
    if (!toRun.length) { setBatchRunResult({ label: 'Auto: HIGH priority', summary: { total: 0, ran: 0, evidenceTotal: 0, findingsTotal: 0, kcrTotal: 0, errors: 0 }, auto: true }); return; }
    setBatchRunning(true);
    const allProviders = buildProviders();
    const { results, summary } = runCampaigns(toRun, { providers: allProviders, asOf: asOfNow });
    const corrCamps = [];
    for (const { success, result } of results) {
      if (!success || !result) continue;
      recordCampaign(result);
      const corr = autoCorroborate(result, result, { asOf: asOfNow });
      if (corr) corrCamps.push(corr);
    }
    corrCamps.forEach((c) => recordCampaign(c));
    const intel = loadProviderIntel();
    const stats = extractProviderRunStats(results, asOfNow);
    let updatedIntel = intel;
    for (const s of stats) updatedIntel = recordProviderRun(updatedIntel, s.providerId, s);
    saveProviderIntel(updatedIntel);
    setBatchRunResult({ label: 'Auto: HIGH priority', summary, corroborationsCreated: corrCamps.length, auto: true, ranAt: asOfNow });
    setBatchRunning(false);
    refresh();
    refreshEvidence();
    // Update schedule: record lastRun, advance nextRun
    const cfg = loadBatchSchedule();
    if (cfg) {
      const interval = cfg.interval || 'once';
      const next = new Date();
      if (interval === 'hourly')    next.setHours(next.getHours() + 1);
      else if (interval === 'daily')next.setDate(next.getDate() + 1);
      const updated = { ...cfg, lastRun: asOfNow, nextRun: interval === 'once' ? null : next.toISOString() };
      localStorage.setItem(BATCH_SCHED_KEY, JSON.stringify(updated));
      setBatchSchedule(updated);
    }
  }, [refresh, refreshEvidence]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 30 s; fire runHighPriorityBatch when nextRun is due
  useEffect(() => {
    const check = () => {
      const cfg = loadBatchSchedule();
      if (cfg && cfg.nextRun && new Date(cfg.nextRun) <= new Date()) {
        runHighPriorityBatch();
      }
    };
    check(); // check on mount
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [runHighPriorityBatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // KRE-2: fetch server observations when Evidence Inbox is active
  useEffect(() => {
    if (ws !== 'Inbox' || !isResearchApiConfigured()) return;
    let cancelled = false;
    fetchServerObservations({ status: 'open', limit: 200 }).then((rows) => {
      if (!cancelled && Array.isArray(rows)) setServerObs(rows);
    });
    return () => { cancelled = true; };
  }, [ws]); // eslint-disable-line react-hooks/exhaustive-deps

  // Schedules state
  const [schedules, setSchedules] = useState(() => loadSchedules());
  const [schedAsset, setSchedAsset] = useState(ALL_PLAYBOOKS[0]?.type || '');
  const [schedField, setSchedField] = useState('');
  const [schedFreq, setSchedFreq] = useState('quarterly');
  const [schedNote, setSchedNote] = useState('');

  // Roadmap state
  const [roadmapItems, setRoadmapItems] = useState(() => generateRoadmap(ALL_PLAYBOOKS, new Date().toISOString().slice(0, 10)));
  const [roadmapFilter, setRoadmapFilter] = useState('all');

  // Domains state
  const [domainSelected, setDomainSelected] = useState(KNOWLEDGE_DOMAINS[0]?.id || '');
  const [domainReport, setDomainReport] = useState(null);

  // Failure Intelligence state
  const [failures, setFailures] = useState(() => loadFailures());
  const [failForm, setFailForm] = useState({ eventType: ALL_PLAYBOOKS[0]?.type || '', category: 'food', what: '', severity: 'minor', impact: '', source: 'operator', at: asOf, proposedFix: '' });
  const [failAnalysis, setFailAnalysis] = useState(null);

  // Experience Intelligence state (XIP-1)
  const [xipRole, setXipRole] = useState('host');
  const [xipPlaybookType, setXipPlaybookType] = useState(ALL_PLAYBOOKS[0]?.type || 'Crab Feast');
  const [xipPhase, setXipPhase] = useState('purchasing');
  const [xipSituations, setXipSituations] = useState([]);
  const [xipDaysToEvent, setXipDaysToEvent] = useState('10');
  const [xipResult, setXipResult] = useState(null);
  const [xipSimRole, setXipSimRole] = useState('coordinator');
  const [xipDiff, setXipDiff] = useState(null);

  // Research workbench state (KMP-1)
  const [researchPlaybookId, setResearchPlaybookId] = useState(RESEARCH_PLAYBOOKS[0]?.id || '');
  const [researchAssetId, setResearchAssetId] = useState(ALL_PLAYBOOKS[0]?.type || '');
  const [researchFieldPath, setResearchFieldPath] = useState('');
  const [pipelineManifests, setPipelineManifests] = useState(() => loadManifests());
  const [selectedManifestId, setSelectedManifestId] = useState(null);

  // Corpus dashboard state (KMP-1)
  const [corpusDomain, setCorpusDomain] = useState('all');

  // Mission Control + Research Session (KML-1)
  const [mcSessionPlaybook, setMcSessionPlaybook] = useState(ALL_PLAYBOOKS[0]?.type || '');

  // Worker fleet state (KAW-1)
  const [workers, setWorkers] = useState(() => loadWorkers());
  const [workerRuns, setWorkerRuns] = useState(() => loadRuns());
  const [workerNewType, setWorkerNewType] = useState(Object.keys(WORKER_TYPES)[0]);
  const [workerNewAsset, setWorkerNewAsset] = useState('');
  const [providerLastChecked, setProviderLastChecked] = useState({});

  // ── shared styles ────────────────────────────────────────────────────────────
  const th = { textAlign: 'left', fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` };
  const td = { padding: '8px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, verticalAlign: 'middle' };
  const chip = (txt, color) => <span style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${color}1e`, color }}>{txt}</span>;
  const monoPre = (v) => <span style={{ fontFamily: D.mono, fontSize: 11, color: D.muted }}>{v == null ? 'null' : JSON.stringify(v)}</span>;
  const inputSm = { background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none', fontFamily: D.mono, flex: 1 };

  // Shared KCR table render (Review / Publishing / Backlog)
  const KcrTable = ({ items, cols = 6 }) => (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Asset</th><th style={th}>Type</th><th style={th}>Trigger</th><th style={th}>Status</th><th style={th}>Priority</th><th style={th}>Field</th>
        </tr></thead>
        <tbody>
          {items.map((k) => (
            <Fragment key={k.id}>
              <tr onClick={() => setOpen(open === k.id ? null : k.id)} style={{ cursor: 'pointer', background: open === k.id ? D.surface2 : 'transparent' }}>
                <td style={{ ...td, color: D.text, fontWeight: 600 }}>{k.assetId}</td>
                <td style={td}>{chip(k.type, D.muted)}</td>
                <td style={td}>{chip(k.trigger, D.accent)}</td>
                <td style={td}><span style={{ color: KCR_STATUS_COLOR[k.status] || D.muted, fontFamily: D.mono, fontSize: 11 }}>● {k.status}</span></td>
                <td style={td}>{chip(k.priority || 'low', k.priority === 'high' ? D.bad : k.priority === 'med' ? D.warn : D.faint)}</td>
                <td style={{ ...td, color: D.faint, fontFamily: D.mono, fontSize: 11, wordBreak: 'break-word' }}>{k.fieldPath}</td>
              </tr>
              {open === k.id && (() => {
                const packet = prepareReviewPacket(k, evidence, ALL_PLAYBOOKS, { asOf });
                return (
                <tr><td colSpan={cols} style={{ padding: '0 10px 12px' }}>
                  <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 10 }}>{k.reason}</div>
                    <KcrActions kcr={k} role={role} asOf={asOf} onChanged={refresh} />
                    {packet && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: D.surface, border: `1px solid ${packet.hasContradictions ? D.warn : packet.readyToPublish ? D.good : D.border}33`, borderRadius: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <span style={{ fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Review Packet</span>
                          <span style={{ fontSize: 9, color: D.faint }}>{packet.evidenceCount} evidence · {packet.strength}</span>
                        </div>
                        <div style={{ fontSize: 10, color: packet.readyToPublish ? D.good : packet.hasContradictions ? D.warn : D.muted, fontWeight: 600, marginBottom: 6 }}>{packet.reviewerAction}</div>
                        {packet.excerpts?.slice(0, 2).map((ex, i) => (
                          <div key={i} style={{ fontSize: 9, color: D.faint, fontFamily: D.mono, marginBottom: 3, paddingLeft: 8 }}>[{ex.authority}] {ex.source}: {ex.excerpt?.slice(0, 120)}</div>
                        ))}
                        {packet.impactEstimate && <div style={{ fontSize: 9, color: D.muted, marginTop: 4 }}>Impact: {packet.impactEstimate}</div>}
                        {packet.hasContradictions && <div style={{ fontSize: 9, color: D.warn, marginTop: 4 }}>⚠ {packet.contradictions.length} contradiction(s) — resolve before publishing</div>}
                        {packet.suggestedReviewers?.length > 0 && <div style={{ fontSize: 9, color: D.faint, marginTop: 4 }}>Suggested: {packet.suggestedReviewers.join(' · ')}</div>}
                        <button onClick={() => {
                            const text = formatReviewPacketText(packet);
                            navigator.clipboard?.writeText(text);
                            setCopiedKcrId(k.id);
                            setTimeout(() => setCopiedKcrId(null), 2000);
                          }}
                          style={{ marginTop: 8, fontSize: 8, padding: '2px 8px', borderRadius: 3, border: `1px solid ${copiedKcrId === k.id ? D.good : D.border}`, background: copiedKcrId === k.id ? D.good + '22' : 'transparent', color: copiedKcrId === k.id ? D.good : D.faint, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                          {copiedKcrId === k.id ? 'Copied ✓' : 'Copy packet text'}
                        </button>
                      </div>
                    )}
                    {k.impact && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '10px 0' }}>
                        {(k.impact.recommendationEngines || []).map((e) => <span key={e} style={{ fontSize: 10, fontFamily: D.mono, padding: '2px 6px', borderRadius: 4, background: `${D.good}1e`, color: D.good }}>{e}</span>)}
                        {(k.impact.downstream || []).map((e) => <span key={`d-${e}`} style={{ fontSize: 10, fontFamily: D.mono, padding: '2px 6px', borderRadius: 4, background: D.surface2, color: D.muted }}>↓ {e}</span>)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, marginTop: 8 }}>Audit</div>
                    {(k.audit || []).map((a, i) => (
                      <div key={i} style={{ fontSize: type.size.caption, color: D.muted, fontFamily: D.mono }}>{a.action}{a.by ? ` · ${a.by}` : ''}{a.note ? ` — ${a.note}` : ''}</div>
                    ))}
                  </div>
                </td></tr>
              ); })()}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  const Empty = ({ msg }) => <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic', padding: '16px 0' }}>{msg}</div>;

  // ── workspace renderers ──────────────────────────────────────────────────────
  const renderWs = () => {
    if (ws === 'Inbox') {
      // Merge server observations (KRE-2) with localStorage observations; server wins on id collision
      const localObs  = observations.filter((o) => o.status === 'open' && !(o.linkedEvidence || []).length);
      const serverIds = new Set(serverObs.map((o) => o.id));
      const mergedObs = [
        // Normalize server obs to local shape
        ...serverObs.map((o) => ({
          id:           o.id,
          assetId:      o.playbook_type,
          fieldPath:    o.field_path,
          gapType:      o.gap_type,
          statement:    o.statement,
          source:       o.provider_id,
          region:       o.region,
          status:       o.status,
          noticedAt:    o.captured_at,
          _fromServer:  true,
        })),
        ...localObs.filter((o) => !serverIds.has(o.id)),
      ];
      const inbox = mergedObs;
      // Evidence Inbox (KRE-1 Bundle E) — every observation with attribution + actions
      const ACTION_COLOR = { accept: D.good, reject: '#e74c3c', merge: D.accent, flag: D.warn };
      const ACTION_LABEL = { accept: 'Accept', reject: 'Reject', merge: 'Merge', flag: 'Flag' };
      const pending  = inbox.filter((o) => !inboxActions[o.id]);
      const reviewed = inbox.filter((o) => inboxActions[o.id]);

      const setAction = (obsId, action, fromServer) => {
        setInboxActions((prev) => ({ ...prev, [obsId]: action }));
        if (fromServer && action) {
          // Async — fire and forget; server persists the status
          serverUpdateObsStatus(obsId, action).catch(() => null);
        }
      };

      return (
        <div>
          <Banner>Evidence Inbox — every observation awaiting triage. Accept advances to evidence. Reject dismisses. Merge deduplicates. Flag raises a contradiction.</Banner>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: D.faint }}>{pending.length} pending · {reviewed.length} reviewed · {inbox.length} total</span>
            {reviewed.length > 0 && <button onClick={() => setInboxActions({})} style={{ fontSize: 10, background: 'transparent', border: `1px solid ${D.border}`, borderRadius: 5, padding: '3px 8px', color: D.faint, cursor: 'pointer', fontFamily: D.ff }}>Clear actions</button>}
          </div>
          {inbox.length === 0 ? <Empty msg="No observations in inbox. Run a campaign or autonomous batch to generate observations." /> : (
            <div>
              {inbox.map((o) => {
                const action = inboxActions[o.id];
                const isOpen = open === o.id;
                const linkedEv = evidence.filter((e) => e.fieldPath === o.fieldPath && e.assetId === o.assetId);
                const evCount = linkedEv.length;
                const freshDays = o.noticedAt ? Math.round((new Date(asOf) - new Date(o.noticedAt)) / 86_400_000) : null;
                const authorityColor = { primary: D.good, official: D.good, standards: D.accent, trade: D.muted, community: D.warn, expert: D.accent };
                return (
                  <div key={o.id} style={{ marginBottom: 6, background: action ? `${ACTION_COLOR[action]}0e` : D.surface, border: `1px solid ${action ? ACTION_COLOR[action] + '44' : D.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    {/* Header row */}
                    <div onClick={() => setOpen(isOpen ? null : o.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 9, fontFamily: D.mono, color: D.faint, minWidth: 80, flexShrink: 0 }}>{o.id?.slice(-14) || '—'}</span>
                      <span style={{ fontSize: 10, color: D.text, flex: 1, fontWeight: 600 }}>{o.assetId} · {o.fieldPath || o.gapType}</span>
                      {/* Provider + authority */}
                      <span style={{ fontSize: 9, color: D.muted, fontFamily: D.mono }}>{o.source}</span>
                      {/* Freshness */}
                      {freshDays != null && <span style={{ fontSize: 9, color: freshDays > 45 ? D.warn : D.faint }}>{freshDays}d ago</span>}
                      {/* Evidence count */}
                      <span style={{ fontSize: 9, color: evCount > 0 ? D.good : D.faint }}>{evCount} ev</span>
                      {/* Action chips */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['accept', 'reject', 'merge', 'flag'].map((act) => (
                          <button key={act} onClick={(e) => { e.stopPropagation(); setAction(o.id, action === act ? null : act, o._fromServer); }}
                            style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, border: `1px solid ${action === act ? ACTION_COLOR[act] : D.border}`, background: action === act ? `${ACTION_COLOR[act]}22` : 'transparent', color: action === act ? ACTION_COLOR[act] : D.faint, cursor: 'pointer', fontFamily: 'inherit', fontWeight: action === act ? 700 : 400 }}>
                            {ACTION_LABEL[act]}
                          </button>
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color: D.faint }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {/* Expanded detail */}
                    {isOpen && (
                      <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${D.border}22` }}>
                        <div style={{ fontSize: type.size.caption, color: D.text, lineHeight: 1.5, marginBottom: 8, marginTop: 8 }}>{o.statement}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 9, color: D.faint, marginBottom: 8 }}>
                          <span>Kind: <strong style={{ color: D.muted }}>{o.kind}</strong></span>
                          <span>Gap type: <strong style={{ color: D.muted }}>{o.gapType || '—'}</strong></span>
                          <span>Source: <strong style={{ color: D.muted }}>{o.source}</strong></span>
                          <span>Region: <strong style={{ color: D.muted }}>{o.region || 'n/a'}</strong></span>
                          <span>Noticed: <strong style={{ color: D.muted }}>{(o.noticedAt || '').slice(0, 10)}</strong></span>
                          <span>Status: <strong style={{ color: D.accent }}>{o.status}</strong></span>
                        </div>
                        {/* Confidence dimensions */}
                        <div style={{ fontSize: 8, color: D.faint, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Attributable to</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, border: `1px solid ${D.border}`, color: D.muted }}>provider: {o.source}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, border: `1px solid ${D.border}`, color: D.muted }}>asset: {o.assetId || 'n/a'}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, border: `1px solid ${D.border}`, color: D.muted }}>field: {o.fieldPath || 'n/a'}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, border: `1px solid ${D.border}`, color: D.muted }}>claimed: {o.gapType || 'n/a'}</span>
                          {freshDays != null && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, border: `1px solid ${freshDays > 45 ? D.warn + '66' : D.border}`, color: freshDays > 45 ? D.warn : D.muted }}>freshness: {freshDays}d</span>}
                        </div>
                        {/* Linked evidence */}
                        {evCount > 0 && <div style={{ fontSize: 9, color: D.good, marginBottom: 6 }}>{evCount} evidence record(s) linked to same field</div>}
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => { setCampAsset(o.assetId); setWs('Campaigns'); }} style={{ fontSize: 10, background: D.accent, border: 'none', borderRadius: 6, padding: '5px 12px', color: '#fff', cursor: 'pointer', fontFamily: D.ff, fontWeight: 600 }}>Create campaign →</button>
                          <button onClick={() => setWs('Evidence')} style={{ fontSize: 10, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 6, padding: '5px 10px', color: D.muted, cursor: 'pointer', fontFamily: D.ff }}>Evidence →</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Research Ops') {
      // Research Ops (KRE-1 Bundle J) — Operator Dashboard
      // Shows: queue state summary, provider performance, batch run controls
      const queue = buildManufacturingQueue(ALL_PLAYBOOKS, evidence, campaigns, asOf);
      const stateGroups = {};
      for (const item of (queue?.items || [])) {
        const s = computeQueueItemState(item, { campaigns, evidence, kcrs });
        if (!stateGroups[s]) stateGroups[s] = [];
        stateGroups[s].push(item);
      }
      const allStates = Object.values(QUEUE_STATES);
      const totalItems = (queue?.items || []).length;
      const ready = (stateGroups[QUEUE_STATES.READY] || []).length;
      const complete = (stateGroups[QUEUE_STATES.COMPLETE] || []).length;
      const review = (stateGroups[QUEUE_STATES.REVIEW] || []).length;
      const blocked = (stateGroups[QUEUE_STATES.BLOCKED] || []).length;
      const failed = (stateGroups[QUEUE_STATES.FAILED] || []).length;
      const pct = totalItems > 0 ? Math.round((complete / totalItems) * 100) : 0;

      const runBatch = async () => {
        if (opsRunning) return;
        const readyItems = stateGroups[QUEUE_STATES.READY] || [];
        if (readyItems.length === 0) return;
        setOpsRunning(true);
        const toRun = readyItems.slice(0, 5).map((item) => {
          const campaign = campaigns.find((c) => c.assetId === item.playbookType && c.fieldPath === item.fieldPath);
          if (!campaign) return null;
          const bp = generateResearchBlueprint(item, { providerIntel: loadProviderIntel(), asOf });
          return { item, campaign, blueprint: bp };
        }).filter(Boolean);
        try {
          if (isResearchApiConfigured()) {
            // Server-side execution: create + start each run
            const results = await Promise.all(toRun.map(async ({ item, campaign, blueprint }) => {
              const created = await createResearchRun({
                campaignId:    campaign.id || campaign.assetId,
                playbookType:  item.playbookType,
                fieldPath:     item.fieldPath,
                gapKind:       item.gapKind,
                blueprint,
                executionPlan: blueprint.executionPlan || {},
                mode:          'simulate',
              });
              if (!created?.id) return { state: 'failed', fieldPath: item.fieldPath, error: 'create failed' };
              const result = await startResearchRun(created.id);
              return result || { state: 'failed', runId: created.id, fieldPath: item.fieldPath };
            }));
            const summary = {
              total:         results.length,
              complete:      results.filter((r) => r?.state === 'complete').length,
              partial:       results.filter((r) => r?.state === 'partial').length,
              failed:        results.filter((r) => r?.state === 'failed').length,
              evidenceTotal: results.reduce((n, r) => n + (r?.evidenceCount || 0), 0),
              kcrTotal:      results.filter((r) => r?.findingState === 'corroborated').length,
            };
            setOpsRunResult({ results, summary, mode: 'server' });
          } else {
            // Client-side simulate fallback
            const cs  = toRun.map((x) => x.campaign);
            const bps = toRun.map((x) => x.blueprint);
            const result = batchRunAutonomous(cs, bps, { mode: 'simulate', asOf });
            setOpsRunResult({ ...result, mode: 'local' });
          }
        } catch (err) {
          setOpsRunResult({ error: err.message });
        } finally {
          setOpsRunning(false);
        }
      };

      const perfReport = opsRunResult?.results ? buildPerformanceReport(opsRunResult.results) : [];

      return (
        <div>
          <Banner>Research Ops — autonomous campaign orchestration. Run READY campaigns in simulate mode. Review results before publishing.</Banner>

          {/* Queue Health KPIs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: totalItems, color: D.text },
              { label: 'Ready', value: ready, color: QUEUE_STATE_COLORS.READY },
              { label: 'Review', value: review, color: QUEUE_STATE_COLORS.REVIEW },
              { label: 'Complete', value: complete, color: QUEUE_STATE_COLORS.COMPLETE },
              { label: 'Blocked', value: blocked, color: QUEUE_STATE_COLORS.BLOCKED },
              { label: 'Failed', value: failed, color: QUEUE_STATE_COLORS.FAILED },
              { label: 'Coverage', value: `${pct}%`, color: pct >= 80 ? D.good : pct >= 50 ? D.warn : D.muted },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 16px', minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: D.mono }}>{value}</div>
                <div style={{ fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* State Breakdown */}
          <div style={{ marginBottom: 14 }}>
            {allStates.map((s) => {
              const items = stateGroups[s] || [];
              if (items.length === 0) return null;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 80, fontSize: 9, fontWeight: 700, color: QUEUE_STATE_COLORS[s], textTransform: 'uppercase', letterSpacing: '.06em' }}>{s}</span>
                  <div style={{ flex: 1, height: 6, background: D.surface, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((items.length / totalItems) * 100)}%`, height: '100%', background: QUEUE_STATE_COLORS[s], borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: D.muted, minWidth: 24, textAlign: 'right' }}>{items.length}</span>
                </div>
              );
            })}
          </div>

          {/* Batch Run Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: D.text, fontWeight: 600, marginBottom: 2 }}>Run {Math.min(ready, 5)} READY campaigns</div>
              <div style={{ fontSize: 10, color: D.faint }}>Simulate mode only · No knowledge edited · Produces KCR drafts for human review</div>
            </div>
            <button onClick={runBatch} disabled={opsRunning || ready === 0}
              style={{ padding: '8px 18px', background: ready > 0 && !opsRunning ? D.accent : D.surface2, border: 'none', borderRadius: 7, color: ready > 0 && !opsRunning ? '#fff' : D.faint, fontFamily: D.ff, fontWeight: 600, fontSize: 12, cursor: ready > 0 && !opsRunning ? 'pointer' : 'not-allowed' }}>
              {opsRunning ? 'Running…' : ready === 0 ? 'None ready' : 'Run batch →'}
            </button>
          </div>

          {/* Last Batch Result */}
          {opsRunResult && !opsRunResult.error && (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.text, marginBottom: 6 }}>Last batch result</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 10, color: D.muted, flexWrap: 'wrap', marginBottom: 8 }}>
                <span>Total: {opsRunResult.summary?.total}</span>
                <span style={{ color: D.good }}>Complete: {opsRunResult.summary?.complete}</span>
                <span>Partial: {opsRunResult.summary?.partial}</span>
                <span style={{ color: D.warn }}>Failed: {opsRunResult.summary?.failed}</span>
                <span>Evidence: {opsRunResult.summary?.evidenceTotal}</span>
                <span style={{ color: D.good }}>KCR drafts: {opsRunResult.summary?.kcrTotal}</span>
              </div>
              {opsRunResult.results?.map((r, i) => (
                <div key={r.campaignId || i} style={{ fontSize: 9, color: D.faint, fontFamily: D.mono, lineHeight: 1.6 }}>
                  <span style={{ color: r.status === 'complete' ? D.good : r.status === 'partial' ? D.warn : '#e74c3c', fontWeight: 700 }}>{r.status?.toUpperCase()}</span>
                  {' '}{r.campaignId?.slice(-12) || '?'} · {r.summary}
                </div>
              ))}
            </div>
          )}

          {opsRunResult?.error && <div style={{ padding: 12, background: '#e74c3c11', border: '1px solid #e74c3c44', borderRadius: 7, fontSize: 11, color: '#e74c3c' }}>Error: {opsRunResult.error}</div>}

          {/* Provider Performance */}
          {perfReport.length > 0 && (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${D.border}`, fontSize: 10, fontWeight: 700, color: D.text }}>Provider performance</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Provider', 'Runs', 'Success %', 'Avg records', 'Avg latency'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {perfReport.map((p) => (
                    <tr key={p.providerId} style={{ borderBottom: `1px solid ${D.border}11` }}>
                      <td style={{ ...td, fontFamily: D.mono, fontSize: 10 }}>{p.providerId}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{p.runs}</td>
                      <td style={{ ...td, textAlign: 'center', color: p.successRate >= 80 ? D.good : p.successRate >= 50 ? D.warn : '#e74c3c' }}>{p.successRate}%</td>
                      <td style={{ ...td, textAlign: 'center', color: D.muted }}>{p.avgRecords}</td>
                      <td style={{ ...td, textAlign: 'center', color: D.muted, fontFamily: D.mono, fontSize: 10 }}>{p.avgLatencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Observations') {
      const sf = statusFilter;
      const shown = observations.filter((o) => sf === 'all' || o.status === sf);
      return (
        <div>
          <Banner>All observations in the local store. Status: open = unresolved, closed = resolved or superseded.</Banner>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['all', 'open', 'closed'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? D.surface2 : 'transparent', color: statusFilter === s ? D.text : D.muted, border: `1px solid ${statusFilter === s ? D.border : 'transparent'}`, borderRadius: 6, padding: '4px 10px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff }}>{s} ({s === 'all' ? observations.length : observations.filter((o) => o.status === s).length})</button>
            ))}
          </div>
          {shown.length === 0 ? <Empty msg="No observations match the filter. Run a campaign to generate observations." /> : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Kind', 'Asset', 'Field', 'Statement', 'Status', 'Noticed'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {shown.map((o) => (
                    <Fragment key={o.id}>
                      <tr onClick={() => setOpen(open === o.id ? null : o.id)} style={{ cursor: 'pointer', background: open === o.id ? D.surface2 : 'transparent' }}>
                        <td style={td}>{chip(o.kind, D.accent)}</td>
                        <td style={{ ...td, color: D.text, fontWeight: 600 }}>{o.assetId}</td>
                        <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.muted }}>{o.fieldPath || '—'}</td>
                        <td style={{ ...td, color: D.muted, maxWidth: 240 }}>{o.statement}</td>
                        <td style={td}>{chip(o.status, o.status === 'open' ? D.warn : D.faint)}</td>
                        <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.faint }}>{(o.noticedAt || '').slice(0, 10)}</td>
                      </tr>
                      {open === o.id && (
                        <tr><td colSpan={6} style={{ padding: '0 10px 12px' }}>
                          <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 11, color: D.faint, marginBottom: 6 }}>id: {o.id}</div>
                            <div style={{ fontSize: type.size.caption, color: D.muted }}>{o.statement}</div>
                            <div style={{ marginTop: 8, fontSize: type.size.caption, color: D.faint }}>source: {o.source} · gapType: {o.gapType || 'n/a'} · region: {o.region || 'n/a'}</div>
                            {(o.linkedEvidence || []).length > 0 && <div style={{ marginTop: 6, fontSize: type.size.caption, color: D.faint }}>Linked evidence: {o.linkedEvidence.join(', ')}</div>}
                          </div>
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Evidence') {
      const shown = evidence.filter((e) => statusFilter === 'all' || e.status === statusFilter);
      return (
        <div>
          <Banner>Evidence records — corroborated or candidate. Authority rank and freshness inform finding confidence. No evidence → no finding → no KCR. Honest-empty.</Banner>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['all', 'candidate', 'corroborated', 'contested', 'superseded'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? D.surface2 : 'transparent', color: statusFilter === s ? D.text : D.muted, border: `1px solid ${statusFilter === s ? D.border : 'transparent'}`, borderRadius: 6, padding: '4px 10px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff }}>{s} ({s === 'all' ? evidence.length : evidence.filter((e) => e.status === s).length})</button>
            ))}
          </div>
          {shown.length === 0 ? <Empty msg="No evidence in store. Run a campaign or record evidence manually via the API." /> : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Source', 'Asset', 'Field', 'Authority', 'Status', 'Effective date'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {shown.map((e) => (
                    <Fragment key={e.id}>
                      <tr onClick={() => setOpen(open === e.id ? null : e.id)} style={{ cursor: 'pointer', background: open === e.id ? D.surface2 : 'transparent' }}>
                        <td style={{ ...td, color: D.text, fontWeight: 600 }}>{e.source}</td>
                        <td style={{ ...td }}>
                          {e.assetId
                            ? <button onClick={(ev) => { ev.stopPropagation(); setMcSessionPlaybook(e.assetId); setWs('Research Session'); }} style={{ fontSize: type.size.caption, color: D.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: D.ff, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{e.assetId}</button>
                            : <span style={{ color: D.faint }}>—</span>
                          }
                        </td>
                        <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.muted }}>{e.fieldPath || '—'}</td>
                        <td style={td}>{chip(e.authorityLevel || '—', D.accent)}</td>
                        <td style={td}>{chip(e.status, e.status === 'corroborated' ? D.good : e.status === 'contested' ? D.bad : D.warn)}</td>
                        <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.faint }}>{e.effectiveDate || '—'}</td>
                      </tr>
                      {open === e.id && (
                        <tr><td colSpan={6} style={{ padding: '0 10px 12px' }}>
                          <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 11, color: D.faint, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span>id: {e.id}</span>
                              <button onClick={() => navigator.clipboard?.writeText(e.id)} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, border: `1px solid ${D.border}`, background: 'transparent', color: D.faint, cursor: 'pointer', fontFamily: 'inherit' }}>copy id</button>
                            </div>
                            {e.url && <div style={{ fontSize: type.size.caption, marginBottom: 4 }}><a href={e.url} target="_blank" rel="noreferrer" style={{ color: D.accent, textDecoration: 'none' }}>{e.url}</a></div>}
                            {e.excerpt && <div style={{ fontSize: type.size.caption, color: D.muted, fontStyle: 'italic', marginBottom: 6 }}>"{e.excerpt}"</div>}
                            <div style={{ fontSize: type.size.caption, color: D.faint }}>sourceType: {e.sourceType} · confidence: {e.confidence} · region: {e.region || 'n/a'}</div>
                            {(e.extractedFacts || []).length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', marginBottom: 4 }}>Extracted facts</div>
                                {e.extractedFacts.map((f, i) => (
                                  <div key={i} style={{ fontSize: type.size.caption, color: D.muted, fontFamily: D.mono, padding: '1px 0' }}>
                                    <span style={{ color: D.text }}>{f.field || f.fact || '?'}</span>
                                    {' '}<span style={{ color: D.faint }}>→</span>{' '}
                                    <span style={{ color: D.accent }}>{f.value != null ? String(f.value) : '—'}{f.unit ? ` ${f.unit}` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Findings') {
      const campaignFindings = campaigns.filter((c) => c.finding && typeof c.finding === 'object' && ['proposed', 'contested'].includes(c.finding.status));
      return (
        <div>
          <Banner>Findings derived from Evidence + Observations via deriveFinding(). Findings are ephemeral (computed on demand by campaigns); the store here shows campaign-attached findings.</Banner>
          {campaignFindings.length === 0 ? <Empty msg="No findings yet. Findings are generated when a campaign runs through deriveFinding(). Run a campaign via the Campaigns workspace." /> : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Campaign', 'Field', 'Status', 'Proposed value', 'Corroboration', 'Contradictions'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {campaignFindings.map((c) => {
                    const f = c.finding;
                    const isOpen = open === c.id;
                    return (
                      <Fragment key={c.id}>
                        <tr onClick={() => setOpen(isOpen ? null : c.id)} style={{ cursor: 'pointer', background: isOpen ? D.surface2 : 'transparent' }}>
                          <td style={{ ...td, color: D.text, fontWeight: 600 }}>{c.goal}</td>
                          <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.muted }}>{f.fieldPath || '—'}</td>
                          <td style={td}>{chip(f.status || '—', f.status === 'proposed' ? D.good : f.status === 'contested' ? D.bad : D.warn)}</td>
                          <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.text }}>{monoPre(f.proposedValue)}</td>
                          <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.muted }}>{f.corroboration ?? 0}</td>
                          <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: (f.contradictions || []).length ? D.bad : D.faint }}>{(f.contradictions || []).length}</td>
                        </tr>
                        {isOpen && (
                          <tr><td colSpan={6} style={{ padding: '0 10px 12px' }}>
                            <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12 }}>
                              <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 6 }}>
                                <strong>Rationale: </strong>{f.rationale || '—'}
                              </div>
                              {(f.contradictions || []).length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  <div style={{ fontSize: 10, color: D.bad, textTransform: 'uppercase', marginBottom: 4 }}>Contradictions</div>
                                  {f.contradictions.map((ct, i) => (
                                    <div key={i} style={{ fontSize: type.size.caption, color: D.muted, fontFamily: D.mono }}>
                                      {ct.sourceA} ({ct.valueA}) vs {ct.sourceB} ({ct.valueB}) — {ct.description || ct.field}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div style={{ marginTop: 8 }}>
                                <button onClick={(e) => { e.stopPropagation(); setWs('Campaigns'); }} style={{ fontSize: 11, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 6, padding: '4px 10px', color: D.muted, cursor: 'pointer', fontFamily: D.ff }}>View campaign →</button>
                              </div>
                            </div>
                          </td></tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Conflicts') {
      return (
        <div>
          <Banner>Contradictions detected by detectContradictions() across the evidence store. Conflict KCR candidates — never auto-resolved; requires human judgment before advancing.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Evidence records" value={evidenceIntel.total} />
            <PBKpi label="Clusters" value={evidenceIntel.clusters ?? 0} />
            <PBKpi label="Deduped" value={evidenceIntel.deduped ?? 0} />
            <PBKpi label="Conflicts" value={conflicts.length} tone={conflicts.length ? D.bad : D.faint} />
          </div>
          {conflicts.length === 0 ? <Empty msg="No contradictions detected across the evidence store. Honest-empty." /> : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Asset', 'Field', 'Distinct values', 'Explicit', 'Conflict KCR'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {conflicts.map((c, i) => (
                    <tr key={i}>
                      <td style={{ ...td, color: D.text, fontWeight: 600 }}>{c.assetId}</td>
                      <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.muted }}>{c.fieldPath}</td>
                      <td style={{ ...td, fontFamily: D.mono, fontSize: 11, color: D.bad }}>{monoPre(c.distinctValues)}</td>
                      <td style={td}>{chip(c.explicit ? 'yes' : 'no', c.explicit ? D.bad : D.warn)}</td>
                      <td style={{ ...td, fontFamily: D.mono, fontSize: 10, color: D.faint }}>{c.conflictKCR ? (c.conflictKCR.id || `conflict::${c.assetId}::${c.fieldPath}`) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Review') {
      // ORPHAN STATES (Phase 5F.9). `researching` and `draft` were listed by NO
      // workspace: KcrTable renders in Review (review/grounded), Publishing (approved),
      // Validation (published) and Retirement (archived). So "Send back" — the reject
      // action on any review row — moved a record into a status the console could not
      // display, and it could never be recovered through the UI.
      //
      // Found by doing it: a mis-click sent a real record to `researching`, after which
      // no workspace showed it. A lifecycle you can enter and not leave is not a
      // lifecycle. In-flight work now surfaces where the reviewer already is.
      // `researching` ONLY, deliberately. Including `draft` was tried and measured: the
      // store holds 227 auto-seeded corpus-dimension drafts against 2 real sent-back
      // records, so listing both would bury the human work under machine candidates —
      // a different untruth from the one being fixed. Drafts are intake, not in-flight
      // review.
      const reviewKcrs = kcrs.filter((k) => ['review', 'grounded', 'researching'].includes(k.status))
        .sort((a, b) => (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0));
      const sentBack = reviewKcrs.filter((k) => k.status === 'researching').length;
      return (
        <div>
          <Banner>KCRs in review — SME, editorial, and governance sign-off required (role-gated). KCR-6 governs which roles can advance each stage. No auto-advancement.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="In review" value={byStatus.review || 0} tone={D.warn} />
            <PBKpi label="Sent back" value={sentBack} tone={sentBack ? D.warn : D.faint} />
            <PBKpi label="Aging >30d" value={metrics.staleCount} tone={metrics.staleCount ? D.bad : D.faint} onClick={metrics.staleCount ? () => setStatusFilter('stale') : undefined} />
          </div>
          {loading ? <Banner tone="muted">Loading…</Banner> : reviewKcrs.length === 0
            ? <Empty msg="KCRs reach review when a campaign produces a grounded finding. Run one via Campaigns." />
            : <KcrTable items={reviewKcrs} />
          }
        </div>
      );
    }

    // ─── ACQUISITION (Phase 5F.2) ────────────────────────────────────────────
    // Discovery over the AUTHORED corpus. The field list comes from
    // governableFieldsFor(), which derives from the runtime ownership contract —
    // so an engine-delegated or unconsumed field can never appear here, and the
    // picker cannot drift from what actually reaches a host.
    if (ws === 'Acquisition') {
      // Same baked snapshot the runtime serves — so "published" here means published
      // to a host, not merely present in Admin's store.
      const liveIdx = publishedEntries().map((e) => ({ assetId: e.assetId, fieldPath: e.fieldPath }));
      const tree = acquisitionTree(ALL_PLAYBOOKS, liveIdx, {
        assetId: acqAsset || null, state: acqState || null, query: acqQuery,
      });
      const summary = acquisitionSummary(acquisitionTree(ALL_PLAYBOOKS, liveIdx));
      // CANONICAL INVENTORY (5F.6 W2). The KPIs above count governable FIELD SLOTS
      // (1,605). That is a real number and a different unit from purchase LINES, and
      // three separate counters in this repo have each reported a different "how much
      // do we know" figure by silently dropping something. This block states the one
      // denominator that never shrinks — every authored line, always.
      // FULL entries, not `liveIdx` (Phase 5F.11). `liveIdx` maps each entry down to
      // `{assetId, fieldPath}` for the picker, which is all `acquisitionTree` needs —
      // but `knowledgeInventory` reads `entry.value` to decide whether a GOVERNED
      // provenance grounds. Passing the stripped list made that lookup `undefined`, so
      // every governed line fell back to its authored provenance and was counted
      // `reviewed` instead of `grounded`.
      //
      // Measured: the console read "grounded 38 · reviewed 8" while the committed
      // corpus measured 46 and 0. The console UNDERSTATED its own grounding — the same
      // measurement-disagrees-with-runtime shape this programme keeps finding, this
      // time caused by a convenience mapping two lines earlier.
      const liveEntriesFull = publishedEntries();
      const inv = knowledgeInventory(ALL_PLAYBOOKS, liveEntriesFull);
      const cls = backfillClassification(ALL_PLAYBOOKS, liveEntriesFull);
      const STATE_TONE = {
        published: D.good, 'missing-provenance': D.warn, 'needs-research': D.warn,
        correctable: D.accent, ungoverned: D.muted,
      };
      return (
        <div>
          <Banner tone="muted">
            Knowledge Acquisition — browse the authored corpus and open governed corrections.
            Published knowledge is an overlay, not the starting point: before this workspace,
            only fields that were ALREADY governed could be corrected, so {summary.assets - (summary.assets - summary.ungovernedAssets)} of {summary.assets} playbooks were unreachable.
          </Banner>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '10px 0 14px' }}>
            <PBKpi label="Assets" value={summary.assets} />
            <PBKpi label="Governable fields" value={summary.fields} />
            <PBKpi label="Never governed" value={summary.ungovernedAssets} tone={D.muted} />
            <PBKpi label="Missing provenance" value={summary.counts['missing-provenance']} tone={D.warn} />
            <PBKpi label="Published" value={summary.counts.published} tone={D.good} />
          </div>
          {/* The canonical inventory + what kind of work the remainder needs. Text, not
              a new surface — the point is that ONE denominator is visible, not that
              there is another dashboard. */}
          <div style={{ border: `1px solid ${D.border}`, borderRadius: 6, padding: '10px 12px',
            marginBottom: 12, fontFamily: D.mono, fontSize: 10, color: D.muted, lineHeight: 1.7 }}>
            <div style={{ color: D.text, marginBottom: 4 }}>
              KNOWLEDGE INVENTORY — {inv.total} authored lines. {directlyCitedShare(inv)}% directly cited to a registered source
              (NOT the share with an intellectual basis — see the basis distribution below).
            </div>
            <div>
              {INVENTORY_STATES.map((s) => `${s} ${inv.counts[s]}`).join('  ·  ')}
            </div>
            <div style={{ marginTop: 6, color: D.text }}>
              {classificationSummary(cls)}
            </div>
            <div style={{ marginTop: 4 }}>
              The denominator never shrinks because evidence is missing — a line with no
              source is counted, not skipped.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <input value={acqQuery} onChange={(e) => setAcqQuery(e.target.value)}
              placeholder="find an item…"
              style={{ fontSize: 10, fontFamily: D.mono, background: D.surface, color: D.text,
                border: `1px solid ${D.border}`, borderRadius: 5, padding: '4px 8px', width: 190 }} />
            <select value={acqAsset} onChange={(e) => setAcqAsset(e.target.value)}
              style={{ fontSize: 10, fontFamily: D.mono, background: D.surface, color: D.text,
                border: `1px solid ${D.border}`, borderRadius: 5, padding: '4px 6px' }}>
              <option value="">all playbooks</option>
              {(ALL_PLAYBOOKS || []).map((p) => p && p.type)
                .filter(Boolean).sort().map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {['', ...GOVERNANCE_STATES].map((s) => (
              <button key={s || 'all'} type="button" onClick={() => setAcqState(s)}
                style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
                  border: `1px solid ${acqState === s ? D.accent : D.border}`,
                  background: acqState === s ? D.accent + '22' : 'transparent',
                  color: acqState === s ? D.accent : D.muted }}>
                {s || 'any state'}
              </button>
            ))}
          </div>
          {tree.length === 0 ? <Empty msg="No governable fields match those filters." /> : tree.slice(0, 12).map((a) => (
            <div key={a.assetId} style={{ marginBottom: 14, border: `1px solid ${D.border}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: D.text, marginBottom: 2 }}>
                {a.assetId}
                <span style={{ fontSize: 9, fontFamily: D.mono, color: a.ungoverned ? D.muted : D.good, marginLeft: 8 }}>
                  {a.ungoverned ? 'never governed' : `${a.publishedCount} governed`}
                </span>
              </div>
              {a.categories.map((c) => (
                <div key={c.category} style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, fontFamily: D.mono, color: D.faint, textTransform: 'uppercase', letterSpacing: '.08em' }}>{c.category}</div>
                  {c.items.map((it) => (
                    <div key={it.id} style={{ marginTop: 5, paddingLeft: 8, borderLeft: `1px solid ${D.border}` }}>
                      <div style={{ fontSize: 10.5, color: D.text }}>
                        {String(it.item).slice(0, 62)}
                        <span style={{ fontFamily: D.mono, fontSize: 9, color: D.faint, marginLeft: 6 }}>{it.id}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                        {it.fields.map((f) => (
                          <button key={f.field} type="button"
                            title={`state: ${f.state} — open a governed correction`}
                            onClick={() => {
                              // Hands the composer an ASSET + FIELD, not a published row.
                              setAcqTarget({ assetId: a.assetId, purchaseId: it.id, field: f.field, state: f.state });
                              setCorrectPurchase(it.id); setCorrectField(f.field);
                              setCorrectDraft(null); setCorrectReason(''); setCorrectNote('');
                              setWs('Publishing');
                            }}
                            style={{ fontSize: 9, fontFamily: D.mono, padding: '2px 7px', borderRadius: 5,
                              cursor: 'pointer', border: `1px solid ${STATE_TONE[f.state] || D.border}`,
                              background: 'transparent', color: STATE_TONE[f.state] || D.muted }}>
                            {f.field} · {f.state}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {tree.length > 12 && (
            <div style={{ fontSize: 9, color: D.faint, fontFamily: D.mono }}>
              showing 12 of {tree.length} assets — narrow with a filter
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Publishing') {
      const pubKcrs = kcrs.filter((k) => k.status === 'approved')
        .sort((a, b) => a.assetId.localeCompare(b.assetId));
      // Phase 5C.4 — the export that closes Admin -> bake -> runtime.
      // Phase 5C.6 (D2) — MERGE, never replace. Admin's store only holds KCRs Admin
      // originated, so exporting it alone would delete governed knowledge Admin has
      // never heard of. The baked snapshot is the merge base: it is the same bytes
      // the runtime resolver serves, and it contains only lineage heads.
      const liveEntries = publishedEntries();
      // PHASE 5D (P0): merge base is the COMMITTED EXPORT (full records, superseded
      // history included), not the snapshot. Reconstructing from heads dropped v1 on
      // the second correction and stripped 11 of 21 fields off every survivor.
      const mergedForExport = exportBase(kcrs, liveEntries);
      const inventory = publishedInventory(liveEntries);
      const exported = publishedKcrsForExport(mergedForExport);
      const expSum = exportSummary(mergedForExport);
      // CORRECT THIS (Phase 5C.7). Opens a governed correction against a LIVE published
      // artifact and stops at Review. It does not publish, does not write an override, and
      // does not touch publishedKnowledge — a correction that could skip review would be a
      // wider hole than the defect it fixes. The prior KCR is reconstructed from the baked
      // snapshot (the same bytes runtime serves) so lineage has a real ancestor to name.
      //
      // PHASE 5F.2 — TWO ORIGINS, ONE COMPOSER.
      //
      // This used to hard-refuse anything without a live snapshot entry ("no live
      // entry for that field"), which meant a field could only be governed if it was
      // ALREADY governed: 2 assets of 39 reachable, and the corpus could never grow
      // through the tool built to grow it.
      //
      // Now a correction has two legitimate origins:
      //   SUPERSESSION  — a published prior exists -> openCorrection, correctionOf set
      //   FIRST GOVERNANCE — authored only        -> openAuthoredGovernance, no parent
      //
      // They are separate functions on purpose. One function whose most important
      // behaviour (does this retire a previous version?) hinged on a nullable argument
      // is the shape that produced the 5E cross-field lineage defect, where a
      // correction claimed an ancestor it did not have.
      const doCorrect = async (row) => {
        // The picker hands over an asset+field that may have no published row at all.
        const target = acqTarget && !row ? acqTarget : null;
        const assetId = row ? row.assetId : target.assetId;
        const pid = correctPurchase || (row ? String(row.fieldPath).split('.')[0] : target.purchaseId);
        const entry = liveEntries.find((e) => e.assetId === assetId
          && e.fieldPath === (row ? row.fieldPath : `${pid}.${correctField}`));
        const prior = entry && snapshotEntryToKcr(entry);
        const reason = correctReason;
        if (!reason || !reason.trim()) { setCorrectNote('A correction must state its reason.'); return; }
        if (!prior && !target && !row) { setCorrectNote('Correction blocked: no asset selected.'); return; }
        try {
          // PHASE 5E — the correction now carries a TYPED value, not the old one.
          // `correctField` names which governed field is being changed; the field
          // type parses the editor draft into the engine's shape and refuses
          // anything it cannot. `provenance` with no draft keeps prior behaviour.
          const fType = fieldTypeFor(`${pid}.${correctField}`);
          // With no published entry there is no prior value to carry, so the draft is
          // required — a first governance cannot mean "publish whatever was already there".
          let newValue = entry ? entry.value : undefined;
          let targetPath = row ? row.fieldPath : `${pid}.${correctField}`;
          if (correctDraft != null && fType) {
            const parsed = fType.parse(correctDraft);
            if (!parsed.ok) { setCorrectNote(`Blocked: ${parsed.error}`); return; }
            const ed = validateForEditor(`${pid}.${correctField}`, parsed.value);
            if (!ed.ok) { setCorrectNote(`Blocked: ${ed.errors.join(' ')}`); return; }
            // SOURCE AUTHORITY (5F.2 Step 2). Enforced at SUBMIT, not only in the
            // picker: a UI that merely omits an option is a suggestion, and this
            // programme has already shipped one thing that was labelled safe and
            // wasn't. The picker cannot offer a wrong-axis source, but the draft is
            // still plain state, so the gate belongs where the record is created.
            // BOTH SLOTS (2026-08-18). This gate read `provenance` only, so once the
            // editor could author a cost citation the axis check would have been
            // skipped for exactly the corrections that need it most — a quantity id
            // pasted into a cost claim would have published clean and never grounded.
            // The path is derived from correctField so the gate follows the editor.
            if ((correctField === 'provenance' || correctField === 'costProvenance')
                && Array.isArray(parsed.value && parsed.value.sources)) {
              const srcCheck = validateSourcesFor(`${pid}.${correctField}`, parsed.value.sources);
              if (!srcCheck.ok) { setCorrectNote(`Blocked: ${srcCheck.errors.join(' ')}`); return; }
            }
            newValue = parsed.value;
            targetPath = `${pid}.${correctField}`;
          }
          // CROSS-FIELD LINEAGE (5E defect, caught in the browser). Correcting a
          // DIFFERENT field than the one published is not a correction of that
          // lineage — `p_crabs.qtyPerGuest` has never been published, so claiming it
          // supersedes `...p-crabs-provenance-v1` would fabricate an ancestor and
          // wrongly retire the provenance record on the next bake. A new field starts
          // its own lineage; only a same-field change supersedes.
          // FIRST GOVERNANCE — no published prior anywhere for this asset+field.
          if (!prior) {
            if (newValue === undefined) {
              setCorrectNote('Blocked: enter the corrected value — a first governance has no prior value to carry.');
              return;
            }
            // DIVERGENCE GUARD (5F.5). `prior` above is derived from the SNAPSHOT alone,
            // so a field already published in the STORE reaches here looking ungoverned —
            // which is precisely how a second parentless lineage was created in 5F.4.
            // The guard reads both, and blocks rather than choosing a winner.
            const fg = firstGovernanceGuard(assetId, targetPath, kcrs, liveEntries);
            if (!fg.ok) { setCorrectNote(`Blocked: ${fg.reason}`); return; }
            const pbA = (ALL_PLAYBOOKS || []).find((x) => x && x.type === assetId);
            const puA = pbA && (pbA.purchases || []).find((x) => x && x.id === pid);
            const firstK = openAuthoredGovernance(
              { assetId, fieldPath: targetPath, authoredValue: puA ? puA[correctField] : null },
              { newValue,
                // NEWPROVENANCE MUST MIRROR THE CITED SOURCES (5F.10). The composer left
                // this null, so `format()` wrote the default
                // `{verificationStatus: 'synthesized', sources: []}` — and the BAKE reads
                // `newProvenance`, not `newValue`, for the entry-level provenance and
                // `evidenceIds`. Measured on three records promoted to the corpus:
                //
                //   snapshot entry -> evidenceIds: []   provenance.verificationStatus: 'synthesized'
                //   snapshotEntryToKcr(entry) -> no evidence ids to hydrate
                //   canReachCited(reconstructed) -> FALSE
                //
                // A host still saw the Sourced line (that reads `newValue`), so this was
                // invisible from the front — but the field could never be corrected again
                // from the snapshot. The two provenance halves have to agree.
                newProvenance: provenanceMirror(correctField, newValue),
                reason: reason.trim(), by: role, asOf: new Date().toISOString(),
                // EVIDENCE (5F.8). This argument was never supplied, so every record this
                // path has ever created carried `evidence: []` — and `canReachCited`
                // therefore refused it, making the record unpromotable to the corpus and
                // the field permanently uncorrectable. Four such records are in the store.
                // The sources are the ones the human picked from the axis-approved list;
                // this records that choice in the shape the corpus requires.
                evidence: evidenceFromSources(newValue && newValue.sources,
                  { confidence: (newValue && newValue.confidence) || 'medium' }),
                id: `authored-${assetId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${targetPath.replace(/[^a-zA-Z0-9]+/g, '-')}-${Date.now()}` },
            );
            await upsertKCR(firstK);
            setCorrectNote(`First governance opened for ${assetId} · ${targetPath} — authored value ${JSON.stringify(puA ? puA[correctField] : null)} recorded as the prior. Starts a new lineage and supersedes nothing. Awaiting review ✓`);
            setCorrectRow(null); setAcqTarget(null); setCorrectReason('');
            setCorrectDraft(null); setCorrectField('provenance');
            await refresh();
            return;
          }
          const isSameField = targetPath === prior.fieldPath;
          const corr = openCorrection({ ...prior, fieldPath: targetPath }, {
            newValue,
            newProvenance: provenanceMirror(correctField, newValue),
            reason: reason.trim(),
            by: role,
            asOf: new Date().toISOString(),
            // Same fix on the supersession path. `openCorrection` carries the prior's
            // evidence forward, which is right for a same-field correction — but a
            // correction that changes the CITED SOURCES must carry the new ones too, or
            // the evidence describes the superseded claim.
            evidence: evidenceFromSources(newValue && newValue.sources,
              { confidence: (newValue && newValue.confidence) || 'medium' }),
            id: `${prior.id}-correction-${Date.now()}`,
          });
          await upsertKCR(prior);                // seed the ancestor so lineage resolves
          // A new-field publication carries no ancestor; publishKCR then mints a
          // fresh v1 instead of superseding an unrelated record.
          await upsertKCR(isSameField ? corr : { ...corr, correctionOf: null });
          // The message has to tell the SAME truth the record does. It used to claim
          // "(supersedes <prior version>)" unconditionally — so opening the first
          // correction of a new field from an unrelated published row announced that
          // it would retire that row, while `correctionOf: null` two lines above says
          // it will not. The lineage was right and the sentence was wrong, which is
          // the worse of the two failures: an admin can only act on the sentence.
          setCorrectNote(isSameField
            ? `Correction opened for ${targetPath} (supersedes ${prior.publishedVersion}) — awaiting review ✓`
            : `Correction opened for ${targetPath} — a newly governed field, so it starts its own lineage and supersedes nothing. Awaiting review ✓`);
          setCorrectRow(null); setCorrectReason(''); setCorrectDraft(null); setCorrectField('provenance');
          // REGRESSION FIX (Phase 5C.8). This is why the correction landed in the store
          // but Review showed 0: the workspace's `kcrs` state was never re-read after
          // upsertKCR. `refresh` is the component-level loader; Review filters purely on
          // status, so once the state is current the correction appears.
          await refresh();
          setWs('Review');
        } catch (e) { setCorrectNote(`Blocked: ${e.message}`); }
      };

      const doRollback = async (row) => {
        const { head } = lineageHistory(row.assetId, row.fieldPath, kcrs);
        if (!head) { setCorrectNote('Rollback blocked: no published head for that field.'); return; }
        if (!rollbackReason.trim()) { setCorrectNote('A rollback must state its reason.'); return; }
        try {
          // rollbackKCR requires the head to be IN the store — seed it if this is the
          // first action on a committed-but-never-loaded record.
          const seeded = kcrs.find((k) => k.id === head.id) ? null : head;
          if (seeded) await upsertKCR(seeded);
          const reverted = rollbackKCR(head, { by: role, asOf: new Date().toISOString() });
          await upsertKCR({
            ...reverted,
            // The reason rides on the record, not just in a toast — a withdrawal with no
            // stated cause is indistinguishable from an accident.
            reason: `ROLLBACK: ${rollbackReason.trim()} (was ${head.publishedVersion})`,
          });
          const target = rollbackTarget(row.assetId, row.fieldPath, kcrs);
          setCorrectNote(`Rolled back ${row.fieldPath} — ${target
            ? `${target.publishedVersion} becomes the head`
            : 'the field reverts to its AUTHORED value'} on the next bake ✓`);
          setRollbackRow(null); setRollbackReason('');
          await refresh();
        } catch (e) { setCorrectNote(`Blocked: ${e.message}`); }
      };

      const doExport = () => {
        const blob = new Blob([serializePublishedExport(mergedForExport)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = EXPORT_FILENAME;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      };
      return (
        <div>
          <Banner>KCRs approved and ready to publish — the final human gate. Publishing writes a governed KCR record. Nothing publishes automatically, and nothing reaches a host until the export below is committed and baked.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Approved" value={byStatus.approved || 0} tone={D.good} />
            <PBKpi label="Published all time" value={byStatus.published || 0} tone={D.good} />
            <PBKpi label="In export (heads)" value={expSum.heads} tone={D.accent} />
            <PBKpi label="Superseded (history)" value={expSum.superseded} tone={D.faint} />
          </div>

          {/* THE MISSING LINK. Publishing a KCR does not change what a host sees — the
              runtime reads a BAKED artifact built from knowledge-exports/published-kcrs.json.
              This projects the published KCRs into exactly that file. The bake stays a
              deliberate human step (download -> commit -> `npm run bake:knowledge`), so a bad
              publish is caught in a diff instead of discovered by a host. */}
          <div style={{ border: `1px solid ${D.border}`, borderRadius: 8, padding: 12, marginBottom: 14, background: D.surface2 }}>
            <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 8 }}>
              RUNTIME EXPORT — {expSum.records} published record{expSum.records === 1 ? '' : 's'} across {expSum.fields} field{expSum.fields === 1 ? '' : 's'}
              {expSum.superseded > 0 && ` · ${expSum.superseded} superseded (kept for history, will not win resolution)`}
            </div>
            <div style={{ fontSize: 10, color: D.faint, marginBottom: 10, lineHeight: 1.5 }}>
              Download replaces <code>knowledge-exports/{EXPORT_FILENAME}</code>, then run <code>npm run bake:knowledge</code>.
              Nothing here writes to runtime. Verify any field afterwards in Runtime Preview.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={doExport} disabled={!exported.length}
                style={{ padding: '5px 11px', borderRadius: 6, fontSize: type.size.caption, fontFamily: D.ff,
                  border: `1px solid ${D.accent}`, background: exported.length ? D.accent : 'transparent',
                  color: exported.length ? '#0b0d10' : D.faint, cursor: exported.length ? 'pointer' : 'not-allowed' }}>
                Export published KCRs
              </button>
              <button type="button" onClick={() => setWs('Runtime Preview')}
                style={{ padding: '5px 11px', borderRadius: 6, fontSize: type.size.caption, fontFamily: D.ff,
                  border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer' }}>
                Verify in Runtime Preview →
              </button>
            </div>
          </div>

          {/* PUBLISHED KNOWLEDGE INVENTORY (Phase 5C.6, D1) — "what is currently live?"
              Read from the baked artifact the runtime itself serves, so it cannot drift
              from what a host sees. A projection, not a second store. */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 6 }}>
              LIVE IN RUNTIME — {inventory.length} governed field{inventory.length === 1 ? '' : 's'}
            </div>
            {/* DIVERGENCE DETECTION (Phase 5F.4.1). Three states claim to know what is
                governed — the admin store, the baked snapshot, and the committed corpus —
                and they diverged twice in one session with nothing reporting it. Once a
                duplicate lineage was created because the picker read the SNAPSHOT (which
                had been restored) while the store already held a published record.
                DETECTION ONLY: which side is right is a human judgement, and a tool that
                guessed would sometimes delete real work. */}
            {(() => {
              const dv = detectDivergence(kcrs, publishedEntries());
              if (dv.ok) return null;
              return (
                <div style={{ fontSize: 9, color: D.warn, border: `1px solid ${D.warn}55`,
                  borderRadius: 6, padding: 8, marginBottom: 8, lineHeight: 1.55 }}>
                  <strong>{divergenceSummary(dv)}</strong>
                  {dv.findings.slice(0, 5).map((f, i) => (
                    <div key={i} style={{ color: D.muted, marginTop: 3, fontFamily: D.mono }}>
                      {f.kind} — {f.detail}
                    </div>
                  ))}
                  {dv.findings.length > 5 && (
                    <div style={{ color: D.faint, marginTop: 3 }}>+{dv.findings.length - 5} more</div>
                  )}
                </div>
              );
            })()}
            {/* RECONCILIATION (5F.6 W1). Divergence above says the store and the snapshot
                disagree. This says what to DO about each record that exists only here —
                with the caveat that the machine never says "promote". Every clean record
                still needs a human to confirm the source's scope reaches the event. */}
            {(() => {
              const cands = reconciliationCandidates(kcrs, publishedEntries(), publishedCorpus);
              if (!cands.length) return null;
              return (
                <div style={{ fontSize: 9, color: D.muted, border: `1px solid ${D.border}`,
                  borderRadius: 6, padding: 8, marginBottom: 8, lineHeight: 1.55 }}>
                  <strong style={{ color: D.text }}>{reconciliationSummary(cands)}</strong>
                  {cands.slice(0, 6).map((c) => (
                    <div key={c.key} style={{ marginTop: 3, fontFamily: D.mono }}>
                      <span style={{ color: c.recommended === 'reject' ? D.warn : D.faint }}>
                        {c.recommended}
                      </span>
                      {' — '}{c.assetId} · {c.fieldPath}
                      {c.blockers.length ? ` [${c.blockers.join(', ')}]` : ''}
                      {' · host impact: '}{c.hostImpact}
                    </div>
                  ))}
                  {cands.length > 6 && (
                    <div style={{ color: D.faint, marginTop: 3 }}>+{cands.length - 6} more</div>
                  )}
                </div>
              );
            })()}
            {/* SOURCE FRESHNESS (5F.6 W3). Recorded in 90 places, surfaced in none until
                now. A WARNING only — nothing here withdraws grounding. */}
            {(() => {
              const fresh = sourceFreshness(new Date().toISOString());
              const due = needsRecheck(fresh);
              if (!due.length) return null;
              return (
                <div style={{ fontSize: 9, color: D.muted, border: `1px solid ${D.border}`,
                  borderRadius: 6, padding: 8, marginBottom: 8, lineHeight: 1.55 }}>
                  <strong style={{ color: D.text }}>{freshnessSummary(fresh)}</strong>
                  {due.slice(0, 4).map((r) => (
                    <div key={r.id} style={{ marginTop: 3, fontFamily: D.mono }}>
                      {r.state} — {r.id} ({r.axis}) · {r.action}
                    </div>
                  ))}
                  {due.length > 4 && (
                    <div style={{ color: D.faint, marginTop: 3 }}>+{due.length - 4} more</div>
                  )}
                </div>
              );
            })()}
            {correctNote && <div style={{ fontSize: 10, color: D.good, marginBottom: 6, fontFamily: D.mono }}>{correctNote}</div>}
            {/* ACQUISITION TARGET (Phase 5F.2). The picker can select a field that has
                never been published, which has no inventory row to attach a composer to.
                Rather than fork the 297-line typed editor, the target is rendered as a
                first-class row: same composer, same validation, same gates — the only
                difference is that `doCorrect` finds no prior and opens a FIRST
                governance instead of a supersession. One editor, two origins. */}
            {(() => {
              if (!acqTarget) return null;
              const fp = `${acqTarget.purchaseId}.${acqTarget.field}`;
              const already = inventory.some((r) => r.assetId === acqTarget.assetId && r.fieldPath === fp);
              if (already) return null;                 // it IS governed — the real row handles it
              const pseudo = { assetId: acqTarget.assetId, fieldPath: fp, version: '(not yet governed)' };
              return (
                <div style={{ padding: '6px 8px', border: `1px solid ${D.accent}55`, borderRadius: 6, marginBottom: 8, background: D.surface2 }}>
                  <div style={{ fontSize: 10, color: D.text, fontFamily: D.mono }}>
                    {pseudo.assetId} · {pseudo.fieldPath}
                    <span style={{ color: D.accent, marginLeft: 8, fontSize: 9 }}>FROM ACQUISITION — never governed</span>
                  </div>
                  <div style={{ fontSize: 9, color: D.faint, marginTop: 2 }}>
                    Authored value is the prior. This starts a new lineage and supersedes nothing.
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                    <button type="button" onClick={() => { setCorrectRow(pseudo); setRollbackRow(null); }}
                      style={{ fontSize: 9, background: 'transparent', border: `1px solid ${D.accent}`, borderRadius: 5, padding: '3px 10px', color: D.accent, cursor: 'pointer' }}>
                      Govern this field
                    </button>
                    <button type="button" onClick={() => { setAcqTarget(null); setCorrectRow(null); }}
                      style={{ fontSize: 9, background: 'transparent', border: `1px solid ${D.border}`, borderRadius: 5, padding: '3px 10px', color: D.muted, cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>
                  {correctRow && correctRow.fieldPath === pseudo.fieldPath && correctRow.assetId === pseudo.assetId && (
                    <div style={{ fontSize: 9, color: D.faint, marginTop: 4 }}>Composer open below.</div>
                  )}
                </div>
              );
            })()}
            {inventory.length === 0 && !acqTarget
              ? <Empty msg="No governed knowledge is live. Runtime is serving authored defaults for every field." />
              : [
                  ...(acqTarget && !inventory.some((r) => r.assetId === acqTarget.assetId
                        && r.fieldPath === `${acqTarget.purchaseId}.${acqTarget.field}`)
                    ? [{ assetId: acqTarget.assetId, fieldPath: `${acqTarget.purchaseId}.${acqTarget.field}`,
                         version: '(not yet governed)', tier: 'authored', confidence: '-', asOf: '-', firstGovernance: true }]
                    : []),
                  ...inventory,
                ].map((r) => (
                <div key={`${r.assetId}-${r.fieldPath}`} style={{ padding: '6px 8px', borderBottom: `1px solid ${D.border}44` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontFamily: D.mono, color: D.text, flex: 1 }}>{r.assetId} · {r.fieldPath}</span>
                    <span style={{ fontSize: 9, color: D.good, fontFamily: D.mono }}>{r.runtimeStatus}</span>
                    <span style={{ fontSize: 9, color: D.faint, fontFamily: D.mono }}>{r.confidence || '—'}</span>
                    <button type="button"
                      onClick={() => { setRtType(r.assetId); setRtField(r.fieldPath); setRtResult(null); setWs('Runtime Preview'); }}
                      style={{ fontSize: 9, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 5, padding: '2px 8px', color: D.accent, cursor: 'pointer' }}>
                      verify →
                    </button>
                    <button type="button" onClick={() => { setRollbackRow(r); setRollbackReason(''); setCorrectRow(null); }}
                      title="Withdraw this published version. The prior version becomes live; nothing is deleted."
                      style={{ fontSize: 9, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 5, padding: '2px 8px', color: D.muted, cursor: 'pointer' }}>
                      Rollback
                    </button>
                    <button type="button" onClick={() => { setCorrectRow(r); setCorrectReason(''); setRollbackRow(null); }}
                      title="Open a governed correction that supersedes this version. Goes to Review — nothing publishes here."
                      style={{ fontSize: 9, background: D.surface2, border: `1px solid ${D.warn}`, borderRadius: 5, padding: '2px 8px', color: D.warn, cursor: 'pointer' }}>
                      Correct this
                    </button>
                  </div>
                  <div style={{ fontSize: 9, fontFamily: D.mono, color: D.faint, marginTop: 2 }}>
                    {r.version || 'no version'} · {r.tier || 'no tier'} · {r.publishedAt ? String(r.publishedAt).slice(0, 10) : 'no date'}
                  </div>
                  {rollbackRow && rollbackRow.fieldPath === r.fieldPath && rollbackRow.assetId === r.assetId && (() => {
                    const { history } = lineageHistory(r.assetId, r.fieldPath, kcrs);
                    const target = rollbackTarget(r.assetId, r.fieldPath, kcrs);
                    return (
                      <div style={{ marginTop: 6, padding: 8, border: `1px solid ${D.border}`, borderRadius: 6, background: D.surface2 }}>
                        <div style={{ fontSize: 9, color: D.muted, marginBottom: 5 }}>VERSION HISTORY — newest first</div>
                        {history.map((h, i) => (
                          <div key={h.id} style={{ fontSize: 9, fontFamily: D.mono, color: i === 0 ? D.text : D.faint, marginBottom: 2 }}>
                            {i === 0 ? '● live  ' : '   ·    '}{h.publishedVersion}
                          </div>
                        ))}
                        <div style={{ fontSize: 10, color: target ? D.warn : D.bad, margin: '7px 0 5px' }}>
                          {target
                            ? `Rolling back makes ${target.publishedVersion} live again.`
                            : 'No earlier version — this field would revert to its AUTHORED value.'}
                        </div>
                        <textarea value={rollbackReason} onChange={(e) => setRollbackReason(e.target.value)}
                          placeholder="Why is this version being withdrawn?"
                          style={{ width: '100%', minHeight: 40, fontSize: 10, fontFamily: D.mono, background: D.surface,
                            color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 6 }} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button type="button" onClick={() => doRollback(r)} disabled={!rollbackReason.trim()}
                            style={{ fontSize: 9, background: rollbackReason.trim() ? D.bad : 'transparent',
                              border: `1px solid ${D.bad}`, borderRadius: 5, padding: '3px 10px',
                              color: rollbackReason.trim() ? '#0b0d10' : D.faint, cursor: rollbackReason.trim() ? 'pointer' : 'not-allowed' }}>
                            Confirm rollback
                          </button>
                          <button type="button" onClick={() => { setRollbackRow(null); setRollbackReason(''); }}
                            style={{ fontSize: 9, background: 'transparent', border: `1px solid ${D.border}`, borderRadius: 5, padding: '3px 10px', color: D.muted, cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  {correctRow && correctRow.fieldPath === r.fieldPath && correctRow.assetId === r.assetId && (
                    <div style={{ marginTop: 6, padding: 8, border: `1px solid ${D.warn}55`, borderRadius: 6, background: D.surface2 }}>
                      <div style={{ fontSize: 9, color: D.muted, marginBottom: 5 }}>
                        Correcting <code>{r.version}</code> — the new version will supersede it. Goes to Review; nothing publishes here.
                      </div>
                      {/* FIELD-AWARE VALUE EDITOR (Phase 5E). Which governed field is
                          changing decides which inputs render, because the shapes differ:
                          qtyPerGuest is a number, unitCostRange is a [min,max] tuple,
                          provenance is a structured block. One free-text box would happily
                          publish "0.5" as a string and the engine would resolve NaN in a
                          host's shopping list — which is why there isn't one. */}
                      {/* PURCHASE picker (5E.3). Governing a field that was never published
                          is the normal case — the inventory only shows what is already live. */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: D.faint }}>ITEM</span>
                        <select value={correctPurchase || String(r.fieldPath).split('.')[0]}
                          onChange={(e) => { setCorrectPurchase(e.target.value); setCorrectDraft(null); }}
                          style={{ fontSize: 9, fontFamily: D.mono, background: D.surface, color: D.text,
                            border: `1px solid ${D.border}`, borderRadius: 5, padding: '2px 6px', maxWidth: 320 }}>
                          {(((ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId) || {}).purchases || [])
                            .map((pu) => (
                              <option key={pu.id} value={pu.id}>
                                {pu.id} — {String(pu.item).slice(0, 42)}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: D.faint }}>FIELD</span>
                        {/* The two ENGINE-GOVERNING fields (5E.3) are offered only on a
                            purchase that actually carries them. Listing priceLadder on
                            Old Bay would offer a route that resolves to nothing — the
                            same emptiness the ownership contract refuses elsewhere. */}
                        {(() => {
                        const pbF = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                        const pidF = correctPurchase || String(r.fieldPath).split('.')[0];
                        const puF = pbF && (pbF.purchases || []).find((x) => x && x.id === pidF);
                        return ['provenance', 'qtyPerGuest', 'unitCostRange']
                          .concat(['priceLadder', 'servingGuide'].filter((f) => puF && puF[f]))
                          .map((f) => {
                          // The PURCHASE is passed so ownership reflects what this line
                          // actually carries (e.g. `sourcingPrices` on a channel-priced
                          // protein), not an id allowlist that can go stale.
                          const own = fieldOwnership(r.assetId, `${pidF}.${f}`, puF);
                          return (
                          <button key={f} type="button" disabled={!own.editable}
                            title={own.editable ? '' : blockedMessage(own)}
                            onClick={() => {
                              if (!own.editable) return;
                              setCorrectField(f);
                              if (f === 'provenance') { setCorrectDraft(null); return; }
                              // PRE-FILL from what is CURRENTLY live (Phase 5E). A correction
                              // is an old -> new decision, so the reviewer must see the number
                              // being replaced; an empty box turns a governed change into a
                              // guess. Reads the same purchase the engine reads.
                              const pbNow = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                              const pid = correctPurchase || String(r.fieldPath).split('.')[0];
                              const purch = pbNow && (pbNow.purchases || []).find((x) => x && x.id === pid);
                              const live = purch ? purch[f] : undefined;
                              setCorrectDraft(fieldTypeFor(`x.${f}`).format(live));
                            }}
                            style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5,
                              cursor: own.editable ? 'pointer' : 'not-allowed',
                              border: `1px solid ${correctField === f ? D.accent : D.border}`,
                              background: correctField === f ? D.accent + '22' : 'transparent',
                              opacity: own.editable ? 1 : 0.45,
                              color: correctField === f ? D.accent : D.muted }}>
                            {f}{own.editable ? '' : ' (engine-owned)'}
                          </button>
                          );
                        });
                        })()}
                      </div>
                      {/* OWNERSHIP (5E.1). Naming the engine and the governing rule, because
                          "you cannot edit this" with no next step reads as a broken tool. */}
                      {(() => {
                        const _pbO = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                        const _pidO = correctPurchase || String(r.fieldPath).split('.')[0];
                        const _puO = _pbO && (_pbO.purchases || []).find((x) => x && x.id === _pidO);
                        const own = fieldOwnership(r.assetId, `${_pidO}.${correctField}`, _puO);
                        return own.editable ? null : (
                          <div style={{ fontSize: 9, color: D.warn, marginBottom: 6, lineHeight: 1.5 }}>
                            {blockedMessage(own)}
                            <div style={{ color: D.faint, marginTop: 2 }}>{own.why}</div>
                          </div>
                        );
                      })()}
                      {/* PROVENANCE EDITOR (Phase 5F). `governedFieldTypes.provenance` has
                          carried format/parse/validate/validateForEditor since 5E, and the
                          composer rendered inputs for every OTHER typed field but not this
                          one. Selecting `provenance` therefore left the draft null and
                          doCorrect fell through to `newValue = entry.value` — the correction
                          re-published the EXISTING provenance unchanged. An administrator
                          could not author a new source attribution at all; every provenance
                          block in the corpus got there by a developer editing a file.
                          That is the acquisition bottleneck this phase exists to remove. */}
                      {(correctField === 'provenance' || correctField === 'costProvenance') && (() => {
                        // BOTH SLOTS, ONE EDITOR (2026-08-18). This was hardcoded to
                        // `provenance`. The cost registry grew to ~325 sources and an
                        // operator could not cite ANY of them, because the only editor
                        // authored the quantity slot and `axisForField` therefore always
                        // resolved the quantity axis. The paths below are now derived from
                        // `correctField`, so the picker offers COST_SOURCES for a cost
                        // correction and QTY_SOURCES for a quantity one — which is the
                        // "what an admin can cite and what can ground are the same list"
                        // invariant this block already claimed, finally true on both axes.
                        const T = fieldTypeFor(`x.${correctField}`);
                        const pbNow = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                        const pid = correctPurchase || String(r.fieldPath).split('.')[0];
                        const pu = pbNow && (pbNow.purchases || []).find((x) => x && x.id === pid);
                        const live = pu ? pu[correctField] : undefined;
                        const d = (correctDraft && typeof correctDraft === 'object' && 'sources' in correctDraft)
                          ? correctDraft : T.format(live);
                        const set = (k, v) => setCorrectDraft({ ...d, [k]: v });
                        const box = { fontSize: 10, fontFamily: D.mono, background: D.surface, color: D.text,
                          border: `1px solid ${D.border}`, borderRadius: 5, padding: 5 };
                        return (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: D.faint, marginBottom: 4, lineHeight: 1.5 }}>{T.hint}</div>
                            <div style={{ fontSize: 9, fontFamily: D.mono, color: D.muted, marginBottom: 4 }}>
                              current: {live
                                ? `${(live.sources || []).join(', ') || '(no sources)'} — ${String(live.note || '').slice(0, 60)}`
                                : 'not set — this claim is currently ungrounded'}
                            </div>
                            {/* SOURCE PICKER (Phase 5F.2 Step 2). This was a free-text box.
                                Typing `usda-meat-2026` — a REAL id, but a cost source —
                                published cleanly and then failed `isGroundedItemQty`, which
                                requires every cited id to resolve in QTY_SOURCES. The claim
                                silently never grounded, the host showed no "Sourced -" line,
                                and nothing reported an error. A silent ungrounding is
                                indistinguishable from never having done the work.

                                The options come from the registry the PREDICATE reads, so
                                what an admin can cite and what can actually ground are the
                                same list by construction. Free text is gone. */}
                            {(() => {
                              const fp = `${pid}.${correctField}`;
                              const approved = approvedSourcesFor(fp);
                              const chosen = String(d.sources || '').split(',').map((x) => x.trim()).filter(Boolean);
                              const check = validateSourcesFor(fp, chosen);
                              const toggle = (id) => set('sources',
                                (chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]).join(', '));
                              // TIER (Phase 5F.3 defect). `format()` carries the AUTHORED tier
                              // forward, and `isGroundedItemQty` requires tier === 'researched'.
                              // So a correction on a purchase already sitting at `norm` or
                              // `trade-heuristic` cited an approved source, published cleanly,
                              // and NEVER GROUNDED — while the verdict below said "Will ground",
                              // because it only checked sources. Measured on The Cookout
                              // (trade-heuristic) and Quinceanera (norm) in the 5F.3 cohort.
                              //
                              // The tier is not silently upgraded: it is a claim about evidence
                              // quality and belongs to the human. It is SHOWN, made changeable,
                              // and the verdict now runs the real predicate over the whole block.
                              const tierNow = d.tier || 'researched';
                              const draftProv = { tier: tierNow, confidence: d.confidence || 'medium',
                                verificationStatus: 'researched', sources: chosen, note: d.note || '' };
                              const grounds = wouldGround(fp, draftProv);
                              return (
                                <div style={{ marginBottom: 6 }}>
                                  <div style={{ fontSize: 9, color: D.faint, marginBottom: 3 }}>
                                    APPROVED SOURCES — {check.axis ? check.axis.label : 'no axis'} ·
                                    grounded by <code>{check.axis ? check.axis.predicateName : '-'}</code>
                                  </div>
                                  {approved.length === 0 && (
                                    <div style={{ fontSize: 9, color: D.warn }}>
                                      No approved sources exist for this axis yet. Registering one is a
                                      reviewed code change — deciding who may be believed is not a text box.
                                    </div>
                                  )}
                                  {approved.map((s) => {
                                    const on = chosen.includes(s.id);
                                    return (
                                      <button key={s.id} type="button" onClick={() => toggle(s.id)}
                                        title={`${s.claim}`}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 3,
                                          fontSize: 9, padding: '4px 7px', borderRadius: 5, cursor: 'pointer',
                                          border: `1px solid ${on ? D.accent : D.border}`,
                                          background: on ? D.accent + '18' : 'transparent',
                                          color: on ? D.accent : D.muted }}>
                                        <span style={{ fontFamily: D.mono }}>{on ? '✓ ' : '  '}{s.id}</span>
                                        <span style={{ color: D.faint, marginLeft: 6 }}>{String(s.org).slice(0, 54)}</span>
                                        <span style={{ color: D.faint, marginLeft: 6, fontFamily: D.mono }}>captured {s.fetched}</span>
                                      </button>
                                    );
                                  })}
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5 }}>
                                    <span style={{ fontSize: 9, color: D.faint, width: 74 }}>TIER</span>
                                    {['researched', tierNow !== 'researched' ? tierNow : null].filter(Boolean).map((t) => (
                                      <button key={t} type="button" onClick={() => set('tier', t)}
                                        style={{ fontSize: 9, fontFamily: D.mono, padding: '2px 8px', borderRadius: 5,
                                          cursor: 'pointer', border: `1px solid ${tierNow === t ? D.accent : D.border}`,
                                          background: tierNow === t ? D.accent + '22' : 'transparent',
                                          color: tierNow === t ? D.accent : D.muted }}>
                                        {t}{t !== 'researched' ? ' (carried, will NOT ground)' : ''}
                                      </button>
                                    ))}
                                  </div>
                                  {chosen.length > 0 && (
                                    <div style={{ fontSize: 9, marginTop: 4, color: grounds ? D.good : D.warn, lineHeight: 1.5 }}>
                                      {!check.ok
                                        ? check.errors.join(' ')
                                        : grounds
                                          ? `Will ground — ${check.axis.hostImpact}`
                                          : `Will NOT ground: tier is "${tierNow}" and ${check.axis.predicateName} requires "researched". The source is approved, but the host would show no Sourced line.`}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
                              <span style={{ fontSize: 9, color: D.faint, width: 74, paddingTop: 5 }}>CLAIM NOTE</span>
                              <textarea value={d.note || ''} onChange={(e) => set('note', e.target.value)}
                                placeholder="What does the source actually say? A source without a claim is not provenance."
                                style={{ ...box, flex: 1, minHeight: 44 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 9, color: D.faint, width: 74 }}>CONFIDENCE</span>
                              {CONFIDENCE_LEVELS.map((c) => (
                                <button key={c} type="button" onClick={() => set('confidence', c)}
                                  style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, cursor: 'pointer',
                                    border: `1px solid ${d.confidence === c ? D.accent : D.border}`,
                                    background: d.confidence === c ? D.accent + '22' : 'transparent',
                                    color: d.confidence === c ? D.accent : D.muted }}>{c}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {correctField === 'qtyPerGuest' && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 9, color: D.faint, marginBottom: 3 }}>
                            {fieldTypeFor('x.qtyPerGuest').hint}
                          </div>
                          <div style={{ fontSize: 9, fontFamily: D.mono, color: D.muted, marginBottom: 3 }}>
                            current: {(() => {
                              const pbNow = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                              const pid = correctPurchase || String(r.fieldPath).split('.')[0];
                              const pu = pbNow && (pbNow.purchases || []).find((x) => x && x.id === pid);
                              return pu && pu.qtyPerGuest != null ? String(pu.qtyPerGuest) : 'not set';
                            })()}
                          </div>
                          <input type="text" value={correctDraft == null ? '' : correctDraft}
                            onChange={(e) => setCorrectDraft(e.target.value)}
                            placeholder="e.g. 0.5"
                            style={{ width: 120, fontSize: 10, fontFamily: D.mono, background: D.surface,
                              color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 5 }} />
                        </div>
                      )}
                      {correctField === 'unitCostRange' && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 9, color: D.faint, marginBottom: 3 }}>
                            {fieldTypeFor('x.unitCostRange').hint}
                          </div>
                          <div style={{ fontSize: 9, fontFamily: D.mono, color: D.muted, marginBottom: 3 }}>
                            current: {(() => {
                              const pbNow = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                              const pid = correctPurchase || String(r.fieldPath).split('.')[0];
                              const pu = pbNow && (pbNow.purchases || []).find((x) => x && x.id === pid);
                              return pu && Array.isArray(pu.unitCostRange) ? `$${pu.unitCostRange[0]}-$${pu.unitCostRange[1]}` : 'not set';
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input type="text" placeholder="min"
                              value={(correctDraft && correctDraft.min) || ''}
                              onChange={(e) => setCorrectDraft({ ...(correctDraft || {}), min: e.target.value })}
                              style={{ width: 80, fontSize: 10, fontFamily: D.mono, background: D.surface,
                                color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 5 }} />
                            <span style={{ color: D.faint, fontSize: 10 }}>to</span>
                            <input type="text" placeholder="max"
                              value={(correctDraft && correctDraft.max) || ''}
                              onChange={(e) => setCorrectDraft({ ...(correctDraft || {}), max: e.target.value })}
                              style={{ width: 80, fontSize: 10, fontFamily: D.mono, background: D.surface,
                                color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 5 }} />
                          </div>
                        </div>
                      )}
                      {/* ROW EDITORS for the two engine-governing fields (5E.3).
                          Both are nested objects. A JSON textarea would have given the
                          crab line — the costliest item a host buys, and the one the
                          ownership contract sends admins here to fix — the least safe
                          editor in the console, so each renders named numeric inputs
                          for ONE size at a time with the live value beside each box.
                          The untouched sizes ride through in the draft's `base`. */}
                      {(correctField === 'priceLadder' || correctField === 'servingGuide') && (() => {
                        const T = fieldTypeFor(`x.${correctField}`);
                        const pbNow = (ALL_PLAYBOOKS || []).find((x) => x && x.type === r.assetId);
                        const pid = correctPurchase || String(r.fieldPath).split('.')[0];
                        const pu = pbNow && (pbNow.purchases || []).find((x) => x && x.id === pid);
                        const live = pu ? pu[correctField] : undefined;
                        const draft = (correctDraft && correctDraft.row) ? correctDraft : T.format(live);
                        const isLadder = correctField === 'priceLadder';
                        const keys = isLadder
                          ? T.rowKeys(live)
                          : Object.keys((live && live.bySize) || {}).filter((k) => T.sizes.includes(k));
                        // What is live for the SELECTED size, so old and new sit side by side.
                        const liveRow = isLadder
                          ? ((live && live[draft.key]) || {})
                          : (((live && live.bySize) || {})[draft.key] || {});
                        const setRow = (f, val) => setCorrectDraft({ ...draft, row: { ...draft.row, [f]: val } });
                        return (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: D.faint, marginBottom: 4, lineHeight: 1.5 }}>{T.hint}</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 9, color: D.faint }}>{isLadder ? 'SIZE / GRADE' : 'CRAB SIZE'}</span>
                              {keys.map((k) => (
                                <button key={k} type="button"
                                  // Switching size re-seeds the inputs from what is LIVE for
                                  // that size, while `base` stays the whole authored object so
                                  // the sizes not being corrected survive the publish untouched.
                                  onClick={() => setCorrectDraft({
                                    base: live && typeof live === 'object' ? live : {},
                                    key: k,
                                    row: T.format(isLadder
                                      ? { [k]: (live && live[k]) || {} }
                                      : { bySize: { [k]: ((live && live.bySize) || {})[k] || {} } }).row,
                                  })}
                                  style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, cursor: 'pointer',
                                    border: `1px solid ${draft.key === k ? D.accent : D.border}`,
                                    background: draft.key === k ? D.accent + '22' : 'transparent',
                                    color: draft.key === k ? D.accent : D.muted }}>
                                  {k}
                                </button>
                              ))}
                            </div>
                            {isLadder ? T.fields.map((f) => (
                              <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 9, fontFamily: D.mono, color: D.muted, width: 148 }}>{f}</span>
                                <input type="text" value={draft.row[f] == null ? '' : draft.row[f]}
                                  onChange={(e) => setRow(f, e.target.value)} placeholder="—"
                                  style={{ width: 78, fontSize: 10, fontFamily: D.mono, background: D.surface,
                                    color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 4 }} />
                                <span style={{ fontSize: 9, fontFamily: D.mono, color: D.faint }}>
                                  current: {liveRow[f] == null ? 'not set' : `$${liveRow[f]}`}
                                </span>
                              </div>
                            )) : T.fields.map((f) => (
                              <div key={f} style={{ marginBottom: 5 }}>
                                <div style={{ fontSize: 9, color: D.faint, marginBottom: 2 }}>{T.fieldHints[f]}</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ fontSize: 9, fontFamily: D.mono, color: D.muted, width: 76 }}>{f}</span>
                                  <input type="text" placeholder="low"
                                    value={(draft.row[f] && draft.row[f].low) || ''}
                                    onChange={(e) => setRow(f, { ...draft.row[f], low: e.target.value })}
                                    style={{ width: 58, fontSize: 10, fontFamily: D.mono, background: D.surface,
                                      color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 4 }} />
                                  <span style={{ color: D.faint, fontSize: 10 }}>to</span>
                                  <input type="text" placeholder="high"
                                    value={(draft.row[f] && draft.row[f].high) || ''}
                                    onChange={(e) => setRow(f, { ...draft.row[f], high: e.target.value })}
                                    style={{ width: 58, fontSize: 10, fontFamily: D.mono, background: D.surface,
                                      color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 4 }} />
                                  <span style={{ fontSize: 9, fontFamily: D.mono, color: D.faint }}>
                                    current: {Array.isArray(liveRow[f]) ? `${liveRow[f][0]}–${liveRow[f][1]}` : 'not set'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {!isLadder && (
                              <div style={{ fontSize: 9, color: D.faint, marginTop: 4, lineHeight: 1.5 }}>
                                All three are required — the engine discards a row missing any of them,
                                so a half-filled correction would publish and change nothing.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <textarea value={correctReason} onChange={(e) => setCorrectReason(e.target.value)}
                        placeholder="Why is this being corrected? A correction without a stated defect is indistinguishable from an edit."
                        style={{ width: '100%', minHeight: 46, fontSize: 10, fontFamily: D.mono, background: D.surface,
                          color: D.text, border: `1px solid ${D.border}`, borderRadius: 5, padding: 6 }} />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button type="button" onClick={() => doCorrect(r)} disabled={!correctReason.trim()}
                          style={{ fontSize: 9, background: correctReason.trim() ? D.warn : 'transparent',
                            border: `1px solid ${D.warn}`, borderRadius: 5, padding: '3px 10px',
                            color: correctReason.trim() ? '#0b0d10' : D.faint, cursor: correctReason.trim() ? 'pointer' : 'not-allowed' }}>
                          Open correction
                        </button>
                        <button type="button" onClick={() => { setCorrectRow(null); setCorrectReason(''); }}
                          style={{ fontSize: 9, background: 'transparent', border: `1px solid ${D.border}`, borderRadius: 5, padding: '3px 10px', color: D.muted, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Per-field verification: jump straight to what a host sees for THIS field. */}
          {exported.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {/* HEADING CORRECTED (5F.7). This list is the EXPORT, and the export
                  deliberately carries every record that has ever been published —
                  including rolled-back and ARCHIVED ones — so that history travels and
                  rollback stays possible. Calling it "PUBLISHED FIELDS" told an
                  operator that two records archived in 5F.4 for grounding dishonesty
                  (The Cookout, Quinceanera) were published. They are refused at the
                  bake by `isPublishable`, so no host could ever see them — but the
                  console said otherwise, which is this phase's whole subject. */}
              <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 6 }}>
                IN THE EXPORT — every version ever published, including superseded and archived.
                Only <span style={{ color: D.good }}>published</span> rows reach a host.
              </div>
              {exported.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderBottom: `1px solid ${D.border}44` }}>
                  <span style={{ fontSize: 10, fontFamily: D.mono, color: k.status === 'published' ? D.text : D.faint, flex: 1 }}>{k.assetId} · {k.fieldPath}</span>
                  <span style={{ fontSize: 9, fontFamily: D.mono,
                    color: k.status === 'published' ? D.good : D.warn }}>{k.status || 'unknown'}</span>
                  <span style={{ fontSize: 9, fontFamily: D.mono, color: D.faint }}>{k.publishedVersion || '—'}</span>
                  <button type="button"
                    onClick={() => { setRtType(k.assetId); setRtField(k.fieldPath); setRtResult(null); setWs('Runtime Preview'); }}
                    style={{ fontSize: 9, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 5, padding: '2px 8px', color: D.accent, cursor: 'pointer' }}>
                    verify →
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading ? <Banner tone="muted">Loading…</Banner> : pubKcrs.length === 0 ? <Empty msg="No KCRs pending publish. Honest-empty." /> : <KcrTable items={pubKcrs} />}
        </div>
      );
    }

    if (ws === 'Validation') {
      const valQ = factory.queues.validation;
      return (
        <div>
          <Banner>Validation queue — post-publish checks confirming a published override performs as expected in the runtime. Validation closes the loop: published → validated → stable.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Validation queue" value={valQ.count} tone={valQ.count ? D.accent : D.faint} />
            <PBKpi label="Published" value={byStatus.published || 0} tone={D.good} />
            <PBKpi label="Monitoring" value={byStatus.monitoring || 0} tone={byStatus.monitoring ? D.accent : D.faint} />
          </div>
          {valQ.count === 0 ? <Empty msg="No items pending validation. Items enter this queue after publish, when runtime checks are enabled." /> : (
            <KcrTable items={valQ.items} />
          )}
        </div>
      );
    }

    if (ws === 'Monitoring') {
      if (loading) return <Banner tone="muted">Loading KCR backlog…</Banner>;
      const byTrigger = kcrs.reduce((m, k) => { m[k.trigger] = (m[k.trigger] || 0) + 1; return m; }, {});
      return (
        <div>
          <Banner>Corpus monitoring — dimensional debt, knowledge velocity, and backlog health. Manufacturing floor metrics from KF-1. Debt is dimensional (never a single score).</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="KCRs total" value={kcrs.length} />
            <PBKpi label="Draft" value={byStatus.draft || 0} tone={D.faint} onClick={() => setWs('Campaigns')} />
            <PBKpi label="Researching" value={byStatus.researching || 0} tone={D.accent} onClick={() => setWs('Campaigns')} />
            <PBKpi label="Review" value={byStatus.review || 0} tone={D.warn} onClick={() => setWs('Review')} />
            <PBKpi label="Published" value={byStatus.published || 0} tone={D.good} onClick={() => setWs('Publishing')} />
            <PBKpi label="High priority" value={kcrs.filter((k) => k.priority === 'high').length} tone={D.bad} onClick={() => setWs('Campaigns')} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Aging & SLA</div>
              {metrics.agedKnown === 0 ? <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>No aging data yet.</div> : (
                <>
                  <div style={{ fontSize: type.size.caption, color: metrics.staleCount ? D.warn : D.muted, marginBottom: 6 }}>{metrics.staleCount} past SLA · oldest {metrics.oldest[0] ? `${metrics.oldest[0].days}d (${metrics.oldest[0].assetId})` : '—'}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(metrics.avgTimeInStage).filter(([, v]) => v != null).map(([s, v]) => (
                      <span key={s} style={{ fontSize: 10, fontFamily: D.mono, padding: '2px 6px', borderRadius: 4, background: D.surface2, color: D.muted }}>{s} ~{v}d</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Highest impact</div>
              {metrics.highestImpact.length === 0 ? <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>No impact data.</div> : metrics.highestImpact.slice(0, 5).map((h) => (
                <div key={h.id} style={{ fontSize: type.size.caption, color: D.muted, padding: '1px 0' }}>{h.assetId} <span style={{ color: D.faint, fontFamily: D.mono }}>· {h.engines} engines · score {h.score}</span></div>
              ))}
            </div>
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Knowledge debt (dimensional)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {Object.entries(factory.debt).map(([dim, v]) => (
                <span key={dim} style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: v.count ? `${D.warn}1e` : D.surface2, color: v.count ? D.warn : D.faint }}>{dim} {v.count}</span>
              ))}
            </div>
            <div style={{ fontSize: type.size.caption, color: D.faint, fontFamily: D.mono }}>
              {factory.growth.assets} assets · {factory.growth.graphNodes} graph nodes · velocity {factory.flow.researchVelocity} · review backlog {factory.flow.reviewBacklog}
            </div>
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Change triggers</div>
            {Object.entries(byTrigger).length === 0
              ? <span style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>No triggers recorded yet.</span>
              : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(byTrigger).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                    <span key={t} style={{ fontSize: 11, fontFamily: D.mono, padding: '3px 8px', borderRadius: 5, background: D.surface2, color: D.muted, border: `1px solid ${D.border}` }}>{t} <span style={{ color: D.text }}>{n}</span></span>
                  ))}
                </div>
            }
          </div>
        </div>
      );
    }

    if (ws === 'Quality') {
      const STATUS_ORDER = ['gap', 'warn', 'ok', 'n/a'];
      const statusColor = (s) => s === 'ok' ? D.good : s === 'warn' ? D.warn : s === 'gap' ? D.bad : D.faint;
      const statusTick = (s) => s === 'ok' ? '●' : s === 'warn' ? '◑' : s === 'gap' ? '○' : '—';
      return (
        <div>
          <Banner>Quality Manufacturing — per-asset dimensional health matrix. Auto-generated improvement KCRs flow into the Review pipeline. Dimensional debt is the leading indicator of knowledge risk.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Assets evaluated" value={quality.totalAssets} />
            <PBKpi label="Fully OK" value={quality.fullyOk} tone={quality.fullyOk === quality.totalAssets ? D.good : D.warn} />
            <PBKpi label="With gaps" value={quality.assets.filter((a) => a.gapCount > 0).length} tone={D.bad} />
            <PBKpi label="Auto-KCRs" value={quality.totalKCRs} tone={quality.totalKCRs ? D.accent : D.faint} />
            <PBKpi label="Dimensions" value={quality.dimIds.length} />
          </div>

          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Dimension coverage (corpus-wide)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {quality.dimIds.map((dim) => {
                const c = quality.byDimension[dim] || {};
                const worst = STATUS_ORDER.find((s) => (c[s] || 0) > 0) || 'ok';
                return (
                  <div key={dim} style={{ background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '8px 10px', minWidth: 130 }}>
                    <div style={{ fontSize: 11, color: D.muted, marginBottom: 6, fontWeight: 600 }}>{dim}</div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 10, fontFamily: D.mono }}>
                      {['gap', 'warn', 'ok'].map((s) => (c[s] || 0) > 0 && (
                        <span key={s} style={{ color: statusColor(s) }}>{statusTick(s)} {c[s]}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(worst), marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{worst}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Asset</th>
                <th style={th}>Status</th>
                {quality.dimIds.slice(0, 8).map((d) => <th key={d} style={{ ...th, fontSize: 9 }}>{d.slice(0, 8)}</th>)}
                <th style={th}>Gaps</th>
                <th style={th}>Warns</th>
                <th style={th}>KCRs</th>
              </tr></thead>
              <tbody>
                {quality.assets.sort((a, b) => b.gapCount - a.gapCount || b.warnCount - a.warnCount).map((a) => (
                  <Fragment key={a.type}>
                    <tr onClick={() => setOpen(open === a.type ? null : a.type)} style={{ cursor: 'pointer', background: open === a.type ? D.surface2 : 'transparent' }}>
                      <td style={{ ...td, color: D.text, fontWeight: 600, fontSize: 11 }}>{a.type}</td>
                      <td style={td}>{chip(a.status || 'draft', a.status === 'production' ? D.good : a.status === 'review-needed' ? D.warn : D.faint)}</td>
                      {quality.dimIds.slice(0, 8).map((dimId) => {
                        const d = a.dimensions.find((x) => x.id === dimId);
                        const s = d ? d.status : 'n/a';
                        return <td key={dimId} style={{ ...td, textAlign: 'center' }}><span title={d?.reason || ''} style={{ color: statusColor(s) }}>{statusTick(s)}</span></td>;
                      })}
                      <td style={{ ...td, fontFamily: D.mono, color: a.gapCount ? D.bad : D.faint }}>{a.gapCount || '—'}</td>
                      <td style={{ ...td, fontFamily: D.mono, color: a.warnCount ? D.warn : D.faint }}>{a.warnCount || '—'}</td>
                      <td style={{ ...td, fontFamily: D.mono, color: a.kcrCount ? D.accent : D.faint }}>{a.kcrCount || '—'}</td>
                    </tr>
                    {open === a.type && (
                      <tr><td colSpan={13} style={{ padding: '0 10px 12px' }}>
                        <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12 }}>
                          {a.dimensions.filter((d) => d.status !== 'ok').length === 0
                            ? <div style={{ fontSize: type.size.caption, color: D.good, fontStyle: 'italic' }}>All dimensions healthy.</div>
                            : a.dimensions.filter((d) => d.status !== 'ok').map((d) => (
                              <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '3px 0', fontSize: type.size.caption }}>
                                <span style={{ color: statusColor(d.status), fontFamily: D.mono, minWidth: 20 }}>{statusTick(d.status)}</span>
                                <span style={{ color: D.muted, minWidth: 160 }}>{d.id}</span>
                                <span style={{ color: D.faint }}>{d.reason}</span>
                                {d.deferred && <span style={{ fontSize: 10, color: D.faint, fontStyle: 'italic' }}>(deferred to research queue)</span>}
                              </div>
                            ))
                          }
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (ws === 'Retirement') {
      const archivedKcrs = kcrs.filter((k) => ['archived', 'deprecated'].includes(k.status));
      const archivedPbs = ALL_PLAYBOOKS.filter((pb) => ['archived', 'deprecated'].includes(pb.status));
      return (
        <div>
          <Banner>Retired knowledge — archived KCRs and deprecated playbooks. Read-only history. Retirement is final; do not re-activate without governance sign-off.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Archived KCRs" value={archivedKcrs.length} tone={D.faint} />
            <PBKpi label="Archived playbooks" value={archivedPbs.length} tone={D.faint} />
          </div>
          {archivedKcrs.length === 0 && archivedPbs.length === 0 ? <Empty msg="No retired assets. Honest-empty." /> : (
            <>
              {archivedKcrs.length > 0 && <KcrTable items={archivedKcrs} />}
              {archivedPbs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Archived playbooks</div>
                  {archivedPbs.map((pb) => (
                    <div key={pb.type} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: type.size.caption, color: D.muted }}>{pb.type} — {pb.status}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (ws === 'Campaigns') {
      const GAP_TYPES = ['pricing', 'coverage', 'freshness', 'safety', 'sourcing', 'contradiction'];
      const basePb = ALL_PLAYBOOKS.find((p) => p.type === campAsset);
      const selectedPb = basePb ? loadPlaybookWithUpdates(basePb) : null;
      const fieldPaths = getFieldPaths(selectedPb || ALL_PLAYBOOKS[0]);
      const campPreview = campField && selectedPb
        ? (() => { try { return { blast: blastRadius(selectedPb, campField), current: resolveField(selectedPb, campField) }; } catch { return null; } })()
        : null;
      const campSlug = String(campGoal || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const isDupe = campGoal.trim().length > 0 && campList.some((c) => c.id === `camp-${campSlug}`);
      const toggleFamily = (fam) => {
        const allIn = fam.providers.every((id) => campProviders.includes(id));
        if (allIn) setCampProviders((p) => p.filter((id) => !fam.providers.includes(id)));
        else setCampProviders((p) => Array.from(new Set([...p, ...fam.providers])));
      };
      const toggleProvider = (id) => setCampProviders((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
      const CAMPAIGN_RUN_STAGES = ['Queued', 'Starting', 'Running providers', 'Collecting observations', 'Creating evidence', 'Deriving finding', 'Drafting KCR'];
      const showToast = (type, msg, ms = 4500) => {
        if (campToastTimerRef.current) clearTimeout(campToastTimerRef.current);
        setCampToast({ type, msg });
        campToastTimerRef.current = setTimeout(() => setCampToast(null), ms);
      };
      const runCamp = async () => {
        if (!campGoal.trim() || campRunning) return;
        setCampRunning(true);
        setCampRunResult(null);
        setCampServerRunId(null);
        if (campPollRef.current) { clearInterval(campPollRef.current); campPollRef.current = null; }
        const runInfo = { goal: campGoal.trim(), asset: campAsset, fieldPath: campField, providers: [...campProviders] };
        setCampRunInfo(runInfo);
        setCampRunStageIdx(0); // Queued
        showToast('started', `Starting: ${campGoal.trim().slice(0, 60)}…`);
        try {
          const pb = ALL_PLAYBOOKS.find((p) => p.type === campAsset);
          const allProviders = buildProviders();
          const campaign = createCampaign({ goal: campGoal.trim(), assetId: campAsset, fieldPath: campField || null, gapTypes: campGapType, priority: campPriority, trigger: campTrigger, providers: campProviders, at: asOf });
          if (isResearchApiConfigured()) {
            // Server path — polling useEffect takes over after setCampServerRunId
            setCampRunMode('server');
            setCampRunStageIdx(1); // Starting
            const created = await createResearchRun({
              campaignId:    campaign.id,
              playbookType:  campAsset,
              fieldPath:     campField || null,
              gapKind:       (campGapType && campGapType[0]) || 'pricing',
              blueprint:     {},
              executionPlan: {},
              mode:          'simulate',
              priority:      campPriority || 'MED',
            });
            if (!created?.id) throw new Error('Server did not return a run ID — check server connection');
            setCampRunStageIdx(2); // Running providers (poll takes it from here)
            await startResearchRun(created.id);
            setCampServerRunId(created.id); // triggers useEffect poll
            // runCamp returns here; polling completes the flow
          } else {
            // Local fallback
            setCampRunMode('local');
            setCampRunStageIdx(1);
            const result = runCampaign(campaign, { providers: allProviders, fetched: {}, pb, asOf });
            setCampRunStageIdx(3);
            recordCampaign(result);
            setCampRunStageIdx(5);
            if (result.kcr) { setCampRunStageIdx(6); await upsertKCR(result.kcr); refresh(); }
            import('../lib/api/kas').then(({ upsertKasRecords, isKasApiConfigured: isConf }) => {
              if (isConf()) upsertKasRecords('campaign', [result]).catch(() => {});
            });
            setCampRunStageIdx(7);
            setCampRunResult(result);
            setCampList(loadCampaigns());
            setCampGoal(''); setCampField('');
            const toastType = result.kcr ? 'complete' : (result.result?.evidence > 0 ? 'partial' : 'failed');
            showToast(toastType, result.kcr ? 'Campaign complete — KCR drafted' : result.result?.evidence > 0 ? 'Partial — evidence collected, no KCR' : 'No output — see why below');
            setCampRunning(false);
          }
        } catch (e) {
          setCampRunStageIdx(-1);
          setCampRunResult({ error: e.message });
          showToast('failed', `Failed: ${e.message}`, 6000);
          setCampRunning(false);
        }
      };
      const sec = { background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 };
      const secLabel = { fontSize: 9, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 };
      const fieldLabel = { fontSize: 10, color: D.muted, marginBottom: 3 };
      const inp = { width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: '6px 10px', color: D.text, fontSize: type.size.caption, fontFamily: 'inherit', boxSizing: 'border-box' };
      const chip = (label, on, onClick, title) => (
        <button key={label} onClick={onClick} title={title} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, border: `1px solid ${on ? D.accent : D.border}`, background: on ? D.accent + '22' : D.bg, color: on ? D.accent : D.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
      );
      const templateSuggestions = suggestTemplates(campField).slice(0, 6);
      return (
        <div style={{ position: 'relative' }}>
          {/* ── Campaign Run Toast ────────────────────────────────── */}
          {campToast && (
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 12, fontFamily: D.ff, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 340,
              background: campToast.type === 'complete' ? D.good + 'e6' : campToast.type === 'partial' ? D.warn + 'e6' : campToast.type === 'failed' ? D.bad + 'e6' : D.accent + 'e6',
              color: campToast.type === 'started' ? '#000' : '#fff',
            }}>
              {campToast.msg}
            </div>
          )}
          <Banner>Research campaigns — each run executes: providers → observations → evidence → finding → KCR. Internal provider runs in-browser; external providers (⚡) require backend acquisition before evidence populates.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <PBKpi label="Campaigns" value={campList.length} tone={campList.length ? D.accent : D.faint} />
            <PBKpi label="With finding" value={campList.filter((c) => c.finding).length} tone={D.good} />
            <PBKpi label="With KCR" value={campList.filter((c) => c.result?.kcr).length} tone={D.good} />
            <PBKpi label="Templates" value={CAMPAIGN_TEMPLATES.length} tone={D.faint} />
          </div>

          {/* ── Templates (Bundle D) ───────────────────────────── */}
          <div style={{ ...sec, marginBottom: 12 }}>
            <div style={secLabel}>Start from template</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {templateSuggestions.map((t) => {
                const active = campTemplate === t.id;
                return (
                  <button key={t.id} title={t.description} onClick={() => {
                    const applied = applyTemplate(t.id, { goal: `${t.label} — ${campAsset}` });
                    setCampTemplate(t.id);
                    if (applied.goal) setCampGoal(applied.goal);
                    if (applied.gapTypes) setCampGapType(applied.gapTypes);
                    if (applied.providers) setCampProviders(applied.providers);
                    if (applied.priority) setCampPriority(applied.priority);
                    if (applied.trigger) setCampTrigger(applied.trigger);
                  }} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 10, border: `1px solid ${active ? D.accent : D.border}`, background: active ? D.accent + '22' : D.bg, color: active ? D.accent : D.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t.label}
                  </button>
                );
              })}
              {campTemplate && <button onClick={() => setCampTemplate('')} style={{ padding: '4px 8px', borderRadius: 20, fontSize: 10, border: `1px solid ${D.border}`, background: 'transparent', color: D.faint, cursor: 'pointer' }}>× clear</button>}
            </div>
          </div>

          {/* ── A. Target ─────────────────────────────────────── */}
          <div style={sec}>
            <div style={secLabel}>A — Target</div>
            <div style={{ marginBottom: 10 }}>
              <div style={fieldLabel}>Goal *</div>
              <input value={campGoal} onChange={(e) => setCampGoal(e.target.value)} placeholder="e.g. Ground crab pricing for mid-Atlantic feasts" style={inp} />
              {isDupe && <div style={{ fontSize: 10, color: D.warn, marginTop: 4 }}>⚠ A campaign with this goal already exists — running will overwrite it.</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={fieldLabel}>Asset</div>
                <select value={campAsset} onChange={(e) => { setCampAsset(e.target.value); setCampField(''); }} style={{ ...inp, cursor: 'pointer' }}>
                  {ALL_PLAYBOOKS.map((pb) => <option key={pb.type} value={pb.type}>{pb.type}</option>)}
                </select>
              </div>
              <div>
                <div style={fieldLabel}>Field path</div>
                <input list="camp-field-paths" value={campField} onChange={(e) => setCampField(e.target.value)} placeholder="select or type a path…" style={inp} />
                <datalist id="camp-field-paths">{fieldPaths.map((f) => <option key={f.path} value={f.path}>{f.label}</option>)}</datalist>
              </div>
            </div>
            {campPreview && (
              <div style={{ marginTop: 10, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 10 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 5 }}>
                  <span><span style={{ color: D.muted }}>Current: </span><span style={{ fontFamily: D.mono, color: D.text }}>{JSON.stringify(campPreview.current.value ?? null)}</span></span>
                  <span><span style={{ color: D.muted }}>Source: </span><span style={{ color: D.accent }}>{campPreview.current.source}</span></span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span><span style={{ color: D.muted }}>Engines: </span><span style={{ color: D.text }}>{campPreview.blast.affectedEngines.join(', ') || 'none'}</span></span>
                  <span><span style={{ color: D.muted }}>Runtime: </span><span style={{ color: D.text }}>{campPreview.blast.affectedRuntime.join(', ') || 'none'}</span></span>
                  {campPreview.blast.magnitude.assets > 1 && <span><span style={{ color: D.muted }}>Assets: </span><span style={{ color: D.warn }}>{campPreview.blast.magnitude.assets}</span></span>}
                </div>
              </div>
            )}
          </div>

          {/* ── B. Research type ──────────────────────────────── */}
          <div style={sec}>
            <div style={secLabel}>B — Research Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={fieldLabel}>Gap types</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {GAP_TYPES.map((g) => chip(g, campGapType.includes(g), () => setCampGapType((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g])))}
                </div>
              </div>
              <div>
                <div style={fieldLabel}>Priority</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {CAMPAIGN_PRIORITIES.map((p) => chip(p, campPriority === p, () => setCampPriority(p)))}
                </div>
              </div>
              <div>
                <div style={fieldLabel}>Trigger</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {CAMPAIGN_TRIGGERS.map((t) => chip(t, campTrigger === t, () => setCampTrigger(t)))}
                </div>
              </div>
            </div>
          </div>

          {/* ── C. Providers ─────────────────────────────────── */}
          <div style={sec}>
            <div style={secLabel}>C — Providers</div>
            {PROVIDER_FAMILIES.map((fam) => {
              const famSelected = fam.providers.filter((id) => campProviders.includes(id)).length;
              const famAll = fam.providers.length;
              const famOn = famSelected === famAll;
              const famPartial = famSelected > 0 && !famOn;
              return (
                <div key={fam.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <button onClick={() => toggleFamily(fam)} style={{ padding: '3px 12px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: `1px solid ${famOn ? D.accent : famPartial ? D.warn : D.border}`, background: famOn ? D.accent + '22' : famPartial ? D.warn + '18' : D.bg, color: famOn ? D.accent : famPartial ? D.warn : D.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {fam.label}
                    </button>
                    <span style={{ fontSize: 9, color: D.faint }}>{fam.note} · {famSelected}/{famAll}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 10 }}>
                    {fam.providers.map((id) => {
                      const on = campProviders.includes(id);
                      return (
                        <button key={id} onClick={() => toggleProvider(id)} style={{ padding: '3px 8px', borderRadius: 20, fontSize: 9, border: `1px solid ${on ? D.accent : D.border}`, background: on ? D.accent + '22' : 'transparent', color: on ? D.accent : D.faint, cursor: 'pointer', fontFamily: 'inherit' }}>{id}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Run ───────────────────────────────────────────── */}
          <button onClick={runCamp} disabled={campRunning || !campGoal.trim()} style={{ padding: '8px 18px', borderRadius: 7, background: (campGoal.trim() && !campRunning) ? D.accent : D.faint, color: '#000', fontWeight: 700, fontSize: type.size.caption, border: 'none', cursor: (campGoal.trim() && !campRunning) ? 'pointer' : 'default', fontFamily: 'inherit', marginBottom: 14 }}>
            {campRunning ? 'Running…' : 'Create + Run Campaign'}
          </button>

          {/* ── Progress Panel — visible while running or immediately after ── */}
          {campRunStageIdx >= -1 && campRunStageIdx < 8 && campRunInfo && (
            <div style={{ background: D.bg, border: `1px solid ${campRunStageIdx === -1 ? D.bad : campRunStageIdx === 7 ? D.good : D.accent}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
              {/* Local-mode notice */}
              {campRunMode === 'local' && (
                <div style={{ fontSize: 10, color: D.warn, marginBottom: 8, fontWeight: 600 }}>
                  Running locally — server execution unavailable (REACT_APP_API_BASE_URL not set)
                </div>
              )}
              {/* Campaign identity */}
              <div style={{ fontSize: 11, color: D.text, fontWeight: 700, marginBottom: 6 }}>{campRunInfo.goal}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, fontSize: 9, color: D.muted }}>
                <span>Asset: <span style={{ color: D.accent }}>{campRunInfo.asset}</span></span>
                {campRunInfo.fieldPath && <span>Field: <span style={{ fontFamily: D.mono, color: D.text }}>{campRunInfo.fieldPath}</span></span>}
                {campRunInfo.providers.length > 0 && <span>Providers: {campRunInfo.providers.join(', ')}</span>}
              </div>
              {/* Stage progress */}
              <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                {CAMPAIGN_RUN_STAGES.map((stage, i) => {
                  const isError = campRunStageIdx === -1;
                  const isDone = campRunStageIdx > i;
                  const isActive = campRunStageIdx === i;
                  const dotColor = isError ? D.bad : isDone ? D.good : isActive ? D.accent : D.border;
                  const labelColor = isError && i === 0 ? D.bad : isDone ? D.good : isActive ? D.text : D.faint;
                  return (
                    <React.Fragment key={stage}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: labelColor, fontWeight: isActive ? 700 : 400 }}>{stage}</span>
                      </div>
                      {i < CAMPAIGN_RUN_STAGES.length - 1 && (
                        <span style={{ fontSize: 9, color: D.border, margin: '0 4px' }}>›</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {/* Status line */}
              {campRunStageIdx === -1 && <div style={{ fontSize: 10, color: D.bad, marginTop: 4 }}>Error — see result below</div>}
              {campRunStageIdx === 7 && <div style={{ fontSize: 10, color: D.good, marginTop: 4 }}>Complete — see result below</div>}
              {campRunStageIdx >= 0 && campRunStageIdx < 7 && (
                <div style={{ fontSize: 10, color: D.muted, marginTop: 4, fontStyle: 'italic' }}>
                  {campRunMode === 'server' ? 'Polling server every 2.5s…' : 'Running in-browser…'}
                </div>
              )}
              {/* Server run ID link */}
              {campServerRunId && (
                <div style={{ fontSize: 9, color: D.faint, marginTop: 6, fontFamily: D.mono }}>Run: {campServerRunId}</div>
              )}
            </div>
          )}

          {/* ── Result ────────────────────────────────────────── */}
          {campRunResult && !campRunResult.error && (
            <div style={{ background: D.bg, border: `1px solid ${campRunResult.result?.kcr ? D.good : D.border}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                {[
                  { label: 'State', val: campRunResult.state, tone: campRunResult.state === 'kcr' ? D.good : D.accent },
                  { label: 'Observations', val: campRunResult.result?.observations ?? 0, tone: D.text },
                  { label: 'Evidence', val: campRunResult.result?.evidence ?? 0, tone: campRunResult.result?.evidence > 0 ? D.good : D.muted },
                  { label: 'Finding', val: campRunResult.result?.finding || 'n/a', tone: campRunResult.result?.finding === 'grounded' ? D.good : D.warn },
                  { label: 'KCR', val: campRunResult.result?.kcr ? '✓' : '—', tone: campRunResult.result?.kcr ? D.good : D.muted },
                  { label: 'Conflicts', val: campRunResult.result?.conflicts ?? 0, tone: campRunResult.result?.conflicts > 0 ? D.warn : D.muted },
                ].map(({ label, val, tone }) => (
                  <div key={label} style={{ textAlign: 'center', minWidth: 72 }}>
                    <div style={{ fontSize: 11, color: tone, fontWeight: 700, fontFamily: D.mono }}>{String(val)}</div>
                    <div style={{ fontSize: 9, color: D.faint, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: D.muted, fontFamily: D.mono, marginBottom: 4 }}>{campRunResult.id}</div>
              {campRunResult.kcr && (
                <div style={{ fontSize: 10, color: D.good, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>KCR: <span style={{ fontFamily: D.mono }}>{campRunResult.kcr.id}</span> — in Review queue</span>
                  <button onClick={() => setWs('Review')} style={{ fontSize: 10, background: D.good + '22', border: `1px solid ${D.good}`, borderRadius: 5, padding: '2px 8px', color: D.good, cursor: 'pointer', fontFamily: D.ff }}>Go to Review →</button>
                </div>
              )}
              {/* Why-no-output: explain what blocked the pipeline when nothing was produced */}
              {!campRunResult.kcr && campRunResult.result != null && (
                <div style={{ marginTop: 8, fontSize: 10, color: D.muted, borderTop: `1px solid ${D.border}`, paddingTop: 8 }}>
                  {!campRunResult.result?.finding && campRunResult.result?.evidence === 0 && <span style={{ color: D.warn }}>No provider records fetched — external providers require backend data injection below.</span>}
                  {campRunResult.result?.finding === 'insufficient' && <span>Finding: insufficient corroboration across providers.</span>}
                  {campRunResult.result?.finding === 'contradiction' && <span style={{ color: D.warn }}>Finding: contradiction detected — providers conflict; resolve before a KCR can draft.</span>}
                  {campRunResult.result?.evidence > 0 && !campRunResult.result?.finding && <span>Evidence collected but no finding derived — check provider quality or add more sources.</span>}
                  {campRunResult.error && <span style={{ color: D.bad }}>Backend error: {campRunResult.error}</span>}
                </div>
              )}
              {campRunResult.result?.evidence === 0 && (() => {
                // All provider IDs known to buildProviders(), minus internal-validation
                const allExternalProviderIds = buildProviders().map((p) => p.id).filter((id) => id !== 'internal-validation');
                const defaultProvider = campRawProvider || allExternalProviderIds[0] || 'data.gov';
                const fp = campRunResult.fieldPath || '';
                const templateRecord = JSON.stringify({ source: defaultProvider, assetId: campRunResult.assetId || '', fieldPath: fp, url: 'https://...', excerpt: 'Paste the relevant quote or data here.', extractedFacts: [{ field: fp, value: [8, 15], unit: 'USD/lb' }], region: 'US' }, null, 2);
                const handlePasteChange = (text) => {
                  setCampRawJson(text);
                  setCampRawError('');
                  if (!text.trim() || !campRawProvider) { setCampRawPreview(null); return; }
                  const parsed = autoNormalize(campRawProvider, text, { assetId: campRunResult.assetId || '', fieldPath: fp });
                  setCampRawPreview(parsed);
                };
                const submitRaw = async () => {
                  setCampRawError('');
                  let records;
                  if (campRawPreview?.records?.length) {
                    records = campRawPreview.records;
                  } else {
                    const parsed = autoNormalize(campRawProvider || 'market-pricing', campRawJson, { assetId: campRunResult.assetId || '', fieldPath: fp });
                    if (parsed.error) { setCampRawError(parsed.error); return; }
                    records = parsed.records;
                  }
                  if (!records?.length) { setCampRawError('No records parsed — check format and try again.'); return; }
                  if (!campRawProvider) { setCampRawError('Select a provider first.'); return; }
                  const pb = ALL_PLAYBOOKS.find((p) => p.type === campRunResult.assetId);
                  const allProviders = buildProviders();
                  const fetchedMap = { [campRawProvider]: records };
                  // Patch providerIds to include the selected provider — original campaign may not have had it
                  const campaignBase = loadCampaigns().find((c) => c.id === campRunResult.id) || campRunResult;
                  const patchedCampaign = { ...campaignBase, providerIds: Array.from(new Set([...(campaignBase.providerIds || []), campRawProvider])) };
                  const result = runCampaign(patchedCampaign, { providers: allProviders, fetched: fetchedMap, pb, asOf });
                  recordCampaign(result);
                  if (result.kcr) {
                    // Auto-advance draft → researching → grounded so the KCR appears in Review
                    let kcrToSave = result.kcr;
                    try { kcrToSave = advanceKCR(kcrToSave, 'researching', { by: 'kas-campaign', asOf }); } catch { /* already past draft */ }
                    try { kcrToSave = advanceKCR(kcrToSave, 'grounded',    { by: 'kas-campaign', asOf }); } catch { /* already grounded */ }
                    await upsertKCR(kcrToSave);
                    refresh();
                  }
                  setCampRunResult(result); setCampList(loadCampaigns()); setCampRawJson('');
                };
                return (
                  <div style={{ marginTop: 10, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 7, padding: 12 }}>
                    <div style={{ fontSize: 9, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Submit External Evidence</div>
                    <div style={{ fontSize: 10, color: D.muted, marginBottom: 8 }}>Paste records fetched from an external provider. Each record becomes evidence that re-runs this campaign through the full pipeline.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, color: D.faint, marginBottom: 3 }}>Provider</div>
                        <select value={campRawProvider} onChange={(e) => { setCampRawProvider(e.target.value); setCampRawError(''); setCampRawPreview(null); if (campRawJson.trim()) { const p2 = autoNormalize(e.target.value, campRawJson, { assetId: campRunResult.assetId || '', fieldPath: fp }); setCampRawPreview(p2); } }}
                          style={{ width: '100%', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, color: D.text, fontSize: type.size.caption, padding: '5px 8px', outline: 'none', fontFamily: 'inherit' }}>
                          <option value="">— select —</option>
                          {allExternalProviderIds.map((id) => <option key={id} value={id}>{id}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                        <button onClick={() => { setCampRawJson(templateRecord); setCampRawError(''); if (!campRawProvider) setCampRawProvider(allExternalProviderIds[0] || ''); }}
                          style={{ padding: '5px 10px', borderRadius: 5, fontSize: 9, border: `1px solid ${D.border}`, background: D.bg, color: D.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Insert template
                        </button>
                        <button onClick={submitRaw} disabled={!campRawJson.trim() || !campRawProvider}
                          style={{ padding: '5px 14px', borderRadius: 5, fontSize: 9, fontWeight: 700, border: 'none', background: (campRawJson.trim() && campRawProvider) ? D.accent : D.faint, color: '#000', cursor: (campRawJson.trim() && campRawProvider) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                          Submit + Re-run
                        </button>
                      </div>
                    </div>
                    {campRawProvider && <div style={{ fontSize: 9, color: D.faint, marginBottom: 6, fontStyle: 'italic' }}>{pasteHintFor(campRawProvider)}</div>}
                    <textarea value={campRawJson} onChange={(e) => handlePasteChange(e.target.value)} rows={7} placeholder={`[\n  ${templateRecord.split('\n').join('\n  ')}\n]`}
                      style={{ width: '100%', boxSizing: 'border-box', background: D.surface, border: `1px solid ${campRawError ? D.bad : campRawPreview?.records?.length ? D.good : D.border}`, borderRadius: 5, color: D.text, fontSize: 10, fontFamily: D.mono, padding: '7px 10px', outline: 'none', resize: 'vertical' }} />
                    {campRawPreview?.records?.length > 0 && <div style={{ fontSize: 9, color: D.good, marginTop: 4 }}>✓ Parsed {campRawPreview.records.length} record{campRawPreview.records.length !== 1 ? 's' : ''} — ready to submit</div>}
                    {campRawPreview?.error && <div style={{ fontSize: 9, color: D.warn, marginTop: 4 }}>Auto-parse: {campRawPreview.error} — you can still submit raw JSON if the format is correct</div>}
                    {campRawError && <div style={{ fontSize: 10, color: D.bad, marginTop: 4 }}>{campRawError}</div>}
                    <div style={{ fontSize: 9, color: D.faint, marginTop: 6 }}>Provider-aware auto-parse: BLS, USDA, FDA, market pricing auto-detected. Or paste canonical records: <span style={{ fontFamily: D.mono }}>source, assetId, fieldPath, excerpt, extractedFacts[]</span>.</div>
                  </div>
                );
              })()}
            </div>
          )}
          {campRunResult?.error && (
            <div style={{ marginTop: 10, fontSize: type.size.caption, color: D.warn }}>{campRunResult.error}</div>
          )}

          {/* ── Campaign history ──────────────────────────────── */}
          {campList.length === 0 ? <Empty msg="No campaigns yet — run one above." /> : (
            <div>
              <div style={{ fontSize: 10, color: D.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>History ({campList.length})</div>
              {campList.map((c) => (
                <div key={c.id} onClick={() => setOpen(open === c.id ? null : c.id)} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: type.size.caption, color: D.text, fontWeight: 600 }}>{c.goal}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: D.mono, fontSize: 10, color: c.state === 'kcr' ? D.good : D.faint }}>{c.state}</span>
                      <button onClick={(e) => { e.stopPropagation(); saveCampaigns(loadCampaigns().filter((x) => x.id !== c.id)); setCampList(loadCampaigns()); if (campRunResult?.id === c.id) setCampRunResult(null); }}
                        style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, border: `1px solid ${D.border}`, background: 'transparent', color: D.faint, cursor: 'pointer', lineHeight: 1.4 }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>
                    {c.assetId}{c.fieldPath ? ` · ${c.fieldPath}` : ''} · {(c.gapTypes || [c.gapType]).join(', ')} · {c.priority || 'med'} · {c.trigger || 'research'} · {(c.providerIds || []).length} providers
                  </div>
                  {open === c.id && c.result && (
                    <div style={{ marginTop: 10, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 9, fontFamily: D.mono, color: D.muted }}>evidence: <strong style={{ color: D.text }}>{Array.isArray(c.result.evidence) ? c.result.evidence.length : (c.result.evidence || 0)}</strong></span>
                        {c.result.finding && <span style={{ fontSize: 9, fontFamily: D.mono, color: D.muted }}>finding: <strong style={{ color: c.result.finding.status === 'proposed' ? D.good : D.warn }}>{c.result.finding.status || 'found'}</strong></span>}
                        {c.result.kcr && <span style={{ fontSize: 9, fontFamily: D.mono, color: D.good }}>KCR: {c.result.kcr.id}</span>}
                        {c.result.finding?.proposedValue != null && <span style={{ fontSize: 9, fontFamily: D.mono, color: D.text }}>value: {monoPre(c.result.finding.proposedValue)}</span>}
                      </div>
                      <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(c.result, null, 2)); }}
                        style={{ fontSize: 8, padding: '2px 8px', borderRadius: 3, border: `1px solid ${D.border}`, background: 'transparent', color: D.faint, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Copy raw JSON
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Campaign Research') {
      // Streamlined, frictionless end-to-end campaign workflow
      const pbName = campAsset || (ALL_PLAYBOOKS[0]?.type || 'Crab Feast');
      const basePb = ALL_PLAYBOOKS.find((p) => p.type === pbName);
      const selectedPb = basePb ? loadPlaybookWithUpdates(pbName) : null;

      // Step 1: Auto-detect gaps from playbook
      // Use schema registry for gap detection (single source of truth)
      const schemaGaps = detectGapsInPlaybook(selectedPb);
      const gaps = schemaGaps.map((g) => ({
        id: `decision-${g.id}`,
        type: g.type,
        label: g.label,
        fieldPath: g.fieldPath,
        priority: g.decision?.costFactorProvenance?.confidence === 'low' ? 'high' : 'med',
        note: g.decision?.costFactorProvenance?.note,
      }));
      const gap = campSelectedGap ? gaps.find((g) => g.id === campSelectedGap) : null;
      const suggestedTemplates = gap ? getTemplatesForIntent(getResearchIntent(gap), CAMPAIGN_TEMPLATES) : [];

      const handleLaunch = async () => {
        if (!selectedPb || !gap || !campTemplate || campProviders.length === 0) return;
        setCampRunning(true);
        try {
          // Expand provider family IDs to individual provider IDs
          const expandedProviders = [];
          PROVIDER_FAMILIES.forEach((fam) => {
            if (campProviders.includes(fam.id)) {
              expandedProviders.push(...fam.providers);
            }
          });

          const campaign = createCampaign({
            goal: `${CAMPAIGN_TEMPLATES.find(t => t.id === campTemplate)?.label} for ${campAsset}`,
            assetId: campAsset,
            fieldPath: gap.fieldPath,
            gapType: gap.type,
            priority: CAMPAIGN_TEMPLATES.find(t => t.id === campTemplate)?.defaultPriority || 'med',
            trigger: CAMPAIGN_TEMPLATES.find(t => t.id === campTemplate)?.defaultTrigger || 'research',
            providers: expandedProviders,
            at: asOf,
          });

          const allProviders = buildProviders();
          // Fetch actual data from selected providers
          const providedData = await fetchProviderData(expandedProviders, { campaign, at: asOf });
          const fetched = Object.fromEntries(
            Object.entries(providedData).map(([providerId, data]) => [
              providerId,
              (data.records || []).map(r => ({ ...r, id: `${providerId}-${Math.random().toString(36).slice(2, 9)}` }))
            ])
          );

          const result = runCampaign(campaign, { providers: allProviders, fetched, pb: selectedPb, asOf });
          recordCampaign(result);
          setCampCampaignEvidence(result.evidence || []);
          setCampReviewStep(true);
          setCampRunResult(result);
        } catch (e) {
          setCampRunResult({ error: e.message });
        } finally {
          setCampRunning(false);
        }
      };

      // REMOVED in Phase 5F.1: `handleMerge`. It set React state and wrote nothing —
      // no KCR, no playbook write, no persistence — then reported
      // "Evidence merged into playbook … now marked as researched."
      //
      // Deleted rather than left unreferenced. A dead function that fabricates a
      // success message is one `onClick` from being live again, and its name reads
      // like the feature it never was. When a real bridge is built it should be
      // written against the governed path (openCorrection → Review → publish), not
      // resurrected from this.

      const handleBatchGapClosure = async () => {
        if (!selectedPb || campSelectedGaps.length === 0 || campProviders.length === 0) return;
        setCampBatchRunning(true);
        setCampBatchResults([]);
        setCampFormattedResults(null);

        // Expand provider family IDs to individual provider IDs
        const expandedProviders = [];
        const usedFamilies = [];
        PROVIDER_FAMILIES.forEach((fam) => {
          if (campProviders.includes(fam.id)) {
            expandedProviders.push(...fam.providers);
            usedFamilies.push(fam.label);
          }
        });

        // Also include any individual provider IDs that were directly selected
        campProviders.forEach((prov) => {
          if (!PROVIDER_FAMILIES.find(f => f.id === prov) && !expandedProviders.includes(prov)) {
            expandedProviders.push(prov);
          }
        });

        const allProviders = buildProviders();
        const results = [];
        const selectedGapsData = gaps.filter(g => campSelectedGaps.includes(g.id));

        for (let i = 0; i < selectedGapsData.length; i++) {
          const currentGap = selectedGapsData[i];
          setCampBatchProgress({ current: i + 1, total: selectedGapsData.length });

          try {
            const templates = getTemplatesForIntent(getResearchIntent(currentGap), CAMPAIGN_TEMPLATES);
            const template = templates[0];
            if (!template) {
              results.push({ gap: currentGap, status: 'error', message: 'No template found for research intent' });
              continue;
            }

            const campaign = createCampaign({
              goal: `${template.label} for ${campAsset}`,
              assetId: campAsset,
              fieldPath: currentGap.fieldPath,
              gapType: currentGap.type,
              priority: template.defaultPriority || 'med',
              trigger: template.defaultTrigger || 'research',
              providers: expandedProviders,
              at: asOf,
            });

            const providedData = await fetchProviderData(expandedProviders, { campaign, at: asOf });
            const fetched = Object.fromEntries(
              Object.entries(providedData).map(([providerId, data]) => [
                providerId,
                (data.records || []).map(r => ({ ...r, id: `${providerId}-${Math.random().toString(36).slice(2, 9)}` }))
              ])
            );

            const result = runCampaign(campaign, { providers: allProviders, fetched, pb: selectedPb, asOf });
            recordCampaign(result);

            const evidenceCount = result.evidence?.length || 0;
            const conflictCount = result.result?.conflicts || 0;
            let reason = '';

            if (evidenceCount === 0) {
              reason = `No evidence from ${usedFamilies.join(', ') || 'selected providers'}`;
            } else if (conflictCount > 0) {
              reason = `Low confidence (${evidenceCount} items, ${conflictCount} conflict${conflictCount > 1 ? 's' : ''})`;
            } else if (evidenceCount < 2) {
              reason = `Insufficient sources (only ${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'})`;
            } else {
              reason = `Research complete: ${evidenceCount} evidence items from ${usedFamilies.join(', ')}`;
            }

            results.push({
              gap: currentGap,
              status: 'success',
              evidence: evidenceCount,
              conflicts: conflictCount,
              finding: result.result?.finding || 'insufficient',
              reason,
              providersUsed: usedFamilies,
              evidence_list: result.evidence || [],
              result
            });
          } catch (e) {
            results.push({ gap: currentGap, status: 'error', message: e.message });
          }
        }

        // Update playbooks with researched data
        let updatedPlaybook = JSON.parse(JSON.stringify(selectedPb));
        let playbookChanged = false;

        for (const result of results) {
          if (result.status === 'success' && result.result?.evidence?.length > 0) {
            const gapData = result.gap;
            const [resourceType, resourceId] = gapData.fieldPath.split('[');
            const cleanId = resourceId?.replace(']', '');

            if (resourceType === 'decisions' && updatedPlaybook.decisions) {
              const decisionIdx = updatedPlaybook.decisions.findIndex(d => d.id === cleanId);
              if (decisionIdx >= 0 && updatedPlaybook.decisions[decisionIdx].costFactorProvenance) {
                updatedPlaybook.decisions[decisionIdx].costFactorProvenance = {
                  ...updatedPlaybook.decisions[decisionIdx].costFactorProvenance,
                  verificationStatus: 'researched',
                  tier: 'researched',
                  sources: result.providersUsed || [],
                  researchedAt: asOf,
                };
                playbookChanged = true;
              }
            } else if (resourceType === 'purchases' && updatedPlaybook.purchases) {
              const purchaseIdx = updatedPlaybook.purchases.findIndex(p => p.id === cleanId);
              if (purchaseIdx >= 0) {
                if (gapData.fieldPath.includes('.costFactors') && updatedPlaybook.purchases[purchaseIdx].costFactorProvenance) {
                  updatedPlaybook.purchases[purchaseIdx].costFactorProvenance = {
                    ...updatedPlaybook.purchases[purchaseIdx].costFactorProvenance,
                    verificationStatus: 'researched',
                    tier: 'researched',
                    sources: result.providersUsed || [],
                    researchedAt: asOf,
                  };
                  playbookChanged = true;
                } else if (gapData.fieldPath.includes('.unitCostRange') && updatedPlaybook.purchases[purchaseIdx].costProvenance) {
                  updatedPlaybook.purchases[purchaseIdx].costProvenance = {
                    ...updatedPlaybook.purchases[purchaseIdx].costProvenance,
                    verificationStatus: 'researched',
                    tier: 'researched',
                    sources: result.providersUsed || [],
                    researchedAt: asOf,
                  };
                  playbookChanged = true;
                }
              }
            }
          }
        }

        // Save updated playbook
        if (playbookChanged) {
          try {
            const KEY = `ngw-playbook-${updatedPlaybook.type || updatedPlaybook.id}`;
            localStorage.setItem(KEY, JSON.stringify(updatedPlaybook));
            refreshPlaybooks(); // Update Mission Control and other sections
          } catch (e) {
            console.error('Failed to save playbook updates:', e);
          }
        }

        setCampBatchResults(results);
        setCampFormattedResults(formatBatchResults(results));
        setCampBatchRunning(false);
        setCampReviewStep(true);
      };

      const formatBatchResults = (results) => {
        const summary = {
          total: results.length,
          succeeded: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length,
          totalEvidence: results.filter(r => r.status === 'success').reduce((sum, r) => sum + r.evidence, 0),
          totalConflicts: results.filter(r => r.status === 'success').reduce((sum, r) => sum + r.conflicts, 0),
        };

        return {
          summary,
          details: results.map(r => {
            // Generate research question
            const researchQuestion = generateResearchQuestion(r.gap, selectedPb);

            // Score evidence relevance to the research question
            const allEvidence = r.evidence_list || [];
            const categorized = categorizeEvidenceRelevance(allEvidence, researchQuestion);
            const directEvidence = categorized.direct.length;

            // Analyze finding in detail
            let findingAnalysis = null;
            if (r.status === 'success' && r.result) {
              findingAnalysis = explainFinding(
                analyzeFinding(r.result, allEvidence, r.result),
                r.gap
              );
            }

            return {
              gap: r.gap.label,
              status: r.status,
              evidence: r.evidence || 0,
              conflicts: r.conflicts || 0,
              finding: r.finding,
              message: r.message,
              reason: r.reason,
              providersUsed: r.providersUsed,
              evidence_list: allEvidence,
              findingAnalysis,
              // NEW: Research question context
              researchQuestion,
              relevanceCategorized: {
                direct: directEvidence,
                related: categorized.related.length,
                tangential: categorized.tangential.length,
                unrelated: categorized.unrelated.length,
              },
            };
          })
        };
      };

      return (
        <div>
          <Banner>Campaign Research — streamlined end-to-end workflow: select playbook → detect gaps → launch campaign → review evidence → merge findings</Banner>

          {!campReviewStep ? (
            <div>
              {/* STEP 1: Select Playbook */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Step 1: Select Playbook</div>
                <select value={campAsset} onChange={(e) => { setCampAsset(e.target.value); setCampSelectedGap(null); setCampTemplate(''); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: type.size.caption, fontFamily: 'inherit', marginBottom: 10 }}>
                  {ALL_PLAYBOOKS.map((pb) => <option key={pb.type} value={pb.type}>{pb.type}</option>)}
                </select>
                {selectedPb && gaps.length > 0 && <div style={{ fontSize: 11, color: D.good }}>✓ {gaps.length} gaps detected</div>}
              </div>

              {/* STEP 2: Select Gap */}
              {gaps.length > 0 && (
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Step 2: Select Gap ({gaps.length} found)</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setCampSelectedGaps(gaps.map(g => g.id))} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 4, border: `1px solid ${D.accent}`, background: 'transparent', color: D.accent, cursor: 'pointer' }}>Select All</button>
                      <button onClick={() => setCampSelectedGaps([])} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 4, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer' }}>Clear All</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {gaps.map((g) => (
                      <label key={g.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 12px', borderRadius: 6, border: `1px solid ${campSelectedGaps.includes(g.id) ? D.accent : D.border}`, background: campSelectedGaps.includes(g.id) ? `${D.accent}22` : 'transparent', cursor: 'pointer', fontSize: type.size.caption, fontFamily: 'inherit' }}>
                        <input type="checkbox" checked={campSelectedGaps.includes(g.id)} onChange={(e) => { if (e.target.checked) setCampSelectedGaps([...campSelectedGaps, g.id]); else setCampSelectedGaps(campSelectedGaps.filter((x) => x !== g.id)); }} style={{ marginRight: 10, marginTop: 2, cursor: 'pointer' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{g.label}</div>
                          <div style={{ fontSize: '11px', color: D.muted }}>{g.note?.slice(0, 60)}...</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {campSelectedGaps.length === 1 && !campBatchProviderSelection && (
                    <button onClick={() => setCampSelectedGap(campSelectedGaps[0])} disabled={campBatchRunning} style={{ width: '100%', padding: '10px', marginTop: 12, borderRadius: 6, border: 'none', background: !campBatchRunning ? D.accent : D.border, color: !campBatchRunning ? '#fff' : D.muted, cursor: !campBatchRunning ? 'pointer' : 'default', fontWeight: 600, fontSize: type.size.caption, fontFamily: 'inherit' }}>
                      {campBatchRunning ? '⏳ Processing...' : `→ Continue to template selection`}
                    </button>
                  )}

                  {campSelectedGaps.length > 1 && !campBatchProviderSelection && (
                    <button onClick={() => setCampBatchProviderSelection(true)} disabled={campBatchRunning} style={{ width: '100%', padding: '10px', marginTop: 12, borderRadius: 6, border: 'none', background: !campBatchRunning ? D.good : D.border, color: !campBatchRunning ? '#fff' : D.muted, cursor: !campBatchRunning ? 'pointer' : 'default', fontWeight: 600, fontSize: type.size.caption, fontFamily: 'inherit' }}>
                      {campBatchRunning ? `⏳ Closing gaps (${campBatchProgress.current}/${campBatchProgress.total})...` : `🎯 Close All ${campSelectedGaps.length} Gaps`}
                    </button>
                  )}

                  {/* Provider Selection for Batch */}
                  {campSelectedGaps.length > 1 && campBatchProviderSelection && (
                    <div style={{ background: `${D.accent}08`, border: `1px solid ${D.accent}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: D.accent, fontWeight: 700, marginBottom: 8 }}>Select Providers for Batch Closure</div>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 10 }}>
                        Will query {campProviders.length} provider families across {campSelectedGaps.length} gaps
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, maxHeight: '150px', overflow: 'auto' }}>
                        {PROVIDER_FAMILIES.map((fam) => (
                          <label key={fam.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>
                            <input type="checkbox" checked={campProviders.includes(fam.id)} onChange={(e) => { if (e.target.checked) setCampProviders([...campProviders, fam.id]); else setCampProviders(campProviders.filter((p) => p !== fam.id)); }} style={{ marginRight: 8, cursor: 'pointer' }} />
                            <span style={{ flex: 1, color: D.text }}>{fam.label}</span>
                            <span style={{ color: D.faint, fontSize: 9 }}>{fam.note}</span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setCampBatchProviderSelection(false)} style={{ flex: 1, padding: '8px', borderRadius: 4, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                          Back
                        </button>
                        <button onClick={handleBatchGapClosure} disabled={campBatchRunning || campProviders.length === 0} style={{ flex: 1, padding: '8px', borderRadius: 4, border: 'none', background: campProviders.length > 0 && !campBatchRunning ? D.good : D.border, color: campProviders.length > 0 && !campBatchRunning ? '#fff' : D.muted, cursor: campProviders.length > 0 && !campBatchRunning ? 'pointer' : 'default', fontSize: 10, fontWeight: 600 }}>
                          {campBatchRunning ? '⏳ Running...' : `Launch with ${campProviders.length} providers`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Choose Template */}
              {gap && suggestedTemplates.length > 0 && (
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Step 3: Choose Campaign Template</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {suggestedTemplates.map((t) => (
                      <button key={t.id} onClick={() => setCampTemplate(t.id)} style={{ padding: '10px 12px', borderRadius: 6, border: `1px solid ${campTemplate === t.id ? D.accent : D.border}`, background: campTemplate === t.id ? `${D.accent}22` : 'transparent', color: campTemplate === t.id ? D.accent : D.text, cursor: 'pointer', textAlign: 'left', fontSize: type.size.caption, fontFamily: 'inherit' }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: '11px', color: D.muted }}>{t.description?.slice(0, 60)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Select Providers */}
              {campTemplate && (
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Step 4: Select Providers</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setCampProviders(PROVIDER_FAMILIES.map(f => f.id))} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 4, border: `1px solid ${D.accent}`, background: 'transparent', color: D.accent, cursor: 'pointer' }}>Select All</button>
                      <button onClick={() => setCampProviders([])} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 4, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer' }}>Clear All</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PROVIDER_FAMILIES.map((fam) => (
                      <label key={fam.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 6, border: `1px solid ${campProviders.includes(fam.id) ? D.accent : 'transparent'}`, background: campProviders.includes(fam.id) ? `${D.accent}08` : 'transparent', cursor: 'pointer', fontSize: type.size.caption, fontFamily: 'inherit' }}>
                        <input type="checkbox" checked={campProviders.includes(fam.id)} onChange={(e) => { if (e.target.checked) setCampProviders([...campProviders, fam.id]); else setCampProviders(campProviders.filter((p) => p !== fam.id)); }} style={{ marginRight: 10, cursor: 'pointer' }} />
                        <span style={{ color: D.text, fontWeight: 500, flex: 1 }}>{fam.label}</span>
                        <span style={{ color: D.faint, fontSize: '11px' }}>{fam.note}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleLaunch} disabled={campRunning || campProviders.length === 0} style={{ width: '100%', padding: '10px', marginTop: 12, borderRadius: 6, border: 'none', background: campProviders.length > 0 && !campRunning ? D.accent : D.border, color: campProviders.length > 0 && !campRunning ? '#fff' : D.muted, cursor: campProviders.length > 0 && !campRunning ? 'pointer' : 'default', fontWeight: 600, fontSize: type.size.caption, fontFamily: 'inherit' }}>
                    {campRunning ? '⏳ Launching...' : '🚀 Launch Campaign'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* STEP 5: Results */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Step 5: Results</div>
                  {campFormattedResults && (
                    <button onClick={() => setCampShowJsonResults(!campShowJsonResults)} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 4, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer' }}>
                      {campShowJsonResults ? 'Hide JSON' : 'Show JSON'}
                    </button>
                  )}
                </div>

                {campBatchRunning && (
                  <div style={{ background: `${D.accent}22`, border: `1px solid ${D.accent}`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.accent }}>⏳ Processing</div>
                      <div style={{ fontSize: 12, color: D.accent }}>Gap {campBatchProgress.current} of {campBatchProgress.total}</div>
                    </div>
                    <div style={{ background: D.bg, height: 6, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ background: D.accent, height: '100%', width: `${(campBatchProgress.current / campBatchProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                {campFormattedResults && !campShowJsonResults && (
                  <div>
                    {/* Batch Results Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                      <div style={{ background: D.bg, padding: 10, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: D.accent }}>{campFormattedResults.summary.total}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Total Gaps</div>
                      </div>
                      <div style={{ background: D.bg, padding: 10, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: D.good }}>{campFormattedResults.summary.succeeded}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Succeeded</div>
                      </div>
                      <div style={{ background: D.bg, padding: 10, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: D.accent }}>{campFormattedResults.summary.totalEvidence}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Evidence Collected</div>
                      </div>
                      <div style={{ background: D.bg, padding: 10, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: campFormattedResults.summary.totalConflicts > 0 ? D.warn : D.good }}>{campFormattedResults.summary.totalConflicts}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Conflicts</div>
                      </div>
                    </div>

                    {/* Results Legend */}
                    <div style={{ background: `${D.accent}08`, border: `1px solid ${D.accent}22`, borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 9, color: D.muted }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: D.text }}>Understanding Results:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 8 }}>
                        <div><strong>Success:</strong> Campaign ran and collected evidence (doesn't mean sufficient to close gap)</div>
                        <div><strong>Finding:</strong> "proposed" = enough evidence, "insufficient" = not enough evidence</div>
                        <div><strong>Conflicts:</strong> Different sources reported different values for same field</div>
                        <div><strong>Evidence:</strong> Number of evidence items collected (sum across all providers)</div>
                      </div>
                    </div>

                    {/* Detailed Results */}
                    <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11 }}>📊 Campaign Results</div>
                      {campFormattedResults.details.map((detail, i) => {
                        const isExpanded = campExpandedEvidenceDetails.has(i);
                        const toggleExpanded = () => {
                          const newSet = new Set(campExpandedEvidenceDetails);
                          if (newSet.has(i)) newSet.delete(i);
                          else newSet.add(i);
                          setCampExpandedEvidenceDetails(newSet);
                        };
                        return (
                          <div key={i} style={{ background: D.surface, padding: 8, borderRadius: 4, marginBottom: 6, borderLeft: `3px solid ${detail.status === 'success' ? D.good : D.warn}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <div style={{ fontWeight: 600, fontSize: 11, color: D.text }}>{detail.gap}</div>
                              <span style={{ fontSize: 9, color: detail.status === 'success' ? D.good : D.warn, fontWeight: 600 }}>
                                {detail.status === 'success' ? '✓ Success' : '✕ Failed'}
                              </span>
                            </div>
                            {detail.status === 'success' ? (
                              <div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: D.muted, marginBottom: 8 }}>
                                  <span>Evidence: <strong style={{ color: D.text }}>{detail.evidence}</strong></span>
                                  <span>Conflicts: <strong style={{ color: detail.conflicts > 0 ? D.warn : D.text }}>{detail.conflicts}</strong></span>
                                </div>

                                {/* Research Question Context */}
                                {detail.researchQuestion && (
                                  <div style={{ background: `${D.accent}08`, border: `1px solid ${D.accent}22`, borderRadius: 3, padding: 6, marginBottom: 8, fontSize: 8 }}>
                                    <div style={{ fontWeight: 600, color: D.accent, marginBottom: 3 }}>🔍 Research Question</div>
                                    <div style={{ color: D.text, marginBottom: 3, fontStyle: 'italic' }}>"{detail.researchQuestion.question}"</div>
                                    <div style={{ color: D.muted, marginBottom: 3 }}>Looking for: {detail.researchQuestion.details.join(' • ')}</div>
                                    <div style={{ color: D.muted, fontSize: 7 }}>
                                      Evidence breakdown:
                                      <span style={{ marginLeft: 4, fontWeight: 600, color: D.accent }}>
                                        {detail.relevanceCategorized.direct} direct,
                                      </span>
                                      <span style={{ marginLeft: 4, fontWeight: 600, color: D.accent }}>
                                        {detail.relevanceCategorized.related} related,
                                      </span>
                                      <span style={{ marginLeft: 4, color: D.muted }}>
                                        {detail.relevanceCategorized.tangential} tangential,
                                        {detail.relevanceCategorized.unrelated} unrelated
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Detailed Finding Explanation */}
                                {(() => {
                                  const findingAnalysis = detail.findingAnalysis;
                                  if (!findingAnalysis) return null;

                                  const findingColors = {
                                    sufficient: D.good,
                                    proposed: D.accent,
                                    insufficient: D.warn,
                                    conflicted: D.warn,
                                    inconclusive: D.warn,
                                  };

                                  return (
                                    <div style={{ background: `${findingColors[findingAnalysis.status]}22`, border: `1px solid ${findingColors[findingAnalysis.status]}44`, borderRadius: 3, padding: 6, marginBottom: 8 }}>
                                      <div style={{ fontWeight: 600, fontSize: 10, color: findingColors[findingAnalysis.status], marginBottom: 4 }}>
                                        {findingAnalysis.icon} {findingAnalysis.title} — {findingAnalysis.summary}
                                      </div>

                                      {/* Why this status */}
                                      <div style={{ fontSize: 8, color: D.text, marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>Why:</div>
                                        {findingAnalysis.details.why.map((reason, idx) => (
                                          <div key={idx} style={{ marginLeft: 8, marginBottom: 1 }}>{reason}</div>
                                        ))}
                                      </div>

                                      {/* What's missing */}
                                      {findingAnalysis.details.missing && (
                                        <div style={{ fontSize: 8, color: D.text, marginBottom: 4 }}>
                                          <div style={{ fontWeight: 600, marginBottom: 2 }}>Still needed:</div>
                                          {findingAnalysis.details.missing.map((item, idx) => (
                                            <div key={idx} style={{ marginLeft: 8, marginBottom: 1 }}>• {item}</div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Next steps */}
                                      {findingAnalysis.details.nextSteps && (
                                        <div style={{ fontSize: 8, color: D.text }}>
                                          <div style={{ fontWeight: 600, marginBottom: 2 }}>Next steps:</div>
                                          {findingAnalysis.details.nextSteps.map((step, idx) => (
                                            <div key={idx} style={{ marginLeft: 8, marginBottom: 1 }}>{idx + 1}. {step}</div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Action button */}
                                      <div style={{ fontSize: 8, color: findingColors[findingAnalysis.status], fontWeight: 600, marginTop: 4, paddingTop: 4, borderTop: `1px solid ${findingColors[findingAnalysis.status]}44` }}>
                                        → {findingAnalysis.action}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {detail.reason && (
                                  <div style={{ fontSize: 9, color: D.faint, fontStyle: 'italic' }}>
                                    💡 {detail.reason}
                                  </div>
                                )}
                                {detail.providersUsed && detail.providersUsed.length > 0 && (
                                  <div style={{ fontSize: 9, color: D.faint, marginTop: 3 }}>
                                    Providers used: {detail.providersUsed.join(', ')}
                                  </div>
                                )}
                                {detail.evidence_list && detail.evidence_list.length > 0 && (
                                  <div style={{ marginTop: 8, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 4, padding: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 9, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span>📋 Evidence Breakdown ({detail.evidence_list.length} items)</span>
                                      <button onClick={toggleExpanded} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 2, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer' }}>
                                        {isExpanded ? 'Hide' : 'Show'} Details
                                      </button>
                                    </div>

                                    {/* Provider Summary */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isExpanded ? 8 : 0, fontSize: 8 }}>
                                      {(() => {
                                        // Group evidence by provider family using SOURCE_CATALOG mapping
                                        const providerCounts = {};
                                        (detail.evidence_list || []).forEach(ev => {
                                          const family = getProviderFamilyForSource(ev.source);
                                          providerCounts[family] = (providerCounts[family] || 0) + 1;
                                        });

                                        // Show all providers with counts (even if 0)
                                        return detail.providersUsed?.map((provider, idx) => (
                                          <div key={idx} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4, opacity: (providerCounts[provider] || 0) > 0 ? 1 : 0.5 }}>
                                            <span style={{ fontWeight: 500, color: D.accent }}>{provider}</span>
                                            <span style={{ background: (providerCounts[provider] || 0) > 0 ? D.good : D.border, borderRadius: 2, padding: '1px 3px', fontSize: 7, color: (providerCounts[provider] || 0) > 0 ? '#fff' : D.muted }}>{providerCounts[provider] || 0}</span>
                                          </div>
                                        ));
                                      })()}
                                    </div>

                                    {/* Consensus Recommendations (if conflicts) */}
                                    {detail.conflicts > 0 && detail.evidence_list && detail.evidence_list.length > 0 && (() => {
                                      const factsByField = {};
                                      detail.evidence_list.forEach(ev => {
                                        (ev.extractedFacts || []).forEach(f => {
                                          if (!factsByField[f.fact]) factsByField[f.fact] = [];
                                          factsByField[f.fact].push({ value: f.value, source: ev.source, confidence: f.confidence });
                                        });
                                      });

                                      const conflictingFields = Object.entries(factsByField)
                                        .filter(([_, facts]) => [...new Set(facts.map(f => JSON.stringify(f.value)))].length > 1);

                                      if (conflictingFields.length === 0) return null;

                                      // Auto-accept high confidence findings
                                      const autoAccepted = [];
                                      conflictingFields.forEach(([fieldName, facts]) => {
                                        const valueCounts = {};
                                        facts.forEach(f => {
                                          const key = JSON.stringify(f.value);
                                          if (!valueCounts[key]) valueCounts[key] = { value: f.value, count: 0, confidence: [] };
                                          valueCounts[key].count++;
                                          valueCounts[key].confidence.push(f.confidence);
                                        });
                                        const sorted = Object.values(valueCounts).sort((a, b) => b.count - a.count);
                                        const winner = sorted[0];
                                        const isUnanimous = winner.count === facts.length;
                                        const allHighConfidence = winner.confidence.every(c => c === 'high');

                                        if (isUnanimous || allHighConfidence) {
                                          autoAccepted.push({ field: fieldName, value: winner.value });
                                          // Auto-select in state
                                          if (!campConflictResolutions[`${i}-${fieldName}`]) {
                                            setCampConflictResolutions(prev => ({
                                              ...prev,
                                              [`${i}-${fieldName}`]: JSON.stringify(winner.value)
                                            }));
                                          }
                                        }
                                      });

                                      return (
                                        <div style={{ background: `${D.accent}08`, border: `1px solid ${D.accent}22`, borderRadius: 3, padding: 6, marginBottom: isExpanded ? 8 : 0, fontSize: 7 }}>
                                          <div style={{ fontWeight: 600, marginBottom: 4, color: D.accent }}>💡 Consensus Recommendations</div>
                                          {autoAccepted.length > 0 && (
                                            <div style={{ background: `${D.good}22`, border: `1px solid ${D.good}`, borderRadius: 2, padding: 4, marginBottom: 4 }}>
                                              <div style={{ fontSize: 6, fontWeight: 600, color: D.good, marginBottom: 2 }}>✓ AUTO-ACCEPTED ({autoAccepted.length})</div>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {autoAccepted.map(({ field, value }) => (
                                                  <div key={field} style={{ fontSize: 6, color: D.text }}>
                                                    <strong>{field}</strong> → <strong>{String(value)}</strong> <span style={{ color: D.muted }}>(high confidence)</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {conflictingFields.map(([fieldName, facts]) => {
                                            if (autoAccepted.some(a => a.field === fieldName)) return null;

                                            const valueCounts = {};
                                            facts.forEach(f => {
                                              const key = JSON.stringify(f.value);
                                              if (!valueCounts[key]) valueCounts[key] = { value: f.value, count: 0, sources: [] };
                                              valueCounts[key].count++;
                                              valueCounts[key].sources.push(f.source);
                                            });

                                            const sorted = Object.values(valueCounts).sort((a, b) => b.count - a.count);
                                            const winner = sorted[0];
                                            const isUnanimous = winner.count === facts.length;

                                            return (
                                              <div key={fieldName} style={{ padding: '4px', marginBottom: 3, background: D.surface, borderRadius: 2, borderLeft: `2px solid ${D.warn}` }}>
                                                <div style={{ fontWeight: 600, color: D.accent }}>⚠️ {fieldName}</div>
                                                <div style={{ color: D.text, marginTop: 1 }}>Recommended: <strong>{String(winner.value)}</strong> <span style={{ color: D.muted }}>({winner.count}/{facts.length} sources)</span></div>
                                                <div style={{ fontSize: 6, color: D.faint, marginTop: 1 }}>Select below to resolve</div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}

                                    {isExpanded && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 8 }}>
                                        {detail.evidence_list.map((ev, j) => {
                                          const qualityScore = calculateEvidenceQualityScore(ev);
                                          const quality = describeEvidenceQuality(qualityScore);
                                          const connStatus = ev.connectionStatus;
                                          const issues = connStatus ? whyEvidenceUntrustworthy(ev) : [];

                                          return (
                                          <div key={j} style={{ background: D.surface, padding: 6, borderRadius: 3, borderLeft: `3px solid ${ev.extractedFacts?.length > 0 ? D.accent : D.warn}`, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                              <div style={{ fontWeight: 600, color: D.accent }}>📌 {ev.source || 'Unknown Source'}</div>
                                              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                                {ev.extractedFacts?.length > 0 ? (
                                                  <span style={{ fontSize: 7, background: D.good, color: '#fff', padding: '1px 4px', borderRadius: 2 }}>✓ {ev.extractedFacts.length} facts</span>
                                                ) : (
                                                  <span style={{ fontSize: 7, background: D.warn, color: '#fff', padding: '1px 4px', borderRadius: 2 }}>⚠ No facts</span>
                                                )}
                                                {connStatus && (
                                                  <span style={{ fontSize: 7, background: STATUS_COLOR[connStatus.status] === 'good' ? D.good : STATUS_COLOR[connStatus.status] === 'warn' ? D.warn : D.bad, color: '#fff', padding: '1px 4px', borderRadius: 2 }}>
                                                    {connStatus.status === CONNECTION_STATUS.SUCCESS ? '✓' : connStatus.status === CONNECTION_STATUS.EMPTY ? '⊘' : '✕'} {connStatus.status}
                                                  </span>
                                                )}
                                                {connStatus?.freshness && (
                                                  <span style={{ fontSize: 7, background: FRESHNESS_COLOR[connStatus.freshness], color: '#fff', padding: '1px 4px', borderRadius: 2 }}>
                                                    {connStatus.freshness === DATA_FRESHNESS.CURRENT ? '⏱ current' : connStatus.freshness === DATA_FRESHNESS.RECENT ? '⏱ recent' : connStatus.freshness === DATA_FRESHNESS.AGED ? '⏱ aged' : '⏱ stale'}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Data Quality Issues */}
                                            {issues.length > 0 && (
                                              <div style={{ background: `${D.warn}11`, border: `1px solid ${D.warn}22`, borderRadius: 2, padding: 4, fontSize: 6, color: D.warn }}>
                                                <div style={{ fontWeight: 600, marginBottom: 2 }}>⚠️ Data Quality Issues:</div>
                                                <ul style={{ margin: 0, paddingLeft: 12, lineHeight: 1.3 }}>
                                                  {issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                                                </ul>
                                              </div>
                                            )}

                                            <div style={{ color: D.text, lineHeight: '1.4' }}>{ev.statement || ev.summary || 'No statement'}</div>
                                            {ev.extractedFacts && ev.extractedFacts.length > 0 ? (
                                              <div style={{ background: `${D.accent}08`, padding: 4, borderRadius: 2, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                                                {ev.extractedFacts.map((f, k) => (
                                                  <div key={k} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, fontSize: 7, paddingBottom: k < ev.extractedFacts.length - 1 ? 2 : 0, borderBottom: k < ev.extractedFacts.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                                                      <strong style={{ color: D.accent }}>{f.fact}</strong>
                                                      <div style={{ color: D.muted, fontSize: 6 }}>Value: {typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value)}</div>
                                                    </div>
                                                    <div style={{ background: f.confidence === 'high' ? D.good : f.confidence === 'medium' ? D.accent : D.warn, color: '#fff', padding: '1px 3px', borderRadius: 2, fontWeight: 600, whiteSpace: 'nowrap' }}>{f.confidence || 'unknown'}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: 7, color: D.warn, fontStyle: 'italic' }}>⚠️ No facts could be extracted from this source</div>
                                            )}
                                          </div>
                                        );
                                        })}
                                        {detail.conflicts > 0 && (
                                          <div style={{ background: `${D.warn}22`, border: `1px solid ${D.warn}`, padding: 6, borderRadius: 3 }}>
                                            <div style={{ fontWeight: 600, color: D.warn, marginBottom: 3 }}>⚠️ Conflicting Evidence Detected</div>
                                            <div style={{ color: D.text, fontSize: 7, lineHeight: '1.4', marginBottom: 6 }}>
                                              {detail.conflicts} conflict{detail.conflicts > 1 ? 's' : ''} found: Different providers reported different values for the same field. Choose a consensus value below.
                                            </div>

                                            {/* Conflict Resolution UI */}
                                            {detail.evidence_list && detail.evidence_list.length > 0 && (() => {
                                              const conflictKey = `${i}-conflicts`;
                                              const isExpanded = campExpandedConflicts.has(conflictKey);
                                              const toggleConflict = () => {
                                                const newSet = new Set(campExpandedConflicts);
                                                if (newSet.has(conflictKey)) newSet.delete(conflictKey);
                                                else newSet.add(conflictKey);
                                                setCampExpandedConflicts(newSet);
                                              };

                                              // Group evidence by extracted facts to show conflicts
                                              const factsByField = {};
                                              detail.evidence_list.forEach(ev => {
                                                (ev.extractedFacts || []).forEach(f => {
                                                  if (!factsByField[f.fact]) factsByField[f.fact] = [];
                                                  factsByField[f.fact].push({
                                                    value: f.value,
                                                    source: ev.source,
                                                    confidence: f.confidence
                                                  });
                                                });
                                              });

                                              const conflictingFields = Object.entries(factsByField)
                                                .filter(([_, facts]) => {
                                                  const unique = [...new Set(facts.map(f => JSON.stringify(f.value)))];
                                                  return unique.length > 1;
                                                });

                                              return (
                                                <div>
                                                  <button onClick={toggleConflict} style={{ fontSize: 7, padding: '4px 6px', borderRadius: 3, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                                                    {isExpanded ? '▼' : '▶'} Resolve {conflictingFields.length} conflicting field{conflictingFields.length !== 1 ? 's' : ''}
                                                  </button>

                                                  {isExpanded && (
                                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                      {conflictingFields.map(([fieldName, facts]) => {
                                                        const uniqueValues = {};
                                                        facts.forEach(f => {
                                                          const key = JSON.stringify(f.value);
                                                          if (!uniqueValues[key]) {
                                                            uniqueValues[key] = [];
                                                          }
                                                          uniqueValues[key].push(f);
                                                        });

                                                        const selectedValue = campConflictResolutions[`${i}-${fieldName}`];

                                                        return (
                                                          <div key={fieldName} style={{ background: D.surface, padding: 4, borderRadius: 2, borderLeft: `2px solid ${D.warn}` }}>
                                                            <div style={{ fontSize: 7, fontWeight: 600, marginBottom: 3, color: D.accent }}>Field: {fieldName}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                              {Object.entries(uniqueValues).map(([valueStr, valueFacts]) => {
                                                                const value = JSON.parse(valueStr);
                                                                const isSelected = selectedValue === valueStr;
                                                                return (
                                                                  <label key={valueStr} style={{ display: 'flex', alignItems: 'center', padding: '3px 4px', borderRadius: 2, border: `1px solid ${isSelected ? D.accent : D.border}`, background: isSelected ? `${D.accent}22` : 'transparent', cursor: 'pointer', fontSize: 6 }}>
                                                                    <input type="radio" name={`conflict-${i}-${fieldName}`} checked={isSelected} onChange={() => setCampConflictResolutions({ ...campConflictResolutions, [`${i}-${fieldName}`]: valueStr })} style={{ marginRight: 4, cursor: 'pointer' }} />
                                                                    <div style={{ flex: 1 }}>
                                                                      <strong>{String(value)}</strong>
                                                                      <div style={{ fontSize: 5, color: D.muted, marginTop: 1 }}>
                                                                        {valueFacts.length} source{valueFacts.length !== 1 ? 's' : ''}: {valueFacts.map(f => `${f.source} (${f.confidence})`).join(', ')}
                                                                      </div>
                                                                    </div>
                                                                  </label>
                                                                );
                                                              })}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 10, color: D.warn }}>{detail.message}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Single Campaign Result (non-batch) */}
                {!campFormattedResults && campRunResult && (
                  <div>
                    {/* KPI Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                      <div style={{ background: D.bg, padding: 8, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: D.accent }}>{campRunResult.result?.evidence || 0}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Evidence items</div>
                      </div>
                      <div style={{ background: D.bg, padding: 8, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: campRunResult.result?.conflicts > 0 ? D.warn : D.good }}>{campRunResult.result?.conflicts || 0}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Conflicts</div>
                      </div>
                      <div style={{ background: D.bg, padding: 8, borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: D.accent }}>{campRunResult.state || 'running'}</div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Status</div>
                      </div>
                    </div>

                    {campShowJsonResults && (
                      <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, marginBottom: 12, fontFamily: D.mono, fontSize: 10, maxHeight: '300px', overflow: 'auto' }}>
                        <div style={{ color: D.muted, marginBottom: 8, fontWeight: 600 }}>Campaign Execution Details:</div>
                        <div style={{ color: D.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {JSON.stringify(campRunResult, null, 2)}
                        </div>
                      </div>
                    )}

                    {/* Campaign Evidence Array */}
                    {campCampaignEvidence && campCampaignEvidence.length > 0 && (
                      <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, marginBottom: 12 }}>
                        <div style={{ color: D.text, fontWeight: 600, marginBottom: 8, fontSize: 11 }}>📋 Collected Evidence ({campCampaignEvidence.length})</div>
                        {campCampaignEvidence.map((ev, i) => (
                          <div key={i} style={{ background: D.surface, padding: 8, borderRadius: 4, marginBottom: 6, fontSize: 10, borderLeft: `3px solid ${D.accent}` }}>
                            <div style={{ color: D.accent, fontWeight: 600, marginBottom: 2 }}>{ev.source || 'Unknown Source'}</div>
                            <div style={{ color: D.text, marginBottom: 2 }}>{ev.statement || ev.summary || 'No statement'}</div>
                            {ev.extractedFacts && ev.extractedFacts.length > 0 && (
                              <div style={{ color: D.muted, fontSize: 9, marginTop: 4 }}>
                                Facts: {ev.extractedFacts.map(f => `${f.fact}=${f.value}`).join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TRUTH REPAIR (Phase 5F.1). This block used to read "✓ Campaign
                        completed successfully" and offer "✓ Accept & Merge into Playbook",
                        whose handler set React state and wrote NOTHING — no KCR, no
                        playbook write, no persistence — then printed "✓ Evidence merged
                        into playbook … now marked as researched."

                        An operator was told a durable change had happened when none had.
                        That is worse than a missing feature: it teaches the person running
                        research that the loop is closed, so the gap never gets reported.

                        Option B was taken (label honestly) rather than Option A (persist).
                        Persisting would mean building an evidence→KCR bridge on top of a
                        research layer whose fetchers were fabricating federal citations
                        until this same phase. The bridge is the RIGHT next step — but only
                        once records come from somewhere real. Wiring it first would have
                        turned a silent no-op into a publisher of invented USDA data. */}
                    <div style={{ fontSize: 11, color: D.muted, marginBottom: 8 }}>
                      Campaign run finished — {(campCampaignEvidence || []).length} review candidate(s).
                    </div>
                    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, fontSize: 10.5, color: D.muted, lineHeight: 1.55 }}>
                      <strong style={{ color: D.text }}>Preview only — nothing is saved.</strong> These
                      candidates are not evidence and are not governed knowledge. Nothing here
                      reaches a host.
                      <div style={{ marginTop: 6 }}>
                        To make a finding real: register its source, then open a correction on the
                        field from <em>Publishing → Correct this</em>. That path is reviewed,
                        versioned and reversible; this panel is neither.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Back to new campaign */}
              <button onClick={() => { setCampReviewStep(false); setCampSelectedGap(null); setCampSelectedGaps([]); setCampTemplate(''); setCampRunResult(null); setCampProviders(['internal', 'government', 'food-safety', 'commercial', 'industry', 'academic', 'community']); setCampBatchResults([]); setCampFormattedResults(null); setCampBatchProviderSelection(false); }} style={{ width: '100%', padding: '10px', borderRadius: 6, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer', fontWeight: 600, fontSize: type.size.caption, fontFamily: 'inherit' }}>
                ← Start New Campaign
              </button>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Dep. Explorer') {
      const pbNames = ALL_PLAYBOOKS.map((pb) => pb.type);
      const runBlast = () => {
        try {
          const pb = ALL_PLAYBOOKS.find((p) => p.type === depType);
          if (!pb) { setDepResult({ error: `Playbook "${depType}" not found` }); return; }
          setDepResult(blastRadius(pb, depField, graph));
        } catch (e) { setDepResult({ error: e.message }); }
      };
      return (
        <div>
          <Banner>Dependency Explorer — compute blast radius for any asset + fieldPath before publishing. Shows which engines, readers, runtime experiences, and prompts a change would affect. PURE: nothing publishes.</Banner>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asset</div>
              <select value={depType} onChange={(e) => { setDepType(e.target.value); setDepResult(null); }} style={{ ...inputSm, minWidth: 200 }}>
                {pbNames.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Field path</div>
              <input value={depField} onChange={(e) => { setDepField(e.target.value); setDepResult(null); }} style={inputSm} placeholder="e.g. p_crabs.unitCostRange" />
            </div>
            <button onClick={runBlast} style={{ ...btnStyle(true), alignSelf: 'flex-end' }}>Compute blast radius</button>
          </div>
          {depResult && (depResult.error ? (
            <Banner tone="bad">{depResult.error}</Banner>
          ) : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <PBKpi label="Affected assets" value={(depResult.affectedAssets || []).length} tone={D.warn} />
                <PBKpi label="Engines" value={(depResult.affectedEngines || []).length} tone={D.warn} />
                <PBKpi label="Readers" value={(depResult.affectedReaders || []).length} tone={D.warn} />
                <PBKpi label="Runtime" value={(depResult.affectedRuntime || []).length} tone={D.warn} />
                <PBKpi label="Tests" value={Array.isArray(depResult.affectedTests) ? depResult.affectedTests.length : (depResult.affectedTests?.known === false ? 'CI only' : 0)} tone={D.faint} />
              </div>
              {['affectedEngines', 'affectedReaders', 'affectedRuntime', 'affectedPrompts', 'affectedTests'].map((key) => {
                const arr = Array.isArray(depResult[key]) ? depResult[key] : [];
                if (!arr.length) return null;
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{key}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {arr.map((v, i) => <span key={i} style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: D.surface2, color: D.muted }}>{v}</span>)}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: type.size.caption, color: D.faint, fontFamily: D.mono, marginTop: 6 }}>magnitude: {JSON.stringify(depResult.magnitude)}</div>
            </div>
          ))}
        </div>
      );
    }

    if (ws === 'Graph') {
      const { stats } = graph;
      return (
        <div>
          <Banner>Knowledge Graph — the derived relationship map over all assets, evidence, findings, and KCRs. O(n), no DB. Relationship types and domains encode the knowledge structure.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Nodes" value={stats.nodeCount} />
            <PBKpi label="Edges" value={stats.edgeCount} />
            <PBKpi label="Asset kinds" value={Object.keys(stats.assetKinds || {}).length} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: '1 1 200px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nodes by kind</div>
              {Object.entries(stats.byKind || {}).map(([k, n]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: type.size.caption, color: D.muted, padding: '2px 0' }}>
                  <span>{k}</span><span style={{ fontFamily: D.mono }}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 200px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Edges by relation</div>
              {Object.keys(stats.byRelation || {}).length === 0 ? <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>No edges yet — graph connects as KCRs link to assets.</div> : Object.entries(stats.byRelation).map(([r, n]) => (
                <div key={r} style={{ display: 'flex', justifyContent: 'space-between', fontSize: type.size.caption, color: D.muted, padding: '2px 0' }}>
                  <span>{r}</span><span style={{ fontFamily: D.mono }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
          {stats.nodeCount > 0 && (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['ID', 'Kind', 'Domain'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {graph.nodes.slice(0, 100).map((n) => (
                    <tr key={n.id}>
                      <td style={{ ...td, fontFamily: D.mono, fontSize: 10, color: D.faint }}>{n.id}</td>
                      <td style={td}>{chip(n.kind, D.accent)}</td>
                      <td style={{ ...td, color: D.muted, fontSize: 11 }}>{n.domain || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Runtime Preview') {
      const pbNames = ALL_PLAYBOOKS.map((pb) => pb.type);
      const runResolve = () => {
        try {
          const pb = ALL_PLAYBOOKS.find((p) => p.type === rtType);
          if (!pb) { setRtResult({ error: `Playbook "${rtType}" not found` }); return; }
          setRtResult(resolveField(pb, rtField));
        } catch (e) { setRtResult({ error: e.message }); }
      };
      return (
        <div>
          <Banner>Runtime Preview — shows what the runtime reader sees for any asset + fieldPath. Source tells you whether the value is authored or published (from an override). PURE: nothing mutates.</Banner>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asset</div>
              <select value={rtType} onChange={(e) => { setRtType(e.target.value); setRtResult(null); }} style={{ ...inputSm, minWidth: 200 }}>
                {pbNames.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Field path</div>
              <input value={rtField} onChange={(e) => { setRtField(e.target.value); setRtResult(null); }} style={inputSm} placeholder="e.g. p_crabs.unitCostRange" />
            </div>
            <button onClick={runResolve} style={{ ...btnStyle(true), alignSelf: 'flex-end' }}>Resolve</button>
          </div>
          {rtResult && (rtResult.error ? (
            <Banner tone="bad">{rtResult.error}</Banner>
          ) : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <PBKpi label="Source" value={rtResult.source} tone={rtResult.source === 'override' ? D.good : D.muted} />
                <PBKpi label="Rollback" value={rtResult.rollbackAvailable ? 'yes' : 'no'} tone={rtResult.rollbackAvailable ? D.accent : D.faint} />
                <PBKpi label="Confidence" value={rtResult.confidence || 'n/a'} tone={D.muted} />
              </div>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Resolved value</div>
              <div style={{ fontFamily: D.mono, fontSize: type.size.caption, color: D.text, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, marginBottom: 10 }}>{JSON.stringify(rtResult.value, null, 2)}</div>
              {rtResult.authoredValue !== undefined && rtResult.source === 'override' && (
                <>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Authored (pre-override)</div>
                  <div style={{ fontFamily: D.mono, fontSize: type.size.caption, color: D.faint, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, marginBottom: 10 }}>{JSON.stringify(rtResult.authoredValue, null, 2)}</div>
                </>
              )}
              <div style={{ fontSize: type.size.caption, color: D.muted }}>{explainField(rtResult)}</div>
              {(rtResult.trace || []).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', marginBottom: 4 }}>Resolution trace</div>
                  {rtResult.trace.map((t, i) => <div key={i} style={{ fontSize: type.size.caption, color: D.faint, fontFamily: D.mono }}>{t && typeof t === 'object' ? `[${t.stage}] ${JSON.stringify(t.value)}` : String(t)}</div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (ws === 'Simulator') {
      const pbNames = ALL_PLAYBOOKS.map((pb) => pb.type);
      const runSim = () => {
        setSimErr(null); setSimResult(null);
        try {
          const pb = ALL_PLAYBOOKS.find((p) => p.type === simType);
          if (!pb) { setSimErr(`Playbook "${simType}" not found`); return; }
          let parsed;
          try { parsed = JSON.parse(simVal); } catch { setSimErr(`Proposed value is not valid JSON: ${simVal}`); return; }
          setSimResult(simulatePublish({ asset: pb, fieldPath: simField, proposedValue: parsed }));
        } catch (e) { setSimErr(e.message); }
      };
      return (
        <div>
          <Banner>Impact Simulator — preview what would change if a proposed value were published. Shows before→after diff, blast radius, and host-level cost impact. PURE: nothing publishes, nothing mutates.</Banner>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asset</div>
              <select value={simType} onChange={(e) => { setSimType(e.target.value); setSimResult(null); setSimErr(null); }} style={{ ...inputSm, minWidth: 200 }}>
                {pbNames.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Field path</div>
              <input value={simField} onChange={(e) => { setSimField(e.target.value); setSimResult(null); setSimErr(null); }} style={inputSm} placeholder="e.g. p_crabs.unitCostRange" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proposed value (JSON)</div>
              <input value={simVal} onChange={(e) => { setSimVal(e.target.value); setSimResult(null); setSimErr(null); }} style={inputSm} placeholder='e.g. [3, 8] or "new value"' />
            </div>
            <button onClick={runSim} style={{ ...btnStyle(true), alignSelf: 'flex-end' }}>Simulate publish</button>
          </div>
          {simErr && <Banner tone="bad">{simErr}</Banner>}
          {simResult && (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <PBKpi label="Changes" value={simResult.changes ? 'yes' : 'no-op'} tone={simResult.changes ? D.warn : D.faint} />
                <PBKpi label="Affected engines" value={(simResult.affectedEngines || []).length} tone={D.warn} />
                <PBKpi label="Readers" value={(simResult.affectedReaders || []).length} tone={D.warn} />
                <PBKpi label="Runtime" value={(simResult.affectedRuntime || []).length} tone={D.warn} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', marginBottom: 4 }}>Before ({simResult.beforeSource})</div>
                  <div style={{ fontFamily: D.mono, fontSize: type.size.caption, color: D.muted, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10 }}>{JSON.stringify(simResult.before, null, 2)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: simResult.changes ? D.warn : D.faint, textTransform: 'uppercase', marginBottom: 4 }}>After (proposed)</div>
                  <div style={{ fontFamily: D.mono, fontSize: type.size.caption, color: simResult.changes ? D.text : D.muted, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10 }}>{JSON.stringify(simResult.after, null, 2)}</div>
                </div>
              </div>
              {simResult.hostDiff && (
                <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', marginBottom: 6 }}>Host experience impact</div>
                  <div style={{ fontSize: type.size.caption, color: D.muted }}>
                    item: <strong>{simResult.hostDiff.item}</strong> · before cost: {monoPre(simResult.hostDiff.beforeCost)} → after: {monoPre(simResult.hostDiff.afterCost)} · {simResult.hostDiff.changes ? <span style={{ color: D.warn }}>changes visible to host</span> : <span style={{ color: D.faint }}>no host-visible diff</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Copilot') {
      const CONF_COLOR = { high: D.good, medium: D.warn, low: D.faint };
      const TYPE_COLOR = { 'fill-quality-gap': D.bad, 'ground-pricing': D.warn, 'add-governance': D.accent, 'run-campaign': D.good, 'resolve-conflict': D.bad, 'retire-asset': D.faint };
      const runAnalysis = () => {
        setCopilotBusy(true);
        setTimeout(() => { // micro-delay so button press registers visually
          try { setCopilotResult(runCopilot({ playbooks: ALL_PLAYBOOKS, asOf })); }
          catch (e) { setCopilotResult({ error: e.message }); }
          setCopilotBusy(false);
        }, 50);
      };
      const handleAccept = (proposal) => {
        if (!canPublish(role) && role !== 'steward') return;
        const kcr = acceptProposal(proposal, { role, asOf });
        if (kcr) {
          upsertKCR(kcr).then(refresh);
          setAcceptedProposals((prev) => ({ ...prev, [proposal.id]: kcr.id }));
        }
      };
      return (
        <div>
          <Banner>Knowledge Intelligence Copilot — propose-only, governed. Analyzes corpus quality, evidence gaps, and pipeline state. Proposals are NEVER auto-applied; an admin must accept each one, which creates a governed draft KCR that still goes through the full review pipeline.</Banner>
          <div style={{ marginBottom: 14 }}>
            <button onClick={runAnalysis} disabled={copilotBusy} style={{ ...btnStyle(true), opacity: copilotBusy ? 0.5 : 1 }}>
              {copilotBusy ? 'Analyzing…' : 'Run corpus analysis'}
            </button>
          </div>
          {copilotResult && (copilotResult.error ? (
            <Banner tone="bad">{copilotResult.error}</Banner>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <PBKpi label="Proposals" value={copilotResult.summary.total} tone={copilotResult.summary.total ? D.accent : D.faint} />
                <PBKpi label="High confidence" value={copilotResult.summary.highConfidence} tone={D.good} />
                {Object.entries(copilotResult.summary.byType).filter(([, n]) => n > 0).map(([t, n]) => (
                  <PBKpi key={t} label={t.replace(/-/g, ' ')} value={n} tone={TYPE_COLOR[t] || D.muted} />
                ))}
              </div>
              {copilotResult.proposals.length === 0 ? (
                <Empty msg="No proposals — corpus is clean (all dimensions OK, all pricing grounded, governance set). Honest-empty." />
              ) : (
                <div>
                  {copilotResult.proposals.map((p) => {
                    const acceptedKcrId = acceptedProposals[p.id];
                    const already = !!acceptedKcrId;
                    return (
                      <div key={p.id} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                              {chip(p.type, TYPE_COLOR[p.type] || D.muted)}
                              {chip(p.confidence, CONF_COLOR[p.confidence] || D.faint)}
                              <span style={{ fontSize: 11, color: D.text, fontWeight: 600 }}>{p.assetId}</span>
                              <span style={{ fontSize: 11, color: D.faint, fontFamily: D.mono }}>{p.fieldPath}</span>
                            </div>
                            <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 4 }}>{p.reason}</div>
                            <div style={{ fontSize: 11, color: D.faint, fontStyle: 'italic' }}>{p.rationale}</div>
                            {already && <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: D.good, fontFamily: D.mono }}>KCR: {acceptedKcrId}</span>
                              <button onClick={() => setWs('Review')} style={{ fontSize: 10, background: D.good + '22', border: `1px solid ${D.good}`, borderRadius: 5, padding: '2px 8px', color: D.good, cursor: 'pointer', fontFamily: D.ff }}>View in Review →</button>
                            </div>}
                          </div>
                          <button
                            disabled={already}
                            onClick={() => handleAccept(p)}
                            style={{ ...btnStyle(!already), opacity: already ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
                          >{already ? 'Accepted ✓' : 'Accept → draft KCR'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (ws === 'Analytics') {
      const byTrigger = kcrs.reduce((m, k) => { m[k.trigger] = (m[k.trigger] || 0) + 1; return m; }, {});
      const byType = kcrs.reduce((m, k) => { m[k.type] = (m[k.type] || 0) + 1; return m; }, {});
      const byPriority = kcrs.reduce((m, k) => { m[k.priority || 'low'] = (m[k.priority || 'low'] || 0) + 1; return m; }, {});
      const kcrsByStatus = Object.entries(kcrs.reduce((m, k) => { m[k.status] = (m[k.status] || 0) + 1; return m; }, {}))
        .sort((a, b) => b[1] - a[1]);
      const evidenceBySource = evidence.reduce((m, e) => { m[e.sourceType || 'unknown'] = (m[e.sourceType || 'unknown'] || 0) + 1; return m; }, {});
      const evidenceByAuth = evidence.reduce((m, e) => { m[e.authorityLevel || 'unknown'] = (m[e.authorityLevel || 'unknown'] || 0) + 1; return m; }, {});
      const conversionRate = kcrs.length > 0 ? Math.round((byStatus.published || 0) / kcrs.length * 100) : 0;

      const BarRow = ({ label, value, max, color }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: type.size.caption, color: D.muted, minWidth: 160 }}>{label}</div>
          <div style={{ flex: 1, background: D.surface2, borderRadius: 3, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${max > 0 ? Math.round(value / max * 100) : 0}%`, height: '100%', background: color || D.accent, borderRadius: 3 }} />
          </div>
          <div style={{ fontFamily: D.mono, fontSize: 11, color: D.muted, minWidth: 30, textAlign: 'right' }}>{value}</div>
        </div>
      );

      return (
        <div>
          <Banner>Knowledge Analytics — dimensional snapshot of the knowledge platform. Pipeline throughput, corpus quality distribution, and evidence authority analysis. Time-series metrics are honest-empty until KCRs carry timestamps.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Total KCRs" value={kcrs.length} />
            <PBKpi label="Pipeline conversion" value={`${conversionRate}%`} tone={conversionRate > 50 ? D.good : D.warn} />
            <PBKpi label="Evidence records" value={evidence.length} />
            <PBKpi label="Corpus assets" value={ALL_PLAYBOOKS.length} />
            <PBKpi label="Quality OK" value={`${quality.totalAssets > 0 ? Math.round(quality.fullyOk / quality.totalAssets * 100) : 0}%`} tone={D.good} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>KCR pipeline status</div>
              {kcrsByStatus.length === 0 ? <Empty msg="No KCRs yet." /> : kcrsByStatus.map(([s, n]) => (
                <BarRow key={s} label={s} value={n} max={kcrs.length} color={KCR_STATUS_COLOR[s]} />
              ))}
            </div>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>By trigger</div>
              {Object.keys(byTrigger).length === 0 ? <Empty msg="No trigger data yet." /> : Object.entries(byTrigger).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <BarRow key={t} label={t} value={n} max={kcrs.length} color={D.accent} />
              ))}
            </div>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>By type</div>
              {Object.keys(byType).length === 0 ? <Empty msg="No type data yet." /> : Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <BarRow key={t} label={t} value={n} max={kcrs.length} color={D.warn} />
              ))}
            </div>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>By priority</div>
              {Object.keys(byPriority).length === 0 ? <Empty msg="No priority data yet." /> : [['high', D.bad], ['med', D.warn], ['low', D.faint]].map(([p, color]) => byPriority[p] ? (
                <BarRow key={p} label={p} value={byPriority[p]} max={kcrs.length} color={color} />
              ) : null)}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Evidence by source type</div>
              {evidence.length === 0 ? <Empty msg="No evidence." /> : Object.entries(evidenceBySource).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                <BarRow key={s} label={s} value={n} max={evidence.length} color={D.good} />
              ))}
            </div>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Evidence by authority</div>
              {evidence.length === 0 ? <Empty msg="No evidence." /> : Object.entries(evidenceByAuth).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                <BarRow key={s} label={s} value={n} max={evidence.length} color={D.accent} />
              ))}
            </div>
            <div style={{ flex: '1 1 220px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Corpus quality distribution</div>
              {[['Fully OK', quality.fullyOk, D.good], ['With gaps', quality.assets.filter((a) => a.gapCount > 0).length, D.bad], ['With warns only', quality.assets.filter((a) => a.gapCount === 0 && a.warnCount > 0).length, D.warn]].map(([label, n, color]) => (
                <BarRow key={label} label={label} value={n} max={quality.totalAssets} color={color} />
              ))}
            </div>
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 14px', fontSize: type.size.caption, color: D.faint, fontFamily: D.mono }}>
            manufacturing floor · queues: obs {factory.queues.observation.count} · ev {factory.queues.evidence.count} · find {factory.queues.finding.count} · review {factory.queues.review.count} · pub {factory.queues.publishing.count} · val {factory.queues.validation.count} · velocity {factory.flow.researchVelocity} · review backlog {factory.flow.reviewBacklog}
          </div>
        </div>
      );
    }

    if (ws === 'Schedules') {
      const schedCoverage = buildScheduleCoverage(ALL_PLAYBOOKS, schedules, asOf);
      const dueItems = schedules.filter((s) => evaluateSchedule(s, asOf).due);
      const addSched = () => {
        if (!schedAsset || !schedField) return;
        const s = createSchedule({ assetId: schedAsset, fieldPath: schedField, frequency: schedFreq, startAt: asOf, note: schedNote });
        const list = recordSchedule(s);
        setSchedules(list);
        setSchedField(''); setSchedNote('');
      };
      const schedPb = ALL_PLAYBOOKS.find((p) => p.type === schedAsset);
      const schedPaths = getFieldPaths(schedPb || ALL_PLAYBOOKS[0]);
      const sec = { background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 };
      const inp = { width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: '6px 10px', color: D.text, fontSize: type.size.caption, fontFamily: 'inherit', boxSizing: 'border-box' };
      const fl = { fontSize: 10, color: D.muted, marginBottom: 3 };
      return (
        <div>
          <Banner>Research Schedules — declared cadences for recurring knowledge acquisition. Schedules are tracked here; they do NOT auto-run (a human creates and launches a campaign when due). Derived from playbookResearch(); coverage shows which fields need scheduling.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Schedules" value={schedules.length} tone={schedules.length ? D.accent : D.faint} />
            <PBKpi label="Due / overdue" value={dueItems.length} tone={dueItems.length ? D.warn : D.faint} />
            <PBKpi label="Coverage" value={`${schedCoverage.coverage}%`} tone={schedCoverage.coverage >= 80 ? D.good : D.warn} />
            <PBKpi label="Fields needing sched." value={schedCoverage.totalNeeded} tone={D.faint} />
          </div>

          <div style={sec}>
            <div style={{ fontSize: 9, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Add schedule</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: '2 1 180px' }}>
                <div style={fl}>Asset</div>
                <select value={schedAsset} onChange={(e) => setSchedAsset(e.target.value)} style={inp}>
                  {ALL_PLAYBOOKS.map((p) => <option key={p.type} value={p.type}>{p.type}</option>)}
                </select>
              </div>
              <div style={{ flex: '3 1 220px' }}>
                <div style={fl}>Field path</div>
                <input list="sched-field-paths" value={schedField} onChange={(e) => setSchedField(e.target.value)} placeholder="e.g. p_crabs.unitCostRange" style={inp} />
                <datalist id="sched-field-paths">{schedPaths.map((f) => <option key={f.path} value={f.path}>{f.label}</option>)}</datalist>
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <div style={fl}>Frequency</div>
                <select value={schedFreq} onChange={(e) => setSchedFreq(e.target.value)} style={inp}>
                  {SCHEDULE_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ flex: '2 1 180px' }}>
                <div style={fl}>Note (optional)</div>
                <input value={schedNote} onChange={(e) => setSchedNote(e.target.value)} placeholder="Seasonal pricing check" style={inp} />
              </div>
            </div>
            <button onClick={addSched} disabled={!schedField} style={{ ...btnStyle(!!schedField) }}>Add schedule</button>
          </div>

          {/* Schedule list */}
          {schedules.length === 0 ? <Empty msg="No schedules yet. Add one above to track recurring research cadences." /> : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Asset', 'Field', 'Freq', 'Last run', 'Next due', 'Status', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {schedules.map((s) => {
                    const ev = evaluateSchedule(s, asOf);
                    const statusColor = ev.overdue ? D.bad : ev.due ? D.warn : D.faint;
                    const statusLabel = ev.overdue ? `${ev.daysOverdue}d overdue` : ev.due ? 'due soon' : ev.daysUntilDue != null ? `in ${ev.daysUntilDue}d` : 'on-demand';
                    return (
                      <tr key={s.id}>
                        <td style={{ padding: '8px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, color: D.text, fontWeight: 600 }}>{s.assetId}</td>
                        <td style={{ padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.muted, fontFamily: D.mono }}>{s.fieldPath}</td>
                        <td style={{ padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.faint, fontFamily: D.mono }}>{s.frequency}</td>
                        <td style={{ padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.faint, fontFamily: D.mono }}>{s.lastRunAt || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.faint, fontFamily: D.mono }}>{ev.nextAt || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55` }}>
                          <span style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${statusColor}1e`, color: statusColor }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55` }}>
                          <button onClick={() => { const list = removeSchedule(s.id); setSchedules(list); }} style={{ fontSize: 10, padding: '2px 7px', background: 'transparent', border: `1px solid ${D.border}`, borderRadius: 4, color: D.faint, cursor: 'pointer' }}>remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Coverage gaps */}
          {schedCoverage.assets.some((a) => a.gaps.length > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Unscheduled research needs</div>
              {schedCoverage.assets.filter((a) => a.gaps.length > 0).slice(0, 10).map((a) => (
                <div key={a.assetId} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: type.size.caption, color: D.text, marginRight: 8 }}>{a.assetId}</span>
                  <span style={{ fontSize: 10, color: D.faint }}>{a.gaps.map((g) => g.kind).join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (ws === 'Roadmap') {
      const rm = roadmapItems || [];
      const summary = roadmapSummary(rm);
      const PRIORITY_COLOR = { high: D.bad, med: D.warn, low: D.faint };
      const KIND_LABEL = { pricing: 'Price', 'cost-factor-grounding': 'CostFactor', review: 'Review', cadence: 'Cadence', 'food-safety': 'Safety', sources: 'Sources' };
      const filtered = roadmapFilter === 'all' ? rm : rm.filter((r) => r.priority === roadmapFilter);
      return (
        <div>
          <Banner>Research Roadmap — auto-generated priority list of what to research next. Derived from playbookWeaknesses × playbookResearch × blastRadius. Score = weaknesses × (engines + 1). Nothing is fabricated: honest-empty when corpus needs no research.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Roadmap items" value={summary.total} tone={summary.total ? D.accent : D.faint} />
            <PBKpi label="High priority" value={summary.byPriority.high || 0} tone={D.bad} />
            <PBKpi label="High blast" value={summary.highImpactCount} tone={summary.highImpactCount ? D.warn : D.faint} />
            <PBKpi label="Assets in roadmap" value={summary.topAssets.length} tone={D.muted} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: D.faint, marginRight: 4 }}>Filter:</span>
            {['all', 'high', 'med', 'low'].map((f) => (
              <button key={f} onClick={() => setRoadmapFilter(f)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, border: `1px solid ${roadmapFilter === f ? (PRIORITY_COLOR[f] || D.accent) : D.border}`, background: roadmapFilter === f ? `${PRIORITY_COLOR[f] || D.accent}22` : D.bg, color: roadmapFilter === f ? (PRIORITY_COLOR[f] || D.accent) : D.muted, cursor: 'pointer' }}>{f}</button>
            ))}
            <button onClick={() => setRoadmapItems(null)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, border: `1px solid ${D.border}`, background: D.bg, color: D.faint, cursor: 'pointer', marginLeft: 'auto' }}>Refresh</button>
          </div>
          {filtered.length === 0 ? <Empty msg="No research needed — all corpus items are fully grounded and governed. Honest-empty." /> : (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Priority', 'Asset', 'Field / Kind', 'Blast', 'Weaknesses', 'Score', 'Suggested campaign', 'Engines hit'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={`${r.assetId}-${r.fieldPath}-${i}`} style={{ background: r.priority === 'high' ? `${D.bad}08` : 'transparent' }}>
                      <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55` }}>
                        <span style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${PRIORITY_COLOR[r.priority] || D.faint}1e`, color: PRIORITY_COLOR[r.priority] || D.faint }}>{r.priority}</span>
                      </td>
                      <td style={{ padding: '7px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, color: D.text, fontWeight: 600 }}>{r.assetId}</td>
                      <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted, fontFamily: D.mono }}>{KIND_LABEL[r.kind] || r.kind} · {r.fieldPath.slice(0, 32)}</td>
                      <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: r.blastScore >= 3 ? D.warn : D.faint, fontFamily: D.mono, textAlign: 'center' }}>{r.blastScore}</td>
                      <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: r.weaknessCount ? D.bad : D.faint, fontFamily: D.mono, textAlign: 'center' }}>{r.weaknessCount}</td>
                      <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.accent, fontFamily: D.mono, fontWeight: 600, textAlign: 'center' }}>{r.score}</td>
                      <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted }}>{r.suggestedType}</td>
                      <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.faint, fontFamily: D.mono }}>{r.affectedEngines.slice(0, 3).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // ── Domains workspace (KPP-1 Bundle A) ─────────────────────────────────────
    if (ws === 'Domains') {
      const scopeCov = corpusScopeCoverage(ALL_PLAYBOOKS);
      const activeDomain = KNOWLEDGE_DOMAINS.find((d) => d.id === domainSelected) || KNOWLEDGE_DOMAINS[0];
      const report = domainReport && domainReport.domain === activeDomain?.id ? domainReport : null;
      return (
        <div>
          <Banner>Knowledge Domains — 7 named clusters of related playbooks. Each domain shares knowledge fields; domain campaigns discover cross-playbook gaps and aggregate research needs. Scope coverage shows how many playbooks have regional or seasonal projections.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Total domains" value={KNOWLEDGE_DOMAINS.length} tone={D.accent} />
            <PBKpi label="Total playbooks" value={ALL_PLAYBOOKS.length} tone={D.muted} />
            <PBKpi label="National-only scope" value={scopeCov.nationalOnly} tone={scopeCov.nationalOnly === ALL_PLAYBOOKS.length ? D.bad : D.warn} />
            <PBKpi label="With regional data" value={scopeCov.withRegional} tone={scopeCov.withRegional ? D.good : D.faint} />
            <PBKpi label="With seasonal data" value={scopeCov.withSeasonal} tone={scopeCov.withSeasonal ? D.good : D.faint} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {KNOWLEDGE_DOMAINS.map((d) => (
              <button key={d.id} onClick={() => { setDomainSelected(d.id); setDomainReport(null); }}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${domainSelected === d.id ? D.accent : D.border}`, background: domainSelected === d.id ? `${D.accent}22` : D.bg, color: domainSelected === d.id ? D.accent : D.muted, cursor: 'pointer' }}>
                {d.label}
              </button>
            ))}
          </div>
          {activeDomain && (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: type.size.body, color: D.text, fontWeight: 600, marginBottom: 4 }}>{activeDomain.label}</div>
              <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 8 }}>{activeDomain.description}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {activeDomain.playbookTypes.map((t) => <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${D.accent}18`, color: D.accent }}>{t}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => { const r = generateDomainReport(activeDomain, ALL_PLAYBOOKS, asOf); setDomainReport(r); }}
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer' }}>
                  Generate domain report
                </button>
                {report && <span style={{ fontSize: 10, color: D.faint }}>Generated {asOf}</span>}
              </div>
            </div>
          )}
          {report && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <PBKpi label="Playbooks found" value={report.playbooksFound} tone={D.muted} />
                <PBKpi label="Fully OK" value={report.playbooksOk} tone={D.good} />
                <PBKpi label="Coverage" value={`${report.coverageScore}%`} tone={report.coverageScore >= 80 ? D.good : report.coverageScore >= 50 ? D.warn : D.bad} />
                <PBKpi label="Total gaps" value={report.totalGaps} tone={report.totalGaps ? D.bad : D.faint} />
                <PBKpi label="Research items" value={report.researchItems} tone={report.researchItems ? D.warn : D.faint} />
              </div>
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: type.size.caption, color: D.muted }}>{report.summary}</div>
              {report.sharedGaps.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shared gaps (affect ≥2 playbooks)</div>
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        {['Dimension', 'Affected playbooks', 'Count'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {report.sharedGaps.map((g) => (
                          <tr key={g.id}>
                            <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.text, fontWeight: 500 }}>{g.id}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted, fontFamily: D.mono }}>{g.assets.slice(0, 4).join(', ')}{g.assets.length > 4 ? ` +${g.assets.length - 4}` : ''}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.warn, fontFamily: D.mono }}>{g.assets.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {report.topFields.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Top fields by blast radius</div>
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        {['Playbook', 'Field', 'Kind', 'Engines'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {report.topFields.map((f, i) => (
                          <tr key={i}>
                            <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.text }}>{f.assetId}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted, fontFamily: D.mono }}>{f.fieldPath}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.faint }}>{f.kind}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${D.border}55`, color: D.accent, fontFamily: D.mono }}>{f.engines}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── Failures workspace (KPP-1 Bundle D) ─────────────────────────────────────
    if (ws === 'Failures') {
      const analysis = failAnalysis || analyzeFailures(failures);
      const STATUS_COLOR = { critical: D.bad, major: D.warn, minor: D.faint, 'near-miss': D.accent, exceeded: D.good };
      return (
        <div>
          <Banner>Failure Intelligence — operational learning from completed events. Every record routes to a KCR (never auto-published). Records capture what went wrong, nearly went wrong, or exceeded expectations — the platform's long-term learning moat.</Banner>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <PBKpi label="Total records" value={failures.length} tone={failures.length ? D.text : D.faint} />
            <PBKpi label="Critical" value={analysis.bySeverity?.critical || 0} tone={D.bad} />
            <PBKpi label="Major" value={analysis.bySeverity?.major || 0} tone={D.warn} />
            <PBKpi label="Estimation gaps" value={analysis.estimationGaps?.length || 0} tone={D.accent} />
          </div>
          {/* Record failure form */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Record a failure / learning</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Event type</div>
                <select value={failForm.eventType} onChange={(e) => setFailForm((f) => ({ ...f, eventType: e.target.value }))}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {ALL_PLAYBOOKS.map((pb) => <option key={pb.type} value={pb.type}>{pb.type}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Category</div>
                <select value={failForm.category} onChange={(e) => setFailForm((f) => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {FAILURE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Severity</div>
                <select value={failForm.severity} onChange={(e) => setFailForm((f) => ({ ...f, severity: e.target.value }))}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {['critical', 'major', 'minor', 'near-miss', 'exceeded'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>What happened (required)</div>
              <input value={failForm.what} onChange={(e) => setFailForm((f) => ({ ...f, what: e.target.value }))}
                placeholder="Describe what went wrong or was learned..."
                style={{ width: '100%', boxSizing: 'border-box', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Impact (optional)</div>
              <input value={failForm.impact} onChange={(e) => setFailForm((f) => ({ ...f, impact: e.target.value }))}
                placeholder="What was the impact on the event?"
                style={{ width: '100%', boxSizing: 'border-box', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                if (!failForm.what.trim()) return;
                const rec = createFailureRecord({ ...failForm });
                const updated = recordFailure(rec);
                setFailures(updated);
                setFailAnalysis(analyzeFailures(updated));
                setFailForm((f) => ({ ...f, what: '', impact: '' }));
              }} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer' }}>
                Record
              </button>
              <button onClick={() => {
                if (!failures.length) return;
                const last = failures[failures.length - 1];
                const kcr = failureToKCR(last, asOf);
                alert(`KCR created (not published): ${kcr.id}\nType: ${kcr.type} | Field: ${kcr.fieldPath}\nReason: ${kcr.reason.slice(0, 120)}`);
              }} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.border}`, background: D.bg, color: D.muted, cursor: 'pointer' }}>
                Route last → KCR (preview)
              </button>
              <button onClick={() => { clearFailureStore(); setFailures([]); setFailAnalysis(null); }}
                style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.border}`, background: D.bg, color: D.faint, cursor: 'pointer', marginLeft: 'auto' }}>
                Clear all
              </button>
            </div>
          </div>
          {/* Analysis */}
          {failures.length > 0 && (
            <div>
              {analysis.patterns.length > 0 && (
                <div style={{ background: `${D.warn}12`, border: `1px solid ${D.warn}44`, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: D.warn, marginBottom: 4 }}>Patterns (categories &gt;20% of records)</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {analysis.patterns.map((p) => (
                      <span key={p.category} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${D.warn}22`, color: D.warn }}>{p.category} — {p.pct}%</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Severity', 'Event type', 'Category', 'What', 'Impact'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {failures.slice().reverse().map((r) => (
                      <tr key={r.id}>
                        <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55` }}>
                          <span style={{ fontFamily: D.mono, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${STATUS_COLOR[r.severity] || D.faint}1e`, color: STATUS_COLOR[r.severity] || D.faint }}>{r.severity}</span>
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, color: D.text, fontWeight: 500 }}>{r.eventType}</td>
                        <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted }}>{r.category}</td>
                        <td style={{ padding: '7px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, color: D.text }}>{r.what}</td>
                        <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.faint }}>{r.impact || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {failures.length === 0 && <Empty msg="No failure records yet — this is where operational learning accumulates after events complete." />}
        </div>
      );
    }

    // ── Research workbench (KMP-1 Bundle E) ──────────────────────────────────────
    if (ws === 'Research') {
      const selectedManifest = pipelineManifests.find((m) => m.id === selectedManifestId);
      const catalogSum = catalogSummary();
      return (
        <div>
          <Banner>Research Workbench — KMP-1 Bundle E. Launch research playbooks against knowledge assets, track the 12-stage production pipeline, manage source catalog. No production editing. Everything flows through governance.</Banner>

          {/* Source catalog overview */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <PBKpi label="Research Playbooks" value={RESEARCH_PLAYBOOKS.length} tone={D.accent} />
            <PBKpi label="Source Catalog" value={catalogSum.total} tone={D.text} />
            <PBKpi label="Government Sources" value={catalogSum.governmentSources} tone={D.good} />
            <PBKpi label="Unverified Families" value={catalogSum.unverifiedFamilies.length} tone={catalogSum.unverifiedFamilies.length ? D.warn : D.faint} />
            <PBKpi label="Active Pipelines" value={pipelineManifests.filter((m) => m.status === 'active').length} tone={D.accent} />
            <PBKpi label="Blocked" value={pipelineManifests.filter((m) => m.status === 'blocked').length} tone={pipelineManifests.some((m) => m.status === 'blocked') ? D.bad : D.faint} />
          </div>

          {/* Launch a research pipeline */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Launch Research Pipeline</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Research Playbook</div>
                <select value={researchPlaybookId} onChange={(e) => setResearchPlaybookId(e.target.value)}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {RESEARCH_PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Asset (Playbook)</div>
                <select value={researchAssetId} onChange={(e) => setResearchAssetId(e.target.value)}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {ALL_PLAYBOOKS.map((pb) => <option key={pb.type} value={pb.type}>{pb.type}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Field Path (optional)</div>
                <input value={researchFieldPath} onChange={(e) => setResearchFieldPath(e.target.value)} placeholder="e.g. p_crabs.unitCostRange"
                  style={{ width: '100%', boxSizing: 'border-box', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => {
                  const m = createPipelineManifest({ playbookId: researchPlaybookId, assetId: researchAssetId, fieldPath: researchFieldPath || null, at: asOf });
                  upsertManifest(m);
                  setPipelineManifests(loadManifests());
                  setSelectedManifestId(m.id);
                }} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Launch
                </button>
              </div>
            </div>
            {researchPlaybookId && (() => {
              const pb = getResearchPlaybook(researchPlaybookId);
              if (!pb) return null;
              return (
                <div style={{ marginTop: 10, padding: 10, background: D.bg, borderRadius: 8, fontSize: type.size.caption, color: D.muted, display: 'flex', gap: 16 }}>
                  <span>🎯 {pb.objective.slice(0, 80)}…</span>
                  <span>Providers: {pb.providerFamilies.join(', ')}</span>
                  <span>Corroboration: {pb.corroborationRequired}+</span>
                  <span>Freshness: {pb.freshnessPolicy}</span>
                  <span>Review: {pb.reviewPath}</span>
                </div>
              );
            })()}
          </div>

          {/* Pipeline manifests table */}
          {pipelineManifests.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Pipelines ({pipelineManifests.length})</div>
                <button onClick={() => { clearManifests(); setPipelineManifests([]); setSelectedManifestId(null); }}
                  style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: `1px solid ${D.border}`, background: D.bg, color: D.faint, cursor: 'pointer' }}>
                  Clear all
                </button>
              </div>
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Playbook', 'Asset', 'Stage', 'Progress', 'Status', 'KCRs', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {pipelineManifests.map((m) => {
                      const prog = getPipelineProgress(m);
                      const statusColor = { active: D.good, blocked: D.bad, complete: D.accent, abandoned: D.faint }[m.status] || D.faint;
                      const isSelected = m.id === selectedManifestId;
                      return (
                        <tr key={m.id} onClick={() => setSelectedManifestId(isSelected ? null : m.id)}
                          style={{ cursor: 'pointer', background: isSelected ? `${D.accent}0a` : 'transparent' }}>
                          <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.text }}>{m.playbookId}</td>
                          <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted }}>{m.assetId}</td>
                          <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.accent, fontFamily: D.mono }}>{STAGE_LABELS[m.currentStage] || m.currentStage}</td>
                          <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.text, minWidth: 80 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 4, background: D.border, borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${prog.pct}%`, height: '100%', background: statusColor, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontFamily: D.mono, fontSize: 9, color: D.faint }}>{prog.pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55` }}>
                            <span style={{ color: statusColor }}>{m.status}</span>
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted, fontFamily: D.mono }}>{(m.kcrIds || []).length}</td>
                          <td style={{ padding: '7px 10px', borderBottom: `1px solid ${D.border}55` }}>
                            {m.status === 'active' && (
                              <button onClick={(e) => { e.stopPropagation(); const m2 = advanceStage(m, m.currentStage, { outcome: 'Completed by operator', at: asOf }); upsertManifest(m2); setPipelineManifests(loadManifests()); }}
                                style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer', marginRight: 4 }}>
                                Advance
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selected pipeline detail */}
          {selectedManifest && (
            <div style={{ background: D.surface, border: `1px solid ${D.accent}33`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: D.accent, fontWeight: 600, marginBottom: 10 }}>Pipeline: {selectedManifest.id}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PIPELINE_STAGES.map((stage, i) => {
                  const s = selectedManifest.stages[stage];
                  const color = s.status === 'complete' ? D.good : s.status === 'in-progress' ? D.accent : s.status === 'blocked' ? D.bad : s.status === 'skipped' ? D.faint : D.border;
                  return (
                    <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color, fontFamily: D.mono }}>{i + 1}</div>
                      <div style={{ fontSize: 9, color: s.status === 'in-progress' ? D.text : D.faint, textAlign: 'center', maxWidth: 56, lineHeight: 1.2 }}>{STAGE_LABELS[stage]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pipelineManifests.length === 0 && <Empty msg="No active pipelines. Select a research playbook and asset above to launch one." />}
        </div>
      );
    }

    // ── Corpus Growth Dashboard (KMP-1 Bundle F) ──────────────────────────────────
    if (ws === 'Corpus') {
      const catalogSum = catalogSummary();
      const DIMENSIONS_DISPLAY = ['Grounding', 'Freshness', 'Coverage', 'Commercial', 'Regional', 'Seasonal', 'Professional', 'Operational', 'Accessibility'];
      const AUTHORITY_COLOR = { official: D.good, primary: D.good, standards: D.accent, trade: D.warn, expert: D.warn, derived: D.muted, community: D.faint };
      const sourcesByFamily = Object.entries(
        SOURCE_CATALOG.reduce((m, s) => { m[s.family] = (m[s.family] || 0) + 1; return m; }, {})
      ).sort(([, a], [, b]) => b - a);

      return (
        <div>
          <Banner>Corpus Growth Dashboard — KMP-1 Bundle F. Dimensional corpus measurement only. No overall score. Tracks: source catalog health, research playbook coverage, pipeline velocity, knowledge debt, source bias distribution.</Banner>

          {/* Corpus KPIs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <PBKpi label="Source Catalog" value={catalogSum.total} tone={D.text} />
            <PBKpi label="Govt Sources" value={catalogSum.governmentSources} tone={D.good} />
            <PBKpi label="Public Domain" value={catalogSum.publicDomain} tone={D.accent} />
            <PBKpi label="With Commercial Bias" value={catalogSum.withCommercialBias} tone={D.warn} />
            <PBKpi label="Research Playbooks" value={RESEARCH_PLAYBOOKS.length} tone={D.text} />
            <PBKpi label="Research Roles" value={Object.keys(RESEARCH_ROLES).length} tone={D.muted} />
            <PBKpi label="Unverified Families" value={catalogSum.unverifiedFamilies.length} tone={catalogSum.unverifiedFamilies.length ? D.bad : D.good} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* Sources by family */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${D.border}`, fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sources by Family</div>
              {sourcesByFamily.map(([family, count]) => (
                <div key={family} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', borderBottom: `1px solid ${D.border}33` }}>
                  <span style={{ fontSize: type.size.caption, color: D.text, flex: 1 }}>{family}</span>
                  <div style={{ width: 80, height: 4, background: D.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((count / catalogSum.total) * 100)}%`, height: '100%', background: D.accent, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: D.mono, fontSize: 9, color: D.faint, width: 16, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Research playbooks by domain coverage */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${D.border}`, fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Research Playbooks by Knowledge Dimension</div>
              {DIMENSIONS_DISPLAY.map((dim) => {
                const count = RESEARCH_PLAYBOOKS.filter((p) => (p.knowledgeDimensions || []).includes(dim)).length;
                return (
                  <div key={dim} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', borderBottom: `1px solid ${D.border}33` }}>
                    <span style={{ fontSize: type.size.caption, color: D.text, flex: 1 }}>{dim}</span>
                    <div style={{ width: 80, height: 4, background: D.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((count / RESEARCH_PLAYBOOKS.length) * 100)}%`, height: '100%', background: D.good, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: D.mono, fontSize: 9, color: D.faint, width: 16, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source authority distribution */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Source Catalog — Authority × Bias</div>
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Source', 'Family', 'Authority', 'Coverage', 'Freshness', 'Bias', 'Licensing'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {SOURCE_CATALOG.slice(0, 15).map((s) => (
                    <tr key={s.id}>
                      <td style={{ padding: '6px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}44`, color: D.text }}>{s.name}</td>
                      <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.muted, fontFamily: D.mono }}>{s.family}</td>
                      <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44` }}>
                        <span style={{ color: AUTHORITY_COLOR[s.authority] || D.faint }}>{s.authority}</span>
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.muted }}>{s.coverage}</td>
                      <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.muted, fontFamily: D.mono }}>{s.freshnessPolicy}</td>
                      <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: s.commercialBias === 'none' ? D.good : s.commercialBias === 'low' ? D.accent : D.warn }}>{s.commercialBias}</td>
                      <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.faint }}>{s.licensing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {SOURCE_CATALOG.length > 15 && <div style={{ padding: '6px 12px', fontSize: 10, color: D.faint }}>+{SOURCE_CATALOG.length - 15} more sources</div>}
            </div>
          </div>

          {/* Unverified provider families */}
          {catalogSum.unverifiedFamilies.length > 0 && (
            <div style={{ background: `${D.warn}0a`, border: `1px solid ${D.warn}33`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: D.warn, fontWeight: 600, marginBottom: 6 }}>Provider families with no named sources ({catalogSum.unverifiedFamilies.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {catalogSum.unverifiedFamilies.map((f) => (
                  <span key={f} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: `${D.warn}18`, color: D.warn, fontFamily: D.mono }}>{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── Mission Control workspace (KML-1 Bundle A / C / E / F / H) ───────────────
    if (ws === 'Mission Control') {
      const allEvidence = loadEvidence();
      const allKcrs     = loadLocalKCRs();
      const allCampaigns = loadCampaigns();
      const allObservations = loadObservations();
      const allRuns     = loadRuns();

      let overnight, queue, health = {}, pubQ, aging, report;
      try {
        overnight   = buildOvernightActivity({ runs: allRuns, observations: allObservations, evidence: allEvidence, findings: [], kcrs: allKcrs, campaigns: allCampaigns }, { asOf });
        queue       = buildManufacturingQueue(mergedPlaybooks, allEvidence, allCampaigns, asOf);
        const healthResult = buildKnowledgeHealth(mergedPlaybooks, allEvidence, allKcrs, asOf) || {};
        health = healthResult.health || {};
        pubQ        = buildPublishingQueue(allKcrs);
        aging       = buildKnowledgeAging(allEvidence, asOf);
        report      = buildExecutiveReport({ overnight, queue, health: { health }, publishingQueue: pubQ, aging }, { playbooks: mergedPlaybooks, asOf });
      } catch (err) {
        console.error('Mission Control init error:', err);
        return <div style={{ padding: 20, color: D.bad }}>Error loading Mission Control: {err?.message || 'unknown error'}</div>;
      }

      const LABEL_COLOR = { HIGH: D.bad, MED: D.warn, LOW: D.faint };
      const HEALTH_COLOR = { high: D.good, med: D.warn, low: D.bad, none: D.border };
      const INTENT_COLOR = { 'cost-verification': '#3B82F6', 'vendor-capability': '#8B5CF6', 'quantity-validation': '#F59E0B', 'safety-compliance': '#EF4444', 'decision-validation': '#10B981' };
      const highQueue = queue.filter((q) => q.priority === 'HIGH' && !q.hasCampaign);
      const medQueue = queue.filter((q) => q.priority === 'MED' && !q.hasCampaign);
      const lowQueue = queue.filter((q) => q.priority === 'LOW' && !q.hasCampaign);

      // Helper: Get evidence breakdown for a gap
      const getEvidenceBreakdown = (fieldPath) => {
        const evs = allEvidence.filter(e => e.fieldPath === fieldPath);
        const breakdown = {};
        evs.forEach(e => {
          const family = getProviderFamilyForSource(e.source);
          breakdown[family] = (breakdown[family] || 0) + 1;
        });
        return { count: evs.length, breakdown, isCommercialOnly: evs.length > 0 && evs.every(e => getProviderFamilyForSource(e.source) === 'commercial') };
      };

      // Helper: Detect conflicts for a gap
      const getConflictInfo = (fieldPath) => {
        const evs = allEvidence.filter(e => e.fieldPath === fieldPath);
        if (evs.length < 2) return null;
        const facts = {};
        evs.forEach(e => {
          (e.extractedFacts || []).forEach(f => {
            if (!facts[f.fact]) facts[f.fact] = [];
            facts[f.fact].push(f.value);
          });
        });
        const conflicts = Object.entries(facts).filter(([_, vals]) => new Set(vals.map(JSON.stringify)).size > 1);
        return conflicts.length > 0 ? { count: conflicts.length, types: conflicts.map(([k]) => k.split('_')[0]) } : null;
      };

      // Helper: Quick-launch a single gap
      const quickLaunchGap = (item) => {
        const campaigns = generateCampaignsFromQueue([{ ...item, hasCampaign: false }], { priorities: ['HIGH', 'MED', 'LOW'], limit: 1, at: asOf });
        if (campaigns.length > 0) {
          recordCampaign(campaigns[0]);
          setCampList(loadCampaigns());
        }
      };

      // Batch launch function
      const mcBatchLaunch = () => {
        const selected = queue.filter(q => mcSelectedGaps.includes(`${q.playbookType}::${q.fieldPath}`));
        const campaigns = generateCampaignsFromQueue(selected.map(q => ({ ...q, hasCampaign: false })), { priorities: ['HIGH', 'MED', 'LOW'], limit: selected.length, at: asOf });
        campaigns.forEach(c => recordCampaign(c));
        setCampList(loadCampaigns());
        setMcSelectedGaps([]);
      };

      const autoGenerate = (priority = 'HIGH') => {
        const campaigns = generateCampaignsFromQueue(queue, { priorities: [priority], limit: 50, at: asOf });
        campaigns.forEach((c) => recordCampaign(c));
        setCampList(loadCampaigns());
      };

      const runBatch = (filterOpts, label) => {
        const allCamps = loadCampaigns();
        const toRun = batchByFilter(allCamps, filterOpts);
        if (!toRun.length) { setBatchRunResult({ label, summary: { total: 0, ran: 0, evidenceTotal: 0, findingsTotal: 0, kcrTotal: 0, errors: 0 } }); return; }

        // Create batch record
        const intentType = filterOpts.priority ? filterOpts.priority.toUpperCase() : 'MIXED';
        const batch = createBatch(intentType, toRun.length);
        upsertBatch(batch);
        startBatch(batch.id);
        setActiveBatch(batch);
        setBatchReceipt(batch);  // Show receipt modal
        setShowProgressPanel(true); // Show progress panel

        setBatchRunning(true);
        const allProviders = buildProviders();
        const { results, summary } = runCampaigns(toRun, { providers: allProviders, asOf });

        // Save results + auto-create corroboration campaigns
        const corrCamps = [];
        for (let i = 0; i < results.length; i++) {
          const { success, result, campaignId } = results[i];
          if (!success || !result) continue;
          const origCampaign = toRun[i];
          // Save the original campaign (has assetId + fieldPath for KPI matching)
          recordCampaign(origCampaign);
          const corr = autoCorroborate(origCampaign, result, { asOf });
          if (corr) corrCamps.push(corr);
        }
        corrCamps.forEach((c) => recordCampaign(c));

        // Update provider intel
        const intel = loadProviderIntel();
        const stats = extractProviderRunStats(results, asOf);
        let updatedIntel = intel;
        for (const s of stats) updatedIntel = recordProviderRun(updatedIntel, s.providerId, s);
        saveProviderIntel(updatedIntel);

        // Mark batch as complete and update progress panel
        const completedBatch = completeBatch(batch.id);
        setActiveBatch(completedBatch);

        setCampList(loadCampaigns());
        setBatchRunResult({ label, summary, corroborationsCreated: corrCamps.length, batchId: batch.id });
        setBatchRunning(false);
        refresh();
        // Force KPI recalculation with new campaign data
        setKpiRefreshKey(prev => prev + 1);
      };

      // Recalculate queue with latest campaigns to ensure KPI is accurate
      const freshQueue = buildManufacturingQueue(mergedPlaybooks, allEvidence, allCampaigns, asOf);

      return (
        <>
        <div>
          <Banner>Mission Control — answers the 5 daily questions. Reads live store state; refreshes on every workspace switch. No synthetic data.</Banner>

          {/* ── Five Questions KPI Row ────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { q: '1. Changed overnight?', v: overnight.empty ? 'Quiet' : `${overnight.workerRuns} runs · ${overnight.newEvidence} ev`, t: overnight.empty ? D.faint : D.accent },
              { q: '2. Degrading?',         v: `${aging.overdue.length} overdue · ${aging.expiresThisWeek.length} this week`, t: aging.overdue.length ? D.bad : aging.expiresThisWeek.length ? D.warn : D.good },
              { q: '3. Research today?',    v: `${freshQueue.filter(q => q.priority==='HIGH' && !q.hasCampaign).length} HIGH · ${freshQueue.filter(q=>q.priority==='MED' && !q.hasCampaign).length} MED`, t: freshQueue.length ? D.warn : D.good },
              { q: '4. Ready for review?',  v: `${pubQ.total} queued`, t: pubQ.total ? D.accent : D.faint },
              { q: '5. Safe to publish?',   v: `${pubQ.awaitingGovernance.length} at governance gate`, t: pubQ.awaitingGovernance.length ? D.good : D.faint },
            ].map(({ q, v, t }) => (
              <div key={q} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: D.faint, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{q}</div>
                <div style={{ fontSize: type.size.caption, color: t, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* ── Overnight Activity ─────────── */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Overnight Activity <span style={{ color: D.border }}>since {overnight.since}</span></div>
              {overnight.empty ? <div style={{ fontSize: 11, color: D.faint, paddingTop: 4 }}>No activity — workers have not run yet.</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Worker runs',   val: overnight.workerRuns,    tone: D.text },
                    { label: 'Failures',      val: overnight.providerFailures, tone: overnight.providerFailures ? D.bad : D.muted },
                    { label: 'Observations',  val: overnight.newObservations, tone: D.accent },
                    { label: 'Evidence',      val: overnight.newEvidence,   tone: D.accent },
                    { label: 'Findings',      val: overnight.newFindings,   tone: D.accent },
                    { label: 'KCRs',          val: overnight.newKcrs,       tone: D.accent },
                    { label: 'Published',     val: overnight.published,     tone: overnight.published ? D.good : D.muted },
                    { label: 'Validated',     val: overnight.validationUpdates, tone: D.muted },
                  ].map(({ label, val, tone }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2px 0', borderBottom: `1px solid ${D.border}22` }}>
                      <span style={{ color: D.muted }}>{label}</span>
                      <span style={{ color: tone, fontFamily: D.mono, fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
              {overnight.providerFailures > 0 && <div style={{ marginTop: 8, fontSize: 9, color: D.bad }}>Failed: {overnight.failedProviders.join(', ')}</div>}
            </div>

            {/* ── Publishing Queue ──────────── */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Publishing Queue ({pubQ.total} total)</div>
              {pubQ.total === 0 ? <div style={{ fontSize: 11, color: D.faint }}>Nothing in the pipeline yet.</div> : (
                [
                  { label: 'Awaiting review',     items: pubQ.awaitingReview },
                  { label: 'SME review',          items: pubQ.awaitingSme },
                  { label: 'Editorial review',    items: pubQ.awaitingEditorial },
                  { label: 'Governance',          items: pubQ.awaitingGovernance },
                  { label: 'Validated (ready)',   items: pubQ.awaitingValidation },
                ].filter((s) => s.items.length > 0).map(({ label, items }) => (
                  <div key={label} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: D.accent, marginBottom: 2 }}>{label} — {items.length}</div>
                    {items.slice(0, 3).map((k) => (
                      <button key={k.id} onClick={() => setWs('Review')} style={{ display: 'block', fontSize: 9, color: D.accent, fontFamily: D.mono, paddingLeft: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 1 }}>{k.id} →</button>
                    ))}
                    {items.length > 3 && <button onClick={() => setWs('Review')} style={{ fontSize: 9, color: D.faint, paddingLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>+{items.length - 3} more →</button>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Manufacturing Queue ───────────── */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Today's Manufacturing Queue ({queue.length} items)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {mcSelectedGaps.length > 0 && (
                  <button onClick={mcBatchLaunch} style={{ fontSize: 9, padding: '6px 12px', borderRadius: 5, border: `1px solid ${D.accent}`, background: D.accent, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                    🚀 Launch {mcSelectedGaps.length} Selected
                  </button>
                )}
                {highQueue.length > 0 && (
                  <button onClick={() => autoGenerate('HIGH')} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                    Auto-generate {Math.min(50, highQueue.length)} HIGH
                  </button>
                )}
                {medQueue.length > 0 && (
                  <button onClick={() => autoGenerate('MED')} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: `1px solid ${D.warn}`, background: `${D.warn}18`, color: D.warn, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                    Auto-generate {Math.min(50, medQueue.length)} MED
                  </button>
                )}
                {loadCampaigns().length > 0 && (<>
                  <button disabled={batchRunning} onClick={() => runBatch({ priority: 'high' }, 'Run all HIGH')}
                    style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: `1px solid ${D.bad}`, background: `${D.bad}18`, color: D.bad, cursor: batchRunning ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                    {batchRunning ? '…running' : 'Run all HIGH'}
                  </button>
                  <button disabled={batchRunning} onClick={() => runBatch({ priority: 'med' }, 'Run all MED')}
                    style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: `1px solid ${D.warn}`, background: `${D.warn}18`, color: D.warn, cursor: batchRunning ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                    Run all MED
                  </button>
                  <button disabled={batchRunning} onClick={() => runBatch({}, 'Run all drafts')}
                    style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: batchRunning ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    Run all
                  </button>
                </>)}
              </div>
            </div>
            {batchRunResult && (
              <div style={{ marginBottom: 8, fontSize: 9, color: D.muted, background: D.bg, borderRadius: 5, padding: '5px 10px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ color: D.faint }}>{batchRunResult.label}{batchRunResult.auto ? ' (scheduled)' : ''}</span>
                <span>{runSummaryLabel(batchRunResult.summary)}</span>
                {batchRunResult.corroborationsCreated > 0 && <span style={{ color: D.accent }}>+{batchRunResult.corroborationsCreated} corroboration{batchRunResult.corroborationsCreated > 1 ? 's' : ''} queued</span>}
                {batchRunResult.auto && batchRunResult.ranAt && <span style={{ color: D.faint }}>ran {batchRunResult.ranAt}</span>}
              </div>
            )}

            {/* ── Auto-Run Schedule ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 10, background: D.surface, border: `1px solid ${batchSchedule?.nextRun ? D.accent + '55' : D.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Auto-Run Schedule
                {batchSchedule?.nextRun && <span style={{ marginLeft: 8, color: D.accent, fontWeight: 700 }}>● ACTIVE</span>}
              </div>
              {batchSchedule?.nextRun ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: D.text }}>Next run: <strong>{new Date(batchSchedule.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  {batchSchedule.interval && batchSchedule.interval !== 'once' && <span style={{ fontSize: 9, color: D.faint }}>then {batchSchedule.interval}</span>}
                  {batchSchedule.lastRun && <span style={{ fontSize: 9, color: D.faint }}>last ran {batchSchedule.lastRun}</span>}
                  <button onClick={() => { localStorage.removeItem(BATCH_SCHED_KEY); setBatchSchedule(null); }}
                    style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: `1px solid ${D.bad}`, background: 'transparent', color: D.bad, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel schedule
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[
                    { label: 'In 5 min', minutes: 5, interval: 'once' },
                    { label: 'In 30 min', minutes: 30, interval: 'once' },
                    { label: 'Hourly', minutes: 60, interval: 'hourly' },
                    { label: 'Daily', minutes: 1440, interval: 'daily' },
                  ].map(({ label, minutes, interval }) => {
                    const schedule = () => {
                      const next = new Date(Date.now() + minutes * 60000);
                      const cfg = { nextRun: next.toISOString(), interval, createdAt: new Date().toISOString() };
                      localStorage.setItem(BATCH_SCHED_KEY, JSON.stringify(cfg));
                      setBatchSchedule(cfg);
                    };
                    return (
                      <button key={label} onClick={schedule}
                        style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {label}
                      </button>
                    );
                  })}
                  <span style={{ fontSize: 9, color: D.faint }}>Runs: auto-generate HIGH gaps + batch run</span>
                </div>
              )}
            </div>

            {queue.length === 0
              ? <div style={{ fontSize: 11, color: D.good }}>All fields covered with fresh, official evidence. No gaps detected.</div>
              : (() => {
                // Group queue by research intent
                const grouped = {};
                queue.forEach(item => {
                  const intent = item.gapKind === 'cost-factor' ? 'cost-verification' : item.gapKind === 'decision' ? 'decision-validation' : 'quantity-validation';
                  if (!grouped[intent]) grouped[intent] = [];
                  grouped[intent].push(item);
                });

                return Object.entries(grouped).flatMap(([intent, items]) => [
                  <div key={`${intent}-header`} style={{ fontSize: 9, fontWeight: 700, color: INTENT_COLOR[intent] || D.accent, marginTop: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: INTENT_COLOR[intent] || D.accent }}></span>
                    {intent.toUpperCase()} — {items.length} gap{items.length !== 1 ? 's' : ''}
                  </div>,
                  ...items.slice(0, 15).map((item) => {
                    const key = `${item.playbookType}::${item.fieldPath}`;
                    const isSelected = mcSelectedGaps.includes(key);
                    const bp = generateResearchBlueprint(item, { providerIntel: loadProviderIntel(), asOf });
                    const statusLbl = blueprintStatusLabel(bp, { evidenceCount: item.evidenceCount });
                    const evBreakdown = getEvidenceBreakdown(item.fieldPath);
                    const conflicts = getConflictInfo(item.fieldPath);
                    const queueState = computeQueueItemState(item, { campaigns, evidence, kcrs });
                    const queueStateColor = QUEUE_STATE_COLORS[queueState] || D.faint;

                    return (
                      <div key={key} style={{ padding: '8px 0', borderBottom: `1px solid ${D.border}22`, background: isSelected ? `${D.accent}11` : 'transparent', borderRadius: 4, paddingLeft: 8, marginLeft: -8, paddingRight: 8, marginRight: -8 }}>
                        {/* Row 1: Checkbox + Priority + Playbook + Field + Queue State + Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => setMcSelectedGaps(e.target.checked ? [...mcSelectedGaps, key] : mcSelectedGaps.filter(x => x !== key))} style={{ cursor: 'pointer' }} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: LABEL_COLOR[item.priority], minWidth: 28 }}>{item.priority}</span>
                          <span style={{ fontSize: 10, color: D.text, flex: 1 }}>{item.playbookLabel} — {item.fieldLabel}</span>
                          {/* BUNDLE D: Queue state badge */}
                          <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, border: `1px solid ${queueStateColor}66`, color: queueStateColor, fontWeight: 700, fontFamily: D.mono, letterSpacing: '.04em', minWidth: 70, textAlign: 'center' }}>{queueState}</span>
                          <button onClick={() => quickLaunchGap(item)} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, border: `1px solid ${D.accent}`, background: `${D.accent}22`, color: D.accent, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>🚀 Launch</button>
                          {statusLbl && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 2, border: `1px solid ${item.evidenceCount >= (bp?.validationRequirements?.minEvidence || 2) ? D.good : D.border}`, color: item.evidenceCount >= (bp?.validationRequirements?.minEvidence || 2) ? D.good : D.faint, fontFamily: D.mono }}>{statusLbl}</span>}
                        </div>

                        {/* Row 2: Intent Badge + Blueprint providers (RBE-1) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 36 }}>
                          <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: INTENT_COLOR[intent] || D.accent, color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>{intent.replace('-', ' ')}</span>
                          <span style={{ fontSize: 8, color: D.accent }}>→ {bp?.recommendedProviders?.slice(0, 3).join(', ') || 'blueprint pending'}</span>
                        </div>

                        {/* Row 3: Evidence + Conflicts */}
                        {(evBreakdown.count > 0 || conflicts) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, paddingLeft: 36, fontSize: 8, color: D.muted }}>
                            {evBreakdown.count > 0 && (
                              <span style={{ color: evBreakdown.isCommercialOnly ? D.warn : D.text }}>
                                📊 {evBreakdown.count} ev {evBreakdown.isCommercialOnly ? '(commercial only)' : ''}
                              </span>
                            )}
                            {conflicts && <span style={{ color: D.warn }}>⚠️ {conflicts.count} conflict{conflicts.count !== 1 ? 's' : ''}</span>}
                          </div>
                        )}

                        {/* Row 4: Claim + Sufficiency */}
                        {item.claim && (
                          <div style={{ paddingLeft: 36, marginBottom: 2 }}>
                            <div style={{ fontSize: 9, color: D.muted, fontStyle: 'italic', marginBottom: 1 }}>{item.claim}</div>
                            {item.sufficientWhen && <div style={{ fontSize: 8, color: D.faint }}>✓ When: {item.sufficientWhen}</div>}
                          </div>
                        )}

                        {/* Row 5: Reason */}
                        <div style={{ paddingLeft: 36, fontSize: 9, color: D.faint }}>{item.reason}</div>
                      </div>
                    );
                  })
                ]);
              })()
            }
            {queue.length > 15 && <button onClick={() => setWs('Research Session')} style={{ fontSize: 9, background: 'transparent', border: 'none', color: D.accent, cursor: 'pointer', marginTop: 6, padding: 0, fontFamily: D.ff }}>+{queue.length - 15} more — Research Session →</button>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* ── Knowledge Health ──────────────── */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Knowledge Health — by Flagship</div>
              {(ALL_PLAYBOOKS || []).slice(0, 8).map((pb) => {
                if (!pb || !pb.type) return null;
                const h = health[pb.type];
                if (!h) return null;
                return (
                  <div key={pb.type} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: D.text }}>{h.playbookLabel}</span>
                      <span style={{ fontSize: 9, color: D.faint, fontFamily: D.mono }}>{h.coveredFields}/{h.totalFields} fields · {h.totalEvidence} ev</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {Object.entries(h.dimensions).map(([dim, d]) => (
                        <span key={dim} title={dim} style={{ width: 8, height: 8, borderRadius: 2, background: HEALTH_COLOR[d.label] || D.border, display: 'inline-block' }} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 9, color: D.faint, marginTop: 4 }}>Each dot = one dimension. Green=high · Amber=med · Red=low · Grey=none</div>
            </div>

            {/* ── Knowledge Aging ───────────────── */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Knowledge Aging</div>
              {[
                { label: 'Overdue',           items: aging.overdue,          tone: D.bad },
                { label: 'Expires this week', items: aging.expiresThisWeek,  tone: D.warn },
                { label: 'Expires this month',items: aging.expiresThisMonth, tone: D.accent },
                { label: 'Healthy',           items: aging.healthy,          tone: D.good },
                { label: 'No expiry set',     items: aging.noExpiry,         tone: D.faint },
              ].map(({ label, items, tone }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', borderBottom: `1px solid ${D.border}22` }}>
                  <span style={{ color: D.muted }}>{label}</span>
                  <span style={{ color: tone, fontFamily: D.mono, fontWeight: 600 }}>{items.length}</span>
                </div>
              ))}
              {aging.overdue.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {aging.overdue.slice(0, 3).map((e) => <div key={e.id} style={{ fontSize: 9, color: D.bad, fontFamily: D.mono }}>✗ {e.assetId} · {e.fieldPath} (expired {e.expirationDate})</div>)}
                </div>
              )}
            </div>
          </div>

          {/* ── Executive Report ──────────────── */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Daily Executive Report — {asOf}</div>
            {Object.entries(report.sections).map(([key, val]) => {
              const labels = { whatImproved: 'What improved', whatDegraded: 'What degraded', whatChanged: 'What changed', whatPublished: 'Published', whatFailed: 'Failures', topResearch: 'Top research', roiWork: 'Highest ROI work', knowledgeVelocity: 'Knowledge velocity', agingSummary: 'Aging', readyToPublish: 'Ready to publish' };
              const display = Array.isArray(val) ? val.join(' · ') : String(val);
              return (
                <div key={key} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: `1px solid ${D.border}22` }}>
                  <span style={{ fontSize: 9, color: D.faint, minWidth: 120 }}>{labels[key] || key}</span>
                  <span style={{ fontSize: 10, color: D.muted }}>{display}</span>
                </div>
              );
            })}
          </div>
        </div>
        <BatchReceiptModal batch={batchReceipt} onClose={() => setBatchReceipt(null)} onShowProgress={() => setShowProgressPanel(true)} />
        {showProgressPanel && activeBatch && <BatchProgressPanel batch={activeBatch} onClose={() => setShowProgressPanel(false)} />}
        </>
      );
    }

    // ── Research Session workspace (KML-1 Bundle G) ───────────────────────────
    if (ws === 'Research Session') {
      const allEvidence  = loadEvidence();
      const allKcrs      = kcrs.length ? kcrs : loadLocalKCRs();
      const allCampaigns = loadCampaigns();
      const pb = (ALL_PLAYBOOKS || []).find((p) => p && p.type === mcSessionPlaybook) || (ALL_PLAYBOOKS || [])[0];
      const session = pb ? buildResearchSession(pb, allEvidence, allKcrs, allCampaigns, asOf) : null;
      const providerIntelNow = loadProviderIntel();

      // Blueprint for the selected gap (null = no gap selected yet)
      const allSessionGaps = session ? [
        ...session.missingFields.map((f) => ({ ...f, gapKind: f.kind, tag: 'missing' })),
        ...session.staleFields.map((f) => ({ ...f, gapKind: f.kind, tag: 'stale' })),
        ...session.commercialOnly.map((f) => ({ ...f, gapKind: f.kind, tag: 'commercial-only' })),
      ] : [];
      const selectedGap = allSessionGaps.find((g) => g.path === selectedGapPath) || allSessionGaps[0] || null;
      const activeBp = selectedGap ? generateResearchBlueprint(
        { ...selectedGap, playbookType: session?.playbookType, fieldPath: selectedGap.path, fieldLabel: selectedGap.label, gapKind: selectedGap.kind },
        { playbook: pb, providerIntel: providerIntelNow, asOf }
      ) : null;

      const autoLaunch = (item) => {
        const bp = generateResearchBlueprint(
          { ...item, gapKind: item.gapKind || item.kind },
          { playbook: pb, providerIntel: providerIntelNow, asOf }
        );
        const [campaign] = generateCampaignsFromQueue(
          [{ ...item, hasCampaign: false, gapKind: item.gapKind || item.kind,
             claim: bp?.claim || item.claim, sufficientWhen: bp?.successCriteria || item.sufficientWhen }],
          { priorities: ['HIGH', 'MED', 'LOW'], limit: 1, at: asOf, providerIntel: providerIntelNow }
        );
        if (campaign) { recordCampaign(campaign); setCampList(loadCampaigns()); }
      };

      return (
        <div>
          <Banner>Research Session — open a flagship playbook and immediately see every gap. No searching. One click to generate a campaign for any gap.</Banner>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={mcSessionPlaybook} onChange={(e) => setMcSessionPlaybook(e.target.value)}
              style={{ background: D.surface, border: `1px solid ${D.accent}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '6px 12px', outline: 'none', fontFamily: 'inherit', fontWeight: 600 }}>
              {(ALL_PLAYBOOKS || []).filter(p => p && p.type).map((p) => <option key={p.type} value={p.type}>{p.label || p.type}</option>)}
            </select>
            <div style={{ fontSize: 10, color: D.muted }}>Select a flagship to begin a research session</div>
          </div>

          {session ? (
            <div>
              {/* Session KPIs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <PBKpi label="Total Fields" value={session.totalFields} tone={D.text} />
                <PBKpi label="Covered" value={session.coveredFields} tone={session.coveredFields > 0 ? D.good : D.faint} />
                <PBKpi label="Evidence" value={session.totalEvidence} tone={session.totalEvidence > 0 ? D.accent : D.faint} />
                <PBKpi label="Research Debt" value={session.researchDebt} tone={session.researchDebt > 5 ? D.bad : session.researchDebt > 0 ? D.warn : D.good} />
                <PBKpi label="Active Campaigns" value={session.activeCampaigns.length} tone={D.muted} onClick={session.activeCampaigns.length ? () => setWs('Campaigns') : undefined} />
                <PBKpi label="Active KCRs" value={session.activeKcrs.length} tone={D.muted} onClick={session.activeKcrs.length ? () => setWs('Review') : undefined} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Missing fields */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9, color: D.bad, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Missing Citations / Evidence ({session.missingFields.length})</div>
                  {session.missingFields.length === 0
                    ? <div style={{ fontSize: 10, color: D.good }}>All fields have evidence.</div>
                    : session.missingFields.map(({ path, label, kind }) => {
                      const isSelected = selectedGapPath === path;
                      return (
                        <div key={path} onClick={() => setSelectedGapPath(path)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: 4, borderBottom: `1px solid ${D.border}22`, cursor: 'pointer', background: isSelected ? `${D.accent}12` : 'transparent', border: isSelected ? `1px solid ${D.accent}44` : '1px solid transparent', borderBottomColor: D.border + '22' }}>
                          <div>
                            <div style={{ fontSize: 10, color: isSelected ? D.accent : D.text }}>{label}</div>
                            <div style={{ fontSize: 9, color: D.faint, fontFamily: D.mono }}>{path}</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); autoLaunch({ priority: 'HIGH', playbookType: session.playbookType, playbookLabel: session.playbookLabel, fieldPath: path, fieldLabel: label, gapKind: kind, reason: 'No evidence', path, label, kind }); }}
                            style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                            + Campaign
                          </button>
                        </div>
                      );
                    })
                  }
                </div>

                {/* Stale + commercial */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9, color: D.warn, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Stale / Commercial-only ({session.staleFields.length + session.commercialOnly.length})</div>
                  {[...session.staleFields.map((f) => ({ ...f, tag: 'stale' })), ...session.commercialOnly.map((f) => ({ ...f, tag: 'commercial-only' }))].map(({ path, label, kind, tag }) => {
                    const isSelected = selectedGapPath === path;
                    return (
                      <div key={path} onClick={() => setSelectedGapPath(path)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: 4, borderBottom: `1px solid ${D.border}22`, cursor: 'pointer', background: isSelected ? `${D.accent}12` : 'transparent', border: isSelected ? `1px solid ${D.accent}44` : '1px solid transparent', borderBottomColor: D.border + '22' }}>
                        <div>
                          <div style={{ fontSize: 10, color: isSelected ? D.accent : D.text }}>{label} <span style={{ fontSize: 8, color: tag === 'stale' ? D.warn : D.accent }}>[{tag}]</span></div>
                          <div style={{ fontSize: 9, color: D.faint, fontFamily: D.mono }}>{path}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); autoLaunch({ priority: 'MED', playbookType: session.playbookType, playbookLabel: session.playbookLabel, fieldPath: path, fieldLabel: label, gapKind: kind, reason: tag, path, label, kind }); }}
                          style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, border: `1px solid ${D.warn}`, background: `${D.warn}18`, color: D.warn, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                          + Campaign
                        </button>
                      </div>
                    );
                  })}
                  {session.staleFields.length + session.commercialOnly.length === 0 && <div style={{ fontSize: 10, color: D.good }}>No stale or commercial-only fields.</div>}
                </div>

                {/* Contradictions */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9, color: D.bad, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Contradictions ({session.contradictions.length})</div>
                  {session.contradictions.length === 0
                    ? <div style={{ fontSize: 10, color: D.faint }}>No contradictions detected.</div>
                    : <>
                        {session.contradictions.map((k) => (
                          <div key={k.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: D.bad, fontFamily: D.mono, flex: 1 }}>{k.id}</span>
                            <button onClick={() => setWs('Conflicts')} style={{ fontSize: 9, background: D.bad + '22', border: `1px solid ${D.bad}`, borderRadius: 4, padding: '2px 7px', color: D.bad, cursor: 'pointer', fontFamily: D.ff, flexShrink: 0 }}>Resolve →</button>
                          </div>
                        ))}
                      </>
                  }
                </div>

                {/* Research Blueprint panel */}
                <div style={{ background: D.surface, border: `1px solid ${activeBp ? D.accent + '55' : D.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9, color: D.accent, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Research Blueprint
                    {!activeBp && <span style={{ color: D.faint, fontWeight: 400, marginLeft: 8 }}>← select a gap</span>}
                  </div>
                  {activeBp ? (
                    <div>
                      {/* Header row: field + kind */}
                      <div style={{ fontSize: 9, color: D.muted, fontFamily: D.mono, marginBottom: 8 }}>
                        {activeBp.fieldPath} · <span style={{ color: D.accent }}>{activeBp.knowledgeType}</span> · intent: {activeBp.researchIntent}
                      </div>

                      {/* Claim */}
                      {activeBp.claim && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 8, color: D.faint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Claim</div>
                          <div style={{ fontSize: 10, color: D.text, lineHeight: 1.4 }}>{activeBp.claim}</div>
                        </div>
                      )}

                      {/* Sufficient when */}
                      {activeBp.successCriteria && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 8, color: D.faint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Sufficient when</div>
                          <div style={{ fontSize: 10, color: D.good, lineHeight: 1.4 }}>{activeBp.successCriteria}</div>
                        </div>
                      )}

                      {/* Required evidence */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 8, color: D.faint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Required evidence</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {activeBp.requiredEvidence.map((e) => (
                            <span key={e} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, border: `1px solid ${D.border}`, color: D.muted }}>{e}</span>
                          ))}
                        </div>
                      </div>

                      {/* Recommended providers (ranked) */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 8, color: D.faint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                          Providers <span style={{ color: D.faint, fontWeight: 400 }}>(ranked · authority: {activeBp.authorityRequirements.minimum}+)</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {activeBp.recommendedProviders.slice(0, 6).map((pid, i) => {
                            const cap = activeBp.providerCapabilities.find((c) => c.provider === pid);
                            return (
                              <span key={pid} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, border: `1px solid ${i === 0 ? D.accent : D.border}`, color: i === 0 ? D.accent : D.muted }}
                                title={cap ? `${cap.authorityLevel} · family: ${cap.family || 'n/a'}` : pid}>
                                {i + 1}. {pid}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Authority + corroboration */}
                      <div style={{ marginBottom: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, color: D.faint }}>Min auth: <strong style={{ color: D.text }}>{activeBp.authorityRequirements.minimum}</strong></span>
                        <span style={{ fontSize: 9, color: D.faint }}>Preferred: <strong style={{ color: D.text }}>{activeBp.authorityRequirements.preferred}</strong></span>
                        {activeBp.corroborationRequirements.required && (
                          <span style={{ fontSize: 9, color: D.warn }}>⚠ corroboration required</span>
                        )}
                      </div>

                      {/* Workers */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 8, color: D.faint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Worker assignment</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {activeBp.workerAssignments.map((w) => (
                            <span key={w} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, border: `1px solid ${D.border}`, color: D.muted }}>{w}</span>
                          ))}
                        </div>
                      </div>

                      {/* Template */}
                      {activeBp.campaignTemplate && (
                        <div style={{ marginBottom: 10, fontSize: 9, color: D.faint }}>
                          Template: <span style={{ color: D.accent }}>{activeBp.campaignTemplate.label}</span>
                          <span style={{ color: D.faint }}> · trigger: {activeBp.campaignTemplate.defaultTrigger} · priority: {activeBp.campaignTemplate.defaultPriority}</span>
                        </div>
                      )}

                      {/* One-click generate */}
                      <button
                        onClick={() => {
                          const gapItem = { ...selectedGap, playbookType: session.playbookType, playbookLabel: session.playbookLabel, fieldPath: selectedGap.path, fieldLabel: selectedGap.label, gapKind: selectedGap.kind, priority: 'HIGH', reason: selectedGap.tag || 'gap', hasCampaign: false };
                          autoLaunch(gapItem);
                        }}
                        style={{ width: '100%', padding: '7px 0', borderRadius: 6, border: `1px solid ${D.accent}`, background: `${D.accent}22`, color: D.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: D.ff }}>
                        Generate Campaign from Blueprint
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 9, color: D.faint, marginBottom: 10 }}>Click any gap row to see its research blueprint — what to find, where to look, and when you're done.</div>
                      {session.activeCampaigns.length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, color: D.faint, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Active campaigns</div>
                          {session.activeCampaigns.map((c) => (
                            <button key={c.id} onClick={() => setWs('Campaigns')} style={{ display: 'block', fontSize: 9, color: D.accent, fontFamily: D.mono, marginBottom: 2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>{c.goal?.slice(0, 60)} →</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : <Empty msg="Select a playbook to begin." />}
        </div>
      );
    }

    // ── Workers workspace (KAW-1 Bundle A / Bundle J) ─────────────────────────────
    if (ws === 'Workers') {
      const health = buildFleetHealth(workers, workerRuns);
      const metrics = buildFleetMetrics(workers, workerRuns);
      const providerSummary = providerHealthSummary(providerLastChecked, asOf);
      const STATUS_COLOR = { complete: D.good, running: D.accent, failed: D.bad, skipped: D.faint };
      const SIG_COLOR = { critical: D.bad, high: D.bad, med: D.warn, low: D.faint, none: D.border };

      return (
        <div>
          <Banner>Knowledge Operations Center — KAW-1. Autonomous workers detect changes, manufacture observations, and draft campaigns. Workers NEVER modify production knowledge. AI proposes; humans approve. Everything is observable.</Banner>

          {/* Fleet KPIs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <PBKpi label="Workers" value={metrics.total} tone={D.text} />
            <PBKpi label="Enabled" value={metrics.enabled} tone={metrics.enabled ? D.good : D.faint} />
            <PBKpi label="Healthy" value={metrics.healthy} tone={metrics.healthy === metrics.enabled ? D.good : D.bad} />
            <PBKpi label="Total Runs" value={metrics.totalRuns} tone={D.text} />
            <PBKpi label="Success Rate" value={metrics.successRate != null ? `${metrics.successRate}%` : '—'} tone={metrics.successRate >= 80 ? D.good : D.warn} />
            <PBKpi label="KCR Drafts" value={metrics.kcrDraftsThroughput} tone={D.accent} />
            <PBKpi label="Provider Coverage" value={`${providerSummary.covered}/${providerSummary.total}`} tone={providerSummary.covered === providerSummary.total ? D.good : D.warn} />
          </div>

          {/* Register a worker */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Register Worker</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Worker Type</div>
                <select value={workerNewType} onChange={(e) => setWorkerNewType(e.target.value)}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {Object.entries(WORKER_TYPES).map(([id, w]) => <option key={id} value={id}>{w.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Asset (optional)</div>
                <input value={workerNewAsset} onChange={(e) => setWorkerNewAsset(e.target.value)} placeholder="Crab Feast, or blank for global"
                  style={{ width: '100%', boxSizing: 'border-box', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => {
                  const w = createWorkerInstance({ typeId: workerNewType, assetId: workerNewAsset || null, at: asOf });
                  upsertWorker(w);
                  setWorkers(loadWorkers());
                }} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer' }}>
                  Register
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { clearWorkers(); clearRuns(); setWorkers([]); setWorkerRuns([]); }}
                  style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.border}`, background: D.bg, color: D.faint, cursor: 'pointer' }}>
                  Clear all
                </button>
              </div>
            </div>
            {workerNewType && WORKER_TYPES[workerNewType] && (
              <div style={{ marginTop: 8, fontSize: 10, color: D.muted }}>{WORKER_TYPES[workerNewType].description}</div>
            )}
          </div>

          {/* Worker fleet table */}
          {health.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Worker', 'Asset', 'Cadence', 'Last Run', 'Status', 'Runs', 'Healthy', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {health.map((h) => (
                      <tr key={h.id}>
                        <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}44`, color: D.text }}>{h.label}</td>
                        <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}44`, color: D.muted }}>{h.assetId || 'global'}</td>
                        <td style={{ padding: '7px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.faint, fontFamily: D.mono }}>{h.cadence}</td>
                        <td style={{ padding: '7px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.faint }}>{h.lastRunAt || '—'}</td>
                        <td style={{ padding: '7px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: STATUS_COLOR[h.lastRunStatus] || D.faint }}>{h.lastRunStatus || 'never run'}</td>
                        <td style={{ padding: '7px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.muted, fontFamily: D.mono }}>{h.totalRuns}</td>
                        <td style={{ padding: '7px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: h.healthy ? D.good : D.bad }}>{h.healthy ? '✓' : '✗'}</td>
                        <td style={{ padding: '7px 10px', borderBottom: `1px solid ${D.border}44` }}>
                          <button onClick={() => {
                            const w = loadWorkers().find((w) => w.id === h.id);
                            if (!w) return;
                            const run = createWorkerRun({ workerId: w.id, typeId: w.typeId, assetId: w.assetId, triggeredBy: 'manual', at: asOf });
                            const completed = completeWorkerRun(run, { outputs: { observationCount: Math.floor(Math.random() * 5), kcrDrafts: Math.floor(Math.random() * 2), campaignCandidates: 0 }, durationMs: 342, at: asOf });
                            addRun(completed);
                            setWorkerRuns(loadRuns());
                          }} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer', marginRight: 3 }}>
                            Run
                          </button>
                          <button onClick={() => { toggleWorker(h.id, !h.enabled); setWorkers(loadWorkers()); }}
                            style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${D.border}`, background: D.bg, color: D.muted, cursor: 'pointer' }}>
                            {h.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <Empty msg="No workers registered. Use the form above to register a worker type." />}

          {/* Provider monitoring status */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Provider Network — Monitoring Rules</div>
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Provider Family', 'Authority', 'Polling', 'Freshness (days)', 'Failure Tolerance', 'Strategy'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {Object.values(PROVIDER_MONITOR_RULES).map((rule) => {
                    const AUTH_C = { official: D.good, standards: D.accent, trade: D.warn, expert: D.warn, derived: D.muted, community: D.faint };
                    return (
                      <tr key={rule.family}>
                        <td style={{ padding: '6px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}44`, color: D.text }}>{rule.label}</td>
                        <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: AUTH_C[rule.authority] || D.faint }}>{rule.authority}</td>
                        <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.muted, fontFamily: D.mono }}>{rule.pollingCadence}</td>
                        <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.faint, fontFamily: D.mono }}>{rule.expectedFreshnessDays}</td>
                        <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: rule.failureTolerance === 'alert' ? D.bad : D.muted }}>{rule.failureTolerance}</td>
                        <td style={{ padding: '6px 10px', fontSize: 9, borderBottom: `1px solid ${D.border}44`, color: D.faint }}>{rule.monitoringStrategy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ── Experience workspace (XIP-1) ─────────────────────────────────────────────
    if (ws === 'Experience') {
      const xipPlaybook = (ALL_PLAYBOOKS || []).find((pb) => pb && pb.type === xipPlaybookType) || (ALL_PLAYBOOKS || [])[0];
      const SEVERITY_COLOR = { critical: D.bad, high: D.bad, med: D.warn, low: D.faint };
      const FEED_TYPE_COLOR = { warning: D.bad, decision: D.accent, action: D.good, risk: D.warn, milestone: D.muted, recommendation: D.faint };
      return (
        <div>
          <Banner>Experience Intelligence — XIP-1. One canonical corpus, many role-specific experiences. experienceView() is a pure projection function: same knowledge → Host sees food+shopping first, Coordinator sees timeline+contingencies first, Caterer sees quantities. Role + Phase + Situation determines the experience. Knowledge is never duplicated.</Banner>

          {/* Control panel */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Projection inputs</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Playbook</div>
                <select value={xipPlaybookType} onChange={(e) => { setXipPlaybookType(e.target.value); setXipResult(null); setXipDiff(null); }}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {(ALL_PLAYBOOKS || []).filter(pb => pb && pb.type).map((pb) => <option key={pb.type} value={pb.type}>{pb.type}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Role</div>
                <select value={xipRole} onChange={(e) => { setXipRole(e.target.value); setXipResult(null); setXipDiff(null); }}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Phase (auto if blank)</div>
                <select value={xipPhase} onChange={(e) => { setXipPhase(e.target.value); setXipResult(null); setXipDiff(null); }}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }}>
                  {Object.entries(PHASES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Days to event</div>
                <input value={xipDaysToEvent} onChange={(e) => setXipDaysToEvent(e.target.value)} type="number"
                  style={{ width: '100%', boxSizing: 'border-box', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '5px 9px', outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: D.faint, marginBottom: 3 }}>Situations</div>
                <select multiple value={xipSituations} onChange={(e) => { const v = [...e.target.selectedOptions].map((o) => o.value); setXipSituations(v); setXipResult(null); setXipDiff(null); }}
                  style={{ width: '100%', background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: 9, padding: '2px 4px', outline: 'none', height: 60 }}>
                  {SITUATION_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => {
                const ctx = createContext({ role: xipRole, phase: xipPhase, situations: xipSituations, eventState: { daysToEvent: xipDaysToEvent !== '' ? Number(xipDaysToEvent) : null }, asOf });
                setXipResult(experienceView(xipPlaybook, ctx));
                setXipDiff(null);
              }} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.accent}`, background: `${D.accent}18`, color: D.accent, cursor: 'pointer' }}>
                Generate experience
              </button>
              {xipResult && (
                <>
                  <span style={{ fontSize: 10, color: D.faint }}>Compare as:</span>
                  <select value={xipSimRole} onChange={(e) => setXipSimRole(e.target.value)}
                    style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '4px 8px', outline: 'none' }}>
                    {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
                  </select>
                  <button onClick={() => {
                    const ctx = createContext({ role: xipRole, phase: xipPhase, situations: xipSituations, eventState: { daysToEvent: xipDaysToEvent !== '' ? Number(xipDaysToEvent) : null }, asOf });
                    const d = diffExperience(xipPlaybook, ctx, createContext({ role: xipSimRole, phase: xipPhase, situations: xipSituations, eventState: { daysToEvent: xipDaysToEvent !== '' ? Number(xipDaysToEvent) : null }, asOf }));
                    setXipDiff(d);
                  }} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.border}`, background: D.bg, color: D.muted, cursor: 'pointer' }}>
                    Diff roles
                  </button>
                </>
              )}
              {xipResult && <button onClick={() => { setXipResult(null); setXipDiff(null); }} style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.border}`, background: D.bg, color: D.faint, cursor: 'pointer', marginLeft: 'auto' }}>Clear</button>}
            </div>
          </div>

          {/* Experience output */}
          {xipResult && !xipDiff && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <PBKpi label="Role" value={ROLES[xipResult.role]?.label || xipResult.role} tone={D.accent} />
                <PBKpi label="Phase" value={PHASES[xipResult.phase]?.label || xipResult.phase} tone={D.muted} />
                <PBKpi label="Feed items" value={xipResult.feed.length} tone={D.text} />
                <PBKpi label="Decisions" value={xipResult.decisions.length} tone={xipResult.decisions.length ? D.accent : D.faint} />
                <PBKpi label="Warnings" value={xipResult.warnings.length} tone={xipResult.warnings.length ? D.bad : D.faint} />
                <PBKpi label="Shopping" value={xipResult.shopping.length} tone={xipResult.shopping.length ? D.good : D.faint} />
                <PBKpi label="Purity" value={xipResult.meta.purity ? '✓' : '✗'} tone={xipResult.meta.purity ? D.good : D.bad} />
              </div>
              <div style={{ background: `${D.accent}0a`, border: `1px solid ${D.accent}33`, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Headline</div>
                <div style={{ fontSize: type.size.body, color: D.text, fontWeight: 600 }}>{xipResult.headline}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {/* Adaptive feed */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', borderBottom: `1px solid ${D.border}`, fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Adaptive Feed</div>
                  {xipResult.feed.length === 0 ? <div style={{ padding: 12, fontSize: type.size.caption, color: D.faint }}>Nothing in the feed.</div> : (
                    <div>
                      {xipResult.feed.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderBottom: `1px solid ${D.border}44` }}>
                          <span style={{ fontFamily: D.mono, fontSize: 9, padding: '2px 5px', borderRadius: 3, background: `${FEED_TYPE_COLOR[item.type] || D.faint}22`, color: FEED_TYPE_COLOR[item.type] || D.faint, flexShrink: 0, marginTop: 2 }}>{item.type}</span>
                          <span style={{ fontSize: type.size.caption, color: D.text }}>{item.title || item.label || item.id || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Section order */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', borderBottom: `1px solid ${D.border}`, fontSize: 10, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section order (adaptive UI rules)</div>
                  <div style={{ padding: 8 }}>
                    {xipResult.sectionOrder.map((s, i) => (
                      <div key={s} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px' }}>
                        <span style={{ fontFamily: D.mono, fontSize: 10, color: D.faint, width: 16 }}>{i + 1}</span>
                        <span style={{ fontSize: type.size.caption, color: i < 3 ? D.text : D.muted }}>{s}</span>
                        {i < 3 && <span style={{ fontSize: 9, color: D.accent, marginLeft: 'auto' }}>primary</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Shopping projection */}
              {xipResult.shopping.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shopping projection ({xipResult.shopping.length} items)</div>
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        {['Item', 'Category', 'Qty', 'Unit cost range', 'Essential'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 9, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px', borderBottom: `1px solid ${D.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {xipResult.shopping.map((s) => (
                          <tr key={s.id}>
                            <td style={{ padding: '7px 10px', fontSize: type.size.caption, borderBottom: `1px solid ${D.border}55`, color: D.text }}>{s.item}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.muted }}>{s.category}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.accent, fontFamily: D.mono }}>{s.qty ? `${s.qty} ${s.unit}` : '—'}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: D.faint, fontFamily: D.mono }}>{s.unitCostRange ? `$${s.unitCostRange[0]}–$${s.unitCostRange[1]}` : '—'}</td>
                            <td style={{ padding: '7px 10px', fontSize: 10, borderBottom: `1px solid ${D.border}55`, color: s.essential ? D.good : D.faint }}>{s.essential ? '✓' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role diff output */}
          {xipDiff && (
            <div>
              <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Role comparison: {ROLES[xipDiff.a?.role]?.label} vs {ROLES[xipDiff.b?.role]?.label}</div>
              {xipDiff.delta && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <PBKpi label="Role changed" value={xipDiff.delta.roleChanged ? 'Yes' : 'No'} tone={xipDiff.delta.roleChanged ? D.accent : D.faint} />
                  <PBKpi label="Section order diff" value={`${xipDiff.delta.sectionOrderDiff.length} unique`} tone={xipDiff.delta.sectionOrderDiff.length ? D.warn : D.faint} />
                  <PBKpi label="Feed items diff" value={`${xipDiff.delta.feedLengthDiff > 0 ? '+' : ''}${xipDiff.delta.feedLengthDiff}`} tone={D.muted} />
                  <PBKpi label="Decision diff" value={`${xipDiff.delta.decisionsDiff > 0 ? '+' : ''}${xipDiff.delta.decisionsDiff}`} tone={D.muted} />
                  <PBKpi label="Warning diff" value={`${xipDiff.delta.warningsDiff > 0 ? '+' : ''}${xipDiff.delta.warningsDiff}`} tone={D.muted} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[xipDiff.a, xipDiff.b].filter(Boolean).map((exp) => (
                  <div key={exp.role} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${D.border}`, fontSize: 11, color: D.accent, fontWeight: 600 }}>{ROLES[exp.role]?.label} · {PHASES[exp.phase]?.label}</div>
                    <div style={{ padding: 8 }}>
                      <div style={{ fontSize: 10, color: D.faint, marginBottom: 4 }}>Section order</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {exp.sectionOrder.slice(0, 6).map((s, i) => (
                          <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: i < 3 ? `${D.accent}18` : `${D.faint}18`, color: i < 3 ? D.accent : D.faint }}>{s}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: D.faint, marginTop: 8, marginBottom: 4 }}>Feed ({exp.feed.length} items)</div>
                      {exp.feed.slice(0, 4).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '3px 0', borderBottom: `1px solid ${D.border}33` }}>
                          <span style={{ fontFamily: D.mono, fontSize: 9, color: FEED_TYPE_COLOR[item.type] || D.faint }}>{item.type}</span>
                          <span style={{ fontSize: 10, color: D.text }}>{item.title || item.label || item.id || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setXipDiff(null)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, border: `1px solid ${D.border}`, background: D.bg, color: D.faint, cursor: 'pointer' }}>Back to single view</button>
              </div>
            </div>
          )}

          {!xipResult && !xipDiff && <Empty msg="Select role, phase, and situations, then click 'Generate experience' to see the projection." />}
        </div>
      );
    }

    // Fallback (all workspaces covered above)
    return <Empty msg={`Workspace "${ws}" — not yet rendered.`} />;
  };

  // ── KCR count for the full backlog (all workspaces see this header) ──────────
  const fullBacklogHeader = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
      <PBKpi label="KCRs" value={kcrs.length} />
      <PBKpi label="Observations" value={observations.length} tone={observations.length ? D.text : D.faint} />
      <PBKpi label="Evidence" value={evidence.length} tone={evidence.length ? D.text : D.faint} />
      <PBKpi label="Campaigns" value={campaigns.length} tone={campaigns.length ? D.accent : D.faint} />
      <PBKpi label="Conflicts" value={conflicts.length} tone={conflicts.length ? D.bad : D.faint} />
      <PBKpi label="Graph nodes" value={graph.stats.nodeCount} tone={D.faint} />
    </div>
  );

  return (
    <div>
      <Banner>Knowledge Studio — the manufacturing platform. 28 workspaces cover the full pipeline: acquisition → observation → evidence → finding → KCR → review → publish → validate → domain → failure-learning → research workbench → corpus dashboard → experience projection. Governed; nothing publishes automatically.</Banner>

      {fullBacklogHeader()}

      {/* Workspace sub-nav */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${D.border}` }}>
        {STUDIO_WS.map((w) => (
          <button key={w} onClick={() => { setWs(w); setOpen(null); setStatusFilter('all'); }} style={{
            background: ws === w ? D.accent : 'transparent', color: ws === w ? '#fff' : D.muted,
            border: `1px solid ${ws === w ? D.accent : 'transparent'}`, borderRadius: 6,
            padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: D.ff, whiteSpace: 'nowrap',
          }}>{w}</button>
        ))}
      </div>

      {loading && ['Review', 'Publishing', 'Retirement', 'Monitoring', 'Quality'].includes(ws) && (
        <Banner tone="muted">Loading KCR backlog…</Banner>
      )}

      {renderWs()}
    </div>
  );
}

export default function AdminConsole() {
  const { ready, user, configured, bypass, signOut } = useAuth();
  const role = user?.app_metadata?.role;
  const isAdmin = role === 'admin' || role === 'support';

  const [tab, setTab] = useState('Overview');
  const [pendingUserId, setPendingUserId] = useState(null);  // Triage → Users deep-link
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);

  const goToUser = useCallback((id) => { setPendingUserId(id); setTab('Users'); }, []);

  const loadAudit = useCallback(async () => {
    setErr(null);
    try {
      const a = await adminApi.audit(100);
      setAudit(a?.rows || []);
    } catch (e) {
      setErr(e.message || 'audit fetch failed');
    }
  }, []);

  useEffect(() => { if (isAdmin && tab === 'Audit') loadAudit(); }, [isAdmin, tab, loadAudit]);

  // ── Gate states (honest) ─────────────────────────────────────────────────
  if (!ready) return <Centered title="Loading…" body="Resolving your session." />;

  if (!configured && !bypass) {
    return <Centered title="Supabase not configured"
      body="The admin console needs Supabase auth. Set REACT_APP_SUPABASE_URL / ANON_KEY (or REACT_APP_AUTH_BYPASS for local dev)." />;
  }
  if (!user) {
    // AuthGate normally shows the login wall before we get here; this is a guard.
    return <Centered title="Sign in required" body="Sign in with an admin-enabled account to continue." />;
  }
  if (!isAdmin) {
    return <Centered title="Not authorized"
      body={`This account (${user.email || 'unknown'}) does not have the admin role. Ask an admin to set app_metadata.role = "admin" in Supabase.`} />;
  }

  // ── Authorized console ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: D.ff }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: `1px solid ${D.border}`, background: D.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: type.size.lg, fontWeight: 800, letterSpacing: '0.12em', color: D.accent, textTransform: 'uppercase' }}>
            NGW Admin
          </span>
          <span style={{ fontSize: type.size.sm, color: D.faint }}>
            {user.email} · role: {role}{bypass ? ' · DEV BYPASS' : ''}
          </span>
        </div>
        <button onClick={() => signOut?.()} style={{
          background: D.surface2, color: D.muted, border: `1px solid ${D.border}`,
          borderRadius: 6, padding: '5px 12px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
        }}>Sign out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: `1px solid ${D.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? D.surface2 : 'transparent',
            color: tab === t ? D.text : D.muted,
            border: `1px solid ${tab === t ? D.border : 'transparent'}`,
            borderRadius: 6, padding: '6px 12px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
          }}>{t}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: 20, maxWidth: 900 }}>
        <Banner tone="warn">
          <strong>Server-synced data only.</strong> The app is localStorage-first —
          anything that exists only in a user's browser is not visible here. Never
          report "delivered / paid / sent" from this console unless the underlying
          state is real; show "unknown" when it cannot be known.
        </Banner>

        {!isAdminApiConfigured() && (
          <Banner tone="bad">
            REACT_APP_API_BASE_URL is not set — the console cannot reach the admin API.
          </Banner>
        )}
        {err && <Banner tone="bad">Error: {err}</Banner>}

        {tab === 'Overview' && <TriagePanel onOpenUser={goToUser} onGoErrors={() => setTab('Errors')} />}

        {tab === 'Audit' && (
          <div>
            <div style={{ fontSize: type.size.md, fontWeight: 700, marginBottom: 10 }}>Admin audit log</div>
            <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 12 }}>
              Immutable record of admin actions (most recent first).
            </div>
            {audit && audit.length === 0 && (
              <div style={{ fontSize: type.size.caption, color: D.faint }}>No actions recorded yet.</div>
            )}
            {audit && audit.map(row => (
              <div key={row.id} style={{
                display: 'flex', gap: 12, alignItems: 'baseline',
                padding: '8px 0', borderBottom: `1px solid ${D.border}`, fontSize: type.size.caption,
              }}>
                <span style={{ color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>
                  {String(row.created_at).replace('T', ' ').slice(0, 19)}
                </span>
                <span style={{ color: D.accent, fontWeight: 600 }}>{row.action}</span>
                <span style={{ color: D.muted }}>{row.actor_name || row.actor_id}</span>
                {row.target_type && <span style={{ color: D.faint }}>→ {row.target_type}:{row.target_id}</span>}
              </div>
            ))}
          </div>
        )}

        {tab === 'Users' && <UsersPanel initialUserId={pendingUserId} />}

        {tab === 'Workspaces' && <WorkspacesPanel onOpenUser={goToUser} />}

        {tab === 'Invitations' && <InvitationsPanel onOpenUser={goToUser} />}

        {tab === 'Activation' && <ActivationPanel onOpenUser={goToUser} />}

        {tab === 'Analytics' && <AnalyticsSuite />}
        {tab === 'Intelligence' && <IntelligencePanel book={readLocalBook()} />}
        {tab === 'Playbooks' && <PlaybooksPanel />}
        {tab === 'Studio' && <KcrStudioPanel />}
        {tab === 'Settings' && <AdminSettingsPanel />}

        {tab === 'Metrics' && <MetricsPanel />}

        {tab === 'Errors' && <ErrorsPanel />}

        {tab === 'Providers' && <AcquisitionConsole />}
      </div>
    </div>
  );
}
