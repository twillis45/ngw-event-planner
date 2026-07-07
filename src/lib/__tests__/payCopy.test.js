// PAY-COPY-1 — money copy contract: explicit fields only, ask-framed, never
// a status claim, never collections tone.

import { draftVendorPaymentReminder } from '../doItForMe';
import { buildVendorBriefPayload } from '../vendorBrief';

const BAN = /\boverdue\b|\bunpaid\b|you are paid|was paid|is paid\b|collections|legal|final notice|immediately|must pay/i;
const ev = { id: 'e-pc', name: 'PC Retirement', budget: [{ id: 'b', category: 'Food', budgeted: 900 }], guests: [{ id: 'g1', name: 'Private Guest' }] };
const vend = (over = {}) => ({ id: 'v-pc', name: 'Capital Rotisserie Catering', category: 'Catering', ...over });

test('1 · missing payment fields → confirm-the-details ask, never a claim', () => {
  const d = draftVendorPaymentReminder(ev, vend());
  expect(d.body).toContain('Can you confirm:');
  expect(d.body).toContain('- Any deposit or balance due');
  expect(d.body).not.toMatch(/Our notes show/);
});

test('2+3 · explicit pending deposit + due date → notes-show reminder', () => {
  const d = draftVendorPaymentReminder(ev, vend({ status: 'Contracted', contractSigned: true, depositAmt: 500, depositPaid: false, payDueDate: '2026-08-01' }));
  expect(d.body).toContain('Our notes show a deposit of $500');
  expect(d.body).toMatch(/due by .*2026|due by .*August/);
  expect(d.body).toContain('Can you confirm this is still correct');
});

test('explicit remaining balance (cost minus paid deposit)', () => {
  const d = draftVendorPaymentReminder(ev, vend({ status: 'Confirmed', cost: 1800, depositAmt: 500, depositPaid: true, balancePaid: false }));
  expect(d.body).toContain('Our notes show a remaining balance of $1,300');
});

test('4 · estimate-only / unbooked vendor NEVER produces owed language', () => {
  const quoted = draftVendorPaymentReminder(ev, vend({ status: 'Quoted', cost: 1800, depositAmt: 500, depositPaid: false }));
  expect(quoted.body).not.toMatch(/Our notes show/);
  expect(quoted.body).toContain('Can you confirm:');
  const considering = draftVendorPaymentReminder(ev, vend({ status: 'Considering', cost: 900 }));
  expect(considering.body).not.toMatch(/\$\d/);
});

test('5+6 · never says overdue/paid/unpaid or collections language, any shape', () => {
  const shapes = [vend(), vend({ status: 'Contracted', contractSigned: true, depositAmt: 500, payDueDate: '2020-01-01' }),
    vend({ status: 'Confirmed', cost: 1800, depositAmt: 500, depositPaid: true }), vend({ name: '' })];
  shapes.forEach((v) => {
    const d = draftVendorPaymentReminder(ev, v);
    expect(d.subject + ' ' + d.body).not.toMatch(BAN);
  });
});

test('7+8 · never includes budget totals, other vendors, or guest names', () => {
  const withOthers = { ...ev, vendors: [vend(), { id: 'v2', name: 'Beltway Sound Collective', cost: 900 }], totalBudget: 5000 };
  const d = draftVendorPaymentReminder(withOthers, vend({ status: 'Contracted', contractSigned: true, depositAmt: 500 }));
  const all = d.subject + ' ' + d.body;
  expect(all).not.toContain('5,000');
  expect(all).not.toContain('Beltway Sound Collective');
  expect(all).not.toContain('Private Guest');
  expect(all).not.toMatch(/budget/i);
});

test('10 · public vendor brief payload never contains payment draft text', () => {
  const v = vend({ status: 'Contracted', contractSigned: true, depositAmt: 500, depositPaid: false });
  const e = { ...ev, vendors: [v] };
  const payload = JSON.stringify(buildVendorBriefPayload(v, e, [], null));
  expect(payload).not.toContain('confirming payment details');
  expect(payload).not.toContain('Our notes show');
});
