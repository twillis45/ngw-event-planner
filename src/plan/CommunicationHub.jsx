// demo/src/plan/CommunicationHub.jsx
// Sprint 46 · Page 93 · G — Communication Hub
// PLAN Layer · Tier 0 · Track A
//
// Design source: Figma CYlmJqDCXEaacCuz9wW3bd page 554:2
// Three columns: thread list (left) · active conversation (center) · context panel (right)
// Communication is the CONSOLIDATED view across client, vendor, team.
// Messages from embedded surfaces (Client Intake, Vendor Planning) aggregate here.
// Status via color + text only. No emoji. No icons.

import { useState, useEffect, useMemo } from 'react';
import { color, space, type, radius } from '../design/tokens';

const P = {
  canvas:       color.surface.canvas,
  base:         color.surface.base,
  card:         color.surface.card,
  borderSubtle: color.border.subtle,
  borderDef:    color.border.default,
  textPrimary:   '#eef0f4',
  textSecondary: color.text.secondary,
  textTertiary:  color.text.tertiary,
  green:  color.status.confirmed,
  amber:  color.status.warning,
  red:    color.status.risk,
};
const FF = type.family;

function fmtRelative(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d} days ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Thread categorization ─────────────────────────────────────────────────────
const TABS = ['Client', 'Vendors', 'Team'];

function buildThreads(event) {
  const comms = event.commClient || [];
  const threads = [];

  // Client threads — group by sender or subject
  const clientMsgs = comms.filter(m => m.channel === 'client' || !m.channel);
  if (clientMsgs.length > 0) {
    // Group by sender name or treat as single thread
    const bySender = {};
    clientMsgs.forEach(m => {
      const key = m.senderName || m.from || 'Client';
      if (!bySender[key]) bySender[key] = [];
      bySender[key].push(m);
    });
    Object.entries(bySender).forEach(([name, msgs]) => {
      const latest = msgs.sort((a, b) =>
        new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
      )[0];
      const needsApproval = msgs.some(m =>
        m.message_type === 'approval_request' &&
        !['approved', 'rejected'].includes(m.approval_status)
      );
      threads.push({
        id: `client-${name}`,
        tab: 'Client',
        name,
        preview: latest.body || latest.text || '',
        timestamp: latest.createdAt || latest.date,
        needsApproval,
        messages: msgs.sort((a, b) =>
          new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0)
        ),
        linkedDecision: msgs.find(m => m.decision_id || m.linked_decision),
        linkedTask: msgs.find(m => m.task_id || m.linked_task),
      });
    });
  }

  // Vendor threads — one thread per vendor
  const vendorMsgs = comms.filter(m => m.channel === 'vendor');
  const byVendor = {};
  vendorMsgs.forEach(m => {
    const key = m.vendor_name || m.senderName || 'Vendor';
    if (!byVendor[key]) byVendor[key] = [];
    byVendor[key].push(m);
  });
  const vendors = event.vendors || [];
  vendors.forEach(v => {
    const name = v.name || v.vendor_name;
    const msgs = byVendor[name] || [];
    const latest = msgs.length > 0
      ? msgs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]
      : null;
    threads.push({
      id: `vendor-${name}`,
      tab: 'Vendors',
      name,
      preview: latest ? (latest.body || latest.text || '') : 'No messages yet',
      timestamp: latest ? (latest.createdAt || latest.date) : null,
      needsApproval: false,
      messages: msgs.sort((a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      ),
      vendorStatus: v.status,
    });
  });

  // Team threads (internal notes)
  const teamMsgs = comms.filter(m => m.channel === 'internal' || m.channel === 'team');
  if (teamMsgs.length > 0) {
    threads.push({
      id: 'team-internal',
      tab: 'Team',
      name: 'Internal Notes',
      preview: teamMsgs[0].body || teamMsgs[0].text || '',
      timestamp: teamMsgs[0].createdAt || teamMsgs[0].date,
      needsApproval: false,
      messages: teamMsgs,
    });
  }

  return threads;
}

// ── Thread list ───────────────────────────────────────────────────────────────
function ThreadList({ threads, tab, onTab, selected, onSelect }) {
  const filtered = threads.filter(t => t.tab === tab);
  const counts = {
    Client:  threads.filter(t => t.tab === 'Client').length,
    Vendors: threads.filter(t => t.tab === 'Vendors').length,
    Team:    threads.filter(t => t.tab === 'Team').length,
  };

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: P.base,
      borderRight: `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Tab switcher */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${P.borderSubtle}`,
        padding: '0 8px', height: 42, flexShrink: 0, gap: 2,
      }}>
        {TABS.map(t => {
          const active = t === tab;
          return (
            <button
              key={t}
              onClick={() => onTab(t)}
              style={{
                flex: 1, height: 30, borderRadius: radius.sm,
                border: 'none', cursor: 'pointer',
                background: active ? P.borderSubtle : 'transparent',
                fontFamily: FF, fontSize: 11,
                fontWeight: active ? type.weight.semibold : type.weight.regular,
                color: active ? P.textPrimary : P.textSecondary,
              }}
            >
              {t}
              {counts[t] > 0 && (
                <span style={{
                  marginLeft: 4, fontSize: 10,
                  color: active ? P.textSecondary : P.textTertiary,
                }}>{counts[t]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Thread rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: space[7], textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF }}>
            No {tab.toLowerCase()} threads
          </div>
        ) : filtered.map(thread => {
          const isSelected = selected?.id === thread.id;
          return (
            <button
              key={thread.id}
              onClick={() => onSelect(thread)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                width: '100%', padding: '12px 16px',
                borderBottom: `1px solid ${P.borderSubtle}`,
                border: 'none',
                borderLeft: isSelected ? `3px solid ${P.green}` : '3px solid transparent',
                background: isSelected ? P.borderSubtle : 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 12, fontWeight: type.weight.medium,
                  color: P.textPrimary, fontFamily: FF,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {thread.name}
                </span>
                <span style={{ fontSize: 10, color: P.textTertiary, fontFamily: FF, flexShrink: 0 }}>
                  {fmtRelative(thread.timestamp)}
                </span>
              </div>
              <div style={{
                fontSize: 11, color: P.textSecondary, fontFamily: FF,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {thread.preview}
              </div>
              {thread.needsApproval && (
                <span style={{
                  fontSize: 9, fontWeight: type.weight.semibold,
                  color: P.amber, letterSpacing: '0.06em', fontFamily: FF,
                }}>
                  APPROVAL NEEDED
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Conversation pane (center) ────────────────────────────────────────────────
// Sprint 49: inline composer — sends to the active thread via host callback
// Sprint 58: honest composer. `onSend` is now async and returns a status
// object so the composer can show the planner what actually happened
// (sent via the comms backend vs. saved locally because the backend isn't
// connected). The button label flips between "Send via app" and "Log to
// thread" based on whether the backend is wired — never the bare "Send"
// that previously implied external delivery on local-only paths.
// Sprint 58.2: 3-mode composer. The CTA label and behavior reflect what will
// actually happen:
//   1. "Send email"  — backend live + email configured + thread has recipient email
//   2. "Send via app" — backend live but no email path for this thread
//   3. "Log to thread" — backend not connected
// The planner always sees the truth. "Send email" never appears unless the
// email will actually be attempted.
function Composer({ thread, onSend, commLive, emailEnabled, resolveEmail }) {
  const [body, setBody]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [status, setStatus]   = useState(null); // { kind, text }
  if (!thread || !onSend) return null;

  // Resolve whether this thread can receive email
  const recipientInfo = resolveEmail ? resolveEmail(thread) : null;
  const canEmail = commLive && emailEnabled && recipientInfo?.email;

  const submit = async (deliverEmail = false) => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true); setStatus(null);
    try {
      const result = await Promise.resolve(
        onSend(thread, text, { deliverEmail: deliverEmail && canEmail })
      );
      const ok       = result && (result.ok || result.status === 'sent' || result.status === 'logged' || result.status === 'email-sent');
      const fellBack = result && result.fallback;
      if (result?.status === 'email-sent') {
        setStatus({ kind: 'email', text: `Email sent and saved to thread.` });
      } else if (ok && !fellBack && commLive) {
        setStatus({ kind: 'sent',   text: 'Message sent and saved to thread.' });
      } else if (ok && fellBack) {
        setStatus({ kind: 'local',  text: 'Message logged to thread.' });
      } else {
        setStatus({ kind: 'local',  text: 'Message logged to thread.' });
      }
      setBody('');
      setTimeout(() => setStatus(null), 4000);
    } catch (e) {
      setStatus({ kind: 'error', text: 'Could not save the message. Try again.' });
    } finally { setBusy(false); }
  };

  // Primary CTA: highest available mode
  const primaryIsEmail = canEmail;
  const ctaLabel = primaryIsEmail ? 'Send email'
                 : commLive       ? 'Send via app'
                                  : 'Log to thread';
  const ctaTitle = primaryIsEmail
    ? `Send email to ${recipientInfo?.name || recipientInfo?.email} and save to thread`
    : commLive
    ? 'Send through the app and save to thread'
    : 'Save to the event thread. External sending is not connected in this session.';

  return (
    <div style={{
      flexShrink: 0, padding: `${space[4]}px ${space[6]}px`,
      borderTop: `1px solid ${P.borderSubtle}`, background: P.base,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Recipient indicator when email is available */}
      {canEmail && (
        <div style={{
          fontSize: 10, color: P.green, fontFamily: FF,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: P.green, flexShrink: 0 }} />
          Email delivery available — {recipientInfo.email}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`Message ${thread.name}…`}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit(primaryIsEmail);
            }
          }}
          style={{
            flex: 1, minHeight: 38, maxHeight: 120, resize: 'vertical',
            padding: '9px 12px', borderRadius: radius.sm,
            border: `1px solid ${P.borderSubtle}`,
            background: P.canvas, color: P.textPrimary,
            fontSize: 12.5, fontFamily: FF, outline: 'none', lineHeight: 1.45,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => submit(primaryIsEmail)}
            disabled={!body.trim() || busy}
            title={ctaTitle}
            style={{
              padding: '9px 16px', borderRadius: radius.sm, border: 'none',
              background: body.trim() && !busy ? P.green : P.borderSubtle,
              color: body.trim() && !busy ? P.canvas : P.textTertiary,
              fontSize: 12, fontWeight: type.weight.semibold, fontFamily: FF,
              cursor: body.trim() && !busy ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? '…' : ctaLabel}
          </button>
          {/* Secondary action: when email is primary, offer "Log only" as alternative */}
          {primaryIsEmail && body.trim() && !busy && (
            <button
              onClick={() => submit(false)}
              title="Save to event thread without sending email"
              style={{
                padding: '4px 10px', borderRadius: radius.sm,
                border: `1px solid ${P.borderSubtle}`, background: 'transparent',
                fontSize: 10, fontWeight: type.weight.medium, fontFamily: FF,
                color: P.textTertiary, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Log only
            </button>
          )}
        </div>
      </div>
      {/* Inline status — only renders briefly after submit. */}
      {status && (
        <div style={{
          fontSize: 10.5, lineHeight: 1.4,
          color: status.kind === 'email' ? P.green
               : status.kind === 'sent'  ? P.green
               : status.kind === 'error' ? P.red
                                         : P.textTertiary,
          fontStyle: status.kind === 'local' ? 'italic' : 'normal',
        }}>
          {status.text}
        </div>
      )}
      {/* Persistent advisory when backend isn't wired */}
      {!commLive && !status && (
        <div style={{ fontSize: 10, color: P.textTertiary, fontStyle: 'italic' }}>
          External sending isn't connected in this session — messages save to the event thread.
        </div>
      )}
    </div>
  );
}

function ConversationPane({ thread, event, onSend, commLive, emailEnabled, resolveEmail }) {
  if (!thread) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: P.canvas,
        fontSize: 12, color: P.textTertiary, fontFamily: FF,
      }}>
        Select a thread to view the conversation
      </div>
    );
  }

  // Find linked decision
  const linkedDecision = (event.commClient || []).find(m =>
    m.message_type === 'approval_request' && thread.messages.some(tm => tm.id === m.id)
  );

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: P.canvas, overflow: 'hidden',
    }}>
      {/* Thread header */}
      <div style={{
        height: 48, flexShrink: 0,
        background: P.base, borderBottom: `1px solid ${P.borderSubtle}`,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 24px',
      }}>
        <span style={{
          fontSize: 14, fontWeight: type.weight.semibold,
          color: P.textPrimary, fontFamily: FF,
        }}>
          {thread.name}
        </span>
        {linkedDecision && (
          <span style={{ fontSize: 11, color: P.textTertiary, fontFamily: FF }}>
            Linked to:{' '}
            <span style={{ color: P.green }}>
              {linkedDecision.subject || 'Decision'}
            </span>
            {' '}·{' '}
            <span style={{ color: P.green, cursor: 'pointer' }}>View decision →</span>
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${space[5]}px ${space[6]}px` }}>
        {thread.messages.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF, paddingTop: space[9] }}>
            No messages yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {thread.messages.map((m, i) => {
              const isPlanner = m.direction === 'outbound' || m.sender === 'planner';
              const isApproval = m.message_type === 'approval_request';
              return (
                <div key={m.id || i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isPlanner ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    fontSize: 10, color: P.textTertiary, fontFamily: FF, marginBottom: 4,
                  }}>
                    {isPlanner ? 'Planner' : (m.senderName || thread.name)} · {fmtRelative(m.createdAt || m.date)}
                  </div>
                  <div style={{
                    maxWidth: '70%',
                    background: isApproval ? P.amber + '18'
                      : isPlanner ? P.borderSubtle
                      : P.card,
                    border: `1px solid ${isApproval ? P.amber + '44' : P.borderSubtle}`,
                    borderRadius: radius.md,
                    padding: `${space[3]}px ${space[4]}px`,
                    fontSize: 12, color: P.textPrimary, fontFamily: FF,
                    lineHeight: type.leading.relaxed,
                  }}>
                    {m.body || m.text || m.message}
                    {isApproval && (
                      <div style={{
                        fontSize: 10, color: P.amber, fontFamily: FF,
                        fontWeight: type.weight.semibold, marginTop: 6,
                        letterSpacing: '0.06em',
                      }}>
                        APPROVAL NEEDED
                      </div>
                    )}
                  </div>
                  {/* Sprint 58 / 58.2: honest delivery status for planner-sent
                      messages. Shows what actually happened — email sent,
                      logged to backend, or saved locally only. */}
                  {isPlanner && m.deliveryStatus && (
                    <div style={{
                      fontSize: 9.5, fontFamily: FF, marginTop: 3,
                      color: (m.deliveryStatus === 'sent-via-app' || m.deliveryStatus === 'email-sent') ? P.green
                           : m.deliveryStatus === 'email-failed' ? P.amber
                           : P.textTertiary,
                      fontStyle: m.deliveryStatus === 'local-only' ? 'italic' : 'normal',
                      letterSpacing: '0.04em',
                    }}>
                      {m.deliveryStatus === 'email-sent'   ? 'Email sent and saved to thread.'
                       : m.deliveryStatus === 'email-failed' ? 'Email failed — logged to thread.'
                       : m.deliveryStatus === 'sent-via-app' ? 'Message sent and saved to thread.'
                       : m.deliveryStatus === 'local-only'   ? 'Email provider not configured — message logged.'
                       : 'Message logged to thread.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sprint 49: real composer — sends through host onSend handler */}
      <Composer thread={thread} onSend={onSend} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} />
    </div>
  );
}

// ── Context panel (right) ─────────────────────────────────────────────────────
function ContextPanel({ thread, event }) {
  if (!thread) return null;

  // Find linked items from this thread's messages
  const approvalMsg = thread.messages.find(m => m.message_type === 'approval_request');
  const linkedVendor = (event.vendors || []).find(v =>
    thread.tab === 'Vendors' &&
    (v.name === thread.name || v.vendor_name === thread.name)
  );
  const taskMsg = thread.messages.find(m => m.task_id || m.linked_task);

  // Open questions — from approval requests that are still pending
  const openQuestions = thread.messages
    .filter(m => m.open_questions)
    .flatMap(m => Array.isArray(m.open_questions) ? m.open_questions : [m.open_questions])
    .filter(Boolean)
    .slice(0, 3);

  const hasContext = approvalMsg || linkedVendor || taskMsg || openQuestions.length > 0;

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: P.base,
      borderLeft: `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{
        height: 42, display: 'flex', alignItems: 'center', padding: '0 16px',
        borderBottom: `1px solid ${P.borderSubtle}`, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12, fontWeight: type.weight.semibold,
          color: P.textPrimary, fontFamily: FF,
        }}>Context</span>
      </div>

      {!hasContext ? (
        <div style={{ padding: space[5], fontSize: 11, color: P.textTertiary, fontFamily: FF }}>
          No linked items for this thread
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>

          {/* Linked items */}
          {(approvalMsg || linkedVendor || taskMsg) && (
            <>
              <div style={{
                fontSize: 9, fontWeight: type.weight.medium, letterSpacing: '0.10em',
                color: P.textTertiary, fontFamily: FF,
                marginTop: space[5], marginBottom: space[3],
              }}>
                LINKED ITEMS
              </div>

              {approvalMsg && (
                <div style={{
                  padding: `${space[3]}px 0`,
                  borderBottom: `1px solid ${P.borderSubtle}`,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>
                    DECISION
                  </div>
                  <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>
                    {approvalMsg.subject || 'Approval request'}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: type.weight.medium,
                    color: P.amber, letterSpacing: '0.06em',
                    padding: '1px 5px', borderRadius: 2,
                    border: `1px solid ${P.amber}44`, background: P.amber + '12',
                    fontFamily: FF,
                  }}>
                    PENDING
                  </span>
                </div>
              )}

              {taskMsg && (
                <div style={{
                  padding: `${space[3]}px 0`,
                  borderBottom: `1px solid ${P.borderSubtle}`,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>
                    TASK
                  </div>
                  <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>
                    {taskMsg.linked_task || 'Linked task'}
                  </div>
                  {taskMsg.task_due && (
                    <div style={{ fontSize: 10, color: P.red, fontFamily: FF }}>
                      DUE {taskMsg.task_due.toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {linkedVendor && (
                <div style={{
                  padding: `${space[3]}px 0`,
                  borderBottom: `1px solid ${P.borderSubtle}`,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>
                    VENDOR
                  </div>
                  <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>
                    {linkedVendor.name}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: type.weight.medium, fontFamily: FF,
                    color: linkedVendor.status === 'Confirmed' ? P.green : P.amber,
                    letterSpacing: '0.06em',
                  }}>
                    {(linkedVendor.status || 'UNKNOWN').toUpperCase()}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Open questions */}
          {openQuestions.length > 0 && (
            <>
              <div style={{
                fontSize: 9, fontWeight: type.weight.medium, letterSpacing: '0.10em',
                color: P.textTertiary, fontFamily: FF,
                marginTop: space[5], marginBottom: space[3],
              }}>
                OPEN QUESTIONS
              </div>
              {openQuestions.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: `${space[2]}px 0`,
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: P.amber, flexShrink: 0, marginTop: 5,
                  }} />
                  <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF, lineHeight: 1.4 }}>
                    {q}
                  </span>
                </div>
              ))}
            </>
          )}

          <div style={{ height: space[5] }} />
        </div>
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function CommunicationHub({
  event, isMobile,
  // Sprint 49: editing + routing props for canonical Communication tab promotion
  openId,
  onBack,
  onSend,
  commLive,
  // Sprint 58.2: email delivery props
  emailEnabled,
  resolveEmail,
}) {
  const threads = useMemo(() => buildThreads(event), [event]);
  const [tab, setTab] = useState('Client');
  // Sprint 49: openId honored — selects the thread containing that message id
  const initialSelected = useMemo(() => {
    if (openId) {
      const found = threads.find(t => t.messages?.some(m => m.id === openId)) || threads.find(t => t.id === openId);
      if (found) return found;
    }
    return threads.find(t => t.tab === 'Client') || threads[0] || null;
  }, [openId, threads]);
  const [selected, setSelected] = useState(initialSelected);
  // Sync selection if openId changes after mount
  useEffect(() => {
    if (!openId) return;
    const found = threads.find(t => t.messages?.some(m => m.id === openId)) || threads.find(t => t.id === openId);
    if (found) {
      setSelected(found);
      setTab(found.tab || 'Client');
    }
  }, [openId, threads]);
  // Mobile: 'list' | 'conversation'
  const [mobileView, setMobileView] = useState(openId ? 'conversation' : 'list');

  // New message / search — non-functional placeholders matching Figma topbar
  const topBarActions = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginLeft: 'auto', flexShrink: 0,
    }}>
      <button style={{
        padding: '4px 10px', borderRadius: radius.sm,
        border: `1px solid ${P.borderSubtle}`,
        background: 'transparent', cursor: 'pointer',
        fontSize: 11, fontWeight: type.weight.medium,
        color: P.green, fontFamily: FF,
      }}>
        + New Message
      </button>
      <button style={{
        padding: '4px 10px', borderRadius: radius.sm,
        border: `1px solid ${P.borderSubtle}`,
        background: 'transparent', cursor: 'pointer',
        fontSize: 11, fontWeight: type.weight.medium,
        color: P.textSecondary, fontFamily: FF,
      }}>
        Search
      </button>
    </div>
  );

  // Sprint 49: workspace header — one-click return to Command Center
  const workspaceHeader = onBack && (
    <div style={{
      height: 42, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px',
      background: P.base,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, cursor: 'pointer',
          fontSize: 11, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px',
        }}
      >
        ← Command Center
      </button>
      <span style={{
        fontSize: 9, fontWeight: type.weight.semibold,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: P.textTertiary, fontFamily: FF,
      }}>
        Communication
      </span>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {workspaceHeader}
        {mobileView === 'list' ? (
          <ThreadList
            threads={threads}
            tab={tab}
            onTab={t => { setTab(t); }}
            selected={selected}
            onSelect={t => { setSelected(t); setMobileView('conversation'); }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <button
              onClick={() => setMobileView('list')}
              style={{
                height: 38, flexShrink: 0,
                background: P.base, border: 'none',
                borderBottom: `1px solid ${P.borderSubtle}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 16px',
                fontSize: 12, color: P.textSecondary, fontFamily: FF,
              }}
            >
              ← All threads
            </button>
            <ConversationPane thread={selected} event={event} onSend={onSend} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {workspaceHeader}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <ThreadList
        threads={threads}
        tab={tab}
        onTab={setTab}
        selected={selected}
        onSelect={setSelected}
      />
      <ConversationPane thread={selected} event={event} onSend={onSend} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} />
      <ContextPanel thread={selected} event={event} />
      </div>
    </div>
  );
}
