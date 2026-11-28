// ─── THE GUESTS KIT, IN HOSTV2 (owner, 11/27/2026: "Bring the guest workflow
// and screens from v4 with v2 styling") ─────────────────────────────────────
// The shared kit's screens (src/guestsKit: the same files hostv4 shows), framed
// the way hostv4 frames them, in hostv2's colors (guestsKitSkin.css maps the
// kit's tokens to hostv2's). Each page is a hostv2 sheet of kind 'guests-kit'
// whose `from` is the page before it, so the phone's Back walks back one page
// at a time through hostv2's own overlay history (HostShellV2, closeSheet).
// Saves go through hostv2's one write path (patchEvent), so its Undo line is
// the one on screen. G2c-1: behind ?guests=kit.
import GuestsPage from '@app/guestsKit/GuestsPage.jsx';
import InvitePage from '@app/guestsKit/InvitePage.jsx';
import InviteDesignPage from '@app/guestsKit/InviteDesignPage.jsx';
import UpdatesPage from '@app/guestsKit/UpdatesPage.jsx';
import { useEffect, useState } from 'react';
import { useLayout } from '@app/guestsKit/layout.js';
import '@app/guestsKit/kit.css';
import './guestsKitSkin.css';

const TITLE = { guests: 'Guests', invite: 'Your invite', 'invite-design': 'Design this page', updates: 'Updates and questions' };
const back = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/**
 * @param {object} p
 * @param {object} p.event       the plan
 * @param {string} p.page        'guests' | 'invite' | 'invite-design' | 'updates'
 * @param {string} p.backTo      the label of where Back goes ("Your plan", or the page before)
 * @param {Function} p.save      a shared edit ({ patch, msg }) → saved through patchEvent
 * @param {Function} p.push      open a page over this one
 * @param {Function} p.onBack    back one page (closeSheet)
 * @param {boolean} p.sample     a sample plan
 */
export default function GuestsKitV2({ event, page, backTo, save, push, onBack, sample }) {
  const layout = useLayout();
  // hostv2's section rail (wide screens) stays the left column, as the approved
  // iPad render drew it: the layer starts at its right edge. No rail, no offset.
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const read = () => {
      const r = document.querySelector('.srail');
      const box = r && getComputedStyle(r).display !== 'none' ? r.getBoundingClientRect() : null;
      setLeft(box && box.width > 0 ? Math.round(box.right) : 0);
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  const navbar = (title, acts) => (<>
    <div className="navbar"><button className="backbtn" onClick={onBack} aria-label={'Back to ' + backTo}>{back}{backTo}</button></div>
    {acts ? <div className="ltrow"><h1 className="lt">{title}</h1>{acts}</div> : <h1 className="lt">{title}</h1>}
  </>);
  const body = (
    <div className="gk-app pushed" key={page}>
      {page === 'guests' && <GuestsPage key={event.id} ev={event} save={save} sample={sample} nav={(acts) => navbar(TITLE.guests, acts)} status={null} onInvite={() => push('invite')} onUpdates={() => push('updates')} layout={layout} />}
      {page === 'invite' && <InvitePage key={event.id} ev={event} save={save} nav={navbar(TITLE.invite)} status={null} onDesign={() => push('invite-design')} />}
      {page === 'invite-design' && <InviteDesignPage key={event.id} ev={event} save={save} nav={navbar(TITLE['invite-design'])} status={null} />}
      {page === 'updates' && <UpdatesPage key={event.id} ev={event} nav={navbar(TITLE.updates)} status={null} />}
    </div>
  );
  return (
    <div className="gk gk-v2" data-guests-kit={page} role="dialog" aria-modal="true" aria-label={TITLE[page]} style={left ? { left } : undefined}>
      {layout === 'phone' ? body : <div className={'tablet ' + layout} data-layout={layout}>{body}</div>}
    </div>
  );
}

export const GUESTS_KIT_TITLE = TITLE;
