// demo/src/plan/TimelineBuilder.jsx
// Sprint 46 · Page 90 · D — Timeline Builder
// Design ref: Figma CYlmJqDCXEaacCuz9wW3bd page 549:152
// Status via color + text only. No emoji. No icons.

import { useState, useEffect, useMemo } from 'react';
import { color, space, type, radius } from '../design/tokens';
// Sprint 57f.2: TimelineBuilder respects compression urgency. We do a live
// re-classification per task (via task.week + event.date + event.type) so
// the visual phase grid reflects what the planner saw at intake — without
// turning the grid into a wall of chips. Only do_now and risk_lost surface
// here; standard/skippable stay clean.
import {
  classifyTemplateTaskUrgency,
  deriveEventCompressionSummary,
} from '../lib/workflowCompression';

const P = {
  canvas:      color.surface.canvas,
  base:        color.surface.base,
  card:        color.surface.card,
  elevated:    color.surface.elevated,
  borderS:     color.border.subtle,
  borderD:     color.border.default,
  text:        '#eef0f4',
  textSec:     color.text.secondary,
  textTer:     color.text.tertiary,
  green:       color.status.confirmed,
  greenBg:     color.status.confirmedBg || '#0d2818',
  amber:       color.status.warning,
  amberBg:     color.status.warningBg  || '#1a1004',
  red:         color.status.risk,
  redBg:       color.status.riskBg    || '#1a0608',
};
const FF = type.family;
const T  = type;

const PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out':  -182, '5 Months Out':  -152, '4 Months Out': -121,
  '3 Months Out':   -91, '2 Months Out':   -61, '1 Month Out':  -30,
  '2 Weeks Out':    -14, 'Week Of':          -7,
};
const PHASES = [
  '12 Months Out','10 Months Out','8 Months Out','6 Months Out',
  '5 Months Out','4 Months Out','3 Months Out','2 Months Out',
  '1 Month Out','2 Weeks Out','Week Of',
];

// ── Status helpers ────────────────────────────────────────────────────────────
function phaseIsPast(phase, eventDate) {
  if (!eventDate || !(phase in PHASE_OFFSET)) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() + PHASE_OFFSET[phase]);
  return due < today;
}
function taskStatus(t, eventDate) {
  if (t.done) return { label: 'DONE', bg: P.greenBg, fg: P.green };
  if (phaseIsPast(t.week, eventDate)) return { label: 'DUE UPCOMING', bg: P.amberBg, fg: P.amber };
  return { label: 'PENDING', bg: P.elevated, fg: P.textSec };
}
function vendorStatus(v) {
  return (v.status||'').toLowerCase() === 'confirmed'
    ? { label: 'CONFIRMED',   bg: P.greenBg, fg: P.green }
    : { label: 'UNCONFIRMED', bg: P.redBg,   fg: P.red   };
}
function vendorBarColor(item) {
  if (!item._vendor) return P.amber;
  return (item._vendorData?.status||'').toLowerCase() === 'confirmed' ? P.green : P.red;
}

// ── Lane builder ──────────────────────────────────────────────────────────────
function buildLanes({ timeline = [], vendors = [] }) {
  const milestones = timeline.filter(t => {
    const c = (t.category||'').toLowerCase();
    return !c.includes('vendor') && !c.includes('buffer') && !t.task?.toLowerCase().includes('buffer');
  });
  const vendorItems = [
    ...vendors.map(v => ({ id: v.name||v.vendor_name, task: v.vendor_name||v.name,
      week: 'Week Of', owner: v.name, category: 'vendor', _vendor: true, _vendorData: v })),
    ...timeline.filter(t => (t.category||'').toLowerCase().includes('vendor')),
  ];
  const buffers = timeline.filter(t => {
    const c = (t.category||'').toLowerCase();
    return c.includes('buffer') || t.task?.toLowerCase().includes('buffer');
  });
  return { milestones, vendorItems, buffers };
}

// ── Shared atoms ──────────────────────────────────────────────────────────────
function Pill({ label, bg, fg }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:radius.full,
    background:bg, color:fg, fontSize:T.size.xs, fontWeight:T.weight.semibold,
    letterSpacing:T.tracking.label, lineHeight:1.6 }}>{label}</span>;
}

function LaneLabel({ label, count }) {
  return (
    <div style={{ padding:`${space[3]}px ${space[2]}px`, borderBottom:`1px solid ${P.borderS}`, marginBottom:space[2] }}>
      <span style={{ color:P.textTer, fontSize:T.size.xs, fontWeight:T.weight.semibold, fontFamily:FF, letterSpacing:T.tracking.label }}>{label}</span>
      <span style={{ color:P.textTer, fontSize:T.size.xs, fontFamily:FF, background:P.elevated, borderRadius:radius.full, padding:'1px 7px', marginLeft:space[2] }}>{count}</span>
    </div>
  );
}

function Bar({ item, barColor, dashed, selected, onClick, urgency }) {
  // Sprint 57f.2: when an item has do_now / risk_lost urgency, override the
  // bar tint so a compressed-window task in the "Planning Milestones" lane
  // doesn't quietly read as green. Standard items keep their original lane
  // color — restraint matters; the grid is dense.
  const effectiveColor = urgency
    ? (urgency.tone === 'danger' ? P.red : urgency.tone === 'warn' ? P.amber : barColor)
    : barColor;
  return (
    <div onClick={onClick} title={urgency ? `${urgency.label} — ${urgency.explanation}` : undefined}
      style={{ padding:`4px ${space[2]}px`, borderRadius:radius.sm,
      background: dashed ? 'transparent' : effectiveColor + '22',
      border: dashed ? `1.5px dashed ${effectiveColor}66` : `1px solid ${effectiveColor}44`,
      outline: selected ? `2px solid ${effectiveColor}` : 'none', outlineOffset:1,
      cursor:'pointer', transition:'outline 120ms ease',
      display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ flex:1, minWidth:0, color: item.done ? P.textTer : P.text,
        fontSize:T.size.sm, fontFamily:FF, fontWeight:T.weight.medium,
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        textDecoration: item.done ? 'line-through' : 'none' }}>{item.task}</span>
      {urgency && !item.done && (
        <span style={{
          flexShrink:0, fontSize:8, fontWeight:T.weight.semibold,
          letterSpacing:'0.06em', textTransform:'uppercase',
          color: effectiveColor, background: effectiveColor + '33',
          borderRadius: radius.sm, padding:'1px 4px', lineHeight: 1.4,
        }}>{urgency.short}</span>
      )}
    </div>
  );
}

// ── Phase grid ────────────────────────────────────────────────────────────────
function PhaseGrid({ lanes, eventDate, selectedId, onSelect, urgencyOf }) {
  const col = `repeat(${PHASES.length}, minmax(90px, 1fr))`;

  function renderRows(items, colorFn, dashed) {
    return items.map(item => {
      const u = urgencyOf ? urgencyOf(item) : null;
      return (
        <div key={item.id} style={{ display:'contents' }}>
          {PHASES.map(ph => (
            <div key={ph} style={{ padding:`3px ${space[1]}px`, borderRight:`1px solid ${P.borderS}`, minHeight:30 }}>
              {item.week === ph && <Bar item={item} barColor={colorFn(item)} dashed={dashed}
                selected={selectedId === item.id} onClick={() => onSelect(item)} urgency={u} />}
            </div>
          ))}
        </div>
      );
    });
  }

  return (
    <div style={{ overflowX:'auto', flex:1 }}>
      {/* Headers */}
      <div style={{ display:'grid', gridTemplateColumns:col, borderBottom:`1px solid ${P.borderD}`,
        position:'sticky', top:0, zIndex:2, background:P.base }}>
        {PHASES.map(ph => (
          <div key={ph} style={{ padding:`${space[2]}px ${space[1]}px`, borderRight:`1px solid ${P.borderS}`,
            color:P.textTer, fontSize:T.size.xs, fontFamily:FF, fontWeight:T.weight.semibold,
            letterSpacing:T.tracking.label, whiteSpace:'nowrap' }}>{ph}</div>
        ))}
      </div>

      {/* Milestones */}
      {lanes.milestones.length > 0 && (
        <div style={{ borderBottom:`1px solid ${P.borderS}`, paddingBottom:space[3] }}>
          <LaneLabel label="PLANNING MILESTONES" count={lanes.milestones.length} />
          <div style={{ display:'grid', gridTemplateColumns:col }}>
            {renderRows(lanes.milestones, () => P.green, false)}
          </div>
        </div>
      )}

      {/* Vendors */}
      {lanes.vendorItems.length > 0 && (
        <div style={{ borderBottom:`1px solid ${P.borderS}`, paddingBottom:space[3] }}>
          <LaneLabel label="VENDOR ARRIVALS" count={lanes.vendorItems.length} />
          <div style={{ display:'grid', gridTemplateColumns:col }}>
            {renderRows(lanes.vendorItems, vendorBarColor, false)}
          </div>
        </div>
      )}

      {/* Buffers */}
      {lanes.buffers.length > 0 && (
        <div style={{ paddingBottom:space[3] }}>
          <LaneLabel label="BUFFERS & TRANSITIONS" count={lanes.buffers.length} />
          <div style={{ display:'grid', gridTemplateColumns:col }}>
            {renderRows(lanes.buffers, () => P.textTer, true)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ item, eventDate, onClose }) {
  const s = !item ? null : item._vendor ? vendorStatus(item._vendorData) : taskStatus(item, eventDate);
  return (
    <div style={{ width:230, flexShrink:0, borderLeft:`1px solid ${P.borderS}`,
      padding:`${space[5]}px ${space[4]}px`, display:'flex', flexDirection:'column', gap:space[4] }}>
      {!item ? (
        <span style={{ color:P.textTer, fontSize:T.size.sm, fontFamily:FF, margin:'auto', textAlign:'center' }}>
          Select a task to see details
        </span>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <span style={{ color:P.text, fontSize:T.size.md, fontWeight:T.weight.semibold, fontFamily:FF,
              lineHeight:T.leading.tight, flex:1, marginRight:space[2] }}>{item.task}</span>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
              color:P.textTer, fontSize:T.size.md, padding:0, lineHeight:1 }} aria-label="Close">x</button>
          </div>
          <Pill label={s.label} bg={s.bg} fg={s.fg} />
          {[['OWNER', item.owner], ['PHASE', item.week], ['CATEGORY', item.category], ['NOTES', item.notes]]
            .filter(([,v]) => v)
            .map(([label, val]) => (
              <div key={label}>
                <div style={{ color:P.textTer, fontSize:T.size.xs, fontFamily:FF,
                  fontWeight:T.weight.medium, letterSpacing:T.tracking.label, marginBottom:2 }}>{label}</div>
                <div style={{ color:P.textSec, fontSize:T.size.base, fontFamily:FF,
                  lineHeight:T.leading.relaxed }}>{val}</div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

// ── Mobile list ───────────────────────────────────────────────────────────────
function MobileList({ lanes, eventDate, urgencyOf }) {
  const all = [
    ...lanes.milestones.map(t => ({ ...t, _lane:'M' })),
    ...lanes.vendorItems.map(t => ({ ...t, _lane:'V' })),
    ...lanes.buffers.map(t => ({ ...t, _lane:'B' })),
  ];
  return (
    <div style={{ padding:`${space[4]}px`, display:'flex', flexDirection:'column', gap:space[5] }}>
      {PHASES.filter(ph => all.some(t => t.week === ph)).map(ph => (
        <div key={ph}>
          <div style={{ color:P.textTer, fontSize:T.size.xs, fontWeight:T.weight.semibold,
            fontFamily:FF, letterSpacing:T.tracking.label, marginBottom:space[3],
            paddingBottom:space[2], borderBottom:`1px solid ${P.borderS}` }}>{ph}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:space[2] }}>
            {all.filter(t => t.week === ph).map(item => {
              const s = item._vendor ? vendorStatus(item._vendorData) : taskStatus(item, eventDate);
              const u = urgencyOf && !item._vendor ? urgencyOf(item) : null;
              const uTone = u ? (u.tone === 'danger' ? P.red : u.tone === 'warn' ? P.amber : P.textSec) : null;
              return (
                <div key={item.id} style={{ padding:`${space[3]}px ${space[4]}px`, borderRadius:radius.md,
                  background:P.card, border:`1px solid ${P.borderS}`,
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:space[3] }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color: item.done ? P.textTer : P.text, fontSize:T.size.base,
                      fontFamily:FF, fontWeight:T.weight.medium,
                      textDecoration: item.done ? 'line-through' : 'none', marginBottom:2 }}>{item.task}</div>
                    {item.owner && <div style={{ color:P.textTer, fontSize:T.size.xs, fontFamily:FF }}>{item.owner}</div>}
                  </div>
                  {u && !item.done && (
                    <span title={u.explanation} style={{
                      flexShrink:0, fontSize:9, fontWeight:T.weight.semibold,
                      color: uTone, background: uTone + '20',
                      border:`1px solid ${uTone}55`, borderRadius:radius.sm,
                      padding:'2px 6px', letterSpacing:'0.06em', textTransform:'uppercase',
                      whiteSpace:'nowrap',
                    }}>{u.short}</span>
                  )}
                  <Pill label={s.label} bg={s.bg} fg={s.fg} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── View toggle ───────────────────────────────────────────────────────────────
const VIEW_MODES = ['Phase','Day','Week','Month'];
function ViewToggle({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:space[1], background:P.card, borderRadius:radius.md,
      padding:space[1], border:`1px solid ${P.borderS}` }}>
      {VIEW_MODES.map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding:`4px ${space[4]}px`, borderRadius:radius.sm, border:'none', cursor:'pointer',
          background: active===m ? P.elevated : 'transparent',
          color: active===m ? P.text : P.textTer,
          fontSize:T.size.sm, fontFamily:FF,
          fontWeight: active===m ? T.weight.semibold : T.weight.regular,
          transition:'background 120ms ease, color 120ms ease' }}>{m}</button>
      ))}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function TimelineBuilder({
  event, isMobile,
  // Sprint 49: routing props for canonical Timeline tab promotion
  openId,
  onBack,
  onSelectItem,
  // Sprint 51 Path B: phase focus band (migrated from retired Overview).
  // Shape: { phase, focus, tips: [string, ...] } or null.
  phaseFocus,
}) {
  const [viewMode, setViewMode]     = useState('Phase');
  const eventDate = event?.date || null;
  const lanes     = useMemo(() => buildLanes(event || {}), [event]);
  // Sprint 57f.2: per-task urgency for grid bars + mobile rows. Derived
  // live from event.date + task.week — never trust a stale stored
  // urgency snapshot here (planner may have shifted the date). Returns
  // null for standard/skippable so the chip stays out of the way.
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
  const urgencyOf = useMemo(() => {
    if (!event?.type || !event?.date) return () => null;
    const today = new Date(); today.setHours(0,0,0,0);
    const tgt = new Date(event.date + 'T00:00:00');
    const days = Math.round((tgt - today) / 86400000);
    return (task) => {
      const u = classifyTemplateTaskUrgency(task, days, event.type, PHASE_OFFSET);
      // Skippable is intentionally silent on this surface — restraint.
      if (!u || u.urgency === 'standard' || u.urgency === 'skippable') return null;
      return u;
    };
  }, [event?.type, event?.date]);
  // Honor openId — pre-select the item with that id if it's in the timeline
  const initialSelected = useMemo(() => {
    if (openId) {
      // Search across all lanes for an item with matching id
      for (const lane of lanes) {
        const found = (lane.items || []).find(it => it.id === openId);
        if (found) return found;
      }
    }
    return null;
  }, [openId, lanes]);
  const [selected, setSelected] = useState(initialSelected);
  useEffect(() => {
    if (!openId) return;
    for (const lane of lanes) {
      const found = (lane.items || []).find(it => it.id === openId);
      if (found) { setSelected(found); return; }
    }
  }, [openId, lanes]);
  const onSelect  = item => {
    setSelected(prev => prev?.id === item.id ? null : item);
    if (onSelectItem && item) onSelectItem(item);
  };

  // Sprint 49: workspace header with one-click return to Command Center.
  // Sprint 51 Path B: phase focus band sits beneath the back-button strip when
  // workflow guidance is available. Migrated from the retired Overview tab.
  const workspaceHeader = onBack && (
    <>
      <div style={{
        height: 42, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px',
        background: P.base,
        borderBottom: `1px solid ${P.borderS}`,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: `1px solid ${P.borderS}`,
            borderRadius: radius.sm, cursor: 'pointer',
            fontSize: 11, fontWeight: T.weight.medium,
            color: P.textSec, fontFamily: FF,
            padding: '4px 10px',
          }}
        >
          ← Command Center
        </button>
        <span style={{
          fontSize: 9, fontWeight: T.weight.semibold,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: P.textTer, fontFamily: FF,
        }}>
          Timeline
        </span>
      </div>
      {/* Sprint 57f.2: compression context band. Renders ONLY when the
          event lead time is non-standard AND there's something urgent to
          act on. Keeps the visual phase grid honest — the planner sees
          why specific bars wear red/amber chips. */}
      {compressionSummary && compressionSummary.significant && (() => {
        const tone =
            compressionSummary.level === 'rush'       ? P.red
          : compressionSummary.level === 'compressed' ? P.amber
          :                                             P.green;
        return (
          <div style={{
            flexShrink: 0,
            padding: `${space[3]}px 16px`,
            background: P.base,
            borderBottom: `1px solid ${P.borderS}`,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            fontFamily: FF,
          }}>
            <span style={{
              fontSize: 9.5, fontWeight: T.weight.semibold,
              color: tone, background: tone + '18',
              border: `1px solid ${tone}44`, borderRadius: radius.full,
              padding: '2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              ⏱ {compressionSummary.meta.label}
            </span>
            <span style={{ fontSize: 11.5, color: P.textSec }}>
              {compressionSummary.headline || 'Tight timeline — a few tasks moved to the front.'}
            </span>
          </div>
        );
      })()}
      {phaseFocus && (phaseFocus.focus || (phaseFocus.tips && phaseFocus.tips.length > 0)) && (
        <div style={{
          flexShrink: 0,
          padding: `${space[3]}px 16px`,
          background: P.base,
          borderBottom: `1px solid ${P.borderS}`,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          fontFamily: FF,
        }}>
          <span style={{
            fontSize: 9, fontWeight: T.weight.semibold,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: P.textTer,
          }}>Current Phase</span>
          {phaseFocus.phase && (
            <span style={{ fontSize: 11, fontWeight: T.weight.medium, color: P.text }}>
              {phaseFocus.phase}
            </span>
          )}
          {phaseFocus.focus && (
            <>
              <span style={{ fontSize: 11, color: P.textTer }}>·</span>
              <span style={{ fontSize: 11, color: P.textSec }}>{phaseFocus.focus}</span>
            </>
          )}
          {phaseFocus.tips && phaseFocus.tips[0] && (
            <>
              <span style={{ fontSize: 11, color: P.textTer }}>·</span>
              <span style={{ fontSize: 11, color: P.textSec, fontStyle: 'italic' }}>
                {phaseFocus.tips[0]}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {workspaceHeader}
      <div style={{ background:P.base, borderRadius:radius.lg, border:`1px solid ${P.borderS}`, fontFamily:FF, overflow:'hidden', flex: 1 }}>
        <div style={{ padding:`${space[4]}px`, borderBottom:`1px solid ${P.borderS}`,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:P.text, fontSize:T.size.md, fontWeight:T.weight.semibold, fontFamily:FF }}>Timeline</span>
          <span style={{ color:P.textTer, fontSize:T.size.xs, fontFamily:FF }}>Phase view</span>
        </div>
        <MobileList lanes={lanes} eventDate={eventDate} urgencyOf={urgencyOf} />
      </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {workspaceHeader}
    <div style={{ background:P.base, borderRadius:radius.lg, border:`1px solid ${P.borderS}`,
      fontFamily:FF, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:320, flex: 1 }}>
      {/* Top bar */}
      <div style={{ padding:`${space[3]}px ${space[5]}px`, borderBottom:`1px solid ${P.borderS}`,
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:space[4], flexShrink:0 }}>
        <span style={{ color:P.text, fontSize:T.size.md, fontWeight:T.weight.semibold, fontFamily:FF }}>
          Timeline Builder
        </span>
        <ViewToggle active={viewMode} onChange={setViewMode} />
      </div>

      {/* Body */}
      {viewMode !== 'Phase' ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:`${space[9]}px` }}>
          <div style={{ textAlign:'center', padding:`${space[6]}px ${space[8]}px`,
            background:P.card, borderRadius:radius.lg, border:`1px solid ${P.borderS}` }}>
            <div style={{ color:P.textSec, fontSize:T.size.base, fontFamily:FF,
              fontWeight:T.weight.medium, marginBottom:space[2] }}>Zoom: switch to Phase view</div>
            <button onClick={() => setViewMode('Phase')} style={{ background:'none',
              border:`1px solid ${P.borderD}`, borderRadius:radius.sm, color:P.textTer,
              fontSize:T.size.sm, fontFamily:FF, padding:`${space[2]}px ${space[4]}px`, cursor:'pointer' }}>
              Switch to Phase
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <PhaseGrid lanes={lanes} eventDate={eventDate} selectedId={selected?.id} onSelect={onSelect} urgencyOf={urgencyOf} />
          <DetailPanel item={selected} eventDate={eventDate} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
    </div>
  );
}
