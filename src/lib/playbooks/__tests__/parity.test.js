// AP-001 guard (Sprint 55K) — Silent Data Subset cannot recur without a failing
// test. Two checks:
//   1. Every src playbook carries the full set of authored sections, non-empty.
//   2. No canonical `*.playbook.json` section is silently dropped (or shrunk) in
//      its src module.
// This is the test that would have caught dinnerParty.js shipping without
// `schedules` (55H-B1) and `rentalsGap` (55H-B3A). Test-only — no runtime change.

import fs from 'fs';
import path from 'path';
import dinnerParty from '../data/dinnerParty';
import birthday from '../data/birthday';
import babyShower from '../data/babyShower';
import backyardBbq from '../data/backyardBbq';
import graduation from '../data/graduation';
import watchParty from '../data/watchParty';
import gameNight from '../data/gameNight';
import housewarming from '../data/housewarming';
import bridalShower from '../data/bridalShower';
import genderReveal from '../data/genderReveal';
import engagementParty from '../data/engagementParty';
import anniversary from '../data/anniversary';
import holidayParty from '../data/holidayParty';
import sweet16 from '../data/sweet16';
import retirementParty from '../data/retirementParty';
import reunion from '../data/reunion';
import bacheloretteParty from '../data/bacheloretteParty';
import bachelorParty from '../data/bachelorParty';
import vowRenewal from '../data/vowRenewal';
import theCookout from '../data/theCookout';
import fishFry from '../data/fishFry';
import cardParty from '../data/cardParty';
import sundayDinner from '../data/sundayDinner';
import dayParty from '../data/dayParty';
import juneteenthCookout from '../data/juneteenthCookout';
import crabFeast from '../data/crabFeast';
import crawfishBoil from '../data/crawfishBoil';
import lowCountryBoil from '../data/lowCountryBoil';
import pupusaGathering from '../data/pupusaGathering';
import ethiopianCoffeeCeremony from '../data/ethiopianCoffeeCeremony';
import wedding from '../data/wedding';
import elopement from '../data/elopement';
import quinceanera from '../data/quinceanera';
import surpriseProposal from '../data/surpriseProposal';
import repast from '../data/repast';
import kwanzaaGathering from '../data/kwanzaaGathering';

const SRC_PLAYBOOKS = { dinnerParty, birthday, babyShower, backyardBbq, graduation, watchParty, gameNight, housewarming, bridalShower, genderReveal, engagementParty, anniversary, holidayParty, sweet16, retirementParty, reunion, bacheloretteParty, bachelorParty, vowRenewal, theCookout, fishFry, cardParty, sundayDinner, dayParty, juneteenthCookout, crabFeast, crawfishBoil, lowCountryBoil, pupusaGathering, ethiopianCoffeeCeremony, wedding, elopement, quinceanera, surpriseProposal, repast, kwanzaaGathering };

// The authored sections every host playbook must carry. Dropping any of these is
// the AP-001 failure mode.
const REQUIRED = [
  'decisions', 'milestones', 'tasks', 'purchases',
  'schedules', 'rentalsGap', 'risks', 'contingencies',
];

const nonEmpty = (v) =>
  Array.isArray(v) ? v.length > 0
  : v && typeof v === 'object' ? Object.keys(v).length > 0
  : false;

// ── Check 1: every src playbook is self-complete ──────────────────────────────
describe('AP-001: every src playbook carries the full authored intelligence', () => {
  Object.entries(SRC_PLAYBOOKS).forEach(([name, pb]) => {
    test(`${name}: every required section present & non-empty`, () => {
      const missing = REQUIRED.filter((s) => !nonEmpty(pb[s]));
      expect(missing).toEqual([]); // these required sections are missing/empty
      // schedules must keep its phase sub-keys
      ['setup', 'cleanup'].forEach((phase) => {
        expect(nonEmpty(pb.schedules[phase])).toBe(true);
      });
      // knowledge / provenance present on every host playbook
      expect(nonEmpty(pb.knowledge)).toBe(true);
    });
  });
});

// ── Check 2: canonical → src parity (no silent drop or shrink) ─────────────────
const CANON_DIR = path.resolve(__dirname, '../../../../engine-audit/playbooks');
const CANON_FILES = fs.existsSync(CANON_DIR)
  ? fs.readdirSync(CANON_DIR).filter((f) => f.endsWith('.playbook.json'))
  : [];

describe('AP-001: src does not silently drop canonical sections', () => {
  test('at least one canonical playbook file exists to compare', () => {
    expect(CANON_FILES.length).toBeGreaterThan(0);
  });

  CANON_FILES.forEach((file) => {
    const canon = JSON.parse(fs.readFileSync(path.join(CANON_DIR, file), 'utf8'));
    const src = Object.values(SRC_PLAYBOOKS).find((p) => p.type === canon.type);

    test(`${file} (${canon.type}) → matching src has every canonical section`, () => {
      expect(src).toBeTruthy(); // a canonical playbook with no src module is itself a drift

      // Every section the canonical has, non-empty, must be non-empty in src.
      const dropped = REQUIRED.concat(['vendors']).filter(
        (s) => nonEmpty(canon[s]) && !nonEmpty(src[s]),
      );
      expect(dropped).toEqual([]); // canonical has these; src dropped them

      // Schedule phases present in canonical must be present in src.
      if (canon.schedules && typeof canon.schedules === 'object') {
        const droppedPhases = Object.keys(canon.schedules).filter(
          (phase) => nonEmpty(canon.schedules[phase]) && !nonEmpty((src.schedules || {})[phase]),
        );
        expect(droppedPhases).toEqual([]); // schedule phases dropped in src
      }

      // Authored arrays must not SHRINK below the canonical count (no silent item drop).
      ['decisions', 'purchases', 'risks', 'vendors', 'rentalsGap'].forEach((s) => {
        if (Array.isArray(canon[s]) && canon[s].length > 0) {
          expect(Array.isArray(src[s]) && src[s].length).toBeGreaterThanOrEqual(canon[s].length);
        }
      });
    });
  });
});
