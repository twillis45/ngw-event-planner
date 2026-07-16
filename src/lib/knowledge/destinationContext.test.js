import { isGroundedDestination, destinationContextFor, DESTINATION_SOURCES } from './destinationContext';
import { playbookDecisionBoard } from '../playbooks/index';

describe('destination grounding', () => {
  test('the groundable travel calls carry a grounded context', () => {
    ['dest_health', 'dest_transport', 'dest_lodging'].forEach((id) => {
      const c = destinationContextFor(id);
      expect(isGroundedDestination(c)).toBe(true);
      c.sources.forEach((s) => expect(DESTINATION_SOURCES[s]).toBeTruthy());
    });
  });
  test('a fact-gathering call (travelmix) is NOT grounded — honest, not forced', () => {
    expect(destinationContextFor('dest_travelmix')).toBeNull();
  });
  test('the board attaches destinationGrounded on a destination event', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Anniversary', date: '2027-06-01', guestEstimate: 40, isDestination: true }, '2027-01-01');
    const rows = [...(b.open || []), ...(b.locked || []), ...(b.deferred || [])];
    const health = rows.find((r) => r.id === 'dest_health');
    expect(health).toBeTruthy();
    expect(health.destinationGrounded).toBe(true);
    expect(health.destinationContext.sources).toContain('cdc-altitude');
  });
});
