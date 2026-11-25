// The iPad sidebar (UX_13 §1): it replaces the tab bar on tablets. Places
// first (Next step, Your plan, The Day), then the plan parts hostv4 can open,
// each with its one-glance state. Parts hostv4 cannot open yet say so and open
// the current app; nothing here pretends.
import { confirmedRsvpCovers } from '@app/lib/confirmedCovers';

export default function Sidebar({ ev, date, tabs, here, onTab, onGuests, onClose }) {
  const coming = confirmedRsvpCovers(ev);
  return (
    <aside className="side" aria-label="Places">
      <div className="sidehead">
        <h1>{ev.name}</h1>
        <p className="sub">{date}{Number(ev.guestEstimate) ? ' · ' + ev.guestEstimate + ' guests' : ''}</p>
      </div>
      <nav className="sidenav">
        {tabs.map(([id, label, icon]) => (
          <button key={id} aria-current={here === id ? 'page' : undefined} onClick={() => { onTab(id); onClose(); }}>{icon}{label}</button>
        ))}
      </nav>
      <h2 className="sidelbl">Plan parts</h2>
      <nav className="sidenav">
        <button data-side="guests" aria-current={here === 'guests' ? 'page' : undefined} onClick={() => { onGuests(); onClose(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 5.5a3 3 0 010 5.6M17.5 14.6c1.6.6 2.6 2 3 4.4" /></svg>
          Guests<span className="sval">{coming ? coming + ' coming' : (ev.guests || []).length + ' named'}</span>
        </button>
      </nav>
      <p className="fine">Budget, food, the place and the day are in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>
    </aside>
  );
}
