// Day tab ROS state classification tests.
// Three states: timed (green spine) · untimed (needs-time) · empty (no cues).
import { classifyRos } from '../playbooks';

describe('classifyRos', () => {
  test('null → empty', () => {
    expect(classifyRos(null)).toBe('empty');
  });

  test('undefined → empty', () => {
    expect(classifyRos(undefined)).toBe('empty');
  });

  test('empty array → empty', () => {
    expect(classifyRos([])).toBe('empty');
  });

  test('timed cues → timed', () => {
    const cues = [
      { id: '1', time: '2:00 PM', segment: 'Guests arrive' },
      { id: '2', time: '5:30 PM', segment: 'Dinner' },
    ];
    expect(classifyRos(cues)).toBe('timed');
  });

  test('24-hour time strings → timed', () => {
    const cues = [{ id: '1', time: '14:00', segment: 'Guests arrive' }];
    expect(classifyRos(cues)).toBe('timed');
  });

  test('setup tasks (no time field) → untimed', () => {
    const cues = [
      { id: '1', task: 'Send invites', week: '2 Weeks Out', done: false },
      { id: '2', task: 'Lock the menu', week: '1 Week Out', done: true },
    ];
    expect(classifyRos(cues)).toBe('untimed');
  });

  test('segment cues with no time → untimed', () => {
    const cues = [
      { id: '1', segment: 'Setup', owner: 'host' },
      { id: '2', segment: 'Dinner', owner: 'caterer' },
    ];
    expect(classifyRos(cues)).toBe('untimed');
  });

  test('empty-string time → untimed', () => {
    const cues = [{ id: '1', time: '', segment: 'Setup' }];
    expect(classifyRos(cues)).toBe('untimed');
  });

  test('whitespace-only time → untimed', () => {
    const cues = [{ id: '1', time: '   ', segment: 'Setup' }];
    expect(classifyRos(cues)).toBe('untimed');
  });

  test('mixed: any timed cue → timed (one timed cue is enough)', () => {
    const cues = [
      { id: '1', task: 'Setup chairs', week: '1 Week Out' },
      { id: '2', time: '3:00 PM', segment: 'Guests arrive' },
    ];
    expect(classifyRos(cues)).toBe('timed');
  });

  test('all done timed cues → still timed (green spine shows ALL CLEAR)', () => {
    const cues = [
      { id: '1', time: '2:00 PM', segment: 'Setup', done: true },
      { id: '2', time: '7:00 PM', segment: 'Dinner', done: true },
    ];
    expect(classifyRos(cues)).toBe('timed');
  });

  test('all done untimed tasks → untimed, not empty (cues exist)', () => {
    const cues = [
      { id: '1', task: 'Send invites', done: true },
      { id: '2', task: 'Lock menu', done: true },
    ];
    expect(classifyRos(cues)).toBe('untimed');
  });

  test('null cue entries in array are skipped', () => {
    const cues = [null, undefined, { id: '1', task: 'Send invites' }];
    expect(classifyRos(cues)).toBe('untimed');
  });

  test('null cue entries with a timed cue → timed', () => {
    const cues = [null, { id: '1', time: '2:00 PM', segment: 'Setup' }];
    expect(classifyRos(cues)).toBe('timed');
  });
});
