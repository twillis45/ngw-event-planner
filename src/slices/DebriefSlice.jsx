// DebriefSlice — Sprint 12 operational-memory proving ground.
//
// Doctrine: page 11_Archived_Explorations + the System Map's CONCEPT
// classification for operational memory. The archive is an INSTRUMENT for
// the NEXT event, not a museum.
//
// Four surfaces, each grounded in Studio Matte restraint:
//   1) Event timeline   — escalation/recovery chronology (forensic, no chart-junk)
//   2) Friction review  — hesitation distribution from observer transcript
//   3) Whisper system   — quiet operational memory ("AV required emergency last event")
//   4) Recovery         — decompression quality (time-to-resolve, no celebration)
//
// Source of truth: window.__ngwSession (populated when ?observe=1 is active in
// another tab on a slice). If no transcript is found, we render a doctrine-correct
// synthesized sample so the surface remains readable.
//
// Forbidden: analytics dashboards, AI-insights theater, KPI tiles, productivity
// scoring, gamified history, "recently viewed" sidebars.
//
// Reached via index.js ?slice=debrief. Additive. App.js untouched.

import { useMemo } from 'react';
import {
  Surface, Text, EscalationBadge,
  color, space, type,
} from '../design';

// ─── Synthesized fallback transcript ────────────────────────────────────────
// Doctrine-shaped: every entry is forensic (timestamp, event-of-the-world).
// Used when no observer session exists. Never marketed as "real" data —
// labelled SYNTHESIZED in the header.
const SYNTHESIZED = {
  eventName: 'Hartwell Wedding',
  eventDate: 'Sat · 14:00 · Bluebell Manor',
  modeTimeline: [
    { t: '13:45:12', mode: 'nominal' },
    { t: '14:02:18', mode: 'escalation', label: 'Catering · 25 min behind' },
    { t: '14:14:33', mode: 'escalation', label: 'Floral · 12 min behind' },
    { t: '14:21:09', mode: 'critical',   label: 'AV non-responsive — 18 min, no contact' },
    { t: '14:23:51', mode: 'emergency',  label: 'AV — direct action required' },
    { t: '14:27:04', mode: 'critical',   label: 'AV — backup activated' },
    { t: '14:34:18', mode: 'escalation', label: 'AV — confirmed restored' },
    { t: '14:41:02', mode: 'nominal',    label: 'All clear — resolution logged' },
  ],
  clicks: [
    { t: '14:02:24', action: 'Check ETA',           hesitationMs:  6120, severity: 'escalation' },
    { t: '14:14:48', action: 'Notify next station', hesitationMs:  4810, severity: 'escalation' },
    { t: '14:21:22', action: 'Call lead directly',  hesitationMs:  2940, severity: 'critical' },
    { t: '14:24:11', action: 'CONTACT NOW',         hesitationMs:   880, severity: 'emergency' },
    { t: '14:27:04', action: 'Move to backup',      hesitationMs:  1430, severity: 'critical' },
    { t: '14:41:02', action: 'Mark resolved',       hesitationMs:  2200, severity: 'recovery' },
  ],
};

// Try to parse the observer transcript if installed; otherwise fall back.
function loadTranscript() {
  if (typeof window === 'undefined') return { source: 'synth', data: SYNTHESIZED };
  const arr = window.__ngwSession;
  if (!Array.isArray(arr) || arr.length === 0) return { source: 'synth', data: SYNTHESIZED };
  // Light shaping — keep forensic detail; drop nothing.
  return { source: 'observer', data: { eventName: 'Live session', eventDate: '—', modeTimeline: [], clicks: [], raw: arr } };
}

// ─── 1. Event Timeline ──────────────────────────────────────────────────────
function EventTimeline({ timeline }) {
  return (
    <Surface role="card" pad={5} rad="md" style={{ minWidth: 0 }}>
      <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[3] }}>
        EVENT TIMELINE
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
        {timeline.length === 0 && (
          <Text variant="secondary" color={color.text.tertiary}>No mode transitions captured in this session.</Text>
        )}
        {timeline.map((row, i) => {
          const sev = row.mode;
          const dot = sev === 'emergency' ? color.status.riskBright
                     : sev === 'critical' ? color.status.risk
                     : sev === 'escalation' ? color.status.warning
                     : color.status.confirmed;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '88px 12px 1fr', gap: space[3], alignItems: 'baseline' }}>
              <Text variant="caption" color={color.text.tertiary} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{row.t}</Text>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, alignSelf: 'center' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: space[3], minWidth: 0 }}>
                <Text variant="bodyStrong" as="span" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: type.size.sm }}
                  color={sev === 'nominal' ? color.text.tertiary : color.text.primary}>
                  {sev}
                </Text>
                {row.label && (
                  <Text variant="secondary" color={color.text.secondary} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.label}
                  </Text>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

// ─── 2. Friction Review ─────────────────────────────────────────────────────
// Histogram of hesitation per click. Forensic — no scoring, no grade, no AI.
function FrictionReview({ clicks }) {
  // Worst-case scaling so bars are readable but never theatrical.
  const max = Math.max(1, ...clicks.map((c) => c.hesitationMs || 0));
  return (
    <Surface role="card" pad={5} rad="md" style={{ minWidth: 0 }}>
      <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[3] }}>
        FRICTION REVIEW
      </Text>
      <Text variant="secondary" color={color.text.tertiary} as="div" style={{ marginBottom: space[4] }}>
        Hesitation per action · over 3 s is worth investigating.
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
        {clicks.length === 0 && (
          <Text variant="secondary" color={color.text.tertiary}>No clicks recorded in this session.</Text>
        )}
        {clicks.map((c, i) => {
          const ms = c.hesitationMs || 0;
          const pct = Math.max(2, Math.round((ms / max) * 100));
          const warn = ms > 3000;
          const barColor = warn ? color.status.warning : color.text.tertiary;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '88px 1fr 88px', gap: space[3], alignItems: 'center' }}>
              <Text variant="caption" color={color.text.tertiary} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{c.t}</Text>
              <div style={{ position: 'relative' }}>
                <div style={{ height: 6, background: color.surface.subtle || 'rgba(255,255,255,0.04)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 0, left: 0, height: 6, width: `${pct}%`, background: barColor, borderRadius: 2 }} />
                <Text variant="caption" color={color.text.secondary} as="div" style={{ marginTop: space[1] }}>
                  {c.action}
                </Text>
              </div>
              <Text variant="bodyStrong" color={warn ? color.status.warningText : color.text.secondary}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textAlign: 'right' }}>
                {ms} ms
              </Text>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

// ─── 3. Whisper System ──────────────────────────────────────────────────────
// Operational memory surfaced as quiet single-line statements.
// Bad pattern (refused): "AI recommends…", "Optimization insight…", scores.
// Good pattern: factual recall that would change the next decision.
function Whispers({ data }) {
  // Derive whispers from the timeline. Only fire if there's something worth remembering.
  const whispers = useMemo(() => {
    const out = [];
    const tl = data.modeTimeline || [];
    const emergencyEntries = tl.filter((r) => r.mode === 'emergency');
    if (emergencyEntries.length > 0) {
      // Find dominant vendor from emergency labels.
      const labels = emergencyEntries.map((r) => r.label || '').join(' ');
      const m = labels.match(/^(\w[\w\s&]+?) — /);
      const subject = m ? m[1].trim() : 'A vendor';
      out.push(`${subject} required emergency escalation at the prior event.`);
    }
    const escEntries = tl.filter((r) => r.mode === 'escalation' || r.mode === 'critical');
    if (escEntries.length >= 3) {
      out.push(`Three concurrent escalations during this event · risk elevated.`);
    }
    // Recovery latency: time between first escalation and final nominal.
    const firstEsc = tl.find((r) => r.mode !== 'nominal');
    const finalNominal = [...tl].reverse().find((r) => r.mode === 'nominal');
    if (firstEsc && finalNominal && firstEsc.t && finalNominal.t) {
      out.push(`Recovery took ${minutesBetween(firstEsc.t, finalNominal.t)} from first deviation to all clear.`);
    }
    // Hesitation-derived whisper (only forensic).
    const slow = (data.clicks || []).filter((c) => (c.hesitationMs || 0) > 3000);
    if (slow.length > 0) {
      const actions = slow.map((c) => c.action).join(', ');
      out.push(`Operator hesitated > 3 s before: ${actions}.`);
    }
    return out;
  }, [data]);

  return (
    <Surface role="card" pad={5} rad="md" style={{ minWidth: 0 }}>
      <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[3] }}>
        WHISPERS — prior patterns
      </Text>
      <Text variant="secondary" color={color.text.tertiary} as="div" style={{ marginBottom: space[4] }}>
        Quiet recall. Surfaces only when the next decision could be different.
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
        {whispers.length === 0 && (
          <Text variant="secondary" color={color.text.tertiary}>Nothing worth remembering from this session.</Text>
        )}
        {whispers.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: space[3], alignItems: 'baseline' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: color.text.tertiary, flexShrink: 0, alignSelf: 'center' }} />
            <Text variant="body" color={color.text.primary} as="div">{w}</Text>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function minutesBetween(t1, t2) {
  try {
    const toSec = (t) => {
      const [h, m, s] = t.split(':').map(parseFloat);
      return h * 3600 + m * 60 + s;
    };
    const diff = Math.max(0, Math.round(toSec(t2) - toSec(t1)));
    const mm = Math.floor(diff / 60); const ss = diff % 60;
    return mm > 0 ? `${mm} min ${ss}s` : `${ss}s`;
  } catch (_) { return 'an unknown interval'; }
}

// ─── 4. Recovery Analysis ───────────────────────────────────────────────────
// Decompression quality. NO celebration. NO score. Just the shape of the curve.
function RecoveryAnalysis({ timeline }) {
  const emergencyAt = timeline.find((r) => r.mode === 'emergency');
  const allClear = [...timeline].reverse().find((r) => r.mode === 'nominal' && r !== timeline[0]);
  const recovered = emergencyAt && allClear ? minutesBetween(emergencyAt.t, allClear.t) : null;

  return (
    <Surface role="card" pad={5} rad="md" style={{ minWidth: 0 }}>
      <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[3] }}>
        RECOVERY
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
        <Text variant="secondary" color={color.text.tertiary}>
          Time from peak severity back to nominal.
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: space[4], alignItems: 'baseline' }}>
          <Text variant="bodyStrong" color={color.text.primary}>Peak severity reached</Text>
          <Text variant="body" color={color.text.secondary}>{emergencyAt ? `EMERGENCY @ ${emergencyAt.t}` : 'No emergency this session'}</Text>

          <Text variant="bodyStrong" color={color.text.primary}>All-clear reached</Text>
          <Text variant="body" color={color.text.secondary}>{allClear ? allClear.t : 'Session did not return to nominal'}</Text>

          <Text variant="bodyStrong" color={color.text.primary}>Time from peak → nominal</Text>
          <Text variant="body" color={recovered ? color.status.confirmed : color.text.tertiary}>
            {recovered || '—'}
          </Text>
        </div>
        <Text variant="caption" color={color.text.tertiary}>
          No score. No celebration. The interval is the instrument.
        </Text>
      </div>
    </Surface>
  );
}

// ─── Workflow ──────────────────────────────────────────────────────────────
function Workflow() {
  const { source, data } = useMemo(loadTranscript, []);
  const isWide = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const isLarge = typeof window !== 'undefined' && window.innerWidth >= 1280;

  const grid = isLarge
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: space[5], padding: space[5], alignItems: 'stretch', boxSizing: 'border-box' }
    : isWide
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: space[4], padding: space[5], alignItems: 'stretch', boxSizing: 'border-box' }
    : { display: 'flex', flexDirection: 'column', gap: space[4], padding: space[5], boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: color.surface.canvas, color: color.text.primary, fontFamily: type.family }}>
      {/* Header — debrief surface is operational, not analytical. */}
      <div style={{
        padding: `${space[5]}px ${space[5]}px`,
        borderBottom: `1px solid ${color.border.subtle}`,
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: space[3],
      }}>
        <div>
          <Text variant="label" color={color.text.tertiary}>POST-EVENT DEBRIEF</Text>
          <Text variant="title" as="div" style={{ marginTop: space[2] }}>{data.eventName}</Text>
          <Text variant="secondary" color={color.text.secondary} as="div" style={{ marginTop: space[1] }}>{data.eventDate}</Text>
        </div>
        <EscalationBadge status={source === 'observer' ? 'confirmed' : 'neutral'}>
          {source === 'observer' ? 'LIVE TRANSCRIPT' : 'EXAMPLE — observer not active'}
        </EscalationBadge>
      </div>

      <div style={grid}>
        <EventTimeline timeline={data.modeTimeline || []} />
        <FrictionReview clicks={data.clicks || []} />
        <Whispers data={data} />
        <RecoveryAnalysis timeline={data.modeTimeline || []} />
      </div>

      {/* Footer — explicit doctrine note so the surface is never mistaken for analytics. */}
      <div style={{ padding: `${space[3]}px ${space[5]}px ${space[6]}px`, opacity: 0.6 }}>
        <Text variant="caption" color={color.text.tertiary}>
          Forensic, not analytical. No score, no grade, no AI recommendation. Memory exists to change the next decision.
        </Text>
      </div>
    </div>
  );
}

export default function DebriefSlice() {
  return <Workflow />;
}
