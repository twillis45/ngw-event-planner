// ─── THE ALBUM ROW ADDS THE LINK (owner pick "Combine A + B line", 11/21/2026) ──
//
// Halloween's "Share the photo corner pictures in one album link…" and NYE's
// "Share the midnight photos and the countdown video in one album link…" had
// no button. The owner chose: "Add the album link" opens After on the existing
// "Photo album link" field of the invite recap, and "Publish the recap" saves
// event.albumUrl, which guests see when they reopen the invite. A saved link
// is the step done; a typed half-link or nothing is not.
import { routeByWords } from '../__fixtures__/stepByWords';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { taskSatisfied } from '../taskEngine';
import { playbookChecklist } from '../playbooks';

const ev = (type, extra = {}) => ({ id: 'alb', type, date: '2026-12-31', guestEstimate: 20, guestMode: 'count',
  guestCountSource: 'host', venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', ...extra });
const row = (type, re) => (playbookChecklist(ev(type), '2026-10-01') || []).find((r) => re.test(r.task));

const ROWS = [
  ['Halloween Party', /^Share the photo corner pictures in one album link/],
  ["New Year's Eve Party", /^Share the midnight photos and the countdown video in one album link/],
];

describe.each(ROWS)('%s: the album row', (type, re) => {
  const r = row(type, re);
  test('premise: the row is in the playbook', () => { expect(r).toBeTruthy(); });

  test('its button is "Add the album link" and it lands on After, on the album field', () => {
    const hit = routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, ev(type));
    expect(hit && hit.label).toBe('Add the album link');
    expect(resolveRoute(hit.route)).toEqual({ kind: 'stage:after', focus: 'album', anchor: 'Photo album link' });
  });

  test('a saved album link is the step done; nothing, or a half-typed link, is not', () => {
    const t = { task: r.task };
    expect(taskSatisfied(ev(type), t)).toBe(false);
    expect(taskSatisfied(ev(type, { albumUrl: 'photos.app.goo.gl/abc' }), t)).toBe(false);
    expect(taskSatisfied(ev(type, { albumUrl: '   ' }), t)).toBe(false);
    expect(taskSatisfied(ev(type, { albumUrl: 'https://photos.app.goo.gl/abc' }), t)).toBe(true);
  });
});

test('other album and photo rows keep their own rules (the link credits only these two)', () => {
  // Birthday's "Start a shared album and send the link…" is an ask of the
  // guest list, and a saved link does not prove the ask went out.
  const b = row('Birthday', /^Start a shared album/);
  expect(b).toBeTruthy();
  expect(taskSatisfied(ev('Birthday', { albumUrl: 'https://photos.app.goo.gl/abc' }), { task: b.task })).toBe(false);
  expect(resolveRoute(routeByWords(b.task, { taskId: b.id, week: b.week, category: b.category }, ev('Birthday')).route).kind).toBe('guests');
});
