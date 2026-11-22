// A BUNDLE HERO NAMES ITS FIRST ITEM (audit 2 lane C P1-6, 11/22/2026). From 14
// days to 1 day out Wanda's hero read "Your next step. · past its window · See
// all 5": a bundle of late items whose own title fell past every rung, so the
// headline named nothing. The bundle's first item is what "this one first"
// points at; the headline speaks for it.
import { heroAskFor } from '../heroAsk';

const PLACEHOLDER = 'Your next step.';

test('a bundle of vendor insurance asks names its first vendor', () => {
  const a = { id: 'bundle:vendor-coi', kind: 'bundle', category: 'surface', domain: 'vendors', cta: 'Go',
    title: 'Get proof of insurance from 4 vendors',
    items: [{ title: 'Ask Gold Standard Bar Service for proof of insurance.' }, { title: 'Ask Snap Booth Co. for proof of insurance.' }] };
  const ask = heroAskFor(a, {});
  expect(ask).not.toBe(PLACEHOLDER);
  expect(ask).toMatch(/Gold Standard Bar Service|insurance/);
});

test('a bundle of late steps names the step that leads it', () => {
  const a = { id: 'bundle:late', kind: 'bundle', category: 'surface', cta: 'Go',
    title: 'Five planning steps have slipped past their easy window this week',
    items: [{ title: 'Set up a shared photo/notes drop and ask coworkers for stories', taskId: 't1', category: 'decision' }] };
  const ask = heroAskFor(a, {});
  expect(ask).not.toBe(PLACEHOLDER);
  expect(ask).toMatch(/photo\/notes drop/);
});

test('a lone long title with no act keeps the honest last resort', () => {
  expect(heroAskFor({ title: 'Reconcile the outstanding vendor balance ledger entries' })).toBe(PLACEHOLDER);
});
