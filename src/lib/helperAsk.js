// ─── helperAsk — the text a host's own phone sends a helper ──────────────────
//
// Owner-approved 11/15/2026 (free). The host taps "Send Jordan their job"; the
// phone's own Messages (or mail, or share sheet) opens with this text in it.
// The app never sends it and never says it was sent — this module only writes
// it, from facts the host's plan already holds:
//
//   WHO   the host, by name, when the host has given one
//   WHAT  the event, its date, its hour (never one the app guessed —
//         doItForMe.timePhrase), where, and THIS helper's jobs only
//   WHY   "Tap to say yes, or tell me if you can't" + the link
//
// Food jobs carry an allergy note when, and only when, the plan knows of an
// allergy — and the note names the allergen, never the guest. "Bring it hot"
// / "cold" appears only when a job carries `carry`; nothing in the plan writes
// that field yet, so today it never does.
import { fmtLongDate, timePhrase, placePhrase } from './doItForMe';
import { venueFor } from './venueFor';
import { clock12 } from './clock';

// The invite's allergen chips (InviteV2 ALLERGENS) and the host's own diet
// counts (dietRows DIET_TAGS), each to the word a cook uses. Diets that are
// preferences, not allergies (Gluten-free, Dairy-free, Vegan…), are left out:
// "a guest is allergic" must be true when it is said.
const GUEST_ALLERGEN = {
  peanut: 'nut', 'tree nuts': 'nut', milk: 'dairy', egg: 'egg', fish: 'fish',
  shellfish: 'shellfish', soy: 'soy', 'wheat / gluten': 'gluten', sesame: 'sesame',
};
const DIET_ALLERGEN = { 'Nut allergy': 'nut', Shellfish: 'shellfish', 'Egg allergy': 'egg', 'Soy allergy': 'soy' };

const joinAnd = (xs) => (xs.length <= 1 ? xs.join('')
  : xs.length === 2 ? `${xs[0]} and ${xs[1]}`
    : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`);

/** "keep it nut-free, a guest is allergic" — or '' when the plan knows of none. */
export function helperAllergyNote(event) {
  const ev = event || {};
  const words = new Set();
  let guestsWith = 0;
  for (const g of (Array.isArray(ev.guests) ? ev.guests : [])) {
    const mine = (Array.isArray(g && g.allergens) ? g.allergens : [])
      .map((a) => GUEST_ALLERGEN[String(a || '').trim().toLowerCase()]).filter(Boolean);
    if (mine.length) guestsWith += 1;
    mine.forEach((w) => words.add(w));
  }
  let counted = 0;
  const dc = (ev.dietCounts && typeof ev.dietCounts === 'object') ? ev.dietCounts : {};
  for (const [tag, word] of Object.entries(DIET_ALLERGEN)) {
    const n = Number(dc[tag]) || 0;
    if (n > 0) { counted += n; words.add(word); }
  }
  if (!words.size) return '';
  const people = Math.max(guestsWith, counted);
  const free = joinAnd([...words].sort().map((w) => `${w}-free`));
  return `keep it ${free}, ${people > 1 ? 'guests are' : 'a guest is'} allergic`;
}

const CARRY = { hot: 'bring it hot, wrapped in towels', cold: 'bring it cold, in a cooler' };

const clock = clock12;

/**
 * buildHelperAsk({ event, hostName, helperName, jobs, url }) → the message.
 * `jobs` is this helper's own list ({ kind, label, carry? }); nothing else is
 * read from it, so another helper's job cannot appear.
 */
export function buildHelperAsk({ event, hostName, helperName, jobs, url }) {
  const ev = event || {};
  const first = String(helperName || '').trim().split(/\s+/)[0] || 'there';
  const host = String(hostName || '').trim().split(/\s+/)[0];
  const name = String(ev.name || '').trim() || 'the party';

  const date = fmtLongDate(ev.date);
  const tp = timePhrase(ev);
  const when = [date ? `on ${date}` : '', clock(tp) ? `at ${clock(tp)}` : tp].filter(Boolean).join(' ');
  const place = placePhrase(ev);
  // The whole address line, with its town, state and ZIP (formatVenueAddress).
  // A street typed as the venue is that address, so it is said once.
  let vfa = { address: '', fullAddress: '' };
  try { vfa = venueFor(ev); } catch { /* no place */ }
  const address = vfa.fullAddress || '';
  const placeIsStreet = !!place && place === vfa.address;
  const where = place && !placeIsStreet
    ? `at ${place}${address && address !== place ? ` (${address})` : ''}`
    : (address ? `at ${address}` : (place ? `at ${place}` : ''));

  const allergy = helperAllergyNote(ev);
  const lines = (Array.isArray(jobs) ? jobs : [])
    .filter((j) => j && String(j.label || '').trim())
    .map((j) => {
      const notes = [];
      if (j.kind === 'food') {
        if (allergy) notes.push(allergy);
        if (CARRY[j.carry]) notes.push(CARRY[j.carry]);
      }
      return `• ${String(j.label).trim()}${notes.length ? ` — ${notes.join('; ')}` : ''}`;
    });

  const opener = `Hi ${first}${host ? ` — it's ${host}` : ''}. You're helping with ${[name, when, where].filter(Boolean).join(' ')}.`;
  return [
    opener,
    lines.length ? `You've got:\n${lines.join('\n')}` : '',
    `Tap to say yes, or tell me if you can't: ${url}`,
  ].filter(Boolean).join('\n\n');
}
