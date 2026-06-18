// Sprint 60F — Moment Library v1 (ROS-only). Proves: authored type→moments menu
// (no inference); flag gate; ROS-presence detection prevents double-insert; segment
// shape mirrors RunOfShow.add(); partial moments carry an honest "not tracked here"
// note; unknown type falls back to common moments.

import {
  momentsOn, momentsForType, momentOnRos, buildMomentSegment, suggestableMoments,
} from '../momentLibrary';

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('60F flag gate', () => {
  test('momentsOn default OFF', () => { expect(momentsOn()).toBe(false); });
  test('ON via localStorage', () => { localStorage.setItem('ngw-pi-moments', '1'); expect(momentsOn()).toBe(true); });
});

describe('60F momentsForType — authored, deterministic, deduped', () => {
  test('retirement menu includes recognition + video tribute + common', () => {
    const labels = momentsForType('Retirement Party').map((m) => m.label);
    expect(labels).toEqual(expect.arrayContaining(['Recognition speech', 'Video tribute', 'Cake cutting', 'Group photo']));
  });
  test('free-text type soft-matches ("Retirement Dinner" → retirement)', () => {
    expect(momentsForType('Retirement Dinner').some((m) => m.id === 'videoTribute')).toBe(true);
  });
  test('unknown type ⇒ ONLY the universal moment (group photo) — no spurious cake/toast', () => {
    expect(momentsForType('Llama Meetup').map((m) => m.id)).toEqual(['groupPhoto']);
  });
  test('no duplicate ids (group photo appears once even though common + type-specific)', () => {
    const ids = momentsForType('Birthday').map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('60F coverage gaps (review-board cross-check)', () => {
  test('Gender Reveal has THE reveal moment', () => {
    expect(momentsForType('Gender Reveal').some((m) => m.id === 'reveal')).toBe(true);
  });
  test('Surprise Proposal has the proposal moment', () => {
    expect(momentsForType('Surprise Proposal').some((m) => m.id === 'proposal')).toBe(true);
  });
  test('Wedding includes bouquet toss', () => {
    expect(momentsForType('Wedding').some((m) => m.id === 'bouquetToss')).toBe(true);
  });
  test('HONESTY: a business event never suggests cake or toast', () => {
    ['Board Meeting', 'Conference', 'Corporate', 'Networking Event'].forEach((t) => {
      const ids = momentsForType(t).map((m) => m.id);
      expect(ids).not.toContain('cake');
      expect(ids).not.toContain('toast');
    });
  });
  test('graduation / baby shower / bridal shower DO offer cake (playbooks confirm)', () => {
    ['Graduation', 'Baby Shower', 'Bridal Shower'].forEach((t) => {
      expect(momentsForType(t).some((m) => m.id === 'cake')).toBe(true);
    });
  });
});

describe('60F momentOnRos — prevents double-insert of seeded moments', () => {
  const ros = [
    { segment: 'Toasts & speeches', type: 'event' },
    { segment: 'Cake & first dance', type: 'event' },
  ];
  test('detects toast + cake + first dance already on the ROS', () => {
    const by = (id) => momentsForType('Wedding').find((m) => m.id === id);
    expect(momentOnRos(ros, by('toast'))).toBe(true);
    expect(momentOnRos(ros, by('cake'))).toBe(true);
    expect(momentOnRos(ros, by('firstDance'))).toBe(true);
  });
  test('group photo is NOT seeded ⇒ still suggestable (the real value)', () => {
    const groupPhoto = momentsForType('Wedding').find((m) => m.id === 'groupPhoto');
    expect(momentOnRos(ros, groupPhoto)).toBe(false);
  });
  test('a generic "Tribute & recognition" does NOT suppress a real Video tribute', () => {
    const r = [{ segment: 'Tribute & recognition', type: 'event' }];
    const video = momentsForType('Retirement Party').find((m) => m.id === 'videoTribute');
    expect(momentOnRos(r, video)).toBe(false);
  });
});

describe('60F buildMomentSegment — mirrors RunOfShow.add() shape, no id', () => {
  test('produces an event segment with the default owner, blank time, no id', () => {
    const gp = momentsForType('Birthday').find((m) => m.id === 'groupPhoto');
    const seg = buildMomentSegment(gp);
    expect(seg).toEqual({
      time: '', segment: 'Group photo', location: '', type: 'event',
      owner: 'Photographer', confirmed: false, notes: '', fromMoment: 'groupPhoto',
    });
    expect(seg.id).toBeUndefined();
  });
  test('partial moment carries an honest "not tracked here" note', () => {
    const video = momentsForType('Retirement Party').find((m) => m.id === 'videoTribute');
    expect(video.support).toBe('partial');
    expect(buildMomentSegment(video).notes).toMatch(/AV isn.t tracked here/);
  });
});

describe('60F suggestableMoments — menu minus what is already scheduled', () => {
  test('hides seeded toast/cake, keeps group photo', () => {
    const ros = [{ segment: 'Toasts & speeches' }, { segment: 'Cake & celebration' }];
    const ids = suggestableMoments('Birthday', ros).map((m) => m.id);
    expect(ids).not.toContain('toast');
    expect(ids).not.toContain('cake');
    expect(ids).toContain('groupPhoto');
  });
});
