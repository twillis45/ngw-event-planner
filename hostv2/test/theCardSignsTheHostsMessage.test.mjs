// ─── THE INVITE EMAIL'S PICTURE CARRIES HER MESSAGE (owner, 11/24/2026) ─────
// lib/inviteCard decides WHAT the card says (the host's message, and "— Dana"
// when she wrote it; jest theHostsMessageIsTheInvitesLine). This pins HOW the
// picture lays it out: the message in the page's message style (the reading
// serif, italic), the signature on its own line under it, upright, and no
// signature line when the message is the suggested one. The photo stays off
// the picture this round (owner call).
import { describe, it, expect } from 'vitest';
import { planInviteCard } from '../src/inviteCardImage.js';

// A measuring context: the plan only measures and records fonts.
const ctx = () => {
  const c = { font: '', measureText: (t) => ({ width: String(t).length * 7 }) };
  return c;
};
const model = (over) => ({
  name: 'Mom Linda’s Thanksgiving', mast: ['An invitation', 'Nov 2026'], eyebrow: '',
  deck: 'It wouldn’t be the same without you. Come hungry, and bring a story from your year.', sig: '— Dana',
  facts: [{ label: 'When', value: 'Thursday, November 26', sub: '6:00 PM' }],
  colors: { paper: 'light' }, ...over,
});

describe('the invite picture lays out the host’s message', () => {
  it('the message wraps in the reading serif, italic, and the signature sits under it, upright', () => {
    const { ops } = planInviteCard(ctx(), model(), null);
    const deck = ops.filter((o) => o.k === 'deck');
    expect(deck.length).toBeGreaterThan(1);
    expect(deck.map((o) => o.text).join(' ')).toBe(model().deck);
    expect(deck.every((o) => /italic/.test(o.font) && /Newsreader/.test(o.font))).toBe(true);
    const sig = ops.find((o) => o.k === 'sig');
    expect(sig && sig.text).toBe('— Dana');
    expect(/italic/.test(sig.font)).toBe(false);
    expect(sig.y).toBeGreaterThan(deck[deck.length - 1].y);
    // The facts follow the signature.
    expect(ops.find((o) => o.k === 'label').y).toBeGreaterThan(sig.y);
  });

  it('the suggested line is not signed', () => {
    const { ops } = planInviteCard(ctx(), model({ deck: 'It wouldn’t be the same without you', sig: '' }), null);
    expect(ops.some((o) => o.k === 'sig')).toBe(false);
    expect(ops.filter((o) => o.k === 'deck').length).toBe(1);
  });
});
