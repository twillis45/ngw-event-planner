// welcomeGate — V2's first-run gate. Decides whether the host shell should
// open on the one-time welcome screen instead of cold-dropping a brand-new
// host into a sample event that isn't theirs.
//
// Pure decision logic only (no storage reads here) so it's unit-testable;
// HostShellV2 supplies the inputs from its existing storage reads
// ('ngw-events', 'ngw-hostv2-custom-event', and the LS_WELCOMED flag below).

// '1' once the host has seen (or skipped past) the welcome. Clearing this
// key re-arms the screen for a host with no real events — deliberate, so
// support/QA can bring it back without touching anything else.
export const LS_WELCOMED = 'ngw-v2-welcomed';

// A "real" event = the host's own record, not the looking-around material the
// app ships: demo-seeded rows (id 'demo-*'), non-host records (ngw-events
// rows carry recordKind), and unnamed stubs don't count. Same predicate
// HostShellV2 uses to adopt app events into its switcher — one truth.
export function isRealHostEvent(e) {
  return !!(
    e && e.id
    && String(e.recordKind || 'host_event') === 'host_event'
    && !/^demo-/.test(String(e.id))
    && String(e.name || '').trim()
  );
}

// Show the welcome only when BOTH are true: the host has never been welcomed,
// AND nothing anywhere is genuinely theirs — no real event in the app's own
// storage and no V2-created event. The moment either exists, the welcome is
// permanently out of the way.
export function shouldShowWelcome({ appEvents, customEvent, welcomed } = {}) {
  if (welcomed) return false;
  if (customEvent && customEvent.id) return false;
  const list = Array.isArray(appEvents) ? appEvents : [];
  return !list.some(isRealHostEvent);
}
