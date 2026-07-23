// Host Shell V2 — WIRED PROTOTYPE (separate app, real engines).
// UI is the expressive-editorial concept; every number and card below comes from
// the production engines: eventPlan() (CommandCenter.jsx), identityStatement()
// (lib/eventIdentity), real sample events, real budget + run-of-show data.
// Nothing invented — where data is missing, the UI says so.
import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AskColumn, Eyebrow, BigValue, BigValueInput, GuideLine, Grounding, CtaRow, TierRow, SettledRow, SettledCard, OptionList, ASK_RHYTHM, ASK_COMPACT } from './parity/askKit';
import { eventPlan, applicableReadinessAxes } from '@app/CommandCenter';
import { buildCrabProcurement } from '@app/lib/procurement';
import { buildAssembleRevealStages, unresolvedBlockerStages } from '@app/lib/assembleRevealEngines';
import { buildExperienceContext } from '@app/lib/experienceContext';
import { deriveHelperResponsibilities, helperStatusLine, guestHelperRoles } from '@app/lib/helperResponsibility';
import { buildCrabPlan, defaultCountPerUnit, lineCrabCount, recommendCrabOrder } from '@app/lib/crabPlan';
import { buildVendorPlan } from '@app/lib/vendorPlan';
import { PRICE_TABLE_META } from '@app/lib/sourcing';
// Formatted vintage of the researched price ranges, for a VISIBLE freshness tag
// on the food estimates (per-screen audit: "add a freshness tag, not just a
// footer disclaimer" — so the commodity-price engine reads as trustworthy).
// Built with local Date(y, m-1, …) to avoid a UTC-parse month rollover.
const PRICE_VINTAGE = (() => {
  try { const [y, m] = String(PRICE_TABLE_META.asOf || '').split('-'); if (!y || !m) return ''; return new Date(Number(y), Number(m) - 1, 15).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch { return ''; }
})();
import { METRO_MARKETS, METRO_TIER_LABEL, getMetroFactor, getRushFactor } from '@app/lib/vendorEstimator';
import { parseVendorReply, isAiProxyConfigured } from '@app/lib/aiProxy';
import { buildReplyDiff, buildPatch, replyLogEntry } from '@app/lib/vendorReplyParse';
import { positiveAttention } from '@app/lib/positiveAttention';
import { showsReplyTracking } from '@app/lib/guestMode';
import { isLikelyOutdoor, suggestRainPlan, guestRainMessage, weatherImpactByEventPhase, rainAwareSummary, rainPlanStatus, weatherLogistics, isWeatherConfigured, geocodeVenue, getEventWeatherRisk } from '@app/lib/weather';
import { playMessageChime, notifyMessageArrival, setMessageSoundMuted, primeMessageSound } from '@app/lib/notificationSound';
import { draftInvite, draftShoppingList, draftVendorOutreach, draftThankYou, draftRsvpChase, draftHelperBrief, draftHelperConfirm, draftVendorReconfirm, hasToastMaterial, draftToast, draftGuestUpdate, draftParkingInstructions, draftDietaryNote, draftRecap, draftDayBeforeDetails, draftVendorPaymentReminder, draftLodgingNote, draftRidesNote, draftGettingHereNote, draftGuestBrief, timePhrase, decisionApproach } from '@app/lib/doItForMe';

// Wave-2a decision-engine consumers (shared shape with App.js HostDecisionsPanel).
// rankReasonForV2 — the rank's "work": the board's own rankReason, else a host-voiced
// fallback derived from the priority fields the row carries. Never fabricated.
function rankReasonForV2(row) {
  if (row && typeof row.rankReason === 'string' && row.rankReason.trim()) return row.rankReason.trim();
  const b = row && row.priorityBasis;
  if (b && typeof b.rationale === 'string' && b.rationale.trim()) return b.rationale.trim();
  if (!row) return '';
  if (row.deliversHeartMoment) return 'This is the moment your guests will remember — worth deciding yourself.';
  const hi = row.weight === 'high';
  const hard = row.reversibility === 'locked' || row.reversibility === 'costly';
  if (hi && hard) return 'Leads because it’s a big call that’s hard to undo once it’s set.';
  if (hi) return 'A high-stakes call — settling it moves the most of your plan.';
  if (hard) return 'Hard to change later, so it’s worth getting right now.';
  if (row.emotionalWeight === 'high') return 'This one carries a lot of heart — give it your own attention.';
  return '';
}
// hostDiffBandV2 deleted 2026-07-17 — it was a THIRD copy of a classifier the engine
// already computes and exposes as hostAdaptation.difficultyBand (playbooks/index.js:2406,
// :2464), read by nobody. Three regexes over the same input, kept in sync by nothing.
// They agreed on all six values the playbooks actually author (moderate/easy/high/hard/
// medium/moderate-high) but NOT in general: the engine bands intensive|complex as hard and
// low|simple|light as easy, where this copy called all five moderate — a divergence waiting
// for the first playbook to use one of those words. The surface now reads the engine.
import { buildTravelPlan, nextLodgingStatus, LODGING_STATUS_LABEL, rideStatusOf, nextRideStatus, rideFieldsFor, RIDE_STATUS_LABEL, arrivalClusters } from '@app/lib/travelPlan';
import { buildSeatingPlan, assignGuestToTable, unassignGuest, autoAssignByGroup, renameTable, clampTableCount, tableCountBasis, MEAL_SHORT } from '@app/lib/seatingPlan';
import { costSharingSummary } from '@app/lib/costSharing';
import { answerPlanQuestion } from '@app/lib/askPlan';
import { runOrchestration } from '@app/lib/orchestrator';
import { orchestratorStreamTransport, isOrchestratorApiConfigured } from '@app/lib/orchestratorClient';
import { formatPhoneUS, isMalformedEmail } from '@app/lib/contactFormat';
import { DAY_COMPLETE_COPY } from '@app/lib/dayOfCopy';
import { identityStatement } from '@app/lib/eventIdentity';
import { daysUntil, eventDateStatus, rsvpDeadlineFor , taskTimeStatus } from '@app/lib/dates';
import { proposeReplyBy } from '@app/lib/replyBy';
import { taskLeadDays, taskDueLabel, taskIsOverdue } from '@app/lib/taskLead';
import { proposeStartTime, defaultStartTime, startTimeIsConfirmed } from '@app/lib/startTime';
import { arrivalAsk } from '@app/lib/vendorAsks';
import { normalizeCategory } from '@app/lib/vendorAccountability/playbooks';
import { canSnooze, proposedSnoozeUntil, clampSnoozeUntil, snoozedUntil } from '@app/lib/snooze';
import { vendorPricingHint } from '@app/lib/knowledge/vendorPricing';
import { militaryRetirementContext } from '@app/lib/knowledge/militaryRetirement';
import { isPastEvent } from '@app/lib/closeoutIntel';
import { setLesson, getLesson } from '@app/lib/eventMemory';
import { purgeStaleOutbox, fetchEventRsvps, isRsvpApiConfigured } from '@app/lib/api/rsvp';
import { effectiveDone } from '@app/lib/taskEngine';
import Papa from 'papaparse';
import QRCode from 'qrcode';
import { PLATFORMS, transformRows, validateRows, computeMergeSummary, applyMerge, toCSV, COLUMNS, exportFileSlug } from '@app/lib/csvParsers';
import { GUEST_IMPORT_BATCHES_KEY, newImportBatchId, computeImportAuditMeta, makeImportBatch, undoLastImportBatch, loadImportBatches, persistImportBatches, MAX_PERSISTED_BATCHES, PLATFORM_LABELS, fmtBatchTs } from '@app/lib/importHistory';
import { downloadCSV } from '@app/lib/download';
import { deriveEventPhaseProgress } from '@app/lib/phaseProgress';
import { deriveEventCompressionSummary } from '@app/lib/workflowCompression';
import { buildDayBeforePlan } from '@app/lib/dayBefore';
import { resolveRoute } from '@app/lib/routeResolver';
import { hostSpending } from '@app/lib/hostSpending';
import { expectedFromPlanned } from '@app/lib/attendanceModel';
import { estimateTotalRange } from '@app/lib/budgetEstimator';
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan, effectiveRos, classifyRos, hostIsCooking, foodApproach, guestCountResolved, attendanceBand, attendanceBandLabel, playbookDecisionBoard, playbookDecisionOptions, playbookCapacity, playbookRisks, supplyRetailLinks, playbookHeartMoments, playbookChecklist, playbookContingencyForWeather, crabPriceLadder, playbookOpenDecisionAffects, playbookTypicalGuests, normalizeAlternative } from '@app/lib/playbooks';
import { buildReturnSnapshot, readReturnSnapshot, writeReturnSnapshot, deriveReturnNarration, narrationDuplicatesTelling } from '@app/lib/returnNarration';
import { makeRecord, appendDecision, latestRationaleForSubject } from '@app/lib/decisionMemory';
import { computeDayAlerts } from '@app/lib/dayAlerts';
import { raiseCounts } from '@app/lib/surfaceRegistry';
import { getVendorCOIState, coiNextAction } from '@app/lib/vendorIntelligence';
import { isVendorBooked, isVendorConfirmed } from '@app/lib/workstreams';
import { EVENT_TAXONOMY, resolveCanonicalType } from '@app/lib/eventTaxonomy.mjs';
import { isPlausibleCityText, parseVenueLocation } from '@app/lib/cityText';
import { foodShopItems } from '@app/lib/foodShopItems';
import { eventGeoQuery } from '@app/lib/eventGeoQuery';
import { parseSmartEventText, HOST_TYPES } from '@app/lib/smartParseEvent';
import { shouldShowWelcome, isRealHostEvent, LS_WELCOMED } from '@app/lib/welcomeGate';
import { isFoodPricesConfigured, getFoodPriceFactor } from '@app/lib/foodPrices';
import { quickAccountabilityForVendor, inferPromisesFromVendor, promiseNeedsHost } from '@app/lib/vendorAccountability/derive';
import { deriveVendorPromiseConflicts } from '@app/lib/vendorAccountability/conflicts';
import { conflictsToActionItems, deriveResolution } from '@app/lib/vendorAccountability/actionItems';
import { isStorageConfigured, uploadFile, validateFile, inferCategory } from '@app/lib/storage';
import { buildBudgetRecoveryPlan } from '@app/lib/budgetRecovery';
import { pickDroppableBudgetRow } from '@app/lib/budgetSwap';
import { eventContextNudge } from '@app/lib/eventContextNudges';
import { derivePlaceIntelligence } from '@app/lib/placeIntelligence';
import { budgetHeroCopy } from '@app/lib/budgetCopy';
import { rosOverlapCount } from '@app/lib/rosOverlap';
import { suggestableMoments, buildMomentSegment } from '@app/lib/momentLibrary';
import { vendorMemoryFor, summarizeVendorMemory } from '@app/lib/eventMemory';
import { taskUrgencyChip } from '@app/lib/workflowCompression';
import { buildPayLink, getSuggestedPayMethod } from '@app/lib/payLinks';
import { isStripeApiConfigured, createCheckoutSession } from '@app/lib/stripeApi';
import { summarizeHostIntel, clearAllMemory, applyReconciliation, isReconciled } from '@app/lib/hostIntel';
import { confidencePersona, confidenceFor } from '@app/lib/confidenceGrammar';
import { isSupabaseConfigured, supabase, authRedirectUrl } from '@app/lib/supabaseClient';
import { loadProfile as cloudLoadProfile, saveProfile as cloudSaveProfile } from '@app/lib/api/profile';
import { loadEvents as cloudLoadEvents, saveEvent as cloudSaveEvent } from '@app/lib/api/events';
import { recordSaveResult, flushPendingEvents as flushSync, installOnlineFlush, getEventSyncStatus, SYNC_STATUS, SYNC_STATUS_LABEL, getLastSyncTime, getPendingCount, markEventSynced } from '@app/lib/api/syncState';
import { buildVendorBriefPayload } from '@app/lib/vendorBrief';
import { mintVendorBriefLink, isVendorBriefApiConfigured, fetchVendorConfirmations } from '@app/lib/api/vendorBrief';
import { mergeGuestReplies } from '@app/lib/guestMerge';
import { parseMin } from '@app/lib/dayAlerts';

// Which engine tiers are NOT actually asks. The calm check used to fingerprint the
// engine's PROSE — /on track|nothing urgent|good shape/ against actions[0].title —
// so calm was asserted by string match, and any reworded tier silently broke it.
// These tiers say so about themselves: 'neutral' ("Event on track. Nothing urgent"),
// 'calendar' (whose own copy is "nothing to do yet, I'm watching it for you"), and
// 'heart' ("Nothing's urgent right now — so use the calm"). All three were being
// counted as "1 thing needs you" while their own body text said the opposite.
const CALM_CATEGORIES = new Set(['neutral', 'calendar', 'heart']);

// Event data pool + artwork resolver moved to ./eventPool.js so main.jsx can
// lazy-load this host shell while the public invite (InviteV2) pulls only the
// pool, not the whole shell. Re-imported here; the invite imports from eventPool.
import { APP_EVENTS, LS_PATCH, LS_CUSTOMS, LS_LAST_EVENT, mintEventId, b64encode, CUSTOM_EVENTS_AT_LOAD, appCrab, REAL_EVENTS, MY_CRAB_FEAST, ALL_SAMPLES, ROSTER, FALLBACK, BOOT_EVENT_ID, eventArtworkFile, AVA_TINTS } from './eventPool.js';

const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

const REDUCE_MOTION = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Agent Opportunity Audit P0 — inbound vendor-reply parser, host-shell edition.
// Paste what the vendor said → the server extracts the stated fields → the host
// reviews a diff and applies only what they keep, through writeVendor (patch +
// honest log in one call). Reuses the SAME shared core (@app/lib/vendorReplyParse)
// and backend endpoint as the planner cockpit; only the chrome is hostv2's.
// "Apply reviewed extraction" (06_AI_GROUNDING) — it proposes, never auto-writes.
function VendorReplyParserV2({ vendor, event, writeVendor }) {
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  if (!isAiProxyConfigured() || typeof writeVendor !== 'function') return null;

  const analyze = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const data = await parseVendorReply(replyText, { vendorName: vendor.name, vendorCategory: vendor.category, eventName: event?.name });
      // No `confidence` kept: a model grading its own extraction is invented
      // confidence (06_AI_GROUNDING) — the honest signals are the verbatim
      // quote under each row and its evidenceVerified check, nothing else.
      // replyText is the 3rd arg ON PURPOSE: buildReplyDiff verifies each row's
      // evidence is a verbatim quote of THIS text — omit it and every row
      // arrives unverified/unchecked (safe, but wrong for evidenced rows).
      setResult({ rows: buildReplyDiff(data.fields, vendor, replyText), truncated: data.truncated === true, disclaimer: data.disclaimer });
    } catch (e) { setErr(e.message || 'Could not read that message — try again.'); }
    finally { setBusy(false); }
  };
  const toggleRow = (i) => setResult(r => ({ ...r, rows: r.rows.map((row, j) => j === i ? { ...row, accepted: !row.accepted } : row) }));
  const acceptedCount = result ? result.rows.filter(r => r.accepted).length : 0;
  const apply = () => {
    const patch = buildPatch(result.rows);
    if (!Object.keys(patch).length) return;
    writeVendor(vendor.id, patch, replyLogEntry(result.rows));
    setResult(null); setReplyText('');
  };
  const fmtV = (t, v) => (v === null || v === undefined || v === '') ? null : t === 'bool' ? (v === true ? 'yes' : null) : t === 'money' ? ('$' + v) : String(v);

  return (
    <div style={{ margin: '10px 0', padding: 'var(--sp-2) 12px', borderRadius: 10, background: 'var(--steel-tint)', border: '1px solid var(--steel-soft)' }}>
      <div className="of" style={{ marginBottom: 6 }}>Log what the vendor said</div>
      <div style={{ fontSize: 12, color: 'var(--carbon-muted)', marginBottom: 8, lineHeight: 1.5 }}>
        Paste their email or text — we’ll pull out times, contacts, counts and payment status for you to review. Nothing saves until you apply it.
      </div>
      <textarea className="field" rows={3}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 'var(--t-input)', padding: 'var(--sp-2) 10px' }}
        placeholder="e.g. We'll arrive at 2pm, deposit received, final count 85. Day-of contact Dana, 301-555-0134."
        value={replyText} onChange={e => setReplyText(e.target.value)} aria-label="Paste the vendor's message" />
      <div className="actions-row" style={{ marginTop: 8, alignItems: 'center', gap: 8 }}>
        <button className="mini" onClick={analyze} disabled={busy || !replyText.trim()}>{busy ? 'Reading…' : 'Read the message'}</button>
        {err && <span style={{ fontSize: 12, color: 'var(--warn)' }}>{err}</span>}
      </div>
      {result && result.rows.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--carbon-muted)', marginTop: 8 }}>Nothing new to apply — this doesn’t change anything already on record.</div>
      )}
      {result && result.rows.length > 0 && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--carbon-1, rgba(0,0,0,0.16))', border: '1px solid var(--steel-soft)' }}>
          <div className="of" style={{ marginBottom: 8, letterSpacing: '0.06em' }}>AI-extracted · review against the message</div>
          {result.truncated && (
            <div style={{ fontSize: 12, color: 'var(--carbon-muted)', marginBottom: 6 }}>Long reply — we read the first part.</div>
          )}
          {result.rows.map((row, i) => {
            const cur = fmtV(row.type, row.current), next = fmtV(row.type, row.proposed);
            return (
              <label key={row.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid var(--steel-tint)' }}>
                <input type="checkbox" checked={row.accepted} onChange={() => toggleRow(i)} style={{ marginTop: 3 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--t-input)', color: 'var(--ink)' }}>
                    <strong>{row.label}</strong>{' '}
                    <span style={{ color: 'var(--carbon-muted)' }}>{cur ? (cur + ' → ') : 'set to '}</span>
                    <strong style={{ color: 'var(--steel-soft)' }}>{next}</strong>
                  </div>
                  {row.evidence && row.evidenceVerified !== false && <div style={{ fontSize: 12, color: 'var(--carbon-muted)', fontStyle: 'italic', marginTop: 2 }}>“{row.evidence}”</div>}
                  {/* PARSER CONTRACT: evidenceVerified is the lib's verbatim-
                      substring check. false = the model couldn't show its work,
                      so the quote (if any) is NOT displayed as if it were one,
                      and the lib ships the row unchecked (accepted:false) —
                      this marker says why, in host language, no grading. */}
                  {row.evidenceVerified === false && <div style={{ fontSize: 12, color: 'var(--carbon-muted)', marginTop: 2 }}>No supporting quote from the reply — check the message before applying this one.</div>}
                </div>
              </label>
            );
          })}
          <div className="actions-row" style={{ marginTop: 10, gap: 8 }}>
            <button className="mini" onClick={apply} disabled={acceptedCount === 0}>{acceptedCount === 0 ? 'Nothing selected' : ('Apply ' + acceptedCount + ' field' + (acceptedCount === 1 ? '' : 's'))}</button>
            <button className="mini" onClick={() => setResult(null)}>Discard</button>
          </div>
          {result.disclaimer && <div style={{ fontSize: 12, color: 'var(--carbon-muted)', fontStyle: 'italic', marginTop: 8 }}>{result.disclaimer}</div>}
        </div>
      )}
    </div>
  );
}

// Count-up micro-motion: numbers settle into place (ease-out cubic, no bounce).
function useCountUp(target, dur = 650, enabled = true) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    // Audit finding (2026-07-11): with no gate, this settles in under the
    // opaque boot splash and completes unseen — the one entrance motion the
    // daily-boot path had is invisible every day. Holding while disabled
    // (splash still up) leaves `prev.current` at its pre-boot value, so the
    // very next enabled run counts up from there — the reveal the splash's
    // fade was supposed to hand off to, now actually visible.
    if (!enabled) return undefined;
    const from = prev.current; prev.current = target;
    if (REDUCE_MOTION || target === null || target === undefined || isNaN(target) || from === target) { setV(target); return; }
    const start = typeof from === 'number' && !isNaN(from) ? from : 0;
    const t0 = performance.now(); let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    // rAF pauses in background tabs — without a floor the count freezes at
    // its previous value until the tab refocuses. Hidden → land instantly;
    // visible → a timeout backstop guarantees the final value regardless.
    if (typeof document !== 'undefined' && document.hidden) { setV(target); return; }
    raf = requestAnimationFrame(tick);
    const settle = setTimeout(() => setV(target), dur + 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, dur, enabled]);
  return v;
}


const kidsTotal = (gs) => (gs || []).reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
// ENGINE precedence (guestCountResolved): the CONFIRMED count wins, then the
// estimate, then the roster. (Audit fix: V2 wrote guestCount from the
// confirm-count panel but never read it back — tiles kept the old estimate.)
const guestNumber = e => Number(e.guestCount) || Number(e.guestEstimate) || (e.guests || []).length || 0;

const DOMAIN_LENS = { guests: 'Guests', budget: 'Budget', food: 'Food', vendors: 'Vendors', date: 'Plan', start: 'Guests' };

// The day-of ruling 331:61 STATE 3 — a solemn gathering (repast / memorial / homegoing)
// must not wear celebratory chrome: drop the count, soften the verbs ("You lead this" /
// "Continue when ready"), lean the calm serif, more void. Grounded in the event TYPE:
// Repast is a real, fully-authored somber playbook (repast.js), not a guess. Feeds the
// parity kit's `tone="solemn"`. See parity/MANIFEST.md fast-follow #1.
const SOLEMN_RE = /repast|memorial|funeral|celebration of life|homegoing|in memoriam/i;
function isSolemnEvent(event) {
  try { return SOLEMN_RE.test(String((event && event.type) || '') + ' ' + String((event && event.name) || '')); }
  catch { return false; }
}

// REBALANCE 2026-07-17 — the ASK vocabulary. The display slot speaks the next
// action in plain hand-holder words (2–4 words, ≤2 lines at display size); the
// panel beneath carries the specifics. Raw queue titles are card copy and can
// be proper nouns ("Confirm Semper Catering Co") — never display material.
const HERO_NOUN = { cater: 'caterer', dj: 'DJ', music: 'DJ', photo: 'photographer', video: 'videographer', flor: 'florist', flower: 'florist', venue: 'venue', rental: 'rentals', bar: 'bartender', cake: 'baker', transport: 'driver' };
function heroAskFor(a, event) {
  try {
    const t = String((a && a.title) || '').replace(/\.+$/, '').trim();
    const d = String((a && a.domain) || '').toLowerCase();
    if (d === 'budget' || /budget/i.test(t)) return 'Set your budget.';
    if (d === 'food' || /serving|menu|food/i.test(t)) return 'Decide the menu.';
    if (d === 'guests' || d === 'start' || /guest|who.s coming|rsvp/i.test(t)) return /rsvp/i.test(t) ? 'Nudge your RSVPs.' : 'Add who’s coming.';
    if (/start time/i.test(t)) return 'Confirm the start time.';
    if (d === 'date' || /pick (a|the) day|\bdate\b/i.test(t)) return 'Pick the day.';
    if (/location|venue|where/i.test(t)) return 'Add the location.';
    if (/conflict/i.test(t)) return 'Untangle your vendors.';
    const am = t.match(/^ask\s+.+?\s+about\s+(.{3,24})$/i);
    if (am) return 'Ask about ' + am[1].toLowerCase().replace(/\.+$/, '') + '.';
    if (/resolve .*decision|decisions? —|decisions? are past/i.test(t)) return 'Settle your decisions.';
    if (/(catering|guest|final)\s+count/i.test(t)) return 'Fix the catering count.';
    const vm = t.match(/^(confirm|book|call|chase|pay|reconfirm)\s+(.+)$/i);
    if (vm) {
      const verb = vm[1].charAt(0).toUpperCase() + vm[1].slice(1).toLowerCase();
      const rest = vm[2].toLowerCase();
      const v = ((event && event.vendors) || []).find(x => x && x.name && rest.includes(String(x.name).toLowerCase().slice(0, 6)));
      const catKey = v ? String(v.category || v.type || '').toLowerCase() : '';
      const nounKey = Object.keys(HERO_NOUN).find(k => catKey.includes(k) || rest.includes(k));
      return verb + ' your ' + (nounKey ? HERO_NOUN[nounKey] : 'vendor') + '.';
    }
    // A food-line buy ("Fried or baked chicken & baked ham — 28.5 lbs in 2 days")
    // carries an item title, never an instruction — the fallback rendered the dead
    // "Your next step." on it (audit 2026-07-22, W11). The foodFocus route names
    // the real job in plain words.
    if (a && a.route && a.route.foodFocus) return 'Get the food.';
    return t.length <= 26 ? t + '.' : 'Your next step.';
  } catch { return 'Your next step.'; }
}
// The record the panel names — only when it adds info beyond the ask (dedup:
// the ask owns the VERB, the panel owns the NOUN).
function heroRecord(a, ask) {
  try {
    const t = String((a && a.title) || '').replace(/\.+$/, '').trim();
    // Strip the leading verb AND the surrounding quotes: a decision-board "call" arrives
    // titled Resolve "the label", and dropping only the verb left the bare "quoted" name
    // showing in the hero (host "why is this in quotes" 2026-07-18).
    const record = t.replace(/^(confirm|book|call|pay|chase|set|plan|add|decide|pick|reconfirm|nudge|ask|fix|buy|resolve|settle)\s+/i, '').replace(/^["“”"']+|["“”"']+$/g, '').trim();
    const askTok = new Set(String(ask || '').toLowerCase().replace(/[^a-z\s’']/g, '').split(/\s+/));
    const adds = record.split(/\s+/).some(w => w.length > 2 && !askTok.has(w.toLowerCase()));
    return adds ? record.charAt(0).toUpperCase() + record.slice(1) : null;
  } catch { return null; }
}
// Path whisper labels for the panel's horizon footer.
function horizonLabel(a) {
  const d = String((a && a.domain) || '').toLowerCase();
  const map = { budget: 'the budget', food: 'the menu', guests: 'the guest list', date: 'the day', vendors: 'vendors', start: 'who’s coming' };
  if (map[d]) return map[d];
  const t = String((a && a.title) || '').replace(/\.+$/, '');
  return t.length <= 22 ? t.toLowerCase() : t.split(' ').slice(0, 3).join(' ').toLowerCase() + '…';
}

// A DUAL / compound event (type + secondaryType, e.g. a retirement that's ALSO a 50th
// birthday) reads as BOTH occasions everywhere it's listed — never just the primary type,
// which silently hid half of what the host is planning (host report 2026-07-16). Single
// events are unchanged. "Party" is trimmed the same way the create chips trim it.
const eventTypeLabel = (e) => {
  const prim = (e && e.type ? String(e.type) : '').trim();
  const sec = (e && e.secondaryType ? String(e.secondaryType) : '').trim();
  if (prim && sec && sec.toLowerCase() !== prim.toLowerCase()) {
    return prim.replace(' Party', '') + ' + ' + sec.replace(' Party', '');
  }
  return prim;
};

// Host-facing destination description. NEVER an internal id: the CTA fallback
// renders this verbatim ("Open vendors → vendor tdv-v2" reached a live hero —
// audit 2026-07-22, W5). Resolve the vendor's NAME; internal keys (focusField,
// foodFocus ids, taskId) say what KIND of spot they land on, or nothing.
function describeRoute(route, event) {
  if (!route || !route.tab) return null;
  const bits = [route.tab];
  if (route.planningView) bits.push(route.planningView);
  if (route.foodFocus) bits.push('the food list');
  if (route.vendorId) {
    const v = (((event && event.vendors) || []).find(x => x && x.id === route.vendorId)) || null;
    bits.push(v && v.name ? v.name : 'your vendor');
  }
  return bits.join(' → ');
}

// Occasion choices = the REAL playbook catalog (single source: HOST_TYPES and
// the free-text parser both live in lib/smartParseEvent now).

// Shelves: group the catalog by the taxonomy's REAL parent categories.
const TYPE_GROUPS = (() => {
  const groups = new Map();
  for (const t of HOST_TYPES) {
    const parent = (EVENT_TAXONOMY[t] && EVENT_TAXONOMY[t].parent) || 'More occasions';
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(t);
  }
  return [...groups.entries()];
})();

// Dietary tag vocabulary — was 3 separately-hand-typed 6-item copies inline
// (found in the 2026-07-11 food-plan audit) vs. legacy's 12-tag DIET_TAGS
// (App.js:2614). Consolidated to one list, corrected to 'Shellfish' (not
// legacy's 'Shellfish allergy' — the engine's own DIET_KEYWORDS table, lib/
// playbooks/index.js:1798, keys on 'Shellfish', so legacy's own guest-facing
// label silently never flags a shellfish line; that's a pre-existing legacy
// bug, not parity worth reproducing). The tags without a DIET_KEYWORDS entry
// (Egg/Soy allergy, Diabetic-friendly) still count toward headcount tracking
// — same honest limit legacy has for those.
const DIET_TAGS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Shellfish', 'Halal', 'Kosher', 'Alcohol-free', 'Egg allergy', 'Soy allergy', 'Diabetic-friendly'];
// Guest free-text "needs" → a DIET_TAG, so a per-guest RSVP note ("gluten
// free please") can be merged into dietCounts without retyping (parity:
// App.js:10831, tagFor).
const dietTagFor = (s) => {
  const t = String(s || '').trim().toLowerCase();
  if (!t) return null;
  return DIET_TAGS.find((tag) => {
    const tl = tag.toLowerCase();
    return tl === t || tl.startsWith(t) || (t.length > 2 && tl.startsWith(t.replace(/ (allergy|free)$/, '')));
  }) || null;
};

// Ros cue times are internal 24h "HH:MM" strings (playbookRunOfShow) — never
// host copy. This turns "23:40" into "11:40 PM"; anything that isn't a bare
// 24h clock (a host-typed "4:00 PM", a worded time) passes through untouched.
// timePhrase (lib/doItForMe) is NOT this: it answers "when is the event"
// (startTime / part-of-day), not "format this clock string".
const fmt12h = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  if (!m) return String(t || '').trim();
  const h = Number(m[1]);
  if (h > 23) return String(t).trim();
  return (h % 12 || 12) + ':' + m[2] + (h >= 12 ? ' PM' : ' AM');
};

// ── Sheet hero (host request 2026-07-11) — the ONE pattern every count-bearing
// sheet opens with: eyebrow, 38px star, warm honest mega-sub, optional grounding.
// Markup matches the food/vendors/guests heroes exactly; figures always come
// from the caller's real engine reads — this renders, it never derives.
function SheetHero({ eyebrow, star, tone, sub, grounding }) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)';
  // Composes the parity kit (Eyebrow → BigValue → Newsreader GuideLine) so every
  // sheet that uses SheetHero — space, seating, lodging, air, ground, and the rest —
  // shares the same calm Studio-Matte hero as food/budget/vendors. Anti-drift; the
  // tone still colors the value (ok/warn/danger). See parity/MANIFEST.
  return (
    <div style={{ padding: '2px 0 14px' }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <BigValue style={{ fontVariantNumeric: 'tabular-nums', ...(color !== 'var(--ink)' ? { color } : null) }}>{star}</BigValue>
      {sub ? <GuideLine style={grounding ? { marginBottom: 8 } : null}>{sub}</GuideLine> : null}
      {grounding ? <p className="grounding" style={{ margin: 0 }}>{grounding}</p> : null}
    </div>
  );
}

// ── Shared address autocomplete ──────────────────────────────────────────────
// ONE source so every address input in the app suggests the same way (host
// request: wire the autocomplete anywhere an address is input). Google Places
// when a key is present (localStorage 'ngw-google-places-key' /
// REACT_APP_GOOGLE_MAPS_KEY), else OSM Nominatim. Extracted from the venue
// field's original fetchAddrSugs so the venue and every other address field
// share the exact same provider + result shape.
export async function fetchAddressSuggestions(query) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];
  try {
    if (window.google && window.google.maps && window.google.maps.places) {
      return await new Promise(res => {
        const svc = new window.google.maps.places.AutocompleteService();
        svc.getPlacePredictions({ input: q, componentRestrictions: { country: 'us' } }, preds => {
          res((preds || []).slice(0, 5).map(p => ({ label: p.description, city: '' })));
        });
      });
    }
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=' + encodeURIComponent(q));
    const j = await r.json();
    return (Array.isArray(j) ? j : []).map(x => {
      const a = x.address || {};
      const city = a.city || a.town || a.village || a.hamlet || '';
      const short = String(x.display_name || '').split(',').slice(0, 3).join(',');
      return { label: short, city: city + (a.state ? ', ' + a.state : '') };
    });
  } catch { return []; }
}

// Reusable address input with its OWN debounced suggestion dropdown. Each
// instance keeps its own suggestions, so several address fields on one screen
// never share a dropdown. Controlled: pass value + onChange; onPick fires with
// the chosen {label, city} (defaults to onChange(label)).
function AddressField({ value, onChange, onPick, onEnter, placeholder, ariaLabel, className, style, inputStyle }) {
  const [sugs, setSugs] = useState([]);
  const timer = useRef(null);
  const run = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { setSugs(await fetchAddressSuggestions(q)); }, 380);
  };
  return (
    <div style={{ position: 'relative', flex: 1, ...style }}>
      <input className={className || 'field'} style={inputStyle} value={value} placeholder={placeholder}
        aria-label={ariaLabel} autoComplete="off"
        onChange={e => { onChange(e.target.value); run(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { onEnter(e.target.value); setSugs([]); } }} />
      {sugs.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {sugs.map((sg, si) => (
            <button key={si} type="button" className="later-row"
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
              onClick={() => { onPick ? onPick(sg) : onChange(sg.label); setSugs([]); }}>
              <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{sg.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// City / ZIP field with its own key-less suggestion dropdown. V2 had autocomplete
// on the VENUE field but not on the CITY field beside it — so the moment the app
// BLOCKED the host for a missing town, it stopped helping them type one. Worse,
// saveCity() rejects a bare city outright ("Springfield" could be any state), so
// the host was blocked, unaided, and then refused. Suggestions emit "City, ST",
// which is exactly the shape saveCity accepts.
//
// Ported from the legacy CityField (App.js): the ~29.7k-entry US city list in
// lib/usCitiesFull, lazy-loaded so it never bloats the bundle, and a CUSTOM
// dropdown rather than a native <datalist> — the native one is unreliable on
// mobile (host report 2026-06-12: "autocomplete not working on mobile").
// A ZIP still passes through as free text; the parse/reject rule is unchanged.
function CityField({ value, onChange, onPick, onEnter, placeholder, ariaLabel, style, inputStyle }) {
  const [cities, setCities] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => {
    if (cities) return;
    import('@app/lib/usCitiesFull').then(m => setCities(m.default || m)).catch(() => setCities([]));
  };
  const q = String(value || '').trim().toLowerCase();
  const matches = useMemo(() => {
    // 2-char floor: below that every list entry matches and the dropdown is noise.
    if (!cities || q.length < 2 || /^\d/.test(q)) return [];   // a ZIP needs no list
    const out = [];
    for (const c of cities) {
      if (c.toLowerCase().startsWith(q)) { out.push(c); if (out.length >= 8) break; }
    }
    // Fall back to substring so "annap" and "md" both find something.
    if (out.length < 8) {
      for (const c of cities) {
        if (out.length >= 8) break;
        if (!out.includes(c) && c.toLowerCase().includes(q)) out.push(c);
      }
    }
    return out;
  }, [cities, q]);
  const show = open && matches.length > 0 && matches[0].toLowerCase() !== q;
  return (
    <div style={{ position: 'relative', flex: 1, ...style }}>
      <input className="field" style={inputStyle} value={value} placeholder={placeholder}
        aria-label={ariaLabel} autoComplete="off"
        onFocus={() => { load(); setOpen(true); }}
        onChange={e => { load(); setOpen(true); onChange(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { setOpen(false); onEnter(e.target.value); } }} />
      {show && (
        <div style={{ marginTop: 6 }}>
          {matches.map((c, si) => (
            <button key={si} type="button" className="later-row"
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
              onClick={() => { setOpen(false); onPick ? onPick(c) : onChange(c); }}>
              <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{c}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HostShellV2() {
  const [stage, setStage] = useState('plan');
  const [eventId, setEventId] = useState(BOOT_EVENT_ID);
  // EVERY event created here (array — creating a second never overwrites the
  // first). Each stores itself whole; edits land directly on the array entry.
  const [customs, setCustoms] = useState(CUSTOM_EVENTS_AT_LOAD);
  const isCustomEventId = (id) => customs.some(c => c && c.id === id);
  const activeCustom = customs.find(c => c && c.id === eventId) || null;
  // First-run welcome (one-time): a brand-new host — nothing real in
  // 'ngw-events', no V2-created event, never welcomed — gets ONE calm screen
  // of orientation instead of cold-landing inside a sample event. Decision
  // logic lives in lib/welcomeGate (pure, unit-tested); clearing LS_WELCOMED
  // re-arms it for a host who still has no real events.
  const [welcome, setWelcome] = useState(() => {
    // ?welcome=1 forces the gate for review on any device (host request:
    // "make sure the splash gets me here" — on a device with stored events
    // or the welcomed flag, the gate is otherwise correctly suppressed, so
    // this is the only way to watch splash → welcome end-to-end there).
    try { if (new URLSearchParams(window.location.search).has('welcome')) return true; } catch { /* ancient browser — fall through */ }
    let seen = false; try { seen = localStorage.getItem(LS_WELCOMED) === '1'; } catch { seen = false; }
    return shouldShowWelcome({ appEvents: APP_EVENTS, customEvent: CUSTOM_EVENTS_AT_LOAD[0] || null, welcomed: seen });
  });
  const dismissWelcome = (dest) => {
    try { localStorage.setItem(LS_WELCOMED, '1'); } catch { /* private mode — shows again next load, never blocks */ }
    setWelcome(false);
    if (dest === 'create') setStage('create');
  };
  // ── Boot splash: Event Boss DARK CARBON (R13 prototype, host-directed
  // 2026-07-11 — supersedes the R11b carve). 'up' → 'leaving' (200ms fade,
  // app interactive) → 'gone' (unmounted). The app renders BENEATH it the
  // whole time — the splash only ever delays what the host sees, never what
  // exists. Any tap ends it early. It lives in this component only, so the
  // ?rsvp= / ?vendor= public paths (routed in main.jsx before this shell
  // mounts) can never show it.
  // Audit finding (2026-07-11): no leader shows a multi-second brand film on
  // EVERY cold boot — Apple's HIG explicitly rejects launch-screen theater;
  // Arc/Family run their long choreography once. So: full ~4.95s
  // choreography only the first time this browser has booted the app, OR
  // after a genuine absence; every boot in between gets a short ~1.2s
  // settled hold (.splash-quick pins the entrance to its resolved end-state
  // — same asset the reduced-motion path already builds — while the glow
  // settle and dot breathe keep running, so it reads as "the mark, briefly"
  // rather than a hard freeze-frame). Reduced motion overrides both: always
  // the 400ms still frame.
  // POLICY (10+ reaudit, boot-frequency track): researched against Apple HIG
  // (forbids a launch screen from being a branding moment at all — every
  // load, forever), Android's SplashScreen API (bounded ≤1s, but shown on
  // EVERY cold/warm start, never suppressed permanently), and Superhuman
  // (no brand moment to reason about — solved via raw speed). No leader or
  // platform precedent supports "full film once ever, then permanently
  // stripped, no way back" — the closest real analog found was onboarding
  // tutorials (different thing: a walkthrough, not a brand splash). This
  // product's own standard is a deliberate premium/ceremonial moment
  // though, not a bare utility screen, so the fix isn't "never show it
  // again" — it's "earn it again after a real absence." LS_SPLASH_SEEN now
  // stores a TIMESTAMP (last full-film boot), not a boolean; the full film
  // replays once SPLASH_REPLAY_DAYS have passed since — a "welcome back"
  // beat instead of a one-time-forever gate.
  const LS_SPLASH_SEEN = 'ngw-v2-splash-seen';
  // sessionStorage fallback: if localStorage is unavailable (locked-down
  // private modes, storage disabled), this at least degrades to the
  // quick-cut for the REST of this session instead of the full film on
  // every single reload within it.
  const SS_SPLASH_SEEN = 'ngw-v2-splash-seen-session';
  const SPLASH_REPLAY_DAYS = 21;
  const [splash, setSplash] = useState('up');
  const splashTimer = useRef(null);
  const endSplash = () => setSplash(s => {
    if (s !== 'up') return s;
    const now = new Date().toISOString();
    try { localStorage.setItem(LS_SPLASH_SEEN, now); } catch {
      try { sessionStorage.setItem(SS_SPLASH_SEEN, now); } catch { /* nothing persists — full film every time, never blocks */ }
    }
    // Cross-device consistency: signed-in hosts push the timestamp to the
    // synced profile, so a second device inherits "already seen recently"
    // instead of replaying the full film there too (see the pull side in
    // the profile-hydration effect below).
    if (session) { try { patchProfile({ splashLastSeen: now }); } catch { /* best-effort, localStorage already holds it */ } }
    return 'leaving';
  });
  // ?splashhold keeps it up indefinitely for design review (any tap still
  // skips) — pairs with ?welcome for end-to-end boot review. ?splashfull
  // forces the first-boot-length film even on a return boot (same review
  // need, opposite direction from splashhold). Read once at component scope
  // so both the dismiss timer and the render's CSS class agree.
  let splashHold = false, splashForceFull = false;
  // ELEGANT-MINIMAL PORT (2026-07-17, host "start the port" + "test both live"):
  // ?elegant=1 opts the PLAN hero into the elegant-minimal composition (more air,
  // the guide-voice sentence, a continuous hairline progress rule). ?voice=serif|sans
  // flips the guide-voice treatment so the host can drive both against the same real
  // board and rule on the serif doctrine (styles.css:8) from the live render, not a
  // Figma comp. Production is untouched unless the flag is present.
  // HUMAN VOICE = UNIFIED NEWSREADER (host ruling 2026-07-17, from the live comparison):
  // one optical serif superfamily carries the whole human voice — the event NAME (identity)
  // and the GUIDE voice (reassurance) — while sans keeps the instruction ASK and the facts.
  // Newsreader chosen over Fraunces for the Apple-register calm (warmth from the italic, not
  // the letterform). ?voice=sans stays an escape hatch for A/B.
  let elegantMode = false, elegantVoice = 'newsreader';
  try {
    const q = new URLSearchParams(window.location.search);
    splashHold = q.has('splashhold');
    splashForceFull = q.has('splashfull');
    // Elegant is THE chosen hero direction (grounded-action loop) and is now the
    // DEFAULT — the v2 → v3 cut (host approved 2026-07-21). `?elegant=0` is the
    // v2 fallback / escape hatch; reverting this one line makes v2 default again.
    elegantMode = q.get('elegant') !== '0';
    if (q.get('voice') === 'sans') elegantVoice = 'sans';
  } catch { /* leave both false */ }
  const splashSeenRecently = (() => {
    const now = Date.now();
    const withinWindow = (iso) => {
      const t = Date.parse(iso);
      return Number.isFinite(t) && (now - t) < SPLASH_REPLAY_DAYS * 86400000;
    };
    try {
      const local = localStorage.getItem(LS_SPLASH_SEEN);
      if (local) return withinWindow(local);
    } catch { /* fall through to the session fallback below */ }
    try {
      const sess = sessionStorage.getItem(SS_SPLASH_SEEN);
      if (sess) return withinWindow(sess);
    } catch { /* nothing available — full film every time, never blocks */ }
    return false;
  })();
  const splashQuick = splashSeenRecently && !splashForceFull;
  useEffect(() => {
    if (splash === 'up') {
      let reduced = false;
      try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { reduced = false; }
      // 1000ms, not 1200 — matches Android's own SplashScreen API bound
      // exactly (the one concrete numeric target the vs-leaders research
      // found) rather than sitting 200ms over it for no reason.
      splashTimer.current = setTimeout(endSplash, splashHold ? 600000 : reduced ? 400 : splashQuick ? 1000 : 2200);
    } else if (splash === 'leaving') {
      splashTimer.current = setTimeout(() => setSplash('gone'), 220);
    }
    return () => clearTimeout(splashTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splash]);
  // Belt-and-suspenders skip: the .splash div's own onPointerDown/onClick are
  // correct, but live testing (host reports + automated coordinate clicks)
  // found real taps don't reliably reach them — some hit-testing/stacking path
  // lets a tap land without triggering them, even though a raw DOM .click()
  // always works. A WINDOW-level CAPTURE listener fires before anything else
  // on the page can intercept the event, so skip works regardless of what
  // actually received it. Keydown too, cheaply, while we're here. Scoped to
  // splash==='up' only — nothing to skip once it's already leaving/gone.
  useEffect(() => {
    if (splash !== 'up') return undefined;
    const onSkip = () => endSplash();
    // Keys: skip on real keys only (ignore bare modifiers — Cmd+L etc.
    // shouldn't consume the brand beat) and eat the keystroke so it can't
    // simultaneously act on anything beneath.
    const onKey = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault();
      endSplash();
    };
    window.addEventListener('pointerdown', onSkip, true);
    window.addEventListener('click', onSkip, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onSkip, true);
      window.removeEventListener('click', onSkip, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [splash]);
  // The overlay element — rendered inside .stagewrap in BOTH shell returns
  // (welcome gate and main shell) so a re-render across that boundary can't
  // drop it mid-beat. Markup is the Dark Carbon stage: drifting glow layer,
  // neumorphic wordmark (no gloss inlay — that was the R11b carve's device),
  // the period bead that drops in last, caps, two-line tagline.
  const splashEl = splash !== 'gone' ? (
    <div
      className={'splash' + (splash === 'leaving' ? ' splash-leaving' : '') + (splashQuick ? ' splash-quick' : '')}
      /* both handlers, idempotent state guard: pointerdown answers a real
         finger/mouse instantly; click catches synthetic + assistive input
         that never emits pointer events (found live: automated clicks
         skipped pointerdown entirely) */
      onPointerDown={endSplash}
      onClick={endSplash}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); endSplash(); } }}
      /* Exposed to AT as a real actionable control, not hidden: the app
         beneath is now inert while this is up, so a screen-reader user's
         first stop is a named, activatable "skip intro" — not silence
         over content they can't perceive yet. */
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
    >
      <div className="sp-glow" />
      <div className="sp-stack">
        <div className="sp-carv sp-l1">Event</div>
        <div className="sp-l2row">
          <div className="sp-carv sp-l2">Boss</div>
          <span className="sp-dot" />
        </div>
      </div>
      <div className="sp-caps">EVENT BOSS</div>
      <div className="sp-line">
        <span className="sp-line-1">the details are ours.</span>
        <span className="sp-line-2">the day is yours.</span>
      </div>
    </div>
  ) : null;
  const [patch, setPatch] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_PATCH(BOOT_EVENT_ID))) || {}; } catch { return {}; }
  });
  const [toastMsg, setToastMsg] = useState(null);
  // Money-move undo (Sprint 1): a toast can carry ONE inline action — a
  // single-level snapshot restore of just the fields the write changed. Not a
  // history system; only money-moving writes (the budget number) set it.
  const [toastAction, setToastAction] = useState(null); // { label, fn } | null
  // Confirmation semantics (CONFIRM-GREEN, 2026-07-16): one tone drives the toast's
  // color so "you did it" reads green everywhere from ONE place, instead of per-call
  // styling. 'ok' ⇒ green success; null/undefined ⇒ the neutral pill (errors keep it).
  const [toastTone, setToastTone] = useState(null);
  const [handledOpen, setHandledOpen] = useState(false);
  const toastTimer = useRef(null);
  const appRef = useRef(null);

  // Create — ONE smart input; the real resolvers parse it. Form fields exist
  // only as corrections layered over the parse (host-shell logic, not a form).
  const [smartText, setSmartText] = useState('');
  const [fName, setFName] = useState('');
  const [fCity, setFCity] = useState(''); // town for weather + maps, asked at creation
  const [fType, setFType] = useState(null);
  const [fDate, setFDate] = useState('');
  const [fGuests, setFGuests] = useState(null);
  const [fBudget, setFBudget] = useState(null);
  const [fIsDestination, setFIsDestination] = useState(null);
  const [createEdit, setCreateEdit] = useState(null); // which correction editor is open
  // "Change an answer" re-runs assemble over the SAME event — this holds its
  // id so the correction replaces it in the store instead of appending a
  // duplicate. Cleared on consume and whenever the host switches events.
  const redoEventId = useRef(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [venueDraft, setVenueDraft] = useState('');
  const [venueErr, setVenueErr] = useState(null);
  // Venue validation: a real place has letters and substance — not "", "1",
  // or stray digits. Same gate the address row uses.
  const validPlace = (v) => {
    const t = String(v || '').trim();
    if (/^\d{5}(-\d{4})?$/.test(t)) return true; // a ZIP is a real place
    return t.length >= 3 && /[a-zA-Z]/.test(t) && !/^\d+$/.test(t);
  };
  const [cityDraft, setCityDraft] = useState('');
  const [addrSugs, setAddrSugs] = useState([]);
  const [pendingCity, setPendingCity] = useState('');
  const addrTimer = useRef(null);
  useEffect(() => {
    // Google Places upgrades this input automatically when a key is present
    // (localStorage 'ngw-google-places-key') — until then OSM answers.
    try {
      const k = localStorage.getItem('ngw-google-places-key') || process.env.REACT_APP_GOOGLE_MAPS_KEY;
      if (k && !window.google) {
        const sc = document.createElement('script');
        sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(k) + '&libraries=places';
        document.head.appendChild(sc);
      }
    } catch {}
  }, []);
  const fetchAddrSugs = (q) => {
    clearTimeout(addrTimer.current);
    const query = String(q || '').trim();
    if (query.length < 3) { setAddrSugs([]); return; }
    addrTimer.current = setTimeout(async () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          const svc = new window.google.maps.places.AutocompleteService();
          svc.getPlacePredictions({ input: query, componentRestrictions: { country: 'us' } }, (preds) => {
            setAddrSugs((preds || []).slice(0, 5).map(p => ({ label: p.description, city: '' })));
          });
          return;
        }
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=' + encodeURIComponent(query));
        const j = await r.json();
        setAddrSugs((Array.isArray(j) ? j : []).map(x => {
          const a = x.address || {};
          const city = a.city || a.town || a.village || a.hamlet || '';
          const short = String(x.display_name || '').split(',').slice(0, 3).join(',');
          return { label: short, city: city + (a.state ? ', ' + a.state : '') };
        }));
      } catch { setAddrSugs([]); }
    }, 380);
  };
  const pickAddr = (sug) => {
    setVenueDraft(sug.label);
    setPendingCity(sug.city || '');
    setAddrSugs([]);
  };
  const saveVenue = () => {
    if (!validPlace(venueDraft)) { setVenueErr('Give guests a real place — a name or an address, not just a number.'); return; }
    const v = venueDraft.trim();
    // pendingCity comes from the address-autocomplete pick (already "City, ST"
    // when Nominatim returned a state) — same strict gate as saveCity so a
    // bare-city result never slips through this second write path either.
    const parsedCity = pendingCity ? parseVenueLocation(pendingCity) : null;
    patchEvent({
      venue: v,
      venueKind: /backyard|house|home|yard|place|garden/i.test(v) ? 'home' : (event.venueKind || ''),
      ...(parsedCity
        ? (parsedCity.zip ? { venueCity: parsedCity.zip } : { venueCity: parsedCity.city, venueState: parsedCity.state })
        : {}),
    }, 'Venue on the plan — invites, maps, and the rain note now carry it.');
    setVenueErr(null); setVenueDraft(''); setPendingCity(''); setAddrSugs([]);
  };
  // At-home venues resolve the ORIGINAL's venue blocker via venueCity (the
  // same field weather geocoding reads) — so home events get a city ask.
  const needsCity = () => event.venueKind === 'home' && !String(event.venueCity || '').trim();
  const saveCity = () => {
    const c = cityDraft.trim();
    // Bare-city geocoding is genuinely ambiguous — "Springfield", "Arlington",
    // and dozens of other US city names exist in multiple states, and the
    // weather geocode (limit=1) will silently resolve to the wrong one with
    // no error. Require "City, ST" or a ZIP; reject a bare city outright
    // rather than accept something the app can't actually locate.
    const parsed = parseVenueLocation(c);
    if (!parsed) { toast('Add the state or ZIP too — “Annapolis, MD” or “21401” — a city name alone could be in any state.'); return; }
    patchEvent(
      parsed.zip ? { venueCity: parsed.zip } : { venueCity: parsed.city, venueState: parsed.state },
      'City noted — weather and the venue check now line up.'
    );
    setCityDraft('');
  };
  // Voice input (Web Speech API) — the browser's own recognizer; nothing fake.
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  // continuous:true (below) means the browser's own endpointer no longer ends
  // the session on a pause — good for not cutting hosts off mid-sentence, but
  // it also means nothing stops a genuinely forgotten open mic. A soft idle
  // timer is the app-level backstop: resets on every real result, only fires
  // after real silence, never mid-sentence.
  const VOICE_IDLE_MS = 20000;
  const voiceIdleTimer = useRef(null);
  const clearVoiceIdleTimer = () => { if (voiceIdleTimer.current) { clearTimeout(voiceIdleTimer.current); voiceIdleTimer.current = null; } };
  const startVoice = () => {
    if (!SpeechRec) { toast('Voice input isn’t available in this browser — type it instead.'); return; }
    try {
      const r = new SpeechRec();
      recogRef.current = r;
      // continuous: true — non-continuous mode ends the session on the browser's
      // OWN first-pause detection (its endpointer), not an app timer; a host
      // pausing mid-sentence ("crab feast for... twenty... in the backyard")
      // was getting cut off before finishing. "tap to stop" only makes sense
      // once the app, not the browser, decides when listening ends.
      r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (ev) => {
        clearVoiceIdleTimer();
        voiceIdleTimer.current = setTimeout(() => { toast('Stopped listening — quiet for a while.'); stopVoice(); }, VOICE_IDLE_MS);
        const text = Array.from(ev.results).map(x => x[0] && x[0].transcript).join(' ').trim();
        if (text) { setSmartText(text); setFType(null); setCreateEdit(null); }
      };
      r.onend = () => { clearVoiceIdleTimer(); setListening(false); };
      r.onerror = () => { clearVoiceIdleTimer(); setListening(false); toast('Couldn’t hear that — try again or type it.'); };
      setListening(true);
      r.start();
      voiceIdleTimer.current = setTimeout(() => { toast('Stopped listening — quiet for a while.'); stopVoice(); }, VOICE_IDLE_MS);
      feedback('act');
    } catch { setListening(false); toast('Voice input didn’t start — type it instead.'); }
  };
  const stopVoice = () => { clearVoiceIdleTimer(); try { recogRef.current && recogRef.current.stop(); } catch {} setListening(false); };
  const [revealed, setRevealed] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // choreography: 0 thinking → 5 done
  const revealCtaRef = useRef(null); // a11y: focus lands here when the reveal finishes
  const revealTimers = useRef([]);
  const clearRevealTimers = () => { revealTimers.current.forEach(clearTimeout); revealTimers.current = []; };
  useEffect(() => clearRevealTimers, []);
  const [typeOpen, setTypeOpen] = useState(false);   // occasion browser: collapsed until asked
  const [typeQuery, setTypeQuery] = useState('');

  // Type-ahead over the catalog, backed by the REAL alias resolver — "bbq",
  // "crab boil", "40th" all resolve through the taxonomy's own regexes.
  const typeMatches = typeQuery.trim() ? (() => {
    const q = typeQuery.trim().toLowerCase();
    let canon = null;
    try { canon = resolveCanonicalType(typeQuery); } catch { canon = null; }
    const list = HOST_TYPES.filter(t => t.toLowerCase().includes(q));
    if (canon && HOST_TYPES.includes(canon) && !list.includes(canon)) list.unshift(canon);
    return list;
  })() : null;

  const pickType = (t) => {
    setFType(t); setFBudget(null); setTypeOpen(false); setTypeQuery('');
  };

  // Smart parse — extracted to lib/smartParseEvent (single, unit-tested
  // source: every extraction here used to be verifiable only by hand in a
  // live browser tab).
  const parsed = useMemo(() => parseSmartEventText(smartText), [smartText]);

  // Effective values: manual correction wins, then the parse, then the
  // playbook's own typical (host-shell defaulting — never a blank form).
  const effType = fType || parsed.type || null;
  const pbTypical = effType ? playbookTypicalGuests(effType) : null;
  const effGuests = (fGuests ?? parsed.guests) ?? pbTypical;
  const effDate = fDate || parsed.date || '';
  const effName = fName || parsed.honoree || '';
  // A real "in Santa Fe, New Mexico" match pre-fills the town field the same
  // way a typical guest count pre-fills — visible, editable, never silently
  // final until "Put my plan together."
  const effCityText = fCity.trim() || (parsed.venueCity ? (parsed.venueState ? parsed.venueCity + ', ' + parsed.venueState : parsed.venueCity) : '');
  const effBudget = fBudget ?? parsed.budget ?? null;
  const effIsDestination = fIsDestination ?? !!parsed.isDestination;
  const dstatC = eventDateStatus(effDate || null);
  const expectC = expectedFromPlanned(effGuests, effType, (() => { try { return effType ? getPlaybook(effType) : null; } catch { return null; } })());

  // Created events resolve from LIVE state first (the ALL_SAMPLES copy is a
  // load-time snapshot); they store themselves whole, so no patch overlay.
  const base = activeCustom || ALL_SAMPLES.find(e => e.id === eventId) || hydratedEvents.find(e => e.id === eventId) || FALLBACK;
  const event = useMemo(() => ({ ...(base || FALLBACK), ...(activeCustom ? {} : patch) }), [base, patch, activeCustom]);

  // ── Regional price factor (queue item 3) — the production pipeline:
  // getFoodPriceFactor via the API base (BLS regional). State comes ONLY from
  // an explicit ', XX' in venueCity — never guessed. Neutral 1.0 otherwise.
  const [foodPP, setFoodPP] = useState({ priceFactor: 1, priceContext: null });
  useEffect(() => {
    let dead = false;
    const m = /,\s*([A-Za-z]{2})\s*$/.exec(String(event.venueCity || ''));
    const state = (m ? m[1].toUpperCase() : null) || (profile && profile.state ? String(profile.state).toUpperCase() : null);
    if (!isFoodPricesConfigured() || !state) { setFoodPP({ priceFactor: 1, priceContext: null }); return undefined; }
    (async () => {
      try {
        const d = await getFoodPriceFactor({ state });
        if (!dead) setFoodPP({ priceFactor: d.factor || 1, priceContext: d.factor !== 1 ? (d.regionLabel + (d.month ? ' · ' + d.month : '') + ' · ' + d.source) : null });
      } catch { if (!dead) setFoodPP({ priceFactor: 1, priceContext: null }); }
    })();
    return () => { dead = true; };
  }, [event.id, event.venueCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Experience Context (PC-1 canonical): unlocks blockers + continuity ──
  // ── The production profile (ngw-profile — the SAME key the original app +
  // Supabase studio_settings hydrate). Host name signs the drafts,
  // hostIntelligence feeds attendance learning. V2 writes MERGE-ONLY so every
  // production field it doesn't know about survives untouched; the original
  // app's own debounced cloud save picks the changes up next time it runs.
  const [profile, setProfileState] = useState(() => { try { return JSON.parse(localStorage.getItem('ngw-profile')) || null; } catch { return null; } });
  // Cross-device resume pointer (build-map #3): the account remembers the last
  // event the host was in; on a fresh device we follow it once it resolves.
  // resumePointer (STATE, so setting it re-runs the follow effect) holds the
  // cloud value until the target event is available; didResume ensures we only
  // auto-follow once and never yank a host who has already picked here.
  const [resumePointer, setResumePointer] = useState(null);
  const didResume = useRef(false);
  // ── Session (the SAME Supabase client + storage the original app uses —
  // signing in anywhere on this origin signs in everywhere on it).
  const [session, setSession] = useState(null);
  const [hydratedEvents, setHydratedEvents] = useState([]); // real events pulled from cloud that weren't on this device at load
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    let dead = false;
    // On sign-in, pull the cloud profile (studio_settings) into localStorage +
    // state — cloud wins, so a fresh device inherits the host's real identity.
    const hydrate = () => {
      cloudLoadProfile().then(p => {
        if (dead || !p) return;
        setProfileState(p);
        // Build-map #3: stash the account's last-viewed event; the resume effect
        // below follows it once the event resolves and only if the host hasn't
        // already switched away from the boot event on this device.
        if (p.lastEventId) setResumePointer(p.lastEventId);
        // Cross-device consistency (10+ reaudit, boot-frequency track): adopt
        // the cloud's splashLastSeen if it's more recent than (or absent
        // from) this device's own flag, so a second device the host signs
        // into doesn't replay the full film when they've already seen it
        // recently elsewhere. Doesn't change THIS boot (already decided at
        // mount, before any network round-trip could answer) — takes effect
        // starting next load, which is the honest limit of a synchronous,
        // no-network-wait splash decision.
        if (p.splashLastSeen) {
          try {
            const localTs = localStorage.getItem(LS_SPLASH_SEEN);
            if (!localTs || Date.parse(p.splashLastSeen) > Date.parse(localTs)) {
              localStorage.setItem(LS_SPLASH_SEEN, p.splashLastSeen);
            }
          } catch { /* best-effort — worst case this device just replays once more */ }
        }
      }).catch(() => {});
      // Pull cloud events into ngw-events; if any are new to this device, nudge.
      cloudLoadEvents().then(evs => {
        if (dead || !Array.isArray(evs)) return;
        // SYNC-HONESTY-1: a successful cloud pull is real evidence every
        // returned event is in the cloud — stamp them synced. Sign-in is also
        // the moment any writes queued while offline/signed-out become
        // flushable, so retry the queue right here rather than waiting for
        // the 'online' event (which won't fire — the connection never dropped).
        try { markEventSynced(evs.map(e => e && e.id).filter(Boolean)); } catch { /* stamping is best-effort, never blocks hydration */ }
        flushSync().then(res => {
          if (!dead && res && res.flushed > 0) {
            toast(res.flushed + (res.flushed === 1 ? ' change' : ' changes') + ' synced to your account.');
          }
        }).catch(() => {});
        const known = new Set((APP_EVENTS || []).map(e => e && e.id));
        // Events created in THIS shell already live in its own store — their
        // cloud copies must not come back as a second "synced" row. Read the
        // store fresh: sign-in can happen after a creation this session.
        try { (JSON.parse(localStorage.getItem(LS_CUSTOMS)) || []).forEach(e => { if (e && e.id) known.add(e.id); }); } catch { /* unreadable — worst case a duplicate row, never data loss */ }
        const fresh = evs.filter(e => e && e.id && !known.has(e.id)
          && String(e.recordKind || 'host_event') === 'host_event' && !/^demo-/.test(String(e.id)) && String(e.name || '').trim());
        if (fresh.length) setHydratedEvents(fresh);
        // Welcome-gate re-eval (engine-gap NEW-5): shouldShowWelcome was
        // decided ONCE at load, before the cloud could answer — so a signed-in
        // host on a fresh device got welcomed as brand-new. The moment
        // hydration lands anything genuinely theirs (same isRealHostEvent
        // predicate the load-time gate uses), the welcome stands down. The
        // ngw-v2-welcomed flag is left alone: real events, not the flag, end
        // the welcome here — and loadEvents already persisted them locally,
        // so the load-time gate agrees on the next visit.
        if (evs.some(isRealHostEvent)) setWelcome(false);
      }).catch(() => {});
    };
    supabase.auth.getSession().then(({ data }) => {
      const s = data && data.session ? data.session : null;
      if (!dead) { setSession(s); if (s) hydrate(); }
    }).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (!dead) { setSession(s || null); if (s) hydrate(); } });
    return () => { dead = true; try { sub && sub.subscription && sub.subscription.unsubscribe(); } catch { /* gone */ } };
  }, []);
  // SYNC-HONESTY-1: when the connection comes back, retry anything queued
  // while offline. installOnlineFlush is a no-op when nothing's queued.
  useEffect(() => installOnlineFlush(res => {
    if (res && res.flushed > 0) toast(res.flushed + (res.flushed === 1 ? ' change' : ' changes') + ' synced to your account.');
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sendMagicLink = async () => {
    const em = authEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('A real email address — the sign-in link goes there.'); return; }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: authRedirectUrl() } });
      if (error) throw error;
      setAuthSent(true);
    } catch (e) {
      // Real error text when Supabase gives us one (rate limit, invalid
      // domain, etc.) instead of one blanket message for every failure mode —
      // a host stuck here has no other signal of what actually went wrong.
      toast((e && e.message) || 'Couldn’t send the link — try again in a minute.');
    }
    setAuthBusy(false);
  };
  // authSent had no way back to the form (found in the per-screen audit):
  // once set, the sheet was stuck on "Check your email" for the rest of the
  // session — no resend, no "wrong address, try again," no way out short of
  // reloading the app. This is the only place authSent is ever reset.
  const resetAuthSent = () => { setAuthSent(false); };

  const patchProfile = (fields, msg) => {
    let next = null;
    try {
      const cur = JSON.parse(localStorage.getItem('ngw-profile')) || {};
      next = { ...cur, ...fields };
      localStorage.setItem('ngw-profile', JSON.stringify(next));
    } catch { next = { ...(profile || {}), ...fields }; }
    setProfileState(next);
    // Push to the cloud when signed in — no longer dependent on the main app's
    // debounced save. Fire-and-forget; saveProfile already wrote localStorage.
    if (next && session) { try { cloudSaveProfile(next); } catch { /* offline — localStorage holds it */ } }
    if (msg) toast(msg);
  };
  const ctx = useMemo(() => { try { return buildExperienceContext(event, profile, 1); } catch { return null; } }, [event, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── THE REAL ENGINE ──
  const plan = useMemo(() => {
    try { return eventPlan(event, ctx); }
    catch (err) { return { _error: String(err), nextActions: [], worries: [], setAside: [], progress: { done: 0, total: 0 }, handled: [], vendorReadinessRollup: null }; }
  }, [event, ctx]);

  // Blockers (the Reveal's own stage builder, ongoing view), decision board,
  // capacity, helpers, risks, and the wins — all production functions.
  const blockers = useMemo(() => { try { return unresolvedBlockerStages(ctx) || []; } catch { return []; } }, [ctx]);
  const venueBlockerShown = blockers.some(b => /venue/i.test(String(b && b.title || '')));
  // A foundational blocker that is a real PICK (fieldKey + options, e.g. Ceremony Timing) is a
  // decision — it belongs in the grounded loop as a hero DESTINATION, not stranded as a trailing
  // below-fold card that leaves the hero falsely claiming "nothing needs you". Surface each as a
  // pseudo-action so it flows through the queue → hero decopt → roll-to-next. Venue-type blockers
  // (free-entry inputs, no options) stay in the below-fold blockers.map. Elegant loop reads these.
  const blockerDecisions = useMemo(() => (blockers || [])
    .filter(b => b && b.fieldKey && Array.isArray(b.options) && b.options.length && !/venue/i.test(String(b.title || '')))
    .map(b => ({ id: 'blocker:' + b.fieldKey, title: b.title, ask: b.nextDecision || ('Decide the ' + String(b.title || '').toLowerCase() + '.'), consequence: b.what || null, kind: 'decision', domain: 'decision', level: 'attention' })),
    [blockers]);
  useEffect(() => {
    try {
      console.debug('[v2ctx]', event.id, 'ctx:', !!ctx, '· identity:', ctx && ctx.eventIdentity && ctx.eventIdentity.primaryEventType,
        '· blockers:', blockers.length, '· priority:', plan && plan.planningState && plan.planningState.currentPriority, '· compound:', ctx && ctx.compound, '· reasoning:', ctx && ctx.reasoning, '· activeRisks:', ctx && (ctx.activeRisks || []).length);
    } catch {}
  }, [event.id, ctx, blockers, plan]);
  // LEARNING-1 (roadmap #2): hand the board the host PROFILE so it can ground the
  // headcount row in learned turnout (attendanceAdjustment — the same gated/clamped reader
  // the food plan already trusts). No profile / cold-start host ⇒ board is byte-identical.
  const decisionBoard = useMemo(() => {
    try {
      const b = playbookDecisionBoard(event, undefined, profile) || { open: [], locked: [] };
      // GROUNDED (dogfood 2026-07-19): once the host has SET a venue, the "at home / restaurant /
      // hall" venue-KIND decision is already answered by the real venue — surfacing it (with a
      // static playbook default that can CONTRADICT the set venue, e.g. proposing "Restaurant
      // private room" over a booked banquet hall) violates the grounding doctrine. Drop it from
      // the open board when a venue is on file; the venue is the source of truth.
      if (b && Array.isArray(b.open) && String((event && event.venue) || '').trim()) {
        return { ...b, open: b.open.filter(d => !(d && (d.id === 'venue' || /at home.*(restaurant|venue|workplace)/i.test(String(d.label || '')))) ) };
      }
      return b;
    } catch { return { open: [], locked: [] }; }
  }, [event, profile]);
  // "show the rest" for a paced calls board — mirrors queueOpen's expander pattern.
  const [callsOpen, setCallsOpen] = useState(false);
  // The open board AS THE HOST SEES IT — their pins floated, then the engine's
  // order. Hoisted to one place so the reassurance copy and the rows below can't
  // disagree about what's actually on screen (they did: the copy promised a paced
  // board while every row rendered).
  const callsOrdered = useMemo(() => {
    const raw = decisionBoard.open || [];
    const pins = Array.isArray(event.decisionPins) ? event.decisionPins.filter(Boolean) : [];
    if (!pins.length) return raw;
    return raw.map((r, i) => ({ r, i })).sort((a, b) => {
      const pa = pins.indexOf(a.r.id); const pb = pins.indexOf(b.r.id);
      const ra = pa === -1 ? Infinity : pa; const rb = pb === -1 ? Infinity : pb;
      return ra !== rb ? ra - rb : a.i - b.i;
    }).map((x) => x.r);
  }, [decisionBoard, event.decisionPins]);
  // EMOTION-STATE, honestly rendered. computeHostAdaptation already shrinks an
  // underwater host's first foreground to a runway-sized few (focusCount, staged)
  // — "overwhelm paces even a non-hand-held host", per the engine. This shell
  // ignored it and rendered the whole list under copy that said otherwise. Fold
  // ONLY when the engine says to AND it actually removes rows, so a calm board
  // stays byte-identical (additive) and the copy is never an overclaim.
  const callsFocus = (() => {
    const ha = decisionBoard.hostAdaptation;
    if (!ha || !ha.overwhelm || !ha.staged) return null;
    const n = Number(ha.focusCount);
    return Number.isFinite(n) && n > 0 && n < callsOrdered.length ? n : null;
  })();
  const callsFolded = callsFocus != null && !callsOpen;
  const capacity = useMemo(() => { try { return playbookCapacity(event); } catch { return null; } }, [event]);
  // deriveHelperResponsibilities returns { helpers, responsibilities } — the
  // rows we render are the responsibilities (helperName/label/status); the
  // deduped helpers list is the "N helping" people count.
  const helperData = useMemo(() => {
    try { return deriveHelperResponsibilities(event) || { helpers: [], responsibilities: [] }; }
    catch { return { helpers: [], responsibilities: [] }; }
  }, [event]);
  const helpers = helperData.responsibilities || [];
  const helperPeople = helperData.helpers || [];
  const risks = useMemo(() => { try { return playbookRisks(event); } catch { return null; } }, [event]);
  // Static playbook risks the host hasn't dismissed. PARITY (re-audit P1):
  // ctx.activeRisks is already riskStatus-filtered and dismissible; the authored
  // playbook rows were not — a host could not clear one they'd handled. They now
  // dismiss the same way, keyed on their stable r.id, so "Handled" clears the row
  // here AND drops it from the count below (the two must never disagree).
  const staticRisks = useMemo(() => {
    const items = (risks && risks.items) || [];
    const st = (event.riskStatus && typeof event.riskStatus === 'object') ? event.riskStatus : {};
    return items.filter(r => r && st[r.id] !== 'dismissed');
  }, [risks, event.riskStatus]);
  // RECON (2026-07-11): the ONE risk count — exactly the rows the risks sheet
  // renders (ctx.activeRisks, already riskStatus-filtered, + the undismissed
  // playbook risks). Quiet index row and the sheet hero both read this, so the
  // number on the way in always equals the rows on arrival.
  const riskCount = ((ctx && ctx.activeRisks) || []).length + staticRisks.length;
  // Row-level routing for a risk (re-audit P1 + the standing Row-Level CTA rule):
  // map a risk to the surface that actually addresses it, most specific first.
  // Returns a routeSheet() route or null — no route means no button, never a dead
  // CTA. rain-plan/crab-plan land on the exact plan; the rest on the right sheet.
  const riskRouteFor = (r) => {
    const t = (String((r && (r.trigger || r.description)) || '') + ' ' + String((r && r.mitigation) || '')).toLowerCase();
    if (/rain|weather|forecast|outdoor|storm|heat wave|\bsky\b/.test(t)) return { focusField: 'rain-plan' };
    if (/crab|shellfish|\bboil\b/.test(t)) return { focusField: 'crab-plan' };
    if (/vendor|\bcoi\b|insurance|deposit|contract|photographer|caterer|\bdj\b|rental/.test(t)) return { tab: 'Vendors' };
    if (/seat|accessible|wheelchair|mobility|\btable\b|capacity|\bfit\b/.test(t)) return { tab: 'Seating' };
    if (/timeline|schedule|arrival|compress|run of show|running late|behind|time window/.test(t)) return { tab: 'Timeline' };
    if (/budget|\bcost\b|overspend|\bspend\b|\bmoney\b/.test(t)) return { tab: 'Budget' };
    if (/\bfood\b|portion|allergen|\bdiet\b|\bmeal\b|\bmenu\b/.test(t)) return { tab: 'Planning', focusField: 'food' };
    return null;
  };
  // Grounded "why this applies" (re-audit candidate a): append a clause drawn ONLY
  // from real event facts — never invented, empty when the fact is absent. Weather
  // is the canonical case the audit flagged: the risk copy is authored, but the
  // forecast the app already resolved (wx) is what makes it concrete right now.
  const riskWhy = (r) => {
    const t = (String((r && (r.trigger || r.description)) || '') + ' ' + String((r && r.mitigation) || '')).toLowerCase();
    if (/rain|weather|forecast|outdoor|storm|\bsky\b/.test(t) && wx && Number.isFinite(Number(wx.pop))) {
      const pop = Math.round(Number(wx.pop));
      if (pop >= 20) return `Forecast now: ${pop}% chance in the day window${wx.rainWindow && wx.rainWindow.label ? ', most likely ' + wx.rainWindow.label : ''}.`;
    }
    return '';
  };
  // The essentials rail (phaseProgress), tight-timeline summary, and the
  // playbook's heart moments — the last of the audit list.
  const phaseCues = useMemo(() => { try { return deriveEventPhaseProgress(event); } catch { return null; } }, [event]);
  const compression = useMemo(() => { try { return deriveEventCompressionSummary(event, daysUntil); } catch { return null; } }, [event]);
  const heartMoments = useMemo(() => { try { return playbookHeartMoments(event) || []; } catch { return []; } }, [event]);
  const crab = useMemo(() => { try { return buildCrabPlan(event); } catch { return { relevant: false }; } }, [event]);
  // DESTINATION-2 slice 1 — the shared travel engine (lib/travelPlan): lodging
  // grid + per-row staleness. relevant:false unless event.isDestination — the
  // same Phase 1 flag the vendor plan and dest_* decisions already read.
  const travel = useMemo(() => { try { return buildTravelPlan(event); } catch { return { relevant: false }; } }, [event]);
  // Sprint 1 seating — the shared engine (lib/seatingPlan, extracted verbatim
  // from the legacy Seating tab): tables are a COUNT, only rsvp==='Yes' guests
  // seat, and there is no per-table capacity in the data — none is shown.
  const seating = useMemo(() => {
    try { return buildSeatingPlan(event); }
    catch { return { enabled: false, hasRoster: false, tableCount: 0, tables: [], confirmed: [], unassigned: [], dietChips: [], totals: { confirmed: 0, seated: 0, unassigned: 0, tableCount: 0, avgPerTable: null, tablesEven: false, allSeated: false } }; }
  }, [event]);
  const rushFactor = useMemo(() => { try { return getRushFactor(event.date); } catch { return { multiplier: 1, label: null, explanation: null }; } }, [event.date]);
  const metroMkt = event.metroMarket ? METRO_MARKETS.find(m => m.id === event.metroMarket) : null;
  const vendorPlan = useMemo(() => {
    try {
      return buildVendorPlan(event, {
        metroFactor: getMetroFactor(event.metroMarket),
        metroLabel: metroMkt ? metroMkt.label : null,
        rush: rushFactor,
      });
    } catch { return { relevant: false, categories: [] }; }
  }, [event, rushFactor, metroMkt]);
  // Captain White's July 2026 reference ladder — from the playbook's verified
  // knowledge. Shown as REFERENCE; a price only counts when the host taps it
  // in (CRAB-PRICING-1 hard rule: no fake market prices).
  const crabLadder = useMemo(() => { try { return crabPriceLadder(); } catch { return null; } }, []);

  // A timeline step counts as handled once real event state proves it, not just when
  // the host taps it — the SAME derive-don't-store predicate the checklist already
  // shows (taskEngine.effectiveDone: date/venue/budget/guest-count/vendor/food-plan),
  // extended with the one signal that needs the live priced spread: a buy/shop step
  // closes once every active line is actually bought. General by subject-matching,
  // not any one label — so a resolved decision drops out of "Coming up" everywhere
  // it applies, the same way it already does in the checklist's "tap to confirm" tag.
  const isTimelineStepResolved = (t) => {
    if (!t) return false;
    try { if (effectiveDone(event, t)) return true; } catch {}
    // DESTINATION-2 slice 3: "Build the arrivals/departures grid" (dest_t_grid)
    // resolves once the grid actually holds real entries — a roster traveler
    // with flight info on the board. Same derive-don't-store predicate as the
    // buy/shop branch below: subject-matched, proven by event state, never a
    // second stored flag. Headcount mode never resolves it (no honest entries).
    if (/arrivals?\s*\/\s*departures/i.test(String(t.task || ''))) {
      try {
        return !!(travel.relevant && travel.rosterMode
          && (travel.air.roster || []).some(r => r.hasFlightInfo));
      } catch { return false; }
    }
    if (/\b(buy|shop)\b|shopping/i.test(String(t.task || ''))) {
      try {
        const fp = playbookFoodPlan(event);
        const active = ((fp && fp.list) || []).filter(it => it && !it.skipped);
        if (!active.length) return false;
        const got = event.foodGot || {};
        return active.every(it => got[it.id] === true);
      } catch { return false; }
    }
    return false;
  };

  // "Coming up" — the human-intelligence layer for CALM states: name what's
  // next and WHEN IT'S DUE even when nothing is urgent. Sources: the decision
  // board's real due dates + undone checklist steps' T-offsets vs the date.
  const upNext = useMemo(() => {
    const out = [];
    try {
      (decisionBoard.open || []).forEach(r => {
        if (r && r.label) out.push({ label: 'Decide: ' + r.label, id: r.id || null, due: r.dueDate || null, days: r.daysOut != null ? r.daysOut : null, kind: 'call' });
      });
    } catch {}
    try {
      (event.timeline || []).filter(t => t && !t.done && !isTimelineStepResolved(t)).forEach(t => {
        // RE-AUDIT (fresh-eyes, 2026-07-14): this still ran the dead /T-(\d+)d/ regex against
        // `t.week` — which is PROSE ('Week of'), so it matched nothing and every checklist
        // step reached "Coming up" with due=null, status 'unknown', sorted last. The one
        // reader (lib/taskLead) existed, was imported by this very file, and this consumer
        // was left on the vocabulary the lead-time fix killed. leadDays is negative (T-5d →
        // -5); taskTimeStatus wants the positive lead.
        const lead = (() => { try { return taskLeadDays(t); } catch { return null; } })();
        let due = null, dd = null;
        if (lead != null && event.date) {
          const d0 = new Date(event.date + 'T12:00:00'); d0.setDate(d0.getDate() + lead);
          due = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
          try { dd = daysUntil(due); } catch { dd = null; }
        }
        const dte = (() => { try { return daysUntil(event.date); } catch { return null; } })();
        // POLICY-FORK (wave-8, the 7th reader): taskTimeStatus is a DISPLAY bucket only —
        // its overdue label folds in NEITHER snooze NOR createdAt reachability, so
        // it read "past due" on the calm hero for a snoozed or unreachable step that the six
        // sanctioned readers clear. `timeBucket` may still tint 'due'/'due-soon' copy, but the
        // OVERDUE/past-due STATE now comes from the ONE policy — taskIsOverdue folds the
        // snooze suppression AND the reachability guard (an event created too late to ever
        // reach this step's lead was never "late"). That also closes the unguarded-reachability
        // hole: an unreachable step flowing into upNext no longer shows "· past due".
        const timeBucket = lead != null ? taskTimeStatus(-lead, dte) : 'unknown';
        const overdue = (() => { try { return taskIsOverdue(t, event); } catch { return false; } })();
        out.push({ label: t.task, due, days: dd, taskId: t.id, kind: 'step', timeBucket, overdue });
      });
    } catch {}
    // DESTINATION-2: the group-rate deadline is a real dated obligation while
    // anyone still hasn't booked. Roster mode only — headcount mode has no
    // honest not-booked count (the engine returns null), so no row is claimed.
    try {
      if (travel.relevant && travel.lodging && travel.lodging.deadline && (travel.lodging.notBookedCount || 0) > 0) {
        let dd = null; try { dd = daysUntil(travel.lodging.deadline); } catch { dd = null; }
        out.push({
          label: 'Group rate ends — ' + travel.lodging.notBookedCount + ' of ' + travel.lodging.roster.length + ' haven’t booked a room yet',
          due: travel.lodging.deadline, days: dd, kind: 'lodging',
        });
      }
    } catch {}
    // DESTINATION-2 slice 2: a real ride gap is a dated obligation too — it
    // has to close by the event itself. Roster mode only (headcount mode has
    // no honest rider count), and only while no shuttle covers it: once the
    // dest_transport decision says yes, the gap is handled, not actionable.
    try {
      if (travel.relevant && travel.rosterMode && travel.ground
        && travel.ground.unmatched > 0 && travel.ground.transportProvided !== true) {
        const due = /^\d{4}-\d{2}-\d{2}/.test(String(event.date || '')) ? String(event.date).slice(0, 10) : null;
        let dd = null; if (due) { try { dd = daysUntil(due); } catch { dd = null; } }
        const n = travel.ground.unmatched;
        out.push({
          label: n === 1 ? '1 person still needs a ride back' : n + ' people still need a ride back',
          due, days: dd, kind: 'ground',
        });
      }
    } catch {}
    // DESTINATION-2 slice 3: a flight that misses part of the day is a dated
    // fact — due on the event itself. One row per conflicting guest, routed to
    // that exact arrivals-board row. Roster mode only; the engine only ever
    // claims a conflict it can read from real dates against the real event date.
    try {
      if (travel.relevant && travel.rosterMode && travel.air
        && (travel.air.conflicts || []).length > 0) {
        const due = /^\d{4}-\d{2}-\d{2}/.test(String(event.date || '')) ? String(event.date).slice(0, 10) : null;
        let dd = null; if (due) { try { dd = daysUntil(due); } catch { dd = null; } }
        travel.air.conflicts.forEach(c => {
          out.push({
            label: c.type === 'arrives_late'
              ? c.name + '’s flight lands after the day starts'
              : c.name + ' flies out before the day ends',
            due, days: dd, kind: 'air', guestId: c.guestId,
          });
        });
      }
    } catch {}
    return out
      .filter(x => x.days == null || x.days >= 0)
      .sort((a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : 1))
      .slice(0, 3);
  }, [decisionBoard, event, travel]);
  const [crabAdd, setCrabAdd] = useState({ size: 'large', unit: 'dozen', qty: 1, price: '' });
  const [foodTune, setFoodTune] = useState(null); // per-item cost-structure panel
  const [choiceOpen, setChoiceOpen] = useState(null); // re-opened settled choice (auto-collapse)
  // ── T-72h reconfirm sweep ── staged drafting state: {} | {vendorId: 'drafting'|'ready'}
  const [sweepState, setSweepState] = useState({});
  const sweepTimers = useRef([]);
  useEffect(() => () => sweepTimers.current.forEach(clearTimeout), []);
  const [doneOpen, setDoneOpen] = useState(false); // completed-work fold in the checklist
  // Decision memory — capture WHY in the host's own words (lib/decisionMemory);
  // the settled row reads it back next time the subject comes up.
  const [whyOpen, setWhyOpen] = useState(null);
  const [whyText, setWhyText] = useState('');
  // Wave-2b: the quiet "comes up closer to the date" (deferred) fold on the Calls sheet.
  const [decLaterOpen, setDecLaterOpen] = useState(false);
  const saveWhy = (r) => {
    const text = whyText.trim();
    if (!text) { setWhyOpen(null); return; }
    const rec = makeRecord({
      eventId: event.id, subjectId: r.id, subjectLabel: r.label,
      decision: r.because || 'settled', rationale: text,
    }, new Date().toISOString());
    patchEvent({ decisionMemory: appendDecision(event, rec).decisionMemory },
      'Noted — next time this comes up, your own reasoning comes with it.');
    setWhyOpen(null); setWhyText('');
  };
  // Inline decision settle — ONE write path (event.foodChoices[id]), the same
  // single-source write the food plan's "Your choices" chips and legacy's
  // What-to-settle board use (App.js onSetChoice). The board re-derives from
  // the event on every change, so the row moves open → Settled on its own,
  // and travel/ground (lib/travelPlan transportDecision) read the same answer.
  // decisionMemory is NOT written here — that stays the host's own optional
  // "note why" on the settled row, exactly as before.
  const settleDecision = (r, opt) => {
    patchEvent({ foodChoices: { ...(event.foodChoices || {}), [r.id]: opt } },
      r.label + ': ' + opt + ' — settled.');
    setChoiceOpen(null);
    // A routed focus (Next up's "Decide:", the ground sheet's "Decide it" /
    // "Change the call") has done its job once the pick lands — clear it so
    // the now-settled row doesn't re-open its chips as if still asking.
    setSheet(s => (s && s.focus === r.id ? { ...s, focus: null } : s));
  };
  // Shared grounded-decision resolution (elegant loop): the why + the fix, resolved
  // IN PLACE via settleDecision — a proposed default with one-tap "Go with X" +
  // "or" alternatives (propose-don't-ask), or the real options when there's no
  // defensible default. Used by BOTH the decisions BUNDLE hero and a SINGLE decision
  // hero card, so a lone decision stops falling back to a routing "Take me to it".
  // Returns null when the decision has no authored options (caller keeps its route).
  // Combined B+C+D display (host 2026-07-18) — every field REAL, from playbookDecisionOptions
  // (options/why/default) + the playbook's authored optionNotes/defaultWhy. Propose-mode: the
  // pick shown once (name · "our pick" · its tradeoff note), the real defaultWhy as a line under
  // it, and the alternatives behind a "See N other ways" disclosure (each a row with its own
  // note). Ask-mode (no defensible default): every option as an equal row + note, no badge.
  // Nothing invented at render — a missing note simply doesn't show.
  // ── UNIFIED DECISION SURFACE (host "this feels piecemeal", 2026-07-18) ──────────────
  // Every host PICK-style decision — playbook `decision:*` board items AND phase/editor
  // decisions (food handling, …) — normalizes to a NormalizedDecision and renders through
  // ONE renderer. Kills the two-path split (decopt rows vs. chip pills) that left phase
  // decisions off Figma parity. A NEW decision reaches parity by adding an adapter to
  // decisionFor(); the renderer never changes and no one hand-draws chips again.
  //   NormalizedDecision = { id, options:[{value,label,note?}], proposed:{value,why}|null,
  //                          why?:string, settle:(value)=>void }
  // Grounding: `proposed` (the "our pick") is emitted ONLY when defensible — otherwise
  // honest ask-mode (equal rows). Nothing invented at render; a missing note just doesn't show.
  const renderDecision = (nd) => {
    if (!nd || !Array.isArray(nd.options) || !nd.options.length) return null;
    const proposedOpt = nd.proposed ? nd.options.find(o => o.value === nd.proposed.value) : null;
    const alts = proposedOpt ? nd.options.filter(o => o !== proposedOpt) : nd.options;
    const open = decDiscloseId === nd.id;
    const optRow = (o, isPick) => (
      <button key={o.value} className={'decopt' + (isPick ? ' pick' : '')} onClick={() => nd.settle(o.value)}>
        <span className="decopt-main">
          <span className="decopt-name">{o.label}</span>
          {o.note && <span className="decopt-note">{o.note}</span>}
        </span>
        {/* "our pick" sits on the RIGHT, by the arrow; hovering it reveals the real
            "why this pick" as a tooltip — no standalone line (host 2026-07-18). */}
        {/* No "→": tapping a row SETTLES the choice in place (nd.settle → patchEvent),
            it does not navigate. An arrow here reads as false navigation — the badge
            carries state and the whole row is the tappable affordance (host 2026-07-21). */}
        <span className="decopt-right">
          {isPick && (
            <span className="decopt-badge-wrap" tabIndex={0}>
              <span className="decopt-badge">our pick</span>
              {nd.proposed.why && <span className="decopt-why" role="tooltip">{nd.proposed.why}</span>}
            </span>
          )}
        </span>
      </button>
    );
    // SETTLED — the host already picked (nd.selected). Show EVERY option (Figma 7:38 / 369:60
    // + the CTA-consistency fix): the chosen row highlighted with a "chosen" badge, all still
    // tappable to switch. No disclosure, no collapse — one consistent row treatment.
    if (nd.selected != null && nd.options.some(o => o.value === nd.selected)) {
      return (
        <div className="decopts">
          {nd.options.map(o => {
            const isChosen = o.value === nd.selected;
            return (
              <button key={o.value} className={'decopt' + (isChosen ? ' pick' : '')} aria-pressed={isChosen} onClick={() => nd.settle(o.value)}>
                <span className="decopt-main">
                  <span className="decopt-name">{o.label}</span>
                  {o.note && <span className="decopt-note">{o.note}</span>}
                </span>
                <span className="decopt-right">
                  {isChosen && <span className="decopt-badge">chosen</span>}
                </span>
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <div className="decopts">
        {proposedOpt ? (
          <>
            {optRow(proposedOpt, true)}
            {alts.length > 0 && (open ? (
              <>
                <button className="decopt-disc" onClick={() => setDecDiscloseId(null)}>Other ways  ▾</button>
                {alts.map(o => optRow(o, false))}
              </>
            ) : (
              <button className="decopt-disc" onClick={() => setDecDiscloseId(nd.id)}>{'See ' + alts.length + ' other way' + (alts.length > 1 ? 's' : '') + '  ›'}</button>
            ))}
          </>
        ) : (
          // Ask-mode: a genuine either/or — every option an equal row, no faked pick.
          <>
            {nd.why && <p className="grounding" style={{ margin: '0 0 var(--sp-3)' }}>{nd.why}</p>}
            {nd.options.map(o => optRow(o, false))}
          </>
        )}
      </div>
    );
  };
  // ADAPTER — a playbook `decision:*` board row → NormalizedDecision (its authored
  // options/optionNotes/defaultWhy, and the difm propose/ask approach as the pick).
  const playbookDecisionND = (dec) => {
    const dopts = (() => { try { return playbookDecisionOptions(event, dec.id); } catch { return null; } })();
    if (!dopts || !Array.isArray(dopts.options) || !dopts.options.length) return null;
    const notes = (dopts.optionNotes && typeof dopts.optionNotes === 'object') ? dopts.optionNotes : {};
    const dapproach = dec.difmCapable ? (() => { try { return decisionApproach(dec, dopts); } catch { return null; } })() : null;
    // Propose-don't-ask: prefer the DIFM-derived pick, but when a decision carries no
    // difmCapable (injected military/destination sets) fall back to its AUTHORED grounded
    // default — those rows have default+why+src, so a blank ask over a real default is wrong.
    const proposed = (dapproach && dapproach.mode === 'propose' && dapproach.proposed)
      ? dapproach.proposed
      : (dopts.default || null);
    return {
      id: dec.id,
      options: dopts.options.map(o => ({ value: o, label: o, note: notes[o] || null })),
      proposed: proposed ? { value: proposed, why: dopts.defaultWhy || dopts.why || null } : null,
      why: dopts.why || null,
      settle: (v) => settleDecision(dec, v),
    };
  };
  // ADAPTER — the phase:food "how is the food handled" decision → NormalizedDecision.
  // Propose-don't-ask ONLY when grounded: at a real headcount, cooking for that many is a
  // lot to own on the day, so most hosts hand it to a caterer. Below that, honest ask-mode.
  const foodDecisionND = () => {
    // WIRE (audit 2026-07-22, W8 "doesn't continue"): when the playbook authors its
    // own food-approach decision (repast `food_source` — culturally specific options,
    // committee-brings default), THAT decision IS the food decision. The generic
    // cook/cater/potluck trio both contradicted its doctrine and wrote a key the
    // engine ignores whenever an authored lever exists — settling changed nothing.
    // settleDecision writes foodChoices[<lever id>], the exact store foodApproach
    // reads, so the pick now reshapes buys/tasks/costs. Trio = lever-less types only.
    try {
      const fa = foodApproach(event);
      if (fa && fa.decisionId) {
        const row = [...(decisionBoard.open || []), ...(decisionBoard.locked || [])]
          .find(x => x && x.id === fa.decisionId);
        const nd = row ? playbookDecisionND(row) : null;
        if (nd) return { ...nd, selected: (event.foodChoices || {})[fa.decisionId] || null };
      }
    } catch { /* fall through to the generic trio */ }
    const OPTS = [['We’ll cook it', 'host cooks'], ['A caterer handles it', 'caterer'], ['Potluck', 'potluck']];
    const NOTES = {
      'host cooks': 'Most control, most work on the day — best when the count is small.',
      'caterer': 'Hands-off on the day; the biggest line in the food budget.',
      'potluck': 'Low cost and communal — but you can’t plan the exact spread.',
    };
    const gn = Number(guests) || 0;
    const proposed = gn >= 40
      ? { value: 'caterer', why: `At about ${gn} guests, most hosts hand the food to a caterer — cooking for that many is a lot to own on the day.` }
      : null;
    return {
      id: 'phase:food',
      options: OPTS.map(([label, value]) => ({ value, label, note: NOTES[value] || null })),
      proposed,
      selected: (event.foodChoices || {}).sourcing || null,
      why: proposed ? null : 'How you handle the food shapes both the budget and your day-of workload.',
      settle: (v) => {
        const label = (OPTS.find(([, val]) => val === v) || ['it'])[0];
        patchEvent({ foodChoices: { ...(event.foodChoices || {}), sourcing: v } },
          'Food planned: ' + label.toLowerCase() + ' — the plan just recomputed.');
      },
    };
  };
  // DISPATCHER — any decision-like hero action → its NormalizedDecision (or null when the
  // action isn't a pick-style decision, e.g. a free-entry editor). Add a source here once.
  const decisionFor = (a) => {
    if (!a) return null;
    const id = String(a.id || '');
    if (/^decision:/.test(id)) {
      const dec = (decisionBoard.open || []).find(x => x && ('decision:' + x.id) === id);
      return dec ? playbookDecisionND(dec) : null;
    }
    if (id === 'phase:food') return foodDecisionND();
    if (/^blocker:/.test(id)) {
      const b = (blockers || []).find(x => x && ('blocker:' + x.fieldKey) === id);
      if (!b) return null;
      return {
        id,
        options: (b.options || []).map(o => ({ value: o.value, label: o.label, note: o.note || null })),
        proposed: null,
        why: b.what || null,
        settle: (v) => patchEvent({ [b.fieldKey]: v }, (b.title || 'Decided') + ' — set.'),
      };
    }
    return null;
  };
  // Back-compat: the decisions BUNDLE + single-decision hero still call this with a board row.
  const renderDecisionActions = (dec) => renderDecision(playbookDecisionND(dec));
  // Host override (task 3): the ranking is a PROPOSAL the host can correct. Pinning
  // floats an open decision to the top; persists via the same patchEvent path every
  // edit uses. Toggling re-pins/unpins.
  const toggleDecisionPin = (id) => {
    if (!id) return;
    const cur = Array.isArray(event.decisionPins) ? event.decisionPins.filter(Boolean) : [];
    const next = cur.includes(id) ? cur.filter(p => p !== id) : [id, ...cur];
    patchEvent({ decisionPins: next }, cur.includes(id) ? 'Unpinned.' : 'Moved to the top.');
  };
  // Auto-hiding dock (real-device fix: the floating dock overlapped bottom
  // CTAs on tall phones) — hides on scroll-down, returns on scroll-up/top.
  const [dockHidden, setDockHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const onScroll = () => {
      const y = app.scrollTop;
      const delta = y - lastScrollY.current;
      // Reimagined bottom (host request 2026-07-16): the nav dock is HIDDEN until
      // viewport movement, revealing on scroll-up (or at the top) and tucking away on
      // scroll-down — because the persistent primary action now lives in the always-on
      // NEXT bar pinned at the frame bottom, so navigation no longer has to stay parked.
      if (y < 40) setDockHidden(false);
      else if (delta > 6) setDockHidden(true);
      else if (delta < -6) setDockHidden(false);
      lastScrollY.current = y;
    };
    app.addEventListener('scroll', onScroll, { passive: true });
    return () => app.removeEventListener('scroll', onScroll);
  }, [stage]);
  const [tuneCost, setTuneCost] = useState(''); // lock-the-cost input in the tune panel
  // Did the host actually TYPE in the cost field, vs accept the store-based
  // prefill? Only a typed value is a real receipt (event.foodReal); accepting
  // the prefill is an honest estimate, not a "real price" — the truth fix.
  const [tuneEdited, setTuneEdited] = useState(false);
  // Bulk price-lock — parity with legacy's "Use typical prices for the other
  // N items →" (App.js ~11040-11060). ids just locked by the bulk action, kept
  // local (never persisted to the event) so a one-tap undo can unwind exactly
  // those writes without touching anything locked by hand before or after.
  const [bulkPriced, setBulkPriced] = useState(null);
  // Host-authored dish/item — closes the remove/add asymmetry legacy already fixed
  // (App.js ~10538-10570, ~11415-11457): a named line the host commits ("Aunt
  // Carol's potato salad", "extra ice — $15"), owner + cost both optional. Writes
  // the same event.foodAdd shape legacy writes, merged by the shared engine
  // (lib/playbooks/index.js ~2192-2210) — no engine change needed, single source
  // of truth between the two apps.
  const [foodAddOpen, setFoodAddOpen] = useState(false);
  const [foodAddName, setFoodAddName] = useState('');
  const [foodAddOwner, setFoodAddOwner] = useState('');
  const [foodAddCost, setFoodAddCost] = useState('');
  // Fold-behind-Change (parity/MANIFEST) — which settled single-value controls are
  // expanded to their picker; collapsed by default to a SettledRow. Keyed 'rain'
  // /'inviteStyle'/'gifts'.
  const [settledOpen, setSettledOpen] = useState({});
  const [contractUploading, setContractUploading] = useState({}); // per-vendor contract-file upload state
  const [foodAddGroup, setFoodAddGroup] = useState(null); // Food/Drinks/Supplies override; null = auto-guess
  const [foodGroupsOpen, setFoodGroupsOpen] = useState({}); // spread accordion
  // Place-intelligence rows (Space sheet) — which one has its inline note
  // field open. Maps each row key to the exact event field
  // derivePlaceIntelligence (lib/placeIntelligence.js) already reads to flip
  // that row from "needs" to "handled" — same fields legacy's Event Details
  // tab writes, so filling one in here keeps both apps' readiness in sync.
  // 'rain' is deliberately absent: it already has a real editor (the rain
  // sheet) and routes there instead of a plain note.
  const [placeNoteOpen, setPlaceNoteOpen] = useState(null);
  const [placeNoteDraft, setPlaceNoteDraft] = useState(''); // controlled draft for the place-note editor (address field autocompletes)
  const PLACE_NOTE_FIELD = { venue: 'venue', arrival: 'venueAddress', parking: 'parkingNotes', loadIn: 'loadInNotes', contact: 'venueContact', rules: 'houseRules' };
  const [shopStore, setShopStore] = useState(null); // shopping-run mode: 'I'm at X' filter (session-only)
  const [budgetFoldOpen, setBudgetFoldOpen] = useState(false); // budget editor folds once a number exists
  const [foodSect, setFoodSect] = useState({}); // dietary/choices/sourcing folds
  const [showMoreDiets, setShowMoreDiets] = useState(false); // dietary "other" fold (parity: App.js:10850)
  const [dietOtherOpen, setDietOtherOpen] = useState(false); // "+ Other" custom-diet name entry
  const [dietOtherName, setDietOtherName] = useState('');
  // MEANING CAPTURE — the raw fields the engines already read (single truth:
  // dayBefore's protect-the-moment, phaseProgress's moment item, the nudge
  // layer, and doItForMe's toast all DERIVE from these; V2 only writes them).
  const [meaningDraft, setMeaningDraft] = useState(null);
  const buildMeaningDraft = () => ({
    honoree: event.honoree || '',
    honoree_story: event.honoree_story || '',
    meaning_why: event.meaning_why || '',
    feeling_words: event.feeling_words || '',
    must_have_moment: event.must_have_moment || '',
    // THE INVITE READS THESE AND NOTHING EVER FILLED THEM.
    // `deckLine` is the line under the event's name on the invitation — the invite
    // has always preferred the host's own words over its canned DECK_LINES default,
    // but no screen ever let them write it, so every invitation shipped with a
    // stock line sitting in the host's voice.
    // `hostName` is who the invitation is FROM. Every leader shows it (Partiful:
    // "Hosted by Erin L"). The event model had no name field at all — `hostContact`
    // is an email/phone, so rendering that as "Hosted by" would print an address on
    // the invitation.
    deckLine: event.deckLine || '',
    hostName: event.hostName || '',
  });
  const openMeaning = () => { setMeaningDraft(buildMeaningDraft()); setSheet({ kind: 'meaning' }); };
  const hasMeaning = !!(String(event.must_have_moment || '').trim() || String(event.meaning_why || '').trim() || String(event.honoree_story || '').trim());
  const [lessonDraft, setLessonDraft] = useState('');
  // Seed the draft from the saved lesson whenever the event changes (getLesson
  // is the canonical reader; setLesson the writer — 200-char cap lives in lib).
  useEffect(() => { setLessonDraft(getLesson(event)); }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recap keepsake the host publishes to the shared invite link: a note to
  // guests + a real photo-album URL. Both appear on the invite ONLY after the
  // event date (the recap state), and only when set — never fabricated.
  const [recapDraft, setRecapDraft] = useState('');
  const [albumDraft, setAlbumDraft] = useState('');
  useEffect(() => { setRecapDraft(String(event.recapNote || '')); setAlbumDraft(String(event.albumUrl || '')); }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Event memory: the one persisted field the original uses (event.lessons).
  // Recall reads across the loaded events — a past event of the same type.
  const lastLesson = useMemo(() => {
    try {
      // Live created events replace their load-time ALL_SAMPLES snapshots.
      const pool = [...ALL_SAMPLES.filter(e => e && !isCustomEventId(e.id)), ...customs];
      const hit = pool.find(e => e && e.id !== event.id && e.type === event.type && String(e.lessons || '').trim() && isPastEvent(e));
      return hit ? { name: hit.name, lessons: String(hit.lessons).trim() } : null;
    } catch { return null; }
  }, [event.id, event.type, customs]);
  // ROW-LEVEL CTA RULE (Todd): a coming-up item lands on the exact field that
  // answers it — the crab order, the pickers count, the space list — never a
  // sheet top when a closer target exists.
  const routeUpNext = (u) => {
    const t = String(u.label || '');
    if (/pickers|light eaters/i.test(t)) { setSheet({ kind: 'crabs', focus: 'pickers' }); return; }
    if (/crab house|pre-?order|bushel|dozen|steam/i.test(t)) { setSheet({ kind: 'crabs', focus: 'order' }); return; }
    if (/rent or borrow|steamer pot|propane|tables|chairs|canopy/i.test(t)) { setSheet({ kind: 'space' }); return; }
    if (u.kind === 'lodging') { setSheet({ kind: 'lodging', focus: 'deadline' }); return; }
    if (u.kind === 'ground') { setSheet({ kind: 'ground', focus: 'riders' }); return; } // land on the rows that still need a ride
    if (u.kind === 'air') { setSheet({ kind: 'air', focus: u.guestId != null ? u.guestId : null }); return; } // land on the exact conflicted row
    if (u.kind === 'call') { setSheet({ kind: 'decisions', focus: u.id || null }); return; }
    setSheet({ kind: 'tasks', focus: u.taskId || null });
  };

  // ROW-LEVEL ACTIONABILITY (host directive 2026-07-12): a checklist step is a
  // LAUNCH POINT, not just a checkbox. Subject-match the step text to the ONE
  // surface where the host actually does it — the spread, the people they're
  // hiring, the space list, the guest list, the weather plan, the day itself —
  // so the row carries a deep-link to that spot (Row-Level CTA rule). Same
  // honest keyword approach as routeUpNext: a step with no clear home returns
  // null and gets NO button — never a dead CTA. Order matters: the more specific
  // verb wins ("spread the word" is guest comms, not "the spread" of food).
  const checklistActionFor = (task, meta = {}) => {
    const t = String(task || '').toLowerCase();
    const wk = String(meta.week || '').toLowerCase();
    const dayOf = meta.category === 'event-day' || /day of\b|day-of/.test(wk);
    // Day-of run of show — setup, serving, the pit, the pack-down. (\bserved?\b
    // is word-bounded so it never fires on "reserve".)
    if (dayOf || /\bfire[s]? the pit|light the pit|set up (the )?canop|set out (foil|to-go)|\bserved?\b|bless the food|scrape the grill|pack (up|leftovers|the)|fold (the )?canopies|works batches\b/.test(t))
      return { label: 'See the day plan', go: () => { setSheet(null); setStage('day'); } };
    // Day-BEFORE kitchen prep (marinate / cook overnight / make-ahead) is real-
    // world execution with no app surface to open — honest check-off, no CTA.
    if (/\b(marinate|season the|slow-cook|cook the|make-ahead|prep)\b/.test(t))
      return null;
    // Buying / groceries / supplies → the shopping list
    if (/\b(buys?|groceries|drinks|soda|water|ice\b|disposable|foil|to-go|trash|recycl|fuel|charcoal|napkins|cups|plates|shopping)\b/.test(t))
      return { label: 'Open the list', go: () => setSheet({ kind: 'food' }) };
    // Tribute speakers / speeches / slideshow → the tribute decision, NOT a vendor.
    // "Line them up for the speakers" is arranging who speaks, not hiring anyone —
    // it was falling into the hire match below on the bare word "speaker" (host
    // 2026-07-22). An audio "speaker" with no tribute cue still routes to Vendors.
    if (/\btribute\b|\bspeeches?\b|\bslideshow\b|\bmontage\b|\bopen mic\b|\beulog|line\b.{0,24}\bspeakers?\b/.test(t))
      return { label: 'Plan the tribute', go: () => setSheet({ kind: 'decisions', focus: 'tribute' }) };
    // Hired help — DJ, band, photographer, caterer, rentals → people you're hiring
    if (/\b(dj|playlist|band|speaker|photographer|caterer|book the|rent(al)?|hire)\b/.test(t))
      return { label: 'Line them up', go: () => setSheet({ kind: 'vendors' }) };
    // Weather / forecast / rain → the rain plan
    if (/\b(forecast|weather|rain plan|shade\/rain)\b/.test(t))
      return { label: 'Plan for weather', go: () => setSheet({ kind: 'rain' }) };
    // Guest comms / headcount / who's coming → the guest list (before food, so
    // "spread the word" doesn't get caught by the food "spread" match)
    if (/\b(spread the word|group text|flyer|invite|rsvp|headcount|who is coming|firm the (head)?count)\b/.test(t))
      return { label: 'Open guests', go: () => setSheet({ kind: 'guests' }) };
    // The menu / spread / dishes / who's bringing what → the food plan
    if (/\b(spread|menu|dish(es)?|mac|potato salad|beans|greens|cornbread|slaw|dessert|meat|ribs|assign each|bringing what|claimed|potluck)\b/.test(t))
      return { label: 'Map the spread', go: () => setSheet({ kind: 'food' }) };
    // Physical setup gear — canopies, chairs, tables, seating, shade → space
    if (/\b(canop|chairs|tables?|seating|shade|spades table|tent)\b/.test(t))
      return { label: 'Open the space list', go: () => setSheet({ kind: 'space' }) };
    // Naming a lead / helper / backup person → the helpers on the space sheet
    if (/\b(grill master|name the|point person|in charge|backup|helper)\b/.test(t))
      return { label: 'Assign it', go: () => setSheet({ kind: 'space' }) };
    return null;
  };
  // Split a run-on step into a bold lead action + the detail that follows the
  // first separator, so the row is scannable ("Map the spread" over the list of
  // dishes). Display-only — never mutates the stored task text.
  const splitTask = (task) => {
    const s = String(task || '').trim();
    const m = /^(.{3,58}?)(:| — |; | \()(.*)$/.exec(s);
    if (!m) return { lead: s, detail: '' };
    const detail = (m[2] === ' (' ? '(' : '') + m[3];
    return { lead: m[1].trim(), detail: detail.trim() };
  };

  // ── Weather alerting (modern live-activity pill) ──
  // LIVE when configured: the production pipeline verbatim — geocodeVenue →
  // getEventWeatherRisk (proxy via the API base, or the OpenWeather key).
  // When NOT configured, the labeled sample drives the same engines. NEVER
  // both: a configured app shows live weather or nothing — a fabricated
  // fallback could contradict the real sky.
  const [liveWx, setLiveWx] = useState(null);
  useEffect(() => {
    let dead = false;
    setLiveWx(null);
    (async () => {
      try {
        if (!isWeatherConfigured() || !event.date) return;
        const out = isLikelyOutdoor(event.venue, event.notes);
        const past = isPastEvent(event);
        const d = daysUntil(event.date);
        if (!out || past || d == null || d < 0 || d > 14) return;
        // A bare home word ("Backyard") geocodes to junk — the town is the
        // real locator for at-home events; skip entirely when neither exists.
        const homeish = /^(backyard|back\s?yard|home|house|my place)$/i.test(String(event.venue || '').trim());
        // Appends the state the same way legacy's eventGeoQuery does — a bare
        // city geocode (limit=1) can silently resolve to the wrong same-named
        // city in another state; venueState/profile.state disambiguate it.
        // A ZIP is already unambiguous on its own, no state suffix needed.
        const withState = (city, state) => (city && !/^\d{5}$/.test(city) && state) ? `${city}, ${state}, US` : city;
        const q = withState(String(event.venueCity || '').trim(), String(event.venueState || '').trim())
          || (!homeish ? String(event.venue || '').trim() : '')
          || withState(String((profile && profile.city) || '').trim(), String((profile && profile.state) || '').trim()); // your usual area backs up a bare backyard
        if (!q) return;
        const coords = await geocodeVenue(q);
        if (dead || !coords) return;
        const wxr = await getEventWeatherRisk(coords.lat, coords.lon, event.date);
        if (!dead && wxr) setLiveWx(wxr);
      } catch { /* stay quiet — no forecast beats a wrong one */ }
    })();
    return () => { dead = true; };
  }, [event.id, event.date, event.venue, event.venueCity, event.venueState, event.notes]); // eslint-disable-line react-hooks/exhaustive-deps
  const wx = useMemo(() => {
    if (liveWx) return liveWx;
    if (isWeatherConfigured()) return null; // live mode: real data or nothing
    // Self-contained reads (this memo sits above the shared outdoor/days consts).
    const out = (() => { try { return isLikelyOutdoor(event.venue, event.notes); } catch { return false; } })();
    const past = (() => { try { return isPastEvent(event); } catch { return false; } })();
    const d = (() => { try { return daysUntil(event.date); } catch { return null; } })();
    // Same 14-day boundary as getEventWeatherRisk — no real forecast reaches
    // beyond it, so no alert may exist there either (even a sample one).
    if (!out || past || !event.date || d == null || d < 0 || d > 14) return null;
    return {
      kind: 'rain', risk: 'high', conditions: 'Rain', pop: 70,
      precipitation: 70, // the field weatherLogistics reads (getEventWeatherRisk's name)
      date: event.date,
      summary: 'Rain likely on your event day',
      rainWindow: { startHour: 14, endHour: 18, label: '2 PM\u20136 PM' },
      _sample: true,
    };
  }, [event, liveWx]);
  const wxImpact = useMemo(() => {
    if (!wx) return null;
    try { const im = weatherImpactByEventPhase(event, wx); return im && im.hasImpact ? im : null; } catch { return null; }
  }, [event, wx]);

  // ── Rain notes per audience — pure composition from what's on file (rain
  // plan, date, window, venue). Same facts, three jobs: guests get the call,
  // helpers get the shift, vendors get the question.
  const rainNoteFor = (who) => {
    const when = event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'the day';
    const win = wx && wx.rainWindow && wx.rainWindow.label ? ' — most likely ' + wx.rainWindow.label : '';
    const plan = String(event.rainPlan || '').trim();
    if (who === 'helpers') {
      return {
        subject: 'If the sky turns — ' + (event.name || when),
        body: ['Quick heads-up, crew —', '', 'Rain is in play for ' + when + win + '. If it comes, we shift to: ' + plan + '.',
          'That may mean moving setup earlier or under cover — I’ll text timing the moment it firms up.', '', 'Nothing changes yet. Just wanted you ahead of it.'].join('\n'),
      };
    }
    if (who === 'vendors') {
      return {
        subject: 'Weather heads-up for ' + when + (event.name ? ' — ' + event.name : ''),
        body: ['Hi —', '', 'Watching the forecast for ' + when + ': rain is possible' + win + '. Our backup is ' + plan + '.',
          'Does that change anything on your end — setup spot, cover, timing? Anything you need from us, say the word.', '', 'Thanks so much!'].join('\n'),
      };
    }
    return guestRainMessage(event, wx || null);
  };

  // ── Watch the sky — Notification API opt-in, per event. Fires on CHANGES
  // in live weather only (first read is the baseline; the sample never pings).
  const [wxNotify, setWxNotify] = useState(false);
  const [notifGranted, setNotifGranted] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  useEffect(() => {
    try { setWxNotify(localStorage.getItem('ngw-hostv2-wxnotify-' + event.id) === 'on'); } catch { setWxNotify(false); }
  }, [event.id]);
  const setWxNotifyPref = (on) => {
    setWxNotify(on);
    try { on ? localStorage.setItem('ngw-hostv2-wxnotify-' + event.id, 'on') : localStorage.removeItem('ngw-hostv2-wxnotify-' + event.id); } catch { /* private mode */ }
    if (!on) toast('Standing down — the sky is yours to watch again.');
  };
  const askWxNotify = async () => {
    if (typeof Notification === 'undefined') { toast('This browser can’t send notifications — the pill above stays your watch.'); return; }
    try {
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setNotifGranted(perm === 'granted');
      if (perm === 'granted') { setWxNotifyPref(true); toast('Watching the sky — you’ll get a ping the moment the forecast moves.'); }
      else toast('Notifications are blocked for this site — the weather pill still keeps watch here.');
    } catch { toast('Couldn’t ask for notification permission.'); }
  };
  useEffect(() => {
    if (!wxNotify || !liveWx || !notifGranted) return;
    const bucket = String(liveWx.risk || '') + '|' + (liveWx.rainWindow ? liveWx.rainWindow.label : 'day-level') + '|' + (liveWx.pop != null ? Math.round(Number(liveWx.pop) / 10) : '');
    const seenKey = 'ngw-hostv2-wxseen-' + event.id;
    let last = null; try { last = localStorage.getItem(seenKey); } catch { /* private mode */ }
    if (last === bucket) return;
    try { localStorage.setItem(seenKey, bucket); } catch { /* private mode */ }
    if (last == null) return; // baseline, not news
    try {
      new Notification('The sky moved — ' + (event.name || 'your event'), {
        tag: 'ngw-wx-' + event.id,
        body: (liveWx.summary || 'The forecast changed.')
          + (liveWx.rainWindow && liveWx.rainWindow.label ? ' Most likely ' + liveWx.rainWindow.label + '.' : '')
          + (String(event.rainPlan || '').trim() ? ' Your backup: ' + event.rainPlan + '.' : ' No backup named yet — worth picking one.'),
      });
    } catch { /* notification construction can throw on some platforms */ }
  }, [liveWx, wxNotify, notifGranted, event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [wxOpen, setWxOpen] = useState(false);

  useEffect(() => {
    if (!isCustomEventId(eventId)) { try { localStorage.setItem(LS_PATCH(eventId), JSON.stringify(patch)); } catch {} }
  }, [patch, eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try { localStorage.setItem(LS_CUSTOMS, JSON.stringify(customs)); } catch {}
  }, [customs]);
  // Reload lands back where the host was — creation and switching both flow
  // through eventId, so ONE writer covers them.
  useEffect(() => {
    if (eventId) { try { localStorage.setItem(LS_LAST_EVENT, eventId); } catch {} }
  }, [eventId]);
  useEffect(() => { appRef.current?.scrollTo({ top: 0 }); }, [stage, eventId]);

  const switchEvent = (id) => {
    redoEventId.current = null; // moving to another event abandons any pending create correction
    setEventId(id); setHandledOpen(false); setStage('plan'); setEditor(null); setSheet(null); setDayIdx(0);
    if (!isCustomEventId(id)) { try { setPatch(JSON.parse(localStorage.getItem(LS_PATCH(id))) || {}); } catch { setPatch({}); } }
    // Build-map #3: an explicit pick is the resume pointer. Sync it to the
    // account (signed-in only — local LS_LAST_EVENT already covers same-device)
    // so the next device the host opens lands on this same event. Once the host
    // has picked here, stop auto-following any older cloud pointer.
    didResume.current = true;
    if (session && id) { try { patchProfile({ lastEventId: id }); } catch { /* offline — localStorage profile holds it */ } }
  };
  // Follow the account's resume pointer on a fresh device: once the target event
  // is available (sample, custom, or hydrated real event) AND the host hasn't
  // already switched here, land on it. Runs at most once (didResume).
  useEffect(() => {
    const id = resumePointer;
    if (!id || didResume.current) return;
    if (eventId !== BOOT_EVENT_ID) { didResume.current = true; return; } // host already picked
    if (id === eventId) { didResume.current = true; return; }
    const known = ALL_SAMPLES.some(e => e && e.id === id) || customs.some(e => e && e.id === id)
      || hydratedEvents.some(e => e && e.id === id) || REAL_EVENTS.some(e => e && e.id === id);
    if (known) { didResume.current = true; switchEvent(id); }
  }, [resumePointer, customs, hydratedEvents, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toast = (msg, action, tone) => {
    setToastMsg(msg);
    setToastAction(action || null);
    setToastTone(tone || null);   // 'ok' ⇒ green confirmation; else neutral
    clearTimeout(toastTimer.current);
    // An actionable toast lingers a little longer — the host needs a beat to
    // read it AND decide; a plain notice keeps the original rhythm.
    toastTimer.current = setTimeout(() => { setToastMsg(null); setToastAction(null); setToastTone(null); }, action ? 6500 : 3400);
  };

  // ── Real lib functions, one per element ──
  const dstat = eventDateStatus(event.date);            // lib/dates — time intelligence
  const days = dstat.days;

  // ── T-72h reconfirm window ── named FORMAL vendors only; the sweep exists
  // inside the last three days, and closes itself once every vendor has
  // answered. Informal helpers (a friend bringing the cooler) are excluded —
  // same host-appropriate rule the registry raiser applies (surfaceRegistry
  // vendor-reconfirm); the banner counting them was the last divergence.
  const reconfirmables = useMemo(() => (event.vendors || []).filter(v => v && String(v.name || '').trim() && !v.isInformal), [event]);
  // GROUNDED ACTION LOOP (the conflict mapper): the SAME cross-vendor conflicts
  // the engine only ever counted, turned into per-item ActionItems the elegant
  // hero renders as the grounded action itself (ask · detail · why · the two
  // real choices) instead of a "See all N" gate. items[0] is the first one to
  // face; severity-sorted, never re-ordered. (Spec: GROUNDED_ACTION_ENGINE_CONTRACT.)
  const conflictItems = useMemo(() => {
    try { return conflictsToActionItems(deriveVendorPromiseConflicts(event)); } catch { return []; }
  }, [event]);
  // GROUNDED COI STEP (host "pull the grounded action into 'Collect all vendor COIs'"): the
  // solver task is a generic bundle; the COI engine (coiNextAction) knows the REAL next step
  // per vendor. Surface the FIRST vendor that owes one — its true action + why + which vendor —
  // so the hero says "Ask X for proof of insurance" and routes to X, not a blank "Decide".
  const coiFirst = useMemo(() => {
    try {
      const vends = (event.vendors || []).filter(v => v && String(v.name || '').trim() && !v.isInformal);
      for (const v of vends) { const act = coiNextAction(v, event, String(v.name).trim()); if (act) return { vendor: v, ...act }; }
    } catch { /* no coi engine */ }
    return null;
  }, [event]);
  // COI bundle counts for the all-clear payoff (parity with conflicts/decisions): how many
  // REQUIRED-COI vendors still owe a step, and the total required (the "N of N · on file"
  // denominator once cleared). Waived / not-required vendors never count toward the bundle.
  const coiCounts = useMemo(() => {
    try {
      const vends = (event.vendors || []).filter(v => v && String(v.name || '').trim() && !v.isInformal);
      const required = vends.filter(v => { try { const st = getVendorCOIState(v, event); return !!(st && st.required); } catch { return false; } });
      const open = required.filter(v => { try { return !!coiNextAction(v, event, String(v.name).trim()); } catch { return false; } }).length;
      return { open, total: required.length };
    } catch { return { open: 0, total: 0 }; }
  }, [event]);
  const sweepWindow = days != null && days >= 0 && days <= 3 && reconfirmables.length > 0 && !isPastEvent(event);
  const reconfirmedN = reconfirmables.filter(v => v.reconfirmed72 === true).length;
  const writeVendor = (id, patch, msg) => {
    const vs = (event.vendors || []).map(v => (v && v.id === id) ? { ...v, ...patch } : v);
    patchEvent({ vendors: vs }, msg);
  };
  // WAVE-B write path (a): booking status. The EXACT vocabulary every status
  // read expects (lib/vendorIntelligence header: 'Considering' | 'Quoted' |
  // 'Contracted' | 'Deposit Paid' | 'Confirmed', legacy 'Booked'/'Paid' read
  // as Confirmed). Tap the pill to move it forward — same one-tap cycle as
  // the lodging status rows; wraps back to Considering so a mis-tap is
  // recoverable in four more taps.
  const VENDOR_STATUS_LADDER = ['Considering', 'Quoted', 'Contracted', 'Deposit Paid', 'Confirmed'];
  const VENDOR_STATUS_MEANING = {
    'Considering': 'you’re still deciding',
    'Quoted': 'they’ve given you a price',
    'Contracted': 'they’ve said yes — you’ve agreed on the plan',
    'Deposit Paid': 'your deposit is in — one more confirm to fully lock them in',
    'Confirmed': 'you’ve locked them in for your date',
  };
  // Plain host-facing DISPLAY labels — the stored VALUES above stay the same for
  // storage + all the status logic (isVendorBooked, workstreams, seed data), only
  // what the host READS changes. Two fixes for a first-timer (host question,
  // 2026-07-13): "Contracted" was pro jargon → "Agreed"; and "Confirmed" is now
  // RESERVED for the vendor's own confirm-back chip — the host's own top state
  // reads "Locked in" so a new host never mistakes their own tracking for the
  // vendor's word.
  const VENDOR_STATUS_LABEL = {
    'Considering': 'Deciding',
    'Quoted': 'Got a price',
    'Contracted': 'Agreed',
    'Deposit Paid': 'Deposit paid',
    'Confirmed': 'Locked in',
    'Booked': 'Locked in', 'Paid': 'Locked in', // legacy stored values
  };
  const vendorStatusLabel = (s) => VENDOR_STATUS_LABEL[s] || s;
  const cycleVendorStatus = (v) => {
    const cur = (v.status === 'Booked' || v.status === 'Paid') ? 'Confirmed' : v.status;
    const next = VENDOR_STATUS_LADDER[(VENDOR_STATUS_LADDER.indexOf(cur) + 1) % VENDOR_STATUS_LADDER.length];
    writeVendor(v.id, { status: next },
      (v.name || v.category || 'This vendor') + ' → ' + vendorStatusLabel(next) + ' — ' + VENDOR_STATUS_MEANING[next] + '.');
  };
  // Audit #6 — tap-to-cycle hid the option set (a host couldn't predict what a
  // tap did, or jump straight to "Confirmed"). This opens an explicit picker of
  // the whole ladder; the pill toggles it, a chip sets the status directly.
  const [statusPickFor, setStatusPickFor] = useState(null); // vendor id whose picker is open
  const [mealPickFor, setMealPickFor] = useState(null); // guest index whose meal picker is open (#6)
  const [rsvpPickFor, setRsvpPickFor] = useState(null); // guest index whose RSVP picker is open (audit 2026-07-22)
  const setVendorStatus = (v, status) => {
    writeVendor(v.id, { status },
      (v.name || v.category || 'This vendor') + ' → ' + vendorStatusLabel(status) + ' — ' + VENDOR_STATUS_MEANING[status] + '.');
    setStatusPickFor(null);
  };
  const vendorStatusIsCurrent = (v, s) => (v.status === s) || ((v.status === 'Booked' || v.status === 'Paid') && s === 'Confirmed');
  // WAVE-B write path (c): money. Draft buffer for the "what you agreed to
  // pay" field (commits on blur/Enter, Escape abandons); both money writes use
  // the budget editor's MONEY-MOVE UNDO pattern — snapshot just the field the
  // write changes, one inline restore on the toast. Single-level, in-memory.
  const [vendorCostDraft, setVendorCostDraft] = useState(null); // string | null — only while the field is being edited
  // A DATE change moves every countdown, deadline, and shopping window — so it's drafted and
  // must be CONFIRMED before it cascades (host report 2026-07-16), instead of committing on
  // the picker's onChange. null = not editing; a string = a picked-but-unconfirmed date.
  const [dateDraft, setDateDraft] = useState(null);
  const commitVendorCost = (v) => {
    if (vendorCostDraft === null) return;
    const raw = String(vendorCostDraft).trim();
    setVendorCostDraft(null);
    const n = raw === '' ? '' : Math.max(0, Math.round(Number(raw) || 0));
    if (String(n) === String(v.cost ?? '')) return; // nothing changed — no write, no toast
    const prev = v.cost;
    const name = v.name || v.category || 'This vendor';
    writeVendor(v.id, { cost: n });
    toast(n ? name + ' — ' + fmt(n) + ' agreed. Payment tracking reads it now.' : name + ' — agreed price cleared.', {
      label: 'Undo',
      fn: () => writeVendor(v.id, { cost: prev === undefined ? '' : prev },
        Number(prev) > 0 ? name + ' back to ' + fmt(Number(prev)) + '.' : name + ' — no agreed price on file.'),
    });
  };
  const toggleVendorPaid = (v) => {
    const prev = !!v.balancePaid;
    const name = v.name || v.category || 'This vendor';
    writeVendor(v.id, { balancePaid: !prev });
    toast(!prev ? name + ' marked paid in full — payment reminders stop.' : name + ' marked not fully paid yet — the payment note is back.', {
      label: 'Undo',
      fn: () => writeVendor(v.id, { balancePaid: prev },
        name + (prev ? ' — back to paid in full.' : ' — back to not fully paid.')),
    });
  };
  // ── Vendor Brief (VB2, ported): mint a vendor-facing share link the SAME
  // way legacy's VendorBriefModal does — buildVendorBriefPayload's AUDITED
  // WHITELIST (lib/vendorBrief.js) is the ONLY thing that ever leaves the
  // host's hands; money/ops/private notes never enter the payload. Prefer a
  // short server-resolvable code (mintVendorBriefLink — VB2 Phase 1: the
  // backend rebuilds the brief live, so the link never goes stale); fall back
  // to the legacy frozen base64 snapshot when the API isn't configured or
  // minting fails — sharing must never break because a backend is down. The
  // resulting ?vendor=TOKEN link on THIS origin is caught by main.jsx's own
  // redirect to the one real public brief page (legacy App.js) — no second
  // brief surface is ever rendered here.
  const [vendorBrief, setVendorBrief] = useState(null); // { vendorId, url, qrDataUrl, minting, copied }
  useEffect(() => { setVendorBrief(null); }, [eventId]); // never carry a stale link across an event switch
  const shareVendorBrief = async (v) => {
    setVendorBrief({ vendorId: v.id, url: null, qrDataUrl: null, minting: true, copied: false });
    let code = null;
    try {
      if (isVendorBriefApiConfigured() && event.id && v.id) code = await mintVendorBriefLink(event.id, v.id);
    } catch { code = null; }
    const brief = buildVendorBriefPayload(v, event, ros, profile);
    const token = code || b64encode(JSON.stringify(brief));
    const url = window.location.origin + window.location.pathname + '?vendor=' + token;
    let qr = null;
    try { qr = await QRCode.toDataURL(url, { width: 480, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }); } catch { qr = null; }
    setVendorBrief(b => (b && b.vendorId === v.id) ? { vendorId: v.id, url, qrDataUrl: qr, minting: false, copied: false } : b);
  };
  const copyVendorBriefLink = () => {
    if (!vendorBrief || !vendorBrief.url) return;
    navigator.clipboard?.writeText(vendorBrief.url).then(() => {
      setVendorBrief(b => b ? { ...b, copied: true } : b);
      setTimeout(() => setVendorBrief(b => b ? { ...b, copied: false } : b), 2000);
    }).catch(() => toast('Couldn’t copy on this browser — long-press the link to select it.'));
  };
  // HOST-APPROPRIATE-VENDOR-UI: creation adds only category + name — no
  // forced COI/contract/deposit fields. Those tracking fields only ever
  // populate from a later explicit host or engine action, never at creation,
  // so a friend-or-family "vendor" never starts life looking like a paid
  // booking with paperwork due.
  const addVendorCategory = (category, name) => {
    const v = { id: 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), category, name: name || '' };
    patchEvent({ vendors: [...(event.vendors || []), v] }, (name || category) + ' added — open it to add what you know.');
    setSheet(s => ({ ...s, focus: v.id }));
  };
  const runSweepDrafts = () => {
    sweepTimers.current.forEach(clearTimeout); sweepTimers.current = [];
    reconfirmables.forEach((v, i) => {
      if (v.reconfirmed72) return;
      sweepTimers.current.push(setTimeout(() => setSweepState(m => ({ ...m, [v.id]: 'drafting' })), 120 + i * 430));
      sweepTimers.current.push(setTimeout(() => setSweepState(m => ({ ...m, [v.id]: 'ready' })), 520 + i * 430));
    });
  };
  const spend = useMemo(() => {                          // lib/hostSpending — budget single-source
    try { return hostSpending(event, foodPP.priceFactor); } catch { return { total: 0, spent: 0, committed: 0 }; }
  }, [event, foodPP.priceFactor]); // was missing priceFactor — the budget recovery panel below re-derives
    // the same total unmemoized (always fresh), so once regional pricing
    // resolved async after mount, this stale figure and the recovery panel's
    // fresh one could show two different "how far over" dollar amounts on
    // the same sheet (found in the per-screen audit).
  const money = { planned: spend.total, committed: spend.committed, spent: spend.spent, spentEstimated: spend.spentEstimated || 0, lines: Array.isArray(event.budget) ? event.budget.length : 0 };
  // The HOST money breakdown — hostSpending's own plan-priced terms, shared by
  // the Budget sheet and After. NEVER planner category rows (Rule 4): the host
  // model is one number plus where the plan says it's going.
  const hostSpendRows = () => [
    { label: 'Food & drinks', est: spend.foodEstimate || 0, got: spend.foodBought || 0, kind: 'food' },
    { label: 'Supplies', est: spend.suppliesEstimate || 0, got: spend.suppliesBought || 0, kind: 'supplies' },
    ...(spend.hasCapacity ? [{ label: 'Seats, tables & space', est: spend.capacityEstimate || 0, got: spend.capacityBought || 0, kind: 'space' }] : []),
    ...(spend.crabEstimate ? [{ label: 'The crab order', est: spend.crabEstimate || 0, got: spend.crabBought || 0, kind: 'crabs' }] : []),
  ].filter(r => r.est > 0 || r.got > 0);
  const guests = guestNumber(event);
  // lib/attendanceModel — likely turnout, WITH the playbook's own attendance
  // overrides (a crab feast's turnout curve isn't a wedding's).
  const expect = expectedFromPlanned(guests, event.type, (() => { try { return getPlaybook(event.type); } catch { return null; } })());
  // The RSVP truth for this event, when the host keeps a roster. Same engine the
  // food + budget sheets read — the home tile was the one surface that ignored it.
  const gBand = useMemo(() => { try { return attendanceBand(event); } catch { return null; } }, [event]);
  const rsvpBy = rsvpDeadlineFor(event);                  // lib/dates — reply-by date
  // Only a date the HOST set exists. `source:'derived'` is our own event.date−7d guess, and
  // no surface — guest OR host — may state it as fact. The grounded proposal lives in
  // lib/replyBy.js and is offered, with its reasoning, inside the editor.
  const rsvpByIsSet = !!(rsvpBy && rsvpBy.iso && rsvpBy.source === 'override');
  // WAVE-6/7 CONTRACT: eventPlan(event) owns the whole attention split now —
  // `nextActions` arrives post-snooze AND worry-free (the counted queue),
  // `setAside` is the snoozed pile (items carry their comeback dates), and
  // `worries` is the HEADS-UP lane (risks-surface attention items incl. the
  // risks bundle, full action shape, never counted). The shell renders; it
  // re-derives none of it. Guard: setAside reads as [] unless it's a real
  // array (same for the engine's own error path, which returns all three).
  const actions = plan.nextActions || [];
  const setAsideItems = Array.isArray(plan.setAside) ? plan.setAside : [];
  // HERO REDESIGN (host board ruling, approved): risk raises ("Have a plan
  // for: …") are WORRIES — a contingency to hold, not a chore to do. The
  // ENGINE owns the split (eventPlan.worries; nextActions arrives worry-free)
  // so every consumer — V1 heroes, exhale, auto-route, this queue — speaks
  // the same numbers. The wave-6 seam audit caught the shell-only split
  // making V1 say "Have a plan for 4 things…" over V2's "All quiet".
  const _baseWorries = Array.isArray(plan.worries) ? plan.worries : [];
  // BUDGET HONESTY (audit 2026-07-22): eventPlan carries no budget-over term, so the
  // command surface could read calm while the Budget sheet + "Where you stand" both said
  // "over". Surface it here as a heads-up (a watch, not a blocking action — it opens the
  // Budget sheet). Uses the EXACT field the budget readout uses: money.committed > money.planned.
  // Not on a PAST event — then the overage is a final fact (shown in the recap), not a
  // live "worth keeping an eye on" heads-up (post-event wire 2026-07-22).
  const _overBudget = (!isPastEvent(event) && money.planned && money.committed > money.planned) ? Math.round(money.committed - money.planned) : 0;
  const worries = _overBudget > 0
    ? [..._baseWorries, { id: 'budget-over', category: 'money', title: `Known costs are $${_overBudget.toLocaleString()} over your budget`, route: { tab: 'Budget' } }]
    : _baseWorries;
  // BOARD RULING (2026-07-18): a vendor-confirm is a RECORD-ONLY self-report ("Mark as
  // locked in"), not a grounded next-step — it earns the command hero's one loud slot
  // ONLY when it's the single vendor gating readiness (rollup.counts.toConfirm === 1: the
  // last booked-but-unconfirmed vendor, computed off the booking axis, not status alone).
  // Every other confirm is demoted OUT of the hero and the below-fold queue — it lives in
  // the vendor cockpit as a status control; the "all booked · N to confirm" rollup line
  // still carries the count so nothing is hidden. Elegant loop only — production queue
  // (App.js) is untouched.
  const _vRollup = plan.vendorReadinessRollup;
  const confirmGating = !!(_vRollup && _vRollup.counts && _vRollup.counts.toConfirm === 1);
  const isVendorConfirmAction = (a) => !!(a && a.route && a.route.vendorId && !a.route.vendorSection);
  // ROLL-TO-NEXT (host 2026-07-18): a hero decision the host just settled is dropped from the
  // queue so the hero advances — even when its underlying PHASE lingers (e.g. phase:food still
  // has 3 open items after the sourcing pick). Without this the host re-sees the same hero after
  // deciding. Accumulates (not one id) so satisfying the next doesn't un-filter the last; cleared
  // on event switch. Elegant loop only.
  const [satisfiedIds, setSatisfiedIds] = useState([]);
  useEffect(() => { setSatisfiedIds([]); }, [eventId]);
  const queue = elegantMode
    ? [
        ...actions.filter(a => a && !satisfiedIds.includes(a.id) && !(isVendorConfirmAction(a) && !confirmGating)),
        // Foundational pick-decisions (Ceremony Timing, …) join the queue AFTER the ranked
        // actions — so after the last real action is settled the hero rolls to them (staying in
        // the ask flow), instead of jumping to the calm "all quiet" screen with a decision still open.
        ...blockerDecisions.filter(bd => !satisfiedIds.includes(bd.id)),
      ]
    : actions;
  // ONE calm read for the whole screen (re-audit 2026-07-14): the NEXT tile said
  // "All quiet" over a lone calm-category filler while the lifecycle "all clear"
  // suffix demanded a truly empty list — two strictnesses of calm 40px apart.
  // Both now consult this predicate; a single neutral/calendar/heart item IS
  // quiet. Reads the QUEUE (post-worry-split): heads-ups never break the calm.
  const listIsCalm = queue.length === 0
    || (queue.length === 1 && CALM_CATEGORIES.has(String(queue[0].category || '')));
  // REBALANCE (host-approved 2026-07-17): instruction-first Command. When the
  // engine has an ask, the display slot speaks it (the ASK) and queue[0]
  // renders as the one hero panel; when there is nothing to ask (calm, day-of,
  // past, no date) the countdown keeps the display — the date IS the story then.
  const askMode = days !== null && days > 0 && !listIsCalm && queue.length > 0;
  // ONE bottom overlay at a time (rebalance): while the hero zone is on screen
  // it owns "next" — the pinned bar stays away; once the hero scrolls out, the
  // bar fades in as the echo. (The dock already auto-hides on scroll — the two
  // swap, never stack.)
  // COMPLETION BEAT (host request 2026-07-17): when a part of the plan flips
  // to handled, say so once, in the confirmation-green voice, with the REAL
  // count — then get out of the way. Deferrals do NOT beat (a snooze is not
  // progress; its own toast already reassures with the comeback date).
  const [beat, setBeat] = useState(null);
  const partsPrevRef = useRef(null);
  useEffect(() => { partsPrevRef.current = null; setBeat(null); }, [event.id]);
  useEffect(() => {
    const done = phaseCues && Number.isFinite(Number(phaseCues.completedCount)) ? Number(phaseCues.completedCount) : null;
    const total = phaseCues && Number(phaseCues.totalCount);
    if (done == null) return;
    if (partsPrevRef.current != null && done > partsPrevRef.current && total) {
      setBeat(done >= total
        ? 'That was the last one — all ' + total + ' handled. The plan is quiet.'
        : 'Handled — ' + done + ' of ' + total + '. The plan just got quieter.');
      const t = setTimeout(() => setBeat(null), 6000);
      partsPrevRef.current = done;
      return () => clearTimeout(t);
    }
    partsPrevRef.current = done;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseCues && phaseCues.completedCount]);
  // HERO RECEIPT (host ruling 2026-07-17): completion satisfaction lives IN the
  // panel, not a toast at the fold. Muted sentence; the STATE is the green
  // done-dot (Confirmations-Green, footprint shrunk per UX_02). The advancing
  // panel wears a brief ok-ring pulse — the beat, never blocking.
  const [heroReceipt, setHeroReceipt] = useState(null);
  const receiptTimerRef = useRef(null);
  const askModeRef = useRef(false);
  // ALL-CLEAR PAYOFF (host 2026-07-18): when a whole bundle goes N→0 on THIS event,
  // the hero shows the earned moment before advancing — {kind, count}. Conflicts get
  // the timeline proof (the synced morning IS the proof a clash is gone); every other
  // bundle gets the clean type reward. Set by the prevBundleClear transition, dismissed
  // by the host's handoff tap (calm — no auto-timer to yank it away). Elegant loop only.
  const [justCleared, setJustCleared] = useState(null);
  // Decluttered conflict hero (host 2026-07-18): the impact ("why") is tucked behind a
  // tap, and a "Set a different time" row opens an inline picker (custom arrival time).
  const [conflictWhyOpen, setConflictWhyOpen] = useState(false);
  const [conflictTime, setConflictTime] = useState(null); // null=closed, 'HH:MM'=picking
  const [decDiscloseId, setDecDiscloseId] = useState(null); // which decision's "other ways" are open
  askModeRef.current = askMode;
  // AMBIENT ATTENTION (modern channels, host direction 2026-07-17): the ask
  // reaches the host through surfaces they already glance at — the browser tab
  // and the OS badge — never more chrome on the board. Tab = the one ask (or
  // the earned quiet). Badge = CRITICALS ONLY; a calm plan clears it, so the
  // badge's absence is itself the calm signal.
  useEffect(() => {
    try {
      const base = 'Event Boss';
      if (stage === 'plan' && askMode && queue[0]) document.title = heroAskFor(queue[0], event) + ' — ' + base;
      else if (stage === 'plan' && listIsCalm) document.title = 'All quiet — ' + base;
      else document.title = base;
    } catch { /* title is cosmetic */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, askMode, listIsCalm, queue.length && queue[0] && queue[0].id, event.id]);
  useEffect(() => {
    try {
      const crit = queue.filter(a => a && a.level === 'critical').length;
      if (navigator.setAppBadge) { if (crit) navigator.setAppBadge(crit); else if (navigator.clearAppBadge) navigator.clearAppBadge(); }
    } catch { /* badging unsupported */ }
  }, [queue]);
  const heroZoneRef = useRef(null);
  const [heroInView, setHeroInView] = useState(true);
  useEffect(() => {
    const el = heroZoneRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setHeroInView(false); return; }
    const io = new IntersectionObserver((es) => { es.forEach(e => setHeroInView(e.isIntersecting)); }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [stage, event.id]);
  const handled = plan.handled || [];
  const rollup = plan.vendorReadinessRollup;

  // "Since you were last here" — lib/returnNarration, the original's exact
  // semantics: derive ONE line from the previous visit's snapshot (30-min gap
  // guard so reloads stay quiet), then stamp the fresh snapshot; the line
  // never re-tells what the hero already says.
  const [returnLine, setReturnLine] = useState(null);
  useEffect(() => {
    try {
      const prev = readReturnSnapshot(event.id);
      const n = deriveReturnNarration(event, prev);
      writeReturnSnapshot(event.id, buildReturnSnapshot(event));
      if (n.shouldShow && !narrationDuplicatesTelling(n.line,
        // The QUEUE's head, never a worry: the returning host is greeted with
        // what the board actually leads with (post-snooze, post-worry-split).
        queue[0] && queue[0].title,
        phaseCues && phaseCues.nextCue && phaseCues.nextCue.label)) {
        // #3 activation: on a real return, carry the readiness fraction NOW and
        // the delta since last visit — the "you moved N forward" momentum reward
        // that no always-on tile shows. Pure exposure of the phaseCues ledger.
        if (phaseCues && phaseCues.totalCount > 0) {
          n.readyNow = { done: phaseCues.completedCount, total: phaseCues.totalCount };
          const prevDone = prev && prev.ready ? Number(prev.ready.done) : null;
          n.readyDelta = (prevDone != null && Number.isFinite(prevDone)) ? (phaseCues.completedCount - prevDone) : null;
        }
        setReturnLine(n);
      } else setReturnLine(null);
    } catch { setReturnLine(null); }
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [lens, setLens] = useState('all');
  const lensSet = [...new Set(queue.map(a => DOMAIN_LENS[a.domain] || 'Plan'))];
  const show = a => lens === 'all' || (DOMAIN_LENS[a.domain] || 'Plan') === lens;
  // Queue presentation state (wave-6 hero): the "+N more" expander past the
  // 6-card cap, and per-bundle in-place expansion. Both reset per event.
  const [queueOpen, setQueueOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState({});
  // Snooze "pick a day" (host-approved 2026-07-15): which queue card has the
  // inline day picker open, plus the in-progress choice — { key, val }. The
  // grounded proposal stays the DEFAULT ("not now" is untouched); this is the
  // quiet second path, and every write still goes through clampSnoozeUntil.
  const [snoozePick, setSnoozePick] = useState(null);
  useEffect(() => { setQueueOpen(false); setBundleOpen({}); setSnoozePick(null); }, [event.id]);

  // ── Actions that ACT: patch the real event, let the engine recompute ──
  const [editor, setEditor] = useState(null); // which card's inline editor is open
  const [customBudget, setCustomBudget] = useState(''); // host's own number, either surface
  const [guestDraft, setGuestDraft] = useState('');      // in-progress typed guest count, before commit
  const [sheet, setSheet] = useState(null);   // deep-link landing: {kind, focus}
  // Row-level landing (audit 2026-07-22): a route resolved to {kind:'space',
  // focus:'parking'|…} opens THAT row's inline note editor — the last leg of the
  // parking/load-in deep links (resolver branch in lib/routeResolver.js).
  useEffect(() => {
    if (sheet && sheet.kind === 'space' && sheet.focus && PLACE_NOTE_FIELD[sheet.focus]) {
      setPlaceNoteOpen(sheet.focus);
      setPlaceNoteDraft(String(event[PLACE_NOTE_FIELD[sheet.focus]] || ''));
    }
    // Guests row-level landing (Up-Next #4): 'entry' scrolls to the count
    // stepper (count mode) or the counting chips (roster mode) and focuses the
    // number input; 'invites' scrolls to the share-and-invite block. Anchors
    // exist per mode; the first one present wins.
    if (sheet && sheet.kind === 'guests' && sheet.focus) {
      const targets = sheet.focus === 'entry'
        ? ['guests-entry-anchor', 'guests-counting-anchor']
        : ['guests-invites-anchor'];
      setTimeout(() => {
        try {
          const el = targets.map(t => document.getElementById(t)).find(Boolean);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const inp = el.querySelector('input');
          if (inp) { try { inp.focus({ preventScroll: true }); } catch { /* focus is best-effort */ } }
        } catch { /* sheet is still the right landing */ }
      }, 120);
    }
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheetRef = useRef(null);              // the .sheet dialog container (a11y focus mgmt)
  // The meaning sheet can be opened generically (Sections directory) which
  // doesn't call openMeaning — seed the draft here so the sheet is never blank
  // (audit: title over empty body). Only seeds when null, so it never clobbers edits.
  useEffect(() => {
    if (sheet && sheet.kind === 'meaning' && !meaningDraft) setMeaningDraft(buildMeaningDraft());
  }, [sheet, meaningDraft]); // eslint-disable-line react-hooks/exhaustive-deps
  // When the plan's "Confirm [vendor]" routes here (Vendors + a vendorId, no
  // specific section like documents/payment), auto-open that vendor's status
  // picker so the confirm choices are right there — the host asked "where do I
  // do that?". Keyed on [sheet] so it fires once on open, never re-opens after
  // the host closes it. COI/payment routes carry a vendorSection, so they skip.
  useEffect(() => {
    if (sheet && sheet.kind === 'vendors' && sheet.focus && !sheet.vendorSection) {
      const v = (event.vendors || []).find(x => x && x.id === sheet.focus);
      if (v && !v.isInformal && !vendorStatusIsCurrent(v, 'Confirmed')) setStatusPickFor(sheet.focus);
    }
    // ENFORCEMENT-GAP-1 (2026-07-15): vendorSection was WRITE-ONLY — a payment /
    // COI raise (surfaceRegistry vendor-payments / vendor-coi) routed here with
    // vendorSection:'payment'|'documents', the card expanded on the vendor row,
    // but nothing ever landed the SECTION (the wave-6 audit flagged exactly this).
    // Now the money/insurance sub-block is scrolled into view once the card is
    // open, so a "Send payment" / "Get proof of insurance" CTA lands on the field
    // it names, not the top of the card. Anchors: v-paydue-/v-cost- (payment),
    // v-coi- (documents); falls back to the card if the block isn't rendered.
    if (sheet && sheet.kind === 'vendors' && sheet.focus && sheet.vendorSection) {
      const id = String(sheet.focus);
      const targets = sheet.vendorSection === 'payment'
        ? ['v-paydue-' + id, 'v-cost-' + id]
        // COI-intent routes land on the COI row first; contract-intent (documents)
        // land on the contract row first. Same section, right sub-row (audit 2026-07-21).
        : sheet.vendorSection === 'coi'
        ? ['v-coi-' + id, 'v-contract-' + id]
        : sheet.vendorSection === 'documents'
        ? ['v-contract-' + id, 'v-coi-' + id]
        : sheet.vendorSection === 'promises'
        ? ['v-promises-' + id]
        : [];
      setTimeout(() => {
        try {
          const el = targets.map(t => document.getElementById(t)).find(Boolean);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch { /* DOM not ready — the expanded card is still the right landing */ }
      }, 90);
    }
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  // Quick-switcher / command palette (build-map #9): jump across events AND
  // destinations from one search box. Cmd/Ctrl-K toggles it (the phone-frame
  // ruling caps this at parity, not 9 — there's a visible entry point too).
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQ, setPaletteQ] = useState('');
  const paletteInputRef = useRef(null);
  // Ask-the-plan Q&A (build-map #7): a typed question answered deterministically
  // from the plan's own engine outputs, with the assumptions shown — no fake AI.
  const [askQ, setAskQ] = useState('');
  const [askResult, setAskResult] = useState(null);
  // B3 — the LLM escalation state, layered ON TOP of the deterministic askResult.
  // null | {loading:true} | {answer, grounded} | {unavailable:true}. Only ever
  // set when the deterministic path misses AND a backend is configured.
  const [askLLM, setAskLLM] = useState(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setPaletteOpen(o => !o); }
      else if (e.key === 'Escape' && paletteOpen) { setPaletteOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);
  useEffect(() => { if (paletteOpen) { setPaletteQ(''); setTimeout(() => { try { paletteInputRef.current?.focus(); } catch { /* not mounted */ } }, 20); } }, [paletteOpen]);
  // Audit #1/#2 (host review board): on a phone the Back gesture must CLOSE an
  // open overlay (a sheet or the command palette), not exit the app. Push ONE
  // history entry when an overlay opens; Back pops it and we close the overlay.
  // If it's closed another way (Close button, a deep-link route), we consume the
  // pushed entry so the history stack stays balanced.
  const overlayOpen = !!sheet || paletteOpen;
  const overlayPushedRef = useRef(false);
  useEffect(() => {
    if (overlayOpen && !overlayPushedRef.current) {
      overlayPushedRef.current = true;
      try { window.history.pushState({ ngwOverlay: true }, ''); } catch { /* history blocked */ }
    } else if (!overlayOpen && overlayPushedRef.current) {
      overlayPushedRef.current = false;
      try { if (window.history.state && window.history.state.ngwOverlay) window.history.back(); } catch { /* history blocked */ }
    }
  }, [overlayOpen]);
  useEffect(() => {
    const onPop = () => {
      // Back was pressed. If our entry was live, swallow it and close the overlay
      // instead of letting the browser leave the app.
      if (overlayPushedRef.current) {
        overlayPushedRef.current = false;
        setPaletteOpen(false);
        setSheet(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // Sheet modal a11y (per-screen audit, cross-cutting fix — all 22 sheets share
  // this one container). Adds what every sheet was missing: Escape-to-close,
  // initial focus into the dialog, and focus restore to whatever opened it.
  // Runs once per open (dep is `sheet`; within-sheet interactions use other
  // state, so identity is stable while open). Mirrors the splash keydown idiom
  // (window listener + cleanup) but in BUBBLE phase, not capture, so a focused
  // field's own Escape-to-cancel (food tune, vendor cost, diet, guest count)
  // runs first and Escape only closes the sheet when focus isn't in a text box.
  useEffect(() => {
    if (!sheet) return undefined;
    const opener = document.activeElement; // who opened us (a button, usually)
    const el = sheetRef.current;
    // Move focus into the dialog on open — but never yank it from a child that
    // already claimed focus (an autoFocus input in the sheet body).
    if (el && !el.contains(document.activeElement)) el.focus();
    const onKey = (e) => {
      // FOCUS TRAP (a11y audit #12): aria-modal="true" promises containment, but
      // Tab used to walk out into the background behind the sheet. Keep Tab inside
      // the dialog — cycle first<->last, and pull focus back in if it's escaped.
      if (e.key === 'Tab' && el) {
        const nodes = Array.from(el.querySelectorAll(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )).filter(n => n.offsetWidth > 0 || n.offsetHeight > 0 || n === document.activeElement);
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1], a = document.activeElement;
        if (!el.contains(a)) { e.preventDefault(); first.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        return;
      }
      if (e.key !== 'Escape') return;
      // Where did Escape originate? Check e.target, NOT document.activeElement:
      // React flushes a field's own Escape-to-cancel synchronously (unmounting the
      // input, so focus has already moved to <body>) before this window-level
      // handler runs — activeElement is stale by now, but e.target still points at
      // the field the keystroke fired on. If Escape came from a text field, that
      // field's cancel owns it; don't also close the sheet. (activeElement kept as
      // a secondary check for fields that don't unmount on Escape.)
      const isField = (n) => n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable);
      if (isField(e.target) || isField(document.activeElement)) return;
      setSheet(null);
    };
    window.addEventListener('keydown', onKey, false);
    return () => {
      window.removeEventListener('keydown', onKey, false);
      // Restore focus to the opener (no-op if it's gone or was a programmatic
      // open from voice/routes with no real DOM trigger).
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [sheet]);
  // ── DESTINATION-2 · Where everyone stays ── the stay-details form is local
  // state seeded from event.lodging each time the sheet opens; ONE explicit
  // save writes the whole card back through patchEvent (one toast, one write).
  // ── Sprint 1 · Who sits where ── tap-a-name-then-tap-a-table: one picked
  // guest held in local state; tapping a table writes the assignment through
  // the pure engine helpers (lib/seatingPlan), patchEvent persists. Rename
  // uses the same field-plus-save pattern as the city row. State resets each
  // time the sheet opens; a deep-linked guest's table starts expanded.
  const [seatPick, setSeatPick] = useState(null);           // guestId waiting for a table
  const [seatOpenTable, setSeatOpenTable] = useState(null); // expanded table number
  const [tableNameDraft, setTableNameDraft] = useState(null); // { num, value }
  const [seatView, setSeatView] = useState('list');   // 'list' | 'plan' (floor plan)
  const [dayView, setDayView] = useState('walk');     // 'walk' (one moment at a time) | 'list' (whole agenda)
  const [seatDrag, setSeatDrag] = useState(null);      // { number, x, y } during an active puck drag
  const [guestDrag, setGuestDrag] = useState(null);    // { id, name, x, y } dragging a PERSON onto a table
  const guestDraggedRef = useRef(false);               // suppress the tap-to-pick click after a drag
  const [seatSelTable, setSeatSelTable] = useState(null); // v5 progressive disclosure: the floor table opened inline
  const [doorDrag, setDoorDrag] = useState(null);         // { x, y } while dragging the host-placed door
  const floorRef = useRef(null);                       // the floor-plan canvas element
  const justDraggedRef = useRef(false);                // suppress the tap-to-seat click that follows a drag
  const seatingSheetOpen = !!(sheet && sheet.kind === 'seating');
  // Default puck layout when a table has no saved position — a tidy grid in
  // canvas fractions (0..1), so it's responsive to whatever width the sheet is.
  // Grid columns/rows for the default puck layout — shared by the position
  // helper and the container-height calc so they never disagree. Columns cap at
  // 5 (was 3, which forced 6+ rows for a big reunion and stacked the 52px pucks
  // on top of each other in a fixed-height box); the floorplan height then grows
  // with the row count so pucks never collide before the host arranges them.
  const tableGrid = (n) => {
    const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n)))));
    return { cols, rows: Math.max(1, Math.ceil(Math.max(1, n) / cols)) };
  };
  const defaultTablePos = (i, n) => {
    const { cols, rows } = tableGrid(n);
    const col = i % cols, r = Math.floor(i / cols);
    return { x: (col + 0.5) / cols, y: (r + 0.5) / rows };
  };
  // Start dragging a table puck: pointer move updates a transient position,
  // pointer up commits it to event.tablePos (fractions). A real drag sets
  // justDraggedRef so the click that follows doesn't also fire tap-to-seat.
  const startPuckDrag = (num) => (e) => {
    e.preventDefault(); e.stopPropagation();
    justDraggedRef.current = false;
    let last = null;
    const move = (ev) => {
      const el = floorRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      last = { x, y };
      justDraggedRef.current = true;
      setSeatDrag({ number: num, x, y });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (last) patchEvent({ tablePos: { ...(event.tablePos || {}), [num]: last } }, null);
      setSeatDrag(null);
      // clear the drag flag AFTER the click has had a chance to read it
      setTimeout(() => { justDraggedRef.current = false; }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  // Drag a PERSON onto a table (or to the tray to remove). Threshold-gated so a
  // small movement is still a tap-to-pick; a real drag hit-tests the table pucks
  // under the drop point via elementsFromPoint and seats/unseats through the same
  // pure helpers as tap-to-seat (host 2026-07-22).
  const startGuestDrag = (g) => (e) => {
    if (e.button != null && e.button !== 0) return;
    guestDraggedRef.current = false;
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
      moved = true; guestDraggedRef.current = true;
      setGuestDrag({ id: g.id, name: g.name, x: ev.clientX, y: ev.clientY });
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) {
        const els = document.elementsFromPoint(ev.clientX, ev.clientY) || [];
        const puck = els.find(el => el.classList && el.classList.contains('tpuck'));
        if (puck) {
          const t = (seating.tables || []).find(x => x.number === Number(puck.getAttribute('data-tnum')));
          if (t) seatGuestAt(g, t);
        } else if (g.table && els.some(el => el.classList && el.classList.contains('seat-tray'))) {
          unseatGuest(g);
        }
      }
      setGuestDrag(null);
      setTimeout(() => { guestDraggedRef.current = false; }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  // Host-placed DOOR: the app has no room geometry, so the host drops the door
  // where it really is. Dragging updates event.doorPos (fractions) — this is what
  // grounds "seat near the door" instead of the app inventing a wall (v5).
  const startDoorDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    let last = null;
    const move = (ev) => {
      const el = floorRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      last = { x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) };
      setDoorDrag(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (last) patchEvent({ doorPos: last }, null);
      setDoorDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  useEffect(() => {
    if (!seatingSheetOpen) { setSeatPick(null); setSeatOpenTable(null); setTableNameDraft(null); setSeatSelTable(null); return; }
    const focusG = sheet && sheet.focus != null
      ? (event.guests || []).find(g => g && String(g.id) === String(sheet.focus)) : null;
    setSeatOpenTable(focusG && focusG.table ? Number(focusG.table) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatingSheetOpen, event.id]);
  const seatGuestAt = (g, t) => {
    patchEvent({ guests: assignGuestToTable(event.guests || [], g.id, t.number) },
      (g.name || 'Guest') + ' → ' + t.label + '.');
    setSeatPick(null);
  };
  const unseatGuest = (g) => {
    patchEvent({ guests: unassignGuest(event.guests || [], g.id) },
      (g.name || 'Guest') + ' needs a seat again.');
    setSeatPick(null);
  };
  const stepTableCount = (delta) => {
    const next = clampTableCount(seating.tableCount + delta);
    if (next === seating.tableCount) return;
    // Shrinking can strand people on a table that no longer exists — they come
    // back to the needs-a-seat list in the same write, never invisible.
    let gs = event.guests || [];
    const bumped = gs.filter(g => g && Number(g.table) > next);
    bumped.forEach(g => { gs = unassignGuest(gs, g.id); });
    patchEvent({ tables: next, ...(bumped.length ? { guests: gs } : {}) },
      next + (next === 1 ? ' table' : ' tables') + ' now'
      + (bumped.length ? ' — ' + bumped.length + (bumped.length === 1 ? ' person needs' : ' people need') + ' a seat again' : '') + '.');
  };
  const saveTableName = (num) => {
    const raw = String((tableNameDraft && tableNameDraft.value) || '').trim();
    patchEvent({ tableNames: renameTable(event.tableNames, num, raw) },
      raw ? '“' + raw + '” it is.' : 'Back to “Table ' + num + '”.');
    setTableNameDraft(null);
  };
  const autoSeatByGroup = () => {
    const stillOpen = (gs) => gs.filter(g => g && g.rsvp === 'Yes' && !g.table).length;
    const before = stillOpen(event.guests || []);
    const gs = autoAssignByGroup(event.guests || [], seating.tableCount);
    const placed = before - stillOpen(gs);
    if (!placed) { toast('No one to place automatically — this works from each guest’s group, and nobody waiting has one.'); return; }
    // HONEST: the engine spreads guests one-by-one across tables (legacy
    // behavior, preserved) — it balances the room, it does NOT keep groups
    // together. The toast says what actually happened.
    patchEvent({ guests: gs },
      placed + (placed === 1 ? ' person' : ' people') + ' placed, spread evenly across the tables — groups don’t sit together this way. Tap a name, then a table, to adjust.');
  };
  const [lodgeForm, setLodgeForm] = useState(null);
  const lodgeSheetOpen = !!(sheet && sheet.kind === 'lodging');
  useEffect(() => {
    if (!lodgeSheetOpen) { setLodgeForm(null); return; }
    const lo = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
    const b = Array.isArray(lo.backupOptions) ? lo.backupOptions.filter(Boolean) : [];
    setLodgeForm({
      hotelName: lo.hotelName || '', rate: lo.rate != null ? String(lo.rate) : '',
      code: lo.code || '', deadline: lo.deadline || '',
      // Unlimited backups (per-screen audit: the form was hard-capped at 2, so a
      // 3rd option was silently unenterable). One row per saved backup, plus the
      // host can add more.
      backups: b.length ? b.map(x => ({ name: (x && x.name) || '', note: (x && x.note) || '' })) : [{ name: '', note: '' }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lodgeSheetOpen, event.id]);
  const saveLodging = () => {
    const f = lodgeForm || {};
    const t = (v) => String(v || '').trim();
    const backups = (Array.isArray(f.backups) ? f.backups : [])
      .map(x => (t(x.name) ? { name: t(x.name), note: t(x.note) || null } : null))
      .filter(Boolean);
    const rate = parseFloat(f.rate);
    patchEvent({
      lodging: {
        ...((event.lodging && typeof event.lodging === 'object') ? event.lodging : {}),
        hotelName: t(f.hotelName) || null,
        rate: Number.isFinite(rate) && rate > 0 ? rate : null,
        code: t(f.code) || null,
        deadline: t(f.deadline) || null,
        backupOptions: backups,
      },
    }, t(f.hotelName)
      ? 'Stay details saved — guests can get the where-to-stay note now.'
      : 'Stay details saved.');
  };
  // ── DESTINATION-3 · Who pays for what — form state mirrors lodgeForm:
  // seeded from event.costSharing when the sheet opens, cleared on close.
  const [csForm, setCsForm] = useState(null);
  const csSheetOpen = !!(sheet && sheet.kind === 'costshare');
  useEffect(() => {
    if (!csSheetOpen) { setCsForm(null); return; }
    const cs = (event.costSharing && typeof event.costSharing === 'object') ? event.costSharing : {};
    setCsForm({
      reason: cs.reason || '', cadence: cs.cadence || '',
      tiers: (Array.isArray(cs.tiers) ? cs.tiers.filter(Boolean) : []).map(t => ({
        label: t.label || '', amount: t.amount != null ? String(t.amount) : '', note: t.note || '',
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csSheetOpen, event.id]);
  const saveCostSharing = () => {
    const f = csForm || {};
    const t = (v) => String(v || '').trim();
    // Unlabeled tiers are dropped on save — same rule as the engine reader
    // (a tier the host can't name isn't a tier yet); amounts stay optional.
    const tiers = (f.tiers || []).map(x => {
      const amt = parseFloat(x.amount);
      return t(x.label)
        ? { label: t(x.label), amount: Number.isFinite(amt) && amt > 0 ? amt : null, note: t(x.note) || null }
        : null;
    }).filter(Boolean);
    patchEvent({
      costSharing: {
        ...((event.costSharing && typeof event.costSharing === 'object') ? event.costSharing : {}),
        mode: 'pooled-dues',
        reason: t(f.reason) || null,
        cadence: t(f.cadence) || null,
        tiers,
      },
    }, tiers.length
      ? 'Saved — ' + tiers.length + ' contribution tier' + (tiers.length === 1 ? '' : 's') + ' on record.'
      : 'Saved — add tiers when you know who chips in what.');
  };
  // Tap a roster row → cycle that guest's booking status. EVERY write stamps
  // updatedAt (ms epoch, Date.now() — the clock lib/travelPlan reads): the
  // engine's "just changed" flag depends on it.
  const cycleLodging = (row) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.lodging && typeof tr.lodging === 'object') ? tr.lodging : {};
    const next = nextLodgingStatus(cur.status);
    gs[idx] = { ...gs[idx], travel: { ...tr, lodging: { ...cur, status: next, updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' → ' + LODGING_STATUS_LABEL[next] + '.');
  };
  // ── DESTINATION-2 slice 2 · Getting around ── same explicit-save shape as
  // the stay card: local form seeded from event.groundTransport each open,
  // ONE save, one toast. The shuttle call itself is NOT stored here —
  // dest_transport (Phase 1's decision) owns it; this sheet only reads the
  // answer and routes to the real decision row.
  const [groundForm, setGroundForm] = useState(null);
  const groundSheetOpen = !!(sheet && sheet.kind === 'ground');
  useEffect(() => {
    if (!groundSheetOpen) { setGroundForm(null); return; }
    const gt = (event.groundTransport && typeof event.groundTransport === 'object') ? event.groundTransport : {};
    const p = Array.isArray(gt.pickupPoints) ? gt.pickupPoints.filter(Boolean) : [];
    setGroundForm({
      lastReturnNote: gt.lastReturnNote || '',
      // Unlimited pickup points (per-screen audit: was hard-capped at 2).
      pickups: p.length ? p.map(x => ({ name: (x && x.name) || '', note: (x && x.note) || '' })) : [{ name: '', note: '' }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundSheetOpen, event.id]);
  const saveGround = () => {
    const f = groundForm || {};
    const t = (v) => String(v || '').trim();
    const points = (Array.isArray(f.pickups) ? f.pickups : [])
      .map(x => (t(x.name) ? { name: t(x.name), note: t(x.note) || null } : null))
      .filter(Boolean);
    patchEvent({
      groundTransport: {
        ...((event.groundTransport && typeof event.groundTransport === 'object') ? event.groundTransport : {}),
        lastReturnNote: t(f.lastReturnNote) || null,
        pickupPoints: points,
      },
    }, 'Getting-around details saved.');
  };
  // Tap a ride-board row → cycle that guest's plan (not set → renting a car →
  // needs a ride → can offer a ride). EVERY write stamps updatedAt — the
  // engine's "just changed" flag reads it. Seats persist on the sub-object,
  // so a driver who cycles away and back keeps their count.
  const cycleRide = (row) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.ground && typeof tr.ground === 'object') ? tr.ground : {};
    const next = nextRideStatus(rideStatusOf(cur));
    gs[idx] = { ...gs[idx], travel: { ...tr, ground: { ...cur, ...rideFieldsFor(next), updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' → ' + RIDE_STATUS_LABEL[next] + '.');
  };
  // Audit #6 (extended to travel): lodging + ride were tap-to-cycle too. Same
  // fix — a picker of the whole ladder, tap to set the real state directly.
  const rowKey = (row) => (row.guestId != null ? 'g' + row.guestId : 'n' + row.name);
  const [lodgePickFor, setLodgePickFor] = useState(null);
  const [ridePickFor, setRidePickFor] = useState(null);
  const setLodgingStatus = (row, status) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId) || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.lodging && typeof tr.lodging === 'object') ? tr.lodging : {};
    gs[idx] = { ...gs[idx], travel: { ...tr, lodging: { ...cur, status, updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' → ' + LODGING_STATUS_LABEL[status] + '.');
    setLodgePickFor(null);
  };
  const setRideStatus = (row, status) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId) || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.ground && typeof tr.ground === 'object') ? tr.ground : {};
    gs[idx] = { ...gs[idx], travel: { ...tr, ground: { ...cur, ...rideFieldsFor(status), updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' → ' + RIDE_STATUS_LABEL[status] + '.');
    setRidePickFor(null);
  };
  const setRideSeats = (row, delta) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.ground && typeof tr.ground === 'object') ? tr.ground : {};
    const seats = Math.max(0, Math.round(Number(cur.seats) || 0) + delta);
    gs[idx] = { ...gs[idx], travel: { ...tr, ground: { ...cur, ...rideFieldsFor('offers_ride'), seats, updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' — ' + (seats === 1 ? '1 seat' : seats + ' seats') + ' offered.');
  };
  // ── DESTINATION-2 slice 3 · Getting here ── same explicit-save shape as the
  // stay card: the airport-options form is local state seeded from
  // event.airportOptions each open (cap 3 — name, code, the honest tradeoff),
  // ONE save, one toast. Air roster rows don't tap-to-cycle — dates and times
  // need real inputs — so a row expands into a small inline editor instead
  // (flightEdit, one open at a time), committed by its own explicit save.
  const [airForm, setAirForm] = useState(null);
  const [flightEdit, setFlightEdit] = useState(null); // { guestId, name, airportCode, arriveDate, arriveTime, departDate, departTime }
  const airSheetOpen = !!(sheet && sheet.kind === 'air');
  useEffect(() => {
    if (!airSheetOpen) { setAirForm(null); setFlightEdit(null); return; }
    const ao = (Array.isArray(event.airportOptions) ? event.airportOptions : []).filter(Boolean);
    const g = (i, k) => (ao[i] && ao[i][k]) || '';
    setAirForm({
      // Unlimited airport options (per-screen audit: was hard-capped at 3).
      airports: ao.length ? ao.map(x => ({ name: (x && x.name) || '', code: (x && x.code) || '', note: (x && x.note) || '' })) : [{ name: '', code: '', note: '' }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airSheetOpen, event.id]);
  const saveAirports = () => {
    const f = airForm || {};
    const t = (v) => String(v || '').trim();
    const options = (Array.isArray(f.airports) ? f.airports : [])
      .map(x => (t(x.name) || t(x.code))
        ? { name: t(x.name) || null, code: t(x.code) ? t(x.code).toUpperCase() : null, note: t(x.note) || null }
        : null)
      .filter(Boolean);
    patchEvent({ airportOptions: options }, options.length
      ? 'Airport options saved — guests can get the getting-here note now.'
      : 'Airport options saved.');
  };
  // Save an arrivals-board row: clone guests → merge travel.air → stamp
  // updatedAt (ms epoch, Date.now() — the clock lib/travelPlan's "just
  // changed" flag reads) → ONE patchEvent. Empty fields save as null — the
  // board shows "hasn't told us yet", never an invented time.
  const openFlightEdit = (row) => setFlightEdit({
    guestId: row.guestId != null ? row.guestId : null, name: row.name,
    airportCode: row.airportCode || '', arriveDate: row.arriveDate || '', arriveTime: row.arriveTime || '',
    departDate: row.departDate || '', departTime: row.departTime || '',
  });
  const saveFlightEdit = () => {
    const fe = flightEdit; if (!fe) return;
    const t = (v) => String(v || '').trim();
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (fe.guestId != null && g.id === fe.guestId)
      || (fe.guestId == null && String(g.name || '').trim() === fe.name));
    if (idx < 0) { setFlightEdit(null); return; }
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.air && typeof tr.air === 'object') ? tr.air : {};
    gs[idx] = {
      ...gs[idx],
      travel: {
        ...tr,
        air: {
          ...cur,
          airportCode: t(fe.airportCode) ? t(fe.airportCode).toUpperCase() : null,
          arriveDate: t(fe.arriveDate) || null, arriveTime: t(fe.arriveTime) || null,
          departDate: t(fe.departDate) || null, departTime: t(fe.departTime) || null,
          updatedAt: Date.now(),
        },
      },
    };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' — flight info saved.');
    setFlightEdit(null);
  };
  const [spot, setSpot] = useState(null);     // attention system: spotlighted card key
  const spotTimer = useRef(null);
  // FOCUS MODE, prototype-grade: scroll the destination to center, dim the rest,
  // ring the target, release automatically (or on any tap).
  const spotlight = (key) => {
    setSpot(key);
    clearTimeout(spotTimer.current);
    // Linger long enough for a complete read and a decision (host request,
    // 2026-07-08) — a tap anywhere still releases it immediately.
    spotTimer.current = setTimeout(() => setSpot(null), 8000);
    requestAnimationFrame(() => {
      const el = document.getElementById('card-' + key);
      const app = appRef.current;
      if (el && app) {
        // Rect math relative to the scroller, un-scaled by the phone frame's
        // --fit transform (offsetTop resolves against the wrong ancestor here).
        const fit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit')) || 1;
        const delta = (el.getBoundingClientRect().top - app.getBoundingClientRect().top) / fit;
        const top = Math.max(0, app.scrollTop + delta - (app.clientHeight - el.getBoundingClientRect().height / fit) / 2);
        app.scrollTo({ top, behavior: REDUCE_MOTION ? 'instant' : 'smooth' });
      }
    });
  };
  const [dayIdx, setDayIdx] = useState(0);    // The Day: position in the run of show
  // HONEST-TIME (the day-of ruling): which unset cues the host has opened to add a clock.
  // Default = none; an unset moment reads "Set a time", never a bare native "--:-- --".
  const [timeEditIds, setTimeEditIds] = useState(() => new Set());
  // BUDGET PROPOSE-DON'T-ASK: the editor leads with ONE grounded number (Typical) + agree/change;
  // "Change" opens the tiers+custom drawer. This flag = the host asked to change the number.
  const [budgetChanging, setBudgetChanging] = useState(false);

  // Row-level landings inside the prototype — a route with a real destination
  // here opens the sheet on the exact row, instead of toasting.

  // ONE cultural nudge per surface, where the decision happens (the lib's own
  // timing doctrine) — never ambient on Plan. Dismiss uses the lib's field.
  const nudgeFor = (surface) => {
    let n = null; try { n = eventContextNudge(event, surface); } catch { n = null; }
    if (!n) return null;
    return (
      // flex-wrap + a real min-width floor: at the migrated type scale the two
      // .mini buttons otherwise crush the nudge text into a ~100px column —
      // wrapping drops the button pair onto its own line instead (same fix
      // as .frow's custom-item-name squeeze).
      <div className="later-row" style={{ marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <span className="t" style={{ color: 'var(--muted)', fontWeight: 550, fontSize: 'var(--t-row-sub)', minWidth: 200 }}>{n.text}</span>
        <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {n.route && <button className="mini" onClick={() => routeSheet(n.route)}>{n.actionLabel || 'Open'}</button>}
          <button className="mini" onClick={() => patchEvent({ contextNudges: { ...(event.contextNudges || {}), [n.id]: 'dismissed' } }, 'Noted.')}>Dismiss</button>
        </span>
      </div>
    );
  };

  // ENFORCEMENT-GAP-1 (2026-07-15): routeSheet is now a THIN EXECUTOR. The
  // decision — which route lands where — is the pure resolveRoute() in
  // lib/routeResolver.js, the SINGLE authority that this executor and the
  // route-execution test (src/__tests__/routeExecution.test.js) both run. The
  // long if-ladder that used to live here could only be exercised inside the
  // React tree, so the CTA source-of-truth test validated routes against a
  // hand-synced mirror instead of the real routing code — and a route with a
  // valid tab but an unhandled focusField (the wave-6 helpers 'space' bug)
  // passed every test yet mis-landed live. With the decision extracted, the
  // gate is executed, not mirrored: a route that stops landing row-level fails
  // a test that runs the real resolver. This executor performs ONLY the side
  // effects the descriptor names; every landing (kinds, focus, order) is
  // resolveRoute's, unchanged.
  //
  // 'Communication' is still deliberately unroutable (resolveRoute returns
  // null) — V2 has no messages surface, so there is nowhere honest to land;
  // the caller falls to onCta's truthful "Not wired here yet" toast.
  const routeSheet = (route) => {
    const r = resolveRoute(route);
    if (!r) return false;
    // Stage landings: the target is a full-screen stage, not a sheet. The plan
    // editor (event-date / event-venue) scrolls to and focuses the exact input
    // per the Row-Level CTA rule; the day-of run of show lives on the Day stage.
    if (r.kind === 'stage:plan') {
      setStage('plan'); setSheet(null); setEditor(null);
      if (r.anchor) setTimeout(() => {
        try {
          const inp = document.querySelector('[aria-label="' + r.anchor + '"]');
          if (inp) { inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); try { inp.focus({ preventScroll: true }); } catch { /* focus is best-effort */ } }
        } catch { /* DOM not ready — plan stage is still the right landing */ }
      }, 80);
      return true;
    }
    if (r.kind === 'stage:day') { setStage('day'); setSheet(null); return true; }
    // Sheet landings: open the named sheet on its row/section. vendorSection is
    // carried through only for vendor routes (money/insurance sub-sections).
    const s = { kind: r.kind, focus: r.focus != null ? r.focus : null };
    if (r.vendorSection !== undefined) s.vendorSection = r.vendorSection || null;
    setSheet(s);
    return true;
  };

  // Do-it-for-me: the app's REAL drafting engine (lib/doItForMe), verbatim.
  // Voice: the host's remembered writing personality — applies to every draft
  // until they change it. Deterministic re-shapes only (no fake AI).
  const [draftTone, setDraftTone] = useState(() => { try { return localStorage.getItem('ngw-hostv2-voice') || 'as-written'; } catch { return 'as-written'; } });
  const [draftBody, setDraftBody] = useState(null); // non-null = host's own edit
  useEffect(() => { try { localStorage.setItem('ngw-hostv2-voice', draftTone); } catch {} }, [draftTone]);
  const openDraft = (title, d, queue) => {
    const body = d ? (typeof d === 'string' ? d : [d.subject, d.body].filter(Boolean).join('\n\n')) : '';
    if (!body.trim()) { toast('Nothing to draft yet — add a few more details first.'); return; }
    setDraftBody(null);
    // Optional queue: remaining {title, body, name} items for "message
    // everyone" flows (one separate draft per person, reviewed/sent one at a
    // time through the SAME real handoffs below — never a silent bulk send).
    setSheet({ kind: 'draft', title, body, queue: queue || null });
  };
  const openNextInQueue = () => {
    const q = (sheet && sheet.queue) || [];
    if (!q.length) return;
    const [next, ...rest] = q;
    setDraftBody(null);
    setSheet({ kind: 'draft', title: next.title, body: next.body, queue: rest.length ? rest : null });
  };
  // "Message all helpers", one click: builds ONE personalized draft per
  // deduped helper (their own responsibilities only, via draftHelperConfirm),
  // opens the first, queues the rest. Each still goes through the real
  // send/text/whatsapp/copy handoffs individually — no silent bulk send.
  const startHelperMessages = () => {
    const people = helperData.helpers || [];
    if (!people.length) { toast('No helpers to message yet.'); return; }
    const drafts = people.map(h => {
      const mine = (helperData.responsibilities || []).filter(r => r.helperId === h.id);
      const d = draftHelperConfirm(event, profile, h, mine);
      return { title: 'Confirm with ' + h.name, body: [d.subject, d.body].filter(Boolean).join('\n\n'), name: h.name };
    }).filter(x => x.body.trim());
    if (!drafts.length) { toast('Nothing to draft yet — add a few more details first.'); return; }
    openDraft(drafts[0].title, drafts[0].body, drafts.slice(1));
  };
  // Tone variants are DETERMINISTIC rewrites of the same facts — mechanical
  // tightening/warming, never invented content (no fake AI doctrine).
  const toneBody = (body, tone) => {
    let b = String(body);
    if (tone === 'tighter') {
      const ps = b.split('\n\n');
      if (ps.length <= 2) return b;
      const mid = ps.slice(1, -1).filter(p => p.includes('→') || /:$/m.test(p));
      return [ps[0], ...mid, ps[ps.length - 1]].join('\n\n');
    }
    if (tone === 'warmer') {
      const warm = 'So glad you’ll be part of it.';
      return b.includes(warm) ? b : b + '\n\n' + warm;
    }
    if (tone === 'playful') {
      const lines = b.split('\n');
      if (lines[0] && !/[!?]$/.test(lines[0].trim())) lines[0] = lines[0].replace(/[.。]?\s*$/, '!');
      b = lines.join('\n');
      const kick = 'It’s going to be a good one.';
      return b.includes(kick) ? b : b + '\n\n' + kick;
    }
    if (tone === 'formal') {
      return b
        .replace(/!/g, '.')
        .replace(/\bWe're\b/g, 'We are').replace(/\bwe're\b/g, 'we are')
        .replace(/\bWe’re\b/g, 'We are').replace(/\bwe’re\b/g, 'we are')
        .replace(/\bdon['’]t\b/gi, 'do not').replace(/\bcan['’]t\b/gi, 'cannot')
        .replace(/\bwon['’]t\b/gi, 'will not').replace(/\bI['’]ll\b/g, 'I will')
        .replace(/\byou['’]ll\b/gi, 'you will').replace(/\bwe['’]ll\b/gi, 'we will')
        .replace(/\bit['’]s\b/gi, 'it is').replace(/\bthat['’]s\b/gi, 'that is');
    }
    return b;
  };
  const shownDraft = () => draftBody != null ? draftBody : toneBody(sheet && sheet.body, draftTone);
  const copyDraft = async (body) => {
    try { await navigator.clipboard.writeText(body); toast('Copied — paste it anywhere.'); feedback('act'); }
    catch { toast('Couldn’t copy on this browser — long-press to select it.'); }
  };

  // The self-RSVP invite link — the SAME ?rsvp=CODE mechanic as the original
  // app (every event carries rsvpCode). Guests who open it reply themselves;
  // replies land in the outbox and merge into this roster automatically.
  const inviteLinkUrl = () => window.location.origin + window.location.pathname + '?rsvp=' + encodeURIComponent(event.rsvpCode || event.id);
  // Scan-to-RSVP: the SAME invite link as a QR — for the printed invite, the
  // door sign, the fridge. Dark-on-white regardless of theme (scanners first).
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const showQr = async () => {
    try {
      const data = await QRCode.toDataURL(inviteLinkUrl(), { width: 520, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
      setQrDataUrl(data);
      setSheet({ kind: 'qr' });
    } catch { toast('Couldn’t draw the QR — share the link instead.'); }
  };
  const shareInviteLink = async () => {
    const url = inviteLinkUrl();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'You’re invited — ' + (event.name || 'our event'), text: 'You’re invited to ' + (event.name || 'our event') + '. RSVP here: ' + url, url }); return; } catch { /* declined — fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url); toast('Invite link copied — anyone who opens it can RSVP themselves, no app needed.'); feedback('act'); }
    catch { toast('Couldn’t copy on this browser — the link ends in ?rsvp=' + (event.rsvpCode || event.id)); }
  };

  // Tasks: toggle done on the SAME timeline the readiness engine reads —
  // catching up genuinely closes the "Catch up on overdue planning" card.
  const toggleTask = (i) => {
    const tl = (event.timeline || []).map((t, ix) => ix === i ? { ...t, done: !t.done } : t);
    const open = tl.filter(t => t && !t.done).length;
    // RAW FEEDS TRUTH, both directions: checking a buy/shop step is the host
    // asserting the purchases happened — write the raw layer (foodGot) so
    // "Still to get", totals, and the day-before brief all agree. Unchecking
    // never un-buys (asymmetric on purpose).
    let extra = {};
    let boughtNote = '';
    if (tl[i].done && /\b(buy|shop)\b|shopping/i.test(String(tl[i].task || ''))) {
      // UNGATED (matches toggleGot, 555e770): checking the shop step asserts
      // every open food line was bought. Price stays optional — an unpriced line
      // is marked bought at its honest estimate, never withheld. We surface how
      // many landed firm (host-added or a real locked price) vs still an estimate
      // — the same firm test hostSpending uses — so the host stays informed and
      // "spent" carries its estimated portion openly rather than pretending.
      const got = { ...(event.foodGot || {}) };
      const real = (event.foodReal && typeof event.foodReal === 'object') ? event.foodReal : {};
      let n = 0, firm = 0;
      ((foodPlan && foodPlan.list) || []).forEach(it => {
        if (!it || it.skipped || got[it.id]) return;
        got[it.id] = true; n += 1;
        if (it.added || (it.locked != null && real[it.id])) firm += 1;
      });
      if (n > 0) extra = { foodGot: got };
      if (n > 0) {
        const est = n - firm;
        boughtNote = ' ' + n + ' item' + (n === 1 ? '' : 's') + ' marked bought'
          + (est > 0 ? ' (' + est + ' at an estimate — tap any to add the real price).' : '.');
      }
    }
    patchEvent({ timeline: tl, ...extra },
      (tl[i].done ? 'Done: ' : 'Reopened: ') + String(tl[i].task || '').slice(0, 50) + '… — ' + open + ' still open.' + boughtNote);
  };

  // No timeline yet → draft one from the playbook's REAL task list, honoring
  // its choice-gated tasks (e.g. steam-yourself vs order-steamed).
  const draftTimeline = () => {
    const rows = (() => { try { return playbookChecklist(event) || []; } catch { return []; } })();
    if (!rows.length) { toast(event.date ? 'No playbook checklist for this type.' : 'Set the date first — the checklist works backward from it.'); return; }
    // leadDays is CARRIED, not dropped. playbookChecklist authors a real lead for every task
    // ('T-5d' → -5) and this writer used to keep only `week` — the PROSE label ('Week of').
    // That is how "nothing in this app was ever overdue" survived: the engine computed the
    // lead, the runtime threw it away at the moment of persistence, and every consumer was
    // left re-parsing a sentence. (lib/taskLead.js can still recover a lossy lead from the
    // prose for legacy events — but a T-5d task deserves to stay a T-5d task.)
    const tasks = rows.map(r => ({ id: r.id, week: r.week || '', leadDays: r.leadDays != null ? r.leadDays : null, task: r.task || '', done: false, owner: '', category: r.category || '' }));
    patchEvent({ timeline: tasks }, tasks.length + ' tasks drafted — the engine gates them by your choices and works back from the date.');
  };

  // The REAL spread: same food plan hostSpending bills from, sized by the
  // engine's own attendance band for this event.
  const foodPlan = useMemo(() => {
    try { return playbookFoodPlan(event, { priceFactor: foodPP.priceFactor }); } catch { return null; }
  }, [event, foodPP.priceFactor]); // same missing-dependency bug as `spend` above

  // ROW-LEVEL CTA RULE, single source (was duplicated only inside the Budget
  // sheet's render — the After tab's own money summary showed the identical
  // rows as inert, cursor:default divs). Every allocation row lands on the
  // surface that actually prices it, in EITHER place these rows render.
  const supplGroupName = ((foodPlan && foodPlan.groups) || []).find(g => /suppl|paper|setup|gear/i.test(String(g)));
  const GO_SPEND = {
    food: () => setSheet({ kind: 'food' }),
    supplies: () => { if (supplGroupName) setFoodGroupsOpen(m => ({ ...m, [supplGroupName]: true })); setSheet({ kind: 'food' }); },
    space: () => setSheet({ kind: 'space' }),
    crabs: () => setSheet({ kind: 'crabs' }),
  };
  const hostRowsGo = () => hostSpendRows().map(r => ({ ...r, go: GO_SPEND[r.kind] }));

  // The 5 readiness signals — Basics (foundations) + the four pillars the
  // production readiness engine computes: decisions, people, checklist, paperwork.
  const readiness = useMemo(() => { try { return applicableReadinessAxes(event); } catch { return null; } }, [event]);
  const wins = useMemo(() => { try { return positiveAttention(event, readiness) || { items: [] }; } catch { return { items: [] }; } }, [event, readiness]);

  // Rain backup — the weather lib's real outdoor heuristic; the rainPlan field
  // is the same one the app's weather alert and Where & when read.
  const outdoor = (() => { try { return isLikelyOutdoor(event.venue || '', event.notes || ''); } catch { return false; } })();

  // Shopping check-off writes the same foodGot flags the money engine reads —
  // buying an item literally moves real dollars from committed to spent. (This
  // used to be gated behind a locked cost — that COST-TRUTH GATE was removed in
  // the 2026-07-12 ungate; the honest firm-vs-estimated handling now lives in
  // the check-off itself, described below.)
  const toggleGot = (it, cost) => {
    const cur = !!(event.foodGot || {})[it.id];
    // Ungated check-off (2026-07-12): a tap marks bought — no price required, so a
    // store run isn't taxed a price-entry per line. Accuracy is kept a different,
    // truer way: a bought line keeps its honest cost (a real receipt if the host
    // typed one — event.foodReal — else the estimate range's midpoint), and the
    // spend readout labels how much is FIRM vs still ESTIMATED. This is more honest
    // than the old gate, which forced a number that was usually the pre-filled
    // estimate midpoint laundered into a "real price." Real prices get nudged
    // after the fact on the lines that move the budget, not blocked mid-aisle.
    const next = { ...(event.foodGot || {}), [it.id]: !cur };
    const isFirm = it.added || (it.locked != null && (event.foodReal || {})[it.id]);
    let ns = null;
    try { ns = hostSpending({ ...event, foodGot: next }, foodPP.priceFactor).spent; } catch { ns = null; }
    const priceNote = cur ? '' : (isFirm ? ' (' + fmt(cost) + ')' : ' (~' + fmt(cost) + ' est.)');
    patchEvent({ foodGot: next },
      (cur ? 'Put back ' : 'Bought ') + (it.short || it.item) + priceNote + (ns !== null ? ' — spent is now ' + fmt(ns) + '.' : '.'));
  };
  // Ported from App.js's guessFoodCategory (~10549-10559): auto-categorize a
  // typed item name into Food/Drinks/Supplies + a rough aisle, so a host-added
  // line sorts into the right spread section instead of always landing in
  // "Food". Pure UI-sort helper — no engine dependency, no search list (board
  // ruling), same word lists as legacy so the guess behaves identically in
  // both apps.
  const guessFoodCategory = (nm) => {
    const n = String(nm || '').toLowerCase();
    const has = (...ws) => ws.some((w) => n.includes(w));
    if (has('beer', 'wine', 'soda', ' pop', 'cola', 'water', 'tea', 'coffee', 'juice', 'lemonade', 'cocktail', 'liquor', 'vodka', 'whiskey', 'rum', 'champagne', 'punch', 'cider', 'seltzer', 'kombucha', 'drink')) return { group: 'Drinks', cat: 'beverages' };
    if (has('plate', 'cup', 'napkin', 'fork', 'knife', 'spoon', 'utensil', 'cutlery', 'foil', 'wrap', 'ziploc', 'baggie', 'ice', 'cooler', 'chest', 'tablecloth', 'tent', 'chair', 'table', 'light', 'candle', 'decor', 'balloon', 'trash', 'paper towel', 'charcoal', 'propane', 'lighter', 'sunscreen', 'bug spray', 'tongs', 'skewer', 'platter')) return { group: 'Supplies', cat: 'supplies' };
    if (has('salad', 'slaw', 'corn', 'potato', 'tomato', 'lettuce', 'fruit', 'watermelon', 'berr', 'greens', 'veg', 'onion', 'pepper', 'cucumber')) return { group: 'Food', cat: 'produce' };
    if (has('crab', 'shrimp', 'fish', 'chicken', 'beef', 'pork', 'sausage', 'burger', 'hot dog', 'meat', 'rib', 'steak', 'turkey', 'ham', 'lobster', 'clam', 'oyster', 'bacon', 'wing')) return { group: 'Food', cat: 'proteins' };
    if (has('cheese', 'milk', 'cream', 'yogurt', 'egg', 'dairy', 'butter')) return { group: 'Food', cat: 'dairy' };
    if (has('bread', 'roll', 'bun', 'chip', 'cracker', 'cookie', 'cake', 'pie', 'dessert', 'snack', 'pretzel', 'pasta', 'rice', 'bean', 'sauce', 'condiment', 'oil', 'seasoning', 'spice', 'old bay', 'dip', 'dressing')) return { group: 'Food', cat: 'other' };
    return { group: 'Food', cat: 'other' };
  };
  // Ported from App.js's commitAdd (~10560-10570): writes a new named line to
  // event.foodAdd, which playbookFoodPlan already merges into foodPlan.list —
  // no engine change required. Cost is optional; blank/unparsed stays 0, the
  // honest "no cost yet / they're bringing it" framing (never a fake number).
  const commitFoodAdd = () => {
    const name = foodAddName.trim();
    if (!name) return;
    const id = 'add-' + Date.now().toString(36);
    const guess = guessFoodCategory(name);
    patchEvent({
      foodAdd: [...(event.foodAdd || []), {
        id, name, owner: foodAddOwner.trim(),
        cost: Math.max(0, Math.round(Number(foodAddCost) || 0)),
        group: foodAddGroup || guess.group, cat: guess.cat,
      }],
    }, name + ' added to the plan.');
    setFoodAddName(''); setFoodAddOwner(''); setFoodAddCost(''); setFoodAddGroup(null); setFoodAddOpen(false);
  };

  // Roster quick-add: paste names, one per line — a REAL guest list, which is
  // what unlocks RSVP intelligence, yes-counts, and the drift detector.
  const [rosterText, setRosterText] = useState('');
  const [guestOpen, setGuestOpen] = useState(null); // per-guest detail editor
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  // WAVE-B: invite-rules fold (guests sheet) — the policies the public RSVP
  // page enforces (InviteV2 reads plusOnePolicy/kidsPolicy/collectAddresses;
  // the invite + guest brief drafts read giftWish). Fold-closed by default.
  const [inviteRulesOpen, setInviteRulesOpen] = useState(false);
  // CSV import — the app's own parsers/merge (lib/csvParsers): 7 platforms,
  // email-primary name-fallback matching, preview before anything writes.
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvPlatform, setCsvPlatform] = useState('ngw');
  const [csvPreview, setCsvPreview] = useState(null); // {mapped, summary, fileName, platform}
  // Import history — lib/importHistory end to end, persisted PER EVENT (the
  // legacy shell keeps one global list; V2 keys it by event so one event's
  // undo can never restore another event's roster). Key design: the shared
  // GUEST_IMPORT_BATCHES_KEY + ':' + event id.
  const importBatchesKey = GUEST_IMPORT_BATCHES_KEY + ':' + event.id;
  const [importBatches, setImportBatches] = useState(() => loadImportBatches(importBatchesKey));
  const [importsOpen, setImportsOpen] = useState(false);
  useEffect(() => { setImportBatches(loadImportBatches(GUEST_IMPORT_BATCHES_KEY + ':' + event.id)); setImportsOpen(false); }, [event.id]);
  const writeImportBatches = (batches) => {
    // keep state and storage on the same cap so the list shown IS the list kept
    const capped = batches.slice(-MAX_PERSISTED_BATCHES);
    setImportBatches(capped);
    persistImportBatches(capped, importBatchesKey);
  };
  // PLATFORM_LABELS covers 4 of the 7 csvParsers platforms (pre-existing lib
  // drift, flagged there) — fall back to the parser's own label, then the
  // capitalized key, never a blank.
  const importPlatformLabel = (p) => PLATFORM_LABELS[p]
    || (PLATFORMS[p] && PLATFORMS[p].label)
    || (p ? p.charAt(0).toUpperCase() + p.slice(1) : 'CSV');
  const undoLastCsvImport = () => {
    const res = undoLastImportBatch(importBatches);
    if (!res) return;
    writeImportBatches(res.batches);
    patchEvent({ guests: res.snapshot, kidsCount: kidsTotal(res.snapshot) },
      'Import undone — the list is back the way it was before that import.');
  };
  // PII cleanup (engine-gap NEW-3): every batch carries a FULL pre-import
  // roster snapshot (names, emails, phones) purely so undo can restore it.
  // Beyond the write-time cap (MAX_PERSISTED_BATCHES, enforced in
  // writeImportBatches AND persistImportBatches), the host can drop this
  // event's whole trail. Deletes ONLY the per-event key — the legacy shell's
  // global key is not V2's to touch. The guest list itself is untouched.
  const clearImportHistory = () => {
    try { localStorage.removeItem(importBatchesKey); } catch { /* private mode — state still clears */ }
    setImportBatches([]);
    setImportsOpen(false);
    toast('Import history cleared — those snapshots are off this device, and undoing past imports is no longer possible. Your guest list is unchanged.');
  };
  // Export — the shared serializers (lib/csvParsers toCSV/COLUMNS/exportFileSlug
  // + lib/download), with V2's guest fields mapped back to the canonical
  // column keys so the file round-trips through the NGW Native import.
  const exportGuestsCsv = () => {
    const rows = (event.guests || []).map(g => ({
      name: g.name || '', email: g.email || '', phone: g.phone || '',
      group: g.group || '',
      rsvp_status: g.rsvp || 'Pending', // '' means no reply — canonical 'Pending' (the import maps it back)
      meal_preference: g.meal || '', plus_one_name: g.plusOne || '',
      table_number: g.table ?? '', dietary_restrictions: g.needs || '',
      notes: g.partyNotes || '',
    }));
    downloadCSV(exportFileSlug(event.name) + '-guests.csv', toCSV(rows, COLUMNS.guests));
    toast(rows.length + (rows.length === 1 ? ' guest' : ' guests') + ' downloaded — the file re-imports as NGW Native.');
  };
  const exportVendorsCsv = () => {
    // COLUMNS.vendors reads `contact` for the email column; V2's cockpit
    // writes `email` — bridge it, invent nothing else (missing fields export
    // empty, exactly what's tracked).
    const rows = (event.vendors || []).map(v => ({ ...v, contact: v.contact || v.email || '' }));
    downloadCSV(exportFileSlug(event.name) + '-vendors.csv', toCSV(rows, COLUMNS.vendors));
    toast(rows.length + (rows.length === 1 ? ' vendor' : ' vendors') + ' downloaded as a CSV.');
  };
  const onCsvFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        try {
          const canonical = validateRows(transformRows(res.data || [], csvPlatform));
          // Bridge canonical → the guest shape every reader here uses (the
          // original's canonicalToGuest mapping); _valid rides along so
          // applyMerge can filter.
          const ts = Date.now();
          const mapped = canonical.map((r, i) => ({
            id: 'g-csv-' + ts + '-' + i,
            name: r.name || '', group: r.group || '',
            rsvp: r.rsvp_status === 'Pending' ? '' : (r.rsvp_status || ''),
            meal: r.meal_preference || '—', table: r.table_number ?? null,
            plusOne: r.plus_one_name || '', plusOneMeal: '—', kids: 0,
            needs: r.dietary_restrictions || '', email: r.email || '', phone: r.phone || '',
            partyNotes: r.notes || '', giftReceived: false, thankYouSent: false,
            // _warnings rides along for the batch record's honest warnCount;
            // applyMerge strips it (with _valid/_errors) before anything persists.
            _valid: r._valid, _errors: r._errors, _warnings: r._warnings,
          }));
          const summary = computeMergeSummary(event.guests || [], mapped, 'merge');
          // platform pinned at parse time — the batch records what actually parsed
          setCsvPreview({ mapped, summary, fileName: file.name, platform: csvPlatform });
        } catch { toast('That file didn’t read as a guest CSV — check the platform pick.'); }
      },
      error: () => toast('Couldn’t read that file.'),
    });
  };
  const applyCsv = () => {
    if (!csvPreview) return;
    const before = event.guests || [];
    const batchId = newImportBatchId();
    const merged = applyMerge(before, csvPreview.mapped, 'merge', batchId);
    const kidsCount = kidsTotal(merged);
    // Record the batch BEFORE the write lands: id, pre-import snapshot (what
    // undo restores), and the same audit counts the legacy wizard records.
    const audit = computeImportAuditMeta(csvPreview.mapped, csvPreview.summary);
    writeImportBatches([...importBatches, makeImportBatch(batchId, before, {
      ...audit, platform: csvPreview.platform, mergeMode: 'merge',
    })]);
    patchEvent({ guests: merged, kidsCount },
      (csvPreview.summary.willAdd || 0) + ' added · ' + (csvPreview.summary.willUpdate || 0) + ' updated from ' + csvPreview.fileName + ' — replies and needs came along.');
    setCsvPreview(null); setCsvOpen(false);
  };
  const writeGuest = (i, patch, msg) => {
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, ...patch } : g);
    // kidsCount is the ENGINE's portion-skew knob (kids eat ~40% of adult
    // protein) — derive it from the roster so food re-prices automatically.
    const kidsCount = kidsTotal(gs);
    patchEvent({ guests: gs, kidsCount }, msg);
  };
  const removeGuest = (i) => {
    const g = (event.guests || [])[i];
    const gs = (event.guests || []).filter((_, ix) => ix !== i);
    const kidsCount = gs.reduce((t, x) => t + (Number(x && x.kids) || 0), 0);
    patchEvent({ guests: gs, kidsCount }, (g && g.name || 'Guest') + ' removed from the list.');
    setGuestOpen(null);
  };
  const addRoster = () => {
    const names = rosterText.split('\n').map(x => x.trim()).filter(Boolean);
    if (!names.length) return;
    const existing = event.guests || [];
    const add = names.map((name, i) => ({ id: 'g-' + Date.now() + '-' + i, name, rsvp: '' }));
    patchEvent({ guests: [...existing, ...add] },
      names.length + ' name' + (names.length === 1 ? '' : 's') + ' on the list — ' + (existing.length + add.length) + ' total. RSVPs start blank.');
    setRosterText('');
  };

  // Flip one RSVP — writes the same guests array the engine's confirmed-count
  // (and the catering-drift detector) read.
  const toggleRsvp = (i) => {
    const CYCLE = { '': 'Yes', 'Yes': 'No', 'No': 'Maybe', 'Maybe': '' };
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, rsvp: CYCLE[String(g.rsvp || '')] ?? 'Yes' } : g);
    const yes = gs.filter(g => g && g.rsvp === 'Yes').length;
    const now = gs[i].rsvp || 'no reply yet';
    patchEvent({ guests: gs }, (gs[i].name || 'Guest') + ' → ' + now + ' — ' + yes + ' confirmed. Maybes stay pending until they land.');
  };
  // Direct RSVP set (audit 2026-07-22) — replaces the blind tap-to-cycle with an inline
  // picker (mirrors the meal picker): tap a name's reply → pick Yes/No/Maybe/no reply.
  const setRsvpValue = (i, value) => {
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, rsvp: value } : g);
    const yes = gs.filter(g => g && g.rsvp === 'Yes').length;
    patchEvent({ guests: gs }, (gs[i].name || 'Guest') + ' → ' + (value || 'no reply') + ' — ' + yes + ' confirmed.' + (value === 'Maybe' ? ' Maybes stay pending until they land.' : ''));
    setRsvpPickFor(null);
  };

  // ── Feedback layer: haptic tick on real state changes, the original app's
  // synthesized chime reserved for magic moments. Muted preference persists.
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('ngw-hostv2-muted') === '1'; } catch { return false; } });
  useEffect(() => { setMessageSoundMuted(muted); try { localStorage.setItem('ngw-hostv2-muted', muted ? '1' : '0'); } catch {} }, [muted]);
  // Sound defaults ON, so most hosts never touch the toggle — priming only on
  // that click would leave the AudioContext unresumed for everyone else. Every
  // later chime fires from a timer/async callback, outside the user-gesture
  // window some browsers require to resume audio, so it unlocks silently and
  // forever otherwise. Prime on the app's first tap anywhere instead.
  useEffect(() => {
    const unlock = () => { primeMessageSound(); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);
  // Screen Wake Lock — the device must not sleep while the app is up (above
  // all on The Day: messy-handed hosts can't keep re-unlocking). Re-acquired
  // whenever the tab becomes visible again; released on unmount. No-ops
  // safely where unsupported.
  useEffect(() => {
    let lock = null, dead = false;
    const acquire = async () => {
      try {
        if (!dead && 'wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch { /* low battery or unsupported — the OS wins */ }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { dead = true; document.removeEventListener('visibilitychange', onVis); try { lock && lock.release(); } catch {} };
  }, []);

  // DERIVED COMPLETION (domino doctrine): a checklist step whose real-world
  // condition is satisfied completes ITSELF — the host never re-checks what
  // the plan already knows. Conservative matching: only the unambiguous case
  // (shopping steps, once every spread item is bought). Writes timeline.done
  // for real, so every reader (engine readiness, counts, sheets) agrees.
  // C4 — THE PERSISTED WRITE MUST USE THE STRICTER PREDICATE, NOT THE LOOSER ONE.
  //
  // This gated on `foodPlan.boughtCount >= foodPlan.itemCount`, and BOTH of those
  // counts are FOOD-ONLY: playbooks/index.js filters with
  // `isFood = i.group !== 'Supplies'`. Ice, charcoal, cups, plates and foil are
  // excluded from both. So ticking off the crabs and the corn wrote `done: true`
  // onto "Buy ice, charcoal and paper goods" — and it is a real WRITE, so every
  // reader agreed with it and the step vanished from the checklist for good. The
  // host never buys the ice.
  //
  // The honest predicate was already right here in this file:
  // isTimelineStepResolved() (line ~992) requires EVERY non-skipped item — Supplies
  // included — and explicitly refuses an empty list. The display used it; the write
  // did not. Two predicates for one concept, and the looser one was the one that
  // persisted. Now the write asks the same question the screen asks.
  //
  // Note this stays a real write (not an inference): every item was ticked by the
  // HOST, so the step genuinely is done — we are deriving from their actions, not
  // guessing on their behalf.
  useEffect(() => {
    try {
      const tl = event.timeline || [];
      const idx = tl
        .map((t, i) => (t && !t.done
          && /\b(buy|shop)\b|shopping/i.test(String(t.task || ''))
          && isTimelineStepResolved(t) ? i : -1))
        .filter(i => i >= 0);
      if (!idx.length) return;
      patchEvent({ timeline: tl.map((t, i) => idx.includes(i) ? { ...t, done: true } : t) },
        idx.length + ' shopping step' + (idx.length === 1 ? '' : 's') + ' completed ' + (idx.length === 1 ? 'itself' : 'themselves') + ' — everything on the list is bought, supplies included.');
    } catch {}
  }, [event.foodGot, event.timeline, foodPlan && foodPlan.itemCount]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Sprint 60.Y PARITY — the ORIGINAL's one chime placement: ring softly when
  // the total inbound-message count across events increases (a message
  // arrived). Skips the first measurement so mount never rings. Identical
  // logic to App.js; V2's reveal/day chimes are additions on top of this.
  const prevInboundCount = useRef(null);
  useEffect(() => {
    const evs = [...ROSTER, ...customs].map(e => (e && e.id) === eventId ? event : e);
    const count = evs.reduce((sum, ev) => sum + ((ev && ev.commClient) || []).filter(m => m && m.direction === 'inbound').length, 0);
    if (prevInboundCount.current !== null && count > prevInboundCount.current) { try { notifyMessageArrival(); } catch {} }
    prevInboundCount.current = count;
  }, [event, customs, eventId]);
  const feedback = (kind) => {
    // The "Sound" setting (muted) gates the AUDIO chime ONLY — a host who
    // silences sound still gets haptics (motion re-audit: muting sound also
    // killed all vibration, so silent-haptics was impossible). Distinct patterns
    // per intent so commit / celebration / error each feel different.
    try { if (navigator.vibrate) navigator.vibrate(kind === 'magic' ? [12, 70, 12] : kind === 'error' ? [40, 30, 40] : 10); } catch { /* no haptics */ }
    if (kind === 'magic' && !muted) { try { playMessageChime(); } catch { /* no audio */ } }
  };

  // COMPLETION CHIME — the grounded loop's payoff (host request 2026-07-18). Per-resolve
  // stays haptic-only (a chime on every tap would chirp through a 9-item pile); the EARNED
  // moment is a whole bundle going quiet — every vendor conflict resolved, or every open
  // decision settled. That fires feedback('magic') once: the soft chime (if sound's on) +
  // celebration haptic. Guarded like the inbound-chime — a ref carries the prior counts, and
  // a first read or an EVENT SWITCH never fires (only a real N→0 the host drove on THIS event).
  // Elegant loop only, so production default is unchanged.
  const prevBundleClear = useRef(null);
  // Peak size each bundle reached while open, so the payoff shows the TOTAL that cleared —
  // not the final N→0 step. Decisions settle one-by-one, so prev would read "1 of 1"; the
  // peak reads the real "6 of 6". Reset per-bundle on clear and on event switch.
  const bundlePeak = useRef({ conflicts: 0, decisions: 0, coi: 0 });
  useEffect(() => {
    if (!elegantMode) { prevBundleClear.current = null; bundlePeak.current = { conflicts: 0, decisions: 0, coi: 0 }; return; }
    const now = { eventId, conflicts: conflictItems.length, decisions: callsOrdered.length, coi: coiCounts.open };
    const prev = prevBundleClear.current;
    prevBundleClear.current = now;
    const pk = bundlePeak.current;
    ['conflicts', 'decisions', 'coi'].forEach(k => { if (now[k] > 0) pk[k] = Math.max(pk[k], now[k]); });
    if (!prev || prev.eventId !== eventId) { setJustCleared(null); bundlePeak.current = { conflicts: 0, decisions: 0, coi: 0 }; return; } // first read / event switch — never a payoff
    const clearedConflicts = prev.conflicts > 0 && now.conflicts === 0;
    const clearedDecisions = prev.decisions > 0 && now.decisions === 0;
    const clearedCoi = prev.coi > 0 && now.coi === 0;
    if (clearedConflicts || clearedDecisions || clearedCoi) {
      // Solemn (state 3): the reassurance card still shows, but no triumphant chime.
      try { if (!isSolemnEvent(event)) feedback('magic'); } catch { /* no fx */ }
      // Surface the earned moment (conflict > decision > coi if several cleared at once — rare).
      // count = the peak the bundle reached (fallback to prev), so "6 of 6", not "1 of 1".
      if (clearedConflicts) { setJustCleared({ kind: 'conflict', count: Math.max(pk.conflicts, prev.conflicts) }); pk.conflicts = 0; }
      else if (clearedDecisions) { setJustCleared({ kind: 'decision', count: Math.max(pk.decisions, prev.decisions) }); pk.decisions = 0; }
      else { setJustCleared({ kind: 'coi', count: Math.max(pk.coi, coiCounts.total || prev.coi) }); pk.coi = 0; }
    }
  }, [elegantMode, eventId, conflictItems.length, callsOrdered.length, coiCounts.open]); // eslint-disable-line react-hooks/exhaustive-deps

  // SAFETY: if the underlying bundle is no longer empty (host hit Undo, or a new
  // conflict surfaced), retire the stale payoff so it can't claim "all clear" over
  // live work. A real re-clear will fire the transition above again.
  useEffect(() => {
    if (!justCleared) return;
    if (justCleared.kind === 'conflict' && conflictItems.length > 0) setJustCleared(null);
    if (justCleared.kind === 'decision' && callsOrdered.length > 0) setJustCleared(null);
    if (justCleared.kind === 'coi' && coiCounts.open > 0) setJustCleared(null);
  }, [justCleared, conflictItems.length, callsOrdered.length, coiCounts.open]);

  // SYNC-HONESTY-1: the exact test patchEvent itself uses to decide whether an
  // edit reaches the cloud — a created (custom) event, or a real/hydrated event
  // this device knows about. A pure curated sample (ALL_SAMPLES that isn't also
  // one of those) is never cloud-backed, so a sync-status claim about it would
  // be fiction. Reused verbatim for the settings sheet's per-event status row.
  const eventIsSyncable = !!activeCustom || REAL_EVENTS.some(e => e.id === eventId) || hydratedEvents.some(e => e.id === eventId);
  const patchEvent = (obj, msg, opts) => {
    // GENERIC UNDO (build-map #8): patchEvent is the ONE write path every edit
    // funnels through, so undo is built here ONCE rather than wired action by
    // action. Capture the pre-patch value of each key this write touches from
    // the current event; if the write surfaces a toast, offer "Undo" that
    // restores exactly those values via the same path (marked noUndo so the
    // "Undone." toast doesn't itself offer an undo). Opt out with {noUndo:true}
    // for writes that shouldn't be reversible — e.g. real guest replies landing.
    const undoable = !!msg && !(opts && opts.noUndo);
    let undoPrev = null;
    if (undoable) { undoPrev = {}; for (const k of Object.keys(obj || {})) undoPrev[k] = event[k]; }
    if (activeCustom) setCustoms(list => list.map(c => {
      if (!c || c.id !== eventId) return c;
      const next = { ...c, ...obj };
      // Created events sync exactly like real ones (same session gate, same
      // full-event shape, same silent-offline behavior as the branch below).
      // SYNC-HONESTY-1: the old catch{} swallowed the result — no way to tell
      // a real cloud success from a queued/failed write. recordSaveResult
      // stamps or records honestly so the settings sheet can tell the truth.
      if (session) { cloudSaveEvent(next).then(res => recordSaveResult(next, res)).catch(() => {}); }
      return next;
    }));
    else setPatch(p => {
      const nextPatch = { ...p, ...obj };
      // Real-event edits persist to the cloud (superset merge, never drops a
      // base field). Session-gated; sample/demo events stay local-only.
      const realBase = REAL_EVENTS.find(e => e.id === eventId) || hydratedEvents.find(e => e.id === eventId);
      if (session && realBase) {
        const savedEv = { ...realBase, ...nextPatch };
        cloudSaveEvent(savedEv).then(res => recordSaveResult(savedEv, res)).catch(() => {});
      }
      return nextPatch;
    });
    feedback('act');
    if (msg) {
      // CONFIRM-GREEN: patchEvent is the ONE write path every successful edit funnels
      // through, so its toast is always a confirmation ⇒ green. Errors never come through
      // here (they call toast() directly with no tone), so they stay neutral.
      if (undoable) {
        const undoFn = () => patchEvent(undoPrev, 'Undone.', { noUndo: true });
        if (askModeRef.current && stage === 'plan' && !sheet) {
          setHeroReceipt({ msg, fn: undoFn });
          // Route through the ONE haptic vocabulary (feedback) instead of a bespoke
          // vibrate(8) — a receipt lands with the same 10ms tick as every other state
          // change, and respects the silent-haptics layer (audit 2026-07-22).
          try { feedback('tick'); } catch { /* no haptics */ }
          if (receiptTimerRef.current) clearTimeout(receiptTimerRef.current);
          receiptTimerRef.current = setTimeout(() => setHeroReceipt(null), 7000);
        } else {
          toast(msg, { label: 'Undo', fn: undoFn }, 'ok');
        }
      }
      else toast(msg, null, 'ok');
    }
  };

  // ── Guest replies land here. TWO sources, ONE merge (the ORIGINAL's
  // name-match rules: exact → last+first(≥3) → first-only(≥4)):
  //   1. the local outbox (ngw-rsvp-queue-<eventId>) — same-browser replies
  //   2. the backend (fetchEventRsvps) — replies DELIVERED from other devices;
  //      without this pull a successfully-delivered reply never reaches this
  //      roster (audit find 2026-07-08: delivery success made replies vanish).
  // THE single merge (lib/guestMerge) — extracted from App.js + this file's
  // former inline copy; both apps now consume one implementation.
  const announceReplies = (gs, n, yesCount) => {
    if (!n) return;
    const kidsCount = kidsTotal(gs);
    patchEvent({ guests: gs, kidsCount },
      n + (n === 1 ? ' reply' : ' replies') + ' came in from your invite link' + (yesCount ? ' — ' + yesCount + ' yes' : '') + '. The count just updated.',
      { noUndo: true }); // real replies arriving isn't a host edit to undo
  };
  // NEVER A BLANK START TIME (host directive 2026-07-15, frictionless). The create flow already
  // grounds a new event's start time; this does the same, ONCE, for an event that ARRIVED
  // without one — a seed, or anything made before the grounded default existed — so the whole
  // app runs on a real clock and the host sees "Confirm the start time" to accept/change, never
  // "Set" it from blank. Silent (no toast). Stays 'derived', so the outward gate keeps it off
  // every guest/vendor surface until they confirm; if they clear it, we re-propose — a blank
  // field is the friction we're removing.
  useEffect(() => {
    if (activeCustom) return;
    if (String(event.startTime || '').trim()) return;
    try { const p = defaultStartTime(event, wx); if (p) patchEvent(p); } catch (_e) { /* no ground — the list asks */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);
  useEffect(() => {
    try {
      const key = 'ngw-rsvp-queue-' + event.id;
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(raw) || !raw.length) return;
      const queue = purgeStaleOutbox(raw);
      if (!queue.length) { localStorage.removeItem(key); return; }
      const { guests: gs, merged, added, yesCount } = mergeGuestReplies(event.guests || [], queue);
      localStorage.removeItem(key);
      announceReplies(gs, merged + added, yesCount);
    } catch { /* queue unreadable — leave it for the original app */ }
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isRsvpApiConfigured()) return undefined;
    let dead = false;
    (async () => {
      try {
        const rows = await fetchEventRsvps(event.id);
        if (dead || !rows.length) return;
        // Server snake_case → the merge's field names (production's normalize).
        const subs = rows.map(r => ({
          name: r.guest_name, rsvp: r.rsvp, meal: r.meal, needs: r.needs,
          plusOne: r.plus_one, plusOneMeal: r.plus_one_meal, plusOneNeeds: r.plus_one_needs,
          kids: r.kids, note: r.note, idempotencyKey: r.idempotency_key,
        }));
        const { guests: gs, merged, added, yesCount } = mergeGuestReplies(event.guests || [], subs);
        if (!dead) announceReplies(gs, merged + added, yesCount);
      } catch { /* offline or unauthorized — the local queue path still works */ }
    })();
    return () => { dead = true; };
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vendor confirm-back read-back (build-map #10, Phase 2): a vendor who opened
  // the brief link and confirmed (or flagged an issue) lands here, so the host's
  // cockpit shows the vendor's OWN answer. Read-only display — the backend
  // capture + the vendor-side form already exist; this is the V2 host surface.
  // Degrades to [] when the API isn't configured (the demo) — no dead UI.
  const [vendorConfirmations, setVendorConfirmations] = useState([]);
  useEffect(() => {
    if (!isVendorBriefApiConfigured()) { setVendorConfirmations([]); return undefined; }
    let dead = false;
    (async () => {
      try { const rows = await fetchVendorConfirmations(event.id); if (!dead) setVendorConfirmations(Array.isArray(rows) ? rows : []); }
      catch { if (!dead) setVendorConfirmations([]); }
    })();
    return () => { dead = true; };
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Latest confirmation per vendor id (server returns newest-first, so first wins).
  const confirmationByVendor = useMemo(() => {
    const m = {};
    for (const c of vendorConfirmations) { const vid = String(c && c.vendor_id); if (vid && !m[vid]) m[vid] = c; }
    return m;
  }, [vendorConfirmations]);

  // Which engine actions have a real in-place edit here. Everything else stays an
  // honest route toast — never a button that pretends.
  const wiredKind = (a) => {
    if (['date', 'guests', 'budget', 'food'].includes(a.domain)) return a.domain;
    if (a.domain === 'starttime' || a.domain === 'datetime') return 'date';   // day + hour share the date editor
    // Engine top actions carry their CATEGORY as domain ('start', 'readiness'…);
    // recognize them by their real deep-link target or category.
    // SPECIFIC deep-link targets first — category fallbacks LAST. (The rain
    // essential arrives under the 'readiness' category; mapping the whole
    // category to budget put the budget editor on the rain card.)
    const f = (a.route && a.route.focusField) || '';
    if (f === 'rain-plan' || /rain backup/i.test(a.title || '')) return 'rain';
    if (f === 'venue' || f === 'event-venue' || /\b(location|venue)\b/i.test(a.title || '')) return 'venue';
    if (f === 'event-date' || f === 'event-start') return 'date';   // the date editor holds the time too
    if (f === 'guests-entry') return 'guests';
    if (/dietary|allerg/i.test(a.title || '') || /^fp-diet/.test(f)) return 'diet';
    if ((a.route && a.route.foodFocus) || f === 'food-plan') return 'food';
    if (/catering count/i.test(a.title || '')) return 'count';
    if (/final (guest|catering) count|confirm .*(guest|catering) count/i.test(a.title || '')) return 'lockcount';
    if (f === 'hsp-budget' || (a.domain === 'readiness' && /budget/i.test(a.title || ''))) return 'budget';
    if (a.domain === 'start') return 'guests';
    return null;
  };

  const onCta = (a, key) => {
    const kind = wiredKind(a);
    if (kind) {
      // Propose-don't-ask: the venue editor opens pre-filled with the host's
      // own prior answer (existing venue, or the town they named at create) —
      // grounded data only, never an invented guess.
      if (kind === 'venue' && !String(venueDraft || '').trim()) {
        try { const seed = String(event.venue || event.venueCity || '').trim(); if (seed) setVenueDraft(seed); } catch { /* blank is fine */ }
      }
      setEditor(key); spotlight(key); return;
    }
    if (/chase|rsvp/i.test(String(a.cta || '') + ' ' + String(a.title || ''))) { setSheet({ kind: 'guests' }); return; }
    // ELEGANT (host "no take-me-to on the hero"): an overdue-payment task RESOLVES IN PLACE —
    // "Mark as paid" writes vendor.balancePaid (the exact field surfaceRegistry reads to clear
    // it) and fires the receipt, instead of routing away with "Take me to it".
    if (elegantMode && /^send payment to/i.test(String(a.title || ''))) {
      const vid = a.route && a.route.vendorId;
      const nm = String(a.title).replace(/^send payment to\s*/i, '').replace(/\.$/, '').trim();
      const v = (event.vendors || []).find(x => x && (vid ? x.id === vid : String(x.name || '').trim() === nm));
      if (v) { writeVendor(v.id, { balancePaid: true }, (v.name || 'This vendor') + ' — balance marked paid.'); return; }
    }
    // ELEGANT (host "pull action into confirm vendor"): a plain vendor-confirm resolves IN PLACE
    // — tapping "Mark as locked in" locks the vendor in and fires the hero receipt (via
    // writeVendor→patchEvent), instead of routing to the cockpit. Payment/COI (vendorSection)
    // and already-confirmed vendors still route as before.
    if (elegantMode && a.route && a.route.vendorId && !a.route.vendorSection) {
      const v = (event.vendors || []).find(x => x && x.id === a.route.vendorId);
      if (v && !v.isInformal && !vendorStatusIsCurrent(v, 'Confirmed')) { setVendorStatus(v, 'Confirmed'); return; }
    }
    if (routeSheet(a.route)) return;
    const dest = describeRoute(a.route, event);
    toast(dest ? 'Not wired here yet — in the app this opens: ' + dest : 'Not wired here yet.');
  };

  // A folded bundle row (the "See all N" children under a conflict/decision hero).
  // If the item can resolve IN PLACE (a proposedFix-derived resolution whose two
  // options each carry an `apply` vendor patch or an `event` patch), render the
  // options as tactile confrows — one tap → writeVendor/patchEvent → receipt → the
  // conflict clears. No "Take me to it". Items without an in-place fix still route
  // via onCta. Shared by all three folded-row sites so the behavior is consistent.
  const renderBundleKid = (c, rowKey) => {
    // The folded rows are SURFACE items — they carry route.vendorId and an id that
    // encodes the conflict kind, but not the resolution. Recover the in-place
    // resolution from conflictItems (which hold the mapped proposedFix→resolution)
    // by matching the affected vendor + kind — so a folded conflict row resolves in
    // place too, not just the hero. (Also handles raw conflicts / mapped items.)
    const vId = c && c.route && c.route.vendorId;
    const kindHint = (c && typeof c.id === 'string' && (c.id.match(/vendor-conflicts:([a-z_]+)/) || [])[1]) || null;
    const matched = (c && c.resolution) ? c
      : (vId ? conflictItems.find(ci => ci && ci.affectedVendorId === vId && (!kindHint || ci.kind === kindHint)) : null);
    const res = (matched && matched.resolution) || (c && c.proposedFix ? deriveResolution(c) : null);
    const affectedVendorId = vId || (matched && matched.affectedVendorId);
    const inPlace = res && res.inPlace && Array.isArray(res.options) && res.options.length >= 1
      && res.options.every(o => o && (o.apply || o.event || o.route));
    const title = String((c && c.title) || '').replace(/\.+$/, '');
    if (inPlace) {
      const applyKid = (o) => {
        if (o.route) { routeSheet(o.route); return; }
        const msg = o.receipt || 'Done — the clash is cleared.';
        if (o.apply && affectedVendorId) writeVendor(affectedVendorId, o.apply, msg);
        else if (o.event) patchEvent(o.event, msg);
      };
      return (
        <div key={rowKey} className="line" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 7, padding: 'var(--sp-2) 0' }}>
          <span className="vc-detail" style={{ margin: 0 }}>{title}</span>
          <div className="conf-fixes">
            {res.options.map((o, oi) => (
              <button key={oi} className="confrow" onClick={() => applyKid(o)}>
                {/* → only when the option actually navigates (o.route); in-place
                    apply/event settles the clash right here, no arrow. */}
                <span className="t">{o.label}</span>{o.route ? <span className="g" aria-hidden="true">→</span> : null}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={rowKey} className="line" style={{ alignItems: 'center', padding: 'var(--sp-1) 0' }}>
        <span className="vc-detail" style={{ margin: 0, flex: 1 }}>{title}</span>
        <button className="mini" onClick={() => onCta(c, rowKey)}>{(!c || !c.cta || c.cta === 'Go') ? 'Take me to it' : c.cta}</button>
      </div>
    );
  };

  const setGuests = (n) => patchEvent({ guestEstimate: n }, 'Planning around ' + n + ' now — the plan just recomputed.');
  // The count RESOLUTION rows — shared by the 'count' editor and the guests
  // editor's drift bridge (W14): when the caterer's number and the confirmed
  // yeses disagree, the fix is one of these two taps, wherever the host is.
  // onSettled: the tap that ANSWERS the ask must also MOVE the loop — the host
  // report behind W14b ("doesn't have a next step after selection", 2026-07-22):
  // both resolutions fired their receipt and left the same hero standing.
  const countResolutionRows = (onSettled) => {
    const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
    const matchYes = () => { patchEvent({ catererCount: yes }, 'Caterer set to the ' + yes + ' confirmed yeses — the mismatch is closed.'); setChoiceOpen(null); if (onSettled) onSettled(); };
    const holdGuests = () => { patchEvent({ catererCount: guests }, 'Caterer told ' + guests + ' — noted as your call; it won’t re-ask today.'); setChoiceOpen(null); if (onSettled) onSettled(); };
    return (
      <div className="decopts">
        {[['Match confirmed yeses (' + yes + ')', matchYes], ['Hold ' + guests + ' plates anyway', holdGuests]].map(([label, fn], i) => (
          <button key={i} className="decopt" onClick={fn}>
            <span className="decopt-main"><span className="decopt-name">{label}</span></span>
            {/* No "→": both rows settle the count in place, they don't navigate. */}
          </button>
        ))}
      </div>
    );
  };

  // Inline editors, one per wired kind. Each writes the SAME fields the engine's
  // done-conditions read (_eventFoundationActions), so closing a gap closes the card.
  const renderEditor = (a) => {
    const kind = wiredKind(a);
    if (kind === 'venue') {
      return (
        <>
          <div className="actions-row" style={{ alignItems: 'center', marginTop: 'var(--sp-2)' }}>
            <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name or address"
              value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); setPendingCity(''); fetchAddrSugs(e.target.value); }} aria-label="Venue" autoFocus />
            <button className="mini" onClick={saveVenue}>Save</button>
          </div>
          {venueErr && <p className="because" style={{ color: 'var(--warn)', marginTop: 6 }}>{venueErr}</p>}
        </>
      );
    }
    if (kind === 'guests') {
      const guestN = Number(guests) || 0;
      const commitDraft = () => {
        const n = parseInt(guestDraft, 10);
        if (n > 0) setGuests(n);
        setGuestDraft('');
      };
      const bump = (delta) => { setGuestDraft(''); setGuests(Math.max(1, guestN + delta)); };
      // PARITY RECOMPOSE (host "feels unbalanced", 2026-07-22 W6): the number at
      // BigValue scale flanked by the stepper → quick chips → ONE quiet roster
      // link — kit atoms, ASK_RHYTHM gaps. The ask FRAMING (record line + guide
      // sentence) is the hero card's own title/consequence — repeating it here
      // doubled the telling.
      return (
        <AskColumn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginTop: ASK_RHYTHM.eyebrowToValue }}>
            <button className="mini" onClick={() => bump(-1)} aria-label="Fewer guests">−</button>
            <BigValueInput ariaLabel="Exact guest count"
              value={guestDraft !== '' ? guestDraft : (guestN || '')}
              onFocus={() => setGuestDraft(String(guestN || ''))}
              onChange={e => setGuestDraft(e.target.value)}
              onCommit={commitDraft} />
            <button className="mini" onClick={() => bump(1)} aria-label="More guests">+</button>
            <span className="of">guests</span>
          </div>
          {/* quick-pick a rough count (the stepper/field handles exact) */}
          <div className="chips hc-row" style={{ margin: `${ASK_RHYTHM.whyToCta}px 0 0` }}>
            {[50, 75, 100].map(n => (
              <button key={n} className="chip" aria-pressed={guests === n} onClick={() => { setGuestDraft(''); setGuests(n); }}>{n}</button>
            ))}
          </div>
          {/* SIMPLIFIED (host 2026-07-22): the editor was a wall of 13 controls mixing
              count-entry, mode, and actions. A number is enough for a headcount event;
              the ONE real branch is "do you want to track names?" — a single quiet link,
              not four chips. Invite drafting lives on the guest list, not here. */}
          {/* THE WAY FORWARD (W14 "user has nowhere to go", 2026-07-22): the stepper
              writes guestEstimate, but count-mode "resolved" reads guestCount — so no
              amount of stepping could ever close the ask. This commit writes the field
              the engine's done-condition actually reads; the ask dissolves and the
              next thing rises (the F27 loop). Count-mode only — a roster's final
              number comes from replies, not a typed lock. */}
          {event.guestMode !== 'list' && guestN > 0 && (
            <CtaRow>
              <button className="cta stay" onClick={() => {
                patchEvent({ guestCount: guestN, guestEstimate: guestN },
                  guestN + ' locked in — food, seats, and buys now size from it.');
                // Answering the ask advances the loop (W14b): the engine stops
                // generating this action once guestCount is set, but the session
                // mark makes the roll immediate, same as every decision settle.
                if (a && a.id) setSatisfiedIds(ids => ids.includes(a.id) ? ids : [...ids, a.id]);
              }}>Lock {guestN} in</button>
            </CtaRow>
          )}
          {/* DRIFT BRIDGE (W14): when the caterer's number disagrees with the confirmed
              yeses, the real fix is the count resolution — offer it right here instead
              of dead-ending on a stepper about a different number. */}
          {(() => {
            const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
            const drift = event.catererCount != null && event.catererCount !== yes;
            if (!drift) return null;
            return (
              <div style={{ marginTop: ASK_RHYTHM.whyToCta }}>
                <span className="of">Your caterer is set for {event.catererCount} · {yes} confirmed</span>
                {countResolutionRows(() => { if (a && a.id) setSatisfiedIds(ids => ids.includes(a.id) ? ids : [...ids, a.id]); })}
              </div>
            );
          })()}
          {event.guestMode !== 'list' && (
            // Quiet text link (same idiom as "Open the spread") — the .mini pill
            // overflowed the column and read as a competing CTA.
            <button style={{ alignSelf: 'flex-start', marginTop: ASK_RHYTHM.ctaToFoot, background: 'none', border: 'none', padding: 0, fontFamily: 'var(--sans)', fontSize: 'var(--t-meta)', fontWeight: 600, color: 'var(--steel-soft)', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => { patchEvent({ guestMode: 'list' }, 'Guest-list event — the roster drives the count.'); setSheet({ kind: 'guests' }); }}>
              Rather track who’s coming by name? Start a guest list ›
            </button>
          )}
        </AskColumn>
      );
    }
    if (kind === 'rain') return rainEditorBlock();
    if (kind === 'diet') {
      // The ENGINE's dietary model: dietCounts adds a real priced veg main and
      // flags related lines; dietaryNoted closes the cue (headcount events).
      const dc = event.dietCounts || {};
      const DIETS = DIET_TAGS;
      const setD = (k, delta) => {
        const n = Math.max(0, (Number(dc[k]) || 0) + delta);
        patchEvent({ dietCounts: { ...dc, [k]: n } },
          n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
      };
      return (
        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          {DIETS.map(k => (
            <div className="line" key={k} style={{ padding: '5px 0' }}>
              <span>{k}</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="mini" onClick={() => setD(k, -1)} aria-label={'Fewer ' + k}>−</button>
                <span className="step-val" style={{ minWidth: 18 }}>{Number(dc[k]) || 0}</span>
                <button className="mini" onClick={() => setD(k, 1)} aria-label={'More ' + k}>+</button>
              </span>
            </div>
          ))}
          <div className="actions-row" style={{ marginTop: 6 }}>
            <button className="cta stay" onClick={() => patchEvent({ dietaryNoted: true }, 'Dietary needs noted — the menu is good to go.')}>That’s everyone — noted</button>
          </div>
          <p className="grounding" style={{ margin: 0 }}>
            Vegetarian and vegan counts add a real, priced main to the spread; the others flag which lines to double-check. Counts live on the plan — change them anytime.
          </p>
        </div>
      );
    }
    if (kind === 'lockcount') {
      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
      const planned = guests || 0;
      const confirmedAt = event.guestMode === 'count' ? Number(event.guestCount) || 0 : 0;
      if (confirmedAt > 0) {
        return (
          <div className="chips hc-row">
            <span className="chip" aria-pressed="true" style={{ pointerEvents: 'none' }}>Confirmed at {confirmedAt}</span>
            <button className="chip" onClick={() => patchEvent({ guestCount: '' }, 'Count reopened — settle it when the maybes answer.')}>Reopen the count</button>
            <button className="chip" onClick={() => { patchEvent({ guestMode: 'list' }, 'Switched to a guest list — the roster drives the count now.'); setSheet({ kind: 'guests' }); }}>Switch to a guest list</button>
          </div>
        );
      }
      return (
        <div className="chips hc-row">
          {yes > 0 && (
            <button className="chip" onClick={() => patchEvent({ guestCount: yes, guestMode: 'count' }, 'Count set at ' + yes + ' — your confirmed yeses. Food and seats now size to it.')}>
              Set it at {yes} — confirmed yeses
            </button>
          )}
          {planned > 0 && planned !== yes && (
            <button className="chip" onClick={() => patchEvent({ guestCount: planned, guestMode: 'count' }, 'Count set at ' + planned + ' — the number you planned around.')}>
              Set it at {planned} — as planned
            </button>
          )}
          <button className="chip" onClick={() => setSheet({ kind: 'guests' })}>Check the list first</button>
        </div>
      );
    }
    if (kind === 'budget') return budgetEditorBlock();
    if (kind === 'date') {
      // The picked date is DRAFTED, not committed — a date change cascades through every
      // deadline, so it waits for an explicit confirm (host report). null draft ⇒ show the
      // committed date; a draft that differs ⇒ the confirm button appears below.
      const dateShown = dateDraft !== null ? dateDraft : (event.date || '');
      const dateDirty = dateDraft !== null && dateDraft !== (event.date || '');
      const confirmDate = () => {
        const v = dateDraft;
        if (!v) return;
        // DATE-GUARDRAIL: a malformed value (stray keystrokes, a corrupted paste, a broken
        // segment in the native picker) can otherwise write straight through to event.date
        // and render as "739158d ago". eventDateStatus is the one shared verdict.
        const check = eventDateStatus(v);
        if (check.blocking) { toast(check.reason || "That date doesn't look right — check it."); return; }
        // ONE host confirmation, wired to the decision engine: committing event.date re-derives
        // every countdown, deadline and shopping window (the board/phaseProgress read it), and it
        // SETTLES the "Date & time" domino so its cue + alerts clear. If a start time is already
        // set, mark it host-confirmed in the same tap so BOTH halves of "when" clear together
        // (datetime is handled only when date AND start time are confirmed — phaseProgress.js).
        const patch = { date: v };
        if (String(event.startTime || '').trim() && !startTimeIsConfirmed(event)) patch.startTimeSource = 'host';
        patchEvent(patch, 'Date confirmed — every countdown, deadline, and shopping window just moved to it.');
        setDateDraft(null);
      };
      return (
      <div className="hc-row" style={{ flexWrap: 'wrap' }}>
        <input className="field" type="date" value={dateShown} aria-label="Event date"
          onChange={e => { const v = e.target.value; if (v) setDateDraft(v); }} />
        {/* CONFIRM (host report): a date change waits for a yes before it moves the plan. */}
        {dateDirty && (
          <button className="mini" style={{ color: 'var(--steel)', fontWeight: 700 }} onClick={confirmDate}>
            Move everything to this date
          </button>
        )}
        {/* AN EVENT SHOULD START WITH A GROUNDED TIME (2026-07-14).
            A date without a time is half a decision, and the app was quietly filling the
            other half by inventing one: the run of show anchored the whole day to a bare
            15:00, printed it as fact, and SENT IT TO A CATERER. `startTime` was read by
            three engines and WRITABLE BY NOTHING — the same read-with-no-capture hole as
            hostName, deckLine and payDueDate.

            So the time is captured HERE, beside the date it belongs to, with a grounded
            proposal (lib/startTime.js): a real sunset from the forecast, the playbook's own
            authored run-length, or — failing both — the host's own time-of-day word made
            precise. If we know none of those, we propose nothing and simply ask. */}
        {String(event.date || '').trim() && (() => {
          const prop = (() => { try { return proposeStartTime(event, wx); } catch (_e) { return null; } })();
          return (
            <>
              <div className="actions-row" style={{ width: '100%', marginTop: 'var(--sp-2)', alignItems: 'center' }}>
                <span className="of">guests arrive:</span>
                <input className="field" type="time" style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                  value={event.startTime || ''}
                  onChange={e => patchEvent({ startTime: e.target.value, startTimeSource: 'host' }, 'Start time set — the day now runs on a real clock.')}
                  aria-label="What time guests arrive" />
                {prop && (
                  <button className="mini" onClick={() => patchEvent({ startTime: prop.hhmm, startTimeSource: 'host' },
                    'Start time set — the day now runs on a real clock.')}>
                    use {prop.label}
                  </button>
                )}
                {/* Confirm the proposed time INLINE next to it (host request 2026-07-16) — one tap
                    right where the time lives, not a separate row below. */}
                {!startTimeIsConfirmed(event) && String(event.startTime || '').trim() && (
                  <button className="mini" onClick={() => patchEvent({ startTimeSource: 'host' },
                    'Start time confirmed — your invite and vendor briefs can name it now.')}>
                    that’s right
                  </button>
                )}
              </div>
              {/* The event ARRIVES with a grounded time, so the usual state here is not an empty
                  field — it is OUR time, awaiting the host's yes. Say so plainly, give the
                  reason, and make confirming it one tap. Until they do, no guest and no vendor
                  is told the hour. */}
              {!startTimeIsConfirmed(event) && String(event.startTime || '').trim() && (
                <>
                  <p className="grounding" style={{ width: '100%', margin: '6px 0 0' }}>
                    <b>We set this one, not you.</b> {event.startTimeWhy || ''} Your invite and your vendor briefs won’t name an hour until you say it’s right (tap “that’s right” by the time above).
                  </p>
                </>
              )}
              {prop
                ? <p className="grounding" style={{ width: '100%', margin: '6px 0 0' }}>{prop.why}</p>
                : !String(event.startTime || '').trim()
                  ? <p className="grounding" style={{ width: '100%', margin: '6px 0 0' }}>
                      Without this the day has an order but no clock, and nothing we send a vendor can name an hour.
                    </p>
                  : null}
            </>
          );
        })()}
      </div>
    );
    }
    if (kind === 'food') {
      // PARITY + UNIFY (Figma 7:38 / 369:60, 2026-07-20): render the SAME decopt the hero uses —
      // renderDecision(foodDecisionND()) — full-width option rows with our-pick (unsettled) or the
      // chosen row highlighted (settled) + notes, NOT a parallel inline-chip render. One source of
      // truth for the food decision; the "Open the spread" detail link stays as a subtle secondary.
      const fnd = foodDecisionND();
      // PARITY (Figma 369:60): the decision leads with the guide-voice grounding (Newsreader
      // italic) — the proposed "why" when we have a pick, else the ask-mode why. Was missing on
      // :5129 after the #1 subhead suppression; this restores it via the kit GuideLine atom.
      const foodGuide = fnd.proposed ? fnd.proposed.why : fnd.why;
      return (
        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--sp-3)' }}>
          {foodGuide && <GuideLine gap={0}>{foodGuide}</GuideLine>}
          {renderDecision(fnd)}
          {foodPlan && (
            // PARITY (Figma 369:60): a subtle steel-soft TEXT LINK, not a .chip pill — the options
            // are the CTAs; opening the detail is secondary.
            <button style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, fontFamily: 'var(--sans)', fontSize: 'var(--t-meta)', fontWeight: 600, letterSpacing: 0, color: 'var(--steel-soft)', cursor: 'pointer' }}
              onClick={() => setSheet({ kind: 'food' })}>Open the spread ({foodPlan.itemCount} items) ›</button>
          )}
        </div>
      );
    }
    if (kind === 'count') {
      // The engine's condition: catererCount must equal CONFIRMED yeses, not the
      // planned number — so only that choice actually closes the card (its
      // underlying action stops being generated once they match, per
      // CommandCenter's catererDrift check). "Hold anyway" deliberately keeps
      // flagging it — that's a real choice, not a bug, but it looked identical
      // to "unanswered" with no settled state at all. Same AUTO-COLLAPSE
      // doctrine as the other editors here now applies: once a count is on
      // file, fold to a line showing it (green if it now matches, amber if
      // the host chose to hold anyway) instead of leaving both chips sitting
      // there looking unclicked.
      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
      const held = event.catererCount;
      // BRING THE ACTION IN PLACE (host "fix this", 2026-07-21): only collapse to
      // the settled line when the count MATCHES the confirmed yeses (the resolved
      // state). When it's MISMATCHED — the actionable state this card exists to
      // fix — fall through to the two resolution rows directly, one tap, no
      // "change" detour. (Elegant already skips the collapse entirely.)
      if ((held || held === 0) && choiceOpen !== 'catererCount' && !elegantMode && held === yes) {
        const matches = held === yes;
        return (
          <div className="chips hc-row">
            <div className="line" style={{ flex: '1 0 100%', alignItems: 'center' }}>
              <span className="of" style={{ color: matches ? 'var(--ok)' : 'var(--warn)', fontWeight: 600 }}>
                {matches ? 'Matches confirmed — ' + held : 'Held at ' + held + ' · ' + yes + ' confirmed'}
              </span>
              <button className="mini" onClick={() => setChoiceOpen('catererCount')}>change</button>
            </div>
          </div>
        );
      }
      // The two count resolutions render as tactile .decopt rows — ONE shared
      // definition (countResolutionRows) also composed by the guests editor's
      // drift bridge (W14), so a mismatched count is fixable wherever it shows.
      return countResolutionRows(() => { if (a && a.id) setSatisfiedIds(ids => ids.includes(a.id) ? ids : [...ids, a.id]); });
    }
    return null;
  };


  // Rain editor — shared by the engine card editor AND the rain sheet, so
  // every route to rain-plan lands on the same real controls.
  const rainEditorBlock = () => {
    let suggested = null;
      try { suggested = suggestRainPlan(event); } catch { suggested = null; }
      // The moment a backup is written, show the host the guest-facing copy
      // and the send options (share sheet / text / WhatsApp) — no dead-end toast.
      const showGuestNote = (planText) => {
        setTimeout(() => {
          try { openDraft('Rain note to guests', guestRainMessage({ ...event, rainPlan: planText }, wx)); } catch {}
        }, 350);
      };
      let authored = null;
      try {
        // The engine's OWN wet-weather matcher (single point of truth); the wx
        // arg is only the lookup key — no forecast is claimed here.
        const hit = playbookContingencyForWeather(event, { kind: 'rain', risk: 'possible' });
        authored = hit ? hit.plan : null;
      } catch { authored = null; }
      // Strip a leading "the" before re-prefixing — some event types are
      // already named "The Cookout"/"The ___", and "The " + "the cookout"
      // doubled up into "The the cookout move".
      const typeLower = String(event.type || '').toLowerCase().replace(/^the\s+/, '');
      return (
        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--sp-2)' }}>
          <div className="actions-row" style={{ marginTop: 0 }}>
            {suggested && (
              <button className="cta"
                onClick={() => { patchEvent({ rainPlan: suggested }, 'Backup written for you — tuned to where you’re hosting.'); showGuestNote(suggested); }}>
                Do it for me
              </button>
            )}
            {authored && (
              <button className="cta soft"
                onClick={() => { patchEvent({ rainPlan: authored }, 'The ' + typeLower + ' move it is.'); showGuestNote(authored); }}>
                The {typeLower} move
              </button>
            )}
          </div>
          {/* Fold-behind-Change (parity/MANIFEST) — once a backup is set, the four
              presets collapse to one hairline row; tap to change. */}
          {event.rainPlan && !settledOpen.rain ? (
            <SettledRow label="Rain backup" value={event.rainPlan} tone="ok" style={{ margin: '0 0 var(--sp-2)' }}
              onOpen={() => setSettledOpen(m => ({ ...m, rain: true }))} />
          ) : (
            <div className="chips">
              {['Tent on standby', 'Carport / garage', 'Move it indoors', 'Rain or shine'].map(p => (
                <button key={p} className="chip" aria-pressed={event.rainPlan === p}
                  onClick={() => { patchEvent({ rainPlan: p }, 'Rain backup set: ' + p + ' — the day-of view knows.'); showGuestNote(p); setSettledOpen(m => ({ ...m, rain: false })); }}>{p}</button>
              ))}
            </div>
          )}
          {suggested && <p className="grounding" style={{ margin: 0 }}>“Do it for me”: “{suggested.slice(0, 110)}…”</p>}
        </div>
      );

  };
  // Budget editor — shared by the action-card editor AND the Budget sheet, so a
  // set budget stays changeable forever (three options = the estimator's real
  // low / mid / high; custom numbers split across the same real shares).
  // forceChange: open straight into the CHANGE drawer (skip the AGREED read-only display and
  // the PROPOSED lead) — used by the money-sheet fold, whose whole intent is "change the number".
  const budgetEditorBlock = (forceChange = false) => {
    const est = estimateTotalRange({ type: event.type, guestCount: guests, date: event.date, timeOfDay: event.timeOfDay, isDestination: !!event.isDestination });
    // HOST MODEL: one number (event.totalBudget). Offered three ways — the
    // estimator's real low/mid/high as Lean / Typical / All-out chips (host
    // request, 2026-07-08), a custom number, and the range as a hint.
    const opts = est
      ? [...new Set([est.lowTotal, Math.round(((est.lowTotal + est.highTotal) / 2) / 100) * 100, est.highTotal])]
      : [];
    const OPT_LABELS = ['Lean', 'Typical', 'All-out'];
    const low = est ? est.lowTotal : 0;
    const high = est ? est.highTotal : 0;
    const typical = est ? Math.round(((low + high) / 2) / 100) * 100 : 0;
    // "Budget is set" = the host gave us a NUMBER (event.totalBudget), NOT money.planned
    // (which is spend.total — non-zero from line items even when the host set no budget).
    const isSet = Number(event.totalBudget) > 0;
    const setB = (n) => {
      setCustomBudget('');
      setBudgetChanging(false);
      // MONEY-MOVE UNDO: snapshot just the field this write changes, offer one
      // inline restore on the toast. Single-level, in-memory — not a history.
      const prev = event.totalBudget;
      patchEvent({ totalBudget: n });
      toast('Budget set to ' + fmt(n), {
        label: 'Undo',
        fn: () => patchEvent({ totalBudget: prev === undefined ? '' : prev },
          Number(prev) > 0 ? 'Budget back to ' + fmt(Number(prev)) + '.' : 'Budget cleared — no number set.'),
      });
    };
    const customN = parseInt(customBudget, 10) || 0;
    const linkBtn = { background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--steel-soft)', fontWeight: 600, cursor: 'pointer' };

    // PROPOSE-DON'T-ASK (matches the day-of times): a budget is ONE grounded number
    // (Typical = the estimator's mid), not a 3-way menu. Lead with it + Use/Change;
    // the old tiers+custom become the Change drawer. The copy already conceded the
    // answer ("typical lands near … · one number is all you need") — now the UI leads with it.

    // AGREED — a budget is set: show it + change, not the chips. Same deliberate 6 / 14 / 20
    // rhythm as PROPOSED (Figma 344:61) so the two states share one skeleton.
    if (isSet && !budgetChanging && !forceChange) {
      return (
        <AskColumn>
          <Eyebrow tone="ok">Your budget</Eyebrow>
          <BigValue>{fmt(Number(event.totalBudget))}</BigValue>
          <Grounding>The plan sizes food, vendors and shopping from here — change it anytime.</Grounding>
          <CtaRow><button className="mini" onClick={() => setBudgetChanging(true)}>Change the number</button></CtaRow>
        </AskColumn>
      );
    }
    // PROPOSED — no budget yet and we can ground one: lead with Typical + Use/Change.
    if (!budgetChanging && !forceChange && typical > 0) {
      // Composed from the parity kit (./parity/askKit) — the locked 6/14/20/16 rhythm + 44/750
      // type live in the atoms now, not inline here. Matches Figma 344:61 B1.
      return (
        <AskColumn>
          <Eyebrow>A number to plan around</Eyebrow>
          <BigValue suffix="Typical">{fmt(typical)}</BigValue>
          <Grounding>
            {`For ${guests} at a ${String(event.type).toLowerCase()}, typical lands near ${fmt(typical)}. `}The plan sizes food, vendors and shopping from here — change it anytime.
          </Grounding>
          {est && est.destinationAdjusted && (
            <Grounding gap={8}>These ranges run wider because guests are traveling in — travel-scale costs are part of the numbers.</Grounding>
          )}
          <CtaRow>
            <button className="cta" onClick={() => setB(typical)}>Use {fmt(typical)}</button>
            <button className="mini" onClick={() => setBudgetChanging(true)}>Change</button>
          </CtaRow>
          {(low || high) ? (
            <Grounding gap={16}>
              or {low ? <button style={linkBtn} onClick={() => setB(low)}>Lean {fmt(low)}</button> : null}
              {low && high ? ' · ' : ''}
              {high ? <button style={linkBtn} onClick={() => setB(high)}>All-out {fmt(high)}</button> : null}
            </Grounding>
          ) : null}
        </AskColumn>
      );
    }
    // CHANGE drawer (or no estimate to ground a proposal) — the tiers + custom. A form, so
    // it leads with a header and steps deliberately (chips → own number → why), consistent
    // with the display states above. Pressed state reads event.totalBudget (the real budget),
    // NOT money.planned (= spend.total) — same fix as `isSet`.
    return (
      // Composed from the parity kit — TierRow is the shared full-width tier (Figma 344:61 B3).
      <AskColumn>
        <Eyebrow>Change your budget</Eyebrow>
        {/* Guide voice (Newsreader italic). Honest: the engine sizes food/vendors/shopping off
            the number but does NOT re-split into named categories — so no "I'll re-split the
            plan" promise (the estimator returns only low/high). */}
        <GuideLine>Pick a size, or type your own.</GuideLine>
        {opts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {opts.map((n, idx) => (
              <TierRow key={n}
                label={opts.length === 3 ? OPT_LABELS[idx] : fmt(n)}
                amount={opts.length === 3 ? fmt(n) : null}
                selected={Number(event.totalBudget) === n}
                pick={opts.length === 3 && idx === 1}
                onClick={() => setB(n)}
                ariaLabel={(opts.length === 3 ? OPT_LABELS[idx] + ' ' : '') + fmt(n)} />
            ))}
          </div>
        )}
        <CtaRow gap={ASK_COMPACT.whyToCta}>
          <input className="field" style={{ maxWidth: 170, fontSize: 'var(--t-input)', padding: 'var(--field)' }}
            type="number" inputMode="numeric" min="0" placeholder="Your own number"
            value={customBudget} onChange={e => setCustomBudget(e.target.value)}
            aria-label="Custom budget amount" />
          <button className="cta" disabled={customN <= 0} style={customN <= 0 ? { opacity: .45 } : undefined}
            onClick={() => setB(customN)}>Use it</button>
        </CtaRow>
        <Grounding gap={ASK_COMPACT.ctaToFoot}>
          {est ? `For ${guests} at a ${String(event.type).toLowerCase()}: lean runs about ${fmt(est.lowTotal)}, all-out about ${fmt(est.highTotal)}.` : ''}
          {est && est.destinationAdjusted ? ' These ranges run wider because guests are traveling in.' : ''}
        </Grounding>
      </AskColumn>
    );
  };

  // Day-before plan — lib/dayBefore, date-gated (0–2 days out). Pure and real:
  // set an event's date to tomorrow and this materializes.
  const dayBefore = useMemo(() => {
    try { return buildDayBeforePlan(event); } catch { return { applicable: false }; }
  }, [event]);

  // ── Create: build a REAL event object and hand it to the engine ──
  const assemble = () => {
    if (!effType) { toast('Tell me the occasion first — type it or pick it.'); return; }
    // Host-shell creation: playbook-typical count when unsaid, home venueKind
    // detection, universal playbook tasks drafted immediately, guestMode
    // 'count' (a headcount event until a roster starts), budget left to the
    // engine's own domino.
    const short = effType.replace(' Party', '');
    // A recognized milestone ("50th birthday") rides into the name — but it modifies the
    // OCCASION it belongs to (birthday/anniversary), NOT blindly the primary type (host
    // report: "50th ... retirement" was naming a "50th Retirement"). A DUAL event names
    // BOTH occasions ("Retirement & 50th Birthday") instead of dropping half.
    const secShort = parsed.secondaryType ? parsed.secondaryType.replace(' Party', '') : null;
    const occasions = [short, secShort].filter(Boolean);
    const cap = parsed.milestone ? parsed.milestone[0].toUpperCase() + parsed.milestone.slice(1) : null;
    const milestoneName = (cap
      ? occasions.map((o) => (/birthday|anniversary/i.test(o) ? cap + ' ' + o : o))
      : occasions).join(' & ');
    // Every created event gets its own id (and invite code) — creating another
    // one appends to the store, it never overwrites what came before. The one
    // exception: "Change an answer" corrections keep the id they're fixing.
    const redoId = redoEventId.current; redoEventId.current = null;
    const newId = redoId || mintEventId();
    const ev = {
      id: newId, rsvpCode: newId,
      createdAt: new Date().toISOString(), // overdue-on-creation fix: the board needs to know the runway existed
      name: effName ? effName + '’s ' + milestoneName : 'My ' + milestoneName,
      honoree: effName || '',
      type: effType, date: effDate || '', venue: parsed.venue || '', venueKind: parsed.venueKind || '',
      ...((() => {
        // Same strict city/state-or-ZIP gate as the other venueCity writers —
        // this is event CREATION, so a bare city typed here would otherwise
        // slip past every later check (needsCity only fires on an EMPTY city).
        const p = effCityText.trim() ? parseVenueLocation(effCityText.trim()) : null;
        if (!p) return { venueCity: '' };
        return p.zip ? { venueCity: p.zip } : { venueCity: p.city, venueState: p.state };
      })()),
      guestMode: 'count',
      guestEstimate: effGuests || '',
      totalBudget: effBudget || '',
      isDestination: effIsDestination,
      // The coarse time-of-day the host said ("cookout in the afternoon"). Persisted so the
      // grounded start-time default below has a bucket to propose from — without this it was
      // dropped, and defaultStartTime had nothing to ground on for a brand-new event.
      ...(parsed.timeOfDay ? { timeOfDay: parsed.timeOfDay } : {}),
      // DUAL / compound event + theme (host report — parsed then dropped at build). secondaryType
      // makes it a real compound event; theme seeds the look. Only ever what the host actually said.
      ...(parsed.secondaryType ? { secondaryType: parsed.secondaryType } : {}),
      ...(parsed.theme ? { theme: parsed.theme } : {}),
      budget: [],
      guests: [], vendors: [], timeline: [],
    };
    // AN EVENT ARRIVES WITH A GROUNDED START TIME (host directive, 2026-07-14).
    // Not the old invention — that was a bare 15:00, written as fact and indistinguishable
    // from a host decision. This one is DERIVED (a real sunset + the playbook's own run-length,
    // or failing that the host's own time-of-day word) and it carries its provenance:
    // startTimeSource:'derived' plus the sentence that justifies it. So the day runs on a real
    // clock from the first second, the host is told plainly that we picked it and why, and
    // nothing OUTWARD — a guest's invitation, a vendor's brief — states the hour until they
    // have confirmed it. An unconfirmed hour is ours, not theirs.
    try { Object.assign(ev, defaultStartTime(ev, null) || {}); } catch (_e) { /* no grounding — the list asks */ }
    // Canonical checklist over the real event object (date-relative offsets,
    // choice/caterer gates). No date yet → honestly empty; drafts later.
    try { ev.timeline = (playbookChecklist(ev) || []).map(r => ({ id: r.id, week: r.week || '', leadDays: r.leadDays != null ? r.leadDays : null, task: r.task || '', done: false, owner: '', category: r.category || '' })); } catch {}
    setCustoms(list => list.some(c => c && c.id === newId) ? list.map(c => (c && c.id === newId) ? ev : c) : [...list, ev]);
    setEventId(newId); setRevealed(true);
    // Build-map #3: a freshly created event is the host's new resume pointer.
    didResume.current = true;
    if (session) { try { patchProfile({ lastEventId: newId }); } catch { /* offline — localStorage profile holds it */ } }
    // Signed-in hosts' created events reach the account right away — the same
    // cloudSaveEvent path/shape every real-event edit uses. SYNC-HONESTY-1:
    // record the real result instead of swallowing it.
    if (session) { cloudSaveEvent(ev).then(res => recordSaveResult(ev, res)).catch(() => {}); }
    // The Reveal, choreographed around the PRODUCTION reveal stages
    // (buildAssembleRevealStages): identity, blockers, domains, risks.
    clearRevealTimers();
    let lineCount = 4;
    try { lineCount = Math.min((buildAssembleRevealStages(ev, revealIdentityFor(ev), profile, 1) || []).length, 5) + 1; } catch { /* default */ }
    if (REDUCE_MOTION) { setRevealStep(lineCount + 2); return; }
    setRevealStep(0);
    for (let i = 0; i < lineCount; i++) {
      revealTimers.current.push(setTimeout(() => setRevealStep(i + 1), 550 + 650 * i));
    }
    revealTimers.current.push(setTimeout(() => setRevealStep(lineCount + 1), 550 + 650 * lineCount + 350));
    revealTimers.current.push(setTimeout(() => { setRevealStep(lineCount + 2); if (!isSolemnEvent(event)) feedback('magic'); }, 550 + 650 * lineCount + 950));
  };
  // The REAL identity classifier via ctx (audit fix: the old stub hardcoded
  // confidence .8 / isCompound false — compound events got a false single-
  // identity reveal). One ctx build serves identity, stages, and eventPlan.
  const revealIdentityFor = (ev) => {
    try { return buildExperienceContext(ev, profile, 1).eventIdentity; }
    catch { return { primaryEventType: (ev && ev.type) || 'Event', secondaryEventTypes: [], isCompound: false, complexity: 'standard', ceremonyComponents: [], participants: [], confidence: 0 }; }
  };
  // Production reveal stages for the created event — identity, blockers,
  // planning domains (with real $), risk preview.
  const revealStages = useMemo(() => {
    if (!revealed || !activeCustom) return [];
    try { return (buildAssembleRevealStages(activeCustom, revealIdentityFor(activeCustom), profile, 1) || []).slice(0, 5); }
    catch { return []; }
  }, [revealed, activeCustom]);
  const revealLineCount = revealStages.length + 1;
  // a11y: when the reveal choreography finishes, move keyboard/SR focus to the
  // primary "Open your plan" CTA so a non-pointer user lands on the action
  // instead of being stranded at the top of a now-static screen.
  useEffect(() => {
    if (revealed && revealStep > revealLineCount + 1 && revealCtaRef.current) {
      try { revealCtaRef.current.focus(); } catch { /* focus is best-effort */ }
    }
  }, [revealed, revealStep, revealLineCount]);
  const revealEyebrow = revealStep > revealLineCount ? 'Here’s what we understood'
    : ['Reading your answers…', 'Sizing the crowd…', 'Pricing the spread…', 'Lining up your steps…'][Math.min(Math.max(revealStep - 1, 0), 3)];
  const customPlan = useMemo(() => {
    if (!revealed || !activeCustom) return null;
    try { return eventPlan(activeCustom, buildExperienceContext(activeCustom, profile, 1)); } catch { return null; }
  }, [revealed, activeCustom]);

  // Run of show — the app's single source: playbook-derived (tracks the event's
  // time of day), a stored ros only when the host has taken ownership.
  const ros = useMemo(() => { try { return effectiveRos(event) || []; } catch { return Array.isArray(event.ros) ? event.ros : []; } }, [event]);
  // Day-of ruling state 3: solemn events drop the count, soften verbs, lean the serif.
  const solemn = useMemo(() => isSolemnEvent(event), [event]);
  // WAVE-B: the ONE ros writer — legacy's exact shape (App.js:43393 setRos):
  // snapshot effectiveRos with the edit applied, and set rosEdited: true so
  // the stored schedule wins from now on (effectiveRos only honors event.ros
  // once the host has taken ownership; without the flag a playbook event
  // silently ignores the stored copy). Per-cue time/owner only — done state
  // stays in event.rosDone, untouched.
  const writeRosCue = (cueId, patch, msg) => {
    if (!cueId) return; // an id-less legacy row can't be targeted safely — stay read-only
    const next = ros.map(r => (r && r.id === cueId) ? { ...r, ...patch } : r);
    patchEvent({ ros: next, rosEdited: true }, msg);
  };
  // T-2d: inside the day-before window the board simplifies, not busies.
  const nearDayPlan = !!(dayBefore && dayBefore.applicable && askMode);
  const isPast = isPastEvent(event);                      // lib/closeoutIntel — tense authority
  // DAY-OF resume: entering The Day on the day itself picks up at the first
  // cue not already done (event.rosDone persists across reloads — the same
  // per-cue flag the production app writes; effectiveRos overlays it).
  useEffect(() => {
    if (stage !== 'day' || days !== 0) return;
    const first = ros.findIndex(r => r && !r.done);
    setDayIdx(first === -1 ? ros.length : first);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── LIVE DAY (original parity, App.js:34368 semantics): a real wall-clock
  // ticks every 30s and the NOW cue is DERIVED from the current minute — the
  // first open cue at/after now, else the first open cue. The host never taps
  // to find their place; marking done simply re-derives the next NOW.
  const [nowMin, setNowMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  useEffect(() => {
    if (stage !== 'day' || days !== 0) return undefined;
    const tick = () => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [stage, days]);
  // Cue-time math honoring BOTH stored forms — 24h "14:00" and 12h "2:00 PM"
  // (the original's toMins; parsing 12h as 24h creates the 3 AM-cookout bug).
  const cueMins = (t) => parseMin(t); // lib/dayAlerts — one time parser (12h+24h)
  const rosState = useMemo(() => { try { return classifyRos(ros); } catch { return ros.length ? 'timed' : 'empty'; } }, [ros]);
  const liveDay = stage === 'day' && days === 0 && rosState === 'timed';
  const openCues = useMemo(() => ros.filter(r => r && !r.done), [ros]);
  const nowCue = liveDay
    ? (openCues.find(r => { const m = cueMins(r.time); return m !== null && m >= nowMin; }) || openCues[0] || null)
    : null;
  const nowActive = !!(nowCue && (() => { const m = cueMins(nowCue.time); return m !== null && m <= nowMin; })());
  // EVERY open cue stays visible (original renders the full timeline): the
  // list is chronological and includes behind-schedule cues, marked honestly.
  const cuesAfterNow = nowCue ? openCues.filter(c => c !== nowCue) : [];
  const dayAllDone = liveDay && ros.length > 0 && openCues.length === 0;
  const dayStarted = ros.some(r => r && (r.done || (() => { const m = cueMins(r.time); return m !== null && m <= nowMin; })()));
  // The alert stack — the SAME engine the production app reads (lib/dayAlerts,
  // extracted from App.js so both shells agree). nowMin keeps it current.
  const dayAlerts = useMemo(() => {
    if (days !== 0) return [];
    try { return computeDayAlerts(event) || []; } catch { return []; }
  }, [event, days, nowMin]); // eslint-disable-line react-hooks/exhaustive-deps
  // WAVE-5: the raise ledger, read ONCE. Every qidx attention tint and count
  // badge derives from this — never from a hand-wired local boolean (see
  // surfaceRegistry's header: hand-wiring is the "bug FACTORY" the registry
  // exists to kill). registryCompleteness.test.js enforces it mechanically.
  const raised = useMemo(() => { try { return raiseCounts(event) || {}; } catch { return {}; } }, [event]);
  const alertSheet = (a) => {
    const to = String(a.navTo || '');
    const vm = /^(?:ov|confirm|pay)-(.+)$/.exec(String(a.id || ''));
    if (/arrivals|vendors/i.test(to)) { setSheet({ kind: 'vendors', focus: vm ? vm[1] : null }); return; }
    if (/guests/i.test(to)) { setSheet({ kind: 'guests' }); return; }
    if (/task/i.test(to)) { setSheet({ kind: 'tasks', focus: null }); return; }
    if (/communication/i.test(to)) { toast('Approvals live in the app’s messages — not wired here yet.'); return; }
    // Event Day Schedule → we're already looking at it.
  };
  // Handled whispers — ONLY facts the data proves (original Focus semantics).
  const dayWhispers = useMemo(() => {
    if (!liveDay) return [];
    const w = [];
    const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
    if (yes > 0) w.push(yes + ' confirmed');
    else if (guests) w.push('planned for ' + guests);
    if (foodPlan && foodPlan.itemCount > 0 && foodPlan.boughtCount >= foodPlan.itemCount) w.push('food shopped');
    if (money.planned && money.committed <= money.planned) w.push('budget on plan');
    if (outdoor && String(event.rainPlan || '').trim()) w.push('rain backup set');
    return w.slice(0, 4);
  }, [liveDay, event, foodPlan, money.planned, money.committed, outdoor, guests]);
  // Who's helping — DERIVED people (ros owners + arriving confirmed vendors),
  // never a CRM. Caterer rows drop when the host is cooking (original rule).
  // RULED (parity audit): dayHelpers is V2-only day-crew intelligence with no
  // lib equivalent; graduation should extract it INTO a lib rather than the
  // shell re-deriving. Kept here deliberately until then.
  const dayHelpers = useMemo(() => {
    // Computed any day (the print sheet needs it too); the live view is just
    // one of its readers.
    const out = []; const seen = new Set();
    for (const r of ros) {
      const o = String((r && r.owner) || '').trim();
      if (!o || /^(host|you|me|everyone|all)$/i.test(o)) continue;
      const k = o.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const cues = ros.filter(x => String((x && x.owner) || '').trim().toLowerCase() === k);
      out.push({ name: o, role: cues.slice(0, 2).map(c => c.segment).join(' · ').slice(0, 64), time: cues[0] && cues[0].time });
    }
    let cooking = false; try { cooking = hostIsCooking(event); } catch { cooking = false; }
    for (const v of (event.vendors || [])) {
      if (!v || !v.name || !v.arrivalTime) continue;
      if (!['Confirmed', 'Contracted', 'Deposit Paid'].includes(v.status)) continue;
      if (cooking && /cater/i.test(String(v.category || ''))) continue;
      if (seen.has(String(v.name).toLowerCase())) continue;
      let coi = null; try { coi = getVendorCOIState(v, event); } catch { coi = null; }
      out.push({ name: v.name, role: v.category || 'vendor', time: v.arrivalTime, coi });
    }
    return out;
  }, [ros, event]);

  // Schedule collisions on the day (rosOverlap — pairwise interval overlaps).
  const rosOverlaps = useMemo(() => { try { return rosOverlapCount(ros) || 0; } catch { return 0; } }, [ros]);

  // Micro-motion: hero + tile numbers settle in rather than snapping. Held
  // until the splash leaves (audit finding: unheld, this completes under
  // the opaque splash and the daily-boot reveal is invisible every day) —
  // so the numbers actually animate in as part of the fade handoff.
  const revealReady = splash !== 'up';
  const daysAnim = useCountUp(typeof days === 'number' ? Math.abs(days) : null, 650, revealReady);
  const doneAnim = useCountUp(plan.progress.done, 450, revealReady);
  const gAnim = useCountUp(guests || 0, 650, revealReady);
  const bAnim = useCountUp(money.planned || 0, 650, revealReady);

  // ══════════ FIRST-RUN WELCOME ══════════
  // A top-level gate, not a parallel shell: the same frame, one screen, two
  // exits — both land in the existing shell (the Create smart input, or the
  // sample event exactly as it behaves today). No appbar, no dock: nothing to
  // wander into before the one decision this screen asks for.
  if (welcome) {
    return (
      <div className="stagewrap">
        {/* inert while the splash covers the screen: closes the AT-path tap-
            through — a screen reader user could otherwise swipe onto and
            activate welcome/dashboard controls that are invisible to them
            under an opaque splash. Lifted the instant it starts fading, same
            moment sighted users get their first real look. */}
        <div className="app" id="app" inert={splash !== 'gone'}>
          {/* splash-hold: the welcome stagger stays paused at frame one while
              the boot splash is up; the class drops the instant the splash
              starts fading, so the lines begin as it dissolves — one sequence. */}
          <div className={'content welcome' + (splash === 'up' ? ' splash-hold' : '')}>
            <section>
              <div className="eyebrow">Welcome to Event Boss</div>
              {/* The one serif display moment — production's hero face. The
                  sentence's own period IS the brand bead: the same mark that
                  just dropped in on the splash, landed in the headline. */}
              <h1 className="mega welcome-h1">
                The whole event, one&nbsp;plan<span className="welcome-dot" aria-hidden="true" />
              </h1>
              <p className="mega-sub welcome-sub">
                Tell it what you’re hosting. It builds the rest.
              </p>
              <div className="welcome-ctas">
                <button className="cta big" onClick={() => dismissWelcome('create')}>Start my event</button>
                <button className="cta ghost" onClick={() => dismissWelcome()}>Explore a sample first</button>
              </div>
              <p className="welcome-note">The sample’s a demo — yours starts fresh.</p>
            </section>
          </div>
        </div>
        {splashEl}
      </div>
    );
  }

  return (
    <div className="stagewrap">
      {/* has-wxpill: the scroll-end spacer must also clear the weather pill's band
          when it's pinned (Layer-2 harness: "Add a rain backup" sat 35px under the
          pill at true scroll-end, 2026-07-22). */}
      <div className={'app' + (stage === 'day' ? ' dark-stage' : '') + (elegantMode ? ' app-elegant' : '') + (wxImpact && stage === 'plan' ? ' has-wxpill' : '')} id="app" ref={appRef} inert={splash !== 'gone'}>
        {/* dash-hold: same mechanism as .welcome.splash-hold — any one-shot
            entrance animation in here (sweepcard's cardin, etc.) pauses at
            frame one while the splash is up and releases the instant it
            starts fading, instead of completing invisibly underneath it. */}
        <div className={'content' + (splash === 'up' ? ' dash-hold' : '')}>
          <header className={'appbar' + (elegantMode ? ' appbar-elegant' : '')}>
            <div>
              <div className="wordmark">Event Boss<span className="wm-dot" aria-hidden="true" /></div>
              <div className="appbar-note">V2 preview</div>
            </div>
            {/* Reimagined (host request: header felt crammed on mobile) — the
                event-switcher pill used to sit HERE, truncating the event name
                to "Retirement P…" while the masthead two lines below already
                showed it in full. Same control, one less redundant pill:
                the masthead's own event-type badge (below) is now the tap
                target that opens the events sheet, so the appbar only carries
                the two things that actually live here — sound + profile. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* WAYFINDING (host friction audit, 2026-07-13): the #1 blocker was
                  that most surfaces (food, vendors, seating, checklist, decisions,
                  risks…) had NO stable, labeled door — only conditional Plan rows
                  or the unlabeled search icon. This is that door: one always-present,
                  worded control opening a labeled index of every section. A TEXT
                  label (not another bare icon) on purpose — the personas who hunt
                  most won't decode an icon. */}
              <button className="sheet-x wm-you" onClick={() => setSheet({ kind: 'sections' })}
                aria-label="All sections of your plan" title="All sections"
                style={{ width: 'auto', padding: '0 11px', gap: 6, display: 'flex', alignItems: 'center', fontSize: 'var(--t-pill)', fontWeight: 650, letterSpacing: '.02em' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                Sections
              </button>
              {/* Quick-switcher entry point (build-map #9) — the keyboard path is
                  Cmd/Ctrl-K; this button is the touch path (no keyboard on a phone).
                  Relabeled from "jump to an event" to name that it finds any PART of
                  the plan, not just events (friction audit #3). */}
              <button className="sheet-x wm-you" onClick={() => setPaletteOpen(true)} aria-label="Find anything in your plan" title="Find anything (⌘K)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </button>
              {/* #4 recovery path: a first-timer who hits a wall has somewhere to
                  turn — a help sheet grounded in THIS event's real state (the one
                  next thing, how it works, ask a question). */}
              <button className="sheet-x wm-you" onClick={() => setSheet({ kind: 'help' })} aria-label="Help — I'm stuck" title="Stuck? Start here">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.8 2.5-2.8 2.5" />
                  <path d="M12 17.2h.01" />
                </svg>
              </button>
              {/* Header carries ONE control (host request 2026-07-11): the
                  account icon. Sound moved into the You & your account sheet. */}
              <button className="sheet-x wm-you" onClick={() => setSheet({ kind: 'settings' })} aria-label="You and your account">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5" />
                </svg>
              </button>
            </div>
          </header>

          {/* ══════════ CREATE ══════════ */}
          {stage === 'create' && (
            <section role="main">
              {!revealed ? (
                /* Modernized create moment (host request 2026-07-11): the prompt
                   is a vertically centered display moment while the screen is
                   blank; the instant the host types, the stage collapses to the
                   top and the recognition flow takes over. */
                <div className={'create-stage' + (smartText.trim() === '' ? ' centered' : '')}>
                  <div className="eyebrow">New event</div>
                  <h1 className="mega create-prompt">What are we planning?</h1>
                  <p className="mega-sub" style={{ fontWeight: 550, color: 'var(--muted)' }}>
                    Say it like you’d text a friend — I’ll take it from there.
                  </p>
                  <div className="create-inputrow">
                    <input
                      className="field"
                      placeholder={listening ? 'Listening…' : 'Try: crab feast for 20, Aug 2'}
                      value={smartText}
                      onChange={e => { setSmartText(e.target.value); setFType(null); setCreateEdit(null); }}
                      aria-label="Describe your event"
                    />
                    {/* UX_02 amber budget: listening is a status, not a warning — steel, not warn.
                        .cta.soft's resting state is already steel-tint/steel-soft, so a 1px steel
                        ring keeps the aria-pressed state visually distinct without leaving the register. */}
                    <button className="cta soft" style={listening ? { background: 'var(--steel-tint)', color: 'var(--steel-soft)', boxShadow: '0 0 0 1px var(--steel-soft)' } : undefined}
                      onClick={() => listening ? stopVoice() : startVoice()} aria-pressed={listening} aria-label="Speak it instead">
                      {listening ? 'Listening… tap to stop' : 'Say it'}
                    </button>
                  </div>
                  {smartText.trim() === '' && (
                    /* Empty state: one honest what-you-get line, no example
                       chips (host ruling 2026-07-11 — the prompt stands alone). */
                    <p className="grounding" style={{ marginTop: 18, maxWidth: '36ch' }}>
                      A real plan — guests, food, budget, the day. Change anything.
                    </p>
                  )}
                  {smartText.trim() !== '' && (
                    <>
                      {/* Recognition chips — what was understood; tap to correct. */}
                      <div className="chips" style={{ marginTop: 14 }}>
                        <button className="chip" aria-pressed={!!effType}
                          onClick={() => { setCreateEdit(createEdit === 'type' ? null : 'type'); setTypeOpen(true); setTypeQuery(''); }}>
                          {effType ? effType.replace(' Party', '') : 'Which occasion?'}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'count' ? null : 'count')}>
                          {effGuests ? '~' + effGuests + (fGuests == null && parsed.guests == null ? ' · typical' : '') : 'How many?'}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'date' ? null : 'date')}>
                          {effDate ? new Date(effDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (parsed.monthYear ? parsed.monthYear.label + ' · pick a day' : 'No date yet')}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'name' ? null : 'name')}>
                          {effName ? 'For ' + effName : 'Who’s it for?'}
                        </button>
                        {parsed.venue ? <span className="chip" aria-pressed="true" style={{ pointerEvents: 'none' }}>{parsed.venue}</span> : null}
                        <button className="chip" aria-pressed={!!effCityText} onClick={() => setCreateEdit(createEdit === 'city' ? null : 'city')}>
                          {effCityText || 'Which town?'}
                        </button>
                        <button className="chip" aria-pressed={!!effBudget} onClick={() => setCreateEdit(createEdit === 'budget' ? null : 'budget')}>
                          {effBudget ? '$' + effBudget.toLocaleString() + (fBudget == null && parsed.budget != null ? ' · heard' : '') : 'Budget?'}
                        </button>
                        <button className="chip" aria-pressed={effIsDestination} onClick={() => setFIsDestination(!effIsDestination)}>
                          {effIsDestination ? 'Destination event' + (fIsDestination == null ? ' · heard' : '') : 'Local event'}
                        </button>
                      </div>
                      {(createEdit === 'type' || !effType) && (
                        <div className="typebrowser" style={{ marginTop: 'var(--sp-3)' }}>
                          <input
                            className="field" style={{ maxWidth: 'none' }}
                            placeholder="Search occasions — bbq, boil, sweet 16…"
                            value={typeQuery}
                            onChange={e => setTypeQuery(e.target.value)}
                            aria-label="Search occasions"
                          />
                          {typeMatches ? (
                            <div className="chips" style={{ marginTop: 'var(--sp-3)' }}>
                              {typeMatches.length
                                ? typeMatches.map(t => (
                                  <button key={t} className="chip" aria-pressed={effType === t} onClick={() => { pickType(t); setCreateEdit(null); }}>{t.replace(' Party', '')}</button>
                                ))
                                : <p className="grounding">Nothing matches — “bbq”, “boil”, and “get together” all work.</p>}
                            </div>
                          ) : (
                            TYPE_GROUPS.map(([group, list]) => (
                              <div key={group} className="shelf-wrap">
                                <div className="shelf-label">{group}</div>
                                <div className="shelf">
                                  {list.map(t => (
                                    <button key={t} className="chip" aria-pressed={effType === t} onClick={() => { pickType(t); setCreateEdit(null); }}>{t.replace(' Party', '')}</button>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {createEdit === 'count' && (
                        <div className="chips hc-row">
                          {[10, 18, 30, 50, 75, 120].map(n => (
                            <button key={n} className="chip" aria-pressed={effGuests === n} onClick={() => { setFGuests(n); setCreateEdit(null); }}>~{n}</button>
                          ))}
                        </div>
                      )}
                      {createEdit === 'date' && (
                        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                          {parsed.monthYear && !fDate && (() => {
                            // A month + year is a real signal, but never precise enough to
                            // commit alone — same principle as the type/count pickers:
                            // offer real OPTIONS (Saturdays, the usual day for a
                            // celebration) rather than guessing one day silently.
                            const { year, month, label } = parsed.monthYear;
                            const sats = [];
                            const d = new Date(year, month, 1);
                            while (d.getMonth() === month) {
                              // LOCAL format, not toISOString (UTC): east of Greenwich the UTC
                              // slice shifts a local-midnight Saturday to FRIDAY's date — the
                              // chip would say Saturday and write the day before.
                              if (d.getDay() === 6) sats.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                              d.setDate(d.getDate() + 1);
                            }
                            return (
                              <>
                                <p className="grounding" style={{ margin: '0 0 2px' }}>Got {label} — pick a Saturday, or set the exact day below.</p>
                                <div className="chips">
                                  {sats.map(s => (
                                    <button key={s} className="chip" onClick={() => setFDate(s)}>
                                      {new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </button>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                          <input className="field" type="date" value={effDate} onChange={e => setFDate(e.target.value)} aria-label="Event date" />
                          {effDate && dstatC.status !== 'ok' && (
                            <p className="grounding" style={dstatC.blocking ? { color: 'var(--danger)' } : { color: 'var(--warn)' }}>{dstatC.reason}</p>
                          )}
                        </div>
                      )}
                      {createEdit === 'name' && (
                        <div className="hc-row">
                          <input className="field" placeholder="Who’s it for?" value={effName} onChange={e => setFName(e.target.value)} aria-label="Who is it for" />
                        </div>
                      )}
                      {createEdit === 'city' && (
                        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                          <input className="field" placeholder="Annapolis · Silver Spring, MD · 21401"
                            value={fCity || effCityText} onChange={e => setFCity(e.target.value)} aria-label="Town or ZIP" />
                          <p className="grounding" style={{ margin: 0 }}>The town is how weather and maps find a backyard — it rides into the plan from day one.</p>
                        </div>
                      )}
                      {createEdit === 'budget' && (() => {
                        // PROPOSE-DON'T-ASK (open item, shipped 2026-07-22): the create flow was
                        // the ONE budget surface still opening a blank form while lean/typical/
                        // all-out is proposed everywhere else. Same estimator, same TierRow atoms,
                        // grounded in the type + count already on this screen. No estimate (no
                        // type yet) → the honest custom field alone.
                        const estC = (() => {
                          try {
                            return effType ? estimateTotalRange({ type: effType, guestCount: effGuests, date: effDate || undefined, isDestination: effIsDestination }) : null;
                          } catch { return null; }
                        })();
                        const midC = estC ? Math.round(((estC.lowTotal + estC.highTotal) / 2) / 100) * 100 : 0;
                        const optsC = estC ? [...new Set([estC.lowTotal, midC, estC.highTotal])] : [];
                        const LABELS_C = ['Lean', 'Typical', 'All-out'];
                        const fmtC = (n) => '$' + Number(n).toLocaleString();
                        return (
                          <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                            {optsC.length > 0 && optsC.map((n, idx) => (
                              <TierRow key={n}
                                label={optsC.length === 3 ? LABELS_C[idx] : fmtC(n)}
                                amount={optsC.length === 3 ? fmtC(n) : null}
                                selected={effBudget === n}
                                pick={optsC.length === 3 && idx === 1}
                                onClick={() => { setFBudget(n); setCreateEdit(null); }}
                                ariaLabel={(optsC.length === 3 ? LABELS_C[idx] + ' ' : '') + fmtC(n)} />
                            ))}
                            <input className="field" type="number" min="0" placeholder="Your own number"
                              value={fBudget ?? (parsed.budget ?? '')}
                              onChange={e => setFBudget(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0))}
                              aria-label="Total budget" />
                            {estC && (
                              <p className="grounding" style={{ margin: 0 }}>
                                For {effGuests} at a {String(effType).toLowerCase()}: lean runs about {fmtC(estC.lowTotal)}, all-out about {fmtC(estC.highTotal)}.{estC.destinationAdjusted ? ' These ranges run wider because guests are traveling in.' : ''}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      {effType && (
                        <div style={{ marginTop: 26 }}>
                          <button className="cta big" onClick={assemble}
                            disabled={!!effDate && dstatC.blocking}
                            style={effDate && dstatC.blocking ? { opacity: .45, cursor: 'not-allowed' } : undefined}>
                            Put my plan together
                          </button>
                          <p className="grounding" style={{ marginTop: 10 }}>
                            {effGuests ? `Planning around ${effGuests}${fGuests == null && parsed.guests == null ? ' (the ' + effType.replace(' Party', '').toLowerCase() + ' typical)' : ''}` : ''}
                            {expectC ? ` — likely ${expectC.low}–${expectC.high} make it.` : ''}
                            {!effDate ? ' No date yet is fine — the plan will ask.' : ''}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Full-screen ceremonial takeover (host request 2026-07-11 —
                   see styles.css for the why). SAME data as before, kept
                   verbatim per the host's explicit "I want the listing
                   back": every stage line, why/nextDecision, identity
                   statement, grounding line, both CTAs — only the frame
                   around them changed. */
                <div className="reveal-stage">
                  <div className="reveal-inner">
                    {/* Skip for repeat creators (per-screen audit): jump straight to
                        the resolved understanding instead of replaying the full ~5s
                        choreography every time. Only while it's still animating. */}
                    {revealStep <= revealLineCount && (
                      <div style={{ textAlign: 'right', marginBottom: 2 }}>
                        <button className="mini" onClick={() => { clearRevealTimers(); setRevealStep(revealLineCount + 2); try { if (!isSolemnEvent(event)) feedback('magic'); } catch { /* no haptics */ } }}>Skip ›</button>
                      </div>
                    )}
                    <div className="eyebrow" aria-live="polite">{revealEyebrow}</div>
                    <ul className="tick-list" style={{ marginTop: 22 }}>
                      {revealStages.map((st, i) => (
                        <li key={st.key || i} className={'rv-line' + (revealStep > i ? ' in' : '')}>
                          <strong>{st.title}:</strong> {st.what}{st.why ? <span style={{ color: 'var(--muted)' }}> {st.why}</span> : null}
                          {st.nextDecision && <span className="grounding" style={{ display: 'block', marginTop: 3 }}>{st.nextDecision}</span>}
                        </li>
                      ))}
                      {customPlan && (
                        <li className={'rv-line' + (revealStep > revealStages.length ? ' in' : '')}><strong>{customPlan.nextActions.length} step{customPlan.nextActions.length === 1 ? '' : 's'}</strong> waiting in your plan, lined up in the order they’ll matter.</li>
                      )}
                    </ul>
                    {/* The name lands LAST — the conclusion the plan reached, not a header.
                        Its period is the same locked bead as the boot splash: it drops in
                        and ignites once the name has landed — the same mark, twice. */}
                    <h1 className={'mega title-drop' + (revealStep > revealLineCount ? ' in' : '')} style={{ fontFamily: 'var(--serif)', fontWeight: 800, fontSize: 'var(--t-display-l)', lineHeight: 1.1, letterSpacing: '-.015em', marginTop: 6, color: 'var(--ink)' }}>{activeCustom?.name}<span className="reveal-dot" aria-hidden="true" /></h1>
                    {/* identityStatement() — the production identity engine, verbatim */}
                    <p className={'mega-sub pre' + (revealStep > revealLineCount ? ' in' : '')} style={{ marginTop: 'var(--sp-2)', color: '#9aa7b2' }}>{identityStatement(activeCustom)}</p>
                    <p className={'grounding pre' + (revealStep > revealLineCount + 1 ? ' in' : '')}>All of this came straight from your answers — nothing made up.</p>
                    <div className={'actions-row pre' + (revealStep > revealLineCount + 1 ? ' in' : '')} style={{ marginTop: 'var(--sp-6)' }}>
                      <button ref={revealCtaRef} className={'cta big' + (revealStep > revealLineCount + 1 ? ' glow-once' : '')} onClick={() => setStage('plan')}>Open your plan</button>
                      {/* Build-map #5 — hand the host the thing their guests tap,
                          right at the moment of creation. The share rails already
                          exist; this is sequencing, and it seeds the viral loop
                          before the host ever leaves the reveal. */}
                      {/* Demoted to ghost so "Open your plan" is the sole primary at
                          the reveal climax (one primary ask — invite-remake directive). */}
                      <button className="cta ghost" onClick={shareInviteLink}>Share the invite</button>
                      <button className="cta ghost" onClick={() => { clearRevealTimers(); redoEventId.current = activeCustom ? activeCustom.id : null; setRevealed(false); }}>Change an answer</button>
                    </div>
                    <p className={'grounding pre' + (revealStep > revealLineCount + 1 ? ' in' : '')} style={{ marginTop: 'var(--sp-2)', textAlign: 'center' }}>Your guests reply at that link — nothing to install, no account.</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ══════════ PLAN ══════════ */}
          {stage === 'plan' && (
            <section role="main">
              {/* Event switching lives in the app-bar switcher (events sheet) —
                  the always-on shelf drew more attention than the plan itself. */}

              {plan._error && <div className="engine-error">Engine error: {plan._error}</div>}

              {/* HERO VIEWPORT (host request, 2026-07-08): the first screen is a
                  flex column sized to the visible frame — masthead + countdown
                  up top, the summary tiles mid, and the NEXT tile anchored just
                  above the floating dock so the primary action sits at thumb
                  reach with no dead space below it. */}
              <div className={'hero' + (elegantMode ? ' elegant voice-' + elegantVoice : '')}>
              {/* First-screen bound (F13 foot-pin): a display:contents wrapper — invisible in
                  every mode EXCEPT elegant-ask, where it becomes a 100dvh flex column so the
                  progress hairline pins to the true foot and the see-all sits below it. */}
              <div className={(elegantMode && (askMode || isPast || (listIsCalm && !isPast && days !== null && days > 0))) ? 'escreen on' : 'escreen'}>
              {/* ELEGANT-MINIMAL PORT (F13 fidelity, host ruling "match Figma exactly"
                  2026-07-17): the ask screen's masthead collapses to ONE tiny eyebrow
                  (countdown · event name, uppercase) — the big serif name + venue + kicker
                  move OFF the ask screen (the serif name belongs on the pull-down Overview).
                  Everything below composes with generous negative space. */}
              {elegantMode && (askMode || justCleared || isPast || (listIsCalm && !isPast && days !== null && days > 0)) ? (
                <button className="ev-eyebrow" onClick={() => setSheet({ kind: 'nav' })} aria-haspopup="true" aria-label="Menu">
                  <span className="eb-menu" aria-hidden="true"><span /><span /><span /></span>
                  <span className="eb-text">{(days != null && days > 0 ? (days === 1 ? '1 DAY' : days + ' DAYS') + '  ·  ' : days != null && days < 0 ? (days === -1 ? '1 DAY AGO' : Math.abs(days) + ' DAYS AGO') + '  ·  ' : '') + String(eventTypeLabel(event) || event.type || event.name || '').toUpperCase()}</span>
                  <span className="eb-caret" aria-hidden="true">▾</span>
                </button>
              ) : (
              /* Event masthead — kicker / readable title / quiet venue.
                  (The old all-caps eyebrow crushed long names into three
                  unreadable letterspaced lines.) Theme/colors (event.theme)
                  rides the same quiet line as venue — real host-entered data,
                  shown only when set, no new row added. */
              <div className="ev-head">
                <button className="ev-kicker" onClick={() => setSheet({ kind: 'events' })} aria-haspopup="true">
                  {eventTypeLabel(event) || event.type} <span aria-hidden="true">▾</span>
                </button>
                <div className="ev-title">{event.name}</div>
                {(event.venue || event.theme) ? <div className="ev-venue">{[event.venue, event.theme].filter(Boolean).join(' · ')}</div> : null}
              </div>
              )}
              {/* ecenter — DOCTRINE (host "make sure hero doctrine keeps in middle"): the
                  ask+action cluster is vertically CENTERED between the eyebrow and the foot
                  progress, robustly at ANY content length (flex:1 + justify-center). Invisible
                  (display:contents) outside elegant so the normal board is untouched. */}
              <div className="ecenter">
              {/* REBALANCE (host-approved 2026-07-17): instruction-first display.
                  askMode → the display slot speaks the ASK in plain words and the
                  countdown folds into the TRUTH line; otherwise the countdown
                  keeps the display (calm/day-of/past — the date IS the story).
                  THE STATUS LINE (wave-6 ruling) is computed ONCE for both
                  branches: one honest sentence, no arithmetic. In askMode the
                  calm "On track" folds into the truth line; a non-calm verdict
                  keeps its full sentence and its color. */}
              <div ref={heroZoneRef} className="hzone">{(() => {
                // ALL-CLEAR PAYOFF — a whole bundle just went quiet on this event.
                // Owns the hero until the host taps the handoff. Conflicts show the
                // grounded run-of-show (the proof the clash is gone); other bundles
                // get the clean type reward. Grounded: the count is the real N that
                // cleared, the timeline is the event's own ROS (fmt12h), never faked.
                if (elegantMode && justCleared) {
                  const jc = justCleared;
                  const isConf = jc.kind === 'conflict';
                  const isCoi = jc.kind === 'coi';
                  const cues = isConf ? ros.filter(r => r && r.time && r.label).slice(0, 5) : [];
                  const next = (queue && queue.length && !listIsCalm) ? queue[0] : null;
                  const nextLabel = next
                    ? 'Next: ' + String(next.title || 'your next step').replace(/\.+$/, '')
                    : 'Nothing else needs you right now';
                  return (
                    <div className={'allclear' + (solemn ? ' solemn' : '')} role="status">
                      <h2 className="ac-head">{solemn
                        ? (isConf ? 'The day’s in order.' : isCoi ? 'Everyone’s cleared to help.' : 'It’s all settled.')
                        : (isConf ? 'All untangled.' : isCoi ? 'All covered.' : 'All decided.')}</h2>
                      <p className="ac-voice">{isConf
                        ? (cues.length ? 'Every vendor has its own hour now — here’s the day, in order.'
                                       : 'Every vendor has its own hour now — nothing’s fighting for setup.')
                        : isCoi ? 'Every vendor’s proof is on file — you’re clear to let them on-site.'
                        : 'Every open call is made — each one has an answer now.'}</p>
                      {isConf && cues.length > 0 && (
                        <ul className="ac-tl">
                          {cues.map((c, i) => (
                            <li key={c.id || i} className={i === 0 ? 'lead' : ''}>
                              <span className="ac-t">{fmt12h(c.time)}</span>
                              <span className="ac-l">{c.label}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="ac-bar" aria-hidden="true"><span /></div>
                      <div className="ac-meta">
                        <span className="ac-count">{jc.count} of {jc.count} · {isConf ? 'in sync' : isCoi ? 'on file' : 'decided'}</span>
                        <span className="ac-clear">{isConf ? 'nothing clashing' : isCoi ? 'nothing missing' : 'nothing pending'}</span>
                      </div>
                      <button className="ac-next" onClick={() => setJustCleared(null)}>{nextLabel}<span aria-hidden="true"> ›</span></button>
                    </div>
                  );
                }
                let statusNode = null; let statusOnTrack = false;
                if (!isPast && days !== null && days > 0) {
                  if (queue.some(a => a && a.level === 'critical')) {
                    statusNode = <p className="verdict slipping">Something can’t wait — it’s first on your list.</p>;
                  } else {
                    const slips = [];
                    try {
                      const od = (decisionBoard.open || []).filter(r => r && r.status === 'overdue').length;
                      if (od) slips.push(od === 1 ? 'one decision is past its easy window' : 'a few decisions are past their easy window');
                    } catch { /* board unavailable */ }
                    if (compression && compression.headline) slips.push('time got tight');
                    if (money.planned && money.committed > money.planned) slips.push('spending is past your number');
                    if (slips.length) {
                      statusNode = (
                        // AMBER RESTRAINT (host 2026-07-18): a "mostly on course · worth a look"
                        // NUDGE is not a warning — painting the whole reassuring line amber
                        // over-signals and cries wolf. In elegant, keep it the calm serif guide
                        // voice (the WORDS carry the caution); amber stays reserved for the
                        // genuinely can't-wait (critical) verdict above. Non-elegant unchanged.
                        <p className={'verdict' + (elegantMode ? '' : ' slipping')}>
                          Mostly on course — {slips.slice(0, 2).join(', and ')}. Worth a look today.
                        </p>
                      );
                    } else if (listIsCalm) {
                      statusNode = <p className="verdict">{solemn
                        ? 'Everything’s ready — nothing needs you today.'
                        : (worries.length
                          ? 'All quiet — just the heads-ups below, when you have a minute.'
                          : 'All quiet — you’re genuinely set for now.')}</p>;
                    } else {
                      statusNode = <p className="verdict">{solemn ? 'You’re ready — take it gently.' : 'On track — nothing is slipping.'}</p>;
                      statusOnTrack = true;
                    }
                  }
                }
                const dateLong = event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
                if (askMode) {
                  return (<>
                    <h2 className="ask" key={'ask-' + String(queue[0].id || queue[0].title || '')}>{
                      /* The loud line is the FIRST real ITEM, not the generic bundle verb —
                         the per-item intelligence surfacing where the host looks first.
                         Conflicts → the clash; decisions (bundle OR a lone card) → the actual
                         call to make, framed as a question (parenthetical meta + quotes stripped). */
                      (() => {
                        const q0 = queue[0];
                        // Foundational pick-decision (Ceremony Timing, …) surfaced as a hero — its
                        // own ask ("Choose the timing."), so it stays in the ask flow after roll-to-next.
                        if (elegantMode && /^blocker:/.test(String(q0.id || '')) && q0.ask) return q0.ask;
                        if (elegantMode && /conflict/i.test(String(q0.title || '')) && conflictItems[0]) return conflictItems[0].ask;
                        // COI-collection task → the REAL first step (coiNextAction), not "Your next step."
                        if (elegantMode && (q0.sourceCategory === 'coi' || /collect.*coi|vendor coi/i.test(String(q0.title || '')))) return coiFirst ? coiFirst.title : 'You’re clear on insurance.';
                        if (elegantMode) {
                          const decRow = /^decision:/.test(String(q0.id || ''))
                            ? (decisionBoard.open || []).find(x => x && ('decision:' + x.id) === q0.id)
                            : (/decision/i.test(String(q0.title || '')) ? callsOrdered[0] : null);
                          if (decRow) return String(decRow.label || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/["“”"]/g, '').replace(/\.+$/, '').trim() + '?';
                        }
                        return heroAskFor(q0, event);
                      })()
                    }</h2>
                    <p className="truth">{days === 1 ? '1 day' : days + ' days'}{dateLong ? ' — ' + dateLong : ''}{statusOnTrack ? ' · on track' : ''}</p>
                    {!statusOnTrack && statusNode}
                  </>);
                }
                // MINIMAL CALM POLE (Figma "14 · ELEGANT — the calm pole", host 2026-07-19): the
                // earned quiet is ONE loud line + one guide sentence + a disclosure, not a wall of
                // masthead + mega + verdict + heads-ups. The heads-ups / coming-up live below the
                // fold behind "Look around anyway". Grounded: the on-track count is the real phase
                // ledger; "next check" is the nearest dated thing. Elegant + genuinely-calm only.
                if (elegantMode && listIsCalm && !isPast && days !== null && days > 0) {
                  const cpDone = phaseCues && Number.isFinite(Number(phaseCues.completedCount)) ? Number(phaseCues.completedCount) : (plan.progress && plan.progress.done);
                  const cpTotal = phaseCues && Number(phaseCues.totalCount) ? Number(phaseCues.totalCount) : (plan.progress && plan.progress.total);
                  const nextUp = (upNext && upNext.find(u => u && u.due)) || null;
                  const nextCheck = nextUp ? (() => { try { return new Date(nextUp.due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return null; } })() : null;
                  return (<>
                    <p className="cp-label">ALL QUIET</p>
                    <h2 className="cp-head">You’re ahead.</h2>
                    {statusNode || <p className="verdict">Nothing needs you today. Everything’s in motion.</p>}
                    <button className="cp-look" onClick={() => { try {
                      // The below-fold scrolls the .app container, which silently ignores
                      // scrollTo({behavior:'smooth'}) here — only a direct scrollTop assignment
                      // actually moves it. Try smooth first (harmless where honored), then set
                      // scrollTop directly so the reveal always lands (audit 2026-07-21).
                      const anchor = document.querySelector('.efold, .then-fold') || [...document.querySelectorAll('.sect,.eyebrow,.shelf-label')].find(n => /worth keeping|coming up|where you stand|the rest/i.test(n.textContent || ''));
                      const sc = (anchor && anchor.closest('.app')) || document.querySelector('.app') || document.scrollingElement;
                      if (!sc) return;
                      const target = anchor
                        ? Math.max(0, anchor.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12)
                        : sc.scrollTop + Math.round((sc.clientHeight || 700) * 0.82);
                      try { sc.scrollTo({ top: target, behavior: 'smooth' }); } catch {}
                      sc.scrollTop = target;
                    } catch { /* no target */ } }}>Look around anyway  ›</button>
                    {Number.isFinite(cpDone) && Number.isFinite(cpTotal) && cpTotal > 0 && (
                      <p className="cp-prog">{cpDone} of {cpTotal} on track{nextCheck ? ' · next check ' + nextCheck : ''}</p>
                    )}
                  </>);
                }
                // ELEGANT PAST — Figma 565:60 "Command — post-event · behind you"
                // (screenshot-matched 2026-07-22): green BEHIND YOU eyebrow → the
                // personal statement ("Maya's day, done.") → two-line serif guide →
                // GUESTS / FINAL SPEND recap rows with honest subs ("Final, not a
                // warning.") → Save-what-worked CTA into the After stage → the
                // green Wrapped foot. All values from the same engines the tiles
                // read — nothing invented; "~N came" only when the expectation
                // band exists, hedged exactly as far as the band supports.
                if (elegantMode && isPast && days !== null) {
                  const first = (() => {
                    const h = String(event.honoree || '').trim();
                    if (h) return h.split(/\s+/)[0];
                    const m = /^([A-Z][\w'’]+)(?:\s+[A-Z][\w'’]+)*['’]s\b/.exec(String(event.name || ''));
                    return m ? m[1] : null;
                  })();
                  const agoN = Math.abs(days);
                  const typeWord = String(eventTypeLabel(event) || 'day').toLowerCase();
                  const yesN = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
                  const invitedN = (event.guests || []).length;
                  // DATA HONESTY (host challenge, 2026-07-22): the Figma comp said
                  // "~7 came · a couple more likely walked in" — but attendance was
                  // never OBSERVED; walk-ins are a planning model, and "came" is a
                  // past-tense fact claim. The recap states only what's on file.
                  const over = (money.planned && money.committed > money.planned) ? money.committed - money.planned : 0;
                  const rowL = { fontSize: 'var(--t-pill)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' };
                  const rowV = { fontSize: 26, fontWeight: 750, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' };
                  const rowSub = { margin: '3px 0 0', fontSize: 'var(--t-meta)', color: 'var(--muted)', lineHeight: 1.4 };
                  return (<>
                    <Eyebrow tone="ok" style={{ display: 'block', letterSpacing: '.1em' }}>BEHIND YOU</Eyebrow>
                    <h2 className="ask">{first ? first + '’s day, done.' : 'The day, done.'}</h2>
                    <GuideLine>The {typeWord} happened — {agoN === 1 ? 'yesterday' : agoN + ' days ago'}. Nothing needs you now; here’s how it landed.</GuideLine>
                    <div style={{ marginTop: 26, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <span style={rowL}>Guests</span>
                        <span style={rowV}>{yesN ? yesN + ' said yes' : (guests ? '~' + guests + ' planned' : '—')}</span>
                      </div>
                      <p style={rowSub}>{yesN
                        ? (invitedN ? invitedN + ' invited — turnout itself wasn’t tracked.' : 'turnout itself wasn’t tracked.')
                        : (guests ? 'no list was kept — this was the planning number.' : 'no list was kept.')}</p>
                    </div>
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <span style={rowL}>Final spend</span>
                        <span style={rowV}>{money.committed ? fmt(money.committed) : '—'}</span>
                      </div>
                      <p style={rowSub}>{money.planned
                        ? (over > 0
                          ? 'Landed ' + fmt(over) + ' over the ' + fmt(money.planned) + ' you planned. Final, not a warning.'
                          : 'Landed inside the ' + fmt(money.planned) + ' you planned.')
                        : (money.committed ? fmt(money.committed) + ' all told.' : 'no budget was tracked.')}</p>
                    </div>
                    <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'nowrap' }}>
                      <button className="cta stay" style={{ flex: '0 0 auto', width: 'auto', whiteSpace: 'nowrap', minHeight: 0, padding: '12px 18px', fontSize: 'var(--t-body-s)' }}
                        onClick={() => setStage('after')}>Save what worked</button>
                      <span style={{ fontSize: 'var(--t-meta)', color: 'var(--muted)', textAlign: 'right', flex: '1 1 auto', minWidth: 0, lineHeight: 1.35 }}>so your next one starts&nbsp;ahead.</span>
                    </div>
                    <div style={{ marginTop: 30, borderTop: '1px solid var(--ok)', paddingTop: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--ok)', fontWeight: 650, fontSize: 'var(--t-meta)' }}>Wrapped</span>
                      <span style={{ color: 'var(--muted)', fontSize: 'var(--t-meta)' }}>{dateLong || ''}</span>
                    </div>
                  </>);
                }
                return (<>
                  <div className="mega">
                    {days === null ? 'No date' : days === 0 ? 'Today' : days < 0 ? `${daysAnim}d ago` : days === 1 ? `${daysAnim} day` : `${daysAnim} days`}
                  </div>
                  <p className="mega-sub">
                    {(dstat.status === 'today' || dstat.status === 'tomorrow') && dstat.reason}
                    {/* Past says it ONCE — the "How it landed · behind you" header carries it;
                        this sub and the empty-state used to re-say it (audit 2026-07-22, W7). */}
                    {!isPast && days !== null && days > 1 && `until ${dateLong}`}
                  </p>
                  {statusNode}
                </>);
              })()}{beat && <p className="verdict beat">{beat}</p>}</div>
              {/* START HERE retired (host request 2026-07-16): naming the #1 action MOVED to
                  the always-on .next-bar pinned at the frame bottom — one persistent, thumb-
                  reachable primary CTA that names the next thing, instead of a quiet hero row
                  that scrolls away plus a counting bar. */}
              {/* ctx continuity (PC-1): what the plan RECOGNIZED — shown only
                  for compound events where the understanding isn't obvious. */}
              {!askMode && ctx && ctx.compound && ctx.reasoning && !(elegantMode && listIsCalm && !isPast && days !== null && days > 0) && (
                <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--steel-soft)' }}>
                  Planning this as {String(ctx.reasoning).toLowerCase().replace(/\.$/, '')}.
                </p>
              )}
              {returnLine && (elegantMode ? (() => {
                // A · QUIET "SINCE LAST LOGIN" LINE (host "build A", 2026-07-18): ONE muted
                // line with a breathing done-dot — the momentum reward ("N moved forward"),
                // the part no always-on tile can tell you. Falls back to the narration when
                // there's no delta yet. Stays quiet: never a second loud thing, gone next
                // render. Real returnLine data (deriveReturnNarration), invents nothing.
                const hasDelta = returnLine.readyNow && returnLine.readyDelta > 0;
                const text = hasDelta
                  ? `${returnLine.readyDelta} more handled since you were here · ${returnLine.readyNow.done} of ${returnLine.readyNow.total} now`
                  : returnLine.line;
                if (!text) return null;
                return (
                  <button className="returnbeat" onClick={() => { if (returnLine.route) routeSheet(returnLine.route); setReturnLine(null); }}>
                    <span className="rb-dot" aria-hidden="true" />
                    <span className="rb-t">{text}</span>
                    {returnLine.route ? <span className="rb-chev" aria-hidden="true">›</span> : null}
                  </button>
                );
              })() : (
                <button className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: 'none', cursor: returnLine.route ? 'pointer' : 'default', padding: '2px 0 0', font: 'inherit', display: 'block' }}
                  onClick={() => { if (returnLine.route) routeSheet(returnLine.route); setReturnLine(null); }}>
                  <span className="t" style={{ display: 'block', color: 'var(--steel-soft)', fontWeight: 550, fontSize: 'var(--t-row-sub)' }}>{returnLine.line}
                    {returnLine.route ? <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span> : null}
                  </span>
                  {returnLine.readyNow && returnLine.readyDelta > 0 && (
                    <span className="t" style={{ display: 'block', marginTop: 2, color: 'var(--ink-soft)', fontWeight: 600, fontSize: 'var(--t-row-sub)' }}>
                      {returnLine.readyDelta} more handled since you were last here — {returnLine.readyNow.done} of {returnLine.readyNow.total} now.
                    </span>
                  )}
                </button>
              ))}

              {/* Rebalance: in askMode the hero display IS the section voice — the
                  header would be a second telling. The anchor stays for the bar. */}
              {(askMode || (elegantMode && listIsCalm && !isPast && days !== null && days > 0))
                ? <div id="actionsAnchor" aria-hidden="true" />
                : isPast
                  ? (elegantMode
                      ? <div id="actionsAnchor" aria-hidden="true" />
                      : <div className="sect" id="actionsAnchor"><h2>How it landed</h2><div className="rule" /><span className="when">behind you</span></div>)
                  : <div className="sect" id="actionsAnchor"><h2>What needs you</h2><div className="rule" /><span className="when">in order</span></div>}
              {plan && plan.planningState && plan.planningState.reasoning && (() => {
                // Re-audit 2026-07-17 (P0, "one hero instruction"): the milestone
                // sentence ("Milestone: X — then Y.") was a THIRD "what's next" voice
                // above the ordered queue cards (which already number the sequence) and
                // could even name a different item than queue[0]. Dropped. Only the
                // non-redundant reasoning ("why now") stays.
                const firstCard = queue[0];
                const reasoning = plan.planningState.reasoning || '';
                const redundant = firstCard && reasoning && (
                  (firstCard.consequence && firstCard.consequence.slice(0, 24) === reasoning.slice(0, 24)) ||
                  (firstCard.title && reasoning.toLowerCase().includes(String(firstCard.title).toLowerCase().replace(/\.$/, '')))
                );
                if (redundant) return null;
                // When the lead is a decision, its decopt options + "our pick" why carry the
                // reasoning — the generic planningState.reasoning (often vendor-status copy like
                // "Currently quoted…") would bleed onto it. Suppress it for decision heroes.
                if (elegantMode && decisionFor(firstCard)) return null;
                // Calm state has no "first" to reason about — a leftover reasoning line
                // (often vendor copy like "Currently quoted…") contradicts "nothing needs you".
                if (elegantMode && (listIsCalm || !firstCard)) return null;
                return (
                  <p className="grounding" style={{ margin: '-8px 0 14px' }}>{reasoning}</p>
                );
              })()}

              {queue.length === 0 && !(elegantMode && listIsCalm && !isPast && days !== null && days > 0) && !(elegantMode && isPast) && (
                <div className="empty">{isPast
                  ? 'The recap is below.'
                  : worries.length
                  ? 'Nothing needs you right now — just the heads-ups below.'
                  : 'Nothing needs you right now — the basics are all settled.'}</div>
              )}


              {(() => {
                const shown = queue.filter(show);
                // BOARD RULING (wave 6): cap the visible queue at 6 cards; the
                // rest sit behind a quiet "+N more" expander at the end. Ranks
                // number straight through — a bundle is ONE rank.
                const QUEUE_CAP = 6;
                // OVERWHELM PACES THE HOME QUEUE (review board 2026-07-17 — the ONE
                // change all three lenses approved, the adversary included). The engine
                // already sizes an underwater host's first foreground (focusCount, staged);
                // home was the last surface still overriding it upward to a flat 6.
                //
                // This is a PARAMETER CHANGE to a shipped, proven, one-tap expander — not a
                // new hide. Guardrails, all load-bearing:
                //  • overwhelm (not runway) is the gate. runway collapses "no date" /
                //    "event was yesterday" / "event was in October" into one 'unknown' that
                //    then behaves as 'standard' — reading THAT to hide would be inventing a
                //    fact ("unknown means unknown"). overwhelm structurally requires a known,
                //    non-relaxed runway, so gating on it can never fire on a bad date.
                //  • THE CAP YIELDS TO SAFETY, NEVER THE ROWS. It can never fall below the
                //    count of critical / past-due cards. The app already refuses to let the
                //    HOST snooze a critical; the engine gets strictly less authority, never
                //    more.
                //  • Deferral, never suppression — the "+N more" expander below already
                //    states the true number and is one tap.
                //  • Order is untouched: the cap sits downstream of the sort, so safety and
                //    overdue keep leading. The engine forbids overwhelm from re-ordering and
                //    so does this.
                const queueFocus = (() => {
                  const ha = decisionBoard.hostAdaptation;
                  if (!ha || !ha.overwhelm || !ha.staged) return null;
                  const n = Number(ha.focusCount);
                  if (!Number.isFinite(n) || n <= 0) return null;
                  // A bundle carries no dueInDays and folds several real things under one
                  // rank, so it counts as must-see too rather than risk burying a deadline.
                  const mustSee = shown.filter(a => a && (a.level === 'critical' || a.kind === 'bundle'
                    || (a.dueInDays != null && Number(a.dueInDays) < 0))).length;
                  const cap = Math.max(n, mustSee);
                  return cap < shown.length ? cap : null;
                })();
                const queueCap = queueFocus != null ? queueFocus : QUEUE_CAP;
                const queueFolded = queueFocus != null && !queueOpen;
                const visible = queueOpen ? shown : shown.slice(0, queueCap);
                const hiddenCount = shown.length - visible.length;
                // Time-to-window, worn quietly on the card (engine contract:
                // actions MAY carry dueInDays; absent = say nothing).
                // AMBER RESTRAINT (host 2026-07-18): in the elegant loop the due chip — including
                // "past its window" (overdue) — is amber, the single urgency accent (.of default).
                const dueChip = (a) => (a && a.dueInDays != null && Number.isFinite(Number(a.dueInDays))) ? (
                  <span className="of" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {a.dueInDays < 0 ? 'past its window' : a.dueInDays === 0 ? 'due today' : a.dueInDays === 1 ? 'due tomorrow' : 'due in ' + a.dueInDays + ' days'}
                  </span>
                ) : null;
                return (<>
              {/* Name the state — but ONLY when the board on screen IS actually paced.
                  Gated on queueFolded, which is the same predicate that computed
                  `visible`, so the words and the list cannot drift apart. (They did
                  once: a line promised "just the first few" over an unsliced list and
                  shipped that way.) A shorter list with no reason reads as a bug; a
                  shorter list with a reason reads as being taken care of. */}
              {queueFolded && !askMode && (
                <p className="grounding" style={{ margin: '0 0 var(--sp-2)', color: 'var(--muted)' }}>
                  That’s a lot with the clock ticking — just the first few here, the rest is a tap away when you’re ready.
                </p>
              )}
              {/* When a bundle just cleared, the payoff OWNS the hero — suppress the queue
                  cards so the next bundle's card doesn't stack under the "All …" moment. */}
              {!(elegantMode && justCleared) && visible.map((a, i) => {
                const key = String(a.id || i);
                // A foundational pick-decision only ever renders as the HERO destination (i===0,
                // via decHeroActions). Below the fold it would be a dead card (no inline options),
                // so skip it there — it surfaces as the hero once the items ahead of it clear.
                if (elegantMode && i > 0 && /^blocker:/.test(String(a.id || ''))) return null;
                // BUNDLE (wave-6 engine contract: {kind:'bundle', title, count,
                // items, route}): ONE card, one rank. Expands in place to child
                // rows, each with its own Go — the same card anatomy as every
                // other queue card (UX_05), no new component vocabulary.
                if (a.kind === 'bundle') {
                  // A SECOND bundle behind the hero (e.g. "Resolve 9 decisions" under the
                  // conflict hero) is a position-2 item — it drops BELOW THE FOLD (host
                  // 2026-07-18) so the first screen holds ONE thing. Skipped here, rendered
                  // as a path-row in the then-fold. (This must sit ABOVE the bundle render,
                  // which otherwise returns the compact card in the first screen.)
                  if (elegantMode && askMode && i > 0 && a.level !== 'critical') return null;
                  const kids = Array.isArray(a.items) ? a.items : [];
                  const count = a.count != null ? a.count : kids.length;
                  const open = !!bundleOpen[key];
                  // ── GROUNDED CONFLICT LOOP (the mapper wired in) ──────────────
                  // A vendor-conflict bundle as the elegant hero does NOT gate behind
                  // "See all N". It surfaces the FIRST real conflict itself: the loud
                  // ask (hzone above), the specific situation, the two real ways to
                  // clear it, and the grounded why. The intelligence the engine used
                  // to only COUNT, now faced one at a time. Slice 1 hands the host to
                  // the affected vendor to apply the fix — an in-place one-tap resolve
                  // waits on conflicts.js emitting a structured proposedFix (phase 2).
                  if (elegantMode && askMode && i === 0 && /conflict/i.test(String(a.title || '')) && conflictItems[0]) {
                    const it = conflictItems[0];
                    const res = it.resolution || {};
                    // DECLUTTERED (host 2026-07-18): tight one-line situation (detailShort),
                    // the impact tucked behind a "why?" tap, the fixes as COMPACT ROWS (no
                    // faked "our fix" — the recommendedAction is a genuine either/or), and a
                    // "Set a different time" row that opens an inline picker for ANY arrival
                    // time (res.custom). All resolve in place → writeVendor → receipt → next.
                    const inPlace = res.inPlace && Array.isArray(res.options) && res.options.length === 2 && res.options.every(o => o && (o.apply || o.event || o.route));
                    const custom = inPlace && res.custom && res.custom.kind === 'time' ? res.custom : null;
                    const vend = (event.vendors || []).find(v => v && v.id === it.affectedVendorId);
                    const vendName = vend ? (vend.name || '').trim() : '';
                    const goFix = () => { setBundleOpen(m => ({ ...m, [key]: false })); routeSheet({ tab: 'Vendors', vendorId: it.affectedVendorId }); };
                    const applyFix = (o) => {
                      if (!o) return;
                      const msg = o.receipt || 'Done — the clash is cleared.';
                      // A vendor-field fix writes through writeVendor; a budget (or other
                      // event) fix writes through patchEvent — both funnel to the same
                      // in-place receipt + undo. A `route` option (a genuine upload/nav)
                      // routes to the right row — the only non-in-place branch.
                      if (o.route) { routeSheet(o.route); return; }
                      if (o.apply && it.affectedVendorId) writeVendor(it.affectedVendorId, o.apply, msg);
                      else if (o.event) patchEvent(o.event, msg);
                    };
                    // minimal 12h/24h converters (input type=time is 24h; the seed stores "10:00 AM")
                    const cParse = (s) => { const m = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(String(s || '')); if (!m) return null; let h = +m[1]; const mm = +m[2]; const ap = (m[3] || '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; return h * 60 + mm; };
                    const to24 = (s) => { const t = cParse(s); return t == null ? '' : String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
                    const to12 = (s) => { const t = cParse(s); if (t == null) return s; let h = Math.floor(t / 60); const mm = t % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(mm).padStart(2, '0') + ' ' + ap; };
                    const applyCustomTime = (val) => { if (!val || !custom || !it.affectedVendorId) return; const disp = to12(val); writeVendor(it.affectedVendorId, { [custom.field]: disp }, `${vendName || 'They'} now arrive at ${disp}.`); setConflictTime(null); };
                    return (
                      <article className={'card hero-card bundle-hero conflict-hero' + (heroReceipt ? ' receipted' : '')} id={'card-' + key} key={key}
                        style={{ animation: 'askin 240ms var(--ease-out) 60ms both' }}>
                        <div className="card-head">
                          {(it.detailShort || it.detail) && <p className="because">{it.detailShort || it.detail}</p>}
                          {/* why back to a visible line under the situation (host 2026-07-18) */}
                          {it.why && <p className="grounding" style={{ margin: '6px 0 0', opacity: .8 }}>{it.why}</p>}
                          {inPlace ? (
                            <div className="conf-fixes">
                              {res.options.map((o, oi) => (
                                <button key={oi} className="confrow" onClick={() => applyFix(o)}><span className="t">{o.label}</span>{o.route ? <span className="g" aria-hidden="true">→</span> : null}</button>
                              ))}
                              {custom && (conflictTime == null ? (
                                <button className="confrow" onClick={() => setConflictTime(custom.suggest ? to24(custom.suggest) : '')}><span className="t">{custom.label || 'Set a different time'}</span><span className="g" aria-hidden="true">›</span></button>
                              ) : (
                                <div className="confrow confrow-open">
                                  <span className="t" style={{ flex: '1 0 100%' }}>{custom.label || 'Set a different time'}</span>
                                  <div className="actions-row" style={{ width: '100%', alignItems: 'center', gap: 9, marginTop: 8 }}>
                                    <span className="of">arrives</span>
                                    <input className="field" type="time" value={conflictTime} onChange={e => setConflictTime(e.target.value)} style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} aria-label="Arrival time" />
                                    <button className="mini" disabled={!conflictTime} style={!conflictTime ? { opacity: .45 } : undefined} onClick={() => applyCustomTime(conflictTime)}>Set it</button>
                                    <button className="mini" onClick={() => setConflictTime(null)}>never mind</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                          <div className="actions-row" style={{ alignItems: 'center', marginTop: 'var(--sp-2)' }}>
                            <button className="cta" onClick={goFix}>{vendName ? ('Take me to ' + vendName) : 'Take me to the fix'}</button>
                          </div>
                          )}
                          {heroReceipt && (
                            <div className="receipt">
                              <span className="rdot" aria-hidden="true" />
                              <span className="rmsg">{heroReceipt.msg}</span>
                              <button className="mini" onClick={() => { const f = heroReceipt && heroReceipt.fn; setHeroReceipt(null); try { if (f) f(); } catch { /* undo failed */ } }}>Undo</button>
                            </div>
                          )}
                          {conflictItems.length > 1 && (
                            /* The escape hatch is SECONDARY to the fix — it recedes (more air
                               above, faint + light + small) so it doesn't compete with the
                               actions for attention (host 2026-07-18). */
                            <button className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 0 2px' }}
                              onClick={() => setBundleOpen(m => ({ ...m, [key]: !open }))} aria-expanded={open}>
                              <span className="t" style={{ color: 'var(--faint)', fontWeight: 450, fontSize: '12.5px' }}>{open ? 'Fold them away' : ('See all ' + count + '  ›')}</span>
                            </button>
                          )}
                          {open && kids.map((c, ci) => renderBundleKid(c, String((c && c.id) || key + ':' + ci)))}
                        </div>
                      </article>
                    );
                  }
                  // ── GROUNDED DECISION LOOP (the mapper's generalizer) ─────────
                  // A decisions bundle as the elegant hero surfaces the FIRST real
                  // call to make — the situation, the engine's PROPOSED answer with a
                  // one-tap "sounds good" (propose-don't-ask), or the real options when
                  // there's no defensible default — resolved in place (settleDecision →
                  // receipt → the board re-derives → the next decision rises). The
                  // proposal + why + accept path already exist in the decisions sheet;
                  // this brings them to the hero instead of gating behind "See all N".
                  if (elegantMode && askMode && i === 0 && /decision/i.test(String(a.title || '')) && callsOrdered[0]) {
                    const dec = callsOrdered[0];
                    return (
                      <article className={'card hero-card bundle-hero decision-hero' + (heroReceipt ? ' receipted' : '')} id={'card-' + key} key={key}
                        style={{ animation: 'askin 240ms var(--ease-out) 60ms both' }}>
                        <div className="card-head">
                          {dec.because && <p className="because">{dec.because}</p>}
                          {renderDecisionActions(dec) || (
                            <div className="actions-row" style={{ alignItems: 'center', marginTop: 'var(--sp-2)' }}>
                              <button className="cta" onClick={() => { if (!(dec.route && routeSheet(dec.route))) setSheet({ kind: 'decisions', focus: dec.id }); }}>Take me to it</button>
                            </div>
                          )}
                          {heroReceipt && (
                            <div className="receipt">
                              <span className="rdot" aria-hidden="true" />
                              <span className="rmsg">{heroReceipt.msg}</span>
                              <button className="mini" onClick={() => { const f = heroReceipt && heroReceipt.fn; setHeroReceipt(null); try { if (f) f(); } catch { /* undo failed */ } }}>Undo</button>
                            </div>
                          )}
                          {(a.count != null ? a.count : kids.length) > 1 && (
                            <button className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 0 2px' }}
                              onClick={() => setBundleOpen(m => ({ ...m, [key]: !open }))} aria-expanded={open}>
                              <span className="t" style={{ color: 'var(--faint)', fontWeight: 450, fontSize: '12.5px' }}>{open ? 'Fold them away' : ('See all ' + (a.count != null ? a.count : kids.length) + '  ›')}</span>
                            </button>
                          )}
                          {open && kids.map((c, ci) => renderBundleKid(c, String((c && c.id) || key + ':' + ci)))}
                        </div>
                      </article>
                    );
                  }
                  return (
                    <article className={'card' + (spot === key ? ' spot' : '') + (askMode && i === 0 ? ' hero-card bundle-hero' : '')} id={'card-' + key} key={key}
                      style={spot === key ? undefined : { animation: `cardin 340ms var(--ease-out) ${Math.min(i, 6) * 45}ms both` }}>
                      {!(askMode && i === 0) && <span className="idx">{i + 1}</span>}
                      <div className="card-head">
                        <div className="card-top">
                          <span className={'tag-lens ' + (DOMAIN_LENS[a.domain] || 'Plan').toLowerCase()}>{DOMAIN_LENS[a.domain] || 'Plan'}</span>
                          {dueChip(a)}
                        </div>
                        <h3>{String(a.title || '').replace(/\s*—\s*they'?re past their easy window$/i, '')}</h3>
                        {a.consequence && <p className="because">{isHero ? (String(a.consequence).replace(/\s*—\s*\d+ of \d+ are already handled\./, '.').match(/^[^.!?]{10,}?[.!?]/) || [String(a.consequence)])[0] : a.consequence}</p>}
                        <div className="actions-row" style={{ alignItems: 'center' }}>
                          <button className="cta" onClick={() => setBundleOpen(m => ({ ...m, [key]: !open }))} aria-expanded={open}>
                            {open ? 'Fold them away' : (
                              /* Elegant hero (F13): the CTA names the ACTION, not "See all N".
                                 Use the bundle's own authored action phrase — verb + count +
                                 noun, e.g. "Untangle 7 conflicts" / "Resolve 3 decisions" —
                                 falling back to the count when the title doesn't parse. */
                              (elegantMode && askMode && i === 0)
                                ? ((String(a.title || '').match(/^(\S+\s+\d+\s+\S+)/) || [null, 'See all ' + count])[1])
                                : 'See all ' + count
                            )}
                          </button>

                        </div>
                        {open && kids.map((c, ci) => renderBundleKid(c, String((c && c.id) || key + ':' + ci)))}
                      </div>
                    </article>
                  );
                }
                // REBALANCE: in askMode, positions 2+ render as THEN-ROWS — the
                // path whispers: one line each, truncated, tap to route. Criticals
                // and bundles keep full card form (never whisper a critical), and
                // "+N — show the rest" expands to full cards for managing (snooze
                // and pick-a-day live there).
                if (nearDayPlan && i > 0 && !queueOpen && a.kind !== 'bundle' && a.level !== 'critical') return null;
                // ELEGANT (host "push THEN rows below fold"): positions 2+ are the PATH, not
                // the one thing — they fold into the see-all so the wired hero stays as short
                // as the bundle hero and the ask centers. Rendered below the escreen instead.
                // A SECOND bundle (e.g. "Resolve 9 decisions" behind the conflict hero) is a
                // position-2 item too — it also drops below the fold (host 2026-07-18), so the
                // first screen holds ONE thing, not two stacked bundles.
                if (elegantMode && askMode && i > 0 && a.level !== 'critical') return null;
                if (askMode && i > 0 && !queueOpen && a.kind !== 'bundle' && a.level !== 'critical') {
                  return (
                    <button key={key} id={'card-' + key} className="path-row" onClick={() => onCta(a, key)}>
                      <span className="then">then</span>
                      <span className="t">{String(a.title || '').replace(/\.+$/, '')}</span>
                      {dueChip(a)}
                    </button>
                  );
                }
                const wired = wiredKind(a);
                // SNOOZE — set it down without losing it. The grounded proposal
                // (lib/snooze.js: half the remaining runway, never past the item's
                // own lead window) stays the one-tap DEFAULT. "pick a day" is the
                // quiet second path (host-approved 2026-07-15): a raw date input
                // whose bounds AND write both run through clampSnoozeUntil, so a
                // picked day can never land past the window — the clock still owns
                // the bounds, the host owns the day. NEVER for a critical.
                const snoozeProposed = canSnooze(a)
                  ? (() => { try { return proposedSnoozeUntil(event, { leadDays: a.leadDays }); } catch (_e) { return null; } })()
                  : null;
                const fmtBack = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const snoozeTo = (iso, msg) => { setSnoozePick(null); patchEvent({ snoozed: { ...(event.snoozed || {}), [a.id]: iso } }, msg); };
                // The honest picking window, asked of the SAME clamp that writes:
                // clamp(tomorrow) is the earliest allowed day, clamp(far future) is
                // the latest. If either comes back null there is no valid custom
                // day at all and the affordance simply doesn't render.
                let snoozePickMin = null, snoozePickMax = null;
                if (snoozeProposed) {
                  const t0 = new Date(); t0.setHours(0, 0, 0, 0); t0.setDate(t0.getDate() + 1);
                  const tomorrowIso = `${t0.getFullYear()}-${String(t0.getMonth() + 1).padStart(2, '0')}-${String(t0.getDate()).padStart(2, '0')}`;
                  try {
                    snoozePickMin = clampSnoozeUntil(event, tomorrowIso, { leadDays: a.leadDays });
                    snoozePickMax = clampSnoozeUntil(event, '9999-12-31', { leadDays: a.leadDays });
                  } catch (_e) { snoozePickMin = null; snoozePickMax = null; }
                }
                const pickingDay = !!(snoozePickMin && snoozePickMax && snoozePick && snoozePick.key === key);
                // 'Decisions' and 'Event Day Schedule' now have real routeSheet branches, so
                // they must stop wearing the honest "in the app" tag — the tag exists to warn
                // a host that a CTA does not land HERE, and these now do. ('Communication'
                // stays off the list: V2 has no messages surface, so its tag is still true.)
                const lands = wired || (a.route && ['Vendors', 'Budget', 'Guests', 'Planning', 'Planning Tasks', 'Timeline', 'Decisions', 'Event Day Schedule', 'Risks'].includes(a.route.tab));
                // REBALANCE (dedup): the hero panel — the ask above owns the VERB;
                // the panel names the NOUN (record) only when it adds information.
                const isHero = askMode && i === 0;
                const heroAsk0 = isHero ? heroAskFor(a, event) : null;
                const rec = isHero ? heroRecord(a, heroAsk0) : null;
                // SINGLE DECISION IN PLACE (host "replace take-me-to-it with action",
                // 2026-07-18): once decisions thin out they stop bundling and a lone one
                // becomes its own hero card — which used to route ("Take me to it"). Resolve
                // it RIGHT HERE via the same shared renderDecisionActions (options / proposed
                // default → settleDecision → receipt → next). Only in the elegant hero, only
                // when the decision actually has authored options (else keep its route).
                // UNIFIED: every decision-like hero action (playbook decision:* OR a phase
                // decision like phase:food) resolves through the one dispatcher + renderer,
                // so all of them get the decopt / "our pick" treatment — no more chip-vs-row split.
                const decHeroActions = (elegantMode && isHero) ? (() => {
                  const nd = decisionFor(a);
                  if (!nd) return null;
                  // Roll to next when satisfied: settling drops this action from the hero queue,
                  // so the hero advances even if its phase (food, etc.) still has other parts.
                  return renderDecision({ ...nd, settle: (v) => { nd.settle(v); setSatisfiedIds(ids => ids.includes(a.id) ? ids : [...ids, a.id]); } });
                })() : null;
                // GROUNDED COI STEP (host "Decide CTA should be the action" + "past its window
                // AND overdue?", 2026-07-18): the COI-collection task shows the REAL first step
                // from coiNextAction — its consequence + a route to that exact vendor — so the
                // hero stops saying a redundant "past its window / overdue" over a blank "Decide".
                // DOCTRINE (host, 2026-07-22): classification rides the ACTION —
                // a.sourceCategory === 'coi', declared by coiNextAction and carried by
                // every COI emitter. Title-prose sniffing broke on the fifth title
                // shape; the narrow regex stays ONLY for legacy checklist-task rows
                // ("Collect COIs…") which carry no sourceCategory.
                const isCoiTask = elegantMode && isHero && !decHeroActions && (a.sourceCategory === 'coi' || /collect.*coi|vendor coi/i.test(String(a.title || '')));
                const coiHero = (isCoiTask && coiFirst) ? coiFirst : null;
                // Every vendor's COI is handled but the solver task still lingers open — don't
                // fall back to the ugly generic "Overdue · Decide". Show the calm done state.
                const coiTaskDone = isCoiTask && !coiFirst;
                // Budget hero: the action panel (budgetEditorBlock) always carries its own
                // grounded reasoning in every state, so the ask's `consequence` subhead just
                // repeats it. Suppress the subhead here so the hero reads like Figma 344:61's
                // single-explanation card (host 2026-07-19). Hero only — below-fold unaffected.
                const heroBudgetAsk = isHero && (String(a.domain || '').toLowerCase() === 'budget' || /^set your budget/i.test(String(a.title || '').trim()));
                // Food/menu decision (editor path): the decopt rows below carry per-option notes +
                // our-pick, so the generic "N of M already handled" consequence AND the redundant
                // "What you're serving · N open" record both just compete. Suppress them so the ask
                // reads like Figma 369:60 (title → rows). Hero only (2026-07-20).
                const heroDecisionAsk = isHero && (String(a.domain || '').toLowerCase() === 'food' || /serving|decide the menu|the menu\b|the spread/i.test(String(a.title || '')));
                return (
                  <article className={'card' + (spot === key ? ' spot' : '') + (isHero ? ' hero-card' + (heroReceipt ? ' receipted' : '') : '')} id={'card-' + key} key={key}
                    style={spot === key ? undefined : { animation: isHero ? 'askin 240ms var(--ease-out) 60ms both' : `cardin 340ms var(--ease-out) ${Math.min(i, 6) * 45}ms both` }}>
                    {!isHero && <span className="idx">{i + 1}</span>}
                    <div className="card-head">
                      <div className="card-top">
                        {!isHero && <span className={'tag-lens ' + (DOMAIN_LENS[a.domain] || 'Plan').toLowerCase()}>{DOMAIN_LENS[a.domain] || 'Plan'}</span>}
                        {!lands && !coiHero && !coiTaskDone && !decHeroActions && <span className="tag plan">in the full app</span>}
                        {!coiHero && !coiTaskDone && dueChip(a)}
                      </div>
                      {isHero ? ((rec && !coiHero && !coiTaskDone && !heroDecisionAsk) ? <h3>{rec}</h3> : null) : <h3>{String(a.title || '').replace(/\s*—\s*they'?re past their easy window$/i, '')}</h3>}
                      {coiTaskDone
                        ? <p className="because">Every vendor's proof is on file — you're clear here.</p>
                        /* When the hero renders a decision (decopt), suppress the action's own
                           consequence line — otherwise vendor-status copy ("Currently quoted…")
                           bleeds onto a menu decision. The decision's options carry the meaning. */
                        : (!decHeroActions && !heroBudgetAsk && !heroDecisionAsk && (coiHero ? coiHero.consequence : a.consequence) && <p className="because">{coiHero ? coiHero.consequence : ((askMode && i === 0) ? (String(a.consequence).match(/^[^.!?]{10,}?[.!?]/) || [String(a.consequence)])[0] : a.consequence)}</p>)}
                      {/* WHY THIS ONE IS FIRST (host, 2026-07-14). The list is ordered and has
                          been for a while, and it never once said WHY — the host was handed a
                          ranking and asked to trust it. Every line below is true of the item's
                          own data (its severity, or the domain everything else sizes off), not
                          a flourish: if we cannot say something true about why it leads, we say
                          nothing. Only ever on the first card. */}
                      {i === 0 && !askMode && (() => {
                        // Recognize the item by WHAT IT IS, not which engine labeled it. Keying
                        // purely on `a.domain` meant the common case — the reactive top action,
                        // whose domain is its CATEGORY ('operational'), not 'food' — never
                        // matched, so the line that explains the ranking almost never showed. The
                        // title says what it is ("Decide what you're serving" is food) as
                        // reliably as any domain, and the same normalization the dedup uses reads
                        // it. Still only ever a TRUE sentence: no match, no line.
                        const title = String(a.title || '').toLowerCase();
                        const is = (dom, re) => a.domain === dom || re.test(title);
                        const why = a.level === 'critical'
                          ? 'This is first because it can’t wait — everything else can.'
                          : is('date', /set the date|the event date/) ? 'This is first because every deadline in the plan counts back from it.'
                          : is('guests', /guest (list|count)|add your guests|headcount/) ? 'This is first because the food, the seats and the budget all size off the headcount.'
                          : is('budget', /budget|spending plan/) ? 'This is first because every estimate below is guessing until it has a number to work against.'
                          : is('food', /serving|the food|menu|the spread/) ? 'This is first because the shopping list and the crab order both wait on it.'
                          : is('starttime', /start time/) ? 'This is first because the day has an order but no clock until you set it.'
                          : is('venue', /the location|the venue|where is the event/) ? 'This is first because vendors, weather and the timeline all hang off where it is.'
                          : null;
                        return why ? <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', opacity: .85 }}>{why}</p> : null;
                      })()}
                      {(editor === key || (isHero && !!wired && !decHeroActions)) && <div className="editor-slot">{renderEditor(a)}</div>}
                      {decHeroActions}
                      <div className="actions-row" style={{ alignItems: 'center' }}>
                        {/* COI: the hero IS the action — RESOLVE IN PLACE, no "Take me to" (host
                            2026-07-18). MORE than one option (host "more options than mark checked"):
                            the real branches for the vendor's actual COI state — the recommended
                            resolve (emphasized) + the honest alternatives (missing/fix, chase, waive,
                            skip). In-place branches → writeVendor → receipt → next COI step rises;
                            the inherently-look/ask ones route. Grounded in getVendorCOIState. */}
                        {coiHero && (() => {
                          const v = coiHero.vendor;
                          const vn = String(v.name || '').trim() || 'the vendor';
                          const status = (() => { try { const s = getVendorCOIState(v, event); return s ? s.status : 'required'; } catch { return 'required'; } })();
                          const ip = (label, patch, receipt) => ({ label, patch, receipt });
                          const rt = (label, glyph) => ({ label, glyph, route: { tab: 'Vendors', vendorId: v.id, vendorSection: 'coi' } });
                          const branches = status === 'received' ? [
                            ip('It names the venue & covers the date — cleared', { coiVerified: true }, `${vn}'s insurance checks out — they're cleared.`),
                            ip("It's missing the venue or dates — ask for a fix", { coiStatus: 'requested', coiVerified: false }, `Asked ${vn} for a corrected certificate.`),
                            rt('Open the certificate they sent', '↗'),
                          ] : status === 'requested' ? [
                            ip('Their proof just came in — mark it received', { coiStatus: 'received' }, `${vn}'s proof is in — next, check it names your venue.`),
                            rt('Chase them again — open the vendor', '→'),
                            ip("They can't provide one — note it & move on", { coiWaived: true }, `Noted — ${vn} isn't sending proof of insurance. It'll stop nagging you.`),
                          ] : status === 'expired' ? [
                            ip('Ask for current proof — mark requested', { coiStatus: 'requested', coiVerified: false }, `Asked ${vn} for current proof.`),
                            ip("It's actually current — mark valid", { coiVerified: true }, `${vn}'s coverage marked valid.`),
                          ] : [
                            ip('Send the ask — mark it requested', { coiStatus: 'requested' }, `Asked ${vn} for proof of insurance — noted.`),
                            ip('Not needed for this vendor — skip it', { coiWaived: true }, `Noted — ${vn} doesn't need proof of insurance.`),
                            // Was a route to THIS vendor's documents — a label/target mismatch
                            // (copy names the venue; there's no venue surface). Now in place:
                            // hold it undecided + carry the guidance in the receipt (audit 2026-07-21).
                            ip("Not sure it's needed — I'll check with the venue", { coiStatus: 'required' }, `Noted — check whether your venue requires proof of insurance from ${vn}. It'll wait.`),
                          ];
                          const doB = (b) => { if (b.route) routeSheet(b.route); else if (b.patch) writeVendor(v.id, b.patch, b.receipt); };
                          return (
                            <div className="decopts">
                              {branches.map((b, bi) => (
                                <button key={bi} className={'decopt' + (bi === 0 ? ' pick' : '')} onClick={() => doB(b)}>
                                  <span className="decopt-main"><span className="decopt-name">{b.label}</span></span>
                                  {/* Arrow only on the rt() branches that open the vendor's documents;
                                      ip() branches settle the COI step in place — no false nav. */}
                                  <span className="decopt-right">{b.route ? <span className="decopt-arrow" aria-hidden="true">{b.glyph || '→'}</span> : null}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                        {a.cta && !(isHero && wired) && !decHeroActions && !coiHero && !coiTaskDone && (() => {
                          // In-place settles wear `.stay` (glyph doctrine: no arrow on a
                          // non-navigating CTA) — which also makes them visible to the
                          // Layer-2 loop-advance probe (2026-07-22).
                          const isSettle = isVendorConfirmAction(a) || /^send payment to/i.test(String(a.title || ''));
                          return <button className={'cta' + (isSettle ? ' stay' : '')} onClick={() => onCta(a, key)}>{
                          isVendorConfirmAction(a) ? 'Mark as locked in'
                          : /^send payment to/i.test(String(a.title || '')) ? 'Mark as paid'
                          /* NO generic "Take me to it" on the hero (host standing rule): name the real
                             destination when a route is genuinely all we have, so the CTA still says
                             where it goes. */
                          /* Lowercase ONLY the leading tab word — a vendor's proper name must
                             keep its case ("Open vendors → Fired Up BBQ", audit 2026-07-22 W5). */
                          : (a.cta === 'Go' ? ('Open ' + String(describeRoute(a.route, event) || 'the plan').replace(/^the\s+/i, '').replace(/^[A-Z][a-z]*/, (m) => m.toLowerCase())) : a.cta)
                        }</button>; })()}
                        {/* SNOOZE — set it down without losing it. The reason a zero state can
                            be believed: a host who has decided to leave a thing can SAY so, and
                            the list actually empties. The grounded proposal (computed above) is
                            still the one-tap default; "pick a day" folds open the clamped date
                            row below. NEVER for a critical ("your caterer hasn't arrived" is
                            not a someday). The host owns the result and can un-snooze.
                            LAYOUT (host report): the two snooze options are ONE grouped cluster,
                            right of the primary CTA — so on a narrow card they wrap together as a
                            unit ("not now · pick a day") instead of splitting into a ragged stack. */}
                        {snoozeProposed && !elegantMode && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginLeft: 'auto', flexShrink: 0 }}>
                            <button className="mini"
                              onClick={() => snoozeTo(snoozeProposed, 'Set aside — it’ll come back ' + fmtBack(snoozeProposed) + ', with time to spare.')}>
                              not now
                            </button>
                            {snoozePickMin && snoozePickMax && !pickingDay && (
                              <button className="mini" aria-expanded={false} aria-controls={'snooze-pick-' + key}
                                onClick={() => setSnoozePick({ key, val: snoozeProposed })}>
                                pick a day
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {/* The day picker — progressive disclosure: this row exists only after
                          "pick a day", so cards never carry it by default. Bounds come from
                          clampSnoozeUntil and the confirm re-clamps, so a typed date past the
                          window writes the last honest day — and the toast says so plainly. */}
                      {pickingDay && (
                        <div id={'snooze-pick-' + key} className="actions-row" style={{ alignItems: 'center', marginTop: 'var(--sp-2)' }}>
                          <span className="of">back on:</span>
                          <input className="field" type="date" style={{ maxWidth: 160, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                            value={snoozePick.val || ''} min={snoozePickMin} max={snoozePickMax}
                            onChange={e => setSnoozePick({ key, val: e.target.value })}
                            aria-label="Day this comes back" />
                          <button className="mini" disabled={!snoozePick.val} style={!snoozePick.val ? { opacity: .45 } : undefined}
                            onClick={() => {
                              const chosen = String(snoozePick.val || '');
                              let clamped = null;
                              try { clamped = clampSnoozeUntil(event, chosen, { leadDays: a.leadDays }); } catch (_e) { clamped = null; }
                              if (!clamped) { setSnoozePick(null); return; } // window closed since render — refuse quietly, the card stays
                              const backOn = fmtBack(clamped);
                              snoozeTo(clamped, clamped === chosen
                                ? 'Set aside — it’ll come back ' + backOn + ', the day you picked.'
                                : chosen > clamped
                                  ? 'That’s past the window for this one — it’ll come back ' + backOn + ' instead.'
                                  : 'That day’s already here — it’ll come back ' + backOn + ' instead.');
                            }}>
                            set it aside
                          </button>
                          <button className="mini" onClick={() => setSnoozePick(null)}>never mind</button>
                        </div>
                      )}
                      {isHero && heroReceipt && (
                        <div className="receipt">
                          <span className="rdot" aria-hidden="true" />
                          <span className="rmsg">{heroReceipt.msg}</span>
                          <button className="mini" onClick={() => { const f = heroReceipt && heroReceipt.fn; setHeroReceipt(null); try { if (f) f(); } catch { /* undo failed */ } }}>Undo</button>
                        </div>
                      )}
                      {/* The horizon whisper — only when the path rows do NOT
                          follow directly (expanded list); otherwise the rows below
                          speak for themselves and the footer is a double-telling. */}
                      {isHero && queueOpen && queue.length > 1 && (
                        <div className="horizon">then — {queue.slice(1, 3).map(horizonLabel).join(' · ')}{queue.length > 3 ? ' · ' + (queue.length - 3) + ' more' : ''}</div>
                      )}
                    </div>
                  </article>
                );
              })}
              {hiddenCount > 0 && !(nearDayPlan && !queueOpen) && (
                <button className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: 'none', cursor: 'pointer', padding: '9px 0' }}
                  onClick={() => setQueueOpen(true)}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>+ {hiddenCount} more — show the rest</span>
                  <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span>
                </button>
              )}
                </>);
              })()}

              {/* ELEGANT-MINIMAL PORT — SCROLL-TO-SEE-ALL FOLD (2026-07-17): the framing +
                  action cards own the first screen; the reference lane below (heads-up rows +
                  Where-you-stand / Guests / Budget tiles) folds under a grabber. .efold's
                  margin-top:auto pins the boundary to the viewport bottom when the action
                  content is short (calm boards), so "the rest" genuinely sits below the fold;
                  on a busy board it sits right after the cards and you scroll. askMode only —
                  the .mega (day-of / past / calm-nonask) branches are a later slice. */}
              </div>{/* /ecenter — the centered ask+action region */}
              {/* Progress hairline — pinned to the FOOT of the first screen (F13), after the
                  one action, above the fold. Real engine numbers. */}
              {elegantMode && askMode && phaseCues && phaseCues.totalCount > 0 && (() => {
                const done = Number(phaseCues.completedCount) || 0;
                const total = Number(phaseCues.totalCount) || 0;
                const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
                return (
                  <div className={'eprog' + (done >= total && total > 0 ? ' is-done' : '')} aria-hidden="true">
                    <div className="eprog-rule"><span style={{ width: pct + '%' }} /></div>
                    <div className="eprog-labels">
                      <span>{done} of {total} settled</span>
                      {/* "the rest can wait" is a lie when the lead item is OVERDUE/critical —
                          it literally can't wait (host 2026-07-18). Say so instead. */}
                      <span>{done >= total ? 'you’re set' : ((queue[0] && (queue[0].level === 'critical' || queue[0].status === 'overdue' || queue[0].dueInDays < 0)) ? 'this one first' : 'the rest can wait')}</span>
                    </div>
                  </div>
                );
              })()}
              </div>{/* /escreen — first-screen bound ends; the see-all follows below the fold */}
              {/* Fold boundary below the first screen (grabbable — taps scroll to the see-all). */}
              {elegantMode && askMode && (
                <button type="button" className="efold" aria-label="Show the rest of your plan"
                  onClick={(e) => { const app = e.currentTarget.closest('.app') || document.scrollingElement; if (app) app.scrollBy({ top: Math.round(app.clientHeight * 0.72), behavior: 'smooth' }); }}>
                  <div className="efold-grab" aria-hidden="true" />
                  <span className="efold-label">The rest of your plan</span>
                </button>
              )}
              {/* THEN — the wired hero's path (queue positions 2+), folded below the first
                  screen (host "push THEN rows below fold"). Same rows, same routes — just not
                  competing with the one thing. */}
              {elegantMode && askMode && (() => {
                // Include a SECOND bundle here (host 2026-07-18): "Resolve 9 decisions" behind
                // the conflict hero drops below the fold as a path-row, so the first screen isn't
                // two stacked bundles. A bundle routes to its own sheet on tap.
                const thenItems = (queue || []).slice(1).filter(a => a && a.level !== 'critical');
                if (!thenItems.length) return null;
                const openThen = (a, key) => {
                  if (a.kind === 'bundle') {
                    if (/decision/i.test(String(a.title || ''))) { setSheet({ kind: 'decisions' }); return; }
                    if (/conflict/i.test(String(a.title || ''))) { setSheet({ kind: 'vendors' }); return; }
                  }
                  onCta(a, key);
                };
                // DO zone (host redesign 2026-07-18): the "then" per-row eyebrow was
                // repetitive with the header, and a bundle read as a lone line. Now: a
                // single header, hairline-ruled rows (order by position), and a bundle
                // keeps its COUNT as a chip. Em-dash "why it's here" suffix trimmed for
                // a calm compact row.
                return (
                  <div className="then-fold ef-do">
                    <div className="ef-sect">Then, in order</div>
                    <div className="ef-list">
                      {thenItems.map((a, i) => {
                        const cnt = a.kind === 'bundle' ? (a.count != null ? a.count : (Array.isArray(a.items) ? a.items.length : null)) : null;
                        const t = String(a.title || '').replace(/\s+—\s.*$/, '').replace(/\.+$/, '');
                        return (
                          <button key={String(a.id || i)} className="ef-row" onClick={() => openThen(a, String(a.id || (i + 1)))}>
                            <span className="t">{t}</span>
                            <span className="ef-r">{cnt != null && <span className="ef-cnt">{cnt}</span>}<span className="ef-g" aria-hidden="true">→</span></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* HEADS-UP — the worries lane (host board ruling, wave 6): risk
                  raises leave the counted queue and sit here, quiet and steel,
                  never numbered, never in "N things need you" — but still real
                  rows that land on the exact risk (routeSheet's Risks branch).
                  The lane label carries the ask once, so each row reads as the
                  risk itself, in the registry's own words. */}
              {/* Day-before plan — lib/dayBefore, appears only inside the real 0–2 day window */}
              {dayBefore && dayBefore.applicable && (
                <div className="day-node" style={{ marginTop: 26 }}>
                  <div className="eyebrow">{dayBefore.daysOut === 0 ? 'Today · your day-before plan' : dayBefore.daysOut === 1 ? 'Tomorrow · your day-before plan' : 'Two days out · your day-before plan'}</div>
                  <h3>{(() => {
                    // RECON MODEL (2026-07-11): the engine's "7 things still
                    // matter" summed unlike units. Composed HERE (V2-side; the
                    // engine's own headline string is contract-locked) from the
                    // sections' own opens, each part named with its unit noun.
                    // Zero clauses drop; 3+ nonzero keeps the first two + "and more".
                    if (dayBefore.daysOut === 0 || !dayBefore.openCount) return dayBefore.headline;
                    const sx = dayBefore.sections || [];
                    const openOf = (k) => { const s = sx.find(x => x.key === k); return s ? (Number(s.open) || 0) : 0; };
                    const steps = openOf('tasks');
                    const items = openOf('shopping');
                    const people = openOf('vendors') + openOf('helpers');
                    const parts = [
                      steps ? `${steps} plan step${steps === 1 ? '' : 's'}` : null,
                      items ? `${items} item${items === 1 ? '' : 's'} to get` : null,
                      people ? `${people} ${people === 1 ? 'person' : 'people'} to confirm` : null,
                    ].filter(Boolean);
                    if (!parts.length) return dayBefore.headline; // rain-only etc. — the engine line stays honest
                    const when = dayBefore.daysOut === 1 ? 'tomorrow' : 'the day';
                    const named = parts.length > 2 ? `${parts[0]}, ${parts[1]}, and more` : parts.join(' and ');
                    const cap = named.charAt(0).toUpperCase() + named.slice(1);
                    return `${cap} before ${when}.`;
                  })()}</h3>
                  {dayBefore.moment && <p><strong style={{ color: 'var(--carbon-text)' }}>Protect the moment:</strong> {dayBefore.moment.text}</p>}
                  <div className="db-rows">
                  {(dayBefore.sections || []).slice(0, 5).map(sec => {
                    // Modernized rows (2026-07-11): each engine section reads as a
                    // full-width stacked row — a bold plain-language lead carrying
                    // the COUNT, the engine's own honest sentence beneath. The lead
                    // is composed ONLY from the section's open count + the engine's
                    // own vocabulary ("locked in", "still to get") — no new claims.
                    const n = Number(sec.open) || 0;
                    const lead = (() => {
                      switch (sec.key) {
                        case 'tasks': return n ? `${n} plan step${n === 1 ? '' : 's'} still open` : 'Plan steps — nothing open';
                        case 'shopping': return n ? `${n} item${n === 1 ? '' : 's'} still to get` : 'Shopping — all in hand';
                        case 'vendors': return n ? `${n} ${n === 1 ? 'person' : 'people'} to lock in` : 'Everyone you hired is locked in';
                        case 'rain': return n ? 'No rain backup yet' : 'Rain backup saved';
                        case 'helpers': return n ? `${n} ${n === 1 ? 'helper' : 'helpers'} to confirm` : 'Helpers all confirmed';
                        case 'cues': return 'How tomorrow starts';
                        case 'guests': return 'Tell your guests';
                        default: return sec.label + (n ? ` — ${n} open` : '');
                      }
                    })();
                    // BUG FIX (raw 24h leak): the engine's cues detail prints the
                    // ros's internal "23:40" clock strings verbatim. Re-derive the
                    // row from the SAME source (effectiveRos, already memoized as
                    // `ros`), host-formatted — first cue + "and N more" instead of
                    // three full cue sentences.
                    const sub = (() => {
                      // RECON-I5 consumer: the shopping row names its parts using
                      // the engine's own openFood/openSupplies split — the food
                      // part now matches the food sheet's remainder exactly.
                      if (sec.key === 'shopping' && n > 0 && (sec.openFood != null || sec.openSupplies != null)) {
                        const f = Number(sec.openFood) || 0;
                        const s = Number(sec.openSupplies) || 0;
                        const bits = [
                          f ? `${f} on the food list` : null,
                          s ? `${s} supplies & gear` : null,
                        ].filter(Boolean);
                        if (bits.length) return `${bits.join(' · ')} — one store run covers it.`;
                      }
                      if (sec.key !== 'cues') return sec.detail;
                      const cueList = ros.filter(r => r && r.segment);
                      if (!cueList.length) return sec.detail;
                      const first = cueList[0];
                      return `${first.time ? fmt12h(first.time) + ' — ' : ''}${first.segment}`
                        + (cueList.length > 1 ? ` · and ${cueList.length - 1} more` : '');
                    })();
                    return (
                    <button className={'db-row' + (n === 0 ? ' calm' : '')} key={sec.key}
                      onClick={() => {
                        // The ENGINE authored each row's landing (route carries the
                        // first-unbought foodFocus, the vendorId, the taskId) — use
                        // it first; the keyword fallback only catches route-less rows.
                        if (sec.route && routeSheet(sec.route)) return;
                        const k = String(sec.key || sec.label || '').toLowerCase();
                        if (/task|step|plan/.test(k)) setSheet({ kind: 'tasks', focus: null });
                        else if (/get|shop|food|buy/.test(k)) setSheet({ kind: 'food', focus: null });
                        else if (/weather|rain/.test(k)) setSheet({ kind: 'rain' });
                        else if (/tomorrow|start|schedule/.test(k)) setStage('day');
                        else setSheet({ kind: 'tasks', focus: null });
                      }}>
                      <span className="db-main">
                        <span className="db-lead">{lead}</span>
                        <span className="db-sub">{sub}</span>
                      </span>
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                    );
                  })}
                  </div>
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    <button className="mini" onClick={() => { try { openDraft('Day-before details', draftDayBeforeDetails(event, profile, {})); } catch { toast('Couldn’t draft it.'); } }}>Draft the details</button>
                  </div>
                </div>
              )}
              {/* RUNWAY-ADAPTIVE QUIET (T-2d, host evidence 2026-07-17): inside the
                  day-before window the plan above IS the path — the ranked rows fold
                  to one line (never hidden: one tap opens the full list as cards). */}
              {nearDayPlan && !queueOpen && queue.slice(1).filter(a => a && a.kind !== 'bundle' && a.level !== 'critical').length > 0 && (
                <button className="path-row" onClick={() => setQueueOpen(true)}>
                  <span className="then">then</span>
                  <span className="t">the rest of your list · {queue.slice(1).filter(a => a && a.kind !== 'bundle' && a.level !== 'critical').length} more</span>
                  <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span>
                </button>
              )}

              {worries.length > 0 && (() => {
                const rows = worries.flatMap(w => (w && w.kind === 'bundle' && Array.isArray(w.items)) ? w.items : [w]);
                // Same real worry titles (risk engine) — just the label shaping. Nothing invented.
                const wlabel = (w) => {
                  const full = String((w && w.title) || '').replace(/^have a plan for:\s*/i, '').replace(/\bby T-(\d+)d\b/i, 'by $1 days out');
                  const parts = full.split(/\s*\/\s*|,\s+(?:or\s+)?/);
                  return parts.length > 1 ? parts[0] + ' — and more…' : full;
                };
                const goWorry = (w) => { if (w && w.route && routeSheet(w.route)) return; setSheet({ kind: 'risks' }); };
                // WATCH zone (Figma parity 2026-07-18): distinct from actions — steel dots,
                // muted, no arrows (a heads-up, not a thing to go do). Non-elegant unchanged.
                if (elegantMode) return (
                  <div className="ef-watch">
                    <div className="ef-sect">Worth keeping an eye on</div>
                    {rows.map((w, i) => (
                      <button key={String((w && w.id) || 'worry-' + i)} className="watch-row" onClick={() => goWorry(w)}>
                        <span className="watch-dot" aria-hidden="true" />
                        <span className="t">{wlabel(w)}</span>
                      </button>
                    ))}
                  </div>
                );
                return (
                  <div style={{ marginTop: 'var(--sp-5)' }}>
                    <div className="horizon" style={{ borderTop: 'none', paddingTop: 0, marginTop: 18 }}>Worth keeping an eye on</div>
                    {rows.map((w, i) => (
                      <button key={String((w && w.id) || 'worry-' + i)} className="path-row" onClick={() => goWorry(w)}>
                        <span className="then" style={{ color: 'var(--steel-soft)' }}>mind</span>
                        <span className="t" style={{ color: 'var(--steel-soft)' }}>{wlabel(w)}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* SET ASIDE — a snooze the host cannot SEE and UNDO is a trapdoor, not a
                  feature. Whatever they set down is listed here, with when it comes back and a
                  one-tap way to bring it back now. This is also what lets "Nothing needs you"
                  be honest: it means nothing OPEN, and the set-aside pile is shown right below
                  it, not hidden. WAVE-6: the pile is the ENGINE's plan.setAside (it owns
                  snooze now); the comeback date rides the item, with the event map as the
                  fallback read while the contract field name settles. */}
              {(() => {
                const sleeping = setAsideItems || [];
                if (!sleeping.length) return null;
                return (
                  <div style={{ marginTop: 'var(--sp-4)' }}>
                    <p className="grounding" style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
                      Set aside for now — {sleeping.length === 1 ? 'it comes back on its own' : 'they come back on their own'}.
                    </p>
                    {sleeping.map(a => {
                      const until = a.until || a.snoozedUntil || a.comebackDate || snoozedUntil(event, a.id);
                      const when = until ? new Date(until + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon';
                      return (
                        <div key={a.id} className="line" style={{ alignItems: 'center', padding: 'var(--sp-1) 0', opacity: .75 }}>
                          <span className="vc-detail" style={{ margin: 0, flex: 1 }}>{String(a.title || '').replace(/\.+$/, '')} · back {when}</span>
                          <button className="mini" onClick={() => {
                            const next = { ...(event.snoozed || {}) }; delete next[a.id];
                            patchEvent({ snoozed: next }, 'Back on your list.');
                          }}>bring it back</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {queue.length <= 1 && upNext.length > 0 && (
                <>
                  <div className="sect" style={{ marginTop: 26 }}><h2 style={{ fontSize: 'var(--t-card-title)' }}>Coming up</h2><div className="rule" /><span className="when">dated, not urgent</span></div>
                  {upNext.map((u, i) => (
                    <button key={i} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 0' }}
                      onClick={() => routeUpNext(u)}>
                      <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{u.label}</span>
                      <span className="of" style={{ whiteSpace: 'nowrap' }}>
                        {u.due ? 'by ' + new Date(u.due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (u.days != null ? ' · ' + (u.days === 0 ? 'today' : 'in ' + u.days + 'd') : '') : 'no date'}
                      </span>
                    </button>
                  ))}
                </>
              )}

              <div className="bento" style={elegantMode && isPast ? { display: 'none' } : undefined}>
                {/* role=button div, NOT a <button> — it contains its own interactive
                    "what's counted" caret, and a native button-in-button is invalid
                    HTML + ambiguous to screen readers (per-screen re-audit). */}
                <div className="tile tile-a" role="button" tabIndex={0}
                  onClick={() => {
                    // Tap = take me to what's next, front and center (attention
                    // system); the caret corner toggles the readouts panel.
                    if (queue.length) { const k = String(queue[0].id || 0); setEditor(null); spotlight(k); }
                    else setHandledOpen(o => !o);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (queue.length) { setEditor(null); spotlight(String(queue[0].id || 0)); } else setHandledOpen(o => !o); } }}>
                  <div className="t-label">Where you stand{' '}
                    <span role="button" tabIndex={0} style={{ opacity: .55, padding: '11px 8px', margin: '-9px -2px', display: 'inline-block' }}
                      onClick={e => { e.stopPropagation(); setHandledOpen(o => !o); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setHandledOpen(o => !o); } }}>
                      {handledOpen ? "▴ what’s counted" : "▾ what’s counted"}
                    </span>
                  </div>
                  <div>
                    {(() => {
                      // TRUTH RULE (Todd, 2026-07-08): the tile reads the WIDER
                      // ledger — deriveEventPhaseProgress's essentials (basics +
                      // rain, shopping, dietary, vendors, crabs) — never just the
                      // four foundational dominoes. "Done" is only claimed when
                      // the ENGINE's own label says ready AND the checklist is
                      // clear; otherwise the open work is named.
                      // Engine-authored numbers: completedCount/totalCount and the
                      // ranked nextCue come straight from deriveEventPhaseProgress
                      // (the engine returns counts + nextCue + items — never re-derive).
                      const hasCues = !!(phaseCues && phaseCues.totalCount);
                      const essDone = hasCues ? phaseCues.completedCount : plan.progress.done;
                      const essTotal = hasCues ? phaseCues.totalCount : plan.progress.total;
                      const openTasks = (event.timeline || []).filter(t => t && !t.done && !isTimelineStepResolved(t)).length;
                      const nextCue = hasCues ? phaseCues.nextCue : null;
                      // Numerals in the muted sub get a <b> (one CSS contrast
                      // step up — host request 2026-07-11).
                      // RECON MODEL (2026-07-11): the big number counts AREAS —
                      // each once — so the sub names the unit. The setup fraction
                      // (the four foundational dominoes) shows only while it's
                      // incomplete, then drops entirely; every other number on
                      // the page is an inventory with its own unit noun.
                      // Re-audit 2026-07-17 (P1, "retire the second fraction"): the
                      // "· setup X of Y" foundational-dominoes count sat as a SECOND
                      // fraction on this card next to the big "N of M parts" — a novice
                      // couldn't tell "handled" from "setup". One number, one meaning.
                      let sub;
                      if (!essTotal) sub = 'Nothing to read for this event yet.';
                      else if (essDone < essTotal) {
                        // BOARD RULING (wave 6, hero — approved by the host): the
                        // reconciliation sentence ("2 still open, plus 2 more —
                        // that's the 4 below") is DELETED, not reworded. The tile
                        // counts open AREAS, names the unit, and stops talking;
                        // the queue speaks for itself in NEXT. The "· next: X"
                        // tail left with it — the hero now has ONE next action
                        // (the Start-here row above), and a second naming here
                        // would be the double-telling this screen keeps killing.
                        sub = 'parts of your plan handled';
                      }
                      else if (openTasks > 0) sub = <>parts of your plan handled — but <b>{openTasks}</b> checklist step{openTasks === 1 ? '' : 's'} still on the list. Not done yet.</>;
                      else sub = 'parts of your plan handled and the checklist is clear — ready for the day.';
                      return (
                        <>
                          <div className="t-num" style={{ fontSize: 'clamp(26px,8cqw,34px)' }}>
                            {essTotal ? `${essDone} of ${essTotal}` : '—'}
                          </div>
                          <div className="bar"><i style={{ width: (essTotal ? Math.round((essDone / essTotal) * 100) : 0) + '%' }} /></div>
                          <div className="t-sub">{sub}</div>
                          {/* Audit #9: the area NAMES were hidden behind the "what's
                              counted" caret, so "N of M" was an abstract number — a
                              first-timer couldn't see WHICH areas or what's left.
                              This is the glance: each area named inline, handled ones
                              dimmed with a done-dot, the open ones bright. The caret
                              still opens the full interactive breakdown below. */}
                          {hasCues && Array.isArray(phaseCues.items) && phaseCues.items.length > 0 && (() => {
                            const areaLabel = (id) => ({ datetime: 'Date & time', date: 'Date', location: 'Venue', headcount: 'Guests', food: 'Food', dietary: 'Dietary', diet: 'Dietary', rain: 'Rain plan', crabs: 'Crab order', vendors: 'Vendors', shopping: 'Shopping', payments: 'Payments', thankyous: 'Thank-yous', rentals: 'Rentals' }[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Area'));
                            const nextId = nextCue && (nextCue.id || nextCue.source);
                            return (
                              <>
                                {/* REVIEW-BOARD RULING (2026-07-17, unanimous — host referred the
                                    call to the board). An always-on line here used to read "The main
                                    parts of your plan — tap any to open it. Settle all N and you're
                                    ready for the day." It was added on a real host report (the count
                                    "N of M areas" meant nothing), but it was a footnote defending a
                                    bad noun: "areas" is OUR model's word, never the host's. The line
                                    contained its own fix — "the main parts of your plan" — so that
                                    phrase IS the sub-label now, and the gloss has nothing left to
                                    teach. Its other two jobs were already covered: "settle all N and
                                    you're ready" is stated by the done-branch sub at the moment it's
                                    TRUE (not pre-announced over a progress bar the host can read),
                                    and "tap any to open it" was never copy — it was an affordance bug,
                                    now fixed on the chips themselves. This also restores the wave-6
                                    board ruling ~30 lines up, which this line had quietly reversed:
                                    the tile names the unit and stops talking.
                                    FALSIFIABLE: if a host reads "6 of 7 parts of your plan handled"
                                    over the named chips and still asks "handled for WHAT?", then the
                                    gap was the goal-state, not the vocabulary — put a line back, but
                                    gated to the first visit, never always-on. */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 8 }}>
                                {/* Each part is a real door (host report + audit #7):
                                    tap it to open that surface. stopPropagation so it
                                    routes instead of firing the tile's own handler.
                                    AFFORDANCE (board ruling 2026-07-17): these were
                                    background:none / border:none — invisible as buttons,
                                    and the ONLY thing saying "tap any to open it" was the
                                    prose line above (sighted hosts never get the aria-label).
                                    Deleting that sentence without this would trade a copy
                                    problem for a discoverability regression, so they now
                                    wear the app's own .chip vocabulary: hairline --line
                                    border, pill radius, steel on hover. A door that LOOKS
                                    like a door needs no sentence explaining it. */}
                                {phaseCues.items.map((c, ix) => {
                                  const isNext = !c.handled && nextId && c.id === nextId;
                                  return (
                                    <button key={c.id || ix} type="button" className="chip"
                                      onClick={e => { e.stopPropagation(); if (c.id === 'datetime' || c.id === 'date') { setSheet({ kind: 'date' }); return; } if (c.id === 'location') { setSheet({ kind: 'venue' }); return; } if (c.route && routeSheet(c.route)) return; if (c.cueLabel) toast(c.cueLabel); }}
                                      aria-label={areaLabel(c.id) + (c.handled ? ' — handled' : ' — still open') + '. Open it.'}
                                      style={{ padding: '5px 11px', fontSize: 'var(--t-pill)', fontWeight: c.handled ? 550 : 700, letterSpacing: '.02em', display: 'inline-flex', alignItems: 'center', gap: 5, color: c.handled ? 'var(--faint)' : isNext ? 'var(--steel-soft)' : 'var(--ink-soft)' }}>
                                      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block', background: c.handled ? 'var(--ok)' : 'var(--faint)', opacity: c.handled ? 0.9 : 0.55 }} />
                                      {areaLabel(c.id)}
                                    </button>
                                  );
                                })}
                                </div>
                              </>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <button className="tile tile-b" onClick={() => setSheet({ kind: 'guests' })}>
                  <div className="t-label">Guests</div>
                  <div>
                    <div className="t-num">{guests ? gAnim : '—'}</div>
                    {/* When the host keeps a ROSTER, the honest line is who has actually
                        replied — not a no-show/plus-one model applied to the roster size.
                        This tile only ever said "planned around · likely X–Y (some
                        no-shows, some plus-ones)", which presents a MODELLED band as if
                        the count were settled, on an event where half the roster has
                        never answered. attendanceBand already computes the truth
                        ("2 confirmed · 4 replies still out") and the food + budget sheets
                        already use it; the home tile did not. Found by driving the new
                        roster QA seed — the surface QA could not previously reach. */}
                    <div className="t-sub">{guests
                      ? (gBand && gBand.basis === 'rsvp' && gBand.band && gBand.because
                          ? (isPast
                              /* Past recap: "replies still out" is a dead ask on a finished
                                 event (audit 2026-07-22, W7) — state what the roster was. */
                              ? <>{(event.guests || []).filter(g => g && g.rsvp === 'Yes').length} confirmed · {(event.guests || []).length} invited</>
                              : <>{gBand.because}</>)
                          : expect ? <>planned around · likely <b>{expect.low}–{expect.high}</b> on the day{expect.note ? ` (${expect.note})` : ''}</> : 'planned around')
                      : 'no count yet — the plan can’t size food or seats'}</div>
                  </div>
                </button>
                <button className="tile tile-c" onClick={() => setSheet({ kind: 'budget' })}>
                  <div className="t-label">Budget</div>
                  <div>
                    <div className="t-num">{money.planned ? fmt(bAnim) : '—'}</div>
                    {/* over-budget warn moved from inline style to the .over class so
                        the numeral <b> rule can defer to it (b stays warn, not gray). */}
                    <div className={'t-sub' + (money.planned && money.committed > money.planned && !isPast ? ' over' : '')}>
                      {money.planned ? <><b>{fmt(money.committed)}</b> spoken for · <b>{fmt(money.spent)}</b> spent{money.spentEstimated > 0 ? (money.spentEstimated >= money.spent ? ' (est.)' : ` · ${fmt(money.spentEstimated)} est.`) : ''}{money.committed > money.planned ? ` · ${fmt(money.committed - money.planned)} over` : ''}</> : 'no number yet — tap to set one'}
                    </div>
                  </div>
                </button>
              </div>
              {/* NEXT — out of the grid, anchored to the bottom of the hero
                  viewport (margin-top:auto) so it rides just above the dock.
                  DENSITY (2026-07-16): the pinned .next-bar already names the first
                  action, its "+N" count, and routes through the identical onCta path —
                  so on an ACTIVE board this tile was the same answer, twice, on one
                  screen (the bar's own comment says START HERE was retired for exactly
                  this reason; this tile was left behind). It still earns its place in
                  the two states the bar can't cover: CALM (it names the next DATED cue
                  and routes to it — the bar only says "All quiet") and DAY-OF (it counts
                  the moments/steps left). So: render it only when it adds something.
                  HOST RULING (2026-07-17): "All quiet" was ALSO the verdict line's job
                  ~200px up, off the same listIsCalm flag — the verdict keeps it, and this
                  tile leads with the dated cue only it knows. Which means a calm board
                  with NO dated cue leaves this tile nothing the verdict hasn't already
                  said, so it stands down entirely rather than say "All quiet" twice under
                  a heading that promises a next step. */}
              {(days === 0 || (listIsCalm && upNext.length > 0)) && (
              <button
                  className={'tile tile-d' + (queue.length === 0 ? ' allset' : '')}
                  onClick={() => {
                    if (days === 0) { setStage('day'); return; }
                    // The tile NAMES actions[0] ("first: …"), so tapping it must go
                    // where THAT action goes — through onCta, the exact path the named
                    // card's CTA uses (its own deep-link / editor). Routing via
                    // phaseCues.nextCue (a DIFFERENT engine — the phase-area ledger)
                    // sent the tap to the wrong sheet whenever the named action and
                    // the phase cue disagreed — e.g. a vendor COI action named here
                    // routes to that vendor's documents, but the phase cue pointed at
                    // a generic area sheet (host-reported wrong-location bug).
                    if (queue.length && !listIsCalm) { onCta(queue[0], String(queue[0].id || 0)); return; }
                    // Calm / no urgent action: the sub names the next dated cue — honor it.
                    if (phaseCues && phaseCues.nextCue && phaseCues.nextCue.route && routeSheet(phaseCues.nextCue.route)) return;
                    document.getElementById('actionsAnchor')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="t-label">Next</div>
                  <div className="t-big">{(() => {
                    if (days === 0) return 'Run the day';
                    // HOST RULING (2026-07-17): the verdict line owns "All quiet" — this
                    // leads with the thing only it knows, the next DATED cue. (The tile
                    // doesn't render at all without one, so upNext[0] is always here.)
                    const u = upNext[0];
                    const label = String(u.label || '').replace(/\.+$/, '');
                    return label.length > 42 ? label.slice(0, 42) + '…' : label;
                  })()}</div>
                  <div className="t-sub">
                    {(() => {
                      // Host audit (2026-07-08): NAME the first thing (same source as
                      // the card below — can't disagree) instead of counting the
                      // checklist ledger; open to-dos aren't "needs you" unless
                      // overdue, and then the engine makes catch-up the top card.
                      if (days === 0) {
                        // Solemn (state 3): no count, no "wheel" — a gentle lead only.
                        if (solemn) return 'You lead this — the day is below.';
                        // Day-of truth: count what's actually left today, not "1 thing".
                        const moments = ros.filter(r => r && !r.done).length;
                        const openTasks = (event.timeline || []).filter(t => t && !t.done && !isTimelineStepResolved(t)).length;
                        const bits = [];
                        if (moments) bits.push(moments + ' moment' + (moments === 1 ? '' : 's') + ' queued');
                        if (openTasks) bits.push(openTasks + ' steps open');
                        return (bits.length ? bits.join(' · ') + ' — ' : '') + 'The Day has the wheel ↓';
                      }
                      if (listIsCalm) {
                        // The t-big now NAMES the cue (host ruling), so the sub carries
                        // only its timing — the part the name can't say.
                        const u = upNext[0];
                        // The "past due" STATE routes through the ONE policy (u.overdue =
                        // taskIsOverdue, snooze + reachability bound), NOT taskTimeStatus's
                        // 'overdue' bucket. taskTimeStatus stays only as the 'due'/'due-soon'
                        // DISPLAY tint. A snoozed / unreachable step keeps u.overdue=false, so
                        // it falls through to its dated "by <date>" copy, never "past due".
                        return (u.overdue ? 'past due'
                          : u.timeBucket === 'due' ? 'due today'
                            : u.timeBucket === 'due-soon' ? 'due soon'
                              : (u.due ? 'by ' + new Date(u.due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'when you get to it')) + ' ↓';
                      }
                      // ORDER-OF-INFORMATION (host, 2026-07-09): the essentials
                      // count is the Where-you-stand tile's one job, directly
                      // above — restating it here was the last double-telling
                      // on the hero. NEXT names only the first thing.
                      const first = String(queue[0].title || '').replace(/\.+$/, '');
                      return 'first: ' + (first.length > 52 ? first.slice(0, 52) + '…' : first) + ' ↓';
                    })()}
                  </div>
                </button>
              )}
              </div>

              {/* ── T-72h reconfirm sweep — a live-moment banner that exists only
                  inside the window, and folds to one green line once every
                  vendor has answered. ── */}
              {sweepWindow && reconfirmedN < reconfirmables.length && (
                <div className="sweepcard" role="region" aria-label="Reconfirm your vendors">
                  <div className="sc-eyebrow">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days + ' days out'} · the reconfirm window</div>
                  <h3>Reconfirm your vendors</h3>
                  <p>{reconfirmables.length === 1 ? reconfirmables[0].name + ' holds your day' : reconfirmables.length + ' vendors hold your day'} — one tap drafts every reconfirm, each with their own time and details.{reconfirmedN > 0 ? ' ' + reconfirmedN + ' of ' + reconfirmables.length + ' already answered.' : ''}</p>
                  <button className="mini" onClick={() => { setSheet({ kind: 'sweep' }); runSweepDrafts(); }}>Reconfirm everyone</button>
                </div>
              )}
              {sweepWindow && reconfirmedN === reconfirmables.length && (
                <div className="later-row" style={{ marginTop: 14, color: 'var(--ok)' }}>
                  All {reconfirmables.length} vendors answered — everyone’s coming.
                  <button className="mini" style={{ marginLeft: 'var(--sp-2)' }} onClick={() => setSheet({ kind: 'sweep' })}>See the sweep</button>
                </div>
              )}

              {/* Slide-down readouts: hidden until the Basics tile is tapped —
                  never-dense doctrine. Pills = the 4 readiness pillars; below them
                  the engine's handled facts. */}
              <div className={'slidepanel' + (handledOpen ? ' open' : '')}>
                <div className="slidepanel-inner">
                  {/* WHAT THESE TWO NUMBERS ARE (host, 2026-07-14).
                      The hero shows "3 of 5" in one tile and "3 things need you" in the other,
                      and never once says what an AREA is, what a THING is, or why the two
                      numbers differ. They are not the same count and they never were — one is
                      a map, the other is a queue — and a host reading them side by side was
                      left to reconcile that themselves. (They used to genuinely disagree, too:
                      two engines, two answers. That is fixed — they now read the same list —
                      but agreeing is not the same as EXPLAINING.) */}
                  <p className="grounding" style={{ margin: '0 0 10px' }}>
                    The <b>parts of your plan</b> are the date, the venue, the guest count, the food, the rest.
                    This says how many are settled. <b>Next</b> is the shorter thing: what actually needs you today,
                    in order, starting with the one at the top.
                  </p>
                  <p className="grounding" style={{ margin: '0 0 12px' }}>
                    They read from the same list, so they can’t contradict each other — but they won’t match, and
                    they shouldn’t. A part can be settled and still have one loose end, and a single job can close
                    two parts at once.
                  </p>
                  {/* POP-1C consumer: the recommendation lifecycle is the one
                      source that classifies EVERY recommendation (foundation,
                      vendors, decisions, risks) by a single state vocabulary.
                      This is the only surface that shows that whole picture —
                      in host language, non-zero states only, simplicity intact. */}
                  {(() => {
                    const lc = (plan.planningState && plan.planningState.recommendationLifecycle) || [];
                    if (!lc.length) return null;
                    const n = (s) => lc.filter(i => i.state === s).length;
                    const bits = [
                      n('Completed') ? n('Completed') + ' handled' : null,
                      n('Working') ? n('Working') + ' in progress' : null,
                      n('Blocked') ? n('Blocked') + ' need' + (n('Blocked') === 1 ? 's' : '') + ' unblocking' : null,
                    ].filter(Boolean);
                    if (!bits.length) return null;
                    return (
                      <p className="grounding" style={{ margin: '0 0 10px', color: 'var(--steel-soft)', fontWeight: 550 }}>
                        {/* "all clear" used to be `n('Blocked') ? '' : ' · all clear'` — and
                            'Blocked' is only ever set for an OVERDUE DECISION
                            (CommandCenter deriveRecommendationLifecycle). So the app printed
                            "3 handled · all clear" over an event with two open areas and a
                            NEXT tile saying "1 thing needs you", 40px above it. A presence
                            predicate (nothing is overdue) licensing a completion claim
                            (all clear) — the exact invariant this codebase spent the day
                            closing everywhere else. Calm is now earned against the SAME
                            predicate the NEXT tile reads (listIsCalm) — one strictness of
                            quiet per screen, calm fillers included. */}
                        {bits.join(' · ')}{(n('Blocked') || !listIsCalm) ? '' : ' · all clear'}
                      </p>
                    );
                  })()}
                  {(wins.items || []).length > 0 && (
                    <div className="pills" style={{ marginBottom: 'var(--sp-2)' }}>
                      {wins.items.map(w => (
                        <span key={w.key} className="pill p-ok" style={{ cursor: 'default' }}>{w.label}<span className="pill-note">{w.note}</span></span>
                      ))}
                    </div>
                  )}
                  {phaseCues && Array.isArray(phaseCues.items) && phaseCues.items.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '6px 0 var(--sp-1)' }}>The {phaseCues.totalCount} parts of your plan this count reads</div>
                      {/* RECON MODEL grounding: why this number and the inventories
                          below it can never be compared one-to-one. */}
                      <p className="grounding" style={{ margin: '0 0 6px' }}>
                        Each part counts once here. The items inside a part — shopping items, people, steps — keep their own counts further down the page.
                      </p>
                      {phaseCues.items.map((c, i) => c.handled ? (
                        <div key={c.id || i} className="line" style={{ padding: '5px 0' }}>
                          <span className="of">{c.id}</span><span className="amt" style={{ color: 'var(--ok)', fontWeight: 600 }}>handled</span>
                        </div>
                      ) : (
                        <button key={c.id || i} className="frow" style={{ padding: 'var(--sp-2) 2px', minHeight: 44, alignItems: 'center' }}
                          onClick={() => { if (c.route && routeSheet(c.route)) return; toast(c.cueLabel); }}>
                          <span className="f-main"><span className="f-name" style={{ fontSize: 'var(--t-body)' }}>{c.cueLabel}</span></span>
                          <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span>
                        </button>
                      ))}
                    </>
                  )}
                  {heartMoments.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      {heartMoments.slice(0, 3).map((m, i) => (
                        <p key={i} className="grounding" style={{ margin: i ? '4px 0 0' : 0 }}>
                          {i === 0 ? 'Protect the moment: ' : 'Also worth protecting: '}
                          {String((m && (m.label || m.title || m.moment)) || m)}
                        </p>
                      ))}
                    </div>
                  )}
                  {(() => {
                    if (!readiness) return null;
                    // Host-leakage gate is now applied upstream, per-axis, by
                    // applicableReadinessAxes (CommandCenter.jsx) — vendor and
                    // document are independently nulled on their own real signal
                    // (vendors.length / documents.length), not one blanket gate
                    // tied to vendor count alone. readiness.vendor/.document
                    // already arrive pre-nulled where inapplicable.
                    const anyOverdue = (decisionBoard.open || []).some(r => r && r.status === 'overdue');
                    const callsPill = (decisionBoard.open || []).length
                      ? { status: anyOverdue ? 'AT_RISK' : 'ATTENTION', note: decisionBoard.open.length + ' open' }
                      : null;
                    // HOST WORDS, never percentages: the engine's checklist note can
                    // read "73%" — remap it to the honest count from the SAME
                    // timeline the pillar was scored on ("11 of 15 done").
                    // RECON-I3: the pillar was scored on effectiveDone — the note
                    // must count on the same basis or the pill contradicts itself.
                    const tlDone = (event.timeline || []).filter(t => {
                      if (!t) return false;
                      try { return effectiveDone(event, t); } catch { return !!t.done; }
                    }).length;
                    const tlTotal = (event.timeline || []).length;
                    const checklistPill = readiness.timeline && /%/.test(String(readiness.timeline.note || '')) && tlTotal
                      ? { ...readiness.timeline, note: tlDone + ' of ' + tlTotal + ' done' }
                      : readiness.timeline;
                    const pillars = [
                      // CANONICAL (queue item 10, ruled 2026-07-08): V2's
                      // decision pillar IS the playbook decision board — the
                      // readiness engine's decision axis is intentionally not
                      // rendered (one decision truth; the board carries
                      // per-decision due dates + routes the pillar lacks).
                      ...(callsPill ? [['Calls to make', callsPill]] : []),
                      ['People', readiness.vendor], ['Paperwork', readiness.document],
                      ['Checklist', checklistPill],
                    ].filter(([, r]) => r && r.status !== 'ON_TRACK'); // action-only: on-track never renders
                    if (!pillars.length) return <p className="grounding" style={{ margin: '2px 0 6px' }}>All quiet — nothing flagged.</p>;
                    // confidenceGrammar (production, live for hosts too): the pill's
                    // WORD reflects actual certainty, not just status — "worth a look"
                    // for a real partial vs. the same red/amber word for a guess.
                    // getEventReadiness rows use {status:'AT_RISK'|...}; the grammar
                    // reads {statusLabel:'AT RISK'|...} — translate, don't reimplement.
                    const grammar = confidencePersona(event);
                    const STATUS_WORD = { ON_TRACK: 'ON TRACK', ATTENTION: 'ATTENTION', AT_RISK: 'AT RISK' };
                    return (
                      <div className="pills">
                        {pillars.map(([label, r]) => {
                          const conf = grammar ? confidenceFor({ statusLabel: STATUS_WORD[r.status] || r.status, note: r.note }, grammar) : null;
                          // Was `conf.tier === 'red' ? 'p-risk' : 'p-warn'` — four tiers collapsed
                          // into two, so `steel` (the "we don't know yet" tier: UNKNOWN, ESTIMATED,
                          // NEEDS_VERIFICATION) painted AMBER URGENCY. An empty field looked exactly
                          // like a slipping deadline, on the app's single most important attention
                          // surface. Each tier now renders as itself.
                          return (
                            <button key={label} className={'pill ' + (conf
                              ? (conf.tier === 'red' ? 'p-risk'
                                : conf.tier === 'green' ? 'p-ok'
                                : conf.tier === 'steel' ? 'p-steel'
                                : 'p-warn')
                              : (r.status === 'ATTENTION' ? 'p-warn' : 'p-risk'))}
                              title={conf ? conf.word : undefined}
                              onClick={() => {
                                if (label === 'Checklist') setSheet({ kind: 'tasks', focus: null });
                                else if (label === 'Calls to make') setSheet({ kind: 'decisions', focus: null });
                                else toast(label + ' — ' + (r.label || '') + (r.note ? ': ' + r.note : ''));
                              }}>
                              {label}<span className="pill-note">{conf ? conf.word + ' — ' : ''}{r.note}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {handled.length > 0 && handled.map((h, i) => (
                    <div className="later-row done" key={i} style={{ marginLeft: 0 }}><span className="t">{h}</span></div>
                  ))}
                </div>
              </div>

              {/* Re-audit 2026-07-17 (P2, "hide filters until there's volume"): a
                  domain filter over a near-empty plan is filter-heavy / content-light
                  (UX_04 anti-pattern #4). The lens earns its place once the list is long
                  enough to be worth narrowing — 5+ things needing the host. */}
              {!elegantMode && lensSet.length > 1 && queue.length >= 5 && !nearDayPlan && (
                <div className="lenses">
                  <button className="lens" aria-pressed={lens === 'all'} onClick={() => setLens('all')}>Everything</button>
                  {lensSet.map(l => (
                    <button key={l} className="lens" aria-pressed={lens === l} onClick={() => setLens(l)}>{l}</button>
                  ))}
                </div>
              )}


              {/* Decision-blockers (fieldKey + options) are now hero DESTINATIONS via the queue
                  (blockerDecisions) in elegant mode — don't also draw them here, or they'd double. */}
              {blockers.filter(b => !(elegantMode && b && b.fieldKey && Array.isArray(b.options) && b.options.length && !/venue/i.test(String(b.title || '')))).map((b, i) => {
                const isVenueBlock = /venue/i.test(String(b.title || ''));
                const venueSet = !!String(event.venue || '').trim();
                return (
                  <article className="card" key={'blk-' + i} style={{ marginTop: i === 0 ? 24 : 0 }}>
                    <div className="card-head">
                      {/* Re-audit 2026-07-17 (P1, "soften empty-field states"): an
                          un-entered foundational field (venue with no value on a fresh
                          event) was rendered red "Blocked" — a scold, not a guide. These
                          are unresolved prerequisites, not crises: show a calm, muted
                          "Not set yet". Genuine at-risk states escalate via the queue. */}
                      <div className="card-top"><span className="tag plan">Not set yet</span></div>
                      <h3>{b.title}</h3>
                      {b.what && <p className="because">{b.what}</p>}
                      {/* The blocker resolves RIGHT HERE — never a passive note.
                          At-home venues clear via the town (venueCity), the same
                          field weather and maps read. */}
                      {isVenueBlock && !venueSet && (
                        <>
                          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 10 }}>
                            <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name or address"
                              value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); setPendingCity(''); fetchAddrSugs(e.target.value); }} aria-label="Venue" />
                            <button className="cta" onClick={saveVenue}>Save</button>
                          </div>
                          {addrSugs.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              {addrSugs.map((sg, si) => (
                                <button key={si} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
                                  onClick={() => pickAddr(sg)}>
                                  <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{sg.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {venueErr && <p className="grounding" style={{ marginTop: 6, color: 'var(--danger)' }}>{venueErr}</p>}
                        </>
                      )}
                      {isVenueBlock && venueSet && needsCity() && (
                        <>
                          <p className="grounding" style={{ marginTop: 6 }}>
                            “{event.venue}” is named — the venue check also needs the town and state (or a ZIP), so weather and maps find the right one.
                          </p>
                          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', alignItems: 'flex-start' }}>
                            <CityField value={cityDraft} onChange={setCityDraft} onPick={setCityDraft} onEnter={saveCity}
                              placeholder="Annapolis, MD or 21401" ariaLabel="City, state or ZIP" style={{ maxWidth: 220, flex: '0 1 220px' }} />
                            <button className="cta" onClick={saveCity}>Save</button>
                          </div>
                        </>
                      )}
                      {!isVenueBlock && b.nextDecision && <p className="grounding" style={{ marginTop: 6 }}>{b.nextDecision}</p>}
                      {/* POP-1 continuity: the engine authored WHERE this blocker
                          resolves (b.route) — land there, never a passive note. */}
                      {!isVenueBlock && b.route && (
                        <div className="actions-row">
                          <button className="cta" onClick={() => { if (!routeSheet(b.route)) toast('In the app this opens: ' + (describeRoute(b.route, event) || 'the right spot')); }}>Sort it out</button>
                        </div>
                      )}
                      {/* No tab/field to route to, but a real fixed set of
                          options — resolves right here instead of leaving
                          nextDecision's text with nowhere to act on it. */}
                      {!isVenueBlock && !b.route && b.fieldKey && Array.isArray(b.options) && (
                        // UNIFIED SURFACE: below-fold decision blockers (e.g. Ceremony Timing)
                        // render the same decopt rows as the hero, not chips — one decision path.
                        elegantMode ? renderDecision({
                          id: 'blocker:' + b.fieldKey,
                          options: b.options.map(o => ({ value: o.value, label: o.label, note: o.note || null })),
                          proposed: null,
                          settle: (v) => patchEvent({ [b.fieldKey]: v }, (b.title || 'Decided') + ' — set.'),
                        }) : (
                        <div className="actions-row" style={{ flexWrap: 'wrap' }}>
                          {b.options.map(opt => (
                            <button key={opt.value} className="chip" onClick={() => patchEvent({ [b.fieldKey]: opt.value })}>{opt.label}</button>
                          ))}
                        </div>
                        )
                      )}
                    </div>
                  </article>
                );
              })}

              {!isPast && event.venue && !venueBlockerShown && !/\d/.test(String(event.venue)) && (event.venueKind === 'home' || /backyard|house|place|yard|home|garden|farm|cabin/i.test(String(event.venue))) && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>
                    {addressOpen ? 'Where exactly?' : 'Guests will ask where — add the address for ' + String(event.venue).toLowerCase()}
                  </span>
                  {addressOpen ? null : <button className="mini" onClick={() => setAddressOpen(true)}>Add it</button>}
                </div>
              )}
              {!isPast && event.venue && !venueBlockerShown && !/\d/.test(String(event.venue)) && (event.venueKind === 'home' || /backyard|house|place|yard|home|garden|farm|cabin/i.test(String(event.venue))) && addressOpen && (
                <div className="hc-row" style={{ marginTop: 'var(--sp-2)' }}>
                  <AddressField value={addressDraft} onChange={setAddressDraft} onPick={sg => setAddressDraft(sg.label)}
                    inputStyle={{ maxWidth: 'none' }} placeholder="Street address — invites and rain notes will carry it" ariaLabel="Venue address" />
                  <button className="cta" disabled={!addressDraft.trim()} style={!addressDraft.trim() ? { opacity: .45 } : undefined}
                    onClick={() => {
                      if (!validPlace(addressDraft) && !/\d/.test(addressDraft)) { toast('That doesn’t read like an address — street and number help guests find you.'); return; }
                      patchEvent({ venue: event.venue + ' — ' + addressDraft.trim() }, 'Address on the plan — invites and the rain note now carry it.'); setAddressOpen(false); setAddressDraft('');
                    }}>
                    Save
                  </button>
                </div>
              )}

              {outdoor && event.rainPlan && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>If it rains: {String(event.rainPlan).slice(0, 60)}{String(event.rainPlan).length > 60 ? '…' : ''}</span>
                  <button className="mini" onClick={() => { try { openDraft('Rain note to guests', guestRainMessage(event, wx || null)); } catch { toast('Couldn’t draft the note.'); } }}>Guest note</button>
                  <button className="mini" onClick={() => patchEvent({ rainPlan: '' }, 'Rain backup cleared — worth re-naming one.')}>Change</button>
                </div>
              )}

              {!elegantMode && compression && compression.headline && (
                <button className="later-row" style={{ marginTop: 'var(--sp-5)', width: '100%', textAlign: 'left', background: 'var(--warn-tint)', border: 'none', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) 14px', cursor: 'pointer' }}
                  onClick={() => {
                    // land on the engine's FIRST do-now task, not the sheet top
                    const first = (compression.doNow && compression.doNow[0]) || null;
                    setSheet({ kind: 'tasks', focus: (first && (first.id || first.taskId)) || null });
                  }}>
                  <span className="t" style={{ color: 'var(--warn)' }}>{compression.headline}</span>
                  {compression.meta && compression.meta.sub && <span className="of" style={{ color: 'var(--warn)' }}> {compression.meta.sub}</span>}
                </button>
              )}

              {!String(event.venue || '').trim() && !venueBlockerShown && (
                <article className="card" style={{ marginTop: 'var(--sp-5)' }}>
                  <div className="card-head">
                    <div className="card-top">
                      <span className="tag plan" style={(days != null && days <= 1) ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : undefined}>
                        {(days != null && days <= 1) ? 'Today' : 'Plan'}
                      </span>
                    </div>
                    <h3>Where is it happening?</h3>
                    <p className="because">{(days != null && days <= 1)
                      ? 'It’s the day — guests, the rain note, and every map link need a place. This can’t wait.'
                      : 'Everything hangs off the venue — invites, the rain backup, seats and space.'}</p>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 10 }}>
                      <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name or address"
                        value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); setPendingCity(''); fetchAddrSugs(e.target.value); }} aria-label="Venue" />
                      <button className="cta" onClick={saveVenue}>Save</button>
                    </div>
                    {addrSugs.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {addrSugs.map((sg, si) => (
                          <button key={si} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
                            onClick={() => pickAddr(sg)}>
                            <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{sg.label}</span>
                          </button>
                        ))}
                        <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', opacity: .65 }}>
                          {typeof window !== 'undefined' && window.google ? 'Suggestions by Google Places.' : 'Suggestions by OpenStreetMap — Google Places takes over when the API key lands.'}
                        </p>
                      </div>
                    )}
                    {venueErr && <p className="grounding" style={{ marginTop: 6, color: 'var(--danger)' }}>{venueErr}</p>}
                  </div>
                </article>
              )}


              {/* QUIET INDEX (Fable redo): the first pass hid these rows in a
                  "More" junk drawer — but they're the ONLY route to their
                  sheets, and hiding wayfinding costs more than it saves. The
                  real density problem was five different component types with
                  five different visual weights. One featherweight row per
                  surface, uniform metrics, importance-ordered: attention
                  first, meaning last. */}
              {(() => {
                // ELEGANT below-fold ends clean at DO/WATCH/STAND (host "this needs attention"
                // 2026-07-18): this section navigator duplicates the eyebrow nav's "Jump to a
                // section", so it's dropped here to keep the below-fold calm. Non-elegant keeps it.
                if (elegantMode) return null;
                const trunc = (s, n) => { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…' : t; };
                const meaningText = String(event.must_have_moment || event.meaning_why || event.honoree_story || '');
                const rows = [
                  // SSOT #1 ROOT FIX — the guard used to be needsAttention/missing only.
                  // needsAttention is (total - booked), so once every vendor was BOOKED
                  // this row returned null and vanished from the what's-left index — taking
                  // the "· N to confirm" disclosure with it. The disclosure was unreachable
                  // in the exact state it was written for. `toConfirm` now keeps the row
                  // alive while any confirm is open (counts come from the canonical rollup).
                  rollup && rollup.counts && rollup.counts.total > 0
                    && (rollup.counts.needsAttention > 0 || rollup.counts.missing > 0 || rollup.counts.toConfirm > 0)
                    ? { key: 'people', label: 'People you’re hiring', sub: (() => {
                        const { ready, total, toConfirm, confirmed } = rollup.counts;
                        if (ready < total) return ready + ' of ' + total + ' booked';
                        return toConfirm > 0 ? 'all booked · ' + toConfirm + ' to confirm' : 'all ' + confirmed + ' locked in';
                      })(), attn: true, /* registry-gap: booking PROGRESS lives in the canonical vendor rollup (rollup.counts), not the raise ledger — no SURFACES id covers "not yet booked", and the row only renders in needs-you states. The completeness test counts this exact marker; add a real raiser before adding another. */ go: () => { if (!routeSheet(rollup.target)) setSheet({ kind: 'vendors' }); } } : null,
                  // VENDOR-ENTRY-POINT FIX: the row above only ever appears once
                  // vendors already exist AND need attention — a fresh event with
                  // zero vendors had no reachable way in at all (sheet.kind:'vendors'
                  // existed and rendered "No vendors on this event yet." with no add
                  // action, but nothing ever opened it). This calm, non-urgent row
                  // is the actual first door in; it steps aside once real vendors
                  // exist and the urgent row above takes over.
                  (!rollup || !rollup.counts || rollup.counts.total === 0) && vendorPlan.relevant
                    ? { key: 'vendors_suggest', label: 'People you might hire', sub: vendorPlan.categories.length + ' roles this kind of event usually needs', go: () => setSheet({ kind: 'vendors' }) } : null,
                  foodPlan && foodPlan.itemCount > 0 && foodPlan.boughtCount < foodPlan.itemCount
                    ? { key: 'food', label: 'The spread & shopping', sub: 'food & drinks · ' + foodPlan.boughtCount + ' of ' + foodPlan.itemCount + ' bought', go: () => setSheet({ kind: 'food' }) } : null,
                  crab.relevant
                    ? { key: 'crab', label: 'The crab order', sub: crab.lines && crab.lines.length ? (crab.mixedSummary || ('about ' + crab.totalEstimatedCrabs + ' crabs')) : 'not started', go: () => setSheet({ kind: 'crabs' }) } : null,
                  ((capacity && (capacity.items || []).length > 0) || helpers.length > 0)
                    ? { key: 'space', label: 'Space, seats & helpers', sub: helperPeople.length ? helperPeople.length + (helperPeople.length === 1 ? ' person helping' : ' people helping') : 'sized to your count', go: () => setSheet({ kind: 'space' }) } : null,
                  // Sprint 1 seating: only once a real roster has confirmed
                  // guests — headcount events never get invented names to seat.
                  seating.hasRoster && seating.totals.confirmed > 0
                    ? {
                        key: 'seating', label: 'Who sits where',
                        sub: seating.totals.allSeated
                          ? 'everyone’s seated'
                          : seating.totals.seated + ' of ' + seating.totals.confirmed + ' confirmed guests seated',
                        // WAVE-5: attention state comes from the raise ledger, not the
                        // local predicate — the sub above may still READ local totals
                        // for its label, but only the registry decides "needs you".
                        // WAVE-6 (one number per row — the risks row's own rule): the
                        // seating raise is an AGGREGATE (one raise however many guests
                        // are unseated), so a ledger "1" beside the sub's own "3 of 8
                        // seated" would just contradict it. Tint only, no badge.
                        attn: (raised['seating'] || 0) > 0,
                        go: () => setSheet({ kind: 'seating' }),
                      } : null,
                  // DESTINATION-2: lodging gets a row ONLY for destination
                  // events (the engine's relevant flag — Phase 1's one gate).
                  // The sub is honest per mode: a real not-booked count in
                  // roster mode, the place (or its absence) otherwise.
                  travel.relevant
                    ? {
                        key: 'lodging', label: 'Where everyone stays',
                        sub: travel.lodging.notBookedCount != null && travel.lodging.roster.length > 0
                          ? (travel.lodging.notBookedCount > 0
                              ? travel.lodging.notBookedCount + ' of ' + travel.lodging.roster.length + ' haven’t booked yet'
                              : 'everyone has a room lined up')
                          : (travel.lodging.hotelName || 'no place picked yet'),
                        // WAVE-6 (one number per row): the lodging raise is an aggregate —
                        // the sub already carries the real count ("3 of 8 haven't booked").
                        // Tint only, no ledger badge beside it.
                        attn: (raised['lodging'] || 0) > 0,
                        go: () => setSheet({ kind: 'lodging' }),
                      } : null,
                  // DESTINATION-2 slice 3: getting here, same gate. The sub is
                  // honest per mode — a real flight-info count (and any real
                  // conflicts) in roster mode, the airports card otherwise.
                  travel.relevant
                    ? (() => {
                        const arr = travel.air;
                        const have = arr.roster.filter(r => r.hasFlightInfo).length;
                        const nc = (arr.conflicts || []).length;
                        return {
                          key: 'air', label: 'Getting here',
                          sub: travel.rosterMode && arr.roster.length > 0
                            ? (nc > 0
                                ? nc + ' flight' + (nc === 1 ? '' : 's') + ' cut' + (nc === 1 ? 's' : '') + ' into the day'
                                : have > 0 ? have + ' of ' + arr.roster.length + ' have flight info' : 'no flight info yet')
                            : (arr.airportOptions.length > 0
                                ? arr.airportOptions.length + ' airport' + (arr.airportOptions.length === 1 ? '' : 's') + ' listed'
                                : 'no airports listed yet'),
                          // WAVE-6 (one number per row): air KEEPS its ledger badge — the
                          // registry raises PER CONFLICT here, so the ledger count IS the
                          // row's natural count, not a second number beside one.
                          attn: (raised['travel-air'] || 0) > 0,
                          n: raised['travel-air'] || 0,
                          go: () => setSheet({ kind: 'air' }),
                        };
                      })()
                    : null,
                  // DESTINATION-2 slice 2: getting around, same gate. The sub
                  // is honest per mode — real ride math once anyone on the
                  // roster has spoken, the decision's actual state otherwise.
                  travel.relevant
                    ? (() => {
                        const gr = travel.ground;
                        const spoken = travel.rosterMode && gr.roster.some(r => r.status !== 'not_set');
                        return {
                          key: 'ground', label: 'Getting around',
                          sub: spoken
                            ? (gr.needRide.length > 0
                                ? gr.needRide.length + ' need a ride · ' + gr.offeredSeats + ' seat' + (gr.offeredSeats === 1 ? '' : 's') + ' offered'
                                : 'no one needs a ride right now')
                            : (gr.transportProvided === true ? 'a shuttle or van is the plan'
                              : gr.transportProvided === false ? 'everyone gets themselves around'
                              : 'group transport not decided yet'),
                          // WAVE-6 (one number per row): the ground raise is an aggregate
                          // (one raise for the whole ride gap; the sub carries the real
                          // "N need a ride" math). Tint only, no ledger badge.
                          attn: (raised['travel-ground'] || 0) > 0,
                          go: () => setSheet({ kind: 'ground' }),
                        };
                      })()
                    : null,
                  // DESTINATION-3: who pays for what, same gate. The sub is
                  // the engine's honest read — dollars appear only when the
                  // host entered them; the pool is never totaled.
                  travel.relevant
                    ? (() => {
                        const cs = costSharingSummary(event);
                        return {
                          key: 'costshare', label: 'Who pays for what',
                          sub: !cs.pooled ? 'everyone covers their own'
                            : cs.tierCount === 0 ? 'pool set up — no tiers yet'
                            : cs.pricedTierCount === 0 ? cs.tierCount + ' tier' + (cs.tierCount === 1 ? '' : 's') + ', amounts not set'
                            : cs.tierCount + ' tier' + (cs.tierCount === 1 ? '' : 's') + ' · ' + fmt(cs.lowestDue) + (cs.highestDue !== cs.lowestDue ? '–' + fmt(cs.highestDue) : '') + (cs.cadence ? ' ' + cs.cadence : ''),
                          go: () => setSheet({ kind: 'costshare' }),
                        };
                      })()
                    : null,
                  riskCount > 0
                    // WAVE-5: the row tints only when the registry actually raises a
                    // high risk — "N to know about" alone is information, not an ask.
                    // No count badge: the sub's count means "to know about", and a
                    // second (smaller) ledger number beside it would just contradict it.
                    ? { key: 'risks', label: 'What could go wrong', sub: riskCount + ' to know about', attn: (raised['risks'] || 0) > 0, go: () => setSheet({ kind: 'risks' }) } : null,
                  !isPast
                    ? { key: 'meaning', label: hasMeaning ? 'The moment that must happen' : 'Make it yours', sub: hasMeaning ? trunc(meaningText, 36) : 'the story, the feeling', go: openMeaning } : null,
                ].filter(Boolean);
                if (!rows.length) return null;
                return (
                  <div className="qidx">
                    {rows.map(r => (
                      <button key={r.key} className="qidx-row" onClick={r.go}>
                        <span className="qidx-l">{r.label}</span>
                        <span className={'qidx-s' + (r.attn ? ' attn' : '')}>{r.sub}</span>
                        {/* The ledger's own count — a badge that counts something real
                            (raiseCounts) and clears the moment the work clears. */}
                        {(r.n || 0) > 0 ? <span className="qidx-n">{r.n}</span> : null}
                        <span className="chev" aria-hidden="true">›</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
              {lastLesson && (
                <p className="grounding" style={{ margin: '14px 0 0' }}>
                  From your last {String(event.type).toLowerCase()}: “{lastLesson.lessons.slice(0, 70)}{lastLesson.lessons.length > 70 ? '…' : ''}”
                </p>
              )}
              {String(event.venue || '').trim() && needsCity() && !venueBlockerShown && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>What city, state (or ZIP)? Weather and maps need it.</span>
                  <CityField value={cityDraft} onChange={setCityDraft} onPick={setCityDraft} onEnter={saveCity}
                    placeholder="Annapolis, MD" ariaLabel="City, state or ZIP"
                    style={{ maxWidth: 150, flex: '0 1 150px' }}
                    inputStyle={{ fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} />
                  <button className="mini" onClick={saveCity}>Save</button>
                </div>
              )}
            </section>
          )}

          {/* ══════════ THE DAY — live command surface on the day itself,
              walkthrough preview any other day ══════════ */}
          {stage === 'day' && liveDay && (
            <section className="day-sec" role="main">
              <div className="eyebrow">
                {dayAllDone ? 'All clear — that’s a wrap' : nowActive ? 'Today · live' : dayStarted ? 'Today · next up' : 'Today · starts soon'}
                {' · '}{new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              {/* The REAL wall-clock — ticks every 30s; the day tells the host
                  where it is, the host never hunts for their place. */}
              <div className="clock">
                {(() => { const h = Math.floor(nowMin / 60); const m = nowMin % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
              </div>
              {dayWhispers.length > 0 && (
                <div className="pills" style={{ margin: '-14px 0 18px' }}>
                  {dayWhispers.map(w => <span key={w} className="pill p-ok" style={{ cursor: 'default' }}>{w}</span>)}
                </div>
              )}
              {/* Day alerts — the SAME engine the production app reads
                  (lib/dayAlerts): what needs you RIGHT NOW, three calm tiers. */}
              {rosOverlaps > 0 && (
                <div className="later-row" style={{ background: 'var(--warn-tint)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 'var(--sp-2)' }}>
                  <span className="t" style={{ color: 'var(--warn)', fontWeight: 650 }}>
                    {rosOverlaps} run-of-show {rosOverlaps === 1 ? 'moment overlaps' : 'moments overlap'} another — worth a look before things collide.
                  </span>
                </div>
              )}
              {nudgeFor('program')}
              {(() => {
                let sugg = [];
                try { sugg = suggestableMoments(event.type, ros) || []; } catch { sugg = []; }
                if (!sugg.length) return null;
                const m = sugg[0];
                return (
                  <div className="later-row" style={{ marginTop: 14, marginBottom: 'var(--sp-2)' }}>
                    <span className="t" style={{ color: 'var(--carbon-muted)', fontWeight: 550, fontSize: 'var(--t-row-sub)' }}>
                      Worth a spot on the schedule: {m.label || m.title || m.name}
                    </span>
                    <button className="mini" onClick={() => {
                      try {
                        const seg = buildMomentSegment(m);
                        if (!seg) return;
                        // WAVE-B fix: append to the EFFECTIVE schedule + rosEdited
                        // (legacy's setRos shape). The old write appended to the
                        // stored ros without the ownership flag, so on a playbook
                        // event effectiveRos kept returning the derived schedule
                        // and the added moment never appeared anywhere.
                        const rosNext = [...ros, { ...seg, id: 'm-' + Math.random().toString(36).slice(2, 9) }];
                        patchEvent({ ros: rosNext, rosEdited: true }, (m.label || 'The moment') + ' is on the schedule — give it a time when you know it.');
                      } catch { toast('Couldn’t add it.'); }
                    }}>Add it</button>
                  </div>
                );
              })()}
              {dayAlerts.map(a => (
                <button key={a.id} onClick={() => alertSheet(a)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--r-row)', padding: 'var(--sp-3) 14px', marginBottom: 'var(--sp-2)', font: 'inherit',
                    background: a.tier === 'critical' ? 'var(--danger-tint)' : a.tier === 'warning' ? 'var(--warn-tint)' : 'var(--steel-tint)',
                    color: 'var(--carbon-text)',
                  }}>
                  {/* WAVE-5 (visual): critical vs warning used to differ by HUE alone —
                      identical in grayscale. One mechanism, a tier word chip — the WORD
                      carries the tier, color just agrees with it. The calm info tier
                      stays chipless: no chip is itself the third form.
                      WAVE-6 (e): the critical word was "Now" — the third "Now" on this
                      screen ("Happening now", the walkthrough's "Now" header). Renamed
                      "Can't wait": the same urgency in host words (the app already says
                      "This can't wait" on day-of venue copy), zero collision.
                      WAVE-6 (b): critical text on dark grounds reads --danger-text
                      (theme.js — measured ≥5.5:1 on every day-of ground; --danger and
                      --danger-solid stay fill anchors). */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(a.tier === 'critical' || a.tier === 'warning') && (
                      <span style={{ flexShrink: 0, fontSize: 'var(--t-caption-min)', fontWeight: 800, letterSpacing: 'var(--tracking-2)', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 'var(--r-pill)', color: a.tier === 'critical' ? 'var(--danger-text)' : 'var(--warn)', background: 'var(--bg-band)' }}>
                        {a.tier === 'critical' ? 'Can’t wait' : 'Watch'}
                      </span>
                    )}
                    <span style={{ minWidth: 0, fontSize: 'var(--t-body-s)', fontWeight: 750, color: a.tier === 'critical' ? 'var(--danger-text)' : a.tier === 'warning' ? 'var(--warn)' : 'var(--steel-soft)' }}>{a.headline}</span>
                  </span>
                  {a.move && <span style={{ display: 'block', fontSize: 'var(--t-row-sub)', marginTop: 2, color: 'var(--carbon-muted)' }}>{a.move}</span>}
                </button>
              ))}
              {dayAllDone ? (
                // Shared DAY_COMPLETE_COPY (lib/dayOfCopy.js) — same words
                // legacy renders, not a separately-authored version.
                <div className="now-card" style={{ borderColor: 'var(--ok)', marginTop: 6, background: 'var(--ok-tint)', boxShadow: '0 0 28px -8px rgba(79,174,122,.4)' }}>
                  <div className="now-label" style={{ color: 'var(--ok)' }}>{DAY_COMPLETE_COPY.eyebrow}</div>
                  <h2>{DAY_COMPLETE_COPY.headline}</h2>
                  <p className="meta">{DAY_COMPLETE_COPY.body}</p>
                </div>
              ) : nowCue && (
                // "Green means live" — ported from legacy's day-of spine (App.js
                // ~34667: live-bordered card, tinted background, glow) so the
                // ONE moment actually happening now reads unmistakably
                // different from "up next"/"up first", which stay neutral.
                <div className="now-card" style={nowActive
                  ? { marginTop: 6, borderColor: 'var(--ok)', background: 'var(--ok-tint)', boxShadow: '0 0 28px -8px rgba(79,174,122,.4)' }
                  : { marginTop: 6 }}>
                  <div className="now-label" style={nowActive ? { color: 'var(--ok)' } : undefined}>{nowActive ? 'Happening now' : (dayStarted ? 'Next up' : 'Up first') + (nowCue.time ? ' · ' + nowCue.time : '')}</div>
                  <h2>{nowCue.segment}</h2>
                  <p className="meta">
                    {[nowActive && nowCue.time ? 'started ' + nowCue.time : null, nowCue.location, nowCue.owner && ('owner: ' + nowCue.owner), nowCue.vendorName].filter(Boolean).join(' · ')}
                  </p>
                  {nowCue.notes && <p className="meta">{nowCue.notes}</p>}
                  {/* Vendor operational line — the cue's vendor with their
                      arrival + ON-SITE contact (day-of cell beats office line)
                      and a real call link. */}
                  {(() => {
                    const v = (event.vendors || []).find(x => x && (x.id === nowCue.vendorId || (nowCue.vendorName && x.name === nowCue.vendorName)));
                    if (!v) return null;
                    const phone = v.dayOfPhone || v.phone || '';
                    const who = v.dayOfContactName || v.contactName || v.name;
                    if (!phone && !v.arrivalTime) return null;
                    return (
                      <p className="meta" style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        {[v.arrivalTime ? 'arrives ' + v.arrivalTime : null, who && who !== v.name ? 'on-site: ' + who : null].filter(Boolean).join(' · ')}
                        {phone ? <a className="mini" style={{ textDecoration: 'none' }} href={'tel:' + String(phone).replace(/[^+\d]/g, '')}>Call {String(who).split(/\s+/)[0]}</a> : null}
                      </p>
                    );
                  })()}
                  <button className="cta" style={{ marginTop: 6 }} onClick={() => {
                    // Same single-truth write as ever: per-cue rosDone only; the
                    // NOW cue re-derives, so this IS the advance.
                    if (nowCue.id) {
                      patchEvent({ rosDone: { ...(event.rosDone || {}), [nowCue.id]: true } }, null);
                      if (!solemn && openCues.length === 1) feedback('magic');
                    }
                  }}>
                    {solemn ? 'Continue when ready' : (openCues.length === 1 ? 'Done — that’s the last one' : 'Done — what’s next')}
                  </button>
                </div>
              )}
              {cuesAfterNow.length > 0 && (
                <div className="then">
                  {/* Bridges the Happening Now bounding box straight into the
                      spine rail below, so the green reads as one continuous
                      live thread — legacy runs the rail green for the whole
                      day-of, not just behind the NOW box (App.js ~34635). */}
                  <div className="then-spine-link" aria-hidden="true" />
                  <div className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>{solemn ? 'The rest, in their time' : <>Then · {cuesAfterNow.length} more moment{cuesAfterNow.length === 1 ? '' : 's'}</>}</div>
                  <div className="then-spine">
                  {cuesAfterNow.slice(0, 7).map((r, i) => {
                    const m = cueMins(r.time);
                    const behind = m !== null && m < nowMin;
                    return (
                      // Tappable: a behind-schedule host records finished-late work
                      // right on the row (same single-truth rosDone write) — the
                      // NOW card alone can't reach a cue whose time already passed.
                      <button className={'then-row' + (behind ? ' is-behind' : i === 0 ? ' is-next' : '')} key={r.id || i}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--carbon-line)', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
                        onClick={() => { if (r.id) patchEvent({ rosDone: { ...(event.rosDone || {}), [r.id]: true } }, 'Recorded: ' + String(r.segment || '').slice(0, 44) + '…'); }}>
                        <span className="dot" aria-hidden="true" />
                        <span className="d" style={behind ? { color: 'var(--warn)', fontWeight: 800 } : i === 0 ? { color: 'var(--steel-soft)', fontWeight: 800 } : undefined}>
                          {behind ? 'BEHIND · ' + (r.time || '') : i === 0 ? 'NEXT · ' + (r.time || '') : r.time}
                        </span>
                        <span>{r.segment}{r.vendorName ? ' — ' + r.vendorName : ''}{(() => {
                          const v = (event.vendors || []).find(x => x && (x.id === r.vendorId || (r.vendorName && x.name === r.vendorName)));
                          return v && v.arrivalTime ? <span style={{ color: 'var(--carbon-muted)' }}> · arrives {v.arrivalTime}</span> : null;
                        })()}</span>
                      </button>
                    );
                  })}
                  {cuesAfterNow.length > 7 && <div className="then-row"><span className="dot" aria-hidden="true" /><span className="d" /><span style={{ color: 'var(--carbon-muted)' }}>+ {cuesAfterNow.length - 7} more, through the last item</span></div>}
                  </div>
                </div>
              )}
              {ros.some(r => r && r.done) && !dayAllDone && (
                <p className="grounding" style={{ marginTop: 'var(--sp-3)', color: 'var(--carbon-muted)' }}>
                  {ros.filter(r => r && r.done).length} already run — the day has them.
                </p>
              )}
              {dayHelpers.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Who’s helping · {dayHelpers.length}</div>
                  {dayHelpers.map((h, i) => (
                    <div className="then-row" key={i} style={{ alignItems: 'center' }}>
                      <span aria-hidden style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                        background: 'var(--steel-tint)', color: 'var(--steel-soft)',
                      }}>{String(h.name).trim().charAt(0).toUpperCase()}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700 }}>{h.name}
                          {h.coi && h.coi.label ? <span className="tag plan" style={{ marginLeft: 'var(--sp-2)', color: h.coi.level === 'safe' ? 'var(--muted)' : 'var(--warn)', background: h.coi.level === 'safe' ? 'var(--bg-band)' : 'var(--warn-tint)' }}>{h.coi.label}</span> : null}
                        </span>
                        <span style={{ display: 'block', fontSize: 'var(--t-row-sub)', color: 'var(--carbon-muted)' }}>{h.role}</span>
                      </span>
                      <span className="d" style={{ minWidth: 0 }}>{h.time || ''}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10 }}>
                    <button className="cta soft" style={{ width: '100%' }} onClick={() => { try { openDraft('Everyone’s part today', draftHelperBrief(event, profile, { ros })); } catch { toast('Couldn’t draft it.'); } }}>
                      Draft the helper brief
                    </button>
                    <div className="pill-grid" style={{ marginTop: 'var(--gap-chip)' }}>
                      <button className="mini" onClick={() => window.print()}>Print the day sheet</button>
                      {(event.venue || event.venueCity) && <button className="mini" onClick={() => { try { openDraft('Parking instructions', draftParkingInstructions(event)); } catch { toast('Couldn’t draft it.'); } }}>Parking note</button>}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          {stage === 'day' && !liveDay && (
            <section className="day-sec" role="main">
              <div className="eyebrow">{event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date'} · {isPast ? 'as it ran' : 'preview'}</div>
              {days === 0 && rosState === 'untimed' && (
                <p className="grounding" style={{ margin: 'var(--sp-2) 0 0', color: 'var(--carbon-muted)' }}>
                  These moments don’t have times yet — the live clock takes over once times are set. Walking through by hand still records what’s done.
                </p>
              )}
              {ros.length > 0 && (
                <div className="picker" style={{ margin: 'var(--sp-3) 0' }}>
                  <button className="chip" style={{ padding: 'var(--sp-1) 10px', fontSize: 'var(--t-pill)' }} aria-pressed={dayView === 'walk'} onClick={() => setDayView('walk')}>Walk it</button>
                  <button className="chip" style={{ padding: 'var(--sp-1) 10px', fontSize: 'var(--t-pill)' }} aria-pressed={dayView === 'list'} onClick={() => setDayView('list')}>Full agenda</button>
                </div>
              )}
              {ros.length > 0 && dayView === 'list' ? (
                <>
                  {/* Day-Preview agenda-list (task #54 candidate): the whole day as
                      one scannable list — a planner can see gaps, ownership, and
                      collisions at a glance instead of stepping one moment at a time.
                      Same effectiveRos source as the stepper; overlaps flagged inline. */}
                  {rosOverlaps > 0 && (
                    <div className="later-row" style={{ margin: '0 0 var(--sp-3)', background: 'var(--warn-tint)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) 14px' }}>
                      <span className="t" style={{ color: 'var(--warn)', fontWeight: 700 }}>{rosOverlaps} {rosOverlaps === 1 ? 'moment overlaps' : 'moments overlap'} another — flagged below.</span>
                    </div>
                  )}
                  {/* THE START TIME, PROPOSED AND OWNED (2026-07-14).
                      The schedule used to manufacture clock times out of nothing: with only
                      "afternoon" it printed 3:00 PM, and with nothing at all it anchored the
                      whole day to a bare 15:00 — times that were shown as fact, SENT TO
                      VENDORS in the brief, and frozen into event.ros the moment the host
                      edited any row. The order of the day is real; the hours were invented.

                      Now the rows say what they actually know ("2h before guests arrive"),
                      and the host is offered the one decision that turns all of it into real
                      times. V2 had NO start-time editor at all — the field existed in the
                      model and nothing could write it — so this is both the proposal and the
                      capture. Grounded: the seed is the host's OWN time-of-day bucket, and we
                      say so. Nothing is written until they tap. */}
                  {ros.length > 0 && ros.some(r => !r.time) && (() => {
                    // THE START TIME — GROUNDED, PROPOSED, THE HOST'S TO CHANGE (2026-07-14).
                    //
                    // This used to be invented: with only "afternoon" the schedule printed
                    // 3:00 PM, and with nothing at all it anchored the whole day to a bare
                    // 15:00 — times shown as fact, SENT TO A CATERER as their load-in, and
                    // frozen into event.ros on the first edit. The rows now say what they
                    // actually know ("2h before guests arrive"), and this offers the one
                    // decision that turns all of them into real times.
                    //
                    // The proposal is GROUNDED, not guessed (lib/startTime.js). weather.js
                    // has been computing a REAL sunset for the event's date and city this
                    // whole time — "real, computed — never fabricated", its own words — and
                    // NOTHING CONSUMED IT. An outdoor event should finish in the light, and
                    // the playbook authors its own typical run-length, so:
                    //
                    //    "Sunset is 8:14 PM that day, and a crab feast runs about 4 hours —
                    //     so a 3:44 PM start has you finishing in the light."
                    //
                    // Every number in that sentence is real. With no forecast we fall back to
                    // the host's OWN time-of-day word (their statement, made precise — and we
                    // say so). With neither, we propose NOTHING rather than invent.
                    const prop = (() => { try { return proposeStartTime(event, wx); } catch (_e) { return null; } })();
                    // RE-AUDIT (fresh-eyes, 2026-07-14): with a DERIVED default start time the
                    // run of show now honestly shows relative labels — which makes THIS block
                    // reachable in a third state: a time exists, but it is OURS. proposeStartTime
                    // returns null then (a time is set), so the old copy fell through to
                    // "no clock" — wrong. Say what is actually true: we set it, here's why,
                    // one tap makes it yours and puts the whole day on the clock.
                    const derived = String(event.startTimeSource || '') === 'derived' && String(event.startTime || '').trim();
                    return (
                      <div className="later-row" style={{ margin: '0 0 var(--sp-3)', background: 'var(--card)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) 14px' }}>
                        <p className="grounding" style={{ margin: 0 }}>
                          {derived
                            ? <><b>We pencilled in {(() => { const [h, m] = String(event.startTime).split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`; })()} — not you.</b> Confirm it and every line below becomes a real clock time.</>
                            : <>These moments are in order but not on a clock — set a start time and every line below becomes a real one.</>}
                        </p>
                        <div className="actions-row" style={{ marginTop: 'var(--sp-2)', alignItems: 'center' }}>
                          <span className="of">guests arrive:</span>
                          <input className="field" type="time" style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                            value={event.startTime || ''}
                            onChange={e => patchEvent({ startTime: e.target.value, startTimeSource: 'host' }, 'Start time set — the whole day reads from it now.')}
                            aria-label="What time guests arrive" />
                          {derived ? (
                            <button className="mini" onClick={() => patchEvent({ startTimeSource: 'host' },
                              'Start time confirmed — the whole day reads from it now.')}>
                              that’s right
                            </button>
                          ) : prop && (
                            <button className="mini" onClick={() => patchEvent({ startTime: prop.hhmm, startTimeSource: 'host' },
                              'Start time set — the whole day reads from it now.')}>
                              use {prop.label}
                            </button>
                          )}
                        </div>
                        {derived && event.startTimeWhy
                          ? <p className="grounding" style={{ margin: '6px 0 0', opacity: .85 }}>{event.startTimeWhy}</p>
                          : prop && <p className="grounding" style={{ margin: '6px 0 0', opacity: .85 }}>{prop.why}</p>}
                      </div>
                    );
                  })()}
                  <div className="agenda">
                    {ros.map((r, i) => {
                      const prev = ros[i - 1];
                      const clash = !!(r && r.time && prev && prev.time && r.time <= prev.time);
                      return (
                        <div className={'then-row' + (r.done ? ' is-done' : '')} key={r.id || i} style={{ alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                          {/* A row without a clock is not an unknown row — it is a row whose
                              ORDER we know and whose HOUR the host has not given us. Show the
                              knowledge we have ("2h before guests arrive"), not an em-dash and
                              not an invented "15:00". */}
                          <span className="d" style={{ minWidth: 54 }}>{r.time || (r.rel ? '·' : '—')}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>{r.segment}{r.vendorName ? ' — ' + r.vendorName : ''}{r.owner && r.owner !== r.vendorName ? <span style={{ color: 'var(--carbon-muted)' }}> · {r.owner}</span> : null}
                            {!r.time && r.rel && <span style={{ color: 'var(--carbon-muted)' }}> · {r.rel}</span>}</span>
                          {clash && <span className="tag plan" style={{ color: 'var(--warn)', background: 'var(--warn-tint)' }}>overlaps</span>}
                          {r.done && <span className="tag plan" style={{ color: 'var(--ok)', background: 'var(--ok-tint)' }}>done</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : ros.length === 0 ? (
                <>
                  <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.08 }}>No run of show yet</h1>
                  <p className="day-empty">Your day schedule fills in as vendors and their arrival times settle — then this screen becomes one thing at a time, in the order the day runs.</p>
                  {/* Per-screen audit: the old empty state told a real host to “Try the
                      Wedding” (a demo) with no real action. The run of show is built from
                      vendor arrival times, so route to the surface that populates it. */}
                  <button className="cta" style={{ marginTop: 18 }} onClick={() => setSheet({ kind: 'vendors' })}>Add vendors &amp; arrival times</button>
                </>
              ) : dayIdx >= ros.length ? (
                <>
                  <div className="clock" style={solemn ? { fontSize: 'clamp(30px,10cqw,40px)', fontFamily: 'var(--serif-read)', fontWeight: 500, letterSpacing: '-.01em' } : { fontSize: 'clamp(34px,11cqw,44px)', fontWeight: 700, letterSpacing: '-.03em' }}>{solemn ? 'That’s all of it. Thank you for carrying today.' : 'That’s the whole day.'}</div>
                  <p className="day-empty">All {ros.length} moments walked through, in order, from the real run of show.</p>
                  <button className="cta" style={{ marginTop: 18 }} onClick={() => setDayIdx(0)}>Walk it again</button>
                </>
              ) : (
                <>
                  {/* Figma 331:61: NO giant clock — the time rides in the eyebrow ("10:30 · NOW"),
                      the MOMENT NAME is the hero. "Walk it" shows ONE calm moment; the full editable
                      list lives in "Full agenda". */}
                  {/* PROPOSE-DON'T-ASK (the day-of ruling) — the SAME three-state proposal the Full-agenda
                      renderer uses above (6740), surfaced in the Walk-it view so both modes offer it
                      consistently: an untimed day pencils the WHOLE run of show from one grounded start
                      (not nine taps). Accepting writes event.startTime; playbookRunOfShow reflows every
                      moment to a real clock. Handles: OUR derived guess awaiting a yes · a fresh proposal. */}
                  {!isPast && !ros.some(r => r && r.time) && (() => {
                    let prop = null; try { prop = proposeStartTime(event, wx); } catch (_e) { prop = null; }
                    const derived = String(event.startTimeSource || '') === 'derived' && String(event.startTime || '').trim();
                    if (!prop && !derived) return null;
                    // Composed from the parity kit at COMPACT density — same propose atoms as
                    // budget B1, tighter card rhythm. The eyebrow/why/accept shape is the
                    // shared Propose-Don't-Ask primitive (day-of 331:61 + budget 344:61).
                    return (
                      <div className="now-card" style={{ marginBottom: 'var(--sp-3)', borderColor: 'var(--steel-muted)' }}>
                        <Eyebrow tone="steel">{derived ? 'We pencilled the times — not you' : 'Want me to pencil in times?'}</Eyebrow>
                        <Grounding gap={ASK_COMPACT.eyebrowToValue}>
                          {derived
                            ? <>Confirm and every moment becomes a real clock. {event.startTimeWhy || ''}</>
                            : <>I’ll work back from a {prop.label} start so the whole day has a clock — nothing’s locked, nudge anything. {prop.why}</>}
                        </Grounding>
                        <CtaRow gap={ASK_COMPACT.whyToCta}>
                          <button className="cta"
                            onClick={() => derived
                              ? patchEvent({ startTimeSource: 'host' }, 'Start time confirmed — the whole day reads from it now.')
                              : patchEvent({ startTime: prop.hhmm, startTimeSource: 'host' }, 'Penciled the day from your ' + prop.label + ' start — nudge any time you like.')}>
                            {derived ? 'That’s right — pencil them in' : 'Yes, pencil them in'}
                          </button>
                        </CtaRow>
                      </div>
                    );
                  })()}
                  {(() => {
                    const cur = ros[dayIdx];
                    // Split the one long ROS segment into a short NAME + a guide sentence, the way
                    // Figma 331:61 does ("Final plating." + "Fill the chafing dishes…"). Runtime
                    // moments carry a single string; the first clause before a colon/semicolon is
                    // the name, the rest is the guide. No delimiter → the whole thing is the name.
                    const seg = String(cur.segment || 'This moment').trim();
                    const sm = seg.match(/^(.{3,42}?)\s*[:;]\s+(.+)$/);
                    let name = sm ? sm[1].trim() : seg;
                    if (!/[.!?]$/.test(name)) name += '.';           // Figma names close with a period
                    const guide = (sm ? sm[2] : (cur.notes || '')).replace(/\s*;\s*/g, ', ').trim();
                    const timeSet = !!cur.time;
                    const editing = cur.id && timeEditIds.has(cur.id);
                    const ownerNamed = cur.owner && !/^(you|host|me)$/i.test(String(cur.owner).trim());
                    const ownerPhrase = solemn ? 'You lead this' : (ownerNamed ? cur.owner + ' runs this' : 'You run this');
                    return (
                      <div style={{ marginTop: 'var(--sp-2)' }}>
                        {/* Eyebrow: time-set promotes to a live "10:30 · NOW" (state 2); otherwise the calm sequence label (state 1). */}
                        <div className="now-label" style={timeSet ? { color: 'var(--warn)' } : undefined}>
                          {timeSet ? fmt12h(cur.time) + ' · NOW · you run this' : (dayIdx === 0 ? (isPast ? 'How it started' : 'Today · you run it') : 'Now')}
                        </div>
                        {dayIdx === 0 && !timeSet && !solemn && <div className="of" style={{ marginTop: 6, color: 'var(--muted)' }}>First thing</div>}
                        {/* The moment NAME is the hero (Figma). Solemn → the calm serif leads. */}
                        <h2 style={solemn
                          ? { fontFamily: 'var(--serif-read)', fontWeight: 500, fontSize: 'var(--t-display-l)', letterSpacing: '-.01em', lineHeight: 1.12, margin: 'var(--sp-3) 0 0' }
                          : { fontFamily: 'var(--sans)', fontWeight: 750, fontSize: 'var(--t-display-l)', letterSpacing: '-.02em', lineHeight: 1.1, margin: 'var(--sp-3) 0 0' }}>{name}</h2>
                        {/* The guide sentence — the host GUIDE VOICE (Newsreader italic). */}
                        {guide && <p style={{ fontFamily: 'var(--serif-read)', fontStyle: 'italic', color: 'var(--sec)', fontSize: 'var(--t-input)', lineHeight: 1.45, margin: 'var(--sp-2) 0 0' }}>{guide}</p>}
                        {/* ONE honest line — owner · time. Set → the clock; unset → "Set a time ›" (no fake clock).
                            The full time+owner editor lives in Full agenda; Walk it stays calm. */}
                        <p className="meta" style={{ margin: 'var(--sp-4) 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: timeSet ? 'var(--warn)' : 'var(--steel-soft)', display: 'inline-block', flexShrink: 0 }} />
                          <span>{ownerPhrase}</span>
                          {!isPast && cur.id ? ((timeSet || editing) ? (
                            <input id="ros-cue-time" className="field" type="time" style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                              value={cur.time || ''} autoFocus={!cur.time}
                              onChange={e => { writeRosCue(cur.id, { time: e.target.value }, e.target.value ? (cur.segment || 'This moment') + ' — ' + e.target.value + ' on the schedule.' : (cur.segment || 'This moment') + ' — time cleared.'); }}
                              aria-label={'Time for ' + (cur.segment || 'this moment')} />
                          ) : (<>
                            <span aria-hidden="true" style={{ color: 'var(--faint)' }}>·</span>
                            {cur.rel && <span style={{ color: 'var(--steel-soft)' }}>~ {cur.rel}</span>}
                            <button onClick={() => setTimeEditIds(s => { const n = new Set(s); n.add(cur.id); return n; })}
                              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--steel-soft)', fontWeight: 600, cursor: 'pointer' }}>Set a time ›</button>
                          </>)) : null}
                        </p>
                        <button className="cta" style={{ marginTop: 'var(--sp-4)' }} onClick={() => {
                          const cue = cur;
                          // DAY-OF ONLY: write the per-cue done flag (event.rosDone; effectiveRos overlays it).
                          if (days === 0 && cue && cue.id) {
                            patchEvent({ rosDone: { ...(event.rosDone || {}), [cue.id]: true } }, null);
                            if (!solemn && dayIdx === ros.length - 1) feedback('magic');
                          } else {
                            feedback(!solemn && dayIdx === ros.length - 1 ? 'magic' : 'act');
                          }
                          setDayIdx(i => i + 1);
                        }}>
                          {solemn ? 'Continue when ready' : (dayIdx === ros.length - 1 ? 'Done — that’s the last one' : 'Done — next')}
                        </button>
                      </div>
                    );
                  })()}
                  {/* UP NEXT — just the SINGLE next moment, condensed (Figma 331:61). The whole
                      editable agenda lives in "Full agenda"; Walk it never dumps the list. */}
                  {dayIdx < ros.length - 1 && (() => {
                    const nx = ros[dayIdx + 1];
                    const nseg = String(nx.segment || '').replace(/\s*[:;]\s*/g, ' · ').replace(/,\s+/g, ' · ');
                    return (
                      <div className="then" style={{ marginTop: 'var(--sp-5)' }}>
                        <div className="eyebrow">{(solemn ? 'Then' : 'Up next') + (nx.time ? ' · ' + fmt12h(nx.time) : '')}</div>
                        <p style={{ margin: 'var(--sp-2) 0 0', color: 'var(--steel-soft)', fontSize: 'var(--t-input)', lineHeight: 1.4 }}>{nseg}{nx.vendorName ? ' · ' + nx.vendorName : ''}</p>
                      </div>
                    );
                  })()}
                  {/* Quiet count + print (Figma: "4 of 9 done · Print the day sheet"). */}
                  <div className="actions-row" style={{ marginTop: 'var(--sp-5)', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <span className="of">{ros.filter(r => r && r.done).length} of {ros.length} done</span>
                    <button className="mini" onClick={() => window.print()}>Print the day sheet</button>
                    {(event.venue || event.venueCity) && <button className="mini" onClick={() => { try { openDraft('Parking instructions', draftParkingInstructions(event)); } catch { toast('Couldn’t draft it.'); } }}>Parking note</button>}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ══════════ AFTER — real budget lines, honest tense ══════════ */}
          {stage === 'after' && (
            <section role="main">
              <div className="eyebrow">{isPast ? 'Afterward' : 'Preview — how it’ll wrap up'}</div>
              {/* Sans, not serif (font audit): After is an OPERATIONAL host-shell
                  tab, so its hero matches Plan's "56 days" / the sheet heroes (the
                  .mega sans display face). Serif stays reserved for the ceremonial
                  /editorial surfaces — welcome gate, invite, the create Reveal. */}
              <h1 className="mega" style={{ fontSize: 'var(--t-display-xl)', lineHeight: 1.08 }}>
                {isPast ? 'How it landed.' : 'How it’ll land.'}
              </h1>
              <p className="mega-sub">
                {money.planned
                  ? (money.committed <= money.planned
                    ? `${fmt(money.planned - money.committed)} of headroom against the ${fmt(money.planned)} plan so far.`
                    : `Running ${fmt(money.committed - money.planned)} over the ${fmt(money.planned)} plan.`)
                  : 'No budget yet — nothing to settle up when it’s over.'}
              </p>

              {/* HOST MODEL (Rule 4): the money reads as ONE number plus where
                  the plan priced it — never planner category rows. */}
              {(money.committed > 0 || money.planned > 0) && (
                <>
                  <div className="sect"><h2>The money</h2><div className="rule" /><span className="when">from your plan</span></div>
                  <div className="card no-hover"><div className="card-head">
                    {/* Same row-level CTA rule as the live Budget sheet — tapping
                        "Food & drinks" here opens the same food/shopping sheet for
                        reference, even after the event. Used to be inert divs
                        (cursor:default, no onClick) — the one thing on this whole
                        screen you couldn't tap into. */}
                    {hostRowsGo().map(r => (
                      <button key={r.label} className="line" style={{ width: '100%', background: 'none', border: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                        onClick={r.go} aria-label={'Open ' + r.label}>
                        <span>{r.label} <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span></span>
                        <span className="amt">{fmt(r.got)} <span className="of">of ~{fmt(r.est)}</span></span>
                      </button>
                    ))}
                    <div className="line total">
                      <span>{isPast ? 'Spent, all in' : 'Spoken for so far'}</span>
                      <span className={'amt' + (money.planned && money.committed <= money.planned ? ' under' : '')}>
                        {fmt(money.committed)}{money.planned ? ' · ' + (money.committed <= money.planned ? fmt(money.planned - money.committed) + ' under' : fmt(money.committed - money.planned) + ' over') : ''}
                      </span>
                    </div>
                  </div></div>
                </>
              )}

              <div className="sect"><h2>What carries forward</h2><div className="rule" /></div>
              <div className="empty" style={{ background: 'var(--steel-tint)' }}>
                {guests ? `${guests} guests planned` : 'No guest count'} · {handled.length} foundation fact{handled.length === 1 ? '' : 's'} on record · every budget line above stays saved. The thank-you is drafted right here from what actually happened; your “for next time” note below comes back the next time you plan one of these.
              </div>
              {/* Thank-yous & gifts — per-guest flags on the SAME roster rows the
                  wrap-up meter reads (phaseProgress post_event counts
                  thankYouSent), so thanking someone literally moves the meter. */}
              {isPast && (event.guests || []).some(g => g && g.rsvp === 'Yes') && (() => {
                const yesIdx = (event.guests || []).map((g, i) => ({ g, i })).filter(x => x.g && x.g.rsvp === 'Yes');
                const thanked = yesIdx.filter(x => x.g.thankYouSent === true).length;
                return (
                  <>
                    <div className="sect"><h2>Thank-yous</h2><div className="rule" /><span className="when">{thanked} of {yesIdx.length} sent</span></div>
                    <div className="card no-hover"><div className="card-head" style={{ cursor: 'default' }}>
                      {yesIdx.map(({ g, i }) => (
                        <div className="line" key={i} style={{ alignItems: 'center' }}>
                          <span>{g.name}{String(g.plusOne || '').trim() ? <span className="of"> +1</span> : null}</span>
                          <span style={{ display: 'flex', gap: 6 }}>
                            <button className="mini" style={g.giftReceived ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                              onClick={() => writeGuest(i, { giftReceived: !g.giftReceived }, null)}>
                              {g.giftReceived ? 'gift received' : 'gift?'}
                            </button>
                            <button className="mini" style={g.thankYouSent ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                              onClick={() => writeGuest(i, { thankYouSent: !g.thankYouSent }, g.thankYouSent ? null : ((g.name || 'Guest') + ' thanked — the wrap-up meter keeps count.'))}>
                              {g.thankYouSent ? 'thanked' : 'thank them'}
                            </button>
                          </span>
                        </div>
                      ))}
                      <p className="grounding" style={{ margin: 'var(--sp-2) 0 0' }}>“Thanked” feeds the wrap-up meter up top; gifts are just for your memory — and the note below writes itself from what actually happened.</p>
                    </div></div>
                  </>
                );
              })()}
              {/* The final number — teaches attendance learning (INTEL R1).
                  Production contract verbatim: applyReconciliation entry
                  {eventId, date, attendance:{planned, actual}} onto
                  profile.hostIntelligence. Once per event; past events only. */}
              {isPast && (() => {
                const done = (() => { try { return isReconciled(profile, event.id); } catch { return false; } })();
                const planned = guests || 0;
                if (!planned) return null;
                if (done) return (
                  <p className="grounding" style={{ marginTop: 'var(--sp-3)' }}>Turnout recorded — the next plan sizes smarter for it.</p>
                );
                return (
                  <div style={{ marginTop: 'var(--sp-3)' }}>
                    <div className="shelf-label" style={{ marginBottom: 6 }}>The final number — how many actually came?</div>
                    <div className="actions-row" style={{ alignItems: 'center' }}>
                      <input className="field" type="number" min="0" style={{ maxWidth: 110, fontSize: 'var(--t-input)' }}
                        placeholder={String(planned)} aria-label="Actual attendance" id="v2-actual-attendance" />
                      <span className="of">of {planned} planned</span>
                      <button className="mini" onClick={() => {
                        const el = document.getElementById('v2-actual-attendance');
                        const actual = Number(el && el.value);
                        if (!Number.isFinite(actual) || actual < 0) { toast('The real headcount — a number.'); return; }
                        try {
                          const entry = { eventId: event.id, date: (event.date && String(event.date).slice(0, 10)) || undefined, attendance: { planned, actual } };
                          patchProfile({ hostIntelligence: applyReconciliation(profile && profile.hostIntelligence, entry) },
                            'Recorded — Event Boss learns from the real number.');
                        } catch { toast('Couldn’t record it.'); }
                      }}>Record it</button>
                    </div>
                    <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>One number, once — future plans quietly adjust to how your crowds really show.</p>
                  </div>
                );
              })()}
              {/* Event memory capture — writes event.lessons via the canonical
                  setLesson (lib/eventMemory); recalled on Plan for the next
                  same-type event. Past events only — a preview has no lessons. */}
              {isPast && (
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>For next time — the one thing you’d tell yourself</div>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 58, resize: 'vertical', fontSize: 'var(--t-input)' }}
                    placeholder="Two bags of ice per cooler wasn’t enough — get three"
                    value={lessonDraft} onChange={e => setLessonDraft(e.target.value)} aria-label="Lesson for next time" />
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    <button className="cta" disabled={lessonDraft.trim() === getLesson(event)}
                      style={lessonDraft.trim() === getLesson(event) ? { opacity: .45 } : undefined}
                      onClick={() => patchEvent({ lessons: setLesson(event, lessonDraft).lessons },
                        lessonDraft.trim() ? 'Saved — it’ll come back when you plan the next one.' : 'Note cleared.')}>
                      {getLesson(event) ? 'Update it' : 'Save it'}
                    </button>
                    {getLesson(event) && lessonDraft.trim() === getLesson(event) && (
                      <span className="of" style={{ color: 'var(--ok)' }}>on record</span>
                    )}
                  </div>
                </div>
              )}
              {/* Recap keepsake on the invite link — when a guest reopens the
                  shared link after the event, it becomes a recap. The host's note
                  and a real photo-album URL land there. Both optional; blank ones
                  simply don't show (the recap never fabricates content). */}
              {isPast && (
                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>On your invite link — guests see this when they reopen it</div>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 'var(--t-input)' }}
                    placeholder="A note to everyone — “What a day. Thank you all for coming.”"
                    value={recapDraft} onChange={e => setRecapDraft(e.target.value)} aria-label="Recap note for guests" />
                  <input className="field" style={{ maxWidth: 'none', marginTop: 'var(--sp-2)', fontSize: 'var(--t-input)' }}
                    type="url" inputMode="url" placeholder="Photo album link — Google Photos, iCloud, a shared drive…"
                    value={albumDraft} onChange={e => setAlbumDraft(e.target.value)} aria-label="Photo album link" />
                  {albumDraft.trim() && !/^https?:\/\//i.test(albumDraft.trim()) && (
                    <p className="grounding" style={{ margin: '4px 0 0', color: 'var(--warn)' }}>Add the full link (starts with https://) so it opens for guests.</p>
                  )}
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    {(() => {
                      const clean = albumDraft.trim();
                      const albumOk = !clean || /^https?:\/\//i.test(clean);
                      const dirty = recapDraft.trim() !== String(event.recapNote || '').trim() || clean !== String(event.albumUrl || '').trim();
                      return (
                        <button className="cta" disabled={!dirty || !albumOk} style={(!dirty || !albumOk) ? { opacity: .45 } : undefined}
                          onClick={() => patchEvent({ recapNote: recapDraft.trim(), albumUrl: clean },
                            (recapDraft.trim() || clean) ? 'Saved — it’s on your invite link’s recap now.' : 'Recap cleared.')}>
                          {(event.recapNote || event.albumUrl) ? 'Update the recap' : 'Publish the recap'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}
              {/* Primary full-width, the two secondaries in a balanced 2-col grid
                  (was a ragged cta+mini+mini flex-wrap). */}
              <div style={{ marginTop: 14 }}>
                <button className="cta" style={{ width: '100%' }} onClick={() => openDraft('The thank-you', draftThankYou(event, profile))}>Draft the thank-you</button>
                <div className="pill-grid" style={{ marginTop: 'var(--gap-chip)' }}>
                  <button className="mini" onClick={() => { try { openDraft('The recap', draftRecap(event, profile)); } catch { toast('Couldn’t draft it.'); } }}>Write the recap</button>
                  <button className="mini" onClick={() => setSheet({ kind: 'thanks' })}>Start the thank-you run</button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Deep-link landing sheet: routes land on the exact row ── */}
      {sheet && (
        <>
          <div className="sheet-scrim" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1} ref={sheetRef}>
            <div className="sheet-head">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                {/* Audit #1: cross-nav — from ANY sheet, hop to the Sections
                    directory (and from there to any other surface) instead of
                    Close → re-open. Hidden on the directory itself. */}
                {sheet.kind !== 'sections' && (
                  <button onClick={() => setSheet({ kind: 'sections' })} aria-label="Back to all sections"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--steel-soft)', font: 'inherit', fontSize: 'var(--t-pill)', fontWeight: 650, letterSpacing: '.02em', textAlign: 'left', alignSelf: 'flex-start' }}>
                    ‹ Sections
                  </button>
                )}
              <strong id="sheet-title" role="heading" aria-level={2}>{sheet.kind === 'nav' ? 'Jump to' : sheet.kind === 'date' ? 'Date & time' : sheet.kind === 'venue' ? 'Venue' : sheet.kind === 'sections' ? 'Everything in your plan' : sheet.kind === 'pass' ? 'The One-Event Pass' : sheet.kind === 'help' ? 'Feeling stuck?' : sheet.kind === 'ask' ? 'Ask the Boss' : sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Your money' : sheet.kind === 'food' ? 'The spread & shopping' : sheet.kind === 'tasks' ? 'Your checklist' : sheet.kind === 'draft' ? (sheet.title || 'Written for you') : sheet.kind === 'decisions' ? 'Calls to make' : sheet.kind === 'space' ? 'Space, seats & helpers' : sheet.kind === 'seating' ? 'Who sits where' : sheet.kind === 'lodging' ? 'Where everyone stays' : sheet.kind === 'air' ? 'Getting here' : sheet.kind === 'ground' ? 'Getting around' : sheet.kind === 'costshare' ? 'Who pays for what' :sheet.kind === 'risks' ? 'What could go wrong' : sheet.kind === 'rain' ? 'If it rains' : sheet.kind === 'crabs' ? 'The crab order' : sheet.kind === 'events' ? 'Your events' : sheet.kind === 'meaning' ? 'Make it yours' : sheet.kind === 'qr' ? (sheet.vendorQr ? 'Scan for the vendor brief' : 'Scan to RSVP') : sheet.kind === 'sweep' ? 'Reconfirm your vendors' : sheet.kind === 'thanks' ? 'The thank-you run' : sheet.kind === 'settings' ? 'You & your account' : 'Guest list'}</strong>
              </div>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
            {/* Date & time area is a real door now (host report 2026-07-16: it was tappable
                copy with no editor behind it). Reuses the same date+arrival-time editor the
                action cards use — change the day or the time here. */}
            {sheet.kind === 'date' && (
              <div style={{ padding: 'var(--sp-2) 0' }}>
                <p className="v-meta" style={{ margin: '0 0 var(--sp-3)' }}>Change the day or the arrival time — every countdown, deadline, and shopping window in the plan counts back from it.</p>
                {renderEditor({ domain: 'date' })}
              </div>
            )}
            {/* Venue area is a real door too (host request 2026-07-16, same dead-route class as
                Date & time): reuses the existing venue input + address suggestions + city field,
                and — unlike the inline card, which only showed when venue was UNSET — lets a set
                venue be changed here. */}
            {sheet.kind === 'venue' && (
              <div style={{ padding: 'var(--sp-2) 0' }}>
                <p className="v-meta" style={{ margin: '0 0 var(--sp-3)' }}>Where the event happens — invites, maps, weather, and the rain note all read from it.</p>
                {String(event.venue || '').trim() && (
                  <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>Currently: <b>{event.venue}</b>{event.venueCity ? ` · ${event.venueCity}` : ''}. Enter a new place to change it.</p>
                )}
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name or address"
                    value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); setPendingCity(''); fetchAddrSugs(e.target.value); }} aria-label="Venue" />
                  <button className="cta" onClick={saveVenue}>Save</button>
                </div>
                {addrSugs.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {addrSugs.map((sg, si) => (
                      <button key={si} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
                        onClick={() => pickAddr(sg)}>
                        <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{sg.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {venueErr && <p className="grounding" style={{ marginTop: 6, color: 'var(--danger)' }}>{venueErr}</p>}
                {String(event.venue || '').trim() && needsCity() && (
                  <div style={{ marginTop: 'var(--sp-3)' }}>
                    <p className="grounding" style={{ marginBottom: 'var(--sp-2)' }}>Add the town and state (or ZIP) so weather and maps find the right place.</p>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start' }}>
                      <CityField value={cityDraft} onChange={setCityDraft} onPick={setCityDraft} onEnter={saveCity} placeholder="Annapolis, MD or 21401" ariaLabel="City, state or ZIP" style={{ maxWidth: 220, flex: '0 1 220px' }} />
                      <button className="cta" onClick={saveCity}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {sheet.kind === 'decisions' && (
              <>
                {/* Hero copy (host request 2026-07-11): the open count is the star —
                    decisionBoard is the ONE decision source (queue item 10). */}
                {(() => {
                  const openN = (decisionBoard.open || []).length;
                  const lockedN = (decisionBoard.locked || []).length;
                  // Wave-2b: parked-for-later decisions keep the sheet honest even with
                  // zero open work — the hero must still render (not vanish) so the
                  // deferred shelf below has a calm frame. Null-safe.
                  const deferredN = (decisionBoard.deferred || []).length;
                  if (!openN && !lockedN && !deferredN) return null;
                  const overdueN = (decisionBoard.open || []).filter(r => r && r.status === 'overdue').length;
                  // Empty-open but decisions parked: calm "nothing needs you yet" state,
                  // never "All settled" (which would read as done and hide the horizon).
                  const star = openN ? `${openN} to settle` : (deferredN ? 'Nothing needs you yet' : 'All settled');
                  const sub = openN
                    ? (overdueN
                      ? `${overdueN} ${overdueN === 1 ? 'is' : 'are'} past ${overdueN === 1 ? 'its' : 'their'} easy window — start there. Each one settles in a tap below; your answer reshapes the plan.`
                      : 'Each one settles in a tap below — your answer reshapes the plan.')
                    : (deferredN
                      ? `${deferredN} ${deferredN === 1 ? 'decision comes' : 'decisions come'} up closer to the date — you’ll see ${deferredN === 1 ? 'it' : 'them'} here when the time’s right.${lockedN ? ` ${lockedN} already settled.` : ''}`
                      : `All ${lockedN} ${lockedN === 1 ? 'call is' : 'calls are'} made — change any of them below.`);
                  return (
                    <SheetHero
                      eyebrow="Calls to make"
                      star={star}
                      tone={openN ? undefined : 'ok'}
                      sub={sub}
                    />
                  );
                })()}
                {/* hostDifficulty adapter (task 1): a hard event opens with reassurance,
                    an easy one with a calm line; moderate stays silent (baseline). */}
                {(() => {
                  if (!(decisionBoard.open || []).length) return null;
                  // EMOTION-STATE (roadmap #5): overwhelm is read from BEHAVIOR — a full plate
                  // AND a short runway — so this speaks to the host's STATE, not just the event's
                  // difficulty. It wins over the band line when the host is underwater, so the
                  // read reaches them in words (the board also paces + suppresses terse for them).
                  const ha = decisionBoard.hostAdaptation || null;
                  // Only claim a paced board when one is ACTUALLY on screen. Folded ⇒
                  // "just the first few" is true. Expanded (or nothing to fold) ⇒ the
                  // host is looking at the whole list, so say the honest thing instead.
                  if (callsFolded) {
                    return <p className="v-meta" style={{ margin: '0 0 var(--sp-2)' }}>That’s a lot with the clock ticking — just the first few here, the rest comes back when you’re ready. You’ve got this.</p>;
                  }
                  if (ha && ha.overwhelm) {
                    return <p className="v-meta" style={{ margin: '0 0 var(--sp-2)' }}>That’s a lot with the clock ticking — take them one at a time, in the order below. You’ve got this.</p>;
                  }
                  // The engine's own band — one classifier, not a shell copy of it.
                  const band = ha && ha.difficultyBand;
                  const line = band === 'hard'
                    ? 'This is a lot to pull off — take the calls one at a time. You don’t have to settle everything today; start at the top and work down.'
                    : band === 'easy' ? 'This is a light one — a few quick calls and you’re set.' : null;
                  return line ? <p className="v-meta" style={{ margin: '0 0 var(--sp-2)' }}>{line}</p> : null;
                })()}
                {/* heartAtRisk nudge (task 5): protect the moment before it defaults. */}
                {decisionBoard.heartAtRisk && (decisionBoard.open || []).length ? (
                  <p className="grounding" style={{ margin: '0 0 var(--sp-2)', background: 'color-mix(in srgb, var(--steel-soft) 10%, transparent)', borderRadius: '8px', paddingLeft: 11, fontWeight: 600 }}>
                    One of these is the moment your guests will remember. Give it your own call — don’t let it settle on a default.
                  </p>
                ) : null}
                {(() => {
                  // Host override (task 3): float pinned decisions to the top; the board's
                  // own priority order holds for the rest. Order + fold both come from
                  // callsOrdered/callsFolded above — one source, so the copy can't lie.
                  const ordered = callsFolded ? callsOrdered.slice(0, callsFocus) : callsOrdered;
                  // When nothing's open but decisions are parked, the deferred shelf
                  // below carries the honest state — don't also print "Nothing waiting
                  // on you." (that reads as a dead end and buries the horizon).
                  if (!callsOrdered.length) return (decisionBoard.deferred || []).length ? null : <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>Nothing waiting on you.</div>;
                  return (<>{ordered.map((r, i) => {
                  // Inline settle — keyed on the DECISION having authored options
                  // (playbookDecisionOptions, same rule as legacy's What-to-settle
                  // board), not on any route. Destination calls (group transport,
                  // lodging, health…) settle right here in one tap instead of
                  // detouring through Vendors; a pick writes event.foodChoices[id]
                  // and the board re-derives, moving the row to Settled.
                  const opts = (() => { try { return playbookDecisionOptions(event, r.id); } catch { return null; } })();
                  const focused = sheet.focus && sheet.focus === r.id;
                  // Wave-2a per-row consumers: the rank's work, the difm propose/ask
                  // note (only when modelled), the heart accent, and the pin control.
                  const rankWhy = rankReasonForV2(r);
                  const approach = r.difmCapable ? decisionApproach(r, opts) : null;
                  const pinned = Array.isArray(event.decisionPins) && event.decisionPins.includes(r.id);
                  const heartStyle = r.deliversHeartMoment ? { background: 'color-mix(in srgb, var(--steel-soft) 10%, transparent)', borderRadius: '8px', paddingLeft: 11 } : null;
                  const meta = (rankWhy || approach) ? (
                    <span style={{ flex: '1 0 100%' }}>
                      {rankWhy && <span className="v-meta" style={{ display: 'block' }}>{rankWhy}</span>}
                      {approach && <span className="v-meta" style={{ display: 'block' }}>{approach.note}</span>}
                    </span>
                  ) : null;
                  const pinBtn = (
                    <button type="button" className="mini" aria-pressed={pinned} onClick={(e) => { e.stopPropagation(); toggleDecisionPin(r.id); }}
                      style={{ flex: '0 0 auto', alignSelf: 'flex-start' }}>{pinned ? 'Pinned first' : 'Do this first'}</button>
                  );
                  // DIFM-PROPOSE-2 — the "accept the proposal" join (mirrors App.js
                  // HostDecisionsPanel + the start-time "that's right" confirm). The note
                  // already NARRATES a grounded default ("we'll go with X unless you change
                  // it"); this makes accepting it one obvious tap instead of hunting for the
                  // recommended chip. propose mode only fires when opts.chosen exists, and an
                  // open row's chosen is the authored default (choicePickFor falls back to it),
                  // so this settles through the SAME single write path (settleDecision →
                  // event.foodChoices) — invents nothing, and the host can still tap any chip.
                  const canAccept = !!(approach && approach.mode === 'propose' && approach.proposed && opts && opts.options.length);
                  const acceptBtn = canAccept ? (
                    <button type="button" className="mini" onClick={(e) => { e.stopPropagation(); settleDecision(r, approach.proposed); }}
                      style={{ flex: '0 0 auto', alignSelf: 'flex-start', color: 'var(--steel)', fontWeight: 700 }}>Sounds good</button>
                  ) : null;
                  if (opts && opts.options.length) {
                    return (
                      <div key={r.id || i} className={'frow' + (focused ? ' rowfocus' : '')} style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both`, cursor: 'default', ...heartStyle }}
                        ref={el => { if (el && focused) el.scrollIntoView({ block: 'center' }); }}>
                        <span className="f-main">
                          <span className="f-name">{r.label}
                            {r.status === 'overdue' && <span className="tag plan" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>overdue</span>}
                            {/* Wave-2b short-runway escalation: a subtle time-sensitive cue in
                                the existing tag vocabulary (warn), only when not already overdue. */}
                            {r.timeCritical && r.status !== 'overdue' && <span className="tag plan" style={{ color: 'var(--warn)', background: 'var(--warn-tint)' }}>time-sensitive</span>}
                          </span>
                          {r.because && <span className="v-meta">{r.because}</span>}
                        </span>
                        <div style={{ flex: '1 0 100%', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {opts.options.map(opt => (
                            <button key={opt} className="chip" aria-pressed={opts.chosen === opt}
                              onClick={() => settleDecision(r, opt)}>{opt}</button>
                          ))}
                        </div>
                        {opts.why && <p className="grounding" style={{ flex: '1 0 100%', margin: 0 }}>{opts.why}</p>}
                        {meta}
                        {acceptBtn}
                        {pinBtn}
                      </div>
                    );
                  }
                  // Routed / prompt row: the interactive element can't nest the pin
                  // button, so wrap it and hang meta + pin as siblings.
                  return (
                    <div key={r.id || i} style={{ ...heartStyle }}>
                      <button className={'frow' + (focused ? ' rowfocus' : '')} style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both`, width: '100%' }}
                        ref={el => { if (el && focused) el.scrollIntoView({ block: 'center' }); }}
                        onClick={() => { if (r.route && routeSheet(r.route)) return; toast(r.because || r.label); }}>
                        <span className="f-main">
                          <span className="f-name">{r.label}
                            {r.status === 'overdue' && <span className="tag plan" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>overdue</span>}
                            {/* Wave-2b short-runway escalation: a subtle time-sensitive cue in
                                the existing tag vocabulary (warn), only when not already overdue. */}
                            {r.timeCritical && r.status !== 'overdue' && <span className="tag plan" style={{ color: 'var(--warn)', background: 'var(--warn-tint)' }}>time-sensitive</span>}
                          </span>
                          {r.because && <span className="v-meta">{r.because}</span>}
                        </span>
                      </button>
                      {(meta || true) && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', padding: '6px 2px 0' }}>
                          {meta || <span style={{ flex: 1 }} />}
                          {pinBtn}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* The rest of a paced board — one tap away, never withheld. Mirrors the
                    home queue's "+N more" vocabulary. */}
                {callsFolded && (
                  <button className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: 'none', cursor: 'pointer', padding: '9px 0' }}
                    onClick={() => setCallsOpen(true)}>
                    <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>+ {callsOrdered.length - callsFocus} more — show the rest</span>
                    <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span>
                  </button>
                )}
                </>);
                })()}
                {/* Wave-2b horizon shelf — the decisions the engine parked ("comes up
                    closer to the date"). Subordinate to the active list: when calls are
                    open it folds into a quiet toggle (matching the app's fold vocabulary);
                    when nothing's open the hero already framed it, so the list shows plainly.
                    Informational + muted — a planner parks these, doesn't nag. */}
                {(decisionBoard.deferred || []).length > 0 && (() => {
                  const later = decisionBoard.deferred || [];
                  const openN = (decisionBoard.open || []).length;
                  const shown = openN === 0 || decLaterOpen;
                  return (
                    <div style={{ marginTop: 'var(--sp-3)' }}>
                      {openN > 0 && (
                        <button type="button" className="mini" onClick={() => setDecLaterOpen(v => !v)} style={{ marginBottom: 'var(--sp-1)' }}>
                          {decLaterOpen ? 'Hide what comes later' : `${later.length} ${later.length === 1 ? 'decision comes' : 'decisions come'} up closer to the date`}
                        </button>
                      )}
                      {shown && (
                        <>
                          <div className="shelf-label" style={{ margin: '10px 0 var(--sp-1)' }}>Comes up closer to the date</div>
                          {later.map((r, i) => (
                            <div key={r.id || i} className="line" style={{ alignItems: 'center', opacity: 0.9 }}>
                              <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                              <span className="of">{r.rankReason || r.because || 'Comes up closer to the date.'}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })()}
                {(decisionBoard.locked || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 var(--sp-1)' }}>Settled</div>
                    {(decisionBoard.locked || []).map((r, i) => {
                      const why = latestRationaleForSubject(event, r.id);
                      // An optioned call stays changeable after it's settled —
                      // "change" re-opens the same chips, and a routed focus
                      // (the ground sheet's "Change the call") opens them
                      // directly so that CTA is honest, not a dead landing.
                      const opts = (() => { try { return playbookDecisionOptions(event, r.id); } catch { return null; } })();
                      const canChange = !!(opts && opts.options.length);
                      const changeOpen = canChange && (choiceOpen === 'dec-' + r.id || (sheet.focus && sheet.focus === r.id));
                      return (
                        // A routed focus can point at a SETTLED call too (the
                        // ground sheet's "Change the call") — same rowfocus
                        // landing as everywhere else, exact row, no hunting.
                        <div key={r.id || i} className={sheet.focus && sheet.focus === r.id ? 'rowfocus' : undefined}
                          ref={el => { if (el && sheet.focus && sheet.focus === r.id) el.scrollIntoView({ block: 'center' }); }}>
                          <div className="line" style={{ alignItems: 'center' }}>
                            <span>{r.label}</span>
                            <span style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                              <span className="of">{r.because}</span>
                              {canChange && !changeOpen && (
                                <button className="mini" onClick={() => setChoiceOpen('dec-' + r.id)}>change</button>
                              )}
                              {!why && whyOpen !== r.id && (
                                <button className="mini" onClick={() => { setWhyOpen(r.id); setWhyText(''); }}>note why</button>
                              )}
                            </span>
                          </div>
                          {changeOpen && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '2px 0 var(--sp-2)' }}>
                              {opts.options.map(opt => (
                                <button key={opt} className="chip" aria-pressed={opts.chosen === opt}
                                  onClick={() => settleDecision(r, opt)}>{opt}</button>
                              ))}
                            </div>
                          )}
                          {why && <p className="grounding" style={{ margin: '0 0 6px' }}>Your call: “{why}”</p>}
                          {whyOpen === r.id && (
                            <div className="actions-row" style={{ margin: '0 0 var(--sp-2)', alignItems: 'center' }}>
                              <input className="field" style={{ maxWidth: 'none', flex: 1, fontSize: 'var(--t-input)', padding: 'var(--sp-2) var(--sp-3)' }}
                                placeholder="Why this call? — in your own words" value={whyText}
                                onChange={e => setWhyText(e.target.value)} aria-label={'Why ' + r.label} />
                              <button className="mini" onClick={() => saveWhy(r)}>save</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
            {sheet.kind === 'space' && (() => {
              // Hero copy (host request 2026-07-11): the helpers count is the
              // star. Real fields only — deriveHelperResponsibilities' deduped
              // people list and event.venue; nothing sized or claimed beyond them.
              const n = helperPeople.length;
              const venue = String(event.venue || '').trim();
              const venuePhrase = venue
                ? `${/^(the|a|an)\s/i.test(venue) ? '' : 'The '}${venue} is set — arrival, parking, and the rain plan live here.`
                : 'No venue named yet — name it and arrival, parking, and the rain plan live here.';
              return (
                <SheetHero
                  eyebrow="Helping hands"
                  star={n ? `${n} helping` : 'No helpers yet'}
                  sub={venuePhrase}
                />
              );
            })()}
            {sheet.kind === 'space' && (
              // DESTINATION-1: a real toggle so the modifier can be set (or
              // unset) after creation too, not just guessed once from the
              // smart-text input and locked in forever.
              <div className="line" style={{ padding: '2px 0 10px' }}>
                <span>Destination event <span className="of">— guests traveling to a lodging/venue combo</span></span>
                <button className="mini" style={event.isDestination ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                  onClick={() => patchEvent({ isDestination: !event.isDestination },
                    !event.isDestination ? 'Marked as a destination event — lodging, transport, and travel decisions just got added to your plan.' : 'Back to a local event — the travel decisions and vendor categories are removed.')}>
                  {event.isDestination ? 'yes' : 'no'}
                </button>
              </div>
            )}
            {sheet.kind === 'space' && (() => {
              // ONE Place Core (queue: untouched list) — venue/location states;
              // 'na' is suppression, never failure.
              let place = null; try { place = derivePlaceIntelligence(event); } catch { place = null; }
              const placeRows = ((place && place.sections) || []).filter(s => s && s.state !== 'na');
              return placeRows.length ? (
                <>
                  {placeRows.map(s => {
                    const isOpenRow = s.state === 'risk' || s.state === 'needs';
                    const rowColor = s.state === 'risk' ? 'var(--danger)' : s.state === 'needs' ? 'var(--warn)' : 'var(--ok)';
                    const noteField = PLACE_NOTE_FIELD[s.key];
                    // Handled/na rows and 'rain' (routes to its own real sheet
                    // via the CTA below) stay plain text — nothing to tap.
                    if (!isOpenRow || (s.key !== 'rain' && !noteField)) {
                      return (
                        <div key={s.key} className="line" style={{ alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 'var(--t-body-s)' }}>
                            <strong style={{ color: rowColor }}>{s.label}</strong>
                            {s.detail ? ' — ' + s.detail : ''}
                          </span>
                        </div>
                      );
                    }
                    if (s.key === 'rain') {
                      return (
                        <button key={s.key} className="line" style={{ width: '100%', alignItems: 'flex-start', background: 'none', border: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer', padding: '7px 0' }}
                          onClick={() => setSheet({ kind: 'rain' })} aria-label={'Open ' + s.label}>
                          <span style={{ fontSize: 'var(--t-body-s)' }}>
                            <strong style={{ color: rowColor }}>{s.label} <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span></strong>
                            {s.detail ? ' — ' + s.detail : ''}
                          </span>
                        </button>
                      );
                    }
                    const isNoteOpen = placeNoteOpen === s.key;
                    return (
                      <div key={s.key} style={{ padding: '7px 0' }}>
                        <button style={{ width: '100%', alignItems: 'flex-start', background: 'none', border: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex' }}
                          onClick={() => { const opening = !isNoteOpen; setPlaceNoteOpen(opening ? s.key : null); if (opening) setPlaceNoteDraft(event[noteField] || ''); }} aria-label={'Add note for ' + s.label}>
                          <span style={{ fontSize: 'var(--t-body-s)' }}>
                            <strong style={{ color: rowColor }}>{s.label} <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>{isNoteOpen ? '⌄' : '›'}</span></strong>
                            {s.detail ? ' — ' + s.detail : ''}
                          </span>
                        </button>
                        {isNoteOpen && (() => {
                          // Controlled draft (was uncontrolled + a fragile
                          // previousSibling.value read). The 'arrival' row edits
                          // venueAddress — a real street address — so it gets the
                          // shared AddressField autocomplete like the venue field;
                          // parking/load-in/contact/rules are free-text notes.
                          const save = () => { patchEvent({ [noteField]: placeNoteDraft.trim() }, s.label + ' saved.'); setPlaceNoteOpen(null); };
                          return (
                            <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                              {noteField === 'venueAddress' ? (
                                <AddressField value={placeNoteDraft} onChange={setPlaceNoteDraft} onPick={sg => setPlaceNoteDraft(sg.label)} onEnter={save}
                                  placeholder={'Add ' + s.label.toLowerCase() + '…'} ariaLabel={s.label} />
                              ) : (
                                <input className="field" style={{ flex: 1 }} placeholder={'Add ' + s.label.toLowerCase() + '…'}
                                  value={placeNoteDraft} aria-label={s.label}
                                  onChange={e => setPlaceNoteDraft(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') save(); }} />
                              )}
                              <button className="mini" onClick={save}>Save</button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  <div style={{ height: 10 }} />
                </>
              ) : null;
            })()}
            {sheet.kind === 'space' && (
              <>
                {/* WHAT TO BRING (Figma 433): each item folds to one settled
                    hairline row — label · need N on the left, its status/cost on
                    the right. The dense have/helper inputs + retail links reveal
                    on tap. At 12 items this stays a calm column instead of 12
                    stacked 3-line input+chip clusters. */}
                {capacity && (capacity.items || []).filter(it => it && !it.skipped).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '2px 0 var(--sp-1)' }}>What to bring</div>
                    <div className="fstat-list">
                {(capacity.items || []).filter(it => it && !it.skipped).map((it, i) => {
                  const links = it.owned ? null : (() => { try { return supplyRetailLinks(it.short || it.item, event.venue); } catch { return null; } })();
                  // Whole units only — nobody rents 3.2 canopies. The engine's
                  // scaled qty rounds UP for the host (short beats stranded).
                  const baseNeed = (() => {
                    const ov = event.capacityQty && event.capacityQty[it.key];
                    const raw = (event.capacityHave && event.capacityHave[it.key] != null && ov != null)
                      ? ov + (event.capacityHave[it.key] || 0)  // reconstruct the true need when we've overridden
                      : it.qty;
                    return Math.ceil(Number(raw) || 0);
                  })();
                  const have = Math.min(baseNeed, (event.capacityHave && event.capacityHave[it.key]) || 0);
                  const remaining = Math.max(0, baseNeed - have);
                  const helperName = (event.capacityHelpers && event.capacityHelpers[it.key]) || '';
                  const capKey = 'cap_' + (it.key || i);
                  const open = !!settledOpen[capKey];
                  // Writes go through the ENGINE's own knobs: capacityQty holds
                  // the REMAINING count (so cost prices only what's left) and
                  // capacityOwned flips when the host is fully covered.
                  const setHave = (n) => {
                    const h = Math.max(0, Math.min(baseNeed, n));
                    patchEvent({
                      capacityHave: { ...(event.capacityHave || {}), [it.key]: h },
                      capacityQty: { ...(event.capacityQty || {}), [it.key]: Math.max(0, baseNeed - h) },
                      capacityOwned: { ...(event.capacityOwned || {}), [it.key]: h >= baseNeed },
                    }, h >= baseNeed ? ((it.short || it.item) + ' fully covered — the plan stops pricing it.') : h > 0 ? ('Counting your ' + h + ' — the plan now prices the remaining ' + (baseNeed - h) + '.') : 'Back to the full count.');
                  };
                  return (
                    <div key={it.key || i}>
                      <button className="fstat" onClick={() => setSettledOpen(m => ({ ...m, [capKey]: !open }))} aria-expanded={open}
                        aria-label={(it.short || it.item) + ' — ' + (remaining === 0 ? 'covered' : 'still need ' + remaining) + '. Tap to set what you have.'}>
                        <span className="fstat-l">{it.verb ? it.verb + ' ' : ''}{it.short || it.item} <span className="of">need {baseNeed}</span></span>
                        <span className="fstat-v" style={remaining === 0 ? { color: 'var(--ok)' } : null}>
                          {remaining === 0 ? (helperName ? helperName + ' brings ' + baseNeed : 'covered') : (it.costLow || it.costHigh) ? fmt(it.costLow) + '–' + fmt(it.costHigh) : 'still need ' + remaining}
                          <span className="fstat-chev" aria-hidden="true">›</span>
                        </span>
                      </button>
                      {open && (
                        <div style={{ padding: '2px 2px 12px' }}>
                          <div className="actions-row" style={{ marginTop: 'var(--sp-1)', alignItems: 'center' }}>
                            <span className="of">you have</span>
                            <input className="field" style={{ maxWidth: 66, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} type="number" min="0" max={baseNeed}
                              value={have || ''} placeholder="0" aria-label={'How many ' + (it.short || it.item) + ' you have'}
                              onChange={e => setHave(parseInt(e.target.value, 10) || 0)} />
                            <input className="field" style={{ maxWidth: 125, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} type="text"
                              value={helperName} placeholder="helper brings?" aria-label="Helper supplying this"
                              onChange={e => patchEvent({ capacityHelpers: { ...(event.capacityHelpers || {}), [it.key]: e.target.value } }, null)} />
                            {remaining > 0 && <span className="of">still need {remaining}{helperName ? ' — ask ' + helperName : ''}</span>}
                            {remaining === 0 && helperName && <span className="of" style={{ color: 'var(--ok)' }}>{helperName} has it covered</span>}
                          </div>
                          {links && remaining > 0 && (
                            <div className="actions-row" style={{ marginTop: 'var(--sp-1)' }}>
                              {links.kind === 'rent' && links.rentUrl && (
                                <a className="mini" style={{ textDecoration: 'none' }} href={links.rentUrl} target="_blank" rel="noreferrer">Find rentals nearby</a>
                              )}
                              {(links.buy || []).slice(0, links.kind === 'rent' ? 1 : 3).map(l => (
                                <a key={l.label} className="mini" style={{ textDecoration: 'none' }} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                    </div>
                  </>
                )}
                {helpers.length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 var(--sp-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Who’s helping</span>
                      {(helperData.helpers || []).length > 0 && (
                        <button className="mini" onClick={startHelperMessages}>Draft helper messages</button>
                      )}
                    </div>
                    {/* Stacked row (was a ragged 2-col .line where the status
                        REPEATED the owner name and both columns wrapped
                        independently into a text wall on 393px). Task on line 1,
                        owner + one short color-coded status chip on line 2. */}
                    {helpers.map((h, i) => {
                      const st = h.status;
                      const short = st === 'handled' ? 'brought it' : st === 'confirmed' ? 'covered' : 'not confirmed';
                      const stColor = (st === 'handled' || st === 'confirmed')
                        ? { color: 'var(--ok)', background: 'var(--ok-tint)' }
                        : { color: 'var(--warn)', background: 'var(--warn-tint)' };
                      return (
                        <div key={i} style={{ padding: '11px 2px', borderTop: '1px solid var(--line-soft)' }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{h.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                            <span className="of">{h.helperName}</span>
                            <span className="tag plan" style={stColor}>{short}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {!((capacity && (capacity.items || []).length) || helpers.length) && (
                  <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>Nothing to set up or borrow for this one.</div>
                )}
              </>
            )}
            {sheet.kind === 'costshare' && (() => {
              // ── DESTINATION-3 — Who pays for what ──
              // Two funding models, both first-class (lib/costSharing):
              // everyone covers their own, or an ongoing pool with
              // sliding-scale tiers (susu / family-dues tradition). Funding
              // sits BESIDE the budget, never inside it — nothing here
              // touches spending math, and the pool is never totaled
              // (per-tier headcounts are the family's business).
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>This is a local event — everyone covers their own costs. If it becomes a destination event (Space, seats & helpers), you can set up a shared pool here.</div>;
              }
              const cs = costSharingSummary(event);
              const f = csForm || { reason: '', cadence: '', tiers: [] };
              const setF = (k) => (e) => setCsForm({ ...f, [k]: e.target.value });
              const setTier = (i, k) => (e) => setCsForm({ ...f, tiers: f.tiers.map((t, j) => j === i ? { ...t, [k]: e.target.value } : t) });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px var(--sp-3)' };
              const setMode = (mode) => patchEvent({
                costSharing: { ...((event.costSharing && typeof event.costSharing === 'object') ? event.costSharing : {}), mode },
              }, mode === 'pooled-dues' ? 'Ongoing pool it is — set up the tiers below.' : 'Everyone covers their own costs.');
              return (
                <>
                  <p className="v-meta" style={{ padding: '2px 2px 10px' }}>{cs.headline}</p>
                  {/* "One of each group" per-cycle subtotal — doctrine-safe: it's
                      exactly one contributor per named tier (zero headcount
                      assumption), so it's honest to total, unlike the pool itself
                      which we refuse to sum. Only shows once every tier is priced. */}
                  {cs.oneOfEachTotal != null && (
                    <p className="grounding" style={{ margin: '0 0 10px' }}>
                      One of each group = <b>{fmt(cs.oneOfEachTotal)}</b>{cs.cadence ? ' ' + cs.cadence : ''} — the pool per round if a single person covers each tier. Headcounts are the family’s call, so it’s never multiplied out.
                    </p>
                  )}
                  <div className="shelf-label">How the money works</div>
                  <OptionList ariaLabel="How the money works" style={{ marginBottom: 'var(--sp-2)' }}
                    options={[{ label: 'Everyone covers their own', value: 'self-pay' }, { label: 'Ongoing pool', value: 'pooled-dues' }]}
                    value={cs.pooled ? 'pooled-dues' : 'self-pay'} onPick={setMode} />
                  {cs.pooled && (
                    <>
                      <div className="lodge-form">
                        <label className="lodge-f full"><span className="of">Why the pool exists</span>
                          <input className="field" style={fld} placeholder="e.g. so Grandma can come" value={f.reason} onChange={setF('reason')} aria-label="Why the pool exists" /></label>
                        <label className="lodge-f full"><span className="of">How often people chip in</span>
                          <input className="field" style={fld} placeholder="e.g. monthly, per paycheck" value={f.cadence} onChange={setF('cadence')} aria-label="How often people contribute" /></label>
                      </div>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Who chips in what</div>
                      {f.tiers.length === 0 && (
                        <p className="v-meta" style={{ margin: '0 0 var(--sp-2)' }}>Different people can carry different amounts — working adults one number, students another, elders covered. Add a line per group.</p>
                      )}
                      {f.tiers.map((t, i) => (
                        <div key={i} className="lodge-form" style={{ marginBottom: 'var(--sp-1)' }}>
                          <label className="lodge-f"><span className="of">Who</span>
                            <input className="field" style={fld} placeholder="e.g. Working adults" value={t.label} onChange={setTier(i, 'label')} aria-label={'Group ' + (i + 1) + ' — who this covers'} /></label>
                          <label className="lodge-f"><span className="of">Amount</span>
                            <input className="field" style={fld} type="number" min="0" inputMode="decimal" placeholder="$ — leave blank if unset" value={t.amount} onChange={setTier(i, 'amount')} aria-label={'Group ' + (i + 1) + ' amount in dollars'} /></label>
                          <label className="lodge-f full"><span className="of">Worth knowing</span>
                            <input className="field" style={fld} placeholder="e.g. covered by the pool" value={t.note} onChange={setTier(i, 'note')} aria-label={'Group ' + (i + 1) + ' note'} /></label>
                          <button className="mini" style={{ justifySelf: 'start' }} onClick={() => setCsForm({ ...f, tiers: f.tiers.filter((_, j) => j !== i) })}>Remove this group</button>
                        </div>
                      ))}
                      <div className="actions-row" style={{ marginTop: 6 }}>
                        <button className="mini" onClick={() => setCsForm({ ...f, tiers: [...f.tiers, { label: '', amount: '', note: '' }] })}>Add a group</button>
                        <button className="cta" onClick={saveCostSharing}>Save how the money works</button>
                      </div>
                    </>
                  )}
                  <p className="grounding" style={{ marginTop: 14 }}>This sits beside your budget, not inside it — the pool never gets totaled up, because who lands in each group is the family’s call, not the app’s.</p>
                </>
              );
            })()}
            {sheet.kind === 'lodging' && (() => {
              // ── DESTINATION-2 · slice 1 — Where everyone stays ──
              // HOST surface only (no guest portal). Everything shown comes
              // from lib/travelPlan or the host's own form: headcount mode
              // degrades to the stay card alone — guest rows never invented.
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>This is a local event — nobody needs a room. If that changes, mark it as a destination event under Space, seats & helpers.</div>;
              }
              const lg = travel.lodging;
              const f = lodgeForm || { hotelName: '', rate: '', code: '', deadline: '', backups: [] };
              const setF = (k) => (e) => setLodgeForm({ ...f, [k]: e.target.value });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px var(--sp-3)' };
              const focusDeadline = sheet.focus === 'deadline';
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the booked count is the
                      star in roster mode; the stay's own state otherwise. All
                      figures from lib/travelPlan — the roster summary line below
                      was PROMOTED here, not duplicated. */}
                  {travel.rosterMode && lg.roster.length > 0 ? (
                    <SheetHero
                      eyebrow="Rooms lined up"
                      star={`${lg.roster.length - (lg.notBookedCount || 0)} of ${lg.roster.length} booked`}
                      tone={lg.notBookedCount === 0 ? 'ok' : undefined}
                      sub={lg.notBookedCount > 0
                        ? `${lg.notBookedCount} ${lg.notBookedCount === 1 ? 'hasn’t' : 'haven’t'} booked yet — tap a name each time you hear where they stand.`
                        : 'Everyone has a room lined up — tap a name if anything changes.'}
                    />
                  ) : (
                    <SheetHero
                      eyebrow="The stay"
                      star={lg.hotelName ? 'The stay is set' : 'No place picked yet'}
                      tone={lg.hotelName ? 'ok' : undefined}
                      sub={lg.hotelName
                        ? `${lg.hotelName} is the plan — the details below feed the where-to-stay note.`
                        : 'Name the place below and the where-to-stay note writes itself.'}
                    />
                  )}
                  {/* The one dated fact on this card, said plainly — never "cutoff". */}
                  {lg.deadline && (() => {
                    let dd = null; try { dd = daysUntil(lg.deadline); } catch { dd = null; }
                    const when = new Date(lg.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                    const late = dd != null && dd < 0;
                    return (
                      <p className={'v-meta' + (focusDeadline ? ' rowfocus' : '')} style={{ padding: '2px 2px var(--sp-2)', ...(late || (dd != null && dd <= 7) ? { color: 'var(--warn)', fontWeight: 650 } : {}) }}>
                        {late
                          ? 'The group rate ended ' + when + ' — check with the hotel before pointing anyone else there.'
                          : 'Group rate ends ' + when + (dd != null ? (dd === 0 ? ' — today' : ' — in ' + dd + ' day' + (dd === 1 ? '' : 's')) : '') + '.'}
                      </p>
                    );
                  })()}
                  {/* The stay form folds to a summary card once a place is
                      named (Figma 428) — tap to edit; the roster stays open. */}
                  {lg.hotelName && !settledOpen.lodgeStay ? (
                    <SettledCard
                      title={lg.hotelName}
                      tone="ok"
                      sub={[f.rate ? '$' + f.rate + ' a night' : null, f.code ? 'code ' + f.code : null,
                        lg.deadline ? 'rate ends ' + new Date(lg.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null]
                        .filter(Boolean).join(' · ') || 'Tap to add the rate, code, and dates'}
                      onOpen={() => setSettledOpen(m => ({ ...m, lodgeStay: true }))}
                    />
                  ) : (
                  <>
                  <div className="shelf-label">The stay</div>
                  <div className="lodge-form">
                    {/* A hotel/rental IS an address — same lookup the venue field
                        uses (Places when a key exists, OSM otherwise), so the host
                        types "hamp" and gets the real Hampton Inn rather than
                        hand-typing a name the maps link can't resolve later. */}
                    <label className="lodge-f full"><span className="of">Place</span>
                      <AddressField value={f.hotelName} onChange={v => setLodgeForm(d => ({ ...d, hotelName: v }))}
                        onPick={sg => setLodgeForm(d => ({ ...d, hotelName: sg.label }))}
                        placeholder="Hotel or rental name" ariaLabel="Where guests stay" inputStyle={fld} /></label>
                    <label className="lodge-f"><span className="of">A night</span>
                      <input className="field" style={fld} type="number" min="0" inputMode="decimal" placeholder="$" value={f.rate} onChange={setF('rate')} aria-label="Nightly rate in dollars" /></label>
                    <label className="lodge-f"><span className="of">Booking code</span>
                      <input className="field" style={fld} placeholder="Say this when booking" value={f.code} onChange={setF('code')} aria-label="Booking code" /></label>
                    <label className="lodge-f full"><span className="of">Group rate ends</span>
                      <input className="field" style={fld} type="date" value={f.deadline} onChange={setF('deadline')} aria-label="Last day to book at the group rate" /></label>
                    {(f.backups || []).flatMap((bk, bi) => [
                      <label key={'bn' + bi} className="lodge-f"><span className="of">{bi === 0 ? 'Backup place' : 'Another backup'}</span>
                        <AddressField value={bk.name}
                          onChange={v => setLodgeForm(d => ({ ...d, backups: (d.backups || []).map((x, j) => j === bi ? { ...x, name: v } : x) }))}
                          onPick={sg => setLodgeForm(d => ({ ...d, backups: (d.backups || []).map((x, j) => j === bi ? { ...x, name: sg.label } : x) }))}
                          placeholder={bi === 0 ? 'If the first fills up' : 'One more option'}
                          ariaLabel={'Backup place ' + (bi + 1)} inputStyle={fld} /></label>,
                      <label key={'bt' + bi} className="lodge-f"><span className="of">Worth knowing</span>
                        <input className="field" style={fld} placeholder="Farther? Cheaper?" value={bk.note}
                          onChange={e => setLodgeForm(d => ({ ...d, backups: (d.backups || []).map((x, j) => j === bi ? { ...x, note: e.target.value } : x) }))}
                          aria-label={'Note about backup ' + (bi + 1)} /></label>,
                    ])}
                    <label className="lodge-f full">
                      <button className="mini" type="button" onClick={() => setLodgeForm(d => ({ ...d, backups: [...((d && d.backups) || []), { name: '', note: '' }] }))}>+ Add {(f.backups || []).length ? 'another' : 'a'} backup place</button>
                    </label>
                  </div>
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="mini" onClick={() => { saveLodging(); setSettledOpen(m => ({ ...m, lodgeStay: false })); }}>Save the stay details</button>
                  </div>
                  </>
                  )}
                  {travel.rosterMode ? (
                    lg.roster.length > 0 ? (
                      <>
                        {/* count + guidance promoted into the sheet hero above */}
                        <div className="shelf-label" style={{ margin: '18px 0 2px' }}>Who’s booked a room</div>
                        {lg.roster.map((r, i) => {
                          const rk = rowKey(r);
                          return (
                          <div key={r.guestId != null ? r.guestId : 'g' + i}>
                            <button
                              className={'frow' + (sheet.focus != null && r.guestId != null && String(sheet.focus) === String(r.guestId) ? ' rowfocus' : '')}
                              ref={el => { if (el && sheet.focus != null && r.guestId != null && String(sheet.focus) === String(r.guestId)) el.scrollIntoView({ block: 'center' }); }}
                              style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                              onClick={() => setLodgePickFor(lodgePickFor === rk ? null : rk)}
                              aria-expanded={lodgePickFor === rk} aria-haspopup="true"
                              aria-label={r.name + ' — ' + LODGING_STATUS_LABEL[r.status] + '. Tap to change.'}>
                              <span className="f-main">
                                <span className="f-name">{r.name}
                                  {r.recentlyChanged && <span className="tag plan">just changed</span>}
                                </span>
                                {(r.roommate || r.accessibility) && (
                                  <span className="v-meta">{[r.roommate ? 'rooming with ' + r.roommate : null, r.accessibility].filter(Boolean).join(' · ')}</span>
                                )}
                              </span>
                              <span className={'tag lodge-' + r.status}>{LODGING_STATUS_LABEL[r.status]}</span>
                            </button>
                            {lodgePickFor === rk && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', margin: '2px 0 10px', paddingLeft: 2 }} role="group" aria-label={'Lodging status for ' + r.name}>
                                {Object.keys(LODGING_STATUS_LABEL).map(s => (
                                  <button key={s} className={'tag lodge-' + s} aria-pressed={r.status === s}
                                    style={{ cursor: 'pointer', border: 'none', ...(r.status === s ? {} : { opacity: .62 }) }}
                                    onClick={ev => { ev.stopPropagation(); setLodgingStatus(r, s); }}>
                                    {LODGING_STATUS_LABEL[s]}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </>
                    ) : (
                      <p className="v-meta" style={{ padding: 'var(--sp-3) 2px 0' }}>Everyone on the list has declined — nobody needs a room right now.</p>
                    )
                  ) : (
                    // Headcount mode: the engine returns no roster and a null
                    // count — show the stay card only, never invented rows.
                    <p className="grounding" style={{ marginTop: 14 }}>You’re planning by headcount, so there’s no name-by-name booking list here. Switch to a guest list when you want to track who’s booked a room.</p>
                  )}
                  {/* DRAFT-ONLY (UX_07): written from the SAVED details, reviewed
                      by the host, sent from their own messages — the label says
                      Draft, never Send. Sits at the foot of the sheet (Figma 428). */}
                  {lg.hotelName && (
                    <div className="actions-row" style={{ marginTop: 14 }}>
                      <button className="cta soft" onClick={() => { try { openDraft('The where-to-stay note', draftLodgingNote(event)); } catch { toast('Couldn’t draft it.'); } }}>
                        Draft the where-to-stay note
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'ground' && (() => {
              // ── DESTINATION-2 · slice 2 — Getting around ──
              // HOST surface only. The shuttle call is the dest_transport
              // DECISION (Phase 1's single source of truth) — shown read-only
              // here with a route to the exact decision row, never a second
              // toggle. Headcount mode keeps the host info card and degrades
              // the ride board — guest rows are never invented.
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>This is a local event — nobody’s coordinating travel. If that changes, mark it as a destination event under Space, seats & helpers.</div>;
              }
              const gr = travel.ground;
              const f = groundForm || { lastReturnNote: '', pickups: [{ name: '', note: '' }] };
              const setF = (k) => (e) => setGroundForm({ ...f, [k]: e.target.value });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px var(--sp-3)' };
              const hasNoteMaterial = !!(gr.lastReturnNote || gr.pickupPoints.length || gr.transportProvided != null);
              const firstNeeds = gr.roster.findIndex(x => x.status === 'needs_ride');
              const spoken = travel.rosterMode && gr.roster.some(x => x.status !== 'not_set');
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): real ride math once the
                      roster has spoken; the transport call's state otherwise. The
                      ride-board summary line below was PROMOTED here. */}
                  {spoken ? (
                    gr.needRide.length > 0 ? (
                      <SheetHero
                        eyebrow="Getting around"
                        star={`${gr.needRide.length} need${gr.needRide.length === 1 ? 's' : ''} a ride`}
                        sub={`${gr.offeredSeats} seat${gr.offeredSeats === 1 ? '' : 's'} offered — ` + (
                          gr.unmatched === 0 ? 'enough to cover everyone. You make the introductions.'
                          : gr.transportProvided === true ? 'the shuttle or van covers the rest.'
                          : `${gr.unmatched} still without a way back. Worth pairing people up.`)}
                      />
                    ) : (
                      <SheetHero
                        eyebrow="Getting around"
                        star="No rides needed"
                        tone="ok"
                        sub="No one needs a ride right now — tap a name when that changes."
                      />
                    )
                  ) : (
                    <SheetHero
                      eyebrow="Getting around"
                      star={gr.transportProvided === true ? 'Shuttle’s the plan' : gr.transportProvided === false ? 'No shuttle' : 'Not decided yet'}
                      tone={gr.transportProvided === true ? 'ok' : undefined}
                      sub={travel.rosterMode
                        ? 'Tap a name each time you hear their plan — renting a car, needing a ride, or offering seats.'
                        : gr.transportProvided === true ? 'A shuttle or van is the plan — the pickup spots below go in the note.'
                        : gr.transportProvided === false ? 'Everyone gets themselves around — the getting-back note below is still worth writing.'
                        : 'One tap below settles it — your answer feeds the getting-around note.'}
                    />
                  )}
                  {/* The transport call folds to a settled card (Figma 430); the
                      chevron routes to the decision — the single source of truth. */}
                  <SettledCard
                    title="Group transport"
                    tone={gr.transportProvided === true ? 'ok' : 'default'}
                    sub={(gr.transportPick || (gr.transportProvided === true ? 'A shuttle or van' : gr.transportProvided === false ? 'Guests get themselves around' : 'Not decided yet')) + (gr.transportProvided != null ? ' — decided' : '')}
                    action={gr.transportProvided == null ? 'Decide it' : 'Change the call'}
                    onOpen={() => setSheet({ kind: 'decisions', focus: 'dest_transport' })}
                  />
                  {/* The note form folds once it has content (Figma 430) — tap
                      to edit; the ride board stays open below. */}
                  {(() => {
                    const hasNote = !!(gr.lastReturnNote || (gr.pickupPoints || []).length);
                    if (hasNote && !settledOpen.groundNote) {
                      return <SettledCard title="Worth telling everyone"
                        sub={[gr.lastReturnNote ? 'a note on getting back' : null, (gr.pickupPoints || []).length ? (gr.pickupPoints.length + ' pickup spot' + (gr.pickupPoints.length === 1 ? '' : 's')) : null].filter(Boolean).join(' · ') || 'Tap to edit'}
                        onOpen={() => setSettledOpen(m => ({ ...m, groundNote: true }))} />;
                    }
                    return (
                    <>
                  <div className="shelf-label">Worth telling everyone</div>
                  <div className="lodge-form">
                    <label className="lodge-f full"><span className="of">Getting back at night</span>
                      <input className="field" style={fld} placeholder="e.g. no rideshare after 9pm — last shuttle 11:30" value={f.lastReturnNote} onChange={setF('lastReturnNote')} aria-label="The honest note about getting back at night" /></label>
                    {(f.pickups || []).flatMap((pk, pi) => [
                      <label key={'pn' + pi} className="lodge-f"><span className="of">{pi === 0 ? 'Pickup spot' : 'Another spot'}</span>
                        <input className="field" style={fld} placeholder={pi === 0 ? 'Hotel lobby, venue gate…' : 'One more if needed'} value={pk.name}
                          onChange={e => setGroundForm(d => ({ ...d, pickups: (d.pickups || []).map((x, j) => j === pi ? { ...x, name: e.target.value } : x) }))}
                          aria-label={'Pickup spot ' + (pi + 1)} /></label>,
                      <label key={'pt' + pi} className="lodge-f"><span className="of">Worth knowing</span>
                        <input className="field" style={fld} placeholder="On the hour? Which door?" value={pk.note}
                          onChange={e => setGroundForm(d => ({ ...d, pickups: (d.pickups || []).map((x, j) => j === pi ? { ...x, note: e.target.value } : x) }))}
                          aria-label={'Note about pickup spot ' + (pi + 1)} /></label>,
                    ])}
                    <label className="lodge-f full">
                      <button className="mini" type="button" onClick={() => setGroundForm(d => ({ ...d, pickups: [...((d && d.pickups) || []), { name: '', note: '' }] }))}>+ Add {(f.pickups || []).length ? 'another' : 'a'} pickup spot</button>
                    </label>
                  </div>
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="mini" onClick={() => { saveGround(); setSettledOpen(m => ({ ...m, groundNote: false })); }}>Save the getting-around details</button>
                  </div>
                    </>
                    );
                  })()}
                  {travel.rosterMode ? (
                    gr.roster.length > 0 ? (
                      <>
                        {/* Host-mediated matching: the board + the sheet hero IS
                            the matching tool — counts only, never assignments.
                            (summary line promoted into the hero above) */}
                        <div className="shelf-label" style={{ margin: '18px 0 2px' }}>The ride board</div>
                        {gr.roster.map((r, i) => {
                          const isFocus = sheet.focus != null && ((r.guestId != null && String(sheet.focus) === String(r.guestId))
                            || (sheet.focus === 'riders' && r.status === 'needs_ride'));
                          const scrollHere = sheet.focus != null && ((r.guestId != null && String(sheet.focus) === String(r.guestId))
                            || (sheet.focus === 'riders' && i === firstNeeds));
                          const rk = rowKey(r);
                          return (
                            <div key={r.guestId != null ? r.guestId : 'g' + i}>
                              <button className={'frow' + (isFocus ? ' rowfocus' : '')}
                                ref={el => { if (el && scrollHere) el.scrollIntoView({ block: 'center' }); }}
                                style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                                onClick={() => setRidePickFor(ridePickFor === rk ? null : rk)}
                                aria-expanded={ridePickFor === rk} aria-haspopup="true"
                                aria-label={r.name + ' — ' + RIDE_STATUS_LABEL[r.status] + '. Tap to change.'}>
                                <span className="f-main">
                                  <span className="f-name">{r.name}
                                    {r.recentlyChanged && <span className="tag plan">just changed</span>}
                                  </span>
                                </span>
                                <span className={'tag ride-' + r.status}>{RIDE_STATUS_LABEL[r.status]}</span>
                              </button>
                              {ridePickFor === rk && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', margin: '2px 0 10px', paddingLeft: 2 }} role="group" aria-label={'Ride plan for ' + r.name}>
                                  {Object.keys(RIDE_STATUS_LABEL).map(s => (
                                    <button key={s} className={'tag ride-' + s} aria-pressed={r.status === s}
                                      style={{ cursor: 'pointer', border: 'none', ...(r.status === s ? {} : { opacity: .62 }) }}
                                      onClick={ev => { ev.stopPropagation(); setRideStatus(r, s); }}>
                                      {RIDE_STATUS_LABEL[s]}</button>
                                  ))}
                                </div>
                              )}
                              {r.status === 'offers_ride' && (
                                <div className="actions-row" style={{ padding: '0 var(--sp-2) var(--sp-2)', alignItems: 'center' }}>
                                  <button className="mini" onClick={() => setRideSeats(r, -1)} aria-label={'Fewer seats from ' + r.name}>−</button>
                                  <span className="step-val" style={{ minWidth: 52 }}>{r.seats} seat{r.seats === 1 ? '' : 's'}</span>
                                  <button className="mini" onClick={() => setRideSeats(r, +1)} aria-label={'More seats from ' + r.name}>+</button>
                                  {r.seats === 0 && <span className="of">how many can they take?</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <p className="v-meta" style={{ padding: 'var(--sp-3) 2px 0' }}>Everyone on the list has declined — nobody needs a ride right now.</p>
                    )
                  ) : (
                    // Headcount mode: the engine returns no roster — the host
                    // info card above stands alone, never invented rows.
                    <p className="grounding" style={{ marginTop: 14 }}>You’re planning by headcount, so there’s no name-by-name ride board here. Switch to a guest list when you want to track who needs a ride.</p>
                  )}
                  {/* DRAFT-ONLY (UX_07): written from SAVED details + the decision's
                      real answer. Sits at the foot of the sheet (Figma 430). */}
                  {hasNoteMaterial && (
                    <div className="actions-row" style={{ marginTop: 14 }}>
                      <button className="cta soft" onClick={() => { try { openDraft('The getting-around note', draftRidesNote(event)); } catch { toast('Couldn’t draft it.'); } }}>
                        Draft the getting-around note
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'air' && (() => {
              // ── DESTINATION-2 · slice 3 — Getting here ──
              // HOST surface only. The airports and their honest tradeoffs are
              // host-entered; the arrivals board reads the per-guest air fields
              // lib/travelPlan normalizes, clustered by arrival day. Land-by /
              // fly-home-after guidance derives from the event's OWN date and
              // start time — a recommended time is never invented. Headcount
              // mode keeps the airports card and drops the board — guest rows
              // are never invented.
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>This is a local event — nobody’s flying in. If that changes, mark it as a destination event under Space, seats & helpers.</div>;
              }
              const ar = travel.air;
              const f = airForm || { airports: [{ name: '', code: '', note: '' }] };
              const setF = (k) => (e) => setAirForm({ ...f, [k]: e.target.value });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px var(--sp-3)' };
              const startDay = /^\d{4}-\d{2}-\d{2}/.test(String(event.date || '')) ? String(event.date).slice(0, 10) : null;
              const endDay = (/^\d{4}-\d{2}-\d{2}/.test(String(event.endDate || '')) ? String(event.endDate).slice(0, 10) : null) || startDay;
              const fmtDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const fmtTime = (t) => {
                const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '').trim());
                if (!m) return String(t || '').trim();
                const h = Number(m[1]);
                return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + (h >= 12 ? 'pm' : 'am');
              };
              const haveCount = ar.roster.filter(r => r.hasFlightInfo).length;
              const editingRow = (r) => !!(flightEdit && ((flightEdit.guestId != null && r.guestId != null && flightEdit.guestId === r.guestId)
                || (flightEdit.guestId == null && r.guestId == null && flightEdit.name === r.name)));
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the flight-info count is
                      the star in roster mode; the airports card's state otherwise.
                      The "Who lands when" summary line was PROMOTED here. */}
                  {travel.rosterMode && ar.roster.length > 0 ? (
                    <SheetHero
                      eyebrow="Flight info in"
                      star={`${haveCount} of ${ar.roster.length}`}
                      tone={(ar.conflicts || []).length > 0 ? 'warn' : haveCount >= ar.roster.length ? 'ok' : undefined}
                      sub={(ar.conflicts || []).length > 0
                        ? `${ar.conflicts.length} flight${ar.conflicts.length === 1 ? '' : 's'} cut${ar.conflicts.length === 1 ? 's' : ''} into the day — worth a check-in. The flagged rows below say whose.`
                        : haveCount === 0
                          ? 'Tap a name each time you hear flights — the board builds itself day by day.'
                          : haveCount < ar.roster.length
                            ? 'Tap a name to add more as you hear.'
                            : 'The whole board is filled in.'}
                    />
                  ) : (
                    <SheetHero
                      eyebrow="Getting here"
                      star={ar.airportOptions.length > 0 ? `${ar.airportOptions.length} airport${ar.airportOptions.length === 1 ? '' : 's'} listed` : 'No airports listed yet'}
                      sub={ar.airportOptions.length > 0
                        ? 'The options below feed the getting-here note — honest tradeoffs and all.'
                        : 'List the options below and the getting-here note writes itself.'}
                    />
                  )}
                  {/* The one dated fact on this card — the event's own dates,
                      said plainly. A start time appears ONLY when the host
                      actually gave one; nothing here is ever a guessed time. */}
                  {startDay && (() => {
                    const tp = (() => { try { return timePhrase(event); } catch { return ''; } })();
                    return (
                      <p className="v-meta" style={{ padding: '2px 2px var(--sp-2)' }}>
                        {endDay !== startDay
                          ? 'It runs ' + fmtDay(startDay) + ' through ' + fmtDay(endDay) + ' — flights in by ' + fmtDay(startDay) + ', home after ' + fmtDay(endDay) + '.'
                          : 'The day itself is ' + fmtDay(startDay) + (tp ? ' — it starts ' + (/^in the /.test(tp) ? tp : 'at ' + tp) : '') + '. Flights should land before then.'}
                      </p>
                    );
                  })()}
                  {/* The airports form folds to a summary card once options are
                      listed (Figma 429) — tap to edit; the arrivals board stays. */}
                  {(() => {
                    const ap0 = (f.airports || [])[0] || {};
                    const named = (f.airports || []).filter(a => a && (a.name || a.code));
                    const apTitle = [ap0.code, ap0.name].filter(Boolean).join(' · ') || 'Airports';
                    const apSub = [ap0.note || null, named.length > 1 ? '+' + (named.length - 1) + ' more option' + (named.length - 1 === 1 ? '' : 's') : null].filter(Boolean).join(' · ') || 'Tap to add codes and tradeoffs';
                    if (ar.airportOptions.length > 0 && !settledOpen.airAirports) {
                      return <SettledCard title={apTitle} sub={apSub} tone="ok" onOpen={() => setSettledOpen(m => ({ ...m, airAirports: true }))} />;
                    }
                    return (
                    <>
                  <div className="shelf-label">Airports worth flying into</div>
                  <div className="lodge-form">
                    {(f.airports || []).flatMap((ap, ai) => [
                      <label key={'an' + ai} className="lodge-f"><span className="of">{ai === 0 ? 'Airport' : 'Another airport'}</span>
                        <input className="field" style={fld} placeholder={ai === 0 ? 'Baltimore/Washington Intl' : 'One more option'} value={ap.name}
                          onChange={e => setAirForm(d => ({ ...d, airports: (d.airports || []).map((x, j) => j === ai ? { ...x, name: e.target.value } : x) }))}
                          aria-label={'Airport name ' + (ai + 1)} /></label>,
                      <label key={'ac' + ai} className="lodge-f"><span className="of">Code</span>
                        <input className="field" style={fld} placeholder="BWI" value={ap.code}
                          onChange={e => setAirForm(d => ({ ...d, airports: (d.airports || []).map((x, j) => j === ai ? { ...x, code: e.target.value } : x) }))}
                          aria-label={'Airport code ' + (ai + 1)} /></label>,
                      <label key={'ao' + ai} className="lodge-f full"><span className="of">Worth knowing</span>
                        <input className="field" style={fld} placeholder="Closer? Fewer flights? Cheaper?" value={ap.note}
                          onChange={e => setAirForm(d => ({ ...d, airports: (d.airports || []).map((x, j) => j === ai ? { ...x, note: e.target.value } : x) }))}
                          aria-label={'The honest tradeoff of airport ' + (ai + 1)} /></label>,
                    ])}
                    <label className="lodge-f full">
                      <button className="mini" type="button" onClick={() => setAirForm(d => ({ ...d, airports: [...((d && d.airports) || []), { name: '', code: '', note: '' }] }))}>+ Add {(f.airports || []).length ? 'another' : 'an'} airport</button>
                    </label>
                  </div>
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="mini" onClick={() => { saveAirports(); setSettledOpen(m => ({ ...m, airAirports: false })); }}>Save the airport options</button>
                  </div>
                    </>
                    );
                  })()}
                  {travel.rosterMode ? (
                    ar.roster.length > 0 ? (
                      <>
                        {/* count + guidance promoted into the sheet hero above */}
                        <div className="shelf-label" style={{ margin: '18px 0 2px' }}>Who lands when</div>
                        {arrivalClusters(ar.roster).map((cl) => (
                          <div key={cl.day || 'unknown'}>
                            <div className="shelf-label" style={{ margin: 'var(--sp-3) 0 2px' }}>
                              {cl.day
                                ? fmtDay(cl.day) + (startDay ? (cl.day === startDay ? ' — the day itself' : cl.day > startDay ? ' — after it starts' : '') : '')
                                : 'No flight info yet'}
                            </div>
                            {cl.rows.map((r, i) => {
                              const isFocus = sheet.focus != null && r.guestId != null && String(sheet.focus) === String(r.guestId);
                              const editing = editingRow(r);
                              const rowConf = (ar.conflicts || []).filter(c => (c.guestId != null && r.guestId != null) ? c.guestId === r.guestId : c.name === r.name);
                              const meta = [
                                r.airportCode ? 'into ' + r.airportCode : null,
                                r.arriveTime ? 'lands ' + fmtTime(r.arriveTime) : null,
                                r.departDate ? 'home ' + fmtDay(r.departDate) + (r.departTime ? ' ' + fmtTime(r.departTime) : '') : null,
                              ].filter(Boolean).join(' · ');
                              return (
                                <div key={r.guestId != null ? r.guestId : 'g' + (cl.day || 'u') + i}>
                                  <button className={'frow' + (isFocus ? ' rowfocus' : '')}
                                    ref={el => { if (el && isFocus) el.scrollIntoView({ block: 'center' }); }}
                                    style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                                    onClick={() => (editing ? setFlightEdit(null) : openFlightEdit(r))}
                                    aria-label={r.name + ' — ' + (r.hasFlightInfo ? 'flight info on the board' : 'no flight info yet') + '. Tap to enter flights.'}>
                                    <span className="f-main">
                                      <span className="f-name">{r.name}
                                        {r.recentlyChanged && <span className="tag plan">just changed</span>}
                                      </span>
                                      {meta && <span className="v-meta">{meta}</span>}
                                      {/* Conflict flags on the exact row — the engine's own
                                          honest reads (arrives_late / leaves_early), never
                                          derived a second time here. */}
                                      {rowConf.map((c) => (
                                        <span key={c.type} className="v-meta" style={{ color: 'var(--warn)', fontWeight: 650 }}>
                                          {c.type === 'arrives_late'
                                            ? 'lands' + (r.arriveDate ? ' ' + fmtDay(r.arriveDate) : '') + ' — after the day starts'
                                            : 'flies out' + (r.departDate ? ' ' + fmtDay(r.departDate) : '') + ' — before it ends'}
                                        </span>
                                      ))}
                                    </span>
                                    <span className={'tag air-' + (r.hasFlightInfo ? 'set' : 'none')}>{r.hasFlightInfo ? 'On the board' : 'No flights yet'}</span>
                                  </button>
                                  {editing && (
                                    <div style={{ padding: '0 var(--sp-2) 10px' }}>
                                      <div className="lodge-form">
                                        <label className="lodge-f full"><span className="of">Flying into</span>
                                          <input className="field" style={fld} placeholder="BWI" value={flightEdit.airportCode} onChange={e => setFlightEdit({ ...flightEdit, airportCode: e.target.value })} aria-label={'Airport ' + r.name + ' flies into'} /></label>
                                        <label className="lodge-f"><span className="of">Lands on</span>
                                          <input className="field" style={fld} type="date" value={flightEdit.arriveDate} onChange={e => setFlightEdit({ ...flightEdit, arriveDate: e.target.value })} aria-label={'Day ' + r.name + ' lands'} /></label>
                                        <label className="lodge-f"><span className="of">Lands at</span>
                                          <input className="field" style={fld} type="time" value={flightEdit.arriveTime} onChange={e => setFlightEdit({ ...flightEdit, arriveTime: e.target.value })} aria-label={'Time ' + r.name + ' lands'} /></label>
                                        <label className="lodge-f"><span className="of">Flies home on</span>
                                          <input className="field" style={fld} type="date" value={flightEdit.departDate} onChange={e => setFlightEdit({ ...flightEdit, departDate: e.target.value })} aria-label={'Day ' + r.name + ' flies home'} /></label>
                                        <label className="lodge-f"><span className="of">Flies home at</span>
                                          <input className="field" style={fld} type="time" value={flightEdit.departTime} onChange={e => setFlightEdit({ ...flightEdit, departTime: e.target.value })} aria-label={'Time ' + r.name + ' flies home'} /></label>
                                      </div>
                                      <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                                        <button className="mini" onClick={saveFlightEdit}>Save {r.name}’s flights</button>
                                        <button className="mini" onClick={() => setFlightEdit(null)}>Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="v-meta" style={{ padding: 'var(--sp-3) 2px 0' }}>Everyone on the list has declined — nobody’s flying in right now.</p>
                    )
                  ) : (
                    // Headcount mode: the engine returns no roster — the
                    // airports card above stands alone, never invented rows.
                    <p className="grounding" style={{ marginTop: 14 }}>You’re planning by headcount, so there’s no name-by-name arrivals board here. Switch to a guest list when you want to track who lands when.</p>
                  )}
                  {/* DRAFT-ONLY (UX_07): written from SAVED options + the event's
                      real dates. Sits at the foot of the sheet (Figma 429). */}
                  {ar.airportOptions.length > 0 && (
                    <div className="actions-row" style={{ marginTop: 14 }}>
                      <button className="cta soft" onClick={() => { try { openDraft('The getting-here note', draftGettingHereNote(event)); } catch { toast('Couldn’t draft it.'); } }}>
                        Draft the getting-here note
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'seating' && (() => {
              // ── Sprint 1 — Who sits where ──
              // One engine (lib/seatingPlan) reads it all; writes go through
              // its pure helpers + patchEvent. Assignment is tap-a-name-then-
              // tap-a-table (the ride board's tap-the-row rhythm — a per-guest
              // cycle through N tables would be a slot machine, not a control).
              // No per-table capacity exists in the data, so none is claimed —
              // only occupancy, the average, and the evenness the engine derives.
              const sp = seating;
              if (!sp.hasRoster || sp.totals.confirmed === 0) {
                return <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>Seating works from your guest list — once someone says yes, their name shows up here to be seated.</div>;
              }
              const picked = seatPick != null ? sp.confirmed.find(g => String(g.id) === String(seatPick)) : null;
              const focusId = sheet.focus != null ? String(sheet.focus) : null;
              const guestSub = (g) => [
                MEAL_SHORT[g.meal] || null,
                g.kids ? '+' + g.kids + (Number(g.kids) === 1 ? ' kid' : ' kids') : null,
                g.group || null,
              ].filter(Boolean).join(' · ');
              const tableSub = (t) => {
                const meals = Object.entries(t.meals || {}).map(([m, n]) => (MEAL_SHORT[m] || m) + ' ' + n);
                return [...meals, t.kids ? 'Kids ' + t.kids : null].filter(Boolean).join(' · ');
              };
              const guestRow = (g, seated) => {
                const isFocus = focusId != null && String(g.id) === focusId;
                const isPicked = seatPick != null && String(g.id) === String(seatPick);
                return (
                  <div key={g.id} className={'frow' + (isFocus || isPicked ? ' rowfocus' : '') + (guestDrag && guestDrag.id === g.id ? ' dragging' : '')}
                    ref={el => { if (el && isFocus) el.scrollIntoView({ block: 'center' }); }}
                    style={{ cursor: 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} role="button" tabIndex={0}
                    onPointerDown={startGuestDrag(g)}
                    onClick={() => { if (guestDraggedRef.current) return; setSeatPick(isPicked ? null : g.id); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeatPick(isPicked ? null : g.id); } }}
                    aria-label={g.name + (seated ? ' — seated. Tap to move them.' : ' — needs a seat. Tap, then tap a table.')}>
                    <span className="f-main">
                      <span className="f-name">{g.name}
                        {isPicked && <span className="tag plan">now tap a table</span>}
                      </span>
                      {guestSub(g) && <span className="v-meta">{guestSub(g)}</span>}
                    </span>
                    {seated && (
                      <span className="mini" role="button" tabIndex={0}
                        onClick={e => { e.stopPropagation(); unseatGuest(g); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); unseatGuest(g); } }}>
                        unseat
                      </span>
                    )}
                  </div>
                );
              };
              // Hero copy (host request 2026-07-11): the old summary line is
              // PROMOTED to the hero — same buildSeatingPlan totals, count as
              // the star. "about 1 a table" reads as broken math — say "one".
              const tableBits = [
                sp.tableCount + (sp.tableCount === 1 ? ' table' : ' tables'),
                sp.totals.avgPerTable ? (sp.totals.avgPerTable === 1 ? 'one a table' : 'about ' + sp.totals.avgPerTable + ' a table') : null,
                sp.totals.seated > 0 ? (sp.totals.tablesEven ? 'tables are even' : 'tables are uneven') : null,
              ].filter(Boolean).join(' · ');
              return (
                <>
                  {guestDrag && createPortal(
                    // Portal to <body> so the fixed-position ghost is viewport-relative and
                    // tracks the pointer — a fixed element inside the phone-frame's CSS
                    // transform is positioned against that frame, not the screen (host 2026-07-22).
                    <div className="seat-ghost" style={{ left: guestDrag.x, top: guestDrag.y }} aria-hidden="true">{guestDrag.name}</div>,
                    document.body
                  )}
                  <SheetHero
                    eyebrow="Seated so far"
                    star={`${sp.totals.seated} of ${sp.totals.confirmed}`}
                    tone={sp.totals.allSeated ? 'ok' : undefined}
                    sub={(sp.totals.allSeated ? 'Everyone’s in a seat — ' : '') + tableBits + '.'}
                  />
                  {sp.dietChips.length > 0 && (
                    <div className="chips" style={{ margin: '0 0 var(--sp-2)' }}>
                      {sp.dietChips.map(c => <span key={c} className="chip" style={{ cursor: 'default' }}>{c}</span>)}
                    </div>
                  )}
                  {/* Actionable access surfacing (invite redesign): the NAMES of
                      guests who told us they need an accessible seat, so the host
                      places them deliberately near step-free access — not just the
                      dead "Wheelchair N" count the chip above shows. */}
                  {Array.isArray(sp.accessibleSeats) && sp.accessibleSeats.length > 0 && (
                    <p className="grounding" style={{ margin: '0 0 10px' }}>
                      <strong style={{ color: 'var(--ink-soft)' }}>Seat with easy access:</strong> {sp.accessibleSeats.join(', ')} — asked for a step-free spot.
                    </p>
                  )}
                  <div className="line" style={{ alignItems: 'center', padding: 'var(--sp-1) 0 10px' }}>
                    <span>Tables</span>
                    <span style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                      <button className="mini" onClick={() => stepTableCount(-1)} disabled={sp.tableCount <= 1}
                        style={sp.tableCount <= 1 ? { opacity: .45 } : undefined} aria-label="One table fewer">−</button>
                      <span className="step-val" style={{ minWidth: 20 }}>{sp.tableCount}</span>
                      <button className="mini" onClick={() => stepTableCount(+1)} aria-label="One table more">+</button>
                    </span>
                  </div>
                  {/* Optional host-set seats-per-table — the model never fabricates a
                      capacity, so open chairs only appear once the host says how many
                      seats a table has (v5). '—' = unknown, no capacity claimed. */}
                  {seatView === 'plan' && (
                    <div className="line" style={{ alignItems: 'center', padding: '0 0 10px' }}>
                      <span>Seats per table <span className="of">optional</span></span>
                      <span style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                        <button className="mini" onClick={() => patchEvent({ seatsPerTable: (Math.max(0, (Number(event.seatsPerTable) || 0) - 1)) || null }, null)} aria-label="Fewer seats per table">−</button>
                        <span className="step-val" style={{ minWidth: 20 }}>{Number(event.seatsPerTable) || '—'}</span>
                        <button className="mini" onClick={() => patchEvent({ seatsPerTable: (Number(event.seatsPerTable) || 0) + 1 }, null)} aria-label="More seats per table">+</button>
                      </span>
                    </div>
                  )}
                  {picked && (
                    <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
                      Seating {picked.name} — tap a table below.{' '}
                      <button className="mini" onClick={() => setSeatPick(null)}>never mind</button>
                    </p>
                  )}
                  {sp.unassigned.length > 0 && (
                    <div className={'seat-tray' + (guestDrag ? ' droptarget' : '')}>
                      <div className="shelf-label" style={{ margin: 'var(--sp-2) 0 2px' }}>Still need a seat — drag a name onto a table (or tap it, then a table)</div>
                      {sp.unassigned.map(g => guestRow(g, false))}
                      {sp.unassigned.some(g => g.group) && (
                        <div className="actions-row" style={{ margin: 'var(--sp-2) 0 2px', alignItems: 'center' }}>
                          <button className="mini" onClick={autoSeatByGroup}>Spread everyone across tables</button>
                          <span className="of">balances the room evenly — it won’t keep groups together; adjust any seat after</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="actions-row" style={{ margin: '14px 0 2px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="shelf-label">The tables{picked ? ' — tap one to seat ' + picked.name : ''}</span>
                    {/* WHERE THE TABLE COUNT CAME FROM. It used to be a bare 5 — five tables
                        the host never chose, drawn as fact, with the evenness advice
                        ("balances the room evenly") computed against them. The playbook has
                        always authored the real factor (a crab feast: one long table per ~6–7
                        guests) and playbookCapacity has always turned it into a number. Two
                        engines that never spoke. Now it says which one is talking. */}
                    {!event.tables && (() => {
                      const basis = (() => { try { return tableCountBasis(event); } catch (_e) { return 'default'; } })();
                      if (basis === 'host') return null;
                      return (
                        <p className="grounding" style={{ margin: '2px 0 0' }}>
                          {basis === 'playbook'
                            ? `${sp.tables.length} tables — what a ${String(event.type || 'event').toLowerCase()} this size usually needs. Use the ± to change it.`
                            : `${sp.tables.length} tables — a starting point, not a read of your room. Use the ± to change it.`}
                        </p>
                      );
                    })()}
                    <span className="chips">
                      <button className="chip" style={{ padding: 'var(--sp-1) 10px', fontSize: 'var(--t-pill)' }} aria-pressed={seatView === 'list'} onClick={() => setSeatView('list')}>List</button>
                      <button className="chip" style={{ padding: 'var(--sp-1) 10px', fontSize: 'var(--t-pill)' }} aria-pressed={seatView === 'plan'} onClick={() => setSeatView('plan')}>Floor plan</button>
                    </span>
                  </div>
                  {/* Floor-plan view (per-screen audit: seating was list-only; AllSeated's
                      edge is a visual layout). MVP — draggable table pucks on a responsive
                      canvas (positions saved as fractions in event.tablePos); tap-to-seat
                      the picked guest still works, and tapping with no pick opens the table
                      back in the list. No room shape/obstacles yet. */}
                  {seatView === 'plan' && (() => {
                    // Height grows with the grid's row count (min 220) so a
                    // 24-table reunion lays out ~76px per row — never the
                    // overlapping stack the fixed 4/3 box produced.
                    const fpRows = tableGrid(sp.tables.length).rows;
                    const fpH = Math.max(220, fpRows * 76);
                    // Real per-table cautions: guests who asked for step-free access.
                    const accessSet = new Set(sp.accessibleSeats || []);
                    // GROUNDED enrichments (v5): group color from g.group, honoree star from
                    // event.honoree, table shape from event type — never invented.
                    const groupList = [...new Set(sp.confirmed.map(g => g.group).filter(Boolean))];
                    const GROUP_COLORS = ['#6b99c7', '#66b88f', '#b89966', '#a985c2', '#c78a6b'];
                    const groupColor = g => (g ? GROUP_COLORS[groupList.indexOf(g) % GROUP_COLORS.length] : null);
                    const honoreeName = String(event.honoree || '').trim().toLowerCase();
                    const longTables = /crab|cookout|\bbbq\b|barbecue|feast|reunion|potluck/i.test(String(event.type || '') + ' ' + String(event.name || ''));
                    const cap = Number(event.seatsPerTable) || 0; // host-set capacity; 0 = unknown, never fabricated
                    return (
                    <>
                    <div className="floorplan" ref={floorRef} style={{ aspectRatio: 'auto', height: fpH }}>
                      {sp.tables.map((t, ti) => {
                        const saved = (event.tablePos || {})[t.number];
                        const dp = (seatDrag && seatDrag.number === t.number) ? seatDrag : (saved || defaultTablePos(ti, sp.tables.length));
                        // caution: someone here needs step-free access, else fuller than the room's average.
                        const tAccess = t.guests.some(g => accessSet.has(g.name));
                        // over-capacity when the host has set seats-per-table; otherwise fall
                        // back to "fuller than the room's average" (no fabricated capacity).
                        const tOver = cap ? t.count > cap : (sp.totals.avgPerTable && t.count > sp.totals.avgPerTable + 1);
                        const caution = tAccess ? 'access' : (tOver ? 'full' : null);
                        // guest first-names on the table (the categories/roster from code, not a bare count).
                        const names = t.guests.slice(0, 4).map(g => String(g.name || '').split(' ')[0]).join(' · ')
                          + (t.guests.length > 4 ? ' +' + (t.guests.length - 4) : '');
                        // dominant group → its color (a ring); honoree → a star. Both grounded.
                        const domGroup = (() => { const c = {}; t.guests.forEach(g => { if (g.group) c[g.group] = (c[g.group] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || null; })();
                        const gc = groupColor(domGroup);
                        const tHonoree = !!honoreeName && t.guests.some(g => String(g.name || '').trim().toLowerCase() === honoreeName);
                        return (
                          <button key={t.number} type="button" data-tnum={t.number}
                            className={'tpuck' + (t.count ? ' seated' : '') + (picked || guestDrag ? ' seatable' : '') + (caution ? ' caution' : '') + (longTables ? ' long' : '') + (tHonoree ? ' honoree' : '') + (seatSelTable === t.number ? ' sel' : '')}
                            style={{ left: (dp.x * 100) + '%', top: (dp.y * 100) + '%', ...(gc && !t.count ? { borderColor: gc } : {}), ...(gc && t.count ? { boxShadow: '0 0 0 2px ' + gc + ', 0 2px 8px -3px rgba(0,0,0,.5)' } : {}) }}
                            onPointerDown={startPuckDrag(t.number)}
                            onClick={() => { if (justDraggedRef.current) return; if (picked) { seatGuestAt(picked, t); } else { setSeatSelTable(seatSelTable === t.number ? null : t.number); } }}
                            aria-label={t.label + ' — ' + (t.count || 0) + ' seated'
                              + (caution === 'access' ? ', someone here needs step-free access' : caution === 'full' ? ', fuller than the rest' : '')
                              + '. Drag to move' + (picked ? ', or tap to seat ' + picked.name : ', or tap to see who’s here') + '.'}>
                            {caution && <span className={'tp-caution ' + caution} aria-hidden="true" />}
                            {tHonoree && <span className="tp-star" aria-hidden="true">★</span>}
                            <span className="tp-label">{t.label}</span>
                            <span className="tp-count">{(t.count || 0) + (cap ? '/' + cap : '')}</span>
                          </button>
                        );
                      })}
                      {/* Host-placed door — the app never invents the room; the host marks
                          where their real door is, and drags it. Tap to remove. */}
                      {(() => {
                        const ddp = doorDrag || event.doorPos;
                        if (!ddp) return (
                          <button type="button" className="floor-addland" onClick={() => patchEvent({ doorPos: { x: 0.05, y: 0.5 } }, 'Door placed — drag it to where your real door is.')}>+ mark the door</button>
                        );
                        return (
                          <button type="button" className="floor-door" style={{ left: (ddp.x * 100) + '%', top: (ddp.y * 100) + '%' }}
                            onPointerDown={startDoorDrag}
                            onClick={() => { if (!doorDrag) patchEvent({ doorPos: null }, 'Door marker removed.'); }}
                            aria-label="Door — drag to move it; tap to remove it.">DOOR</button>
                        );
                      })()}
                      <span className="floorplan-hint">Drag to arrange · tap to {picked ? 'seat ' + picked.name : 'see who’s here'}</span>
                    </div>
                    {/* v5 progressive disclosure: the tapped table opens inline here — its
                        guests, meals, and any need — instead of bouncing to the List view. */}
                    {(() => {
                      const st = seatSelTable != null ? sp.tables.find(x => x.number === seatSelTable) : null;
                      if (!st) return null;
                      return (
                        <div className="tsel-panel">
                          <div className="tsel-head">
                            <span className="tsel-title">{st.label} — {cap
                              ? st.count + ' of ' + cap + (st.count < cap ? ' · ' + (cap - st.count) + ' open' : st.count > cap ? ' · over capacity' : ' · full')
                              : st.count + ' seated'}</span>
                            <button className="mini" onClick={() => setSeatSelTable(null)}>close</button>
                          </div>
                          {st.count === 0
                            ? <p className="v-meta" style={{ margin: '4px 0 0' }}>Empty — tap a name above, then this table, or drag someone here.</p>
                            : st.guests.map(g => (
                              <div key={g.id} className="tsel-row">
                                <span className="tsel-name">{g.name}</span>
                                {guestSub(g) && <span className="v-meta" style={{ flex: 1 }}>{guestSub(g)}</span>}
                                <button className="mini" onClick={() => unseatGuest(g)}>unseat</button>
                              </div>
                            ))}
                        </div>
                      );
                    })()}
                    </>
                    );
                  })()}
                  {seatView === 'list' && sp.tables.map(t => {
                    const isOpen = seatOpenTable === t.number;
                    const renaming = tableNameDraft && tableNameDraft.num === t.number;
                    return (
                      <div key={t.number}>
                        <button className="frow" style={picked ? { boxShadow: 'inset 0 0 0 1px var(--steel-tint)' } : undefined}
                          onClick={() => { if (picked) { seatGuestAt(picked, t); setSeatOpenTable(t.number); } else setSeatOpenTable(isOpen ? null : t.number); }}
                          aria-label={t.label + ' — ' + t.count + ' seated.' + (picked ? ' Tap to seat ' + picked.name + ' here.' : ' Tap to open.')}>
                          <span className="f-main">
                            <span className="f-name">{t.label}</span>
                            {tableSub(t) && <span className="v-meta">{tableSub(t)}</span>}
                          </span>
                          <span className="of" style={{ fontWeight: 700, color: t.count ? 'var(--ink-soft)' : 'var(--faint)' }}>
                            {t.count ? t.count + ' seated' : 'empty'}
                          </span>
                          <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '2px 0 var(--sp-2) 14px' }}>
                            {t.guests.map(g => guestRow(g, true))}
                            {t.guests.length === 0 && <p className="v-meta" style={{ margin: 'var(--sp-1) 0' }}>No one here yet.</p>}
                            {renaming ? (
                              <div className="actions-row" style={{ marginTop: 6, alignItems: 'center' }}>
                                <input className="field" style={{ maxWidth: 200, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                                  placeholder={'Table ' + t.number} value={tableNameDraft.value} autoFocus
                                  onChange={e => setTableNameDraft({ num: t.number, value: e.target.value })}
                                  onKeyDown={e => { if (e.key === 'Enter') saveTableName(t.number); }}
                                  aria-label={'Name for table ' + t.number} />
                                <button className="mini" onClick={() => saveTableName(t.number)}>Save</button>
                                <button className="mini" onClick={() => setTableNameDraft(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="mini" style={{ marginTop: 6 }}
                                onClick={() => setTableNameDraft({ num: t.number, value: t.name || '' })}>
                                {t.name ? 'Rename it' : 'Name this table'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
            {sheet.kind === 'risks' && (
              <>
                {/* Hero copy (host request 2026-07-11): riskCount is the SAME
                    number the quiet index row shows — exactly the rows below.
                    Authored possibilities, never live alerts — no alarm tone. */}
                <SheetHero
                  eyebrow="Eyes open"
                  star={riskCount ? `${riskCount} to know about` : 'All quiet'}
                  tone={riskCount ? undefined : 'ok'}
                  sub={riskCount
                    ? 'None of these are happening — they’re the ones worth a plan. Clear any you’ve already got covered.'
                    : 'Everything flagged has a plan or got dismissed.'}
                />
                {/* ctx.activeRisks (PC-2): the reveal's risk deriver, already
                    filtered through event.riskStatus — dismissing here writes
                    the SAME field production writes, one loop everywhere. */}
                {ctx && (ctx.activeRisks || []).map((r, i) => {
                  const why = riskWhy(r);
                  const route = riskRouteFor(r);
                  // Row-level landing: a registry raise routes {tab:'Risks', riskId} and
                  // routeSheet stores it as sheet.focus — ctx risks key on r.type. Same
                  // rowfocus + scroll pattern as the tasks sheet; the CTA rule says land
                  // on the row, never the sheet top.
                  const focused = sheet.focus != null && String(sheet.focus) === String(r.type);
                  return (
                  <div key={'ctx-' + (r.type || i)} className={'brow' + (focused ? ' rowfocus' : '')}
                    ref={el => { if (el && focused) el.scrollIntoView({ block: 'center' }); }}
                    style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                    <div className="f-name" style={{ marginBottom: 3 }}>
                      {r.description}
                      <span className="tag plan" style={r.severity === 'high' ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : r.severity === 'low' ? { color: 'var(--muted)', background: 'var(--line-soft)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{({ high: 'Worth planning now', medium: 'Keep an eye on it', low: 'Minor' })[r.severity] || 'Worth a look'}</span>
                    </div>
                    <p className="grounding" style={{ margin: 0 }}>{r.mitigation}</p>
                    {why && <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--faint)' }}>{why}</p>}
                    <div className="actions-row" style={{ marginTop: 6 }}>
                      {route && <button className="mini" onClick={() => { if (!routeSheet(route)) setSheet({ kind: 'risks' }); }}>Plan for this</button>}
                      <button className="mini" onClick={() => patchEvent({ riskStatus: { ...(event.riskStatus || {}), [r.type]: 'dismissed' } }, 'Noted — that one stops surfacing.')}>Handled — stop showing this</button>
                    </div>
                  </div>
                  );
                })}
                {staticRisks.map((r, i) => {
                  const why = riskWhy(r);
                  const route = riskRouteFor(r);
                  // Playbook risks are what the registry actually raises (riskId = r.id) —
                  // this is the row a "Have a plan for: X" tap must land on.
                  const focused = sheet.focus != null && String(sheet.focus) === String(r.id);
                  return (
                  <div key={r.id || i} className={'brow' + (focused ? ' rowfocus' : '')}
                    ref={el => { if (el && focused) el.scrollIntoView({ block: 'center' }); }}
                    style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                    <div className="f-name" style={{ marginBottom: 3 }}>
                      {r.trigger}
                      <span className="tag plan" style={r.severity === 'high' ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : r.severity === 'low' ? { color: 'var(--muted)', background: 'var(--line-soft)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{({ high: 'Worth planning now', medium: 'Keep an eye on it', low: 'Minor' })[r.severity] || 'Worth a look'}</span>
                    </div>
                    <p className="grounding" style={{ margin: 0 }}>{r.mitigation}</p>
                    {why && <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--faint)' }}>{why}</p>}
                    {(route || r.id) && (
                      <div className="actions-row" style={{ marginTop: 6 }}>
                        {route && <button className="mini" onClick={() => { if (!routeSheet(route)) setSheet({ kind: 'risks' }); }}>Plan for this</button>}
                        {r.id && <button className="mini" onClick={() => patchEvent({ riskStatus: { ...(event.riskStatus || {}), [r.id]: 'dismissed' } }, 'Noted — that one stops surfacing.')}>Handled — stop showing this</button>}
                      </div>
                    )}
                  </div>
                  );
                })}
              </>
            )}
            {sheet.kind === 'meaning' && meaningDraft && (
              <>
                {/* Hero (parity with the app's other sheet heroes: eyebrow + lead)
                    with the steel accent on the eyebrow — replaces a flat grey
                    paragraph so the emotional core reads with real hierarchy instead
                    of a monotone form. Sans, not serif (serif is doctrine-locked to
                    welcome/invite/reveal). */}
                <div className="eyebrow" style={{ color: 'var(--steel-soft)', marginBottom: 8 }}>The heart of it</div>
                <p style={{ fontSize: 'var(--t-card-title)', fontWeight: 750, letterSpacing: '-.02em', lineHeight: 1.25, margin: '0 0 8px', color: 'var(--ink)' }}>
                  What are we really protecting?
                </p>
                <p className="grounding" style={{ margin: '0 0 var(--sp-5)' }}>
                  The day-before brief, the run of show, and the toast all draw from your own words — nothing here is required.
                </p>
                {/* MILITARY RETIREMENT intelligence (knowledge/militaryRetirement.js): when the
                    event is a military retirement, surface the real ceremony protocol — the
                    sequence + the elements that carry a decision or lead time — grounded to Army
                    references. Only renders for an authored branch (Army today); a civilian
                    retirement or an unauthored branch shows nothing here. */}
                {(() => {
                  const mil = (() => { try { return militaryRetirementContext(event); } catch { return null; } })();
                  if (!mil || !mil.authored) return null;
                  return (
                    <div style={{ marginBottom: 'var(--sp-5)', padding: 'var(--sp-3) 14px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--bg-band)' }}>
                      <div className="eyebrow" style={{ color: 'var(--steel-soft)', marginBottom: 6 }}>{mil.label} · retirement protocol</div>
                      <p className="v-meta" style={{ margin: '0 0 8px' }}>This is a military retirement — it carries protocol a civilian party doesn’t. The ceremony runs roughly:</p>
                      <ol style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 'var(--t-body-s)', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                        {mil.ceremonySequence.map((s, i) => <li key={i} style={{ margin: '2px 0' }}>{s}</li>)}
                      </ol>
                      <p className="v-meta" style={{ margin: '0 0 6px', fontWeight: 650, color: 'var(--ink)' }}>What carries a decision or real lead time:</p>
                      <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 'var(--t-body-s)', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                        {mil.protocol.map((p) => <li key={p.id} style={{ margin: '4px 0' }}><b style={{ color: 'var(--ink)' }}>{p.label}.</b> {p.note}</li>)}
                      </ul>
                      <p className="grounding" style={{ margin: 0, opacity: .8 }}>Grounded in Army protocol references — AR 600-25, DA PAM 600-60, the U.S. Flag Code, and Army Retirement Services.</p>
                    </div>
                  );
                })()}
                {[
                  ['honoree', 'Who is it for?', 'Margaret — my mom', false],
                  ['honoree_story', 'Their story, in a line or two', '32 years at the library; she taught half the county to read', true],
                  ['meaning_why', 'Why this matters', 'She never lets anyone celebrate her — this time we are', false],
                  ['feeling_words', 'How the day should feel', 'warm, loud, unhurried', false],
                  ['must_have_moment', 'The one moment that must happen', 'Everyone on the lawn for the sunset photo', false],
                  ['hostName', 'Who is the invitation from?', 'Todd — or “Todd & Sarah”', false],
                  ['deckLine', 'The line under your event’s name on the invite', 'Good food, good people', false],
                ].map(([key, label, ph, multi]) => (
                  <div key={key} style={{ marginBottom: 'var(--sp-4)' }}>
                    {/* Warm sentence-case prompt (was a tiny uppercase faint form
                        label) — these are questions to the host, not field captions. */}
                    <div style={{ fontSize: 'var(--t-body)', fontWeight: 650, color: 'var(--ink)', letterSpacing: '-.01em', marginBottom: 6 }}>{label}</div>
                    {multi ? (
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 58, resize: 'vertical', fontSize: 'var(--t-input)' }} placeholder={ph}
                        value={meaningDraft[key]} onChange={e => setMeaningDraft(d => ({ ...d, [key]: e.target.value }))} aria-label={label} />
                    ) : (
                      <input className="field" style={{ maxWidth: 'none', fontSize: 'var(--t-input)' }} placeholder={ph}
                        value={meaningDraft[key]} onChange={e => setMeaningDraft(d => ({ ...d, [key]: e.target.value }))} aria-label={label} />
                    )}
                  </div>
                ))}
                <div className="actions-row">
                  {(() => {
                    // Dirty-gate (per-screen audit: "Save it" fired a success toast even
                    // with zero changes) — only enabled when a field actually changed.
                    const _mk = ['honoree', 'honoree_story', 'meaning_why', 'feeling_words', 'must_have_moment', 'hostName', 'deckLine'];
                    const dirty = _mk.some(k => String(meaningDraft[k] || '').trim() !== String(event[k] || '').trim());
                    return (
                      <button className="cta" disabled={!dirty} style={!dirty ? { opacity: .5 } : undefined} onClick={() => {
                        if (!dirty) return;
                        const clean = {};
                        Object.entries(meaningDraft).forEach(([k, v]) => { clean[k] = String(v || '').trim(); });
                        patchEvent(clean, 'That’s the heart of it — the plan will protect it.');
                        setSheet(null);
                      }}>Save it</button>
                    );
                  })()}
                  {hasToastMaterial({ ...event, ...meaningDraft }) && (
                    <button className="mini" onClick={() => { try { openDraft('Your toast', draftToast({ ...event, ...meaningDraft }, profile)); } catch { toast('Couldn’t draft it.'); } }}>
                      Draft the toast
                    </button>
                  )}
                </div>
              </>
            )}
            {sheet.kind === 'sections' && (() => {
              // WAYFINDING FIX (host friction audit #1): the guaranteed, labeled
              // door to EVERY surface. A directory only — it holds no event data,
              // just named rows that route into the existing specialist sheets, so
              // it's a nav layer at L3, not a duplicate surface. Conditional groups
              // (travel/crab/cost-share/rain) show only when the event actually has
              // them, but the CORE eight always have a door, on-track or not — the
              // whole point (before this, checklist/decisions/vendors/etc. had no
              // visible entry when the event was calm).
              const go = (kind) => { if (kind === 'ask') { setAskQ(''); setAskResult(null); setAskLLM(null); } setSheet({ kind }); };
              const groups = [
                { title: 'Your plan', rows: [
                  { k: 'guests', label: 'Guests', sub: 'Who’s coming, and what they need' },
                  { k: 'food', label: 'The spread & shopping', sub: 'The menu and the store run' },
                  { k: 'budget', label: 'Your money', sub: 'Planned, spoken for, and spent' },
                  { k: 'vendors', label: 'People you’re hiring', sub: 'Bookings, deposits, day-of arrival' },
                  { k: 'space', label: 'Space, seats & helpers', sub: 'Tables, chairs, rentals, who’s helping' },
                  { k: 'seating', label: 'Who sits where', sub: 'The floor plan' },
                  { k: 'tasks', label: 'Your checklist', sub: 'Every step, in the order it matters' },
                  { k: 'decisions', label: 'Calls to make', sub: 'Open choices the plan is waiting on' },
                ] },
                { title: 'Keep it on track', rows: [
                  { k: 'risks', label: 'What could go wrong', sub: 'The risks the plan is watching' },
                  ...(outdoor ? [{ k: 'rain', label: 'If it rains', sub: 'Your weather backup' }] : []),
                  ...(travel && travel.relevant ? [{ k: 'lodging', label: 'Travel & where everyone stays', sub: 'Lodging, rides, arrivals' }] : []),
                  ...(crab && crab.relevant ? [{ k: 'crabs', label: 'The crab order', sub: 'Bushels, pickers, the crab house' }] : []),
                  ...(event.costSharing ? [{ k: 'costshare', label: 'Who pays for what', sub: 'Splitting the cost' }] : []),
                ] },
                { title: 'More', rows: [
                  { k: 'meaning', label: 'Make it yours', sub: 'The moments that make it personal' },
                  { k: 'ask', label: 'Ask the Boss', sub: 'A question, answered from your numbers' },
                  { k: 'pass', label: 'The One-Event Pass', sub: '$39 · one event, no subscription' },
                  { k: 'settings', label: 'You & your account', sub: 'Your name, area, what it remembers' },
                ] },
              ];
              return (
                <>
                  <p className="grounding" style={{ margin: '0 0 14px' }}>Every part of your plan, in one place — tap any to open it.</p>
                  {groups.map(g => g.rows.length ? (
                    <div key={g.title} style={{ marginBottom: 'var(--sp-3)' }}>
                      <div className="shelf-label" style={{ margin: '0 0 4px' }}>{g.title}</div>
                      {g.rows.map(r => (
                        <button key={r.k} className="later-row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => go(r.k)}>
                          <span className="f-main">
                            <span className="f-name">{r.label}</span>
                            <span className="v-meta">{r.sub}</span>
                          </span>
                          <span className="chev" aria-hidden="true">›</span>
                        </button>
                      ))}
                    </div>
                  ) : null)}
                </>
              );
            })()}
            {sheet.kind === 'pass' && (() => {
              // #2 COMMERCE — the One-Event Pass surface (wedge: DIY host, one
              // event, one price — NO subscription). CTA TRUTHFULNESS: only offer
              // a real charge when a payment backend is actually wired
              // (isStripeApiConfigured). Otherwise say plainly that it's free in
              // preview and this event is unlocked — never fake a checkout or
              // imply a charge the app can't take. No credentials are handled here;
              // payment happens on Stripe's own hosted page.
              // TWO gates, both required, so we NEVER charge before the business
              // decides to: the Stripe backend must exist AND billing must be
              // explicitly switched live (REACT_APP_BILLING_LIVE=1). Default (no
              // flag) → the honest "free in preview" state, matching the standing
              // "not ready to charge" decision — the API base being set for RSVP
              // must not silently turn on a real $39 charge.
              const canCharge = (() => { try { return isStripeApiConfigured() && process.env.REACT_APP_BILLING_LIVE === '1'; } catch { return false; } })();
              const buyPass = async () => {
                try {
                  const out = await createCheckoutSession({ amountCents: 3900, label: 'Event Boss — One-Event Pass', feeId: 'one-event-pass-' + event.id, eventId: event.id, clientName: (profile && profile.name) || '' });
                  if (out && out.url) { window.location.assign(out.url); return; }
                  toast('Couldn’t open checkout just now — please try again.');
                } catch { toast('Checkout isn’t available right now.'); }
              };
              const perks = [
                ['Every tab, fully unlocked', 'The whole plan for this event — food, guests, budget, the day-of run, the invite — nothing held back.'],
                ['One event, one price', 'A single $39 for this event. No monthly fee, no auto-renew, nothing to cancel.'],
                ['Yours to keep', 'The plan, the invite link, and the recap stay live through the event and after.'],
                ['Real numbers, no upsell traps', 'Every price is an honest estimate you can change — the pass never gates the truth about your own money.'],
              ];
              return (
                <>
                  <div style={{ padding: '2px 0 8px' }}>
                    <div className="eyebrow">One event · one price</div>
                    <div style={{ fontSize: 'var(--t-hero-star)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.05, margin: '6px 0 4px', color: 'var(--ink)' }}>$39</div>
                    <p className="grounding" style={{ margin: 0 }}>No subscription. Pay once for this event and everything’s yours.</p>
                  </div>
                  {perks.map(([t, d], i) => (
                    <div key={i} className="brow" style={{ borderTop: '1px solid var(--line-soft)', padding: 'var(--sp-3) 0' }}>
                      <p className="f-name" style={{ margin: '0 0 2px' }}>{t}</p>
                      <p className="grounding" style={{ margin: 0 }}>{d}</p>
                    </div>
                  ))}
                  {canCharge ? (
                    <>
                      <button className="cta" style={{ marginTop: 'var(--sp-3)', width: '100%' }} onClick={buyPass}>Get the pass — $39</button>
                      <p className="grounding" style={{ margin: '8px 0 0', textAlign: 'center', opacity: .75 }}>Secure checkout on Stripe. We never see your card.</p>
                    </>
                  ) : (
                    <div className="brow" style={{ borderTop: 'none', background: 'var(--ok-tint)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) 14px', marginTop: 'var(--sp-3)' }}>
                      <p className="f-name" style={{ margin: '0 0 2px', color: 'var(--ok)' }}>Free while Event Boss is in preview</p>
                      <p className="grounding" style={{ margin: 0 }}>This event is fully unlocked right now — nothing to pay. When we launch, keeping an event is a one-time $39, and we’ll tell you before anything changes.</p>
                    </div>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'help' && (() => {
              // #4 RECOVERY PATH — deterministic, grounded in THIS event's real
              // state (no fake AI): where you stand, the ONE next move (the same
              // nextCue the hero uses, deep-linked), how the app works, a way to
              // ask a specific question, and the foundations people get stuck on.
              const nc = phaseCues && phaseCues.nextCue;
              const ready = (phaseCues && phaseCues.totalCount)
                ? `${phaseCues.completedCount} of ${phaseCues.totalCount} parts of your plan handled` : null;
              // Foundations — only the ones NOT yet done, so the list shrinks as
              // the host makes progress (real state, never a static checklist).
              const foundations = [
                { done: !!String(event.date || '').trim(), label: 'Set the date', route: { tab: 'Event Details', focusField: 'event-date' } },
                { done: !!String(event.venue || '').trim(), label: 'Add the location', route: { tab: 'Event Details', focusField: 'event-venue' } },
                { done: guests > 0, label: 'Set the guest count', route: { tab: 'Guests', focusField: 'guests-entry' } },
                { done: !!money.planned, label: 'Set a budget', route: { tab: 'Budget', focusField: 'budget' } },
              ].filter(f => !f.done);
              return (
                <>
                  <p className="grounding" style={{ margin: '0 0 14px' }}>Take a breath — you don’t have to figure this out alone. Here’s exactly where you stand and the next move.{ready ? ` You’re at ${ready}.` : ''}</p>
                  {nc && (
                    <div className="brow" style={{ borderTop: 'none', background: 'var(--steel-tint)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) 14px', marginBottom: 'var(--sp-3)' }}>
                      <div className="shelf-label" style={{ margin: '0 0 4px', color: 'var(--steel-soft)' }}>Your next move</div>
                      <p className="f-name" style={{ margin: '0 0 8px' }}>{nc.label}</p>
                      <button className="cta" onClick={() => { if (!routeSheet(nc.route)) { setStage('plan'); setSheet(null); } }}>Take me to it</button>
                    </div>
                  )}
                  <div className="shelf-label" style={{ margin: '0 0 6px' }}>How Event Boss works</div>
                  <p className="grounding" style={{ margin: '0 0 5px' }}><b>Plan</b> works backward from your date — it only ever asks for the next thing that matters, never the whole mountain at once.</p>
                  <p className="grounding" style={{ margin: '0 0 5px' }}>Check things off as you go and the plan keeps up — the numbers and what’s-next re-figure themselves.</p>
                  <p className="grounding" style={{ margin: '0 0 5px' }}><b>The Day</b> takes the wheel on the day itself; <b>After</b> helps you wrap up and thank people.</p>
                  <p className="grounding" style={{ margin: '0 0 14px' }}>Nothing here is made up — every number shows where it came from, and you can always change it.</p>
                  {foundations.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '0 0 6px' }}>Still to set up</div>
                      {foundations.map((f, i) => (
                        <button key={i} className="later-row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                          onClick={() => { if (!routeSheet(f.route)) { setStage('plan'); setSheet(null); } }}>
                          <span className="t" style={{ fontWeight: 550 }}>{f.label}</span>
                          <span className="chev" aria-hidden="true">›</span>
                        </button>
                      ))}
                    </>
                  )}
                  <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Have a specific question?</div>
                  <button className="cta" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                    onClick={() => { setAskQ(''); setAskResult(null); setAskLLM(null); setSheet({ kind: 'ask' }); }}>
                    Ask the Boss — answered from your own numbers
                  </button>
                </>
              );
            })()}
            {sheet.kind === 'ask' && (() => {
              // Build the Q&A context from the SAME engine outputs the hero shows
              // — no parallel math. Each term is present only when its data is.
              const askCtx = {
                money,
                foodPlan: foodPlan ? {
                  foodLow: foodPlan.foodLow, foodHigh: foodPlan.foodHigh,
                  perHeadLow: foodPlan.guests ? foodPlan.foodLow / foodPlan.guests : null,
                  perHeadHigh: foodPlan.guests ? foodPlan.foodHigh / foodPlan.guests : null,
                  guests: foodPlan.guests || guests,
                } : null,
                guests: guests || null,
                guestBand: expect ? `likely ${expect.low}–${expect.high} on the day${expect.note ? ` (${expect.note})` : ''}` : null,
                wx,
                readiness: (phaseCues && phaseCues.totalCount) ? { done: phaseCues.completedCount, total: phaseCues.totalCount, nextLabel: phaseCues.nextCue && phaseCues.nextCue.label } : null,
                eventName: event.name,
              };
              const ask = (text) => { const t = String(text || '').trim(); if (!t) return; setAskQ(t); setAskLLM(null); setAskResult(answerPlanQuestion(t, askCtx)); };
              // B3 escalation: when the deterministic engine can't answer, and a
              // backend is configured, hand the question to the grounded orchestrator
              // (engines run locally as tools; every number still traces to one).
              // Any failure — no key (503), offline, the model never settling —
              // degrades to an honest "assistant isn't reachable" and the plain
              // deterministic answer stays put. Never a fabricated reply.
              const askAssistant = async () => {
                if (!session) { setAskLLM({ needsSignin: true }); return; }
                setAskLLM({ loading: true });
                try {
                  // B3 streaming: the prose lands as it's written instead of after a
                  // ~15s blank wait. Purely a transport swap — the loop, the tool
                  // results, and the grounding check are identical either way, and
                  // the streamed text is a PREVIEW: the authoritative answer (and its
                  // grounding verdict) still replaces it when the turn completes, so
                  // a flagged figure can never slip through on the strength of having
                  // been read early.
                  const transport = orchestratorStreamTransport({
                    onDelta: (chunk) => setAskLLM((s) => (s && s.loading ? { ...s, partial: (s.partial || '') + chunk } : s)),
                  });
                  const out = await runOrchestration({ question: askQ, ctx: { event }, transport });
                  setAskLLM(out.answer ? { answer: out.answer, grounded: out.grounded } : { unavailable: true });
                } catch {
                  setAskLLM({ unavailable: true });
                }
              };
              const goAnswer = (route) => {
                if (route === 'plan') { setStage('plan'); setSheet(null); return; }
                if (['budget', 'food', 'guests', 'rain'].includes(route)) setSheet({ kind: route });
              };
              const examples = ['Will $2,000 cover it?', 'How much food do I need?', 'Am I ready?', 'Will it rain?'];
              return (
                <>
                  <p className="grounding" style={{ margin: '0 0 12px' }}>Ask about your money, food, guests, weather, or what’s next — answered straight from your plan, with the assumptions shown. Nothing made up.</p>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <input className="field" style={{ maxWidth: 'none', flex: 1, fontSize: 'var(--t-input)' }} placeholder="e.g. will $2,000 cover it?"
                      value={askQ} onChange={e => setAskQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(askQ); }} aria-label="Ask a question about your plan" autoFocus />
                    <button className="cta" onClick={() => ask(askQ)} disabled={!askQ.trim()}>Ask</button>
                  </div>
                  {!askResult && (
                    <div style={{ marginTop: 'var(--sp-3)' }}>
                      <div className="of" style={{ marginBottom: 2 }}>Try one of these</div>
                      {examples.map(ex => (
                        <button key={ex} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => ask(ex)}>
                          <span style={{ flex: 1 }}>{ex}</span>
                          <span aria-hidden="true" style={{ color: 'var(--muted)' }}>›</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {askResult && (
                    <div className="brow" style={{ marginTop: 'var(--sp-4)' }}>
                      <p className="f-name" style={{ marginBottom: askResult.basis.length ? 6 : 0 }}>{askResult.answer}</p>
                      {askResult.basis.map((b, i) => <p key={i} className="grounding" style={{ margin: '2px 0 0', color: 'var(--faint)' }}>{b}</p>)}
                      {askResult.matched && askResult.route && (
                        <div className="actions-row" style={{ marginTop: 8 }}>
                          <button className="mini" onClick={() => goAnswer(askResult.route)}>Take me there</button>
                          <button className="mini" onClick={() => { setAskQ(''); setAskResult(null); setAskLLM(null); }}>Ask another</button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* B3 — escalate a deterministic MISS to the grounded assistant, only
                      when a backend is configured (demo build has none → no dead button).
                      Every state here is honest: loading, a grounded AI answer, or an
                      unavailable notice that leaves the plain answer standing. */}
                  {askResult && !askResult.matched && isOrchestratorApiConfigured() && (
                    <div className="brow" style={{ marginTop: 'var(--sp-3)' }}>
                      {!askLLM && (
                        <>
                          <p className="grounding" style={{ margin: '0 0 8px', color: 'var(--faint)' }}>That’s outside what your numbers can answer — but I can take a broader look, still grounded in your plan.</p>
                          <button className="mini" onClick={askAssistant}>Take a broader look</button>
                        </>
                      )}
                      {askLLM && askLLM.loading && !askLLM.partial && (
                        <p className="grounding" style={{ margin: 0, color: 'var(--faint)' }}>Taking a broader look — I read your numbers, never invent them…</p>
                      )}
                      {/* The answer as it's written. Deliberately NOT styled as the
                          finished answer (f-name): it's still being checked, so it
                          reads as in-progress until the grounded verdict lands and
                          replaces it below. */}
                      {askLLM && askLLM.loading && askLLM.partial && (
                        <p className="f-name" style={{ marginBottom: 4, color: 'var(--ink-soft)' }}>{askLLM.partial}<span aria-hidden="true" style={{ opacity: .5 }}>▍</span></p>
                      )}
                      {askLLM && askLLM.answer && (
                        <>
                          <p className="f-name" style={{ marginBottom: 4 }}>{askLLM.answer}</p>
                          <p className="grounding" style={{ margin: '2px 0 0', color: 'var(--faint)' }}>
                            A broader look, grounded in your plan.{askLLM.grounded && !askLLM.grounded.ok ? ' One figure here isn’t from your numbers — worth a double-check.' : ''}
                          </p>
                          <div className="actions-row" style={{ marginTop: 8 }}>
                            <button className="mini" onClick={() => { setAskQ(''); setAskResult(null); setAskLLM(null); }}>Ask another</button>
                          </div>
                        </>
                      )}
                      {askLLM && askLLM.needsSignin && (
                        <>
                          <p className="grounding" style={{ margin: '0 0 8px', color: 'var(--faint)' }}>Sign in first — a broader look runs on your account, so your plan stays private to you.</p>
                          <button className="mini" onClick={() => setSheet({ kind: 'settings' })}>Sign in</button>
                        </>
                      )}
                      {askLLM && askLLM.unavailable && (
                        <p className="grounding" style={{ margin: 0, color: 'var(--faint)' }}>I can’t take a broader look right now — the answer above is what your plan tells you directly.</p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
            {/* NAV SHEET (Figma Nav B) — summoned from the eyebrow ▾; replaces the floating
                dock in elegant mode. Phase segmented control + the quiet rows. */}
            {sheet.kind === 'nav' && (
              <>
                <div className="shelf-label" style={{ margin: '0 0 9px' }}>Where in the event</div>
                <div className="navseg">
                  {[['create', 'Create'], ['plan', 'Plan'], ['day', 'The Day'], ['after', 'After']].map(([s, label]) => (
                    <button key={s} className={'navseg-b' + (stage === s ? ' on' : '')} onClick={() => { setStage(s); setSheet(null); }}>{label}</button>
                  ))}
                </div>
                <div className="navrows">
                  <button className="navrow" onClick={() => setSheet({ kind: 'events' })}>
                    <span className="nr-l">This event</span>
                    <span className="nr-r">{event.name}<span className="chev" aria-hidden="true">›</span></span>
                  </button>
                  <button className="navrow" onClick={() => setSheet({ kind: 'sections' })}>
                    <span className="nr-l">Jump to a section</span>
                    <span className="nr-r">vendors · food · guests…<span className="chev" aria-hidden="true">›</span></span>
                  </button>
                  <button className="navrow" onClick={() => { setSheet(null); setPaletteOpen(true); }}>
                    <span className="nr-l">Search</span>
                    <span className="nr-r"><span className="chev" aria-hidden="true">›</span></span>
                  </button>
                  <button className="navrow" onClick={() => { setAskQ(''); setAskResult(null); setAskLLM(null); setSheet({ kind: 'ask' }); }}>
                    <span className="nr-l">Ask the Boss</span>
                    <span className="nr-r"><span className="chev" aria-hidden="true">›</span></span>
                  </button>
                  <button className="navrow" onClick={() => setSheet({ kind: 'help' })}>
                    <span className="nr-l">Feeling stuck?</span>
                    <span className="nr-r"><span className="chev" aria-hidden="true">›</span></span>
                  </button>
                  <button className="navrow" onClick={() => setSheet({ kind: 'settings' })}>
                    <span className="nr-l">You &amp; settings</span>
                    <span className="nr-r"><span className="chev" aria-hidden="true">›</span></span>
                  </button>
                </div>
              </>
            )}
            {sheet.kind === 'events' && (
              <>
                {(REAL_EVENTS.length > 0 || hydratedEvents.length > 0) && (
                  <>
                    <div className="shelf-label" style={{ margin: '0 0 6px' }}>Yours{hydratedEvents.length ? ' — synced to your account' : ' — on this device'}</div>
                    {[...REAL_EVENTS, ...hydratedEvents.filter(he => !REAL_EVENTS.some(re => re.id === he.id))].map((e, i) => {
                      const isActive = e.id === eventId;
                      const d = daysUntil(e.date);
                      return (
                        <button key={e.id} className={'frow' + (isActive ? ' rowfocus' : '')} style={{ animation: `cardin 260ms var(--ease-out) ${Math.min(i, 8) * 30}ms both` }}
                          onClick={() => { switchEvent(e.id); setSheet(null); }}>
                          <span className="f-main">
                            <span className="f-name">{e.name}{isActive ? <span className="tag plan">current</span> : null}</span>
                            <span className="v-meta">{[eventTypeLabel(e), e.venue].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className="of" style={{ whiteSpace: 'nowrap' }}>{d === null ? 'no date' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : 'in ' + d + 'd'}</span>
                        </button>
                      );
                    })}
                    <div className="shelf-label" style={{ margin: '10px 0 6px' }}>Samples</div>
                  </>
                )}
                {[...ROSTER, ...customs.map(c => ({ ...c, _custom: true }))].map((e, i) => {
                  const isActive = e.id === eventId;
                  const src = e;
                  const d = daysUntil(src.date);
                  const label = e._custom ? (e.name || 'Yours') : (e === MY_CRAB_FEAST ? 'My Crab Feast' : eventTypeLabel(e));
                  // DISAMBIGUATION-1: a seed/sample event can share a name+venue with the
                  // host's own real event (e.g. both default to "My Crab Feast" / "Backyard"),
                  // reading as an unlabeled duplicate. Every row in this "Samples & tests"
                  // shelf is synthetic EXCEPT MY_CRAB_FEAST when it's been promoted to the
                  // host's real crab-feast event (appCrab) — a real "Sample" tag, not invented.
                  const isSample = !e._custom && !(e === MY_CRAB_FEAST && appCrab);
                  return (
                    <button key={e.id} className={'frow' + (isActive ? ' rowfocus' : '')} style={{ animation: `cardin 260ms var(--ease-out) ${Math.min(i, 8) * 30}ms both` }}
                      onClick={() => { switchEvent(e.id); setSheet(null); }}>
                      <span className="f-main">
                        <span className="f-name">{label}{isSample ? <span style={{ fontSize: 'var(--t-caption)', fontWeight: 650, color: 'var(--ink-soft)', background: 'var(--bg-band)', border: '1px solid var(--line)', borderRadius: 'var(--r-pill)', padding: '1px 8px', marginLeft: 6, opacity: 0.7 }}>Sample</span> : null}{isActive ? <span className="tag plan">current</span> : null}</span>
                        <span className="v-meta">{src.name === label ? '' : src.name}{src.venue ? (src.name === label ? '' : ' · ') + src.venue : ''}</span>
                      </span>
                      <span className="of" style={{ whiteSpace: 'nowrap' }}>{d === null ? 'no date' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : 'in ' + d + 'd'}</span>
                    </button>
                  );
                })}
                {!activeCustom && Object.keys(patch).length > 0 && (
                  <div className="actions-row" style={{ marginTop: 'var(--sp-3)' }}>
                    <button className="mini" onClick={() => { setPatch({}); toast('Your changes to this event were cleared.'); }}>Reset changes to this event</button>
                  </div>
                )}
              </>
            )}
            {sheet.kind === 'crabs' && (() => {
              const cp = (event.crabPlan && typeof event.crabPlan === 'object') ? event.crabPlan : {};
              const lines = Array.isArray(cp.lines) ? cp.lines : [];
              const writeCp = (next, msg) => patchEvent({ crabPlan: { ...cp, ...next } }, msg);
              const UNIT_LABEL = { dozen: 'dozen', half_bushel: 'half bushel', bushel: 'bushel' };
              const SIZE_LABEL = { medium: 'medium', large: 'large', extra_large: 'XL', jumbo: 'jumbo' };
              // Reference prices for the picked size+unit, from the verified ladder.
              const refs = (() => {
                if (!crabLadder) return [];
                const KEYS = { medium: ['medium'], large: ['largeFemale', 'largeMale'], extra_large: ['xlFemale', 'xlMale'], jumbo: ['jumboMale'] };
                const FIELD = { dozen: 'perDz', half_bushel: 'perHalfBushel', bushel: 'perBushel' };
                return (KEYS[crabAdd.size] || []).map(k => {
                  const row = crabLadder[k]; const p = row && row[FIELD[crabAdd.unit]];
                  return p ? { label: (/Female/.test(k) ? 'female' : /Male/.test(k) ? 'male' : 'ref') + ' $' + p, price: p } : null;
                }).filter(Boolean);
              })();
              // POP-1E: the reusable procurement estimate — an explained band
              // (assumptions/pricing model/region/confidence/cost reducers) plus
              // pickup/storage/cooking logistics. Region from the event's state.
              const _pm = /,\s*([A-Za-z]{2})\s*$/.exec(String(event.venueCity || ''));
              const _pstate = (_pm ? _pm[1].toUpperCase() : null) || (profile && profile.state ? String(profile.state).toUpperCase() : null);
              const proc = (() => { try { return buildCrabProcurement(event, { state: _pstate }); } catch { return null; } })();
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the order's own crab
                      count is the star — the old "About N crabs" meta line is
                      PROMOTED here. Figures from buildCrabPlan, host prices only. */}
                  {lines.length > 0 && (
                    <SheetHero
                      eyebrow="The order adds up to"
                      star={`about ${crab.totalEstimatedCrabs} crabs`}
                      sub={
                        (crab.coveredCrabsPerPerson != null ? '~' + (Math.round(crab.coveredCrabsPerPerson * 10) / 10) + ' each · ' : '')
                        + (crab.totalEstimatedCost != null ? 'about ' + fmt(crab.totalEstimatedCost) + ' from your prices' : 'add prices to see the cost')
                        + (crab.boughtCost > 0 ? ' · ' + fmt(crab.boughtCost) + ' bought' : '')
                      }
                    />
                  )}
                  {proc && proc.cost && (
                    <div className="card" style={{ marginBottom: 'var(--sp-3)', padding: '13px 15px' }}>
                      <div className="line" style={{ padding: 0 }}>
                        <span className="shelf-label" style={{ margin: 0 }}>{proc.explanation.pricingModel === 'host-entered-actual' ? 'Your crab cost' : 'Estimated crab cost'}</span>
                        <span className="amt" style={{ fontSize: 'var(--t-stat-sm)', fontWeight: 800 }}>
                          {proc.cost.low === proc.cost.high ? fmt(proc.cost.low) : fmt(proc.cost.low) + '–' + fmt(proc.cost.high)}
                        </span>
                      </div>
                      {proc.cost.perPerson && (
                        <p className="grounding" style={{ margin: '3px 0 0' }}>
                          {proc.cost.perPerson.low === proc.cost.perPerson.high ? fmt(proc.cost.perPerson.low) : fmt(proc.cost.perPerson.low) + '–' + fmt(proc.cost.perPerson.high)} a head · {proc.explanation.confidence} confidence · {proc.explanation.regionalFactors.region}
                        </p>
                      )}
                      {proc.explanation.assumptions[0] && (
                        <p className="grounding" style={{ margin: '6px 0 0', opacity: .8 }}>{proc.explanation.assumptions[0]} {proc.explanation.regionalFactors.note}</p>
                      )}
                      {proc.explanation.costReducers.length > 0 && (
                        <details style={{ marginTop: 'var(--sp-2)' }}>
                          <summary style={{ cursor: 'pointer', fontSize: 'var(--t-row-sub)', fontWeight: 650, color: 'var(--steel-soft)' }}>Ways to spend less</summary>
                          <div style={{ marginTop: 6 }}>
                            {proc.explanation.costReducers.map((c, i) => (
                              <p key={i} className="grounding" style={{ margin: '0 0 var(--sp-1)' }}><strong style={{ color: 'var(--ink-soft)' }}>{c.label}.</strong> {c.hint}</p>
                            ))}
                          </div>
                        </details>
                      )}
                      {(proc.logistics.pickupWindow || proc.logistics.cooking) && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 'var(--t-row-sub)', fontWeight: 650, color: 'var(--steel-soft)' }}>Pickup, storage & cooking</summary>
                          <div style={{ marginTop: 6 }}>
                            {proc.logistics.pickupWindow && <p className="grounding" style={{ margin: '0 0 var(--sp-1)' }}><strong style={{ color: 'var(--ink-soft)' }}>Pickup:</strong> {proc.logistics.pickupWindow.note}</p>}
                            {proc.logistics.storage && <p className="grounding" style={{ margin: '0 0 var(--sp-1)' }}><strong style={{ color: 'var(--ink-soft)' }}>Storage:</strong> {proc.logistics.storage.note}</p>}
                            {proc.logistics.transport && <p className="grounding" style={{ margin: '0 0 var(--sp-1)' }}><strong style={{ color: 'var(--ink-soft)' }}>Transport:</strong> {proc.logistics.transport.note}</p>}
                            {proc.logistics.cooking && <p className="grounding" style={{ margin: '0 0 var(--sp-1)' }}><strong style={{ color: 'var(--ink-soft)' }}>Cooking:</strong> {proc.logistics.cooking.note}</p>}
                            {(proc.logistics.servingWaves || []).map((w, i) => (
                              <p key={i} className="grounding" style={{ margin: '0 0 var(--sp-1)' }}><strong style={{ color: 'var(--ink-soft)' }}>Wave {w.wave} ({w.timing}):</strong> {w.note}</p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  {crab.coverageCopy && (() => {
                    // Per-person coverage vs the suggested target, on the Three-State Model (UX_02):
                    // under = ATTENTION (amber), on-target = ON_TRACK (green). "Over" is NOT a
                    // status (over-provisioning isn't a risk, and there's no sanctioned 4th status
                    // color) so it stays neutral/informational — the OVER label + copy carry it.
                    const COV = {
                      under:   { label: 'Under',     color: 'var(--warn)',  tint: 'var(--warn-tint)' },
                      covered: { label: 'On target', color: 'var(--ok)',    tint: 'var(--ok-tint)' },
                      extra:   { label: 'Over',      color: 'var(--muted)', tint: 'var(--steel-tint)' },
                    };
                    const m = COV[crab.coverageStatus] || null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: '0 2px 6px' }}>
                        {m && <span style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: m.color, background: m.tint, borderRadius: 999, padding: '2px 9px', lineHeight: 1.5 }}>{m.label}</span>}
                        <span className="v-meta" style={{ margin: 0, color: m ? m.color : undefined }}>{crab.coverageCopy}</span>
                      </div>
                    );
                  })()}
                  {lines.length === 0 && (() => {
                    // RECOMMEND-1: a real starting mix (bushels/dozens, kid-adjusted
                    // pickers) instead of leaving the host to guess bushels-vs-dozens
                    // from scratch. One tap turns it into real, editable order lines —
                    // no separate "estimate" living apart from the real order.
                    const rec = (() => { try { return recommendCrabOrder(event); } catch { return null; } })();
                    if (!rec) return null;
                    return (
                      <div className="card" style={{ marginBottom: 'var(--sp-3)', padding: '13px 15px' }}>
                        <div className="shelf-label" style={{ margin: 0 }}>A starting order</div>
                        <p className="grounding" style={{ margin: 'var(--sp-1) 0 0' }}>{rec.summary} — about {rec.totalCrabs} crabs.</p>
                        <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', opacity: .85 }}>{rec.note}</p>
                        <button className="cta" style={{ marginTop: 10 }} onClick={() => {
                          const newLines = rec.lines.map((l, i) => ({ id: 'cl-rec-' + i + '-' + l.size + '-' + l.unit, ...l }));
                          writeCp({ lines: [...lines, ...newLines] }, 'Added — a real starting point, edit any line to match your vendor’s quote.');
                        }}>Use this order</button>
                      </div>
                    );
                  })()}
                  {/* order summary promoted into the sheet hero above */}
                  {lines.map((l, i) => {
                    const writeLine = (patch, msg) => writeCp({ lines: lines.map((x, ix) => ix === i ? { ...x, ...patch } : x) }, msg);
                    const perUnitCount = lineCrabCount(l);
                    return (
                    <div className="line" key={l.id || i} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{l.quantity}× {UNIT_LABEL[l.unit] || l.unit} {SIZE_LABEL[l.size] || l.size}</span>
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button className="mini" style={l.bought ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                            onClick={() => {
                              // COST-TRUTH GATE: a crab line needs its real price
                              // before it can be bought — same rule as the spread.
                              if (!l.bought && !(Number(l.pricePerUnit) > 0)) {
                                toast('Enter what this line cost first — tap a reference price or type your crab house’s quote.');
                                return;
                              }
                              writeLine({ bought: !l.bought }, l.bought ? 'Back on the order.' : 'Marked bought — real spend now, not an estimate.');
                            }}>
                            {l.bought ? 'bought' : 'mark bought'}
                          </button>
                          <button className="mini" aria-label="Remove line" onClick={() => writeCp({ lines: lines.filter((_, ix) => ix !== i) }, 'Line removed — the coverage math just recomputed.')}><span aria-hidden="true">×</span></button>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label className="of" style={{ display: 'flex', gap: 'var(--sp-1)', alignItems: 'center' }}>
                          crabs per {UNIT_LABEL[l.unit] || l.unit}
                          <input id={`crabline-${l.id}-count`} className="field" style={{ maxWidth: 72, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                            type="number" min="0" placeholder={defaultCountPerUnit(l.size, l.unit) != null ? `~${defaultCountPerUnit(l.size, l.unit)}` : 'ask vendor'}
                            value={l.estimatedCountPerUnit ?? ''}
                            onChange={e => { const n = parseInt(e.target.value, 10); writeLine({ estimatedCountPerUnit: Number.isFinite(n) && n > 0 ? n : undefined }); }} />
                        </label>
                        <label className="of" style={{ display: 'flex', gap: 'var(--sp-1)', alignItems: 'center' }}>
                          price per {UNIT_LABEL[l.unit] || l.unit}
                          <input id={`crabline-${l.id}-price`} className="field" style={{ maxWidth: 86, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                            type="number" min="0" placeholder="quote"
                            value={l.pricePerUnit ?? ''}
                            onChange={e => { const n = parseFloat(e.target.value); writeLine({ pricePerUnit: Number.isFinite(n) && n > 0 ? n : undefined }); }} />
                        </label>
                        {perUnitCount != null && <span className="of">≈ {perUnitCount} crabs</span>}
                      </div>
                    </div>
                    );
                  })}
                  {crab.bushelExplanation && <p className="grounding" style={{ margin: 'var(--sp-2) 0 0' }}>{crab.bushelExplanation}</p>}
                  {(crab.issues || []).map((iss, i) => (
                    <div key={i} style={{ margin: '6px 0 0' }}>
                      <p className="grounding" style={{ margin: 0, color: 'var(--warn)' }}>{iss.copy || iss.message || String(iss)}</p>
                      {/* The sheet is already open, so setting sheet.focus did nothing —
                          these ids (crab-headcount / crabline-<id>-count|price) aren't
                          consumed by any highlight branch. Scroll the real input into
                          view and focus it, so the button actually lands somewhere. */}
                      {iss.actionLabel && iss.route && iss.route.focusField && (
                        <button className="mini" style={{ marginTop: 'var(--sp-1)' }}
                          onClick={() => { const el = document.getElementById(iss.route.focusField); if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { el.scrollIntoView(); } setTimeout(() => { try { el.focus(); } catch {} }, 60); } }}>{iss.actionLabel}</button>
                      )}
                    </div>
                  ))}
                  <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 6px' }}>Who’s actually picking?</div>
                  <div className={sheet.focus === 'pickers' ? 'rowfocus' : ''} style={{ display: 'flex', gap: 10, alignItems: 'center', borderRadius: 'var(--r-md)', padding: '6px var(--sp-1)' }}>
                    <input id="crab-headcount" className="field" style={{ maxWidth: 80, fontSize: 'var(--t-input)', padding: 'var(--field)' }} type="number" min="0"
                      placeholder={String(guests || '')} aria-label="Serious crab pickers"
                      value={cp.crabEatingHeadcount || ''}
                      onChange={e => { const n = parseInt(e.target.value, 10) || 0; writeCp({ crabEatingHeadcount: n || undefined }, n ? 'Sizing crabs to ' + n + ' pickers — kids and light eaters don’t drive the count.' : 'Back to the full headcount.'); }} />
                    <span className="of" style={{ flex: 1 }}>serious pickers — kids and light eaters don’t drive the crab count</span>
                  </div>
                  {crab.pickerNote && <p className="grounding" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--warn)' }}>{crab.pickerNote}</p>}
                  {crab.pickerReconcileNote && <p className="grounding" style={{ margin: 'var(--sp-1) 0 0' }}>{crab.pickerReconcileNote}</p>}
                  <div className={'shelf-label' + (sheet.focus === 'order' ? ' rowfocus' : '')} style={{ margin: 'var(--sp-4) 0 6px', borderRadius: 'var(--r-sm)' }}>Add to the order</div>
                  {/* Calm open pickers (radio-lists, not chip clusters) — size then unit. */}
                  <div className="of" style={{ marginBottom: 2 }}>Size</div>
                  <OptionList ariaLabel="Crab size"
                    options={['medium', 'large', 'extra_large', 'jumbo'].map(sz => ({ label: SIZE_LABEL[sz], value: sz }))}
                    value={crabAdd.size} onPick={sz => setCrabAdd(a => ({ ...a, size: sz }))} />
                  <div className="of" style={{ margin: '10px 0 2px' }}>By the</div>
                  <OptionList ariaLabel="Crab unit"
                    options={['dozen', 'half_bushel', 'bushel'].map(u => ({ label: UNIT_LABEL[u], value: u }))}
                    value={crabAdd.unit} onPick={u => setCrabAdd(a => ({ ...a, unit: u }))} />
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 10, alignItems: 'center' }}>
                    <input className="field" style={{ maxWidth: 70, fontSize: 'var(--t-input)', padding: 'var(--field)' }} type="number" min="1" aria-label="How many"
                      value={crabAdd.qty} onChange={e => setCrabAdd(a => ({ ...a, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
                    <input className="field" style={{ maxWidth: 120, fontSize: 'var(--t-input)', padding: 'var(--field)' }} type="number" min="0" placeholder="$ each" aria-label="Price each"
                      value={crabAdd.price} onChange={e => setCrabAdd(a => ({ ...a, price: e.target.value }))} />
                    <button className="cta" onClick={() => {
                      const l = { id: 'cl-' + lines.length + '-' + crabAdd.size + '-' + crabAdd.unit, size: crabAdd.size, unit: crabAdd.unit, quantity: crabAdd.qty, pricePerUnit: parseFloat(crabAdd.price) || undefined, estimatedCountPerUnit: defaultCountPerUnit(crabAdd.size, crabAdd.unit) || undefined };
                      writeCp({ lines: [...lines, l] }, 'On the order — coverage and cost just recomputed.');
                      setCrabAdd(a => ({ ...a, qty: 1, price: '' }));
                    }}>Add it</button>
                  </div>
                  {refs.length > 0 && (
                    <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                      {refs.map(r => (
                        <button key={r.label} className="mini" onClick={() => setCrabAdd(a => ({ ...a, price: String(r.price) }))}>{r.label}</button>
                      ))}
                    </div>
                  )}
                  {/* Live selection preview — cost and coverage MOVE with every
                      chip, before the line is added. Reference range until the
                      host commits a price. */}
                  {(() => {
                    const per = defaultCountPerUnit(crabAdd.size, crabAdd.unit);
                    const crabsAdded = per ? per * crabAdd.qty : null;
                    const priceN = parseFloat(crabAdd.price) || 0;
                    const refLo = refs.length ? Math.min(...refs.map(r => r.price)) : null;
                    const refHi = refs.length ? Math.max(...refs.map(r => r.price)) : null;
                    const costLine = priceN > 0
                      ? 'about ' + fmt(priceN * crabAdd.qty) + ' at your price'
                      : refLo != null
                        ? 'reference ' + (refLo === refHi ? 'about ' + fmt(refLo * crabAdd.qty) : fmt(refLo * crabAdd.qty) + '–' + fmt(refHi * crabAdd.qty)) + ' — tap a price above to use it'
                        : 'no reference price for this pick — enter what your crab house quotes';
                    const heads = crab.crabEatingHeadcount || guests || 0;
                    return (
                      <p className="grounding" style={{ marginTop: 'var(--sp-2)', color: 'var(--ink-soft)' }}>
                        This pick: {crabAdd.qty}× {crabAdd.unit.replace('_', ' ')} {crabAdd.size.replace('_', ' ')}
                        {crabsAdded ? ' ≈ ' + crabsAdded + ' crabs' + (heads ? ' (~' + (Math.round(((crab.totalEstimatedCrabs || 0) + crabsAdded) / heads * 10) / 10) + ' each with the order so far)' : '') : ' — crab count varies, ask the vendor'} · {costLine}
                      </p>
                    );
                  })()}
                  <p className="grounding" style={{ marginTop: 'var(--sp-2)' }}>
                    Reference prices: Captain White's, Maine Ave Fish Market, July 2026 — one verified DMV point, not the market. Cost only counts prices you put in. Crabs count toward “spoken for” the moment they’re priced.
                  </p>
                </>
              );
            })()}
            {sheet.kind === 'sweep' && (() => {
              const total = reconfirmables.length;
              const pct = total ? Math.round((reconfirmedN / total) * 100) : 0;
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the answered count is
                      the star — the old count line + guidance line are PROMOTED
                      here. Same reconfirmables/reconfirmed72 data as the rows. */}
                  <SheetHero
                    eyebrow="Answered so far"
                    star={`${reconfirmedN} of ${total}`}
                    tone={total > 0 && reconfirmedN === total ? 'ok' : undefined}
                    sub={reconfirmedN === total
                      ? 'That’s everyone — the day is set.'
                      : 'Each note already knows their arrival time and your address. Send from your own thread — nothing goes out by itself.'}
                  />
                  <div className="bar" aria-hidden style={{ marginBottom: 'var(--sp-3)' }}><i style={{ width: pct + '%', background: 'var(--ok)' }} /></div>
                  {reconfirmables.map(v => {
                    const st = v.reconfirmed72 ? 'answered' : (sweepState[v.id] || 'waiting');
                    const d = draftVendorReconfirm(event, v, profile);
                    const phone = String(v.dayOfPhone || v.phone || '').trim();
                    const arrival = String(v.arrivalTime || v.loadIn || v.arrival || '').trim();
                    return (
                      <div key={v.id} className={'sweep-row ' + st}>
                        {/* flex row (was float:right on the state pill → name/meta
                            wrapped raggedly around it on 393px) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="f-name">{v.name}</div>
                            <div className="sv-meta">{[v.category, arrival ? 'arrives ' + arrival : null, v.cost ? '$' + Number(v.cost).toLocaleString() : null].filter(Boolean).join(' · ')}</div>
                          </div>
                          <span className="sweep-state">{st === 'waiting' ? 'no reply yet' : st === 'drafting' ? 'drafting…' : st === 'ready' ? 'draft ready' : 'they answered'}</span>
                        </div>
                        {st === 'ready' && !v.reconfirmed72 && (
                          <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                            {phone && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + phone.replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(d.body)}>Text them</a>}
                            <button className="mini" onClick={() => { try { navigator.clipboard.writeText(d.body); toast('Copied — paste it wherever you talk to ' + v.name + '.'); } catch { openDraft('Reconfirm — ' + v.name, d); } }}>Copy the note</button>
                            <button className="mini" onClick={() => openDraft('Reconfirm — ' + v.name, d)}>Read it first</button>
                          </div>
                        )}
                        {st !== 'answered' && (
                          <div className="actions-row" style={{ marginTop: 6 }}>
                            <button className="mini" onClick={() => writeVendor(v.id, { reconfirmed72: true }, v.name + ' is confirmed — ' + (total - reconfirmedN - 1) + ' to go.')}>They answered — all set</button>
                          </div>
                        )}
                        {st === 'answered' && (
                          <div className="actions-row" style={{ marginTop: 6 }}>
                            <button className="mini" onClick={() => writeVendor(v.id, { reconfirmed72: false }, 'Back on the list — worth another nudge.')}>Actually, still waiting</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {reconfirmedN < total && (
                    <div className="actions-row" style={{ marginTop: 'var(--sp-1)' }}>
                      <button className="mini" onClick={runSweepDrafts}>Draft the reconfirms</button>
                    </div>
                  )}
                  <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Every note is built from what’s on file — their arrival time, your date and place. Nothing invented, nothing auto-sent.</p>
                </>
              );
            })()}
            {sheet.kind === 'settings' && (() => {
              const mem = (() => { try { return summarizeHostIntel(profile); } catch { return { present: false, groups: [] }; } })();
              return (
                <>
                  {/* Sound lives here now (host request 2026-07-11) — the header
                      carries only the account icon. Same toggle, same prime. */}
                  <div className="later-row" style={{ borderTop: 'none', padding: 'var(--sp-1) 2px 14px' }}>
                    <span className="t">Sound</span>
                    <button className="mini" onClick={() => { primeMessageSound(); setMuted(m => !m); }}>
                      {muted ? 'Muted — tap for sound' : 'On — tap to mute'}
                    </button>
                  </div>
                  <div className="shelf-label" style={{ margin: '2px 0 6px' }}>You</div>
                  <input className="field" style={{ maxWidth: 'none' }} placeholder="Your name — it signs every note we draft"
                    defaultValue={(profile && profile.name) || ''} aria-label="Your name"
                    onBlur={e => { const v = e.target.value.trim(); if (v !== ((profile && profile.name) || '')) patchProfile({ name: v }, v ? 'Your notes now sign as ' + v + '.' : 'Signature cleared.'); }} />
                  <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Your area</div>
                  <input className="field" style={{ maxWidth: 'none' }} placeholder="Town or city — “Annapolis, MD”"
                    defaultValue={(profile && profile.city) || ''} aria-label="Your area"
                    onBlur={e => {
                      const v = e.target.value.trim();
                      if (v === ((profile && profile.city) || '')) return;
                      if (v && !isPlausibleCityText(v)) { toast('A town name — “Annapolis” or “Silver Spring, MD”.'); return; }
                      const m = /,\s*([A-Za-z]{2})\s*$/.exec(v);
                      patchProfile({ city: v, ...(m ? { state: m[1].toUpperCase() } : {}) }, v ? 'Area saved — local prices and weather line up to it.' : 'Area cleared.');
                    }} />
                  <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Used for local food prices and as the weather fallback when an event has no town of its own.</p>

                  <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 6px' }}>Your plan</div>
                  <button className="later-row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderTop: 'none' }} onClick={() => setSheet({ kind: 'pass' })}>
                    <span className="t" style={{ fontWeight: 550 }}>The One-Event Pass<span className="of" style={{ marginLeft: 6 }}>$39 · one event, no subscription</span></span>
                    <span className="chev" aria-hidden="true">›</span>
                  </button>

                  <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 6px' }}>What Event Boss remembers</div>
                  {mem.present && mem.groups.length ? (
                    <>
                      {mem.groups.map(g => (
                        <div key={g.domain} style={{ marginBottom: 6 }}>
                          <p className="grounding" style={{ margin: 0, fontWeight: 650, color: 'var(--ink-soft)' }}>{g.title}</p>
                          {(g.lines || []).map((l, i) => <p key={i} className="grounding" style={{ margin: '1px 0 0' }}>{l}</p>)}
                        </div>
                      ))}
                      <div className="actions-row" style={{ marginTop: 6 }}>
                        <button className="mini" onClick={() => { patchProfile(clearAllMemory(profile || {}), 'Memory cleared — Event Boss starts fresh.'); }}>Clear what it remembers</button>
                      </div>
                    </>
                  ) : (
                    <p className="grounding" style={{ margin: 0 }}>Nothing yet — after an event wraps, noting how it really went teaches the plans that follow.</p>
                  )}

                  <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 6px' }}>Your account</div>
                  {!isSupabaseConfigured() ? (
                    <p className="grounding" style={{ margin: 0 }}>Everything lives on this device. Accounts turn on when the cloud is configured.</p>
                  ) : session ? (
                    <>
                      <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>Signed in as <strong style={{ color: 'var(--ink-soft)' }}>{(session.user && session.user.email) || 'your account'}</strong> — your name, area, and what Event Boss remembers sync to your account across devices.</p>
                      {profile && profile.accountType === 'planner' && (
                        <p className="grounding" style={{ margin: '0 0 var(--sp-2)', opacity: .8 }}>You’re set up as a planner — this is the host view of your event. Your client roster and planner tools live in the full app.</p>
                      )}
                      <div className="actions-row">
                        <button className="mini" onClick={async () => { try { await supabase.auth.signOut(); toast('Signed out — everything here stays on this device.'); } catch { toast('Couldn’t sign out.'); } }}>Sign out</button>
                      </div>
                    </>
                  ) : authSent ? (
                    <>
                      <p className="grounding" style={{ margin: 0 }}>Check your email — the sign-in link lands you in Event Boss, and this shell picks the session up automatically.</p>
                      <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                        <button className="mini" onClick={resetAuthSent}>Use a different email</button>
                        <button className="mini" disabled={authBusy} onClick={sendMagicLink}>{authBusy ? 'Sending…' : 'Resend the link'}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input className="field" style={{ maxWidth: 'none' }} type="email" placeholder="you@example.com" value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)} aria-label="Email for sign-in link" />
                      <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                        <button className="cta" disabled={authBusy} onClick={sendMagicLink}>{authBusy ? 'Sending…' : 'Email me a sign-in link'}</button>
                      </div>
                      <p className="grounding" style={{ margin: 'var(--sp-2) 0 0', opacity: .75 }}>No password — the link signs you in. One account, both apps, this device and your others.</p>
                    </>
                  )}

                  {/* SYNC-HONESTY-1: an honest per-event sync status, backed
                      entirely by the syncState reader — no status is ever
                      shown for a curated sample (eventIsSyncable false), since
                      a sample never touches the cloud and a claim about it
                      would be fiction either way. */}
                  {isSupabaseConfigured() && eventIsSyncable && (() => {
                    const status = getEventSyncStatus(event);
                    if (!status) return null;
                    const lastSync = status === SYNC_STATUS.SYNCED ? getLastSyncTime(event.id) : null;
                    const pending = getPendingCount();
                    const showRetry = status === SYNC_STATUS.SYNC_FAILED || pending > 0;
                    const fmtSyncTime = (iso) => {
                      const t = iso ? new Date(iso).getTime() : NaN;
                      if (!Number.isFinite(t)) return '';
                      const min = Math.floor((Date.now() - t) / 60000);
                      if (min < 1) return 'just now';
                      if (min < 60) return min + (min === 1 ? ' minute ago' : ' minutes ago');
                      const hr = Math.floor(min / 60);
                      if (hr < 24) return hr + (hr === 1 ? ' hour ago' : ' hours ago');
                      const day = Math.floor(hr / 24);
                      if (day < 7) return day + (day === 1 ? ' day ago' : ' days ago');
                      return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };
                    return (
                      <>
                        <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 6px' }}>This event</div>
                        <div className="later-row" style={{ borderTop: 'none', padding: 'var(--sp-1) 2px 6px' }}>
                          <span className="t">{SYNC_STATUS_LABEL[status]}{lastSync ? ' · ' + fmtSyncTime(lastSync) : ''}</span>
                          {showRetry && (
                            <button className="mini" onClick={() => {
                              flushSync().then(res => {
                                if (res && res.flushed > 0) toast((res.flushed === 1 ? 'This change' : res.flushed + ' changes') + ' synced to your account.');
                                else toast('Still couldn’t reach the cloud — we’ll keep trying.');
                              }).catch(() => toast('Still couldn’t reach the cloud — we’ll keep trying.'));
                            }}>Retry now</button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </>
              );
            })()}
            {sheet.kind === 'thanks' && (() => {
              const yes = (event.guests || []).map((g, i) => ({ g, i })).filter(x => x.g && x.g.rsvp === 'Yes');
              const sent = yes.filter(x => x.g.thankYouSent).length;
              const queue = yes.filter(x => !x.g.thankYouSent);
              const cur = queue[0] || null;
              const pct = yes.length ? Math.round((sent / yes.length) * 100) : 0;
              const noteFor = (g) => {
                const first = String(g.name || '').trim().split(/\s+/)[0] || 'friend';
                let base = { body: '' };
                try { base = draftThankYou(event, profile); } catch { /* draft optional */ }
                const gift = g.giftReceived ? ' And thank you for the gift — it meant a lot.' : '';
                return (first + ' — ' + String(base.body || 'Thank you for celebrating with us.').replace(/^\s*(hi|hey|hello)[^,\n]*,?\s*/i, '')).trim() + gift;
              };
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the thanked count is
                      the star — the old count line and the all-done line are
                      PROMOTED here. Same rsvp==='Yes' / thankYouSent reads. */}
                  {yes.length > 0 && (
                    <SheetHero
                      eyebrow="Thanked so far"
                      star={`${sent} of ${yes.length}`}
                      tone={sent >= yes.length ? 'ok' : undefined}
                      sub={sent >= yes.length
                        ? 'That’s everyone — every yes has a thank-you.'
                        : 'One at a time — each note already knows who came and what they brought.'}
                    />
                  )}
                  <div className="bar" aria-hidden style={{ marginBottom: 'var(--sp-3)' }}><i style={{ width: pct + '%', background: 'var(--ok)' }} /></div>
                  {!yes.length && <p className="grounding">No confirmed guests on this one yet.</p>}
                  {cur && (() => {
                    const { g, i } = cur;
                    const body = noteFor(g);
                    const phone = String(g.phone || '').trim();
                    return (
                      <div className="brow" style={{ padding: '14px var(--sp-4)' }}>
                        <div className="f-name">{g.name}</div>
                        {/* UX_02 amber budget: a noted gift is identification, not urgency — steel. */}
                        {g.giftReceived && <p className="grounding" style={{ margin: '2px 0 0', color: 'var(--steel-soft)' }}>gift noted</p>}
                        <p className="grounding" style={{ margin: 'var(--sp-2) 0 0', whiteSpace: 'pre-wrap' }}>{body}</p>
                        <div className="actions-row" style={{ marginTop: 10 }}>
                          {phone && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + phone.replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(body)}>Text it</a>}
                          {String(g.email || '').trim() && <a className="mini" style={{ textDecoration: 'none' }} href={'mailto:' + encodeURIComponent(g.email.trim()) + '?subject=' + encodeURIComponent('Thank you') + '&body=' + encodeURIComponent(body)}>Email it</a>}
                          <button className="mini" onClick={() => { try { navigator.clipboard.writeText(body); toast('Copied.'); } catch { /* nothing */ } }}>Copy</button>
                          <button className="cta" onClick={() => writeGuest(i, { thankYouSent: true }, queue.length > 1 ? g.name.split(' ')[0] + ' thanked — next up.' : 'That was the last one — every yes is thanked.')}>Mark thanked</button>
                          <button className="mini" onClick={() => writeGuest(i, { thankYouSent: true }, 'Skipped — marked handled.')}>Skip</button>
                        </div>
                      </div>
                    );
                  })()}
                  {queue.length > 1 && <p className="grounding" style={{ opacity: .7 }}>Up next: {queue.slice(1, 4).map(x => String(x.g.name || '').split(' ')[0]).join(', ')}{queue.length > 4 ? '…' : ''}</p>}
                </>
              );
            })()}
            {sheet.kind === 'qr' && (
              <>
                {sheet.vendorQr ? (
                  <>
                    <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>
                      {(sheet.vendorQr.name || 'They')} scan{sheet.vendorQr.name ? 's' : ''} it to see their brief — arrival time, your address, their part of the day. Nothing about budget, payments, or other vendors.
                    </p>
                    {sheet.vendorQr.dataUrl && (
                      <div style={{ background: '#ffffff', borderRadius: 'var(--r-lg)', padding: 18, display: 'flex', justifyContent: 'center' }}>
                        <img src={sheet.vendorQr.dataUrl} alt={'QR code for ' + (sheet.vendorQr.name || 'the vendor') + '’s brief'} style={{ width: '100%', maxWidth: 300, display: 'block' }} />
                      </div>
                    )}
                    <div className="actions-row" style={{ marginTop: 'var(--sp-3)' }}>
                      {sheet.vendorQr.dataUrl && <a className="mini" href={sheet.vendorQr.dataUrl} download={String(sheet.vendorQr.name || 'vendor').replace(/[^\w]+/g, '-').toLowerCase() + '-brief-qr.png'} style={{ textDecoration: 'none' }}>Save image</a>}
                      <button className="mini" onClick={() => setSheet(sheet.vendorQr.back || { kind: 'vendors' })}>Back to vendors</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>
                      Guests scan it and RSVP themselves — no app, no account. Screenshot it for the group chat, print it for the paper invite, tape it by the door.
                    </p>
                    {qrDataUrl && (
                      <div style={{ background: '#ffffff', borderRadius: 'var(--r-lg)', padding: 18, display: 'flex', justifyContent: 'center' }}>
                        <img src={qrDataUrl} alt={'QR code for the ' + (event.name || 'event') + ' RSVP link'} style={{ width: '100%', maxWidth: 300, display: 'block' }} />
                      </div>
                    )}
                    <div className="actions-row" style={{ marginTop: 'var(--sp-3)' }}>
                      {qrDataUrl && <a className="mini" href={qrDataUrl} download={String(event.name || 'event').replace(/[^\w]+/g, '-').toLowerCase() + '-rsvp-qr.png'} style={{ textDecoration: 'none' }}>Save image</a>}
                      <button className="mini" onClick={shareInviteLink}>Share the link instead</button>
                    </div>
                  </>
                )}
              </>
            )}
            {sheet.kind === 'rain' && (
              <>
                {event.rainPlan ? (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>Your backup: {event.rainPlan}</div>
                ) : (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>Open sky and no backup named yet — pick one, or let it be written for you.</div>
                )}
                {rainEditorBlock()}
                {event.rainPlan && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Written for you — every audience</div>
                    <div className="pill-grid">
                      <button className="mini" onClick={() => { try { openDraft('Rain note to guests', guestRainMessage(event, wx || null)); } catch { toast('Couldn’t draft the note.'); } }}>Guest note</button>
                      <button className="mini" onClick={() => openDraft('Heads-up for your helpers', rainNoteFor('helpers'))}>Helper heads-up</button>
                      {reconfirmables.length > 0 && <button className="mini" onClick={() => openDraft('Weather note to vendors', rainNoteFor('vendors'))}>Vendor heads-up</button>}
                    </div>
                    <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Three audiences, three notes — same facts, different job: guests get the call, helpers get the shift, vendors get the question. Each opens for editing before anything sends.</p>
                  </>
                )}
                {/* Watch the sky — device notifications while the app is open.
                    LIVE weather only (never the sample), changes only (the
                    first read is a baseline, not news). */}
                {!wx?._sample && (
                  <>
                    <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 6px' }}>Watch the sky for me</div>
                    {wxNotify && notifGranted ? (
                      <div className="actions-row">
                        <span className="pill p-ok" style={{ cursor: 'default' }}>Watching<span className="pill-note">you’ll get a ping when it moves</span></span>
                        <button className="mini" onClick={() => setWxNotifyPref(false)}>Stop watching</button>
                      </div>
                    ) : (
                      <div className="actions-row">
                        <button className="mini" onClick={askWxNotify}>Ping me if the forecast moves</button>
                      </div>
                    )}
                    <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>While the app is open, your phone gets a heads-up the moment the risk or timing changes — with your backup named in the ping. Lock-screen alerts land when the installable app ships.</p>
                  </>
                )}
                {/* weatherLogistics — the engine's day-of adjustments sized to
                    the real headcount (ice lb/guest math, shade, tent call). */}
                {wx && (() => {
                  let tips = [];
                  try { tips = weatherLogistics(wx, { guests }) || []; } catch { tips = []; }
                  if (!tips.length) return null;
                  return (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 var(--sp-1)' }}>Sized to your {guests || 'crowd'}</div>
                      {tips.map(t => (
                        <p className="grounding" key={t.key} style={{ margin: 'var(--sp-1) 0 0' }}>{t.text}</p>
                      ))}
                      {wx._sample && <p className="grounding" style={{ margin: '6px 0 0', opacity: .65 }}>Numbers from the sample forecast — live weather sharpens them once the key lands.</p>}
                    </>
                  );
                })()}
              </>
            )}
            {sheet.kind === 'draft' && (
              <>
                {/* Voice as a quiet radio-list (was a bordered .chip cluster). When the
                    host edits the text, none is selected and an "your words" note shows. */}
                <div style={{ marginBottom: 'var(--sp-3)' }}>
                  <div className="of" style={{ marginBottom: 4 }}>Voice</div>
                  <OptionList ariaLabel="Voice"
                    options={[['as-written', 'As written'], ['tighter', 'Tighter'], ['warmer', 'Warmer'], ['playful', 'Playful'], ['formal', 'Formal']].map(([k, label]) => ({ label, value: k }))}
                    value={draftBody == null ? draftTone : ''}
                    onPick={(k) => { setDraftTone(k); setDraftBody(null); }} />
                  {draftBody != null && <div className="of" style={{ marginTop: 6, color: 'var(--steel-soft)' }}>Your words — showing your edits</div>}
                </div>
                <textarea className="draft-body draft-edit" value={shownDraft()} aria-label="Edit the draft"
                  onChange={e => setDraftBody(e.target.value)}
                  rows={Math.min(14, shownDraft().split('\n').length + 2)} />
                {/* Real handoffs: the native share sheet (iMessage/WhatsApp/etc.),
                    plus direct sms: and wa.me deep links — no fake "sent" states. */}
                <div className="actions-row" style={{ marginTop: 14 }}>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button className="cta"
                      onClick={() => { navigator.share({ title: sheet.title || 'From your plan', text: shownDraft() }).catch(() => {}); }}>
                      Share…
                    </button>
                  )}
                  <a className="mini" style={{ textDecoration: 'none' }} href={'sms:?&body=' + encodeURIComponent(shownDraft())}>Text it</a>
                  <a className="mini" style={{ textDecoration: 'none' }} href={'https://wa.me/?text=' + encodeURIComponent(shownDraft())} target="_blank" rel="noreferrer">Open WhatsApp</a>
                  <button className="mini" onClick={() => copyDraft(shownDraft())}>Copy it</button>
                </div>
                {/* "Message all helpers": each person still gets reviewed and
                    sent individually through the real handoffs above — this
                    just queues the rest so working through everyone is one
                    button, not re-opening the list each time. */}
                {sheet.queue && sheet.queue.length > 0 && (
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    <button className="cta" onClick={openNextInQueue}>
                      Next: {sheet.queue[0].name} ({sheet.queue.length} left) →
                    </button>
                  </div>
                )}
                <p className="grounding" style={{ marginTop: 10 }}>“Share…” opens your phone’s own share sheet — pick Messages, WhatsApp, or anywhere else. Voices re-shape the same real details mechanically — and you can edit every word above; your voice choice is remembered for every draft.</p>
              </>
            )}
            {sheet.kind === 'tasks' && (
              (event.timeline || []).length ? (
                <>
                  {(() => {
                    // taskEngine.effectiveDone: a step the event's own facts
                    // already prove handled (date set, caterer booked…) reads as
                    // inferred-done — the checklist never nags about proven work.
                    // Hero copy (host request 2026-07-11): the old "N open of M"
                    // meta line is PROMOTED to the hero. RECON-I3: done counts on
                    // the same effectiveDone-aware basis (isTimelineStepResolved)
                    // as the hero tile, the pill note, and the day-before card.
                    const total = (event.timeline || []).length;
                    const openRows = (event.timeline || []).filter(t => t && !t.done);
                    const inferredN = openRows.filter(t => isTimelineStepResolved(t)).length;
                    const openN = openRows.length - inferredN;
                    const doneN = total - openN;
                    return (
                      <SheetHero
                        eyebrow="Checked off"
                        star={`${doneN} of ${total}`}
                        tone={openN === 0 ? 'ok' : undefined}
                        sub={openN === 0
                          ? 'Every step is handled — the plan has them.'
                          : doneN === 0
                            ? 'Nothing checked yet — check things off and your plan keeps up.'
                            : inferredN
                              ? `${openN} still open · ${inferredN} already handled by your plan — tap to confirm.`
                              : `${openN} still open — check things off and your plan keeps up.`}
                      />
                    );
                  })()}
                  {/* OPEN work gets the rows; DONE work minimizes into a green
                      report line (tap to review) — same green-dot semantics as
                      the handled sections everywhere else. */}
                  {(event.timeline || []).map((t, i) => {
                    if (!t || t.done) return null;
                    const inferred = isTimelineStepResolved(t);
                    // Was 'focus-task' — a class with no matching CSS rule anywhere
                    // (confirmed by two independent audits), so deep-linked task
                    // rows scrolled into view but never visually highlighted. Every
                    // other sheet (decisions, lodging, ground, air, seating) already
                    // uses 'rowfocus' for exactly this; this was the one sheet that
                    // never got migrated to it.
                    const { lead, detail } = splitTask(t.task);
                    const action = checklistActionFor(t.task, { week: t.week, category: t.category });
                    return (
                    <button key={t.id || i} className={'frow' + (inferred ? ' got' : '') + (sheet.focus && t.id === sheet.focus ? ' rowfocus' : '')}
                      ref={el => { if (el && sheet.focus && t.id === sheet.focus) el.scrollIntoView({ block: 'center' }); }}
                      style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                      onClick={() => toggleTask(i)}>
                      <span className="fcheck" aria-hidden="true" />
                      <span className="f-main">
                        <span className="f-name">{lead}
                          {inferred ? <span className="tag plan" style={{ color: 'var(--ok)', background: 'var(--ok-tint)' }}>done by your plan — tap to confirm</span> : null}
                          {(() => { // compressed-timeline urgency, the engine's word (never for standard)
                            try {
                              // WAS: /T-(\d+)d/.exec(t.week) — and `week` is PROSE ('Week of'),
                              // never 'T-5d'. It matched NOTHING, so `po` was always null, so
                              // this chip NEVER RENDERED, on any task, on any event. The one
                              // urgency signal in the whole checklist was dead code. The lead
                              // now comes from the one reader (lib/taskLead.js) off the
                              // persisted leadDays, and the map is built from the real number.
                              const lead = taskLeadDays(t);
                              const po = lead != null ? { [t.week || '_']: lead } : null;
                              const u = days != null && po ? taskUrgencyChip({ ...t, week: t.week || '_' }, days, event.type, po) : null;
                              return u && u.label ? <span className="tag plan" style={{ color: 'var(--warn)', background: 'var(--warn-tint)' }}>{u.label}</span> : null;
                            } catch { return null; }
                          })()}
                        </span>
                        {detail ? <span className="v-meta" style={{ fontWeight: 400, whiteSpace: 'normal' }}>{detail}</span> : null}
                        <span className="v-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          {/* The DUE DATE, finally. taskDueLabel had zero call sites — the app
                              computed every task's lead and then showed the host only a prose
                              bucket ("Week of"), which is why nothing ever read as late.
                              taskDueLabel also distinguishes "13 days past its window" from
                              "today", so a closed window stops masquerading as a deadline. */}
                          {(() => {
                            let due = null;
                            try { due = t.done ? null : (taskDueLabel(t, event) || null); } catch (_e) { due = null; }
                            // Once there is a REAL due label, the prose bucket is noise —
                            // "7 days past its window · Week of" says the same thing twice and
                            // the second half is the vaguer one. `week` stays only as the
                            // fallback for a task whose lead we genuinely cannot resolve.
                            return [due, due ? null : t.week, t.owner].filter(Boolean).join(' · ');
                          })()}
                          {/* Deep-link to the surface that handles this step — nested
                              role=button span (same pattern as the food row's tune
                              control), stopPropagation so it launches instead of
                              toggling the check. */}
                          {action ? (
                            <span role="button" tabIndex={0} className="mini rowlink"
                              onClick={e => { e.stopPropagation(); action.go(); }}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); action.go(); } }}>
                              {action.label} →
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                    );
                  })}
                  {(event.timeline || []).some(t => t && t.done) && (
                    <>
                      <button className="fold-btn" style={{ color: 'var(--ok)' }} onClick={() => setDoneOpen(o => !o)}>
                        {(event.timeline || []).filter(t => t && t.done).length} done — the plan has them
                        <span className="chev" aria-hidden="true">{doneOpen ? '▾' : '›'}</span>
                      </button>
                      {doneOpen && (event.timeline || []).map((t, i) => (t && t.done) ? (
                        <button key={t.id || i} className="frow got" onClick={() => toggleTask(i)}>
                          <span className="fcheck" aria-hidden="true" />
                          <span className="f-main">
                            <span className="f-name">{t.task}</span>
                            <span className="v-meta">{[t.week, t.owner].filter(Boolean).join(' · ')}</span>
                          </span>
                        </button>
                      ) : null)}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>No checklist yet — that’s exactly why the plan flagged “catch up.” Draft the real one:</div>
                  <button className="cta" onClick={draftTimeline}>Draft my checklist from the playbook</button>
                </>
              )
            )}
            {sheet.kind === 'food' && (foodPlan ? (
              <>
                {/* PRINCIPLES REDESIGN: summary before detail — the bought count
                    leads (the host's real question: "how much is left to do?"),
                    one grounding line carries the rest of the engine's math. */}
                {foodPlan.hasRealCount ? (() => {
                  const fBand = (() => { try { return attendanceBand(event); } catch { return null; } })();
                  const fBandLbl = (() => { try { return attendanceBandLabel(fBand); } catch { return null; } })();
                  const fGuestPhrase = (fBand && fBand.applicable && fBand.band && fBandLbl) ? fBandLbl : `${foodPlan.bandLow}–${foodPlan.bandHigh}`;
                  const left = foodPlan.itemCount - foodPlan.boughtCount;
                  const done = foodPlan.boughtCount >= foodPlan.itemCount && foodPlan.itemCount > 0;
                  return (
                  <div style={{ padding: '2px 0 14px' }}>
                    {/* Figma 378:60 parity — the hero composes the parity kit
                        (Eyebrow → BigValue → GuideLine serif → two-line Grounding),
                        so a Figma move lands in one place (anti-drift, parity/MANIFEST).
                        The count is the star; the guide voice is the human line. */}
                    <Eyebrow>Bought so far</Eyebrow>
                    <BigValue style={{ fontVariantNumeric: 'tabular-nums', ...(done ? { color: 'var(--ok)' } : null) }}>
                      {foodPlan.boughtCount} of {foodPlan.itemCount}
                    </BigValue>
                    <GuideLine>
                      {done
                        ? 'Everything’s bought — the spread is covered.'
                        : foodPlan.boughtCount === 0
                          ? 'Nothing’s crossed off yet — one good store run covers all of it.'
                          : left <= 2
                            ? `${left} to go — nearly there.`
                            : `${left} still to grab — check things off as you shop.`}
                    </GuideLine>
                    <Grounding gap={ASK_RHYTHM.valueToWhy}>
                      Food {fmt(foodPlan.foodLow)}–{fmt(foodPlan.foodHigh)} · supplies {fmt(foodPlan.suppliesLow)}–{fmt(foodPlan.suppliesHigh)}
                    </Grounding>
                    <Grounding gap={3}>
                      {fmt(foodPlan.perGuestLow)}–{fmt(foodPlan.perGuestHigh)} a head · sized for {fGuestPhrase} guests
                    </Grounding>
                    {PRICE_VINTAGE ? <p className="grounding" style={{ margin: '3px 0 0', fontSize: 'var(--t-caption-min)', color: 'var(--faint)' }}>est. prices · {PRICE_VINTAGE}</p> : null}
                  </div>
                  );
                })() : (
                  <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>
                    Sized to a typical guess for now — set a real guest count and the dollars appear.
                  </p>
                )}
                {/* Meal tally (guests parity gap #5): what guests actually picked —
                    the same guest.meal field RSVPs, CSV imports, and the per-guest
                    meal edit write. Rendered ONLY once at least one real answer
                    exists; no invented zeros. */}
                {(() => {
                  const gs = event.guests || [];
                  const counts = {};
                  gs.forEach(g => {
                    const m = String((g && g.meal) || '').trim();
                    if (m && m !== '—') counts[m] = (counts[m] || 0) + 1;
                  });
                  const answered = Object.values(counts).reduce((a, b) => a + b, 0);
                  if (!answered) return null;
                  const un = gs.length - answered;
                  // Stable order: the invite's own meal choices first, then any
                  // free-text meals a CSV brought in.
                  const order = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'];
                  const keys = [...order.filter(k => counts[k]), ...Object.keys(counts).filter(k => !order.includes(k))];
                  return (
                    <p className="grounding" style={{ margin: '0 0 var(--sp-3)' }}>
                      Meal picks so far: {keys.map(k => `${k} ${counts[k]}`).join(' · ')}{un > 0 ? ` · ${un} unanswered` : ''}.
                    </p>
                  );
                })()}
                {/* Menu decisions — the playbook's real choices; picking one re-sizes
                    and re-prices the spread through the same engine. */}
                {(() => {
                  // Keys must match the engine's DIET_KEYWORDS table verbatim ('Shellfish',
                  // not 'Shellfish allergy') — dietCounts keys ARE the flag lookup keys.
                  const dc = event.dietCounts || {};
                  const anyDiet = DIET_TAGS.some(k => Number(dc[k]) > 0) || Object.keys(dc).some(k => !DIET_TAGS.includes(k) && Number(dc[k]) > 0);
                  const setD = (k, delta) => {
                    const n = Math.max(0, (Number(dc[k]) || 0) + delta);
                    patchEvent({ dietCounts: { ...dc, [k]: n } },
                      n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
                  };
                  const setCount = (k, n) => {
                    const next = { ...dc };
                    if (n > 0) next[k] = n; else delete next[k];
                    patchEvent({ dietCounts: next }, n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
                  };
                  const dietOpen = !!foodSect.diet || sheet.focus === 'diet';
                  if (!dietOpen) {
                    return null; // folded into the status strip below — see fstatusStrip
                  }
                  // Guest-needs reconciliation (parity: App.js:10827-10836) — what the
                  // RSVPs already told the host, mapped to the same DIET_TAGS vocabulary,
                  // so a per-guest free-text note doesn't have to be re-typed here.
                  const guestDiet = {};
                  const addNeeds = (str) => {
                    const seen = new Set();
                    String(str || '').split(',').map(x => x.trim()).filter(Boolean).forEach(p => {
                      const tag = dietTagFor(p);
                      if (tag && !seen.has(tag)) { seen.add(tag); guestDiet[tag] = (guestDiet[tag] || 0) + 1; }
                    });
                  };
                  (event.guests || []).forEach(g => { if (!g) return; addNeeds(g.needs); addNeeds(g.plusOneNeeds); });
                  const pending = Object.entries(guestDiet).filter(([d, n]) => (Number(dc[d]) || 0) < n);
                  const pullFromGuests = () => {
                    const next = { ...dc };
                    Object.entries(guestDiet).forEach(([d, n]) => { next[d] = Math.max(Number(next[d]) || 0, n); });
                    patchEvent({ dietCounts: next, dietMergeUndo: dc }, 'Merged from your RSVPs.');
                  };
                  const customDiets = Object.keys(dc).filter(d => !DIET_TAGS.includes(d) && (Number(dc[d]) || 0) > 0);
                  const active = [...DIET_TAGS, ...customDiets].filter(d => (Number(dc[d]) || 0) > 0);
                  const activeLower = new Set(active.map(d => d.toLowerCase()));
                  const inactive = DIET_TAGS.filter(d => (Number(dc[d]) || 0) <= 0 && !activeLower.has(d.toLowerCase()));
                  const otherQuick = showMoreDiets ? inactive : inactive.slice(0, 2);
                  const rest = showMoreDiets ? [] : inactive.slice(2);
                  const totalActive = active.reduce((s, d) => s + (Number(dc[d]) || 0), 0);
                  const addCustomDiet = () => {
                    const name = dietOtherName.trim();
                    if (!name) { setDietOtherOpen(false); return; }
                    setCount(name, Math.max(1, Number(dc[name]) || 1));
                    setDietOtherName(''); setDietOtherOpen(false);
                  };
                  const stepper = (k) => {
                    const n = Number(dc[k]) || 0;
                    return (
                      <div key={k} className="line" style={{ padding: '6px 0' }}>
                        <span style={{ color: n > 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: n > 0 ? 650 : 500 }}>{k}</span>
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="mini" onClick={() => setD(k, -1)} disabled={n <= 0} aria-label={'Fewer ' + k}>−</button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{n}</span>
                          <button className="mini" onClick={() => setD(k, 1)} aria-label={'More ' + k}>+</button>
                        </span>
                      </div>
                    );
                  };
                  // Closes the panel regardless of how it opened. dietOpen is an OR of
                  // foodSect.diet and sheet.focus==='diet' (a deep-link entry, e.g. from
                  // an fp-diet nudge) — clearing only foodSect.diet left the panel stuck
                  // open whenever it was opened via the deep-link path (found live).
                  const closeDiet = () => {
                    setFoodSect(m => ({ ...m, diet: false }));
                    if (sheet.focus === 'diet') setSheet(s => ({ ...s, focus: null }));
                  };
                  return (
                    <div className={'brow' + (sheet.focus === 'diet' ? ' rowfocus' : '')} style={{ marginBottom: 'var(--sp-3)', borderRadius: 'var(--r-md)', padding: 'var(--sp-2) 6px' }}>
                      <div className="shelf-label" style={{ marginBottom: 6 }}>
                        Dietary needs {anyDiet ? '' : '— none counted yet'}
                        <button className="mini" style={{ marginLeft: 'var(--sp-2)' }} onClick={closeDiet}>done</button>
                      </div>
                      {active.length > 0 && (
                        <>
                          <div className="v-meta" style={{ marginTop: 'var(--sp-1)' }}>Active{totalActive > 0 ? ' — ' + totalActive + (totalActive === 1 ? ' guest' : ' guests') : ''}</div>
                          {active.map(stepper)}
                        </>
                      )}
                      {otherQuick.length > 0 && (
                        <>
                          <div className="v-meta" style={{ marginTop: active.length > 0 ? 10 : 4 }}>Other — tap to set a count</div>
                          {otherQuick.map(stepper)}
                        </>
                      )}
                      {rest.length > 0 && (
                        <button className="mini" style={{ marginTop: 6 }} onClick={() => setShowMoreDiets(true)}>
                          + {rest.length} more — {rest.slice(0, 4).join(' · ')}{rest.length > 4 ? ' …' : ''}
                        </button>
                      )}
                      {dietOtherOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--sp-2)' }}>
                          <input className="field" autoFocus value={dietOtherName} placeholder="Name it…"
                            onChange={e => setDietOtherName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addCustomDiet(); if (e.key === 'Escape') { setDietOtherName(''); setDietOtherOpen(false); } }} />
                          <button className="mini" onClick={addCustomDiet}>Add</button>
                        </div>
                      ) : (
                        <button className="mini" style={{ marginTop: 'var(--sp-2)' }} onClick={() => setDietOtherOpen(true)}>+ Other</button>
                      )}
                      {pending.length > 0 && (
                        <button className="later-row" style={{ marginTop: 10, width: '100%', textAlign: 'left', background: 'var(--steel-tint)', border: 'none', borderRadius: 'var(--r-md)', padding: '9px var(--sp-3)', cursor: 'pointer' }}
                          onClick={pullFromGuests}>
                          <span className="t" style={{ color: 'var(--ink)' }}>From your RSVPs</span>
                          <span className="v-meta" style={{ flex: 1 }}>{pending.map(([d, n]) => d + ' ×' + n).join(' · ')}</span>
                          <span style={{ color: 'var(--steel-soft)', fontWeight: 700, flexShrink: 0 }}>Add</span>
                        </button>
                      )}
                      {event.dietMergeUndo && (
                        <button className="mini" style={{ marginTop: 'var(--sp-2)' }} onClick={() => patchEvent({ dietCounts: event.dietMergeUndo, dietMergeUndo: null }, 'Merge undone.')}>
                          Merged from your RSVPs — Undo
                        </button>
                      )}
                      <p className="grounding" style={{ margin: '10px 0 0' }}>
                        Vegetarian + vegan counts add a real, priced main below; the others flag the lines to double-check.
                        {!event.dietaryNoted && <span> </span>}
                        {!event.dietaryNoted && (
                          <button className="mini" onClick={() => { patchEvent({ dietaryNoted: true }, 'Dietary needs noted — the menu is good to go.'); closeDiet(); }}>That’s everyone — noted</button>
                        )}
                      </p>
                      {/* The dietary-note drafter lives here now (port of 391:60 —
                          it belongs with dietary needs, not on the calm summary). */}
                      <button className="mini" style={{ marginTop: 'var(--sp-2)' }} onClick={() => { try { openDraft('Dietary note', draftDietaryNote(event, profile)); } catch { toast('Couldn’t draft it.'); } }}>Draft a dietary note</button>
                    </div>
                  );
                })()}
                {(foodPlan.choices || []).length > 0 && (() => {
                  const openN = (foodPlan.choices || []).filter(c => !((event.foodChoices || {})[c.id])).length;
                  const open = !!foodSect.choices;
                  void openN;
                  return null; // folded into the status strip below
                })()}
                {/* ONE compact status strip replaces two heavy fold-rows — the
                    same information, without the wall-of-rows drift. */}
                {(() => {
                  const dc = event.dietCounts || {};
                  const anyDiet = DIET_TAGS.some(k => Number(dc[k]) > 0) || Object.keys(dc).some(k => !DIET_TAGS.includes(k) && Number(dc[k]) > 0);
                  const dietOpen = !!foodSect.diet || sheet.focus === 'diet';
                  const openN = (foodPlan.choices || []).filter(c => !((event.foodChoices || {})[c.id])).length;
                  const choicesOpen = !!foodSect.choices;
                  const hasChoices = (foodPlan.choices || []).length > 0;
                  const hasSourcing = (foodPlan.sourcingTiers || []).length > 0;
                  const curTier = (foodPlan.sourcingTiers || []).find(t => t && (t.id || t.key) === foodPlan.sourcing);
                  const sourcingLabel = (curTier && (curTier.label || curTier.id)) || 'choose one';
                  const listDone = foodPlan.boughtCount >= foodPlan.itemCount && foodPlan.itemCount > 0;
                  if (dietOpen || choicesOpen || foodSect.sourced || foodSect.list) return null; // a drill-in panel is open below
                  // Progressive disclosure (port of Figma 391:60) — the heavy sections
                  // (sourcing, the shopping list) fold to summary rows; each drills in
                  // on tap. Hairline rows, value neutral until resolved (378:72 treatment).
                  return (
                    <div className="fstat-list">
                      <button className="fstat" onClick={() => setFoodSect(m => ({ ...m, diet: true }))}>
                        <span className="fstat-l">Dietary needs</span>
                        <span className="fstat-v" style={anyDiet || event.dietaryNoted ? { color: 'var(--ok)' } : null}>
                          {anyDiet ? 'noted · ' + DIET_TAGS.filter(k => Number(dc[k]) > 0).length + ' flagged' : event.dietaryNoted ? 'noted' : 'none yet'}
                          <span className="fstat-chev" aria-hidden="true">›</span>
                        </span>
                      </button>
                      {hasChoices && (
                        <button className="fstat" onClick={() => setFoodSect(m => ({ ...m, choices: true }))}>
                          <span className="fstat-l">Your choices</span>
                          <span className="fstat-v" style={openN > 0 ? null : { color: 'var(--ok)' }}>
                            {openN > 0 ? openN + ' open' : 'all set'}
                            <span className="fstat-chev" aria-hidden="true">›</span>
                          </span>
                        </button>
                      )}
                      {hasSourcing && (
                        <button className="fstat" onClick={() => setFoodSect(m => ({ ...m, sourced: true }))}>
                          <span className="fstat-l">How it’s sourced</span>
                          <span className="fstat-v">
                            {sourcingLabel}
                            <span className="fstat-chev" aria-hidden="true">›</span>
                          </span>
                        </button>
                      )}
                      <button className="fstat" onClick={() => setFoodSect(m => ({ ...m, list: true }))}>
                        <span className="fstat-l">The list</span>
                        <span className="fstat-v" style={listDone ? { color: 'var(--ok)' } : null}>
                          {foodPlan.boughtCount} of {foodPlan.itemCount} bought
                          <span className="fstat-chev" aria-hidden="true">›</span>
                        </span>
                      </button>
                    </div>
                  );
                })()}
                {(foodPlan.choices || []).length > 0 && !!foodSect.choices && (
                  <>
                    <div className="shelf-label" style={{ margin: '10px 0 var(--sp-2)' }}>
                      Your choices
                      <button className="mini" style={{ marginLeft: 'var(--sp-2)' }} onClick={() => { setFoodSect(m => ({ ...m, choices: false })); setChoiceOpen(null); }}>done</button>
                    </div>
                    {foodPlan.choices.map(d => {
                      // AUTO-COLLAPSE (host request): a made choice folds to its
                      // settled line; when the LAST one lands the whole section
                      // closes itself — done work never keeps the room.
                      const picked = (event.foodChoices || {})[d.id];
                      if (picked && choiceOpen !== d.id) {
                        return (
                          <div key={d.id} className="line" style={{ alignItems: 'center' }}>
                            <span>{d.label}</span>
                            <span style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                              <span className="of" style={{ color: 'var(--ok)', fontWeight: 600 }}>{picked}</span>
                              <button className="mini" onClick={() => setChoiceOpen(d.id)}>change</button>
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={d.id} style={{ marginBottom: 'var(--sp-3)' }}>
                          <div className="f-name" style={{ marginBottom: 6 }}>{d.label}</div>
                          <div className="chips">
                            {(d.options || []).map(opt => (
                              <button key={opt} className="chip" aria-pressed={(d.chosen || d.default) === opt}
                                onClick={() => {
                                  const nextChoices = { ...(event.foodChoices || {}), [d.id]: opt };
                                  const stillOpen = (foodPlan.choices || []).filter(c => !nextChoices[c.id]).length;
                                  patchEvent({ foodChoices: nextChoices },
                                    stillOpen === 0
                                      ? d.label + ': ' + opt + ' — that was the last call. The spread is fully priced.'
                                      : d.label + ': ' + opt + ' — the spread just re-sized.');
                                  setChoiceOpen(null);
                                  if (stillOpen === 0) setFoodSect(m => ({ ...m, choices: false }));
                                }}>{opt}</button>
                            ))}
                          </div>
                          {d.why && <p className="grounding" style={{ marginTop: 5 }}>{d.why}</p>}
                        </div>
                      );
                    })}
                  </>
                )}
                {/* Port of Figma 391:60 — ONE primary action on the calm summary
                    (full-width), plus the contextual tip. Both hidden while a
                    drill-in panel is open. The "Dietary note" drafter now lives
                    inside the Dietary-needs drill-in where it belongs. */}
                {!(foodSect.diet || sheet.focus === 'diet' || foodSect.choices || foodSect.sourced || foodSect.list) && (
                  <>
                    <button className="food-act" style={{ width: '100%', marginBottom: 'var(--sp-2)' }} onClick={() => {
                      // foodShopItems/eventGeoQuery are the same shared engines legacy's
                      // "Copy the shopping list" reads (App.js:10614-10615), so both apps
                      // build the identical list.
                      let shopItems = []; try { shopItems = foodShopItems(foodPlan, event); } catch { shopItems = []; }
                      let anchor = ''; try { anchor = eventGeoQuery(event, profile); } catch { anchor = ''; }
                      openDraft('Your shopping list', draftShoppingList(event, profile, { items: shopItems, anchor }));
                    }}>Copy the shopping list</button>
                    {nudgeFor('food')}
                  </>
                )}
                {/* Sourcing tier — the plan's real cook/order axis; switching
                    re-prices proteins and changes where each line says to buy.
                    Drill-in (port of 391:60): gated behind the "How it's sourced" row. */}
                {foodSect.sourced && (foodPlan.sourcingTiers || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '10px 0 var(--sp-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>How it’s sourced</span>
                      <button className="mini" onClick={() => setFoodSect(m => ({ ...m, sourced: false }))}>done</button>
                    </div>
                    {/* Figma 378:94 parity — each sourcing tier is a full-width
                        bordered CARD (name + current/switch badge + a grounded sub),
                        the active one tinted; not a borderless list row. */}
                    <div className="srctier-list">
                    {(() => {
                      const key = foodPlan.sourcingKey;
                      const byTier = (key && key.byTier) || {};
                      const curCost = byTier[foodPlan.sourcing] || 0;
                      return (foodPlan.sourcingTiers || []).map(t => {
                        if (!t) return null;
                        const id = t.id || t.key;
                        const on = foodPlan.sourcing === id;
                        const cost = byTier[id] || 0;
                        // Decision delta vs the CURRENT tier — the same honest-empty rule
                        // as the legacy card: only shown when both sides have a real number.
                        const delta = cost - curCost;
                        const deltaLabel = (!on && cost && curCost && delta !== 0)
                          ? (delta < 0 ? ' · saves ~' + fmt(Math.abs(delta)) : ' · ~' + fmt(Math.abs(delta)) + ' more')
                          : '';
                        return (
                          <button key={id} className={'srctier' + (on ? ' on' : '')} aria-pressed={on}
                            onClick={() => patchEvent({ sourcing: id }, 'Sourcing: ' + (t.label || id) + ' — proteins re-priced, stores updated.')}>
                            <span className="srctier-top">
                              <span className="srctier-name">{t.label || id}</span>
                              {/* --ok is the app's "active/confirmed" signal everywhere
                                  (RSVP Yes, vendor Confirmed); reused for the current tier. */}
                              <span className="srctier-badge">{on ? 'current' : 'switch'}</span>
                            </span>
                            {(t.note || cost > 0) && (
                              <span className="srctier-sub">
                                {t.note}{t.note && cost > 0 ? ' · ' : ''}
                                {cost > 0 ? '~' + fmt(cost) + ' ' + String((key && key.item) || '').toLowerCase() : ''}
                                {deltaLabel}
                              </span>
                            )}
                          </button>
                        );
                      });
                    })()}
                    </div>
                    <GuideLine gap={0} style={{ margin: '8px 0 10px' }}>The tier re-prices the proteins and changes where each line says to buy.</GuideLine>
                  </>
                )}
                {/* The list drill-in (port of Figma 391:60) — the shopping list, the
                    store filter, per-item pricing, and add-item all live here, gated
                    behind the "The list" summary row so the calm screen stays calm. */}
                {foodSect.list && (
                  <div className="shelf-label" style={{ margin: '10px 0 var(--sp-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>The list</span>
                    <button className="mini" onClick={() => setFoodSect(m => ({ ...m, list: false }))}>done</button>
                  </div>
                )}
                {/* Bulk price-lock — parity with legacy's "Use typical prices for
                    the other N items →" (App.js ~11040-11060). Locks every still-
                    estimated line to the ENGINE's own honest midpoint
                    ((low+high)/2) — never a new number. Skips supplies, custom
                    (added) items, skipped lines, and anything already locked or
                    unpriced (no low/high at all) — same gate as legacy, so both
                    apps agree on which lines qualify. */}
                {foodSect.list && (() => {
                  const supplGroup = ((foodPlan && foodPlan.groups) || []).find(g => /suppl|paper|setup|gear/i.test(String(g)));
                  const unpriced = (foodPlan.list || []).filter(it => it && !it.skipped && it.group !== supplGroup && it.locked == null && !it.added && (Number(it.low) || Number(it.high)));
                  if (bulkPriced && bulkPriced.length > 0) {
                    const undo = () => {
                      const next = { ...(event.foodLocked || {}) };
                      bulkPriced.forEach(id => delete next[id]);
                      patchEvent({ foodLocked: next }, 'Undid the typical-price lock.');
                      setBulkPriced(null);
                    };
                    return (
                      <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                        <span className="of" style={{ color: 'var(--ok)', fontWeight: 700 }}>Used typical prices for {bulkPriced.length}</span>
                        <button className="mini" onClick={undo}>Undo</button>
                      </div>
                    );
                  }
                  if (unpriced.length < 2) return null;
                  const priceAll = () => {
                    const next = { ...(event.foodLocked || {}) };
                    const realNext = { ...(event.foodReal || {}) };
                    const ids = unpriced.map(it => it.id);
                    // Bulk "typical prices" are ESTIMATES, not receipts — mark them so
                    // the spend readout counts them as estimated, not firm.
                    unpriced.forEach(it => { next[it.id] = Math.round(((Number(it.low) || 0) + (Number(it.high) || 0)) / 2); realNext[it.id] = false; });
                    patchEvent({ foodLocked: next, foodReal: realNext }, 'Locked ' + ids.length + ' item' + (ids.length === 1 ? '' : 's') + ' to typical prices.');
                    setBulkPriced(ids);
                  };
                  return (
                    <button className="mini" style={{ marginBottom: 10 }} onClick={priceAll}>
                      Lock the rest to typical prices ({unpriced.length})
                    </button>
                  );
                })()}
                {foodSect.list && (() => {
                  // Skipped lines stay IN the list (parity with legacy's toggleSkip —
                  // App.js:11145 — which keeps a skipped line visible with strikethrough
                  // and a single toggle back). V2 used to filter them out entirely, so a
                  // "skip it" tap made the line vanish with no way back (found in the
                  // 2026-07-11 food-plan audit). Cost/progress math still excludes
                  // skipped lines — the engine's own itemCount/boughtCount already do
                  // (lib/playbooks/index.js:2374) — this just stops hiding the row.
                  const allItems = (foodPlan.list || []).filter(Boolean);
                  // ── Shopping-run mode: "I'm at X" — the list collapses to THIS
                  // store's unbought lines with a walk-in total. Store truth =
                  // the host's pick (foodWhere) first, else the plan's buyAt /
                  // first where option. Session-only; never an event write.
                  const storeOf = (it) => (event.foodWhere || {})[it.id] || (Array.isArray(it.where) && it.where[0]) || null; // buyAt is WHEN, never a store
                  const activeAll = allItems.filter(it => !it.skipped);
                  const stores = [...new Set(activeAll.map(storeOf).filter(Boolean))];
                  const inStore = (it) => !shopStore || storeOf(it) === shopStore || (Array.isArray(it.where) && it.where.includes(shopStore));
                  const items = shopStore ? activeAll.filter(inStore) : allItems;
                  const runLeft = shopStore ? items.filter(it => !(event.foodGot || {})[it.id]) : [];
                  const runLo = runLeft.reduce((t, it) => t + (Number(it.locked != null ? it.locked : it.low) || 0), 0);
                  const runHi = runLeft.reduce((t, it) => t + (Number(it.locked != null ? it.locked : it.high) || 0), 0);
                  const groups = (foodPlan.groups && foodPlan.groups.length ? foodPlan.groups : [...new Set(items.map(it => it.group || 'Other'))]);
                  // Decision flags: a menu decision the host hasn't explicitly
                  // made yet marks every line it re-prices (playbook `affects`).
                  const undecidedAffects = (() => { try { return playbookOpenDecisionAffects(event); } catch { return {}; } })();
                  // Head-start pricing (host request, 2026-07-12): the midpoint of
                  // THIS item's current low/high — already reshaped by its own
                  // per-item sourcing pick (event.foodWhere), not just the plan-wide
                  // tier — pre-fills the tune field instead of a blank input.
                  const midpointStr = (it) => {
                    const lo = Number(it.low) || 0, hi = Number(it.high) || 0;
                    if (!lo && !hi) return '';
                    return String(Math.round((lo + hi) / 2));
                  };
                  const groupRows = groups.map(g => {
                    const gItems = items.filter(it => (it.group || 'Other') === g);
                    if (!gItems.length) return null;
                    const gActive = gItems.filter(it => !it.skipped);
                    const gBought = gActive.filter(it => (event.foodGot || {})[it.id]).length;
                    const gLow = gActive.reduce((t, it) => t + (it.locked != null ? Number(it.locked) : Number(it.low) || 0), 0);
                    const gHigh = gActive.reduce((t, it) => t + (it.locked != null ? Number(it.locked) : Number(it.high) || 0), 0);
                    const gDecisions = gActive.filter(it => undecidedAffects[it.id]).length;
                    // Accordion (never-dense): a group opens when tapped, when a
                    // deep-link targets one of its lines, or while tuning one.
                    const focusHere = gItems.some(it => it.id === sheet.focus || it.id === foodTune);
                    const isOpen = !!foodGroupsOpen[g] || focusHere || !!shopStore; // run mode opens the shelves
                    const gDone = gBought === gActive.length;
                    return (
                    <div key={g} className={'fgroup' + (isOpen ? ' open' : '')}>
                      <button className="fg-head" onClick={() => setFoodGroupsOpen(m => ({ ...m, [g]: !isOpen }))}>
                        <div className={'fg-badge' + (gDone ? ' done' : '')} aria-hidden>{g.trim().charAt(0).toUpperCase()}</div>
                        <div className="fg-id">
                          <div className="fg-label">{g}
                            {gDecisions > 0 ? <span className="tag essential" style={{ marginLeft: 'var(--sp-2)' }}>{gDecisions} decision{gDecisions === 1 ? '' : 's'} open</span> : null}
                          </div>
                          <div className="fg-sub" style={{ color: gDone ? 'var(--ok)' : 'var(--muted)' }}>
                            {!gActive.length ? 'all skipped' : gDone ? 'all ' + gActive.length + ' bought' : gBought + ' of ' + gActive.length + ' bought' + (foodPlan.hasRealCount ? ' · ' + fmt(gLow) + '–' + fmt(gHigh) : '')}
                          </div>
                          <div className={'fg-track' + (gDone ? ' done' : '')}><i style={{ width: (gActive.length ? gBought / gActive.length * 100 : 100) + '%' }} /></div>
                        </div>
                        <span className="fg-chev" aria-hidden="true">›</span>
                      </button>
                      <div className="fg-items">
                      {isOpen && gItems.map((it, i) => {
                        const got = !!(event.foodGot || {})[it.id];
                        const cost = it.locked != null ? Number(it.locked) : ((Number(it.low) || 0) + (Number(it.high) || 0)) / 2;
                        const tuning = foodTune === it.id;
                        // Keep the FULL normalized alt (name + unitCostRange) — not just its
                        // name — so the chip below can show what picking it would cost, not
                        // just its label. Same parser the engine's own swap re-pricing uses
                        // (lib/playbooks/index.js normalizeAlternative), so a plain-string
                        // alt (no unitCostRange) and a priced object alt both land in one shape.
                        const alts = (it.alternatives || []).map(normalizeAlternative).filter(a => a.name).slice(0, 4);
                        const activeSwapName = (event.foodSwap || {})[it.id] || null;
                        return (
                          <div key={it.id}>
                            <button className={'frow' + (got ? ' got' : '') + (it.skipped ? ' skipped' : '')}
                              style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                              onClick={() => {
                                // Skipped rows stay visible (see the audit note above);
                                // tapping one is the undo — the same single-toggle
                                // symmetry legacy's toggleSkip uses (App.js:11145).
                                if (it.skipped) {
                                  const m = { ...(event.foodSkip || {}) }; delete m[it.id];
                                  patchEvent({ foodSkip: m }, (it.short || it.item) + ' is back — the total just picked it up again.');
                                  return;
                                }
                                toggleGot(it, cost);
                              }}>
                              <span className="fcheck" aria-hidden="true" />
                              <span className="f-main">
                                <span className="f-name" style={it.skipped ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
                                  {it.short || it.item}
                                  {it.skipped ? <span className="tag plan">skipped — tap to restore</span> : (() => {
                                    // Cap at 2 tags by priority (was up to 7 → wrapped and
                                    // shoved the price/tune controls onto a 3rd line). The
                                    // rest fold into a "+N" that the tune panel expands.
                                    const tags = [];
                                    if (undecidedAffects[it.id]) tags.push(<span key="dec" className="tag essential" title={undecidedAffects[it.id]}>decision open</span>);
                                    if (it.essential && !got) tags.push(<span key="ess" className="tag essential">essential</span>);
                                    // WAVE-5 (UX_02 amber budget): "day-of" and diet flags are
                                    // IDENTIFICATION labels — when to buy, who it serves — not
                                    // gap warnings, so they take the neutral .tag.plan treatment
                                    // their sibling tags (owner/yours/swapped) already use.
                                    // Only `essential && !got` above stays amber: that one IS a gap.
                                    if (it.buyAt === 'day-of') tags.push(<span key="dof" className="tag plan">day-of</span>);
                                    if (Array.isArray(it.dietFlags) && it.dietFlags.length) tags.push(<span key="diet" className="tag plan">{it.dietFlags.join(' · ').toLowerCase()}</span>);
                                    if (it.added && it.owner) tags.push(<span key="own" className="tag plan">{it.owner}</span>);
                                    else if (it.added) tags.push(<span key="yours" className="tag plan">yours</span>);
                                    if (it.swappedFrom) tags.push(<span key="swap" className="tag plan">swapped</span>);
                                    if (it.badge) tags.push(<span key="badge" className="tag plan">{String(it.badge).toLowerCase()}</span>);
                                    const shown = tags.slice(0, 2);
                                    if (tags.length > 2) shown.push(<span key="more" className="tag plan" style={{ opacity: .7 }}>+{tags.length - 2}</span>);
                                    return shown;
                                  })()}
                                </span>
                                <span className="v-meta">
                                  {[
                                    it.qty && it.unit ? `${it.qty} ${it.unit}` : null,
                                    foodPlan.hasRealCount && it.unitBase && it.perUnitLow ? `${fmt(it.perUnitLow)}–${fmt(it.perUnitHigh)}/${it.unitBase}` : null,
                                    (event.foodWhere || {})[it.id] ? 'your pick: ' + (event.foodWhere || {})[it.id] : (Array.isArray(it.where) ? it.where.join(',') : it.where),
                                  ].filter(Boolean).join(' · ')}
                                </span>
                                {/* The "because" behind the quantity (it.basis, the
                                    shared engine's already-formatted rate string —
                                    lib/quantities/quantityBasis.js) and the "often
                                    forgotten" heads-up (it.forgotten) — both read by
                                    legacy's food card, neither rendered in V2 before
                                    (found in the 2026-07-11 food-plan audit). Muted
                                    text, not accent color: informational, not
                                    interactive (UX_02 color-restraint doctrine) — a
                                    deliberate change from legacy's steel-colored
                                    treatment of "forgotten". */}
                                {(it.basis || it.forgotten) && (
                                  <span className="v-meta" style={{ display: 'block', marginTop: 2 }}>
                                    {/* Portion goal (host request 2026-07-12): the per-guest
                                        rate ALONE ("½ lb/guest") never told the host what to
                                        aim for overall. Scaling it by the real guest count —
                                        "½ lb/guest × 15 guests" — surfaces the recommended
                                        target the quantity was sized from, the same rate×guests
                                        framing legacy showed (App.js ~11317) and V2 had dropped.
                                        Only when there's a per-guest basis (it.basis is '' for
                                        flat/converted goods) and a real count. */}
                                    {[
                                      it.basis
                                        ? it.basis + (foodPlan.guests > 0 ? ' × ' + foodPlan.guests + ' ' + (foodPlan.guests === 1 ? 'guest' : 'guests') : '') + ' · typical'
                                        : null,
                                      it.forgotten ? 'often forgotten' : null,
                                    ].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </span>
                              {/* Frictionless price entry: the amount itself is the
                                  input, not a link to a panel two taps away. Tap the
                                  estimate range, type what you actually paid, Enter or
                                  tap away commits it — same foodLocked write the old
                                  "tune → set it" flow used, just without the detour.
                                  Locked (already-real) prices still route through tune
                                  to reach "back to estimate" — editing a committed
                                  number is the rarer path and can afford one more tap. */}
                              {tuning && it.locked == null ? (
                                <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', flexWrap: 'wrap' }}>
                                  {/* Head-start pricing (host request, 2026-07-12 — "like we
                                      did in legacy"): legacy's CostLockSegments gave a one-tap
                                      Value/Premium lock off the current estimate, but that
                                      estimate was only ever plan-wide-sourcing-aware. Here the
                                      low/high THIS item shows already reflects its own
                                      per-item store pick (event.foodWhere — perItemStoreRange,
                                      lib/playbooks/index.js), which legacy's plan-wide tier
                                      picker can't do — so these two buttons are a genuine
                                      one-tap "lock to what this specific sourcing choice
                                      actually costs," not just a generic range. The input still
                                      pre-fills with the midpoint as the head-start number for a
                                      host who wants to type their own real receipt total. */}
                                  {foodPlan.hasRealCount && (Number(it.low) || Number(it.high)) ? (
                                    <>
                                      {/* onMouseDown preventDefault: without it, clicking this button
                                          blurs the focused input FIRST, whose own onBlur commits the
                                          pre-filled midpoint via patchEvent — which sets it.locked,
                                          flipping this whole branch to the locked display and
                                          unmounting this button before its click ever fires. Found
                                          live-testing: tapping "Value" was silently locking the
                                          midpoint instead. preventDefault on mousedown keeps focus
                                          put, so blur never fires and this onClick is the one write. */}
                                      <button type="button" className="mini" onMouseDown={e => e.preventDefault()} onClick={() => {
                                        const n = Math.max(0, Math.round(Number(it.low) || 0));
                                        patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n }, foodReal: { ...(event.foodReal || {}), [it.id]: false } },
                                          (it.short || it.item) + ' set at ' + fmt(n) + ' — the value estimate for your sourcing pick.');
                                        setTuneCost(''); setTuneEdited(false); setFoodTune(null);
                                      }}>Value {fmt(Math.round(Number(it.low) || 0))}</button>
                                      <button type="button" className="mini" onMouseDown={e => e.preventDefault()} onClick={() => {
                                        const n = Math.max(0, Math.round(Number(it.high) || 0));
                                        patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n }, foodReal: { ...(event.foodReal || {}), [it.id]: false } },
                                          (it.short || it.item) + ' set at ' + fmt(n) + ' — the premium estimate for your sourcing pick.');
                                        setTuneCost(''); setTuneEdited(false); setFoodTune(null);
                                      }}>Premium {fmt(Math.round(Number(it.high) || 0))}</button>
                                    </>
                                  ) : null}
                                  <input className="field" style={{ width: 72, fontSize: 'var(--t-input)', padding: 'var(--sp-1) var(--sp-2)' }} type="number" min="0"
                                    inputMode="decimal" placeholder="$ paid" autoFocus
                                    aria-label={'Real cost for ' + (it.short || it.item)}
                                    value={tuneCost} onChange={e => { setTuneCost(e.target.value); setTuneEdited(true); }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && parseFloat(tuneCost) >= 0 && tuneCost !== '') {
                                        const n = Math.max(0, Math.round(parseFloat(tuneCost) || 0));
                                        // Real receipt ONLY if the host typed a value; accepting the
                                        // store-based prefill unchanged stays an honest estimate.
                                        patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n }, foodReal: { ...(event.foodReal || {}), [it.id]: tuneEdited } },
                                          (it.short || it.item) + (tuneEdited ? ' set at ' + fmt(n) + ' — a real price now, not a range.' : ' set at ~' + fmt(n) + ' — the estimate; add the receipt total anytime.'));
                                        setTuneCost(''); setTuneEdited(false); setFoodTune(null);
                                      } else if (e.key === 'Escape') { setTuneCost(''); setTuneEdited(false); setFoodTune(null); }
                                    }}
                                    onBlur={() => {
                                      if (parseFloat(tuneCost) >= 0 && tuneCost !== '') {
                                        const n = Math.max(0, Math.round(parseFloat(tuneCost) || 0));
                                        patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n }, foodReal: { ...(event.foodReal || {}), [it.id]: tuneEdited } },
                                          (it.short || it.item) + (tuneEdited ? ' set at ' + fmt(n) + ' — a real price now, not a range.' : ' set at ~' + fmt(n) + ' — the estimate; add the receipt total anytime.'));
                                        setTuneCost(''); setTuneEdited(false);
                                      }
                                    }} />
                                </span>
                              ) : (
                                <span className="amt" role="button" tabIndex={0}
                                  onClick={e => { e.stopPropagation(); setTuneCost(midpointStr(it)); setTuneEdited(false); setFoodTune(it.id); }}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setTuneCost(midpointStr(it)); setTuneEdited(false); setFoodTune(it.id); } }}
                                  title="Tap to enter the real price">
                                  {/* Host-added lines carry a single committed cost (event.foodAdd's
                                      cost — never a range), so no invented spread. Blank/$0 at add
                                      time is an honest state, not a fake number: "bringing it" when
                                      someone's named (their name already shows as its own tag chip
                                      next to the item name — repeating it here made this span too
                                      wide and collided with a long wrapped item name, found live
                                      testing this feature), "no cost yet" otherwise. Never displayed
                                      as "$0–$0". Same honesty rule legacy's money() helper applies
                                      (App.js ~11246-11250). */}
                                  {it.locked != null
                                    ? fmt(it.locked)
                                    : it.added
                                      ? (it.low > 0 ? fmt(it.low) : (it.owner ? 'bringing it' : 'no cost yet'))
                                      : (foodPlan.hasRealCount ? fmt(it.low) + '–' + fmt(it.high) : '—')}
                                </span>
                              )}
                              <span className="mini" role="button" tabIndex={0} style={{ marginLeft: 6 }}
                                onClick={e => { e.stopPropagation(); if (!tuning) { setTuneCost(midpointStr(it)); setTuneEdited(false); } setFoodTune(tuning ? null : it.id); }}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!tuning) { setTuneCost(midpointStr(it)); setTuneEdited(false); } setFoodTune(tuning ? null : it.id); } }}>
                                {tuning ? 'more' : 'tune'}
                              </span>
                              {/* Host-added lines are fully deletable (not just skippable) —
                                  parity with legacy's removeAdded (App.js ~11122). */}
                              {it.added && (
                                <span className="mini" role="button" tabIndex={0} style={{ marginLeft: 6 }}
                                  title={'Remove ' + (it.short || it.item)}
                                  onClick={e => {
                                    e.stopPropagation();
                                    patchEvent({ foodAdd: (event.foodAdd || []).filter(a => a.id !== it.id) },
                                      (it.short || it.item) + ' removed.');
                                  }}
                                  onKeyDown={e => {
                                    if (e.key !== 'Enter') return;
                                    e.stopPropagation();
                                    patchEvent({ foodAdd: (event.foodAdd || []).filter(a => a.id !== it.id) },
                                      (it.short || it.item) + ' removed.');
                                  }}>
                                  remove
                                </span>
                              )}
                            </button>
                            {tuning && (
                              // onMouseDown preventDefault (bubbles from every button/chip
                              // inside): while the cost input is focused (autoFocus in tune
                              // mode), tapping ANY control in here — size stepper, skip-it,
                              // a store chip, a swap chip — would otherwise blur the input
                              // first, and its onBlur commits the pre-filled midpoint, locking
                              // a fabricated price and unmounting the very control you tapped
                              // before its click lands. Found live-testing: tapping "Costco"
                              // to re-source silently locked the midpoint instead. Killing the
                              // default focus shift on mousedown keeps focus put so no blur
                              // fires, and click still runs on mouseup — so the store re-price
                              // (which reshapes it.low/high, hence Value/Premium too) actually
                              // happens instead of a stray commit.
                              <div className="brow" style={{ margin: '2px 0 var(--sp-2)', paddingLeft: 30 }} onMouseDown={e => e.preventDefault()}>
                                {/* COST STRUCTURE, per item — the engine's own knobs:
                                    size it (foodQty re-prices), swap it (alternatives
                                    carry their own real ranges), or skip it. */}
                                <div className="actions-row" style={{ alignItems: 'center' }}>
                                  <span className="of">size:</span>
                                  <button className="mini" onClick={() => {
                                    const q = Math.max(0, (Number(it.qty) || 0) - 1);
                                    patchEvent({ foodQty: { ...(event.foodQty || {}), [it.id]: q } }, 'Sized to ' + q + ' ' + (it.unit || '') + ' — the cost just moved.');
                                  }}>−</button>
                                  <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{it.qty} {it.unit}</span>
                                  <button className="mini" onClick={() => {
                                    const q = (Number(it.qty) || 0) + 1;
                                    patchEvent({ foodQty: { ...(event.foodQty || {}), [it.id]: q } }, 'Sized to ' + q + ' ' + (it.unit || '') + ' — the cost just moved.');
                                  }}>+</button>
                                  {/* Drift cue + reset (host request 2026-07-12): once a host
                                      steps the size off the recommended baseline (it.baseQty,
                                      the engine's rate×guests result — qtyOverridden flags it),
                                      show what the recommendation was and a one-tap way back,
                                      so the stepper can't silently strand them above/below the
                                      portion goal. Both fields already ride on the item from
                                      playbooks/index.js:2273; V2 just never read them. */}
                                  {it.qtyOverridden && it.baseQty != null && Number(it.baseQty) !== Number(it.qty) && (
                                    <>
                                      <span className="of" style={{ color: 'var(--muted)' }}>aim ~{it.baseQty} {it.unit}</span>
                                      <button className="mini" onClick={() => {
                                        const m = { ...(event.foodQty || {}) }; delete m[it.id];
                                        patchEvent({ foodQty: m }, (it.short || it.item) + ' back to the recommended ' + it.baseQty + ' ' + (it.unit || '') + '.');
                                      }}>reset</button>
                                    </>
                                  )}
                                  <button className="mini" onClick={() => {
                                    if (it.skipped) {
                                      const m = { ...(event.foodSkip || {}) }; delete m[it.id];
                                      patchEvent({ foodSkip: m }, (it.short || it.item) + ' is back — the total just picked it up again.');
                                    } else {
                                      patchEvent({ foodSkip: { ...(event.foodSkip || {}), [it.id]: true } }, (it.short || it.item) + ' skipped — the total just dropped.');
                                    }
                                  }}>{it.skipped ? 'restore it' : 'skip it'}</button>
                                </div>
                                {/* Real-cost entry now lives inline on the row itself
                                    (tap the amount) — the frictionless path. This stays
                                    only for the already-locked reset case; "back to
                                    estimate" has no other home. */}
                                {it.locked != null && (
                                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)', alignItems: 'center' }}>
                                    <span className="of">cost:</span>
                                    <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>set at {fmt(it.locked)}</span>
                                    <button className="mini" onClick={() => {
                                      const m = { ...(event.foodLocked || {}) }; delete m[it.id];
                                      const rm = { ...(event.foodReal || {}) }; delete rm[it.id];
                                      patchEvent({ foodLocked: m, foodReal: rm }, (it.short || it.item) + ' back to the estimate range.');
                                    }}>back to estimate</button>
                                  </div>
                                )}
                                {Array.isArray(it.where) && it.where.length > 1 && (
                                  <div className="chips" style={{ marginTop: 'var(--sp-2)' }}>
                                    {it.where.slice(0, 4).map(w => (
                                      <button key={w} className="chip" aria-pressed={(event.foodWhere || {})[it.id] === w}
                                        onClick={() => {
                                          // Store pick still isn't a "paid" price (cost-truth
                                          // gate — that's foodLocked, only set on an actual
                                          // purchase). But for a protein with a real per-channel
                                          // price (sourcingPrices / canonicalProteinPrice, the
                                          // same cited data the plan-wide sourcing tier uses),
                                          // the engine now repriced THIS line's estimate to that
                                          // channel the moment it's picked — was display-only
                                          // before (2026-07-11 food-plan audit). Never invents a
                                          // number for stores without sourced data.
                                          patchEvent({ foodWhere: { ...(event.foodWhere || {}), [it.id]: w } },
                                            'Buying at ' + w + ' — estimate re-priced to that channel when we have real numbers for it.');
                                        }}>
                                        {w}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {(alts.length > 0 || it.swappedFrom) && (
                                  <div className="chips" style={{ marginTop: 'var(--sp-2)' }}>
                                    {it.swappedFrom && (
                                      <button className="chip" onClick={() => {
                                        const m = { ...(event.foodSwap || {}) }; delete m[it.id];
                                        patchEvent({ foodSwap: m }, 'Back to ' + it.swappedFrom + ' — original pricing restored.');
                                      }}>back to {it.swappedFrom}</button>
                                    )}
                                    {alts.map(na => {
                                      const name = na.name;
                                      const isActive = activeSwapName === name;
                                      // A plain-string alt (no unitCostRange) keeps the line's
                                      // current cost when swapped — no delta to show, honestly.
                                      // A priced alt re-prices to units × ITS OWN range, the same
                                      // math the engine applies on swap (playbookFoodPlan). Only
                                      // shown when there's a real quantity + current cost to
                                      // compare against (same honest-empty rule as the sourcing-
                                      // tier delta above) and it isn't the alt already active.
                                      const altCost = (!isActive && foodPlan.hasRealCount && Array.isArray(na.unitCostRange) && it.units)
                                        ? (Number(it.units) || 0) * ((Number(na.unitCostRange[0]) || 0) + (Number(na.unitCostRange[1]) || 0)) / 2
                                        : null;
                                      const delta = (altCost != null && cost) ? Math.round(altCost - cost) : null;
                                      const deltaLabel = (delta != null && delta !== 0)
                                        ? (delta < 0 ? ' · saves ~' + fmt(Math.abs(delta)) : ' · ~' + fmt(Math.abs(delta)) + ' more')
                                        : '';
                                      return (
                                        <button key={name} className="chip" onClick={() => patchEvent({ foodSwap: { ...(event.foodSwap || {}), [it.id]: name } }, 'Swapped to ' + name + ' — priced with its own real range.')}>
                                          {name}{deltaLabel}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                    );
                  });
                  return (
                    <>
                      {stores.length > 1 && (
                        <>
                        <div className="shelf-label" style={{ margin: '10px 0 6px' }}>Shopping at</div>
                        <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {stores.slice(0, 5).map(s => (
                            <button key={s} className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={shopStore === s}
                              onClick={() => setShopStore(shopStore === s ? null : s)}>{shopStore === s ? 'At ' + s : s}</button>
                          ))}
                          {shopStore && <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} onClick={() => setShopStore(null)}>Everything</button>}
                        </div>
                        </>
                      )}
                      {shopStore && (
                        <>
                          <p className="grounding" style={{ margin: '0 0 10px' }}>
                            {runLeft.length === 0
                              ? 'Everything for ' + shopStore + ' is bought — nothing left on this run.'
                              : runLeft.length + ' line' + (runLeft.length === 1 ? '' : 's') + ' left at ' + shopStore + ' — walk in expecting about ' + fmt(runLo) + (runHi > runLo ? '–' + fmt(runHi) : '') + '. Check them off as you buy — the real price is optional.'}
                          </p>
                          {/* #8 BULK CHECK-OFF (AnyList/Instacart parity): a real store
                              run is one cart, not 18 taps. One button marks every line
                              left at THIS store bought — same foodGot write the per-row
                              tap makes, so it's undoable (patchEvent generic undo) and
                              prices stay optional. Only when 2+ remain (one line is
                              faster tapped directly). */}
                          {runLeft.length >= 2 && (() => {
                            const markAllInStore = () => {
                              const next = { ...(event.foodGot || {}) };
                              runLeft.forEach(it => { next[it.id] = true; });
                              let ns = null;
                              try { ns = hostSpending({ ...event, foodGot: next }, foodPP.priceFactor).spent; } catch { ns = null; }
                              patchEvent({ foodGot: next }, `Marked all ${runLeft.length} lines at ${shopStore} bought` + (ns != null ? ` — spent is now ${fmt(ns)}.` : '.'));
                            };
                            return (
                              <button className="mini" style={{ marginBottom: 10 }} onClick={markAllInStore}>
                                Got everything at {shopStore} — mark all {runLeft.length} bought
                              </button>
                            );
                          })()}
                        </>
                      )}
                      {groupRows}
                    </>
                  );
                })()}
                {(foodPlan.specialDiets || []).length > 0 && (
                  <p className="grounding" style={{ marginTop: 10 }}>
                    Dietary: {foodPlan.specialDiets.map(d => d.count + ' ' + d.diet).join(', ')} — a real named main is sized into the totals for them.
                  </p>
                )}
                {/* Add your own line — closes the remove/add asymmetry legacy already
                    fixed (App.js ~11415-11457): a dish someone's bringing, or anything
                    off-playbook the host is buying. Name required; who's bringing it +
                    cost both optional and honest — no invented number. */}
                <div style={{ marginTop: 'var(--sp-1)' }}>
                  {foodAddOpen ? (
                    <div className="brow" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--sp-3)' }}>
                      <div className="shelf-label" style={{ marginBottom: 'var(--sp-2)' }}>Add your own item</div>
                      <input className="field" style={{ maxWidth: 'none' }} autoFocus
                        placeholder="e.g. Aunt Carol's potato salad, extra ice"
                        value={foodAddName} onChange={e => setFoodAddName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitFoodAdd(); }} />
                      <div className="actions-row" style={{ marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
                        <input className="field" style={{ maxWidth: 220, flex: 1 }} placeholder="Who's bringing it (optional)"
                          value={foodAddOwner} onChange={e => setFoodAddOwner(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitFoodAdd(); }} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '0 10px' }}>
                          <span className="of">$</span>
                          <input type="number" inputMode="decimal" min="0" placeholder="cost (optional)"
                            style={{ width: 115, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 'var(--t-input)', fontWeight: 650, fontFamily: 'inherit', padding: '9px var(--sp-1)' }}
                            value={foodAddCost} onChange={e => setFoodAddCost(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitFoodAdd(); }} />
                        </span>
                      </div>
                      {/* Where it belongs — auto-guessed from the name; tap to override
                          (same word list as legacy's guessFoodCategory, ported above). */}
                      <div className="actions-row" style={{ marginTop: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="of">Goes in:</span>
                        {['Food', 'Drinks', 'Supplies'].map(g => {
                          const active = (foodAddGroup || guessFoodCategory(foodAddName).group) === g;
                          return (
                            <button key={g} className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={active}
                              onClick={() => setFoodAddGroup(g)}>{g}</button>
                          );
                        })}
                      </div>
                      <div className="actions-row" style={{ marginTop: 10 }}>
                        <button className="cta" disabled={!foodAddName.trim()} style={!foodAddName.trim() ? { opacity: .45 } : undefined}
                          onClick={commitFoodAdd}>Add to the plan</button>
                        <button className="mini" onClick={() => { setFoodAddOpen(false); setFoodAddName(''); setFoodAddOwner(''); setFoodAddCost(''); setFoodAddGroup(null); }}>Cancel</button>
                      </div>
                      <p className="grounding" style={{ marginTop: 'var(--sp-2)' }}>Cost is optional — leave it blank if you don’t know it yet, or if someone else is bringing it.</p>
                    </div>
                  ) : (
                    <button className="fold-btn" style={{ marginTop: 14 }} onClick={() => setFoodAddOpen(true)}>
                      + Add an item you’re bringing or buying<span className="chev" aria-hidden="true">›</span>
                    </button>
                  )}
                </div>
              </>
            ) : <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>No spread to build for this kind of event yet.</div>)}
            {sheet.kind === 'vendors' && (() => {
              // Queue item 6 — the promise-model engine (vendorAccountability):
              // cross-vendor conflicts up top, a per-vendor accountability line
              // when the tier isn't clean. Deterministic, honest not_tracked.
              let conflicts = [];
              try { conflicts = deriveVendorPromiseConflicts(event) || []; } catch { conflicts = []; }
              const streams = (plan && plan.workstreams) || [];
              const showStreams = streams.length > 1 || streams.some(w => w.status !== 'ready' && w.status !== 'not_started');
              // Was a locally-defined list that drifted from the canonical
              // isVendorBooked() predicate (workstreams.js) and from
              // vendorPlan.js's own "any match" definition — a vendor could
              // read booked in the rollup and unresolved on its own card
              // (found in the per-screen audit). Now the single shared source.
              const chipify = (s) => String(s || '').split(' — ')[0].split('.')[0].slice(0, 42);
              const unbookedSuggestions = vendorPlan.relevant ? vendorPlan.categories.filter(c => !c.booked) : [];
              const hasVendors = (event.vendors || []).length > 0;
              const rc = rollup && rollup.counts && rollup.counts.total > 0 ? rollup.counts : null;
              return (
              <>
              {/* Hero copy (host request 2026-07-11): the readiness count leads,
                  a warm honest line under it — same treatment as guests + food.
                  Counts come straight from the vendor readiness rollup. */}
              {rc && (
                <div style={{ padding: '2px 0 14px' }}>
                  {/* Port of Figma 416:60 — hero composes the parity kit
                      (Eyebrow → BigValue → Newsreader GuideLine), same as the
                      food/budget heroes. Anti-drift; see parity/MANIFEST. */}
                  <Eyebrow>Ready for the day</Eyebrow>
                  <BigValue style={{ fontVariantNumeric: 'tabular-nums', ...((rc.total > 0 && (rc.confirmed || 0) >= rc.total) ? { color: 'var(--ok)' } : null) }}>
                    {rc.ready} of {rc.total}
                  </BigValue>
                  <GuideLine>
                    {/* RECON (2026-07-11): the star is the ROLLUP's booked bar — the
                        guide speaks the same vocabulary. The stricter confirm bar
                        belongs to the day-before row; borrowing its words here retyped
                        the number. "locked in" stays reserved for isVendorConfirmed. */}
                    {(() => {
                      if (rc.ready < rc.total) return `${rc.total - rc.ready} not booked yet — their cards below say which.`;
                      const confirmed = (event.vendors || []).filter(isVendorConfirmed).length;
                      const toConfirm = Math.max(0, rc.ready - confirmed);
                      return toConfirm > 0
                        ? `All booked — ${toConfirm} still to confirm before the day.`
                        : 'Everyone’s locked in — confirms, times, and paperwork all set.';
                    })()}
                  </GuideLine>
                </div>
              )}
              {vendorPlan.relevant && (
                // Port of Figma 416:60 — the market picker folds to a hairline
                // disclosure row ("Which market · <label> ›"); tapping opens the
                // full picker. Keeps the calm summary calm (was an always-open select).
                !sheet.marketOpen ? (
                  <div className="fstat-list" style={{ margin: '0 0 var(--sp-3)' }}>
                    <button className="fstat" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }} onClick={() => setSheet(s => ({ ...s, marketOpen: true }))}>
                      <span className="fstat-l">Which market</span>
                      <span className="fstat-v">{metroMkt ? metroMkt.label : 'National baseline'}<span className="fstat-chev" aria-hidden="true">›</span></span>
                    </button>
                  </div>
                ) : (
                  <div style={{ marginBottom: 'var(--sp-3)' }}>
                    <label className="shelf-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 var(--sp-1)' }} htmlFor="metro-market-pick">
                      <span>Which market are you in?</span>
                      <button className="mini" onClick={() => setSheet(s => ({ ...s, marketOpen: false }))}>done</button>
                    </label>
                    <select id="metro-market-pick" className="field" value={event.metroMarket || ''}
                      onChange={e => {
                        const id = e.target.value;
                        const m = id ? METRO_MARKETS.find(x => x.id === id) : null;
                        patchEvent({ metroMarket: id || null },
                          m ? `Estimates now use ${m.label} typical rates.` : 'Back to a national baseline — no market set.');
                      }}>
                      <option value="">National baseline — no market set</option>
                      {[1, 2, 3, 4].map(tier => (
                        <optgroup key={tier} label={`Tier ${tier} — ${METRO_TIER_LABEL[tier].label}`}>
                          {METRO_MARKETS.filter(m => m.tier === tier).map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {metroMkt && (
                      <p className="grounding" style={{ margin: 'var(--sp-1) 0 0' }}>
                        {metroMkt.label} typically runs {metroMkt.factor > 1 ? 'above' : metroMkt.factor < 1 ? 'below' : 'at'} the national baseline{metroMkt.factor !== 1 ? ` (${metroMkt.factor > 1 ? '+' : ''}${Math.round((metroMkt.factor - 1) * 100)}%)` : ''} used for the ranges below.
                      </p>
                    )}
                  </div>
                )
              )}
              {hasVendors ? (
                <>
                  {showStreams && (
                    <div className="wstrip">
                      {streams.map(w => {
                        // SSOT #1 ROOT FIX: green = fully CONFIRMED, not merely booked.
                        // This chip used to go green off `booked >= total`, so a
                        // Deposit-Paid vendor produced a green "PHOTOGRAPHY 1 of 1"
                        // sitting directly above that same vendor's (correctly) non-green
                        // status pill — two contradictory readings 40px apart.
                        const done = w.readiness && w.readiness.total > 0 && w.readiness.confirmed >= w.readiness.total;
                        const attn = w.blocked || (w.readiness && (w.readiness.needsAttention > 0 || w.readiness.toConfirm > 0));
                        // COLOUR WAS THE ONLY SIGNAL (2026-07-14). The chip rendered just a label
                        // and "3 of 3", so a BLOCKED workstream was distinguished from a healthy
                        // one purely by an amber tint — and a colour-blind host saw an ordinary
                        // chip. UX_02 forbids colour-alone meaning. Worse, "3 of 3" reads as
                        // finished, so the tint was carrying a message the number contradicted.
                        // Say what is wrong, in words.
                        const r = w.readiness || {};
                        const why = w.blocked ? 'blocked'
                          : r.needsAttention > 0 ? `${r.needsAttention} need${r.needsAttention === 1 ? 's' : ''} you`
                          : r.toConfirm > 0 ? `${r.toConfirm} to confirm`
                          : null;
                        return (
                          <button key={w.id} className={'wchip' + (done ? ' done' : attn ? ' attn' : '')}
                            aria-label={`${w.label} — ${r.booked != null ? `${r.booked} of ${r.total} booked` : 'none booked'}${why ? ', ' + why : done ? ', all confirmed' : ''}`}
                            onClick={() => { if (!(w.deepLink && routeSheet(w.deepLink))) setSheet({ kind: 'vendors' }); }}>
                            <span className="wl">{w.label}</span>
                            <span className="wn">{w.readiness ? w.readiness.booked + ' of ' + w.readiness.total : '—'}</span>
                            {why && <span className="ww">{why}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {conflicts.length > 0 && (
                    <button className="conflictbar" onClick={() => setSheet(s => ({ ...s, conflictsOpen: !s.conflictsOpen }))}>
                      <span>{conflicts.length} thing{conflicts.length === 1 ? '' : 's'} between vendors need{conflicts.length === 1 ? 's' : ''} a look</span>
                      <span aria-hidden="true" style={{ transform: sheet.conflictsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }}>›</span>
                    </button>
                  )}
                  {sheet.conflictsOpen && conflicts.slice(0, 4).map((c, i) => (
                    <div key={c.id || i} className="brow" style={{ borderColor: 'var(--warn-tint)' }}>
                      <p className="grounding" style={{ margin: 0, color: 'var(--warn)', fontWeight: 600 }}>{c.title}</p>
                      <p className="grounding" style={{ margin: '2px 0 0' }}>{c.explanation}{c.recommendedAction ? ' ' + c.recommendedAction : ''}</p>
                    </div>
                  ))}
                  {(event.vendors || []).map(v => {
                    let acct = null;
                    try { acct = quickAccountabilityForVendor(v, event); } catch { acct = null; }
                    const worry = acct && acct.tier && acct.tier !== 'on_track' && (acct.reasons || []).length ? acct.reasons[0] : null;
                    let coiAct = null;
                    try { coiAct = coiNextAction(v, event, v.name || 'this vendor'); } catch { coiAct = null; }
                    let memLine = '';
                    try { memLine = summarizeVendorMemory(vendorMemoryFor([...ALL_SAMPLES.map(se => se.id === event.id ? event : se)], v, event.id)); } catch { memLine = ''; }
                    const isOpen = sheet.focus === v.id;
                    // green pill = fully locked in only (isVendorConfirmed); a
                    // Deposit-Paid/Contracted vendor is 'mid' (lavender in-progress),
                    // matching the steel picker + the readiness dot (SSOT #1 — was
                    // isVendorBooked, which greened a booked-not-confirmed vendor).
                    const good = isVendorConfirmed(v);
                    // Build-map #10: this vendor's own confirm-back, if they answered
                    // the brief link (backend + vendor-side form already shipped).
                    const vConfirm = confirmationByVendor[String(v.id)] || null;
                    return (
                      <div key={v.id} className={'vcard' + (isOpen ? ' open' : '')}
                        ref={el => { if (el && isOpen) el.scrollIntoView({ block: 'center' }); }}
                        onClick={() => setSheet(s => ({ ...s, focus: isOpen ? null : v.id }))}>
                        <div className="vc-head">
                          <div className="vc-avatar" aria-hidden>{String(v.name || '?').trim().charAt(0).toUpperCase()}</div>
                          <div className="vc-id">
                            <div className="vc-name">{v.name || 'Unnamed'}</div>
                            {/* Audit #8: the agreed cost + paid state were hidden in
                                the expanded editor, so a host couldn't compare vendor
                                costs at a glance. Surface them on the collapsed card
                                face (with status + arrival) so the list scans side-by-side. */}
                            <div className="vc-cat">{[v.category || 'Vendor', v.arrivalTime ? 'arrives ' + v.arrivalTime : null, Number(v.cost) > 0 ? '$' + Number(v.cost).toLocaleString() + (v.balancePaid ? ' · paid' : '') : null,
                              // How this vendor prices (host report): a per-head figure for a caterer/bar
                              // ("$20/head"), "flat rate" / "per item" for the rest — from the one pricing-basis source.
                              Number(v.cost) > 0 ? vendorPricingHint(v, Number(event.guestCount) || Number(event.guestEstimate) || 0) : null].filter(Boolean).join(' · ')}</div>
                          </div>
                          {/* HOST-APPROPRIATE-VENDOR-UI: an informal helper isn't
                              missing paperwork — there's none to have. "no status"
                              reads like an incomplete paid booking; this reads like
                              what it actually is. */}
                          {v.isInformal ? (
                            <span className="vc-pill">helping out</span>
                          ) : (
                            /* Audit #6: the pill opens an explicit status PICKER
                               (below) instead of silently cycling — the host sees
                               every state and taps the real one. */
                            <button className={'vc-pill' + (good ? ' good' : v.status ? ' mid' : '')}
                              onClick={ev => { ev.stopPropagation(); setStatusPickFor(statusPickFor === v.id ? null : v.id); }}
                              aria-expanded={statusPickFor === v.id} aria-haspopup="true"
                              title={v.status ? (VENDOR_STATUS_MEANING[vendorStatusIsCurrent(v, 'Confirmed') ? 'Confirmed' : v.status] || vendorStatusLabel(v.status)) : 'Tap to set where this vendor stands'}
                              aria-label={'Booking status: ' + (v.status ? vendorStatusLabel(v.status) : 'not set') + (v.status && VENDOR_STATUS_MEANING[vendorStatusIsCurrent(v, 'Confirmed') ? 'Confirmed' : v.status] ? ' — ' + VENDOR_STATUS_MEANING[vendorStatusIsCurrent(v, 'Confirmed') ? 'Confirmed' : v.status] : '') + '. Tap to change.'}>
                              {/* caret so the pill reads as the confirm/status CONTROL,
                                  not a static label — the "confirm with vendor" action
                                  routes here but the tap target wasn't discoverable. */}
                              {v.status ? vendorStatusLabel(v.status) : 'set status'}
                              <span aria-hidden="true" style={{ marginLeft: 5, opacity: .55, fontSize: '.85em' }}>▾</span>
                            </button>
                          )}
                        </div>
                        {!v.isInformal && statusPickFor === v.id && (
                          <div className="vc-statuspick" role="group" aria-label="Set booking status"
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', margin: '2px 0 8px' }}>
                            {VENDOR_STATUS_LADDER.map(s => {
                              const cur = vendorStatusIsCurrent(v, s);
                              // current step = SELECTION (steel), not --ok green — green
                              // means done/confirmed; steel is the doctrine's selection
                              // color, so a mid-ladder step like "Deposit paid" no longer
                              // reads as "good/done".
                              return (
                                <button key={s} className="vc-pill"
                                  onClick={ev => { ev.stopPropagation(); setVendorStatus(v, s); }}
                                  title={VENDOR_STATUS_MEANING[s] ? vendorStatusLabel(s) + ' — ' + VENDOR_STATUS_MEANING[s] : vendorStatusLabel(s)}
                                  aria-label={vendorStatusLabel(s) + (VENDOR_STATUS_MEANING[s] ? ' — ' + VENDOR_STATUS_MEANING[s] : '')}
                                  aria-pressed={cur} style={cur ? { color: 'var(--steel-soft)', background: 'var(--steel-tint)', fontWeight: 700 } : { opacity: .82 }}>
                                  {vendorStatusLabel(s)}
                                </button>
                              );
                            })}
                            <span className="grounding" style={{ flexBasis: '100%', margin: '2px 0 0', color: 'var(--faint)' }}>
                              {v.status ? VENDOR_STATUS_MEANING[vendorStatusIsCurrent(v, 'Confirmed') ? 'Confirmed' : v.status] || 'Tap where this vendor really is.' : 'Tap where this vendor really is — you can change it anytime.'}
                            </span>
                          </div>
                        )}
                        {(worry || coiAct || memLine || vConfirm) && (
                          <div className="vc-chips">
                            {vConfirm && <span className="vc-chip" style={vConfirm.state === 'confirmed' ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{vConfirm.state === 'confirmed' ? 'Confirmed by vendor' : 'Vendor flagged an issue'}</span>}
                            {worry && <span className="vc-chip">{chipify(worry)}</span>}
                            {coiAct && <span className="vc-chip">Insurance</span>}
                            {!worry && !coiAct && memLine && <span className="vc-chip quiet">{chipify(memLine)}</span>}
                          </div>
                        )}
                        <div className="vc-more" onClick={ev => ev.stopPropagation()}>
                          {/* Build-map #10: the vendor's own confirm-back on the brief
                              link — their words, back in the host's ledger. Read-only. */}
                          {vConfirm && (
                            <div className="brow" style={{ marginBottom: 'var(--sp-3)' }}>
                              <div className="f-name" style={{ marginBottom: 3 }}>
                                {vConfirm.state === 'confirmed' ? 'They confirmed the brief' : 'They flagged something'}
                                <span className="tag plan" style={vConfirm.state === 'confirmed' ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{vConfirm.state === 'confirmed' ? 'confirmed' : 'issue'}</span>
                              </div>
                              {(vConfirm.on_site_name || vConfirm.on_site_phone) && (
                                <p className="grounding" style={{ margin: '0 0 2px' }}>On-site: {[vConfirm.on_site_name, vConfirm.on_site_phone].filter(Boolean).join(' · ')}</p>
                              )}
                              {vConfirm.note && <p className="grounding" style={{ margin: '0 0 2px' }}>“{vConfirm.note}”</p>}
                              <p className="grounding" style={{ margin: 0, color: 'var(--faint)' }}>Answered {(() => { try { return new Date(vConfirm.updated_at || vConfirm.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return 'recently'; } })()} — from the brief link you shared.</p>
                            </div>
                          )}
                          {/* Contact info — a vendor added from a suggested category
                              starts life as { category, name:'' } with no way to name it
                              or reach it; nothing in this cockpit ever wrote name/phone/
                              email, so a vendor could stay "Unnamed" forever and the Call
                              button (below) could never appear. Legacy already has this
                              as a plain form field; V2 never got it. */}
                          <div className="actions-row" style={{ marginBottom: 'var(--sp-2)', flexWrap: 'wrap' }}>
                            <input className="field" style={{ maxWidth: 170, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="vendor name"
                              value={v.name || ''} onChange={e => writeVendor(v.id, { name: e.target.value }, null)} aria-label="Vendor name" />
                            <input className="field" style={{ maxWidth: 140, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="phone" type="tel"
                              value={v.phone || ''} onChange={e => writeVendor(v.id, { phone: formatPhoneUS(e.target.value) }, null)} aria-label="Vendor phone" />
                            <input className="field" style={{ maxWidth: 185, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="email" type="email"
                              value={v.email || ''} onChange={e => writeVendor(v.id, { email: e.target.value }, null)} aria-label="Vendor email" aria-invalid={isMalformedEmail(v.email)} />
                          </div>
                          {isMalformedEmail(v.email) && <p className="grounding" role="alert" style={{ margin: '-4px 0 var(--sp-2)', color: 'var(--warn)' }}>That doesn’t look like an email address.</p>}
                          {/* Vendor Brief authoring (VB2, ported): contactName and
                              briefNote are both in buildVendorBriefPayload's audited
                              whitelist (lib/vendorBrief.js) — legacy has always had a
                              plain field for each; V2 never got either, so a brief
                              minted here would leave them blank. contactName is who a
                              vendor calls on-site if the host isn't reachable; briefNote
                              is a plain note that goes to the VENDOR (never v.notes,
                              which is host-private bookkeeping and never leaves this
                              cockpit). */}
                          <div className="actions-row" style={{ marginBottom: 'var(--sp-2)', flexWrap: 'wrap' }}>
                            <input className="field" style={{ maxWidth: 220, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="on-site contact (if not you)"
                              value={v.contactName || ''} onChange={e => writeVendor(v.id, { contactName: e.target.value }, null)} aria-label="On-site contact for this vendor's brief" />
                          </div>
                          <textarea className="field" style={{ maxWidth: 'none', width: '100%', boxSizing: 'border-box', fontSize: 'var(--t-input)', padding: 'var(--sp-2) 10px', marginBottom: 'var(--sp-2)', resize: 'vertical' }}
                            placeholder="A note for them — parking, load-in door, anything they should know before they arrive" rows={2}
                            value={v.briefNote || ''} onChange={e => writeVendor(v.id, { briefNote: e.target.value }, null)} aria-label="Note shared with this vendor in their brief" />
                          {/* Agent Opportunity Audit P0 — paste the vendor's reply, review
                              the extracted fields, apply through writeVendor. */}
                          <VendorReplyParserV2 vendor={v} event={event} writeVendor={writeVendor} />
                          {/* WAVE-B write paths (b) + (c): arrival time (the day-of
                              roster, NOW card, and print sheet all read v.arrivalTime;
                              nothing wrote it) and money — the payment-note button
                              below gates on Number(v.cost) > 0 && !v.balancePaid, so
                              these two fields make that gate reachable AND resolvable.
                              Money stays off informal helpers — they're not a paid
                              vendor by the host's own word. */}
                          <div className="actions-row" style={{ margin: '0 0 10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <label className="of" htmlFor={'v-arrive-' + v.id}>arrives</label>
                            <input id={'v-arrive-' + v.id} className="field" type="time" style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                              value={v.arrivalTime || ''} onChange={e => writeVendor(v.id, { arrivalTime: e.target.value }, null)}
                              aria-label="Arrival time on the day" />
                            {/* THE DEADLINE IS GROUNDED. THE HOUR IS NOT — SO WE ASK.
                                The Day tab's own empty state promises the schedule "fills in as
                                vendors and their arrival times settle", and the app then does
                                nothing whatsoever to make that happen: this was a bare empty
                                field and the host had to remember, alone, that a caterer needs
                                chasing.

                                We do NOT propose an hour. No playbook authors "catering arrives
                                2h before" — grepped, zero hits — and inventing "4:00 PM" is the
                                exact bug this sweep exists to kill. Only the vendor knows.

                                What IS authored, and genuinely varies, is the DEADLINE: catering
                                locks arrival 3 days out, a photographer 7. So we name the date,
                                say whose rule it is, and draft the ask. (Contrast payment_terms
                                — daysBefore: 30 in ALL THIRTEEN playbooks — a constant in
                                playbook clothing, which grounds nothing and is left alone.) */}
                            {(() => {
                              const ask = (() => { try { return arrivalAsk(v, event); } catch (_e) { return null; } })();
                              if (!ask) return null;
                              return (
                                <span className="tag plan" style={ask.overdue
                                  ? { color: 'var(--warn)', background: 'var(--warn-tint)' }
                                  : { color: 'var(--steel-soft)', background: 'var(--steel-tint)' }}>
                                  {ask.label}
                                </span>
                              );
                            })()}
                            {!v.isInformal && (<>
                              <label className="of" htmlFor={'v-cost-' + v.id}>agreed to pay $</label>
                              <input id={'v-cost-' + v.id} className="field" type="number" inputMode="numeric" min="0" placeholder="0"
                                style={{ maxWidth: 104, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                                value={vendorCostDraft !== null && isOpen ? vendorCostDraft : (v.cost ?? '')}
                                onFocus={() => setVendorCostDraft(String(v.cost ?? ''))}
                                // A payment amount is digits only — strip anything else at the source so
                                // pasted/typed text (a whole sentence, letters, symbols) can never land a
                                // garbled number in the field. commitVendorCost still rounds to an integer.
                                onChange={e => setVendorCostDraft(e.target.value.replace(/[^\d]/g, ''))}
                                onBlur={() => commitVendorCost(v)}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'Escape') setVendorCostDraft(null); }}
                                aria-label="What you agreed to pay" />
                              {/* THE ESTIMATE THE APP ALREADY MADE, AND THEN THREW AWAY.
                                  buildVendorPlan computes a real range for every category —
                                  the playbook's authored costRange × guests × the metro factor
                                  × the rush factor — and shows it on the suggestion row
                                  ("about $650–1,400, before your quotes come in"). Then
                                  addVendorCategory creates {id, category, name}, the row
                                  disappears from the suggestion list, and the host lands HERE
                                  on placeholder="0" — at the exact moment the number would
                                  have been useful. The app knew, and then forgot, on purpose.

                                  It goes beside the field, NOT into it: `cost` means "what you
                                  AGREED to pay", and writing an estimate there would make a
                                  guess indistinguishable from a negotiated price — money
                                  invention, the worst class. The estimate stays an estimate,
                                  and says so. */}
                              {!v.cost && (() => {
                                const row = ((vendorPlan && vendorPlan.categories) || [])
                                  // Keyword-normalized (same matcher vendorPlan uses): 'Catering'
                                  // must find the row authored 'Caterer / BBQ pitmaster', or the
                                  // estimate silently hides for every legacy-seeded vendor.
                                  .find(c => {
                                    if (!c) return false;
                                    const a = String(c.category || '').toLowerCase(), b = String(v.category || '').toLowerCase();
                                    if (a === b) return true;
                                    const na = normalizeCategory(a), nb = normalizeCategory(b);
                                    return na === nb && na !== 'other';
                                  });
                                const copy = row && row.estimateCopy;
                                if (!copy || /from your quote/i.test(copy)) return null;
                                return (
                                  <p className="grounding" style={{ width: '100%', margin: 'var(--sp-1) 0 0', opacity: .85 }}>
                                    Expect {copy}
                                  </p>
                                );
                              })()}
                              {/* The arrival ask: the deadline is the vendor's own playbook rule,
                                  the hour is theirs to give, and the message is already written. */}
                              {(() => {
                                const ask = (() => { try { return arrivalAsk(v, event); } catch (_e) { return null; } })();
                                if (!ask) return null;
                                return (
                                  <p className="grounding" style={{ width: '100%', margin: 'var(--sp-1) 0 0', opacity: .85 }}>
                                    {ask.why}{' '}
                                    <span role="button" tabIndex={0} className="mini rowlink"
                                      onClick={(e) => { e.stopPropagation(); openDraft('Ask ' + v.name + ' for their arrival time', draftVendorReconfirm(event, v, profile)); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openDraft('Ask ' + v.name + ' for their arrival time', draftVendorReconfirm(event, v, profile)); } }}>
                                      Write the ask →
                                    </span>
                                  </p>
                                );
                              })()}
                              <button className="chip" aria-pressed={!!v.balancePaid} onClick={() => toggleVendorPaid(v)}>
                                {v.balancePaid ? 'Paid in full' : 'mark paid in full'}
                              </button>
                              {/* WHEN THE MONEY IS DUE (2026-07-14). `payDueDate` is a real field in
                                  the data model — vendorIntelligence escalates on it (payOverdue →
                                  critical, ≤7d → attention), dayAlerts raises "Payment due today",
                                  doItForMe drafts off it, and the CSV importer maps it. FIVE engines
                                  read it. V2 gave the host no way to SET it — zero occurrences in
                                  the shell — so the entire payment-escalation lane was dark, and the
                                  one `level:'critical'` money tier in the whole engine was
                                  structurally unreachable. An unpaid balance on a booked caterer
                                  raised nothing at all before the event.

                                  Not shown once it's paid: a due date on a settled balance is noise. */}
                              {!v.balancePaid && (<>
                                <label className="of" htmlFor={'v-paydue-' + v.id}>balance due</label>
                                <input id={'v-paydue-' + v.id} className="field" type="date"
                                  style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                                  value={v.payDueDate || ''}
                                  onChange={e => writeVendor(v.id, { payDueDate: e.target.value },
                                    e.target.value ? 'Noted — you’ll get a heads-up before it’s due.' : null)}
                                  aria-label="When the final balance is due" />
                              </>)}
                            </>)}
                          </div>
                          {/* HOST-APPROPRIATE-VENDOR-UI: friends/family helping out
                              shouldn't get chased for a certificate of insurance. This
                              flag is read by the shared vendorAccountability engine
                              (deriveVendorExpectedPromises etc.) and vendorCoiRequirement
                              — setting it clears every COI/contract/promise nudge below,
                              not just the label. */}
                          <button className="chip" style={{ marginBottom: 10 }}
                            aria-pressed={!!v.isInformal}
                            onClick={() => writeVendor(v.id, { isInformal: !v.isInformal },
                              !v.isInformal ? (v.name || 'This') + ' is a friend or family member helping out — no paperwork tracked.' : (v.name || 'This') + ' switched back to a paid vendor.')}>
                            {v.isInformal ? 'Friend or family helping (not a paid vendor)' : 'not a paid vendor — friend or family helping?'}
                          </button>
                          {/* Every open promise is CLEARABLE — the same promiseEvidence
                              override production's vendor detail uses ("Mark proof on
                              file"), so the worry chip can actually resolve, not just
                              describe. Honest: it's the host asserting they have it,
                              not a fake upload. */}
                          {(() => {
                            let openPromises = [];
                            try {
                              openPromises = (inferPromisesFromVendor(v, event) || []).filter(promiseNeedsHost);
                            } catch { openPromises = []; }
                            if (!openPromises.length) return null;
                            // cap the visible list — a fresh vendor can carry a whole
                            // playbook's worth of unconfirmed promises; show what's
                            // actionable now, not an audit of everything at once.
                            const shown = openPromises.slice(0, 3);
                            const more = openPromises.length - shown.length;
                            // Anchor for section:'promises' deep links (Up-Next #5) —
                            // rides the first rendered promise row.
                            return [...shown.map((p, pi) => (
                              <div key={p.promiseKey} id={pi === 0 ? 'v-promises-' + v.id : undefined} className="line" style={{ alignItems: 'center', padding: 'var(--sp-1) 0', scrollMarginTop: 12 }}>
                                <span className="vc-detail" style={{ margin: 0 }}>{p.promiseText}{p.dueDate ? ' · due ' + p.dueDate : ''}</span>
                                {/* Item-scoped label (was a generic "Mark confirmed"
                                    that read as confirming the VENDOR — a host tapped
                                    it and got a "parking … marked confirmed" toast for
                                    a single promise). "Mark done" is clearly about the
                                    promise on this row, distinct from the vendor status
                                    pills above. */}
                                <button className="mini" onClick={() => writeVendor(v.id, { promiseEvidence: { ...(v.promiseEvidence || {}), [p.promiseKey]: 'attached' } },
                                  p.promiseText + ' — marked done.')}>
                                  {p.evidenceRequired ? 'Mark proof on file' : 'Mark done'}
                                </button>
                              </div>
                            )), more > 0 ? (
                              <p key="more" className="vc-detail" style={{ opacity: .7 }}>+{more} more open — the vendor's own brief covers the rest.</p>
                            ) : null];
                          })()}
                          {/* Contract file — the destination for the "attach the file"
                              conflict fix. A host keeps the signed contract in their own
                              drive; this holds a LINK to it (not an upload), which is what
                              clears the "signed but no file on record" clash. Anchored so
                              the conflict CTA lands right on it (row-level-CTA rule). */}
                          {(v.contractSigned === true || v.contract_signed === true || v.contractUrl || v.contractFileName || v.contractStoragePath) && (
                            <div id={'v-contract-' + v.id} className="line" style={{ alignItems: 'center', padding: 'var(--sp-1) 0', flexWrap: 'wrap', gap: 6 }}>
                              <span className="of" style={{ flexShrink: 0 }}>signed contract</span>
                              {(v.contractStoragePath || v.contractFileName || v.contractUrl) ? (
                                // Already on file — the real stored file (or a link), with View / Remove.
                                <>
                                  <span className="vc-detail" style={{ margin: 0, flex: 1, minWidth: 120 }}>{v.contractFileName || 'On file'}</span>
                                  {v.contractUrl && <a className="mini" style={{ textDecoration: 'none' }} href={v.contractUrl} target="_blank" rel="noreferrer">View</a>}
                                  <button className="mini" onClick={() => writeVendor(v.id, { contractStoragePath: null, contractFileName: null, contractUrl: null }, 'Contract file removed.')}>Remove</button>
                                </>
                              ) : isStorageConfigured() ? (
                                // Real upload — same storage.js the app uses (Supabase). Stores the
                                // file + records contractStoragePath/FileName, which clears the clash.
                                <label className="mini" style={{ cursor: contractUploading[v.id] ? 'wait' : 'pointer', marginLeft: 'auto' }}>
                                  {contractUploading[v.id] ? 'Uploading…' : 'Attach file'}
                                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx" style={{ display: 'none' }} disabled={!!contractUploading[v.id]}
                                    onChange={async (e) => {
                                      const file = e.target.files && e.target.files[0]; if (!file) return;
                                      const val = validateFile(file); if (!val.ok) { toast(val.error || 'That file won’t work.'); e.target.value = ''; return; }
                                      setContractUploading(m => ({ ...m, [v.id]: true }));
                                      try {
                                        const r = await uploadFile({ file, eventId: event.id || 'unknown', category: inferCategory(file), userId: (profile && profile.id) || 'anon' });
                                        if (r && r.ok) writeVendor(v.id, { contractStoragePath: r.path, contractFileName: file.name, contractUrl: r.url }, file.name + ' attached — the paper trail’s clean.');
                                        else toast((r && r.error) || 'Upload failed — try again.');
                                      } catch { toast('Upload failed — try again.'); }
                                      finally { setContractUploading(m => ({ ...m, [v.id]: false })); e.target.value = ''; }
                                    }} />
                                </label>
                              ) : (
                                // Fallback when storage isn't configured: a link to where it lives.
                                <input className="field" style={{ flex: 1, minWidth: 150, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }}
                                  placeholder="paste a link to the signed contract"
                                  value={v.contractUrl || ''}
                                  onChange={e => writeVendor(v.id, { contractUrl: e.target.value || null }, e.target.value ? null : undefined)}
                                  aria-label={'Link to ' + (v.name || 'the vendor') + '’s signed contract'} />
                              )}
                            </div>
                          )}
                          {coiAct && (() => {
                            let coi = null; try { coi = getVendorCOIState(v, event); } catch { coi = null; }
                            return (
                            <div id={'v-coi-' + v.id} className="line" style={{ alignItems: 'center', padding: 'var(--sp-1) 0', flexWrap: 'wrap', gap: 6 }}>
                              <span className="vc-detail" style={{ margin: 0, flex: '1 1 100%' }}>{coiAct.title} {coiAct.consequence}</span>
                              {/* WAVE-B (d): optional expiry while marking verified —
                                  getVendorCOIState reads coiExpiryDate to catch coverage
                                  that lapses before the event. Blank is honest: verified
                                  with no date on file. */}
                              {coi && coi.status === 'received' && (
                                <label className="of" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  covered through
                                  <input className="field" type="date" style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: 'var(--sp-1) var(--sp-2)' }}
                                    value={v.coiExpiryDate || ''}
                                    onChange={e => writeVendor(v.id, { coiExpiryDate: e.target.value || null }, null)}
                                    aria-label="Insurance covered through — optional" />
                                </label>
                              )}
                              <button className="mini" style={{ flexShrink: 0, marginLeft: 'auto' }} onClick={() => {
                                // The same status ladder coiNextAction reads: requested → received → verified.
                                if (coi && coi.status === 'requested') writeVendor(v.id, { coiStatus: 'received' }, 'Insurance proof marked received.');
                                else if (coi && coi.status === 'received') writeVendor(v.id, { coiVerified: true }, v.coiExpiryDate ? 'Insurance checked — covered through ' + v.coiExpiryDate + '.' : 'Insurance checked.');
                                else if (coi && coi.status === 'expired') writeVendor(v.id, { coiStatus: 'requested', coiVerified: false, coiExpiryDate: null }, 'Asked for current insurance proof.');
                                else writeVendor(v.id, { coiStatus: 'requested' }, 'Marked as asked.');
                              }}>{coiAct.ctaCopy || 'Mark asked'}</button>
                            </div>
                            );
                          })()}
                          {memLine && <p className="vc-detail">{memLine}</p>}
                          <div className="pill-grid" style={{ marginTop: 'var(--sp-3)' }}>
                            <button className="mini" onClick={() => openDraft('Note to ' + (v.name || 'your vendor'), draftVendorOutreach(event, v, profile))}>Draft note</button>
                            {Number(v.cost) > 0 && !v.balancePaid && (
                              <button className="mini" onClick={() => { try { openDraft('Payment reminder', draftVendorPaymentReminder(event, v)); } catch { toast('Couldn’t draft it.'); } }}>Payment note</button>
                            )}
                            {(() => { try {
                              const m = getSuggestedPayMethod(v); if (!m) return null;
                              const link = buildPayLink(m, v, null); if (!link) return null;
                              return <a className="mini" style={{ textDecoration: 'none' }} href={link} target="_blank" rel="noreferrer">Pay via {m}</a>;
                            } catch { return null; } })()}
                            {String(v.dayOfPhone || v.phone || '').trim() && (
                              <a className="mini" style={{ textDecoration: 'none' }} href={'tel:' + String(v.dayOfPhone || v.phone).replace(/[^+\d]/g, '')}>Call</a>
                            )}
                            <button className="mini" onClick={() => shareVendorBrief(v)}>Share the vendor brief</button>
                          </div>
                          {/* The minted link: a plain URL the host copies and sends
                              themselves — nothing here auto-sends anything. */}
                          {vendorBrief && vendorBrief.vendorId === v.id && (
                            <div style={{ marginTop: 'var(--sp-2)', padding: 'var(--field)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                              {vendorBrief.minting ? (
                                <p className="vc-detail" style={{ margin: 0 }}>Putting the brief together…</p>
                              ) : (
                                <>
                                  <p className="vc-detail" style={{ margin: '0 0 var(--sp-2)', wordBreak: 'break-all' }}>{vendorBrief.url}</p>
                                  <div className="actions-row">
                                    <button className="mini" onClick={copyVendorBriefLink}>{vendorBrief.copied ? 'Copied' : 'Copy link'}</button>
                                    {vendorBrief.qrDataUrl && (
                                      <button className="mini" onClick={() => setSheet({ kind: 'qr', vendorQr: { url: vendorBrief.url, dataUrl: vendorBrief.qrDataUrl, name: v.name, back: { kind: 'vendors', focus: v.id } } })}>
                                        Show QR
                                      </button>
                                    )}
                                  </div>
                                  <p className="vc-detail" style={{ margin: 'var(--sp-2) 0 0', opacity: .75 }}>{(v.name || 'They')} will see only their arrival time, your address, and their part of the day — nothing about budget, payments, or other vendors.</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {nudgeFor('vendors')}
                  {/* Vendor export — the same shared serializers as the guest
                      list (toCSV + COLUMNS.vendors already define the format);
                      missing fields export empty, exactly what's tracked. */}
                  <button className="fold-btn" onClick={exportVendorsCsv}>
                    Download the vendor list (CSV)
                  </button>
                </>
              ) : null}
              {unbookedSuggestions.length > 0 ? (
                <>
                  <div className="shelf-label" style={{ margin: hasVendors ? '16px 0 6px' : '0 0 6px' }}>
                    {hasVendors ? 'Other roles this kind of event usually needs' : 'People this kind of event usually needs'}
                  </div>
                  {/* factorsApplied (metro market, timeline rush) is an EVENT-level
                      adjustment, identical for every category — it was rendering
                      once per row, repeating the same two sentences 6-9 times in a
                      row. Shown once here instead. */}
                  {unbookedSuggestions[0] && unbookedSuggestions[0].factorsApplied.length > 0 && (
                    <p className="grounding" style={{ margin: '0 0 10px', opacity: .75 }}>
                      Estimates below: {unbookedSuggestions[0].factorsApplied.map(f => f.explanation).join(' ')}
                    </p>
                  )}
                  {/* Category name was inheriting .line's 14px/ink-soft with only a
                      fontWeight bump — 1px and 100-weight away from .grounding's
                      13px/550 secondary text below it. Nothing to anchor the eye.
                      Reusing .vc-name's exact treatment (14.5px/750/full-ink) —
                      the same "this is the primary thing in the row" contrast
                      already established for booked-vendor names just above this
                      list, not a new pattern. */}
                  {unbookedSuggestions.map(cat => (
                    <div key={cat.category} className="line" style={{ alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--line-soft)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* wrap (not the vendor row's nowrap+ellipsis) — a suggestion
                            with parenthetical examples should show in full, not clip. */}
                        <div className="vc-name" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{cat.category}</div>
                        {cat.estimateCopy && <p className="grounding" style={{ margin: '3px 0 0' }}>{cat.estimateCopy}</p>}
                        {cat.altToDIY && <p className="grounding" style={{ margin: '2px 0 0', opacity: .75 }}>{cat.altToDIY}</p>}
                      </div>
                      <button className="mini" style={{ flexShrink: 0 }} onClick={() => addVendorCategory(cat.category)}>Add</button>
                    </div>
                  ))}
                </>
              ) : (!hasVendors && <div className="v-meta" style={{ padding: 'var(--pad-empty)' }}>No vendors on this event yet.</div>)}
              </>
              );
            })()}
            {sheet.kind === 'budget' && (() => {
              // HOST MODEL: one number, and "where it's going" priced by the plan
              // itself (hostSpending's food/supplies/capacity terms) — never
              // planner category rows the host didn't write.
              // ROW-LEVEL CTA RULE: hostRowsGo() (component-level, shared with
              // the After tab's identical summary) routes every allocation row
              // to the surface that prices it — the spread (food/supplies),
              // the space list, the crab order.
              const hostRows = hostRowsGo();
              let heroCopy = null; try { heroCopy = budgetHeroCopy(event, foodPP.priceFactor); } catch { heroCopy = null; }
              // Queue item 7 — the recovery engine: source-backed ways OUT of
              // an overage (safe cuts / tradeoffs / protected), never invented $.
              let recovery = null;
              try { recovery = buildBudgetRecoveryPlan(event, foodPP.priceFactor); } catch { recovery = null; }
              let swapPick = null;
              try { swapPick = recovery && recovery.status === 'recovery_available' ? pickDroppableBudgetRow(event, foodPP.priceFactor) : null; } catch { swapPick = null; }
              const left = money.planned ? money.planned - money.committed : null;
              return (
                <>
                  {/* PRINCIPLES REDESIGN (host directive): summary before detail —
                      the host's question is "am I OK?", so the STATE leads. One
                      narrative (the canonical engine copy), not three number
                      readouts of the same fact. */}
                  {money.planned ? (() => {
                    // DENOMINATORS-1: name the guest count this budget was sized
                    // against — the same band the Guests tile and food plan use,
                    // never a second unreconciled number.
                    let budgetBand = null;
                    try { budgetBand = attendanceBand(event); } catch { budgetBand = null; }
                    const hasSpread = budgetBand && budgetBand.applicable && budgetBand.band;
                    const guestPhrase = hasSpread ? attendanceBandLabel(budgetBand) + ' guests' : null;
                    // Hero copy (host request 2026-07-11): the old summary row is
                    // PROMOTED to the full hero. The warm line RENDERS budgetHeroCopy's
                    // own strings (lib/budgetCopy — one source of truth per fact):
                    // its state machine already speaks over/near/waiting honestly.
                    // Plain "under" adds only the engine's caveat — the star and
                    // grounding line already say the rest.
                    const over = left != null && left < 0;
                    const hcState = heroCopy && heroCopy.state;
                    const warmSub = !heroCopy ? null
                      : hcState === 'over' ? [heroCopy.line, heroCopy.caveat].filter(Boolean).join(' ')
                      : hcState === 'near' ? [heroCopy.title, heroCopy.caveat].filter(Boolean).join(' ')
                      : hcState === 'waiting' ? [heroCopy.title, heroCopy.line, heroCopy.caveat].filter(Boolean).join(' ')
                      : heroCopy.caveat || null;
                    return (
                    <SheetHero
                      eyebrow={over ? 'Over by' : 'Left to spend'}
                      star={fmt(Math.abs(left || 0))}
                      tone={over ? 'danger' : hcState === 'near' ? 'warn' : 'ok'}
                      sub={warmSub}
                      grounding={<>
                        <b>{fmt(money.committed)}</b> spoken for of your <b>{fmt(money.planned)}</b>{money.spent ? <> · <b>{fmt(money.spent)}</b> actually spent{money.spentEstimated > 0 ? <> (<b>{fmt(money.spentEstimated)}</b> of it still estimated)</> : null}</> : null}{guestPhrase ? ' · sized for ' + guestPhrase : ''}.
                      </>}
                    />
                    );
                  })() : (
                    heroCopy && heroCopy.title ? <p className="grounding" style={{ margin: '2px 0 var(--sp-2)' }}>{heroCopy.title}{heroCopy.line ? ' ' + heroCopy.line : ''}</p> : null
                  )}
                  {hostRows.length > 0 && (
                    <>
                      {/* BUDGET-CONTRADICTION FIX: "priced by your plan" reads as a
                          budget breakdown — a direct clash with heroCopy's "Set a
                          budget" ask right above when no ceiling exists yet. This
                          row total is real (the plan's own cost estimate), just not
                          a budget, so the label says so instead of implying one. */}
                      <div className="shelf-label" style={{ margin: '10px 0 6px' }}>{money.planned ? 'Where it’s going — priced by your plan' : 'What your plan adds up to so far'}</div>
                      {hostRows.map((r, i) => {
                        const alloc = money.planned ? Math.min(100, Math.round((r.est / money.planned) * 100)) : 0;
                        const got = r.est ? Math.min(100, Math.round((r.got / r.est) * 100)) : 0;
                        const allBought = r.est > 0 && r.got >= r.est;
                        return (
                          <div key={r.label}>
                            <button className="brow"
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--line-soft)', font: 'inherit', color: 'inherit', cursor: 'pointer', animation: `cardin 300ms var(--ease-out) ${i * 40}ms both` }}
                              onClick={r.go} aria-label={'Open ' + r.label}>
                              <div className="line" style={{ padding: '0 0 5px' }}>
                                <span>{r.label} <span className="chev" aria-hidden="true" style={{ position: 'static', color: 'var(--faint)' }}>›</span></span>
                                {/* "$0 bought" ×3 before any buying is noise — the
                                    bought figure earns its place once buying starts */}
                                {allBought
                                  ? <span className="amt" style={{ color: 'var(--ok)' }}>{fmt(r.got)} <span className="of" style={{ color: 'var(--ok)' }}>bought</span></span>
                                  : r.got > 0
                                    ? <span className="amt">{fmt(r.got)} <span className="of">of ~{fmt(r.est)}</span></span>
                                    : <span className="amt">~{fmt(r.est)}</span>}
                              </div>
                              <div className="bline"><i style={{ width: Math.max(alloc, 4) + '%' }}><b style={{ width: got + '%' }} /></i></div>
                            </button>
                            {/* Food-cost detail (audit gap fix): per-head cost, real-priced
                                vs. still-estimated item count, and the regional pricing
                                note — the same facts the legacy Food & Drink card
                                (App.js HostSpendingPlan) surfaces, read from the SAME
                                already-computed foodPlan/foodPP, no new math. */}
                            {r.kind === 'food' && foodPlan && foodPlan.itemCount > 0 && (
                              <div className="v-meta" style={{ padding: '0 0 10px' }}>
                                {foodPlan.guests > 0 && foodPlan.foodHigh > 0 && (
                                  <>≈ {fmt(foodPlan.perGuestLow)}–{fmt(foodPlan.perGuestHigh)} a head × {foodPlan.guests} {foodPlan.guests === 1 ? 'guest' : 'guests'}. </>
                                )}
                                {foodPlan.realCount > 0
                                  ? <>{foodPlan.realCount} of {foodPlan.itemCount} priced for real, the rest estimated.</>
                                  : <>All {foodPlan.itemCount} item{foodPlan.itemCount === 1 ? '' : 's'} still estimated — add a real price anytime (bought or not).</>}
                                {foodPP.priceContext && (
                                  <> Prices adjusted for the {foodPP.priceContext.split(' · ')[0]} region.</>
                                )}
                              </div>
                            )}
                            {/* #39 POST-HOC PRICE NUDGE — only when the budget is
                                actually tight (heroCopy 'over'/'near') AND lines the
                                host already BOUGHT are still counted at an estimate,
                                not a real receipt (foodGot set, but not locked+foodReal).
                                Those estimated dollars are the ones most likely to be
                                wrong when money is close — so ask for what was really
                                paid. Routes to the FIRST such line's tune field
                                (row-level CTA rule), never the sheet top. Silent when
                                the budget has room: no nagging an on-track host. */}
                            {r.kind === 'food' && foodPlan && heroCopy && (heroCopy.state === 'over' || heroCopy.state === 'near') && (() => {
                              const boughtEst = (foodPlan.list || []).filter(it => it && !it.skipped
                                && (event.foodGot || {})[it.id]
                                && !((it.locked != null) && (event.foodReal || {})[it.id] === true)
                                && (Number(it.low) || Number(it.high) || it.locked != null));
                              if (!boughtEst.length) return null;
                              const first = boughtEst[0];
                              const n = boughtEst.length;
                              return (
                                <div className="later-row" style={{ marginTop: 6, background: 'var(--warn-tint)', border: 'none', borderRadius: 'var(--r-md)', padding: 'var(--sp-2) var(--sp-3)', flexWrap: 'wrap', gap: 6 }}>
                                  <span className="t" style={{ color: 'var(--warn)', fontWeight: 600, flex: '1 1 auto' }}>
                                    {n === 1 ? 'One item you already bought is' : `${n} items you already bought are`} still counted at an estimate. The budget’s tight — enter what you actually paid so “spent” is real, not a guess.
                                  </span>
                                  <button className="mini" onClick={() => { setSheet({ kind: 'food', focus: first.id }); setFoodTune(first.id); }}>
                                    {n === 1 ? 'Enter the real price' : 'Enter the real prices'}
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </>
                  )}
                  {recovery && recovery.status === 'recovery_available' && (
                    <div style={{ marginTop: 'var(--sp-3)' }}>
                      <div className="shelf-label" style={{ margin: '0 0 var(--sp-1)', color: 'var(--warn)' }}>A way back under</div>
                      {recovery.headline && <p className="grounding" style={{ margin: '0 0 6px' }}>{recovery.headline}</p>}
                      {(recovery.suggestions || []).slice(0, 4).map((s, i) => (
                        <div key={s.id || i} className="line" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 'var(--t-body-s)', flex: '1 1 auto' }}>
                            {s.copy || s.label || s.title}
                            {s.why ? <span className="grounding" style={{ display: 'block', margin: '2px 0 0' }}>{s.why}</span> : null}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {(s.estimatedSavings || s.amount) ? <span className="of" style={{ whiteSpace: 'nowrap' }}>~{fmt(s.estimatedSavings || s.amount)}</span> : null}
                            {s.route && <button className="mini" onClick={() => { if (!routeSheet(s.route)) toast('In the app this opens: ' + (describeRoute(s.route, event) || 'the right spot')); }}>{s.actionLabel || 'Open'}</button>}
                          </span>
                        </div>
                      ))}
                      {swapPick && swapPick.row && (
                        <p className="grounding" style={{ margin: '6px 0 0', fontWeight: 650, color: 'var(--ink-soft)' }}>
                          The one-line fix: drop “{swapPick.row.category || swapPick.row.label}” (~{fmt(swapPick.drop)}) and you’re back under.
                        </p>
                      )}
                      {(recovery.protectedItems || []).length > 0 && (
                        <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Protected — not on the cut list: {(recovery.protectedItems || []).slice(0, 3).map(x => x.label || x).join(', ')}.</p>
                      )}
                    </div>
                  )}
                  {/* the editor is settled work once a number exists — it folds;
                      no number yet → it IS the ask, so it stays open */}
                  {Number(event.totalBudget) > 0 ? (
                    budgetFoldOpen ? (
                      // Fold-open = intent to change → open straight into the CHANGE drawer (its
                      // own "Pick a number, or set your own" header carries it, so no shelf-label
                      // to repeat "Change the number"); just a right-aligned done to collapse.
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 var(--sp-2)' }}><button className="mini" onClick={() => { setBudgetFoldOpen(false); setBudgetChanging(false); }}>done</button></div>
                        {budgetEditorBlock(true)}
                      </div>
                    ) : (
                      <button className="fold-btn" style={{ marginTop: 14 }} onClick={() => setBudgetFoldOpen(true)}>
                        Your budget — {fmt(Number(event.totalBudget))}<span className="chev" aria-hidden="true">›</span>
                      </button>
                    )
                  ) : (
                    /* No host number yet → the editor's PROPOSED state (lead with the grounded
                       number + Use/Change) IS the ask; its own header carries it, no shelf-label. */
                    <div style={{ marginTop: 14 }}>
                      {budgetEditorBlock()}
                    </div>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'guests' && (() => {
              const gcr = (() => { try { return guestCountResolved(event); } catch { return null; } })();
              const band = (() => { try { return attendanceBand(event); } catch { return null; } })();
              const bandLbl = (() => { try { return attendanceBandLabel(band); } catch { return null; } })();
              const quickAdd = (
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>Add names — one per line</div>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 74, resize: 'vertical', fontSize: 'var(--t-input)', fontWeight: 500 }}
                    placeholder={'Denise & Ray\nThe Okafors\nUncle Joe'}
                    value={rosterText} onChange={e => setRosterText(e.target.value)} aria-label="Add guest names" />
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    <button className="cta" disabled={!rosterText.trim()} style={!rosterText.trim() ? { opacity: .45 } : undefined} onClick={addRoster}>Add them</button>
                  </div>
                </div>
              );
              const chase = showsReplyTracking(event); // count-only hosts are never chased
              const plusOnes = (event.guests || []).filter(g => g && g.rsvp === 'Yes' && String(g.plusOne || '').trim()).length;
              const kidsHere = kidsTotal(event.guests);
              // guestMode switch — the ENGINE's own workflow knob (guestPlanningMode
              // reads it): by-list hosts get reply tracking + chasing, by-headcount
              // hosts are never nagged about replies.
              const countingChips = (
                <div id="guests-counting-anchor" className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center', scrollMarginTop: 12 }}>
                  <span className="of">counting:</span>
                  <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={chase}
                    onClick={() => patchEvent({ guestMode: 'list' }, 'By list — replies are tracked and the quiet ones can be nudged.')}>By list</button>
                  <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={event.guestMode === 'count'}
                    onClick={() => patchEvent({ guestMode: 'count' }, 'By headcount — replies are optional and nobody gets chased.')}>By headcount</button>
                </div>
              );
              // CSV import — lib/csvParsers end to end: platform map → validate →
              // preview counts → merge (email-primary, name-fallback). Nothing
              // writes until the host confirms the preview.
              const csvBlock = !csvOpen ? (
                <button className="fold-btn" onClick={() => setCsvOpen(true)}>
                  Import a guest list (CSV)
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              ) : (
                <div className="brow" style={{ marginTop: 14, borderRadius: 'var(--r-md)', padding: '10px var(--sp-2)' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>
                    Where is the list from?
                    <button className="mini" style={{ marginLeft: 'var(--sp-2)' }} onClick={() => { setCsvOpen(false); setCsvPreview(null); }}>close</button>
                  </div>
                  <OptionList ariaLabel="Where the list is from"
                    options={Object.entries(PLATFORMS).map(([key, p]) => ({ label: p.label || key, value: key }))}
                    value={csvPlatform} onPick={(key) => { setCsvPlatform(key); setCsvPreview(null); }} />
                  <div className="actions-row" style={{ marginTop: 10, alignItems: 'center' }}>
                    <input type="file" accept=".csv,text/csv" aria-label="Guest CSV file" style={{ fontSize: 'var(--t-row-sub)', color: 'var(--muted)' }}
                      onChange={e => onCsvFile(e.target.files && e.target.files[0])} />
                  </div>
                  {csvPreview && (
                    <>
                      <p className="grounding" style={{ margin: 'var(--sp-2) 0 0' }}>
                        {csvPreview.mapped.filter(r => r._valid).length} of {csvPreview.mapped.length} rows read cleanly from {csvPreview.fileName} —
                        {' '}{csvPreview.summary.willAdd || 0} new, {csvPreview.summary.willUpdate || 0} already on your list (their replies update).
                        {csvPreview.mapped.some(r => !r._valid) ? ' Rows without a name are skipped.' : ''}
                      </p>
                      <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                        <button className="cta" onClick={applyCsv}>Bring them in</button>
                        <button className="mini" onClick={() => setCsvPreview(null)}>Not this file</button>
                      </div>
                    </>
                  )}
                </div>
              );
              // Past imports — the audit trail lib/importHistory keeps per event.
              // Quiet fold; undo restores the pre-import snapshot wholesale, and
              // the copy says exactly that.
              const pastImports = importBatches.length === 0 ? null : !importsOpen ? (
                <button className="fold-btn" style={{ marginTop: 0 }} onClick={() => setImportsOpen(true)}>
                  Past imports · {importBatches.length}
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              ) : (
                <div className="brow" style={{ marginTop: 14, borderRadius: 'var(--r-md)', padding: '10px var(--sp-2)' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>
                    Past imports
                    <button className="mini" style={{ marginLeft: 'var(--sp-2)' }} onClick={() => setImportsOpen(false)}>close</button>
                  </div>
                  {[...importBatches].reverse().map((b, i) => (
                    <div key={b.id || i} className="v-meta" style={{ padding: '3px 2px' }}>
                      {fmtBatchTs(b.ts)} · {importPlatformLabel(b.platform)} — {b.inserted || 0} added · {b.updated || 0} updated
                      {b.skipped ? ' · ' + b.skipped + ' skipped' : ''}
                      {i === 0 ? <span className="of"> · latest</span> : null}
                    </div>
                  ))}
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    <button className="mini" onClick={undoLastCsvImport}>Undo last import</button>
                    <button className="mini" onClick={clearImportHistory}>Clear import history</button>
                  </div>
                  <p className="grounding" style={{ margin: '6px 0 0' }}>
                    Undo puts the list back the way it was before that import — anything you changed on the list since then goes with it. Only the latest import can be undone.
                    {' '}Each past import keeps a copy of the list as it stood — names, emails, phones — so undo can work. Clearing the history deletes those copies from this device; your guest list stays, but past imports can no longer be undone.
                  </p>
                </div>
              );
              // Guest export — shared serializers, canonical columns, so the
              // file re-imports cleanly as NGW Native. Only offered when there
              // is a real list to download.
              const exportRow = (event.guests || []).length ? (
                <button className="fold-btn" style={{ marginTop: 0 }} onClick={exportGuestsCsv}>
                  Download the guest list (CSV)
                </button>
              ) : null;
              // Guest-list hero (host request, 2026-07-11): the sheet opens on a
              // hero moment — the same eyebrow/mega/mega-sub treatment as the
              // home hero, fed by the SAME resolvers every other surface reads
              // (yes-heads math below, attendanceBand label). No new counting.
              const guestHero = (() => {
                const roster = (event.guests || []).length > 0;
                // SINGLE-SOURCE TURNOUT (2026-07-16, host report "how did we get different
                // numbers"): the count `n` is the FACT; the sub states exactly ONE turnout
                // expectation, never a stack of estimators. Roster → the reply band owns it.
                // Estimate → the host's OWN history (attendanceAdjustment, gated+clamped) wins
                // over the generic band when it applies; otherwise the band. The standalone
                // memory line below is retired so this is the one place turnout is spoken.
                const mem = decisionBoard.headcountMemory;
                let n, sub;
                if (roster) {
                  const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
                  const heads = yes.length + yes.filter(g => String(g.plusOne || '').trim()).length;
                  n = heads;
                  const tail = bandLbl ? ' — likely ' + bandLbl + ' on the day' : '';
                  sub = !chase
                    ? 'on the list — counted, never chased'
                    // FIX (host report): "said yes" must track the uncheck — never claim yeses
                    // when the count is 0.
                    : yes.length === 0
                      ? (gcr && gcr.pending > 0
                        ? 'no yes replies yet · ' + gcr.pending + (gcr.pending === 1 ? ' hasn’t answered' : ' haven’t answered')
                        : 'no yes replies yet — everyone’s answered')
                      : (gcr && gcr.pending > 0
                        ? 'said yes so far · ' + gcr.pending + (gcr.pending === 1 ? ' hasn’t answered' : ' haven’t answered') + tail
                        : 'said yes — the list has settled' + (bandLbl ? ' · likely ' + bandLbl + ' on the day' : ''));
                } else {
                  n = Number(guests) || 0;
                  sub = n > 0
                    ? (mem
                      ? 'planned around · your last events suggest about ' + mem.suggested + ' show up'
                      : 'planned around' + (bandLbl ? ' · sized for ' + bandLbl + ' on the day' : ''))
                    : 'no names yet — start with the ones you’d text first';
                }
                return (
                  <div style={{ padding: '2px 2px var(--sp-3)' }}>
                    {/* Port — composes the parity kit like the other sheet heroes. */}
                    <Eyebrow>Your people</Eyebrow>
                    <BigValue style={{ fontVariantNumeric: 'tabular-nums' }}>{n > 0 ? n : '—'}</BigValue>
                    <GuideLine>{sub}</GuideLine>
                  </div>
                );
              })();
              // WAVE-B: invite rules — the SAME event fields the public RSVP page
              // already enforces (InviteV2: plusOnePolicy/kidsPolicy/collectAddresses)
              // and the invite + guest brief drafts read (giftWish). V2 hosts could
              // never set them. Values match the reads exactly; tapping an active
              // chip clears back to unset, and unset means the invite stays quiet.
              const inviteRules = (() => {
                const chipSm = { padding: '5px 11px', fontSize: 'var(--t-pill)' };
                if (!inviteRulesOpen) {
                  return (
                    <button className="fold-btn" onClick={() => setInviteRulesOpen(true)}>
                      Invite rules — plus-ones, kids, addresses, gifts
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                  );
                }
                const gw = (event.giftWish && typeof event.giftWish === 'object') ? event.giftWish : {};
                const GIFTS = [
                  ['no_gifts', 'No gifts'], ['registry', 'Registry'], ['charity', 'A donation'],
                  ['potluck', 'Potluck'], ['contribution', 'Chip in'],
                ];
                const GIFT_TOAST = {
                  no_gifts: '“Your presence is the gift” goes on the invite.',
                  registry: 'Registry noted — paste the link below so guests can find it.',
                  charity: 'Donation wish noted — name the cause below.',
                  potluck: 'Potluck — the guest brief asks everyone to bring a dish.',
                  contribution: 'Chip-in noted — put the per-person amount below.',
                };
                const GIFT_DETAIL = { registry: 'Paste the registry link', charity: 'Cause name or link', potluck: 'Dish assignments — optional', contribution: '$ per person' };
                return (
                  <div className="brow" style={{ marginTop: 14, borderRadius: 'var(--r-md)', padding: '10px var(--sp-2)' }}>
                    <div className="shelf-label" style={{ marginBottom: 6 }}>
                      Invite rules — the RSVP page follows these
                      <button className="mini" style={{ marginLeft: 'var(--sp-2)' }} onClick={() => setInviteRulesOpen(false)}>close</button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 var(--sp-2)', alignItems: 'center' }}>
                      <span className="of">plus-ones:</span>
                      <button className="chip" style={chipSm} aria-pressed={event.plusOnePolicy === 'plus_one_ok'}
                        onClick={() => patchEvent({ plusOnePolicy: event.plusOnePolicy === 'plus_one_ok' ? null : 'plus_one_ok' },
                          event.plusOnePolicy === 'plus_one_ok' ? 'Unset — the invite stays quiet on plus-ones.' : 'Plus-ones welcome — the invite says so, and the RSVP page asks who they’re bringing.')}>Welcome</button>
                      <button className="chip" style={chipSm} aria-pressed={event.plusOnePolicy === 'no_plus_ones'}
                        onClick={() => patchEvent({ plusOnePolicy: event.plusOnePolicy === 'no_plus_ones' ? null : 'no_plus_ones' },
                          event.plusOnePolicy === 'no_plus_ones' ? 'Unset — the RSVP page offers a plus-one again.' : 'Named guests only — the RSVP page won’t offer a plus-one.')}>Named guests only</button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 var(--sp-2)', alignItems: 'center' }}>
                      <span className="of">kids:</span>
                      <button className="chip" style={chipSm} aria-pressed={event.kidsPolicy === 'kids_welcome'}
                        onClick={() => patchEvent({ kidsPolicy: event.kidsPolicy === 'kids_welcome' ? null : 'kids_welcome' },
                          event.kidsPolicy === 'kids_welcome' ? 'Unset — the invite stays quiet on kids.' : 'Kids welcome — the invite says so.')}>Welcome</button>
                      <button className="chip" style={chipSm} aria-pressed={event.kidsPolicy === 'adults_only'}
                        onClick={() => patchEvent({ kidsPolicy: event.kidsPolicy === 'adults_only' ? null : 'adults_only' },
                          event.kidsPolicy === 'adults_only' ? 'Unset — the RSVP page asks about kids again.' : 'Adults-only — the RSVP page won’t ask about kids.')}>Adults only</button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 var(--sp-2)', alignItems: 'center' }}>
                      <span className="of">addresses:</span>
                      <button className="chip" style={chipSm} aria-pressed={!!event.collectAddresses}
                        onClick={() => patchEvent({ collectAddresses: !event.collectAddresses },
                          !event.collectAddresses ? 'Yeses now get an optional mailing-address ask — framed as for thank-yous, never required.' : 'Address question removed from the RSVP page.')}>
                        {event.collectAddresses ? 'Collecting for thank-you mail' : 'collect for thank-you mail?'}
                      </button>
                    </div>
                    {/* Fold-behind-Change (parity/MANIFEST) — one settled gift wish;
                        the 5-chip grid folds to a hairline row, opens on tap. */}
                    {(() => {
                      const curGift = GIFTS.find(([m]) => m === gw.mode);
                      const giftLabel = gw.mode ? (curGift ? curGift[1] : gw.mode) : 'none';
                      if (!settledOpen.gifts) {
                        return <SettledRow label="Gifts" value={giftLabel} tone={gw.mode ? 'ok' : 'default'} style={{ margin: '0 0 var(--sp-1)' }}
                          onOpen={() => setSettledOpen(m => ({ ...m, gifts: true }))} />;
                      }
                      return (
                        <>
                          <div className="of" style={{ display: 'block', margin: '0 0 6px' }}>gifts</div>
                          <OptionList ariaLabel="Gifts" style={{ margin: '0 0 var(--sp-1)' }}
                            options={GIFTS.map(([mode, label]) => ({ label, value: mode }))}
                            value={gw.mode || ''}
                            onPick={(mode) => { patchEvent({ giftWish: { mode, detail: gw.mode === mode ? (gw.detail || '') : '' } }, GIFT_TOAST[mode]); setSettledOpen(m => ({ ...m, gifts: false })); }} />
                        </>
                      );
                    })()}
                    {gw.mode && gw.mode !== 'no_gifts' && (
                      <input className="field" style={{ maxWidth: 'none', fontSize: 'var(--t-input)', margin: 'var(--sp-1) 0 6px' }}
                        placeholder={GIFT_DETAIL[gw.mode] || ''} value={gw.detail || ''}
                        onChange={e => patchEvent({ giftWish: { mode: gw.mode, detail: e.target.value } }, null)}
                        aria-label="Gift note detail" />
                    )}
                    <p className="grounding" style={{ margin: 'var(--sp-1) 0 0' }}>Leave anything unset and the invite simply won’t mention it.</p>
                  </div>
                );
              })();
              return (event.guests || []).length ? (
                <>
                  {guestHero}
                  {(plusOnes > 0 || kidsHere > 0) && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      {[plusOnes ? '+' + plusOnes + ' plus-one' + (plusOnes === 1 ? '' : 's') : null, kidsHere ? kidsHere + ' kid' + (kidsHere === 1 ? '' : 's') + ' — food sizes them lighter' : null].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {!chase && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      You went by headcount — replies here are just for tracking, no chasing.
                    </div>
                  )}
                  {/* One-line reply-by + edit hint — the count itself lives in the
                      hero above (audit S3: was a third restatement of "N yes of M"). */}
                  <div className="v-meta" style={{ padding: '2px 2px var(--sp-3)' }}>
                    {(() => {
                      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
                      const heads = yes.length + yes.filter(g => String(g.plusOne || '').trim()).length;
                      const parts = [];
                      if (heads !== yes.length) parts.push(`${heads} heads with plus-ones`);
                      // I FIXED THE GUEST AND LEFT THE HOST (2026-07-14, same day). dc5abee gated
                      // the INVITE on `source === 'override'` so a guest could never be shown a
                      // deadline the host hadn't chosen — and this line, forty rows away, kept
                      // printing the very same invented `event.date − 7d` to the HOST as a flat
                      // fact ("replies by Jul 20"), sitting beside real RSVP counts, with a
                      // "change" button implying a date already existed. Half a fix is its own
                      // kind of lie: the host would have believed a deadline was set and never
                      // opened the editor to set one.
                      if (rsvpByIsSet && !isPast) parts.push(`replies by ${new Date(rsvpBy.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
                      return parts.join(' · ');
                    })()}
                    {!isPast && (
                      <button className="mini" style={{ marginLeft: 6 }} onClick={() => setDeadlineOpen(o => !o)}>{deadlineOpen ? 'done' : (rsvpByIsSet ? 'change' : 'set reply-by')}</button>
                    )}
                    {(() => {
                      // leading separator only when something precedes the hint
                      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
                      const heads = yes.length + yes.filter(g => String(g.plusOne || '').trim()).length;
                      const hasPre = (heads !== yes.length) || (rsvpBy && rsvpBy.iso && !isPast) || !isPast;
                      return hasPre ? ' — tap a tag to change an RSVP, a name to edit.' : 'Tap a tag to change an RSVP, a name to edit.';
                    })()}
                  </div>
                  {deadlineOpen && (() => {
                    // DO-IT-FOR-ME, GROUNDED (2026-07-14). The reply-by date used to be an
                    // invented `event.date − 7d` that the INVITE printed as if the host had
                    // chosen it. Deleting it from the invite was only half an answer: an RSVP
                    // deadline genuinely helps, because the whole point of a reply is to LOCK
                    // THE COUNT, and the count has real downstream walls.
                    //
                    // So the app proposes, SHOWS ITS WORK, and the host owns the result. The
                    // proposal is derived from the things that actually cannot proceed without
                    // a headcount — each real vendor's own count promise (catering wants it 7
                    // days out, staffing 14, a florist 21) and the playbook's own
                    // count-dependent tasks (a crab pre-order is T-5d) — plus the days needed
                    // to chase whoever hasn't answered.
                    //
                    // Nothing is written until the host taps. Until then `rsvpDeadline` is
                    // unset, `rsvpDeadlineFor` reports source:'derived', and the invite stays
                    // silent — it will only ever speak a date the host actually committed to.
                    const prop = (() => { try { return proposeReplyBy(event); } catch (_e) { return null; } })();
                    const already = String(event.rsvpDeadline || '').trim();
                    return (
                      <div style={{ margin: '0 0 10px' }}>
                        <div className="actions-row" style={{ alignItems: 'center' }}>
                          <span className="of">replies by:</span>
                          <input className="field" style={{ maxWidth: 175, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} type="date"
                            value={already || ''}
                            onChange={e => patchEvent({ rsvpDeadline: e.target.value }, 'Reply-by date set — your invite and the nudges read it.')}
                            aria-label="RSVP deadline" />
                          {prop && prop.iso && already !== prop.iso && (
                            <button className="mini" onClick={() => patchEvent({ rsvpDeadline: prop.iso },
                              'Reply-by date set — your invite says it now.')}>
                              {already ? 'use ours' : 'pick one for me'}
                            </button>
                          )}
                        </div>
                        {prop && (
                          <p className="grounding" style={{ margin: '6px 2px 0' }}>
                            {prop.tooClose
                              ? prop.why
                              : <>
                                  {!already && <><b>{new Date(prop.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</b>{' — '}</>}
                                  {prop.why}
                                </>}
                          </p>
                        )}
                        {!already && (
                          <p className="grounding" style={{ margin: '4px 2px 0', opacity: .8 }}>
                            Your invite won’t show a reply-by date until you set one — we won’t put a deadline in your name that you didn’t choose.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Invite tools + settings relocated BELOW the roster (audit S3:
                      the roster is the reason the sheet exists — it now comes right
                      after the hero, not behind a wall of share/look/rules chips). */}
                  {/* Turnout is now stated ONCE in guestHero (single-source, memory-preferred over
                      the generic band) — the standalone memory line was the 2nd/3rd competing
                      number the host flagged. Retired here on purpose. */}
                  {nudgeFor('guests')}
                  {(() => {
                    // Grouped roster: when the host has sorted people into groups,
                    // the list reads by group; indexes stay the ORIGINAL array
                    // positions (every writer here is index-based).
                    // Render the FULL roster (per-screen audit: a prior .slice(0,60)
                    // silently hid guests 61+ while the hero counts still included
                    // them — they were uneditable). Rows are lightweight (text + two
                    // buttons, index-keyed); a plain full render handles realistic
                    // host lists without virtualization.
                    const withIdx = (event.guests || []).map((g, i) => ({ g, i }));
                    // Lightweight visual layer (per-screen audit: Guests scored lowest,
                    // no glanceability vs Partiful's avatars). Deterministic initials +
                    // a MUTED on-brand tint (not a rainbow — respects the colour budget);
                    // no photo pipeline, keeping the structural-data advantage.
                    // AVA_TINTS now shared from eventPool (audit Cr1).
                    const avaFor = (nm) => { const s = String(nm || ''); let h = 0; for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0; return AVA_TINTS[h % AVA_TINTS.length]; };
                    const initialsOf = (nm) => { const p = String(nm || '').trim().split(/\s+/).filter(Boolean); if (!p.length) return '?'; return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
                    const row = ({ g, i }) => (
                      <div key={i}>
                        <div className="grow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                          <span className="gav" aria-hidden="true" style={{ background: avaFor(g.name) }}>{initialsOf(g.name)}</span>
                          <button style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0, display: 'block' }}
                            onClick={() => setGuestOpen(guestOpen === i ? null : i)}>
                            {/* Mobile fit (393px stage): name owns line 1 (nowrap +
                                ellipsis so it never breaks mid-word); the meta — kids,
                                meal, the nowrap needs-tag — drops to a wrapping line 2.
                                One inline run made the tag fight the name for the row's
                                width and overflow the sheet (min-width:auto held it wide). */}
                            <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {g.name || 'Guest ' + (i + 1)}
                              {String(g.plusOne || '').trim() ? <span className="of"> +1 {g.plusOne}</span> : null}
                            </span>
                            {/* Audit #8: meal shown on the collapsed row (short form) so
                                the whole roster's meals read at a glance, not one-by-one. */}
                            {(Number(g.kids) > 0 || (String(g.meal || '').trim() && g.meal !== '—') || String(g.needs || '').trim()) ? (
                              <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {Number(g.kids) > 0 ? <span className="of">{g.kids} kid{Number(g.kids) === 1 ? '' : 's'}</span> : null}
                                {String(g.meal || '').trim() && g.meal !== '—' ? <span className="of">{MEAL_SHORT[g.meal] || g.meal}</span> : null}
                                {/* WAVE-5 (UX_02 amber budget): a guest's needs note identifies
                                    the guest, it doesn't warn about a gap — neutral .tag.plan,
                                    same treatment as the RSVP tag on this row. */}
                                {String(g.needs || '').trim() ? <span className="tag plan">{g.needs}</span> : null}
                              </span>
                            ) : null}
                          </button>
                          {/* Inline RSVP picker (audit 2026-07-22) — was a blind tap-to-cycle
                              ('' → Yes → No → Maybe); now tap the reply to open a picker and
                              set it directly, the same pattern as the meal chip below. */}
                          {rsvpPickFor === i ? (
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', justifyContent: 'flex-end' }} role="group" aria-label={'RSVP for ' + (g.name || 'guest')}>
                              {[['Yes', 'Yes'], ['No', 'No'], ['Maybe', 'Maybe'], ['', 'no reply']].map(([v, lbl]) => {
                                const cur = String(g.rsvp || '') === v;
                                return (
                                  <button key={v || 'none'} className="chip" aria-pressed={cur}
                                    style={{ padding: '4px 9px', fontSize: 'var(--t-pill)', ...(cur ? { background: 'var(--steel-tint)', color: 'var(--steel-soft)', fontWeight: 700 } : { opacity: .82 }) }}
                                    onClick={() => setRsvpValue(i, v)}>{lbl}</button>
                                );
                              })}
                            </span>
                          ) : (
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              aria-haspopup="true" aria-label={'RSVP for ' + (g.name || 'guest') + ': ' + (g.rsvp || 'no reply') + ' — tap to change'}
                              onClick={() => setRsvpPickFor(i)}>
                              {/* UX_02: a Maybe is UNKNOWN → steel; amber is needs-attention only. */}
                              <span className={'tag plan'} style={g.rsvp === 'Yes' ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : g.rsvp === 'Maybe' ? { color: 'var(--steel-soft)', background: 'var(--steel-tint)' } : g.rsvp === 'No' ? { color: 'var(--danger)', background: 'var(--danger-tint)', textDecoration: 'line-through' } : { color: 'var(--muted)' }}>{g.rsvp === 'No' ? 'No' : (g.rsvp || 'no reply')}</span>
                            </button>
                          )}
                        </div>
                        {guestOpen === i && (
                          <div className="brow" style={{ margin: '2px 0 var(--sp-2)', padding: 'var(--sp-2) 6px' }}>
                            {(() => {
                              // Single source of truth: reads the SAME aggregation the
                              // Helpers panel (space sheet) uses — a food/task/setup/supply
                              // owner that resolved to THIS guest, not a second copy.
                              const roles = (() => { try { return guestHelperRoles(event, g.id); } catch { return []; } })();
                              if (!roles.length) return null;
                              return (
                                <div className="v-meta" style={{ margin: '0 0 var(--sp-2)', color: 'var(--ink-soft)' }}>
                                  Helping with: {roles.map(r => r.label).join(', ')}
                                </div>
                              );
                            })()}
                            <div className="actions-row" style={{ alignItems: 'center' }}>
                              <span className="of">kids:</span>
                              <button className="mini" onClick={() => writeGuest(i, { kids: Math.max(0, (Number(g.kids) || 0) - 1) }, null)}>−</button>
                              <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{Number(g.kids) || 0}</span>
                              <button className="mini" onClick={() => writeGuest(i, { kids: (Number(g.kids) || 0) + 1 }, (Number(g.kids) || 0) + 1 + ' kids with ' + (g.name || 'this guest') + ' — the food plan sizes them lighter.')}>+</button>
                              <input className="field" style={{ maxWidth: 125, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="+1 name"
                                value={g.plusOne || ''} onChange={e => writeGuest(i, { plusOne: e.target.value }, null)} aria-label="Plus one name" />
                              <input className="field" style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="needs? (vegan, nut…)"
                                value={g.needs || ''} onChange={e => writeGuest(i, { needs: e.target.value }, null)} aria-label="Dietary needs" />
                              <button className="mini" onClick={() => removeGuest(i)}>remove</button>
                            </div>
                            <div className="actions-row" style={{ marginTop: 'var(--sp-2)', alignItems: 'center' }}>
                              {/* Meal edit (guests parity gap #5): writes the SAME
                                  guest.meal field the RSVP page and CSV import write.
                                  Audit #6 — was tap-to-cycle (couldn't jump to a choice
                                  or see the set); now the chip opens an inline PICKER of
                                  the real meal choices, tap one to set it directly. */}
                              <span className="of">meal:</span>
                              {mealPickFor === i ? (
                                <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }} role="group" aria-label={'Meal for ' + (g.name || 'guest')}>
                                  {['—', 'Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'].map(m => {
                                    const cur = String(g.meal || '—') === m;
                                    return (
                                      <button key={m} className="chip" aria-pressed={cur}
                                        style={{ padding: '5px 11px', fontSize: 'var(--t-pill)', ...(cur ? { background: 'var(--steel-tint)', color: 'var(--steel-soft)', fontWeight: 700 } : { opacity: .82 }) }}
                                        onClick={() => {
                                          writeGuest(i, { meal: m }, m === '—'
                                            ? (g.name || 'Guest') + '’s meal cleared — counts as unanswered.'
                                            : (g.name || 'Guest') + ' → ' + m + ' — the meal tally keeps count.');
                                          setMealPickFor(null);
                                        }}>{m === '—' ? 'not answered' : m}</button>
                                    );
                                  })}
                                </span>
                              ) : (
                                <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }}
                                  aria-haspopup="true" aria-expanded={false}
                                  aria-label={'Meal for ' + (g.name || 'guest') + ': ' + (String(g.meal || '—') === '—' ? 'not answered' : g.meal) + ' — tap to change'}
                                  onClick={() => setMealPickFor(i)}>{String(g.meal || '—') === '—' ? 'not answered' : g.meal}</button>
                              )}
                              <input className="field" style={{ maxWidth: 140, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="phone" type="tel"
                                value={g.phone || ''} onChange={e => writeGuest(i, { phone: formatPhoneUS(e.target.value) }, null)} aria-label="Phone" />
                              <input className="field" style={{ maxWidth: 185, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="email" type="email"
                                value={g.email || ''} onChange={e => writeGuest(i, { email: e.target.value }, null)} aria-label="Email" aria-invalid={isMalformedEmail(g.email)} />
                              <input className="field" style={{ maxWidth: 120, fontSize: 'var(--t-input)', padding: 'var(--field-compact)' }} placeholder="group" list="v2-groups"
                                value={g.group || ''} onChange={e => writeGuest(i, { group: e.target.value }, null)} aria-label="Group" />
                            </div>
                            {chase && !g.rsvp && (String(g.phone || '').trim() || String(g.email || '').trim()) && (() => {
                              // PER-GUEST chase — the engine's nudge (with the real
                              // RSVP link) straight to THIS person's phone or inbox.
                              // Links only (UX_07): the OS's own composer opens with
                              // the draft in it; nothing here claims to have sent.
                              const d = draftRsvpChase(event, profile, { rsvpUrl: inviteLinkUrl() });
                              const body = [d.subject, d.body].filter(Boolean).join('\n\n');
                              const first = String(g.name || 'them').split(/\s+/)[0];
                              const digits = String(g.phone || '').replace(/[^+\d]/g, ''); // sms:/tel: want digits, not "(919) 555-…"
                              return (
                                <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                                  {digits && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + digits + '?&body=' + encodeURIComponent(body)}>Text {first} the nudge</a>}
                                  {String(g.email || '').trim() && <a className="mini" style={{ textDecoration: 'none' }} href={'mailto:' + encodeURIComponent(g.email.trim()) + '?subject=' + encodeURIComponent(d.subject || 'Can you make it?') + '&body=' + encodeURIComponent(d.body || body)}>Email {first}</a>}
                                  {digits && <a className="mini" style={{ textDecoration: 'none' }} href={'tel:' + digits}>Call {first}</a>}
                                </div>
                              );
                            })()}
                            {(String(g.phone || '').trim() || String(g.email || '').trim()) && !(chase && !g.rsvp) && (() => {
                              // QUIET CONTACT LINE (host-approved 2026-07-15) — when a
                              // guest left a number or email, reaching them is one tap
                              // through the phone's own apps (tel:/sms:/mailto:, UX_07 —
                              // the OS sends, we never claim to). Silent guests in chase
                              // mode get the nudge row above instead, never both.
                              const first = String(g.name || 'them').split(/\s+/)[0];
                              const digits = String(g.phone || '').replace(/[^+\d]/g, '');
                              return (
                                <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                                  {digits && <a className="mini" style={{ textDecoration: 'none' }} href={'tel:' + digits}>Call {first}</a>}
                                  {digits && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + digits}>Text {first}</a>}
                                  {String(g.email || '').trim() && <a className="mini" style={{ textDecoration: 'none' }} href={'mailto:' + encodeURIComponent(g.email.trim())}>Email {first}</a>}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                    const names = [...new Set(withIdx.map(x => String(x.g.group || '').trim()).filter(Boolean))];
                    if (names.length <= 1) return withIdx.map(row);
                    const buckets = [...names, ''].map(gr => ({ gr, items: withIdx.filter(x => String(x.g.group || '').trim() === gr) })).filter(b => b.items.length);
                    return buckets.map(b => (
                      <div key={b.gr || 'ungrouped'}>
                        <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 var(--sp-2)' }}>{b.gr || 'Everyone else'} · {b.items.length}</div>
                        {b.items.map(row)}
                      </div>
                    ));
                  })()}
                  <datalist id="v2-groups">
                    <option value="Family" /><option value="Friends" /><option value="Work" /><option value="Neighbors" />
                  </datalist>
                  {/* ADD A GUEST sits FIRST below the roster — it is the primary action on
                      this sheet. Burying it under the share/look/rules stack made "add who's
                      coming" feel like a dead end (host 2026-07-22). */}
                  {quickAdd}
                  {/* Share & invite settings — relocated here from above the roster
                      (audit S3: list-first). The roster now sits right under the hero;
                      sharing + look/artwork/rules/counting live below it. */}
                  <div id="guests-invites-anchor" className="shelf-label" style={{ margin: 'var(--sp-6) 0 var(--sp-2)', scrollMarginTop: 12 }}>Share &amp; invite</div>
                  {/* Balanced 2-up button grid (systematic .pill-grid). */}
                  <div className="pill-grid" style={{ margin: '0 0 var(--sp-3)' }}>
                    <button className="mini" onClick={shareInviteLink}>Share the RSVP link</button>
                    <button className="mini" onClick={showQr}>Show the QR</button>
                    {/* Preview the guest-facing RSVP page (host request 2026-07-16) — opens the
                        exact ?rsvp= URL guests land on, in a new tab, so the host can see what
                        they'll see before sharing. Read-only: viewing the page files nothing. */}
                    <button className="mini" onClick={() => { try { window.open(inviteLinkUrl(), '_blank', 'noopener'); } catch {} }}>Preview the RSVP</button>
                    <button className="mini" onClick={() => openDraft('Your invite', draftInvite(event, profile, { rsvpUrl: inviteLinkUrl() }))}>Copy the invite</button>
                    {/* WAVE-B: the full guest brief — legacy's draftGuestBrief
                        (when/where/parking/bring/dress/gifts), DRAFT-only per
                        UX_07: written for the host, sent by the host. */}
                    <button className="mini" onClick={() => { try { openDraft('The guest brief', draftGuestBrief(event, profile, { rsvpUrl: inviteLinkUrl() })); } catch { toast('Couldn’t draft it.'); } }}>Draft the guest brief</button>
                    <button className="mini" onClick={() => { try { openDraft('Update to everyone', draftGuestUpdate(event, {})); } catch { toast('Couldn’t draft it.'); } }}>Update everyone</button>
                    {/* WAS "Nudge the quiet ones" — which promises the app will go and nudge
                        them. It cannot: this bulk draft has no recipient list, and its only
                        exits are share/copy (its sms: link has no number to address). The
                        SHEET is scrupulously honest about this — it never fakes a "sent"
                        state — so the LABEL was the only thing lying. UX_07: a CTA says
                        exactly what happens when you tap it. This one opens a written message
                        for the host to send themselves. (Guests who DID leave a phone or
                        email get one-tap text/email nudge links on their own rows above.) */}
                    {showsReplyTracking(event) && <button className="mini" onClick={() => openDraft('The RSVP nudge', draftRsvpChase(event, profile, { rsvpUrl: inviteLinkUrl() }))}>Write a nudge to send</button>}
                  </div>
                  {/* ONE quiet line, only when chasing is on, someone is silent, and not a
                      single silent guest left a way to reach them — pointing at where a
                      number or email gets captured. Never a per-row nag (restraint). */}
                  {(() => {
                    if (!chase) return null;
                    const silent = (event.guests || []).filter(g => g && !g.rsvp);
                    if (!silent.length) return null;
                    if (silent.some(g => String(g.phone || '').trim() || String(g.email || '').trim())) return null;
                    return (
                      <p className="grounding" style={{ margin: '0 0 var(--sp-3)' }}>
                        None of the quiet ones left a phone or email — add one on a guest’s row and a one-tap text or email nudge appears right there.
                      </p>
                    );
                  })()}
                  {/* Invite look — the tone engine guesses from the event's mood
                      (paper by day, elegant by night, muted when somber); the
                      host's word always wins (lib/inviteTone). */}
                  {/* Label on its own line + a 3-col grid so the three looks read as
                      an even segmented control instead of a 2+1 ragged wrap. */}
                  {/* Fold-behind-Change (parity/MANIFEST) — one settled look; folds
                      to a hairline row, opens the 3-up segmented control on tap. */}
                  {(() => {
                    const styles = [['', 'Match the event'], ['bright', 'Bright paper'], ['elegant', 'Elegant dark']];
                    const cur = event.inviteStyle || '';
                    const curLabel = (styles.find(([v]) => v === cur) || styles[0])[1];
                    if (!settledOpen.inviteStyle) {
                      return <SettledRow label="Invite look" value={curLabel} style={{ margin: '0 0 10px' }}
                        onOpen={() => setSettledOpen(m => ({ ...m, inviteStyle: true }))} />;
                    }
                    return (
                      <>
                        <div className="of" style={{ display: 'block', margin: '0 0 6px' }}>invite look</div>
                        <OptionList ariaLabel="Invite look" style={{ margin: '0 0 10px' }}
                          options={styles.map(([val, label]) => ({ label, value: val }))}
                          value={cur}
                          onPick={(val) => { const label = (styles.find(([v]) => v === val) || styles[0])[1]; patchEvent({ inviteStyle: val }, val ? 'Invite set to ' + label.toLowerCase() + ' — the link updates instantly.' : 'The invite matches the event’s mood again.'); setSettledOpen(m => ({ ...m, inviteStyle: false })); }} />
                      </>
                    );
                  })()}
                  {/* Crest choice — only offered when this event HAS registered
                      artwork (never a toggle that does nothing). The host's
                      call: artwork on the invite, or purely typographic. */}
                  {eventArtworkFile(event) && (
                    <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                      <span className="of">artwork:</span>
                      <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={event.inviteCrest !== 'off'}
                        onClick={() => patchEvent({ inviteCrest: '' }, 'The artwork is on the invite.')}>On the invite</button>
                      <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={event.inviteCrest === 'off'}
                        onClick={() => patchEvent({ inviteCrest: 'off' }, 'Words only — the invite stays purely typographic.')}>Words only</button>
                    </div>
                  )}
                  {inviteRules}
                  {countingChips}
                  {csvBlock}
                  {pastImports}
                  {exportRow}
                </>
              ) : (
                <>
                  {guestHero}
                  <div className="v-meta" style={{ padding: '2px 2px var(--sp-1)' }}>
                    No list yet{guests ? ' — you’re planning around ' + guests + ' for now' : ''}. A real list is what unlocks RSVPs, the confirmed count, and the caterer check.
                  </div>
                  <div id="guests-entry-anchor" style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', margin: '0 0 10px', scrollMarginTop: 12 }}>
                    <button className="mini" onClick={() => { setGuestDraft(''); setGuests(Math.max(1, (Number(guests) || 0) - 1)); }} aria-label="Fewer guests">−</button>
                    <input className="field" style={{ width: 72, textAlign: 'center', fontSize: 'var(--t-input)', padding: 'var(--sp-2) 6px' }}
                      type="number" inputMode="numeric" min="1"
                      value={guestDraft !== '' ? guestDraft : (Number(guests) || '')}
                      onFocus={() => setGuestDraft(String(Number(guests) || ''))}
                      onChange={e => setGuestDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { const n = parseInt(guestDraft, 10); if (n > 0) setGuests(n); setGuestDraft(''); }
                        else if (e.key === 'Escape') setGuestDraft('');
                      }}
                      onBlur={() => { const n = parseInt(guestDraft, 10); if (n > 0) setGuests(n); setGuestDraft(''); }}
                      aria-label="Exact guest count" />
                    <button className="mini" onClick={() => { setGuestDraft(''); setGuests((Number(guests) || 0) + 1); }} aria-label="More guests">+</button>
                    <span className="of">guests</span>
                  </div>
                  {/* KIDS-INVISIBLE FIX: by-headcount hosts (no roster to sum
                      kids from — writeGuest's kidsTotal() bridge only runs
                      once names exist) had NO way to tell the app how many
                      of the count are kids, so the food/protein engine always
                      saw zero and sized for full adults. Legacy already has
                      this exact stepper (App.js ~32283, "Of your N, how many
                      are kids / light eaters?") wired straight to
                      event.kidsCount, which lib/playbooks/index.js's
                      proteinGuests already reads — same field, same engine,
                      V2 just never collected it in this mode. */}
                  {Number(guests) > 0 && (() => {
                    const kids = Math.max(0, Math.min(Number(guests) || 0, Math.round(Number(event.kidsCount) || 0)));
                    const setK = (v) => patchEvent({ kidsCount: Math.max(0, Math.min(Number(guests) || 0, Math.round(Number(v) || 0))) },
                      'Of your ' + guests + ', ' + Math.max(0, Math.min(Number(guests) || 0, Math.round(Number(v) || 0))) + ' are kids — food sizes them lighter.');
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: '0 0 10px' }}>
                        <button className="mini" onClick={() => setK(kids - 1)} aria-label="Fewer kids or light eaters">−</button>
                        <span className="step-val" style={{ minWidth: 20 }}>{kids}</span>
                        <button className="mini" onClick={() => setK(kids + 1)} aria-label="More kids or light eaters">+</button>
                        <span className="of">of your {guests} are kids / light eaters</span>
                      </div>
                    );
                  })()}
                  <div id="guests-invites-anchor" className="actions-row" style={{ margin: '0 0 var(--sp-1)', scrollMarginTop: 12 }}>
                    <button className="mini" onClick={shareInviteLink}>Share the RSVP link</button>
                    <button className="mini" onClick={showQr}>Show the QR</button>
                    {/* Preview the guest-facing RSVP page (host request 2026-07-16) — opens the
                        exact ?rsvp= URL guests land on, in a new tab, so the host can see what
                        they'll see before sharing. Read-only: viewing the page files nothing. */}
                    <button className="mini" onClick={() => { try { window.open(inviteLinkUrl(), '_blank', 'noopener'); } catch {} }}>Preview the RSVP</button>
                  </div>
                  <p className="grounding" style={{ margin: '0 0 6px' }}>Guests who open the link reply themselves — names, meals, kids, plus-ones — and the list builds on its own.</p>
                  {inviteRules}
                  {nudgeFor('guests') || nudgeFor('message')}
                  {countingChips}
                  {/* Turnout is now stated ONCE in guestHero (single-source, memory-preferred over
                      the generic band) — the standalone memory line was the 2nd/3rd competing
                      number the host flagged. Retired here on purpose. */}
                  {quickAdd}
                  {csvBlock}
                  {pastImports}
                </>
              );
            })()}
          </div>
        </>
      )}

      {spot && <div className="dimveil" onClick={() => { clearTimeout(spotTimer.current); setSpot(null); }} />}

      {/* Raise ladder (audit 2026-07-22, W2): the pill clears what's ACTUALLY pinned
          below it. Elegant retires the dock, and the v2 dock auto-hides — raising to
          the dock-clearing height while no dock shows left the pill floating mid-list
          over content. -mid clears the NEXT bar only; -raised clears the visible dock. */}
      {wxImpact && stage === 'plan' && (
        <div className={'wxpill' + (wxOpen ? ' open' : '') + (!heroInView ? ((elegantMode || dockHidden) ? ' wxpill-mid' : ' wxpill-raised') : '')}>
          <button className="wxpill-head" onClick={() => { setWxOpen(o => !o); feedback('tick'); }} aria-expanded={wxOpen}>
            {/* Real stroke SVG (matches the shared Icon component's style) — was a
                ☂ text dingbat, which the no-emoji doctrine bans in UI. aria-hidden;
                the wx-line text carries the meaning. */}
            <span className="wx-glyph" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M7 16.5a4.5 4.5 0 0 1-.5-8.97 5 5 0 0 1 9.8-1.2A3.75 3.75 0 0 1 17 16.5Z" />
                <path d="M8.5 19l-1 2M12 19l-1 2M15.5 19l-1 2" />
              </svg>
            </span>
            <span className="wx-line">
              {/* The sample marker rides the COLLAPSED line — the only line most
                  hosts read. A forecast claim may never outrun its source. */}
              {wxOpen ? 'Weather on your day' : (wx._sample ? 'Sample forecast · ' : '') + rainAwareSummary(wxImpact.headline, rainPlanStatus(event).hasPlan)}
            </span>
            <span className="chev" aria-hidden="true" style={{ position: 'static' }}>{wxOpen ? '▾' : '›'}</span>
          </button>
          {wxOpen && (
            <div className="wx-body">
              <p className="wx-headline">{(wx._sample ? 'Sample forecast · ' : '') + rainAwareSummary(wxImpact.headline, rainPlanStatus(event).hasPlan)}</p>
              {wx.rainWindow && <p className="grounding" style={{ margin: 'var(--sp-1) 0 0' }}>Rain looks most likely {wx.rainWindow.label} — {wx._sample ? 'sample timing for this preview, not a live read' : wxImpact.confidence === 'hourly' ? 'from the hour-by-hour read' : 'timing is a day-level read'}.</p>}
              {/* WEATHER-IMPACT-1 (queue item 4): the engine's per-phase rows,
                  not a hand-built summary — each names its own moment. */}
              {(wxImpact.affectedPhases || []).slice(0, 3).map(ph => (
                <p key={ph.phase || ph.label} className="grounding" style={{ margin: '6px 0 0' }}>
                  <strong style={{ color: 'var(--ink-soft)' }}>{ph.label || ph.phase}</strong>{ph.summary ? ' — ' + ph.summary : ''}
                </p>
              ))}
              <div className="actions-row" style={{ marginTop: 10 }}>
                {/* CTAs follow the ENGINE's prompts, not a local guess */}
                {(wxImpact.shouldPromptRainPlan || !rainPlanStatus(event).hasPlan) && (
                  <button className="cta" onClick={() => { setWxOpen(false); setSheet({ kind: 'rain' }); }}>
                    {rainPlanStatus(event).hasPlan ? 'Review the backup' : 'Add a rain backup'}
                  </button>
                )}
                {!wxImpact.shouldPromptRainPlan && rainPlanStatus(event).hasPlan && (
                  <button className="cta" onClick={() => { setWxOpen(false); setSheet({ kind: 'rain' }); }}>Review the backup</button>
                )}
                {(wxImpact.shouldPromptGuestUpdate || rainPlanStatus(event).hasPlan) && (
                  <button className="mini" onClick={() => { setWxOpen(false); try { openDraft('Rain note to guests', guestRainMessage(event, wx)); } catch { toast('Couldn’t draft the note.'); } }}>
                    {wxImpact.shouldPromptGuestUpdate ? 'Draft guest note' : 'Guest note'}
                  </button>
                )}
                {/* The engine's parking phase carries its own CTA + route — render it
                    (the panel used to NAME "Parking & arrival" with no way to act;
                    audit 2026-07-22 residual). Lands on the Space sheet's parking row
                    with the note editor open, via the resolver's place-note branch. */}
                {(() => {
                  const pk = (wxImpact.affectedPhases || []).find(ph => ph && ph.route && ph.route.focusField === 'parking-notes');
                  if (!pk) return null;
                  return (
                    <button className="mini" onClick={() => { setWxOpen(false); if (!routeSheet(pk.route)) setSheet({ kind: 'space', focus: 'parking' }); }}>
                      {String(event.parkingNotes || '').trim() ? 'Parking note' : 'Add a parking note'}
                    </button>
                  );
                })()}
              </div>
              {wx._sample
                ? <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Sample forecast for this preview — live weather turns on with the API key.</p>
                : <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Live forecast for {event.venueCity || event.venue}.</p>}
            </div>
          )}
        </div>
      )}

      {/* PERSISTENT NEXT ACTION (host request 2026-07-16): the primary "what needs you"
          CTA is pinned to the frame bottom at all times on the Plan surface — it no longer
          scrolls away with the hero. Taps straight through to the first queued action (the
          same onCta path the named card uses), or scrolls to the full list when calm. */}
      {stage === 'plan' && !heroInView && (
        <button
          className={'next-bar' + ((queue.length === 0 || listIsCalm) ? ' allset' : '')}
          /* The bar's title ellipsizes on long asks — the full text must survive
             somewhere reachable (audit cleanup 2026-07-22: truncation-without-title). */
          title={days === 0 ? 'Run the day' : (listIsCalm ? 'All quiet' : String(queue[0].title || ''))}
          onClick={() => {
            if (days === 0) { setStage('day'); return; }
            if (queue.length && !listIsCalm) { try { heroZoneRef.current && heroZoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* no hero zone */ } return; }
            document.getElementById('actionsAnchor')?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label="Next thing that needs you"
        >
          <span className="nb-label">Next</span>
          <span className="nb-title">{days === 0 ? 'Run the day' : (listIsCalm ? 'All quiet' : String(queue[0].title || '').replace(/\.+$/, ''))}</span>
          {days !== 0 && !listIsCalm && queue.length > 1 && (
            <span className="nb-more" title={(queue.length - 1) + ' more after this'}>+{queue.length - 1}</span>
          )}
          <span className="nb-chev" aria-hidden="true">›</span>
        </button>
      )}

      <nav className={'dock' + (dockHidden ? ' dock-hidden' : '') + (stage === 'plan' && !heroInView ? ' has-next-bar' : '') + (elegantMode ? ' dock-retired' : '')} aria-label="Sections">
        {/* No attention badge here by design: the dock is navigation, not an inbox — ledger counts (raiseCounts) surface on the qidx rows instead. */}
        <button aria-current={stage === 'create'} onClick={() => setStage('create')}>Create</button>
        <button aria-current={stage === 'plan'} onClick={() => setStage('plan')}>Plan</button>
        <button aria-current={stage === 'day'} onClick={() => setStage('day')}>The Day</button>
        <button aria-current={stage === 'after'} onClick={() => setStage('after')}>After</button>
      </nav>

      {paletteOpen && (() => {
        const q = paletteQ.trim().toLowerCase();
        const seen = new Set();
        const evList = [...REAL_EVENTS, ...hydratedEvents, ...ROSTER, ...customs].filter(e => e && e.id && !seen.has(e.id) && seen.add(e.id));
        const events = evList.map(e => ({
          kind: 'event', id: e.id,
          label: e.name || e.type || 'Event',
          sub: [eventTypeLabel(e), e.venue].filter(Boolean).join(' · '),
          run: () => { switchEvent(e.id); setPaletteOpen(false); },
        }));
        const dRaw = [
          { label: 'Ask the Boss', sub: 'a question, answered from your plan', go: () => { setAskQ(''); setAskResult(null); setAskLLM(null); setSheet({ kind: 'ask' }); } },
          { label: 'Plan', sub: 'the command board', go: () => setStage('plan') },
          { label: 'The Day', sub: 'day-of run of show', go: () => setStage('day') },
          { label: 'After', sub: 'wrap-up & thank-yous', go: () => setStage('after') },
          { label: 'New event', sub: 'start another', go: () => setStage('create') },
          { label: 'Your money', sub: 'budget', go: () => setSheet({ kind: 'budget' }) },
          { label: 'The spread & shopping', sub: 'food', go: () => setSheet({ kind: 'food' }) },
          { label: 'People you’re hiring', sub: 'vendors', go: () => setSheet({ kind: 'vendors' }) },
          { label: 'Who sits where', sub: 'seating', go: () => setSheet({ kind: 'seating' }) },
          { label: 'Guest list', sub: 'guests & RSVPs', go: () => setSheet({ kind: 'guests' }) },
          { label: 'Your checklist', sub: 'tasks', go: () => setSheet({ kind: 'tasks' }) },
          { label: 'Calls to make', sub: 'decisions', go: () => setSheet({ kind: 'decisions' }) },
          { label: 'What could go wrong', sub: 'risks', go: () => setSheet({ kind: 'risks' }) },
          { label: 'Make it yours', sub: 'the meaning', go: () => setSheet({ kind: 'meaning' }) },
          { label: 'You & your account', sub: 'settings', go: () => setSheet({ kind: 'settings' }) },
        ];
        const dests = dRaw.map(d => ({ kind: 'go', label: d.label, sub: d.sub, run: () => { d.go(); setPaletteOpen(false); } }));
        const match = (it) => !q || (it.label + ' ' + (it.sub || '')).toLowerCase().includes(q);
        const results = [...events, ...dests].filter(match).slice(0, 40);
        return (
          <div className="palette-scrim" onMouseDown={() => setPaletteOpen(false)}>
            <div className="palette" role="dialog" aria-modal="true" aria-label="Jump to" onMouseDown={e => e.stopPropagation()}>
              <input ref={paletteInputRef} className="palette-input" placeholder="Find food, vendors, seating, checklist, an event…" value={paletteQ}
                onChange={e => setPaletteQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && results[0]) { e.preventDefault(); results[0].run(); } }}
                aria-label="Search events and destinations" />
              <div className="palette-list">
                {results.length === 0
                  ? <div className="palette-empty">Nothing matches “{paletteQ}”.</div>
                  : results.map((it, i) => (
                    <button key={it.kind + '-' + (it.id || it.label) + i} className="palette-row" onClick={it.run}>
                      <span className="palette-kind">{it.kind === 'event' ? 'Event' : 'Go'}</span>
                      <span className="palette-main"><span className="palette-label">{it.label}</span>{it.sub ? <span className="palette-sub">{it.sub}</span> : null}</span>
                    </button>
                  ))}
              </div>
              {/* touch-truthful (was keyboard-only "Enter…/Esc…" on a touch-first palette) */}
              <div className="palette-hint">Tap a result to jump there</div>
            </div>
          </div>
        );
      })()}
      {toastMsg && (
        <div className={'toast on' + (toastTone === 'ok' ? ' ok' : '')} role="status" aria-live="polite">
          {toastMsg}
          {toastAction && (
            <button className="toast-undo" onClick={() => {
              const fn = toastAction.fn;
              setToastMsg(null); setToastAction(null); setToastTone(null); clearTimeout(toastTimer.current);
              if (fn) fn();
            }}>{toastAction.label || 'Undo'}</button>
          )}
        </div>
      )}

      {/* Print-only day sheet — a paper cue sheet a helper can hold (window.print
          from The Day). Same effectiveRos truth, nothing screen-only. */}
      {ros.length > 0 && (
        <div className="printsheet" aria-hidden="true">
          <h1>{event.name}</h1>
          <p className="p-sub">
            {event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            {event.venue ? ` · ${event.venue}` : ''}{event.venueCity ? `, ${event.venueCity}` : ''}
            {event.rainPlan ? ` · If it rains: ${event.rainPlan}` : ''}
          </p>
          <div className="p-head">Run of show</div>
          {ros.map((r, i) => (
            <div className="p-row" key={r.id || i}>
              <span className="p-time">{r.time || (r.rel ? '·' : '—')}</span>
              <span>
                {r.segment}
                <span className="p-meta">
                  {[r.location, r.owner && ('owner: ' + r.owner), r.vendorName, r.notes].filter(Boolean).map(x => ' · ' + x).join('')}
                </span>
              </span>
            </div>
          ))}
          {dayHelpers.length > 0 && (
            <>
              <div className="p-head">Who’s helping</div>
              {dayHelpers.map((h, i) => (
                <div className="p-row" key={i}>
                  <span className="p-time">{h.time || ''}</span>
                  <span>{h.name}<span className="p-meta">{h.role ? ' · ' + h.role : ''}</span></span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Boot splash overlay — last child so it paints over dock/toast/sheet */}
      {splashEl}
    </div>
  );
}
