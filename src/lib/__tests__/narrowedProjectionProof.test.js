// ─── A NARROWED PROJECTION MUST CARRY EVERY KEY ITS READERS ASK FOR ─────────
//
// Self-inflicted, caught live 2026-07-29. HostShellV2 builds a small `money`
// object out of the full hostSpending result:
//
//   const money = { planned: spend.total, committed: spend.committed, ... }
//
// A later fix read `money.vendorOwed` and `money.lodgingCommitted`. Those keys
// live on `spend`, not on `money` — so both read `undefined`, `Math.round(0)`
// gated the rows out, and the "where it's going" breakdown silently showed
// ~$33k of an $87,639 headline. Nothing failed: no crash, no test, no compile
// error. It shipped and was reported as done.
//
// That is the whole trap. A narrowed projection LOOKS like the object it came
// from, so reading a missing key is invisible at every layer except the pixel.
// This gate compares the literal's own key set against every `money.<key>` read
// in the file, so the next absent key is a red suite instead of a blank row.
//
// To satisfy it, add the key to the literal (or read `spend` directly) — never
// by deleting the read.
const fs = require('fs');
const path = require('path');

const SHELL = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');

describe('narrowed projections carry the keys their readers ask for', () => {
  const raw = fs.readFileSync(SHELL, 'utf8');
  // Scan CODE only. The comments in HostShellV2 quote the exact broken reads
  // (`money.vendorOwed`) as the record of what went wrong — that prose is the
  // reason the trap stays understood, so the gate must read past it rather
  // than force the explanation to be deleted.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  // The `money` literal, as written. Matched to its closing brace on one line —
  // if it is ever reformatted across lines this throws, which is the honest
  // outcome: the gate must not silently pass on a shape it can no longer read.
  const decl = src.match(/const money = \{([^}]*)\};/);

  it('finds the money projection it is meant to police', () => {
    expect(decl).not.toBeNull();
  });

  it('every money.<key> read in HostShellV2 exists on the literal', () => {
    const declared = new Set(
      decl[1].split(',').map(part => (part.split(':')[0] || '').trim()).filter(Boolean)
    );
    expect(declared.size).toBeGreaterThan(3); // sanity: we really parsed keys

    const read = new Set();
    const re = /\bmoney\.([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(src))) read.add(m[1]);
    expect(read.size).toBeGreaterThan(0);

    const missing = [...read].filter(k => !declared.has(k));
    expect(missing).toEqual([]);
  });

  it('the two keys that caused the live bug are read from spend, not money', () => {
    // Belt and braces: these specific reads are the ones that shipped broken.
    expect(src).not.toMatch(/money\.vendorOwed/);
    expect(src).not.toMatch(/money\.lodgingCommitted/);
    expect(src).toMatch(/spend\.vendorOwed/);
    expect(src).toMatch(/spend\.lodgingCommitted/);
  });
});
