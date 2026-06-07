// demo/src/plan/DecisionApprovalCenter.jsx
// Sprint 46 · Page 94 · H — Decision + Approval Center
// PLAN Layer · Tier 0 · Track A
//
// Design source: Figma CYlmJqDCXEaacCuz9wW3bd page 554:211
// Left: filterable list with DECISION / APPROVAL types, status pills
// Center: detail — Approval Details + Impacted Tasks + Your Decision (3 action buttons)
// Mobile: compact card list with inline approve / revision / reject
// Status via color + text only. No emoji. No icons.

import { useState, useEffect, useMemo } from 'react';
import { color, space, type, radius } from '../design/tokens';

// Sprint 49: Phase offsets mirror App.js — drives "URGENT" classification for
// timeline-derived decisions (overdue tasks).
const PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out':  -182, '5 Months Out':  -152, '4 Months Out': -121,
  '3 Months Out':   -91, '2 Months Out':   -61, '1 Month Out':   -30,
  '2 Weeks Out':    -14, 'Week Of':          -7,
};
function isOverdue(task, eventDate) {
  if (!eventDate || !(task.week in PHASE_OFFSET)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() + PHASE_OFFSET[task.week]);
  return due < today && !task.done;
}
function overdueDays(task, eventDate) {
  if (!eventDate || !(task.week in PHASE_OFFSET)) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() + PHASE_OFFSET[task.week]);
  return Math.ceil((today - due) / 86400000);
}

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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  PENDING:   { color: P.textSecondary },
  URGENT:    { color: P.red },
  AWAITING:  { color: P.amber },
  OPEN:      { color: P.green },
  APPROVED:  { color: P.green },
  REJECTED:  { color: P.red },
};
function pillColor(label) {
  return (STATUS[label] || STATUS.PENDING).color;
}

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
function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return str; }
}
function fmtMoney(n) {
  if (n == null || n === '') return null;
  const num = Number(n);
  const prefix = num >= 0 ? '+$' : '-$';
  return prefix + Math.abs(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ── Build decision items from event data ──────────────────────────────────────
function buildItems(event) {
  const items = [];
  const comms = event.commClient || [];

  // Approval requests from comms
  comms
    .filter(m => m.message_type === 'approval_request')
    .forEach(m => {
      const status = m.approval_status === 'approved' ? 'APPROVED'
        : m.approval_status === 'rejected' ? 'REJECTED'
        : m.urgency === 'urgent' ? 'URGENT'
        : 'AWAITING';
      items.push({
        id: m.id || `approval-${m.subject}`,
        type: 'APPROVAL',
        title: m.subject || 'Approval request',
        owner: m.from_name || m.senderName || 'Client',
        ownerType: 'Client',
        status,
        date: m.createdAt || m.date,
        raw: m,
        // Detail fields
        requestedBy: m.from_name || 'Client',
        budgetImpact: m.budget_impact,
        affects: m.affects,
        timelineImpact: m.timeline_impact || m.decision_deadline,
        approvalStatus: m.approval_status,
        body: m.body || m.text || '',
        impactedTasks: m.impacted_tasks || [],
      });
    });

  // Sprint 49: Decisions are derived from overdue timeline tasks — the same
  // data model the Command Center already uses. This unifies "decisions" as
  // a concept across L1/L3/L4 instead of requiring a separate event.decisions
  // schema. Closed (done) tasks are excluded; only uncompleted overdue.
  (event.timeline || []).forEach(t => {
    if (!isOverdue(t, event.date)) return;
    const od = overdueDays(t, event.date);
    items.push({
      id: t.id, // use task id directly so Command Center routing lines up
      type: 'DECISION',
      title: t.task || 'Untitled task',
      owner: t.owner || 'You',
      ownerType: t.owner || 'You',
      status: od > 14 ? 'URGENT' : 'AWAITING',
      date: event.date,
      raw: t,
      requestedBy: t.owner || 'You',
      budgetImpact: null,
      affects: t.week,
      timelineImpact: `Overdue ${od}d · ${t.week}`,
      approvalStatus: null,
      body: t.notes || `${t.week} milestone — ${od} days past target. Decide whether to extend, reassign, or close.`,
      impactedTasks: [],
    });
  });

  // Sort: URGENT → AWAITING → OPEN → PENDING → closed
  const order = { URGENT: 0, AWAITING: 1, OPEN: 2, PENDING: 3, APPROVED: 4, REJECTED: 5 };
  items.sort((a, b) => (order[a.status] || 3) - (order[b.status] || 3));

  return items;
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ label }) {
  const clr = pillColor(label);
  return (
    <span style={{
      fontSize: 9, fontWeight: type.weight.medium,
      letterSpacing: '0.08em', color: clr,
      padding: '2px 6px', borderRadius: 3,
      border: `1px solid ${clr}44`, background: clr + '12',
      fontFamily: FF, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTER_TABS = ['All', 'Pending', 'Approvals', 'Closed'];

function FilterTabs({ active, counts, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '8px 12px',
      borderBottom: `1px solid ${P.borderSubtle}`, flexShrink: 0,
    }}>
      {FILTER_TABS.map(f => {
        const isActive = f === active;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            style={{
              padding: '3px 10px', borderRadius: radius.sm,
              border: isActive ? `1px solid ${P.borderSubtle}` : '1px solid transparent',
              background: isActive ? P.borderSubtle : 'transparent',
              cursor: 'pointer', fontFamily: FF, fontSize: 11,
              fontWeight: isActive ? type.weight.semibold : type.weight.regular,
              color: isActive ? P.textPrimary : P.textSecondary,
            }}
          >
            {f}
            {counts[f] > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, color: P.textTertiary }}>
                {counts[f]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Item list (left column) ───────────────────────────────────────────────────
function ItemList({ items, filter, selected, onSelect }) {
  const filtered = items.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return ['PENDING', 'URGENT', 'AWAITING', 'OPEN'].includes(item.status);
    if (filter === 'Approvals') return item.type === 'APPROVAL';
    if (filter === 'Closed') return ['APPROVED', 'REJECTED'].includes(item.status);
    return true;
  });

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: P.base,
      borderRight: `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: space[7], textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF }}>
            No items
          </div>
        ) : filtered.map(item => {
          const isSelected = selected?.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
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
              {/* Type badge + date */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 9, fontWeight: type.weight.medium,
                  letterSpacing: '0.08em', color: P.textTertiary,
                  fontFamily: FF,
                }}>
                  {item.type}
                </span>
                <span style={{ fontSize: 10, color: P.textTertiary, fontFamily: FF }}>
                  {fmtRelative(item.date)}
                </span>
              </div>

              {/* Title */}
              <div style={{
                fontSize: 12, fontWeight: type.weight.medium,
                color: P.textPrimary, fontFamily: FF, lineHeight: 1.35,
              }}>
                {item.title}
              </div>

              {/* Owner + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: P.textSecondary, fontFamily: FF }}>
                  Owner: {item.owner}
                </span>
                <StatusPill label={item.status} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Detail tabs ───────────────────────────────────────────────────────────────
const DETAIL_TABS = ['Detail', 'Supporting Files', 'Impacted Tasks', 'Communication'];

// ── Detail pane ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, padding: `${space[3]}px 0`,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
      <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, fontWeight: type.weight.medium,
        color: valueColor || P.textPrimary, fontFamily: FF,
        textAlign: 'right', maxWidth: '60%',
      }}>
        {value || '—'}
      </span>
    </div>
  );
}

function ImpactedTaskRow({ task }) {
  const label = typeof task === 'string' ? task : task.label || task.title || task.name || 'Task';
  const type_ = typeof task === 'string' ? 'Task' : task.type || 'Task';
  const dot = type_ === 'Decision' ? P.amber : type_ === 'Budget' ? P.green : P.textSecondary;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: `${space[3]}px 0`,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF }}>{label}</div>
        <div style={{ fontSize: 10, color: P.textTertiary, fontFamily: FF }}>{type_}</div>
      </div>
    </div>
  );
}

function ItemDetail({ item, onAction }) {
  const [tab, setTab] = useState('Detail');
  const alreadyClosed = ['APPROVED', 'REJECTED'].includes(item.status);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: P.canvas, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: `${space[5]}px ${space[6]}px ${space[3]}px`,
        borderBottom: `1px solid ${P.borderSubtle}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: type.weight.medium, letterSpacing: '0.10em',
              color: item.type === 'APPROVAL' ? P.amber : P.textTertiary,
              fontFamily: FF, marginBottom: 4,
            }}>
              {item.type}
            </div>
            <div style={{
              fontSize: 20, fontWeight: type.weight.semibold,
              color: P.textPrimary, fontFamily: FF, lineHeight: 1.2,
            }}>
              {item.title}
            </div>
          </div>
          <StatusPill label={item.status} />
        </div>
        {item.body && (
          <div style={{
            fontSize: 12, color: P.textSecondary, fontFamily: FF,
            lineHeight: type.leading.relaxed, marginTop: 4,
          }}>
            {item.body.slice(0, 200)}{item.body.length > 200 ? '…' : ''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${P.borderSubtle}`,
        paddingLeft: 24, flexShrink: 0,
      }}>
        {DETAIL_TABS.map(t => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                height: 38, padding: '0 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: FF, fontSize: 12,
                fontWeight: isActive ? type.weight.semibold : type.weight.regular,
                color: isActive ? P.textPrimary : P.textSecondary,
                borderBottom: isActive ? `2px solid ${P.green}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>

        {/* Left: Approval Details + Impacted Tasks */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `${space[5]}px ${space[6]}px` }}>

          {tab === 'Detail' && (
            <>
              <div style={{
                background: P.card, border: `1px solid ${P.borderSubtle}`,
                borderRadius: radius.md, padding: `0 ${space[5]}px`,
                marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.12em',
                  color: P.textTertiary, fontFamily: FF,
                  padding: `${space[4]}px 0 ${space[2]}px`,
                }}>
                  APPROVAL DETAILS
                </div>
                <DetailRow label="Owner" value={item.owner} />
                <DetailRow label="Requested by" value={item.requestedBy} />
                {item.budgetImpact != null && (
                  <DetailRow
                    label="Budget impact"
                    value={fmtMoney(item.budgetImpact)}
                    valueColor={Number(item.budgetImpact) > 0 ? P.amber : P.green}
                  />
                )}
                {item.affects && <DetailRow label="Affects" value={item.affects} />}
                {item.timelineImpact && (
                  <DetailRow
                    label="Timeline impact"
                    value={`Must decide before ${fmtDate(item.timelineImpact)}`}
                    valueColor={P.red}
                  />
                )}
                <DetailRow
                  label="Status"
                  value={item.approvalStatus === 'approved' ? 'Approved'
                    : item.approvalStatus === 'rejected' ? 'Rejected'
                    : 'Awaiting planner review'}
                  valueColor={
                    item.approvalStatus === 'approved' ? P.green
                    : item.approvalStatus === 'rejected' ? P.red
                    : P.amber
                  }
                />
              </div>

              {item.impactedTasks.length > 0 && (
                <div style={{
                  background: P.card, border: `1px solid ${P.borderSubtle}`,
                  borderRadius: radius.md, padding: `0 ${space[5]}px`,
                  marginBottom: 16,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.12em',
                    color: P.textTertiary, fontFamily: FF,
                    padding: `${space[4]}px 0 ${space[2]}px`,
                  }}>
                    IMPACTED TASKS
                  </div>
                  {item.impactedTasks.map((t, i) => (
                    <ImpactedTaskRow key={i} task={t} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'Supporting Files' && (
            <div style={{
              background: P.card, border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.md, padding: space[5],
              fontSize: 12, color: P.textTertiary, fontFamily: FF,
              textAlign: 'center',
            }}>
              No supporting files attached
            </div>
          )}

          {tab === 'Impacted Tasks' && (
            item.impactedTasks.length > 0 ? (
              <div style={{
                background: P.card, border: `1px solid ${P.borderSubtle}`,
                borderRadius: radius.md, padding: `0 ${space[5]}px`,
              }}>
                {item.impactedTasks.map((t, i) => (
                  <ImpactedTaskRow key={i} task={t} />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: P.textTertiary, fontFamily: FF, textAlign: 'center', paddingTop: space[9] }}>
                No impacted tasks linked
              </div>
            )
          )}

          {tab === 'Communication' && (
            <div style={{ fontSize: 12, color: P.textTertiary, fontFamily: FF, textAlign: 'center', paddingTop: space[9] }}>
              Communication history for this item will appear here
            </div>
          )}
        </div>

        {/* Right: Your Decision — Sprint 49: now shown for both APPROVAL and
            DECISION items. Approve action persists via host (mark task done
            or set approval_status). */}
        {tab === 'Detail' && !alreadyClosed && (
          <div style={{
            width: 280, flexShrink: 0,
            borderLeft: `1px solid ${P.borderSubtle}`,
            padding: `${space[5]}px ${space[5]}px`,
            background: P.base, overflowY: 'auto',
          }}>
            <div style={{
              fontSize: 13, fontWeight: type.weight.semibold,
              color: P.textPrimary, fontFamily: FF, marginBottom: space[5],
            }}>
              {item.type === 'DECISION' ? 'Resolve Decision' : 'Your Decision'}
            </div>

            {/* Approve */}
            <button
              onClick={() => onAction(item, 'approve')}
              style={{
                display: 'block', width: '100%', padding: `${space[4]}px`,
                marginBottom: 10,
                background: P.green, border: 'none', borderRadius: radius.sm,
                cursor: 'pointer', fontSize: 13, fontWeight: type.weight.semibold,
                color: '#fff', fontFamily: FF, textAlign: 'center',
              }}
            >
              {item.type === 'DECISION' ? 'Mark Resolved' : 'Mark Approved'}
              {item.budgetImpact != null && ` — accept ${fmtMoney(item.budgetImpact)} increase`}
            </button>

            {/* Request Revision */}
            <button
              onClick={() => onAction(item, 'revision')}
              style={{
                display: 'block', width: '100%', padding: `${space[4]}px`,
                marginBottom: 10,
                background: 'transparent',
                border: `1px solid ${P.amber}`, borderRadius: radius.sm,
                cursor: 'pointer', fontSize: 13, fontWeight: type.weight.semibold,
                color: P.amber, fontFamily: FF, textAlign: 'center',
              }}
            >
              Mark Needs Revision
            </button>

            {/* Reject */}
            <button
              onClick={() => onAction(item, 'reject')}
              style={{
                display: 'block', width: '100%', padding: `${space[4]}px`,
                background: 'transparent',
                border: `1px solid ${P.red}`, borderRadius: radius.sm,
                cursor: 'pointer', fontSize: 13, fontWeight: type.weight.semibold,
                color: P.red, fontFamily: FF, textAlign: 'center',
              }}
            >
              Mark Rejected
              {item.budgetImpact != null ? ' — hold current budget' : ''}
            </button>

            {/* Note field */}
            <div style={{
              marginTop: space[5],
              borderRadius: radius.sm,
              border: `1px solid ${P.borderSubtle}`,
              background: P.card,
              padding: space[4],
              fontSize: 12, color: P.textTertiary, fontFamily: FF,
              minHeight: 60,
            }}>
              Internal note (stays on your board)…
            </div>

            {/* Honesty microcopy — these verdicts record on the planner's board.
                The client is NOT notified from here; the real client-facing path is
                the Communication tab's approval request (commApi + portal). */}
            <div style={{
              marginTop: space[3],
              fontSize: 11, color: P.textTertiary, fontFamily: FF, lineHeight: 1.5,
            }}>
              Recorded on your board — the client isn't notified here. To ask the client,
              use <strong style={{ color: P.textSecondary, fontWeight: type.weight.semibold }}>Communication → request approval</strong>.
            </div>
          </div>
        )}

        {/* Closed state */}
        {tab === 'Detail' && alreadyClosed && (
          <div style={{
            width: 220, flexShrink: 0,
            borderLeft: `1px solid ${P.borderSubtle}`,
            padding: `${space[5]}px ${space[5]}px`,
            background: P.base,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{
              fontSize: 12, fontWeight: type.weight.semibold,
              color: item.status === 'APPROVED' ? P.green : P.red,
              fontFamily: FF,
            }}>
              {item.status === 'APPROVED' ? 'Approved' : 'Rejected'}
            </div>
            <div style={{ fontSize: 11, color: P.textTertiary, fontFamily: FF, textAlign: 'center' }}>
              This item has been closed
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mobile card (compact approve/revision/reject inline) ──────────────────────
function MobileItemCard({ item, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const alreadyClosed = ['APPROVED', 'REJECTED'].includes(item.status);

  return (
    <div style={{
      background: P.card, border: `1px solid ${P.borderSubtle}`,
      borderRadius: radius.md, marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          width: '100%', padding: `${space[4]}px ${space[4]}px`,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, letterSpacing: '0.08em',
            color: item.type === 'APPROVAL' ? P.amber : P.textTertiary,
            fontFamily: FF, marginBottom: 4,
          }}>
            {item.type}
          </div>
          <div style={{
            fontSize: 13, fontWeight: type.weight.medium,
            color: P.textPrimary, fontFamily: FF, lineHeight: 1.3,
          }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: P.textSecondary, fontFamily: FF, marginTop: 4 }}>
            Owner: {item.owner}
          </div>
        </div>
        <StatusPill label={item.status} />
      </button>

      {/* Expanded actions */}
      {expanded && item.type === 'APPROVAL' && !alreadyClosed && (
        <div style={{
          padding: `0 ${space[4]}px ${space[4]}px`,
          display: 'flex', gap: 8,
          borderTop: `1px solid ${P.borderSubtle}`,
          paddingTop: space[3],
        }}>
          <button
            onClick={() => onAction(item, 'approve')}
            style={{
              flex: 1, padding: `${space[3]}px`,
              background: P.green, border: 'none', borderRadius: radius.sm,
              cursor: 'pointer', fontSize: 11, fontWeight: type.weight.semibold,
              color: '#fff', fontFamily: FF,
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onAction(item, 'revision')}
            style={{
              flex: 1, padding: `${space[3]}px`,
              background: 'transparent', border: `1px solid ${P.amber}`,
              borderRadius: radius.sm, cursor: 'pointer',
              fontSize: 11, fontWeight: type.weight.semibold,
              color: P.amber, fontFamily: FF,
            }}
          >
            Revision
          </button>
          <button
            onClick={() => onAction(item, 'reject')}
            style={{
              flex: 1, padding: `${space[3]}px`,
              background: 'transparent', border: `1px solid ${P.red}`,
              borderRadius: radius.sm, cursor: 'pointer',
              fontSize: 11, fontWeight: type.weight.semibold,
              color: P.red, fontFamily: FF,
            }}
          >
            Reject
          </button>
        </div>
      )}

      {expanded && (item.type !== 'APPROVAL' || alreadyClosed) && (
        <div style={{
          padding: `${space[3]}px ${space[4]}px ${space[4]}px`,
          borderTop: `1px solid ${P.borderSubtle}`,
          fontSize: 12, color: P.textSecondary, fontFamily: FF,
          lineHeight: type.leading.relaxed,
        }}>
          {item.body || 'No additional details.'}
        </div>
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DecisionApprovalCenter({
  event, isMobile,
  // Sprint 49: editing + routing props for canonical Decisions tab promotion
  openId,
  onBack,
  onResolveDecision,   // (taskId) => marks the underlying timeline task done
  onActApproval,        // (messageId, action: 'approve' | 'reject' | 'revision')
}) {
  const items = useMemo(() => buildItems(event), [event]);
  const [filter, setFilter] = useState('All');
  const initialSelected = useMemo(() => {
    if (openId) {
      const found = items.find(i => i.id === openId);
      if (found) return found;
    }
    return items.length > 0 ? items[0] : null;
  }, [openId, items]);
  const [selected, setSelected] = useState(initialSelected);

  // Sync selection when openId changes after mount (re-route from L1/L3)
  useEffect(() => {
    if (!openId) return;
    const found = items.find(i => i.id === openId);
    if (found) setSelected(found);
  }, [openId, items]);

  // Local action log mirrors what the host hasn't persisted yet
  const [actionLog, setActionLog] = useState({});

  function handleAction(item, action) {
    setActionLog(prev => ({ ...prev, [item.id]: action }));
    const next = action === 'approve' ? 'APPROVED'
      : action === 'reject' ? 'REJECTED'
      : 'AWAITING';
    setSelected(s => s?.id === item.id ? { ...s, status: next } : s);
    // Sprint 49: propagate to host for real persistence where wired
    if (item.type === 'DECISION' && action === 'approve' && onResolveDecision) {
      onResolveDecision(item.id);
    }
    if (item.type === 'APPROVAL' && onActApproval) {
      onActApproval(item.id, action);
    }
  }

  const counts = {
    All: items.length,
    Pending: items.filter(i => ['PENDING', 'URGENT', 'AWAITING', 'OPEN'].includes(i.status)).length,
    Approvals: items.filter(i => i.type === 'APPROVAL').length,
    Closed: items.filter(i => ['APPROVED', 'REJECTED'].includes(i.status)).length,
  };

  // Apply action log overrides to status
  const displayItems = items.map(item => ({
    ...item,
    status: actionLog[item.id] === 'approve' ? 'APPROVED'
      : actionLog[item.id] === 'reject' ? 'REJECTED'
      : actionLog[item.id] === 'revision' ? 'AWAITING'
      : item.status,
  }));

  // Sprint 49: shared workspace header with one-click return to Command Center
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
        Decisions
      </span>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {workspaceHeader}
        <div style={{ padding: `${space[4]}px ${space[4]}px`, overflowY: 'auto', flex: 1 }}>
        <div style={{
          fontSize: 9, fontWeight: type.weight.medium, letterSpacing: '0.10em',
          color: P.textTertiary, fontFamily: FF, marginBottom: space[4],
        }}>
          DECISIONS + APPROVALS · {items.length} ITEMS
        </div>
        {displayItems.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF, paddingTop: space[9] }}>
            No decisions or approvals
          </div>
        ) : displayItems.map(item => (
          <MobileItemCard key={item.id} item={item} onAction={handleAction} />
        ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {workspaceHeader}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left list */}
      <div style={{
        width: 240, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: P.base,
        borderRight: `1px solid ${P.borderSubtle}`,
        height: '100%',
      }}>
        <FilterTabs active={filter} counts={counts} onChange={setFilter} />
        <ItemList
          items={displayItems}
          filter={filter}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {/* Detail pane */}
      {selected ? (
        <ItemDetail
          item={displayItems.find(i => i.id === selected.id) || selected}
          onAction={handleAction}
        />
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: P.textTertiary, fontFamily: FF,
        }}>
          {items.length > 0 ? 'Select an item to view details' : 'No decisions or approvals yet'}
        </div>
      )}
      </div>
    </div>
  );
}
