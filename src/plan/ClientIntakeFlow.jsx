// demo/src/plan/ClientIntakeFlow.jsx
// Sprint 46 · Page 89 · C — Client Intake Workflow
// PLAN Layer · Tier 0 · Track A
//
// Design source: Figma CYlmJqDCXEaacCuz9wW3bd page 549:2
// Separate full-screen flow — NOT a tab inside PlanEventDashboard.
// Top bar: ← [Event Name] | Client Intake | Save Draft
// Left: numbered step sidebar (7 steps)
// Center: step content
// Bottom: ← Step N | N of 7 | Step N+1 →
//
// Track A = display mode. Fields show current event data; edits are local state only.
// No Supabase writes here. No cross-contamination with OrchestrationSlice.
// Status via color + text only. No emoji. No icons.

import { useState } from 'react';
import { color, space, type, radius } from '../design/tokens';
import US_CITIES from '../lib/usCities';
// Sprint 61.G — shared budget hint
import BudgetEstimateHint from '../lib/budgetEstimator/BudgetEstimateHint';
import { breakdownByCategory, estimateTotalRange } from '../lib/budgetEstimator';
import { playbookBudgetCategories } from '../lib/playbooks';
import { proposedVendorCategories } from '../lib/vendorCategoriesByType';

const P = {
  canvas:       color.surface.canvas,
  base:         color.surface.base,
  card:         color.surface.card,
  borderSubtle: color.border.subtle,
  borderDef:    color.border.default,
  textPrimary:   '#eef0f4',
  textSecondary: color.text.secondary,
  // Intake legibility fix (2026-06-14): the global tertiary (steel-600 #527088)
  // was too dark for the intake's small labels / placeholders / hints — it sits
  // at ~3:1 on the matte card (#1c2227), failing AA for small text. These are
  // form labels the host must read, so lift to the doctrine-locked readable
  // steel (steel-400 #849eb8, ~5.9:1). Values/headings stay brighter at
  // textPrimary, preserving the hierarchy.
  textTertiary:  color.text.secondary,
  green:  color.status.confirmed,
  amber:  color.status.warning,
  red:    color.status.risk,
};
const FF = type.family;

// ── 7 Intake Steps ────────────────────────────────────────────────────────────
// Board 2026-06-12 reorder: the MEANING leads. "Event Basics" is gone as an
// entry step — name/type/date/venue were captured at creation and are recapped
// read-only inside The Celebration, never re-typed (kills the duplicate intake).
const STEPS = [
  { n: 1, label: 'The Celebration' },
  { n: 2, label: 'Client Contact' },
  { n: 3, label: 'Guest List' },
  { n: 4, label: 'Budget Overview' },
  { n: 5, label: 'Look & Feel' },
  { n: 6, label: 'Vendor Priorities' },
  { n: 7, label: 'Review & Confirm' },
];

// ── Shared input primitives ───────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: type.weight.medium, letterSpacing: '0.08em',
      color: P.textTertiary, fontFamily: FF, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, multiline, rows, date, time }) {
  const base = {
    width: '100%', boxSizing: 'border-box',
    background: P.card, border: `1px solid ${P.borderSubtle}`,
    borderRadius: radius.sm,
    padding: `${space[3]}px ${space[4]}px`,
    fontSize: 13, color: value ? P.textPrimary : P.textTertiary,
    fontFamily: FF, outline: 'none',
    lineHeight: type.leading.relaxed,
    resize: 'none',
  };
  if (multiline) {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows || 3}
        style={{ ...base, display: 'block' }}
      />
    );
  }
  // Dates and times are NEVER free text — native pickers only (open on first tap).
  if (date || time) {
    return (
      <input
        type={date ? 'date' : 'time'}
        inputMode="numeric"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { try { e.target.showPicker?.(); } catch {} }}
        onClick={e => { try { e.target.showPicker?.(); } catch {} }}
        style={{ ...base, height: 36, display: 'block' }}
      />
    );
  }
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...base, height: 36, display: 'block' }}
    />
  );
}

// Event type is multi-select — a real event can be more than one thing
// (Wedding + Reception, Birthday + Corporate). First pick is the primary type.
const EVENT_TYPE_OPTIONS = [
  'Wedding', 'Corporate Event', 'Birthday Party', 'Baby Shower', 'Bridal Shower',
  'Quinceañera', 'Sweet 16', 'Holiday Party', 'Graduation Party', 'Gala / Fundraiser',
  'Conference / Summit', 'Other',
];
function ChipMultiSelect({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const toggle = (opt) => onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button type="button" key={opt} onClick={() => toggle(opt)}
            style={{
              padding: '8px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: on ? 700 : 500,
              cursor: 'pointer', fontFamily: FF, minHeight: 36,
              border: `1px solid ${on ? P.textSecondary : P.borderSubtle}`,
              background: on ? P.textSecondary + '24' : 'transparent',
              color: on ? P.textPrimary : P.textSecondary,
            }}>
            {on ? '✓ ' : ''}{opt}
          </button>
        );
      })}
    </div>
  );
}

// Single-select dropdown — for fields with a known option set (never free text).
function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box', background: P.card,
        border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm,
        padding: `${space[3]}px ${space[4]}px`, fontSize: 13,
        color: value ? P.textPrimary : P.textTertiary, fontFamily: FF,
        outline: 'none', height: 36, display: 'block', cursor: 'pointer',
      }}>
      <option value="">{placeholder || 'Select…'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Dropdown option sets for the guest-needs fields (RSVP, dietary, accessibility).
const RSVP_METHOD_OPTIONS = ['Online form / link', 'Email', 'Text / SMS', 'Phone call', 'Mail / RSVP card', 'In person', 'Through the planner'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'Dairy-free', 'Shellfish allergy', 'Halal', 'Kosher', 'Pescatarian', 'Alcohol-free', 'No restrictions'];
const ACCESSIBILITY_REQ_OPTIONS = ['Wheelchair access', 'Step-free / ramp entry', 'ADA restrooms', 'Reserved / priority seating', 'Hearing assistance', 'Large-print materials', 'Service animals welcome', 'Sensory-friendly space', 'Designated parking', 'None needed'];

// Multi-select chips — stores the selection as a comma-joined string so the
// underlying data field stays a plain string (no persistence/schema change).
function ChipMulti({ value, onChange, options }) {
  const selected = String(value || '').split(',').map(s => s.trim()).filter(Boolean);
  const toggle = (opt) => {
    const set = new Set(selected);
    if (set.has(opt)) set.delete(opt); else set.add(opt);
    onChange([...set].join(', '));
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[2] }}>
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            style={{
              padding: `${space[2]}px ${space[3]}px`, borderRadius: 999, fontSize: 12,
              fontFamily: FF, cursor: 'pointer', lineHeight: 1.2,
              background: on ? P.green + '22' : P.card,
              color: on ? P.textPrimary : P.textSecondary,
              border: `1px solid ${on ? P.green : P.borderSubtle}`,
              fontWeight: on ? type.weight.semibold : type.weight.regular,
            }}>
            {on ? '✓ ' : ''}{opt}
          </button>
        );
      })}
    </div>
  );
}

// City field connected to the city/state/ZIP database — type a city, or type a
// 5-digit ZIP and it resolves to "City, ST" via the free, key-less zippopotam.us
// API (no Google key required). Shared control so intake + event creation match.
function CityZipInput({ value, onChange, placeholder }) {
  const [note, setNote] = useState('');
  // 240 common cities show instantly; the full ~29,700-city list lazy-loads on
  // first focus (separate chunk — never bloats the main bundle).
  const [cities, setCities] = useState(US_CITIES);
  const loadFull = () => {
    if (cities.length > 1000) return;
    import('../lib/usCitiesFull').then(m => setCities(m.default || m)).catch(() => {});
  };
  const base = {
    width: '100%', boxSizing: 'border-box', background: P.card,
    border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm,
    padding: `${space[3]}px ${space[4]}px`, fontSize: 13,
    color: value ? P.textPrimary : P.textTertiary, fontFamily: FF,
    outline: 'none', height: 36, display: 'block',
  };
  const resolveZip = async (raw) => {
    const zip = (raw || '').trim();
    if (!/^\d{5}$/.test(zip)) return;
    setNote('Looking up ZIP…');
    try {
      const r = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!r.ok) { setNote('ZIP not found — type a city instead.'); return; }
      const d = await r.json();
      const place = d.places && d.places[0];
      if (place) { onChange(`${place['place name']}, ${place['state abbreviation']}`); setNote(''); }
      else setNote('');
    } catch (e) { setNote('Could not look up that ZIP.'); }
  };
  return (
    <div>
      <input type="text" value={value || ''} list="ngw-intake-cities" onFocus={loadFull}
        onChange={e => { onChange(e.target.value); if (note) setNote(''); }}
        onBlur={e => resolveZip(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); resolveZip(e.target.value); } }}
        placeholder={placeholder || 'City, ST — or type a ZIP'} style={base} />
      <datalist id="ngw-intake-cities">{cities.map(c => <option key={c} value={c} />)}</datalist>
      {note && <div style={{ fontSize: 11, color: P.textTertiary, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: space[5] }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.14em',
      color: P.textTertiary, fontFamily: FF,
      borderBottom: `1px solid ${P.borderSubtle}`,
      paddingBottom: space[3], marginBottom: space[5],
      marginTop: space[6],
    }}>
      {children}
    </div>
  );
}

function TwoCol({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {children}
    </div>
  );
}

// ── Step 1: Event Basics ──────────────────────────────────────────────────────
function Step1({ data, onChange }) {
  return (
    <div>
      <SectionHeading>EVENT DETAILS</SectionHeading>
      <TwoCol>
        <Field label="EVENT NAME">
          <TextInput value={data.name} onChange={v => onChange('name', v)} placeholder="e.g. Sarah & Todd's Wedding" />
        </Field>
        <Field label="EVENT DATE">
          <TextInput date value={data.date} onChange={v => onChange('date', v)} />
        </Field>
        <Field label="CEREMONY TIME">
          <TextInput time value={data.ceremony_time} onChange={v => onChange('ceremony_time', v)} />
        </Field>
      </TwoCol>
      <Field label="EVENT TYPE — pick one or more">
        <ChipMultiSelect
          options={EVENT_TYPE_OPTIONS}
          value={data.eventTypes || (data.type ? [data.type] : [])}
          onChange={next => { onChange('eventTypes', next); onChange('type', next[0] || ''); }}
        />
      </Field>

      <SectionHeading>VENUE</SectionHeading>
      <TwoCol>
        <Field label="VENUE NAME">
          <TextInput value={data.venue} onChange={v => onChange('venue', v)} placeholder="e.g. Bluebell Estate" />
        </Field>
        <Field label="VENUE CITY">
          <CityZipInput value={data.venue_city} onChange={v => onChange('venue_city', v)} placeholder="City, ST — or type a ZIP" />
        </Field>
        <Field label="RECEPTION VENUE">
          <TextInput value={data.reception_venue} onChange={v => onChange('reception_venue', v)} placeholder="Same as ceremony?" />
        </Field>
        <Field label="COCKTAIL HOUR">
          <TextInput time value={data.cocktail_time} onChange={v => onChange('cocktail_time', v)} />
        </Field>
      </TwoCol>

      <SectionHeading>NOTES</SectionHeading>
      <Field label="SPECIAL INSTRUCTIONS OR CONTEXT">
        <TextInput value={data.event_notes} onChange={v => onChange('event_notes', v)} placeholder="Anything the planning team should know upfront..." multiline rows={3} />
      </Field>
    </div>
  );
}

// ── Step 2: Client Contact ────────────────────────────────────────────────────
function Step2({ data, onChange }) {
  const clients = data.clients || [];
  const c1 = clients[0] || {};
  const c2 = clients[1] || {};

  function updateClient(idx, key, val) {
    const updated = [...clients];
    if (!updated[idx]) updated[idx] = {};
    updated[idx] = { ...updated[idx], [key]: val };
    onChange('clients', updated);
  }

  return (
    <div>
      <SectionHeading>PRIMARY CLIENT</SectionHeading>
      <TwoCol>
        <Field label="FIRST NAME">
          <TextInput value={c1.firstName} onChange={v => updateClient(0, 'firstName', v)} placeholder="First name" />
        </Field>
        <Field label="LAST NAME">
          <TextInput value={c1.lastName} onChange={v => updateClient(0, 'lastName', v)} placeholder="Last name" />
        </Field>
        <Field label="EMAIL">
          <TextInput value={c1.email} onChange={v => updateClient(0, 'email', v)} placeholder="email@example.com" />
        </Field>
        <Field label="PHONE">
          <TextInput value={c1.phone} onChange={v => updateClient(0, 'phone', v)} placeholder="(415) 000-0000" />
        </Field>
      </TwoCol>
      <Field label="PREFERRED CONTACT METHOD">
        <Select value={c1.preferredContact} onChange={v => updateClient(0, 'preferredContact', v)} options={['Text', 'Email', 'Phone', 'Either']} placeholder="Choose…" />
      </Field>

      <SectionHeading>SECONDARY CLIENT</SectionHeading>
      <TwoCol>
        <Field label="FIRST NAME">
          <TextInput value={c2.firstName} onChange={v => updateClient(1, 'firstName', v)} placeholder="First name" />
        </Field>
        <Field label="LAST NAME">
          <TextInput value={c2.lastName} onChange={v => updateClient(1, 'lastName', v)} placeholder="Last name" />
        </Field>
        <Field label="EMAIL">
          <TextInput value={c2.email} onChange={v => updateClient(1, 'email', v)} placeholder="email@example.com" />
        </Field>
        <Field label="PHONE">
          <TextInput value={c2.phone} onChange={v => updateClient(1, 'phone', v)} placeholder="(415) 000-0000" />
        </Field>
      </TwoCol>

      <SectionHeading>MAILING ADDRESS</SectionHeading>
      <Field label="STREET ADDRESS">
        <TextInput value={data.address_street} onChange={v => onChange('address_street', v)} placeholder="123 Main St" />
      </Field>
      <TwoCol>
        <Field label="CITY">
          <CityZipInput value={data.address_city} onChange={v => onChange('address_city', v)} placeholder="City, ST — or type a ZIP" />
        </Field>
        <Field label="STATE / ZIP">
          <TextInput value={data.address_state_zip} onChange={v => onChange('address_state_zip', v)} placeholder="CA 94102" />
        </Field>
      </TwoCol>
    </div>
  );
}

// ── Step 3: Guest List ────────────────────────────────────────────────────────
function Step3({ data, onChange }) {
  // Adaptive (board 2026-06-13, Grandmother): a retirement party has no
  // ceremony aisle — only weddings get the ceremony/reception seat split.
  const isWedding = /wedding/i.test(`${data.type || ''} ${data.secondaryType || ''}`);
  return (
    <div>
      <SectionHeading>GUEST COUNTS</SectionHeading>
      <TwoCol>
        <Field label="ESTIMATED TOTAL GUESTS">
          <TextInput value={data.guestEstimate} onChange={v => onChange('guestEstimate', v)} placeholder="e.g. 150" />
        </Field>
        <Field label="CONFIRMED GUEST COUNT">
          <TextInput value={data.guest_confirmed} onChange={v => onChange('guest_confirmed', v)} placeholder="e.g. 140" />
        </Field>
        {isWedding ? (
          <>
            <Field label="CEREMONY SEATS NEEDED">
              <TextInput value={data.ceremony_seats} onChange={v => onChange('ceremony_seats', v)} placeholder="e.g. 160" />
            </Field>
            <Field label="RECEPTION SEATS NEEDED">
              <TextInput value={data.reception_seats} onChange={v => onChange('reception_seats', v)} placeholder="e.g. 150" />
            </Field>
          </>
        ) : (
          <Field label="SEATS NEEDED">
            <TextInput value={data.reception_seats} onChange={v => onChange('reception_seats', v)} placeholder="e.g. 150" />
          </Field>
        )}
        <Field label="PLUS-ONE POLICY">
          <TextInput value={data.plus_one_policy} onChange={v => onChange('plus_one_policy', v)} placeholder="e.g. Couples only" />
        </Field>
        <Field label="CHILDREN ATTENDING?">
          <TextInput value={data.children_policy} onChange={v => onChange('children_policy', v)} placeholder="e.g. Yes, under 12 welcome" />
        </Field>
      </TwoCol>

      <SectionHeading>RSVP MANAGEMENT</SectionHeading>
      <TwoCol>
        <Field label="RSVP DEADLINE">
          <TextInput date value={data.rsvp_deadline} onChange={v => onChange('rsvp_deadline', v)} />
        </Field>
        <Field label="RSVP METHOD">
          <Select value={data.rsvp_method} onChange={v => onChange('rsvp_method', v)} options={RSVP_METHOD_OPTIONS} placeholder="How will guests RSVP?" />
        </Field>
      </TwoCol>

      <SectionHeading>SPECIAL NEEDS</SectionHeading>
      <Field label="DIETARY RESTRICTIONS (NOTED SO FAR)">
        <ChipMulti value={data.dietary_notes} onChange={v => onChange('dietary_notes', v)} options={DIETARY_OPTIONS} />
      </Field>
      <Field label="ACCESSIBILITY REQUIREMENTS">
        <ChipMulti value={data.accessibility_notes} onChange={v => onChange('accessibility_notes', v)} options={ACCESSIBILITY_REQ_OPTIONS} />
      </Field>
    </div>
  );
}

// ── Step 4: Budget Overview ───────────────────────────────────────────────────
function Step4({ data, onChange }) {
  const budget = data.budget || [];
  const totalBudgeted = budget.reduce((s, r) => s + (Number(r.budgeted) || 0), 0);
  const totalActual   = budget.reduce((s, r) => s + (Number(r.actual)   || 0), 0);

  function fmtMoney(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  return (
    <div>
      {/* Sprint 61.G — Budget estimate hint above OVERALL BUDGET. Anchors
          the total budget input against a typical range so the planner
          (and client) aren't writing into a void. Renders only when type
          and guests are both known. */}
      {data.type && (data.guestEstimate || data.guests?.length) && (
        <div style={{ marginBottom: space[6] }}>
          <BudgetEstimateHint
            type={data.type}
            guestCount={data.guestEstimate || (data.guests || []).length}
            date={data.date}
            timeOfDay={data.timeOfDay || 'afternoon'}
            profile={null}
            userBudget={Number(data.total_budget) || null}
            palette={{
              bg: P.canvas, card: P.card, border: P.borderSubtle,
              text: P.textPrimary, muted: P.textSecondary,
              accent: '#4E6877',
              success: P.green, warn: P.amber, danger: P.red,
            }}
          />
        </div>
      )}
      <SectionHeading>OVERALL BUDGET</SectionHeading>
      <TwoCol>
        <Field label="TOTAL BUDGET">
          <TextInput value={data.total_budget} onChange={v => onChange('total_budget', v)} placeholder="e.g. 35000" />
        </Field>
        <Field label="PRIORITY ALLOCATION">
          <TextInput value={data.budget_priority} onChange={v => onChange('budget_priority', v)} placeholder="e.g. Photography, Florals" />
        </Field>
        <Field label="DEPOSIT PAID">
          <TextInput value={data.deposit_paid_amount} onChange={v => onChange('deposit_paid_amount', v)} placeholder="e.g. 5000" />
        </Field>
        <Field label="REMAINING BALANCE">
          <TextInput value={data.budget_remaining} onChange={v => onChange('budget_remaining', v)} placeholder="e.g. 30000" />
        </Field>
      </TwoCol>

      {/* Sprint 60.Y — Typical setup checklist. Surfaces the categories most
          events of this type include, each with a typical $ range (planning
          estimate, not a quote). Checking a row seeds an editable budget line
          at the midpoint; the CATEGORY BREAKDOWN below stays in sync via
          data.budget. Combines a "what to expect" reference, a setup checklist,
          and a pre-filled-but-editable budget in one. */}
      {(() => {
        const guestCount = data.guestEstimate || (data.guests || []).length;
        // Sprint 55C-1: when the event type has a playbook, the typical-setup rows
        // come from the ENGINE — real purchases rolled into budget categories at
        // grounded quantity × unit-cost amounts (a Dinner Party gets food/drinks/
        // flowers/rentals/supplies/cleanup, NOT an invented venue line). Types
        // without a playbook keep the share-based estimate.
        const pbCats = (data.type && Number(guestCount) >= 1)
          ? playbookBudgetCategories(data.type, guestCount) : null;
        const range = data.type ? estimateTotalRange({ type: data.type, guestCount, date: data.date, timeOfDay: data.timeOfDay || 'afternoon' }) : null;
        const cats = pbCats || (range ? breakdownByCategory(range.lowTotal, range.highTotal, data.type) : null);
        if (!cats || !cats.length) return null;
        const rowFor = (label) => budget.find(r => r.category === label);
        const mid = (c) => Math.round(((c.low + c.high) / 2) / 100) * 100;
        const toggle = (c) => {
          if (rowFor(c.label)) onChange('budget', budget.filter(r => r.category !== c.label));
          else onChange('budget', [...budget, { category: c.label, budgeted: mid(c), actual: 0 }]);
        };
        const setAmt = (label, v) => onChange('budget', budget.map(r =>
          r.category === label ? { ...r, budgeted: Number(String(v).replace(/[^0-9.]/g, '')) || 0 } : r));
        const checkedTotal = cats.reduce((s, c) => { const r = rowFor(c.label); return s + (r ? Number(r.budgeted) || 0 : 0); }, 0);
        return (
          <div style={{ marginBottom: space[6] }}>
            <SectionHeading>TYPICAL SETUP — WHAT TO EXPECT</SectionHeading>
            <div style={{ fontSize: 11, color: P.textSecondary, fontFamily: FF, marginBottom: space[3], lineHeight: 1.5 }}>
              Most {data.type ? data.type.toLowerCase() : 'these'} events include these. Check the ones you're planning — each seeds an editable budget line at a typical amount. Planning estimates, not quotes.
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.md, overflow: 'hidden' }}>
              {cats.map((c, i) => {
                const row = rowFor(c.label);
                const checked = !!row;
                return (
                  <div key={c.key} style={{
                    display: 'flex', alignItems: 'center', gap: space[3],
                    padding: `${space[3]}px ${space[5]}px`,
                    borderBottom: i < cats.length - 1 ? `1px solid ${P.borderSubtle}` : 'none',
                    background: checked ? `${P.green}0c` : 'transparent',
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(c)}
                      aria-label={`Include ${c.label}`}
                      style={{ width: 17, height: 17, flexShrink: 0, cursor: 'pointer', accentColor: P.green }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: P.textPrimary, fontFamily: FF, fontWeight: checked ? type.weight.semibold : type.weight.medium }}>{c.label}</div>
                      <div style={{ fontSize: 10.5, color: P.textTertiary, fontFamily: FF, marginTop: 1 }}>typically {fmtMoney(c.low)}–{fmtMoney(c.high)}</div>
                    </div>
                    {checked && (
                      <div style={{ flexShrink: 0, width: 110 }}>
                        <TextInput value={row.budgeted} onChange={v => setAmt(c.label, v)} placeholder={String(mid(c))} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${space[3]}px ${space[5]}px`, background: P.borderSubtle }}>
                <span style={{ fontSize: 11, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>Selected total</span>
                <span style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>{fmtMoney(checkedTotal)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {budget.length > 0 && (
        <>
          <SectionHeading>CATEGORY BREAKDOWN</SectionHeading>
          <div style={{
            background: P.card, border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.md, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
              padding: `${space[3]}px ${space[5]}px`,
              borderBottom: `1px solid ${P.borderSubtle}`,
            }}>
              {['Category', 'Budgeted', 'Actual', 'Variance'].map(h => (
                <div key={h} style={{
                  fontSize: 9, fontWeight: type.weight.medium,
                  letterSpacing: '0.08em', color: P.textTertiary, fontFamily: FF,
                  textAlign: h === 'Category' ? 'left' : 'right',
                }}>{h}</div>
              ))}
            </div>
            {budget.map((row, i) => {
              const variance = (row.actual || 0) - (row.budgeted || 0);
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
                  padding: `${space[3]}px ${space[5]}px`,
                  borderBottom: i < budget.length - 1 ? `1px solid ${P.borderSubtle}` : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF }}>{row.category}</div>
                  <div style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF, textAlign: 'right' }}>
                    {fmtMoney(row.budgeted)}
                  </div>
                  <div style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF, textAlign: 'right' }}>
                    {fmtMoney(row.actual)}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: type.weight.medium, fontFamily: FF, textAlign: 'right',
                    color: variance > 0 ? P.red : variance < 0 ? P.green : P.textSecondary,
                  }}>
                    {variance > 0 ? '+' : ''}{fmtMoney(variance)}
                  </div>
                </div>
              );
            })}
            {/* Total row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
              padding: `${space[3]}px ${space[5]}px`,
              background: P.borderSubtle,
              borderTop: `1px solid ${P.borderSubtle}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>
                Total
              </div>
              <div style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF, textAlign: 'right' }}>
                {fmtMoney(totalBudgeted)}
              </div>
              <div style={{
                fontSize: 12, fontWeight: type.weight.semibold, fontFamily: FF, textAlign: 'right',
                color: totalActual > totalBudgeted ? P.red : P.textPrimary,
              }}>
                {fmtMoney(totalActual)}
              </div>
              <div style={{
                fontSize: 12, fontWeight: type.weight.semibold, fontFamily: FF, textAlign: 'right',
                color: totalActual > totalBudgeted ? P.red : P.green,
              }}>
                {totalActual > totalBudgeted ? '+' : ''}{fmtMoney(totalActual - totalBudgeted)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 5: Vision & Style ────────────────────────────────────────────────────
// ── Step: The Celebration (meaning-first) ─────────────────────────────────────
// Board 2026-06-12 rebuild: this LEADS the intake — the conversation a real
// planner opens with, the night's MEANING, before colors or logistics. A
// read-only summary of what creation already captured sits up top so the
// planner never re-types name/type/date/venue. Drives the toast list, the
// day-of "heart of the night" card, vendor briefs, and the honoree protections.
function StepMeaning({ data, onChange }) {
  const honoree = (data.honoree || '').trim();
  const hon = honoree ? honoree.split(' ')[0] : 'them';
  // Read-only recap of the facts creation already has — kills the duplicate entry.
  const recap = [
    data.type && (data.secondaryType ? `${data.type} + ${data.secondaryType}` : data.type),
    honoree && `for ${honoree}`,
    data.date,
    data.venue,
    data.guestEstimate && `${data.guestEstimate} guests`,
  ].filter(Boolean);
  return (
    <div>
      {recap.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: space[6] }}>
          {recap.map((r, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: type.weight.medium, color: P.textSecondary, background: P.card, border: `1px solid ${P.borderSubtle}`, padding: '3px 10px', borderRadius: 999, fontFamily: FF }}>{r}</span>
          ))}
          <span style={{ fontSize: 10.5, color: P.textTertiary, fontFamily: FF }}>· set when you created the event</span>
        </div>
      )}

      <SectionHeading>WHAT THIS CELEBRATION MEANS</SectionHeading>
      <Field label="WHO'S HOSTING — AND WHAT DO THEY HOPE FOR THE NIGHT?">
        <TextInput value={data.meaning_host} onChange={v => onChange('meaning_host', v)} placeholder="e.g. Wanda's daughter — wants her mom to feel honored after 30 years of service" multiline rows={2} />
      </Field>
      <Field label={`GUEST OF HONOR — ${honoree ? honoree.toUpperCase() + "'S" : 'THEIR'} STORY / WHAT THEY'RE PROUDEST OF`}>
        <TextInput value={data.honoree_story} onChange={v => onChange('honoree_story', v)} placeholder="Who they are, the milestone, the moment that matters most…" multiline rows={2} />
      </Field>
      <TwoCol>
        <Field label="THREE WORDS FOR THE FEELING">
          <TextInput value={data.feeling_words} onChange={v => onChange('feeling_words', v)} placeholder="e.g. proud · warm · elegant" />
        </Field>
        <Field label="ONE MUST-HAVE MOMENT OR SURPRISE">
          <TextInput value={data.must_have_moment} onChange={v => onChange('must_have_moment', v)} placeholder="e.g. a video tribute from her unit at dinner" />
        </Field>
      </TwoCol>
      <Field label="WHY THIS MATTERS">
        <TextInput value={data.meaning_why} onChange={v => onChange('meaning_why', v)} placeholder="What this milestone means — the heart of the night" multiline rows={2} />
      </Field>

      {/* Board 2026-06-12 (Rafanelli) — the questions that actually PLAN the
          night: the people, the tears, and the things to protect against. */}
      <SectionHeading>GOING DEEPER</SectionHeading>
      <Field label="THE PEOPLE WHO MATTER MOST — AND YOUR HOPE FOR EACH">
        <TextInput value={data.meaning_people} onChange={v => onChange('meaning_people', v)} placeholder="e.g. her three kids (want them to give the toast), her old unit (the surprise), her late husband (a quiet tribute)" multiline rows={2} />
      </Field>
      <Field label={`THE ONE MOMENT THAT WOULD MAKE ${honoree ? honoree.toUpperCase() : 'THEM'} CRY THE GOOD TEARS`}>
        <TextInput value={data.meaning_cry_moment} onChange={v => onChange('meaning_cry_moment', v)} placeholder="The peak of the night — plan everything else around it" multiline rows={2} />
      </Field>
      <Field label={`ANYTHING ${hon.toUpperCase()} DOESN'T WANT?`}>
        <TextInput value={data.meaning_avoid} onChange={v => onChange('meaning_avoid', v)} placeholder="e.g. no long speeches, doesn't love being the center of attention, surprises are OK" multiline rows={2} />
      </Field>

      <SectionHeading>THE LITTLE THINGS THEY LOVE</SectionHeading>
      <TwoCol>
        <Field label="GUEST OF HONOR'S FAVORITE SONG">
          <TextInput value={data.honoree_song || data.honoreeSong} onChange={v => onChange('honoree_song', v)} placeholder="for a dedication" />
        </Field>
        <Field label="THEIR SIGNATURE DRINK">
          <TextInput value={data.honoree_drink || data.honoreeDrink} onChange={v => onChange('honoree_drink', v)} placeholder="name a cocktail after them" />
        </Field>
      </TwoCol>
    </div>
  );
}

// ── Step: Look & Feel (aesthetic, ADAPTIVE) ───────────────────────────────────
// Ceremony / first-dance / officiant fields only appear for wedding-type events
// (Tutera: a retirement party should never be asked for an officiant).
function Step5({ data, onChange }) {
  const isWedding = /wedding/i.test(`${data.type || ''} ${data.secondaryType || ''}`);
  return (
    <div>
      <SectionHeading>AESTHETIC</SectionHeading>
      <TwoCol>
        <Field label="OVERALL STYLE / VIBE">
          <TextInput value={data.style_vibe} onChange={v => onChange('style_vibe', v)} placeholder="e.g. Black-tie glam, Backyard casual, Modern minimal" />
        </Field>
        <Field label="COLOR PALETTE">
          <TextInput value={data.color_palette || data.theme} onChange={v => onChange('color_palette', v)} placeholder="e.g. gold & black, ivory & sage" />
        </Field>
        <Field label="FLORAL / DÉCOR DIRECTION">
          <TextInput value={data.floral_direction} onChange={v => onChange('floral_direction', v)} placeholder="e.g. dessert table, photo booth, lush centerpieces" />
        </Field>
        <Field label="LIGHTING NOTES">
          <TextInput value={data.lighting_notes} onChange={v => onChange('lighting_notes', v)} placeholder="e.g. Candlelight, bistro strings, uplighting" />
        </Field>
      </TwoCol>

      {isWedding && (
        <>
          <SectionHeading>CEREMONY</SectionHeading>
          <TwoCol>
            <Field label="CEREMONY TYPE">
              <TextInput value={data.ceremony_type} onChange={v => onChange('ceremony_type', v)} placeholder="e.g. Non-denominational, Catholic" />
            </Field>
            <Field label="OFFICIANT">
              <TextInput value={data.officiant} onChange={v => onChange('officiant', v)} placeholder="Name or TBD" />
            </Field>
            <Field label="CEREMONY LENGTH">
              <TextInput value={data.ceremony_length} onChange={v => onChange('ceremony_length', v)} placeholder="e.g. 30 minutes" />
            </Field>
            <Field label="SPECIAL RITUALS">
              <TextInput value={data.special_rituals} onChange={v => onChange('special_rituals', v)} placeholder="e.g. Unity candle, ring warming" />
            </Field>
          </TwoCol>
        </>
      )}

      <SectionHeading>{isWedding ? 'RECEPTION' : 'DINNER & DANCING'}</SectionHeading>
      <TwoCol>
        {isWedding && (
          <Field label="FIRST DANCE SONG">
            <TextInput value={data.first_dance_song} onChange={v => onChange('first_dance_song', v)} placeholder="Song title — Artist" />
          </Field>
        )}
        <Field label="DINNER FORMAT">
          <TextInput value={data.dinner_format} onChange={v => onChange('dinner_format', v)} placeholder="e.g. Plated, family style, buffet, stations" />
        </Field>
      </TwoCol>

      <Field label="MOOD BOARD / INSPIRATION NOTES">
        <TextInput value={data.inspiration_notes} onChange={v => onChange('inspiration_notes', v)} placeholder="Describe the overall feeling you want guests to walk away with..." multiline rows={4} />
      </Field>
    </div>
  );
}

// ── Step 6: Vendor Priorities ─────────────────────────────────────────────────
function Step6({ data, onChange }) {
  const vendors = data.vendors || [];

  // Proposed "still needed" categories now come from the market-research-grounded,
  // on-trend roster keyed to the event type (was a hardcoded wedding list that showed
  // Officiant/Hair/Cake even for a corporate conference). Falls back to type-aware
  // budget buckets for any uncurated type.
  const VENDOR_CATEGORIES = proposedVendorCategories(data.type);

  return (
    <div>
      <SectionHeading>CURRENT VENDORS</SectionHeading>
      {vendors.length === 0 ? (
        <div style={{ fontSize: 12, color: P.textTertiary, fontFamily: FF, marginBottom: space[5] }}>
          No vendors added yet
        </div>
      ) : (
        <div style={{
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.md, overflow: 'hidden', marginBottom: space[5],
        }}>
          {vendors.map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: `${space[3]}px ${space[5]}px`,
              borderBottom: i < vendors.length - 1 ? `1px solid ${P.borderSubtle}` : 'none',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: v.status === 'Confirmed' ? P.green
                  : v.status === 'Partial' ? P.amber
                  : P.borderDef,
              }} />
              <div style={{ flex: 1, fontSize: 12, color: P.textPrimary, fontFamily: FF }}>
                {v.name || v.vendor_name}
              </div>
              <div style={{ fontSize: 11, color: P.textSecondary, fontFamily: FF }}>
                {v.category || v.type}
              </div>
              <div style={{
                fontSize: 10, fontWeight: type.weight.medium,
                color: v.status === 'Confirmed' ? P.green
                  : v.status === 'Partial' ? P.amber
                  : P.textTertiary,
                fontFamily: FF, letterSpacing: '0.06em',
              }}>
                {(v.status || 'NOT STARTED').toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionHeading>STILL NEEDED</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: space[5] }}>
        {VENDOR_CATEGORIES.map(cat => {
          const booked = vendors.some(v =>
            (v.category || v.type || '').toLowerCase().includes(cat.split('/')[0].trim().toLowerCase())
          );
          return (
            <div key={cat} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: `${space[3]}px ${space[4]}px`,
              background: P.card, border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.sm,
              opacity: booked ? 0.5 : 1,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: booked ? P.green : P.borderDef,
              }} />
              <span style={{
                fontSize: 12, color: booked ? P.textSecondary : P.textPrimary,
                fontFamily: FF,
                textDecoration: booked ? 'line-through' : 'none',
              }}>
                {cat}
              </span>
            </div>
          );
        })}
      </div>

      <Field label="VENDOR NOTES OR PREFERENCES">
        <TextInput value={data.vendor_notes} onChange={v => onChange('vendor_notes', v)} placeholder="Any preferences, restrictions, or contacts the team should know about..." multiline rows={3} />
      </Field>
    </div>
  );
}

// ── Step 7: Review & Confirm ──────────────────────────────────────────────────
function Step7({ data }) {
  function fmtMoney(n) {
    return n ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
  }
  const budget = data.budget || [];
  const totalBudgeted = budget.reduce((s, r) => s + (Number(r.budgeted) || 0), 0);
  const clients = data.clients || [];

  const sections = [
    {
      heading: 'EVENT BASICS',
      rows: [
        ['Event name', data.name || '—'],
        ['Date', data.date || '—'],
        ['Venue', data.venue || '—'],
        ['Type', data.type || '—'],
        ['Ceremony time', data.ceremony_time || '—'],
      ],
    },
    {
      heading: 'PRIMARY CLIENT',
      rows: [
        ['Name', clients[0] ? `${clients[0].firstName || ''} ${clients[0].lastName || ''}`.trim() || '—' : '—'],
        ['Email', clients[0]?.email || '—'],
        ['Phone', clients[0]?.phone || '—'],
      ],
    },
    {
      heading: 'GUEST LIST',
      rows: [
        ['Estimated guests', data.guestEstimate || '—'],
        ['Confirmed', data.guest_confirmed || '—'],
        ['RSVP deadline', data.rsvp_deadline || '—'],
      ],
    },
    {
      heading: 'BUDGET',
      rows: [
        ['Total budgeted', totalBudgeted > 0 ? fmtMoney(totalBudgeted) : (data.total_budget ? fmtMoney(data.total_budget) : '—')],
        ['Vendors booked', `${(data.vendors || []).filter(v => v.status === 'Confirmed').length} of ${(data.vendors || []).length}`],
      ],
    },
  ];

  return (
    <div>
      <div style={{
        fontSize: 14, fontWeight: type.weight.semibold,
        color: P.textPrimary, fontFamily: FF, marginBottom: space[5],
      }}>
        Review all information before confirming.
      </div>

      {sections.map(sec => (
        <div key={sec.heading} style={{ marginBottom: space[6] }}>
          <SectionHeading>{sec.heading}</SectionHeading>
          <div style={{
            background: P.card, border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.md, padding: `0 ${space[5]}px`,
          }}>
            {sec.rows.map(([label, value], i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, padding: `${space[3]}px 0`,
                borderBottom: i < sec.rows.length - 1 ? `1px solid ${P.borderSubtle}` : 'none',
              }}>
                <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF }}>{label}</span>
                <span style={{ fontSize: 12, color: P.textPrimary, fontFamily: FF, fontWeight: type.weight.medium }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{
        padding: space[5],
        background: P.green + '12',
        border: `1px solid ${P.green}44`,
        borderRadius: radius.md,
        fontSize: 12, color: P.green, fontFamily: FF,
      }}>
        Intake information saved to event record. Use the PLAN layer to manage ongoing coordination.
      </div>
    </div>
  );
}

// ── Step sidebar ──────────────────────────────────────────────────────────────
function StepSidebar({ current, onStep, completedSteps }) {
  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: P.base,
      borderRight: `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column',
      paddingTop: space[6],
    }}>
      <div style={{
        fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.12em',
        color: P.textTertiary, fontFamily: FF,
        padding: `0 20px ${space[4]}px`,
      }}>
        INTAKE STEPS
      </div>

      {STEPS.map(step => {
        const isActive = current === step.n;
        const isDone = completedSteps.has(step.n);
        return (
          <button
            key={step.n}
            onClick={() => onStep(step.n)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', height: 38, padding: '0 20px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: isActive ? 'rgba(110,135,148,0.18)' : 'transparent',
              fontFamily: FF, fontSize: 12,
              fontWeight: isActive ? type.weight.semibold : type.weight.regular,
              color: isActive ? P.textPrimary : P.textSecondary,
            }}
          >
            {/* Step number / check */}
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: isDone ? P.green
                : isActive ? P.borderDef
                : 'transparent',
              border: isDone ? 'none'
                : isActive ? `1px solid ${P.textTertiary}`
                : `1px solid ${P.borderSubtle}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: type.weight.semibold,
              color: isDone ? '#fff' : isActive ? P.textSecondary : P.textTertiary,
              fontFamily: FF,
            }}>
              {isDone ? '✓' : step.n}
            </div>
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
// Sprint 50 gap fix #1: promoted to canonical Client Intake tab. The component
// now supports two rendering modes:
//   - Standalone overlay (onClose provided, no onBack) — legacy mode used by
//     PlanEventDashboard (retired) and any future deep-link entry point.
//   - Embedded tab (onBack provided) — renders inside the EventPlanner shell
//     with the standard "← Overview · Client Intake" workspace header,
//     matching the Sprint 49 promotion pattern used by D / E / F / G / H.
//
// When `onPersist` is provided the draft persists to host event state on
// Confirm Intake. Without it, the draft is local-only (display mode).
export default function ClientIntakeFlow({ event, onClose, onBack, isMobile, onPersist, intakeMode }) {
  const embedded = typeof onBack === 'function';
  // Seed from the persisted place so a <Suspense> remount restores the step
  // the planner was on instead of bouncing them back to the start.
  const [step, setStep] = useState(() => event._intakeStep || 1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  // Local draft — initialized from event prop. Persisted to host state via
  // onPersist on Confirm Intake (when provided).
  const [draft, setDraft] = useState(() => {
    return {
    name:          event.name,
    type:          event.type,
    date:          event.date,
    venue:         event.venue,
    guestEstimate: event.guestEstimate,
    budget:        event.budget || [],
    vendors:       event.vendors || [],
    clients:       event.clients || [],
    ...event,
    };
  });

  // Persist the latest draft to the host event. The Client Intake lives inside a
  // <Suspense> boundary that can re-suspend and REMOUNT this component (which
  // re-seeds `draft` and `step` from the event) — so we persist on every step
  // transition and a remount simply restores from the saved event. We do NOT
  // auto-save on a timer: under StrictMode that loops (persist → setEvent →
  // remount → persist …). Field blur covers within-step edits cheaply.
  const persist = (extra) => { if (typeof onPersist === 'function') onPersist({ ...draft, ...extra }); };

  function setField(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    setCompletedSteps(prev => new Set([...prev, step]));
    if (step < STEPS.length) {
      persist({ _intakeStep: step + 1 });   // save answers + new place BEFORE the step change
      setStep(s => s + 1);
    } else {
      persist({ _intakeStep: 1 });
      if (embedded) onBack();
      else if (typeof onClose === 'function') onClose();
    }
  }

  function handleBack() {
    if (step > 1) { persist({ _intakeStep: step - 1 }); setStep(s => s - 1); }
  }

  function handleSaveDraft() {
    if (typeof onPersist === 'function') onPersist(draft);
  }

  const stepContent = {
    1: <StepMeaning data={draft} onChange={setField} />,
    2: <Step2 data={draft} onChange={setField} />,
    3: <Step3 data={draft} onChange={setField} />,
    4: <Step4 data={draft} onChange={setField} />,
    5: <Step5 data={draft} onChange={setField} />,
    6: <Step6 data={draft} onChange={setField} />,
    7: <Step7 data={draft} />,
  };

  // Workspace header — board title rework (2026-06-11): no flush band; quiet
  // steel up-crumb, then the page name as a crisp ~22px sentence-case title
  // (matches LegacyTabHeader across every tab). Save Draft floats top-right.
  const workspaceHeader = embedded && (
    <div style={{
      flexShrink: 0, padding: '12px 16px 14px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
    }}>
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: type.weight.semibold, letterSpacing: '0.01em',
            color: P.textSecondary, padding: 0, marginBottom: 6,
            fontFamily: FF, display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          ‹ Overview
        </button>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: P.textPrimary, fontFamily: FF }}>
          Client Intake
        </div>
      </div>
      <button
        onClick={handleSaveDraft}
        style={{
          padding: '7px 14px', borderRadius: radius.sm, minHeight: 34,
          border: `1px solid ${P.borderSubtle}`,
          background: 'transparent', cursor: 'pointer',
          fontSize: 12, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF, flexShrink: 0,
        }}
      >
        Save Draft
      </button>
    </div>
  );

  // Container style — fixed full-screen for standalone, flex-column for tab.
  const containerStyle = embedded
    ? { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: P.canvas, fontFamily: FF }
    : { position: 'fixed', inset: 0, zIndex: 200, background: P.canvas, display: 'flex', flexDirection: 'column', fontFamily: FF };

  // Body — desktop shows sidebar + content; mobile collapses to content only.
  const showSidebar = !isMobile;

  return (
    <div style={containerStyle}>
      {/* Standalone keeps its original app bar; embedded uses workspace header */}
      {embedded ? workspaceHeader : (
        <div style={{
          height: 42, flexShrink: 0,
          background: P.base,
          borderBottom: `1px solid ${P.borderSubtle}`,
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 16,
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: P.textSecondary, fontFamily: FF,
              padding: 0, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ← {event.name || 'Event'}
          </button>
          <span style={{ fontSize: 12, color: P.borderDef }}>|</span>
          <span style={{
            fontSize: 13, fontWeight: type.weight.semibold,
            color: P.textPrimary, fontFamily: FF,
          }}>
            Client Intake
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSaveDraft}
            style={{
              padding: '4px 12px', borderRadius: radius.sm,
              border: `1px solid ${P.borderSubtle}`,
              background: 'transparent', cursor: 'pointer',
              fontSize: 11, fontWeight: type.weight.medium,
              color: P.textSecondary, fontFamily: FF,
            }}
          >
            Save Draft
          </button>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showSidebar && <StepSidebar current={step} onStep={setStep} completedSteps={completedSteps} />}

        {/* Step content — capped to reading measure (~760) and left-aligned
            against the steps rail. A questionnaire smeared to full Data width
            hurts legibility; the empty margin to the right is correct, not wasted. */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? `${space[6]}px ${space[5]}px` : `${space[7]}px ${space[9]}px`, maxWidth: isMobile ? 'none' : 840, boxSizing: 'border-box' }}>
          {/* Sprint 60.W — Intake Confidence card. Tells the planner whether
              this event is ready to start planning, what's missing, and one
              concrete next action. Lives above the step body so it's always
              the first thing the planner reads when opening Client Intake. */}
          {/* De-nag (board 2026-06-12, Bailey): the meaning step leads clean —
              the readiness/confidence chore-card never sits above the heart of
              the night. It returns on every other step. */}
          {step !== 1 && (() => {
            const steelBlueIC = '#4E6877';
            const amberIC = '#ECA13F';
            const greenIC = '#4FAE7A';
            const has = {
              name:    !!(draft.name || '').trim(),
              type:    !!(draft.type || '').trim(),
              date:    !!(draft.date || '').trim(),
              venue:   !!(draft.venue || '').trim(),
              guests:  !!(draft.guestEstimate && Number(draft.guestEstimate) > 0),
              budget:  Array.isArray(draft.budget) && draft.budget.some(b => Number(b.budgeted) > 0),
              contact: !!((draft.clients?.[0]?.email || '').trim() || (draft.clients?.[0]?.phone || '').trim()),
              prio:    !!(draft.priorities?.length || draft.mustHaves?.length),
            };
            let state;
            // Priority cascade — surface the most-blocking gap first.
            if (!has.name || !has.type || !has.date) {
              state = { label: 'Basics needed', color: amberIC, missing: ['Name', 'Type', 'Date'].filter((_, i) => ![has.name, has.type, has.date][i]), explain: 'Add the event name, type, and date in Event Details before anything else can be planned.', nextAction: 'Open Event Details', nextStep: null };
            } else if (!has.contact) {
              state = { label: 'Missing client contact', color: amberIC, missing: ['Email or phone'], explain: 'Add email or phone before sending approvals or reminders.', nextAction: 'Go to Client Contact', nextStep: 2 };
            } else if (!has.venue) {
              state = { label: 'Venue unknown', color: amberIC, missing: ['Venue'], explain: 'A venue anchors arrival times and the day-of schedule — add it in Event Details. You can plan without one for a while.', nextAction: 'Got it', nextStep: null };
            } else if (!has.guests) {
              state = { label: 'Guest count missing', color: amberIC, missing: ['Guest estimate'], explain: 'Caterer, seating, and budget estimates all depend on this. A rough number is enough.', nextAction: 'Go to Guest List', nextStep: 3 };
            } else if (!has.budget) {
              state = { label: 'Budget unknown', color: amberIC, missing: ['Budget'], explain: 'You can still plan, but vendor estimates and payment milestones will be less useful.', nextAction: 'Go to Budget Overview', nextStep: 4 };
            } else if (!has.prio) {
              state = { label: 'Vendor priorities incomplete', color: amberIC, missing: ['What matters most'], explain: 'Ask what matters most: food, music, photo/video, decor, venue, or schedule.', nextAction: 'Go to Vendor Priorities', nextStep: 6 };
            } else {
              state = { label: 'Enough to start planning', color: greenIC, missing: [], explain: 'You have enough to build the first plan. Budget and venue details can be refined later.', nextAction: 'Review & Confirm', nextStep: 7 };
            }
            return (
              <div style={{
                marginBottom: space[6],
                background: `linear-gradient(180deg, ${steelBlueIC}14 0%, ${steelBlueIC}07 100%)`,
                border: `1px solid ${steelBlueIC}33`,
                borderLeft: `3px solid ${state.color}`,
                borderRadius: 12,
                padding: isMobile ? '14px 14px' : '16px 20px',
                display: 'flex', gap: 14, alignItems: 'flex-start',
                fontFamily: FF,
              }}>
                <span aria-hidden style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                  background: `${state.color}22`, color: state.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, marginTop: 1,
                }}>{state.color === greenIC ? '✓' : '◐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: steelBlueIC, textTransform: 'uppercase' }}>Intake Confidence</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.textPrimary, marginTop: 2 }}>{state.label}</div>
                  <div style={{ fontSize: 12, color: P.textSecondary, marginTop: 5, lineHeight: 1.5 }}>{state.explain}</div>
                  {state.missing.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {state.missing.map(m => (
                        <span key={m} style={{ fontSize: 10.5, fontWeight: 700, color: amberIC, background: `${amberIC}14`, border: `1px solid ${amberIC}44`, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{m}</span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (state.nextStep && state.nextStep !== step) setStep(state.nextStep); }}
                    style={{
                      marginTop: 12,
                      background: `linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)`,
                      color: '#fff', border: 'none', cursor: 'pointer',
                      borderRadius: 8, padding: '8px 14px',
                      fontSize: 12, fontWeight: 700, fontFamily: FF,
                      letterSpacing: '0.01em',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)',
                    }}>
                    {state.nextAction} →
                  </button>
                </div>
              </div>
            );
          })()}

          <div style={{
            fontSize: 18, fontWeight: type.weight.semibold,
            color: P.textPrimary, fontFamily: FF, marginBottom: space[2],
          }}>
            {STEPS[step - 1].label}
          </div>
          <div style={{
            fontSize: 12, color: P.textSecondary, fontFamily: FF, marginBottom: space[7],
          }}>
            Step {step} of {STEPS.length}
          </div>

          {/* "Send to client" path (board 2026-06-12 fork): when the planner is
              setting up solo, point them at Share with client to collect the
              answers — they can also fill in what they already know. */}
          {step === 1 && intakeMode === 'client' && (
            <div style={{
              marginBottom: space[6], padding: isMobile ? '12px 14px' : '13px 18px',
              background: '#4E687712', border: '1px solid #4E687733', borderLeft: '3px solid #4E6877',
              borderRadius: 12, fontFamily: FF,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.textPrimary }}>Collecting this from the client?</div>
              <div style={{ fontSize: 12, color: P.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                Use <strong>Share with client</strong> (top right) to send them their story to fill in — or capture what you already know here and refine it together later.
              </div>
            </div>
          )}

          {/* Blur-persist: any field that loses focus saves its answer, so a
              remount mid-step restores from the event instead of losing it. */}
          <div onBlur={() => persist({ _intakeStep: step })}>
            {stepContent[step]}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        height: 52, flexShrink: 0,
        background: P.base,
        borderTop: `1px solid ${P.borderSubtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px',
      }}>
        <button
          onClick={handleBack}
          disabled={step === 1}
          style={{
            padding: '6px 16px', borderRadius: radius.sm,
            border: `1px solid ${P.borderSubtle}`,
            background: 'transparent', cursor: step === 1 ? 'default' : 'pointer',
            fontSize: 12, fontWeight: type.weight.medium,
            color: step === 1 ? P.textTertiary : P.textSecondary,
            fontFamily: FF, opacity: step === 1 ? 0.4 : 1,
          }}
        >
          ← {step > 1 ? (isMobile ? 'Back' : STEPS[step - 2].label) : 'Back'}
        </button>

        <span style={{ fontSize: 11, color: P.textTertiary, fontFamily: FF }}>
          {step} of {STEPS.length}
        </span>

        <button
          onClick={handleNext}
          style={{
            padding: '6px 16px', borderRadius: radius.sm,
            border: `1px solid ${step === STEPS.length ? P.green : P.borderSubtle}`,
            background: step === STEPS.length ? P.green : 'transparent',
            cursor: 'pointer',
            fontSize: 12, fontWeight: type.weight.medium,
            color: step === STEPS.length ? '#fff' : P.textSecondary,
            fontFamily: FF,
          }}
        >
          {step === STEPS.length ? 'Confirm Intake' : (isMobile ? 'Next →' : `${STEPS[step].label} →`)}
        </button>
      </div>
    </div>
  );
}
