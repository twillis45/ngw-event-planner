// FamilyViewV2 — the READ-ONLY family link (owner, 11/16/2026).
//
// Family opens ?family=CODE and sees the plan: when and where, how replies
// stand, the day's schedule, the checklist, and who's been hired. They cannot
// change anything, and the page never shows guest names, contact details or
// money — the server never sends them (backend/app/routers/family_view.py).
// The schedule is rebuilt here exactly as the host's app builds it
// (effectiveRos), from the fields the server allows through.
import { useEffect, useState } from 'react';
import { BRAND } from '@app/lib/brand';
import { invitePalette } from '@app/lib/inviteTone';
import { fetchFamilyPlan, isFamilyViewConfigured } from '@app/lib/api/familyView';
import { fmtLongSpan } from '@app/lib/doItForMe';
import { effectiveRos } from '@app/lib/playbooks';
import { isVendorBooked } from '@app/lib/workstreams';
import { toneVarsFor } from './inviteShared.js';
import { clock12 } from '@app/lib/clock';
import { formatVenueAddress } from '@app/lib/venueFor';

const TONE = toneVarsFor(invitePalette('light'));

const fmtTime12 = clock12;

function Holding({ title, body, busy }) {
  return (
    <div className="stagewrap"><div className="app" style={TONE}><div className="content">
      <section style={{ paddingTop: 120, textAlign: 'center' }} aria-busy={busy ? 'true' : undefined}>
        <div className="eyebrow">The plan</div>
        {title && <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.1 }}>{title}</h1>}
        <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)' }} aria-live="polite">{body}</p>
      </section>
    </div></div></div>
  );
}

export default function FamilyViewV2({ code }) {
  const [state, setState] = useState(undefined);   // undefined loading · { plan } · { reason }
  useEffect(() => {
    let dead = false;
    (async () => {
      const r = isFamilyViewConfigured() ? await fetchFamilyPlan(code) : { ok: false, reason: 'not-configured' };
      if (!dead) setState(r.ok ? { plan: r.plan } : { reason: r.reason });
    })();
    return () => { dead = true; };
  }, [code]);
  if (state === undefined) return <Holding busy body="Loading the plan…" />;
  if (!state.plan) {
    return state.reason === 'unavailable'
      ? <Holding title="The plan didn’t load" body="Check your connection and open the link again." />
      : <Holding title="This link isn’t live anymore" body="Ask whoever sent it for a fresh one." />;
  }
  return <FamilyPage plan={state.plan} />;
}

function FamilyPage({ plan }) {
  // Who hosts, by hostNameFor's rule: the server sends it as hostName.
  const host = String(plan.hostName || plan.hostNames || '').trim();
  // Every day of a multi-day event (fmtLongSpan, audit 2 E P1-1).
  const when = [fmtLongSpan(plan), fmtTime12(plan.startTime)].filter(Boolean).join(' · ');
  // The one place line (formatVenueAddress): name, street, City, ST ZIP. A
  // private home arrives without its street (family_view.py): its town only.
  const where = formatVenueAddress(plan);
  const rep = plan.replies || null;
  const repLine = rep ? [
    // Replies, not people (audit 2 E P2-1, 11/22/2026): the server counts reply
    // rows, and a reply can bring a plus-one, so "12 coming" read as heads
    // beside the host's own people count. It says who said yes.
    rep.yes ? `${rep.yes} said yes` : '', rep.maybe ? `${rep.maybe} maybe` : '',
    rep.no ? `${rep.no} can’t make it` : '', rep.waiting ? `${rep.waiting} haven’t replied` : '',
  ].filter(Boolean).join(' · ') : '';
  const ros = (() => {
    // A marked surprise never shows here (owner, 11/22/2026). The server already
    // leaves it out (family_view.py); this holds if a plan ever arrives whole.
    try { return (effectiveRos(plan) || []).filter((r) => r && !r.surprise && (r.label || r.segment)); } catch { return []; }
  })();
  const list = (Array.isArray(plan.checklist) ? plan.checklist : []).filter((t) => t && !t.surprise);
  const done = list.filter((t) => t.done).length;
  // Her own count when her app saved it (rule 12, audit #35, owner 11/24/2026):
  // it counts the steps her plan proves handled, which this page cannot see.
  const saved = plan.checklistCount && Number.isInteger(plan.checklistCount.done) && Number.isInteger(plan.checklistCount.total)
    && plan.checklistCount.done >= 0 && plan.checklistCount.done <= plan.checklistCount.total ? plan.checklistCount : null;
  const vendors = (Array.isArray(plan.vendors) ? plan.vendors : []).filter((v) => v && !v.surprise);
  return (
    <div className="stagewrap vb2-stage">
      <div className="app" style={TONE}><div className="content vb2-content">
        <section className="inv2 vb2" data-surface="family-view-v2">
          <div className="inv2-sheet">
            <div className="inv2-mast lp"><span>The plan</span><span className="mr" aria-hidden /><span className="vb2-from">View only</span></div>
            <h1 className="inv2-name lp-display">{plan.name || 'The party'}</h1>
            {when && <p className="inv2-fine vb2-when" data-family="when">{when}</p>}
            {where && <p className="inv2-fine vb2-tight" data-family="where">{where}</p>}
            {/* The dress code the invite shows (audit 2 E P2-7); the server already sends it. */}
            {String(plan.dressCode || '').trim() && <p className="inv2-fine vb2-tight" data-family="dress">Dress: {String(plan.dressCode).trim()}</p>}
            {plan.hashtag && <p className="inv2-fine vb2-tight" data-family="hashtag">{plan.hashtag}</p>}
            <hr className="inv2-rule" />

            {repLine && (
              <>
                <div className="inv2-label">Replies</div>
                <p className="inv2-fine vb2-tight" data-family="replies">{repLine}</p>
              </>
            )}

            {ros.length > 0 && (
              <>
                <div className="inv2-label" style={{ marginTop: 18 }}>The day</div>
                <ol className="vb2-ros" data-family="day">
                  {ros.map((r, i) => (
                    <li key={i}>
                      {r.time ? <span className="vb2-ros-when">{fmtTime12(r.time) || r.time}</span> : null}
                      <span className="vb2-ros-seg">{r.label || r.segment}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {list.length > 0 && (
              <>
                {/* What it counts, said (audit 2, E P1-4): the steps the host ticked.
                    Her own checklist also counts steps the plan proves handled,
                    which only her app can see. */}
                <div className="inv2-label" style={{ marginTop: 18 }} data-family="checklist-count">{saved
                  ? <>The checklist · {saved.done} of {saved.total} handled</>
                  : <>The checklist · {done} of {list.length} ticked off</>}</div>
                <ul className="fam-list" data-family="checklist">
                  {list.map((t, i) => (
                    <li key={i} data-done={t.done ? 'yes' : 'no'}>
                      <span aria-hidden="true" className="fam-tick">{t.done ? '✓' : '○'}</span>
                      <span className={t.done ? 'fam-done' : ''}>{t.task}</span>
                      <span className="sr-only">{t.done ? ' — done' : ' — not done yet'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {vendors.length > 0 && (
              <>
                <div className="inv2-label" style={{ marginTop: 18 }}>Who’s been hired</div>
                <ul className="fam-list" data-family="vendors">
                  {vendors.map((v, i) => (
                    <li key={i}>
                      <span>{v.name}{v.category ? <span className="fam-sub"> · {v.category}</span> : null}</span>
                      <span className="fam-sub">{isVendorBooked(v) ? 'Booked' : 'Not booked yet'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="inv2-fine vb2-foot" data-family="note" style={{ marginTop: 22 }}>
              View only — {host || 'the host'} keeps the plan, and this page shows it as last saved. Guest names, contact details and money aren’t shared here.
            </p>
          </div>
          <div className="inv2-wordmark">{BRAND.full}<span className="inv2-wm-dot" aria-hidden="true" /></div>
        </section>
      </div></div>
    </div>
  );
}
