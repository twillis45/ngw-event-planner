// VendorBriefV2 — the PUBLIC vendor brief page (?vendor=TOKEN), in hostv2.
//
// MOVED OFF THE FROZEN SHELL (11/13/2026). Until now hostv2 redirected every
// ?vendor= link one directory up to App.js (VendorBriefView +
// PublicVendorBriefRoute), a shell under the A1 freeze and scheduled for
// deletion — so a sold feature lived in code marked for removal. This page is
// its replacement. CONTRACT = that page's behavior, verbatim:
//   · TOKEN is a short server code (lib/api/vendorBrief looksLikeBriefCode) →
//     resolved LIVE from GET /api/public/vendor-brief/{code}; or a legacy
//     self-contained snapshot (the whole brief base64-encoded in the link) →
//     decoded here, no server, works offline. The board ruled the snapshot
//     can't be gated, so it keeps rendering.
//   · Only the AUDITED WHITELIST renders (lib/vendorBrief.js buildVendorBriefPayload
//     and its server mirror). Never brief.notes: old snapshots may still CARRY
//     host-private bookkeeping there, and it is never displayed.
//   · Confirm-back ("All good — I'm confirmed" / "Something's off" → on-site
//     name, phone, note → send) only on a server code; idempotent per code.
//
// AND IT FIXES WHAT IT SHOWED (board 2026-11-12, follow-up 1):
//   1. a headcount for vendors who size to it (food & drink, rentals);
//   2. the host's own name, never "your event planner";
//   3. a day-of contact the host can name, instead of always the host.
//
// Light paper only (the guest invite's stationery), 390px-first, no host chrome.
import { useEffect, useMemo, useState } from 'react';
import { BRAND } from '@app/lib/brand';
import { invitePalette } from '@app/lib/inviteTone';
import { fetchPublicVendorBrief, isVendorBriefApiConfigured, looksLikeBriefCode, submitVendorBriefConfirmation, vendorBriefIdempotencyKey } from '@app/lib/api/vendorBrief';
import { buildConfirmationPayload } from '@app/lib/vendorBriefConfirm';
import { briefShowsHeadcount, briefFeedsGuests, briefDietLine } from '@app/lib/vendorBrief';
import { formatPhoneUS } from '@app/lib/contactFormat';
import { toneVarsFor } from './inviteShared.js';

const TONE = toneVarsFor(invitePalette('light'));

// Unicode-safe base64 — the inverse of eventPool's b64encode (and App.js's).
// URLSearchParams turns a literal '+' into a space, and atob DROPS spaces, so
// a '+' in an unencoded link is put back before decoding.
function decodeSnapshot(token) {
  try {
    const b64 = String(token || '').replace(/ /g, '+');
    let b;
    try {
      const bin = atob(b64);
      b = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    } catch { b = JSON.parse(atob(b64)); } // older ASCII-only links
    return (b && b.vendorName) ? b : null;
  } catch { return null; }
}

const fmtTime12 = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  if (!m) return String(d || '');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};
const telHref = (p) => 'tel:' + String(p || '').replace(/[^+\d]/g, '');
// A website only ever becomes an http(s) link; anything else stays text.
const webHref = (url) => {
  const u = String(url || '').trim();
  if (!u) return null;
  const full = /^https?:\/\//i.test(u) ? u : 'https://' + u;
  try { const x = new URL(full); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch { return null; }
};
const safeLogo = (src) => (/^(data:image\/|https:\/\/)/i.test(String(src || '')) ? src : null);

// Who the brief is FROM. A planner's business name, else the host's own name,
// else the person in the profile — and with none, a neutral "the host", never
// "your event planner" (finding 2): most people sending a brief are hosting.
const senderOf = (b) => String(b.plannerBusiness || b.hostName || b.plannerName || '').trim();

// Who the vendor calls on the day: the contact the host named for this event
// (finding 3), else the host.
function dayOfContact(b) {
  const name = String(b.briefContactName || '').trim();
  const phone = String(b.briefContactPhone || '').trim();
  if (name || phone) return { name, phone, email: '', website: '', ig: '', named: true };
  return {
    name: String(b.plannerName || b.hostName || '').trim(),
    phone: String(b.plannerPhone || '').trim(),
    email: String(b.plannerEmail || '').trim(),
    website: String(b.plannerWebsite || '').trim(),
    ig: String(b.plannerIG || '').trim(),
    named: false,
  };
}

function Holding({ title, body, busy }) {
  return (
    <div className="stagewrap"><div className="app" style={TONE}><div className="content">
      <section style={{ paddingTop: 120, textAlign: 'center' }} aria-busy={busy ? 'true' : undefined}>
        <div className="eyebrow">Vendor brief</div>
        {title && <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.1 }}>{title}</h1>}
        <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)' }} aria-live="polite">{body}</p>
      </section>
    </div></div></div>
  );
}

export default function VendorBriefV2({ token }) {
  const snapshot = useMemo(() => decodeSnapshot(token), [token]);
  const isCode = !snapshot && looksLikeBriefCode(token);
  // undefined = resolving, null = not found, object = the live brief
  const [resolved, setResolved] = useState(isCode ? undefined : null);
  useEffect(() => {
    let cancelled = false;
    if (!isCode) return undefined;
    (async () => {
      const b = isVendorBriefApiConfigured() ? await fetchPublicVendorBrief(token) : null;
      if (!cancelled) setResolved(b && b.vendorName ? b : null);
    })();
    return () => { cancelled = true; };
  }, [token, isCode]);

  const brief = snapshot || resolved;
  if (brief) return <BriefPage brief={brief} briefCode={snapshot ? null : token} />;
  if (isCode && resolved === undefined) return <Holding busy body="Loading your brief…" />;
  // Invalid, revoked, or corrupt token.
  return <Holding title="This link isn’t live anymore" body="Ask whoever sent it for a fresh brief link." />;
}

function BriefPage({ brief: b, briefCode }) {
  const [copied, setCopied] = useState(false);
  const sender = senderOf(b);
  const fromLine = sender ? `From ${sender}` : 'From the host';
  const contact = dayOfContact(b);
  const logo = safeLogo(b.plannerLogo);
  const site = webHref(contact.website);
  const ros = Array.isArray(b.ros) ? b.ros : [];
  const guestCount = Number(b.guestCount) > 0 && briefShowsHeadcount(b.category) ? Number(b.guestCount) : null;
  const dietLine = briefFeedsGuests(b.category) ? briefDietLine(b.dietCounts) : '';
  const cueWhen = (r) => fmtTime12(r.time) || String(r.rel || '');

  const textBrief = [
    sender ? `${sender} — Vendor brief` : 'Vendor brief',
    `Event: ${b.eventName || 'Event'}`,
    b.eventDate ? fmtDate(b.eventDate) : '',
    b.venue ? `Venue: ${b.venue}` : '',
    '',
    `${b.vendorName}${b.category ? ` — ${b.category}` : ''}`,
    b.arrivalTime ? `Arrival: ${fmtTime12(b.arrivalTime)}` : '',
    guestCount ? `Guests: ${guestCount}` : '',
    dietLine ? `Dietary: ${dietLine}` : '',
    '',
    ...ros.map((r) => `${cueWhen(r)}  ${r.segment || ''}${r.location ? ` — ${r.location}` : ''}${r.notes ? `\n  ${r.notes}` : ''}`),
    '',
    // briefNote ONLY — never the legacy `notes` an old snapshot may carry.
    b.briefNote ? `Notes: ${b.briefNote}` : '',
    '',
    contact.name ? `Day-of contact: ${contact.name}` : '',
    contact.phone ? `Phone: ${contact.phone}` : '',
    contact.email ? `Email: ${contact.email}` : '',
    contact.website ? `Web: ${contact.website}` : '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const copyBrief = () => navigator.clipboard?.writeText(textBrief)
    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});

  return (
    <div className="stagewrap vb2-stage">
      <div className="app" style={TONE}><div className="content vb2-content">
        <section className="inv2 vb2" data-surface="vendor-brief-v2">
          <div className="inv2-sheet">
            <div className="inv2-mast lp"><span>Vendor brief</span><span className="mr" aria-hidden /><span className="vb2-from">{fromLine}</span></div>
            {logo && <img className="vb2-logo" src={logo} alt={sender} />}
            <h1 className="inv2-name lp-display">{b.eventName || 'Event'}</h1>
            {(b.eventDate || b.venue) && (
              <p className="inv2-fine vb2-when">{[b.eventDate ? fmtDate(b.eventDate) : '', b.venue || ''].filter(Boolean).join(' · ')}</p>
            )}
            <hr className="inv2-rule" />

            {b.contactName && <p className="inv2-fine">Hi {b.contactName},</p>}
            <div className="inv2-val vb2-vendor">{b.vendorName}</div>
            {b.category && <p className="inv2-fine vb2-tight">{b.category}</p>}

            {b.arrivalTime && (<>
              <div className="inv2-label">Your arrival time</div>
              <div className="vb2-arrival">{fmtTime12(b.arrivalTime)}</div>
            </>)}

            {guestCount && (<>
              <div className="inv2-label">Guests</div>
              <div className="inv2-val" data-brief="guest-count">{guestCount} {guestCount === 1 ? 'guest' : 'guests'}</div>
              {dietLine && <p className="inv2-fine vb2-tight" data-brief="diet">{dietLine}</p>}
            </>)}

            {ros.length > 0 && (<>
              <div className="inv2-label">Your part of the day</div>
              <ol className="vb2-ros">
                {ros.map((r, i) => (
                  <li key={r.id || i}>
                    <span className="vb2-ros-when">{cueWhen(r)}</span>
                    <span>
                      <span className="vb2-ros-seg">{r.segment}</span>
                      {r.location && <span className="vb2-ros-sub">{r.location}</span>}
                      {r.notes && <span className="vb2-ros-sub">{r.notes}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </>)}

            {b.briefNote && (<>
              <div className="inv2-label">A note for you</div>
              <p className="vb2-note">{b.briefNote}</p>
            </>)}

            {(contact.name || contact.phone || contact.email) && (<>
              <div className="inv2-label">Your day-of contact</div>
              <div className="vb2-contact" data-brief="day-of-contact">
                {contact.name && <div className="inv2-val vb2-tight">{contact.name}</div>}
                {!contact.named && sender && sender !== contact.name && <p className="inv2-fine vb2-tight">{sender}</p>}
                {contact.phone && <a className="vb2-link" href={telHref(contact.phone)}>{contact.phone}</a>}
                {contact.email && <a className="vb2-link" href={'mailto:' + contact.email}>{contact.email}</a>}
                {site && <a className="vb2-link" href={site} target="_blank" rel="noopener noreferrer">{contact.website}</a>}
                {contact.ig && <p className="inv2-fine vb2-tight">{contact.ig}</p>}
              </div>
            </>)}

            {briefCode && (
              <ConfirmBlock briefCode={briefCode} contactName={b.contactName || ''} priorState={b.confirmState || null} sender={sender} />
            )}

            <div className="actions-row vb2-tools">
              <button className="mini" onClick={copyBrief}>{copied ? 'Copied' : 'Copy the brief'}</button>
              <button className="mini" onClick={() => window.print()}>Print the brief</button>
            </div>
          </div>
          <p className="inv2-fine vb2-foot">{fromLine}</p>
          <div className="inv2-wordmark">{BRAND.full}<span className="inv2-wm-dot" aria-hidden="true" /></div>
        </section>
      </div></div>
    </div>
  );
}

// Confirm-back (Phase 2A — capture only). Submits to the server keyed by the
// brief code; idempotent, so retries and changed answers update one row. It
// never mutates the event, vendor status, or logs.
function ConfirmBlock({ briefCode, contactName, priorState, sender }) {
  const [mode, setMode] = useState('idle');   // idle | choose | form | submitting | done | error
  const [state, setState] = useState('confirmed');
  const [name, setName] = useState(contactName || '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [doneState, setDoneState] = useState(priorState);
  const to = sender || 'the host';

  const startForm = (s) => { setState(s); setMode('form'); };
  const submit = async () => {
    setMode('submitting');
    try {
      await submitVendorBriefConfirmation(
        briefCode,
        buildConfirmationPayload(vendorBriefIdempotencyKey(briefCode), state, { onSiteName: name, onSitePhone: phone, note }),
      );
      setDoneState(state);
      setMode('done');
    } catch {
      setMode('error');
    }
  };

  if (mode === 'done' || (mode === 'idle' && doneState)) {
    const confirmed = doneState === 'confirmed';
    return (
      <div className="vb2-confirm" data-confirm={confirmed ? 'confirmed' : 'issue'} role="status">
        <div className="inv2-val">{confirmed ? 'You’re confirmed — thanks.' : `Your note was sent to ${to}.`}</div>
        <button className="mini" onClick={() => setMode('choose')}>Update your response</button>
      </div>
    );
  }

  if (mode === 'idle' || mode === 'choose') {
    return (
      <div className="vb2-confirm">
        <div className="inv2-label">Confirm with {to}</div>
        <div className="actions-row vb2-choices">
          <button className="cta" onClick={() => startForm('confirmed')}>All good — I'm confirmed</button>
          <button className="mini" onClick={() => startForm('issue_reported')}>Something's off</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vb2-confirm">
      <div className="inv2-label">{state === 'confirmed' ? 'Confirm your details' : `Tell ${to} what’s off`}</div>
      <input className="field" placeholder="On-site contact name" aria-label="On-site contact name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="field" placeholder="On-site phone" aria-label="On-site phone" type="tel" value={phone} onChange={(e) => setPhone(formatPhoneUS(e.target.value))} />
      <textarea className="field" rows={3} aria-label="Note"
        placeholder={state === 'confirmed' ? `Anything ${to} should know (optional)` : 'What’s off?'}
        value={note} onChange={(e) => setNote(e.target.value)} />
      {mode === 'error' && (
        <p className="grounding vb2-error" role="alert">That didn’t go through. Check your connection and try again.</p>
      )}
      <div className="actions-row">
        <button className="cta" onClick={submit} disabled={mode === 'submitting'}>
          {mode === 'submitting' ? 'Sending…' : `Send to ${to}`}
        </button>
        <button className="mini" onClick={() => setMode(doneState ? 'done' : 'idle')}>Cancel</button>
      </div>
    </div>
  );
}
