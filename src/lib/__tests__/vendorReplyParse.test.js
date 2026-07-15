import {
  coerceValue,
  buildReplyDiff,
  buildPatch,
  replyLogEntry,
  FIELDS,
  EXTRACT_KEYS,
} from '../vendorReplyParse';

describe('coerceValue', () => {
  test('money strips $ and commas', () => {
    expect(coerceValue('money', '$2,400.00')).toBe(2400);
    expect(coerceValue('money', 2400)).toBe(2400);
  });
  test('int rounds and strips units', () => {
    expect(coerceValue('int', '85 guests')).toBe(85);
    expect(coerceValue('int', '85.4')).toBe(85);
  });
  test('non-numeric money/int → null', () => {
    expect(coerceValue('money', 'TBD')).toBeNull();
    expect(coerceValue('int', '')).toBeNull();
  });
  test('bool is only ever true or null, never false', () => {
    expect(coerceValue('bool', true)).toBe(true);
    expect(coerceValue('bool', 'received')).toBe(true);
    expect(coerceValue('bool', 'paid')).toBe(true);
    expect(coerceValue('bool', false)).toBeNull();
    expect(coerceValue('bool', 'not yet')).toBeNull();
  });
  test('blank/absent → null', () => {
    expect(coerceValue('text', '   ')).toBeNull();
    expect(coerceValue('time', null)).toBeNull();
    expect(coerceValue('text', undefined)).toBeNull();
  });
});

describe('buildReplyDiff', () => {
  test('only surfaces fields that actually change', () => {
    const vendor = { arrivalTime: '2:00 PM', cost: 2400 };
    const extracted = {
      arrival_time: { value: '2:00 PM', evidence: 'we arrive at 2' }, // unchanged
      cost: { value: '$3,000', evidence: 'total is 3000' },           // changed
    };
    const rows = buildReplyDiff(extracted, vendor);
    expect(rows.map(r => r.field)).toEqual(['cost']);
    expect(rows[0].proposed).toBe(3000);
    expect(rows[0].current).toBe(2400);
    expect(rows[0].evidence).toBe('total is 3000');
  });

  test('bool never downgrades an already-true flag', () => {
    const vendor = { depositPaid: true };
    const extracted = { deposit_paid: { value: true } };
    expect(buildReplyDiff(extracted, vendor)).toEqual([]);
  });

  test('bool sets a flag that was not yet true', () => {
    const vendor = {};
    const extracted = { deposit_paid: { value: 'received', evidence: 'deposit received' } };
    const rows = buildReplyDiff(extracted, vendor);
    expect(rows).toHaveLength(1);
    expect(rows[0].field).toBe('depositPaid');
    expect(rows[0].proposed).toBe(true);
  });

  test('unstated (null) fields propose nothing', () => {
    const vendor = {};
    const extracted = { arrival_time: { value: null }, cost: { value: '' } };
    expect(buildReplyDiff(extracted, vendor)).toEqual([]);
  });

  test('ignores keys outside the shared schema', () => {
    const rows = buildReplyDiff({ made_up_field: { value: 'x' } }, {});
    expect(rows).toEqual([]);
  });

  test('accepts a bare value (no {value} wrapper)', () => {
    const rows = buildReplyDiff({ final_guest_count: '85' }, {});
    expect(rows[0].field).toBe('guestCount');
    expect(rows[0].proposed).toBe(85);
  });

  test('day-of contact maps to the onSite* fields VendorConfirmationNote writes', () => {
    const rows = buildReplyDiff({ day_of_contact_name: { value: 'Dana' }, day_of_phone: { value: '301-555-0134' } }, {});
    expect(rows.map(r => r.field).sort()).toEqual(['onSiteContactName', 'onSitePhone']);
  });
});

describe('buildPatch', () => {
  test('includes only accepted rows', () => {
    const rows = [
      { field: 'cost', proposed: 3000, accepted: true },
      { field: 'depositPaid', proposed: true, accepted: false },
    ];
    expect(buildPatch(rows)).toEqual({ cost: 3000 });
  });
});

describe('replyLogEntry', () => {
  test('records what was applied, honestly labeled', () => {
    const rows = [{ label: 'Total cost', type: 'money', proposed: 3000, accepted: true }];
    const entry = replyLogEntry(rows);
    expect(entry).toMatch(/AI-extracted, reviewed/);
    expect(entry).toMatch(/Total cost: \$3000/);
  });
  test('null when nothing accepted', () => {
    expect(replyLogEntry([{ accepted: false }])).toBeNull();
  });
});

describe('schema parity', () => {
  test('EXTRACT_KEYS matches FIELDS keys and is unique', () => {
    expect(EXTRACT_KEYS).toEqual(FIELDS.map(f => f.key));
    expect(new Set(EXTRACT_KEYS).size).toBe(EXTRACT_KEYS.length);
  });
});
