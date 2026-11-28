// THE GUEST ROWS (G2c-2b-2a; owner, 11/28/2026, UX_12 §8a, render screen 1).
// What the Guests kit's list shows under each name, how it is read by group,
// its plus-ones and kids total, and what the find box matches. The old Guests
// sheet showed and searched the same fields (HostShellV2's roster); the kit
// reads them from here.
import { plusOneLabel, plusOneCount } from './plusOneCount';

/** The find box shows from this many names (owner, 11/28/2026: from 8, was 21). */
export const FIND_FROM = 8;

const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';

/** Short tags under a guest's name: +1, "with" a partner, kids, diets, allergies. */
export function guestRowTags(g, guests) {
  if (!g) return [];
  const out = [];
  const plus = plusOneLabel(g);
  if (plus) out.push(plus);
  if (g.coupleId) {
    const p = (guests || []).find((x) => x && x !== g && x.id !== g.id && x.coupleId === g.coupleId);
    if (p && first(p.name)) out.push('with ' + first(p.name));
  }
  const kids = Number(g.kids) || 0;
  if (kids > 0) out.push(kids + (kids === 1 ? ' kid' : ' kids'));
  for (const d of Array.isArray(g.diets) ? g.diets : []) if (d) out.push(String(d));
  for (const a of Array.isArray(g.allergens) ? g.allergens : []) if (a) out.push(a + ' allergy');
  return out;
}

/** The find box's match: the name, the +1, the group and the email. */
export function findGuests(guests, q) {
  const s = String(q || '').trim().toLowerCase();
  const list = (guests || []).filter(Boolean);
  if (!s) return list;
  return list.filter((g) => [g.name, g.plusOne, g.group, g.email].some((v) => String(v || '').toLowerCase().includes(s)));
}

/**
 * The list read by group (Family, Friends, Work): groups in the order first
 * used, guests with no group last (group ''). Null when no guest has a group,
 * so a plain list stays plain.
 */
export function households(guests) {
  const list = (guests || []).filter(Boolean);
  const name = (g) => String(g.group || '').trim();
  if (!list.some(name)) return null;
  const order = []; const by = new Map();
  for (const g of list) {
    const k = name(g);
    if (!by.has(k)) { by.set(k, []); if (k) order.push(k); }
    by.get(k).push(g);
  }
  const out = order.map((k) => ({ group: k, guests: by.get(k) }));
  if (by.has('')) out.push({ group: '', guests: by.get('') });
  return out;
}

/** Plus-ones and kids across the list. */
export function partyTotals(guests) {
  let plusOnes = 0; let kids = 0;
  for (const g of guests || []) { if (!g) continue; plusOnes += plusOneCount(g); kids += Number(g.kids) || 0; }
  return { plusOnes, kids };
}
