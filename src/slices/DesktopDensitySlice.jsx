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
  delayed:        (v) => `${v.role} delay · 25 min behind schedule`,
  non_responsive: (v) => `${v.role} non-responsive · 18 min, no contact`,
  emergency:      (v) => `${v.role} CRITICAL — direct action required now`,
};
const ACTIONS = {
  delayed:        { primary: 'Check ETA',          secondary: ['Notify next station', 'Reroute timeline'] },
  non_responsive: { primary: 'Call lead directly', secondary: ['Page backup',         'Escalate to venue'] },
  emergency:      { primary: 'CONTACT NOW',        secondary: ['Activate backup',     'Mark resolved'] },
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
function ActiveOrchestration({ primary, onResolve, isEmergency }) {
  if (!primary) {
    return (
      <Surface role="card" pad={6} rad="md"
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="secondary" color={color.text.tertiary}>All clear — no active escalations.</Text>
      </Surface>
    );
  }
  const sev = primary.status;
  const actions = ACTIONS[sev];
  const badgeStatus = STATUS_TO_BADGE[sev] || 'neutral';
  return (
    <Surface role={isEmergency ? 'escalation' : 'active'} pad={6} rad="md"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: space[6] }}>
      <div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3], marginTop: 'auto' }}>
        <Button priority={isEmergency ? 'escalation' : 'p1'} size="lg" full>{actions.primary}</Button>
        <div style={{ display: 'flex', gap: space[3] }}>
          {actions.secondary.map((a) => (
            <Button key={a} priority="p2" size="md" full>{a}</Button>
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
          Nothing else needs attention.
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
function DemoDriver({ vendors, onCycle, onCascade, onResolveAll, onReset }) {
  const activeCount = vendors.filter((v) => v.status !== 'nominal' && v.status !== 'resolved').length;
  const btn = {
    padding: '6px 10px', fontSize: type.size.sm, borderRadius: radius.sm,
    border: `1px solid ${color.border.subtle}`, background: 'transparent',
    color: color.text.secondary, cursor: 'pointer', fontFamily: type.family,
  };
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space[2],
      padding: `${space[3]}px ${space[5]}px`, borderBottom: `1px solid ${color.border.subtle}`,
      background: color.surface.canvas,
    }}>
      <Text variant="label" color={color.text.tertiary}>DEMO DRIVER</Text>
      <button style={btn} onClick={onCascade}>Trigger 3 cascading delays</button>
      <button style={btn} onClick={() => onCycle('catering')}>Cycle Catering</button>
      <button style={btn} onClick={() => onCycle('florist')}>Cycle Florist</button>
      <button style={btn} onClick={() => onCycle('av')}>Cycle AV</button>
      <button style={btn} onClick={() => onCycle('photo')}>Cycle Photo</button>
      <button style={btn} onClick={onResolveAll}>Resolve all</button>
      <button style={btn} onClick={onReset}>Reset</button>
      <span style={{ flex: 1 }} />
      <Text variant="caption" color={color.text.tertiary}>Active escalations: {activeCount}</Text>
    </div>
  );
}

// ─── Workflow ──────────────────────────────────────────────────────────────
function Workflow() {
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const esc = useEscalation();
  const { setDensity } = useDensity();
  const w = useViewport();
  const isDesktop = w >= 1100;

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

  const gridStyle = isDesktop
    ? { display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 360px', gap: space[5], padding: space[5], alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }
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
        {isDesktop ? (
          <SupportingThreads secondaries={secondaries} onPromote={promote} dense={isEmergency || secondaries.length >= 2} />
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
