// THE REFUND RULE IS READ BEFORE PAYING (owner ruling 11/12/2026).
// The rule is one constant (lib/refundRule); the pass sheet shows it above the
// buy button. These pin the rule's terms and its length.
import { REFUND_LINE, REFUND_WINDOW_DAYS } from '../refundRule';

test('the line states the ruled terms: 14 days, all of it back, unless a new brief was sent', () => {
  expect(REFUND_WINDOW_DAYS).toBe(14);
  expect(REFUND_LINE).toMatch(/\b14 days\b/);
  expect(REFUND_LINE).toMatch(/\ball \$\d+ back\b/);
  // Reworded 11/15/2026: the AI consumer panel read the old line ("...if you
  // have not sent a new vendor brief") as "use it and lose your refund" (9 of
  // 44 asked). Same rule; the condition now leads, as a change of mind before use.
  // Reworded again 11/16/2026 (owner chose wording C from consumer panel round
  // 3): "brief" was the second-most confusing word on the sheet; the button now
  // says "Send <name> the details", so the rule says the same words. Same rule.
  expect(REFUND_LINE).toBe('Changed your mind? If you haven’t sent the details to another vendor yet, get all $39 back within 14 days.');
  expect(REFUND_LINE).not.toMatch(/brief/i);
});

test('it reads in one breath: 20 words or fewer, no fine-print words', () => {
  expect(REFUND_LINE.split(/\s+/).length).toBeLessThanOrEqual(20);
  expect(REFUND_LINE).not.toMatch(/\b(subject to|terms apply|eligib|pursuant|discretion)\b/i);
});

// Its place above the buy button is pinned where a host sees it, in the
// rendered sheet: hostv2/e2e/passSalesPausedSaysPaused.spec.mjs.
