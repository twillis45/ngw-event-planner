import { test, expect } from '@playwright/test';

test('the critical gate launches the actual WebKit engine', async ({ browser }) => {
  expect(browser.browserType().name()).toBe('webkit');
});
