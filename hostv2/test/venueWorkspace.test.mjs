import { describe, it, expect } from 'vitest';
import { venueWorkspaceEnabled, venueSelectionPatch, venueInquiry } from '../src/venueWorkspace.js';

describe('venue workspace boundary', () => {
  it('is off unless explicitly opted in, including malformed values', () => {
    for (const search of ['', '?venueWorkspace=0', '?venueWorkspace=true']) expect(venueWorkspaceEnabled(search)).toBe(false);
    expect(venueWorkspaceEnabled('?theme=light&venueWorkspace=1')).toBe(true);
  });
  it('uses canonical venue fields, drops stale street, and preserves host reasoning', () => {
    const event = { id: 'a', venue: 'Old hall', venueAddress: '1 Old St', decisionMemory: [] };
    const patch = venueSelectionPatch(event, { name: 'New hall', location: 'Annapolis, MD' }, 'Step-free entrance', '2026-10-18T12:00:00Z');
    expect(patch).toMatchObject({ venue: 'New hall', venueCity: 'Annapolis', venueState: 'MD', venueAddress: '' });
    expect(patch.decisionMemory[0]).toMatchObject({ subjectId: 'venue', rationale: 'Step-free entrance', decision: 'New hall' });
    expect(event.venue).toBe('Old hall');
    expect(patch).not.toHaveProperty('vendors');
    expect(patch).not.toHaveProperty('booked');
  });
  it('does not manufacture reasoning or accept an unnamed place', () => {
    expect(venueSelectionPatch({ id: 'a' }, { name: 'Hall' })).not.toHaveProperty('decisionMemory');
    expect(() => venueSelectionPatch({}, { name: ' ' })).toThrow();
  });
  it('drafts for the candidate without claiming the old venue or derived guest count', () => {
    const draft = venueInquiry({ type: 'Birthday', venue: 'Old booked hall', guestEstimate: 40, guestCountSource: 'playbook-typical' }, { name: 'New hall' }, { name: 'Alex' });
    expect(draft.body).toContain('Hi New hall');
    expect(draft.body).toContain('Are you available');
    expect(draft.body).not.toContain('Old booked hall');
    expect(draft.body).not.toContain('40 guests');
  });
});
