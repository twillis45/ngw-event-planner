// ─── THE VENDOR CARD SPEAKS HOST WORDS (cohesion audit #23, #61; 11/24/2026) ─
//
// UX_11 rule 4 (owner-approved 11/24/2026): no app shorthand or engine copy.
// The audit read these off an opened vendor card on the live app:
//   "Contact channels available.", "Payment state not tracked yet.",
//   "Logistics not tracked yet.", "Closeout activates after the event.",
//   "5 of 6 checks passing · 1 not tracked yet (closeout).",
// and "Quoted — needs decision before booking." four times on one card (#61),
// one of them with "Not fully clear yet." on its end.
//
// Every sentence a host's vendor card can show comes from three readers: the
// six axes (getHostVendorChallenges), the verdict over them
// (getHostVendorReadiness) and the next step (getVendorNextAction). This walks
// every status, timing and paperwork combination through all three and holds
// each sentence to the host-words list.
import {
  getHostVendorReadiness,
  getHostVendorChallenges,
  getVendorNextAction,
} from '../vendorIntelligence';
import { localISO } from '../dates';

const iso = (d) => localISO(new Date(Date.now() + d * 86400000));

// The engine words the audit found, plus the engine's own axis keys, which
// leaked into the verdict as "(closeout)".
const ENGINE = /not tracked|activates|channels|\bstate\b|closeout|logistics|\bfinancial\b|\bdayOf\b|needs decision|not fully clear|\bbrief\b/i;

const sweep = () => {
  const out = [];
  for (const status of ['', 'Considering', 'Quoted', 'Contracted', 'Deposit Paid', 'Confirmed'])
    for (const d of [-5, 0, 3, 10, 25, 45, 120])
      for (const contact of ['555-0100', null])
        for (const cost of [1500, 0])
          for (const depositPaid of [true, false])
            for (const balancePaid of [true, false])
              for (const arrivalTime of ['15:00', null]) {
                const vendor = {
                  id: 'v', name: 'Elm Street Catering', category: 'Catering', status, cost,
                  phone: contact, depositPaid, balancePaid, arrivalTime, contractSigned: status === 'Confirmed',
                };
                out.push({ vendor, event: { id: 'e', date: iso(d), vendors: [vendor] } });
              }
  return out;
};

const sentences = ({ vendor, event }) => {
  const out = [];
  for (const a of getHostVendorChallenges(vendor, event)) out.push(a.note);
  const r = getHostVendorReadiness(vendor, event);
  out.push(r.label, r.summary);
  const na = getVendorNextAction(vendor, event);
  if (na) out.push(na.title, na.consequence);
  return out.filter(Boolean);
};

test('no sentence on a vendor card is engine copy', () => {
  const bad = new Set();
  for (const c of sweep()) for (const s of sentences(c)) if (ENGINE.test(s)) bad.add(s);
  expect([...bad]).toEqual([]);
});

test('the next step does not repeat an axis sentence the card already shows', () => {
  // The Next line sits above the six axis rows: saying the same sentence in
  // both is the repeat #61 counted.
  const bad = new Set();
  for (const c of sweep()) {
    const na = getVendorNextAction(c.vendor, c.event);
    if (!na || !na.consequence) continue;
    const notes = getHostVendorChallenges(c.vendor, c.event).map((a) => a.note);
    if (notes.some((n) => na.consequence.includes(n))) bad.add(na.consequence);
  }
  expect([...bad]).toEqual([]);
});

test('a price in hand reads as the host\'s call, in the status ladder\'s own words', () => {
  const vendor = { id: 'v', name: 'Elm Street Catering', category: 'Catering', status: 'Quoted', cost: 1500, phone: '555-0100' };
  const axes = getHostVendorChallenges(vendor, { id: 'e', date: iso(45), vendors: [vendor] });
  // "Got a price" is what the status pill says for Quoted.
  expect(axes.find((a) => a.key === 'booking').note).toMatch(/^Got a price/);
});
