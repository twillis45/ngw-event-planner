// ─── WANDA'S OWN NIGHT (audit of ev-x-wanda, 11/22/2026) ─────────────────────
//
// The schedule, venue, invite and lodging findings of the Wanda audit, each
// held by data the sample already carries. Owner rulings (11/22/2026):
//   Run of show — "Hers wins, beats suggested".
//   Ceremony    — "Ask once": is the official retirement ceremony part of this
//                 party, or held separately? The answer decides the protocol beats.
//   Surprise    — "Hide marked surprises" (the family link; backend test holds it).
import WANDA from '../../data/wandaGoldEvent';
import { effectiveRos, rosSuggestions, playbookRunOfShow, getPlaybook, decisionSettledByData, playbookDecisionBoard } from '../playbooks';
import { parseStartMinutes } from '../eventWhen';
import { buildExperienceContext } from '../experienceContext';
import { unresolvedBlockerStages } from '../assembleRevealEngines';
import { officialCeremonyAnswer, militaryDecisionsFor } from '../knowledge/militaryRetirement';
import { placePhrase, draftInvite } from '../doItForMe';
import { derivePlaceIntelligence } from '../placeIntelligence';
import { heartFieldsFor, heartPlaceholders } from '../heartPrompts';
import { hostIsHonoree } from '../hostNameFor';

const ev = (patch = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...patch });
const seg = (r) => String((r && (r.segment || r.label)) || '');

describe('P0-4: her run of show wins, the playbook only suggests', () => {
  test('every row she wrote stays, in her order and at her times', () => {
    const rows = effectiveRos(ev());
    expect(rows.map(seg)).toEqual(WANDA.ros.map((r) => r.label));
    rows.forEach((r, i) => expect(parseStartMinutes(r.time)).toBe(parseStartMinutes(WANDA.ros[i].time)));
  });

  test('her rows are not stamped "Host"', () => {
    expect(effectiveRos(ev()).filter((r) => r.owner === 'Host')).toEqual([]);
  });

  test('suggestions: never before the hall opens at 3:00 PM, no second doors or arrival', () => {
    const sugg = rosSuggestions(ev());
    expect(sugg.length).toBeGreaterThan(0);
    for (const r of sugg) {
      expect(parseStartMinutes(r.time)).toBeGreaterThanOrEqual(15 * 60);
      expect(seg(r)).not.toMatch(/\bdoors?\b|guests arrive|honoree arrives/i);
    }
  });

  test('a suggestion is not a row she already has (dinner, cake, the program)', () => {
    const sugg = rosSuggestions(ev()).map(seg).join(' | ');
    expect(sugg).not.toMatch(/dinner served/i);
    expect(sugg).not.toMatch(/^cake|\| cake/i);
    expect(sugg).not.toMatch(/the program:/i);
  });

  test('no official ceremony is presumed while the question is open', () => {
    const all = [...effectiveRos(ev()), ...rosSuggestions(ev())].map(seg).join(' | ');
    expect(all).not.toMatch(/Colors/);
  });

  test('a run of show she edited in the app is still hers (unchanged contract)', () => {
    const e = ev({ rosEdited: true, ros: [{ id: 'x1', time: '19:00', segment: 'Toast', generated: true, source: 'playbook' }] });
    expect(effectiveRos(e).map(seg)).toEqual(['Toast']);
  });

  test('an event with no rows of her own still gets the playbook day, doors once', () => {
    const rows = effectiveRos(ev({ ros: [] }));
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.filter((r) => /\bdoors?\b|guests arrive/i.test(seg(r))).length).toBe(1);
    // and not before the hall opens
    for (const r of rows) if (r.time) expect(parseStartMinutes(r.time)).toBeGreaterThanOrEqual(15 * 60);
  });
});

describe('Ceremony: asked once, the answer decides', () => {
  const blockersOf = (e) => buildExperienceContext(e, null, 1).decisionBlockers;

  test('Wanda is asked one question, in the event’s words', () => {
    expect(officialCeremonyAnswer(ev())).toBe(null);
    const bs = blockersOf(ev());
    const q = bs.filter((b) => b.type === 'official-ceremony');
    expect(q.length).toBe(1);
    expect(bs.some((b) => b.type === 'ceremony-timing')).toBe(false);
  });

  test('held separately: no protocol beats, no protocol calls, no timing ask', () => {
    const e = ev({ officialCeremony: 'separate', ros: [] });
    expect(blockersOf(e).some((b) => b.type === 'official-ceremony' || b.type === 'ceremony-timing')).toBe(false);
    expect(effectiveRos(e).map(seg).join(' ')).not.toMatch(/Colors/);
    const ids = militaryDecisionsFor(e).map((d) => d.id);
    expect(ids).not.toContain('mil_color_guard');
    expect(ids).not.toContain('mil_order_reader');
  });

  test('part of this party: the Army sequence joins the playbook day', () => {
    const e = ev({ officialCeremony: 'this-party', ros: [] });
    expect(effectiveRos(e).map(seg).join(' ')).toMatch(/Colors/);
    expect(militaryDecisionsFor(e).map((d) => d.id)).toContain('mil_color_guard');
  });

  test('settled by data: a run of show that already holds the ceremony', () => {
    const e = ev({ ros: [{ id: 'r', time: '7:00 PM', label: 'Retirement ceremony — posting of the Colors' }] });
    expect(officialCeremonyAnswer(e)).toBe('this-party');
    const e2 = ev({ meaning: 'The official retirement ceremony was held at Fort Meade in January; this is the party.' });
    expect(officialCeremonyAnswer(e2)).toBe('separate');
  });

  test('the one question, in the event’s words, with its two answers', () => {
    const st = unresolvedBlockerStages(buildExperienceContext(ev(), null, 1)).find((x) => x.blockerType === 'official-ceremony');
    expect(st.what).toBe('Is the official Army retirement ceremony part of this party, or held separately?');
    expect(st.fieldKey).toBe('officialCeremony');
    expect(st.options.map((o) => o.value)).toEqual(['this-party', 'separate']);
  });
});

describe('P1-11: the host is the guest of honor', () => {
  test('hostIsHonoree reads the sample’s host field', () => {
    expect(hostIsHonoree(ev())).toBe(true);
    expect(hostIsHonoree(ev({ host: 'Cory Mundy' }))).toBe(false);
  });

  test('"Surprise or announced?" is not asked of the honoree', () => {
    const d = getPlaybook('Retirement Party').decisions.find((x) => x.id === 'surprise');
    const s = decisionSettledByData(ev(), d);
    expect(s && s.pick).toMatch(/Announced/);
    const board = playbookDecisionBoard(ev(), new Date('2026-11-22T12:00:00'));
    expect((board.open || []).some((r) => r.id === 'surprise')).toBe(false);
    expect(playbookRunOfShow(ev()).map(seg).join(' ')).not.toMatch(/quiets for the surprise/i);
  });
});

describe('P0-14 / P1-8: one place line, and the invite says what the night is', () => {
  test('the invite’s place carries the town', () => {
    expect(placePhrase(ev())).toBe('Freedom Hall at VFW Post 1847, Upper Marlboro, MD');
  });

  test('Space does not ask for an address the board calls settled', () => {
    const arrival = derivePlaceIntelligence(ev()).sections.find((s) => s.key === 'arrival');
    expect(arrival.state).not.toBe('needs');
    expect(arrival.action).toBe(null);
  });

  test('an at-home event without a street is still asked for it', () => {
    const arrival = derivePlaceIntelligence({ type: 'Birthday', venue: 'Home', venueKind: 'home', venueCity: 'Bowie, MD' })
      .sections.find((s) => s.key === 'arrival');
    expect(arrival.action && arrival.action.label).toBe('Add the address');
  });

  test('the invite names the 50th, the dress code and the town', () => {
    const { body } = draftInvite(ev(), null);
    expect(body).toMatch(/50th birthday/);
    expect(body).toMatch(/All black — she’s the only gold in the room/);
    expect(body).toMatch(/Upper Marlboro, MD/);
  });

  test('a plain retirement invite is unchanged by the birthday line', () => {
    const { body } = draftInvite({ type: 'Retirement Party', honoree: 'Pat Lee' }, null);
    expect(body).toMatch(/We’re celebrating Pat Lee’s retirement — come raise a glass\./);
  });
});

describe('P1-9: Make it yours reads what she already said', () => {
  test('story and meaning fill the fields', () => {
    const f = heartFieldsFor(ev());
    expect(f.honoree_story).toBe('30 years in the Army, turning 50');
    expect(f.meaning_why).toMatch(/^Thirty years of Army service/);
    expect(f.honoree).toBe('Wanda Mundy');
  });

  test('her own typed answer wins over the creation story', () => {
    expect(heartFieldsFor(ev({ honoree_story: 'Mine' })).honoree_story).toBe('Mine');
  });

  test('no placeholder tells someone else’s story', () => {
    const ph = heartPlaceholders('Retirement Party');
    expect(ph.honoree_story).not.toMatch(/library|32 years/);
    expect(ph.honoree).not.toMatch(/Margaret/);
  });
});

describe('P1-15: a set dress code is not asked again by a risk', () => {
  test('the compound-confusion risk does not ask for the dress code she set', () => {
    const risks = buildExperienceContext(ev(), null, 1).activeRisks;
    for (const r of risks) expect(`${r.description} ${r.mitigation}`).not.toMatch(/dress code/i);
  });
  test('without a dress code it still says so', () => {
    const risks = buildExperienceContext(ev({ dressCode: '' }), null, 1).activeRisks;
    expect(risks.some((r) => /dress code/i.test(r.mitigation))).toBe(true);
  });
});
