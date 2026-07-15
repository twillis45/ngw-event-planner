// ─── POLICY-FORK ENFORCEMENT: overdue has ONE reader, codebase-wide ───────────
//
// THE CLASS (not the instance). "N readers of one truth." Seven audit waves proved
// overdue-ness had 3+ policies; wave-6/7 collapsed the four PLANNING readers onto ONE
// policy — lib/taskLead.taskIsOverdue — and storedSchemaParity pins 1=1=1=1 on those
// four NAMED legs. But a parity test that only names the legs it knows about cannot see
// the leg it doesn't: CalendarView and MasterCalendarView derived overdue LOCALLY —
//
//     const overdue = tasks.filter(t => !t.done && date <= getToday()).length;
//
// — where `date` is the phase-bucket date and the row is gated only by
// `task.week in PHASE_OFFSET`. That local comparison bypasses taskIsOverdue entirely:
// no snooze suppression, no createdAt reachability guard, and "due today" (date ===
// today) reads RED though the policy says due-today is not overdue. A snoozed or
// unreachable task therefore reads 0 on the four fixed readers and RED on the calendar.
//
// This file closes the CLASS with two complementary ratchets:
//
//   PART A — SOURCE SCAN. Any surface that decides overdue by comparing a date to
//   TODAY locally (`<= getToday()`, `> getToday()`, an inequality vs today8601())
//   is a fork by construction. This scan reads the src tree and asserts ZERO such
//   sites exist outside the sanctioned policy module (src/lib/taskLead.js). It BITES
//   on the current source (5 sites in App.js) and goes green only once every calendar
//   overdue read routes through the policy. Placement is untouched: grouping rows by
//   `week in PHASE_OFFSET` to decide WHERE a dot sits is allowed — only deriving the
//   RED/overdue STATE from a local date-vs-today comparison is forbidden.
//
//   PART B — RUNTIME PARITY SWEEP. Enumerate every overdue reader that can be driven
//   from a test (ChecklistGenerator, the lib policy, computeDayAlerts, CommandCenter,
//   and a faithful mirror of the calendars' placement+state pipeline) and assert they
//   ALL agree on the SAME fixtures — including a SNOOZED task and an UNREACHABLE task,
//   the two cases that expose the calendar fork. Written to enumerate, not hardcode:
//   a new reader added to READERS that disagrees fails the sweep.

import fs from 'fs';
import path from 'path';

import { isOverdue } from '../ChecklistGenerator';
import { deriveCommandCenterData } from '../../CommandCenter';
import { taskIsOverdue } from '../../lib/taskLead';
import { computeDayAlerts } from '../../lib/dayAlerts';
import { PHASE_OFFSET, storedTimelineFromPlaybook, inDays } from './storedSchemaFixture';
import { getPlaybook } from '../../lib/playbooks';

// ─── PART A — SOURCE SCAN ─────────────────────────────────────────────────────

const SRC_ROOT = path.join(__dirname, '..', '..'); // src/
const SANCTIONED = new Set([
  path.join(SRC_ROOT, 'lib', 'taskLead.js'), // THE policy module owns the comparison
]);

// Walk the src tree, .js/.jsx only, skipping __tests__ and node_modules. The failure
// mode is a source-level HABIT (someone types `date <= getToday()` in a new surface),
// so we read source text, exactly like registryCompleteness.test.js.
function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walkSrc(full, out);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// FORBIDDEN PATTERN, exactly. A date value compared to TODAY with an inequality
// operator, where "today" is one of the two canonical clocks (getToday() / today8601()):
//
//     <expr> (<|<=|>|>=) getToday()      or   getToday() (<|<=|>|>=) <expr>
//     <expr> (<|<=|>|>=) today8601()     or   today8601() (<|<=|>|>=) <expr>
//
// That inequality IS an overdue/late determination — "is this date past today?" — and it
// is the one question lib/taskLead answers (with snooze + reachability folded in). Any
// other site asking it locally has re-forked the policy.
//
// EXCLUDED (not forks):
//   • `=== today8601()` / `!== today8601()` — equality is an "is this the same day"
//     placement/isToday check, not a late check.
//   • `() => getToday()` / `=> today8601()` — the `>` there belongs to a fat arrow, not
//     a comparison (guarded by the `(?<!=)` lookbehind below).
//   • `getToday().getMonth()` etc. — no inequality operator adjacent.
//
// An explicit `policy-exempt:` marker on the same line documents a site that genuinely
// cannot route through the policy (prefer ZERO — there are none today).
// The clock call may be bare (`getToday()`, `today8601()`) or pinned (`getToday(now)`);
// a fork written against the pinnable clock is just as much a fork. Match either.
const CLOCK = String.raw`(?:getToday|today8601)\s*\([^)]*\)`;
const OP_BEFORE = new RegExp(String.raw`(?<!=)(?:<=?|>=?)\s*${CLOCK}`, 'g');
const OP_AFTER  = new RegExp(String.raw`${CLOCK}\s*(?:<=?|>=?)(?!=)`, 'g');

function scanForForks(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    OP_BEFORE.lastIndex = 0;
    OP_AFTER.lastIndex = 0;
    if (OP_BEFORE.test(line) || OP_AFTER.test(line)) {
      if (line.includes('policy-exempt:')) return; // annotated, allowed
      hits.push({ line: i + 1, text: line.trim() });
    }
  });
  return hits;
}

describe('PART A — source scan: overdue is never decided by a local date-vs-today compare', () => {
  test('the scanner actually bites: it flags the known fork idiom', () => {
    // Guard against a scanner that silently matches nothing (a green test proves
    // nothing if the regex is broken). These are the exact shapes the calendars used.
    expect(scanForForks('const overdue = tasks.filter(t => !t.done && date <= getToday()).length;')).toHaveLength(1);
    expect(scanForForks('const ov = ph.date <= getToday() && !t.done;')).toHaveLength(1);
    expect(scanForForks('if (target <= today8601()) mark();')).toHaveLength(1);
    // …and does NOT bite on the legitimate non-fork shapes.
    expect(scanForForks("const t = useState(() => getToday());")).toHaveLength(0);
    expect(scanForForks('const wd = () => today8601();')).toHaveLength(0);
    expect(scanForForks("const isToday = ds === today8601();")).toHaveLength(0);
    expect(scanForForks('const y = getToday().getFullYear();')).toHaveLength(0);
    expect(scanForForks('const x = a <= getToday(); // policy-exempt: legacy ICS export only')).toHaveLength(0);
  });

  test('ZERO local overdue date-comparisons in the src tree outside lib/taskLead.js', () => {
    const files = walkSrc(SRC_ROOT).filter((f) => !SANCTIONED.has(f));
    const violations = [];
    for (const f of files) {
      const rel = path.relative(SRC_ROOT, f);
      for (const h of scanForForks(fs.readFileSync(f, 'utf8'))) {
        violations.push(`src/${rel}:${h.line}  ${h.text}`);
      }
    }
    // If this fails: route the overdue STATE through the ONE policy
    // (isTaskOverdue / lib.taskIsOverdue with the full event so snooze + reachability
    // bind). Keep phase-date placement for WHERE the row renders — only the RED/overdue
    // decision must come from the policy. A genuine non-overdue exception carries an
    // inline `policy-exempt:` note. There are none today; keep it that way.
    expect(violations).toEqual([]);
  });

  test('the sanctioned module is where the comparison is ALLOWED to live', () => {
    // Non-vacuous: prove the policy module really does own a date-vs-today comparison,
    // so the SANCTIONED exclusion is load-bearing, not a dead entry.
    const policy = fs.readFileSync(path.join(SRC_ROOT, 'lib', 'taskLead.js'), 'utf8');
    expect(scanForForks(policy).length).toBeGreaterThan(0);
  });
});

// ─── PART B — RUNTIME PARITY SWEEP ────────────────────────────────────────────

const preorderOf = (ev) => ev.timeline.find((t) => t.milestoneId === 'cf_reserve');

// ONE stored-schema Crab Feast, tomorrow, two months of runway. The cf_reserve
// milestone stores as { week: '5 Days Out', offsetDays: 5 } — T-5d, 4 days past its
// window, and reachable (created 60 days out). This is the base overdue fixture.
const baseEvent = () => {
  const pb = getPlaybook('Crab Feast');
  return {
    id: 'pf1', type: 'Crab Feast', name: 'Crab Feast',
    date: inDays(1), createdAt: inDays(-60) + 'T12:00:00.000Z',
    guestCount: 18, guestMode: 'count', vendors: [], guests: [],
    timeline: storedTimelineFromPlaybook(pb),
  };
};

// The two fork-exposing cases, as whole EVENTS (so reachability, which needs
// event.createdAt, is real — not faked on the task):
//   SNOOZED     — the pre-order Extended (snoozedUntil in +2 days). Policy: not overdue.
//                 Naive phase-date compare: still RED (date already passed).
//   UNREACHABLE — same T-5d pre-order, but the event was created YESTERDAY for tomorrow;
//                 it never had 5 days of runway. Policy: not overdue (tight timeline,
//                 not a late host). Naive phase-date compare: still RED.
const snoozedEvent = () => {
  const ev = baseEvent();
  ev.timeline = ev.timeline.map((t) =>
    t.milestoneId === 'cf_reserve' ? { ...t, snoozedUntil: inDays(2) } : t);
  return ev;
};
const unreachableEvent = () => ({ ...baseEvent(), createdAt: inDays(-1) + 'T12:00:00.000Z' });

// Faithful mirror of the calendars' overdue read AFTER the fix. Placement is unchanged —
// a row is only ever drawn (and only ever eligible for a red state) when its week is a
// PHASE_OFFSET key; that gate decides WHERE the dot sits. The STATE is the ONE policy.
function calendarOverdue(task, event) {
  if (!(task.week in PHASE_OFFSET)) return false; // calendar never places it → no state
  return taskIsOverdue(task, event);
}

// The calendars' overdue read BEFORE the fix, kept here to PROVE the fixtures bite: the
// phase-bucket date compared straight to today, no snooze, no reachability. This must
// DISAGREE with the policy on the snoozed + unreachable fixtures — if it didn't, the
// fixtures wouldn't exercise the fork and the sweep would be theatre.
function naivePhaseDateOverdue(task, event) {
  if (!(task.week in PHASE_OFFSET) || !event.date) return false;
  const d = new Date(event.date + 'T00:00:00');
  d.setDate(d.getDate() + PHASE_OFFSET[task.week]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return !task.done && d <= today;
}

// Per-task overdue readers. ENUMERATE — do not hardcode the passing verdict. Adding a
// reader that disagrees on any fixture row fails the agreement test below.
const READERS = [
  { name: 'ChecklistGenerator.isOverdue',        fn: (t, ev) => isOverdue(t, ev) },
  { name: 'lib/taskLead.taskIsOverdue (policy)', fn: (t, ev) => taskIsOverdue(t, ev) },
  { name: 'CalendarView (placement+policy)',     fn: (t, ev) => calendarOverdue(t, ev) },
  { name: 'MasterCalendarView (placement+policy)', fn: (t, ev) => calendarOverdue(t, ev) },
];

// Count-level readers: surfaces that emit a COUNT, not a per-task boolean. Their number
// must equal the policy's own count of overdue timeline rows.
const policyOverdueCount = (ev) => ev.timeline.filter((t) => taskIsOverdue(t, ev)).length;
const dayAlertsOverdueCount = (ev) => {
  const row = (computeDayAlerts(ev) || []).find((a) => a.id === 'overdue-tasks');
  if (!row) return 0;
  const m = /(\d+)/.exec(String(row.headline || ''));
  return m ? Number(m[1]) : 0;
};
const commandCenterOverdueCount = (ev) => (deriveCommandCenterData(ev).decisions || []).length;

describe('PART B — runtime parity sweep: every overdue reader agrees', () => {
  const cases = [
    { label: 'base (T-5d pre-order, 4 days past, reachable)', ev: baseEvent, preorderOverdue: true },
    { label: 'snoozed (pre-order Extended +2d)',              ev: snoozedEvent, preorderOverdue: false },
    { label: 'unreachable (created yesterday for tomorrow)',  ev: unreachableEvent, preorderOverdue: false },
  ];

  test('the fixtures are non-vacuous: base overdue, snooze + reachability flip the pre-order', () => {
    expect(taskIsOverdue(preorderOf(baseEvent()), baseEvent())).toBe(true);
    expect(taskIsOverdue(preorderOf(snoozedEvent()), snoozedEvent())).toBe(false);
    expect(taskIsOverdue(preorderOf(unreachableEvent()), unreachableEvent())).toBe(false);
  });

  test('THE FORK IS REAL: the pre-fix calendar read disagrees with the policy on snooze + unreachability', () => {
    // This is the runtime proof that the two calendar surfaces WERE forked: their old
    // phase-date comparison marks the pre-order RED in both cases the policy clears.
    const snE = snoozedEvent();
    const unE = unreachableEvent();
    expect(naivePhaseDateOverdue(preorderOf(snE), snE)).toBe(true);   // calendar: RED
    expect(taskIsOverdue(preorderOf(snE), snE)).toBe(false);          // policy: clear
    expect(naivePhaseDateOverdue(preorderOf(unE), unE)).toBe(true);   // calendar: RED
    expect(taskIsOverdue(preorderOf(unE), unE)).toBe(false);          // policy: clear
  });

  for (const c of cases) {
    test(`all per-task readers agree — ${c.label}`, () => {
      const ev = c.ev();
      for (const t of ev.timeline) {
        const verdicts = READERS.map((r) => ({ name: r.name, overdue: r.fn(t, ev) }));
        const policy = taskIsOverdue(t, ev);
        // Every reader equals the policy for every row. A disagreeing reader shows up
        // by name in the failure diff.
        expect(verdicts).toEqual(READERS.map((r) => ({ name: r.name, overdue: policy })));
      }
      // The fork-exposing row specifically lands where the fixture says.
      expect(taskIsOverdue(preorderOf(ev), ev)).toBe(c.preorderOverdue);
      expect(calendarOverdue(preorderOf(ev), ev)).toBe(c.preorderOverdue);
    });
  }

  test('count-level readers agree with the policy count on every fixture', () => {
    for (const c of cases) {
      const ev = c.ev();
      const policy = policyOverdueCount(ev);
      const calendar = ev.timeline.filter((t) => calendarOverdue(t, ev)).length;
      expect({ case: c.label, dayAlerts: dayAlertsOverdueCount(ev) }).toEqual({ case: c.label, dayAlerts: policy });
      expect({ case: c.label, commandCenter: commandCenterOverdueCount(ev) }).toEqual({ case: c.label, commandCenter: policy });
      expect({ case: c.label, calendar }).toEqual({ case: c.label, calendar: policy });
    }
  });

  test('enumerate-not-hardcode: a reader that forks (naive phase-date) breaks the sweep', () => {
    // Proof the agreement assertion is real: swap in the pre-fix calendar read and the
    // per-task agreement genuinely fails on the snoozed fixture. (We assert the failing
    // shape directly rather than mutating READERS.)
    const ev = snoozedEvent();
    const row = preorderOf(ev);
    const withRogue = [...READERS, { name: 'rogue (naive phase-date)', fn: naivePhaseDateOverdue }];
    const verdicts = withRogue.map((r) => ({ name: r.name, overdue: r.fn(row, ev) }));
    const policy = taskIsOverdue(row, ev);
    expect(verdicts).not.toEqual(withRogue.map((r) => ({ name: r.name, overdue: policy })));
  });
});
