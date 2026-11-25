// ─── THE HOST'S PHOTO IN THE INVITE EMAIL'S PICTURE (owner, 11/24/2026) ─────
// Follow-on item 6. The picture places her photo where the page does
// (InviteV2): on Classic beside the signature, on At a glance in the Hosted by
// row. No photo, or a message with no signature on Classic, draws none.
import { describe, it, expect } from 'vitest';
import { planInviteCard } from '../src/inviteCardImage.js';
import { inviteCardModel } from '../../src/lib/inviteCard.js';

const ctx = () => ({ font: '', measureText: (t) => ({ width: String(t).length * 7 }) });
const PHOTO = { naturalWidth: 400, naturalHeight: 400 };
const model = (over) => ({
  name: 'Mom Linda’s Thanksgiving', mast: ['An invitation', 'Nov 2026'], eyebrow: '',
  deck: 'Come hungry.', sig: '— Dana', layout: 'classic',
  facts: [{ label: 'When', value: 'Thursday, November 26', sub: '6:00 PM' }, { label: 'Hosted by', value: 'Dana Reyes' }],
  colors: { paper: 'light' }, ...over,
});

describe('the invite picture places the host’s photo by layout', () => {
  it('Classic: beside the signature, on its line', () => {
    const { ops } = planInviteCard(ctx(), model(), null, PHOTO);
    const sig = ops.find((o) => o.k === 'sig');
    expect(sig.photo).toBe(true);
    expect(ops.filter((o) => o.k === 'val').some((o) => o.photo)).toBe(false);
  });

  it('At a glance: in the Hosted by row, not by the signature', () => {
    const { ops } = planInviteCard(ctx(), model({ layout: 'glance' }), null, PHOTO);
    expect(ops.find((o) => o.k === 'sig').photo).toBeFalsy();
    const host = ops.find((o) => o.k === 'val' && o.text === 'Dana Reyes');
    expect(host.photo).toBe(true);
  });

  it('no photo, no photo drawn; Classic with no signature draws none', () => {
    expect(planInviteCard(ctx(), model(), null, null).ops.some((o) => o.photo)).toBe(false);
    expect(planInviteCard(ctx(), model({ sig: '' }), null, PHOTO).ops.some((o) => o.photo)).toBe(false);
  });

  it('the model carries the layout the host picked', () => {
    expect(inviteCardModel({ name: 'X', inviteLayout: 'glance' }).layout).toBe('glance');
    expect(inviteCardModel({ name: 'X' }).layout).toBe('classic');
  });
});
