// EventDayMode — Sprint 18B App.js graft surface.
//
// First migration of stable, runtime-proven NGW operational doctrine into the
// real product shell. Reachable via URL: ?mode=event-day&event=<eventId>
//
// What this surface uses (all PROVEN, all LOCKED):
//   · 3-zone orchestration ≥1024 (page 16 + Sprint 11 polish)
//   · Contained action widths 280 / 360 / 160 (page 44)
//   · Density collapse via DensityContext (existing)
//   · Single-P1 hierarchy via EscalationContext (existing)
//   · Command bar compression (Sprint 13)
//   · Canonical 5-tier severity + suppression rules (lib/severity.js · Sprint 18B)
//   · Runtime language authenticity (page 50 + Sprint 18A)
//   · Studio Matte tokens (design/tokens.js)
//
// What this surface does NOT use (deliberately deferred):
//   · Bleed-spine emergency state (page 47)
//   · Contamination wash (page 47)
//   · Command trench (page 48)
//   · Activity log / residue / scar tissue (pages 48–49)
//   · Partial authority release / procedural unevenness (page 49)
//   · Toggle primitive (page 45)
//
// The graft is additive. The existing App.js flow is untouched if the URL
// param is absent. Removing the param returns to normal app routing.

import { useMemo, useState } from 'react';
import {
  Surface, Text, Button, EscalationBadge,
  color, space, type, radius,
} from '../design';
import { EscalationProvider, useEscalation } from '../contexts/EscalationContext';
import { DensityProvider, useDensity } from '../contexts/DensityContext';
import { OperationalModeProvider } from '../contexts/OperationalModeContext';
import {
  toCanonical, SUPPRESSION, AUTHORITY, SEVERITY_LABEL,
} from '../lib/severity';

// ─── Viewport helper ──────────────────────────────────────────────────────
function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useMemo(() => {
    if (typeof window === 'undefined') return;
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

// ─── Containment widths (page 44) ─────────────────────────────────────────
function primaryWidthFor(viewportW, canonical) {
  if (viewportW < 768)  return { width: '100%' };
  if (viewportW < 1024) return { width: '100%' };
  if (viewportW < 1280) return { width: canonical === 'emergency' ? 320 : 260 };
  return { width: canonical === 'emergency' ? 360 : 280 };
}

// ─── Command bar (Sprint 13 compression) ──────────────────────────────────
function CommandBar({ event, canonical, holds }) {
  const dotColor = canonical === 'emergency' ? color.status.riskBright
                 : canonical === 'critical'  ? color.status.risk
                 : canonical === 'escalated' ? color.status.warning
                 : color.status.confirmed;
  const authColor = holds > 8 ? color.status.riskBright
                  : holds > 4 ? color.status.risk
                  : holds > 0 ? color.status.warning
                  : color.status.confirmed;
  return (
    <div style={{
      display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: space[3],
      padding: `${space[3]}px ${space[5]}px`,
      borderBottom: `1px solid ${color.border.subtle}`,
      background: color.surface.canvas,
      minHeight: 64,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <Text variant="label" color={color.text.primary} style={{ letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
        LIVE · {(event?.name || 'Event').toUpperCase()}
      </Text>
      <span style={{ flex: 1 }} />
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: space[2],
        padding: `6px ${space[3]}px`,
        background: holds > 0 ? 'rgba(226, 171, 81, 0.07)' : 'transparent',
        border: `1px solid ${authColor}`,
        borderRadius: radius.sm,
        flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: authColor }} />
        <span style={{
          fontFamily: type.family, fontSize: type.size.xs || 11,
          fontWeight: 700, letterSpacing: '0.14em',
          color: holds > 0 ? color.text.primary : color.text.tertiary,
          whiteSpace: 'nowrap',
        }}>
          {AUTHORITY[canonical].indicator}
        </span>
      </div>
    </div>
  );
}

// Normalize vendor entries: accept both plain strings and vendor objects.
function normalizeVendors(raw = []) {
  return raw.map((v) => (typeof v === 'string' ? { name: v } : v));
}

// ─── Left rail: event identity + vendor status ────────────────────────────
function LeftRail({ event, canonical }) {
  const supp = SUPPRESSION[canonical];
  const vendors = normalizeVendors(event?.vendors).slice(0, 7);
  return (
    <Surface role="card" pad={5} rad="md" style={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: space[5] }}>
      <div>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[2], letterSpacing: '0.14em' }}>EVENT</Text>
        <Text variant="heading" as="div">{event?.name || '—'}</Text>
        {supp.nonEssential && event?.date && (
          <Text variant="secondary" color={color.text.tertiary} as="div" style={{ marginTop: space[1] }}>
            {event.date}{event.venue ? ` · ${event.venue}` : ''}
          </Text>
        )}
      </div>
      <div>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[2], letterSpacing: '0.14em' }}>MODE</Text>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: space[2] }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color.atmosphere?.live || color.status.confirmed }} />
          <Text variant="bodyStrong" as="span">LIVE</Text>
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ marginBottom: space[3], letterSpacing: '0.14em' }}>
          {canonical === 'emergency' ? 'STATUS' : 'VENDOR STATUS'}
        </Text>
        {vendors.length === 0 && (
          <Text variant="secondary" color={color.text.tertiary}>No vendors yet.</Text>
        )}
        {vendors.map((v) => {
          // Map vendor.status (event-domain values) to severity dot color heuristically
          const isConcern = ['risk', 'concern', 'delayed', 'no_contact'].includes(v.status);
          const dotC = isConcern ? color.status.warning : color.status.confirmed;
          return (
            <div key={v.id || v.name}
              style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: `${space[2]}px 0` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotC, flexShrink: 0 }} />
              <Text variant="secondary" as="span" color={isConcern ? color.text.primary : color.text.tertiary}
                style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {canonical === 'emergency' ? (v.category || v.name).slice(0, 6).toUpperCase() : v.name}
              </Text>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

// ─── Center zone: active issue + primary action ───────────────────────────
function ActiveCenter({ event, canonical, viewportW, onResolve }) {
  const supp = SUPPRESSION[canonical];
  const normVendors = normalizeVendors(event?.vendors);
  // The "active" vendor — first one flagged at concern level, else first vendor
  const active = normVendors.find(v => ['risk','concern','delayed','no_contact'].includes(v.status))
              || normVendors[0];

  if (canonical === 'nominal') {
    return (
      <Surface role="card" pad={6} rad="md"
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="secondary" color={color.text.tertiary}>All clear · no active escalations · monitoring</Text>
      </Surface>
    );
  }

  if (canonical === 'recovery') {
    return (
      <Surface role="card" pad={6} rad="md" style={{ height: '100%' }}>
        <Text variant="label" color={color.text.tertiary} as="div" style={{ letterSpacing: '0.14em', marginBottom: space[2] }}>POST-INCIDENT</Text>
        <Text variant="title" as="div">All clear</Text>
        <Text variant="secondary" color={color.text.tertiary} as="div" style={{ marginTop: space[2] }}>
          Stabilized · monitoring resumed
        </Text>
      </Surface>
    );
  }

  // escalated / critical / emergency
  const badgeStatus = canonical === 'emergency' ? 'emergency'
                    : canonical === 'critical'  ? 'risk'
                    : 'warning';
  const surfaceRole = canonical === 'emergency' ? 'escalation' : 'active';
  const primarySize = canonical === 'emergency' ? 'xl' : 'lg';
  const primaryLabel = canonical === 'emergency' ? 'CONTACT NOW'
                     : canonical === 'critical'  ? 'Call lead directly'
                     : 'Check ETA';
  const primaryStyle = primaryWidthFor(viewportW, canonical);
  const primaryIsFull = primaryStyle.width === '100%';

  const vendorRole = active?.category || active?.name || 'Vendor';
  // B5 — this harness has no real arrivals feed, so it must not assert fabricated
  // durations ("18 min", "25 min behind"). Honest, non-numeric status until the view
  // is wired to compute from real vendor arrival/ETA data.
  const subtitle = canonical === 'emergency' ? `${vendorRole} · direct action required now`
                 : canonical === 'critical'  ? `${vendorRole} · no contact yet`
                 : `${vendorRole} · running behind`;

  return (
    <Surface role={surfaceRole} pad={6} rad="md"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: space[6] }}>
      <div style={{ maxWidth: 520 }}>
        <EscalationBadge status={badgeStatus}>
          {SEVERITY_LABEL[canonical]}
        </EscalationBadge>
        <Text variant="title" as="div" style={{ marginTop: space[3] }}>
          {active?.name || vendorRole}
        </Text>
        <Text variant="bodyStrong" as="div"
          color={canonical === 'emergency' || canonical === 'critical' ? color.status.riskText : color.status.warningText}
          style={{ marginTop: space[2] }}>
          {subtitle}
        </Text>
      </div>
      {/* Action anchor — contained widths, bottom-left, no card-within-card. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3], marginTop: 'auto', alignItems: 'flex-start' }}>
        <Button
          priority={canonical === 'emergency' || canonical === 'critical' ? 'escalation' : 'p1'}
          size={primarySize}
          full={primaryIsFull}
          style={primaryIsFull ? undefined : primaryStyle}
          onClick={() => {
            // Sprint 52B — wire the primary escalation CTA to a real contact
            // action so it goes somewhere: call, then email, then acknowledge.
            if (active?.phone) window.open(`tel:${active.phone}`, '_self');
            else if (active?.contact) window.open(`mailto:${active.contact}`, '_blank');
            else if (onResolve) onResolve();
          }}
        >
          {primaryLabel}
        </Button>
        {/* Sprint 52B — removed the non-functional escalation buttons (Page
            backup / Notify next station / Reroute timeline / Move to backup):
            they had no backing behaviour. The primary contact action and
            "Mark resolved" below are the real, wired CTAs. */}
        <Button priority="ambient" size="sm" onClick={onResolve}>Mark resolved</Button>
      </div>
    </Surface>
  );
}

// ─── Right rail: supporting threads ───────────────────────────────────────
function SupportingThreads({ event, canonical }) {
  const supp = SUPPRESSION[canonical];
  // Threads = vendors that aren't the active focus. Cap and adapt per supp.
  const others = normalizeVendors(event?.vendors).filter(v => !['risk','concern','delayed','no_contact'].includes(v.status)).slice(0, 4);
  if (canonical === 'nominal' || canonical === 'recovery') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[2], minWidth: 0 }}>
        <Text variant="label" color={color.text.tertiary} style={{ letterSpacing: '0.14em' }}>THREADS</Text>
        <Text variant="secondary" color={color.text.tertiary} style={{ marginTop: space[2] }}>
          All other threads nominal · monitoring
        </Text>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[3], minWidth: 0 }}>
      <Text variant="label" color={color.text.tertiary} style={{ letterSpacing: '0.14em' }}>
        OTHER THREADS ({others.length})
      </Text>
      {others.length === 0 && (
        <Text variant="secondary" color={color.text.tertiary}>All other threads nominal · monitoring</Text>
      )}
      {others.map((v) => {
        if (supp.threadDetail === 'codes') {
          const code = (v.category || v.name || '?').slice(0, 3).toUpperCase();
          return (
            <div key={v.id || v.name} style={{ display: 'flex', alignItems: 'center', gap: space[2], minWidth: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color.status.warning }} />
              <Text variant="caption" as="span" style={{ letterSpacing: '0.14em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {code}
              </Text>
            </div>
          );
        }
        return (
          <Surface key={v.id || v.name} role="card" pad={supp.threadDetail === 'compressed' ? 3 : 4} rad="md"
            style={{ display: 'flex', flexDirection: 'column', gap: supp.threadDetail === 'compressed' ? space[1] : space[2] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[3], minWidth: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color.status.confirmed }} />
              <Text variant="bodyStrong" as="span"
                style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.name}
              </Text>
            </div>
            {supp.threadDetail !== 'compressed' && v.category && (
              <Text variant="secondary" color={color.text.secondary}>{v.category}</Text>
            )}
          </Surface>
        );
      })}
    </div>
  );
}

// ─── Demo driver (test harness — clearly labelled, never product chrome) ─
function DemoDriver({ canonical, setLevel, onReset }) {
  const BTN_H = 36;
  const btn = (active) => ({
    padding: `0 ${space[3]}px`, height: BTN_H,
    fontSize: type.size.sm, borderRadius: radius.sm,
    border: `1px solid ${active ? color.border.strong : color.border.subtle}`,
    background: active ? color.surface.card : 'transparent',
    color: active ? color.text.primary : color.text.secondary,
    cursor: 'pointer', fontFamily: type.family,
    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
  });
  return (
    <div style={{
      display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: space[2],
      padding: `${space[2]}px ${space[5]}px`,
      borderBottom: `1px solid ${color.border.subtle}`,
      background: color.surface.canvas,
    }}>
      <Text variant="label" color={color.text.tertiary} style={{ letterSpacing: '0.14em', flexShrink: 0 }}>
        TEST HARNESS
      </Text>
      {['nominal','escalated','critical','emergency','recovery'].map((s) => (
        <button key={s} style={btn(canonical === s)} onClick={() => setLevel(s)}>
          {s}
        </button>
      ))}
      <span style={{ flex: 1 }} />
      <button onClick={onReset}
        style={{
          padding: `0 ${space[3]}px`, height: BTN_H,
          fontSize: type.size.xs || 11, background: 'transparent', border: 'none',
          color: color.text.tertiary, cursor: 'pointer', fontFamily: type.family,
          letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, flexShrink: 0,
        }}
      >reset</button>
    </div>
  );
}

// ─── Inner workflow (consumes providers) ───────────────────────────────────
function EventDayWorkflow({ event, onExit }) {
  const esc = useEscalation();
  const { density } = useDensity();
  const w = useViewport();

  // Map current escalation context level → canonical 5-tier
  // The context only has 4 tiers; treat 'caution' as 'escalated'.
  // We also track a UI-level 'recovery' flag locally for the demo driver.
  const [recovery, setRecovery] = useState(false);
  const canonical = recovery ? 'recovery' : toCanonical(esc.level);
  const holds = AUTHORITY[canonical].holdsOf14;

  const isWide = w >= 1024;
  const isLarge = w >= 1280;

  function setCanonicalLevel(target) {
    setRecovery(target === 'recovery');
    if (target === 'recovery') { esc.setLevel('nominal'); return; }
    // map canonical → legacy ladder so DensityContext + button primaries still resolve
    const legacy = target === 'critical' ? 'escalated'
                 : target === 'emergency' ? 'emergency'
                 : target === 'escalated' ? 'escalated'
                 : 'nominal';
    esc.setLevel(legacy);
  }

  function resetAll() { setRecovery(false); esc.setLevel('nominal'); }

  // Grid widths track Sprint 11 polish (≥1024 = 3-zone, ≥1280 = wider, else stack)
  const grid = isLarge
    ? { display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 360px', gap: space[5], padding: space[5], alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }
    : isWide
    ? { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 280px', gap: space[4], padding: space[5], alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }
    : { display: 'flex', flexDirection: 'column', gap: space[4], padding: space[5], width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{
      minHeight: '100vh', background: color.surface.canvas,
      color: color.text.primary, display: 'flex', flexDirection: 'column',
      fontFamily: type.family,
    }}>
      <CommandBar event={event} canonical={canonical} holds={holds} />
      <DemoDriver canonical={canonical} setLevel={setCanonicalLevel} onReset={resetAll} />
      <div style={grid}>
        <LeftRail event={event} canonical={canonical} />
        <ActiveCenter event={event} canonical={canonical} viewportW={w} onResolve={() => setCanonicalLevel('recovery')} />
        {isWide ? (
          <SupportingThreads event={event} canonical={canonical} />
        ) : (
          <SupportingThreads event={event} canonical={canonical} />
        )}
      </div>
      {/* Exit affordance — never product chrome; clearly labelled as test surface */}
      <div style={{
        padding: `${space[3]}px ${space[5]}px`,
        borderTop: `1px solid ${color.border.subtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text variant="caption" color={color.text.tertiary}>
          Sprint 18B graft · canonical severity · density: {density} · viewport: {w}px
        </Text>
        {onExit && (
          <button onClick={onExit}
            style={{
              padding: `6px ${space[3]}px`, fontSize: type.size.xs || 11,
              background: 'transparent', border: `1px solid ${color.border.subtle}`,
              color: color.text.secondary, cursor: 'pointer', borderRadius: radius.sm,
              fontFamily: type.family,
            }}
          >← Exit event-day mode</button>
        )}
      </div>
    </div>
  );
}

// ─── Outer component (provides context) ───────────────────────────────────
export default function EventDayMode({ event, onExit }) {
  return (
    <OperationalModeProvider initialMode="live">
      <EscalationProvider initialLevel="nominal">
        <DensityProvider>
          <EventDayWorkflow event={event} onExit={onExit} />
        </DensityProvider>
      </EscalationProvider>
    </OperationalModeProvider>
  );
}
