// ─── Notification sound ────────────────────────────────────────────────────
// Sprint 60.Y. A soft synthesized "ding-dong" chime for new inbound messages.
// We synthesize via Web Audio rather than ship an audio asset — we can't reuse
// a proprietary sound (e.g. Facebook's), and a tiny oscillator pop needs no
// network or file. Autoplay-safe: the AudioContext only resumes after a user
// gesture, which has always happened by the time an in-session message lands.

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

// Two ascending sine notes — a friendly, quiet alert pop.
export function playMessageChime() {
  if (_muted) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    [{ f: 660, t: 0 }, { f: 880, t: 0.09 }].forEach(({ f, t }) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.linearRampToValueAtTime(0.13, now + t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.24);
    });
  } catch (e) { /* ignore — sound is non-critical */ }
}
