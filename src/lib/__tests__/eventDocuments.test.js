// eventDocuments — vendor paperwork ladder contract. Status comes only from
// host/vendor-entered flags (never file contents); a file alone is never
// promoted to "Signed"; attention predicate preserves the legacy tab's exact
// grouping including the in-flight-DocuSign edge.

import {
  vendorHasDocumentSignal,
  vendorDocumentsFor,
  vendorDocumentStatus,
  vendorDocumentNeedsAttention,
  vendorDocumentsNeedingAttention,
} from '../eventDocuments';

const v = (over = {}) => ({ id: 'v1', name: 'Fork & Flower', category: 'Catering', ...over });

test('1 · signed + file on hand → Signed / done; Open file only when a real URL exists', () => {
  const withUrl = vendorDocumentStatus(v({ contractSigned: true, contractUrl: 'https://x/contract.pdf' }));
  expect(withUrl).toEqual({ key: 'signed', label: 'Signed', level: 'done', action: 'Open file' });
  const fileNameOnly = vendorDocumentStatus(v({ contractSigned: true, contractFileName: 'c.pdf' }));
  expect(fileNameOnly.key).toBe('signed');
  expect(fileNameOnly.action).toBeNull(); // no URL to open — no fake affordance
});

test('2 · legacy snake_case contract_signed counts as signed', () => {
  expect(vendorDocumentStatus(v({ contract_signed: true, contractStoragePath: 'p/c.pdf' })).key).toBe('signed');
});

test('3 · signed assertion without any file → still asks for the upload (attention)', () => {
  const s = vendorDocumentStatus(v({ contractSigned: true }));
  expect(s).toEqual({ key: 'needs_upload_signed', label: 'Needs upload', level: 'attention', action: 'Upload signed contract' });
});

test('4 · DocuSign envelope in flight beats "needs signature"; completed envelope does not', () => {
  const inFlight = vendorDocumentStatus(v({ docusignEnvelopeId: 'env1', docusignStatus: 'sent', contractUrl: 'https://x/c.pdf' }));
  expect(inFlight.key).toBe('pending_signature');
  expect(inFlight.label).toBe('Pending signature');
  const completedUnsigned = vendorDocumentStatus(v({ docusignEnvelopeId: 'env1', docusignStatus: 'completed', contractUrl: 'https://x/c.pdf' }));
  expect(completedUnsigned.key).toBe('needs_signature');
});

test('5 · file on hand but not signed → Needs signature; a file is NEVER auto-promoted to signed', () => {
  const s = vendorDocumentStatus(v({ contractUrl: 'https://x/c.pdf' }));
  expect(s).toEqual({ key: 'needs_signature', label: 'Needs signature', level: 'attention', action: 'Request signature' });
});

test('6 · nothing on record → Needs upload / todo (not attention)', () => {
  const s = vendorDocumentStatus(v());
  expect(s).toEqual({ key: 'needs_upload', label: 'Needs upload', level: 'todo', action: 'Upload contract' });
  expect(vendorDocumentNeedsAttention(v())).toBe(false);
});

test('7 · document signal: file fields or a DocuSign envelope, nothing else', () => {
  expect(vendorHasDocumentSignal(v({ contractUrl: 'u' }))).toBe(true);
  expect(vendorHasDocumentSignal(v({ contractFileName: 'f.pdf' }))).toBe(true);
  expect(vendorHasDocumentSignal(v({ contractStoragePath: 'p' }))).toBe(true);
  expect(vendorHasDocumentSignal(v({ docusignEnvelopeId: 'env' }))).toBe(true);
  expect(vendorHasDocumentSignal(v({ contractSigned: true }))).toBe(false); // assertion alone lists nowhere — legacy parity
  expect(vendorHasDocumentSignal(v())).toBe(false);
});

test('8 · vendorDocumentsFor filters an event vendor list in order; tolerates missing arrays', () => {
  const ev = { vendors: [v({ id: 'a', contractUrl: 'u' }), v({ id: 'b' }), v({ id: 'c', docusignEnvelopeId: 'e' })] };
  expect(vendorDocumentsFor(ev).map(x => x.id)).toEqual(['a', 'c']);
  expect(vendorDocumentsFor({})).toEqual([]);
  expect(vendorDocumentsFor(null)).toEqual([]);
});

test('9 · attention grouping: unsigned file, signed-but-fileless, in-flight envelope', () => {
  expect(vendorDocumentNeedsAttention(v({ contractUrl: 'u' }))).toBe(true);
  expect(vendorDocumentNeedsAttention(v({ contractSigned: true }))).toBe(true);
  expect(vendorDocumentNeedsAttention(v({ docusignEnvelopeId: 'e', docusignStatus: 'sent' }))).toBe(true);
  expect(vendorDocumentNeedsAttention(v({ contractSigned: true, contractUrl: 'u' }))).toBe(false);
});

test('10 · legacy-parity edge (test-locked): signed + filed but stale in-flight envelope still flags attention while status reads Signed', () => {
  const stale = v({ contractSigned: true, contractUrl: 'u', docusignEnvelopeId: 'e', docusignStatus: 'sent' });
  expect(vendorDocumentStatus(stale).key).toBe('signed');
  expect(vendorDocumentNeedsAttention(stale)).toBe(true);
});

test('11 · vendorDocumentsNeedingAttention composes list + predicate', () => {
  const ev = { vendors: [
    v({ id: 'ok', contractSigned: true, contractUrl: 'u' }),
    v({ id: 'chase', contractUrl: 'u' }),
    v({ id: 'none' }),
  ] };
  expect(vendorDocumentsNeedingAttention(ev).map(x => x.id)).toEqual(['chase']);
});
