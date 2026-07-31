// ─── ONE MEANING PER STATUS WORD (host ruling 2026-07-28) ────────────────────
//
// Host: "difference between booked and confirmed:". The lodging roster really
// does carry three states — not_started → booked → confirmed — and the gap
// between "Rita says she booked" and "I have Rita's confirmation" is worth
// keeping 45 days out. Two things were wrong with how the app spoke it:
//
//   1. THE HEADLINE COLLAPSED THEM AND KEPT THE NARROW WORD. notBookedCount
//      counts ONLY 'not_started' — travelPlan says so twice in its own comments
//      ("booked here means booked OR confirmed") — so "0 of 4 booked" was a
//      two-state number wearing a one-state label. Cycle someone all the way to
//      the strongest state and they were still tallied under "booked".
//
//   2. "CONFIRMED" WAS ALREADY TAKEN. On the guest list it means THEY ARE
//      COMING. Here it meant THE ROOM IS VERIFIED. Same word, one surface
//      apart. This is the amber audit's one-meaning-per-status-colour rule,
//      applied to words.
//
// Storage keys are deliberately unchanged — only what the host reads moved.
const fs = require('fs');
const path = require('path');
const {
  LODGING_STATUSES, LODGING_STATUS_LABEL, CARE_UNIT_STATUS_LABEL,
  nextLodgingStatus, normalizeLodgingStatus,
} = require('../travelPlan');

const ROOT = path.resolve(__dirname, '../../..');
const SHELL = fs.readFileSync(path.join(ROOT, 'hostv2/src/HostShellV2.jsx'), 'utf8');
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/(^|[^:'"])\/\/.*$/, '$1')).join('\n');
const SHELL_CODE = stripComments(SHELL);

describe('booked and confirmed stay distinct, and neither word overreaches', () => {
  test('the three states and their cycle are intact', () => {
    // The distinction is the POINT — this fix must not have flattened it.
    expect(LODGING_STATUSES).toEqual(['not_started', 'booked', 'confirmed']);
    expect(nextLodgingStatus('not_started')).toBe('booked');
    expect(nextLodgingStatus('booked')).toBe('confirmed');
    expect(nextLodgingStatus('confirmed')).toBe('not_started');
  });

  test('stored keys are untouched — this was a copy fix, not a migration', () => {
    expect(normalizeLodgingStatus('confirmed')).toBe('confirmed');
    expect(normalizeLodgingStatus('booked')).toBe('booked');
    expect(normalizeLodgingStatus('anything else')).toBe('not_started');
  });

  test('no lodging status label reuses the guest list\'s "Confirmed"', () => {
    const labels = Object.values(LODGING_STATUS_LABEL);
    expect(labels.some((l) => /^confirmed$/i.test(l.trim()))).toBe(false);
    // …and the strongest state still says what makes it stronger than "Booked".
    expect(LODGING_STATUS_LABEL.confirmed).toMatch(/hand/i);
    expect(LODGING_STATUS_LABEL.booked).toBe('Booked');
    // Every state reads as a distinct sentence to a person.
    expect(new Set(labels).size).toBe(labels.length);
  });

  test('care-unit labels read the COLLAPSED sense, so they never say "booked"', () => {
    // These are derived from "booked OR confirmed" — travelPlan says so. Saying
    // "Both booked" told a host with the confirmation in hand something weaker
    // than the truth.
    for (const [key, label] of Object.entries(CARE_UNIT_STATUS_LABEL)) {
      if (key === 'caregiver_declined' || key === 'caregiver_unknown') continue;
      expect(label).not.toMatch(/\bbooked\b/i);
      expect(label).toMatch(/room/i);
    }
  });

  test('the roster headline names what it counts, not one of the states', () => {
    // The literal that started this: `${…} of ${…} booked`.
    expect(SHELL_CODE).not.toMatch(/\$\{lg\.roster\.length\}\s*booked/);
    expect(SHELL_CODE).toMatch(/\$\{lg\.roster\.length\}\s*have a room/);
  });

  test('no rollup built from notBookedCount describes itself as "booked"', () => {
    // Strictly, saying "N haven't booked" about the not_started people is TRUE —
    // they really haven't. The lie was only ever in the COMPLEMENT ("M booked",
    // which silently included confirmation-in-hand). The gate stays blunt on
    // purpose anyway: one voice for one number is easier to keep honest than a
    // rule about which side of the subtraction you happen to be printing, and
    // "have no room yet" reads better next to "have a room" regardless.
    const bad = [];
    for (const line of SHELL_CODE.split('\n')) {
      if (!/notBookedCount/.test(line)) continue;
      if (/\bbooked\b/i.test(line)) bad.push(line.trim().slice(0, 110));
    }
    expect(bad).toEqual([]);
  });

  test('the guard bites (not a dead gate)', () => {
    expect(/\bbooked\b/i.test('Both booked')).toBe(true);
    expect(/\bbooked\b/i.test('Both have a room')).toBe(false);
  });
});
