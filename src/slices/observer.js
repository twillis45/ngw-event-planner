// ─── Observer: passive session recorder for human-validation sessions ──────
// Activated ONLY when the URL includes `observe=1`. Zero behavior change to
// the slice; operators don't see this. Captures a timestamped transcript of
// (a) every button click and (b) hesitation = ms between the most recent
// state-significant DOM change and the next click. On Ctrl/Cmd+Shift+L the
// session transcript is copied to the clipboard for paste into a findings doc.
//
// What "state-significant DOM change" means here, practically: any new
// EscalationBadge text (EMERGENCY / CRITICAL / ESCALATION) or any change to
// the count chip ("OTHER THREADS (n)") — i.e. things an operator would
// visually register as "something changed."

const SESSION = [];
let lastChangeAt = null;
let installed = false;

function ts() { return new Date().toISOString().slice(11, 23); }

function record(entry) {
  SESSION.push({ at: ts(), elapsedMs: lastChangeAt ? Math.round(performance.now() - lastChangeAt) : null, ...entry });
}

function noteChange(label) {
  lastChangeAt = performance.now();
  record({ kind: 'state', what: label });
}

function attachClickListener() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('button, [role="button"]');
    if (!btn) return;
    const label = (btn.textContent || btn.getAttribute('aria-label') || '').trim().slice(0, 60);
    if (!label) return;
    record({ kind: 'click', what: label, hesitationMs: lastChangeAt ? Math.round(performance.now() - lastChangeAt) : null });
    // Reset hesitation clock so the next click measures from now (the operator acted).
    lastChangeAt = performance.now();
  }, true);
}

function attachStateObserver() {
  // Watch for changes to the visible escalation badges + the OTHER THREADS counter.
  // We use a MutationObserver on the body and re-derive on every characterData/childList tick.
  let last = { badge: null, threadsLabel: null, primaryAction: null };
  const tick = () => {
    const text = document.body ? document.body.innerText : '';
    const badge = (text.match(/\b(EMERGENCY|CRITICAL|ESCALATION)\b/) || [null])[0];
    const threadsLabel = (text.match(/OTHER THREADS \((\d+)\)/) || [null])[0];
    const primaryAction = (text.match(/CONTACT NOW|Call lead directly|Check ETA|Contact Vendor|Escalate to downstream/) || [null])[0];
    if (badge !== last.badge)               noteChange(`badge → ${badge || 'cleared'}`);
    if (threadsLabel !== last.threadsLabel) noteChange(`secondaries → ${threadsLabel || 'cleared'}`);
    if (primaryAction !== last.primaryAction) noteChange(`primary action → ${primaryAction || 'cleared'}`);
    last = { badge, threadsLabel, primaryAction };
  };
  const mo = new MutationObserver(() => { tick(); });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  // Initial snapshot
  setTimeout(tick, 200);
}

function attachCopyShortcut() {
  document.addEventListener('keydown', (e) => {
    const cmdOrCtrl = e.metaKey || e.ctrlKey;
    if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      const transcript = formatTranscript();
      try {
        navigator.clipboard.writeText(transcript).then(
          () => console.info('[NGW Observer] Transcript copied to clipboard (' + SESSION.length + ' entries).'),
          () => console.warn('[NGW Observer] Clipboard write blocked; transcript below:\n' + transcript),
        );
      } catch (_) {
        console.warn('[NGW Observer] Transcript:\n' + transcript);
      }
    }
  });
}

function formatTranscript() {
  const lines = [
    `NGW Observer transcript`,
    `URL: ${window.location.href}`,
    `Viewport: ${window.innerWidth}x${window.innerHeight}`,
    `Recorded: ${new Date().toISOString()}`,
    `Entries: ${SESSION.length}`,
    ``,
    `time         hesitation_ms   kind     what`,
    `------------ --------------- -------- --------------------------------------------------`,
  ];
  for (const e of SESSION) {
    const hes = e.kind === 'click' && e.hesitationMs != null ? String(e.hesitationMs).padStart(15) : ''.padStart(15);
    lines.push(`${e.at} ${hes} ${e.kind.padEnd(8)} ${e.what}`);
  }
  return lines.join('\n');
}

export function installObserver() {
  if (installed) return; installed = true;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('observe') !== '1') return;
  // Wait for body to exist
  const start = () => {
    attachClickListener();
    attachStateObserver();
    attachCopyShortcut();
    // Surface a quiet console banner so the OBSERVER (not the operator) knows it's active.
    console.info('%c[NGW Observer] active — Ctrl/Cmd+Shift+L copies session transcript.', 'color:#849eb8;font-weight:600');
    window.__ngwSession = SESSION; // inspectable in console
    window.__ngwTranscript = formatTranscript;
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
