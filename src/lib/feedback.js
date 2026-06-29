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
  tap:     12,                 // a light acknowledgement
  commit:  20,                 // a value committed
  lock:    [0, 18, 45, 30],    // a decision locked — a firm double
  seal:    [0, 22, 55, 40, 70, 55], // the one thing done — a rising triplet
  advance: 12,                 // the engine moved you to what's next
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
const TONE = {
  lock:    [{ f: 540, t: 0 }],                  // one warm note
  seal:    [{ f: 620, t: 0 }, { f: 820, t: 0.10 }], // ascending two-note "done"
  budget:  [{ f: 500, t: 0 }, { f: 660, t: 0.09 }],
};
function tone(kind) {
  if (reducedMotion() || !enabled('ngw-sounds')) return;
  const notes = TONE[kind];
  if (!notes) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    notes.forEach(({ f, t }) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.linearRampToValueAtTime(0.10, now + t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.20);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.22);
    });
  } catch (e) { /* sound is non-critical */ }
}

// The public moments. Pair haptic + tone per the moment's weight.
export function feedbackTap()     { haptic('tap'); }
export function feedbackCommit()  { haptic('commit'); }
export function feedbackLock()    { haptic('lock'); tone('lock'); }
export function feedbackBudget()  { haptic('lock'); tone('budget'); }
export function feedbackSeal()    { haptic('seal'); tone('seal'); }
export function feedbackAdvance() { haptic('advance'); }
