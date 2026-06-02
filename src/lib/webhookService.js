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
      const res = await fetch(`${BASE}/api/webhooks/relay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
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
    venue:    event.venue || null,
    city:     event.city || null,
    guests:   event.guestEstimate || null,
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
