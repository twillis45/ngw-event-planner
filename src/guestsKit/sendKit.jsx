// What every hostv4 sheet that sends needs before anything leaves the device
// (owner, 11/25/2026: "Use the hostv2 sign-in for sending in hostv4"): the
// account hostv2 signed in (read, never signed in or out here) and the plan's
// reply link, checked (lib/inviteSend). Used by the invite and the nudge.
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@app/lib/supabaseClient';
import { replyLinkFor } from '@app/lib/inviteSend';
import { useKitHost } from './kitHost.js';

export const LINK_WHY = {
  unpublished: 'Your plan isn’t saved to your account yet. Open it once in the current app, signed in, and it saves.',
  'not-configured': 'Replies aren’t switched on for this app.',
  unavailable: 'We couldn’t reach your reply page. Check your connection and try again.',
};
// Why the reply link isn't ready, in the host's words. Inside hostv2 (a host
// that can open its own sign-in) the unsaved plan asks her to sign in here.
export const linkWhy = (reason, host) => (reason === 'unpublished' && host && host.openSignIn
  ? 'Your plan isn’t saved to your account yet. Sign in and it saves.'
  : (LINK_WHY[reason] || LINK_WHY.unavailable));

export function readProfile() { try { return JSON.parse(window.localStorage.getItem('ngw-profile')) || null; } catch { return null; } }

/** { acct: { state: 'checking'|'in'|'out', email }, link: { state, url, reason }, ready, check }. */
export function useSendReady(ev) {
  const [acct, setAcct] = useState({ state: 'checking', email: '' });
  const [link, setLink] = useState({ state: 'idle', url: '', reason: null });
  useEffect(() => {
    let live = true;
    if (!isSupabaseConfigured() || !supabase) { setAcct({ state: 'out', email: '' }); return undefined; }
    supabase.auth.getSession().then(({ data }) => {
      const s = data && data.session;
      if (live) setAcct(s ? { state: 'in', email: (s.user && s.user.email) || '' } : { state: 'out', email: '' });
    }).catch(() => { if (live) setAcct({ state: 'out', email: '' }); });
    return () => { live = false; };
  }, []);
  const check = () => {
    setLink({ state: 'checking', url: '', reason: null });
    replyLinkFor(ev).then((x) => setLink({ state: x.url ? 'ready' : 'missing', url: x.url, reason: x.reason }))
      .catch(() => setLink({ state: 'missing', url: '', reason: 'unavailable' }));
  };
  useEffect(() => { if (acct.state === 'in') check(); }, [acct.state]); // eslint-disable-line react-hooks/exhaustive-deps
  return { acct, link, ready: acct.state === 'in' && link.state === 'ready', check };
}

/** What stands between her and sending, said plainly with its one way forward; null once ready. */
export function NotReady({ acct, link, check }) {
  const host = useKitHost();
  if (acct.state === 'checking') return <p className="fine" role="status">Checking your account…</p>;
  if (acct.state === 'out') return host && host.openSignIn ? (<>
    <p className="qhelp">Sending uses your account, so replies come back to this plan.</p>
    <button className="primary" onClick={host.openSignIn}>Sign in</button>
  </>) : (<>
    <p className="qhelp">Sending uses your account, so replies come back to this plan. Sign in once in the current app, then come back here.</p>
    <a className="primary" href="../hostv2/">Sign in in the current app</a>
  </>);
  if (link.state === 'checking' || link.state === 'idle') return <p className="fine" role="status">Checking your reply link…</p>;
  if (link.state !== 'ready') return (<>
    <p className="qhelp" role="alert" data-link-missing><b>Your reply link isn’t ready.</b> {linkWhy(link.reason, host)} Nothing can go out without it.</p>
    {link.reason === 'unpublished' ? (host && host.openSignIn ? <button className="primary" onClick={host.openSignIn}>Sign in</button> : <a className="primary" href="../hostv2/">Open it in the current app</a>) : <button className="primary" onClick={check}>Try again</button>}
  </>);
  return null;
}
