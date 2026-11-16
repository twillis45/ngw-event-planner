// GuestUpdatesV2 — "Updates from your host" on the invite (11/16/2026; server:
// backend/app/routers/announcements.py, migration 027).
//
// The host's posts, newest first, body and time only. Nothing to do here and
// nothing shown when there are none: an invite with no updates should not
// carry an empty box. A failed load shows nothing either; the invite itself
// must never look broken because a side list didn't load.
import { useEffect, useState } from 'react';
import { fetchInviteAnnouncements, isAnnouncementsApiConfigured } from '@app/lib/api/announcements';

const when = (iso) => {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
};

export default function GuestUpdatesV2({ code, hostName }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let dead = false;
    if (!code || !isAnnouncementsApiConfigured()) return undefined;
    fetchInviteAnnouncements(code).then((r) => {
      if (dead || !r.ok || !Array.isArray(r.announcements)) return;
      setItems(r.announcements.filter((a) => a && typeof a.body === 'string'));
    });
    return () => { dead = true; };
  }, [code]);
  if (!items.length) return null;
  const host = String(hostName || '').trim().split(/\s+/)[0] || 'your host';
  return (
    <div className="card no-hover" data-guest-updates style={{ marginTop: 14 }}>
      <div style={{ padding: '14px 18px' }}>
        <div className="inv2-label lp" style={{ marginBottom: 8 }}>Updates from {host}</div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((a, i) => (
            <li key={i} data-guest-update>
              <div className="of">{when(a.created_at)}</div>
              <p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
