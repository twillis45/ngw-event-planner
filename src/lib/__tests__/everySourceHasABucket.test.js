// "HOW ARE WE DEALING WITH THE OTHER FIELDS WITH NO SOURCES RECORDED?"
// (host, 2026-09-30). Measured while answering, and the answer was wrong in
// the opposite direction from the question: fields that DID have a recorded
// source were the ones disappearing.
//
// The combined paste path introduced a third provenance — 'looked-up', the
// listing itself, as distinct from 'read', the results page the host pasted.
// lodgingProvenance still bucketed into read / typed / unknown, so a
// looked-up row counted in none of them, and the cockpit's own filter
// (read-or-typed) dropped it from the table. An option whose beds and sleeps
// came from the lookup showed a two-row provenance table AND a zero
// "not recorded" count: the two facts were not flagged as unsourced, they
// were not rendered at all.
//
// The rule this locks: every row lands in exactly one bucket, the buckets sum
// to the rows, and `unknown` means unrecorded — never "recorded in a way this
// function was not updated for". A fourth provenance added later fails here
// rather than vanishing.
import { lodgingProvenance } from '../lodgingIntel';

const OPTION = {
  label: 'Casa Cielo',
  beds: 12,
  sleeps: 12,
  totalPrice: 2660,
  fees: 180,
  sources: {
    label: 'read',          // the results page the host pasted
    totalPrice: 'read',
    beds: 'looked-up',      // the listing itself
    sleeps: 'looked-up',
    // `fees` deliberately has NO entry — a genuinely unrecorded field.
  },
};

describe('every provenance a field can carry has a bucket', () => {
  const pv = lodgingProvenance(OPTION);

  test('looked-up is counted, and counted as itself', () => {
    expect(pv.lookedUp).toBe(2);
  });

  test('unknown means UNRECORDED — it read 0 while two rows were invisible', () => {
    expect(pv.unknown).toBe(1);          // fees, and only fees
    expect(pv.rows.find((r) => r.field === 'fees').source).toBe('unknown');
  });

  test('the buckets account for every row — nothing falls between them', () => {
    expect(pv.read + pv.typed + pv.lookedUp + pv.unknown).toBe(pv.rows.length);
  });

  test('a provenance nobody has taught this function about lands in unknown, loudly',
    () => {
      // The failure mode being prevented: a new source string added upstream
      // and silently dropped. It must show up as unrecorded — visible and
      // wrong — rather than as nothing at all.
      const odd = lodgingProvenance({ label: 'X', sources: { label: 'divined' } });
      expect(odd.unknown).toBe(1);
      expect(odd.read + odd.typed + odd.lookedUp + odd.unknown).toBe(odd.rows.length);
    });

  test('the cockpit shows a row for every recorded source', () => {
    // The filter the surface applies, asserted here so the two cannot drift
    // apart again — that drift is the whole defect.
    const SOURCED = ['read', 'typed', 'looked-up'];
    const shown = pv.rows.filter((r) => SOURCED.includes(r.source)).map((r) => r.field);
    expect(shown.sort()).toEqual(['beds', 'label', 'sleeps', 'totalPrice']);
  });
});
