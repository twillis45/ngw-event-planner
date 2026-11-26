// ─── NOTHING GOES OUT WITH A PLACEHOLDER (six root causes, cause 6) ──────────
// P1-8: the invite was titled "My Thanksgiving Hosting" with no street. The
// event is named from her own words at creation, and ONE guard
// (lib/outwardReady) is asked by every outward surface before it goes out.
// Every outward surface × every playbook: a placeholder name or a missing
// address is blocked with a plain prompt; real data passes.
const fs = require('fs');
const path = require('path');
const pbm = require('../playbooks');
const { eventNameFrom, occasionPhraseFrom } = require('../eventName');
const { outwardGaps, outwardPrompt, isPlaceholderName, OUTWARD_SURFACES } = require('../outwardReady');
const { inviteGaps } = require('../inviteGaps');
const { occasionShortName } = require('../occasionWords');

const base = (pb, extra = {}) => ({ id: 'e', type: pb.type, date: '2027-11-25', startTime: '3:00 PM', startTimeSource: 'host', ...extra });
const HOME_NO_STREET = { venueKind: 'home', venue: 'Our place', venueCity: 'Fort Washington', venueState: 'MD' };
const HOME_STREET = { ...HOME_NO_STREET, venueStreet: '1204 Oxon Hill Rd', venueZip: '20744' };

describe('every outward surface asks the one guard', () => {
  test('every playbook × every surface: placeholder name or no street → blocked with a plain prompt; real → passes', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const occ = occasionShortName(pb.type);
      for (const surface of OUTWARD_SURFACES) {
        for (const name of [`My ${pb.type}`, pb.type, '']) {
          const g = outwardGaps(base(pb, { name, ...HOME_STREET }), surface);
          if (!g.some((x) => x.key === 'name') || !/name/i.test(outwardPrompt(g))) bad.push(`${pb.type}/${surface}: "${name}" passed`);
        }
        const noStreet = outwardGaps(base(pb, { name: `Aunt Bee’s ${occ}`, ...HOME_NO_STREET }), surface);
        if (!noStreet.some((x) => x.key === 'address') || !/street address/i.test(outwardPrompt(noStreet))) bad.push(`${pb.type}/${surface}: no street passed`);
        const ok = outwardGaps(base(pb, { name: `Aunt Bee’s ${occ}`, ...HOME_STREET }), surface);
        if (ok.length) bad.push(`${pb.type}/${surface}: real data blocked (${ok.map((x) => x.key)})`);
        const venue = outwardGaps(base(pb, { name: `Aunt Bee’s ${occ}`, venue: 'Elks Lodge 2004', venueKind: 'venue', venueCity: 'Bowie', venueState: 'MD' }), surface);
        if (venue.length) bad.push(`${pb.type}/${surface}: a named venue blocked`);
      }
      // The invite's own check reads the guard (its date/time/place plus these).
      const ig = inviteGaps(base(pb, { name: `My ${pb.type}`, ...HOME_NO_STREET }));
      if (!ig.includes('name') || !ig.includes('address')) bad.push(`${pb.type}: inviteGaps ${ig}`);
    }
    expect(bad).toEqual([]);
  });

  test('her sentence names the event; "My <Type>" never comes out of creation', () => {
    const s = 'Thanksgiving dinner at my house for 14 on Thursday Nov 26, 2026 at 3pm, Fort Washington MD, about $400';
    expect(eventNameFrom({ sentence: s, milestoneName: 'Thanksgiving' })).toEqual({ name: 'Thanksgiving Dinner', placeholder: false });
    expect(eventNameFrom({ sentence: 'Game night at my place for about 8 friends on March 6, 2027', milestoneName: 'Game Night' }).name).toBe('Game Night');
    expect(eventNameFrom({ sentence: 'crab feast for 20, Aug 2', milestoneName: 'Crab Feast' }).name).toBe('Crab Feast');
    expect(eventNameFrom({ sentence: 'Mom’s 80th in Santa Fe', honoree: 'Mom', milestoneName: '80th Birthday' }).name).toBe('Mom’s 80th Birthday');
    expect(occasionPhraseFrom('something for 30 people', 'Birthday')).toBe('');
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const occ = occasionShortName(pb.type);
      const n = eventNameFrom({ sentence: `${occ} at my place for 20`, milestoneName: occ });
      if (/^my\s/i.test(n.name)) throw new Error(`${pb.type}: ${n.name}`);
      // A bare occasion is flagged, so the guard asks before anything goes out.
      const bare = eventNameFrom({ sentence: 'for 20 people', milestoneName: occ });
      expect(bare.placeholder).toBe(true);
      expect(isPlaceholderName({ type: pb.type, name: bare.name })).toBe(true);
    }
  });

  test('the shell names from her words and asks the guard on every outward path', () => {
    const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    // Creation names the event in lib/eventFromSentence (owner, 11/26/2026), which the shell calls.
    const BUILD = fs.readFileSync(path.join(__dirname, '../eventFromSentence.js'), 'utf8');
    expect(/'My ' \+ milestoneName/.test(SRC + BUILD)).toBe(false);
    expect(/eventFromSentence\(\{/.test(SRC)).toBe(true);
    expect(/eventNameFrom\(/.test(BUILD)).toBe(true);
    // invite (via inviteGaps), helper link, vendor brief, family link
    expect((SRC.match(/outwardGaps\(event, '(?:helper|vendor|family)'\)/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});
