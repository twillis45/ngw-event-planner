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
  // Steel-blue accent — was MISSING, so anything using P.steelBlue/P.accent
  // (the AI Draft button, contact links) rendered with no color → looked white.
  accent:    color.text.secondary, // steel #849eb8
  steelBlue: '#4E6877',            // CTA steel-blue
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

// Wait-time label for a thread — how long since the last (unanswered) message.
function fmtWait(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
}

// ── Needs-reply HERO BAND (board A1+A2+B3) ──────────────────────────────────
// Full-width band above both panes. Carries the planner's reply DEBT (count +
// channel split) and leads with WAIT-TIME on the longest-waiting thread. When
// the queue is clear it becomes the "caught up" reward state.
function NeedsReplyBand({ threads, onOpen, onJumpTab }) {
  const needs = useMemo(() => {
    const isNR = t => t.needsApproval || t.messages?.[t.messages.length - 1]?.direction === 'inbound';
    // Oldest-waiting first — the planner owes the longest-waiting person first.
    return threads.filter(isNR).sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  }, [threads]);
  const total = needs.length;

  if (total === 0) {
    // B3 — caught-up reward: quiet, dim, the payoff a dense inbox can't express.
    return (
      <div style={{
        flexShrink: 0, margin: '14px 16px 0', padding: '14px 18px',
        background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 10, fontFamily: FF,
      }}>
        <span style={{ color: P.green, fontSize: type.size.md, fontWeight: 800 }}>✓</span>
        <span style={{ fontSize: type.size.base, fontWeight: type.weight.semibold, color: P.textSecondary }}>
          You're caught up — no one's waiting on you.
        </span>
      </div>
    );
  }

  const oldest = needs[0];
  const firstName = (oldest.name || 'Someone').split(' ')[0];
  const wait = fmtWait(oldest.timestamp);
  const byTab = {
    Client:  needs.filter(t => t.tab === 'Client').length,
    Vendors: needs.filter(t => t.tab === 'Vendors').length,
    Team:    needs.filter(t => t.tab === 'Team').length,
  };
  const debt = Object.entries(byTab).filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ');
  const lead = oldest.subject || oldest.preview || 'needs your reply';

  return (
    <div style={{
      flexShrink: 0, margin: '14px 16px 0', padding: '14px 18px 16px',
      background: P.card, border: `1px solid ${P.borderSubtle}`, borderLeft: `3px solid ${P.amber}`,
      borderRadius: 12, fontFamily: FF,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 10px rgba(0,0,0,0.30), 0 14px 28px rgba(0,0,0,0.22)',
    }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: type.size['2xs'], fontWeight: type.weight.semibold, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.amber, padding: '2px 7px', borderRadius: 4, border: `1px solid ${P.amber}55` }}>
            Needs you · {total}
          </span>
          {debt && <span style={{ fontSize: type.size.sm, color: P.textTertiary }}>{debt} waiting</span>}
        </div>
        {/* A2 — wait-time is the hero datum. The message preview is clamped to a
            single line (board fix: it was dumping the full 6-line body on mobile,
            so it stopped being a signal and became the content). */}
        <div style={{ fontSize: type.size.lg, fontWeight: type.weight.semibold, color: P.textPrimary, lineHeight: 1.35 }}>
          {firstName} has been waiting <span style={{ color: P.amber }}>{wait}</span>
        </div>
        <div style={{
          fontSize: type.size.caption, color: P.textTertiary, lineHeight: 1.4, marginTop: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {lead}
        </div>
      </div>
      <button
        onClick={() => onOpen && onOpen(oldest)}
        style={{
          flexShrink: 0, fontFamily: FF, fontSize: type.size.md, fontWeight: type.weight.semibold, color: '#fff',
          background: 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)', border: 'none', borderRadius: 8,
          padding: '11px 18px', minHeight: 40, cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 10px rgba(0,0,0,0.35), 0 0 0 1px rgba(193,203,208,0.18)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
        Review reply <span style={{ fontSize: type.size.caption, opacity: 0.85 }}>→</span>
      </button>
    </div>
  );
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
    // Board redesign: needs-reply tiers (0,1) sort OLDEST-waiting first — the
    // planner owes the longest-waiting person first. Other tiers: newest first.
    const dir = ta <= 1 ? 1 : -1;
    return dir * (new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
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
      width: isMobile ? '100%' : 300, flexShrink: 0,
      background: P.base,
      borderRight: isMobile ? 'none' : `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Sprint 60.N Phase 3 + 4: Needs-reply priority card.
          Hero-led mobile Messages landing — Carbon body + 3px amber
          left rail + small amber chip + steel-blue Review reply CTA +
          per-tab chip jumps. No amber wash. */}

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
              background: active ? 'rgba(110,135,148,0.18)' : 'transparent',
              fontFamily: FF,
              fontSize: isMobile ? type.size.base : type.size.sm,
              fontWeight: active ? type.weight.semibold : type.weight.regular,
              color: active ? P.textPrimary : P.textSecondary,
              position: 'relative',
              whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              {t}
              {cnt > 0 && (
                <span style={{
                  fontSize: isMobile ? type.size.sm : type.size.xs,
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
            <span style={{ fontSize: type.size['2xs'], fontWeight: type.weight.semibold, letterSpacing: '0.1em', textTransform: 'uppercase', color: chatStatus.color, fontFamily: FF }}>
              {chatStatus.label}
            </span>
            <span style={{ fontSize: type.size['2xs'], color: P.textTertiary, fontFamily: FF, marginLeft: 2 }}>
              — {chatStatus.detail}
            </span>
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: P.textTertiary, fontSize: type.size.caption }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search threads…"
            style={{
              width: '100%', padding: '5px 8px 5px 22px',
              borderRadius: radius.sm, border: `1px solid ${P.borderSubtle}`,
              background: P.canvas, color: P.textPrimary,
              fontSize: type.size.sm, fontFamily: FF, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: P.textTertiary, cursor: 'pointer', fontSize: type.size.base, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* Thread rows — flex column so a short list ends in a quiet end-cap
          instead of a flat black void (board fix #1: the sparse list left
          50–65% of the pane as a "broken-looking" empty box). */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: space[5], textAlign: 'center', fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF }}>
            {search ? `No results for "${search}"` : `No ${tab.toLowerCase()} threads — they'll appear here as messages come in.`}
          </div>
        ) : filtered.map(thread => {
          const isSelected = selected?.id === thread.id;
          const needsReply = isNeedsReply(thread);
          const roleLabel = thread.tab === 'Vendors' ? 'Vendor' : thread.tab;
          return (
            <button key={thread.id} data-deeplink={thread.id} onClick={() => onSelect(thread)} style={{
              display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 4,
              width: '100%',
              padding: isMobile ? '14px 16px 14px 19px' : '12px 16px',
              minHeight: isMobile ? 64 : undefined,
              borderBottom: `1px solid ${P.borderSubtle}`,
              border: 'none',
              borderLeft: needsReply
                ? `3px solid ${P.amber}`
                : isSelected ? `3px solid ${P.steelBlue || '#6E8794'}` : '3px solid transparent',
              background: isSelected ? 'rgba(110,135,148,0.18)' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
              position: 'relative',
            }}>
              {/* Row 1: sender + age */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: isMobile ? type.size.lg : type.size.md,
                  fontWeight: type.weight.semibold,
                  color: P.textPrimary, fontFamily: FF,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {thread.name}
                </span>
                {/* Board B2 — urgency tiering: a thread that needs the planner's
                    reply leads with its WAIT-TIME in amber (the debt), not a neutral
                    "2d ago". Non-urgent rows keep the quiet relative timestamp. */}
                {needsReply ? (
                  <span style={{ fontSize: isMobile ? type.size.caption : type.size.xs, color: P.amber, fontWeight: type.weight.semibold, fontFamily: FF, flexShrink: 0 }}>
                    waiting {fmtWait(thread.timestamp)}
                  </span>
                ) : (
                  <span style={{ fontSize: isMobile ? type.size.caption : type.size.xs, color: P.textTertiary, fontFamily: FF, flexShrink: 0 }}>
                    {fmtRelative(thread.timestamp)}
                  </span>
                )}
              </div>
              {/* Row 2: explicit role label */}
              <div style={{
                fontSize: isMobile ? type.size.caption : type.size.xs,
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
                fontSize: isMobile ? type.size.base : type.size.sm,
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
                      fontSize: isMobile ? type.size.xs : type.size['2xs'], fontWeight: type.weight.semibold,
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
        {/* End-cap hugging the list — a quiet "you've reached the end" marker so a
            short list reads as complete. The list column's lifted-carbon background
            fills the remainder as a calm panel (not a black void). Cross-tab counts
            point to where the rest of the threads live. */}
        {filtered.length > 0 && (
          <div style={{ padding: '14px 16px 18px', textAlign: 'center', fontSize: type.size.xs, color: P.textTertiary, fontFamily: FF, letterSpacing: '0.04em', opacity: 0.7, borderTop: `1px solid ${P.borderSubtle}` }}>
            {(() => {
              const others = ['Client', 'Vendors', 'Team']
                .filter(t => t !== tab && (counts[t] || 0) > 0)
                .map(t => `${counts[t]} in ${t}`).join(' · ');
              return others ? `End of ${tab} · ${others}` : `End of ${tab} threads`;
            })()}
          </div>
        )}
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
function Composer({ thread, event, onSend, onAiDraft, commLive, emailEnabled, resolveEmail, isDayOf = false }) {
  const [body, setBody]       = useState('');
  // Subject is shown by default — helps relate the message to the event/client
  const defaultSubject = event?.name
    ? `Re: ${event.name}${thread?.name && thread.name !== event?.name ? ` — ${thread.name}` : ''}`
    : thread?.name ? `Re: ${thread.name}` : '';
  const [subject, setSubject] = useState(defaultSubject);
  const [busy, setBusy]       = useState(false);
  const [status, setStatus]   = useState(null); // { kind, text }
  const [drafting, setDrafting] = useState(false); // AI message drafting
  const [asApproval, setAsApproval] = useState(false); // create an approval request
  if (!thread || !onSend) return null;

  // Comms innovation — one-tap AI draft. Streams a context-aware message into
  // the composer; the planner edits and sends. Honest: nothing is sent here.
  const aiDraft = async () => {
    if (!onAiDraft || drafting || busy) return;
    setDrafting(true); setStatus(null);
    try {
      await onAiDraft(thread, (chunk) => setBody(chunk));
    } catch (e) {
      // Surface the real reason (the OpenAI proxy throws friendly messages like
      // "Please sign in to use AI features." / "AI is unavailable right now.").
      setStatus({ kind: 'error', text: e?.message || 'Couldn’t draft a message — please try again.' });
    }
    setDrafting(false);
  };

  // Resolve whether this thread can receive email
  const recipientInfo = resolveEmail ? resolveEmail(thread) : null;
  const canEmail = commLive && emailEnabled && recipientInfo?.email;

  const submit = async (deliverEmail = false) => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true); setStatus(null);
    try {
      const result = await Promise.resolve(
        onSend(thread, text, { deliverEmail: deliverEmail && canEmail, subject: subject.trim() || undefined, asApproval })
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
      setAsApproval(false);
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
          fontSize: type.size.xs, fontFamily: FF, marginBottom: 2,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: type.size.sm, fontFamily: FF, color: P.textTertiary, marginBottom: 2 }}>
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
          fontSize: type.size.sm, fontFamily: FF, outline: 'none',
        }}
      />
      {onAiDraft && (
        <div style={{ alignSelf: 'flex-start', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={aiDraft} disabled={drafting || busy}
            title="Draft a context-aware message — you review and send"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 11px', minHeight: 32, borderRadius: 8, cursor: drafting ? 'default' : 'pointer',
              border: `1px solid ${P.steelBlue}59`, background: `${P.steelBlue}16`, color: P.steelBlue,
              fontFamily: FF, fontSize: type.size.sm, fontWeight: 700, opacity: drafting ? 0.7 : 1,
            }}>
            {drafting ? '✨ Drafting…' : body.trim() ? '✨ Redraft' : '✨ Draft this'}
          </button>
          {/* Count of drafts the planner has generated for this event */}
          {(event.aiDraftsCreated || 0) > 0 && (
            <span style={{ fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF }}>
              {event.aiDraftsCreated} draft{event.aiDraftsCreated === 1 ? '' : 's'} created
            </span>
          )}
        </div>
      )}
      {/* Request-approval toggle — create an approval request from Messages. When
          on, the message is sent as an approval the recipient (or planner) resolves
          via the sticky Approve/Reject card. */}
      <button type="button" onClick={() => setAsApproval(a => !a)}
        title="Send as an approval request — it shows up with Approve / Reject"
        style={{
          alignSelf: 'flex-start', marginBottom: 8,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 11px', minHeight: 32, borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${asApproval ? P.amber : P.borderSubtle}`,
          background: asApproval ? `${P.amber}1a` : 'transparent',
          color: asApproval ? P.amber : P.textSecondary,
          fontFamily: FF, fontSize: type.size.sm, fontWeight: 700,
        }}>
        {asApproval ? '✓ Approval request' : 'Request approval'}
      </button>
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
            flex: 1, minWidth: 0, boxSizing: 'border-box',
            minHeight: isDayOf ? 72 : 60, maxHeight: 180, resize: 'vertical',
            padding: isDayOf ? '12px 14px' : '9px 12px',
            borderRadius: radius.sm,
            border: `1px solid ${P.borderSubtle}`,
            background: P.canvas, color: P.textPrimary,
            fontSize: isDayOf ? type.size.xl : type.size.base,
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
              fontSize: isDayOf ? type.size.lg : type.size.caption,
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
                fontSize: type.size.sm, fontWeight: type.weight.medium, fontFamily: FF,
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
          fontSize: type.size.xs, lineHeight: 1.4,
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
        <div style={{ fontSize: type.size.xs, lineHeight: 1.4, color: P.textTertiary, fontStyle: 'italic' }}>
          {stateHint}
        </div>
      )}
    </div>
  );
}

// Fix #3 + #7: ConversationPane with inline approve/reject + scroll preservation
function ConversationPane({ thread, event, client, onSend, onApprove, onDeleteMessage, onEditMessage, onAiDraft, onUpdateContact, commLive, emailEnabled, resolveEmail, isDayOf = false, isMobile = false, onRoute }) {
  // Sprint 60.S Mobile Comms — collapse older messages on mobile by
  // default. Latest 2 + any pending approval bubble are shown; older
  // messages live behind a "Show N earlier messages" affordance. Keeps
  // the action above transcript history per the spec rebuild.
  const [earlierExpanded, setEarlierExpanded] = useState(false);
  // Inline message edit/delete state.
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  // Contact-info edit state (board: "create/update contact info from Messages").
  const [editingContact, setEditingContact] = useState(false);
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.canvas, fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF }}>
        Select a thread to view the conversation
      </div>
    );
  }

  const linkedDecision = (event.commClient || []).find(m =>
    m.message_type === 'approval_request' && thread.messages.some(tm => tm.id === m.id)
  );
  // The pending approval (if any) — pinned to the top as a sticky action card so
  // the planner never scrolls the transcript to find what needs them.
  const pendingApproval = thread.messages.find(m =>
    m.message_type === 'approval_request' && !['approved', 'rejected'].includes(m.approval_status)
  );

  // Contact behind this thread — the vendor (Vendors tab) or the client (Client
  // tab). Team/internal threads have no external contact. Vendors store email on
  // `contact`; clients store it on `email`. The editor normalizes to {email,phone}.
  const linkedVendor = thread.tab === 'Vendors'
    ? (event.vendors || []).find(v => (v.name || v.vendor_name) === thread.name)
    : null;
  const linkedClient = thread.tab === 'Client' ? (client || event.client || null) : null;
  const contact = linkedVendor
    ? { kind: 'vendor', name: linkedVendor.name || thread.name, email: linkedVendor.contact || '', phone: linkedVendor.phone || '' }
    : linkedClient
    ? { kind: 'client', name: linkedClient.name || thread.name, email: linkedClient.email || '', phone: linkedClient.phone || '' }
    : null;
  const canEditContact = !!(contact && onUpdateContact);
  const openContactEditor = () => { setCEmail(contact.email || ''); setCPhone(contact.phone || ''); setEditingContact(true); };
  const saveContact = () => { onUpdateContact(thread, { email: cEmail.trim(), phone: cPhone.trim() }); setEditingContact(false); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: P.canvas, overflow: 'hidden' }}>
      {/* Thread header — name + folded context (event · linked decision link).
          The board cut the standalone 240px Context rail; its one useful row
          (the decision link) lives here now. */}
      <div style={{
        minHeight: 48, flexShrink: 0,
        background: P.base, borderBottom: `1px solid ${P.borderSubtle}`,
        display: 'flex', alignItems: 'center', gap: 16, padding: '8px 24px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: type.size.section, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>
          {thread.name}
        </span>
        <span style={{ fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF }}>{event.name}</span>
        {linkedDecision && onRoute && (
          <button onClick={() => onRoute('Decisions', linkedDecision.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.accent || P.steelBlue, fontSize: type.size.sm, fontWeight: type.weight.semibold, fontFamily: FF, padding: 0 }}>
            Open decision →
          </button>
        )}
        <div style={{ flex: 1 }} />
        {/* Contact info — quiet summary + edit affordance (board: update contact
            from Messages). Shows what's on file for the vendor/client behind the
            thread; click to edit email + phone inline. */}
        {canEditContact && !editingContact && (
          <button
            onClick={openContactEditor}
            title={`Edit ${contact.kind === 'vendor' ? 'vendor' : 'client'} contact info`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
              background: 'transparent', border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm,
              cursor: 'pointer', padding: '4px 10px', fontFamily: FF, fontSize: type.size.sm, color: P.textSecondary,
            }}
          >
            {(contact.email || contact.phone)
              ? <span style={{ color: P.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{contact.email || contact.phone}</span>
              : <span style={{ color: P.amber }}>No contact info</span>}
            <span style={{ color: P.steelBlue || P.accent, fontWeight: type.weight.semibold }}>{(contact.email || contact.phone) ? 'Edit' : 'Add'}</span>
          </button>
        )}
      </div>

      {/* Inline contact editor — email + phone for the vendor/client behind this thread. */}
      {canEditContact && editingContact && (
        <div style={{
          flexShrink: 0, margin: '12px 24px 0', padding: '12px 14px',
          background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: 12,
          display: 'flex', flexDirection: 'column', gap: 8, fontFamily: FF,
        }}>
          <div style={{ fontSize: type.size['2xs'], fontWeight: type.weight.semibold, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.textTertiary }}>
            {contact.kind === 'vendor' ? 'Vendor' : 'Client'} contact · {contact.name}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email" type="email"
              style={{ flex: '1 1 180px', minWidth: 0, padding: '7px 10px', borderRadius: radius.sm, border: `1px solid ${P.borderSubtle}`, background: P.canvas, color: P.textPrimary, fontSize: type.size.base, fontFamily: FF, outline: 'none' }} />
            <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Phone" type="tel"
              style={{ flex: '1 1 140px', minWidth: 0, padding: '7px 10px', borderRadius: radius.sm, border: `1px solid ${P.borderSubtle}`, background: P.canvas, color: P.textPrimary, fontSize: type.size.base, fontFamily: FF, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button onClick={saveContact}
              style={{ minHeight: 32, padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)', color: '#fff', fontSize: type.size.base, fontWeight: type.weight.semibold, fontFamily: FF, cursor: 'pointer' }}>
              Save contact
            </button>
            <button onClick={() => setEditingContact(false)}
              style={{ minHeight: 32, padding: '7px 14px', borderRadius: 8, border: `1px solid ${P.borderSubtle}`, background: 'transparent', color: P.textSecondary, fontSize: type.size.base, fontWeight: type.weight.medium, fontFamily: FF, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sticky approval action card — pinned at the top of the conversation
          (was buried mid-transcript). Amber outline, the one action that needs you. */}
      {pendingApproval && onApprove && (
        <div style={{
          flexShrink: 0, margin: '12px 24px 0', padding: '12px 14px',
          background: P.card, border: `1px solid ${P.borderSubtle}`, borderLeft: `3px solid ${P.amber}`,
          borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: type.size['2xs'], fontWeight: type.weight.semibold, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.amber, fontFamily: FF }}>
            Approval needed
          </span>
          <span style={{ fontSize: type.size.base, color: P.textPrimary, fontFamily: FF, lineHeight: 1.35 }}>
            {pendingApproval.subject || pendingApproval.body || 'Review and approve this request.'}
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button onClick={() => onApprove(pendingApproval.id, 'approved')}
              style={{ minHeight: 36, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)', color: '#fff', fontSize: type.size.base, fontWeight: type.weight.semibold, fontFamily: FF, cursor: 'pointer' }}>
              Approve
            </button>
            <button onClick={() => onApprove(pendingApproval.id, 'rejected')}
              style={{ minHeight: 36, padding: '8px 18px', borderRadius: 8, border: `1px solid ${P.red}66`, background: 'transparent', color: P.red, fontSize: type.size.base, fontWeight: type.weight.semibold, fontFamily: FF, cursor: 'pointer' }}>
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Messages — Fix #7: ref for scroll preservation */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `${space[5]}px ${space[6]}px` }}>
        {thread.messages.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF, paddingTop: space[9] }}>
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
          /* Board Messages fix #8: cap the transcript to a readable measure and
             center it, so a single bubble doesn't stretch across a 1900px pane on
             wide screens. Full-width below the cap; centered above it. */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760, width: '100%', margin: '0 auto' }}>
            {hiddenCount > 0 && (
              <button
                onClick={() => setEarlierExpanded(true)}
                style={{
                  alignSelf: 'center',
                  padding: '8px 16px', borderRadius: 999,
                  background: P.canvas,
                  border: `1px solid ${P.borderSubtle}`,
                  color: P.textSecondary,
                  fontSize: type.size.caption, fontFamily: FF, fontWeight: type.weight.medium,
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
                <div key={m.id || i} data-deeplink={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isPlanner ? 'flex-end' : 'flex-start' }}>
                  {/* Sprint 60.Q Comms #2 Day-of: sender row scales up for
                      operational legibility. Day-of: 13px medium. Normal: 10px. */}
                  <div style={{
                    fontSize: isDayOf ? type.size.base : type.size.xs,
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
                    fontSize: isDayOf ? type.size.xl : type.size.caption,
                    color: P.textPrimary, fontFamily: FF,
                    lineHeight: type.leading.relaxed,
                  }}>
                    {/* Subject line — shown when present */}
                    {(m.subject || m.subject_line) && (
                      <div style={{
                        fontSize: type.size.sm, fontWeight: type.weight.semibold,
                        color: P.textSecondary, fontFamily: FF,
                        marginBottom: 5, paddingBottom: 5,
                        borderBottom: `1px solid ${P.borderSubtle}`,
                        letterSpacing: '0.01em',
                      }}>
                        {m.subject || m.subject_line}
                      </div>
                    )}
                    {editingId === m.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <textarea autoFocus value={editBody} onChange={e => setEditBody(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', borderRadius: 6, border: `1px solid ${P.borderSubtle}`, background: P.canvas, color: P.textPrimary, fontFamily: FF, fontSize: type.size.base, padding: 8, outline: 'none' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { onEditMessage && onEditMessage(m.id, editBody); setEditingId(null); }}
                            style={{ minHeight: 28, padding: '4px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)', color: '#fff', fontSize: type.size.sm, fontWeight: 700, fontFamily: FF, cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ minHeight: 28, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'none', color: P.textTertiary, fontSize: type.size.sm, fontFamily: FF, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>{m.body || m.text || m.message}{m.editedAt && <span style={{ fontSize: type.size.xs, color: P.textTertiary, fontStyle: 'italic' }}> · edited</span>}</>
                    )}
                    {/* Edit (planner messages) / Delete — quiet controls under the bubble */}
                    {editingId !== m.id && (onEditMessage || onDeleteMessage) && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        {isPlanner && onEditMessage && (
                          <button onClick={() => { setEditingId(m.id); setEditBody(m.body || m.text || m.message || ''); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textTertiary, fontSize: type.size.xs, fontWeight: 600, fontFamily: FF, padding: 0 }}>Edit</button>
                        )}
                        {onDeleteMessage && (
                          <button onClick={() => { if (window.confirm('Delete this message from the thread?')) onDeleteMessage(m.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textTertiary, fontSize: type.size.xs, fontWeight: 600, fontFamily: FF, padding: 0 }}>Delete</button>
                        )}
                      </div>
                    )}

                    {/* Approval action row — Sprint 60.Q Comms #3 polish.
                        Eyebrow chip on its own line above the buttons,
                        proper touch targets (40px min), Approve is the
                        steel-blue action (green is reserved for the
                        post-recorded state below), Reject keeps the red
                        outline ghost. */}
                    {/* The pending Approve/Reject now lives in the sticky card pinned
                        at the top of the pane — suppress the duplicate here. */}
                    {isPending && onApprove && !pendingApproval && (
                      <div style={{
                        marginTop: 12, paddingTop: 10,
                        borderTop: `1px solid ${P.borderSubtle}`,
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <span style={{
                          fontSize: type.size.xs, color: P.amber,
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
                              fontSize: type.size.base, fontWeight: type.weight.semibold, fontFamily: FF,
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
                              fontSize: type.size.base, fontWeight: type.weight.semibold, fontFamily: FF,
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
                        fontSize: type.size.sm, color: P.green,
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
                        fontSize: type.size.sm, color: P.red,
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
                    // Demo: with no live email backend, the seeded email-* statuses
                    // didn't actually send anything — show honest sample language
                    // instead of "Email accepted by provider".
                    const isEmailDs = typeof ds === 'string' && ds.startsWith('email-');
                    const isDemo = !commLive;
                    const tag = (isDemo && isEmailDs) ? 'Sample message'
                      : ds === 'email-delivered'    ? 'Sent via email'
                      : ds === 'email-accepted'   ? 'Delivery pending'
                      : ds === 'email-sent'       ? 'Delivery pending'
                      : ds === 'email-failed'     ? 'Delivery failed'
                      : ds === 'email-bounced'    ? 'Delivery failed'
                      : ds === 'email-complained' ? 'Provider blocked'
                      : ds === 'email-deferred'   ? 'Delivery pending'
                      : ds === 'sent-via-app'     ? 'Saved to thread'
                      : ds === 'local-only'       ? 'Saved to thread'
                      :                              'Saved to thread';
                    const detail = (isDemo && isEmailDs) ? 'Demo data — no message was actually sent.'
                      : ds === 'email-delivered'   ? 'Email delivered.'
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
                        fontSize: type.size['2xs'], fontFamily: FF, marginTop: 3,
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

      <Composer thread={thread} event={event} onSend={onSend} onAiDraft={onAiDraft} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} isDayOf={isDayOf} isMobile={isMobile} />
    </div>
  );
}

// Fix #4: Populate ContextPanel with event + contact data
function ContextPanel({ thread, event, onRoute }) {
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
          fontSize: type.size.caption, fontWeight: type.weight.semibold,
          color: P.textPrimary, fontFamily: FF,
        }}>Context</span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Fix #4: Event countdown always shown */}
        {daysLabel && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: type.size['2xs'], letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>EVENT</div>
            <div style={{ fontSize: type.size.base, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>{event?.name}</div>
            <div style={{ fontSize: type.size.sm, color: daysToEvt !== null && daysToEvt <= 14 ? P.red : daysToEvt !== null && daysToEvt <= 30 ? P.amber : P.textSecondary, fontFamily: FF, marginTop: 2 }}>
              {daysLabel} {daysToEvt !== null && daysToEvt >= 0 ? 'from now' : ''}
            </div>
          </div>
        )}

        {/* Vendor contact — quick-reach links */}
        {linkedVendor && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: type.size['2xs'], letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 6 }}>VENDOR</div>
            <div style={{ fontSize: type.size.caption, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF, marginBottom: 6 }}>{linkedVendor.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {vendorEmail && (
                <a href={`mailto:${vendorEmail}`} style={{ fontSize: type.size.sm, color: P.accent || P.steelBlue, fontFamily: FF, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: P.textTertiary, fontSize: type.size['2xs'], fontWeight: 700, letterSpacing: '0.06em' }}>EMAIL</span> {vendorEmail}
                </a>
              )}
              {vendorPhone && (
                <a href={`tel:${vendorPhone}`} style={{ fontSize: type.size.sm, color: P.accent || P.steelBlue, fontFamily: FF, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: P.textTertiary, fontSize: type.size['2xs'], fontWeight: 700, letterSpacing: '0.06em' }}>CALL</span> {vendorPhone}
                </a>
              )}
              {vendorWhatsApp && (
                <a href={`https://wa.me/${vendorWhatsApp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: type.size.sm, color: P.accent || P.steelBlue, fontFamily: FF, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: P.textTertiary, fontSize: type.size['2xs'], fontWeight: 700, letterSpacing: '0.06em' }}>WHATSAPP</span>
                </a>
              )}
            </div>
            <div style={{ fontSize: type.size['2xs'], color: linkedVendor.status === 'Confirmed' ? P.green : P.amber, fontWeight: type.weight.semibold, letterSpacing: '0.06em', fontFamily: FF, marginTop: 6 }}>
              {(linkedVendor.status || '').toUpperCase()}
            </div>
            {onRoute && (
              <button onClick={() => onRoute('Vendors', linkedVendor.id)}
                style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', padding: 0, color: P.green, fontSize: type.size.sm, fontWeight: type.weight.semibold, fontFamily: FF, cursor: 'pointer' }}>
                Open vendor cockpit →
              </button>
            )}
          </div>
        )}

        {/* Pending approval */}
        {approvalMsg && !['approved','rejected'].includes(approvalMsg.approval_status) && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: type.size['2xs'], letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>DECISION</div>
            <div style={{ fontSize: type.size.caption, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>{approvalMsg.subject || 'Approval request'}</div>
            <span style={{ fontSize: type.size['2xs'], fontWeight: type.weight.medium, color: P.amber, letterSpacing: '0.06em', padding: '1px 5px', borderRadius: 2, border: `1px solid ${P.amber}44`, background: P.amber + '12', fontFamily: FF }}>PENDING</span>
            {onRoute && (
              <button onClick={() => onRoute('Decisions', approvalMsg.id)}
                style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', padding: 0, color: P.amber, fontSize: type.size.sm, fontWeight: type.weight.semibold, fontFamily: FF, cursor: 'pointer' }}>
                Open decision →
              </button>
            )}
          </div>
        )}

        {/* Linked task */}
        {taskMsg && (
          <div style={{ padding: `${space[4]}px 0`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: type.size['2xs'], letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF, marginBottom: 4 }}>TASK</div>
            <div style={{ fontSize: type.size.caption, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>{taskMsg.linked_task || 'Linked task'}</div>
            {taskMsg.task_due && <div style={{ fontSize: type.size.xs, color: P.red, fontFamily: FF }}>DUE {taskMsg.task_due.toUpperCase()}</div>}
            {onRoute && (
              <button onClick={() => onRoute('Planning Tasks', taskMsg.task_id || taskMsg.id)}
                style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', padding: 0, color: P.textSecondary, fontSize: type.size.sm, fontWeight: type.weight.semibold, fontFamily: FF, cursor: 'pointer' }}>
                Open task →
              </button>
            )}
          </div>
        )}

        {/* Open questions */}
        {openQuestions.length > 0 && (
          <>
            <div style={{ fontSize: type.size['2xs'], fontWeight: type.weight.medium, letterSpacing: '0.10em', color: P.textTertiary, fontFamily: FF, marginTop: space[4], marginBottom: space[3] }}>
              OPEN QUESTIONS
            </div>
            {openQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: `${space[2]}px 0` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: P.amber, flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: type.size.caption, color: P.textSecondary, fontFamily: FF, lineHeight: 1.4 }}>{q}</span>
              </div>
            ))}
          </>
        )}

        {!hasContext && (
          <div style={{ paddingTop: space[5], fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF }}>No linked items</div>
        )}
        <div style={{ height: space[5] }} />
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function CommunicationHub({
  event, client, isMobile, isDayOf = false,
  openId,
  onBack,
  onSend,
  onApprove,   // Fix #3: (messageId, verdict) => void
  onDeleteMessage, // (messageId) => void
  onEditMessage,   // (messageId, newBody) => void
  onAiDraft,   // comms innovation: (thread, onChunk) => Promise<string> | null
  onUpdateContact, // (thread, {email, phone}) => void — edit vendor/client contact from a thread
  commLive,
  emailEnabled,
  resolveEmail,
  onRouteToTab,  // Sprint 60.Y: (tab, itemId) => void — deep-link ContextPanel rows
}) {
  const threads = useMemo(() => buildThreads(event), [event]);
  // Board redesign (2026-06-11): tablet (<1024) uses the single-pane
  // list↔conversation swap — the 3 crushed columns at 834 were the worst break.
  // Only ≥1024 gets the multi-pane layout.
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setVw(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  // Board fix #2: the 2-pane only earns its width with real breathing room. At
  // 1024–1279 it forced a cramped ~300px list + a voided conversation. Raise the
  // floor to 1280 so tablet-landscape uses the cleaner single-pane swap.
  const isNarrow = isMobile || vw < 1280;
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
  // Sprint 60.Y — the open conversation must reflect the freshest thread, not a
  // frozen snapshot. threads rebuild from `event` (e.g. on approve/reject), so
  // re-resolve the selected thread by id each render. Without this, approving a
  // request updated event state but the open pane kept rendering the stale copy,
  // so the Approve button looked inert.
  const selectedLive = useMemo(
    () => (selected ? threads.find(t => t.id === selected.id) || selected : null),
    [threads, selected]
  );
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
          fontSize: type.size.sm, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px',
        }}
      >
        ← Overview
      </button>
      {/* Sprint 61.K — steel-blue eyebrow matches modal NO GUESSWORK
          rails + LegacyTabHeader + CommandCenter SectionHeader voice. */}
      <span style={{
        fontSize: isMobile ? type.size.base : type.size.xs,
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
            fontSize: type.size['2xs'], fontWeight: type.weight.semibold,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: chatStatus.color, fontFamily: FF,
          }}>
            {chatStatus.label}
          </span>
        )}
      </div>
    </div>
  );

  if (isNarrow) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Board fix #6: the mobile workspaceHeader (← Overview | Messages | ●)
            duplicated the App-level LegacyTabHeader (‹ Overview / Messages /
            subtitle) — three wayfinding elements in ~80px. Removed; the shared
            header already names where you are. Live-status belongs in Settings. */}
        {mobileView === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* A1+A2 — full-width needs-reply band above the list on narrow screens. */}
          <NeedsReplyBand threads={threads} onOpen={t => { setSelected(t); setTab(t.tab); setMobileView('conversation'); }} onJumpTab={setTab} />
          <ThreadList
            threads={threads}
            tab={tab}
            onTab={t => { setTab(t); }}
            selected={selected}
            onSelect={t => { setSelected(t); setMobileView('conversation'); }}
            chatStatus={chatStatus}
            isMobile={true}
          />
          </div>
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
                fontSize: type.size.caption, color: P.textSecondary, fontFamily: FF,
              }}
            >
              ← All threads
            </button>
            <ConversationPane thread={selectedLive} event={event} client={client} onSend={onSend} onApprove={onApprove} onDeleteMessage={onDeleteMessage} onEditMessage={onEditMessage} onAiDraft={onAiDraft} onUpdateContact={onUpdateContact} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} isDayOf={isDayOf} isMobile={isMobile} onRoute={onRouteToTab} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Desktop: the shared LegacyTabHeader "Messages" title (App.js) now carries
          the ‹ Overview back + title, so the in-hub COMMUNICATION header is removed
          to avoid a double header. */}
      {/* A1+A2 — full-width needs-reply hero band above both panes (wait-time led). */}
      <NeedsReplyBand threads={threads} onOpen={t => { setSelected(t); setTab(t.tab); }} onJumpTab={setTab} />
      {/* Board redesign: 2-pane (thread list + conversation). The standalone
          240px Context rail was cut — its decision link folded into the
          conversation header, freeing the conversation to breathe. */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <ThreadList
        threads={threads}
        tab={tab}
        onTab={setTab}
        selected={selected}
        onSelect={setSelected}
        chatStatus={chatStatus}
      />
      <ConversationPane thread={selectedLive} event={event} client={client} onSend={onSend} onApprove={onApprove} onDeleteMessage={onDeleteMessage} onEditMessage={onEditMessage} onAiDraft={onAiDraft} onUpdateContact={onUpdateContact} commLive={commLive} emailEnabled={emailEnabled} resolveEmail={resolveEmail} isDayOf={isDayOf} isMobile={isMobile} onRoute={onRouteToTab} />
      </div>
    </div>
  );
}
