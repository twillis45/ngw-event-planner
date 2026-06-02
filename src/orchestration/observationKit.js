// Observation Kit — Sprint 37 Human Testing
//
// Lightweight, temporary interaction observer for alpha testing.
// Records hesitation points, repeated taps, and interaction patterns
// WITHOUT enterprise analytics. All data stays in-session (localStorage).
//
// Activate: Ctrl+Shift+O (or pass observe=1 URL param)
// Export: Ctrl+Shift+E copies session JSON to clipboard
// Clear: Ctrl+Shift+X clears session data
//
// This is NOT product telemetry. It is a temporary observation tool
// for facilitator-observed alpha testing sessions.

const SESSION_KEY = 'ngw_observation_session';

// ─── Event types ────────────────────────────────────────────────────────

export const OBS_EVENT = {
  TAP:           'tap',           // any click/tap
  REPEATED_TAP:  'repeated_tap',  // same target tapped within 800ms
  HESITATION:    'hesitation',    // pointer stayed still for 3+ seconds
  SCROLL_SEEK:   'scroll_seek',   // rapid scroll direction changes (seeking)
  SCROLL_DEPTH:  'scroll_depth',  // coordinator crossed a key scroll threshold (vendor zone, etc.)
  PHASE_CHANGE:  'phase_change',  // simulation phase transition
  ORIENTATION:   'orientation',   // device orientation change
  RETURN:        'return',        // tab/window regained focus after absence
  IDLE:          'idle',          // no tap for 30+ seconds — passive dwell on mobile
};

// ─── Session ────────────────────────────────────────────────────────────

let session = null;
let lastTap = { target: null, time: 0 };
let hoverTimer = null;
let lastScrollDir = null;
let scrollDirChanges = 0;
let scrollDirTimer = null;
let isActive = false;
let hiddenAt = null;    // timestamp when tab went hidden
let maxScrollY = 0;     // deepest scroll reached this session
let idleTimer = null;   // fires IDLE event after 30s of no taps
let idleFired = false;  // only record one IDLE per quiet period
let firstScrollMs = null;         // elapsed ms at first scroll event
let scrollDepthsFired = new Set(); // which depth thresholds have already fired

function getSession() {
  if (session) return session;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    session = stored ? JSON.parse(stored) : createSession();
  } catch {
    session = createSession();
  }
  return session;
}

function createSession() {
  return {
    id: `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    started: new Date().toISOString(),
    viewport: typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : {},
    events: [],
    testerProfile: null,   // Sprint 45: set via setTesterProfile()
    sessionFeedback: null, // Sprint 45: set via setSessionFeedback()
  };
}

function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* storage full — acceptable for temp tooling */ }
}

function record(type, detail = {}) {
  if (!isActive) return;
  const s = getSession();
  s.events.push({
    type,
    time: Date.now(),
    elapsed: Date.now() - new Date(s.started).getTime(),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    ...detail,
  });
  // Keep session bounded — drop oldest events beyond 500
  if (s.events.length > 500) s.events = s.events.slice(-400);
  saveSession();
}

// ─── Idle detection ─────────────────────────────────────────────────────
// Sprint 40C: fires IDLE after 30s with no taps. On mobile, pointermove doesn't
// fire, so hesitation detection is blind. IDLE is the mobile equivalent — it captures
// "coordinator stopped interacting" and enables passive-dwell analysis.
// Resets on each tap. Does not reset on scroll (scroll is activity, not engagement).

function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleFired = false;
  idleTimer = setTimeout(() => {
    if (!idleFired && isActive) {
      record(OBS_EVENT.IDLE, {
        scrollY: window.scrollY,
        maxScrollY,
        thresholdSec: 30,
      });
      idleFired = true;
    }
  }, 30000);
}

// ─── Listeners ──────────────────────────────────────────────────────────

function onTap(e) {
  if (!isActive) return;
  const target = e.target?.closest('[data-obs]')?.dataset?.obs || e.target?.tagName || 'unknown';
  const now = Date.now();

  // Detect repeated taps (same target within 800ms)
  if (lastTap.target === target && now - lastTap.time < 800) {
    record(OBS_EVENT.REPEATED_TAP, { target, interval: now - lastTap.time });
  } else {
    record(OBS_EVENT.TAP, { target });
  }
  lastTap = { target, time: now };
  resetIdle(); // reset idle timer on every tap
}

function onPointerMove() {
  if (!isActive) return;
  // Reset hesitation timer on any movement
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    record(OBS_EVENT.HESITATION, { x: 0, y: 0 }); // position intentionally omitted for privacy
  }, 3000);
}

// Sprint 40D: scroll depth thresholds — fires SCROLL_DEPTH at key pixel marks.
// 400px = below event card (entered sequence area). 700px = vendor zone.
// Fires once per threshold per session. firstScrollMs records timing of first scroll.
const SCROLL_DEPTH_THRESHOLDS = [
  { px: 400, label: 'sequence' },  // scrolled into the sequence body
  { px: 700, label: 'vendors' },   // scrolled into the vendor zone
];

function onScroll() {
  if (!isActive) return;
  const s = getSession();
  const currentY = window.scrollY;
  maxScrollY = Math.max(maxScrollY, currentY);

  // First scroll timing
  if (firstScrollMs === null) {
    firstScrollMs = Date.now() - new Date(s.started).getTime();
  }

  // Depth threshold events — fire once per threshold per session
  SCROLL_DEPTH_THRESHOLDS.forEach(({ px, label }) => {
    if (!scrollDepthsFired.has(label) && maxScrollY >= px) {
      scrollDepthsFired.add(label);
      record(OBS_EVENT.SCROLL_DEPTH, { threshold: px, label, maxScrollY });
    }
  });

  const dir = currentY > (onScroll._lastY || 0) ? 'down' : 'up';
  if (lastScrollDir && dir !== lastScrollDir) {
    scrollDirChanges++;
    if (scrollDirChanges >= 3) {
      record(OBS_EVENT.SCROLL_SEEK, { changes: scrollDirChanges });
      scrollDirChanges = 0;
    }
  }
  lastScrollDir = dir;
  onScroll._lastY = currentY;

  // Reset scroll direction counter after 2s of no scroll
  if (scrollDirTimer) clearTimeout(scrollDirTimer);
  scrollDirTimer = setTimeout(() => { scrollDirChanges = 0; }, 2000);
}

function onVisibilityChange() {
  if (!isActive) return;
  if (document.hidden) {
    hiddenAt = Date.now();
  } else {
    const hiddenDuration = hiddenAt ? Date.now() - hiddenAt : 0;
    record(OBS_EVENT.RETURN, {
      hiddenDuration,
      hiddenDurationSec: parseFloat((hiddenDuration / 1000).toFixed(1)),
    });
    hiddenAt = null;
  }
}

// Sprint 40B: iOS Safari does not fire visibilitychange on device lock/unlock.
// pagehide fires when the page enters background (lock, home button).
// pageshow with persisted=true fires when the page is restored from bfcache.
function onPageHide() {
  if (!isActive) return;
  if (!hiddenAt) hiddenAt = Date.now(); // capture if visibilitychange missed it
}

function onPageShow(e) {
  if (!isActive || !e.persisted) return;
  const hiddenDuration = hiddenAt ? Date.now() - hiddenAt : 0;
  record(OBS_EVENT.RETURN, {
    hiddenDuration,
    hiddenDurationSec: parseFloat((hiddenDuration / 1000).toFixed(1)),
    source: 'pageshow',
  });
  hiddenAt = null;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function startObservation() {
  if (isActive) return;
  isActive = true;
  session = getSession();
  maxScrollY = 0;
  firstScrollMs = null;
  scrollDepthsFired = new Set();
  window.addEventListener('click', onTap, true);
  window.addEventListener('touchend', onTap, true);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  resetIdle(); // start idle timer immediately — captures coordinators who never tap
  console.log('[Observation] Started — session', session.id);
}

export function stopObservation() {
  isActive = false;
  window.removeEventListener('click', onTap, true);
  window.removeEventListener('touchend', onTap, true);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('scroll', onScroll);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
  window.removeEventListener('pageshow', onPageShow);
  if (hoverTimer) clearTimeout(hoverTimer);
  if (scrollDirTimer) clearTimeout(scrollDirTimer);
  if (idleTimer) clearTimeout(idleTimer);
  console.log('[Observation] Stopped');
}

export function recordPhaseChange(phaseName, tick) {
  record(OBS_EVENT.PHASE_CHANGE, { phase: phaseName, tick });
}

// Sprint 40C: classify taps by interaction type.
// Operational = engaging orchestration content (sequence items, vendors).
// Control = interacting with simulation infrastructure (play, reset, speed, tabs, scrubber).
function classifyTarget(target) {
  if (!target) return 'unknown';
  if (target.startsWith('seq-') || target.startsWith('vendor-') || target === 'event-card') return 'operational';
  if (['play-pause', 'reset', 'scrubber'].includes(target) ||
      target.startsWith('speed-') || target.startsWith('tab-')) return 'control';
  return 'other';
}

export function exportSession() {
  const s = getSession();
  const returnEvents = s.events.filter(e => e.type === OBS_EVENT.RETURN);
  const durations = returnEvents.map(e => e.hiddenDuration || 0).filter(d => d > 0);

  const tapEvents = s.events.filter(e =>
    e.type === OBS_EVENT.TAP || e.type === OBS_EVENT.REPEATED_TAP
  );
  const operationalTaps = tapEvents.filter(e => classifyTarget(e.target) === 'operational').length;
  const controlTaps = tapEvents.filter(e => classifyTarget(e.target) === 'control').length;

  // Time from session start to first operational tap (null = never happened)
  const firstOpTap = tapEvents.find(e => classifyTarget(e.target) === 'operational');
  const firstOrchestrationTapMs = firstOpTap ? firstOpTap.elapsed : null;

  // Time from session start to first any tap
  const firstAnyTap = tapEvents[0];
  const firstTapMs = firstAnyTap ? firstAnyTap.elapsed : null;

  const summary = {
    ...s,
    summary: {
      totalEvents: s.events.length,
      taps: tapEvents.filter(e => e.type === OBS_EVENT.TAP).length,
      repeatedTaps: tapEvents.filter(e => e.type === OBS_EVENT.REPEATED_TAP).length,
      hesitations: s.events.filter(e => e.type === OBS_EVENT.HESITATION).length,
      scrollSeeks: s.events.filter(e => e.type === OBS_EVENT.SCROLL_SEEK).length,
      idles: s.events.filter(e => e.type === OBS_EVENT.IDLE).length,
      returns: returnEvents.length,
      participation: {
        operationalTaps,
        controlTaps,
        operationalRatio: tapEvents.length
          ? parseFloat((operationalTaps / tapEvents.length).toFixed(2))
          : 0,
        firstTapMs,
        firstOrchestrationTapMs,
        firstScrollMs,
        maxScrollY,
        vendorZoneReached: scrollDepthsFired.has('vendors'),
        engaged: operationalTaps > 0,
      },
      interruptions: {
        count: returnEvents.length,
        avgAbsenceSec: durations.length
          ? parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length / 1000).toFixed(1))
          : 0,
        maxAbsenceSec: durations.length
          ? parseFloat((Math.max(...durations) / 1000).toFixed(1))
          : 0,
        longAbsences: durations.filter(d => d > 10000).length,
      },
      durationMs: s.events.length > 0 ? s.events[s.events.length - 1].elapsed : 0,
    },
  };
  return JSON.stringify(summary, null, 2);
}

// Sprint 45: attach tester registration profile to session
export function setTesterProfile(profile) {
  const s = getSession();
  s.testerProfile = profile;
  saveSession();
}

// Sprint 45: attach post-session feedback to session before export
export function setSessionFeedback(feedback) {
  const s = getSession();
  s.sessionFeedback = feedback;
  saveSession();
}

export function clearSession() {
  session = createSession();
  saveSession();
  maxScrollY = 0;
  firstScrollMs = null;
  scrollDepthsFired = new Set();
  idleFired = false;
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (isActive) resetIdle();
  console.log('[Observation] Session cleared');
}

export function isObserving() {
  return isActive;
}
