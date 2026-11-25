// EventHashtag — "Event hashtag" in Make it yours (owner ruling E, 11/16/2026).
//
// OFF until the host turns it on; host-chosen and host-removable. Up to three
// suggestions built only from the event's own data (lib/eventHashtag), or the
// host's own (normalizeHashtag). Stored on the event as `event.hashtag`; the
// invite shows it quietly, the printed day sheet carries it, and share captions
// use it. Board (11/16): never claim a tag is unused or available — nothing
// here can know that, so nothing here says it — and no call for guests to post.
import { useState } from 'react';
import { suggestHashtags, normalizeHashtag } from '@app/lib/eventHashtag';
import { instagramTagUrl } from '@app/lib/photoShare';

export default function EventHashtag({ event, onSet }) {
  const current = String((event && event.hashtag) || '').trim();
  const [custom, setCustom] = useState('');
  const suggestions = (() => {
    try {
      return suggestHashtags({
        type: event.type, honoree: event.honoree, hostName: event.hostName, name: event.name, date: event.date,
      }).filter((t) => t !== current);
    } catch { return []; }
  })();
  const cleaned = normalizeHashtag(custom);
  const tagUrl = instagramTagUrl(current);
  return (
    <div data-event-hashtag style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{ fontSize: 'var(--t-body)', fontWeight: 650, color: 'var(--ink)', letterSpacing: '-.01em', marginBottom: 6 }}>Event hashtag</div>
      {current ? (
        <>
          <p className="grounding" data-hashtag-current style={{ margin: '0 0 6px' }}>
            <b style={{ color: 'var(--ink)' }}>{current}</b> — on your invite, your printed day sheet, and the caption when someone shares an approved photo.
          </p>
          <div className="actions-row" style={{ flexWrap: 'wrap' }}>
            {tagUrl && <a className="mini" href={tagUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>See posts with this tag on Instagram</a>}
            <button className="mini" data-hashtag-remove onClick={() => onSet('', 'Hashtag removed — it’s off your invite and captions.')}>Remove the hashtag</button>
          </div>
        </>
      ) : (
        <p className="grounding" style={{ margin: '0 0 6px' }}>Off. Turn one on and it shows on your invite and in photo captions. Another event may already use the same tag — Instagram can’t tell us.</p>
      )}
      {suggestions.length > 0 && (
        <div className="actions-row" style={{ flexWrap: 'wrap', marginTop: 'var(--sp-2)' }} role="group" aria-label="Suggested hashtags">
          {suggestions.map((t) => (
            <button key={t} className="mini" data-hashtag-suggestion onClick={() => onSet(t, `${t} is on your invite now.`)}>Use {t}</button>
          ))}
        </div>
      )}
      <div className="actions-row" style={{ marginTop: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Labeled (cohesion G): it had no words above it to promote. */}
        <label className="field-wrap" style={{ flex: '1 1 200px', maxWidth: 260 }}>
          <span className="field-label">Your own hashtag</span>
          <input className="field ex-ph" style={{ maxWidth: 'none', width: '100%', fontSize: 'var(--t-input)' }} placeholder="For example: #RosaTurns50"
            value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        <button className="mini" disabled={!cleaned || cleaned === current} style={!cleaned || cleaned === current ? { opacity: .45 } : undefined}
          onClick={() => { onSet(cleaned, `${cleaned} is on your invite now.`); setCustom(''); }}>
          {cleaned ? `Use ${cleaned}` : 'Use this tag'}
        </button>
      </div>
    </div>
  );
}
