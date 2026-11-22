// What's new (owner, 11/22/2026): the version line at the foot of You &
// settings opens a short, plain list of recent changes, read from the checked-in
// whatsNew.json (date, a headline with no version number, 1–3 bullets). Written
// by hand: PR titles and handoff notes are for us, not for a host. No new tab,
// no new sheet; it opens in place under the version line.
// test/whatsNewIsCurrent.test.mjs pins the list, the guard (whatsNewIsBehind in
// scripts/calver.mjs, never imported here: it is Node-only) and the markup.
import { useState } from 'react';
import ENTRIES from './whatsNew.json';
import { BUILD, buildLabel } from './BuildLine.jsx';

const fmtDate = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  // Noon UTC: the same calendar day in every zone a host can be in.
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

export function WhatsNewList({ entries = ENTRIES }) {
  return (
    <div data-whats-new-list style={{ marginTop: 'var(--sp-3)', textAlign: 'left' }}>
      {entries.map((e, i) => (
        <section key={i} style={{ padding: 'var(--sp-3) 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
          <div className="grounding" style={{ margin: 0 }}>{fmtDate(e.date)}</div>
          <h3 style={{ margin: '2px 0 var(--sp-1)', fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)' }}>{e.headline}</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1em', color: 'var(--ink)', fontSize: 'var(--t-meta)', lineHeight: 1.45 }}>
            {e.bullets.map((b, j) => <li key={j} style={{ margin: '2px 0' }}>{b}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function VersionAndWhatsNew({ build = BUILD, entries = ENTRIES }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="grounding" data-build-line style={{ margin: 'var(--sp-4) 0 0', textAlign: 'center' }}>
        <button type="button" data-whats-new aria-expanded={open} onClick={() => setOpen((v) => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 'var(--tap-min)', background: 'none', border: 'none', padding: '0 var(--sp-1)', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
          {buildLabel(build)} · <span style={{ textDecoration: 'underline', marginLeft: '0.3em' }}>What’s new</span>
        </button>
      </p>
      {open && <WhatsNewList entries={entries} />}
    </>
  );
}
