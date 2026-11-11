// The notice a guest reads at the invite's allergy / diet / access fields
// (stage 9 WO #5). The sentence itself is owner-approved; these pin the two
// properties that keep it true: it names the real support inbox, and it makes
// no claim about how long anything is kept (no retention is enforced in code).
import { GUEST_DATA_NOTICE } from '../guestDataNotice';
import { BRAND } from '../brand';

describe('GUEST_DATA_NOTICE', () => {
  test('names the support inbox from BRAND.support, so it cannot drift from it', () => {
    expect(BRAND.support).toMatch(/@/);
    expect(GUEST_DATA_NOTICE).toContain(BRAND.support);
  });

  test('makes no time or retention claim', () => {
    const TIME = /\b(\d+|one|two|three|seven|thirty|ninety)\s*(-|\s)?(day|week|month|year|hour)s?\b|\b(days?|weeks?|months?|years?|hours?|forever|permanent(ly)?|retain(ed)?|retention|kept for|deleted after|automatically (deleted|removed)|until)\b/i;
    // PREMISE: the pattern catches the claim it exists to block.
    expect('We delete it 90 days after the event.').toMatch(TIME);
    expect('Kept for a year.').toMatch(TIME);
    expect(GUEST_DATA_NOTICE).not.toMatch(TIME);
  });

  test('is one short sentence plus the address (30 words or fewer)', () => {
    expect(GUEST_DATA_NOTICE.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(30);
  });
});
