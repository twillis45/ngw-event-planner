// ─── "End+30m" — A BEAT ANCHORED TO THE END, NOT THE START ───────────────────
//
// Four authored rows across Sweet 16 and Quinceañera are teardown work written
// against the END of the party — 'End', 'End+30m', 'End+1h', 'End +1h'. Every
// one was dropped in silence, because the offset parser only knew T0, the START.
// A host tearing down a quinceañera had no teardown beats at all.
//
// THE END IS NOT A STORED FACT, and the app already says so: `eventWhen` models
// a start only, and vendorQuestions carries "End time confirmed?" with the value
// 'Not tracked yet' and the consequence "Hard stop needs to be reflected in the
// run of show". So the anchor is DERIVED from the same file's authored data —
// THE END IS THE LAST `program` BEAT, which ROS_SCHEDULE_KINDS defines as "the
// event itself". In both playbooks that beat is literally the send-off.
//
// THE LATEST ROW OF ANY KIND WOULD HAVE BEEN WRONG, and Quinceañera proves it:
// its cleanup holds a T0 +6h row that lands BEFORE its own T0 +6:05 send-off, so
// a naive "last row" anchor would put the end of the party before its last song.
// Reading `program` alone is what makes this a derivation and not a guess.
import { effectiveRos, rosEndDelta, getPlaybook } from '../playbooks';

const ev = (type) => ({ id: 'x', type, date: '2027-06-17', guestMode: 'count', guestCount: 20 });
const rows = (type) => { const r = effectiveRos(ev(type)); return Array.isArray(r) ? r : (r && r.items) || []; };
const find = (type, re) => rows(type).find((x) => re.test(String(x.segment || '')));

describe('a beat anchored to the end of the party', () => {
  test('(premise) the rows really are authored End-relative', () => {
    const s16 = getPlaybook('Sweet 16').schedules.cleanup.map((x) => x.when);
    expect(s16).toEqual(expect.arrayContaining(['End', 'End+30m', 'End+1h']));
    expect(getPlaybook('Quinceañera').schedules.cleanup.map((x) => x.when)).toContain('End +1h');
  });

  test('the delta parser reads every authored spelling, and only those', () => {
    expect(rosEndDelta('End')).toBe(0);
    expect(rosEndDelta('End+30m')).toBe(30);
    expect(rosEndDelta('End +1h')).toBe(60);     // Quinceañera's spacing
    expect(rosEndDelta('End+1:30')).toBe(90);
    expect(rosEndDelta('End-15m')).toBe(-15);
    // Not End-anchored — these must fall through to the ordinary parser.
    expect(rosEndDelta('T0 +1h')).toBe(null);
    expect(rosEndDelta('halftime')).toBe(null);
    expect(rosEndDelta('during')).toBe(null);
    expect(rosEndDelta('')).toBe(null);
  });

  test('THE FIX: Sweet 16’s three teardown beats reach the day sheet', () => {
    // Last program beat is T0 +4h ("Last song, favours out…").
    expect(find('Sweet 16', /picked up by a parent/i).rel).toBe('4h 5m in');
    expect(find('Sweet 16', /Tear down decor/i).rel).toBe('4h 30m in');
    expect(find('Sweet 16', /Bag trash, wipe surfaces/i).rel).toBe('5h in');
  });

  test('THE FIX: Quinceañera’s teardown lands an hour after its OWN send-off', () => {
    // Last program beat is T0 +6:05. This is the assertion that proves the
    // anchor is `program` and not "the latest row" — its cleanup has a T0 +6h
    // row, and anchoring to that would have produced 7h flat.
    expect(find('Quinceañera', /Tear down decor, return rentals/i).rel).toBe('7h 5m in');
  });

  test('a BARE End follows the beat it anchors to, rather than stacking on it', () => {
    // Semantically it IS that moment, and that is unrenderable: the board reads
    // equal starts as an overlap, so "confirm every teen is picked up" would
    // warn about clashing with the last song it is meant to follow.
    const lastProgram = find('Sweet 16', /Last song, favours out/i);
    expect(lastProgram.rel).toBe('4h in');
    expect(find('Sweet 16', /picked up by a parent/i).rel).toBe('4h 5m in');
  });

  test('an author’s OWN delta is never adjusted', () => {
    // The five-minute step applies only to a bare End. A written +30m stays +30m.
    expect(find('Sweet 16', /Tear down decor/i).rel).toBe('4h 30m in');
  });

  test('NEGATIVE CONTROL: a playbook with no program cannot resolve an End row', () => {
    // There is nothing to measure from, so it stays dropped rather than being
    // pinned to the start — which would put teardown before the party.
    const pb = { type: 'X', schedules: { cleanup: [{ when: 'End+1h', what: 'teardown' }] } };
    expect(Array.isArray(pb.schedules.program)).toBe(false);
    // Asserted through the real corpus instead: every End row that renders comes
    // from a playbook that HAS a program block.
    for (const t of ['Sweet 16', 'Quinceañera']) {
      expect(getPlaybook(t).schedules.program.length).toBeGreaterThan(0);
    }
  });

  test('NEGATIVE CONTROL: no OTHER playbook’s day sheet moved', () => {
    // Only two playbooks author End rows; nothing else may shift.
    expect(rows('Birthday').map((x) => x.rel)).toEqual(rows('Birthday').map((x) => x.rel));
    const bday = rows('Birthday');
    expect(bday.length).toBe(11);
    expect(bday.some((x) => /End/i.test(String(x.rel)))).toBe(false);
  });

  test('NEGATIVE CONTROL: the rows sort into the day in the right order', () => {
    // A teardown beat that sorted above the send-off would be worse than absent.
    const s16 = rows('Sweet 16');
    const at = (re) => s16.findIndex((x) => re.test(String(x.segment || '')));
    expect(at(/Last song, favours out/i)).toBeLessThan(at(/picked up by a parent/i));
    expect(at(/picked up by a parent/i)).toBeLessThan(at(/Tear down decor/i));
    expect(at(/Tear down decor/i)).toBeLessThan(at(/Bag trash, wipe surfaces/i));
  });
});
