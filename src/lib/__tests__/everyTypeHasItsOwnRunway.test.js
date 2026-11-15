// ─── EVERY TYPE IS MEASURED AGAINST ITS OWN RUNWAY ──────────────────────────
//
// Found 11/15/2026 adding Friendsgiving: `getStandardLeadDays` read a hand-kept
// table, and 26 of the 46 authored types had no row, so all of them fell to the
// 91-day 'Other' default. A Game Night planned two weeks out computed 14/91 =
// 0.15 and was called a "rush" — false, and shown to the host as a deadline
// problem. Every playbook already authors `meta.leadTimeDays`; a type without a
// table row now uses its own playbook's lead, labeled synthesized (it is the
// playbook author's judgment, not a cited runway), never researched.
import { ALL_PLAYBOOKS } from '../playbooks';
import {
  getStandardLeadDays, getCompressionLevel, getStandardLeadProvenance, isGroundedLead, STANDARD_LEAD_DAYS,
} from '../workflowCompression';

describe('no authored type falls to the 91-day default by accident', () => {
  test.each(ALL_PLAYBOOKS.map((pb) => [pb.type, pb.meta.leadTimeDays]))('%s', (type, own) => {
    const lead = getStandardLeadDays(type);
    // A table row, where one exists, still wins (it may be cited); otherwise
    // the playbook's own lead.
    expect(lead).toBe(STANDARD_LEAD_DAYS[type] ?? own);
  });
});

describe('what the host is told', () => {
  test('a game night two weeks out is not a rush', () => {
    expect(getCompressionLevel(14, 'Game Night')).not.toBe('rush');
  });
  test('a dinner party three weeks out is on a standard timeline', () => {
    expect(getCompressionLevel(21, 'Dinner Party')).toBe('standard');
  });
  test('an alias resolves to its playbook first ("Thanksgiving" → Thanksgiving Hosting)', () => {
    expect(getStandardLeadDays('Thanksgiving')).toBe(getStandardLeadDays('Thanksgiving Hosting'));
    expect(getStandardLeadDays('Thanksgiving Hosting')).not.toBe(STANDARD_LEAD_DAYS.Other);
  });
  test('case does not change the runway: "birthday" reads the Birthday row, not the playbook', () => {
    expect(getStandardLeadDays('birthday')).toBe(getStandardLeadDays('Birthday'));
    expect(getStandardLeadDays('crab feast')).toBe(STANDARD_LEAD_DAYS['Crab Feast']);
    expect(getStandardLeadProvenance('crab feast').sources).toEqual(['partyguides-2026']);
  });
  test('a type with no playbook at all still gets the honest 91-day default', () => {
    expect(getStandardLeadDays('Totally Unknown Thing')).toBe(STANDARD_LEAD_DAYS.Other);
  });
});

describe('a borrowed number is labeled as borrowed', () => {
  test('a playbook-derived lead is synthesized and never counts as grounded', () => {
    const p = getStandardLeadProvenance('Game Night');
    expect(p.tier).toBe('synthesized');
    expect(p.claim).toMatch(/Game Night playbook/);
    expect(isGroundedLead('Game Night')).toBe(false);
  });
  test('a cited table row keeps its own provenance', () => {
    expect(isGroundedLead('Friendsgiving')).toBe(true);
    expect(getStandardLeadProvenance('Crab Feast').sources).toEqual(['partyguides-2026']);
  });
});
