// Audit 2, lane E P2-3: a friend on the vendor list as "Vida Haynes (day-of
// helper)" under the category "Helper" read only "Helper". The server's helper
// page reads the same rule (backend helper_link.py helper_role).
import { deriveHelperResponsibilities, helperRoleOf } from '../helperResponsibility';

test('a generic category gives way to the role in the name', () => {
  expect(helperRoleOf({ name: 'Vida Haynes (day-of helper)', category: 'Helper' })).toBe('Day-of helper');
  expect(helperRoleOf({ name: 'Sam Roe', category: 'Photography' })).toBe('Photography');
  expect(helperRoleOf({ name: 'Sam Roe', category: 'Helper' })).toBe('Helper');
  expect(helperRoleOf({ name: 'Sam Roe' })).toBe('Helping out');
});

test('the host sees the role on the helper\'s row', () => {
  const ev = { id: 'e', type: 'Birthday', guests: [], vendors: [{ id: 'v9', name: 'Vida Haynes (day-of helper)', category: 'Helper', isInformal: true }] };
  const r = deriveHelperResponsibilities(ev).responsibilities.find((x) => x.itemId === 'v9');
  expect(r.label).toBe('Day-of helper');
});
