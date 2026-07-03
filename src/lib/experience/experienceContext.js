// ─── Experience Context (XIP-1 Bundle A) ──────────────────────────────────────
// Defines the projection inputs: Role, Phase, Situation, Workspace.
// Pure data + factories. No knowledge ownership. No side effects.

// ── Roles ─────────────────────────────────────────────────────────────────────
// Every role that might interact with an event, with their natural workspace ordering.
export const ROLES = {
  host: {
    label: 'Host',
    persona: 'social',
    primaryConcern: 'guests & food',
    decisionStyle: 'practical',
    workspaceOrder: ['food', 'shopping', 'guests', 'tasks', 'contingencies', 'timeline'],
    decisionBlocks: ['food', 'guests', 'logistics'],
  },
  planner: {
    label: 'Professional Planner',
    persona: 'professional',
    primaryConcern: 'operations & budget',
    decisionStyle: 'strategic',
    workspaceOrder: ['budget', 'vendors', 'timeline', 'tasks', 'documents', 'guests'],
    decisionBlocks: null,  // planners see all
  },
  coordinator: {
    label: 'Coordinator',
    persona: 'operational',
    primaryConcern: 'execution & vendors',
    decisionStyle: 'tactical',
    workspaceOrder: ['timeline', 'vendors', 'tasks', 'contingencies', 'guests', 'staffing'],
    decisionBlocks: ['logistics', 'staffing', 'vendor', 'timeline'],
  },
  corporate: {
    label: 'Corporate Planner',
    persona: 'corporate',
    primaryConcern: 'compliance & approvals',
    decisionStyle: 'process',
    workspaceOrder: ['compliance', 'approvals', 'budget', 'vendors', 'documents', 'timeline'],
    decisionBlocks: ['compliance', 'budget', 'logistics'],
  },
  venue: {
    label: 'Venue Manager',
    persona: 'venue',
    primaryConcern: 'capacity & logistics',
    decisionStyle: 'operational',
    workspaceOrder: ['capacity', 'setup', 'timeline', 'logistics', 'cleanup', 'staffing'],
    decisionBlocks: ['logistics', 'staffing'],
  },
  photographer: {
    label: 'Photographer',
    persona: 'creative',
    primaryConcern: 'timeline & conditions',
    decisionStyle: 'moment-driven',
    workspaceOrder: ['timeline', 'logistics', 'contingencies'],
    decisionBlocks: ['timeline', 'logistics'],
  },
  operations: {
    label: 'Operations Manager',
    persona: 'ops',
    primaryConcern: 'logistics & staffing',
    decisionStyle: 'systematic',
    workspaceOrder: ['logistics', 'staffing', 'timeline', 'contingencies', 'inventory'],
    decisionBlocks: ['logistics', 'staffing', 'timeline'],
  },
  caterer: {
    label: 'Caterer',
    persona: 'food',
    primaryConcern: 'food & quantities',
    decisionStyle: 'precise',
    workspaceOrder: ['food', 'quantities', 'timeline', 'dietary', 'shopping'],
    decisionBlocks: ['food'],
  },
  family: {
    label: 'Family Member',
    persona: 'social',
    primaryConcern: 'help & participation',
    decisionStyle: 'simple',
    workspaceOrder: ['tasks', 'guests', 'timeline'],
    decisionBlocks: ['guests', 'food'],
  },
  guest: {
    label: 'Guest',
    persona: 'attendee',
    primaryConcern: 'attendance & logistics',
    decisionStyle: 'minimal',
    workspaceOrder: ['logistics'],
    decisionBlocks: [],
  },
};

// ── Phases ────────────────────────────────────────────────────────────────────
// Every operational phase, with days-out range and primary focus surfaces.
export const PHASES = {
  planning:    { label: 'Planning',    daysOutMin: 61, daysOutMax: Infinity, primary: ['decisions', 'budget', 'vendors', 'dates'] },
  research:    { label: 'Research',    daysOutMin: 31, daysOutMax: 60,       primary: ['vendors', 'pricing', 'venues', 'logistics'] },
  booking:     { label: 'Booking',     daysOutMin: 15, daysOutMax: 30,       primary: ['contracts', 'deposits', 'confirmations'] },
  purchasing:  { label: 'Purchasing',  daysOutMin: 3,  daysOutMax: 14,       primary: ['shopping', 'quantities', 'food', 'supplies'] },
  preparation: { label: 'Preparation', daysOutMin: 1,  daysOutMax: 7,        primary: ['tasks', 'checklist', 'contingencies'] },
  setup:       { label: 'Setup',       daysOutMin: 0,  daysOutMax: 1,        primary: ['timeline', 'logistics', 'staffing'] },
  execution:   { label: 'Day-Of',      daysOutMin: 0,  daysOutMax: 0,        primary: ['timeline', 'contingencies', 'monitoring'] },
  cleanup:     { label: 'Cleanup',     daysOutMin: -2, daysOutMax: -1,       primary: ['tasks', 'inventory', 'returns'] },
  closeout:    { label: 'Closeout',    daysOutMin: -7, daysOutMax: -2,       primary: ['payments', 'feedback', 'receipts'] },
  learning:    { label: 'Post-Event',  daysOutMin: -Infinity, daysOutMax: -7, primary: ['failures', 'improvements', 'archives'] },
};

// ── Situation types ────────────────────────────────────────────────────────────
// Live conditions that reorganize the experience surface.
export const SITUATION_TYPES = [
  { id: 'vendor-late',        label: 'Vendor Late',        severity: 'high',     surface: ['contingencies', 'vendors', 'timeline'],    triggerKey: 'vendorLate' },
  { id: 'budget-exceeded',    label: 'Budget Exceeded',    severity: 'high',     surface: ['substitutions', 'budget', 'priorities'],   triggerKey: 'budgetExceeded' },
  { id: 'weather-alert',      label: 'Weather Alert',      severity: 'med',      surface: ['contingencies', 'logistics'],              triggerKey: 'weatherAlert' },
  { id: 'attendance-spike',   label: 'Attendance Over',    severity: 'med',      surface: ['quantities', 'food', 'capacity'],          triggerKey: 'attendanceSpike' },
  { id: 'attendance-drop',    label: 'Attendance Under',   severity: 'low',      surface: ['quantities', 'budget'],                    triggerKey: 'attendanceDrop' },
  { id: 'food-delay',         label: 'Food Delay',         severity: 'high',     surface: ['timeline', 'contingencies', 'food'],       triggerKey: 'foodDelay' },
  { id: 'power-issue',        label: 'Power Issue',        severity: 'high',     surface: ['contingencies', 'logistics', 'safety'],    triggerKey: 'powerIssue' },
  { id: 'timeline-drift',     label: 'Timeline Drift',     severity: 'med',      surface: ['timeline', 'tasks', 'staffing'],           triggerKey: 'timelineDrift' },
  { id: 'permit-issue',       label: 'Permit Issue',       severity: 'high',     surface: ['compliance', 'logistics'],                 triggerKey: 'permitIssue' },
  { id: 'venue-change',       label: 'Venue Change',       severity: 'critical', surface: ['logistics', 'guests', 'contingencies'],    triggerKey: 'venueChange' },
  { id: 'heat-advisory',      label: 'Heat Advisory',      severity: 'med',      surface: ['contingencies', 'food', 'guests'],         triggerKey: 'heatAdvisory' },
  { id: 'equipment-failure',  label: 'Equipment Failure',  severity: 'high',     surface: ['contingencies', 'logistics', 'staffing'],  triggerKey: 'equipmentFailure' },
];

// ── Phase resolver ─────────────────────────────────────────────────────────────
// Derives current phase from daysToEvent. Returns 'planning' on missing/invalid input.
export function resolvePhase(daysToEvent) {
  if (daysToEvent === null || daysToEvent === undefined) return 'planning';
  const d = Number(daysToEvent);
  if (isNaN(d)) return 'planning';
  if (d > 60) return 'planning';
  if (d > 30) return 'research';
  if (d > 14) return 'booking';
  if (d > 7) return 'purchasing';
  if (d > 1) return 'preparation';
  if (d > 0) return 'setup';
  if (d >= 0) return 'execution';
  if (d >= -2) return 'cleanup';
  if (d >= -7) return 'closeout';
  return 'learning';
}

// ── Situation detector ─────────────────────────────────────────────────────────
// Reads eventState flags and returns active situation IDs.
export function detectSituations(eventState = {}) {
  return SITUATION_TYPES
    .filter((s) => {
      if (s.triggerKey === 'budgetExceeded') return eventState.budgetPct > 1.0 || eventState.budgetExceeded;
      if (s.triggerKey === 'attendanceSpike') return eventState.attendanceSpike || (eventState.confirmedCount > eventState.plannedCount * 1.15);
      if (s.triggerKey === 'attendanceDrop') return eventState.attendanceDrop || (eventState.confirmedCount < eventState.plannedCount * 0.7);
      return eventState[s.triggerKey] === true;
    })
    .map((s) => s.id);
}

// ── Context factory ────────────────────────────────────────────────────────────
// All projection inputs in one frozen object. Auto-resolves phase + situations from eventState.
export function createContext({
  role = 'host',
  phase = null,
  situations = null,
  workspace = null,
  permissions = ['read'],
  objectives = [],
  eventState = {},
  scope = null,
  asOf = null,
} = {}) {
  const resolvedRole = ROLES[role] ? role : 'host';
  const resolvedPhase = phase || resolvePhase(eventState.daysToEvent);
  const resolvedWorkspace = workspace || ROLES[resolvedRole]?.workspaceOrder?.[0] || 'tasks';
  const resolvedSituations = situations !== null ? situations : detectSituations(eventState);
  return Object.freeze({
    role: resolvedRole,
    phase: resolvedPhase,
    situations: resolvedSituations,
    workspace: resolvedWorkspace,
    permissions,
    objectives,
    eventState,
    scope,
    asOf: asOf || new Date().toISOString().slice(0, 10),
  });
}
