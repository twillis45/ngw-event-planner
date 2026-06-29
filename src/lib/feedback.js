// ─── Tactile + audible feedback ────────────────────────────────────────────
// One primitive for the app's COMMIT / SEAL / ADVANCE moments so a lock feels
// physical, not just visual. Restrained by design — feedback fires only on the
// meaningful state changes (lock a count, set the budget, mark the one thing
// done, the engine advances you), never on every tap.
//
// Honest + safe:
//   • Haptics use navigator.vibrate — gesture-gated by browsers, a silent no-op
//     where unsupported (desktop, iOS Safari ignores it). Never throws.
//   • Tones synthesize via Web Audio (no asset, no network); the context only
//     resumes inside the user gesture that triggered the commit.
//   • Respects prefers-reduced-motion ("keep it calm" → no tones, no haptics)
//     and explicit toggles: localStorage `ngw-haptics` / `ngw-sounds` ('0' = off).
//   • Mirrors the Magic Moments motion bands — feedback is the same language in
//     a different sense.

const VIBE = {
  // Durations tuned ABOVE the Android perceptible floor (~25-30ms) — a 9ms buzz
  // technically fires but the motor renders nothing, so a haptic you can't feel is
  // pointless. Light = ~25ms, medium = ~40ms, committed actions get a pattern.
  tap:     22,                 // a light acknowledgement
  select:  26,                 // a light scan-a-choice tick (Create/Invite/Menus)
  commit:  42,                 // a value committed
  lock:    [0, 28, 45, 55],    // a decision locked — a firm double
  seal:    [0, 30, 55, 45, 70, 60], // the one thing done — a rising triplet
  success: [0, 24, 40, 45],    // a positive lift — lighter than seal (sent / copied / shared)
  warning: [0, 35, 55, 40],    // a sharper double — gets the eyes (alert / over-budget / weather)
  soft:    [0, 20],            // a single soft pulse settling (settings toggle-slide-settle)
  advance: 24,                 // the engine moved you to what's next
  error:   [0, 35, 30, 35],
};

function reducedMotion() {
  try { return typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
function enabled(key) {
  try { return typeof localStorage === 'undefined' || localStorage.getItem(key) !== '0'; }
  catch (e) { return true; }
}

export function haptic(kind = 'tap') {
  if (reducedMotion() || !enabled('ngw-haptics')) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(VIBE[kind] || VIBE.tap);
    }
  } catch (e) { /* non-critical */ }
}

// ── Web Audio tones (only the SEAL-class moments earn a sound) ────────────────
let _ctx = null;
function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) { try { _ctx = new AC(); } catch (e) { return null; } }
  return _ctx;
}
// Soft sine notes — a quiet, premium confirmation, never a game chime.
// Mirrors the Sound Notification Map: SIGNATURE / POSITIVE / COMMIT / DAY-OF / ALERT.
const TONE = {
  // Very soft, short ticks so a SELECT/COMMIT is perceptible on iOS (no web vibration)
  // without becoming a chime. Played at reduced gain (see tone()'s gain arg).
  select:    [{ f: 660, t: 0 }],                  // a light scan tick
  commit:    [{ f: 560, t: 0 }],                  // a warm acknowledgement
  lock:      [{ f: 540, t: 0 }],                  // COMMIT — one warm note
  seal:      [{ f: 620, t: 0 }, { f: 820, t: 0.10 }], // the one thing done — ascending two-note
  // SIGNATURE — a warm 3-note ascending resolve, "someone competent finished this."
  signature: [{ f: 523, t: 0 }, { f: 659, t: 0.10 }, { f: 784, t: 0.20 }],
  // POSITIVE / RECEIPT — a soft bright single lift (sent / copied / shared).
  positive:  [{ f: 700, t: 0 }, { f: 880, t: 0.06 }],
  // POSITIVE — a calm warm exhale chord; the reward for an empty, handled screen.
  exhale:    [{ f: 392, t: 0 }, { f: 523, t: 0 }],
  // DAY-OF — a gentle awakening tone; the day is here, calmly.
  dayStart:  [{ f: 440, t: 0 }, { f: 587, t: 0.14 }],
  // DAY-OF — a warm, intimate tone for the moment that matters.
  heart:     [{ f: 523, t: 0 }, { f: 659, t: 0.16 }],
  // DAY-OF — a soft, short pop; present but never insistent (message received).
  message:   [{ f: 660, t: 0 }],
  // ALERT — a distinct but non-alarming low double-tone; eyes without dread.
  alert:     [{ f: 300, t: 0 }, { f: 300, t: 0.16 }],
  // ALERT — a single soft low "take note", one beat only (over-budget warning).
  budget:    [{ f: 360, t: 0 }],
};
function tone(kind, gainScale = 1) {
  if (reducedMotion() || !enabled('ngw-sounds')) return;
  const notes = TONE[kind];
  if (!notes) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    const peak = 0.10 * gainScale;
    notes.forEach(({ f, t }) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.linearRampToValueAtTime(peak, now + t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.20);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.22);
    });
  } catch (e) { /* sound is non-critical */ }
}

// The public moments. Pair haptic + tone per the moment's weight, mapped 1:1 to
// the Haptic Feedback Map + Sound Notification Map (Figma 1677 / 1724). Restraint
// still rules: these fire on meaningful state changes, never on every tap.
//
// LIGHT — felt but uncommitted
export function feedbackTap()     { haptic('tap'); }
export function feedbackSelect()  { haptic('select'); tone('select', 0.45); } // scan a choice — soft tick (audible on iOS where vibration is absent)
export function feedbackAdvance() { haptic('advance'); }            // the engine moved you to what's next
export function feedbackSettle()  { haptic('soft'); }              // settings toggle-slide-settle
// MEDIUM — a value committed
export function feedbackCommit()  { haptic('commit'); tone('commit', 0.55); } // dietary saved · dish added · item bought
// HEAVY — the one thing done / something irreversible left the plan
export function feedbackSeal()    { haptic('seal'); tone('seal'); }
// SIGNATURE — the plan assembled / reveal complete
export function feedbackReveal()  { haptic('seal'); tone('signature'); }
// COMMIT — a decision locked
export function feedbackLock()    { haptic('lock'); tone('lock'); }
// SUCCESS / RECEIPT — it left the host's hands (sent · copied · shared · RSVP sent)
export function feedbackSuccess() { haptic('success'); tone('positive'); }
// RECEIPT (incoming) — a new RSVP / a message arrived: soft, never insistent
export function feedbackReceived(){ haptic('tap'); tone('message'); }
// POSITIVE — a calm exhale: caught-up / all-set
export function feedbackExhale()  { haptic('tap'); tone('exhale'); }
// WARNING — over-budget crossed: a sharper double + a soft low "take note"
export function feedbackBudget()  { haptic('warning'); tone('budget'); }
// WARNING — a critical alert / weather risk surfaces: eyes-now, no dread
export function feedbackAlert()   { haptic('warning'); tone('alert'); }
// DAY-OF — go-time, the day is here
export function feedbackDayStart(){ haptic('commit'); tone('dayStart'); }
// DAY-OF — the heart moment
export function feedbackHeart()   { haptic('commit'); tone('heart'); }
