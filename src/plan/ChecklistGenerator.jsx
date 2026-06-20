// demo/src/plan/ChecklistGenerator.jsx
// Sprint 46 · Page 91 · E — Checklist Generator
// PLAN Layer · Tier 0 · Track A
// Design: Figma CYlmJqDCXEaacCuz9wW3bd page 551:2
// Status via color + text only. No emoji. No icons.

import { useState, useEffect, useMemo } from 'react';
import { color, space, type, radius } from '../design/tokens';
// Sprint 57f.2: ChecklistGenerator honors compression urgency. Each row maps
// 1:1 to a timeline item so live re-classification is safe. We show the
// urgency chip alongside OVERDUE and suppress the duplicate when do_now
// matches the overdue signal — same calm pattern as Planning Tasks.
import {
  classifyTemplateTaskUrgency,
  deriveEventCompressionSummary,
} from '../lib/workflowCompression';

const P = {
  canvas: color.surface.canvas, base: color.surface.base, card: color.surface.card,
  borderSubtle: color.border.subtle, borderDef: color.border.default,
  textPrimary: '#eef0f4', textSecondary: color.text.secondary, textTertiary: color.text.tertiary,
  green: color.status.confirmed, amber: color.status.warning, red: color.status.risk,
};
const FF = type.family;
const sp = space;
const r  = radius;

const PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out':  -182, '5 Months Out':  -152, '4 Months Out': -121,
  '3 Months Out':   -91, '2 Months Out':   -61, '1 Month Out':   -30,
  '2 Weeks Out':    -14, 'Week Of': -7,
};

function isOverdue(task, eventDate) {
  if (!eventDate || !(task.week in PHASE_OFFSET)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() + PHASE_OFFSET[task.week]);
  return today > due;
}

function progressColor(ratio) {
  if (ratio >= 0.8) return P.green;
  if (ratio >= 0.4) return P.amber;
  return P.red;
}

const VENDOR_NAMES = new Set([
  'Photographer','Videographer','Caterer','Florist','DJ','Band',
  'Baker','Officiant','Transport','Hair','Makeup','Vendor',
]);
const isVendorTask   = t => t.category === 'vendor' || VENDOR_NAMES.has(t.owner);
const isEventDayTask = t => t.week === 'Week Of' || t.category === 'event-day';
const isVenueTask    = t => t.category === 'venue' || /venue|hall|ballroom|location|site/i.test(t.task || '');
const isClientTask   = t => t.owner === 'Client' || t.owner === 'Both';

function buildCategoryBuckets(tasks) {
  const b = { Planning: [], Vendor: [], Venue: [], Client: [], 'Event Day': [] };
  tasks.forEach(t => {
    if (isEventDayTask(t)) { b['Event Day'].push(t); return; }
    if (isVendorTask(t))   { b.Vendor.push(t);       return; }
    if (isVenueTask(t))    { b.Venue.push(t);         return; }
    if (isClientTask(t))   { b.Client.push(t);        return; }
    b.Planning.push(t);
  });
  return b;
}

function buildTabBuckets(tasks) {
  const vendor = [], eventDay = [], planning = [];
  tasks.forEach(t => {
    if (isEventDayTask(t)) { eventDay.push(t); return; }
    if (isVendorTask(t))   { vendor.push(t);   return; }
    planning.push(t);
  });
  return { PLANNING: planning, VENDOR: vendor, 'EVENT DAY': eventDay };
}

function getOwners(tasks) {
  const seen = new Set(), owners = [];
  tasks.forEach(t => { if (t.owner && !seen.has(t.owner)) { seen.add(t.owner); owners.push(t.owner); } });
  return owners;
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ label, tasks }) {
  const total = tasks.length, done = tasks.filter(t => t.done).length;
  const ratio = total > 0 ? done / total : 0;
  return (
    <div style={{ marginBottom: sp[4] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: sp[2] }}>
        <span style={{ fontFamily: FF, fontSize: 11, fontWeight: type.weight.medium, color: P.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: FF, fontSize: 11, color: P.textTertiary }}>{done}/{total}</span>
      </div>
      <div style={{ height: 4, background: P.borderSubtle, borderRadius: r.full, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(ratio * 100)}%`, background: progressColor(ratio), borderRadius: r.full, transition: 'width 300ms cubic-bezier(0.2,0,0,1)' }} />
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: r.md, padding: `${sp[4]}px ${sp[5]}px`, display: 'flex', flexDirection: 'column', gap: sp[1] }}>
      <span style={{ fontFamily: FF, fontSize: 22, fontWeight: type.weight.semibold, color: valueColor || P.textPrimary, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontFamily: FF, fontSize: 11, fontWeight: type.weight.medium, color: P.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  );
}

// ── CheckRow ──────────────────────────────────────────────────────────────────
function CheckRow({ task, eventDate, onToggle, onOpen, urgency }) {
  const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
  const overdue = !task.done && isOverdue(task, eventDate);
  // Sprint 57f.2: when any compression urgency chip is showing, suppress
  // the OVERDUE pill. The two carry overlapping meaning ("long-lead window
  // passed" vs "task date past") and rendering both on one row pushes the
  // task title into truncation, especially on mobile. Urgency chip wins —
  // it carries the friendlier action verb.
  const showOverduePill = overdue && !urgency;
  const uTone = urgency
    ? (urgency.tone === 'danger' ? P.red : urgency.tone === 'warn' ? P.amber : P.textSecondary)
    : null;
  return (
    <div data-deeplink={task.id} style={{ display: 'flex', alignItems: 'center', gap: sp[4], padding: `${sp[3]}px ${sp[5]}px`, borderBottom: `1px solid ${P.borderSubtle}` }}>
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
        style={{ flexShrink: 0, width: 18, height: 18, borderRadius: r.full, border: task.done ? 'none' : `2px solid ${P.borderDef}`, background: task.done ? P.green : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, outline: 'none' }}
      >
        {task.done && <div style={{ width: 6, height: 6, borderRadius: r.full, background: '#fff' }} />}
      </button>

      <button type="button" onClick={() => onOpen && onOpen(task)} disabled={!onOpen}
        style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: onOpen ? 'pointer' : 'default', fontFamily: FF, fontSize: 13, lineHeight: 1.4, color: task.done ? P.textTertiary : P.textPrimary, textDecoration: task.done ? 'line-through' : 'none' }}>
        {task.task}
        {subs.length > 0 && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: subs.filter(x => x.done).length === subs.length ? P.green : P.steelBlue || P.textSecondary, whiteSpace: 'nowrap' }}>✓ {subs.filter(x => x.done).length}/{subs.length}</span>}
        {onOpen && <span aria-hidden style={{ marginLeft: 6, fontSize: 11, color: P.textTertiary }}>›</span>}
      </button>

      {task.owner && (
        <span style={{ flexShrink: 0, fontFamily: FF, fontSize: 10, fontWeight: type.weight.medium, color: P.textTertiary, background: P.borderSubtle, borderRadius: r.sm, padding: `${sp[1]}px ${sp[3]}px`, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {task.owner}
        </span>
      )}

      {task.week && (
        <span style={{ flexShrink: 0, fontFamily: FF, fontSize: 11, color: P.textTertiary, whiteSpace: 'nowrap' }}>
          {task.week}
        </span>
      )}

      {urgency && !task.done && (
        <span title={urgency.explanation}
          style={{ flexShrink: 0, fontFamily: FF, fontSize: 10, fontWeight: type.weight.semibold,
            color: uTone, background: uTone + '18', border: `1px solid ${uTone}55`,
            borderRadius: r.sm, padding: `${sp[1]}px ${sp[3]}px`,
            letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {urgency.short}
        </span>
      )}

      {showOverduePill && (
        <span style={{ flexShrink: 0, fontFamily: FF, fontSize: 10, fontWeight: type.weight.semibold, color: P.red, background: '#1a0608', border: `1px solid ${P.red}`, borderRadius: r.sm, padding: `${sp[1]}px ${sp[3]}px`, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          OVERDUE
        </span>
      )}
    </div>
  );
}

// ── ChecklistGenerator ────────────────────────────────────────────────────────
export default function ChecklistGenerator({
  event, isMobile,
  // Sprint 49: routing + persistence props for canonical Checklist tab
  openId,
  onBack,
  onToggleTask, // (taskId) => void — if provided, persists to host event state
  onOpenTask,   // #13: (task) => void — open the task's steps in a modal
}) {
  const timeline  = event?.timeline || [];
  const eventDate = event?.date || null;
  // Sprint 57f.2: live urgency derivation for the checklist rows. Skippable
  // is intentionally silent on this surface to keep scanning quiet — we
  // surface only do_now / risk_lost (the meaningful actions).
  const urgencyOf = useMemo(() => {
    if (!event?.type || !event?.date) return () => null;
    const today = new Date(); today.setHours(0,0,0,0);
    const tgt = new Date(event.date + 'T00:00:00');
    const days = Math.round((tgt - today) / 86400000);
    return (task) => {
      const u = classifyTemplateTaskUrgency(task, days, event.type, PHASE_OFFSET);
      if (!u || u.urgency === 'standard' || u.urgency === 'skippable') return null;
      return u;
    };
  }, [event?.type, event?.date]);
  const compressionSummary = useMemo(() => {
    if (!event) return null;
    return deriveEventCompressionSummary(
      event,
      (d) => {
        if (!d) return null;
        const today = new Date(); today.setHours(0,0,0,0);
        const tgt = new Date(d + 'T00:00:00');
        return Math.round((tgt - today) / 86400000);
      },
      PHASE_OFFSET,
    );
  }, [event]);

  // Sprint 49: if onToggleTask is provided, the source of truth is the
  // host's event.timeline. Otherwise (standalone preview), fall back to
  // local state. The doneMap is rebuilt from timeline each render so any
  // host-side mutation flows through automatically.
  const doneMap = useMemo(() => {
    const m = {};
    timeline.forEach(t => { m[t.id] = !!t.done; });
    return m;
  }, [timeline]);
  const [localOverride, setLocalOverride] = useState({});

  const [activeTab,   setActiveTab]   = useState('PLANNING');
  const [ownerFilter, setOwnerFilter] = useState(null);

  const tasks = timeline.map(t => ({
    ...t,
    done: localOverride[t.id] != null ? localOverride[t.id] : (doneMap[t.id] ?? !!t.done),
  }));
  const doneCount = tasks.filter(t => t.done).length;
  const remaining = tasks.filter(t => !t.done).length;
  const overdue   = tasks.filter(t => !t.done && isOverdue(t, eventDate)).length;
  const total     = tasks.length;

  const catBuckets = buildCategoryBuckets(tasks);
  const tabBuckets = buildTabBuckets(tasks);
  const owners     = getOwners(tasks);
  const TABS       = ['PLANNING', 'VENDOR', 'EVENT DAY'];

  let tabTasks = tabBuckets[activeTab] || [];
  if (ownerFilter) tabTasks = tabTasks.filter(t => t.owner === ownerFilter);

  const handleToggle = id => {
    if (onToggleTask) {
      // Sprint 49: persist through host
      onToggleTask(id);
    } else {
      // Standalone: local-only override
      setLocalOverride(prev => ({ ...prev, [id]: !(prev[id] != null ? prev[id] : !!timeline.find(t => t.id === id)?.done) }));
    }
  };

  const OwnerBtn = ({ owner }) => {
    const active = ownerFilter === owner;
    return (
      <button
        onClick={() => setOwnerFilter(active ? null : owner)}
        style={{ display: 'block', width: '100%', textAlign: 'left', padding: `${sp[2]}px ${sp[3]}px`, borderRadius: r.sm, background: active ? 'rgba(110,135,148,0.18)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 12, color: active ? P.textPrimary : P.textSecondary, marginBottom: sp[1], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >{owner}</button>
    );
  };

  // Sprint 49: workspace header with one-click return to Command Center
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
          borderRadius: r.sm, cursor: 'pointer',
          fontSize: 11, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px',
        }}
      >
        ← Overview
      </button>
      <span style={{
        fontSize: 9, fontWeight: type.weight.semibold,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: P.textTertiary, fontFamily: FF,
      }}>
        Checklist
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {workspaceHeader}
    <div style={{ display: 'flex', flex: 1, background: P.canvas, fontFamily: FF, overflow: 'hidden' }}>

      {/* Left sidebar — desktop only */}
      {!isMobile && (
        <div style={{ width: 200, flexShrink: 0, background: P.base, borderRight: `1px solid ${P.borderSubtle}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: `${sp[5]}px ${sp[5]}px ${sp[3]}px`, borderBottom: `1px solid ${P.borderSubtle}` }}>
            <span style={{ fontFamily: FF, fontSize: 11, fontWeight: type.weight.semibold, color: P.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</span>
          </div>
          <div style={{ padding: `${sp[5]}px ${sp[5]}px 0` }}>
            {['Planning','Vendor','Venue','Client','Event Day'].map(cat => (
              <ProgressBar key={cat} label={cat} tasks={catBuckets[cat] || []} />
            ))}
          </div>
          {owners.length > 0 && (
            <>
              <div style={{ padding: `${sp[5]}px ${sp[5]}px ${sp[3]}px`, borderTop: `1px solid ${P.borderSubtle}`, marginTop: sp[4] }}>
                <span style={{ fontFamily: FF, fontSize: 11, fontWeight: type.weight.semibold, color: P.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter by Owner</span>
              </div>
              <div style={{ padding: `0 ${sp[4]}px ${sp[5]}px` }}>
                <button onClick={() => setOwnerFilter(null)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: `${sp[2]}px ${sp[3]}px`, borderRadius: r.sm, background: !ownerFilter ? 'rgba(110,135,148,0.18)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 12, fontWeight: type.weight.medium, color: !ownerFilter ? P.textPrimary : P.textSecondary, marginBottom: sp[1] }}>All</button>
                {owners.map(o => <OwnerBtn key={o} owner={o} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Stats row */}
        <div style={{ flexShrink: 0, display: 'flex', gap: sp[4], padding: `${sp[5]}px ${sp[6]}px`, borderBottom: `1px solid ${P.borderSubtle}` }}>
          <StatCard label="Done"          value={doneCount} valueColor={P.green} />
          <StatCard label="Remaining"     value={remaining} />
          <StatCard label="Overdue"       value={overdue}   valueColor={overdue > 0 ? P.red : P.textTertiary} />
          <StatCard label="From Template" value={total}     valueColor={P.textSecondary} />
        </div>

        {/* Sprint 57f.2: section-level compression notice. Shows ONLY when
            the event is significantly compressed. Keeps the planner oriented
            without spamming each row with chips — the row-level chips fire
            via urgencyOf only for do_now / risk_lost. */}
        {compressionSummary && compressionSummary.significant && (() => {
          const tone =
              compressionSummary.level === 'rush'       ? P.red
            : compressionSummary.level === 'compressed' ? P.amber
            :                                             P.green;
          return (
            <div style={{
              flexShrink: 0,
              padding: `${sp[3]}px ${sp[6]}px`,
              borderBottom: `1px solid ${P.borderSubtle}`,
              background: tone + '0a',
              display: 'flex', alignItems: 'center', gap: sp[3], flexWrap: 'wrap',
              fontFamily: FF,
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: type.weight.semibold,
                color: tone, background: tone + '20',
                border: `1px solid ${tone}55`, borderRadius: r.full,
                padding: '2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                ⏱ {compressionSummary.meta.label}
              </span>
              <span style={{ fontSize: 11.5, color: P.textSecondary, flex: 1, minWidth: 200 }}>
                {compressionSummary.headline || 'Tight timeline — some tasks moved to the front.'}
              </span>
            </div>
          );
        })()}

        {/* Tabs */}
        <div style={{ flexShrink: 0, display: 'flex', borderBottom: `1px solid ${P.borderSubtle}`, background: P.base }}>
          {TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: `${sp[4]}px ${sp[6]}px`, background: 'transparent', border: 'none', borderBottom: active ? `2px solid ${P.textPrimary}` : '2px solid transparent', cursor: 'pointer', fontFamily: FF, fontSize: 11, fontWeight: type.weight.semibold, color: active ? P.textPrimary : P.textTertiary, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: sp[2] }}>
                {tab}
                <span style={{ fontSize: 10, color: active ? P.textSecondary : P.textTertiary, fontWeight: type.weight.regular }}>{(tabBuckets[tab] || []).length}</span>
              </button>
            );
          })}
        </div>

        {/* Checklist */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tabTasks.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: sp[10], fontFamily: FF, fontSize: 13, color: P.textTertiary }}>{ownerFilter ? `No tasks for ${ownerFilter}` : 'No tasks in this category'}</div>
            : tabTasks.map(t => <CheckRow key={t.id} task={t} eventDate={eventDate} onToggle={handleToggle} onOpen={onOpenTask} urgency={urgencyOf(t)} />)
          }
        </div>

        {/* Mobile owner filter strip */}
        {isMobile && owners.length > 0 && (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${P.borderSubtle}`, padding: `${sp[3]}px ${sp[5]}px`, display: 'flex', gap: sp[3], overflowX: 'auto', background: P.base }}>
            {[null, ...owners].map(o => (
              <button key={o ?? '__all'} onClick={() => setOwnerFilter(o === ownerFilter ? null : o)} style={{ flexShrink: 0, padding: `${sp[2]}px ${sp[4]}px`, borderRadius: r.full, background: ownerFilter === o ? P.borderDef : 'transparent', border: `1px solid ${P.borderSubtle}`, cursor: 'pointer', fontFamily: FF, fontSize: 11, color: ownerFilter === o ? P.textPrimary : P.textSecondary, whiteSpace: 'nowrap' }}>
                {o ?? 'All'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
