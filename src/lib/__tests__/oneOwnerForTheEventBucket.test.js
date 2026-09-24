// ─── THE KEY THAT HOLDS EVERY EVENT A HOST MADE HAS ONE OWNER ───────────────
//
// `LS_CUSTOMS` names the localStorage bucket holding EVERY event created in the
// host shell. Until 2026-09-24 it was declared twice — once in
// `src/lib/customEventStore.js`, which reads and WRITES the bucket, and again in
// `hostv2/src/eventPool.js`, which reads it. Two owners for one bucket name.
//
// ── THIS ALREADY WENT WRONG ONCE, ON THIS KEY ───────────────────────────────
//
// `src/admin/AdminConsole.jsx` carries the record: a 2026-09-02 review board
// found the operator console reading only `ngw-events` — the frozen shell's key
// — while the app that ships writes `ngw-hostv2-custom-events`. Every panel
// labelled "this browser's book" rendered EMPTY against the shipping app. The
// ruling quoted in that file: "a control lying about what it does."
//
// ── WHY THIS GUARD IS STRUCTURAL AND NOT BEHAVIOURAL, STATED PLAINLY ────────
//
// There is no test that fails before this fix and passes after, and pretending
// otherwise would be the vacuous-guard mistake this repo keeps catching: the two
// declarations held the SAME STRING, so any test comparing their values passed
// either way. The defect was never a wrong value — it was a second place where a
// wrong value could be introduced.
//
// So the assertion is about ownership, not equality: `eventPool` must RE-EXPORT
// the key, never declare its own. That fails the moment someone types
// `export const LS_CUSTOMS = …` back into it, which is the event this guard
// exists for. Same source-text idiom, and the same reasoning, as
// `adminReadsShippingBook.test.js`: the claim IS about what the file declares.
import fs from 'fs';
import path from 'path';
import { LS_CUSTOMS } from '../customEventStore';

const ROOT = path.join(__dirname, '..', '..', '..');
const POOL = path.join(ROOT, 'hostv2', 'src', 'eventPool.js');

// ── A SOURCE GATE MUST READ CODE, NOT PROSE — AND MUST NOT EAT THE CODE ────
//
// The first version of this guard went red on its own subject: the comment in
// eventPool.js explaining what the line USED to say contains the literal text
// `export const LS_CUSTOMS = '…'`, and the regex matched the explanation.
//
// The fix for THAT was a hand-rolled comment stripper, and it was wrong. Within
// the hour it was measured against the whole tree: it removed more than 60% of
// 83 of 447 files. Cause — `adminApi.js` has a `//` line comment containing the
// characters `/*` (an `/api/admin/*` route), the block-comment pass ran first,
// paired that `/*` with a `*/` a thousand characters later, and swallowed the
// real code in between. A guard whose instrument silently deletes what it is
// meant to inspect is the failure this repo keeps re-learning, and this time it
// was mine, shipped.
//
// NO STRIPPING NOW. A declaration begins a line; a mention inside a comment has
// `//` or prose before it on that line. Line-anchored matching needs no parser
// and cannot delete anything. Verified against the real tree: it finds exactly
// one LS_CUSTOMS declarer, matches an indented declaration, and does not match
// `// see LS_CUSTOMS in customEventStore`.
const SRC = fs.readFileSync(POOL, 'utf8');

describe('one owner for the created-events bucket', () => {
  test('(premise) the store owns a non-empty key', () => {
    // Without this, every assertion below passes over an empty string.
    expect(typeof LS_CUSTOMS).toBe('string');
    expect(LS_CUSTOMS.length).toBeGreaterThan(0);
  });

  test('THE GUARD: eventPool re-exports the key and does not declare one', () => {
    expect(SRC).toMatch(/^\s*export\s*\{[^}]*\bLS_CUSTOMS\b[^}]*\}\s*from\s*['"]@app\/lib\/customEventStore['"]/m);
    // The half that actually catches a regression — a fresh declaration.
    expect(SRC).not.toMatch(/^\s*export\s+(?:const|let|var)\s+LS_CUSTOMS\b/m);
  });

  test('AND NO FILE RESTATES THE LITERAL AS ITS OWN CONSTANT', () => {
    // A second `const X = 'ngw-hostv2-custom-events'` anywhere is the same
    // defect wearing a different name. AdminConsole.jsx passes the literal
    // INLINE to a reader (deliberately, and pinned by its own test) — that is a
    // use, not a second owner, so only declarations are counted here.
    const walk = (dir, out = []) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (!/node_modules|__tests__|build|dist/.test(p)) walk(p, out); }
        else if (/\.(js|jsx|mjs)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) out.push(p);
      }
      return out;
    };
    const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'hostv2', 'src'))];
    // ANCHORED TO A LINE START. eventPool.js now carries a sentence that QUOTES
    // the old declaration — "This line used to read `export const LS_CUSTOMS =
    // '…'`" — and an unanchored match reads that prose as a declarer. It did,
    // on the first run. A declaration begins its line; a quotation of one does
    // not.
    const re = new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+\\w+\\s*=\\s*['"]${LS_CUSTOMS}['"]`, 'm');
    const declarers = files.filter((f) => re.test(fs.readFileSync(f, 'utf8')))
      .map((f) => f.replace(ROOT + path.sep, ''));
    expect(declarers).toEqual(['src/lib/customEventStore.js']);
  });

  test('NEGATIVE CONTROL: the pattern would catch a second declaration', () => {
    // A guard that cannot fail is not a guard. This proves the regex above
    // actually matches the shape it is written to reject, without needing to
    // edit a real file to find out.
    const relapse = `export const LS_CUSTOMS = '${LS_CUSTOMS}';`;
    expect(relapse).toMatch(/^\s*export\s+(?:const|let|var)\s+LS_CUSTOMS\b/m);
    // …and a mention inside a comment is NOT a declaration. This is the case the
    // stripper existed to handle, now handled by the anchor instead.
    expect(`// was: export const LS_CUSTOMS = '${LS_CUSTOMS}'`).not.toMatch(/^\s*export\s+(?:const|let|var)\s+LS_CUSTOMS\b/m);
    // The literal-declaration pattern, in the exact anchored form the scan uses.
    const scanRe = new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+\\w+\\s*=\\s*['"]${LS_CUSTOMS}['"]`, 'm');
    expect(relapse).toMatch(scanRe);
    expect(`  const LS = '${LS_CUSTOMS}';`).toMatch(scanRe);                       // indented, unexported
    expect(`// used to read: const LS = '${LS_CUSTOMS}'`).not.toMatch(scanRe);     // prose
    expect(` * const LS = '${LS_CUSTOMS}'`).not.toMatch(scanRe);                   // block-comment prose
  });

  test('the shell still reaches the key through eventPool', () => {
    // The re-export exists so consumers need no edit. If someone "tidies" it by
    // deleting the re-export and pointing HostShellV2 at the store directly,
    // that is a different change and this says so.
    const shell = fs.readFileSync(path.join(ROOT, 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8');
    expect(shell).toMatch(/^\s*import\s*\{[^}]*\bLS_CUSTOMS\b[^}]*\}\s*from\s*['"]\.\/eventPool\.js['"]/m);
  });
});
