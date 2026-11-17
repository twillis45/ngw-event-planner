// FamilyLinkSheet — "Share with family" (owner, 11/16/2026: "read-only family
// link"). The host turns on one link; anyone holding it sees the plan and
// cannot change it. Turning it off clears the code, and the old link stops
// opening at once. Turning it on again makes a new link.
//
// The link reads the plan as SAVED to the server, so it needs a signed-in host
// whose plan is kept; signed out, the sheet says so and offers nothing to copy.
import { useState } from 'react';
import { track as trackEvent, EVENTS as ANALYTICS } from '@app/lib/analytics';
import { newFamilyCode } from '@app/lib/api/familyView';

export default function FamilyLinkSheet({ event, signedIn, appUrl, onSave, onLine }) {
  const [confirmOff, setConfirmOff] = useState(false);
  const code = String(event.familyCode || '').trim();
  const url = code ? appUrl + '?family=' + encodeURIComponent(code) : '';

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: event.name || 'The plan', url }); return; }
    } catch { /* closed the sheet: nothing to say */ return; }
    try { await navigator.clipboard.writeText(url); onLine('Link copied — send it to family.'); }
    catch { onLine('Copy didn’t work here — press and hold the link to copy it.'); }
  };

  return (
    <div data-family-link>
      <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>
        One link for family to see the plan — they can look, not change anything.
      </p>
      <div className="fam-two">
        <div>
          <div className="shelf-label" style={{ margin: '0 0 var(--sp-1)' }}>They’ll see</div>
          <p className="grounding" style={{ margin: 0 }}>When and where, how replies stand, the day’s schedule, the checklist, and who’s been hired.</p>
        </div>
        <div>
          <div className="shelf-label" style={{ margin: '0 0 var(--sp-1)' }}>They won’t see</div>
          <p className="grounding" style={{ margin: 0 }}>Guest names or contact details, any money, or your notes.</p>
        </div>
      </div>

      {!signedIn ? (
        <p className="grounding" data-family-signed-out style={{ margin: 'var(--sp-4) 0 0' }}>
          Sign in and keep this plan first — the family link shows the plan as it’s saved.
        </p>
      ) : !code ? (
        <button className="cta" style={{ width: '100%', marginTop: 'var(--sp-4)' }} data-family-on
          onClick={() => { onSave({ familyCode: newFamilyCode() }, 'The family link is on.'); try { trackEvent(ANALYTICS.FAMILY_LINK_ON); } catch (_e) { /* counter only */ } }}>
          Turn on the family link
        </button>
      ) : (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <div className="shelf-label" style={{ margin: '0 0 var(--sp-1)' }}>The link</div>
          <p className="fam-url" data-family-url>{url}</p>
          <div className="actions-row" style={{ flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
            <button className="cta" onClick={share}>Send it to family</button>
            {confirmOff ? (
              <>
                <button className="mini danger" data-family-off onClick={() => { setConfirmOff(false); onSave({ familyCode: null }, 'The family link is off — the old link won’t open anymore.'); }}>Turn it off</button>
                <button className="mini" onClick={() => setConfirmOff(false)}>Keep it on</button>
              </>
            ) : (
              <button className="mini" onClick={() => setConfirmOff(true)}>Turn off the link</button>
            )}
          </div>
          <p className="grounding" style={{ margin: 'var(--sp-2) 0 0' }}>
            Family sees your changes once they’re saved. Turning the link off and on again makes a new one, and the old one stops working.
          </p>
        </div>
      )}
    </div>
  );
}
