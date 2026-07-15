// ─── POLICY-FORK ENFORCEMENT: overdue has ONE reader, every tree, every idiom ──────
//
// THE CLASS (not the instance). "N readers of one truth." Eight audit waves proved
// overdue-ness kept re-forking. Wave-6/7 collapsed the four PLANNING readers onto ONE
// policy — lib/taskLead.taskIsOverdue — and storedSchemaParity pins them. Commit
// 8dc00e60 (wave-8, PART A/B here) reconciled a 5th and 6th reader: CalendarView and
// MasterCalendarView derived overdue LOCALLY (`date <= getToday()`), bypassing the policy.
//
// Wave-8 fresh-eyes then found the gate itself was too small to see a 7TH reader:
// hostv2/src/HostShellV2.jsx's calm-hero "next: <task> · past due" copy derived its
// overdue STATE from taskTimeStatus's `slack < 0 → 'overdue'` bucket (src/lib/dates.js),
// which folds in NEITHER snooze NOR reachability. It survived for TWO reasons:
//   (1) the scan only walked `demo/src` — never hostv2/ or backend/; and
//   (2) the idiom set only bit `<=/>=` next to getToday()/today8601() — blind to
//       taskTimeStatus(...) === 'overdue', daysUntil(x) < 0, new Date(x) < new Date(),
//       and a bare `slack < 0` overdue branch.
// This file makes the gate TOTAL on both axes.
//
//   PART A — SOURCE SCAN. Walks BOTH JS trees (demo/src + demo/hostv2/src) and asserts
//   ZERO local overdue DETERMINATIONS live outside the sanctioned policy module
//   (src/lib/taskLead.js). See the idiom spec + the backend boundary decision below.
//
//   PART B — RUNTIME PARITY SWEEP. Enumerate every overdue reader drivable from a test
//   — four planning readers, the two calendars, and now the hostv2 hero (upNext) — and
//   assert they ALL agree on the SAME fixtures, including a SNOOZED and an UNREACHABLE
//   task, the two cases that expose every fork. Written to enumerate, not hardcode.
//
// ─── THE IDIOM SPEC: an OVERDUE DETERMINATION vs a DISPLAY BUCKET ──────────────────
//
// The gate forbids OVERDUE DETERMINATIONS — code that decides "this thing is LATE" and
// drives a red / "past due" state. The authoritative answer folds snooze suppression AND
// createdAt reachability; that is the ONE question lib/taskLead.taskIsOverdue answers.
// It does NOT forbid the honest neighbours a determination is easy to confuse with:
//   • PLACEMENT — grouping a row by phase bucket to decide WHERE a dot sits.
//   • EQUALITY / isToday — `ds === today8601()`.
//   • DISPLAY BUCKETS — taskTimeStatus's 'due' / 'due-soon' / 'upcoming' labels, and
//     `daysUntil(x)` used for countdown COPY ("3 days out"). A bucket may even carry the
//     word 'overdue' (taskTimeStatus does) as a LABEL — the sin is CONSUMING that label
//     to drive a late STATE. taskTimeStatus stays; nothing may read its 'overdue' bucket.
//
// FORBIDDEN idioms (each fires only on a genuine determination; each honours an inline
// `policy-exempt:` note that documents a site that truly cannot route through the policy):
//
//   A. A date compared to TODAY with an inequality, where "today" is a canonical clock:
//        <expr> (<|<=|>|>=) getToday()      (bare or pinned: getToday(now))
//        <expr> (<|<=|>|>=) today8601()
//      Equality (`===`), fat-arrow (`=> getToday()`), and member access
//      (`getToday().getMonth()`) are excluded — none is a late check.
//
//   B. taskTimeStatus's 'overdue' bucket CONSUMED to drive a late state — inline
//      (`taskTimeStatus(...) === 'overdue'`) or via a variable/field assigned from
//      taskTimeStatus and later compared `=== 'overdue'`. This is the exact 7th-reader
//      leak. (The producer — `slack < 0 → 'overdue'` inside taskTimeStatus itself — is a
//      LABEL, not a consumer, and carries a policy-exempt note in dates.js.)
//
//   C. The generic step-overdue date shapes, scoped to a task/step/checklist/timeline
//      context so they never ban the other domains' legitimate uses (see boundary):
//        daysUntil(<step>) < 0 | <= 0        (a step past its window)
//        new Date(<step>) < new Date()       (same, hand-rolled)
//        slack < 0                            (a re-implemented overdue branch)
//
// ─── THE BOUNDARY DECISION: what this gate does NOT govern (and why) ───────────────
//
// This gate is the authority for ONE determination: is a PLANNING TIMELINE / CHECKLIST
// STEP past its lead window? Four OTHER overdue-shaped determinations exist, each with
// its own model and its own reachability/domain rules — they are deliberately OUT of
// scope, and idiom C is task-context-scoped precisely so it does not reach into them:
//
//   1. VENDOR-PROMISE overdue — src/lib/vendorAccountability/{promiseModel,derive}.js
//      (COI / deposit promises, `daysUntil(iso) < 0`). Its own status machine.
//   2. VENDOR-BALANCE overdue — App.js vendor payment (`daysUntil(v.payDueDate) < 0`).
//      A money-due question, not a prep-step question.
//   3. EVENT-LIFECYCLE 'complete' — `daysUntil(event.date) < 0` marks the EVENT as past
//      (a portfolio PLACEMENT bucket), not a task as late.
//   4. BACKEND (Python) — demo/backend is a SEPARATE runtime. It cannot import
//      lib/taskLead or lib/dates, so a JS-idiom text scan is meaningless there, and it
//      carries ZERO planning-task overdue determination today (verified below by scan).
//      Any it grows needs its own policy; this gate cannot reach across the language
//      boundary and does not pretend to. That is why backend/ is asserted-empty, not
//      walked for JS idioms.
//
// Non-overdue date compares (sync latest-wins in lib/api/syncState.js, the admin
// scheduler's nextRun) are not determinations at all and are outside every idiom.

import fs from 'fs';
import path from 'path';

import { isOverdue } from '../ChecklistGenerator';
import { deriveCommandCenterData } from '../../CommandCenter';
import { taskIsOverdue, taskLeadDays } from '../../lib/taskLead';
import { taskTimeStatus, daysUntil } from '../../lib/dates';
import { computeDayAlerts } from '../../lib/dayAlerts';
import { PHASE_OFFSET, storedTimelineFromPlaybook, inDays } from './storedSchemaFixture';
import { getPlaybook } from '../../lib/playbooks';

// ─── PART A — SOURCE SCAN ─────────────────────────────────────────────────────

const REPO = path.join(__dirname, '..', '..', '..');   // demo/
const SRC = path.join(REPO, 'src');                    // demo/src
const HOSTV2 = path.join(REPO, 'hostv2', 'src');       // demo/hostv2/src
const BACKEND = path.join(REPO, 'backend');            // demo/backend (Python)
const TREES = [SRC, HOSTV2];
const SANCTIONED = new Set([
  path.join(SRC, 'lib', 'taskLead.js'), // THE policy module owns the comparison
]);

const SKIP_DIRS = new Set(['__tests__', 'node_modules', 'dist', 'build', 'coverage', '.next']);

// Walk a JS tree, .js/.jsx only, skipping tests/build output. The failure mode is a
// source-level HABIT (someone re-derives overdue in a new surface), so we read text.
function walkJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkJs(full, out);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// ── Idiom regexes ──────────────────────────────────────────────────────────────
// Equality operator that is NOT part of `!==`, `<=`, `>=`, or a fat arrow `=>`.
const EQ = String.raw`(?<![!=<>])={2,3}(?!=)`;
const OVERDUE = String.raw`['"]overdue['"]`;

// A. date-vs-clock inequality (the original idiom). Clock may be bare or pinned.
const CLOCK = String.raw`(?:getToday|today8601)\s*\([^)]*\)`;
const A_BEFORE = new RegExp(String.raw`(?<!=)(?:<=?|>=?)\s*${CLOCK}`);
const A_AFTER = new RegExp(String.raw`${CLOCK}\s*(?:<=?|>=?)(?!=)`);

// B. taskTimeStatus 'overdue' bucket consumed to drive a state.
const B_INLINE = new RegExp(String.raw`taskTimeStatus\s*\([^)]*\)\s*${EQ}\s*${OVERDUE}`);
// Identifiers assigned FROM taskTimeStatus, collected per file so a generic name (`status`)
// only becomes suspect in a file that actually sources it from the bucket function.
const B_ASSIGN_VAR = new RegExp(String.raw`(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*taskTimeStatus\s*\(`, 'g');
const B_ASSIGN_PROP = new RegExp(String.raw`([A-Za-z_$][\w$]*)\s*:\s*[^,;\n]*taskTimeStatus\s*\(`, 'g');

// C. generic step-overdue date shapes. Task-context gate so they never reach the vendor /
// event-lifecycle / sync / scheduler domains (which carry none of these tokens).
const C_TASK_CONTEXT = /\b(task|step|checklist|timeline|todo)\b/i;
const C_DAYSUNTIL = new RegExp(String.raw`daysUntil\s*\([^)]*\)\s*<=?\s*0`);
const C_NEWDATE = new RegExp(String.raw`new Date\s*\([^)]*\)\s*<=?\s*new Date\s*\(\s*\)`);
const C_SLACK = /\bslack\s*<\s*0\b/; // a re-implemented overdue branch; only appears in date math

// Collect the taskTimeStatus-sourced identifier set for one file's text.
function taskTimeStatusIdents(text) {
  const ids = new Set();
  let m;
  B_ASSIGN_VAR.lastIndex = 0;
  while ((m = B_ASSIGN_VAR.exec(text))) ids.add(m[1]);
  B_ASSIGN_PROP.lastIndex = 0;
  while ((m = B_ASSIGN_PROP.exec(text))) ids.add(m[1]);
  return ids;
}

// Scan one file's text → [{ line, text, idiom }]. Every idiom honours `policy-exempt:`.
function scanForForks(text) {
  const hits = [];
  const idents = taskTimeStatusIdents(text);
  const identConsume = [...idents].map(
    (id) => new RegExp(String.raw`\.?\b${id}\b\s*${EQ}\s*${OVERDUE}`)
  );
  text.split('\n').forEach((line, i) => {
    if (line.includes('policy-exempt:')) return; // annotated, allowed
    const push = (idiom) => hits.push({ line: i + 1, text: line.trim(), idiom });
    if (A_BEFORE.test(line) || A_AFTER.test(line)) push('A:date-vs-clock');
    if (B_INLINE.test(line) || identConsume.some((re) => re.test(line))) push('B:taskTimeStatus-overdue');
    if (C_SLACK.test(line)) push('C:slack<0');
    if ((C_DAYSUNTIL.test(line) || C_NEWDATE.test(line)) && C_TASK_CONTEXT.test(line)) push('C:step-date-shape');
  });
  return hits;
}

const relOf = (f) => path.relative(REPO, f); // e.g. 'src/…' or 'hostv2/src/…'

describe('PART A — source scan: overdue is never decided by a local determination', () => {
  test('the scanner bites every forbidden idiom, and spares every legitimate neighbour', () => {
    // A green scan proves nothing if the regex is broken — pin the exact shapes.
    // IDIOM A — the original date-vs-clock fork.
    expect(scanForForks('const overdue = tasks.filter(t => !t.done && date <= getToday()).length;').map(h => h.idiom)).toContain('A:date-vs-clock');
    expect(scanForForks('const ov = ph.date <= getToday() && !t.done;').map(h => h.idiom)).toContain('A:date-vs-clock');
    expect(scanForForks('if (target <= today8601()) mark();').map(h => h.idiom)).toContain('A:date-vs-clock');
    // IDIOM B — taskTimeStatus's bucket consumed as a late state, inline AND cross-line.
    expect(scanForForks("if (taskTimeStatus(-lead, dte) === 'overdue') redFlag();").map(h => h.idiom)).toContain('B:taskTimeStatus-overdue');
    expect(scanForForks("const s = taskTimeStatus(-lead, dte);\nconst late = s === 'overdue';").map(h => h.idiom)).toContain('B:taskTimeStatus-overdue');
    expect(scanForForks("out.push({ timeBucket: taskTimeStatus(-lead, dte) });\nconst late = u.timeBucket === 'overdue';").map(h => h.idiom)).toContain('B:taskTimeStatus-overdue');
    // IDIOM C — the generic step-overdue date shapes, in a task/step context.
    expect(scanForForks('const late = daysUntil(task.dueDate) < 0;').map(h => h.idiom)).toContain('C:step-date-shape');
    expect(scanForForks('const late = new Date(step.due) < new Date();').map(h => h.idiom)).toContain('C:step-date-shape');
    expect(scanForForks('if (slack < 0) return "overdue";').map(h => h.idiom)).toContain('C:slack<0');

    // …and does NOT bite the legitimate neighbours.
    expect(scanForForks('const t = useState(() => getToday());')).toHaveLength(0);   // fat arrow
    expect(scanForForks('const isToday = ds === today8601();')).toHaveLength(0);     // equality
    expect(scanForForks('const y = getToday().getFullYear();')).toHaveLength(0);     // member access
    expect(scanForForks("const bucket = taskTimeStatus(x, y);\nif (bucket === 'due-soon') soon();")).toHaveLength(0); // display bucket
    expect(scanForForks("const b = taskTimeStatus(x, y) === 'due';")).toHaveLength(0);           // display bucket
    expect(scanForForks('const done = ev.date && daysUntil(ev.date) < 0;')).toHaveLength(0);     // event-lifecycle placement (no task token)
    expect(scanForForks('if (new Date(cfg.nextRun) <= new Date()) run();')).toHaveLength(0);     // scheduler (no task token)
    expect(scanForForks("const overdue = daysUntil(v.payDueDate) < 0; // vendor balance")).toHaveLength(0); // vendor domain (no task token)
    // …and honours the annotated escape hatch.
    expect(scanForForks('const a = x <= getToday(); // policy-exempt: legacy ICS export only')).toHaveLength(0);
    expect(scanForForks("if (slack < 0) return 'overdue'; // policy-exempt: display-bucket producer")).toHaveLength(0);
  });

  test('ZERO local overdue determinations across src + hostv2, outside lib/taskLead.js', () => {
    const files = TREES.flatMap((t) => walkJs(t)).filter((f) => !SANCTIONED.has(f));
    const violations = [];
    for (const f of files) {
      for (const h of scanForForks(fs.readFileSync(f, 'utf8'))) {
        violations.push(`${relOf(f)}:${h.line}  [${h.idiom}]  ${h.text}`);
      }
    }
    // If this fails: route the overdue STATE through the ONE policy (taskIsOverdue with the
    // full event, so snooze + reachability bind). Keep phase/placement math for WHERE a row
    // renders and taskTimeStatus's 'due'/'due-soon' for DISPLAY — only the red/past-due
    // DECISION must come from the policy. A genuine display-bucket site carries an inline
    // `policy-exempt:` note. There is exactly one today (the bucket producer in dates.js).
    expect(violations).toEqual([]);
  });

  test('the sanctioned module is where the comparison is ALLOWED to live', () => {
    // Non-vacuous: prove the policy module really owns a date-vs-today comparison, so the
    // SANCTIONED exclusion is load-bearing, not a dead entry.
    const policy = fs.readFileSync(path.join(SRC, 'lib', 'taskLead.js'), 'utf8');
    expect(scanForForks(policy).length).toBeGreaterThan(0);
  });

  test('BOUNDARY: the backend (Python) carries no planning-task overdue determination', () => {
    // The honest boundary made checkable. demo/backend is a separate runtime that cannot
    // import the JS policy; we do NOT walk it for JS idioms. Instead we assert it holds no
    // date-based overdue/past-due determination today, so the "backend has its own logic"
    // claim can't silently rot into "backend forked the policy in a language we don't scan".
    const py = [];
    (function walkPy(dir) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && e.name !== '.venv' && e.name !== 'venv') walkPy(full); }
        else if (/\.py$/.test(e.name)) py.push(full);
      }
    })(BACKEND);
    // The boundary is only meaningful if there IS a backend to be bounded.
    expect(py.length).toBeGreaterThan(0);
    const overdueSites = [];
    for (const f of py) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (line.trim().startsWith('#')) return;
        if (/\b(overdue|past[_\s-]?due)\b/i.test(line)) overdueSites.push(`${path.relative(REPO, f)}:${i + 1}  ${line.trim()}`);
      });
    }
    // If this ever fails, the backend grew its own overdue determination: that is fine, but
    // it needs a Python-side policy — this JS gate cannot reach it. Update this boundary
    // note deliberately rather than deleting the assertion.
    expect(overdueSites).toEqual([]);
  });
});

// ─── PART B — RUNTIME PARITY SWEEP ────────────────────────────────────────────

const preorderOf = (ev) => ev.timeline.find((t) => t.milestoneId === 'cf_reserve');

// ONE stored-schema Crab Feast, tomorrow, two months of runway. The cf_reserve milestone
// stores as { week: '5 Days Out', offsetDays: 5 } — T-5d, 4 days past its window, reachable
// (created 60 days out). The base overdue fixture.
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
//   UNREACHABLE — same T-5d pre-order, but the event was created YESTERDAY for tomorrow;
//                 it never had 5 days of runway. Policy: not overdue (tight timeline).
// Both read RED on every naive date-vs-today compare — calendar OR hostv2 hero.
const snoozedEvent = () => {
  const ev = baseEvent();
  ev.timeline = ev.timeline.map((t) =>
    t.milestoneId === 'cf_reserve' ? { ...t, snoozedUntil: inDays(2) } : t);
  return ev;
};
const unreachableEvent = () => ({ ...baseEvent(), createdAt: inDays(-1) + 'T12:00:00.000Z' });

// Faithful mirror of the calendars' overdue read AFTER the fix. Placement (week in
// PHASE_OFFSET) decides WHERE a dot sits; the STATE is the ONE policy.
function calendarOverdue(task, event) {
  if (!(task.week in PHASE_OFFSET)) return false;
  return taskIsOverdue(task, event);
}

// 7th reader (wave-8): hostv2 HostShellV2 upNext / the calm-hero "· past due". AFTER the
// fix the past-due STATE is taskIsOverdue(t, event) (snooze + reachability), NOT
// taskTimeStatus. upNext filters undone, unresolved timeline steps; a done step is never
// past-due (taskIsOverdue is already false for done), so the mirror is the policy, exactly.
function hostUpNextOverdue(task, event) {
  if (!task || task.done) return false; // upNext filters !t.done
  return taskIsOverdue(task, event);
}

// The calendars' overdue read BEFORE the fix — phase-bucket date vs today, no snooze, no
// reachability. Kept to PROVE the fixtures bite (it must DISAGREE with the policy).
function naivePhaseDateOverdue(task, event) {
  if (!(task.week in PHASE_OFFSET) || !event.date) return false;
  const d = new Date(event.date + 'T00:00:00');
  d.setDate(d.getDate() + PHASE_OFFSET[task.week]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return !task.done && d <= today;
}

// The hostv2 hero read BEFORE the wave-8 fix: taskTimeStatus's slack<0 'overdue' bucket
// consumed straight as "past due" — no snooze, no reachability. The 7th fork, made runnable
// so the sweep can PROVE it disagreed with the policy on the two exposing fixtures.
function naiveTaskTimeStatusOverdue(task, event) {
  const lead = taskLeadDays(task);
  if (lead == null) return false;
  const dte = daysUntil(event && event.date);
  return taskTimeStatus(-lead, dte) === 'overdue';
}

// Per-task overdue readers. ENUMERATE — do not hardcode the passing verdict. Adding a
// reader that disagrees on any fixture row fails the agreement test below.
const READERS = [
  { name: 'ChecklistGenerator.isOverdue',           fn: (t, ev) => isOverdue(t, ev) },
  { name: 'lib/taskLead.taskIsOverdue (policy)',     fn: (t, ev) => taskIsOverdue(t, ev) },
  { name: 'CalendarView (placement+policy)',         fn: (t, ev) => calendarOverdue(t, ev) },
  { name: 'MasterCalendarView (placement+policy)',   fn: (t, ev) => calendarOverdue(t, ev) },
  { name: 'hostv2 HostShellV2 upNext (7th reader)',  fn: (t, ev) => hostUpNextOverdue(t, ev) },
];

// Count-level readers: surfaces that emit a COUNT, not a per-task boolean.
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

  test('THE CALENDAR FORK IS REAL: the pre-fix calendar read disagrees on snooze + unreachability', () => {
    const snE = snoozedEvent();
    const unE = unreachableEvent();
    expect(naivePhaseDateOverdue(preorderOf(snE), snE)).toBe(true);   // calendar: RED
    expect(taskIsOverdue(preorderOf(snE), snE)).toBe(false);          // policy: clear
    expect(naivePhaseDateOverdue(preorderOf(unE), unE)).toBe(true);   // calendar: RED
    expect(taskIsOverdue(preorderOf(unE), unE)).toBe(false);          // policy: clear
  });

  test('THE 7TH FORK IS REAL: the pre-fix hostv2 hero (taskTimeStatus) disagrees on snooze + unreachability', () => {
    // The runtime proof that HostShellV2's calm-hero "past due" WAS forked: the taskTimeStatus
    // bucket marks the pre-order RED in both cases the policy — and the fixed hero — clear.
    const snE = snoozedEvent();
    const unE = unreachableEvent();
    expect(naiveTaskTimeStatusOverdue(preorderOf(snE), snE)).toBe(true);  // old hero: past due
    expect(hostUpNextOverdue(preorderOf(snE), snE)).toBe(false);          // fixed hero: clear
    expect(naiveTaskTimeStatusOverdue(preorderOf(unE), unE)).toBe(true);  // old hero: past due
    expect(hostUpNextOverdue(preorderOf(unE), unE)).toBe(false);          // fixed hero: clear
    // …and it agrees on the base fixture (the fix does not silence a real overdue).
    expect(naiveTaskTimeStatusOverdue(preorderOf(baseEvent()), baseEvent())).toBe(true);
    expect(hostUpNextOverdue(preorderOf(baseEvent()), baseEvent())).toBe(true);
  });

  for (const c of cases) {
    test(`all per-task readers agree — ${c.label}`, () => {
      const ev = c.ev();
      for (const t of ev.timeline) {
        const verdicts = READERS.map((r) => ({ name: r.name, overdue: r.fn(t, ev) }));
        const policy = taskIsOverdue(t, ev);
        expect(verdicts).toEqual(READERS.map((r) => ({ name: r.name, overdue: policy })));
      }
      expect(taskIsOverdue(preorderOf(ev), ev)).toBe(c.preorderOverdue);
      expect(calendarOverdue(preorderOf(ev), ev)).toBe(c.preorderOverdue);
      expect(hostUpNextOverdue(preorderOf(ev), ev)).toBe(c.preorderOverdue);
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

  test('enumerate-not-hardcode: a reader that forks breaks the sweep (both fork shapes)', () => {
    // Proof the agreement assertion is real: swap in either pre-fix read and the per-task
    // agreement genuinely fails on the snoozed fixture.
    const ev = snoozedEvent();
    const row = preorderOf(ev);
    for (const rogue of [
      { name: 'rogue (naive phase-date)', fn: naivePhaseDateOverdue },
      { name: 'rogue (naive taskTimeStatus)', fn: naiveTaskTimeStatusOverdue },
    ]) {
      const withRogue = [...READERS, rogue];
      const verdicts = withRogue.map((r) => ({ name: r.name, overdue: r.fn(row, ev) }));
      const policy = taskIsOverdue(row, ev);
      expect(verdicts).not.toEqual(withRogue.map((r) => ({ name: r.name, overdue: policy })));
    }
  });
});
