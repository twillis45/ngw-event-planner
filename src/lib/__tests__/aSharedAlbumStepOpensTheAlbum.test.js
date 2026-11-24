// ─── THE PHOTO-DROP STEP OPENS THE ALBUM, NOT THE GUEST LIST (11/24/2026) ────
//
// Cohesion batch D render: Wanda's "Set up a shared photo/notes drop" lit
// "Open your guest list". The card was right; the step's declared target was
// wrong. Retirement Party's `t_memory_collect` SETS UP the drop weeks before
// the day, which is the album target ("Add the album link"; the After stage's
// album field, reachable before the day too).
//
// The steps that ASK people to send photos after the day stay on the guest
// list: that is an earlier ruling, pinned in theAlbumRowAddsTheLink ("an ask
// of the guest list, and a saved link does not prove the ask went out").
//
// The guard is a table, on declared data only (never a step's words): every
// step whose declared milestone or phase is about photos, the album or the
// memory table, and that opens the guest list or the album, is listed here
// with the target it was ruled to have. A new one fails until someone rules
// on where it opens, so a photo step cannot drift onto an unrelated section
// unnoticed.
const pbm = require('../playbooks');
const { checklistRouteFor } = require('../taskRoute');
const { targetFor } = require('../stepTarget');

const RULED = {
  'Retirement Party:t_memory_collect': 'album',       // sets up the drop (this fix)
  "New Year's Eve Party:t_photos_out": 'album',       // shares the album link
  'Birthday:t_after_album': 'guest-list',              // asks the guests (theAlbumRowAddsTheLink)
  'Anniversary:t_photoask': 'guest-list',              // asks family and friends for photos
  'Anniversary:t_after_collect_photos': 'guest-list',  // asks the guests after the day
  'Reunion:t-photo-album': 'guest-list',               // asks everyone after the day
  "New Year's Eve Party:t_thanks_pourers": 'guest-list', // a thank-you
};

const pbFor = (type) => pbm.ALL_PLAYBOOKS.find((p) => p.type === type);

describe('a photo step opens where its work is', () => {
  test('Retirement Party\'s photo drop opens the album', () => {
    const pb = pbFor('Retirement Party');
    const step = (pb.tasks || []).find((t) => t.id === 't_memory_collect');
    expect(step.target).toBe('album');
    const ev = { id: 'ev-album', type: 'Retirement Party', name: 'Album', date: '2027-06-10', guests: [], vendors: [], budget: [], timeline: [] };
    const hit = checklistRouteFor(step.label, { taskId: 'pbt-ev-album-t_memory_collect' }, ev);
    expect(hit && hit.label).toBe(targetFor('album', ev).label);
  });

  test('every photo, album or memory step that opens the guest list or the album was ruled on', () => {
    const found = {};
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const t of pb.tasks || []) {
        const about = /photo|album|memory/i.test(`${t.milestoneId || ''} ${t.phase || ''}`);
        if (about && (t.target === 'guest-list' || t.target === 'album')) found[`${pb.type}:${t.id}`] = t.target;
      }
    }
    expect(found).toEqual(RULED);
  });
});
