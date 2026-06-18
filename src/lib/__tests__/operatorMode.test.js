// Sprint 57I — Operator Mode. Proves: organization ⇒ operator persona; operator
// VOICE + labels are DISTINCT from host and planner; host + planner are unchanged;
// operator shares confidence (own words) + because (universal); flag-off identity.

import { personaFor, audiencePersona, renderAction, VOICE } from '../nextActionRenderer';
import { labelFor, OPERATOR_LABEL_MAP, HOST_LABEL_MAP } from '../presentationLabels';
import { confidenceFor } from '../confidenceGrammar';

const OP = { audience: 'organization' };
const HOST = { audience: 'self_family' };
const PLAN = { audience: 'client' };
beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('57I persona mapping', () => {
  test('audiencePersona: organization → operator (flag-free)', () => {
    expect(audiencePersona(OP)).toBe('operator');
    expect(audiencePersona(HOST)).toBe('host');
    expect(audiencePersona(PLAN)).toBe('planner');
  });
  test('personaFor honors pi.voice gate: off-switch ⇒ planner identity, default ⇒ operator', () => {
    try { localStorage.setItem('ngw-pi-voice', '0'); } catch {}
    expect(personaFor(OP)).toBe('planner');                 // off-switch ⇒ identity
    try { localStorage.setItem('ngw-pi-voice', '1'); } catch {}
    expect(personaFor(OP)).toBe('operator');
  });
});

describe('57I operator VOICE — distinct from host, no planner entry', () => {
  test('every category that has host also has operator; planner still absent', () => {
    Object.entries(VOICE).forEach(([cat, byPersona]) => {
      expect(byPersona.host).toBeTruthy();
      expect(byPersona.operator).toBeTruthy();             // operator authored
      expect(byPersona.planner).toBeUndefined();           // planner = identity
    });
  });
  test('operator phrasing is business-like, not host-soft', () => {
    const cat = { category: 'caterer', title: 'x', consequence: 'x', primaryCta: 'x' };
    const op = renderAction(cat, 'operator');
    const host = renderAction(cat, 'host');
    expect(op.primaryCta).toBe('Reconcile count');
    expect(host.primaryCta).toBe('Update the count');
    expect(op.consequence).not.toBe(host.consequence);     // distinct voice
    expect(op.title).toMatch(/Confirm the final headcount/);
  });
  test('approval routes for approval (operator) vs "Send it" (host)', () => {
    const a = { category: 'approval' };
    expect(renderAction(a, 'operator').primaryCta).toBe('Route for approval');
    expect(renderAction(a, 'host').primaryCta).toBe('Send it');
  });
  test('planner persona ⇒ identity (engine string unchanged)', () => {
    const cmd = { category: 'caterer', title: 'Confirm catering count', consequence: 'x', primaryCta: 'Open' };
    expect(renderAction(cmd, 'planner')).toBe(cmd);         // same reference = identity
  });
});

describe('57I operator labels — distinct vocabulary', () => {
  beforeEach(() => { try { localStorage.setItem('ngw-pi-labels', '1'); } catch {} });
  test('operator gets business labels; differ from host; planner identity', () => {
    expect(labelFor('Run of Show', OP)).toBe('Event Schedule');
    expect(labelFor('Vendor Risk', OP)).toBe('Vendor Follow-Up');
    expect(labelFor('Capacity', OP)).toBe('Attendance & Supplies');
    expect(labelFor('Reality Check', OP)).toBe('Things To Confirm');
    expect(labelFor('Capacity', HOST)).toBe('Seating & supplies');   // host differs
    expect(labelFor('Capacity', PLAN)).toBe('Capacity');             // planner identity
  });
  test('off-switch ⇒ identity for operator too', () => {
    try { localStorage.setItem('ngw-pi-labels', '0'); } catch {}
    expect(labelFor('Capacity', OP)).toBe('Capacity');
  });
});

describe('57I confidence + because reuse (no new logic)', () => {
  test('operator confidence words are its own (not planner)', () => {
    const noData = { statusLabel: 'AT RISK', note: 'No vendors yet' };
    expect(confidenceFor(noData, 'operator').word).toBe('Not started');
    expect(confidenceFor(noData, 'planner').word).toBe('No data');
    expect(confidenceFor(noData, 'host').word).toBe('Not set yet');
  });
});
