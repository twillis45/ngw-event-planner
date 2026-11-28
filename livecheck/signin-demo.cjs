// Signs in to hostv2 as the demo account (email code) and saves the browser session for the signed-in Guests pass.
//   node livecheck/signin-demo.cjs <email> <statefile> <codefile>
// Waits for <codefile> to hold the 6-digit code (written by hand from the inbox). Writes allowed only to Supabase auth/rest and the app API's
// non-messaging paths; anything that could reach a person (communication, invite, nudge, sms, email, send) is aborted and recorded.
const { chromium } = require('playwright'); const fs = require('fs');
const [EMAIL, STATE, CODEF] = process.argv.slice(2);
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const PEOPLE = /communication|invite|nudge|sms|\/email|send|notify-guest|\/text/i;
const ev = { id: 'E2E_TEST_signed-tg', name: 'E2E_TEST_ Thanksgiving (signed-in check)', type: 'Thanksgiving', date: '2026-12-19', startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueAddress: '123 Example St, Springfield, VA 22150', venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: 'pending' }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: 'pending' }, { id: 'g3', name: 'Cy Lark', email: 'cy.lark@example.com', rsvp: 'pending' }] };
(async () => {
  const log = []; const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, timezoneId: 'America/New_York' });
  await ctx.route('**/*', (rt) => { const q = rt.request(); const m = q.method(); const u = new URL(q.url()); const tag = m + ' ' + u.host + u.pathname;
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return rt.continue();
    if (/sentry\.io/.test(u.host)) { log.push('BLOCK ' + tag); return rt.abort(); }
    if (PEOPLE.test(u.pathname) && !/\/auth\/v1\/otp|\/auth\/v1\/verify/.test(u.pathname)) { log.push('BLOCK ' + tag); return rt.abort(); }
    if (/supabase\.co$/.test(u.host) || /onrender\.com$/.test(u.host) || u.host === 'challenges.cloudflare.com') { log.push('ALLOW ' + tag); return rt.continue(); }
    log.push('BLOCK ' + tag); return rt.abort(); });
  await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000);
  await p.goto(U); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
  await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2000);
  await p.getByRole('button', { name: 'Sign in to save' }).first().click(); await p.waitForTimeout(800);
  await p.getByLabel('Email for sign-in link').fill(EMAIL);
  const t0 = new Date().toISOString(); await p.waitForTimeout(6000); const cap = await p.evaluate(() => (document.querySelector('[name="cf-turnstile-response"]') || {}).value ? 'token' : 'none'); console.log('CAPTCHA', cap);
  await p.getByRole('button', { name: 'Email me a sign-in link' }).click(); await p.waitForTimeout(4000);
  const after = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  const sent = /Check your email/.test(after); console.log('REQUESTED', t0, 'sent:', sent, sent ? '' : after.slice(0, 400)); await p.screenshot({ path: STATE + '.req.jpg' });
  if (!sent) { console.log('LOG', JSON.stringify(log)); await b.close(); process.exit(2); }
  let code = null; for (let i = 0; i < 120 && !code; i++) { try { code = (fs.readFileSync(CODEF, 'utf8').match(/\d{6}/) || [])[0]; } catch {} if (!code) await new Promise((r) => setTimeout(r, 3000)); }
  if (!code) { console.log('NO CODE'); await b.close(); process.exit(3); }
  await p.getByLabel('Sign-in code from the email').fill(code); await p.getByRole('button', { name: 'Sign in with the code' }).click(); await p.waitForTimeout(5000);
  const signed = await p.evaluate(() => Object.keys(localStorage).filter((k) => /auth-token|sb-/.test(k)));
  console.log('SIGNED', JSON.stringify(signed)); await p.screenshot({ path: STATE + '.after.jpg' });
  await ctx.storageState({ path: STATE }); console.log('LOG', JSON.stringify(log)); await b.close();
})();
