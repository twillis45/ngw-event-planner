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

const P = {
  canvas:       color.surface.canvas,
  base:         color.surface.base,
  card:         color.surface.card,
  borderSubtle: color.border.subtle,
  borderDef:    color.border.default,
  textPrimary:   '#eef0f4',
  textSecondary: color.text.secondary,
  textTertiary:  color.text.tertiary,
  green:  color.status.confirmed,
  amber:  color.status.warning,
  red:    color.status.risk,
};
const FF = type.family;

// ── 7 Intake Steps ────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Event Basics' },
  { n: 2, label: 'Client Contact' },
  { n: 3, label: 'Guest List' },
  { n: 4, label: 'Budget Overview' },
  { n: 5, label: 'Vision & Style' },
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

function TextInput({ value, onChange, placeholder, multiline, rows }) {
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
        <Field label="EVENT TYPE">
          <TextInput value={data.type} onChange={v => onChange('type', v)} placeholder="e.g. Wedding" />
        </Field>
        <Field label="EVENT DATE">
          <TextInput value={data.date} onChange={v => onChange('date', v)} placeholder="YYYY-MM-DD" />
        </Field>
        <Field label="CEREMONY TIME">
          <TextInput value={data.ceremony_time} onChange={v => onChange('ceremony_time', v)} placeholder="e.g. 4:00 PM" />
        </Field>
      </TwoCol>

      <SectionHeading>VENUE</SectionHeading>
      <TwoCol>
        <Field label="VENUE NAME">
          <TextInput value={data.venue} onChange={v => onChange('venue', v)} placeholder="e.g. Bluebell Estate" />
        </Field>
        <Field label="VENUE CITY">
          <TextInput value={data.venue_city} onChange={v => onChange('venue_city', v)} placeholder="e.g. Sonoma, CA" />
        </Field>
        <Field label="RECEPTION VENUE">
          <TextInput value={data.reception_venue} onChange={v => onChange('reception_venue', v)} placeholder="Same as ceremony?" />
        </Field>
        <Field label="COCKTAIL HOUR">
          <TextInput value={data.cocktail_time} onChange={v => onChange('cocktail_time', v)} placeholder="e.g. 5:30 PM" />
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
        <TextInput value={c1.preferredContact} onChange={v => updateClient(0, 'preferredContact', v)} placeholder="e.g. Text, Email, Phone" />
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
          <TextInput value={data.address_city} onChange={v => onChange('address_city', v)} placeholder="City" />
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
        <Field label="CEREMONY SEATS NEEDED">
          <TextInput value={data.ceremony_seats} onChange={v => onChange('ceremony_seats', v)} placeholder="e.g. 160" />
        </Field>
        <Field label="RECEPTION SEATS NEEDED">
          <TextInput value={data.reception_seats} onChange={v => onChange('reception_seats', v)} placeholder="e.g. 150" />
        </Field>
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
          <TextInput value={data.rsvp_deadline} onChange={v => onChange('rsvp_deadline', v)} placeholder="YYYY-MM-DD" />
        </Field>
        <Field label="RSVP METHOD">
          <TextInput value={data.rsvp_method} onChange={v => onChange('rsvp_method', v)} placeholder="e.g. Online form, Mail" />
        </Field>
      </TwoCol>

      <SectionHeading>SPECIAL NEEDS</SectionHeading>
      <Field label="DIETARY RESTRICTIONS (NOTED SO FAR)">
        <TextInput value={data.dietary_notes} onChange={v => onChange('dietary_notes', v)} placeholder="e.g. 3 vegan, 2 gluten-free, 1 nut allergy" multiline rows={2} />
      </Field>
      <Field label="ACCESSIBILITY REQUIREMENTS">
        <TextInput value={data.accessibility_notes} onChange={v => onChange('accessibility_notes', v)} placeholder="e.g. 2 guests in wheelchairs" multiline rows={2} />
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
function Step5({ data, onChange }) {
  return (
    <div>
      <SectionHeading>AESTHETIC</SectionHeading>
      <TwoCol>
        <Field label="OVERALL STYLE / VIBE">
          <TextInput value={data.style_vibe} onChange={v => onChange('style_vibe', v)} placeholder="e.g. Romantic garden, Modern minimal" />
        </Field>
        <Field label="COLOR PALETTE">
          <TextInput value={data.color_palette} onChange={v => onChange('color_palette', v)} placeholder="e.g. Ivory, blush, sage green" />
        </Field>
        <Field label="FLORAL DIRECTION">
          <TextInput value={data.floral_direction} onChange={v => onChange('floral_direction', v)} placeholder="e.g. Lush, organic, peonies" />
        </Field>
        <Field label="LIGHTING NOTES">
          <TextInput value={data.lighting_notes} onChange={v => onChange('lighting_notes', v)} placeholder="e.g. Candlelight, bistro strings" />
        </Field>
      </TwoCol>

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

      <SectionHeading>RECEPTION</SectionHeading>
      <TwoCol>
        <Field label="FIRST DANCE SONG">
          <TextInput value={data.first_dance_song} onChange={v => onChange('first_dance_song', v)} placeholder="Song title — Artist" />
        </Field>
        <Field label="DINNER FORMAT">
          <TextInput value={data.dinner_format} onChange={v => onChange('dinner_format', v)} placeholder="e.g. Plated, family style, buffet" />
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

  const VENDOR_CATEGORIES = [
    'Photography', 'Videography', 'Catering', 'Florals',
    'Music / DJ', 'Band', 'Hair & Makeup', 'Transportation',
    'Cake / Desserts', 'Officiant', 'Rentals', 'Lighting',
  ];

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
              background: isActive ? P.borderSubtle : 'transparent',
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
//     with the standard "← Command Center · Client Intake" workspace header,
//     matching the Sprint 49 promotion pattern used by D / E / F / G / H.
//
// When `onPersist` is provided the draft persists to host event state on
// Confirm Intake. Without it, the draft is local-only (display mode).
export default function ClientIntakeFlow({ event, onClose, onBack, isMobile, onPersist }) {
  const embedded = typeof onBack === 'function';
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  // Local draft — initialized from event prop. Persisted to host state via
  // onPersist on Confirm Intake (when provided).
  const [draft, setDraft] = useState({
    name:          event.name,
    type:          event.type,
    date:          event.date,
    venue:         event.venue,
    guestEstimate: event.guestEstimate,
    budget:        event.budget || [],
    vendors:       event.vendors || [],
    clients:       event.clients || [],
    ...event,
  });

  function setField(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    setCompletedSteps(prev => new Set([...prev, step]));
    if (step < STEPS.length) {
      setStep(s => s + 1);
    } else {
      // Confirm Intake — persist to host event state, then either route back
      // to Command Center (embedded) or close the overlay (standalone).
      if (typeof onPersist === 'function') onPersist(draft);
      if (embedded) onBack();
      else if (typeof onClose === 'function') onClose();
    }
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
  }

  function handleSaveDraft() {
    if (typeof onPersist === 'function') onPersist(draft);
  }

  const stepContent = {
    1: <Step1 data={draft} onChange={setField} />,
    2: <Step2 data={draft} onChange={setField} />,
    3: <Step3 data={draft} onChange={setField} />,
    4: <Step4 data={draft} onChange={setField} />,
    5: <Step5 data={draft} onChange={setField} />,
    6: <Step6 data={draft} onChange={setField} />,
    7: <Step7 data={draft} />,
  };

  // Workspace header — matches the Sprint 49 promoted-tab pattern.
  const workspaceHeader = embedded && (
    <div style={{
      height: 42, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px',
      background: P.base,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, cursor: 'pointer',
          fontSize: 11, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px',
        }}
      >
        ← Command Center
      </button>
      <span style={{
        fontSize: 9, fontWeight: type.weight.semibold,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: P.textTertiary, fontFamily: FF,
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

        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? `${space[6]}px ${space[5]}px` : `${space[7]}px ${space[9]}px` }}>
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
          {stepContent[step]}
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
