import { setVenue } from '@app/lib/venueFor';
import { appendDecision, makeRecord } from '@app/lib/decisionMemory';
import { draftVendorOutreach } from '@app/lib/doItForMe';

// URL opt-in only. No sticky experiment assignment; removing the flag rolls back.
export function venueWorkspaceEnabled(search = '') {
  return new URLSearchParams(search).get('venueWorkspace') === '1';
}

export function venueSelectionPatch(event, option, rationale = '', now = new Date().toISOString()) {
  if (!option?.name?.trim()) throw new Error('Choose a named place first.');
  const record = makeRecord({ eventId: event.id, subjectId: 'venue', subjectLabel: 'Venue',
    decision: option.name, rationale }, now);
  return {
    // A different place must not inherit the previous place's street address.
    venueAddress: '', venueStreet: '', venueZip: '', venueCity: '', venueState: '',
    ...setVenue(event, { name: option.name, locationText: option.location }),
    ...(rationale.trim() ? { decisionMemory: appendDecision(event, record).decisionMemory } : {}),
  };
}

export function venueInquiry(event, option, profile) {
  // A shortlist is not the event location. Withhold the current venue when asking
  // another place for availability, while preserving the engine's provenance gates.
  return draftVendorOutreach({ ...event, venue: '', venueAddress: '', venueStreet: '' },
    { name: option.name, category: 'a venue' }, profile);
}
