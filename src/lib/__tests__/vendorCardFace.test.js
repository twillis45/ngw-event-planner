// ─── THE VENDOR CARD'S COLLAPSED FACE ───────────────────────────────────────
//
// Board ruling 2026-08-21 (8 seats, docs/audits/2026-08-21_VENDORS_SHEET_RULING.md).
// The host's report — "I thought we redesigned people you're hiring to match
// the other sections?" — was NOT a request to rebuild the accordion (the sheet
// already is one). It was that the COLLAPSED FACE carried four stacked bands
// where every restyled sheet shows one line, and that amber was the chip
// DEFAULT rather than the exception: one card could show four amber marks,
// nine vendors ~20, spending the whole colour budget on resting state.
//
// This gates the three clauses that fixed it. Each assertion is written so the
// regression it guards FAILS here rather than being noticed months later on a
// host's screen.
import fs from 'fs';
import path from 'path';

const SHELL = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8');

// The card's collapsed face is everything between the card open and the
// `.vc-more` fold. Controls below the fold are fine; controls ON the face are
// exactly what the ruling moved.
const FACE = (() => {
  const start = SHELL.indexOf("className={'vcard'");
  const end = SHELL.indexOf('<div className="vc-more"', start);
  return SHELL.slice(start, end);
})();

describe('clause 2 — the collapsed face is a row, not a stack of bands', () => {
  test('the face exists and is bounded by the fold', () => {
    expect(FACE.length).toBeGreaterThan(200);
    expect(SHELL.indexOf('<div className="vc-more"')).toBeGreaterThan(SHELL.indexOf("className={'vcard'"));
  });

  test('the STATUS PICKER is below the fold, not on the face', () => {
    expect(FACE).not.toMatch(/vc-statuspick/);
    expect(SHELL).toMatch(/vc-statuspick/);          // it still exists…
    const more = SHELL.slice(SHELL.indexOf('<div className="vc-more"'));
    expect(more).toMatch(/vc-statuspick/);            // …below the fold
  });

  test('the CONTACT BAND (log button + sentence + ledger chip) is below the fold', () => {
    expect(FACE).not.toMatch(/logVendorContact/);
    expect(FACE).not.toMatch(/No record of reaching out yet/);
    const more = SHELL.slice(SHELL.indexOf('<div className="vc-more"'));
    expect(more).toMatch(/logVendorContact/);
    expect(more).toMatch(/No record of reaching out yet/);
  });

  test('the status DISCLOSURE control stays on the face — it is the one affordance', () => {
    // Norman seat: the pill is honest (aria-haspopup + caret) and is how the
    // picker is discoverable at all. Moving it would strand the picker.
    expect(FACE).toMatch(/vc-pill/);
    expect(FACE).toMatch(/aria-haspopup/);
  });
});

describe('clause 3 — one chip, ranked by time-to-consequence', () => {
  // The window runs from the block's own marker to the END of its render,
  // not a fixed character count. It was `i + 2400`, and adding four lines of
  // comment above the span pushed the thing being counted outside the window
  // -- the test went red reporting zero chips while the markup was correct.
  // A slice length is a magic number that silently decides what a test can
  // see; the closing `</div>` of the chip row is a real boundary.
  const CHIP = (() => {
    const i = FACE.indexOf('ONE CHIP, RANKED');
    if (i < 0) return '';
    const rest = FACE.slice(i);
    const end = rest.indexOf('vc-chips');
    // From the marker through a generous tail past the wrapper, so the span
    // and its className are always inside it however the comments grow.
    return end < 0 ? rest.slice(0, 4000) : rest.slice(0, end + 1200);
  })();

  test('the ranked selector exists on the face', () => {
    expect(CHIP).not.toBe('');
  });

  test('it renders AT MOST ONE chip — the old stack is gone', () => {
    // The defect shape: four sibling <span className="vc-chip"> in one row.
    // COUNT BOTH QUOTE STYLES. The first cut of this matched only
    // `className={'vc-chip` / `className='vc-chip`, so the red-proof (which
    // reintroduced the ORIGINAL double-quoted markup) stayed green — a gate
    // that could not fail on the very defect it was written for.
    // …and exclude the `vc-chips` WRAPPER, which the widened pattern also
    // matched (prefix collision). Boundary: vc-chip not followed by `s`.
    const spans = (CHIP.match(/className=(\{?['"])vc-chip(?!s)/g) || []).length;
    expect(spans).toBe(1);
  });

  test('the rank is what they told us → silence → worry → paperwork', () => {
    const order = ['They flagged something', 'Silent ', 'chipify(worry)', 'Insurance still needed'];
    let at = -1;
    for (const token of order) {
      const i = CHIP.indexOf(token);
      expect(i).toBeGreaterThan(at);
      at = i;
    }
  });

  test('the insurance chip STATES ITS REASON (UX_02: a colour names its cause)', () => {
    // Was a bare noun, "Insurance", amber with no consequence attached.
    expect(CHIP).toMatch(/Insurance still needed/);
  });

  test('a settled vendor shows no chip at all (clause 5 fold)', () => {
    expect(CHIP).toMatch(/if \(settled\) return null/);
  });

  test('the fold and the chip selector read the SAME definition of settled', () => {
    // This replaced an assertion on the literal expression
    // `const settled = good && !worry && !coiAct && ...`, which pinned a
    // COPY of the rule. Clause 5 then needed the same rule to decide which
    // cards fold, and two copies of a predicate is how a card ends up folded
    // away while still holding an amber chip nobody can see.
    //
    // Pinning the shared helper instead is the stronger guarantee: it is the
    // thing that must stay true, where the literal was only how it happened
    // to be written.
    expect(CHIP).toMatch(/const settled = vendorSettled\(v\)/);
    // Against SHELL, not FACE: FACE is a slice of one card, and both the
    // helper and the partition live outside it. Scoping a source assertion to
    // the wrong window is how a test reports absence for something present.
    expect(SHELL).toMatch(/const vendorSettled = useCallback/);
    // ...and the fold partitions on that same helper, not on its own copy.
    expect(SHELL).toMatch(/filter\(v => !vendorSettled\(v\)\)/);
    expect(SHELL).toMatch(/filter\(v => vendorSettled\(v\)\)/);
  });
});

describe('the honesty rails the ruling froze', () => {
  test("contactState's three distinct sentences survive, unmerged", () => {
    expect(SHELL).toMatch(/No record of reaching out yet/);
    expect(SHELL).toMatch(/They came back to you/);
    expect(SHELL).toMatch(/haven’t heard back/);
  });

  test('the ledger-beats-sentence rule survives the move', () => {
    expect(SHELL).toMatch(/\(vSend \? '' : 'No record of reaching out yet\.'\)/);
  });

  test('attested vs verified is still the render fork', () => {
    expect(SHELL).toMatch(/isVerifiedState\(vSend\)/);
  });
});
