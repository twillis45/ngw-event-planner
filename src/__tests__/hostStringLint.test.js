// ─── HOST-STRING LINT — no engine string may leak machinery ──────────────────
// The second Layer-1 proof of the 2026-07-22 process ask. The live drives kept
// finding the same classes by eye: a raw internal id in a CTA ("Open vendors →
// vendor tdv-v2", W5), a label truncated THROUGH its parenthetical ("(game
// night skews ligh…", W1), interpolation leaks. This lints every host-facing
// string the engines emit, across every playbook type at three temporal states,
// so the next leak fails CI instead of reaching a hero.
//
// Scope: ENGINE strings only (titles, consequences, details, labels, CTAs).
// Shell-side display transforms live in hostv2 (outside CRA jest's module
// scope) — the point is that a string clean at the source can't be dirtied by
// a transform that only shortens or maps it.
import { eventPlan } from '../CommandCenter';
import {
  ALL_PLAYBOOKS, playbookTypicalGuests, playbookDecisionBoard,
  playbookTasks, playbookChecklist,
} from '../lib/playbooks';
import { computeDayAlerts } from '../lib/dayAlerts';
import { buildDayBeforePlan } from '../lib/dayBefore';

// The lint. Each rule names the live incident class it guards.
const RULES = [
  // W5 class: internal record ids (event/vendor/task/purchase prefixes) are
  // machinery, never copy. Matches the id shapes the fixtures + engines mint.
  { name: 'internal-id', re: /\b(?:ev|tdv|trr|pbt?|lint)-[a-z0-9][a-z0-9-]*\b/i },
  // Interpolation leaks — a template that met an undefined value.
  { name: 'undefined-leak', re: /\b(?:undefined|NaN)\b|\[object Object\]|\bnull\b(?!ify)/ },
  // W1 class: an unbalanced parenthesis = a label truncated through its
  // guide-voice parenthetical (checked structurally below, not by regex).
  { name: 'unbalanced-paren', fn: (s) => {
    let depth = 0;
    for (const c of s) { if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1); }
    return depth !== 0;
  } },
];

const violations = (s) => RULES
  .filter(r => (r.re ? r.re.test(s) : r.fn(s)))
  .map(r => r.name);

const mkEvent = (pb, plusDays) => {
  const d = new Date(); d.setDate(d.getDate() + plusDays); d.setHours(12);
  const typical = playbookTypicalGuests(pb.type) || 16;
  const ev = {
    id: 'lint-' + pb.type.toLowerCase().replace(/[^a-z]+/g, '-'),
    type: pb.type, name: 'Lint ' + pb.type,
    date: d.toISOString().slice(0, 10),
    venue: 'Backyard', venueKind: 'home',
    guestMode: 'count', guestCount: typical, guestEstimate: typical,
    budget: [], vendors: [], timeline: [],
    guests: [
      { id: 'lint-g1', name: 'Denise & Ray', rsvp: 'Yes' },
      { id: 'lint-g2', name: 'Marcus', rsvp: 'Maybe' },
    ],
  };
  try {
    ev.timeline = (playbookChecklist(ev) || []).map((r, i) => ({
      id: r.id, week: r.week || '', leadDays: r.leadDays != null ? r.leadDays : null,
      task: r.task || '', done: i % 2 === 0, owner: '', category: r.category || '',
    }));
  } catch { /* lint runs on whatever the playbook yields */ }
  return ev;
};

// Every host-facing string an engine emits for this event, tagged by source.
const collectStrings = (ev) => {
  const out = [];
  const push = (src, v) => { if (typeof v === 'string' && v.trim()) out.push([src, v]); };
  try {
    const plan = eventPlan(ev);
    (plan.nextActions || []).forEach(a => { push('eventPlan.title', a.title); push('eventPlan.consequence', a.consequence); push('eventPlan.cta', a.cta || a.primaryCta); });
    (plan.worries || []).forEach(w => { push('eventPlan.worry', w.title); push('eventPlan.worry', w.detail); });
  } catch { /* a crash here belongs to other suites */ }
  try {
    (computeDayAlerts(ev) || []).forEach(a => { push('dayAlerts.headline', a.headline); push('dayAlerts.move', a.move); });
  } catch { /* ignore */ }
  try {
    const db = buildDayBeforePlan(ev);
    if (db && db.applicable) {
      push('dayBefore.headline', db.headline);
      (db.sections || []).forEach(s => { push('dayBefore.label', s.label); push('dayBefore.detail', s.detail); push('dayBefore.cta', s.cta); });
    }
  } catch { /* ignore */ }
  try {
    const board = playbookDecisionBoard(ev);
    [...(board.open || []), ...(board.locked || [])].forEach(r => { push('decisionBoard.label', r.label); push('decisionBoard.because', r.because); });
  } catch { /* ignore */ }
  try {
    (playbookTasks(ev) || []).forEach(t => { push('tasks.title', t.title); push('tasks.consequence', t.consequence); });
  } catch { /* ignore */ }
  return out;
};

// CANARY — a green gate must be shown to catch a planted defect (prove-the-plan).
// Each row is a real incident string from the 2026-07-22 live drive.
describe('the lint itself catches the incident classes', () => {
  const PLANTED = [
    ['Open vendors → vendor tdv-v2', 'internal-id'],
    ['What is the drink spread? (game night skews ligh…', 'unbalanced-paren'],
    ['Buy undefined — 18 lbs today', 'undefined-leak'],
    ['Sized for NaN guests', 'undefined-leak'],
  ];
  PLANTED.forEach(([s, expected]) => {
    test(`flags "${s.slice(0, 40)}…" as ${expected}`, () => {
      expect(violations(s)).toContain(expected);
    });
  });
  test('a clean sentence passes', () => {
    expect(violations('Confirm final guest count — 2 still haven’t said.')).toEqual([]);
  });
});

const STATES = [['far-out', 30], ['near', 2], ['day-of', 0]];

for (const pb of ALL_PLAYBOOKS) {
  if (!pb || !pb.type) continue;
  describe(`host strings — ${pb.type}`, () => {
    for (const [label, plus] of STATES) {
      test(`${label} (T-${plus}) emits no machinery`, () => {
        const dirty = [];
        for (const [src, s] of collectStrings(mkEvent(pb, plus))) {
          const v = violations(s);
          if (v.length) dirty.push(`[${v.join(',')}] ${src}: "${s.slice(0, 110)}"`);
        }
        expect(dirty).toEqual([]);
      });
    }
  });
}
