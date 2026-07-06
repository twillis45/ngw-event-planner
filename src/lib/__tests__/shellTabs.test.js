// CTA-REPAIR-1 — THE navigation contract. Every CTA route resolves through
// resolveShellTab; these pins guarantee (1) no route can ever produce a blank
// content area on either shell, (2) legacy aliases keep resolving, (3) the
// host-specific remaps land on the surfaces that actually own the work.

import { resolveShellTab, normalizeEventTabRoute, hostResolveTab, HOST_TABS, PLANNER_TABS } from '../shellTabs';

// Every tab literal the engines/CTAs emit anywhere in the app (swept from
// CommandCenter, App, workstreams, VendorPlanningWorkspace). If a new route
// target is introduced, add it here — the pin below proves it renders.
const ALL_EMITTED_TARGETS = [
  'Command', 'Overview', 'Vendors', 'Planning', 'Planning Tasks', 'Timeline',
  'Checklist', 'Communication', 'Guests', 'Event Details', 'Details', 'Budget',
  'Decisions', 'Event Day Schedule', 'Run of Show', 'Now', 'Seating', 'Agenda',
  'Documents', 'Client Intake', 'Calendar', 'Arrivals', 'Crew',
];

describe('no route can blank a shell', () => {
  test('HOST: every emitted target resolves to a real host render branch', () => {
    ALL_EMITTED_TARGETS.forEach(t => {
      const r = resolveShellTab('host', t);
      expect(HOST_TABS.has(r.tab)).toBe(true);
    });
  });

  test('PLANNER: every emitted target resolves to a real planner render branch', () => {
    ALL_EMITTED_TARGETS.forEach(t => {
      const r = resolveShellTab('planner', t);
      expect(PLANNER_TABS.has(r.tab)).toBe(true);
    });
  });

  test('garbage/unknown tabs land on Command, never blank', () => {
    expect(resolveShellTab('host', 'NoSuchTab').tab).toBe('Command');
    expect(resolveShellTab('planner', 'NoSuchTab').tab).toBe('Command');
    expect(resolveShellTab('host', undefined).tab).toBe('Command');
  });
});

describe('host remaps land on the owning surface (the fixed blank-screen bugs)', () => {
  test("Decisions → Planning (host decisions live on Plan's What to settle)", () => {
    expect(resolveShellTab('host', 'Decisions').tab).toBe('Planning');
  });
  test('Communication → Command (host has no comms surface; was a blank tab)', () => {
    expect(resolveShellTab('host', 'Communication').tab).toBe('Command');
  });
  test('Timeline → Event Day Schedule (run-of-show is the host timeline)', () => {
    expect(resolveShellTab('host', 'Timeline').tab).toBe('Event Day Schedule');
  });
  test('planner keeps its own Decisions/Communication tabs', () => {
    expect(resolveShellTab('planner', 'Decisions').tab).toBe('Decisions');
    expect(resolveShellTab('planner', 'Communication').tab).toBe('Communication');
  });
});

describe('legacy aliases keep resolving (D-1B contracts)', () => {
  test('Details → Event Details; Overview → Command; Run of Show → Event Day Schedule', () => {
    expect(normalizeEventTabRoute('Details').tab).toBe('Event Details');
    expect(normalizeEventTabRoute('Overview').tab).toBe('Command');
    expect(normalizeEventTabRoute('Run of Show').tab).toBe('Event Day Schedule');
  });
  test('Planning Tasks / Timeline / Checklist resolve to Planning views with item ids', () => {
    expect(normalizeEventTabRoute('Planning Tasks', 't9')).toEqual({ tab: 'Planning', planningView: 'list', openId: 't9' });
    expect(resolveShellTab('planner', 'Timeline', 'tl1')).toEqual({ tab: 'Planning', planningView: 'timeline', openId: 'tl1' });
  });
  test('hostResolveTab passes ordinary tabs through untouched', () => {
    expect(hostResolveTab('Budget')).toBe('Budget');
    expect(hostResolveTab('Vendors')).toBe('Vendors');
  });
});
