// ─── Playbook Campaign Launcher (Admin Console) ────────────────────────────────
// Full workflow: detect gaps → suggest templates → launch campaigns with real data →
// review evidence → merge updates into playbooks.
import { useState, useMemo } from 'react';
import { ALL_PLAYBOOKS } from '../lib/playbooks/index';
import { CAMPAIGN_TEMPLATES } from '../lib/knowledge/campaignTemplates';
import { createCampaign, runCampaign, recordCampaign, loadCampaigns } from '../lib/knowledge/campaign';
import { fetchProviderData, prepareEvidenceForReview } from '../lib/knowledge/providerIntegration';
import { prepareEvidenceReview, consensusValue, proposePlaybookUpdate, savePlaybookUpdate, recordMergeAction, loadPlaybookWithUpdates } from '../lib/knowledge/playbookMerge';
import { buildProviders } from '../lib/knowledge/providers';

const PLAYBOOK_OPTIONS = ['Crab Feast', 'Wedding', 'Corporate Retreat'];

function GapDetector(playbook) {
  if (!playbook) return [];

  const gaps = [];

  // Detect synthesized cost factors in decisions
  if (playbook.decisions) {
    playbook.decisions.forEach((decision) => {
      if (decision.costFactorProvenance?.verificationStatus === 'synthesized') {
        gaps.push({
          id: `decision-${decision.id}`,
          type: 'cost-factor',
          label: decision.label,
          fieldPath: `decisions[${decision.id}].costFactors`,
          priority: decision.costFactorProvenance.confidence === 'low' ? 'high' : 'med',
          note: decision.costFactorProvenance.note,
          confidence: decision.costFactorProvenance.confidence,
        });
      }
    });
  }

  return gaps;
}

function EvidenceReview({ evidence, fieldPath, D, type, onAccept, onReject }) {
  const review = prepareEvidenceReview(evidence, fieldPath);

  if (!evidence || evidence.length === 0) {
    return (
      <div style={{ padding: '12px', background: D.surface2, borderRadius: 6, color: D.muted }}>
        No evidence collected yet. Run campaign to fetch data.
      </div>
    );
  }

  return (
    <div style={{ padding: '14px', background: D.surface2, borderRadius: 8, border: `1px solid ${D.border}` }}>
      <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.text, marginBottom: 10 }}>
        Evidence Review ({review.summary.totalEvidence} sources)
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: 8, background: D.bg, borderRadius: 6, fontSize: '11px' }}>
          <div style={{ color: D.muted, marginBottom: 2 }}>Evidence Items</div>
          <div style={{ color: D.accent, fontWeight: 700, fontSize: '16px' }}>{review.summary.totalEvidence}</div>
        </div>
        <div style={{ padding: 8, background: D.bg, borderRadius: 6, fontSize: '11px' }}>
          <div style={{ color: D.muted, marginBottom: 2 }}>Unique Facts</div>
          <div style={{ color: D.accent, fontWeight: 700, fontSize: '16px' }}>{review.summary.uniqueFacts}</div>
        </div>
        <div style={{ padding: 8, background: D.bg, borderRadius: 6, fontSize: '11px' }}>
          <div style={{ color: review.summary.contradictions > 0 ? D.warn : D.good, marginBottom: 2 }}>
            Contradictions
          </div>
          <div style={{ color: review.summary.contradictions > 0 ? D.warn : D.good, fontWeight: 700, fontSize: '16px' }}>
            {review.summary.contradictions}
          </div>
        </div>
      </div>

      {/* Evidence sources */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: D.muted, marginBottom: 6, textTransform: 'uppercase' }}>
          Sources
        </div>
        {review.evidence.map((e) => (
          <div key={e.id} style={{ fontSize: '11px', padding: '8px', background: D.bg, borderRadius: 4, marginBottom: 4, color: D.text }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{e.source}</div>
            <div style={{ color: D.muted, lineHeight: 1.4, marginBottom: 4 }}>{e.statement}</div>
            {e.extractedFacts && e.extractedFacts.length > 0 && (
              <div style={{ fontSize: '10px', color: D.faint }}>
                Facts: {e.extractedFacts.map((f) => `${f.fact}=${f.value}${f.unit ? ` ${f.unit}` : ''}`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => onAccept(review)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 6,
            border: 'none',
            background: D.good,
            color: '#fff',
            cursor: 'pointer',
            fontSize: type.size.caption,
            fontWeight: 600,
          }}
        >
          ✓ Accept & Merge
        </button>
        <button
          type="button"
          onClick={onReject}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 6,
            border: `1px solid ${D.border}`,
            background: 'transparent',
            color: D.text,
            cursor: 'pointer',
            fontSize: type.size.caption,
          }}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

export function PlaybookCampaigns({ D, type }) {
  const [selectedPb, setSelectedPb] = useState(null);
  const [selectedGap, setSelectedGap] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [campaignState, setCampaignState] = useState('idle'); // idle, fetching, reviewing, merging, complete
  const [evidence, setEvidence] = useState([]);
  const [lastCampaign, setLastCampaign] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);

  const pb = selectedPb ? loadPlaybookWithUpdates(selectedPb) : null;
  const gaps = useMemo(() => GapDetector(pb), [pb]);
  const gap = selectedGap ? gaps.find((g) => g.id === selectedGap) : null;
  const suggestedTemplates = gap ? CAMPAIGN_TEMPLATES.filter((t) => t.gapTypes?.includes(gap.type)) : [];
  const campaigns = loadCampaigns();
  const providers = buildProviders();

  const handleLaunchCampaign = async () => {
    if (!pb || !gap || !selectedTemplate || selectedProviders.length === 0) return;

    setCampaignState('fetching');
    const at = new Date().toISOString();

    try {
      // 1. Create campaign object
      const campaign = createCampaign({
        goal: `${selectedTemplate.label} for ${selectedPb}`,
        assetId: selectedPb,
        fieldPath: gap.fieldPath,
        gapType: gap.type,
        priority: selectedTemplate.defaultPriority || 'med',
        trigger: selectedTemplate.defaultTrigger || 'research',
        providers: selectedProviders,
        at,
      });

      // 2. Fetch real data from providers
      const providerData = await fetchProviderData(selectedProviders, { campaign, at });

      // 3. Prepare evidence from fetched data
      const fetchedEvidence = prepareEvidenceForReview(providerData, providers);
      setEvidence(fetchedEvidence);

      // 4. Run campaign with real evidence
      const result = runCampaign(campaign, {
        providers: providers.filter((p) => selectedProviders.includes(p.id)),
        fetched: providerData,
        pb,
        asOf: at,
      });

      recordCampaign(result);
      setLastCampaign(result);
      setCampaignState('reviewing');
    } catch (e) {
      console.error('Campaign execution failed:', e);
      setCampaignState('idle');
    }
  };

  const handleAcceptEvidence = (review) => {
    setCampaignState('merging');

    try {
      // Propose playbook update based on reviewed evidence
      const proposal = proposePlaybookUpdate(pb, gap.fieldPath, evidence, true);

      if (proposal.status === 'approved') {
        // Save the updated playbook
        const saveResult = savePlaybookUpdate(pb, proposal.playbook);
        recordMergeAction(pb, evidence, 'merge-accepted', new Date().toISOString());

        setMergeResult({
          status: 'success',
          message: saveResult.message,
          changes: proposal.changes,
          evidence_count: evidence.length,
        });

        setCampaignState('complete');

        // Reset form after 3 seconds
        setTimeout(() => {
          setSelectedGap(null);
          setSelectedTemplate(null);
          setSelectedProviders([]);
          setEvidence([]);
          setCampaignState('idle');
          setMergeResult(null);
        }, 3000);
      } else {
        setMergeResult({
          status: 'conflict',
          message: proposal.reason,
          contradictions: proposal.contradictions,
        });
      }
    } catch (e) {
      console.error('Merge failed:', e);
      setMergeResult({
        status: 'error',
        message: e.message,
      });
    }
  };

  const handleRejectEvidence = () => {
    recordMergeAction(pb, evidence, 'merge-rejected', new Date().toISOString());
    setCampaignState('idle');
    setEvidence([]);
    setSelectedGap(null);
    setSelectedTemplate(null);
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: type.size.title, fontWeight: 700, color: D.text, marginBottom: 20 }}>
        Research Campaign Launcher
      </div>

      {/* Step 1: Select Playbook */}
      {campaignState === 'idle' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Step 1: Select Playbook
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLAYBOOK_OPTIONS.map((pbName) => (
              <button
                key={pbName}
                type="button"
                onClick={() => {
                  setSelectedPb(pbName);
                  setSelectedGap(null);
                  setSelectedTemplate(null);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: `1px solid ${selectedPb === pbName ? D.accent : D.border}`,
                  background: selectedPb === pbName ? `${D.accent}22` : 'transparent',
                  color: selectedPb === pbName ? D.accent : D.text,
                  cursor: 'pointer',
                  fontFamily: type.ff,
                  fontSize: type.size.caption,
                  fontWeight: selectedPb === pbName ? 600 : 400,
                }}
              >
                {pbName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Gap */}
      {campaignState === 'idle' && pb && gaps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Step 2: Select Gap to Research ({gaps.length} found)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gaps.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setSelectedGap(g.id);
                  setSelectedTemplate(null);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${selectedGap === g.id ? D.accent : D.border}`,
                  background: selectedGap === g.id ? `${D.accent}22` : 'transparent',
                  color: selectedGap === g.id ? D.accent : D.text,
                  cursor: 'pointer',
                  fontFamily: type.ff,
                  fontSize: type.size.caption,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{g.label}</div>
                <div style={{ fontSize: '11px', color: D.muted }}>
                  Type: {g.type} · Confidence: {g.confidence} · Priority: {g.priority}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select Template */}
      {campaignState === 'idle' && gap && suggestedTemplates.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Step 3: Select Campaign Template
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestedTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplate(t);
                  setSelectedProviders(
                    t.defaultProviders
                      ?.map((pid) => {
                        const fam = providers.find((p) => p.id === pid)?.family;
                        return fam;
                      })
                      .filter(Boolean) || []
                  );
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${selectedTemplate?.id === t.id ? D.accent : D.border}`,
                  background: selectedTemplate?.id === t.id ? `${D.accent}22` : 'transparent',
                  color: selectedTemplate?.id === t.id ? D.accent : D.text,
                  cursor: 'pointer',
                  fontFamily: type.ff,
                  fontSize: type.size.caption,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: D.muted }}>{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Launch */}
      {campaignState === 'idle' && selectedTemplate && selectedProviders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={handleLaunchCampaign}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: D.accent,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: type.ff,
              fontSize: type.size.caption,
              fontWeight: 600,
            }}
          >
            🚀 Launch Campaign
          </button>
        </div>
      )}

      {/* Campaign Execution States */}
      {campaignState === 'fetching' && (
        <div style={{ padding: '14px', background: D.surface2, borderRadius: 8, color: D.text }}>
          ⏳ Fetching data from {selectedProviders.length} provider(s)...
        </div>
      )}

      {campaignState === 'reviewing' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.text, marginBottom: 12 }}>
            Review Collected Evidence
          </div>
          <EvidenceReview
            evidence={evidence}
            fieldPath={gap?.fieldPath}
            D={D}
            type={type}
            onAccept={handleAcceptEvidence}
            onReject={handleRejectEvidence}
          />
        </div>
      )}

      {campaignState === 'merging' && (
        <div style={{ padding: '14px', background: D.surface2, borderRadius: 8, color: D.text }}>
          ⏳ Merging evidence into playbook...
        </div>
      )}

      {campaignState === 'complete' && mergeResult && (
        <div
          style={{
            padding: '14px',
            background: mergeResult.status === 'success' ? `${D.good}22` : `${D.warn}22`,
            borderRadius: 8,
            border: `1px solid ${mergeResult.status === 'success' ? D.good : D.warn}`,
            color: D.text,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, color: mergeResult.status === 'success' ? D.good : D.warn }}>
            {mergeResult.status === 'success' ? '✓ Playbook Updated' : '⚠ Merge Incomplete'}
          </div>
          <div style={{ fontSize: type.size.caption, marginBottom: 4 }}>{mergeResult.message}</div>
          {mergeResult.changes && Object.keys(mergeResult.changes).length > 0 && (
            <div style={{ fontSize: '11px', color: D.muted, marginTop: 8 }}>
              Changes: {Object.keys(mergeResult.changes).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Campaign History */}
      {campaignState === 'idle' && campaigns.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Recent Campaigns
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {campaigns.slice(-3).map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: `1px solid ${D.border}`,
                  background: D.surface2,
                  color: D.text,
                  fontSize: type.size.caption,
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{c.goal}</div>
                <div style={{ fontSize: '11px', color: D.muted }}>
                  State: {c.state} · Evidence: {c.result?.evidence || 0} · Status: {c.result?.finding || 'pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
