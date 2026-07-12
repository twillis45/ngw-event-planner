// ─── Notification sound ────────────────────────────────────────────────────
// Sprint 60.Y. A soft synthesized "ding-dong" chime for new inbound messages.
// We synthesize via Web Audio rather than ship an audio asset — we can't reuse
// a proprietary sound (e.g. Facebook's), and a tiny oscillator pop needs no
// network or file. Autoplay-safe: the AudioContext only resumes after a user
// gesture, which has always happened by the time an in-session message lands.
//
// Tone design (revised): each note is a fundamental + a quiet one-octave-up
// partial (gain ~28% of the fundamental) instead of a bare sine — the extra
// partial is what reads as "warm bell" rather than "phone beep." A gentle
// lowpass keeps that partial from ever sounding thin/harsh. Attack is a soft
// 18ms ramp (never a click), release is a slow exponential tail (~340ms) so
// the note fades rather than cuts off — the "soft touch" the sound should feel.

let _ctx = null;
let _muted = false;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) {
    try { _ctx = new AC(); } catch (e) { return null; }
  }
  return _ctx;
}

export function setMessageSoundMuted(m) { _muted = !!m; }
export function isMessageSoundMuted() { return _muted; }

// Chimes fire later from timers/async callbacks (a reveal-step delay, a day-of
// cue clearing) — never from inside the click itself — so the FIRST-ever
// AudioContext.resume() can land outside the user-gesture window some
// browsers require, silently leaving it suspended forever after. Call this
// directly from a real click/tap handler (e.g. the sound toggle) so the
// context is created and resumed while the gesture is still live.
export function primeMessageSound() {
  const ac = getCtx();
  if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* ignore */ } }
}

// A single warm note: fundamental + a quiet octave-up partial through a
// shared lowpass, soft-attack/slow-release envelope on each layer.
function playNote(ac, f, t, peak) {
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2200;
  filter.Q.value = 0.4;
  filter.connect(ac.destination);
  [{ mult: 1, level: 1 }, { mult: 2, level: 0.28 }].forEach(({ mult, level }) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f * mult;
    const now = ac.currentTime;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.linearRampToValueAtTime(peak * level, now + t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.34);
    osc.connect(gain).connect(filter);
    osc.start(now + t);
    osc.stop(now + t + 0.36);
  });
}

// Two ascending warm notes — a friendly, quiet alert pop.
export function playMessageChime() {
  if (_muted) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    playNote(ac, 660, 0, 0.11);
    playNote(ac, 880, 0.1, 0.1);
  } catch (e) { /* ignore — sound is non-critical */ }
}

// A soft double-tap haptic to pair with the chime on message arrival —
// lighter than the 3-pulse "magic moment" pattern (reserved for bigger
// beats: a reveal completing, the day's last cue clearing), distinct from
// the single 10ms tick used for routine state changes. No-op where
// navigator.vibrate is unsupported (iOS Safari) or the tab isn't focused.
export function hapticMessageArrival() {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([8, 40, 8]); } catch (e) { /* ignore */ }
}

// The single call site both apps should use for "a message just arrived" —
// sound and haptic together, muted by the same preference. Replaces calling
// playMessageChime() alone, which left the haptic channel silent even though
// every other real-time moment in the app pairs a tick with its chime.
export function notifyMessageArrival() {
  playMessageChime();
  if (!_muted) hapticMessageArrival();
}
