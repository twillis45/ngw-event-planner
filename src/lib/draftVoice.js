// ─── EVERY DRAFT'S VOICES (owner, 11/19/2026) ────────────────────────────────
//
// "Rewrite the other drafts' voices the same way." The invite now has its own
// text per voice (doItForMe.inviteInVoice). The other drafts kept the old word
// swaps: Playful added a "!" and one stock line, Formal expanded contractions,
// Warmer swapped one closing, and Tighter dropped every middle paragraph that
// had no arrow or colon, which threw away dates, places and times.
//
// Each voice now gives a draft its own GREETING and CLOSING, chosen for who the
// note is for (guests, a vendor, helpers, a toast), and Tighter takes out only
// pleasantries. The middle — the facts — is kept word for word, so no voice
// can drop a date, a time, a place, a link, an amount or a list item. Formal
// also drops "!" and contractions throughout. A solemn gathering gets no
// Playful, and its warm and formal lines stay quiet. A note to yourself (the
// shopping list) has no audience, so it offers As written and Tighter only.
//
// PURE. No invented facts: every line added is a greeting or a sign-off.
import { warmClosing } from './warmClosing';

export const VOICES = ['as-written', 'tighter', 'warmer', 'playful', 'formal'];

/** Who a draft is for, from its sheet title (and whether it names a vendor). */
export function draftAudience(title, vendorId) {
  const t = String(title || '');
  if (/shopping list/i.test(t)) return 'self';
  if (/toast/i.test(t)) return 'toast';
  if (vendorId || /^(Reconfirm|Payment reminder|Venue inquiry|Weather note to vendors|Note to |Ask |Dietary note)/i.test(t)) return 'vendor';
  if (/helper|Everyone’s part|^Confirm with/i.test(t)) return 'helpers';
  if (/thank-you|thank you|recap/i.test(t)) return 'after';   // written once the day is over
  return 'guests';
}

/** The voices a draft offers. */
export function voicesFor(audience, sombre) {
  if (audience === 'self') return ['as-written', 'tighter'];
  return sombre ? VOICES.filter((v) => v !== 'playful') : VOICES;
}

// A greeting at the very start of the body: "Hi Ana,", "Hi everyone —", "Hi!".
const GREETING = /^(hi|hello|hey|dear)\b(?:\s+([^,—!\n]{1,40}?))?\s*(?:[,!]|\s—)\s*/i;
// A line that is only a sign-off.
const SIGNOFF = /^(?:—\s*.+|thanks?(?: you)?(?: so much| again| a lot)?[!.]?|many thanks[!.]?|with (?:love|thanks|gratitude)[,.]?|love[,.]?|warmly[,.]?|cheers[,.!]?|best[,.]?|(?:kind|warm) regards[,.]?|can’t wait to see you[^.\n]*[!.,]?|looking forward to it[!.]?|see you (?:soon|there)[!.]?|so raise your glass[^\n]*)$/i;
// Pleasantries Tighter may drop: whole lines, or a closing sentence on a line.
const PLEASANTRY = [/\s*Looking forward to it\.?$/i, /^Thanks so much!?$/i, /^Thank you!?$/i];

export const formalText = (s) => String(s)
  .replace(/!/g, '.')
  .replace(/\b(W|w)e[’']re\b/g, (_m, w) => `${w}e are`).replace(/\b(Y|y)ou[’']re\b/g, (_m, y) => `${y}ou are`)
  .replace(/\b(T|t)hey[’']re\b/g, (_m, t) => `${t}hey are`)
  .replace(/\b(W|w)e[’']d\b/g, (_m, w) => `${w}e would`).replace(/\b(I)[’']d\b/g, 'I would')
  .replace(/\b(W|w)e[’']ll\b/g, (_m, w) => `${w}e will`).replace(/\b(Y|y)ou[’']ll\b/g, (_m, y) => `${y}ou will`)
  .replace(/\bI[’']ll\b/g, 'I will').replace(/\bI[’']m\b/g, 'I am')
  .replace(/\b(D|d)on[’']t\b/g, (_m, d) => `${d}o not`).replace(/\b(C|c)an[’']t\b/g, (_m, c) => `${c}annot`)
  .replace(/\b(W|w)on[’']t\b/g, (_m, w) => `${w}ill not`).replace(/\b(I|i)t[’']s\b/g, (_m, i) => `${i}t is`)
  .replace(/\b(T|t)hat[’']s\b/g, (_m, t) => `${t}hat is`).replace(/\b(H|h)ere[’']s\b/g, (_m, h) => `${h}ere is`)
  .replace(/\b(W|w)hat[’']s\b/g, (_m, w) => `${w}hat is`).replace(/\b(L|l)et[’']s\b/g, (_m, l) => `${l}et us`)
  .replace(/\b(I|i)sn[’']t\b/g, (_m, i) => `${i}s not`).replace(/\b(A|a)ren[’']t\b/g, (_m, a) => `${a}re not`)
  .replace(/\b(W|w)ouldn[’']t\b/g, (_m, w) => `${w}ould not`).replace(/\b(C|c)ouldn[’']t\b/g, (_m, c) => `${c}ould not`)
  .replace(/\b(D|d)idn[’']t\b/g, (_m, d) => `${d}id not`).replace(/\b(D|d)oesn[’']t\b/g, (_m, d) => `${d}oes not`);

function greetingFor(voice, audience, name, sombre) {
  const who = name && !/^(there|everyone|all|friends)$/i.test(name) ? name : '';
  if (audience === 'toast' || audience === 'self') return '';
  if (voice === 'tighter') return audience === 'vendor' ? (who ? `Hi ${who},` : 'Hi,') : '';
  if (audience === 'vendor') {
    if (voice === 'warmer') return who ? `Hi ${who}, I hope your week is going well.` : 'Hi there, I hope your week is going well.';
    if (voice === 'playful') return who ? `Hi ${who}!` : 'Hi there!';
    return who ? `Dear ${who},` : 'Hello,';
  }
  if (audience === 'helpers') {
    if (voice === 'warmer') return sombre ? 'Dear all, thank you for being here for us.' : 'Hi all, and thank you for pitching in.';
    if (voice === 'playful') return 'Team!';
    return 'Hello all,';
  }
  if (sombre) return voice === 'formal' ? 'Dear friends and family,' : 'Dear friends,';
  if (voice === 'warmer') return 'Hi friends,';
  if (voice === 'playful') return 'Hey everyone!';
  return 'Dear guests,';
}

function closingFor(voice, audience, host, sombre, ctx) {
  const sign = host ? `\n${host}` : '';
  if (audience === 'self') return '';
  if (audience === 'toast') {
    if (voice === 'tighter') return 'To all of you.';
    if (voice === 'warmer') return 'So here’s to all of you — and to the people who make a night like this.';
    if (voice === 'playful') return 'Glasses up, everyone — cheers!';
    return 'Please join me in raising a glass.';
  }
  if (voice === 'tighter') return host ? `— ${host}` : '';
  if (audience === 'vendor') {
    if (voice === 'warmer') return warmClosing(ctx || {}) + sign;
    if (voice === 'playful') return 'Thanks a bunch!' + sign;
    return 'Thank you for your time.\nKind regards,' + sign;
  }
  if (sombre) return (voice === 'formal' ? 'Respectfully,' : 'With love,') + sign;
  if (audience === 'after') {
    if (voice === 'warmer') return 'With love and thanks,' + sign;
    if (voice === 'playful') return 'Already missing you all!' + sign;
    return 'With gratitude,' + sign;
  }
  if (audience === 'helpers') {
    if (voice === 'warmer') return 'We couldn’t do this without you.' + sign;
    if (voice === 'playful') return 'You’re the best!' + sign;
    return 'With thanks,' + sign;
  }
  if (voice === 'warmer') return 'Can’t wait to see you all,' + sign;
  if (voice === 'playful') return 'See you there!' + sign;
  return 'Warm regards,' + sign;
}

/**
 * The draft in one voice. `ctx`: { audience, sombre, host, subject, title, vendor }.
 * `subject` (the draft's subject line, shown as its first paragraph) is kept
 * as is; the greeting and closing are replaced; the middle is kept word for word.
 */
export function voiceDraft(text, voice, ctx = {}) {
  const src = String(text == null ? '' : text);
  if (!voice || voice === 'as-written') return src;
  const audience = ctx.audience || 'guests';
  const sombre = !!ctx.sombre;
  if (!voicesFor(audience, sombre).includes(voice)) return src;
  const host = String(ctx.host || '').trim();

  let rest = src.trim();
  let subject = '';
  const s = String(ctx.subject || '').trim();
  if (s && rest.startsWith(s)) { subject = s; rest = rest.slice(s.length).trim(); }

  // The greeting: a line that is only "Hi Ana," or a prefix like "Hi! Just a…".
  let name = '';
  const g = GREETING.exec(rest);
  if (g) { name = (g[2] || '').trim(); rest = rest.slice(g[0].length).replace(/^\n+/, ''); }

  // The closing: trailing sign-off lines, and the host's name on its own.
  const lines = rest.split('\n');
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (!last || SIGNOFF.test(last) || (host && last === host)) lines.pop();
    else break;
  }
  let middle = lines;
  if (voice === 'tighter') {
    middle = middle
      .map((l) => PLEASANTRY.reduce((acc, re) => acc.replace(re, ''), l))
      // A short line that is only an exclamation ("You’re invited!", "Thanks!")
      // carries no fact: no digit, no link, no list mark, four words or fewer.
      .filter((l) => !(/!\s*$/.test(l) && !/\d|https?:|\[|^\s*[•-]/.test(l) && l.trim().split(/\s+/).length <= 4))
      .filter((l) => l.trim() !== '');    // one block: no blank lines between paragraphs
  }
  let body = middle.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (voice === 'formal') body = formalText(body);

  const greet = greetingFor(voice, audience, name, sombre);
  const close = closingFor(voice, audience, host, sombre, ctx);
  const parts = [subject, greet, body, close].filter((p) => p && p.trim());
  return parts.join('\n\n').trim();
}
