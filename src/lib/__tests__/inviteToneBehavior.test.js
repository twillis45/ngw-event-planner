// Behavioral coverage for the invite tone engine both invite surfaces read
// (production RSVPFormView and V2's InviteV2). Locks the ACTUAL precedence:
// host inviteStyle override → somber (muted) → evening/formal (dark) → light.
import { inviteTone, invitePalette, deepenForLight } from '../inviteTone';

describe('inviteTone — event mood rules', () => {
  test('evening event → dark (elegant), regardless of casual type', () => {
    expect(inviteTone({ type: 'Backyard BBQ', timeOfDay: 'evening' })).toBe('dark');
    expect(inviteTone({ type: 'Backyard BBQ', timeOfDay: 'night' })).toBe('dark');
  });

  test('formal type → dark even in daytime', () => {
    expect(inviteTone({ type: 'Gala Dinner', timeOfDay: 'afternoon' })).toBe('dark');
    expect(inviteTone({ type: 'Corporate Retreat' })).toBe('dark');
  });

  test('daytime casual/family → light (the category norm)', () => {
    expect(inviteTone({ type: 'Birthday Party', timeOfDay: 'afternoon' })).toBe('light');
    expect(inviteTone({ type: 'Baby Shower' })).toBe('light');
  });

  test('somber types → muted, by type or by event name', () => {
    expect(inviteTone({ type: 'Memorial Service' })).toBe('muted');
    expect(inviteTone({ type: 'Celebration of Life' })).toBe('muted');
    expect(inviteTone({ type: 'Dinner', name: 'Repast for Uncle Joe' })).toBe('muted');
  });

  test('somber beats evening/formal when no override is set', () => {
    expect(inviteTone({ type: 'Memorial Service', timeOfDay: 'evening' })).toBe('muted');
  });

  test("host inviteStyle override ALWAYS wins — checked before the somber rule, so 'bright' lightens even a memorial", () => {
    // Actual precedence in the implementation: inviteStyle is the FIRST check,
    // ahead of isQuiet — the engine never overrides an explicit host choice.
    expect(inviteTone({ type: 'Memorial Service', inviteStyle: 'bright' })).toBe('light');
    expect(inviteTone({ type: 'Memorial Service', inviteStyle: 'elegant' })).toBe('dark');
    expect(inviteTone({ type: 'Backyard BBQ', timeOfDay: 'evening', inviteStyle: 'bright' })).toBe('light');
  });

  test('opts.isQuiet is injectable (the App EVT_IDENT hook)', () => {
    expect(inviteTone({ type: 'Birthday Party' }, { isQuiet: () => true })).toBe('muted');
    // With the somber default replaced by a never-quiet hook, a memorial falls
    // through to the normal daytime rule → light.
    expect(inviteTone({ type: 'Memorial Service' }, { isQuiet: () => false })).toBe('light');
  });
});

describe('invitePalette — documented palette keys per tone', () => {
  const KEYS = ['dark', 'bg', 'panel', 'surface', 'border', 'text', 'sub', 'muted'];

  test.each(['dark', 'muted', 'light'])('%s tone carries every documented key', (tone) => {
    const p = invitePalette(tone);
    KEYS.forEach(k => expect(p).toHaveProperty(k));
  });

  test('dark flag is true only for the dark tone', () => {
    expect(invitePalette('dark').dark).toBe(true);
    expect(invitePalette('muted').dark).toBe(false);
    expect(invitePalette('light').dark).toBe(false);
  });

  test('tone-specific anchor values', () => {
    expect(invitePalette('dark').bg).toBe('#0d0f12');
    expect(invitePalette('muted').bg).toBe('#edeae5');
    expect(invitePalette('light').bg).toBe('#faf6f0');   // also the fallback for unknown tones
    expect(invitePalette('anything-else').bg).toBe('#faf6f0');
  });
});

describe('deepenForLight — hue survives, lightness drops for paper accents', () => {
  // HSL lightness of a hex: (max+min)/2 on 0..1 channels.
  const lightness = (hex) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  };

  test('a pale identity hue comes back darker (lightness clamped ≤ 0.46)', () => {
    const input = '#aac6e8'; // washed-out steel blue
    const out = deepenForLight(input);
    expect(out).toMatch(/^#[0-9a-f]{6}$/i);
    expect(lightness(out)).toBeLessThan(lightness(input));
    expect(lightness(out)).toBeLessThanOrEqual(0.47); // clamp + rounding headroom
  });

  test('3-digit hex is expanded and darkened too', () => {
    const out = deepenForLight('#ace');
    expect(out).toMatch(/^#[0-9a-f]{6}$/i);
    expect(lightness(out)).toBeLessThan(lightness('#aaccee'));
  });

  test('unparseable input is returned unchanged (never throws on the invite)', () => {
    expect(deepenForLight('nope')).toBe('nope');
    expect(deepenForLight('#12345')).toBe('#12345');
    expect(deepenForLight('')).toBe('');
    expect(deepenForLight(null)).toBe(null);
  });
});
