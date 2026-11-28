// THE PAGE THEY OPEN, framed (owner, 11/26/2026: "start the invite preview"):
// the guest's own invite page in preview mode (hostv2/src/main.jsx,
// ?invite-preview). One frame for Your invite and its design page. A saved
// change gives the frame a new key, so it reloads.
import { useMemo, useState } from 'react';
import { useKitHost } from './kitHost.js';

export default function InvitePreview({ ev, height }) {
  const host = useKitHost();
  const [full, setFull] = useState(false);
  const key = useMemo(() => { try { return JSON.stringify(ev); } catch { return String(Math.random()); } }, [ev]);
  return (<>
    <div className="pvframe" data-preview-frame data-full={full ? '1' : '0'} style={height && !full ? { height } : undefined}>
      <iframe key={key} data-invite-preview title="The page guests open" loading="lazy"
        src={host && host.previewSrc ? host.previewSrc(ev.id) : '../hostv2/?invite-preview=' + encodeURIComponent(ev.id)} />
    </div>
    <p className="fine">What a guest sees when they tap the link. Nothing is sent from here.{' '}
      <button className="link" aria-expanded={full} onClick={() => setFull((f) => !f)}>{full ? 'Show less' : 'See the full invite'}</button>
    </p>
  </>);
}
