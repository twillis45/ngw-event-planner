// ─── SPLIT THE COSTS (owner, 11/16/2026: "free, just the math") ─────────────
//
// Friends split a party: Jordan bought the turkey, Ana the drinks, Sam nothing.
// The host lists who is splitting and what each person paid; this works out
// who pays whom, in as few payments as it can. NO MONEY MOVES THROUGH THE APP:
// it is arithmetic and words, and every word says so.
//
// Everything is in whole cents, so the shares always add back up to the total
// to the penny: a total that doesn't divide evenly gives the first people on
// the list one cent more. PURE: no I/O, no clock.
//
// Stored on the event as `costSplit: { people: [{ id, name }], expenses:
// [{ id, who, what, amount }] }` (amount in dollars, as typed).

const cents = (n) => Math.round((Number(n) || 0) * 100);
const fmt = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The split, read from whatever is stored. Never throws. */
export function readSplit(event) {
  const s = (event && event.costSplit && typeof event.costSplit === 'object') ? event.costSplit : {};
  const people = (Array.isArray(s.people) ? s.people : [])
    .filter((p) => p && p.id && String(p.name || '').trim())
    .map((p) => ({ id: String(p.id), name: String(p.name).trim() }));
  const ids = new Set(people.map((p) => p.id));
  const expenses = (Array.isArray(s.expenses) ? s.expenses : [])
    .filter((x) => x && x.id && ids.has(String(x.who)) && cents(x.amount) > 0)
    .map((x) => ({ id: String(x.id), who: String(x.who), what: String(x.what || '').trim(), amount: cents(x.amount) / 100 }));
  return { people, expenses };
}

/**
 * @returns {{ total:number, each:number, people:Array<{id,name,paid,share,net}>,
 *   transfers:Array<{from,to,fromName,toName,amount}> }}  — all money in CENTS.
 */
export function settle(split) {
  const { people, expenses } = split && split.people ? split : readSplit(null);
  const n = people.length;
  const paid = Object.fromEntries(people.map((p) => [p.id, 0]));
  for (const x of expenses) if (x.who in paid) paid[x.who] += cents(x.amount);
  const total = Object.values(paid).reduce((a, b) => a + b, 0);
  if (!n) return { total, each: 0, people: [], transfers: [] };
  const base = Math.floor(total / n);
  const extra = total - base * n;                       // 0 … n-1 leftover cents
  const rows = people.map((p, i) => {
    const share = base + (i < extra ? 1 : 0);
    return { id: p.id, name: p.name, paid: paid[p.id], share, net: paid[p.id] - share };
  });
  // Fewest payments, greedily: the one who owes most pays the one owed most.
  const owe = rows.filter((r) => r.net < 0).map((r) => ({ ...r, left: -r.net }));
  const get = rows.filter((r) => r.net > 0).map((r) => ({ ...r, left: r.net }));
  const transfers = [];
  while (owe.length && get.length) {
    owe.sort((a, b) => b.left - a.left || a.name.localeCompare(b.name));
    get.sort((a, b) => b.left - a.left || a.name.localeCompare(b.name));
    const d = owe[0]; const c = get[0];
    const amt = Math.min(d.left, c.left);
    transfers.push({ from: d.id, to: c.id, fromName: d.name, toName: c.name, amount: amt });
    d.left -= amt; c.left -= amt;
    if (!d.left) owe.shift();
    if (!c.left) get.shift();
  }
  return { total, each: base, people: rows, transfers };
}

/** One payment as a sentence: "Sam pays Jordan $30.00". */
export function transferLine(t) {
  return `${t.fromName} pays ${t.toName} ${fmt(t.amount)}`;
}

/** The whole split as text the host can paste into the group chat. */
export function splitSummary(event) {
  const split = readSplit(event);
  const r = settle(split);
  if (!split.people.length || !r.total) return '';
  const name = String((event && event.name) || '').trim();
  const evenly = r.people.every((p) => p.share === r.each);
  const lines = [
    `${name ? name + ' — ' : ''}${fmt(r.total)} total, split ${r.people.length} ways (${evenly ? fmt(r.each) + ' each' : 'about ' + fmt(r.each) + ' each'}).`,
  ];
  for (const x of split.expenses) {
    const who = split.people.find((p) => p.id === x.who);
    lines.push(`${who ? who.name : 'Someone'} paid ${fmt(cents(x.amount))}${x.what ? ' for ' + x.what : ''}.`);
  }
  lines.push('');
  if (r.transfers.length) r.transfers.forEach((t) => lines.push(transferLine(t) + '.'));
  else lines.push('Everyone’s even — nobody owes anything.');
  return lines.join('\n');
}

export { fmt as formatCents };
