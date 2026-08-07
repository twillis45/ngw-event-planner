/**
 * Two wide-canvas defects, gated at the SOURCE.
 *
 * Both were found by measuring the live DOM, and my first three attempts to gate
 * them in Playwright all passed vacuously — the first checked a surface that has
 * no .navrows on it, the second could not reach the data sheet's opener, and the
 * third walked document.styleSheets and found zero matching rules, so an
 * "expected []" assertion was trivially satisfied. A rule that must agree with
 * another rule is a property of the STYLESHEET, so that is where it is checked.
 */
const fs = require('fs');
const path = require('path');

// Comments are stripped once, up front: this sheet's comments are long and
// contain braces and selector-shaped text, which both confused the brace
// matching and leaked prose into failure output as if it were a selector.
const CSS = fs
  .readFileSync(path.join(__dirname, '../../../hostv2/src/styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Split the sheet into top-level @media blocks, keeping each block's condition. */
function mediaBlocks(css) {
  const out = [];
  const re = /@media([^{]+)\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    out.push({ cond: m[1].trim(), body: css.slice(re.lastIndex, i - 1) });
  }
  return out;
}

/** Every declaration block whose selector matches `sel`, as raw text. */
function rulesFor(body, sel) {
  const out = [];
  const re = new RegExp(`([^{}]*${sel}[^{}]*)\\{([^{}]*)\\}`, 'g');
  let m;
  while ((m = re.exec(body))) out.push({ selector: m[1].trim(), decls: m[2] });
  return out;
}

/** A declaration's value, comments stripped, last-wins. */
function decl(decls, prop) {
  const clean = decls.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]+)`, 'g');
  let m, v = null;
  while ((m = re.exec(clean))) v = m[1].trim();
  return v;
}

describe('wide-canvas stylesheet invariants', () => {
  test('a multi-column .navrows rule is never keyed on the breakpoint alone', () => {
    // The breakpoint says how wide the WINDOW is. It says nothing about how wide
    // the SURFACE is: at desktop/wide every surface except command/food/data is
    // still a 393px phone column. Laying 3-4 nav columns inside that gave 104px
    // tracks at 1440 and 73px at 1920.
    //
    // NOTE ON HOW THIS SCANS: the app carries its breakpoint as a `data-bp`
    // ATTRIBUTE, not an @media query. An earlier version of this test only
    // walked @media blocks, so it saw none of these rules and passed against a
    // deliberately re-broken sheet. It scans the whole sheet now, and the
    // sanity assertion below fails if it ever stops finding them.
    const seen = [];
    const offenders = [];
    for (const r of rulesFor(CSS, '\\.navrows')) {
      if (!/data-bp="(desktop|wide)"/.test(r.selector)) continue;
      const cols = decl(r.decls, 'grid-template-columns');
      if (!cols) continue;
      const multi = /repeat\(\s*[2-9]/.test(cols) || (cols.match(/1fr|minmax/g) || []).length > 1;
      if (!multi) continue;
      seen.push(r.selector);
      if (!/stagewrap--responsive-/.test(r.selector)) offenders.push({ selector: r.selector, cols });
    }
    // Guard against a vacuous pass: if the rules vanish or get renamed, say so.
    expect(seen.length).toBeGreaterThan(0);
    expect({ ungatedWideNavRules: offenders }).toEqual({ ungatedWideNavRules: [] });
  });

  test('the data tier and the command tier claim window height identically', () => {
    // A data sheet was 540px tall in a 900px window while its own content
    // scrolled internally — 340px of window left empty below it. The command
    // tier had already solved this; the data tier carried the old
    // `height:auto; min-height:60vh`. The two must not drift again, so this
    // compares them rather than hard-coding either.
    const read = (sel) => {
      let found = null;
      for (const { cond, body } of mediaBlocks(CSS)) {
        if (!/min-width/.test(cond)) continue;
        for (const r of rulesFor(body, sel)) {
          const h = decl(r.decls, 'height');
          if (h) found = h;
        }
      }
      return found;
    };
    const command = read('\\.stagewrap--responsive-command \\.app');
    const data = read('\\.stagewrap--responsive-data \\.app');
    // Guard against the vacuous pass that bit the three earlier versions: if the
    // selectors stop matching, this test must fail loudly, not report agreement.
    expect(command).toBeTruthy();
    expect(data).toBeTruthy();
    expect({ dataTierHeight: data }).toEqual({ dataTierHeight: command });
  });
});
