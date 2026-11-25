// ShareInviteCard — "Share & invite" in four steps (owner-approved renders
// s2-1, s2-2 and s2-2b, 11/24/2026: "build it").
//
//   1 Get it right       Invite page (the panel) · Invite message (the words)
//   2 Send it            Invite your guest list (N) · quiet once everyone is
//                        invited · lit again as "Invite N new guests"
//   3 Share another way  Share the link · Show QR code · Invite text (before sending)
//   4 After it's out     a quiet fold until something is sent; then the tally,
//                        Nudge the N who haven't replied, Update everyone and
//                        Send the details
//
// ONE LIT BUTTON THAT MOVES (UX_11 rule 1): the list send before anything goes
// out, the nudge after; when a new guest lights the send again, the nudge goes
// quiet. Every number here comes from the shell's readers (inviteRecipients,
// nudgeRecipients, wasInvited, rsvpHasResponded); this file only lays them out.
import { useState } from 'react';

const ic = (d) => (
  <svg className="si-ic" viewBox="0 0 24 24" aria-hidden="true">{d}</svg>
);
const IC = {
  page: ic(<><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" /></>),
  msg: ic(<><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>),
  share: ic(<><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>),
  qr: ic(<><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h6v-3" /></>),
  text: ic(<><path d="M5 5h14v10H9l-4 4z" /><path d="M8.5 9h7M8.5 12h4.5" /></>),
};

const Step = ({ n, children }) => (
  <div className="si-step" data-si-step role="heading" aria-level={3}><span className="si-n" aria-hidden="true">{n}</span>{children}</div>
);

const Row = ({ kind, icon, title, sub, subOk, action, onOpen }) => (
  <button type="button" className="settled-card si-row" data-si-row={kind} onClick={onOpen}>
    <span className="si-rowic">{icon}</span>
    <span className="settled-card-main">
      <span className="settled-card-title">{title}</span>
      <span className={'settled-card-sub' + (subOk ? ' si-ok' : '')}>{sub}</span>
    </span>
    <span className="settled-card-end"><span className="settled-card-action">{action}</span><span className="fstat-chev" aria-hidden="true">›</span></span>
  </button>
);

export default function ShareInviteCard({ page, message, send, share, after }) {
  const [afterOpen, setAfterOpen] = useState(false);
  const nudgeLit = !!(after.nudge && after.out && !(send.kind === 'first' || send.kind === 'new'));
  const shareLit = send.kind === 'none' && !after.out;
  const later = (
    <div className="si-row2">
      <button type="button" className="mini si-two" onClick={after.onUpdate}><span className="si-t">Update everyone</span><span className="si-s">Something changed</span></button>
      <button type="button" className="mini si-two" onClick={after.onDetails}><span className="si-t">Send the details</span><span className="si-s">Parking, dress, what to bring</span></button>
    </div>
  );
  return (
    <div className="si" data-share-invite>
      <Step n={1}>Get it right</Step>
      <Row kind="page" icon={IC.page} title="Invite page" sub={page.live ? 'Live at your link' : 'Layout, message, colors, photo'} action="Edit" onOpen={page.onOpen} />
      {page.live
        ? <p className="grounding si-g si-tight">Your page is live: changes show the next time a guest opens the link.</p>
        : null}
      <Row kind="message" icon={IC.msg} title="Invite message" sub={message.line} subOk={message.kind === 'saved'}
        action={message.kind === 'sent' ? 'View' : 'Edit'} onOpen={message.onOpen} />
      {!page.live && (
        <p className="grounding si-g">The page is what guests see at your link. The message is the email or text that carries the link.</p>
      )}

      <div data-si-send>
        <Step n={2}>Send it</Step>
        {send.kind === 'first' || send.kind === 'new' ? (
          <button type="button" className="cta si-wide" data-invite-list-open onClick={send.onSend}>{send.label}</button>
        ) : send.kind === 'done' ? (
          <button type="button" className="mini si-wide si-quiet" disabled>Everyone on your list is invited</button>
        ) : null}
        {send.line ? <p className="grounding si-g">{send.line}</p> : null}
        {send.onMarkSent ? (
          <button type="button" className="si-link" data-invite-sent onClick={send.onMarkSent}>I already sent it another way</button>
        ) : null}
      </div>

      <Step n={3}>Share another way</Step>
      <div className={share.onText ? 'si-row3' : 'si-row2b'}>
        <button type="button" className={(shareLit ? 'cta' : 'mini') + ' si-tile'} onClick={share.onShare}>{IC.share}<span>Share the link</span></button>
        <button type="button" className="mini si-tile" onClick={share.onQr}>{IC.qr}<span>Show QR code</span></button>
        {share.onText ? <button type="button" className="mini si-tile" onClick={share.onText}>{IC.text}<span>Invite text</span></button> : null}
      </div>
      {share.onText ? (
        <p className="grounding si-g">Each one checks your reply link first. Invite text opens your message with Copy ready.</p>
      ) : null}

      <Step n={4}>After it’s out</Step>
      {!after.out ? (
        <>
          <button type="button" className="fstat si-fold" data-si-after-fold aria-expanded={afterOpen} onClick={() => setAfterOpen((o) => !o)}>
            <span className="fstat-l">Nudge, update everyone, the details</span>
            <span className="fstat-v">After you send<span className="fstat-chev" aria-hidden="true">{afterOpen ? '⌄' : '›'}</span></span>
          </button>
          {afterOpen ? (
            <>
              <p className="grounding si-g">The nudge comes once your invite is out. These two work any time.</p>
              {later}
            </>
          ) : null}
        </>
      ) : (
        <>
          {after.tally ? (
            <div className="si-tally" data-si-tally>
              <span><b>{after.tally.invited}</b> invited</span>
              <span><b>{after.tally.replied}</b> replied</span>
              {after.tally.waiting > 0 ? <span className="si-wait"><b>{after.tally.waiting}</b> waiting</span> : null}
            </div>
          ) : null}
          {after.nudge ? (
            <>
              <button type="button" className={(nudgeLit && after.nudge.count > 0 ? 'cta' : 'mini') + ' si-wide'} onClick={after.nudge.onClick}>{after.nudge.label}</button>
              {after.nudge.line ? <p className="grounding si-g">{after.nudge.line}</p> : null}
            </>
          ) : null}
          {later}
        </>
      )}
    </div>
  );
}
