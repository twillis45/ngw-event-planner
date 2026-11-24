// ─── NUDGE THE ONES WHO HAVEN'T ANSWERED (owner ruling, 11/20/2026) ─────────
// "Approve as written." Who the nudge reaches, when the board asks for it, when
// the chase step is done, and what a guest's row says afterwards. Every date is
// built in LOCAL time (CI also runs this file under TZ=Pacific/Midway); an
// instant is only ever compared as an instant.
import { routeByWords } from '../__fixtures__/stepByWords';
import {
  nudgeRecipients, nudgeCount, nudgeBoardItem, chaseAnsweredOrNudged, markNudged,
  nudgeRowLine, nudgeDeliveryFor, nudgeTextBody, wasInvited,
} from '../replyNudge';
import { taskSatisfied, effectiveDone } from '../taskEngine';
import { raiseAll } from '../surfaceRegistry';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
// INPUTS ONLY changed (six root causes, cause 1, part 2): a row is proven by
// the facts its step DECLARES, never by its words, so each row literal below
// carries `facts`: the declaration a step with its words carries (derived once
// from the retired text rules, as the playbooks' were). Assertions unchanged.

// YYYY-MM-DD for `days` from today, in local time.
const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// An instant at local noon `days` ago.
const atDaysAgo = (days) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - days); return d.toISOString(); };
const weekday = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
const SENT = atDaysAgo(9);

const EV = (over = {}) => ({
  id: 'ev-nudge', type: 'Friendsgiving', name: 'Vida’s Friendsgiving', date: isoIn(12), guestMode: 'list',
  rsvpDeadline: isoIn(3),
  guests: [
    { id: 'g1', name: 'Maya Chen', email: 'maya@example.test', invitedAt: SENT, invitedVia: 'email' },
    { id: 'g2', name: 'Jordan Ellis', phone: '(410) 555-0102', invitedAt: SENT, invitedVia: 'text' },
    { id: 'g3', name: 'Sam Ortiz', email: 'sam@example.test', invitedAt: SENT, invitedVia: 'email', rsvp: 'Yes' },
    { id: 'g4', name: 'Lee Park', email: 'lee@example.test' },                          // never invited
    { id: 'g5', name: 'Ana Ruiz', email: 'ana@example.test', invitedAt: SENT, invitedVia: 'email', nudgedAt: atDaysAgo(1), nudgedVia: 'email' },
  ],
  ...over,
});

describe('who the nudge goes to', () => {
  test('invited and unanswered: email where the address is good, the text queue where there is only a phone', () => {
    const r = nudgeRecipients(EV());
    expect(r.email.map((g) => g.id)).toEqual(['g1']);
    expect(r.text.map((g) => g.id)).toEqual(['g2']);
    expect(nudgeCount(r)).toBe(2);
    expect(r.invited).toBe(4);
    expect(r.answered).toBe(1);
  });

  test('a guest who was never invited is not nudged', () => {
    const r = nudgeRecipients(EV());
    expect([...r.email, ...r.text].some((g) => g.id === 'g4')).toBe(false);
  });

  test('a guest the host marked told counts as invited', () => {
    const ev = EV({ guestTold: { g4: { at: SENT, channel: 'text', attested: true } } });
    expect(wasInvited(ev, ev.guests[3])).toBe(true);
    expect(nudgeRecipients(ev).email.map((g) => g.id)).toEqual(['g1', 'g4']);
  });

  test('anyone nudged in the last 3 days is skipped, and counted as skipped', () => {
    const r = nudgeRecipients(EV());
    expect([...r.email, ...r.text].some((g) => g.id === 'g5')).toBe(false);
    expect(r.recentlyNudged).toBe(1);
    // Today, yesterday and the day before are "the last 3 days"; day 3 is not.
    for (const [k, skipped] of [[0, true], [2, true], [3, false], [8, false]]) {
      const ev = EV({ guests: [{ id: 'g5', name: 'Ana', email: 'ana@example.test', invitedAt: SENT, nudgedAt: atDaysAgo(k) }] });
      expect(nudgeCount(nudgeRecipients(ev))).toBe(skipped ? 0 : 1);
    }
  });

  test('a headcount-only event is never nudged', () => {
    expect(nudgeCount(nudgeRecipients(EV({ guestMode: 'count' })))).toBe(0);
    expect(nudgeCount(nudgeRecipients(EV({ guestCountLocked: true })))).toBe(0);
  });
});

describe('the timing rule: the host’s own date, never automatic', () => {
  test('3 days before a set date: "N haven’t replied — replies due {weekday}" (count first, owner 11/20)', () => {
    const item = nudgeBoardItem(EV());
    expect(item.title).toBe(`2 haven’t replied — replies due ${weekday(isoIn(3))}`);
    expect(item.phase).toBe('before');
    expect(item.why).toBe('1 of 4 invited have answered · 1 was nudged in the last 3 days');
  });

  test('4 days before, nothing yet', () => {
    expect(nudgeBoardItem(EV({ rsvpDeadline: isoIn(4) }))).toBeNull();
  });

  test('on the day itself it says today', () => {
    expect(nudgeBoardItem(EV({ rsvpDeadline: isoIn(0) })).title).toBe('2 haven’t replied — replies due today');
  });

  test('the day after the date passes it appears again, while anyone invited is unanswered and un-nudged', () => {
    const item = nudgeBoardItem(EV({ rsvpDeadline: isoIn(-1) }));
    expect(item.phase).toBe('after');
    expect(item.title).toBe(`2 haven’t replied — replies were due ${weekday(isoIn(-1))}`);
    // Nudged yesterday: nobody is un-nudged, so the board stays quiet.
    const done = EV({ rsvpDeadline: isoIn(-1), guests: EV().guests.map((g) => ({ ...g, nudgedAt: atDaysAgo(1), nudgedVia: 'email' })) });
    expect(nudgeBoardItem(done)).toBeNull();
    // Nudged at "3 days before": by the day after the date, that nudge is 4 days old.
    const earlier = EV({ rsvpDeadline: isoIn(-1), guests: EV().guests.map((g) => ({ ...g, nudgedAt: atDaysAgo(4), nudgedVia: 'email' })) });
    expect(nudgeBoardItem(earlier).count).toBe(3);
  });

  test('a derived date is never used: with no date set, nothing at any distance', () => {
    for (const dte of [3, 6, 7, 8, 9, 10, 11, 14]) {
      const ev = EV({ date: isoIn(dte) });
      delete ev.rsvpDeadline;
      expect(nudgeBoardItem(ev)).toBeNull();
    }
  });

  test('nothing when no one is outstanding', () => {
    const all = EV({ guests: EV().guests.map((g) => ({ ...g, rsvp: 'Yes' })) });
    expect(nudgeBoardItem(all)).toBeNull();
  });

  test('nothing for a headcount-only event or a past one', () => {
    expect(nudgeBoardItem(EV({ guestMode: 'count' }))).toBeNull();
    expect(nudgeBoardItem(EV({ date: isoIn(-2), rsvpDeadline: isoIn(-5) }))).toBeNull();
  });

  test('on the board: one row, keyed for snooze, that opens the nudge', () => {
    const rows = (raiseAll(EV()) || []).filter((r) => r && r.key === 'rsvp-chase');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe(`2 haven’t replied — replies due ${weekday(isoIn(3))}`);
    expect(rows[0].route).toEqual({ tab: 'Guests', focusField: 'rsvp-nudge' });
    expect(resolveRoute(rows[0].route)).toEqual({ kind: 'guests', focus: 'nudge' });
  });

  test('a list with no invite records keeps the old after-the-date row and nothing before it', () => {
    const plain = (dl) => EV({ rsvpDeadline: dl, guests: [
      { id: 'a', name: 'A', rsvp: 'Yes' }, { id: 'b', name: 'B', rsvp: '' }] });
    expect((raiseAll(plain(isoIn(3))) || []).filter((r) => r && r.key === 'rsvp-chase')).toEqual([]);
    const [row] = (raiseAll(plain(isoIn(-2))) || []).filter((r) => r && r.key === 'rsvp-chase');
    expect(row.title).toBe('1 guest still has not replied');
  });
});

describe('the checklist step tells the truth', () => {
  const step = { id: 't_rsvp_chase', task: 'Chase non-responders; lock the seated count', facts: ['replies-chased'], done: false };

  test('done when everyone invited has answered or been nudged', () => {
    const ev = EV({ guests: EV().guests.filter((g) => g.id !== 'g4').map((g) => (g.rsvp ? g : { ...g, nudgedAt: atDaysAgo(0), nudgedVia: 'email' })) });
    expect(chaseAnsweredOrNudged(ev)).toBe(true);
    expect(taskSatisfied(ev, step)).toBe(true);
    expect(effectiveDone(ev, step)).toBe(true);
  });

  test('not done while one invited guest is unanswered and un-nudged', () => {
    expect(taskSatisfied(EV(), step)).toBe(false);
  });

  test('opening the sheet does not count: a recorded handoff of the draft is not a nudge', () => {
    const ev = EV({ sendLedger: { 'The RSVP nudge': { status: 'handed_off', attested: true, channel: 'sms', at: atDaysAgo(0) } } });
    expect(taskSatisfied(ev, step)).toBe(false);
  });

  test('nobody invited is not "everyone invited": the old rule still decides', () => {
    const ev = EV({ guests: [{ id: 'a', name: 'A', rsvp: 'Yes' }, { id: 'b', name: 'B', rsvp: '' }] });
    expect(taskSatisfied(ev, step)).toBe(false);
    expect(taskSatisfied(EV({ guests: [{ id: 'a', name: 'A', rsvp: 'Yes' }] }), step)).toBe(true);
  });

  test('the chase step opens the nudge where replies are tracked, and the guest list where they are not', () => {
    expect(routeByWords(step.task, {}, EV()).route).toEqual({ tab: 'Guests', focusField: 'rsvp-nudge' });
    expect(routeByWords(step.task, {}, EV({ guestMode: 'count' })).route.focusField).not.toBe('rsvp-nudge');
  });
});

describe('what a guest row says after the nudge', () => {
  const at = new Date(2026, 10, 21, 15, 30).toISOString();   // Nov 21, local afternoon

  test('a text is "texted by you", never "sent"', () => {
    const line = nudgeRowLine({ nudgedAt: at, nudgedVia: 'text' }, null);
    expect(line).toBe('Nudged Nov 21 · texted by you');
    expect(line).not.toMatch(/sent/i);
  });

  test('an email carries the delivery the server reports', () => {
    expect(nudgeRowLine({ nudgedAt: at, nudgedVia: 'email' }, { status: 'email-delivered' }))
      .toBe('Nudged Nov 21 · emailed — Delivered');
    expect(nudgeRowLine({ nudgedAt: at, nudgedVia: 'email' }, { status: 'email-bounced' }))
      .toBe('Nudged Nov 21 · emailed — Bounced — it didn’t reach them');
  });

  test('without a report, an email says only that the email service took it', () => {
    expect(nudgeRowLine({ nudgedAt: at, nudgedVia: 'email' }, null)).toBe('Nudged Nov 21 · emailed — the email service took it');
  });

  test('emailed and texted the same day: both, in order, and the text still never "sent"', () => {
    const [g] = markNudged(markNudged([{ id: 'g1' }], [{ id: 'g1' }], 'email', at), [{ id: 'g1' }], 'text', at);
    expect(g.nudgedVia).toBe('email+text');
    const line = nudgeRowLine(g, { status: 'email-delivered' });
    expect(line).toBe('Nudged Nov 21 · emailed — Delivered · texted by you');
    expect(line.split(' · ').pop()).not.toMatch(/sent/i);
  });

  test('a later day replaces the record; an unreached guest is untouched', () => {
    const later = new Date(2026, 10, 25, 9, 0).toISOString();
    const [g, other] = markNudged([{ id: 'g1', nudgedAt: at, nudgedVia: 'email+text' }, { id: 'g2' }], [{ id: 'g1' }], 'text', later);
    expect(g).toEqual({ id: 'g1', nudgedAt: later, nudgedVia: 'text' });
    expect(other).toEqual({ id: 'g2' });
  });

  test('never nudged: no line', () => {
    expect(nudgeRowLine({ id: 'g1' }, null)).toBeNull();
  });

  test('the delivery is the newest server email to that address since the nudge', () => {
    const g = { email: 'Maya@example.test', nudgedAt: at };
    const t = (min) => new Date(Date.parse(at) + min * 60000).toISOString();
    const server = { status: 'ok', emails: [
      { created_at: t(-60 * 24), delivery: { recipient_email: 'maya@example.test', status: 'email-delivered' } },   // the invite
      { created_at: t(-1), delivery: { recipient_email: 'maya@example.test', status: 'email-opened' } },
      { created_at: t(-2), delivery: { recipient_email: 'sam@example.test', status: 'email-bounced' } },
    ] };
    expect(nudgeDeliveryFor(g, server)).toEqual({ recipient_email: 'maya@example.test', status: 'email-opened' });
    expect(nudgeDeliveryFor(g, { status: 'signed-out' })).toBeNull();
    expect(nudgeDeliveryFor(g, { status: 'ok', emails: [server.emails[0]] })).toBeNull();
  });
});

test('the text drops the draft’s own greeting, because the queue greets each guest by name', () => {
  expect(nudgeTextBody('Hi! Just a friendly nudge — we’d love to have you.')).toBe('just a friendly nudge — we’d love to have you.');
  expect(nudgeTextBody('Hi — just a gentle note.')).toBe('just a gentle note.');
  expect(nudgeTextBody('Hey, can you make it?')).toBe('Hey, can you make it?');
});
