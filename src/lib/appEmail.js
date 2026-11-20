// ─── appEmail — what an email the APP sends says, before, during and after ───
//
// Owner, 11/20/2026: the helper ask and the RSVP nudge go out as the app's own
// branded email (backend/app/email_frame.py), recorded for the Messages view.
// One set of words for both buttons, so neither claims more than the server
// said (UX_07): the label says what will happen, the wait shows, a refusal or a
// failure shows in place, and "Emailed" appears only when the server reports
// the email service accepted it — never "Sent", never "Delivered" (delivery is
// the Messages view's to report, from the webhook).
//
// A result is { ok: true } or { ok: false, kind }; kinds are the server's
// answers (401 signed-out, 403 refused, 404 not-found, 409 unsaved, 410
// stopped, 422 no-email, 429 capped), 'network', or 'failed'.

const KIND_BY_STATUS = { 401: 'signed-out', 403: 'refused', 404: 'not-found', 409: 'unsaved', 410: 'stopped', 422: 'no-email', 429: 'capped' };

/** The message route's answer (commApi.createMessage resolves, or throws "… → 429"). */
export function messageEmailResult(res, error) {
  if (error) {
    const m = /→ (\d{3})/.exec(String((error && error.message) || error));
    if (!m) return { ok: false, kind: /not configured/i.test(String(error && error.message)) ? 'failed' : 'network' };
    return { ok: false, kind: KIND_BY_STATUS[Number(m[1])] || 'failed' };
  }
  const d = res && res.metadata && res.metadata.delivery;
  return d && d.status === 'accepted' ? { ok: true } : { ok: false, kind: 'failed' };
}

/** { button, line, tone } for a button that emails `who`. `idle` is its label. */
export function appEmailWords(idle, who, r) {
  const name = String(who || '').trim() || 'them';
  if (!r) return { button: idle, line: null };
  if (r.busy) return { button: `Emailing ${name}…`, line: null };
  if (r.ok) return { button: idle, line: 'Emailed — the email service accepted it. Delivery shows in Messages.', tone: 'ok' };
  const why = {
    'signed-out': `Sign in to email ${name}.`,
    refused: `Only the host or a co-host of this event can email ${name}.`,
    'not-found': `Your saved plan doesn't have ${name}'s job yet — give it a moment to save, then try again.`,
    unsaved: 'Save this event to your account first.',
    stopped: `${name} asked not to get emails about this event — text them instead.`,
    'no-email': `There's no email saved for ${name}.`,
    capped: 'This event has sent its email for today. Try again tomorrow.',
    network: 'No connection.',
  }[r.kind] || 'The email service didn’t take it.';
  return { button: idle, line: `${why} The email didn’t go out.`, tone: 'danger' };
}
