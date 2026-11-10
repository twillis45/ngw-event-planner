import { useRef, useState } from 'react';
import { venueFor } from '@app/lib/venueFor';
import { parseVenueLocation } from '@app/lib/cityText';
import { venueSelectionPatch, venueInquiry } from './venueWorkspace';
import './venueWorkspace.css';

export function EventPhotoBanner({ event, onOpen, onPhoto }) {
  const [failed, setFailed] = useState('');
  const photo = event.hostVenueWorkspace?.photo || '';
  const [error, setError] = useState('');
  const load = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 1000000) {
      setError('Choose a JPG, PNG or WebP under 1 MB.'); return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('That photo could not be read. Try another.');
    reader.onload = () => { onPhoto(reader.result); setError(''); };
    reader.readAsDataURL(file);
  };
  return <div className="vw-banner-wrap">
    <div className={'vw-banner' + (photo && failed !== photo ? ' vw-has-photo' : '')}>
      {photo && failed !== photo && <img src={photo} alt="" onError={() => setFailed(photo)} />}
      <div className="vw-banner-copy">
        <p className="vw-kicker">{event.type || 'Your gathering'}{event.date ? ` · ${event.date}` : ''}</p>
        <h2>{event.name || 'Make room for your people.'}</h2>
        {event.must_have_moment && <p>{event.must_have_moment}</p>}
        {onOpen && <button className="vw-primary" onClick={onOpen}>{venueFor(event).isSet ? 'Revisit your venue' : 'Choose the place'} <span aria-hidden="true">↗</span></button>}
      </div>
      {onPhoto && <label className="vw-photo-control">{photo ? 'Change photo' : 'Add your event photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={load} /></label>}
    </div>
    {error && <p role="alert">{error}</p>}
    {photo && failed === photo && <p role="status">This photo couldn’t load. Choose another photo.</p>}
  </div>;
}

export default function VenueWorkspace({ event, profile, decision, onPatch, onDraft, onNext, onDecide, legacyCapture }) {
  const workspace = event.hostVenueWorkspace || {};
  const options = Array.isArray(workspace.options) ? workspace.options.filter(o => o && typeof o.id === 'string' && typeof o.name === 'string') : [];
  const [active, setActive] = useState(options[0]?.id || '');
  const [compare, setCompare] = useState(false);
  const [adding, setAdding] = useState(!options.length);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', cost: '', capacity: '', notes: '' });
  const [why, setWhy] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(0);
  const pointer = useRef(null);
  const heading = useRef(null);
  const picked = options.find(o => o.id === active) || options[0];
  const vf = venueFor(event);
  const saveWorkspace = (changes, message) => onPatch({ hostVenueWorkspace: { ...workspace, ...changes } }, message);
  const step = (delta) => {
    setWhy('');
    const index = options.findIndex(o => o.id === picked?.id);
    setActive(options[(index + delta + options.length) % options.length]?.id || '');
  };
  const add = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Give this place a name.'); return; }
    if (form.location.trim() && !parseVenueLocation(form.location)) { setError('Use a city and state, or a five-digit ZIP.'); return; }
    const option = { ...form, name: form.name.trim(), id: editing || crypto.randomUUID() };
    saveWorkspace({ options: editing ? options.map(o => o.id === editing ? option : o) : [...options, option] }, editing ? 'Shortlist notes updated.' : 'Place added to your shortlist.');
    setActive(option.id); setAdding(false); setEditing(null); setForm({ name: '', location: '', cost: '', capacity: '', notes: '' }); setError('');
  };
  const choose = () => {
    const patch = venueSelectionPatch(event, picked, why);
    const before = Object.fromEntries(Object.keys(patch).map(key => [key, event[key]]));
    onPatch(patch, 'Venue added to the plan. Booking still needs confirmation.');
    setReceipt({ name: picked.name, before, patch });
    requestAnimationFrame(() => heading.current?.focus());
  };
  // Undo is valid only while this exact choice is still on the record. Another
  // edit (including a second device) must never be overwritten by a stale receipt.
  const canUndo = receipt && Object.keys(receipt.patch).every(k => JSON.stringify(event[k]) === JSON.stringify(receipt.patch[k]));
  return <section className="vw" aria-label="Venue workspace">
    <EventPhotoBanner event={event} onPhoto={photo => saveWorkspace({ photo }, 'Event photo updated.')} />
    {receipt && canUndo ? <div className="vw-receipt" role="status">
      <p className="vw-kicker">One decision forward</p>
      <h2 tabIndex={-1} ref={heading}>{receipt.name} is on your plan.</h2>
      <p>Your place now carries into the plan. Confirm availability and booking directly with the venue.</p>
      <div className="vw-actions"><button className="vw-primary" onClick={onNext}>Next: food & setup <span aria-hidden="true">→</span></button>
        <button onClick={() => { onPatch(receipt.before, 'Venue choice undone.', { noUndo: true }); setReceipt(null); }}>Undo choice</button></div>
    </div> : <>
      <header className="vw-intro"><p className="vw-kicker">The place sets the scene</p><h2>Where will it happen?</h2>
        <p>{vf.isSet ? `On your plan: ${vf.displayLine}. You can still explore alternatives.` : 'Find the fit. Keep your favorites. Make the call.'}</p></header>
      {decision?.options?.length > 0 && <details className="vw-guidance"><summary>A starting point for your {String(event.type || 'event').toLowerCase()}</summary>
        <p>Venue types from your planning playbook — not verified local listings.</p>
        <p>{decision.defaultWhy || decision.why || decision.because}</p>
        <div className="vw-actions">{decision.options.map(option => <button key={option} onClick={() => onDecide(decision, option)}>{option}{decision.chosen === option ? ' · Your choice' : decision.default === option && decision.defaultWhy ? ' · Suggested' : ''}</button>)}</div>
      </details>}
      <div className="vw-toolbar"><h3>Your shortlist <span>{options.length}</span></h3><div className="vw-actions">
        {options.length > 1 && <button aria-pressed={compare} onClick={() => setCompare(!compare)}>{compare ? 'Back to previews' : 'Compare places'}</button>}
        <button onClick={() => { setAdding(!adding); setEditing(null); setForm({ name: '', location: '', cost: '', capacity: '', notes: '' }); setError(''); }} aria-expanded={adding}>{adding ? 'Close form' : '+ Add a place'}</button></div></div>
      {adding && <form className="vw-form" onSubmit={add}>
        <h3>{editing ? 'Update this place' : 'A place you’re considering'}</h3><div className="vw-form-grid">
          <label>Place name<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>City, state or ZIP<input maxLength={120} placeholder="Annapolis, MD" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
          <label>Quoted total (optional)<input maxLength={60} placeholder="e.g. $1,200 including tables" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></label>
          <label>Capacity (optional)<input type="number" min="1" max="100000" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></label>
        </div><label>What matters here?<textarea maxLength={1000} placeholder="Access, parking, food rules, or what you love about it" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        {error && <p role="alert">{error}</p>}<button className="vw-primary" type="submit">{editing ? 'Save changes' : 'Add to shortlist'}</button>
      </form>}
      {!options.length && !adding && <p className="vw-empty">No places yet. Add one you have in mind; we’ll help you ask the right questions.</p>}
      {compare && options.length > 0 && <div className="vw-compare" tabIndex={0} role="region" aria-label="Venue comparison, scroll horizontally">
        <table><caption>Your notes side by side. Blank facts still need checking.</caption><thead><tr><th scope="col">Compare</th>{options.map(o => <th scope="col" key={o.id}>{o.name}</th>)}</tr></thead>
          <tbody>{[['location', 'Location'], ['cost', 'Quoted total'], ['capacity', 'Capacity'], ['notes', 'What matters']].map(([key, label]) => <tr key={key}><th scope="row">{label}</th>{options.map(o => <td key={o.id}>{o[key] || 'Not confirmed'}</td>)}</tr>)}
          <tr><th scope="row">Availability</th>{options.map(o => <td key={o.id}>Check with venue</td>)}</tr>
          <tr><th scope="row">Explore</th>{options.map(o => <td key={o.id}><button onClick={() => { setActive(o.id); setCompare(false); }}>Preview {o.name}</button></td>)}</tr></tbody></table>
      </div>}
      {!compare && picked && <div className="vw-choice-layout">
        <div className="vw-list" aria-label="Shortlisted places">{options.map((o, i) => <button className={o.id === picked.id ? 'vw-option is-active' : 'vw-option'} key={o.id} aria-pressed={o.id === picked.id} onClick={() => { setActive(o.id); setWhy(''); }}><span className="vw-number">{String(i + 1).padStart(2, '0')}</span><span><strong>{o.name}</strong><small>{o.location || 'Location to confirm'}</small></span><span aria-hidden="true">↗</span></button>)}</div>
        <article className="vw-preview" style={{ '--drag': `${drag}px` }}
          onPointerDown={e => { if (e.target.closest('button,input,textarea,label')) return; pointer.current = { x: e.clientX, y: e.clientY }; }}
          onPointerMove={e => { if (pointer.current && Math.abs(e.clientY - pointer.current.y) < 40) setDrag(Math.max(-65, Math.min(65, e.clientX - pointer.current.x))); }}
          onPointerUp={e => { if (pointer.current && Math.abs(e.clientY - pointer.current.y) < 40 && Math.abs(e.clientX - pointer.current.x) > 55) step(e.clientX < pointer.current.x ? 1 : -1); pointer.current = null; setDrag(0); }}
          onPointerCancel={() => { pointer.current = null; setDrag(0); }} onPointerLeave={() => { pointer.current = null; setDrag(0); }}>
          <div className="vw-preview-heading"><p className="vw-kicker">Your place to explore</p><div className="vw-actions"><button aria-label="Previous place" disabled={options.length < 2} onClick={() => step(-1)}>←</button><button aria-label="Next place" disabled={options.length < 2} onClick={() => step(1)}>→</button></div></div>
          <div key={picked.id} className="vw-preview-content"><h3>{picked.name}</h3><p>{picked.location || 'Location to confirm'}</p>
            <dl><div><dt>Quoted total</dt><dd>{picked.cost || 'Not confirmed'}</dd></div><div><dt>Capacity</dt><dd>{picked.capacity ? `${picked.capacity} people · host supplied` : 'Not confirmed'}</dd></div></dl>
            {picked.notes && <p className="vw-note">{picked.notes}</p>}
          </div>
          <p className="vw-fine">Your shortlist notes. Prices and availability haven’t been independently verified.</p>
          <details><summary>Keep your reason with this decision</summary><label>Why this place?<textarea maxLength={600} value={why} onChange={e => setWhy(e.target.value)} /></label></details>
          <div className="vw-actions vw-choice-actions"><button className="vw-primary" onClick={choose}>Use this place <span aria-hidden="true">✓</span></button><button onClick={() => onDraft(`Venue inquiry: ${picked.name}`, venueInquiry(event, picked, profile))}>Prepare for me</button></div>
          <p className="vw-fine">“Prepare for me” creates an editable inquiry. You review it before sharing.</p>
          <div className="vw-actions"><button onClick={() => { setForm({ location: '', cost: '', capacity: '', notes: '', ...picked }); setEditing(picked.id); setAdding(true); requestAnimationFrame(() => document.querySelector('.vw-form input')?.focus()); }}>Edit notes</button>
          <button className="vw-remove" onClick={() => { saveWorkspace({ options: options.filter(o => o.id !== picked.id) }, 'Place removed from shortlist.'); setActive(''); setWhy(''); }}>Remove from shortlist</button></div>
        </article>
      </div>}
      <details className="vw-guidance"><summary>Already know the place? Enter it directly</summary>{legacyCapture}</details>
    </>}
  </section>;
}
