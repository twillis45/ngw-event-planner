// ─── THE FINAL-COUNT LINE FOLLOWS HER MODE (owner ruling 4b, 11/23/2026) ─────
//
// Thanksgiving walkthrough P2: a host who chose "By headcount" was told
// "replies are optional and nobody gets chased", and elsewhere "chase the
// maybes". Ruling: the wording follows her mode. By headcount, the lines that
// said "chase the maybes" say to confirm the final count, with no chasing; by
// list they keep "chase the maybes". One reader decides (lib/guestMode
// byGuestMode). The "By list" / "By headcount" button labels do not change.
//
// Swept over all 47 playbooks in both modes: the milestones, the risks' fixes,
// the top decision's count line, and the day-before plan's count line.
import { ALL_PLAYBOOKS, playbookMilestones, playbookRisks, topPlaybookDecision } from '../playbooks';
import { buildDayBeforePlan } from '../dayBefore';
import { byGuestMode } from '../guestMode';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const MAYBES = /chase the maybes/i;
const PENDING = [{ id: 'g1', name: 'Ada Lee', rsvp: 'Yes' }, { id: 'g2', name: 'Bo Kim', rsvp: 'Pending' }, { id: 'g3', name: 'Cy Dee' }];
const ev = (type, mode, days) => ({
  id: 'fc', type, name: 'N', date: daysFromNow(days), guestMode: mode, guests: PENDING, vendors: [], budget: [],
  totalBudget: 900, startTime: '17:00', startTimeSource: 'host', venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX',
});
const lines = (e) => {
  const out = [];
  for (const m of (playbookMilestones(e) || [])) out.push(['milestone ' + m.id, m.name]);
  for (const r of ((playbookRisks(e) || {}).items || [])) out.push(['risk ' + r.id, r.mitigation]);
  const top = (() => { try { return topPlaybookDecision(e); } catch (_e) { return null; } })();
  if (top) out.push(['top decision', [top.title, top.why, top.detail, top.body, top.consequence].filter(Boolean).join(' ')]);
  const db = buildDayBeforePlan(e);
  for (const s of ((db && db.sections) || [])) out.push(['day before ' + (s.key || ''), s.detail || '']);
  return out;
};

test('the reader: by headcount the count words, else the list words', () => {
  const w = { list: 'chase', count: 'confirm' };
  expect(byGuestMode({ guestMode: 'count' }, w)).toBe('confirm');
  expect(byGuestMode({ guestMode: 'list' }, w)).toBe('chase');
  expect(byGuestMode({}, w)).toBe('chase');
});

test('by list, the lines still say "chase the maybes" (premise: the sweep reaches them)', () => {
  const kinds = new Set();
  for (const pb of ALL_PLAYBOOKS) for (const d of [30, 2]) {
    for (const [where, text] of lines(ev(pb.type, 'list', d))) if (MAYBES.test(text)) kinds.add(where.split(' ')[0] + ' ' + where.split(' ')[1]);
  }
  // milestones, risks, the top decision's count line and the day before's.
  expect([...kinds].some((k) => k.startsWith('milestone'))).toBe(true);
  expect([...kinds].some((k) => k.startsWith('risk'))).toBe(true);
  expect([...kinds].some((k) => k.startsWith('top decision'))).toBe(true);
  expect([...kinds].some((k) => k.startsWith('day before'))).toBe(true);
});

test('by headcount, nothing says "chase the maybes" — and the same lines ask to confirm the count', () => {
  const bad = [];
  let confirmed = 0;
  for (const pb of ALL_PLAYBOOKS) for (const d of [30, 2]) {
    const list = new Map(lines(ev(pb.type, 'list', d)));
    for (const [where, text] of lines(ev(pb.type, 'count', d))) {
      if (MAYBES.test(text)) bad.push(`${pb.type} T-${d} ${where}: ${text}`);
      else if (MAYBES.test(list.get(where) || '')) {
        confirmed++;
        if (!/confirm/i.test(text)) bad.push(`${pb.type} T-${d} ${where} lost its ask: ${text}`);
      }
    }
  }
  expect(bad).toEqual([]);
  expect(confirmed).toBeGreaterThan(5);
});
