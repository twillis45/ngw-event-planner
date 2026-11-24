// ─── THE INVITE'S COLORS (owner-approved palettes, 11/24/2026) ───────────────
// lib/inviteTone: eight palettes in event.inviteStyle, "Match my event" for new
// events, and the host's rearranged colors, each offered only if it passes
// the contrast gate at the sheet's darkest point. The WCAG math is the
// palette study's (renders-palettes/pal.js).
import {
  INVITE_PALETTES, parseInviteStyle, formatInviteStyle, autoInvitePalette, monthPalette, arrangementsFor, arrange,
  invitePaletteFor, inviteTone, measureColors, passesGate, worstOnPaper, contrastRatio, paperFoot, TODAY_CREAM,
} from '../inviteTone';

describe('the parser reads every value, old and new', () => {
  test.each([
    ['', { kind: 'legacy', value: '' }],
    [undefined, { kind: 'legacy', value: '' }],
    ['bright', { kind: 'legacy', value: 'bright' }],
    ['elegant', { kind: 'legacy', value: 'elegant' }],
    ['auto', { kind: 'auto' }],
    ['forest-oxblood', { kind: 'palette', key: 'forest-oxblood', arrangement: 0 }],
    ['forest-oxblood:2', { kind: 'palette', key: 'forest-oxblood', arrangement: 2 }],
    ['not-a-palette', { kind: 'legacy', value: '' }],
  ])('%p', (v, out) => expect(parseInviteStyle(v)).toEqual(out));
  test('format is the parser’s inverse', () => {
    expect(parseInviteStyle(formatInviteStyle('sage-mauve', 0))).toEqual({ kind: 'palette', key: 'sage-mauve', arrangement: 0 });
    expect(parseInviteStyle(formatInviteStyle('sage-mauve', 3))).toEqual({ kind: 'palette', key: 'sage-mauve', arrangement: 3 });
  });
  test('old values keep today’s tones', () => {
    expect(inviteTone({ inviteStyle: 'bright', type: 'Gala' })).toBe('light');
    expect(inviteTone({ inviteStyle: 'elegant' })).toBe('dark');
    expect(inviteTone({ inviteStyle: '', type: 'Thanksgiving' })).toBe('light');
    expect(invitePaletteFor({ inviteStyle: '', type: 'Thanksgiving' })).toBe(null);
    expect(invitePaletteFor({ inviteStyle: 'bright' })).toBe(null);
  });
});

describe('"Match my event", the whole mapping', () => {
  test.each([
    [{ type: 'Repast', date: '2026-12-10' }, 'muted'],
    [{ type: 'Gala', date: '2026-12-10' }, 'dark'],
    [{ type: 'Thanksgiving', date: '2026-11-26' }, 'cloud-clay'],
    [{ type: 'Friendsgiving', date: '2026-11-21' }, 'cloud-clay'],
    [{ type: 'Christmas Dinner', date: '2026-12-25' }, 'forest-oxblood'],
    [{ type: 'Holiday Party', date: '2026-12-12' }, 'forest-oxblood'],
    [{ type: 'New Year’s Eve Party', date: '2026-12-31' }, 'midnight-gold'],
    [{ type: 'Anniversary', date: '2026-06-01' }, 'midnight-gold'],
    [{ type: '25th Anniversary', date: '2026-06-01' }, 'dusty-silver'],
    [{ type: 'Hanukkah', date: '2026-12-05' }, 'dusty-silver'],
    [{ type: 'Baby Shower', date: '2026-04-01' }, 'ecru-sky'],
    [{ type: 'Christening', date: '2026-04-01' }, 'ecru-sky'],
    [{ type: 'Graduation Party', date: '2026-06-01' }, 'ecru-sky'],
    [{ type: 'Bridal Shower', date: '2026-04-01' }, 'sage-mauve'],
    [{ type: 'Tea Party', date: '2026-10-01' }, 'sage-mauve'],
    [{ type: 'Garden Party', date: '2026-10-01' }, 'sage-mauve'],
    [{ type: 'Engagement Party', date: '2026-10-01' }, 'clay-blush'],
    [{ type: 'Bachelorette', date: '2026-10-01' }, 'clay-blush'],
    [{ type: 'Kids Birthday', date: '2026-10-01' }, 'butter-berry'],
    [{ type: 'Sweet 16', date: '2026-10-01' }, 'butter-berry'],
    [{ type: 'Brunch', date: '2026-10-01' }, 'butter-berry'],
  ])('%j → %s', (ev, out) => expect(autoInvitePalette(ev)).toBe(out));
  test.each([
    ['2026-12-05', 'forest-oxblood'], ['2027-01-10', 'dusty-silver'], ['2027-02-10', 'dusty-silver'],
    ['2027-03-10', 'sage-mauve'], ['2027-05-10', 'sage-mauve'], ['2027-06-10', 'butter-berry'], ['2027-08-10', 'butter-berry'],
    ['2026-09-10', 'cloud-clay'], ['2026-11-10', 'cloud-clay'], ['', 'cloud-clay'],
  ])('by month, %s → %s', (date, out) => {
    expect(monthPalette(date)).toBe(out);
    expect(autoInvitePalette({ type: 'Birthday', date })).toBe(out);
  });
  test('auto resolves to a palette, or to today’s muted / dark stock', () => {
    expect(invitePaletteFor({ inviteStyle: 'auto', type: 'Thanksgiving' }).key).toBe('cloud-clay');
    expect(invitePaletteFor({ inviteStyle: 'auto', type: 'Repast' })).toBe(null);
    expect(inviteTone({ inviteStyle: 'auto', type: 'Repast' })).toBe('muted');
    expect(inviteTone({ inviteStyle: 'auto', type: 'Gala' })).toBe('dark');
  });
});

describe('the contrast gate, at the sheet’s darkest point', () => {
  test('all eight palettes, in their own order, pass', () => {
    expect(INVITE_PALETTES).toHaveLength(8);
    for (const p of INVITE_PALETTES) {
      expect(passesGate(p)).toBe(true);
      expect(arrangementsFor(p)[0].index).toBe(0);
    }
  });
  test('every OFFERED arrangement of every palette passes: ink, accent, muted and the Yes text', () => {
    let offered = 0;
    for (const p of INVITE_PALETTES) {
      for (const a of arrangementsFor(p)) {
        offered++;
        const m = measureColors(a);
        expect([p.key, a.index, m.ink >= 4.5, m.accent >= 4.5, m.sub >= 4.5, m.yes >= 4.5]).toEqual([p.key, a.index, true, true, true, true]);
        // "Darkest point": the paper's shaded foot is one of the three it is measured on.
        expect(worstOnPaper(a.accent, a.paper)).toBeLessThanOrEqual(contrastRatio(a.accent, paperFoot(a.paper)) + 1e-9);
      }
    }
    expect(offered).toBeGreaterThan(8);   // there is something to rearrange
  });
  test('a failing arrangement is never offered', () => {
    // Midnight & Gold with the accent as the paper: navy text on navy fails.
    const navyPaper = arrange(INVITE_PALETTES.find((p) => p.key === 'midnight-gold'), ['accent', 'ink', 'paper']);
    expect(navyPaper === null || !passesGate(navyPaper)).toBe(true);
    expect(arrangementsFor('midnight-gold').some((a) => a.index === 5)).toBe(false);
    // An arrangement index that is not offered falls back to the palette's own order.
    expect(invitePaletteFor({ inviteStyle: 'midnight-gold:5' }).index).toBe(0);
  });
  test('a hex changed to a failing one is caught (the gate is not a rubber stamp)', () => {
    const p = { ...INVITE_PALETTES[0], accent: '#d9a08a' };
    expect(passesGate(p)).toBe(false);
    expect(arrangementsFor(p).some((a) => a.index === 0)).toBe(false);
  });
  test('today’s cream, with the fixed rust, passes too', () => {
    expect(passesGate(TODAY_CREAM)).toBe(true);
  });
});
