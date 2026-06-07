// OrchestrationSlice — Sprint 38 Human Trust + Orientation Validation
//
// Psychological trust formation and orientation confidence.
// Builds on Sprint 37 alpha readiness with five orientation refinements:
// - Sequence progress indicator (X/Y count + slim progress bar)
// - Mobile sticky context header (mode + event name when scrolled)
// - Trust compression clarity ("+ N confirmed" ghosted vendor count)
// - Disruption indicator geometry stability (reserved layout space)
// - Tab-return attention re-anchor (brief flash on active items)
//
// Reachable via: http://localhost:3000/?slice=orchestration
//   URL params:
//     &sim=wedding|gala|fashion  — scenario selection
//     &debug=1                   — start with debug overlay visible
//     &observe=1                 — start with observation recording

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Surface, Text,
  color, space, type, radius,
} from '../design';
import { EscalationProvider } from '../contexts/EscalationContext';
import { DensityProvider } from '../contexts/DensityContext';
import { OperationalModeProvider } from '../contexts/OperationalModeContext';
import { OrchestrationProvider, useOrchestration } from '../contexts/OrchestrationContext';
import { resolveSequenceHierarchy } from '../orchestration/adaptiveHierarchy';
import { resolveVendorCompression, COMPRESSION_LEVEL } from '../orchestration/trustCompression';
import { aggregateMemories } from '../orchestration/environmentalMemory';
import { resolveSequenceTunneling } from '../orchestration/cognitiveTunneling';
import { buildDependencyChain, resolveFieldEffects } from '../orchestration/continuityField';
import {
  SCENARIOS, SCENARIO_LIST,
  totalTicks, getPhaseAt,
  resolveSequenceAt, resolveVendorsAt, resolveInputsAt,
} from '../orchestration/simulationScenarios';
import {
  startObservation, stopObservation, exportSession, clearSession,
  isObserving, recordPhaseChange,
} from '../orchestration/observationKit';

// ─── Constants ──────────────────────────────────────────────────────────

const SPEEDS = [
  { label: '1×', ms: 2000 },
  { label: '2×', ms: 1000 },
  { label: '4×', ms: 500 },
];

// ─── Border color resolution ────────────────────────────────────────────

function borderColorFor(intent) {
  switch (intent) {
    case 'fragile': return color.status.risk || '#E84036';
    case 'urgent':  return '#b8943f';
    case 'caution': return 'rgba(184, 148, 63, 0.25)';
    case 'active':  return color.border.strong;
    default:        return 'transparent';
  }
}

// ─── Viewport hook ──────────────────────────────────────────────────────

function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

// ─── Sequence Item ──────────────────────────────────────────────────────

function SequenceItem({ item, memory, fieldEffect, vendors, reEntry }) {
  const [tapped, setTapped] = useState(false);
  const h = item.hierarchy || {};
  const t = item.tunneling || {};
  const borderC = borderColorFor(h.borderIntent);
  const memBorderC = memory?.isFragile ? borderColorFor('fragile') : null;

  // Continuity field: use borderTint (more perceptible) instead of just background
  const field = fieldEffect?.treatment || {};
  const contaminationBg = field.backgroundShift || null;
  const contaminationBorder = field.borderTint || null;

  const effectiveBorder = memBorderC || (h.borderWidth > 0 ? borderC : 'transparent');
  const effectiveBorderWidth = memory?.isFragile ? 3 : (h.borderWidth || 0);

  // Sprint 40A: re-entry continuity anchor — structural emphasis on focal/adjacent items on return.
  // Active items get amber border (Sprint 38 behavior preserved).
  // Focal items get lighter presence proportional to hierarchy weight.
  // Scales with absence duration so a 45s interruption feels different from a 3s one.
  const isFocalOrAdjacent = t.zone === 'focal' || t.zone === 'adjacent';
  const flashActive = reEntry?.active && item.isActive;
  const reEntryEmphasis = reEntry?.active && isFocalOrAdjacent && !item.isActive
    ? Math.min(0.55, (h.weight || 0.4) * (reEntry.intensity || 0.6))
    : 0;

  const vendorName = vendors.find(v => v.id === item.vendorId)?.name || '';

  const handleTap = () => {
    setTapped(true);
    setTimeout(() => setTapped(false), 380);
  };

  return (
    <div
      data-obs={`seq-${item.id}`}
      onClick={handleTap}
      style={{
        opacity: t.opacity ?? h.opacity ?? 1,
        pointerEvents: t.pointerEvents || 'auto',
        transition: `opacity ${t.transitionMs || 1200}ms ease`,
        marginBottom: h.spacingPx ?? space[3],
        cursor: 'default',
      }}
    >
      <Surface role="card" pad={4} rad="md" style={{
        // Always render a 2px border (transparent when inactive) so CSS can interpolate
        // border-color smoothly. Without this, going from borderLeft:undefined → 2px solid color
        // is a sudden appearance — the transition property only works when the border already exists.
        borderLeft: flashActive
          ? '2px solid rgba(184, 148, 63, 0.85)'
          : reEntryEmphasis > 0
          ? `2px solid rgba(184, 148, 63, ${reEntryEmphasis.toFixed(2)})`
          : effectiveBorderWidth > 0
          ? `2px solid ${effectiveBorder}`
          : contaminationBorder
            ? `2px solid ${contaminationBorder}`
            : '2px solid transparent',
        // Sprint 40C: brief background pulse on tap — tactile affordance confirming interactivity.
        // Sprint 40D: raised from 4.5% to 8% — 4.5% was below perceptibility threshold on dark mobile screens.
        // Onset instant (no transition), release slow (400ms). Not a feature — just presence confirmation.
        background: tapped
          ? 'rgba(255, 255, 255, 0.08)'
          : contaminationBg
          ? `linear-gradient(135deg, ${contaminationBg}, transparent)`
          : undefined,
        transition: tapped
          ? 'border-color 2000ms ease'
          : 'border-color 2000ms ease, background 400ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: item.isFragile ? (color.status.risk || '#E84036')
              : item.isActive ? '#b8943f'
              : item.isCompleted ? color.text.disabled
              : color.status.confirmed,
            transition: 'background 800ms ease',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyStrong" as="div" style={{
              fontWeight: h.fontWeight || 400,
              color: field.textTint || undefined,
              transition: 'color 1200ms ease',
            }}>
              {item.label}
            </Text>
            <Text variant="secondary" as="div" color={color.text.secondary} style={{ fontSize: 12 }}>
              {vendorName}
              {memory?.bufferMinutes > 0 && (
                <span style={{ color: color.text.tertiary }}> · +{memory.bufferMinutes}min</span>
              )}
            </Text>
          </div>
          <Text variant="caption" as="span" color={color.text.tertiary} style={{
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}>
            {item.isCompleted ? '✓' : `${item.minutesToDeadline}m`}
          </Text>
        </div>
      </Surface>
    </div>
  );
}

// ─── Vendor Row ─────────────────────────────────────────────────────────

function VendorRow({ vendor }) {
  const c = vendor.compression || {};
  const level = c.level || COMPRESSION_LEVEL.FULL;
  const dotColor = vendor.status === 'nominal' || vendor.status === 'confirmed'
    ? color.status.confirmed
    : vendor.status === 'escalated' ? (color.status.risk || '#E84036')
    : color.status.warning;

  if (level === COMPRESSION_LEVEL.GHOSTED) {
    return (
      <div data-obs={`vendor-${vendor.id}`} style={{
        display: 'flex', alignItems: 'center', gap: space[2],
        padding: `${space[1]}px 0`,
        opacity: c.opacity ?? 0.15,
        transition: 'opacity 2000ms ease',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0, transition: 'background 800ms ease' }} />
        <Text variant="caption" as="span" color={color.text.disabled} style={{ fontSize: type.size.xs || 10 }}>
          {vendor.name.split(' ')[0]}
        </Text>
      </div>
    );
  }

  if (level === COMPRESSION_LEVEL.COLLAPSED) {
    return (
      <div data-obs={`vendor-${vendor.id}`} style={{
        display: 'flex', alignItems: 'center', gap: space[2],
        padding: `${space[2]}px 0`,
        opacity: c.opacity ?? 0.55,
        transition: 'opacity 2000ms ease',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, transition: 'background 800ms ease' }} />
        <Text variant="secondary" as="span" color={color.text.tertiary} style={{ fontSize: type.size.sm }}>
          {vendor.name.split(' ')[0]}
        </Text>
      </div>
    );
  }

  // FULL or COMPACT — Sprint 37: transition duration 2000ms (was 1200ms)
  return (
    <Surface role="card" pad={level === COMPRESSION_LEVEL.COMPACT ? 3 : 4} rad="md" style={{
      opacity: c.opacity ?? 1,
      transition: 'opacity 2000ms ease',
      marginBottom: space[2],
    }} data-obs={`vendor-${vendor.id}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, transition: 'background 800ms ease' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyStrong" as="div">{vendor.name}</Text>
          {c.showDetails && (
            <Text variant="secondary" as="div" color={color.text.tertiary} style={{
              marginTop: space[1],
              transition: 'opacity 2000ms ease',
            }}>
              {vendor.eventsCompleted} events · {vendor.status === 'nominal' || vendor.status === 'confirmed' ? 'confirmed' : vendor.status}
            </Text>
          )}
        </div>
      </div>
    </Surface>
  );
}

// ─── Debug Overlay ──────────────────────────────────────────────────────
// Hidden by default. Toggle with Ctrl+D or ?debug=1 URL param.
// Shows orchestration internals for formula tuning during testing.

// ─── Behavioral Observatory ─────────────────────────────────────────────
// Internal-only. Gated by ?debug=1. Never visible in production.
// Purpose: inspect whether orchestration-state transitions feel geological
// (continuous, metabolized) or like UI state switches.
//
// Seven observability targets:
//   1. Pressure evolution — geological continuity assessment
//   2. Transition continuity — zone-change timing and abruptness
//   3. Hierarchy weights — per-item weight + zone delta
//   4. Tunneling map — focal/adjacent/peripheral/ghosted counts
//   5. Continuity field — active contamination levels
//   6. Environmental memory — residue and decay state
//   7. Viewport — mobile/tablet/desktop behavioral context

const SPARK_CHARS = '▁▂▃▄▅▆▇█';
const W_BAR = ['░░░░', '▒░░░', '▒▒░░', '▓▒▒░', '████'];
const wBar = w => W_BAR[Math.min(4, Math.floor(w * 4.99))];

function BehavioralObservatory({
  pressure, state, phaseInfo, tick, maxTick,
  sequenceItems, fieldEffects, itemMemories, observing, reEntry,
}) {
  // ── Rolling pressure history (35-tick window) ──────────────────────
  const pressureHistory = useRef([]);
  const prevZoneMap = useRef({});
  const vp = typeof window !== 'undefined'
    ? { w: window.innerWidth, h: window.innerHeight }
    : { w: 0, h: 0 };

  // Append current pressure on each tick advance
  useEffect(() => {
    pressureHistory.current = [...pressureHistory.current.slice(-34), pressure];
  }, [tick]); // eslint-disable-line

  // ── Build current zone map — compare to previous tick's zones ──────
  const currentZoneMap = {};
  sequenceItems.forEach(item => {
    currentZoneMap[item.id] = item.tunneling?.zone || 'focal';
  });
  const zoneChanges = sequenceItems
    .filter(item => {
      const prev = prevZoneMap.current[item.id];
      return prev && prev !== currentZoneMap[item.id];
    })
    .map(item => ({
      label: item.label.slice(0, 13),
      from: prevZoneMap.current[item.id].slice(0, 3),
      to: currentZoneMap[item.id].slice(0, 3),
    }));

  useEffect(() => {
    prevZoneMap.current = { ...currentZoneMap };
  }, [tick]); // eslint-disable-line

  // ── Geological continuity assessment ───────────────────────────────
  const history = pressureHistory.current;
  const deltas = history.slice(1).map((p, i) => Math.abs(p - history[i]));
  const maxDelta = deltas.length ? Math.max(...deltas) : 0;
  const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const geoLabel = maxDelta < 0.06 ? 'GEOLOGICAL'
    : maxDelta < 0.14 ? 'TRANSITIONING'
    : 'ABRUPT';
  const geoColor = maxDelta < 0.06 ? '#3d8060'
    : maxDelta < 0.14 ? '#b8943f'
    : '#E84036';

  // ── Sparkline ───────────────────────────────────────────────────────
  const sparkline = history.map(p => SPARK_CHARS[Math.min(7, Math.floor(p * 8))]).join('');

  // ── Tunneling zone counts + timing ─────────────────────────────────
  const zoneCounts = { focal: 0, adjacent: 0, peripheral: 0, ghosted: 0 };
  sequenceItems.forEach(item => {
    const z = item.tunneling?.zone;
    if (z && zoneCounts[z] !== undefined) zoneCounts[z]++;
  });
  const tunnelingMs = sequenceItems.find(i => i.tunneling?.transitionMs)?.tunneling?.transitionMs || 600;

  // ── Active continuity fields (contamination > 0.03) ─────────────────
  const activeFields = sequenceItems
    .map(item => ({ label: item.label.slice(0, 14), fe: fieldEffects?.[item.id] }))
    .filter(({ fe }) => fe && fe.totalContamination > 0.03)
    .sort((a, b) => b.fe.totalContamination - a.fe.totalContamination);

  // ── Memory residue ──────────────────────────────────────────────────
  const memItems = sequenceItems
    .filter(item => itemMemories?.[item.id]?.memoryCount > 0)
    .map(item => ({ ...item, mem: itemMemories[item.id] }));

  // ── Styles ──────────────────────────────────────────────────────────
  const mono = { fontFamily: 'monospace', fontSize: 10 };
  const S = {
    root: { position: 'fixed', bottom: 0, right: 0, width: 292,
      maxHeight: 'calc(100vh - 48px)', overflow: 'auto',
      background: 'rgba(3, 4, 5, 0.97)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px 0 0 0', padding: '10px 12px',
      ...mono, color: '#4a6070', zIndex: 9999 },
    hdr: { color: '#7090a8', fontWeight: 600, letterSpacing: '0.10em',
      marginBottom: 8, display: 'flex', justifyContent: 'space-between' },
    sec: { borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 5, marginTop: 6 },
    lbl: { color: '#2c3c48', letterSpacing: '0.10em', marginBottom: 3, fontSize: 9 },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: 1, gap: 4 },
    muted: { color: '#2c3c48' },
    dim: { color: '#3a5060' },
    val: { color: '#607888' },
    focal: { color: '#3d7855' },
    warn: { color: '#b8943f' },
    risk: { color: '#E84036' },
    active: { color: '#b8943f', fontWeight: 600 },
    ghosted: { color: '#202830' },
    name: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 },
  };

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.hdr}>
        <span>OBSERVATORY{observing ? <span style={S.risk}> ● REC</span> : null}</span>
        <span style={S.muted}>{tick}/{maxTick}</span>
      </div>

      {/* 1. Pressure evolution */}
      <div style={S.sec}>
        <div style={S.lbl}>PRESSURE EVOLUTION</div>
        <div style={{ letterSpacing: '-0.5px', color: '#2c4050', marginBottom: 3 }}>{sparkline || '—'}</div>
        <div style={S.row}>
          <span style={{ color: pressure >= 0.6 ? '#b8943f' : pressure >= 0.25 ? '#607888' : '#3d7855' }}>
            {pressure.toFixed(3)} {state}
          </span>
          <span style={{ color: geoColor, letterSpacing: '0.08em', fontSize: 9 }}>{geoLabel}</span>
        </div>
        <div style={{ ...S.row, marginTop: 1 }}>
          <span style={S.muted}>max-Δ {maxDelta.toFixed(3)}</span>
          <span style={S.muted}>avg-Δ {avgDelta.toFixed(3)}</span>
          <span style={S.muted}>{history.length}t</span>
        </div>
      </div>

      {/* 2. Transition continuity */}
      <div style={S.sec}>
        <div style={S.lbl}>TRANSITION CONTINUITY</div>
        <div style={S.row}>
          <span style={S.dim}>recession timing</span>
          <span style={S.val}>{tunnelingMs}ms</span>
        </div>
        <div style={S.row}>
          <span style={S.dim}>zone changes this tick</span>
          <span style={zoneChanges.length > 0 ? S.warn : S.val}>{zoneChanges.length}</span>
        </div>
        {zoneChanges.map((zc, i) => (
          <div key={i} style={{ ...S.muted, paddingLeft: 8, marginBottom: 1 }}>
            {zc.label} {zc.from}→{zc.to}
          </div>
        ))}
      </div>

      {/* 3. Hierarchy weights */}
      <div style={S.sec}>
        <div style={S.lbl}>HIERARCHY WEIGHTS</div>
        {sequenceItems.map(item => {
          const h = item.hierarchy || {};
          const t = item.tunneling || {};
          const w = h.weight || 0;
          const isGhosted = t.zone === 'ghosted';
          const isActive = item.isActive;
          return (
            <div key={item.id} style={{ ...S.row, opacity: isGhosted ? 0.35 : 1, marginBottom: 2 }}>
              <span style={{ ...(isActive ? S.active : isGhosted ? S.ghosted : S.dim), ...S.name }}>
                {item.label.slice(0, 16)}
              </span>
              <span style={{ whiteSpace: 'nowrap', color: '#2c3c48' }}>
                {wBar(w)} <span style={S.dim}>{w.toFixed(2)}</span>{' '}
                <span style={isActive ? S.warn : isGhosted ? S.ghosted : t.zone === 'focal' ? S.focal : S.muted}>
                  {(t.zone || 'foc').slice(0, 3)}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* 4. Tunneling map */}
      <div style={S.sec}>
        <div style={S.lbl}>TUNNELING MAP</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={S.focal}>foc {zoneCounts.focal}</span>
          <span style={S.dim}>adj {zoneCounts.adjacent}</span>
          <span style={S.muted}>per {zoneCounts.peripheral}</span>
          <span style={S.ghosted}>gst {zoneCounts.ghosted}</span>
        </div>
      </div>

      {/* 5. Continuity field contamination */}
      {activeFields.length > 0 && (
        <div style={S.sec}>
          <div style={S.lbl}>FIELD CONTAMINATION ({activeFields.length})</div>
          {activeFields.slice(0, 6).map((f, i) => {
            const lvl = f.fe.treatment.level;
            const c = lvl === 'urgent' ? '#E84036'
              : lvl === 'concerned' ? '#b8943f'
              : lvl === 'warm' ? '#5a7a50'
              : '#2c3c48';
            return (
              <div key={i} style={{ ...S.row, marginBottom: 2 }}>
                <span style={{ ...S.name, color: '#3a5060' }}>{f.label}</span>
                <span style={{ color: c, whiteSpace: 'nowrap' }}>
                  {lvl} {f.fe.totalContamination.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Environmental memory residue */}
      {memItems.length > 0 && (
        <div style={S.sec}>
          <div style={S.lbl}>MEMORY RESIDUE</div>
          {memItems.map(item => {
            const m = item.mem;
            const topMem = m.consequences?.[0];
            const decay = topMem?.decay ?? 1;
            return (
              <div key={item.id} style={{ ...S.row, marginBottom: 2 }}>
                <span style={{ ...S.name, color: m.isFragile ? '#E84036' : '#3a5060' }}>
                  {item.label.slice(0, 14)}
                </span>
                <span style={{ whiteSpace: 'nowrap', color: '#2c3c48' }}>
                  ×{m.memoryCount} {m.isFragile ? <span style={S.risk}>FRAGILE</span> : null}
                  {m.bufferMinutes > 0 ? ` +${m.bufferMinutes}m` : ''}
                  {' '}d:{decay.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Viewport / mobile context */}
      <div style={{ ...S.sec, ...S.muted, fontSize: 9 }}>
        <div style={S.row}>
          <span>{phaseInfo?.phase?.name || 'calm'}</span>
          <span>{vp.w}×{vp.h} {vp.w < 640 ? 'mobile' : vp.w < 1280 ? 'tablet' : 'desktop'}</span>
        </div>
      </div>

      {/* 8. Interruption memory — tracks absence duration + re-entry continuity */}
      <div style={S.sec}>
        <div style={S.lbl}>INTERRUPTION MEMORY</div>
        {reEntry ? (
          <>
            <div style={S.row}>
              <span style={S.dim}>return count</span>
              <span style={S.val}>{reEntry.returnCount}</span>
            </div>
            <div style={S.row}>
              <span style={S.dim}>last absence</span>
              <span style={reEntry.hiddenDuration > 30000 ? S.warn : reEntry.hiddenDuration > 5000 ? S.val : S.focal}>
                {(reEntry.hiddenDuration / 1000).toFixed(1)}s
              </span>
            </div>
            <div style={S.row}>
              <span style={S.dim}>pressure Δ</span>
              <span style={{ color: Math.abs(reEntry.pressureDelta) > 0.15 ? '#b8943f' : '#607888' }}>
                {reEntry.pressureDelta >= 0 ? '+' : ''}{reEntry.pressureDelta.toFixed(2)}
              </span>
            </div>
            <div style={S.row}>
              <span style={S.dim}>re-entry</span>
              <span style={reEntry.active ? S.warn : S.focal}>
                {reEntry.active ? 'anchoring' : 'settled'}
              </span>
            </div>
          </>
        ) : (
          <div style={{ ...S.muted, fontSize: 9, paddingTop: 2 }}>no interruptions yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Simulation Controls ────────────────────────────────────────────────

function SimControls({ scenario, tick, maxTick, playing, speed, onPlayPause, onSpeedChange, onScrub, onScenario, onReset, phaseInfo, compact }) {
  const btnStyle = (active) => ({
    padding: `0 ${space[3]}px`, height: 32,
    fontSize: type.size.sm, borderRadius: radius.sm,
    border: `1px solid ${active ? color.border.strong : color.border.subtle}`,
    background: active ? color.surface.card : 'transparent',
    color: active ? color.text.primary : color.text.secondary,
    cursor: 'pointer', fontFamily: type.family,
    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
  });

  // Compact button — de-emphasized for mobile; tooling layer, not primary content
  const cBtn = (active) => ({
    ...btnStyle(active),
    padding: `0 ${space[2]}px`, height: 22, fontSize: 11,
  });

  const phaseName = phaseInfo?.phase?.name || '';
  const phaseLabel = phaseName.startsWith('disruption') ? phaseName.replace('disruption-', '').toUpperCase()
    : phaseName.toUpperCase();

  const scrubberRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
      <input
        type="range"
        min={0}
        max={maxTick}
        value={tick}
        onChange={e => onScrub(Number(e.target.value))}
        style={{ flex: 1, accentColor: color.border.strong, height: 4, cursor: 'pointer' }}
        data-obs="scrubber"
      />
      <Text variant="caption" as="span" color={color.text.tertiary} style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>
        {tick}/{maxTick}
      </Text>
    </div>
  );

  const wrap = (children) => (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: space[1],
      padding: `4px ${space[4]}px`,
      borderBottom: `1px solid ${color.border.subtle}`,
      background: color.surface.canvas,
    }}>
      {children}
    </div>
  );

  // ── Mobile compact layout ─────────────────────────────────────────────
  if (compact) {
    return wrap(<>
      {/* Row 1: scenario tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: space[1] }}>
        {SCENARIO_LIST.map(s => (
          <button key={s.id} style={cBtn(scenario.id === s.id)} onClick={() => onScenario(s.id)} data-obs={`tab-${s.id}`}>
            {s.eventType}
          </button>
        ))}
      </div>
      {/* Row 2: transport — reset + play + speed + phase label, all in one strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: space[1] }}>
        <button style={cBtn(false)} onClick={onReset} title="Reset" data-obs="reset">↺</button>
        <button style={cBtn(false)} onClick={onPlayPause} data-obs="play-pause">
          {playing ? '⏸' : '▶'}
        </button>
        <span style={{ width: space[2] }} />
        {SPEEDS.map((s, i) => (
          <button key={i} style={cBtn(speed === i)} onClick={() => onSpeedChange(i)} data-obs={`speed-${s.label}`}>
            {s.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <Text variant="caption" as="span" color={color.text.tertiary} style={{ fontSize: 11 }}>
          {phaseLabel}
        </Text>
      </div>
      {/* Row 3: scrubber */}
      {scrubberRow}
    </>);
  }

  // ── Desktop layout ────────────────────────────────────────────────────
  return wrap(<>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space[2] }}>
      {SCENARIO_LIST.map(s => (
        <button key={s.id} style={btnStyle(scenario.id === s.id)} onClick={() => onScenario(s.id)} data-obs={`tab-${s.id}`}>
          {s.eventType}
        </button>
      ))}
      <span style={{ flex: 1 }} />
      <button style={btnStyle(false)} onClick={onReset} title="Reset (Ctrl+Shift+R)" data-obs="reset">↺</button>
      <button style={btnStyle(false)} onClick={onPlayPause} data-obs="play-pause">
        {playing ? '⏸' : '▶'}
      </button>
      {SPEEDS.map((s, i) => (
        <button key={i} style={btnStyle(speed === i)} onClick={() => onSpeedChange(i)} data-obs={`speed-${s.label}`}>
          {s.label}
        </button>
      ))}
      <Text variant="caption" as="span" color={color.text.tertiary} style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>
        {phaseLabel}
      </Text>
    </div>
    {scrubberRow}
  </>);
}

// ─── Recovery Residual ──────────────────────────────────────────────────
// Sprint 37: Recovery reflects preceding stress level.
// A wedding that survived 3 disruptions feels different in recovery
// than one that went smoothly. This is NOT narration — it's atmosphere.

function computeRecoveryResidue(scenario, tick) {
  const { phaseIndex } = getPhaseAt(scenario, tick);
  // Count disruption phases that occurred before recovery
  let disruptionCount = 0;
  let maxEscalation = 'nominal';
  for (let i = 0; i < phaseIndex; i++) {
    const phase = scenario.timeline[i];
    if (phase.name.startsWith('disruption') || phase.name === 'active') {
      disruptionCount++;
      const esc = phase.inputs?.escalationLevel || 'nominal';
      if (esc === 'emergency' || (esc === 'escalated' && maxEscalation !== 'emergency')) maxEscalation = esc;
      else if (esc === 'caution' && maxEscalation === 'nominal') maxEscalation = esc;
    }
  }
  return {
    disruptionCount,
    maxEscalation,
    // Recovery intensity: 0 = smooth event, 1 = heavily disrupted
    intensity: Math.min(1.0, disruptionCount * 0.25),
  };
}

// ─── Simulation Workflow ────────────────────────────────────────────────

function SimWorkflow({ scenarioId }) {
  const orch = useOrchestration();
  const w = useViewport();

  const scenario = SCENARIOS[scenarioId] || SCENARIOS.wedding;
  const maxTick = totalTicks(scenario) - 1;

  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [showDebug, setShowDebug] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  });
  const isFacilitator = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('observe') === '1';
  const [observing, setObserving] = useState(false);
  const [exported, setExported] = useState(false); // false | 'copied' | 'saved'

  const downloadSessionJson = (json) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngw-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported('saved');
    setTimeout(() => setExported(false), 2000);
  };
  // Sprint 40A: richer interruption state replaces tabReturnFlash boolean
  // { hiddenDuration, pressureDelta, pressureOnLeave, pressureOnReturn,
  //   flashDuration, active, intensity, returnCount, returnedAt }
  const [reEntry, setReEntry] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [modeLabelVisible, setModeLabelVisible] = useState(true);
  const prevModeLabelRef = useRef('');
  const prevPhaseRef = useRef('');
  const reEntryTimerRef = useRef(null);
  const hiddenAtRef = useRef(null);   // { time, pressure } captured on hide
  const pressureRef = useRef(0);      // always-current pressure snapshot
  const returnCountRef = useRef(0);

  // Auto-advance
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setTick(t => {
        if (t >= maxTick) { setPlaying(false); return maxTick; }
        return t + 1;
      });
    }, SPEEDS[speedIdx].ms);
    return () => clearInterval(iv);
  }, [playing, speedIdx, maxTick]);

  // Reset tick when scenario changes.
  // Note: handleScenario always calls window.location.reload(), so scenarioId never
  // changes within a mounted component — this only runs on initial mount.
  useEffect(() => { setTick(0); }, [scenarioId]);

  // Sprint 40C: auto-play on mobile — environment starts evolving immediately on load.
  // Coordinator enters a live operational space, not a paused viewer waiting to be started.
  // Disabled in debug mode (?debug=1) so facilitators can inspect state without the sim running.
  // Runs after the tick reset above so it wins the initial render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mobile = window.innerWidth < 1024;
    const debug = new URLSearchParams(window.location.search).get('debug') === '1';
    if (mobile && !debug) setPlaying(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // Ctrl+D: toggle debug overlay
      if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault();
        setShowDebug(d => !d);
      }
      // Ctrl+Shift+O: toggle observation
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        setObserving(o => {
          if (o) { stopObservation(); return false; }
          else { startObservation(); return true; }
        });
      }
      // Ctrl+Shift+E: export observation session
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        const json = exportSession();
        navigator.clipboard?.writeText(json).then(
          () => console.log('[Observation] Session exported to clipboard'),
          () => console.log('[Observation] Export:', json)
        );
      }
      // Ctrl+Shift+R: reset simulation
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setTick(0); setPlaying(false);
        clearSession();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Start observation if URL param
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('observe') === '1') {
      startObservation();
      setObserving(true);
    }
  }, []);

  // Sprint 40A: interruption continuity re-entry system.
  // On hide: snapshot time + pressure. On return: compute absence duration,
  // pressure delta, scale re-entry flash duration by absence length.
  // Short absence (<5s) → 1.5s emphasis. Medium (5–30s) → 2.5s. Long (>30s) → 4s.
  // Active items get amber border (Sprint 38 behavior). Focal items get weighted
  // structural presence proportional to hierarchy.weight × absence scale.
  //
  // Sprint 40B: supplements visibilitychange with pagehide/pageshow for iOS Safari.
  // visibilitychange fires on tab switching but NOT on device lock/unlock.
  // pagehide fires on iOS when page enters background (home button, lock).
  // pageshow fires on iOS restore — e.persisted=true means bfcache restore (not reload).
  // Both listen for the same hide/return cycle; whichever fires first wins.
  useEffect(() => {
    const computeReturn = () => {
      if (!hiddenAtRef.current) return;
      const hiddenDuration = Date.now() - hiddenAtRef.current.time;
      const pressureDelta = pressureRef.current - hiddenAtRef.current.pressure;
      const flashDuration = hiddenDuration < 5000 ? 1500
        : hiddenDuration < 30000 ? 2500
        : 4000;
      const intensity = Math.min(1.0, 0.5 + hiddenDuration / 60000);
      returnCountRef.current++;
      setReEntry({
        hiddenDuration,
        pressureDelta,
        pressureOnLeave: hiddenAtRef.current.pressure,
        pressureOnReturn: pressureRef.current,
        flashDuration,
        intensity,
        active: true,
        returnCount: returnCountRef.current,
        returnedAt: Date.now(),
      });
      hiddenAtRef.current = null;
      if (reEntryTimerRef.current) clearTimeout(reEntryTimerRef.current);
      reEntryTimerRef.current = setTimeout(() => {
        setReEntry(r => r ? { ...r, active: false } : null);
      }, flashDuration);
    };

    const onViz = () => {
      if (document.hidden) {
        hiddenAtRef.current = { time: Date.now(), pressure: pressureRef.current };
      } else {
        computeReturn();
      }
    };

    // pagehide: iOS fires this when page enters background (lock, home button)
    const onPageHide = () => {
      if (!hiddenAtRef.current) {
        hiddenAtRef.current = { time: Date.now(), pressure: pressureRef.current };
      }
    };

    // pageshow: iOS fires this on restore. e.persisted=false means full reload — skip.
    const onPageShow = (e) => {
      if (e.persisted) computeReturn();
    };

    document.addEventListener('visibilitychange', onViz);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onViz);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      if (reEntryTimerRef.current) clearTimeout(reEntryTimerRef.current);
    };
  }, []);

  // Sprint 38: scroll tracking for mobile sticky context header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Drive orchestration context from simulation tick
  const inputs = useMemo(() => resolveInputsAt(scenario, tick), [scenario, tick]);
  const phaseInfo = useMemo(() => getPhaseAt(scenario, tick), [scenario, tick]);
  const isRecovery = inputs.operationalMode === 'recovery';

  // Record phase changes for observation
  useEffect(() => {
    const pn = phaseInfo?.phase?.name;
    if (pn && pn !== prevPhaseRef.current) {
      prevPhaseRef.current = pn;
      recordPhaseChange(pn, tick);
    }
  }, [phaseInfo, tick]);

  useEffect(() => {
    orch.setPressureInputs(inputs);
    if (isRecovery) orch.enterRecovery();
    else orch.exitRecovery();
  }, [inputs, isRecovery]); // eslint-disable-line

  const { pressure, state } = orch;

  // Keep pressureRef current for snapshot on hide
  useEffect(() => { pressureRef.current = pressure; }, [pressure]);

  // Resolve scenario state at current tick
  const currentSequence = useMemo(() => resolveSequenceAt(scenario, tick), [scenario, tick]);
  const currentVendors = useMemo(() => resolveVendorsAt(scenario, tick), [scenario, tick]);

  // Recovery residual character
  const recoveryResidue = useMemo(() => {
    if (state !== 'recovery') return null;
    return computeRecoveryResidue(scenario, tick);
  }, [state, scenario, tick]);

  // Scale minutes to deadline based on pressure phase
  const sequenceWithTime = useMemo(() => {
    return currentSequence.map(item => {
      const minutesScale = state === 'active' ? 0.2 : state === 'building' ? 0.5 : 1.0;
      return {
        ...item,
        minutesToDeadline: item.isCompleted ? 0 : Math.max(1, Math.round(item.minutesToDeadline * minutesScale)),
      };
    });
  }, [currentSequence, state]);

  // 1. Hierarchy
  const withHierarchy = useMemo(
    () => resolveSequenceHierarchy(sequenceWithTime, pressure),
    [sequenceWithTime, pressure]
  );

  // 2. Tunneling
  const withTunneling = useMemo(
    () => resolveSequenceTunneling(
      withHierarchy.map(item => ({
        ...item,
        isInDependencyChain: item.dependencyDepth > 0,
        chainDistance: item.isActive ? 0 : item.dependencyDepth,
        minutesToRelevance: item.minutesToDeadline,
      })),
      pressure,
      state
    ),
    [withHierarchy, pressure, state]
  );

  // 3. Memory — consequences only, no narration
  const itemMemories = useMemo(() => {
    const map = {};
    withTunneling.forEach(item => {
      map[item.id] = aggregateMemories(scenario.memories, item.id, 'itemId');
    });
    return map;
  }, [withTunneling, scenario.memories]);

  // 4. Continuity fields
  const chainIds = useMemo(() => scenario.sequence.map(i => i.id), [scenario]);
  const connections = useMemo(() => buildDependencyChain(chainIds), [chainIds]);
  const pressureMap = useMemo(() => {
    const map = {};
    withTunneling.forEach(item => {
      map[item.id] = item.isActive ? pressure : (item.isFragile ? pressure * 0.7 : 0);
    });
    return map;
  }, [withTunneling, pressure]);

  const fieldEffects = useMemo(() => {
    const map = {};
    withTunneling.forEach(item => {
      map[item.id] = resolveFieldEffects(item.id, connections, pressureMap);
    });
    return map;
  }, [withTunneling, connections, pressureMap]);

  // 5. Vendor compression
  const depChainVendors = useMemo(() => {
    if (state === 'calm') return [];
    return [...new Set(currentSequence.filter(i => i.isActive || i.dependencyDepth <= 2).map(i => i.vendorId))];
  }, [currentSequence, state]);

  const compressedVendors = useMemo(
    () => resolveVendorCompression(currentVendors, state, pressure, depChainVendors),
    [currentVendors, state, pressure, depChainVendors]
  );

  const isWide = w >= 1024;
  const isLarge = w >= 1280;

  // Sprint 38: sequence progress anchor
  const completedCount = withTunneling.filter(i => i.isCompleted).length;
  const totalCount = withTunneling.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  // Sprint 38: ghosted vendor count for trust compression clarity
  const ghostedVendorCount = compressedVendors.filter(
    v => v.compression?.level === COMPRESSION_LEVEL.GHOSTED
  ).length;

  // Canvas background — recovery residual: warm tint reflects preceding stress
  const canvasBg = state === 'active' ? '#060708'
    : state === 'recovery' && recoveryResidue?.intensity > 0.5
      ? '#080808'  // heavy disruption leaves darker residue
    : state === 'recovery' && recoveryResidue?.intensity > 0
      ? '#070808'  // mild disruption residue
    : color.surface.canvas;

  const gridStyle = isLarge
    ? { display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr) 280px', gap: space[5], padding: space[5], flex: 1 }
    : isWide
    ? { display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr) 240px', gap: space[4], padding: space[4], flex: 1 }
    : { display: 'flex', flexDirection: 'column', gap: space[4], padding: space[4], flex: 1 };

  // Mode indicator
  const _isDisruptionPhase = (phaseInfo?.phase?.name || '').startsWith('disruption');
  const _isEscalatedPhase = _isDisruptionPhase && currentVendors.some(v => v.status === 'escalated');
  const modeLabel = state === 'recovery' ? 'POST-EVENT'
    : _isDisruptionPhase ? 'DISRUPTION'
    : state === 'active' || state === 'building' ? 'LIVE'
    : 'PRE-EVENT';

  // Sprint 40D.1: mode label cross-fade — fades out, switches content, fades in.
  // The text content change (PRE-EVENT→LIVE) can't be CSS-animated, so we gate
  // visibility with React state. Surrounding environment (dot, header, hierarchy)
  // drift simultaneously at 1000-1200ms; the label dissolves in the same window.
  useEffect(() => {
    if (prevModeLabelRef.current === '') { prevModeLabelRef.current = modeLabel; return; }
    if (prevModeLabelRef.current === modeLabel) return;
    prevModeLabelRef.current = modeLabel;
    setModeLabelVisible(false);
    const t = setTimeout(() => setModeLabelVisible(true), 500);
    return () => clearTimeout(t);
  }, [modeLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const modeDot = _isDisruptionPhase && _isEscalatedPhase ? color.status.riskBright
    : _isDisruptionPhase ? color.status.riskText
    : state === 'active' ? '#b8943f'
    : state === 'building' ? color.status.confirmed
    : state === 'recovery' ? color.text.tertiary
    : color.status.confirmed;

  // Phase-aware timing display
  const phaseName = phaseInfo?.phase?.name || 'calm';
  const timeDisplay = phaseName === 'recovery' ? 'Complete'
    : `T-${String(Math.max(0, Math.floor(inputs.temporalProximity / 60)))}:${String(inputs.temporalProximity % 60).padStart(2, '0')}`;

  // Recovery status line — reflects intensity without narrating
  const recoveryStatus = recoveryResidue
    ? recoveryResidue.intensity > 0.5 ? 'Resolved' : 'Complete'
    : 'Complete';

  const handleScenario = useCallback((id) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('sim', id);
      window.history.replaceState({}, '', url);
      window.location.reload();
    }
  }, []);

  const handleReset = useCallback(() => {
    setTick(0);
    setPlaying(false);
  }, []);

  // Disrupted vendors (for minimal disruption indicator)
  const disruptedVendors = currentVendors.filter(v =>
    v.status !== 'nominal' && v.status !== 'confirmed'
  );
  const isDisruption = phaseName.startsWith('disruption');
  const isEscalated = disruptedVendors.some(v => v.status === 'escalated');

  return (
    <div style={{
      minHeight: '100vh',
      background: canvasBg,
      color: color.text.primary,
      fontFamily: type.family,
      display: 'flex', flexDirection: 'column',
      transition: 'background 2000ms ease',
    }}>
      <style>{`
        @keyframes ngw-alert-in {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ngw-dot-pulse {
          0%   { transform: scale(1);   opacity: 0.85; }
          65%  { transform: scale(3);   opacity: 0; }
          100% { transform: scale(3);   opacity: 0; }
        }
      `}</style>
      {/* Sprint 40B: mobile identity strip — event grounding before simulation chrome.
          Coordinator sees WHO/WHAT/WHEN before they see any playback controls.
          Gives operational orientation on first glance at 375px. */}
      {!isWide && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: space[2],
          padding: `6px ${space[4]}px`,
          background: color.surface.canvas,
          borderBottom: `1px solid ${color.border.subtle}`,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: modeDot,
            transition: 'background 1200ms ease',
          }} />
          <Text variant="secondary" as="span" style={{ fontSize: 13, flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scenario.title}
          </Text>
          <Text variant="caption" as="span" color={isDisruption ? (isEscalated ? color.status.riskText : color.status.warningText) : color.text.tertiary} style={{ fontSize: 11, whiteSpace: 'nowrap', transition: 'color 1000ms ease, opacity 400ms ease', opacity: modeLabelVisible ? 1 : 0 }}>
            {modeLabel} · {state === 'recovery' ? recoveryStatus : timeDisplay}
          </Text>
        </div>
      )}

      <SimControls
        scenario={scenario}
        tick={tick}
        maxTick={maxTick}
        playing={playing}
        speed={speedIdx}
        onPlayPause={() => {
          if (tick >= maxTick) { setTick(0); setPlaying(true); }
          else setPlaying(p => !p);
        }}
        onSpeedChange={setSpeedIdx}
        onScrub={(t) => { setTick(t); setPlaying(false); }}
        onScenario={handleScenario}
        onReset={handleReset}
        phaseInfo={phaseInfo}
        compact={!isWide}
      />

      {/* Sprint 38: mobile sticky context strip — appears when scrolled, prevents orientation loss */}
      {!isWide && scrolled && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: isDisruption
            ? (isEscalated ? 'rgba(40, 5, 8, 0.97)' : 'rgba(28, 10, 4, 0.97)')
            : 'rgba(7, 8, 9, 0.96)',
          borderBottom: `1px solid ${isDisruption ? (isEscalated ? `${color.status.riskBright}50` : `${color.status.warning}35`) : color.border.subtle}`,
          transition: 'background 1200ms ease, border-color 1200ms ease',
          padding: `${space[2]}px ${space[4]}px`,
          display: 'flex', alignItems: 'center', gap: space[3],
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 6, height: 6, flexShrink: 0 }}>
            {isDisruption && <span style={{
              position: 'absolute',
              width: 6, height: 6,
              borderRadius: '50%',
              border: `1.5px solid ${modeDot}`,
              animation: 'ngw-dot-pulse 1.6s ease-out infinite',
            }} />}
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: modeDot, flexShrink: 0,
              transition: 'background 1200ms ease',
            }} />
          </span>
          <Text variant="secondary" as="span" style={{ fontSize: type.size.sm, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scenario.title}
          </Text>
          <Text variant="caption" as="span" color={color.text.tertiary} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {state === 'recovery' ? recoveryStatus : timeDisplay}
          </Text>
        </div>
      )}

      {/* Ultra-wide centering wrapper — SimControls stays full-bleed, content constrains at 1280px */}
      <div style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={gridStyle}>
        {/* Left rail — event context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
          <Surface role="card" pad={5} rad="md" data-obs="event-card" style={{
            display: 'flex', flexDirection: 'column', gap: space[4],
            // Recovery residual: card border subtly reflects stress
            borderBottom: state === 'recovery' && recoveryResidue?.intensity > 0.5
              ? '2px solid rgba(191, 80, 80, 0.08)'
              : state === 'recovery' && recoveryResidue?.intensity > 0
                ? '2px solid rgba(184, 148, 63, 0.06)'
                : undefined,
            transition: 'border-color 2000ms ease',
          }}>
            <div>
              <Text variant="heading" as="div">{scenario.title}</Text>
              <Text variant="secondary" as="div" color={color.text.tertiary} style={{ marginTop: space[1] }}>
                {scenario.subtitle}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 7, height: 7, flexShrink: 0 }}>
                {isDisruption && <span style={{
                  position: 'absolute',
                  width: 7, height: 7,
                  borderRadius: '50%',
                  border: `1.5px solid ${modeDot}`,
                  animation: 'ngw-dot-pulse 1.6s ease-out infinite',
                }} />}
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: modeDot,
                  transition: 'background 1200ms ease',
                  flexShrink: 0,
                }} />
              </span>
              <Text variant="label" as="span" style={{
                letterSpacing: '0.14em', fontSize: type.size.xs || 10,
                color: isDisruption
                  ? (isEscalated ? color.status.riskText : color.status.warningText)
                  : state === 'active' ? '#b8943f'
                  : color.text.tertiary,
                transition: 'color 1000ms ease, opacity 400ms ease',
                opacity: modeLabelVisible ? 1 : 0,
              }}>
                {modeLabel}
              </Text>
              <span style={{ flex: 1 }} />
              <Text variant="caption" as="span" color={color.text.tertiary} style={{ fontSize: 11 }}>
                {state === 'recovery' ? recoveryStatus : timeDisplay}
              </Text>
            </div>
          </Surface>

          {/* Sprint 46B: Pressure phase escalation bar — Figma pg 79 (Slice F).
              PLANNING → TRANSITION → COORDINATING → LIVE → OPERATIONAL.
              LIVE is the danger zone threshold. Status via color + text, zero icons. */}
          {(() => {
            const phases = ['PLANNING', 'TRANSITION', 'COORDINATING', 'LIVE', 'OPERATIONAL'];
            const activeIdx = state === 'recovery' ? 4
              : state === 'active' ? 3
              : state === 'building' && pressure >= 0.5 ? 2
              : state === 'building' ? 1
              : pressure >= 0.25 ? 1
              : 0;
            return (
              <div style={{ display: 'flex', gap: 2, marginTop: space[2] }}>
                {phases.map((label, idx) => {
                  const isCurrent = idx === activeIdx;
                  const isPast    = idx < activeIdx;
                  const bg =
                    idx === 4 && state === 'recovery'   ? 'rgba(80,180,110,0.30)'
                    : idx === 3 && state === 'active'   ? 'rgba(184,100,60,0.40)'
                    : isCurrent && state === 'building' ? 'rgba(184,148,63,0.22)'
                    : isCurrent                         ? 'rgba(255,255,255,0.08)'
                    : isPast                            ? 'rgba(255,255,255,0.05)'
                    :                                     'rgba(255,255,255,0.03)';
                  const textColor =
                    idx === 4 && state === 'recovery'   ? '#50b46e'
                    : idx === 3 && state === 'active'   ? '#c07850'
                    : isCurrent && state === 'building' ? '#b8943f'
                    : isCurrent                         ? color.text.tertiary
                    : isPast                            ? color.text.disabled
                    :                                     'rgba(255,255,255,0.18)';
                  return (
                    <div key={label} style={{
                      flex: 1, height: 22,
                      background: bg, borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 1200ms ease',
                    }}>
                      <span style={{
                        fontSize: 7, letterSpacing: '0.10em',
                        fontFamily: type.family, fontWeight: type.weight.medium,
                        color: textColor, transition: 'color 1000ms ease',
                        userSelect: 'none',
                      }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Sprint 38: reserved layout space prevents geometry shift when disruption card appears.
              Sprint 40B: collapse to 0 at calm — eliminates dead zone on first load. */}
          <div style={{ minHeight: isDisruption ? 52 : 0, transition: 'min-height 400ms ease' }}>
            {isDisruption && disruptedVendors.length > 0 && (
              <Surface role="card" pad={4} rad="md" style={{
                borderLeft: `4px solid ${isEscalated ? color.status.riskBright : color.status.warning}`,
                background: isEscalated ? color.status.riskBg : color.status.warningBg,
                animation: 'ngw-alert-in 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                transition: 'border-color 600ms ease, background 600ms ease, box-shadow 600ms ease',
                boxShadow: isEscalated
                  ? `0 0 0 1px ${color.status.riskBright}35, 0 0 14px 0 ${color.status.riskBright}25`
                  : `0 0 0 1px ${color.status.warning}28`,
              }}>
                <div style={{ marginBottom: space[2] }}>
                  <span style={{
                    fontSize: 9, letterSpacing: '0.18em', fontFamily: type.family,
                    fontWeight: type.weight.medium,
                    color: isEscalated ? color.status.riskBright : color.status.warningText,
                  }}>
                    {isEscalated ? 'ESCALATED' : 'DISRUPTION'}
                  </span>
                </div>
                <Text variant="secondary" as="div" style={{
                  fontSize: type.size.base,
                  color: isEscalated ? color.status.riskText : color.status.warningText,
                  fontWeight: type.weight.medium,
                }}>
                  {disruptedVendors.map(v => v.name).join(', ')}
                  {' '}<span style={{ color: color.text.tertiary, fontWeight: type.weight.regular }}>responding</span>
                </Text>
              </Surface>
            )}
          </div>

          {/* Recovery residual — number of items resolved, no narration */}
          {state === 'recovery' && recoveryResidue?.disruptionCount > 0 && (
            <div style={{
              padding: `${space[2]}px 0`,
              opacity: 0.4,
              transition: 'opacity 2000ms ease',
            }}>
              <Text variant="caption" as="div" color={color.text.disabled} style={{ fontSize: 10 }}>
                {currentSequence.filter(i => i.isCompleted).length}/{currentSequence.length} complete
              </Text>
            </div>
          )}
        </div>

        {/* Center — sequence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
          {/* Sprint 38: sequence progress indicator — unambiguous position anchor */}
          <div style={{ marginBottom: space[2] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[3], marginBottom: space[1] }}>
              <Text variant="label" color={color.text.tertiary} style={{ letterSpacing: '0.14em', fontSize: type.size.xs || 10 }}>
                {scenario.eventType === 'Wedding' ? 'CEREMONY TRANSITION'
                  : scenario.eventType === 'Corporate' ? 'EVENT SEQUENCE'
                  : 'SHOW SEQUENCE'}
              </Text>
              <span style={{ flex: 1 }} />
              {completedCount > 0 && (
                <Text variant="caption" as="span" color={color.text.tertiary} style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  {completedCount}/{totalCount}
                </Text>
              )}
            </div>
            {/* Progress bar — 3px for peripheral visibility; environmental confidence, not notification */}
            {totalCount > 0 && (
              <div style={{
                height: 3, background: 'rgba(255,255,255,0.06)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${progressPct * 100}%`,
                  background: state === 'active' ? 'rgba(184, 148, 63, 0.50)'
                    : state === 'building' ? 'rgba(184, 148, 63, 0.30)'
                    : state === 'recovery' ? 'rgba(80, 180, 110, 0.45)'
                    : 'rgba(255, 255, 255, 0.15)',
                  // Sprint 40A: briefly raises bar opacity on return — orientation landmark
                  opacity: reEntry?.active ? 1.0 : 0.85,
                  transition: 'width 800ms ease, background 1200ms ease, opacity 1200ms ease',
                  borderRadius: 2,
                }} />
              </div>
            )}
          </div>

          {withTunneling.map(item => (
            <SequenceItem
              key={item.id}
              item={item}
              memory={itemMemories[item.id]}
              fieldEffect={fieldEffects[item.id]}
              vendors={currentVendors}
              reEntry={reEntry}
            />
          ))}
        </div>

        {/* Right rail — vendors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
          <Text variant="label" color={color.text.tertiary} style={{
            letterSpacing: '0.14em', fontSize: type.size.xs || 10, marginBottom: space[1],
          }}>
            VENDORS
          </Text>
          {compressedVendors.map(v => (
            <VendorRow key={v.id} vendor={v} />
          ))}
          {/* Sprint 38: trust compression clarity — addresses "where did they go?" anxiety */}
          {ghostedVendorCount > 0 && (
            <div style={{
              padding: `${space[1]}px 0`,
              opacity: 0.35,
              transition: 'opacity 2000ms ease',
            }}>
              <Text variant="caption" as="span" color={color.text.disabled} style={{ fontSize: 9 }}>
                +{ghostedVendorCount} confirmed
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: `${space[2]}px ${space[4]}px`,
        borderTop: `1px solid ${color.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: space[3],
      }}>
        <Text variant="caption" color={color.text.tertiary} style={{ fontSize: 11, flex: 1 }}>
          Sprint 40D · {scenario.eventType} · {w}px
        </Text>
        {isFacilitator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
            <button
              onClick={() => {
                if (observing) { stopObservation(); setObserving(false); }
                else { startObservation(); setObserving(true); }
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                fontSize: 11, fontFamily: type.family,
                color: observing ? (color.status.risk || '#E84036') : color.text.tertiary,
              }}
            >
              {observing ? '● Stop' : '○ Record'}
            </button>
            {!observing && (
              <button
                onClick={() => downloadSessionJson(exportSession())}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                  fontSize: 11, fontFamily: type.family,
                  color: exported ? color.status.confirmed : color.text.tertiary,
                  transition: 'color 0.2s',
                }}
              >
                {exported === 'saved' ? '↓ Saved' : '↑ Export'}
              </button>
            )}
          </div>
        )}
      </div>

      </div>{/* end ultra-wide centering wrapper */}

      {/* Debug overlay — hidden by default */}
      {showDebug && (
        <BehavioralObservatory
          pressure={pressure}
          state={state}
          phaseInfo={phaseInfo}
          tick={tick}
          maxTick={maxTick}
          sequenceItems={withTunneling}
          fieldEffects={fieldEffects}
          itemMemories={itemMemories}
          observing={observing}
          reEntry={reEntry}
        />
      )}
    </div>
  );
}

// ─── Outer wrapper ──────────────────────────────────────────────────────

function getInitialScenario() {
  if (typeof window === 'undefined') return 'wedding';
  const s = new URLSearchParams(window.location.search).get('sim');
  if (s && SCENARIOS[s]) return s;
  return 'wedding';
}

export default function OrchestrationSlice() {
  const scenarioId = getInitialScenario();
  const scenario = SCENARIOS[scenarioId];
  const firstPhase = scenario.timeline[0];

  return (
    <OperationalModeProvider initialMode={firstPhase.inputs.operationalMode}>
      <EscalationProvider>
        <DensityProvider>
          <OrchestrationProvider initialInputs={firstPhase.inputs}>
            <SimWorkflow scenarioId={scenarioId} />
          </OrchestrationProvider>
        </DensityProvider>
      </EscalationProvider>
    </OperationalModeProvider>
  );
}
