// DesktopDensitySlice — Sprint 11B desktop orchestration proving ground.
//
// Validates the core doctrine under *operational density*: when multiple vendor
// problems coexist, the interface must (a) make the dominant escalation
// instantly obvious, (b) keep secondaries visible-but-quiet (no co-equal
// shouting), and (c) get QUIETER as severity rises, not busier. Single P1 at
// any time; structure expresses authority (mass / placement / isolation);
// motion stays on the locked matrix; no glow / pulse / dashboard chrome.
//
// Layout (desktop ≥1100): context rail | active orchestration | other threads.
// Tablet landscape (≥800): rail | (active + threads stacked).
// Additive: reached via index.js ?slice=desktop-density. Reuses every primitive.

import { useState, useMemo, useEffect } from 'react';
import {
  Surface, Text, Button, EscalationBadge,
  color, space, type, radius,
} from '../design';
import { EscalationProvider, useEscalation } from '../contexts/EscalationContext';
import { DensityProvider, useDensity } from '../contexts/DensityContext';
import { OperationalModeProvider } from '../contexts/OperationalModeContext';

// ─── Severity ladder ─────────────────────────────────────────────────────────
// nominal → delayed → non_responsive → emergency  (resolved is terminal)
const LADDER = ['nominal', 'delayed', 'non_responsive', 'emergency'];
const WEIGHT = { nominal: 0, delayed: 1, non_responsive: 2, emergency: 3, resolved: -1 };
const STATUS_TO_BADGE = { delayed: 'warning', non_responsive: 'risk', emergency: 'emergency' };

const INITIAL_VENDORS = [
  { id: 'venue',     name: 'Venue Coordinator',  role: 'Venue',       status: 'nominal' },
  { id: 'catering',  name: 'Catering',           role: 'Food & Bev',  status: 'nominal' },
  { id: 'florist',   name: 'Floral Co.',         role: 'Decor',       status: 'nominal' },
  { id: 'av',        name: 'Sound & AV',         role: 'Production',  status: 'nominal' },
  { id: 'photo',     name: 'Photography',        role: 'Coverage',    status: 'nominal' },
  { id: 'transport', name: 'Wedding Transport',  role: 'Logistics',   status: 'nominal' },
  { id: 'bar',       name: 'Bar Service',        role: 'Food & Bev',  status: 'nominal' },
];

const MESSAGE = {
  delayed:        (v) => `${v.role} · 25 min behind`,
  non_responsive: (v) => `${v.role} · 18 min · no contact`,
  emergency:      (v) => `${v.role} · direct action required now`,
};
const ACTIONS = {
  delayed:        { primary: 'Check ETA',          secondary: ['Notify next station', 'Reroute timeline'] },
  non_responsive: { primary: 'Call lead directly', secondary: ['Page backup',         'Escalate to venue'] },
  emergency:      { primary: 'CONTACT NOW',        secondary: ['Move to backup',      'Mark resolved'] },
};

function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

// ─── Context Rail (left) — persistent operational context ──────────────────
function ContextRail({ vendors }) {
  return (
    <Surface role="card" pad={5} rad="md" style={{ display: 'flex', flexDirection: 'column', gap: space[6], minWidth: 0, height: '100%' }}>
      <div>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[2] }}>EVENT</Text>
        <Text variant="heading" as="div">Hartwell Wedding</Text>
        <Text variant="secondary" as="div" style={{ marginTop: space[2] }}>Sat · 14:00 · Bluebell Manor</Text>
      </div>
      <div>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[2] }}>MODE</Text>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: space[2] }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color.atmosphere.live }} />
          <Text variant="bodyStrong" as="span" color={color.atmosphere.live}>LIVE</Text>
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[3] }}>VENDOR STATUS</Text>
        {vendors.map((v) => {
          const sev = v.status;
          const dot = sev === 'emergency' ? color.status.riskBright
                     : sev === 'non_responsive' ? color.status.risk
                     : sev === 'delayed' ? color.status.warning
                     : sev === 'resolved' ? color.text.disabled
                     : color.status.confirmed;
          return (
            <div key={v.id}
              style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: `${space[2]}px 0`,
                opacity: sev === 'resolved' ? 0.45 : 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              <Text variant="secondary" as="span"
                color={sev === 'nominal' ? color.text.tertiary : color.text.primary}
                style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.role}
              </Text>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

// ─── Active Orchestration (center) — the single P1 ─────────────────────────
// Refinement pass (Figma sprint): contained action widths, not full-bleed CTA
// bars. Hierarchy is already carried by spatial orchestration + escalation
// isolation + dimensionality + density collapse — buttons no longer need to
// span the surface to assert primacy. Emergency feels HEAVIER (larger mass +
// taller surface size), not WIDER. Operational instrument, not dashboard CTA.
function ActiveOrchestration({ primary, onResolve, isEmergency }) {
  if (!primary) {
    return (
      <Surface role="card" pad={6} rad="md"
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="secondary" color={color.text.tertiary}>All clear · no active escalations · monitoring</Text>
      </Surface>
    );
  }
  const sev = primary.status;
  const actions = ACTIONS[sev];
  const badgeStatus = STATUS_TO_BADGE[sev] || 'neutral';
  // Contained widths (px). Within spec:
  //   nominal      → intrinsic (n/a — slice only shows escalations)
  //   escalation   → 240–320  → using 280
  //   emergency    → 320–420  → using 360 (still 60–80px wider than escalation, mass not bloat)
  const primaryWidth   = isEmergency ? 360 : 280;
  const secondaryWidth = 160;
  const primarySize    = isEmergency ? 'xl' : 'lg'; // emergency = taller mass, not wider
  return (
    <Surface role={isEmergency ? 'escalation' : 'active'} pad={6} rad="md"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: space[8] }}>
      <div style={{ maxWidth: 520 }}>
        <EscalationBadge status={badgeStatus}>
          {sev === 'emergency' ? 'EMERGENCY' : sev === 'non_responsive' ? 'CRITICAL' : 'ESCALATION'}
        </EscalationBadge>
        <Text variant="title" as="div" style={{ marginTop: space[4] }}>{primary.name}</Text>
        <Text variant="bodyStrong" as="div"
          color={sev === 'emergency' || sev === 'non_responsive' ? color.status.riskText : color.status.warningText}
          style={{ marginTop: space[3] }}>
          {MESSAGE[sev](primary)}
        </Text>
      </div>
      {/* Action anchor — left-aligned, contained, with deliberate breathing room. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[4], marginTop: 'auto', alignItems: 'flex-start' }}>
        <Button priority={isEmergency ? 'escalation' : 'p1'} size={primarySize}
          style={{ width: primaryWidth }}>
          {actions.primary}
        </Button>
        <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap' }}>
          {actions.secondary.map((a) => (
            <Button key={a} priority="p2" size="md" style={{ width: secondaryWidth }}>{a}</Button>
          ))}
        </div>
        <Button priority="ambient" size="sm" onClick={() => onResolve(primary.id)}>Mark resolved</Button>
      </div>
    </Surface>
  );
}

// ─── Supporting Threads (right) — secondary escalations, awareness only ────
function SupportingThreads({ secondaries, onPromote, dense }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[3], minWidth: 0 }}>
      <Text variant="label" color={color.text.tertiary}>OTHER THREADS ({secondaries.length})</Text>
      {secondaries.length === 0 && (
        <Text variant="secondary" color={color.text.tertiary} style={{ marginTop: space[2] }}>
          All other threads nominal · monitoring
        </Text>
      )}
      {secondaries.map((v) => {
        const sev = v.status;
        const dotColor = sev === 'emergency' ? color.status.riskBright
                       : sev === 'non_responsive' ? color.status.risk
                       : color.status.warning;
        return (
          <Surface key={v.id} role="card" pad={dense ? 3 : 4} rad="md"
            style={{ display: 'flex', flexDirection: 'column', gap: dense ? space[1] : space[2],
              cursor: 'pointer', transition: 'opacity 0.18s ease-out' }}
            onClick={() => onPromote(v.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[3], minWidth: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flex: '0 0 auto' }} />
              <Text variant="bodyStrong" as="span"
                style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.name}
              </Text>
            </div>
            {!dense && (
              <Text variant="secondary" color={color.text.secondary}>{MESSAGE[sev](v)}</Text>
            )}
          </Surface>
        );
      })}
    </div>
  );
}

// ─── Demo driver ───────────────────────────────────────────────────────────
// Operational command bar. Compressed verbs. Segmented vendor-cycle cluster.
// Reset is visually demoted. Active-escalations reads as a system-status pill
// to parallel the LIVE indicator on the command layer.
// Forced single-line at every desktop width.
function DemoDriver({ vendors, onCycle, onCascade, onResolveAll, onReset }) {
  const activeCount = vendors.filter((v) => v.status !== 'nominal' && v.status !== 'resolved').length;

  const BTN_H = 40;

  // Standard operational button (single-line, 40px min target).
  const btn = {
    padding: `0 ${space[4]}px`,
    height: BTN_H,
    fontSize: type.size.sm,
    borderRadius: radius.sm,
    border: `1px solid ${color.border.subtle}`,
    background: 'transparent',
    color: color.text.secondary,
    cursor: 'pointer',
    fontFamily: type.family,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
  };

  // Segmented child button (no individual border; shares cluster shell).
  const seg = (isFirst) => ({
    padding: `0 ${space[3]}px`,
    height: BTN_H,
    fontSize: type.size.sm,
    borderRadius: 0,
    border: 'none',
    borderLeft: isFirst ? 'none' : `1px solid ${color.border.subtle}`,
    background: 'transparent',
    color: color.text.secondary,
    cursor: 'pointer',
    fontFamily: type.family,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
  });

  const active = activeCount > 0;

  return (
    <div style={{
      display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: space[3],
      padding: `${space[3]}px ${space[5]}px`,
      borderBottom: `1px solid ${color.border.subtle}`,
      background: color.surface.canvas,
      minHeight: BTN_H + 24,
    }}>
      <Text variant="label" color={color.text.tertiary} style={{ flexShrink: 0, letterSpacing: '0.14em' }}>
        DEMO DRIVER
      </Text>

      <button style={btn} onClick={onCascade}>Trigger cascade</button>

      {/* Segmented cycle cluster — "CYCLE" label band on the left, vendors share the shell.
          The cluster turns four redundant "Cycle X" buttons into one operational instrument. */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${color.border.subtle}`,
        borderRadius: radius.sm,
        overflow: 'hidden',
        flexShrink: 0,
        height: BTN_H,
      }}>
        <span style={{
          padding: `0 ${space[3]}px`,
          height: BTN_H,
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: type.family,
          fontSize: type.size.xs || 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: color.text.tertiary,
          borderRight: `1px solid ${color.border.subtle}`,
          background: 'rgba(255,255,255,0.025)',
        }}>CYCLE</span>
        <button style={seg(true)}  onClick={() => onCycle('catering')}>Catering</button>
        <button style={seg(false)} onClick={() => onCycle('florist')}>Florist</button>
        <button style={seg(false)} onClick={() => onCycle('av')}>AV</button>
        <button style={seg(false)} onClick={() => onCycle('photo')}>Photo</button>
      </div>

      <button style={btn} onClick={onResolveAll}>Clear all</button>

      <span style={{ flex: 1, minWidth: space[3] }} />

      {/* Demoted reset — text-only ambient affordance, never competes for attention. */}
      <button
        onClick={onReset}
        style={{
          padding: `0 ${space[3]}px`, height: BTN_H,
          fontSize: type.size.xs || 11,
          background: 'transparent', border: 'none',
          color: color.text.tertiary, cursor: 'pointer',
          fontFamily: type.family,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.65,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >reset</button>

      {/* System-status pill — parallels the LIVE indicator language.
          Quiet when count is 0; warm warning when threads are active. */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space[2],
        padding: `0 ${space[3]}px`,
        height: BTN_H,
        background: active ? 'rgba(226, 171, 81, 0.07)' : 'transparent',
        border: `1px solid ${active ? color.status.warning : color.border.subtle}`,
        borderRadius: radius.sm,
        flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: active ? color.status.warning : color.text.disabled,
        }} />
        <span style={{
          fontFamily: type.family,
          fontSize: type.size.xs || 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: active ? color.text.primary : color.text.tertiary,
          whiteSpace: 'nowrap',
        }}>
          ACTIVE {activeCount}
        </span>
      </div>
    </div>
  );
}

// ─── Workflow ──────────────────────────────────────────────────────────────
// URL-driven initial state for reproducible screenshot captures:
//   ?slice=desktop-density&state=cascade   — catering+floral delayed, AV non-responsive
//   ?slice=desktop-density&state=emergency — adds AV at emergency tier
function initialVendorsFromUrl() {
  const s = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('state')
    : null;
  if (s === 'cascade') {
    return INITIAL_VENDORS.map((v) =>
      v.id === 'catering' ? { ...v, status: 'delayed' }
      : v.id === 'florist' ? { ...v, status: 'delayed' }
      : v.id === 'av'      ? { ...v, status: 'non_responsive' }
      : v
    );
  }
  if (s === 'emergency') {
    return INITIAL_VENDORS.map((v) =>
      v.id === 'catering' ? { ...v, status: 'delayed' }
      : v.id === 'florist' ? { ...v, status: 'delayed' }
      : v.id === 'av'      ? { ...v, status: 'emergency' }
      : v
    );
  }
  return INITIAL_VENDORS;
}

function Workflow() {
  const [vendors, setVendors] = useState(initialVendorsFromUrl);
  const esc = useEscalation();
  const { setDensity } = useDensity();
  const w = useViewport();
  // Polish pass: tablet-landscape (≥1024) is an orchestration surface, not a
  // stretched phone. Promote it to true 3-zone orchestration — rail / active /
  // threads — with a tighter rail+threads to give the center room. Below 1024
  // (tablet portrait + mobile) we still stack threads.
  const isWide = w >= 1024;          // 3-zone orchestration territory
  const isLarge = w >= 1280;         // generous orchestration spacing

  // Severity-ordered non-nominal vendors. Primary = highest severity.
  const sorted = useMemo(
    () => [...vendors]
      .filter((v) => v.status !== 'nominal' && v.status !== 'resolved')
      .sort((a, b) => WEIGHT[b.status] - WEIGHT[a.status]),
    [vendors],
  );
  const primary = sorted[0] || null;
  const secondaries = sorted.slice(1);
  const isEmergency = primary?.status === 'emergency';

  // Sync app-level escalation + density signals so primitives respond.
  useEffect(() => {
    if (!primary) { esc.reset && esc.reset(); setDensity && setDensity('full'); return; }
    if (primary.status === 'emergency')          esc.setLevel && esc.setLevel('emergency');
    else if (primary.status === 'non_responsive') esc.setLevel && esc.setLevel('critical');
    else                                          esc.setLevel && esc.setLevel('warn');
    // Density collapses as severity rises or multiple threads pile up.
    const dense = isEmergency || sorted.length >= 3;
    setDensity && setDensity(dense ? 'collapsed' : (sorted.length >= 1 ? 'reduced' : 'full'));
  }, [primary?.id, primary?.status, sorted.length]); // eslint-disable-line

  const cycle = (id) => setVendors((vs) => vs.map((v) => {
    if (v.id !== id) return v;
    const i = LADDER.indexOf(v.status);
    return { ...v, status: i === -1 ? LADDER[1] : LADDER[(i + 1) % LADDER.length] };
  }));
  const cascade = () => setVendors((vs) => vs.map((v) => (
    v.id === 'catering' ? { ...v, status: 'delayed' }
    : v.id === 'florist'  ? { ...v, status: 'delayed' }
    : v.id === 'av'       ? { ...v, status: 'non_responsive' }
    : v
  )));
  const resolveOne = (id) => setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, status: 'resolved' } : v)));
  const resolveAll = () => setVendors((vs) => vs.map((v) => ({ ...v, status: 'nominal' })));
  const reset = () => setVendors(INITIAL_VENDORS);
  // Promote: swap a secondary into the primary slot by raising it above the current primary.
  // We simulate by setting it to one severity higher than the current primary (capped at emergency).
  const promote = (id) => setVendors((vs) => {
    const target = vs.find((v) => v.id === id); if (!target) return vs;
    const top = primary?.status || 'delayed';
    const topIdx = LADDER.indexOf(top);
    const newSev = LADDER[Math.min(topIdx + 1, LADDER.length - 1)];
    return vs.map((v) => (v.id === id ? { ...v, status: newSev } : v));
  });

  // 3-zone orchestration territory @ ≥1024. Tighter columns at tablet-landscape
  // (1024–1279) so the center keeps breathing room; full columns at ≥1280.
  const gridStyle = isLarge
    ? { display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 360px', gap: space[5], padding: space[5], alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }
    : isWide
    ? { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 280px', gap: space[4], padding: space[5], alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }
    : { display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)',         gap: space[5], padding: space[5], alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{
      minHeight: '100vh', background: color.surface.canvas,
      color: color.text.primary, display: 'flex', flexDirection: 'column',
      fontFamily: type.family,
    }}>
      <DemoDriver vendors={vendors} onCycle={cycle} onCascade={cascade} onResolveAll={resolveAll} onReset={reset} />
      <div style={gridStyle}>
        <ContextRail vendors={vendors} />
        <ActiveOrchestration primary={primary} onResolve={resolveOne} isEmergency={isEmergency} />
        {isWide ? (
          <SupportingThreads secondaries={secondaries} onPromote={promote} dense={isEmergency || secondaries.length >= 2 || !isLarge} />
        ) : (
          secondaries.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SupportingThreads secondaries={secondaries} onPromote={promote} dense={isEmergency || secondaries.length >= 2} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function DesktopDensitySlice() {
  return (
    <OperationalModeProvider initialMode="live">
      <EscalationProvider>
        <DensityProvider>
          <Workflow />
        </DensityProvider>
      </EscalationProvider>
    </OperationalModeProvider>
  );
}
