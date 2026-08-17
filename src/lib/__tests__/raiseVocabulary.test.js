// ─── A RAISER MAY NOT AUTHOR OUTSIDE THE DECLARED VOCABULARY ────────────────
//
// `riskSeverity.js:33` already states this doctrine, in as many words: "If
// someone authors `severity: 'urgent'` tomorrow, a test fails; the host never
// sees a guess." That gate covers the RISK corpus. **The RAISE corpus had the
// same hole and no gate** — and someone had in fact authored `'urgent'`.
//
// `money-dates` (~:540) shipped `severity: first.daysLeft <= 5 ? 'urgent' :
// 'attention'`. The declared vocabulary at the top of surfaceRegistry.js is
// 'critical' | 'attention', so the normalizer canonicalized 'urgent' down and
// the sharpening branch never had an effect for as long as it existed. Nothing
// failed, because nothing was watching this corpus.
//
// TWO HALVES, because either alone is fooled:
//   · a SOURCE scan, which catches an out-of-vocabulary literal even in a branch
//     no fixture happens to reach (this is what would have caught 'urgent');
//   · a RUNTIME scan over real events, which catches a value computed at run
//     time that no literal reveals.
import fs from 'fs';
import path from 'path';
import { raiseAll } from '../surfaceRegistry';

const SRC = path.resolve(__dirname, '..', 'surfaceRegistry.js');
const VOCAB = ['critical', 'attention'];

const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Spread across the countdown so raisers gated on different windows all fire.
const EVENTS = [-3, 0, 2, 9, 30, 120, 400].map((d) => ({
  id: `ev-v${d}`, type: 'Wedding', date: isoIn(d),
  venue: 'The Hall', venueCity: 'Santa Fe, NM', venueState: 'NM',
  guestMode: 'count', guestCount: 60, totalBudget: 15000,
  vendors: [
    { id: 'v1', name: 'Acme', category: 'Caterer', status: 'Shortlisted', cost: 2000,
      payDueDate: isoIn(d - 10), balancePaid: false },
    { id: 'v2', name: 'Sol', category: 'Band or DJ', status: 'Booked', cost: 800 },
  ],
  guests: [{ id: 'g1', name: 'Ada' }, { id: 'g2', name: 'Bo' }],
}));

describe('every raise speaks the declared vocabulary', () => {
  test('PREMISE — the corpus really produces raises across the countdown', () => {
    // A vocabulary gate over an empty corpus is the definition of vacuous.
    const total = EVENTS.reduce((n, e) => n + raiseAll(e).length, 0);
    expect(total).toBeGreaterThan(20);
  });

  test('SOURCE — no raiser authors a severity literal outside the vocabulary', () => {
    // The half that would have caught 'urgent'. A runtime scan alone misses any
    // branch a fixture does not happen to enter, and 'urgent' lived in one.
    const src = fs.readFileSync(SRC, 'utf8');
    const offenders = [];
    src.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;                 // prose, not policy
      if (!/severity\s*:/.test(line)) return;
      for (const m of line.matchAll(/'([a-z]+)'/g)) {
        const v = m[1];
        // Only judge words in a severity comparison/assignment context. Other
        // quoted strings on the line (a tier name, a level) are not severities.
        if (!VOCAB.includes(v) && /severity/.test(line) && /'(critical|attention|urgent|high|medium|low|warn|urgent)'/.test(`'${v}'`)) {
          offenders.push(`surfaceRegistry.js:${i + 1} — '${v}' in: ${line.trim().slice(0, 80)}`);
        }
      }
    });
    expect(offenders).toEqual([]);
  });

  test('canary — the source scan bites a planted out-of-vocabulary literal', () => {
    // Without this the scan could pass by matching nothing at all, which is how
    // a gate quietly stops gating.
    const bites = (line) => {
      if (!/severity\s*:/.test(line)) return false;
      return [...line.matchAll(/'([a-z]+)'/g)].some((m) =>
        !VOCAB.includes(m[1]) && /'(critical|attention|urgent|high|medium|low|warn)'/.test(`'${m[1]}'`));
    };
    expect(bites("        severity: first.daysLeft <= 5 ? 'urgent' : 'attention',")).toBe(true);
    expect(bites("        severity: 'high',")).toBe(true);
    expect(bites("        severity: 'attention',")).toBe(false);
    expect(bites("        severity: coi.level === 'critical' ? 'critical' : 'attention',")).toBe(false);
  });

  test('RUNTIME — every raise produced carries a vocabulary severity', () => {
    for (const ev of EVENTS) {
      for (const r of raiseAll(ev)) {
        expect(VOCAB).toContain(r.severity);
      }
    }
  });

  test('and every raise carries a REASON the host can read', () => {
    // money-dates authored `because:` — the only raiser spelling it that way —
    // so no consumer ever saw its exposure line. With the normalizer now
    // spreading, `because` would SURVIVE and still never be read, which is a
    // quieter version of the same bug. The reason field is `why`.
    const src = fs.readFileSync(SRC, 'utf8');
    const strays = [];
    src.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      if (/^\s+because\s*:/.test(line)) strays.push(`surfaceRegistry.js:${i + 1} — ${line.trim().slice(0, 70)}`);
    });
    expect(strays).toEqual([]);
  });
});
