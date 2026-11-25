// CostSplitSheet — "Split the costs" (owner, 11/16/2026: "free, just the math").
//
// The host lists who's splitting and what each person paid; the app shows who
// pays whom, in as few payments as it can (lib/costSplit). Free on every
// event. NO MONEY MOVES THROUGH THE APP, and nothing here says otherwise: the
// host copies the summary into the group chat and people pay each other.
import { useState } from 'react';
import { readSplit, settle, transferLine, splitSummary, formatCents, splitDishes, dishFor } from '@app/lib/costSplit';

const newId = (p) => p + Math.random().toString(36).slice(2, 9);

// `plan` is the shell's playbookFoodPlan: a receipt for a dish a guest brings
// is listed but not split (lib/costSplit, the reader Shop uses).
export default function CostSplitSheet({ event, plan, onSave, onLine }) {
  const split = readSplit(event, plan);
  const r = settle(split);
  const [name, setName] = useState('');
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState('');

  // `brought`/`bringer` are read from foodOwner each time, never stored.
  const save = (next, msg) => onSave({ costSplit: { ...next, expenses: next.expenses.map(({ brought: _b, bringer: _n, ...x }) => x) } }, msg);
  const people = split.people;
  const expenses = split.expenses;
  const yesNames = (event.guests || [])
    .filter((g) => g && String(g.rsvp || '').toLowerCase() === 'yes' && String(g.name || '').trim())
    .map((g) => String(g.name).trim())
    .filter((n) => !people.some((p) => p.name.toLowerCase() === n.toLowerCase()));

  const addPeople = (names) => {
    const clean = names.map((n) => n.trim()).filter(Boolean)
      .filter((n, i, a) => a.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i)
      .filter((n) => !people.some((p) => p.name.toLowerCase() === n.toLowerCase()));
    if (!clean.length) return;
    save({ people: [...people, ...clean.map((n) => ({ id: newId('sp-'), name: n }))], expenses },
      clean.length === 1 ? `${clean[0]} is in the split.` : `${clean.length} people added to the split.`);
  };
  const removePerson = (id) => {
    const p = people.find((x) => x.id === id);
    save({ people: people.filter((x) => x.id !== id), expenses: expenses.filter((x) => x.who !== id) },
      `${p ? p.name : 'They'}’s out of the split${expenses.some((x) => x.who === id) ? ', with what they paid' : ''}.`);
  };
  const amt = Number(String(amount).replace(/[$,\s]/g, ''));
  const canAdd = who && Number.isFinite(amt) && amt > 0;
  const addExpense = () => {
    if (!canAdd) return;
    const payer = people.find((p) => p.id === who);
    const dishId = dishFor(event, what, plan);
    save({ people, expenses: [...expenses, { id: newId('sx-'), who, what: what.trim(), amount: Math.round(amt * 100) / 100, ...(dishId ? { dishId } : {}) }] },
      `Added — ${payer ? payer.name : 'they'} paid ${formatCents(Math.round(amt * 100))}.`);
    setWhat(''); setAmount('');
  };
  const removeExpense = (id) => save({ people, expenses: expenses.filter((x) => x.id !== id) }, 'Removed.');
  const dishes = splitDishes(event, plan);
  const left = expenses.filter((x) => x.brought);
  const copy = async () => {
    const text = splitSummary(event, plan);
    try { await navigator.clipboard.writeText(text); onLine('Copied — paste it in the group chat.'); }
    catch { onLine('Copy didn’t work here — select the summary and copy it yourself.'); }
  };

  return (
    <div data-cost-split>
      <p className="grounding" style={{ margin: '2px 0 var(--sp-4)' }}>
        Add who’s splitting and what each person paid. The app works out who pays whom — no money moves through the app; you settle up however you like.
      </p>

      {/* The answer leads: it is why the host opened the sheet. */}
      {people.length > 1 && r.total > 0 && (
        <div className="split-result" data-split-result style={{ margin: '0 0 var(--sp-5)' }}>
          <div className="shelf-label" style={{ margin: '0 0 var(--sp-2)' }}>Who pays whom</div>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
            {formatCents(r.total)} total, split {people.length} ways — {formatCents(r.each)} each{r.people.some((p) => p.share !== r.each) ? ' (a cent more for some, so it adds up)' : ''}.
          </p>
          {left.length > 0 && (
            <p className="grounding" data-split-brought-note style={{ margin: '0 0 var(--sp-2)' }}>
              Left out: {left.map((x) => x.what).join(', ')} ({formatCents(r.brought)}) — a brought dish isn’t shared spending.
            </p>
          )}
          {r.transfers.length ? (
            <ul className="split-transfers" data-split-transfers>
              {r.transfers.map((t, i) => <li key={i}>{transferLine(t)}</li>)}
            </ul>
          ) : <p className="grounding" style={{ margin: 0 }}>Everyone’s even — nobody owes anything.</p>}
          <button className="mini" style={{ marginTop: 'var(--sp-3)' }} data-split-copy onClick={copy}>Copy for the group chat</button>
        </div>
      )}
      <div className="shelf-label" style={{ margin: '0 0 var(--sp-2)' }}>Who’s splitting</div>
      {people.length > 0 && (
        <ul className="split-people" data-split-people>
          {people.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <button className="mini" onClick={() => removePerson(p.id)}>{/* Names exactly what goes (cohesion G #56); Undo is in the toast. */}{expenses.some((x) => x.who === p.id) ? `Remove ${String(p.name || '').split(/\s+/)[0]} and what they paid` : `Remove ${String(p.name || '').split(/\s+/)[0]}`}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="actions-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', margin: 'var(--sp-2) 0 0' }}>
        {/* Labeled (cohesion G, UX_11 rule 2). */}
        <label className="field-wrap" style={{ maxWidth: 220 }}><span className="field-label">Add someone to the split</span>
        <input className="field ex-ph" style={{ maxWidth: 'none', fontSize: 'var(--t-input)' }} placeholder="For example: Sam"
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { addPeople([name]); setName(''); } }} /></label>
        <button className="mini" disabled={!name.trim()} onClick={() => { addPeople([name]); setName(''); }}>Add</button>
        {yesNames.length > 0 && (
          <button className="mini" data-split-add-yes onClick={() => addPeople(yesNames)}>
            Add the {yesNames.length} who said yes
          </button>
        )}
      </div>

      {people.length > 0 && (
        <>
          <div className="shelf-label" style={{ margin: 'var(--sp-5) 0 var(--sp-2)' }}>What people paid</div>
          {expenses.length > 0 && (
            <ul className="split-expenses" data-split-expenses>
              {expenses.map((x) => {
                const p = people.find((q) => q.id === x.who);
                return (
                  <li key={x.id}>
                    <span><b>{p ? p.name : 'Someone'}</b> · {formatCents(Math.round(x.amount * 100))}{x.what ? ` · ${x.what}` : ''}{x.brought ? <span data-split-brought> · brought, not split</span> : null}</span>
                    <button className="mini" aria-label={`Remove ${p ? p.name : 'this'}’s ${formatCents(Math.round(x.amount * 100))}`} onClick={() => removeExpense(x.id)}>Remove</button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="split-add" role="group" aria-label="Add what someone paid">
            <select className="field" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Who paid">
              <option value="">Who paid?</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input className="field" placeholder="For what?" aria-label="What it was for" value={what} onChange={(e) => setWhat(e.target.value)}
              list={dishes.length ? 'split-dishes' : undefined} />
            {dishes.length > 0 && (
              <datalist id="split-dishes">{dishes.map((d) => <option key={d.id} value={d.label} />)}</datalist>
            )}
            <input className="field" inputMode="decimal" placeholder="$0.00" aria-label="How much" value={amount}
              onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addExpense(); }} />
            <button className="mini" disabled={!canAdd} onClick={addExpense}>Add it</button>
          </div>
        </>
      )}

    </div>
  );
}

/** The plan row's one-line summary. */
export function splitRowSub(event, plan) {
  const split = readSplit(event, plan);
  const r = settle(split);
  if (!split.people.length) return 'who paid for what — the app does the math';
  if (!r.total && !r.brought) return `${split.people.length} splitting · nothing added yet`;
  return `${formatCents(r.total)} · ${r.transfers.length ? r.transfers.length + (r.transfers.length === 1 ? ' payment' : ' payments') + ' to settle' : 'everyone’s even'}`;
}
