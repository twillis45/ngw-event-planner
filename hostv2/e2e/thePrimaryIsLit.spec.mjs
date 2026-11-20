// The primary button is the steel lit from the top: the one --cta-grad token
// (owner, 11/20/2026, chosen from a rendered flat-vs-gradient comparison).
// Soft and ghost buttons stay flat, so there is still one main action.
import { test, expect, settled } from './fixtures.mjs';

test('the primary wears the gradient; ghost stays flat', async ({ page }) => {
  await page.goto('?elegant=1');
  await settled(page);
  const primary = page.getByRole('button', { name: 'Start my event' });
  const ghost = page.getByRole('button', { name: 'Explore a sample first' });
  await expect(primary).toBeVisible();
  const look = (loc) => loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { image: cs.backgroundImage, shadow: cs.boxShadow };
  });
  const p = await look(primary);
  expect(p.image).toMatch(/^linear-gradient\(/);
  expect((p.image.match(/rgba?\(/g) || []).length).toBe(3);   // light, steel, deep
  expect(p.shadow).toMatch(/inset/);
  const g = await look(ghost);
  expect(g.image).toBe('none');
});
