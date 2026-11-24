// "Notifications on this device" — the You & settings row (owner decision "B",
// 11/20/2026). Everything it decides is in @app/lib/devicePush (tested in
// jest); this file only draws the row and wires the tap.
//
// It renders NOTHING until loadPushRow says the row can work here (signed in,
// a capable browser that is not an iPhone or iPad, the worker not killed, the
// server holding a key), and permission is asked for only inside the tap.
import { useEffect, useState } from 'react';
import { loadPushRow, turnOnPush, turnOffPush, pushLine, PUSH_LABEL } from '@app/lib/devicePush';
import { trackPushEnabled, trackPushDisabled } from '@app/lib/flowAnalytics';
import { offlineShellKilled } from './offline/register';

export default function DeviceNotificationsRow({ signedIn }) {
  const [row, setRow] = useState({ show: false });
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    let dead = false;
    setRow({ show: false });
    loadPushRow({ signedIn, swKilled: offlineShellKilled() }).then((r) => { if (!dead) setRow(r); });
    return () => { dead = true; };
  }, [signedIn]);

  if (!row.show) return null;
  const blocked = row.permission === 'denied';

  const tap = async () => {
    setBusy(true);
    try {
      if (row.on) {
        await turnOffPush();
        setRow((r) => ({ ...r, on: false }));
        setOutcome(null);
        trackPushDisabled();
      } else {
        const r = await turnOnPush(row.key);
        if (r.ok) {
          setRow((x) => ({ ...x, on: true, permission: 'granted' }));
          setOutcome(null);
          trackPushEnabled();
        } else {
          if (r.reason === 'denied') setRow((x) => ({ ...x, permission: 'denied' }));
          setOutcome(r.reason);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="later-row" style={{ flexWrap: 'wrap' }} data-device-notifications>
      <span className="t">{PUSH_LABEL}</span>
      {blocked
        ? <span className="v-meta" data-device-notifications-blocked>Blocked in this browser</span>
        : (
          <button className="mini" aria-pressed={row.on} disabled={busy} onClick={tap}>
            {row.on ? 'On' : 'Off'}
          </button>
        )}
      <span className="v-meta" style={{ flexBasis: '100%', margin: '4px 0 0' }} data-device-notifications-line>
        {pushLine({ on: row.on, permission: row.permission, outcome })}
      </span>
    </div>
  );
}
