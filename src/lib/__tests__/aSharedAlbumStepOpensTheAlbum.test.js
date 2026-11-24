// ─── A SHARED-ALBUM STEP OPENS THE ALBUM, NOT THE GUEST LIST (11/24/2026) ────
//
// Cohesion batch D render: Wanda's "Set up a shared photo/notes drop" lit
// "Open your guest list". The card was right; the step's declared target was
// wrong. Five steps that set up or fill one shared album declared
// `guest-list` when the app has an album target ("Add the album link", the
// After stage's album field, reachable before the day too).
//
// Two checks, both on declared data, never on a step's words:
//   1. the five steps, pinned by playbook and id, declare `album` and their
//      checklist button is that target's label;
//   2. a census: a step whose declared milestone or phase is about photos,
//      the album or the memory table never opens the guest list, unless the
//      step is guest work (phase `guest`: a thank-you).
const pbm = require('../playbooks');
const { checklistRouteFor } = require('../taskRoute');
const { targetFor } = require('../stepTarget');

const ALBUM_STEPS = [
  ['Retirement Party', 't_memory_collect'],
  ['Birthday', 't_after_album'],
  ['Anniversary', 't_photoask'],
  ['Anniversary', 't_after_collect_photos'],
  ['Reunion', 't-photo-album'],
];

const pbFor = (type) => pbm.ALL_PLAYBOOKS.find((p) => p.type === type);

describe('a shared-album step opens the album', () => {
  test.each(ALBUM_STEPS)('%s %s declares the album target', (type, id) => {
    const pb = pbFor(type);
    expect(pb).toBeTruthy();
    const step = (pb.tasks || []).find((t) => t.id === id);
    expect(step).toBeTruthy();
    expect(step.target).toBe('album');
    const ev = { id: 'ev-album', type, name: 'Album', date: '2027-06-10', guests: [], vendors: [], budget: [], timeline: [] };
    const hit = checklistRouteFor(step.label, { taskId: `pbt-ev-album-${id}` }, ev);
    expect(hit && hit.label).toBe(targetFor('album', ev).label);
  });

  test('no photo, album or memory step opens the guest list (thank-yous aside)', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const t of pb.tasks || []) {
        const about = /photo|album|memory/i.test(`${t.milestoneId || ''} ${t.phase || ''}`);
        if (about && t.phase !== 'guest' && t.target === 'guest-list') bad.push(`${pb.type}:${t.id}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
