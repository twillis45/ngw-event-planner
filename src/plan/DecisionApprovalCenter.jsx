// demo/src/plan/DecisionApprovalCenter.jsx
// Sprint 46 · Page 94 · H — Decision + Approval Center
// PLAN Layer · Tier 0 · Track A
//
// Design source: Figma CYlmJqDCXEaacCuz9wW3bd page 554:211
// Left: filterable list with DECISION / APPROVAL types, status pills
// Center: detail — Approval Details + Impacted Tasks + Your Decision (3 action buttons)
// Mobile: compact card list with inline approve / revision / reject
// Status via color + text only. No emoji. No icons.

import { useState, useEffect, useMemo, useRef } from 'react';
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
  // Decision "Extend": a snoozed task drops off the board until the snooze passes.
  if (task.snoozedUntil && new Date(task.snoozedUntil + 'T00:00:00') > today) return false;
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
  REJECTED:  { color: P.textTertiary }, // Red audit: rejected is a RESOLVED outcome, not a blocker — neutral, not red.
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
      fontSize: type.size['2xs'], fontWeight: type.weight.medium,
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
              background: isActive ? 'rgba(110,135,148,0.18)' : 'transparent',
              cursor: 'pointer', fontFamily: FF, fontSize: type.size.sm,
              fontWeight: isActive ? type.weight.semibold : type.weight.regular,
              color: isActive ? P.textPrimary : P.textSecondary,
            }}
          >
            {f}
            {counts[f] > 0 && (
              <span style={{ marginLeft: 4, fontSize: type.size.xs, color: P.textTertiary }}>
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
          <div style={{ padding: space[7], textAlign: 'center', fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF }}>
            No items
          </div>
        ) : filtered.map(item => {
          const isSelected = selected?.id === item.id;
          return (
            <button
              key={item.id}
              data-deeplink={item.id}
              onClick={() => onSelect(item)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                width: '100%', padding: '12px 16px',
                borderBottom: `1px solid ${P.borderSubtle}`,
                border: 'none',
                borderLeft: isSelected ? `3px solid ${P.green}` : '3px solid transparent',
                background: isSelected ? 'rgba(110,135,148,0.18)' : 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              {/* Type badge + date */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: type.size['2xs'], fontWeight: type.weight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: P.textTertiary,
                  fontFamily: FF,
                }}>
                  {item.type}
                </span>
                <span style={{ fontSize: type.size.xs, color: P.textTertiary, fontFamily: FF }}>
                  {fmtRelative(item.date)}
                </span>
              </div>

              {/* Title */}
              <div style={{
                fontSize: type.size.section, fontWeight: type.weight.semibold,
                color: P.textPrimary, fontFamily: FF, lineHeight: 1.35,
              }}>
                {item.title}
              </div>

              {/* Owner + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: type.size.xs, color: P.textSecondary, fontFamily: FF }}>
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
      <span style={{ fontSize: type.size.caption, color: P.textSecondary, fontFamily: FF }}>
        {label}
      </span>
      <span style={{
        fontSize: type.size.caption, fontWeight: type.weight.medium,
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
        <div style={{ fontSize: type.size.caption, color: P.textPrimary, fontFamily: FF }}>{label}</div>
        <div style={{ fontSize: type.size.xs, color: P.textTertiary, fontFamily: FF }}>{type_}</div>
      </div>
    </div>
  );
}

function ItemDetail({ item, onAction, note, onSaveNote, onSendMessage, onReassign, reassignOptions = [] }) {
  const [tab, setTab] = useState('Detail');
  const alreadyClosed = ['APPROVED', 'REJECTED'].includes(item.status);

  // Compose-in-place (board 2026-06-12): "Message about this" used to teleport
  // to the generic Messages inbox with zero context. Now it opens an inline
  // composer ON the decision, pre-filled "Re: {title}", sends + logs to the
  // client thread, and never leaves the tab.
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sentNote, setSentNote] = useState(false);
  // Reassign-in-place (board 2026-06-12): the raw window.prompt is replaced by a
  // real dropdown of owners.
  const [reassigning, setReassigning] = useState(false);
  // Reset transient compose/reassign state whenever the selected item changes.
  useEffect(() => { setComposing(false); setDraft(''); setSentNote(false); setReassigning(false); }, [item.id]);

  const openCompose = () => {
    if (onSendMessage) { setSentNote(false); setDraft(`Re: ${item.title}\n\n`); setComposing(true); }
    else onAction(item, 'message'); // fallback to legacy route if host didn't wire it
  };
  const sendCompose = () => {
    const body = draft.trim();
    if (!body || !onSendMessage) return;
    onSendMessage(item, body);
    setComposing(false); setDraft(''); setSentNote(true);
  };

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
              fontSize: type.size['2xs'], fontWeight: type.weight.medium, letterSpacing: '0.10em',
              color: item.type === 'APPROVAL' ? P.amber : P.textTertiary,
              fontFamily: FF, marginBottom: 4,
            }}>
              {item.type}
            </div>
            <div style={{
              fontSize: type.size['2xl'], fontWeight: type.weight.semibold,
              color: P.textPrimary, fontFamily: FF, lineHeight: 1.2,
            }}>
              {item.title}
            </div>
          </div>
          <StatusPill label={item.status} />
        </div>
        {item.body && (
          <div style={{
            fontSize: type.size.caption, color: P.textSecondary, fontFamily: FF,
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
                fontFamily: FF, fontSize: type.size.caption,
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
                  fontSize: type.size['2xs'], fontWeight: type.weight.semibold, letterSpacing: '0.12em',
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
                    value={(() => {
                      // timelineImpact is mixed: a real deadline date OR an already-
                      // formatted string ("Overdue 5d · 6 Months Out", "deadline June 15").
                      // Only prefix "Must decide before" + format when it's a parseable
                      // date — otherwise show the string as-is (no "Invalid Date").
                      const d = new Date(item.timelineImpact);
                      return isNaN(d.getTime())
                        ? item.timelineImpact
                        : `Must decide before ${fmtDate(item.timelineImpact)}`;
                    })()}
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
                    : item.approvalStatus === 'rejected' ? P.textTertiary
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
                    fontSize: type.size['2xs'], fontWeight: type.weight.semibold, letterSpacing: '0.12em',
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
              fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF,
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
              <div style={{ fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF, textAlign: 'center', paddingTop: space[9] }}>
                No impacted tasks linked
              </div>
            )
          )}

          {tab === 'Communication' && (
            <div style={{ fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF, textAlign: 'center', paddingTop: space[9] }}>
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
              fontSize: type.size.base, fontWeight: type.weight.semibold,
              color: P.textPrimary, fontFamily: FF, marginBottom: space[5],
            }}>
              {item.type === 'DECISION' ? 'Resolve Decision' : 'Your Decision'}
            </div>

            {/* Primary — close it out (green). For a DECISION this resolves the
                underlying task; for an APPROVAL it approves. */}
            <button
              onClick={() => onAction(item, item.type === 'DECISION' ? 'close' : 'approve')}
              style={{
                display: 'block', width: '100%', padding: `${space[4]}px`,
                marginBottom: 10,
                background: P.green, border: 'none', borderRadius: radius.sm,
                cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                color: '#fff', fontFamily: FF, textAlign: 'center',
              }}
            >
              {item.type === 'DECISION' ? 'Mark done' : 'Mark Approved'}
              {item.budgetImpact != null && ` — accept ${fmtMoney(item.budgetImpact)} increase`}
            </button>

            {item.type === 'DECISION' ? (
              <>
                {/* Extend — push the deadline a week so it leaves the board now. */}
                <button
                  onClick={() => onAction(item, 'extend')}
                  style={{
                    display: 'flex', width: '100%', padding: `${space[4]}px`, gap: 8,
                    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                    background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm,
                    cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                    color: P.textSecondary, fontFamily: FF, textAlign: 'center',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.amber, flexShrink: 0 }} />
                  Extend deadline +1 week
                </button>
                {/* Reassign — a real dropdown of owners (board 2026-06-12: was a
                    raw window.prompt). Selecting an owner reassigns in place. */}
                {onReassign && reassignOptions.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) { onReassign(item, e.target.value); } }}
                    aria-label="Reassign this decision to"
                    style={{
                      width: '100%', padding: `${space[4]}px`,
                      background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm,
                      cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                      color: P.textSecondary, fontFamily: FF, appearance: 'none', textAlign: 'center', textAlignLast: 'center',
                    }}
                  >
                    <option value="" disabled>{`Reassign… (now: ${item.owner || '—'})`}</option>
                    {reassignOptions.filter(o => o !== item.owner).map(o => (
                      <option key={o} value={o}>{`Reassign to ${o}`}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => onAction(item, 'reassign')}
                    style={{
                      display: 'flex', width: '100%', padding: `${space[4]}px`, gap: 8,
                      alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm,
                      cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                      color: P.textSecondary, fontFamily: FF, textAlign: 'center',
                    }}
                  >
                    Reassign…
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Request Revision — neutral secondary; amber is a SIGNAL, not a fill. */}
                <button
                  onClick={() => onAction(item, 'revision')}
                  style={{
                    display: 'flex', width: '100%', padding: `${space[4]}px`, gap: 8,
                    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                    background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm,
                    cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                    color: P.textSecondary, fontFamily: FF, textAlign: 'center',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.amber, flexShrink: 0 }} />
                  Mark Needs Revision
                </button>
                {/* Reject — neutral secondary with a semantic red dot. */}
                <button
                  onClick={() => onAction(item, 'reject')}
                  style={{
                    display: 'flex', width: '100%', padding: `${space[4]}px`, gap: 8,
                    alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm,
                    cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                    color: P.textSecondary, fontFamily: FF, textAlign: 'center',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.red, flexShrink: 0 }} />
                  Mark Rejected
                  {item.budgetImpact != null ? ' — hold current budget' : ''}
                </button>
              </>
            )}

            {/* Message — compose in place (board 2026-06-12). Opens an inline
                composer pre-filled "Re: {title}", sends + logs to the client
                thread, and never leaves the Decisions tab. */}
            {!composing ? (
              <button
                onClick={openCompose}
                style={{
                  display: 'flex', width: '100%', padding: `${space[4]}px`, gap: 8,
                  alignItems: 'center', justifyContent: 'center', marginTop: 10,
                  background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm,
                  cursor: 'pointer', fontSize: type.size.base, fontWeight: type.weight.semibold,
                  color: sentNote ? P.green : P.textSecondary, fontFamily: FF, textAlign: 'center',
                }}
              >
                {sentNote ? '✓ Logged to client thread — send another?' : '✉ Message about this'}
              </button>
            ) : (
              <div style={{ marginTop: 10, border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, padding: space[3], background: P.card }}>
                <div style={{ fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF, marginBottom: 6 }}>
                  Message the client about this — logs to the conversation in Messages.
                </div>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box', borderRadius: radius.sm,
                    border: `1px solid ${P.borderSubtle}`, background: P.base,
                    padding: space[3], fontSize: type.size.caption, color: P.textPrimary, fontFamily: FF,
                    resize: 'vertical', outline: 'none', lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={sendCompose}
                    disabled={!draft.trim()}
                    style={{
                      flex: 1, padding: `${space[3]}px`, borderRadius: radius.sm, border: 'none',
                      background: draft.trim() ? P.green : P.borderDef, color: '#fff',
                      cursor: draft.trim() ? 'pointer' : 'default',
                      fontSize: type.size.caption, fontWeight: type.weight.semibold, fontFamily: FF,
                    }}
                  >
                    Send &amp; log
                  </button>
                  <button
                    onClick={() => { setComposing(false); setDraft(''); }}
                    style={{
                      padding: `${space[3]}px ${space[4]}px`, borderRadius: radius.sm,
                      background: 'transparent', border: `1px solid ${P.borderDef}`,
                      color: P.textSecondary, cursor: 'pointer', fontSize: type.size.caption,
                      fontWeight: type.weight.semibold, fontFamily: FF,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Note field — now an editable textarea persisted per item to
                event.decisionNotes. Uncontrolled (defaultValue + key) so typing is
                smooth; saves on blur. */}
            <textarea
              key={item.id}
              defaultValue={note || ''}
              placeholder="Internal note (stays on your board)…"
              onBlur={e => onSaveNote && onSaveNote(item.id, e.target.value)}
              style={{
                marginTop: space[5], width: '100%', boxSizing: 'border-box',
                borderRadius: radius.sm,
                border: `1px solid ${P.borderSubtle}`,
                background: P.card,
                padding: space[4],
                fontSize: type.size.caption, color: P.textPrimary, fontFamily: FF,
                minHeight: 60, resize: 'vertical', outline: 'none', lineHeight: 1.5,
              }}
            />

            {/* Honesty microcopy — these verdicts record on the planner's board.
                The client is NOT notified from here; the real client-facing path is
                the Communication tab's approval request (commApi + portal). */}
            <div style={{
              marginTop: space[3],
              fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF, lineHeight: 1.5,
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
              fontSize: type.size.caption, fontWeight: type.weight.semibold,
              color: item.status === 'APPROVED' ? P.green : P.red,
              fontFamily: FF,
            }}>
              {item.status === 'APPROVED' ? 'Approved' : 'Rejected'}
            </div>
            <div style={{ fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF, textAlign: 'center' }}>
              This item has been closed
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mobile card (compact approve/revision/reject inline) ──────────────────────
function MobileItemCard({ item, onAction, isTarget, onSendMessage, onReassign, reassignOptions = [] }) {
  const [expanded, setExpanded] = useState(!!isTarget);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sentNote, setSentNote] = useState(false);
  const ref = useRef(null);
  // Routed-to decision: open it AND center it so the planner lands directly on
  // the Resolve / Approve actions instead of a collapsed card in a long list.
  useEffect(() => {
    if (!isTarget) return;
    setExpanded(true);
    const t = setTimeout(() => {
      if (ref.current && ref.current.scrollIntoView) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [isTarget]);
  const alreadyClosed = ['APPROVED', 'REJECTED'].includes(item.status);

  return (
    <div ref={ref} data-deeplink={item.id} style={{
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
            fontSize: type.size['2xs'], fontWeight: type.weight.semibold,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: item.type === 'APPROVAL' ? P.amber : P.textTertiary,
            fontFamily: FF, marginBottom: 4,
          }}>
            {item.type}
          </div>
          <div style={{
            fontSize: type.size.section, fontWeight: type.weight.semibold,
            color: P.textPrimary, fontFamily: FF, lineHeight: 1.3,
          }}>
            {item.title}
          </div>
          <div style={{ fontSize: type.size.sm, color: P.textSecondary, fontFamily: FF, marginTop: 4 }}>
            Owner: {item.owner}
          </div>
        </div>
        <StatusPill label={item.status} />
      </button>

      {/* Expanded: the urgency info AND inline actions — act here, never hunt
          elsewhere to close it out. */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${P.borderSubtle}` }}>
          {item.body && (
            <div style={{
              padding: `${space[3]}px ${space[4]}px ${alreadyClosed ? space[4] : space[2]}px`,
              fontSize: type.size.caption, color: P.textSecondary, fontFamily: FF,
              lineHeight: type.leading.relaxed,
            }}>
              {item.body}
            </div>
          )}
          {!alreadyClosed && item.type === 'APPROVAL' && (
            <div style={{ padding: `${space[2]}px ${space[4]}px ${space[4]}px`, display: 'flex', gap: 8 }}>
              <button onClick={() => onAction(item, 'approve')} style={{ flex: 1, padding: `${space[3]}px`, background: P.green, border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: '#fff', fontFamily: FF }}>Approve</button>
              <button onClick={() => onAction(item, 'revision')} style={{ flex: 1, padding: `${space[3]}px`, background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: P.textSecondary, fontFamily: FF }}>Revision</button>
              <button onClick={() => onAction(item, 'reject')} style={{ flex: 1, padding: `${space[3]}px`, background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: P.textSecondary, fontFamily: FF }}>Reject</button>
            </div>
          )}
          {!alreadyClosed && item.type === 'DECISION' && (
            <div style={{ padding: `${space[2]}px ${space[4]}px ${space[2]}px`, display: 'flex', gap: 8 }}>
              <button onClick={() => onAction(item, 'close')} style={{ flex: 1, padding: `${space[3]}px`, background: P.green, border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: '#fff', fontFamily: FF }}>Mark done</button>
              <button onClick={() => onAction(item, 'extend')} style={{ flex: 1, padding: `${space[3]}px`, background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: P.textSecondary, fontFamily: FF }}>Extend +1wk</button>
              {onReassign && reassignOptions.length > 0 ? (
                <select value="" onChange={e => { if (e.target.value) onReassign(item, e.target.value); }} aria-label="Reassign to"
                  style={{ flex: 1, padding: `${space[3]}px`, background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: P.textSecondary, fontFamily: FF, appearance: 'none', textAlignLast: 'center' }}>
                  <option value="" disabled>Reassign</option>
                  {reassignOptions.filter(o => o !== item.owner).map(o => <option key={o} value={o}>{`To ${o}`}</option>)}
                </select>
              ) : (
                <button onClick={() => onAction(item, 'reassign')} style={{ flex: 1, padding: `${space[3]}px`, background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: P.textSecondary, fontFamily: FF }}>Reassign</button>
              )}
            </div>
          )}
          {!alreadyClosed && (
            <div style={{ padding: `0 ${space[4]}px ${space[4]}px` }}>
              {!composing ? (
                <button
                  onClick={() => { if (onSendMessage) { setSentNote(false); setDraft(`Re: ${item.title}\n\n`); setComposing(true); } else onAction(item, 'message'); }}
                  style={{ width: '100%', padding: `${space[3]}px`, background: 'transparent', border: `1px solid ${P.borderDef}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, color: sentNote ? P.green : P.textSecondary, fontFamily: FF }}>
                  {sentNote ? '✓ Logged to client thread' : '✉ Message about this'}
                </button>
              ) : (
                <div>
                  <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', borderRadius: radius.sm, border: `1px solid ${P.borderSubtle}`, background: P.base, padding: space[3], fontSize: type.size.caption, color: P.textPrimary, fontFamily: FF, resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => { const b = draft.trim(); if (b && onSendMessage) { onSendMessage(item, b); setComposing(false); setDraft(''); setSentNote(true); } }} disabled={!draft.trim()}
                      style={{ flex: 1, padding: `${space[3]}px`, borderRadius: radius.sm, border: 'none', background: draft.trim() ? P.green : P.borderDef, color: '#fff', cursor: draft.trim() ? 'pointer' : 'default', fontSize: type.size.sm, fontWeight: type.weight.semibold, fontFamily: FF }}>Send &amp; log</button>
                    <button onClick={() => { setComposing(false); setDraft(''); }}
                      style={{ padding: `${space[3]}px ${space[4]}px`, borderRadius: radius.sm, background: 'transparent', border: `1px solid ${P.borderDef}`, color: P.textSecondary, cursor: 'pointer', fontSize: type.size.sm, fontWeight: type.weight.semibold, fontFamily: FF }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
  onExtendDecision,    // (taskId) => pushes the deadline a week (snooze)
  onReassignDecision,  // (taskId, owner) => changes the owner
  onMessage,            // (item) => legacy fallback route to Communication
  onSendMessage,        // (item, body) => compose-in-place: logs to client thread
  onActApproval,        // (messageId, action: 'approve' | 'reject' | 'revision')
  onSaveNote,           // (itemId, note) => persists the internal note
}) {
  const items = useMemo(() => buildItems(event), [event]);
  // Reassign dropdown options (board 2026-06-12): a real owner list — the
  // owners already in play + the standard you/client/both, plus any team.
  const reassignOptions = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.owner) set.add(i.owner); });
    ['You', 'Client', 'Both'].forEach(o => set.add(o));
    (event.team || []).forEach(m => { if (m?.name) set.add(m.name); });
    if (event.client?.name) set.add(event.client.name);
    return [...set];
  }, [items, event.team, event.client]);
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
    // Message about this item — route to Communication (works for any item type).
    if (action === 'message') { onMessage && onMessage(item); return; }
    // DECISION items are real timeline tasks — act on them in place: extend the
    // deadline, reassign the owner, or close (mark done). No hunting elsewhere.
    if (item.type === 'DECISION') {
      if (action === 'extend') { onExtendDecision && onExtendDecision(item.id); return; }
      if (action === 'reassign') {
        const owner = (typeof window !== 'undefined' && window.prompt)
          ? window.prompt('Reassign this decision to whom?', item.owner || '') : null;
        if (owner && owner.trim()) onReassignDecision && onReassignDecision(item.id, owner.trim());
        return;
      }
      // 'close' / 'approve' → resolve (mark the underlying task done)
      setActionLog(prev => ({ ...prev, [item.id]: 'approve' }));
      setSelected(s => s?.id === item.id ? { ...s, status: 'APPROVED' } : s);
      if (onResolveDecision) onResolveDecision(item.id);
      return;
    }
    // APPROVAL items
    setActionLog(prev => ({ ...prev, [item.id]: action }));
    const next = action === 'approve' ? 'APPROVED'
      : action === 'reject' ? 'REJECTED'
      : 'AWAITING';
    setSelected(s => s?.id === item.id ? { ...s, status: next } : s);
    if (onActApproval) onActApproval(item.id, action);
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
          fontSize: type.size.sm, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px',
        }}
      >
        ← Overview
      </button>
      <span style={{
        fontSize: type.size['2xs'], fontWeight: type.weight.semibold,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: P.textTertiary, fontFamily: FF,
      }}>
        Decisions
      </span>
    </div>
  );

  if (isMobile) {
    return (
      // Mobile: flow with the page (host tab area scrolls) so a routed decision
      // can scroll into view and the list isn't trapped in a collapsed region.
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {workspaceHeader}
        <div style={{ padding: `${space[4]}px ${space[4]}px` }}>
        <div style={{
          fontSize: type.size['2xs'], fontWeight: type.weight.medium, letterSpacing: '0.10em',
          color: P.textTertiary, fontFamily: FF, marginBottom: space[4],
        }}>
          DECISIONS + APPROVALS · {items.length} ITEMS
        </div>
        {displayItems.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF, paddingTop: space[9] }}>
            No decisions or approvals
          </div>
        ) : displayItems.map(item => (
          <MobileItemCard key={item.id} item={item} onAction={handleAction} isTarget={selected?.id === item.id}
            onSendMessage={onSendMessage}
            onReassign={(it, owner) => { if (owner && owner.trim() && onReassignDecision) onReassignDecision(it.id, owner.trim()); }}
            reassignOptions={reassignOptions} />
        ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Desktop: shared LegacyTabHeader band (App.js) carries ← Overview +
          DECISIONS, so the in-workspace breadcrumb is removed to avoid a double header. */}
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
          note={(event.decisionNotes || {})[selected.id] || ''}
          onSaveNote={onSaveNote}
          onSendMessage={onSendMessage}
          onReassign={(it, owner) => { if (owner && owner.trim() && onReassignDecision) onReassignDecision(it.id, owner.trim()); }}
          reassignOptions={reassignOptions}
        />
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: type.size.caption, color: P.textTertiary, fontFamily: FF,
        }}>
          {items.length > 0 ? 'Select an item to view details' : 'No decisions or approvals yet'}
        </div>
      )}
      </div>
    </div>
  );
}
