// ─── Incident intelligence proof — sourced, procedural, gated ────────────────
// Locks the host ask (2026-07-28, "someone out of hand / sick on alcohol"):
//   1. every line's source ids resolve in INCIDENT_SOURCES (no orphan claims)
//   2. the FTC/FDA boundary holds: lines are procedural — no diagnosis verbs,
//      no sobriety-judgment, no BAC talk, and the not-sourced list stays out
//      (the unshippable "one hour before" figure)
//   3. conditional lines gate on REAL fields: heat only outdoors, the water
//      watcher only with water + kids around; adults-only suppresses it
//   4. the 911 line carries the real venue address when one exists
const { INCIDENT_SOURCES, incidentPlanFor, resolveIncidentSource } = require('./incidentContext');

const BASE = { id: 'ev-t', type: 'Backyard BBQ', date: '2026-08-08', venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD' };

describe('incident plan', () => {
  test('every line resolves every source id — nothing grounded without provenance', () => {
    const { lines } = incidentPlanFor({ ...BASE, notes: 'pool party' });
    expect(lines.length).toBeGreaterThanOrEqual(6);
    for (const l of lines) {
      expect(Array.isArray(l.sources) && l.sources.length > 0).toBe(true);
      for (const id of l.sources) {
        const src = resolveIncidentSource(id);
        expect(src && src.org && src.url && src.fetched && src.claim).toBeTruthy();
      }
    }
  });

  test('the boundary holds: procedural language only, unshippables stay out', () => {
    const { lines, boundary } = incidentPlanFor({ ...BASE, notes: 'pool' });
    expect(boundary).toMatch(/not medical or legal advice/i);
    const all = lines.map((l) => l.label + ' ' + l.text).join(' ');
    // No diagnosis/assessment posture (FTC MelApp line), no sobriety judgment,
    // and the snippet-only "one hour before" figure never ships.
    expect(all).not.toMatch(/diagnos|assess their|probably fine|\bBAC\b|blood alcohol|one hour before/);
    // The NHTSA "no reliable okay-to-drive judgment" stance is IN, not out.
    expect(all).toMatch(/never the wheel|take their keys/i);
  });

  test('the fire line gates on flame-cooking events and outdoor gatherings', () => {
    const bbq = incidentPlanFor({ ...BASE });
    expect(bbq.lines.some((l) => l.key === 'fire')).toBe(true);
    const indoorDinner = incidentPlanFor({ id: 'x', type: 'Dinner Party', date: '2026-08-08', venue: 'The Hall' });
    expect(indoorDinner.lines.some((l) => l.key === 'fire')).toBe(false);
    const fry = incidentPlanFor({ id: 'y', type: 'Fish Fry', date: '2026-08-08', venue: 'The Hall' });
    expect(fry.lines.some((l) => l.key === 'fire')).toBe(true);
  });

  test('heat line gates on outdoors; water watcher gates on water AND kids', () => {
    const indoor = incidentPlanFor({ ...BASE, venue: 'The Hall', notes: '' });
    expect(indoor.lines.some((l) => l.key === 'heat')).toBe(false);
    expect(indoor.lines.some((l) => l.key === 'water')).toBe(false);
    const pool = incidentPlanFor({ ...BASE, notes: 'pool in the backyard' });
    expect(pool.lines.some((l) => l.key === 'heat')).toBe(true);
    expect(pool.lines.some((l) => l.key === 'water')).toBe(true);
    const adultsOnly = incidentPlanFor({ ...BASE, notes: 'pool in the backyard', kidsPolicy: 'adults_only' });
    expect(adultsOnly.lines.some((l) => l.key === 'water')).toBe(false);
  });

  test('the 911 line speaks the real venue words when the event has them', () => {
    const { lines } = incidentPlanFor(BASE);
    const call = lines.find((l) => l.key === 'call');
    expect(call.text).toMatch(/Annapolis/);
    const bare = incidentPlanFor({ id: 'x', type: 'Birthday', date: '2026-08-08' });
    expect(bare.lines.find((l) => l.key === 'call').text).toMatch(/Know the address words/i);
  });

  test('the sick-on-alcohol line carries NIAAA + Mayo and the never-sleep-it-off truth', () => {
    const { lines } = incidentPlanFor(BASE);
    const sick = lines.find((l) => l.key === 'sick');
    expect(sick).toBeTruthy();
    expect(sick.sources).toEqual(expect.arrayContaining(['niaaa-overdose', 'mayo-alcohol-poisoning']));
    expect(sick.text).toMatch(/sleep it off/i);
    expect(sick.text).toMatch(/911/);
  });
});
