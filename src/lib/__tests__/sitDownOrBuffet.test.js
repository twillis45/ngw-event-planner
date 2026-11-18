// SIT-DOWN OR BUFFET (owner, 11/18/2026). One reader for the answer: Friendsgiving
// and Thanksgiving Hosting ask `service_style`; Dinner Party's existing `format`
// is read rather than asked twice; other playbooks' unrelated `format` is not.
import { serviceStyle } from '../serviceStyle';
import { getPlaybook } from '../playbooks';

const ev = (type, foodChoices = {}) => ({ id: 's', type, guestEstimate: 15, guests: [], foodChoices });

test('Friendsgiving asks it, and defaults to the buffet its run of show already uses', () => {
  expect(getPlaybook('Friendsgiving').decisions.some((d) => d.id === 'service_style')).toBe(true);
  expect(serviceStyle(ev('Friendsgiving'))).toBe('buffet');
  expect(serviceStyle(ev('Friendsgiving', { service_style: 'Sit-down — everyone at the table' }))).toBe('seated');
});

test('Thanksgiving Hosting asks it, and defaults to sit-down', () => {
  expect(serviceStyle(ev('Thanksgiving Hosting'))).toBe('seated');
  expect(serviceStyle(ev('Thanksgiving Hosting', { service_style: 'Buffet — fill a plate, sit where there is room' }))).toBe('buffet');
});

test('Dinner Party: its existing format answer is read, not asked twice', () => {
  expect(getPlaybook('Dinner Party').decisions.some((d) => d.id === 'service_style')).toBe(false);
  expect(serviceStyle(ev('Dinner Party', { format: 'Buffet' }))).toBe('buffet');
  expect(serviceStyle(ev('Dinner Party', { format: 'Plated 3-course' }))).toBe('seated');
});

test('another playbook\'s unrelated format means nothing here', () => {
  expect(serviceStyle(ev('Engagement Party', { format: 'Grazing station' }))).toBeNull();
  expect(serviceStyle(ev('Conference', { format: 'Hybrid' }))).toBeNull();
  expect(serviceStyle(ev('Birthday'))).toBeNull();
});
