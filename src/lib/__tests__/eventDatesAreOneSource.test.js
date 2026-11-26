// ─── THE EVENT'S DATES ARE ONE SOURCE (owner, 11/21/2026) ───────────────────
//
// "Make sure dates are single source. Don't keep asking host for the same
// information." Before this, four surfaces wrote `date`/`endDate` each its own
// way: creation, Date & time (start only), Space's "Last day" input with its
// add/drop-a-day buttons, and the date poll's "Use these dates". Space's input
// was a second date control on a sheet about seats.
//
// The census below reads the host shell's source: any patch that writes `date`
// or `endDate` without going through `eventDatesPatch` fails it, so a second
// date control cannot come back quietly.
import fs from 'fs';
import path from 'path';
import { eventDatesPatch, normalizeEventDates, eventSpanLabel, eventStartTimePatch } from '../eventDates';
import { dateOptionPatch } from '../datePoll';

describe('eventDatesPatch — the one builder of a date write', () => {
  test('a range writes start and end', () => {
    expect(eventDatesPatch({}, { date: '2027-06-14', endDate: '2027-06-17' }))
      .toEqual({ date: '2027-06-14', endDate: '2027-06-17' });
  });
  test('an end on or before the start is one day, not a span', () => {
    expect(eventDatesPatch({}, { date: '2027-06-14', endDate: '2027-06-14' }).endDate).toBe(null);
    expect(eventDatesPatch({}, { date: '2027-06-14', endDate: '2027-06-10' }).endDate).toBe(null);
  });
  test('moving only the start keeps a still-valid end', () => {
    expect(eventDatesPatch({ date: '2027-06-14', endDate: '2027-06-17' }, { date: '2027-06-15' }))
      .toEqual({ date: '2027-06-15', endDate: '2027-06-17' });
  });
  test('the open "which days?" question, a named month and a duplicate night count all close', () => {
    const p = eventDatesPatch({ datesToConfirm: true, targetMonth: { year: 2027, month: 5 }, statedNights: 3 },
      { date: '2027-06-14', endDate: '2027-06-17' });
    expect(p).toEqual({ date: '2027-06-14', endDate: '2027-06-17', datesToConfirm: null, targetMonth: null, statedNights: null });
  });
  test('no valid start, no write', () => {
    expect(eventDatesPatch({}, { date: '' })).toBe(null);
    expect(eventDatesPatch({}, { date: 'tbd' })).toBe(null);
  });
  test('the date poll writes through it', () => {
    const ev = { dateOptions: [{ id: 'a', start: '2027-03-05', end: '2027-03-08' }], datesToConfirm: true };
    expect(dateOptionPatch(ev, 'a')).toEqual({ date: '2027-03-05', endDate: '2027-03-08', datesToConfirm: null, dateOptionUsed: 'a' });
  });
});

// ── THE START TIME: TWO EDITORS, ONE STORE (owner 11/22/2026, "Both can edit") ──
// The run of show's "guests arrive" and Date & time's start time both edit the
// one stored `startTime`, and both build the write here.
describe('eventStartTimePatch — the one builder of a start-time write', () => {
  test('a time she sets is hers', () => {
    expect(eventStartTimePatch({ startTime: '15:00', startTimeSource: 'derived' }, { startTime: '18:30' }))
      .toEqual({ startTime: '18:30', startTimeSource: 'host' });
  });
  test('confirming our pencilled time keeps the time and makes it hers', () => {
    expect(eventStartTimePatch({ startTime: '15:00', startTimeSource: 'derived' }, { confirm: true }))
      .toEqual({ startTimeSource: 'host' });
    expect(eventStartTimePatch({}, { confirm: true })).toBe(null);
  });
  test('a cleared field clears the time; a malformed one writes nothing', () => {
    expect(eventStartTimePatch({ startTime: '18:30', startTimeSource: 'host' }, { startTime: '' }))
      .toEqual({ startTime: '', startTimeSource: null });
    expect(eventStartTimePatch({}, { startTime: 'soon' })).toBe(null);
    expect(eventStartTimePatch({}, { startTime: '25:00' })).toBe(null);
  });
});

describe('normalizeEventDates — older stored shapes, migrated idempotently', () => {
  test.each([
    [{ id: 'a', date: '2027-06-14', endDate: '' }, { id: 'a', date: '2027-06-14' }],
    [{ id: 'b', date: '2027-06-14', endDate: '2027-06-14' }, { id: 'b', date: '2027-06-14' }],
    [{ id: 'c', date: '2027-06-14', endDate: null }, { id: 'c', date: '2027-06-14' }],
    [{ id: 'd', date: '2027-06-14', endDate: '2027-06-17', statedNights: 3 }, { id: 'd', date: '2027-06-14', endDate: '2027-06-17' }],
    [{ id: 'e', endDate: '2027-06-17' }, { id: 'e' }],
  ])('%j', (before, after) => {
    const once = normalizeEventDates(before);
    expect(once).toEqual(after);
    expect(normalizeEventDates(once)).toBe(once); // a second pass changes nothing
  });
  test('a clean event is returned as-is', () => {
    const ev = { id: 'x', date: '2027-06-14', endDate: '2027-06-17' };
    expect(normalizeEventDates(ev)).toBe(ev);
    const nights = { id: 'y', statedNights: 5, targetMonth: { year: 2027, month: 10 } };
    expect(normalizeEventDates(nights)).toBe(nights);
  });
});

describe('eventSpanLabel — one way to say the dates', () => {
  test.each([
    [{ date: '2027-06-14', endDate: '2027-06-17' }, 'Jun 14–17 (3 nights)'],
    [{ date: '2026-12-30', endDate: '2027-01-02' }, 'Dec 30 – Jan 2 (3 nights)'],
    [{ date: '2027-06-14', endDate: '2027-06-15' }, 'Jun 14–15 (1 night)'],
    [{ date: '2027-06-14' }, 'Mon, Jun 14'],
    [{}, null],
  ])('%j → %s', (ev, label) => {
    expect(eventSpanLabel(ev)).toBe(label);
  });
});

// ── THE CENSUS ────────────────────────────────────────────────────────────
const SHELL_DIR = path.join(__dirname, '..', '..', '..', 'hostv2', 'src');
const shellFiles = fs.readdirSync(SHELL_DIR).filter((f) => /\.jsx?$/.test(f));

// The first argument of every patchEvent( … ) call, balanced on brackets.
const patchArgs = (src) => {
  const out = [];
  const re = /\bpatchEvent\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length; let depth = 0; let s = '';
    for (; i < src.length; i += 1) {
      const c = src[i];
      if ('({['.includes(c)) depth += 1;
      if (')}]'.includes(c)) { if (depth === 0) break; depth -= 1; }
      if (c === ',' && depth === 0) break;
      s += c;
    }
    out.push({ at: src.slice(0, m.index).split('\n').length, arg: s.trim() });
  }
  return out;
};

describe('census: nothing in the host shell writes the dates or the start time except lib/eventDates', () => {
  test.each(shellFiles)('%s', (f) => {
    const src = fs.readFileSync(path.join(SHELL_DIR, f), 'utf8');
    const offenders = [];
    for (const { at, arg } of patchArgs(src)) {
      // A literal patch naming the date fields, or a helper other than the one setter.
      if (/^\{/.test(arg) && /(?:^|[{,\s])(?:date|endDate)\s*:/.test(arg)) offenders.push(`${f}:${at} ${arg.slice(0, 80)}`);
      if (/\b(?:addDay|dropDay)\(/.test(arg)) offenders.push(`${f}:${at} ${arg.slice(0, 80)}`);
      // The start time is one store with two editors: a literal patch naming it
      // is a second writer (eventStartTimePatch builds every one).
      if (/^\{/.test(arg) && /(?:^|[{,\s])(?:startTime|startTimeSource)\s*:/.test(arg)) offenders.push(`${f}:${at} ${arg.slice(0, 80)}`);
    }
    // A patch object assembled in a variable before being written.
    const lines = src.split('\n');
    lines.forEach((l, i) => {
      if (/\b(?:const|let)\s+\w*patch\w*\s*=\s*\{[^}]*\b(?:date|endDate)\s*:/i.test(l)) offenders.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`);
      if (/\bpatch\.(?:date|endDate)\s*=/.test(l)) offenders.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`);
      if (/^\s*(?:\/\/|\*|\{\/\*)/.test(l)) return; // prose about an old writer is not one
      if (/\b(?:const|let)\s+\w*patch\w*\s*=\s*\{[^}]*\bstartTime(?:Source)?\s*:/i.test(l)) offenders.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`);
      if (/\bpatch\.startTime(?:Source)?\s*=/.test(l)) offenders.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`);
    });
    expect(offenders).toEqual([]);
  });

  test('both start-time editors write through eventStartTimePatch', () => {
    const src = fs.readFileSync(path.join(SHELL_DIR, 'HostShellV2.jsx'), 'utf8');
    // Date & time's time field and the run of show's "guests arrive" field.
    // The label now says what the time means (cause 5: startTimeFieldWords).
    const inputs = src.match(/aria-label=\{startTimeFieldWords\(event\)\.aria\}/g) || [];
    expect(inputs.length).toBe(2);
    expect((src.match(/writeStartTime\(\{ startTime: e\.target\.value \}/g) || []).length).toBe(2);
    expect(src).toMatch(/const writeStartTime = \(next, msg\) => \{\s*const p = eventStartTimePatch\(event, next\);/);
  });

  test('Space keeps no date input of its own', () => {
    const src = fs.readFileSync(path.join(SHELL_DIR, 'HostShellV2.jsx'), 'utf8');
    expect(src).not.toMatch(/aria-label="Last day of the event"/);
  });

  test('creation builds its dates with the same setter', () => {
    // Creation builds the event in lib/eventFromSentence (owner, 11/26/2026), which the shell calls.
    const src = fs.readFileSync(path.join(SHELL_DIR, 'HostShellV2.jsx'), 'utf8');
    const build = fs.readFileSync(path.join(__dirname, '../eventFromSentence.js'), 'utf8');
    expect(src).toMatch(/eventFromSentence\(\{/);
    expect(build).toMatch(/eventDatesPatch\(\{\}, \{ date: effDate, endDate: effEndDate \}\)/);
  });
});

// ── NEVER RE-ASK WHAT IS KNOWN ───────────────────────────────────────────
import { taskSatisfied } from '../taskEngine';
import { deriveEventPhaseProgress } from '../phaseProgress';

// INPUTS ONLY changed (six root causes, cause 1, part 2): each row carries the
// facts its step declares (never its words). Assertions unchanged.
describe('a checklist row that asks for the date is done once the date is set', () => {
  const pick = 'Pick the date and time to fit the audience — kids parties run early afternoon into dusk';
  test('date and her hour → done; no date, our hour, or days owed → open', () => {
    expect(taskSatisfied({ date: '2026-10-31', startTime: '18:00', startTimeSource: 'host' }, { task: pick, facts: ['date-and-time-picked'] })).toBe(true);
    expect(taskSatisfied({ date: '2026-10-31', startTime: '18:00', startTimeSource: 'derived' }, { task: pick, facts: ['date-and-time-picked'] })).toBe(false);
    expect(taskSatisfied({ startTime: '18:00', startTimeSource: 'host' }, { task: pick, facts: ['date-and-time-picked'] })).toBe(false);
    expect(taskSatisfied({ date: '2026-10-31', startTime: '18:00', startTimeSource: 'host', datesToConfirm: true }, { task: pick, facts: ['date-and-time-picked'] })).toBe(false);
  });
  const poll = 'Offer two or three date ranges and give everyone three days to answer';
  test('a trip typed with its range is not asked to poll for it', () => {
    expect(taskSatisfied({ type: 'Group Trip', date: '2026-12-03', endDate: '2026-12-06' }, { task: poll, facts: ['dates-polled'] })).toBe(true);
    expect(taskSatisfied({ type: 'Group Trip', date: '2026-12-03', datesToConfirm: true }, { task: poll, facts: ['dates-polled'] })).toBe(false);
    expect(taskSatisfied({ type: 'Group Trip', date: '2026-12-03', endDate: '2026-12-06',
      dateOptions: [{ id: 'a', start: '2026-12-03', end: '2026-12-06' }] }, { task: poll, facts: ['dates-polled'] })).toBe(false);
  });
});

describe('the board asks for the dates as one range until both days are known', () => {
  const cue = (ev) => {
    const r = deriveEventPhaseProgress(ev, new Date('2026-11-21T12:00:00'));
    return (r.items || []).find((x) => x && x.id === 'datetime');
  };
  test.each([
    [{ datesToConfirm: true }, 'Which dates? From – to'],
    // Owner 11/22/2026, "Host should be asked for ranges not last day": a
    // known start still asks for the range (From – To), never the last day alone.
    [{ date: '2027-07-04', datesToConfirm: true }, 'Which dates? From – to'],
    [{ date: '2027-07-04', endDate: '2027-07-06', startTime: '12:00', startTimeSource: 'host' }, null],
  ])('%j', (ev, label) => {
    const c = cue({ type: 'Reunion', ...ev });
    if (label === null) expect(c.handled).toBe(true);
    else expect([c.handled, c.cueLabel]).toEqual([false, label]);
  });
});
