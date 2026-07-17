// ─── Orchestrator tool layer — Sprint 2 · B1 ────────────────────────────────
//
// Thin, typed adapters exposing the pure lib/ engines as Claude tools (D1:
// Claude tool-calling alongside the existing OpenAI proxy). The hard rule the
// whole orchestrator rests on: **a tool NEVER computes anything** — it calls the
// real engine and returns its output verbatim, so "every number in a reply comes
// from a tool call, never the model's head."
//
// Executed CLIENT-SIDE. The server orchestrator (Claude) emits a `tool_use`
// naming WHICH read it wants; the client runs the engine — already loaded, pure
// JS, no network round-trip (the light-and-fast doctrine) — and returns the
// `tool_result`. The event and any params (priceFactor/profile) live in the
// client-supplied ctx, invisible to the model, so it can never fabricate them.
//
// Add a tool = one entry in TOOLS wrapping an engine. Put NO logic here.

import { hostSpending } from './hostSpending';
import { playbookFoodPlan, attendanceBand, playbookDecisionBoard, effectiveRos } from './playbooks';
import { buildCrabPlan } from './crabPlan';
import { buildBudgetRecoveryPlan } from './budgetRecovery';
import { buildTravelPlan } from './travelPlan';
import { buildVendorPlan } from './vendorPlan';

// Each tool: { name, description, run(event, ctx) }. `run` is a pure passthrough
// to one engine — no branching, no math. The description is what Claude reads to
// choose the tool, so it names the host-facing question the tool answers.
export const TOOLS = [
  // The description carries the SCHEMA CONTAINMENT on purpose. `committed` already
  // includes foodEstimate/suppliesEstimate/capacityEstimate/crabEstimate/vendorOwed,
  // which the flat shape cannot show — on a live B3 run the model composed
  // `total - committed - foodEstimate` and understated the host's headroom by the
  // entire food estimate. `uncommitted` is the engine's own derived answer; saying so
  // here means the model reads a grounded number instead of inventing the arithmetic.
  { name: 'get_money',           description: "The host's spending: planned budget, what's committed, what's spent, and `uncommitted` — the headroom left. Use for any 'can I afford / how much is left' question. Read `uncommitted` directly; do NOT compute headroom yourself: `committed` ALREADY INCLUDES foodEstimate, suppliesEstimate, capacityEstimate, crabEstimate and vendorOwed, so subtracting any of those from `total` alongside `committed` double-counts them. `uncommitted` is null when no budget is set, and negative when the plan commits past the budget.", run: (event, ctx) => hostSpending(event, ctx.priceFactor) },
  { name: 'get_food_plan',       description: 'The food plan: cost band, per-head range, and the guest count it is sized for.',                                                    run: (event) => playbookFoodPlan(event) },
  { name: 'get_headcount',       description: 'The resolved guest count and the honest attendance band (the likely turnout range on the day).',                                    run: (event) => attendanceBand(event) },
  { name: 'get_decisions',       description: 'The decision board: which decisions are open, which are locked, and what needs the host next.',                                     run: (event, ctx) => playbookDecisionBoard(event, ctx.asOf, ctx.profile) },
  { name: 'get_crab_plan',       description: 'The crab order: crabs per person, the order lines, and cost. Relevant only for a crab feast.',                                      run: (event) => buildCrabPlan(event) },
  { name: 'get_budget_recovery', description: 'When over budget: the over-budget math and the per-line safe cuts that get back under the number.',                                 run: (event, ctx) => buildBudgetRecoveryPlan(event, ctx.priceFactor) },
  { name: 'get_travel_plan',     description: 'For a destination event: lodging, air, and ground-transport rollups across the guest list.',                                        run: (event) => buildTravelPlan(event) },
  { name: 'get_vendor_plan',     description: 'Vendor readiness: who is booked, who is still pending, and what each vendor still needs.',                                           run: (event) => buildVendorPlan(event) },
  { name: 'get_run_of_show',     description: 'The day-of run of show — the timeline of what happens when.',                                                                       run: (event) => effectiveRos(event) },
];

const BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

// Claude tool-use schemas. `input_schema` is an empty object schema on purpose:
// these tools take NO model-supplied arguments — they read the current event
// from ctx. The model chooses the read; it never supplies the data.
export function toolSchemas() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  }));
}

export function toolNames() {
  return TOOLS.map((t) => t.name);
}

// Dispatch one tool_use to its engine. ctx = { event, profile, priceFactor,
// asOf, now } supplied by the client. Returns { ok, result } with the engine
// output verbatim, or { error } the orchestrator MUST surface honestly — never
// a guessed value substituted for a missing tool result.
export function runTool(name, ctx = {}) {
  const tool = BY_NAME[name];
  if (!tool) return { error: 'unknown_tool', name };
  if (!ctx.event) return { error: 'no_event_in_context', name };
  try {
    return { ok: true, name, result: tool.run(ctx.event, ctx) };
  } catch (e) {
    return { error: 'engine_error', name, detail: String((e && e.message) || e) };
  }
}
