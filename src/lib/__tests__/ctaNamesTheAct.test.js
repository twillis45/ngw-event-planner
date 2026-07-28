// ─── CTAs NAME THE ACT (host ruling 2026-07-28) ──────────────────────────────
//
// "app is not supposed to have do this CTAs" … "they should be the action
// needed." A button that says "Do this first" / "Handle this" / "Take me to it"
// describes the HOST moving, not the work — and at the tiers where those labels
// lived, the layer emitting them has no idea what the act even is. UX_05's rule
// is the same one: buttons carry verbs about the work, not nouns and not trips.
//
// This gate sweeps every CTA-producing surface so the class cannot regrow: the
// persona VOICE table, the playbook engine's authored CTAs, and the checklist
// route labels. Where a tier genuinely can't know the act, the fix is to OMIT
// the override so the engine's concrete label passes through — never to
// substitute a generic one.
const { VOICE } = require('../nextActionRenderer');
const { checklistRouteFor } = require('../taskRoute');
const { ALL_PLAYBOOKS, playbookChecklist } = require('../playbooks');

// Labels that describe travel or vagueness instead of the work.
const BANNED = [
  /^do (this|it)\b/i,
  /^handle (this|it)\b/i,
  /^take me to/i,
  /^go\b/i,
  /^continue$/i,
  /^click here/i,
  /^tap here/i,
  /^learn more$/i,
  /^see (it|more)$/i,
  /^open$/i,          // bare "Open" names no object
  /^view$/i,
];
const isBanned = (label) => BANNED.some((re) => re.test(String(label || '').trim()));

describe('no CTA describes a trip instead of the work', () => {
  test('every persona VOICE primaryCta names an act', () => {
    const bad = [];
    for (const [category, personas] of Object.entries(VOICE || {})) {
      for (const [persona, entry] of Object.entries(personas || {})) {
        const out = typeof entry === 'function' ? entry({ moreCount: 2, title: 'x', settleCount: 1 }) : entry;
        const cta = out && out.primaryCta;
        if (cta && isBanned(cta)) bad.push(`${category}.${persona} → "${cta}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every checklist route label names an act', () => {
    const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
    const bad = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      const ev = { id: 'cta', type, date: iso(45), guests: 24, venueCity: 'McHenry', venueState: 'MD' };
      let rows = [];
      try { rows = playbookChecklist(ev) || []; } catch { rows = []; }
      for (const t of rows) {
        const task = typeof t === 'string' ? t : t.task;
        let hit = null;
        try { hit = checklistRouteFor(task, { week: t.week, category: t.category }, ev); } catch { /* covered elsewhere */ }
        if (hit && isBanned(hit.label)) bad.add(`${type} :: "${hit.label}"`);
      }
    }
    expect([...bad]).toEqual([]);
  });

  test('the banned list actually bites (guard against a dead gate)', () => {
    expect(isBanned('Do this first')).toBe(true);
    expect(isBanned('Handle this')).toBe(true);
    expect(isBanned('Take me to it')).toBe(true);
    expect(isBanned('Open')).toBe(true);
    // …and real labels pass
    expect(isBanned('Open the list')).toBe(false);
    expect(isBanned('Make the call')).toBe(false);
    expect(isBanned('Set the start time')).toBe(false);
    expect(isBanned('Build the day')).toBe(false);
  });
});
