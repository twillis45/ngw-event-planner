// ─── TRAVEL MODE REACHES THE CHECKLIST ────────────────────────────────────
//
// Gating the dest_transport DECISION on arrival mode left a half-wire: the
// board correctly hid "are you providing group transport?" for a driving trip,
// but `choiceShown` treats an ABSENT pick as unanswered and shows the dependent
// task anyway — so the checklist still asked the host to confirm a shuttle plan
// for a group that is driving. The question was removed and its task survived.
//
// The copy was the second half. "Who's flying in when" and "airport, hotel,
// transport" describe an event a road-tripping host is not having; that is the
// same invented-detail failure as a fabricated number, just in words.
import { playbookChecklist, travelModeFor, modeShown } from '../playbooks';

const base = {
  id: 'ev', type: 'Retirement Party',
  date: new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10),
  isDestination: true,
  guests: Array.from({ length: 18 }, (_, i) => ({ id: 'g' + i, rsvp: 'yes' })),
};
const tasks = (ev) => playbookChecklist({ ...base, ...ev }).map((r) => r.task);
const has = (ev, rx) => tasks(ev).some((t) => rx.test(t));

describe('the transport task follows the transport decision', () => {
  test('a driving trip is not asked to confirm a shuttle plan', () => {
    expect(has({ travelMode: 'drive' }, /ground-transport plan/i)).toBe(false);
  });

  test('flying keeps it', () => {
    expect(has({ travelMode: 'fly' }, /ground-transport plan/i)).toBe(true);
  });

  test('mixed keeps it — some guests still land', () => {
    expect(has({ travelMode: 'mixed' }, /ground-transport plan/i)).toBe(true);
  });

  test('an unstated mode keeps it — silence is not a no', () => {
    expect(has({}, /ground-transport plan/i)).toBe(true);
  });
});

describe('arrival copy matches how guests actually arrive', () => {
  test('a driving trip is never told to track flights', () => {
    const t = tasks({ travelMode: 'drive' });
    expect(t.some((x) => /flying in when/i.test(x))).toBe(false);
    expect(t.some((x) => /driving in when/i.test(x))).toBe(true);
  });

  test('a driving trip gets directions and parking, not an airport', () => {
    const t = tasks({ travelMode: 'drive' });
    expect(t.some((x) => /getting-here info.*airport/i.test(x))).toBe(false);
    expect(t.some((x) => /directions and parking/i.test(x))).toBe(true);
  });

  test('flying gets the flight wording', () => {
    const t = tasks({ travelMode: 'fly' });
    expect(t.some((x) => /flying in when/i.test(x))).toBe(true);
    expect(t.some((x) => /getting-here info.*airport/i.test(x))).toBe(true);
  });

  test('mixed names both', () => {
    const t = tasks({ travelMode: 'mixed' });
    expect(t.some((x) => /flying, who.s driving/i.test(x))).toBe(true);
    expect(t.some((x) => /airport and parking/i.test(x))).toBe(true);
  });

  test('an unstated mode uses neutral wording that assumes nothing', () => {
    const t = tasks({});
    expect(t.some((x) => /who gets in when/i.test(x))).toBe(true);
    expect(t.some((x) => /flying in when/i.test(x))).toBe(false);
    expect(t.some((x) => /getting-here info.*airport/i.test(x))).toBe(false);
  });
});

describe('the readers themselves', () => {
  test('travelModeFor accepts only the three real modes', () => {
    expect(travelModeFor({ travelMode: 'drive' })).toBe('drive');
    expect(travelModeFor({ travelMode: 'fly' })).toBe('fly');
    expect(travelModeFor({ travelMode: 'mixed' })).toBe('mixed');
    expect(travelModeFor({ travelMode: 'teleport' })).toBe(null);
    expect(travelModeFor({})).toBe(null);
    expect(travelModeFor(null)).toBe(null);
  });

  test('modeShown never removes content on an unstated mode', () => {
    expect(modeShown({}, { not: ['drive'] })).toBe(true);
    expect(modeShown({}, { in: ['fly'] })).toBe(true);
    expect(modeShown({ travelMode: 'drive' }, { not: ['drive'] })).toBe(false);
    expect(modeShown({ travelMode: 'fly' }, { in: ['fly'] })).toBe(true);
    expect(modeShown({ travelMode: 'drive' }, null)).toBe(true);
  });
});

describe('nothing regresses for a local or pre-existing event', () => {
  test('a local event gets no destination tasks at all', () => {
    expect(tasks({ isDestination: false }).some((t) => /getting-here info/i.test(t))).toBe(false);
  });

  test('a destination event with no travelMode is unchanged in COUNT', () => {
    // Only the wording of two rows differs; no row appears or disappears.
    expect(tasks({}).length).toBe(tasks({ travelMode: 'fly' }).length);
  });
});
