// ─── THE DOOR THAT KEPT THE OLD NAME ─────────────────────────────────────────
//
// The product was renamed off "Event Boss" on 2026-09-23, and the sweep was
// proved by `theBrandStringThatIsAlsoAStoredValue.test.js`, which asserts the
// CRA shell carries no "Event Boss" outside one frozen stored value. It passed.
// It was also looking in the wrong place for the wrong thing.
//
// WRONG POPULATION: it reads `src/App.js` — the FROZEN donor shell — and never
// touches `hostv2/`, which is the app people actually use.
// WRONG STRING: it matches the two-word product name, and the leftover was the
// SHORTHAND — "the Boss".
//
// So a feature called **Ask the Boss** went on shipping in five host-visible
// places: the section rail, the sheet title, two nav rows and the command
// palette. The name of the product was fixed everywhere except the one screen
// that said it out loud.
//
// This is the fourth time in one day that a correct detector run against the
// wrong population returned a clean answer to the wrong question. It is worth a
// permanent guard rather than another fix.
//
// SO THIS GUARD READS THE WHOLE PRODUCT, and the label now DERIVES from
// lib/brand.js instead of being retyped — which is what makes the next rename
// free rather than another archaeology exercise.
import fs from 'fs';
import path from 'path';
import { BRAND } from '../brand';
import { ASK_LABEL, sectionGroups } from '../sectionDirectory';

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Every file a host's eyes can reach. `src/App.js` is the frozen CRA donor and
// is covered by its own file; what was missing was everything below.
const HOST_FACING = [
  'hostv2/src/HostShellV2.jsx',
  'src/lib/sectionDirectory.js',
];

describe('the rename reached the screen that says the name', () => {
  test('(premise) the brand really did move off the old name', () => {
    // If this flips, every assertion below is measuring a rename that was
    // reverted, and would keep passing while saying nothing.
    expect(BRAND.full).toBe('No Guesswork Events');
    expect(BRAND.short).toBe('No Guesswork');
    expect(BRAND.full).not.toMatch(/boss/i);
  });

  test('THE FIX: the ask door is named from the brand, not retyped', () => {
    // The label is DERIVED. Re-typing it as a literal is how it drifted the
    // first time, and a string equal to today's value would pass either way —
    // so this asserts the derivation, not the text.
    expect(ASK_LABEL).toBe(`Ask ${BRAND.short}`);
    expect(ASK_LABEL).toBe('Ask No Guesswork');
  });

  test('…and the door on the rail actually carries it', () => {
    // Through the real directory, so a label that stopped being wired would
    // fail here rather than passing on the constant alone.
    const rows = sectionGroups({ event: { id: 'x', type: 'Birthday' } })
      .flatMap((g) => g.rows || []);
    const ask = rows.find((r) => r.k === 'ask');
    expect(ask).toBeTruthy();
    expect(ask.label).toBe(ASK_LABEL);
    expect(ask.label).not.toMatch(/boss/i);
  });

  test('THE GUARD: no host-facing source says "the Boss" outside a comment', () => {
    // Comments are allowed to record the history — this file and HostShellV2's
    // rail comment both do — so the sweep strips them first and reads what is
    // left. What ships is what matters.
    const offenders = [];
    for (const rel of HOST_FACING) {
      const stripped = read(rel)
        .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments
        .replace(/^\s*\/\/.*$/gm, ' ')       // whole-line // comments
        .replace(/\s\/\/[^\n]*$/gm, ' ');    // trailing // comments
      if (/\bthe Boss\b/i.test(stripped) || /Event Boss/i.test(stripped)) offenders.push(rel);
    }
    // Named, not counted, so a failure says which file to open.
    expect(offenders).toEqual([]);
  });

  test('(premise) the sweep is reading real files that DEFER to the brand owner', () => {
    // A guard over a failed read passes silently, so each file is checked for
    // substance first.
    //
    // The second assertion was originally `toMatch(/No Guesswork/)` and failed —
    // correctly, and it is worth keeping the reason. HostShellV2 does not
    // contain the brand as a literal ANYWHERE, because it imports BRAND. That is
    // the state this whole fix is trying to reach, and the premise was asserting
    // the opposite of it. What actually matters is that the file reads the name
    // from its owner rather than spelling it.
    for (const rel of HOST_FACING) {
      const src = read(rel);
      expect(src.length).toBeGreaterThan(500);
      expect(src).toMatch(/BRAND|ASK_LABEL/);
    }
  });

  test('NEGATIVE CONTROL: the comment recording the history is still allowed', () => {
    // The rail comment in HostShellV2 explains why the sections sheet and the
    // rail are one list, and names the old feature while doing it. Deleting
    // history to satisfy a linter would be the wrong fix, so the guard must not
    // demand it — this proves the comment survives and is genuinely a comment.
    const raw = read('hostv2/src/HostShellV2.jsx');
    expect(raw).toMatch(/Ask the Boss/);
    const commentLines = raw.split('\n').filter((l) => /Ask the Boss/.test(l));
    expect(commentLines.length).toBeGreaterThan(0);
    for (const l of commentLines) expect(l.trim().startsWith('//') || /^\s*\*/.test(l) || /^\s{6,}\S/.test(l)).toBe(true);
  });
});
