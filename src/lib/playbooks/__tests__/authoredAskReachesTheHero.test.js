// ─── AN AUTHORED ASK IS ONLY SHIPPED IF IT REACHES THE HERO ──────────────────
//
// heroAsk.js prefers an authored `ask` above everything else, and everything
// below that preference classifies a row by its DOMAIN and its TITLE. That
// ladder misfires whenever a surface's domain is not its job — the file
// documents two live cases (a seating raise answered "Add who's coming", a
// lodging cue answered "Add the location"), and a decision with no ask reached
// the host inside the generic "Settle your decisions."
//
// MEASURED BEFORE (all 45 playbooks x horizons 180/60/30, open rows, the event
// shape heroAskNeverPlaceholder.test.js sweeps): 362 of 594 board rows (60.9%)
// carried an authored ask and 114 distinct decisions carried none — including
// the wedding's two most consequential calls, "Venue + date" and "Total budget
// + who pays". AFTER authoring those 114: 594 of 594 rows, 267 of 267 distinct
// decisions.
//
// A number in a comment is not a guarantee, so this file pins the mechanism
// instead: every authored ask survives the board projection, the hero returns
// it VERBATIM rather than re-deriving anything from the title, and a row with
// no ask still says something real. Nothing here asserts a count that a new
// playbook would break.
import { ALL_PLAYBOOKS, playbookDecisionBoard } from '../index';
import { eventPlan } from '../../../CommandCenter';
import { heroAskFor } from '../../heroAsk';
import { isCircularAsk, questionFrom, normalizeAsk } from '../../askVoice';

const isoIn = (d) => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
// The same event shape the placeholder guard sweeps, so the two files measure
// the same product rather than two different hypotheticals.
const EV = (type, days) => ({
  id: 'ev-ask', type, date: isoIn(days), venue: 'The Hall', venueCity: 'Santa Fe, NM',
  guestMode: 'count', guestCount: 40, totalBudget: 8000,
});
const STAGES = [180, 60, 30];

// The board row as the hero receives it: the shell carries the row's label as
// the action TITLE and the row's ask alongside it. Projecting it here is what
// makes this a test of the seam and not of a field in isolation.
const asAction = (row) => ({ title: row.label, ask: row.ask, domain: row.domain, route: row.route });

// A GATED DECISION WAS INVISIBLE TO THIS SWEEP (2026-09-19). Four decisions in
// the corpus carry a `whenChoice`, and the fixture above never sets one — so a
// gated decision could author an ask, ship it, and never be checked here. Found
// by authoring the first such ask (Watch Party's `ppv_cost`, gated on
// `major_event: 'UFC / Boxing'`), which failed this file rather than passing
// unseen. The fix is to OPEN the gates, not to exempt the row.
//
// The choices are read off the corpus itself — each gate's own first accepted
// value — so a new gate is covered the day it is authored, with no list here to
// keep in step.
const gateChoices = (pb) => {
  const picks = {};
  for (const d of (pb.decisions || [])) {
    const w = d && d.whenChoice;
    if (w && w.id && Array.isArray(w.in) && w.in.length) picks[w.id] = w.in[0];
  }
  return picks;
};

const allRows = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    const picks = gateChoices(pb);
    const variants = Object.keys(picks).length ? [null, picks] : [null];
    for (const d of STAGES) {
      for (const foodChoices of variants) {
        const ev = foodChoices ? { ...EV(pb.type, d), foodChoices } : EV(pb.type, d);
        const b = playbookDecisionBoard(ev);
        for (const r of [...b.open, ...b.locked, ...b.deferred]) out.push({ type: pb.type, row: r });
      }
    }
  }
  return out;
};

const authoredDecisions = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) if (d && d.ask) out.push({ type: pb.type, d });
  }
  return out;
};

describe('the authored ask survives to the board', () => {
  test('PREMISE — the sweep really produces rows and authored asks', () => {
    // A coverage claim over an empty sweep is a claim about nothing.
    expect(allRows().length).toBeGreaterThan(400);
    expect(authoredDecisions().length).toBeGreaterThan(100);
  });

  test('every decision that authors an ask puts that exact string on a board row', () => {
    const onBoard = new Set(allRows().map(({ type, row }) => `${type}::${row.id}::${row.ask || ''}`));
    const missing = authoredDecisions()
      .filter(({ type, d }) => !onBoard.has(`${type}::${d.id}::${d.ask}`))
      .map(({ type, d }) => `${type}::${d.id}`);
    expect(missing).toEqual([]);
  });

  test('and no row is left without one — every open decision asks something', () => {
    // The gap this file was written for: 114 decisions reached the host with no
    // question of their own. Foundation rows (f-date / f-headcount) are not
    // playbook decisions and are excluded — they are the negative control below.
    const silent = allRows()
      .filter(({ row }) => !String(row.id || '').startsWith('f-') && !row.ask)
      .map(({ type, row }) => `${type}::${row.id}`);
    expect([...new Set(silent)]).toEqual([]);
  });
});

describe('the hero returns the authored ask, not a guess at it', () => {
  test('heroAskFor gives back every authored ask VERBATIM', () => {
    const wrong = [];
    for (const { type, row } of allRows()) {
      if (!row.ask) continue;
      const got = heroAskFor(asAction(row));
      if (got !== row.ask) wrong.push(`${type}::${row.id} → "${got}" (wanted "${row.ask}")`);
    }
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  test('the ask beats the prose ladder even where domain and title disagree', () => {
    // The two misfires heroAsk.js documents. Both titles still route into the
    // wrong branch on their own; the authored ask is what stops them.
    expect(heroAskFor({ title: '2 confirmed guests still need seats', domain: 'guests' }))
      .toBe('Add who’s coming.');
    expect(heroAskFor({ title: '2 confirmed guests still need seats', domain: 'guests', ask: 'Who sits where?' }))
      .toBe('Who sits where?');
    expect(heroAskFor({ title: 'Sort where everyone stays' })).not.toBe('Add the location.');
    expect(heroAskFor({ title: 'Sort where everyone stays', ask: 'Is anyone staying overnight?' }))
      .toBe('Is anyone staying overnight?');
  });

  test('NEGATIVE CONTROL — a row with no ask still says something real', () => {
    // The foundation facts author no ask and never will; they are not decisions.
    // They must still reach the host as an act, never as the placeholder.
    const b = playbookDecisionBoard({ id: 'ev-bare', type: 'Dinner Party' });
    const bare = b.open.filter((r) => String(r.id).startsWith('f-'));
    expect(bare.length).toBeGreaterThan(0);
    for (const r of bare) {
      expect(r.ask).toBeFalsy();
      const got = heroAskFor(asAction(r));
      expect(got).toBeTruthy();
      expect(got).not.toMatch(/your next step/i);
    }
  });
});

describe('the whole point — it lands in the live plan', () => {
  test('the wedding bundle stops saying "Settle your decisions."', () => {
    // heroAskNeverPlaceholder.test.js names this case: the decisions bundle
    // inherits its LEAD child's authored ask, that child was "Total budget +
    // who pays", and it had none — so the hero fell to the prose ladder and
    // said "Settle your decisions." General, not false, and not what the host
    // needed to hear at five consecutive stages. It now asks the budget.
    for (const d of [180, 60, 30, 14, 7]) {
      const head = (eventPlan(EV('Wedding', d)).nextActions || [])[0];
      expect(head).toBeTruthy();
      const ask = heroAskFor(head);
      expect(ask).not.toMatch(/settle your decisions/i);
      expect(ask).not.toMatch(/your next step/i);
    }
  });

  test('a decision the host is actually being asked reaches the hero verbatim', () => {
    // One per register, so a regression in any of them is named rather than
    // averaged away: a board-governance call, a solemn one, a cultural one.
    const reaches = (type, days, re) => {
      const asks = (eventPlan(EV(type, days)).nextActions || []).map((a) => heroAskFor(a) || '');
      return asks.some((s) => re.test(s));
    };
    expect(reaches('Board Meeting', 14, /in the room, hybrid, or fully virtual/i)).toBe(true);
    expect(reaches('Repast', 3, /has anyone offered to carry the meal/i)).toBe(true);
    expect(reaches('Kwanzaa Gathering', 14, /karamu/i)).toBe(true);
  });
});

describe('an ask is a question, not the card title with a mark on it', () => {
  test('no authored ask merely restates its own label', () => {
    // askVoice.isCircularAsk is the house predicate for "this adds nothing".
    // An ask derived by authoredQuestion() IS its label by construction and is
    // exempt; an ask authored as its own field must earn its place.
    const circular = authoredDecisions()
      .filter(({ d }) => d.ask !== questionFrom(d.label) && isCircularAsk(d.ask, d.label))
      .map(({ type, d }) => `${type}::${d.id} :: ${d.ask}`);
    expect(circular).toEqual([]);
  });

  test('every authored ask is a real question, already normalized, hero-sized', () => {
    const bad = [];
    for (const { type, d } of authoredDecisions()) {
      const k = `${type}::${d.id}`;
      if (!/\?$/.test(d.ask)) bad.push(`${k} is not a question`);
      if (normalizeAsk(d.ask) !== d.ask) bad.push(`${k} is not normalized`);
      // Two lines in the hero slot. The longest authored question in the corpus
      // before this work was 72 characters; nothing added here exceeds 62.
      if (d.ask.length > 80) bad.push(`${k} is ${d.ask.length} chars`);
    }
    expect(bad).toEqual([]);
  });
});
