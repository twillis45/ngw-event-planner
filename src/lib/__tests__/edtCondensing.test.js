// ─── Where & when condensing — contract tests ─────────────────────────────────
//
// The Event Details form follows the condensing doctrine: CollapsibleCard
// sections (The basics / Where it's happening / Day-of notes / How it went)
// instead of a flat field list. TRUTH FUNCTION: every deep-link anchor that
// now lives inside a collapsible section must force-open its card — a route
// that lands on an unmounted field is a dead CTA (the class CTA-TRUTH-AUDIT
// closed). These tests pin the wiring at the source level.

const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '../../App.js'), 'utf8');
const edtStart = app.indexOf('function EventDetailsTab');
const edt = app.slice(edtStart, app.indexOf('function CommunicationRail', edtStart));

describe('Where & when condensing', () => {
  test('EventDetailsTab exists and uses CollapsibleCard sections', () => {
    expect(edtStart).toBeGreaterThan(-1);
    const cards = (edt.match(/<CollapsibleCard/g) || []).length;
    expect(cards).toBeGreaterThanOrEqual(4); // basics, venue, day-of, history
  });

  test('every day-of deep-link anchor is registered for force-open', () => {
    // These ids are route targets (placeIntelligence, weather RAIN_PLAN_TARGET,
    // phaseProgress cues). If one lives in the collapsed Day-of card without
    // being in EDT_DAYOF_IDS, its deep link dies silently.
    const reg = app.match(/const EDT_DAYOF_IDS = \[([^\]]+)\]/);
    expect(reg).toBeTruthy();
    for (const id of ['venue-contact', 'loadin-notes', 'parking-notes', 'house-rules', 'rain-plan']) {
      expect(reg[1]).toContain(`'${id}'`);
      expect(edt).toContain(`id="${id}"`); // anchor still rendered inside EDT
    }
    // basics + venue anchors registered too
    expect(app).toMatch(/const EDT_BASICS_IDS = \[[^\]]*'event-date'/);
    expect(app).toMatch(/const EDT_VENUE_IDS = \[[^\]]*'event-venue'/);
  });

  test('all three section cards wire forceOpen from the focus broadcast', () => {
    expect(edt).toContain('useFocusFieldForceOpen(EDT_BASICS_IDS)');
    expect(edt).toContain('useFocusFieldForceOpen(EDT_VENUE_IDS)');
    expect(edt).toContain('useFocusFieldForceOpen(EDT_DAYOF_IDS)');
    expect(edt).toContain('forceOpen={basicsFocus}');
    expect(edt).toContain('forceOpen={venueFocus}');
    expect(edt).toContain('forceOpen={dayofFocus}');
  });

  test('both focus producers broadcast ngw-focus-field before polling', () => {
    // scrollFocusFieldWithRetry (host shell go(), Location check, initialNav)
    const fn = app.slice(app.indexOf('const scrollFocusFieldWithRetry'), app.indexOf('const scrollFocusFieldWithRetry') + 2200);
    expect(fn).toContain("new CustomEvent('ngw-focus-field'");
    // EventPlanner's openFocusField effect (planner shell)
    const eff = app.slice(app.indexOf('if (!openFocusField) return undefined;'));
    expect(eff.slice(0, 900)).toContain("new CustomEvent('ngw-focus-field'");
  });

  test('landings re-anchor by RE-RESOLVING the node (tab switch remounts it)', () => {
    // A stale closure node after a cross-tab remount made re-anchor a no-op
    // (live-observed: rain-plan landed 1050px down). Both paths must re-query.
    const fn = app.slice(app.indexOf('const scrollFocusFieldWithRetry'), app.indexOf('const scrollFocusFieldWithRetry') + 2600);
    expect(fn).toMatch(/setTimeout\(\(\) => \{\s*try \{\s*const cur = document\.getElementById\(fieldId\)/);
    const eff = app.slice(app.indexOf('if (!openFocusField) return undefined;'), app.indexOf('if (!openFocusField) return undefined;') + 2600);
    expect(eff).toMatch(/const cur = document\.getElementById\(openFocusField\)/);
  });

  test('flat EDTSectionHead layout is retired', () => {
    expect(edt).not.toContain('<EDTSectionHead');
  });

  test('calmLandTop lands instantly when the document is hidden (rAF paused)', () => {
    const fn = app.slice(app.indexOf('const calmLandTop'), app.indexOf('const calmLandTop') + 900);
    expect(fn).toContain("document.visibilityState === 'hidden'");
  });
});
