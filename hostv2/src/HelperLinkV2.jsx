// HelperLinkV2 — the PUBLIC page a host's helper opens (?helper=CODE).
//
// Helper link, owner-approved 11/15/2026, FREE. A host gave Jordan a job
// ("brings the stuffing"); Jordan's text from the host carries this link.
// No sign-in: the unguessable code is the only credential. The page shows who
// is asking, the event, and Jordan's own jobs — the server's whitelist
// (backend/app/routers/helper_link.py), nothing else — and two answers:
// "I've got it" / "I can't" (+ an optional note). The answer can be changed
// later, and it lands in the host's plan.
//
// Same paper as the vendor brief (VendorBriefV2): light stationery, 390px
// first, no host chrome, and the brief's own classes rather than new ones.
import { useEffect, useState } from 'react';
import { BRAND } from '@app/lib/brand';
import { invitePalette } from '@app/lib/inviteTone';
import { fetchPublicHelperLink, isHelperLinkApiConfigured, submitHelperAnswer, helperIdempotencyKey } from '@app/lib/api/helperLink';
import { fmtLongSpan } from '@app/lib/doItForMe';
import { formatVenueAddress } from '@app/lib/venueFor';
import { toneVarsFor } from './inviteShared.js';
import { clock12 } from '@app/lib/clock';
import { trackHelperAnswered } from '@app/lib/flowAnalytics';

const TONE = toneVarsFor(invitePalette('light'));

const fmtTime12 = clock12;

function Holding({ title, body, busy }) {
  return (
    <div className="stagewrap"><div className="app" style={TONE}><div className="content">
      <section style={{ paddingTop: 120, textAlign: 'center' }} aria-busy={busy ? 'true' : undefined}>
        <div className="eyebrow">Your job</div>
        {title && <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.1 }}>{title}</h1>}
        <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)' }} aria-live="polite">{body}</p>
      </section>
    </div></div></div>
  );
}

export default function HelperLinkV2({ code }) {
  // undefined = loading, null = not found, object = this helper's page
  const [h, setH] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = isHelperLinkApiConfigured() ? await fetchPublicHelperLink(code) : null;
      if (!cancelled) setH(p && Array.isArray(p.jobs) && p.jobs.length ? p : null);
    })();
    return () => { cancelled = true; };
  }, [code]);
  if (h === undefined) return <Holding busy body="Loading your job…" />;
  if (!h) return <Holding title="This link isn’t live anymore" body="Ask whoever sent it for a fresh one." />;
  return <HelperPage h={h} code={code} />;
}

function HelperPage({ h, code }) {
  const host = String(h.hostName || '').trim();
  const to = host ? host.split(/\s+/)[0] : 'the host';
  const first = String(h.helperName || '').trim().split(/\s+/)[0];
  // The payload as the event shape the outward readers take (helper_link.py
  // helper_event): every day of the span, and the one place line, street,
  // City, ST ZIP, as the host sees it (audit 2, lane E P0-4, P1-1).
  const ev = { date: h.eventDate, endDate: h.endDate, venue: h.venue, venueAddress: h.venueAddress, venueStreet: h.venueStreet,
    venueCity: h.venueCity, venueState: h.venueState, venueZip: h.venueZip, venueKind: h.venueKind, venueConfirmed: h.venueConfirmed };
  const when = [fmtLongSpan(ev), fmtTime12(h.startTime)].filter(Boolean).join(' · ');
  const where = formatVenueAddress(ev);
  const jobs = h.jobs || [];
  return (
    <div className="stagewrap vb2-stage">
      <div className="app" style={TONE}><div className="content vb2-content">
        <section className="inv2 vb2" data-surface="helper-link-v2">
          <div className="inv2-sheet">
            <div className="inv2-mast lp"><span>{jobs.length === 1 ? 'Your job' : 'Your jobs'}</span><span className="mr" aria-hidden /><span className="vb2-from">{host ? `From ${host}` : 'From the host'}</span></div>
            <h1 className="inv2-name lp-display">{h.eventName || 'The party'}</h1>
            {when && <p className="inv2-fine vb2-when">{when}</p>}
            {where && <p className="inv2-fine vb2-tight" data-helper="where">{where}</p>}
            <hr className="inv2-rule" />
            {first && <p className="inv2-fine">Hi {first},</p>}
            <p className="inv2-fine vb2-tight">{host ? `${host} is counting on you for:` : 'The host is counting on you for:'}</p>
            <ol className="vb2-ros" data-helper="jobs">
              {jobs.map((j, i) => (
                <li key={i}>
                  {j.time ? <span className="vb2-ros-when">{fmtTime12(j.time) || j.time}</span> : null}
                  <span className="vb2-ros-seg">{j.label}</span>
                </li>
              ))}
            </ol>
            <AnswerBlock code={code} to={to} prior={h.answer || null} />
          </div>
          <p className="inv2-fine vb2-foot">{host ? `From ${host}` : 'From the host'}</p>
          <div className="inv2-wordmark">{BRAND.full}<span className="inv2-wm-dot" aria-hidden="true" /></div>
        </section>
      </div></div>
    </div>
  );
}

// The answer. Idempotent per code, so a retry or a changed mind updates one
// row. A failed send says so and keeps what was typed — never a fake "done".
function AnswerBlock({ code, to, prior }) {
  const [mode, setMode] = useState(prior ? 'done' : 'choose');   // choose | note | sending | done | error
  const [answer, setAnswer] = useState(prior);                     // { state, note }
  const [note, setNote] = useState((prior && prior.note) || '');
  const [pending, setPending] = useState(null);                    // the state being sent

  const send = async (state, n) => {
    setPending(state);
    setMode('sending');
    try {
      await submitHelperAnswer(code, { idempotency_key: helperIdempotencyKey(code), state, note: n || null });
      setAnswer({ state, note: n || null });
      setMode('done');
      // Yes or no, after the server took it; never the note. Through track(),
      // so the same opt-out as the guest invite page's invite_viewed applies.
      trackHelperAnswered(state);
    } catch {
      setMode('error');
    }
  };

  if (mode === 'done' && answer) {
    const yes = answer.state === 'confirmed';
    return (
      <div className="vb2-confirm" data-answer={yes ? 'confirmed' : 'declined'} role="status">
        <div className="inv2-val">{yes ? `You’re on it — ${to} will see that in the plan.` : `${to} will see that you can’t make it.`}</div>
        {!yes && answer.note && <p className="vb2-note">“{answer.note}”</p>}
        <button className="mini" onClick={() => setMode('choose')}>Change my answer</button>
      </div>
    );
  }

  if (mode === 'choose' || (mode === 'sending' && pending === 'confirmed') || (mode === 'error' && pending === 'confirmed')) {
    return (
      <div className="vb2-confirm">
        <div className="inv2-label">Can you do it?</div>
        <div className="actions-row vb2-choices">
          <button className="cta" disabled={mode === 'sending'} onClick={() => send('confirmed', '')}>
            {mode === 'sending' ? 'Sending…' : 'I’ve got it'}
          </button>
          <button className="mini" disabled={mode === 'sending'} onClick={() => { setPending('declined'); setMode('note'); }}>I can’t</button>
        </div>
        {mode === 'error' && <p className="grounding vb2-error" role="alert">That didn’t go through. Check your connection and try again.</p>}
      </div>
    );
  }

  return (
    <div className="vb2-confirm">
      <div className="inv2-label">Tell {to} you can’t</div>
      <textarea className="field" rows={3} aria-label="Note" placeholder={`Anything ${to} should know (optional)`}
        value={note} onChange={(e) => setNote(e.target.value)} />
      {mode === 'error' && <p className="grounding vb2-error" role="alert">That didn’t go through. Check your connection and try again.</p>}
      <div className="actions-row">
        <button className="cta" disabled={mode === 'sending'} onClick={() => send('declined', note.trim())}>
          {mode === 'sending' ? 'Sending…' : `Send to ${to}`}
        </button>
        <button className="mini" onClick={() => setMode(answer ? 'done' : 'choose')}>Cancel</button>
      </div>
    </div>
  );
}
