// ─── ActionRow — secondary-action element contract ────────────────────────────
//
// Todd (2026-07-07): pills read as chips/filters, not actions — especially on
// mobile (ragged widths, short targets). Secondary actions are full-width
// 44px rows (hairline top, label + trailing arrow); `compact` is the inline
// variant for list-item CTAs. Pills survive ONLY as true chips (toggles).

const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '../../App.js'), 'utf8');

describe('ActionRow primitive', () => {
  const fn = app.slice(app.indexOf('function ActionRow'), app.indexOf('function ActionRow') + 2600);

  test('exists with the row anatomy: 44px target, hairline top, no pill chrome', () => {
    expect(app.indexOf('function ActionRow')).toBeGreaterThan(-1);
    expect(fn).toContain("minHeight: compact ? 34 : 44");
    expect(fn).toMatch(/borderTop: compact \? 'none' : `1px solid \$\{C\.border\}`/);
    expect(fn).toContain('borderRadius: 0'); // never a pill
  });

  test('external hrefs open safely', () => {
    expect(fn).toContain("target: '_blank', rel: 'noopener noreferrer'");
  });
});

describe('the sweep — converted call sites', () => {
  test('rain-plan suggest, parking draft, and location-check CTAs are ActionRows', () => {
    expect(app).toMatch(/<ActionRow testid="suggest-rain-plan"/);
    expect(app).toMatch(/<ActionRow compact testid="draft-parking-note"/);
    expect(app).toMatch(/<ActionRow compact label=\{x\.action\.label\}/);
  });

  test('local-help categories are href rows, not pills', () => {
    expect(app).toMatch(/<ActionRow key=\{cat\} label=\{cat\}/);
  });

  test('helper confirm uses the compact row', () => {
    expect(app).toMatch(/<ActionRow compact testid=\{`helper-confirm-\$\{i\.id\}`\}/);
  });

  test('venue quick actions are one segmented text row (no bordered chips)', () => {
    const block = app.slice(app.indexOf('data-testid="venue-quick-actions"') - 800, app.indexOf('data-testid="venue-quick-actions"') + 1600);
    expect(block).not.toContain('borderRadius: 8');
    expect(block).not.toContain('borderRadius: 999');
  });

  test('no legacy pill-button styling remains on the converted actions', () => {
    // The old signature: a bordered, radius-7/8 <button> for these exact labels.
    for (const label of ['Suggest a rain plan', 'Draft parking note']) {
      const idx = app.indexOf(label);
      const around = app.slice(Math.max(0, idx - 600), idx + 100);
      expect(around).not.toMatch(/borderRadius: [78],/);
    }
  });
});
