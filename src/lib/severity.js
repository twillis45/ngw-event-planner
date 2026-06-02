// Canonical 5-tier severity model · Sprint 18B
//
// The slices use two ladders that don't agree:
//   EscalationContext: ['nominal','caution','escalated','emergency']
//   DesktopDensitySlice: ['nominal','delayed','non_responsive','emergency']
//
// Sprint 18B directive: unify into a runtime-canonical 5-tier model
//   nominal · escalated · critical · emergency · recovery
//
// This file is ADDITIVE. It does not modify existing contexts. Consumers can
// opt into the canonical model via toCanonical() / SEVERITY_ORDER / SUPPRESSION.
// The existing slice/context ladders continue to work unchanged.

export const SEVERITY = {
  NOMINAL:    'nominal',
  ESCALATED:  'escalated',
  CRITICAL:   'critical',
  EMERGENCY:  'emergency',
  RECOVERY:   'recovery',
};

export const SEVERITY_ORDER = ['nominal', 'escalated', 'critical', 'emergency', 'recovery'];

// Map any of the legacy ladders into canonical severity.
//   EscalationContext: nominal | caution | escalated | emergency
//   Density slice:     nominal | delayed | non_responsive | emergency | resolved
export function toCanonical(level) {
  if (!level) return 'nominal';
  switch (String(level).toLowerCase()) {
    case 'caution':
    case 'delayed':
    case 'warn':
      return 'escalated';
    case 'non_responsive':
    case 'critical':
      return 'critical';
    case 'emergency':
      return 'emergency';
    case 'resolved':
    case 'recovery':
    case 'post-incident':
      return 'recovery';
    case 'escalated':
      return 'escalated';
    case 'nominal':
    default:
      return 'nominal';
  }
}

// Suppression rules per severity tier. Each consumer (left rail, center,
// command surface, thread track) can read these and react consistently.
// Numbers are intent, not pixels — let downstream layout decide.
//
//   showVendorMeta:  do vendor rows include description beyond name?
//   threadDetail:    'card' (full meta) | 'compressed' (one line) | 'codes' (CODE only)
//   commandSet:      'full' | 'narrowed' | 'minimal' (which actions visible)
//   nonEssential:    boolean — render non-essential metadata (timestamps, helper labels)
//   density:         'full' | 'compact' | 'crisis'
export const SUPPRESSION = {
  nominal:   { showVendorMeta: true,  threadDetail: 'card',       commandSet: 'full',     nonEssential: true,  density: 'full' },
  escalated: { showVendorMeta: true,  threadDetail: 'compressed', commandSet: 'narrowed', nonEssential: true,  density: 'compact' },
  critical:  { showVendorMeta: false, threadDetail: 'compressed', commandSet: 'narrowed', nonEssential: false, density: 'compact' },
  emergency: { showVendorMeta: false, threadDetail: 'codes',      commandSet: 'minimal',  nonEssential: false, density: 'crisis' },
  recovery:  { showVendorMeta: true,  threadDetail: 'compressed', commandSet: 'full',     nonEssential: true,  density: 'compact' },
};

// Authority distribution per severity tier — runtime hypothesis from doctrine
// page 46. Used by surfaces that want to display SYSTEM/OPERATOR ratio.
//   holdsOf14: how many of 14 hypothetical operational controls the system holds
export const AUTHORITY = {
  nominal:   { holdsOf14: 0,  indicator: 'OPERATOR · 14 LIVE' },
  escalated: { holdsOf14: 3,  indicator: 'SYSTEM HOLDING · 3 OF 14' },
  critical:  { holdsOf14: 9,  indicator: 'SYSTEM HOLDING · 9 OF 14' },
  emergency: { holdsOf14: 12, indicator: 'SYSTEM HOLDING · 12 OF 14' },
  recovery:  { holdsOf14: 0,  indicator: 'OPERATOR · 14 LIVE' },
};

// Operator-authentic labels per severity tier · Sprint 18A language doctrine.
export const SEVERITY_LABEL = {
  nominal:   'NOMINAL',
  escalated: 'ESCALATED',
  critical:  'CRITICAL',
  emergency: 'EMERGENCY',
  recovery:  'POST-INCIDENT',
};

// Sub-label / subtitle text per tier — short, real, operator-authentic.
export const SEVERITY_SUBLINE = {
  nominal:   'monitoring',
  escalated: 'awaiting reply',
  critical:  'no contact',
  emergency: 'direct action required now',
  recovery:  'stabilized',
};
