// hostv4 LOCK THE COUNT (owner, 11/25/2026: "the Guests page's bottom button
// after the reply-by date, and nowhere else"). hostv2's count lock, word for
// word, through lib/guestEdits: set it at the confirmed yeses (covers, not
// rows: a yes can bring a +1 or kids), or at the number planned around; once
// set, it can be reopened.
import { confirmedCovers } from '@app/lib/confirmedCovers';
import { guestCountFor } from '@app/lib/guestCountFor';
import { lockCountEdit, reopenCountEdit } from '@app/lib/guestEdits';

export default function LockSheet({ ev, save, onDone }) {
  const yes = confirmedCovers(ev);
  const planned = Number(ev.guestEstimate) || Number(guestCountFor(ev).count) || 0;
  const locked = ev.guestMode === 'count' ? Number(ev.guestCount) || 0 : 0;
  const pick = (ed) => { save(ed); onDone(); };
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label="Lock the count" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{locked ? 'Locked at ' + locked : 'Lock the count'}</h2><button className="link" onClick={onDone}>Done</button></div>
        {locked ? (<>
          <p className="qhelp">Food and seats size to {locked}. Reopen it if more replies come in.</p>
          <div className="grp"><button className="row go" data-reopen onClick={() => pick(reopenCountEdit())}>Reopen the count</button></div>
        </>) : (<>
          <p className="qhelp">Replies were due by now. Lock the number so food and seats size to it.</p>
          <div className="grp" data-lock-options>
            {yes > 0 && <button className="row go" data-lock="yes" onClick={() => pick(lockCountEdit(yes, 'yes'))}><span className="nm">Set it at {yes}<small>Your confirmed yeses</small></span></button>}
            {planned > 0 && planned !== yes && <button className="row go" data-lock="planned" onClick={() => pick(lockCountEdit(planned, 'planned'))}><span className="nm">Set it at {planned}<small>The number you planned around</small></span></button>}
          </div>
          <p className="fine"><button className="link" onClick={onDone}>Check the list first</button></p>
        </>)}
      </div>
    </div>
  );
}
