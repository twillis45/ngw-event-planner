// src/lib/webhookService.js
// Sprint 68 — Outbound Webhooks
//
// Fires event.created, payment_due, and decision.approved payloads to any
// planner-configured URL. Uses the backend relay route to avoid CORS
// restrictions on webhook receiver endpoints.
//
// CTA truthfulness: DONE — webhook fires, delivery logged, retry is Phase 4.
// Source-of-truth: NGW is the trigger source. The receiving system decides
// what to do with the payload.

import { venueFor } from './venueFor';
import { guestCountFor, guestCountIsConfirmed } from './guestCountFor';
import { plannerAuthHeaders } from './commApi';

const BASE = process.env.REACT_APP_API_BASE_URL;
const LOG_KEY  = 'ngw-webhook-log';
const MAX_LOG  = 50;

// ── Local log helpers ─────────────────────────────────────────────────────────
function getLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}
function saveLog(entries) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG))); } catch {}
}

export function getWebhookLog()  { return getLog(); }
export function clearWebhookLog() { try { localStorage.removeItem(LOG_KEY); } catch {} }

// ── Main fire function ────────────────────────────────────────────────────────

/**
 * Fire a webhook to the planner-configured URL.
 *
 * Route:
 *  1. If backend is configured → POST /api/webhooks/relay (server-side fire,
 *     no CORS issues, same pattern as email / AI proxy).
 *  2. No backend → direct browser fetch (works only if receiver has permissive
 *     CORS — works for webhook.site, pipedream, make.com, zapier catch-hook).
 *
 * @param {string} webhookUrl  Planner-configured webhook URL
 * @param {string} eventType   'event.created' | 'payment_due' | 'decision.approved'
 * @param {object} payload     The event/decision data to send
 * @returns {object}           { eventType, status, timestamp, error? }
 */
export async function fireWebhook(webhookUrl, eventType, payload) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return null;

  const body = {
    event:     eventType,
    timestamp: new Date().toISOString(),
    source:    'ngw-event-planner',
    version:   '1.0',
    data:      payload,
  };

  const logEntry = {
    eventType,
    webhookUrl,
    timestamp: body.timestamp,
    status:    'pending',
  };

  const log = getLog();

  try {
    let ok = false;
    let statusCode = 0;

    if (BASE) {
      // ── Server-side relay (preferred) ─────────────────────────────────────
      // The relay is PLANNER-ONLY as of 2026-08-07. It used to accept an
      // arbitrary destination from an unauthenticated body, which made it an
      // SSRF into the deployment's own network; closing that added
      // require_planner server-side, so this call has to carry the same headers
      // every other planner endpoint sends or it now gets a 401.
      const res = await fetch(`${BASE}/api/webhooks/relay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...(await plannerAuthHeaders()) },
        body:    JSON.stringify({ url: webhookUrl, payload: body }),
      });
      ok         = res.ok;
      statusCode = res.status;
    } else {
      // ── Direct browser fetch (fallback) ───────────────────────────────────
      const res = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      ok         = res.ok;
      statusCode = res.status;
    }

    logEntry.status     = ok ? 'delivered' : 'failed';
    logEntry.statusCode = statusCode;
  } catch (err) {
    logEntry.status = 'error';
    logEntry.error  = err?.message || 'Network error';
  }

  saveLog([logEntry, ...log]);
  return logEntry;
}

/**
 * Build a standard event.created payload from an event object.
 */
export function buildEventCreatedPayload(event) {
  return {
    id:       event.id,
    name:     event.name,
    type:     event.type,
    date:     event.date,
    venue:    venueFor(event).name || null,
    city:     event.city || null,
    // ── A NUMBER WE INVENTED MAY NOT LEAVE THE APP (2026-10-18, Sprint 0 P0-2)
    // This payload is fired at a host-configured external URL
    // (App.js:46394), so whatever sits in `guests` is read by someone who is
    // not us — and quoted against. The creation seam substitutes a playbook
    // typical when the host gave no count and records that as
    // `guestCountSource: 'playbook-typical'`; `draftVendorOutreach` shipped
    // exactly such a number to a caterer before `doItForMe` was gated. This is
    // the same gate, in the other outward path.
    //
    // It also fixes a narrower bug this line always had: reading the raw
    // estimate meant a LOCKED `guestCount` and a hand-entered roster were both
    // ignored, so the most reliable numbers in the event were the ones most
    // likely to be sent as null. `guestCountFor` resolves all three.
    guests:   guestCountIsConfirmed(event) ? guestCountFor(event).count : null,
    status:   event.status || 'active',
    clientId: event.clientId || null,
  };
}

/**
 * Build a payment_due payload from a budget row.
 */
export function buildPaymentDuePayload(event, budgetRow) {
  return {
    eventId:   event.id,
    eventName: event.name,
    eventDate: event.date,
    vendor:    budgetRow.vendor || budgetRow.category || 'Unknown vendor',
    amount:    budgetRow.amount || budgetRow.cost || 0,
    dueDate:   budgetRow.dueDate || budgetRow.payDueDate || null,
    paid:      budgetRow.paid || budgetRow.balancePaid || false,
  };
}
