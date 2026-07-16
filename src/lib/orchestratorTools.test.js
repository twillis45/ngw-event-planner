import { TOOLS, toolSchemas, toolNames, runTool } from './orchestratorTools';
import { hostSpending } from './hostSpending';
import { playbookFoodPlan, attendanceBand } from './playbooks';

// A minimal but valid event the pure engines all tolerate.
const EVENT = { id: 'ev-test', type: 'Birthday', guestCount: 40, guestMode: 'count', date: '2027-03-20', totalBudget: 3000 };

describe('orchestrator tool layer (B1)', () => {
  test('every tool exposes a valid Claude schema — empty input (model names the read, not the data)', () => {
    const schemas = toolSchemas();
    expect(schemas.length).toBe(TOOLS.length);
    schemas.forEach((s) => {
      expect(typeof s.name).toBe('string');
      expect(s.description.length).toBeGreaterThan(10);
      expect(s.input_schema.type).toBe('object');
      expect(s.input_schema.properties).toEqual({});
      expect(s.input_schema.additionalProperties).toBe(false);
    });
  });

  test('tool names are unique and match toolNames()', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(toolNames()).toEqual(names);
    expect(names).toEqual(expect.arrayContaining(['get_money', 'get_food_plan', 'get_headcount', 'get_decisions', 'get_run_of_show']));
  });

  // The invariant the whole "grounded, never fabricated" doctrine rests on: a
  // tool returns the engine's output VERBATIM — deep-equal to calling the engine
  // directly. If this holds, the model can never have a number the engine didn't.
  test('get_headcount is a verbatim passthrough to attendanceBand', () => {
    const viaTool = runTool('get_headcount', { event: EVENT });
    expect(viaTool.ok).toBe(true);
    expect(viaTool.result).toEqual(attendanceBand(EVENT));
  });

  test('get_money is a verbatim passthrough to hostSpending', () => {
    const viaTool = runTool('get_money', { event: EVENT });
    expect(viaTool.ok).toBe(true);
    expect(viaTool.result).toEqual(hostSpending(EVENT, undefined));
  });

  test('get_food_plan is a verbatim passthrough to playbookFoodPlan', () => {
    const viaTool = runTool('get_food_plan', { event: EVENT });
    expect(viaTool.ok).toBe(true);
    expect(viaTool.result).toEqual(playbookFoodPlan(EVENT));
  });

  test('ctx params (priceFactor) reach the engine, not the model', () => {
    // hostSpending(event, priceFactor) — a different factor must change the read,
    // proving the param rides through ctx (server-invisible), not tool input.
    const a = runTool('get_money', { event: EVENT, priceFactor: 1.0 }).result;
    const b = runTool('get_money', { event: EVENT, priceFactor: 1.8 }).result;
    expect(a).toEqual(hostSpending(EVENT, 1.0));
    expect(b).toEqual(hostSpending(EVENT, 1.8));
  });

  test('unknown tool → honest error, never a guessed value', () => {
    const r = runTool('get_the_winning_lottery_numbers', { event: EVENT });
    expect(r.error).toBe('unknown_tool');
    expect(r.ok).toBeUndefined();
  });

  test('missing event → honest error (no fabrication from thin air)', () => {
    const r = runTool('get_money', {});
    expect(r.error).toBe('no_event_in_context');
  });

  test('an engine that throws is reported as engine_error, not swallowed', () => {
    // Force a throw by handing an engine a shape it cannot read.
    const poison = Object.create(null);
    Object.defineProperty(poison, 'type', { get() { throw new Error('boom'); } });
    const r = runTool('get_food_plan', { event: poison });
    expect(r.error).toBe('engine_error');
    expect(r.detail).toContain('boom');
  });
});
