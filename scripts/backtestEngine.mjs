// Backtest harness for the Event Intelligence engine (both families).
// Scores hits / misses / FALSE-ALARMS (false-alarms = the trust-killer → drive to zero).
// Run from demo/:  node scripts/backtestEngine.js
//
// >>> DROP REAL ANONYMIZED TIMELINES HERE <<<  — each case is:
//   { family:'wedding'|'corporate', name, D:'YYYY-MM-DD', asOf:'YYYY-MM-DD',
//     slipped:[milestoneIds left undone], expect:{ atRisk:bool, binding?:milestoneId } }
// The harness assumes every milestone whose deadline is before `asOf` was done ON SCHEDULE,
// EXCEPT the `slipped` ids — which is how a real "what actually went wrong" record maps in.
import { GRAPHS, solve } from '../src/lib/eventSolve.mjs';
const date = s => new Date(s + 'T00:00:00Z');

function doneOnSchedule(graph, D, asOf, slipped) {
  solve(graph, D, new Set(), asOf);            // populates _lateComplete on nodes
  return graph.filter(m => m._lateComplete < asOf && m.id !== 'event' && !slipped.includes(m.id)).map(m => m.id);
}

const CASES = [
  // ---- WEDDING ----
  { family:'wedding', name:'W1 on-track (no false alarm)',        D:'2025-06-14', asOf:'2025-04-15', slipped:[], expect:{atRisk:false} },
  { family:'wedding', name:'W2 florals slipped',                  D:'2025-06-14', asOf:'2025-05-25', slipped:['floral_signoff'], expect:{atRisk:true, binding:'floral_signoff'} },
  { family:'wedding', name:'W3 guest list stalled',               D:'2025-09-01', asOf:'2025-06-01', slipped:['guestlist_final','invitations_sent','rsvp_close'], expect:{atRisk:true, binding:'guestlist_final'} },
  { family:'wedding', name:'W4 photographer fell through (→source)', D:'2025-08-01', asOf:'2025-06-22', slipped:['photographer'], expect:{atRisk:true, binding:'photographer'} },
  { family:'wedding', name:'W5 attire ordered too late',          D:'2025-07-05', asOf:'2025-06-10', slipped:['attire_order','attire_fitting'], expect:{atRisk:true, binding:'attire_order'} },
  // ---- CORPORATE ----
  { family:'corporate', name:'C1 on-track (no false alarm)',      D:'2025-10-01', asOf:'2025-06-15', slipped:[], expect:{atRisk:false} },
  { family:'corporate', name:'C2 speaker content slipped',        D:'2025-08-15', asOf:'2025-07-25', slipped:['speaker_content'], expect:{atRisk:true, binding:'speaker_content'} },
  { family:'corporate', name:'C3 budget approval stalled',        D:'2025-12-01', asOf:'2025-07-15', slipped:['budget_approval','venue_date','speakers_confirm','av_production','agenda_ros_v1','catering','registration_live','invites_open_reg','swag'], expect:{atRisk:true, binding:'budget_approval'} },
];

let hits = 0, misses = 0, falseAlarms = 0, bindMiss = 0;
const riskCases = CASES.filter(c => c.expect.atRisk).length;
for (const c of CASES) {
  const g = GRAPHS[c.family];
  const D = date(c.D), asOf = date(c.asOf);
  const completed = doneOnSchedule(g, D, asOf, c.slipped);
  const r = solve(g, D, new Set(completed), asOf);
  const bId = r.binding ? r.binding.id : null;
  const okRisk = r.dateAtRisk === c.expect.atRisk;
  const okBind = c.expect.binding ? bId === c.expect.binding : true;
  if (c.expect.atRisk && r.dateAtRisk && okBind) hits++;
  if (c.expect.atRisk && r.dateAtRisk && !okBind) bindMiss++;
  if (!c.expect.atRisk && r.dateAtRisk) falseAlarms++;
  if (c.expect.atRisk && !r.dateAtRisk) misses++;
  console.log(`${okRisk && okBind ? '✓' : '✗'} ${c.name}`);
  console.log(`    at-risk ${r.dateAtRisk} (exp ${c.expect.atRisk})` + (c.expect.binding ? ` · binding ${bId} (exp ${c.expect.binding})` : '') + ` · ${r.flag}`);
}
console.log(`\nSUMMARY  hits ${hits}/${riskCases}  ·  binding-misses ${bindMiss}  ·  misses ${misses}  ·  FALSE-ALARMS ${falseAlarms}`);
console.log('Target on real data: false-alarms = 0 (one bad "you\'re late" and the planner never trusts it again).');
