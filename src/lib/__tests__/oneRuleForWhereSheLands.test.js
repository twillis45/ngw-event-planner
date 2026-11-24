// ─── ONE RULE FOR WHERE SHE LANDS (six root causes, cause 4) ─────────────────
// Every case the Thanksgiving walkthrough drove (P0-1, P1-1) and the owner's
// 11/23 rulings, through the one reader, plus the shell's use of it.
const fs = require('fs');
const path = require('path');
const { landingStage } = require('../landingStage');
const { ALL_PLAYBOOKS } = require('../playbooks');

const at = (iso) => new Date(iso + 'T10:00:00');
const TG = { id: 'tg', type: 'Thanksgiving Hosting', date: '2026-11-26' };
const TRIP = { id: 'trip', type: 'Group Trip', date: '2026-11-26', endDate: '2026-11-29' };

describe('landingStage: every case', () => {
  test.each([
    // [case, input, stage]
    ['fresh visitor, nothing typed', { event: null, ownPlan: false, draftText: '' }, 'plan'],
    ['fresh visitor mid-sentence (iOS reloaded the tab)', { event: null, ownPlan: false, draftText: 'Thanksgiving for 14' }, 'create'],
    ['a sample underneath, her sentence in the box', { event: { id: 's', date: '2026-12-01' }, ownPlan: false, draftText: 'crab feast' }, 'create'],
    ['her plan, not saved yet (opened before sign-in), reload', { event: TG, ownPlan: true, draftText: '', now: at('2026-11-23') }, 'plan'],
    ['her plan saved to her account, reload', { event: { ...TG, cloud: true }, ownPlan: true, now: at('2026-11-23') }, 'plan'],
    ['a few words left in Create never hijack a plan she has', { event: TG, ownPlan: true, draftText: 'Christmas brunch for', now: at('2026-11-23') }, 'plan'],
    ['switching to another event of hers', { event: { id: 'b', type: 'Birthday', date: '2027-03-01' }, ownPlan: true, now: at('2026-11-23') }, 'plan'],
    ['the day before', { event: TG, ownPlan: true, now: at('2026-11-25') }, 'plan'],
    ['the day itself opens on The Day (owner ruling b)', { event: TG, ownPlan: true, now: at('2026-11-26') }, 'day'],
    ['the day itself, with words left in Create', { event: TG, ownPlan: true, draftText: 'next year', now: at('2026-11-26') }, 'day'],
    // Owner ruling 11/24/2026 (cohesion batch E): after the day, her plan opens
    // on After, and stays there, until she starts a new plan.
    ['the day after', { event: TG, ownPlan: true, now: at('2026-11-27') }, 'after'],
    ['long after', { event: TG, ownPlan: true, now: at('2027-01-15') }, 'after'],
    ['a sample after its day stays on Plan', { event: TG, ownPlan: false, now: at('2026-11-27') }, 'plan'],
    ['words in Create never hijack her plan after the day either', { event: TG, ownPlan: true, draftText: 'next year', now: at('2026-11-27') }, 'after'],
    ['day 3 of a trip', { event: TRIP, ownPlan: true, now: at('2026-11-28') }, 'day'],
    ['the day after a trip ends', { event: TRIP, ownPlan: true, now: at('2026-11-30') }, 'after'],
    ['no date yet', { event: { id: 'x', type: 'Birthday' }, ownPlan: true, now: at('2026-11-23') }, 'plan'],
  ])('%s', (_name, input, want) => {
    expect(landingStage(input)).toBe(want);
  });

  test('on its own day, every playbook opens on The Day; the day before, on the plan', () => {
    const wrong = [];
    for (const pb of ALL_PLAYBOOKS) {
      const ev = { id: 'e', type: pb.type, date: '2026-11-26' };
      if (landingStage({ event: ev, ownPlan: true, now: at('2026-11-26') }) !== 'day') wrong.push(`${pb.type} day-of`);
      if (landingStage({ event: ev, ownPlan: true, now: at('2026-11-25') }) !== 'plan') wrong.push(`${pb.type} day-before`);
    }
    expect(wrong).toEqual([]);
  });
});

describe('the shell lands through the one reader', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
  test('the first stage, a switch and opening a plan all ask landingStage', () => {
    expect(/useState\(\(\) => \(bootDraft \? 'create' : 'plan'\)\)/.test(SRC)).toBe(false);
    expect((SRC.match(/landingStage\(/g) || []).length).toBeGreaterThanOrEqual(3);
  });
  test('the reveal offers her unsaved plan beside keeping it, and Create has a way back', () => {
    expect(/Open my plan \(not saved yet\)/.test(SRC)).toBe(true);
    expect(/Back to my plan/.test(SRC)).toBe(true);
  });
});
