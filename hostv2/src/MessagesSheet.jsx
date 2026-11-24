// MessagesSheet — "Messages" (owner, 11/20/2026: "Yes, build the Messages view").
//
// READ-ONLY. One timeline for the event, newest first: who it was to, what it
// was, how, when, and its true status. The words and the merge are all in
// lib/messageTimeline (pure, tested); this file only fetches and draws.
// No resend and no compose: those live on the draft sheet and the guest list,
// and a second copy here would be a duplicate surface. The one action is the
// app's existing way to start: the guest list, where the invite is sent.
import { useEffect, useRef, useState } from 'react';
import { listSentMessages } from '@app/lib/commApi';
import { buildMessageTimeline, filterTimeline, groupsPresent, EMPTY_LINE, EMPTY_EYEBROW, EMPTY_STAR, NOTE_TITLE } from '@app/lib/messageTimeline';
import { Eyebrow, BigValue, GuideLine } from './parity/askKit';
import { trackMessagesViewOpened } from '@app/lib/flowAnalytics';

const TONE = {
  ok: { color: 'var(--ok)' },
  muted: { color: 'var(--muted)' },
  warn: { color: 'var(--warn)' },
  danger: { color: 'var(--danger)' },
  // Host-attested (the ledger's own rule): an outline, never a filled pill.
  attested: { color: 'var(--steel-soft)' },
};

export default function MessagesSheet({ event, helpers, helperAnswers, onOpenGuests, entry, signedIn }) {
  const [server, setServer] = useState({ status: 'loading' });
  const [group, setGroup] = useState('all');
  useEffect(() => {
    let dead = false;
    setServer({ status: 'loading' });
    listSentMessages(event.id).then((r) => { if (!dead) setServer(r); });
    return () => { dead = true; };
  }, [event.id]);

  const { entries, note, empty } = buildMessageTimeline({ event, server, helpers, helperAnswers });
  const groups = groupsPresent(entries);
  const shown = filterTimeline(entries, groups.some(([k]) => k === group) ? group : 'all');

  // messages_view_opened, once per opening, after the server's answer is in so
  // the counts are what the host was shown (kinds and counts only).
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current || server.status === 'loading') return;
    counted.current = true;
    trackMessagesViewOpened(entries, entry, signedIn);
  }, [server.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-messages>
      {server.status === 'loading' && <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>Loading what the app sent…</p>}
      {/* Nothing listed: the hero says so and what will be listed (cohesion G
          #27). A load failure is its own row below it, never a pointer to a
          list that is not there. `empty` (every source answered) still decides
          the way to start. */}
      {/* Signed out, email the app sent may exist on the account, so "Nothing
          yet" is not said; the note row says where it will show. */}
      {server.status !== 'loading' && server.status !== 'signed-out' && entries.length === 0 && (
        <div data-messages-empty style={{ padding: '2px 0 14px' }}>
          <Eyebrow>{EMPTY_EYEBROW}</Eyebrow>
          <BigValue>{EMPTY_STAR}</BigValue>
          <GuideLine>{EMPTY_LINE}</GuideLine>
          {empty && onOpenGuests && <button className="mini" style={{ marginTop: 'var(--sp-2)' }} onClick={onOpenGuests}>Open your guest list</button>}
        </div>
      )}
      {note && (
        <div className="later-row" data-messages-note style={{ display: 'block', borderTop: '1px solid var(--line-soft)', padding: 'var(--sp-3) 0', margin: '0 0 var(--sp-3)' }}>
          <strong className="t" style={{ display: 'block', color: 'var(--ink)' }}>{NOTE_TITLE}</strong>
          <span className="grounding" style={{ display: 'block', margin: '2px 0 0' }}>{note}</span>
        </div>
      )}
      {groups.length > 2 && (
        <div className="actions-row" role="radiogroup" aria-label="Show" style={{ flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
          {groups.map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={group === k} data-messages-filter={k}
              className={'mini' + (group === k ? ' on' : '')} onClick={() => setGroup(k)}>{label}</button>
          ))}
        </div>
      )}
      {shown.length > 0 && (
        <ul className="split-people" data-messages-list style={{ marginTop: 0 }}>
          {shown.map((e) => (
            <li key={e.key} data-message={e.key} data-group={e.group} data-source={e.source}
              style={{ display: 'block', minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ fontWeight: 600 }}>{e.who || e.what}</div>
              <div className="fam-sub" style={{ marginTop: 2 }}>
                {[e.who ? e.what : null, e.how, e.when].filter(Boolean).join(' · ')}
              </div>
              <div data-message-status style={{ marginTop: 4, fontSize: 'var(--t-row-sub)', fontWeight: 600, ...(TONE[e.tone] || TONE.muted) }}>
                {e.status}
              </div>
              {(e.detail || []).map((d) => (
                <div key={d} className="fam-sub" data-message-detail
                  style={{ marginTop: 2, ...(e.detailTone ? TONE[e.detailTone] : {}) }}>{d}</div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
