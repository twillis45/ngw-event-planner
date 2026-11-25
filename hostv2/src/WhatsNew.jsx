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

// When each release went out, baked by vite.config.js from the release tags
// (owner, 11/25/2026). Empty in a build without tags.
// eslint-disable-next-line no-undef
const RELEASE_TIMES = typeof __NGW_RELEASE_TIMES__ !== 'undefined' ? __NGW_RELEASE_TIMES__ : {};

// "Nov 24, 2026 · 11:44 PM EST": the release's own date and time, in the
// host's zone. Without a known release time, the entry's date alone.
const fmtWhen = (e, releaseTimes, timeZone) => {
  const at = e.through && releaseTimes[e.through] ? new Date(releaseTimes[e.through]) : null;
  if (!at || !Number.isFinite(at.getTime())) return fmtDate(e.date);
  const opts = timeZone ? { timeZone } : {};
  const day = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts });
  const time = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', ...opts });
  return day + ' · ' + time;
};

export function WhatsNewList({ entries = ENTRIES, releaseTimes = RELEASE_TIMES, timeZone }) {
  return (
    <div className="whats-new" data-whats-new-list>
      {entries.map((e, i) => (
        <section key={i} className="whats-new-entry">
          <div className="grounding">{fmtWhen(e, releaseTimes, timeZone)}</div>
          <h3>{e.headline}</h3>
          <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

export function VersionAndWhatsNew({ build = BUILD, entries = ENTRIES }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="grounding build-line" data-build-line>
        <button type="button" className="whats-new-toggle" data-whats-new aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {buildLabel(build)} · <span className="whats-new-link">What’s new</span>
        </button>
      </p>
      {open && <WhatsNewList entries={entries} />}
    </>
  );
}
