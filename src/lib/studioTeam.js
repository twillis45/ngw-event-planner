// Sprint 52B — Studio Team operational bridge (P0).
// Bridges the existing Studio Team *identity* layer (studios / studio_members /
// invitations in Supabase) into real event operations: crew assignment, task
// ownership, Command Center readiness, Day-of manifest.
//
// Design notes:
//  • The studio ROSTER (who is in the studio) is kept in localStorage
//    ('ngw-studio-team') so it works offline and in dev, AND carries the
//    name + phone the crew manifest needs (studio_members only has email+role).
//    When Supabase is configured, mergeSupabaseMembers() folds invited members
//    into the roster, non-destructively, keyed by email.
//  • Per-event CREW is stored on the event object (event.crew[]) — same pattern
//    as event.vendors / event.guests. No new table, no migration, no RLS change.
//    Solo events simply have no crew array and keep working unchanged.

const TEAM_KEY = 'ngw-studio-team';

const uid = () => 'c' + Math.random().toString(36).slice(2, 10);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const nameFromEmail = (email) => {
  const local = String(email || '').split('@')[0] || 'Teammate';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// ── Crew status lifecycle (kept tiny on purpose — not a scheduling system) ──
export const CREW_STATUSES = ['assigned', 'needs_confirmation', 'confirmed'];
export const CREW_STATUS_LABEL = {
  assigned: 'Assigned',
  needs_confirmation: 'Needs confirmation',
  confirmed: 'Confirmed',
};
// severity drives the readiness color only: none = good, attention = amber, watch = neutral
export const CREW_STATUS_SEVERITY = {
  assigned: 'watch',
  needs_confirmation: 'attention',
  confirmed: 'none',
};

// ── Roster (studio-wide) ──────────────────────────────────────────────────
export function loadTeamRoster() {
  try {
    const d = localStorage.getItem(TEAM_KEY);
    const list = d ? JSON.parse(d) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function saveTeamRoster(list) {
  try { localStorage.setItem(TEAM_KEY, JSON.stringify(Array.isArray(list) ? list : [])); } catch { /* ignore */ }
}

export function makeRosterMember({ name = '', email = '', phone = '', roleLabel = '' } = {}) {
  return { id: uid(), name: name.trim(), email: email.trim(), phone: phone.trim(), roleLabel: roleLabel.trim(), source: 'local' };
}

// Best-effort, non-destructive merge of Supabase studio_members into the local
// roster. Keyed by lowercased email; existing entries are never overwritten.
export function mergeSupabaseMembers(roster, members) {
  const base = Array.isArray(roster) ? roster : [];
  if (!Array.isArray(members) || !members.length) return base;
  const seen = new Set(base.map((m) => (m.email || '').toLowerCase()).filter(Boolean));
  const additions = [];
  for (const sm of members) {
    const email = (sm.email || '').toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    additions.push({
      id: sm.user_id || uid(),
      name: nameFromEmail(sm.email),
      email: sm.email,
      phone: '',
      roleLabel: cap(sm.role || 'planner'),
      source: 'studio',
    });
  }
  return additions.length ? [...base, ...additions] : base;
}

// ── Per-event crew ────────────────────────────────────────────────────────
export function makeCrewAssignment(member, { roleLabel = '', arrivalTime = '', callTime = '', notes = '', status = 'assigned' } = {}) {
  return {
    id: uid(),
    memberId: member?.id || '',
    name: member?.name || nameFromEmail(member?.email) || 'Teammate',
    email: member?.email || '',
    phone: member?.phone || '',
    roleLabel: (roleLabel || member?.roleLabel || '').trim(),
    arrivalTime: arrivalTime || '',
    callTime: callTime || '',
    notes: notes || '',
    status: CREW_STATUSES.includes(status) ? status : 'assigned',
  };
}

// Compact summary for the Command Center readiness block. Pure, no side effects.
export function summarizeCrew(event) {
  const crew = (event && Array.isArray(event.crew)) ? event.crew : [];
  const confirmed = crew.filter((c) => c.status === 'confirmed').length;
  const needsConfirmation = crew.filter((c) => c.status === 'needs_confirmation').length;
  const assigned = crew.filter((c) => !c.status || c.status === 'assigned').length;
  return {
    total: crew.length,
    confirmed,
    needsConfirmation,
    assigned,
    // overall severity for the block dot
    severity: needsConfirmation > 0 ? 'attention' : (crew.length > 0 && confirmed === crew.length ? 'none' : 'watch'),
    crew,
  };
}

// Plain-text call-sheet line for the "copy" action (no auto-send anywhere).
export function crewCallSheetText(c, event) {
  const lines = [
    `${c.name}${c.roleLabel ? ` — ${c.roleLabel}` : ''}`,
    [c.callTime ? `Call ${c.callTime}` : '', c.arrivalTime ? `Arrive ${c.arrivalTime}` : ''].filter(Boolean).join(' · '),
    event ? `${event.name || 'Event'}${event.date ? ` · ${event.date}` : ''}` : '',
    [c.phone ? `☎ ${c.phone}` : '', c.email ? `✉ ${c.email}` : ''].filter(Boolean).join('  '),
    c.notes ? `Notes: ${c.notes}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}
