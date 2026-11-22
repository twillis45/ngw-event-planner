// ─── HER SCHEDULE ANSWERS "WHEN IS THE CEREMONY?" (Wanda audit P1-1, 11/22/2026) ───
//
// Wanda's run of show puts "Army retirement presentation — Marcus (brother)"
// at 7:45 PM, between doors at 6:30 and the dance floor at 9:00. The board
// still asked "Ceremony Timing — When does the ceremony happen?": a question
// her own rows answer, in words that are not hers. A call the event's own
// records answer is settled (decisionSettledByData, lib/knownFacts.js); only
// the host's own rows count, never the playbook's suggested beats. When it is
// still asked, it is asked in the event's words, in sentence case.
import { deriveDecisionBlockers, buildBlockerStage } from '../assembleRevealEngines';
import { buildExperienceContext } from '../experienceContext';
import { decisionSettledByData } from '../playbooks';
import { ceremonyName, CEREMONY_TIMING_CALL } from '../knownFacts';
import WANDA from '../../data/wandaGoldEvent';

const blockersFor = (ev) => deriveDecisionBlockers(ev, buildExperienceContext(ev).eventIdentity);
const timing = (ev) => blockersFor(ev).find((b) => b.type === 'ceremony-timing') || null;
const NO_ROS = { ...WANDA, ros: [] };

describe('her run of show settles the ceremony timing', () => {
  it('Wanda is a two-milestone event (the question exists to be answered)', () => {
    expect(timing(NO_ROS)).not.toBeNull();
  });

  it('the 7:45 PM presentation between doors and the dance floor is "during"', () => {
    const s = decisionSettledByData(WANDA, CEREMONY_TIMING_CALL);
    expect(s && s.pick).toBe('during');
    expect(s.because).toMatch(/7:45 PM/);
    expect(s.because).toMatch(/retirement presentation/i);
    expect(timing(WANDA)).toBeNull();
  });

  it('a ceremony that opens her schedule is "before"; one that closes it is "after"', () => {
    const rows = (first) => [
      { id: 'a', time: first ? '6:00 PM' : '9:30 PM', label: 'Retirement ceremony' },
      { id: 'b', time: '7:00 PM', label: 'Dinner' },
      { id: 'c', time: '8:00 PM', label: 'Dancing' },
    ];
    expect(decisionSettledByData({ ...WANDA, ros: rows(true) }, CEREMONY_TIMING_CALL).pick).toBe('before');
    expect(decisionSettledByData({ ...WANDA, ros: rows(false) }, CEREMONY_TIMING_CALL).pick).toBe('after');
  });

  it('a schedule that never names the ceremony settles nothing', () => {
    const ros = [{ id: 'a', time: '6:30 PM', label: 'Doors' }, { id: 'b', time: '7:00 PM', label: 'Dinner' }];
    expect(decisionSettledByData({ ...WANDA, ros }, CEREMONY_TIMING_CALL)).toBeNull();
    expect(timing({ ...WANDA, ros })).not.toBeNull();
  });

  it('her own answer still wins, and settles it with no schedule at all', () => {
    expect(timing({ ...NO_ROS, ceremonyTiming: 'after' })).toBeNull();
  });
});

describe('when it is asked, it is asked in the event’s words', () => {
  it('Wanda without a schedule is asked about the retirement presentation', () => {
    expect(ceremonyName(NO_ROS)).toBe('retirement presentation');
    const stage = buildBlockerStage(timing(NO_ROS));
    expect(stage.nextDecision).toBe('When does the retirement presentation happen?');
    expect(stage.title).toBe('Retirement presentation');
    // The three authored picks still ride on the stage, so the hero can answer it.
    expect(stage.options.map((o) => o.value)).toEqual(['before', 'during', 'after']);
  });

  it('an event that never names its ceremony is asked plainly, in sentence case', () => {
    const plain = { id: 'x', type: 'Retirement Party', secondaryType: 'Birthday', name: 'Dee’s party', guestCount: 40, venue: 'The Hall' };
    expect(ceremonyName(plain)).toBe('ceremony');
    const stage = buildBlockerStage(timing(plain));
    expect(stage.nextDecision).toBe('When does the ceremony happen?');
    expect(stage.title).toBe('Ceremony');
  });

  it('no stage title is in title case any more', () => {
    const stage = buildBlockerStage(timing(NO_ROS));
    expect(stage.title).not.toMatch(/Ceremony Timing/);
    expect(stage.what).not.toMatch(/Ceremony Timing/);
  });
});

describe('the hero panel does not ask the question twice', () => {
  it('a blocker whose body restates its ask carries no second "why" line', () => {
    // eslint-disable-next-line global-require
    const { blockerDecisionND } = require('../decisionND');
    const stage = buildBlockerStage(timing(NO_ROS));
    const nd = blockerDecisionND(stage);
    expect(nd.options).toHaveLength(3);
    expect(String(nd.why || '')).not.toContain(stage.nextDecision);
  });
});
