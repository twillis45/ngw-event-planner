// THE REFUND RULE IS READ BEFORE PAYING (owner ruling 11/12/2026).
// The rule is one constant (lib/refundRule); the pass sheet shows it above the
// buy button. These pin the rule's terms and its length.
import { REFUND_LINE, REFUND_WINDOW_DAYS } from '../refundRule';

test('the line states the ruled terms: 14 days, all of it back, unless a new brief was sent', () => {
  expect(REFUND_WINDOW_DAYS).toBe(14);
  expect(REFUND_LINE).toMatch(/\b14 days\b/);
  expect(REFUND_LINE).toMatch(/\ball \$\d+ back\b/);
  expect(REFUND_LINE).toMatch(/not sent a new vendor brief/);
});

test('it reads in one breath: 20 words or fewer, no fine-print words', () => {
  expect(REFUND_LINE.split(/\s+/).length).toBeLessThanOrEqual(20);
  expect(REFUND_LINE).not.toMatch(/\b(subject to|terms apply|eligib|pursuant|discretion)\b/i);
});

// Its place above the buy button is pinned where a host sees it, in the
// rendered sheet: hostv2/e2e/passSalesPausedSaysPaused.spec.mjs.
