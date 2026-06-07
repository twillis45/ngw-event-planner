// demo/src/plan/CommunicationHub.jsx
// Sprint 46 · Page 93 · G — Communication Hub
// PLAN Layer · Tier 0 · Track A
//
// Design source: Figma CYlmJqDCXEaacCuz9wW3bd page 554:2
// Three columns: thread list (left) · active conversation (center) · context panel (right)
// Communication is the CONSOLIDATED view across client, vendor, team.
// Messages from embedded surfaces (Client Intake, Vendor Planning) aggregate here.
// Status via color + text only. No emoji. No icons.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
// Fix #2: Thread list with live search
function ThreadList({ threads, tab, onTab, selected, onSelect, chatStatus, isMobile = false }) {
  const [search, setSearch] = useState('');
  // Sprint 60.O Phase 3: "Needs reply" is a virtual cross-channel filter
  // exposed as a tab on mobile. Same heuristic as the priority card —
  // last-message inbound OR unresolved approval.
  const isNeedsReply = t => {
    if (t.needsApproval) return true;
    const last = t.messages?.[t.messages.length - 1];
    return last?.direction === 'inbound';
  };
  // Sprint 60.T Phase 3 closeout — action-priority sort.
  // Spec acceptance: "user should not need to open every thread to know
  // who needs a reply." The list now leads with action, not chronology:
  //   1. Needs reply           (inbound last or pending approval)
  //   2. Approval pending      (explicit needsApproval flag)
  //   3. Delivery failed / Provider blocked
  //   4. Delivery pending
  //   5. Recent saved/sent
  //   6. Older, no action
  // Within each tier, sort by latest timestamp desc.
  const tierFor = t => {
    if (isNeedsReply(t)) return t.needsApproval ? 1 : 0; // tier 0 strongest
    const latest = t.messages?.[t.messages.length - 1];
    const ds = latest?.deliveryStatus;
    if (ds === 'email-failed' || ds === 'email-bounced' || ds === 'email-complained') return 2;
    if (ds === 'email-accepted' || ds === 'email-sent' || ds === 'email-deferred') return 3;
    if (ds === 'email-delivered' || ds === 'sent-via-app' || ds === 'local-only') return 4;
    return 5;
  };
  const tieredSort = list => [...list].sort((a, b) => {
    const ta = tierFor(a), tb = tierFor(b);
    if (ta !== tb) return ta - tb;
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });
  const allInTab = tab === 'Needs reply'
    ? tieredSort(threads.filter(isNeedsReply))
    : tieredSort(threads.filter(t => t.tab === tab));
  const filtered = search.trim()
    ? allInTab.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.preview || '').toLowerCase().includes(search.toLowerCase())
      )
    : allInTab;
  const counts = {
    'Needs reply': threads.filter(isNeedsReply).length,
    Client:  threads.filter(t => t.tab === 'Client').length,
    Vendors: threads.filter(t => t.tab === 'Vendors').length,
    Team:    threads.filter(t => t.tab === 'Team').length,
  };
  const needsAttention = threads.filter(t => t.tab === tab && t.needsApproval).length;
  // Mobile shows "Needs reply" as first tab; desktop keeps role-only tabs.
  const tabSet = isMobile ? ['Needs reply', 'Client', 'Vendors', 'Team'] : TABS;
  // Sprint 60.M Phase 3a: cross-tab "needs reply" surface.
  // A thread needs the planner's reply when its most recent message is
  // inbound (someone asked something we haven't answered) OR it has an
  // unresolved approval request. Counted across ALL tabs so the priority
  // card on mobile is a single honest "you owe N replies" signal.
  const needsReplyThreads = useMemo(() => {
    return threads.filter(t => {
      if (t.needsApproval) return true;
      const last = t.messages?.[t.messages.length - 1];
      return last?.direction === 'inbound';
    });
  }, [threads]);
  const needsReplyByTab = {
    Client:  needsReplyThreads.filter(t => t.tab === 'Client').length,
    Vendors: needsReplyThreads.filter(t => t.tab === 'Vendors').length,
    Team:    needsReplyThreads.filter(t => t.tab === 'Team').length,
  };
  const totalNeedsReply = needsReplyThreads.length;

  return (
    <div style={{
      width: isMobile ? '100%' : 240, flexShrink: 0,
      background: P.base,
      borderRight: isMobile ? 'none' : `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Sprint 60.N Phase 3 + 4: Needs-reply priority card.
          Hero-led mobile Messages landing — Carbon body + 3px amber
          left rail + small amber chip + steel-blue Review reply CTA +
          per-tab chip jumps. No amber wash. */}
      {isMobile && totalNeedsReply > 0 && (
        // Sprint 60.P polish: Studio Matte raise so the Messages landing
        // hero card lifts off the page in the same family as Home's
        // StudioCommandPanel hero. Margin around it lets the shadow
        // breathe; bottom-border removed since elevation now does the
        // job of separating from the tab switcher.
        <div style={{
          margin: '14px 14px 0',
          padding: '14px 16px 16px 16px',
          background: P.card,
          border: `1px solid ${P.borderSubtle}`,
          // Amber rail expressed as borderLeft so the panel's
          // border-radius clips it cleanly at the corners.
          borderLeft: `3px solid ${P.amber}`,
          borderRadius: 14,
          display: 'flex', flexDirection: 'column', gap: 10,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.05)',
            '0 1px 0 rgba(255,255,255,0.02)',
            '0 4px 10px rgba(0,0,0,0.30)',
            '0 14px 28px rgba(0,0,0,0.22)',
          ].join(', '),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9.5, fontWeight: type.weight.semibold,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: P.amber, fontFamily: FF,
              padding: '2px 7px', borderRadius: 4,
              border: `1px solid ${P.amber}55`,
            }}>
              Needs reply · {totalNeedsReply}
            </span>
          </div>
          <div style={{
            fontSize: 15, color: P.textPrimary, fontFamily: FF,
            lineHeight: 1.35, fontWeight: type.weight.semibold,
          }}>
            {totalNeedsReply === 1
              ? '1 message is waiting for your response.'
              : `${totalNeedsReply} messages are waiting for your response.`}
          </div>
          {/* Primary CTA: jump straight to the first thread that needs a reply */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <button
              onClick={() => {
                const first = needsReplyThreads[0];
                if (first) { onTab(first.tab); onSelect(first); }
              }}
              style={{
                fontFamily: FF, fontSize: 14, fontWeight: type.weight.semibold,
                color: '#e8edf2',
                background: 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)',
                border: 'none',
                borderRadius: 10,
                padding: '11px 18px',
                minHeight: 44,
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.30), 0 4px 10px rgba(0,0,0,0.35), 0 0 0 1px rgba(193,203,208,0.18)',
                textShadow: '0 1px 0 rgba(0,0,0,0.25)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Review reply <span style={{ fontSize: 12, opacity: 0.85 }}>→</span>
            </button>
          </div>
          {/* Per-tab jump chips — secondary navigation */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {TABS.map(t => {
              const n = needsReplyByTab[t] || 0;
              if (n === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => { onTab(t); setSearch(''); }}
                  style={{
                    fontFamily: FF, fontSize: 12, fontWeight: type.weight.medium,
                    color: P.textPrimary,
                    background: P.canvas,
                    border: `1px solid ${P.borderSubtle}`,
                    borderRadius: radius.sm,
                    padding: '5px 11px',
                    cursor: 'pointer',
                  }}
                >
                  {t} <span style={{ color: P.amber, fontWeight: type.weight.semibold }}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab switcher. Sprint 60.O Phase 3: mobile gets a readable
          segmented control (44px hit target, 13px labels, includes the
          new "Needs reply" virtual tab). Desktop keeps the compact row. */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${P.borderSubtle}`,
        padding: isMobile ? '6px 8px' : '0 8px',
        height: isMobile ? 52 : 42,
        flexShrink: 0, gap: isMobile ? 4 : 2,
        overflowX: isMobile ? 'auto' : 'visible',
      }}>
        {tabSet.map(t => {
          const active = t === tab;
          const cnt = counts[t];
          const attn = t === 'Needs reply'
            ? 0  // the count chip already shows the value
            : threads.filter(th => th.tab === t && th.needsApproval).length;
          const isNRTab = t === 'Needs reply';
          return (
            <button key={t} onClick={() => { onTab(t); setSearch(''); }} style={{
              flex: isMobile ? '0 0 auto' : 1,
              minHeight: isMobile ? 44 : 30,
              padding: isMobile ? '8px 14px' : '0',
              borderRadius: radius.sm,
              border: 'none', cursor: 'pointer',
              background: active ? P.borderSubtle : 'transparent',
              fontFamily: FF,
              fontSize: isMobile ? 13 : 11,
              fontWeight: active ? type.weight.semibold : type.weight.regular,
              color: active ? P.textPrimary : P.textSecondary,
              position: 'relative',
              whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              {t}
              {cnt > 0 && (
                <span style={{
                  fontSize: isMobile ? 11 : 10,
                  fontWeight: type.weight.semibold,
                  color: isNRTab && cnt > 0 ? P.amber : (active ? P.textSecondary : P.textTertiary),
                }}>{cnt}</span>
              )}
              {attn > 0 && <span style={{ position: 'absolute', top: isMobile ? 7 : 3, right: isMobile ? 10 : 6, width: 5, height: 5, borderRadius: '50%', background: P.amber }} />}
            </button>
          );
        })}
      </div>

      {/* Status indicator + search.
          Sprint 60.M Phase 3a: on mobile, the chat status drops to a
          single muted line below the search box (no colored chip in the
          list header) so backend wiring stops competing with the actual
          conversation list. Full chip remains on desktop. */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${P.borderSubtle}`, flexShrink: 0 }}>
        {chatStatus && !isMobile && (
          <div
            title={chatStatus.detail}
            style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, cursor: 'default' }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: chatStatus.color,
              boxShadow: chatStatus.live ? `0 0 0 2px ${chatStatus.color}30` : 'none',
            }} />
            <span style={{ fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.1em', textTransform: 'uppercase', color: chatStatus.color, fontFamily: FF }}>
              {chatStatus.label}
            </span>
            <span style={{ fontSize: 9, color: P.textTertiary, fontFamily: FF, marginLeft: 2 }}>
              — {chatStatus.detail}
            </span>
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: P.textTertiary, fontSize: 12 }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search threads…"
            style={{
              width: '100%', padding: '5px 8px 5px 22px',
              borderRadius: radius.sm, border: `1px solid ${P.borderSubtle}`,
              background: P.canvas, color: P.textPrimary,
              fontSize: 11, fontFamily: FF, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: P.textTertiary, cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* Thread rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: space[5], textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF }}>
            {search ? `No results for "${search}"` : `No ${tab.toLowerCase()} threads`}
          </div>
        ) : filtered.map(thread => {
          const isSelected = selected?.id === thread.id;
          const needsReply = isNeedsReply(thread);
          const roleLabel = thread.tab === 'Vendors' ? 'Vendor' : thread.tab;
          return (
            <button key={thread.id} onClick={() => onSelect(thread)} style={{
              display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 4,
              width: '100%',
              padding: isMobile ? '14px 16px 14px 19px' : '12px 16px',
              minHeight: isMobile ? 64 : undefined,
              borderBottom: `1px solid ${P.borderSubtle}`,
              border: 'none',
              borderLeft: needsReply
                ? `3px solid ${thread.needsApproval ? P.amber : P.amber}`
                : isSelected ? `3px solid ${P.green}` : '3px solid transparent',
              background: isSelected ? P.borderSubtle : 'transparent',
              cursor: 'pointer', textAlign: 'left',
              position: 'relative',
            }}>
              {/* Row 1: sender + age */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: isMobile ? 15 : 12,
                  fontWeight: type.weight.semibold,
                  color: P.textPrimary, fontFamily: FF,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {thread.name}
                </span>
                <span style={{ fontSize: isMobile ? 12 : 10, color: P.textTertiary, fontFamily: FF, flexShrink: 0 }}>
                  {fmtRelative(thread.timestamp)}
                </span>
              </div>
              {/* Row 2: explicit role label */}
              <div style={{
                fontSize: isMobile ? 12 : 10,
                color: P.textTertiary, fontFamily: FF,
                letterSpacing: '0.04em',
              }}>
                {roleLabel}{thread.messages?.some(m => m.subject || m.subject_line)
                  ? ` · ${(thread.messages.filter(m => m.subject || m.subject_line).slice(-1)[0]?.subject ||
                          thread.messages.filter(m => m.subject || m.subject_line).slice(-1)[0]?.subject_line)}`
                  : ''}
              </div>
              {/* Row 3: preview */}
              <div style={{
                fontSize: isMobile ? 13.5 : 11,
                color: P.textSecondary, fontFamily: FF,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.4,
              }}>
                {thread.preview}
              </div>
              {/* Status chip row — Sprint 60.T Phase 3 vocabulary lock.
                  Each row carries its own message state chip so the user
                  doesn't need to open every thread to know what state
                  the latest message is in. Priority order: APPROVAL
                  NEEDED > NEEDS REPLY > Delivery failed > Provider
                  blocked > Delivery pending > Sent via email > Saved to
                  thread. Color matches the locked vocabulary from the
                  composer state. */}
              {(() => {
                const latest = thread.messages?.[thread.messages.length - 1];
                const ds = latest?.deliveryStatus;
                const isPlannerLatest = latest && (latest.direction === 'outbound' || latest.sender === 'planner');
                let chip = null;
                if (thread.needsApproval) {
                  chip = { label: 'APPROVAL NEEDED', color: P.amber };
                } else if (needsReply) {
                  chip = { label: 'NEEDS REPLY', color: P.amber };
                } else if (isPlannerLatest && ds) {
                  if (ds === 'email-failed' || ds === 'email-bounced') chip = { label: 'DELIVERY FAILED', color: P.red };
                  else if (ds === 'email-complained') chip = { label: 'PROVIDER BLOCKED', color: P.red };
                  else if (ds === 'email-accepted' || ds === 'email-sent' || ds === 'email-deferred') chip = { label: 'DELIVERY PENDING', color: P.amber };
                  else if (ds === 'email-delivered') chip = { label: 'SENT VIA EMAIL', color: P.green };
                  else if (ds === 'sent-via-app' || ds === 'local-only') chip = { label: 'SAVED TO THREAD', color: P.textTertiary };
                }
                if (!chip) return null;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{
                      fontSize: isMobile ? 10 : 9, fontWeight: type.weight.semibold,
                      color: chip.color, letterSpacing: '0.10em', fontFamily: FF,
                      padding: isMobile ? '2px 7px' : '1px 5px',
                      borderRadius: 4,
                      border: `1px solid ${chip.color}55`,
                    }}>
                      {chip.label}
                    </span>
                  </div>
                );
              })()}
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
// Fix #6: Composer with optional email subject field
function Composer({ thread, event, onSend, commLive, emailEnabled, resolveEmail, isDayOf = false }) {
  const [body, setBody]       = useState('');
  // Subject is shown by default — helps relate the message to the event/client
  const defaultSubject = event?.name
    ? `Re: ${event.name}${thread?.name && thread.name !== event?.name ? ` — ${thread.name}` : ''}`
    : thread?.name ? `Re: ${thread.name}` : '';
  const [subject, setSubject] = useState(defaultSubject);
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
        onSend(thread, text, { deliverEmail: deliverEmail && canEmail, subject: subject.trim() || undefined })
      );
      const ok       = result && (result.ok || result.status === 'sent' || result.status === 'logged' || result.status === 'email-sent');
      const fellBack = result && result.fallback;
      if (result?.status === 'email-sent' || result?.status === 'email-accepted') {
        setStatus({ kind: 'email', text: `Email accepted by provider — saved to thread.` });
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

  // Sprint 60.Q Comms rebuild — composer state classification.
  // Four mutually-exclusive states, named honestly. Each state has its
  // own chip color, CTA label, and hint line so the planner always
  // knows what will actually happen on tap. The "Open email draft"
  // state is a real mailto: handoff — no fake send.
  const recipientEmail = recipientInfo?.email;
  const composerState =
    canEmail                                          ? 'email-live' :
    recipientEmail && !emailEnabled                   ? 'email-draft' :
    commLive                                          ? 'backend' :
                                                        'local';
  // Sprint 60.R Comms trust — locked user-facing vocabulary. BACKEND was
  // dev language and the spec forbids it in user UI. SHARED THREAD makes
  // the state operationally honest: backend wired up, email isn't, so
  // messages save to the shared event thread (no external send).
  // Sprint 60.T closeout — SHARED THREAD recolored steel (not amber).
  // Amber implied a warning state; the operational meaning is neutral
  // (backend wired, email not — messages save honestly to the shared
  // thread, no external send). Steel matches the calm-state palette.
  const stateChipMap = {
    'email-live':  { label: 'EMAIL LIVE',     color: P.green },
    'email-draft': { label: 'EMAIL DRAFT',    color: P.textSecondary },
    'backend':     { label: 'SHARED THREAD',  color: P.textSecondary },
    'local':       { label: 'LOCAL ONLY',     color: P.textTertiary },
  };
  const stateChip = stateChipMap[composerState];
  const primaryIsEmail = composerState === 'email-live';
  const primaryIsMailto = composerState === 'email-draft';
  const ctaLabel =
    primaryIsEmail  ? 'Send email' :
    primaryIsMailto ? 'Open email draft' :
    commLive        ? 'Save to thread' :
                      'Log to thread';
  const ctaTitle =
    primaryIsEmail  ? `Sends to ${recipientInfo?.name || recipientEmail} and saves to thread.` :
    primaryIsMailto ? 'Opens your email app. Nothing is sent until you send it.' :
    commLive        ? 'Backend connected — saved to shared approval history. No external send.' :
                      'Saved locally only — backend not connected in this session.';
  const stateHint = ctaTitle; // hint line under the CTA mirrors the title

  return (
    // Sprint 60.P polish: composer becomes a Studio Matte well — the
    // input + send live inside a recessed Mid Carbon tray so the
    // controls feel like physical tools set into the conversation
    // surface, not floating over it. Inset shadow stack mirrors the
    // hero CTA well in App.js.
    <div style={{
      flexShrink: 0, padding: `${space[4]}px ${space[6]}px`,
      borderTop: `1px solid ${P.borderSubtle}`,
      background: P.canvas,
      boxShadow: [
        'inset 0 2px 4px rgba(0,0,0,0.35)',
        'inset 0 1px 0 rgba(0,0,0,0.40)',
        'inset 0 -1px 0 rgba(255,255,255,0.03)',
      ].join(', '),
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Composer state chip. Sprint 60.Q Comms #2 Day-of: drops to a
          single dot during live event ops — the operational moment
          shouldn't be cluttered with EMAIL LIVE / BACKEND chips. The
          dot color still carries the state; the persistent hint line
          under the CTA carries the honest explanation. */}
      {!isDayOf ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 10, fontFamily: FF, marginBottom: 2,
        }}>
          <span style={{
            fontWeight: type.weight.semibold,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: stateChip.color,
            padding: '2px 7px', borderRadius: 4,
            border: `1px solid ${stateChip.color}55`,
          }}>
            {stateChip.label}
          </span>
          {recipientEmail && composerState === 'email-live' && (
            <span style={{ color: P.textTertiary }}>
              to {recipientInfo.name || recipientEmail}
            </span>
          )}
          {recipientEmail && composerState === 'email-draft' && (
            <span style={{ color: P.textTertiary }}>
              via your email app · {recipientEmail}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: FF, color: P.textTertiary, marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stateChip.color, flexShrink: 0 }} />
          {composerState === 'email-live' ? `Sending as email to ${recipientInfo?.name || recipientEmail}`
            : composerState === 'email-draft' ? 'Opens email draft on tap'
            : composerState === 'backend' ? 'Save to shared thread'
            : 'Save locally to thread'}
        </div>
      )}
      {/* Subject — always visible, pre-filled with event + recipient context */}
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject"
        style={{
          padding: '6px 10px', borderRadius: radius.sm,
          border: `1px solid ${P.borderSubtle}`,
          background: P.canvas, color: P.textPrimary,
          fontSize: 11.5, fontFamily: FF, outline: 'none',
        }}
      />
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
            flex: 1, minHeight: isDayOf ? 72 : 60, maxHeight: 180, resize: 'vertical',
            padding: isDayOf ? '12px 14px' : '9px 12px',
            borderRadius: radius.sm,
            border: `1px solid ${P.borderSubtle}`,
            background: P.canvas, color: P.textPrimary,
            fontSize: isDayOf ? 16 : 12.5,
            fontFamily: FF, outline: 'none', lineHeight: 1.45,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => {
              // Sprint 60.Q Comms rebuild — honest CTA dispatch.
              if (primaryIsMailto) {
                // Open the user's email app with a real draft. We still
                // record the body to the local thread as a planning log
                // (no fake send claim — the planner has to send it from
                // their email app for it to actually go out).
                const sub = encodeURIComponent(subject.trim() || defaultSubject);
                const bod = encodeURIComponent(body.trim());
                window.open(`mailto:${recipientEmail}?subject=${sub}&body=${bod}`, '_blank');
                submit(false); // also log to thread as a record-only
                return;
              }
              submit(primaryIsEmail);
            }}
            disabled={!body.trim() || busy}
            title={ctaTitle}
            style={{
              padding: isDayOf ? '13px 22px' : '9px 16px',
              minHeight: isDayOf ? 48 : undefined,
              borderRadius: radius.sm, border: 'none',
              background: body.trim() && !busy
                ? (primaryIsEmail ? P.green : 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)')
                : P.borderSubtle,
              color: body.trim() && !busy
                ? (primaryIsEmail ? P.canvas : '#e8edf2')
                : P.textTertiary,
              fontSize: isDayOf ? 15 : 12,
              fontWeight: type.weight.semibold, fontFamily: FF,
              cursor: body.trim() && !busy ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              boxShadow: body.trim() && !busy && !primaryIsEmail
                ? 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.04), 0 4px 10px rgba(0,0,0,0.35), 0 0 0 1px rgba(193,203,208,0.18)'
                : undefined,
              textShadow: body.trim() && !busy && !primaryIsEmail
                ? '0 1px 0 rgba(0,0,0,0.25)' : undefined,
            }}
          >
            {busy ? '…' : ctaLabel}
          </button>
          {/* Fix #9: Log only — proper ghost button, not tiny tertiary text */}
          {primaryIsEmail && body.trim() && !busy && (
            <button
              onClick={() => submit(false)}
              title="Save to event thread without sending email"
              style={{
                padding: '6px 12px', borderRadius: radius.sm,
                border: `1px solid ${P.borderSubtle}`, background: 'transparent',
                fontSize: 11, fontWeight: type.weight.medium, fontFamily: FF,
                color: P.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap',
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
      {/* Sprint 60.Q Comms rebuild — persistent honest hint matched to
          composer state. Replaces the old single-state "not wired"
          advisory. The hint always appears so the planner can't
          accidentally assume a Send actually sent. */}
      {!status && (
        <div style={{ fontSize: 10.5, lineHeight: 1.4, color: P.textTertiary, fontStyle: 'italic' }}>
          {stateHint}
        </div>
      )}
    </div>
  );
}

// Fix #3 + #7: ConversationPane with inline approve/reject + scroll preservation
function ConversationPane({ thread, event, onSend, onApprove, commLive, emailEnabled, resolveEmail, isDayOf = false, isMobile = false }) {
  // Sprint 60.S Mobile Comms — collapse older messages on mobile by
  // default. Latest 2 + any pending approval bubble are shown; older
  // messages live behind a "Show N earlier messages" affordance. Keeps
  // the action above transcript history per the spec rebuild.
  const [earlierExpanded, setEarlierExpanded] = useState(false);
  // Fix #7: preserve scroll position per thread
  const scrollRef = useRef(null);
  const scrollPositions = useRef({});
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !thread) return;
    // Restore saved position for this thread
    const saved = scrollPositions.current[thread.id];
    if (saved !== undefined) el.scrollTop = saved;
    else el.scrollTop = el.scrollHeight; // new thread → scroll to bottom
    const onScroll = () => { scrollPositions.current[thread.id] = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [thread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when new messages arrive
  const msgCount = thread?.messages?.length || 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pos = scrollPositions.current[thread?.id];
    const nearBottom = pos === undefined || (el.scrollHeight - pos - el.clientHeight) < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [msgCount]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!thread) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.canvas, fontSize: 12, color: P.textTertiary, fontFamily: FF }}>
        Select a thread to view the conversation
      </div>
    );
  }

  const linkedDecision = (event.commClient || []).find(m =>
    m.message_type === 'approval_request' && thread.messages.some(tm => tm.id === m.id)
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: P.canvas, overflow: 'hidden' }}>
      {/* Thread header */}
      <div style={{
        height: 48, flexShrink: 0,
        background: P.base, borderBottom: `1px solid ${P.borderSubtle}`,
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px',
      }}>
        <span style={{ fontSize: 14, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>
          {thread.name}
        </span>
        {thread.needsApproval && (
          // Sprint 60.Q Comms #3: drop the +14 amber wash → outline chip
          // to match the rest of the rail/chip vocabulary on the screen.
          <span style={{
            fontSize: 10, fontWeight: type.weight.semibold,
            color: P.amber, letterSpacing: '0.14em', textTransform: 'uppercase',
            fontFamily: FF,
            background: 'transparent',
            border: `1px solid ${P.amber}66`,
            borderRadius: 4,
            padding: '3px 8px',
          }}>
            Approval pending
          </span>
        )}
      </div>

      {/* Messages — Fix #7: ref for scroll preservation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: `${space[5]}px ${space[6]}px` }}>
        {thread.messages.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF, paddingTop: space[9] }}>
            No messages yet
          </div>
        ) : (() => {
          // Sprint 60.S — on mobile, hide earlier messages by default.
          // Keep: last 2 messages + any pending approval bubble (so the
          // current action is always visible). Older messages collapse
          // behind a steel-blue "Show N earlier messages" affordance.
          const allMessages = thread.messages;
          const SHOW_TAIL = 2;
          const pendingApprovalIdx = allMessages.findIndex(m =>
            m.message_type === 'approval_request' &&
            !['approved','rejected'].includes(m.approval_status)
          );
          const tailStart = Math.max(0, allMessages.length - SHOW_TAIL);
          let visibleMessages = allMessages;
          let hiddenCount = 0;
          if (isMobile && !earlierExpanded && allMessages.length > SHOW_TAIL) {
            const keepIndices = new Set();
            // Always keep the tail
            for (let i = tailStart; i < allMessages.length; i++) keepIndices.add(i);
            // Always keep any pending approval bubble, even if it's older
            if (pendingApprovalIdx >= 0) keepIndices.add(pendingApprovalIdx);
            visibleMessages = allMessages.filter((_, i) => keepIndices.has(i));
            hiddenCount = allMessages.length - visibleMessages.length;
          }
          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hiddenCount > 0 && (
              <button
                onClick={() => setEarlierExpanded(true)}
                style={{
                  alignSelf: 'center',
                  padding: '8px 16px', borderRadius: 999,
                  background: P.canvas,
                  border: `1px solid ${P.borderSubtle}`,
                  color: P.textSecondary,
                  fontSize: 12, fontFamily: FF, fontWeight: type.weight.medium,
                  cursor: 'pointer',
                }}
              >
                Show {hiddenCount} earlier message{hiddenCount !== 1 ? 's' : ''}
              </button>
            )}
            {visibleMessages.map((m, i) => {
              const isPlanner  = m.direction === 'outbound' || m.sender === 'planner';
              const isApproval = m.message_type === 'approval_request';
              const isPending  = isApproval && !['approved','rejected'].includes(m.approval_status);
              const isApproved = m.approval_status === 'approved';
              const isRejected = m.approval_status === 'rejected';
              return (
                <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isPlanner ? 'flex-end' : 'flex-start' }}>
                  {/* Sprint 60.Q Comms #2 Day-of: sender row scales up for
                      operational legibility. Day-of: 13px medium. Normal: 10px. */}
                  <div style={{
                    fontSize: isDayOf ? 13 : 10,
                    fontWeight: isDayOf ? type.weight.semibold : type.weight.regular,
                    color: P.textTertiary, fontFamily: FF, marginBottom: 4,
                  }}>
                    {isPlanner ? 'Planner' : (m.senderName || thread.name)} · {fmtRelative(m.createdAt || m.date)}
                  </div>
                  {/* Sprint 60.Q Comms rebuild: chat-bubble convention so
                      direction is obvious at a glance, not only by reading
                      the timestamp row. Planner bubbles are tinted steel-
                      blue and corner-clipped on the right (tail toward the
                      planner avatar position); other-party bubbles are
                      Carbon and corner-clipped on the left. Approval rail
                      moves to the side opposite the tail so it still reads
                      as a signal without competing with the bubble shape. */}
                  <div style={{
                    maxWidth: '70%',
                    background: isPlanner
                      ? 'linear-gradient(180deg, #2a3845 0%, #1f2a35 100%)'  // steel-tinted Carbon — planner
                      : P.card,                                              // Lifted Carbon — other party
                    border: `1px solid ${isPlanner ? '#3a4a59' : P.borderSubtle}`,
                    borderLeft: !isPlanner && isApproval
                      ? `3px solid ${isApproved ? P.green : isRejected ? P.red : P.amber}`
                      : `1px solid ${isPlanner ? '#3a4a59' : P.borderSubtle}`,
                    borderRight: isPlanner && isApproval
                      ? `3px solid ${isApproved ? P.green : isRejected ? P.red : P.amber}`
                      : undefined,
                    // Chat-bubble corner radii — tail corner is small, the
                    // three away corners are large. Planner's tail is
                    // bottom-right; other's tail is bottom-left.
                    borderRadius: isPlanner
                      ? `${radius.md}px ${radius.md}px 4px ${radius.md}px`
                      : `${radius.md}px ${radius.md}px ${radius.md}px 4px`,
                    // Sprint 60.Q Comms #2 Day-of: bubble copy scales up
                    // (12 → 16) and padding loosens for thumb-reading
                    // during live event ops.
                    padding: isDayOf
                      ? `${space[4]}px ${space[5]}px`
                      : `${space[3]}px ${space[4]}px`,
                    fontSize: isDayOf ? 16 : 12,
                    color: P.textPrimary, fontFamily: FF,
                    lineHeight: type.leading.relaxed,
                  }}>
                    {/* Subject line — shown when present */}
                    {(m.subject || m.subject_line) && (
                      <div style={{
                        fontSize: 11, fontWeight: type.weight.semibold,
                        color: P.textSecondary, fontFamily: FF,
                        marginBottom: 5, paddingBottom: 5,
                        borderBottom: `1px solid ${P.borderSubtle}`,
                        letterSpacing: '0.01em',
                      }}>
                        {m.subject || m.subject_line}
                      </div>
                    )}
                    {m.body || m.text || m.message}

                    {/* Approval action row — Sprint 60.Q Comms #3 polish.
                        Eyebrow chip on its own line above the buttons,
                        proper touch targets (40px min), Approve is the
                        steel-blue action (green is reserved for the
                        post-recorded state below), Reject keeps the red
                        outline ghost. */}
                    {isPending && onApprove && (
                      <div style={{
                        marginTop: 12, paddingTop: 10,
                        borderTop: `1px solid ${P.borderSubtle}`,
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <span style={{
                          fontSize: 10, color: P.amber,
                          fontWeight: type.weight.semibold,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          fontFamily: FF,
                          padding: '2px 7px', borderRadius: 4,
                          border: `1px solid ${P.amber}55`,
                          alignSelf: 'flex-start',
                        }}>
                          Approval needed
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => onApprove(m.id, 'approved')}
                            style={{
                              flex: 1, minHeight: 40,
                              padding: '10px 16px', borderRadius: 10, border: 'none',
                              background: 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)',
                              color: '#e8edf2',
                              fontSize: 13, fontWeight: type.weight.semibold, fontFamily: FF,
                              cursor: 'pointer',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.04), 0 4px 10px rgba(0,0,0,0.35), 0 0 0 1px rgba(193,203,208,0.18)',
                              textShadow: '0 1px 0 rgba(0,0,0,0.25)',
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onApprove(m.id, 'rejected')}
                            style={{
                              flex: 1, minHeight: 40,
                              padding: '10px 16px', borderRadius: 10,
                              border: `1px solid ${P.red}66`,
                              background: 'transparent',
                              color: P.red,
                              fontSize: 13, fontWeight: type.weight.semibold, fontFamily: FF,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                    {isApproved && (
                      <div style={{
                        marginTop: 10, paddingTop: 8,
                        borderTop: `1px solid ${P.borderSubtle}`,
                        fontSize: 11, color: P.green,
                        fontWeight: type.weight.semibold,
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                        fontFamily: FF,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.green }} />
                        Approved · recorded by planner
                      </div>
                    )}
                    {isRejected && (
                      <div style={{
                        marginTop: 10, paddingTop: 8,
                        borderTop: `1px solid ${P.borderSubtle}`,
                        fontSize: 11, color: P.red,
                        fontWeight: type.weight.semibold,
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                        fontFamily: FF,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.red }} />
                        Rejected · recorded by planner
                      </div>
                    )}
                  </div>
                  {isPlanner && m.deliveryStatus && (() => {
                    // Sprint 60.R Comms trust — Phase E vocabulary lock.
                    // Each delivery state gets a scannable TAG (one of the 6
                    // locked states from the spec) plus the existing detail
                    // sentence so the planner can scan severity AND get the
                    // honest context. No "Sent" unless the provider actually
                    // accepted; "Saved to thread" for everything that wasn't
                    // dispatched externally.
                    const ds = m.deliveryStatus;
                    const color =
                      ds === 'email-delivered'                          ? P.green
                      : (ds === 'email-accepted' || ds === 'email-sent'
                          || ds === 'sent-via-app')                     ? P.green
                      : (ds === 'email-bounced' || ds === 'email-failed'
                          || ds === 'email-complained')                  ? P.red
                      : ds === 'email-deferred'                         ? P.amber
                      : P.textTertiary;
                    const tag =
                      ds === 'email-delivered'    ? 'Sent via email'
                      : ds === 'email-accepted'   ? 'Delivery pending'
                      : ds === 'email-sent'       ? 'Delivery pending'
                      : ds === 'email-failed'     ? 'Delivery failed'
                      : ds === 'email-bounced'    ? 'Delivery failed'
                      : ds === 'email-complained' ? 'Provider blocked'
                      : ds === 'email-deferred'   ? 'Delivery pending'
                      : ds === 'sent-via-app'     ? 'Saved to thread'
                      : ds === 'local-only'       ? 'Saved to thread'
                      :                              'Saved to thread';
                    const detail =
                      ds === 'email-delivered'   ? 'Email delivered.'
                      : ds === 'email-accepted'  ? 'Email accepted by provider — delivery not yet confirmed.'
                      : ds === 'email-sent'       ? 'Email accepted by provider — delivery not yet confirmed.' // legacy
                      : ds === 'email-failed'     ? 'Email failed — recipient was NOT notified. Manual follow-up needed.'
                      : ds === 'email-bounced'    ? 'Email bounced — recipient address may be invalid. Manual follow-up needed.'
                      : ds === 'email-complained' ? 'Recipient marked as spam. Further emails may be blocked.'
                      : ds === 'email-deferred'   ? 'Email delivery delayed — provider will retry.'
                      : ds === 'sent-via-app'     ? 'Saved to shared thread. No external send.'
                      : ds === 'local-only'       ? 'Saved to this device only. Recipient was NOT notified.'
                      : 'Saved to thread.';
                    return (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 9.5, fontFamily: FF, marginTop: 3,
                        letterSpacing: '0.04em',
                      }}>
                        <span style={{
                          fontWeight: type.weight.semibold,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color,
                          padding: '1px 6px', borderRadius: 3,
                          border: `1px solid ${color}55`,
                          flexShrink: 0,
                        }}>{tag}</span>
                        <span style={{
                          color, opacity: 0.85,
                          fontStyle: (ds === 'local-only' || ds === 'email-deferred') ? 'italic' : 'normal',
                        }}>{detail}</span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>

      <Composer thread={thread} event={event} onSend={onSend} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} isDayOf={isDayOf} isMobile={isMobile} />
    </div>
  );
}

// Fix #4: Populate ContextPanel with event + contact data
function ContextPanel({ thread, event }) {
  if (!thread) return null;

  const approvalMsg  = thread.messages.find(m => m.message_type === 'approval_request');
  const linkedVendor = (event.vendors || []).find(v =>
    thread.tab === 'Vendors' && (v.name === thread.name || v.vendor_name === thread.name)
  );
  const taskMsg = thread.messages.find(m => m.task_id || m.linked_task);
  const openQuestions = thread.messages
    .filter(m => m.open_questions)
    .flatMap(m => Array.isArray(m.open_questions) ? m.open_questions : [m.open_questions])
    .filter(Boolean).slice(0, 3);

  // Event context
  const eventDate  = event?.date;
  const daysToEvt  = eventDate ? Math.ceil((new Date(eventDate) - new Date()) / 86400000) : null;
  const daysLabel  = daysToEvt === null ? null : daysToEvt < 0 ? `${Math.abs(daysToEvt)}d ago` : daysToEvt === 0 ? 'Today' : `${daysToEvt}d`;

  // Vendor contact details for quick reach
  const vendorEmail    = linkedVendor?.contact;
  const vendorPhone    = linkedVendor?.phone;
  const vendorWhatsApp = linkedVendor?.whatsapp;

  const hasContext = approvalMsg || linkedVendor || taskMsg || openQuestions.length > 0 || daysToEvt !== null;

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

      <div style={{ padding: '0 16px' }}>
        {/* Fix #4: Event countdown always shown */}
        {daysLabel && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>EVENT</div>
            <div style={{ fontSize: 13, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>{event?.name}</div>
            <div style={{ fontSize: 11, color: daysToEvt !== null && daysToEvt <= 14 ? P.red : daysToEvt !== null && daysToEvt <= 30 ? P.amber : P.textSecondary, fontFamily: FF, marginTop: 2 }}>
              {daysLabel} {daysToEvt !== null && daysToEvt >= 0 ? 'from now' : ''}
            </div>
          </div>
        )}

        {/* Vendor contact — quick-reach links */}
        {linkedVendor && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 6 }}>VENDOR</div>
            <div style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF, marginBottom: 6 }}>{linkedVendor.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {vendorEmail && (
                <a href={`mailto:${vendorEmail}`} style={{ fontSize: 11, color: P.green, fontFamily: FF, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>✉</span> {vendorEmail}
                </a>
              )}
              {vendorPhone && (
                <a href={`tel:${vendorPhone}`} style={{ fontSize: 11, color: P.textSecondary, fontFamily: FF, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>📞</span> {vendorPhone}
                </a>
              )}
              {vendorWhatsApp && (
                <a href={`https://wa.me/${vendorWhatsApp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: P.green, fontFamily: FF, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>💬</span> WhatsApp
                </a>
              )}
            </div>
            <div style={{ fontSize: 9, color: linkedVendor.status === 'Confirmed' ? P.green : P.amber, fontWeight: type.weight.semibold, letterSpacing: '0.06em', fontFamily: FF, marginTop: 6 }}>
              {(linkedVendor.status || '').toUpperCase()}
            </div>
          </div>
        )}

        {/* Pending approval */}
        {approvalMsg && !['approved','rejected'].includes(approvalMsg.approval_status) && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>DECISION</div>
            <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>{approvalMsg.subject || 'Approval request'}</div>
            <span style={{ fontSize: 9, fontWeight: type.weight.medium, color: P.amber, letterSpacing: '0.06em', padding: '1px 5px', borderRadius: 2, border: `1px solid ${P.amber}44`, background: P.amber + '12', fontFamily: FF }}>PENDING</span>
          </div>
        )}

        {/* Linked task */}
        {taskMsg && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: 9, letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>TASK</div>
            <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>{taskMsg.linked_task || 'Linked task'}</div>
            {taskMsg.task_due && <div style={{ fontSize: 10, color: P.red, fontFamily: FF }}>DUE {taskMsg.task_due.toUpperCase()}</div>}
          </div>
        )}

        {/* Open questions */}
        {openQuestions.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: type.weight.medium, letterSpacing: '0.10em', color: P.textTertiary, fontFamily: FF, marginTop: space[4], marginBottom: space[3] }}>
              OPEN QUESTIONS
            </div>
            {openQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: `${space[2]}px 0` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: P.amber, flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF, lineHeight: 1.4 }}>{q}</span>
              </div>
            ))}
          </>
        )}

        {!hasContext && (
          <div style={{ paddingTop: space[5], fontSize: 11, color: P.textTertiary, fontFamily: FF }}>No linked items</div>
        )}
        <div style={{ height: space[5] }} />
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function CommunicationHub({
  event, isMobile, isDayOf = false,
  openId,
  onBack,
  onSend,
  onApprove,   // Fix #3: (messageId, verdict) => void
  commLive,
  emailEnabled,
  resolveEmail,
}) {
  const threads = useMemo(() => buildThreads(event), [event]);
  const [tab, setTab] = useState('Client');
  const initialSelected = useMemo(() => {
    if (openId) {
      const found = threads.find(t => t.messages?.some(m => m.id === openId)) || threads.find(t => t.id === openId);
      if (found) return found;
    }
    return threads.find(t => t.tab === 'Client') || threads[0] || null;
  }, [openId, threads]);
  const [selected, setSelected] = useState(initialSelected);
  useEffect(() => {
    if (!openId) return;
    const found = threads.find(t => t.messages?.some(m => m.id === openId)) || threads.find(t => t.id === openId);
    if (found) { setSelected(found); setTab(found.tab || 'Client'); }
  }, [openId, threads]);
  const [mobileView, setMobileView] = useState(openId ? 'conversation' : 'list');

  // Derive a single status descriptor from commLive + emailEnabled.
  // LIVE   = backend up + email sending wired  → green
  // BACKEND = backend up, no email             → amber
  // LOCAL  = no backend                        → muted
  const chatStatus = commLive && emailEnabled
    ? { label: 'Live',    color: P.green,         detail: 'Messages send via email',              live: true  }
    : commLive
    ? { label: 'Backend', color: P.amber,          detail: 'Backend connected — email not wired',  live: true  }
    : { label: 'Local',   color: P.textTertiary,   detail: 'Messages saved locally only',          live: false };

  // Sprint 49: workspace header — one-click return to Command Center
  const workspaceHeader = onBack && (
    <div style={{
      height: 42, flexShrink: 0, width: '100%', boxSizing: 'border-box',
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
      {/* Sprint 61.K — steel-blue eyebrow matches modal NO GUESSWORK
          rails + LegacyTabHeader + CommandCenter SectionHeader voice. */}
      <span style={{
        fontSize: isMobile ? 13 : 10.5,
        fontWeight: 800,
        letterSpacing: isMobile ? '0' : '0.16em',
        textTransform: isMobile ? 'none' : 'uppercase',
        color: isMobile ? P.textPrimary : '#4E6877',
        fontFamily: FF,
      }}>
        {isMobile ? 'Messages' : 'Communication'}
      </span>
      {/* Chat live status indicator.
          Sprint 60.M Phase 3a: on mobile the workspace header collapses
          to a single dot — the priority card below already carries
          "what you owe" and the backend wiring belongs in Settings, not
          fighting with the conversation list for the planner's eye. */}
      <div
        title={chatStatus.detail}
        style={{
          marginLeft: 'auto',
          display: 'flex', alignItems: 'center', gap: 5,
          padding: isMobile ? 0 : '3px 9px',
          borderRadius: 20,
          border: isMobile ? 'none' : `1px solid ${chatStatus.color}44`,
          background: isMobile ? 'transparent' : (chatStatus.color + '14'),
          cursor: 'default',
        }}
      >
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: chatStatus.color,
          boxShadow: commLive ? `0 0 0 2px ${chatStatus.color}30` : 'none',
        }} />
        {!isMobile && (
          <span style={{
            fontSize: 9, fontWeight: type.weight.semibold,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: chatStatus.color, fontFamily: FF,
          }}>
            {chatStatus.label}
          </span>
        )}
      </div>
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
            chatStatus={chatStatus}
            isMobile={true}
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
            <ConversationPane thread={selected} event={event} onSend={onSend} onApprove={onApprove} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} isDayOf={isDayOf} isMobile={isMobile} />
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
        chatStatus={chatStatus}
      />
      <ConversationPane thread={selected} event={event} onSend={onSend} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} />
      <ContextPanel thread={selected} event={event} />
      </div>
    </div>
  );
}
