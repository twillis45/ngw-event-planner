// A DELETED SELECTOR CAN EAT THE NEXT RULE (2026-10-01).
//
// styles.css floors five phone controls with one GROUP:
//
//   .chip, .mini, .lc-door, .lens, .counted-caret { min-height: 44px; ... }
//
// Removing the last member to relocate it left the list dangling on a comma,
// so the group silently adopted the FOLLOWING rule as its final selector:
//
//   .chip, .mini, .lc-door, .lens, .lc-ctas > * + * { margin-top: 8px }
//
// Four controls lost their phone floor and gained a stray margin. CSS has no
// opinion about this, nothing errored, and it surfaced only via an unrelated
// vendor-card height assertion 1,700 lines away (2022/2022 -> 1976/1969).
//
// MY FIRST ATTEMPT AT THIS GATE DID NOT WORK, and the reason is the lesson:
// it looked for a comma immediately before '{'. That shape never exists here
// — once comments are stripped the mangled group still ends in a perfectly
// valid selector, which is precisely why the browser accepted it. Detecting
// the syntax is the wrong idea; assert the OUTCOME instead.
//
// Two outcomes, both cheap: the floored group still contains every control it
// is supposed to, and the rule beneath it still belongs to itself alone.
const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(
  path.resolve(__dirname, '../../../hostv2/src/styles.css'), 'utf8',
);
// Comments carry old selector names on purpose; strip them before matching.
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the phone tap-floor group keeps its members, and only its members', () => {
  test('every control the group floors is still in it', () => {
    // .counted-caret heads FOUR rule groups here, and .chip is in two of
    // them — picking by .chip matched the ::after expander list instead.
    // .lc-door belongs to this group alone, so that is the discriminator.
    // (Two wrong selectors in a row on a test about selectors: the lesson is
    // to identify a rule by something unique to it, not by something common.)
    const heads = [...BARE.matchAll(/([^{}]*\.counted-caret\s*)\{([^}]*)\}/g)];
    const m = heads.find((h) => /(^|,)\s*\.lc-door\s*(,|$)/.test(h[1]));
    // NOTE: jest's expect takes ONE argument — expect(value, message) is a
    // Playwright API and throws "Expect takes at most one argument" here.
    // Detail goes in the thrown message instead.
    if (!m) throw new Error('the .chip/.mini/.lc-door/.lens/.counted-caret group is gone');
    const selectors = m[1].split(',').map((x) => x.trim()).filter(Boolean);
    for (const want of ['.chip', '.mini', '.lc-door', '.lens', '.counted-caret']) {
      if (!selectors.includes(want)) {
        throw new Error(`${want} lost its phone tap floor — group is now: ${selectors.join(' | ')}`);
      }
    }
    expect(m[2]).toMatch(/min-height/);
  });

  test('the rule below the group belongs to itself alone', () => {
    // When the group dangles, this rule is absorbed and its selector count
    // jumps from one to five. That is the fingerprint.
    const m = BARE.match(/([^{}]*\.lc-ctas[^{}]*?)\{/);
    if (!m) throw new Error('.lc-ctas > * + * must still exist');
    const selectors = m[1].split(',').map((x) => x.trim()).filter(Boolean);
    if (selectors.length !== 1) {
      throw new Error(`absorbed into the group above: ${selectors.join(' | ')}`);
    }
    expect(selectors).toEqual(['.lc-ctas > * + *']);
  });
});
