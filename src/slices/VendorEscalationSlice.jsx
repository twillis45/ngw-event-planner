// VendorEscalationSlice — Sprint 10 vertical slice / operational proving
// ground. Integrates every Sprint 9 primitive + adaptive context into ONE
// real workflow: vendor delayed → escalation → density reduction →
// escalation becomes structural primary → bottom sheet actions → resolve →
// nominal. Additive: reachable via index.js ?slice=vendor, App.js untouched.
import { useState, useEffect } from 'react';
import {
  Surface, Text, Button, AlertBanner, EscalationBadge, BottomSheet,
  color, space, visibleCountFor,
} from '../design';
import { EscalationProvider, useEscalation } from '../contexts/EscalationContext';
import { DensityProvider, useDensity } from '../contexts/DensityContext';
import { OperationalModeProvider } from '../contexts/OperationalModeContext';

function useViewport() {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [w, setW] = useState(get());
  useEffect(() => {
    const on = () => setW(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

const VENDORS = [
  { id: 'floral', name: 'Floral Co.', meta: 'On site · 4 tasks', status: 'confirmed' },
  { id: 'av', name: 'Sound & AV', meta: 'Setup complete', status: 'confirmed' },
  { id: 'catering', name: 'Catering', meta: 'On schedule · ETA 14:30', status: 'confirmed', focal: true },
  { id: 'photo', name: 'Photography', meta: 'En route · ETA 14:50', status: 'confirmed' },
  { id: 'bar', name: 'Bar Service', meta: 'On site', status: 'confirmed' },
];

function VendorRow({ v, active }) {
  return (
    <Surface role={active ? 'active' : 'card'} pad={4} rad="md" style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', flex: '0 0 auto',
        background: v.status === 'delayed' ? color.status.warning : color.status.confirmed }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text variant="bodyStrong" as="div">{v.name}</Text>
        <Text variant="secondary" as="div" color={v.status === 'delayed' ? color.status.warningText : undefined}>{v.meta}</Text>
      </div>
    </Surface>
  );
}

// Desktop action containment (Figma 44_Desktop_Containment_Rules):
//   mobile (<768)            → full
//   tablet portrait (≥768)   → full (acts as ~100% column)
//   tablet landscape (≥1024) → 60–75% of right pane (use ~75% via contained widths)
//   desktop (≥1280)          → contained 280 (escalation) / 360 (emergency)
// Returns a style object applied to the primary action button.
// Mass at emergency comes from the Button's xl size growth, NOT extra width.
function primaryWidthFor(viewportW, severity) {
  if (viewportW < 768) return { width: '100%' };                       // mobile: full
  if (viewportW < 1024) return { width: '100%' };                      // tablet portrait: full column
  if (viewportW < 1280) return { width: severity === 'emergency' ? 320 : 260 }; // tablet landscape: contained, slightly tighter
  return { width: severity === 'emergency' ? 360 : 280 };              // desktop: canonical 280 / 360
}

function Workflow() {
  const esc = useEscalation();
  const { density } = useDensity();
  const vw = useViewport();
  const wide = vw >= 768;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resolvedNote, setResolvedNote] = useState(null);

  // Drive the scenario.
  const focal = VENDORS.find((v) => v.focal);
  const delayed = esc.isEscalated;
  const vendors = VENDORS.map((v) => (v.focal && delayed
    ? { ...v, status: 'delayed', meta: esc.emergency ? 'No contact · cocktail hour at risk' : '45 min behind · no ETA' }
    : v));

  // Density reduction: how many nominal vendors stay visible.
  const nominalVendors = vendors.filter((v) => !v.focal);
  const showCount = visibleCountFor(density, nominalVendors.length);
  const visibleNominal = nominalVendors.slice(0, showCount);
  const hiddenCount = nominalVendors.length - visibleNominal.length;

  const severity = esc.emergency ? 'emergency' : (esc.isEscalated ? 'escalated' : 'nominal');

  function triggerDelay() { esc.setLevel('escalated'); setResolvedNote(null); setSheetOpen(true); }
  function goEmergency() { esc.setLevel('emergency'); setSheetOpen(true); }
  function resolve() { esc.setLevel('nominal'); setSheetOpen(false); setResolvedNote('Catering rerouted · arrived 15:22 · back on timeline'); }

  // The single structural primary is chosen by context (escalation when escalated).
  // Desktop containment: primary action is no longer full-width on tablet-landscape+.
  // Mass at emergency comes from the surface + button-size growth, not width.
  const primaryStyle = primaryWidthFor(vw, severity);
  const primaryIsFull = primaryStyle.width === '100%';
  const primaryAction = esc.isEscalated
    ? <Button priority="escalation" full={primaryIsFull} style={primaryIsFull ? undefined : primaryStyle} onClick={() => setSheetOpen(true)}>{esc.emergency ? 'CONTACT VENUE NOW' : 'Escalate to lead'}</Button>
    : <Button priority="p1"        full={primaryIsFull} style={primaryIsFull ? undefined : primaryStyle} onClick={() => setSheetOpen(true)}>Vendor actions</Button>;

  const issuePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
      {severity !== 'nominal' && (
        <AlertBanner
          severity={severity}
          title={esc.emergency ? 'Catering — no contact' : 'Catering — 45 min behind'}
          body={esc.emergency ? 'Cocktail hour at risk · contact venue now' : 'No confirmed ETA · last contact 12 min ago'}
        />
      )}
      {resolvedNote && <AlertBanner severity="resolved" title="Stabilized" body={resolvedNote} />}
      {severity === 'nominal' && !resolvedNote && (
        <Surface role="card" pad={5}>
          <Text variant="label" as="div" style={{ marginBottom: space[2] }}>VENDOR STATUS</Text>
          <Text variant="body" as="div">All vendors nominal · catering on schedule</Text>
        </Surface>
      )}
      {/* Action anchor — bottom-left of orchestration column on desktop, full-width on mobile.
          Polish pass: a quiet top-margin band on tablet-landscape+ to assert negative-space
          confidence around the primary; mobile keeps the natural stacking rhythm. */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: vw >= 1024 ? space[3] : 0 }}>
        {primaryAction}
      </div>
    </div>
  );

  const contextPane = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="label">VENDORS{esc.isEscalated ? ' · focus mode' : ''}</Text>
        <EscalationBadge status={severity === 'nominal' ? 'confirmed' : (esc.emergency ? 'emergency' : 'warning')}>
          {severity === 'nominal' ? 'NOMINAL' : (esc.emergency ? 'EMERGENCY' : 'ESCALATED')}
        </EscalationBadge>
      </div>
      <VendorRow v={vendors.find((v) => v.focal)} active />
      {visibleNominal.map((v) => <VendorRow key={v.id} v={v} />)}
      {hiddenCount > 0 && (
        <Text variant="caption" as="div">{hiddenCount} nominal vendor{hiddenCount > 1 ? 's' : ''} hidden — focus on the issue</Text>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: color.surface.canvas, color: color.text.primary, padding: space[6], boxSizing: 'border-box' }}>
      {/* demo driver (explicitly a test harness, not product chrome) */}
      <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap', marginBottom: space[6], paddingBottom: space[4], borderBottom: `1px solid ${color.border.default}` }}>
        <Text variant="caption" style={{ width: '100%' }}>DEMO DRIVER — vendor escalation walkthrough · {wide ? 'tablet/desktop two-pane' : 'mobile single-column'} · density: {density}</Text>
        <Button priority="p2" onClick={triggerDelay}>Trigger delay</Button>
        <Button priority="p2" onClick={goEmergency}>Emergency</Button>
        <Button priority="ambient" onClick={resolve}>Resolve / reset</Button>
      </div>

      {wide ? (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: space[6], alignItems: 'start' }}>
          <Surface role="canvas" border={false} pad={0}>{contextPane}</Surface>
          <div>{issuePanel}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>
          {issuePanel}
          {contextPane}
        </div>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={esc.emergency ? 'Emergency — Catering' : 'Catering — operational actions'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
          <Button priority={esc.isEscalated ? 'escalation' : 'p1'} full onClick={() => {}}>{esc.emergency ? 'CONTACT VENUE NOW' : 'Contact vendor'}</Button>
          <Button priority="p2" full onClick={() => {}}>Reroute timeline</Button>
          <Button priority="ambient" full onClick={resolve}>Mark resolved</Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function VendorEscalationSlice() {
  // Optional URL-driven initial state for reproducible screenshot captures:
  //   ?slice=vendor&state=escalation
  //   ?slice=vendor&state=emergency
  const initial = (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('state')
    : null) || 'nominal';
  const initialLevel = initial === 'emergency' ? 'emergency'
                     : initial === 'escalation' ? 'escalated'
                     : 'nominal';
  return (
    <OperationalModeProvider initialMode="live">
      <EscalationProvider initialLevel={initialLevel}>
        <DensityProvider>
          <Workflow />
        </DensityProvider>
      </EscalationProvider>
    </OperationalModeProvider>
  );
}
