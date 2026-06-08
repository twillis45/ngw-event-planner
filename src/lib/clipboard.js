// Sprint 52B — one clipboard helper used everywhere, so every copy action gives
// the planner a confirmation. It copies the text and fires a global 'ngw-toast'
// window event; the App's toast provider listens and shows "Copied to clipboard".
// Falls back to execCommand when the async Clipboard API is unavailable/blocked.

function emitToast(message) {
  try { window.dispatchEvent(new CustomEvent('ngw-toast', { detail: { message } })); } catch { /* no window */ }
}

function execFallback(text, label) {
  try {
    const ta = document.createElement('textarea');
    ta.value = String(text ?? '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) emitToast(label);
    return ok;
  } catch { return false; }
}

// copyToClipboard(text, label?) — returns a promise that resolves true/false.
export function copyToClipboard(text, label = 'Copied to clipboard') {
  const value = String(text ?? '');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value)
        .then(() => { emitToast(label); return true; })
        .catch(() => execFallback(value, label));
    }
  } catch { /* fall through */ }
  return Promise.resolve(execFallback(value, label));
}
