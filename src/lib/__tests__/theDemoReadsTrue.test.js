// ─── THE DEMO READS TRUE (owner's iOS Simulator demo, 11/16/2026) ────────────
//
// The owner ran the seeded demo (the VFW retirement party) on an iPhone 17 Pro
// simulator against the live site and listed what read wrong. Each block below
// pins one of those findings so it cannot quietly come back.
import { summarizeWhoIsConfirmed, whoIsConfirmedLines } from '../whoIsConfirmed';
import { vendorGreetingName, buildVendorDetailsMessage } from '../vendorDetailsMessage';
import { getVendorPlaybook } from '../vendorAccountability/playbooks';
import { coiLine } from '../vendorIntelligence';
import { buildDemoEvent } from '../demoSeed';
import { deriveHelperResponsibilities } from '../helperResponsibility';

// "Vendors 1 of 6 confirmed" on home while the hiring screen said "Booked so
// far 3 of 6". Both were true — booked (contract or deposit) is not the same as
// locked in — but side by side they read as a contradiction. Home now says both.
describe('home and the hiring screen count vendors the same way', () => {
  const ev = buildDemoEvent(Date.UTC(2026, 10, 16));
  const lines = whoIsConfirmedLines(summarizeWhoIsConfirmed(ev, {}));
  test('the vendor part names the booked count the hiring screen leads with', () => {
    expect(lines.parts[0].text).toBe('Vendors 1 of 6 confirmed · 3 booked');
  });
  test('when nothing is booked beyond what is confirmed, it stays short', () => {
    const one = { vendors: [{ id: 'a', name: 'A', status: 'Confirmed' }, { id: 'b', name: 'B', status: 'Quoted' }] };
    expect(whoIsConfirmedLines(summarizeWhoIsConfirmed(one, {})).parts[0].text).toBe('Vendors 1 of 2 confirmed');
  });
});

// "Send Post the details" — the VFW's contact is "Post Quartermaster", a title,
// and the first word of it was taken as a first name.
describe('a contact who is a title, not a person, is not greeted by its first word', () => {
  test.each([
    ['Post Quartermaster', 'Post Quartermaster'],
    ['Events Manager', 'Events Manager'],
    ['Front Desk', 'Front Desk'],
    ['Booking Office', 'Booking Office'],
  ])('%s → %s', (contactName, want) => {
    expect(vendorGreetingName({ name: 'VFW Post 3150', contactName })).toBe(want);
  });
  test('a person still gets their first name', () => {
    expect(vendorGreetingName({ contactName: 'Dana Whitfield' })).toBe('Dana');
  });
  test('the message greets the title whole', () => {
    const msg = buildVendorDetailsMessage({ vendor: { name: 'VFW Post 3150', contactName: 'Post Quartermaster', category: 'Venue' }, event: { hostName: 'Lee' }, link: 'https://x.test/?vendor=a' });
    expect(msg.body.startsWith('Hi Post Quartermaster, it’s Lee.')).toBe(true);
  });
});

// "Announcement script / wedding party names" on a retirement party's DJ. The
// DJ playbook serves every event type; what the host sees from it must not
// assume a wedding.
describe('the DJ checklist does not assume a wedding', () => {
  const pb = getVendorPlaybook('DJ');
  const hostText = [
    ...pb.commonPromises.map((p) => p.label),
    ...(pb.dayOfReadinessChecks || []),
    ...(pb.commonRisks || []),
    ...Object.values(pb.whyItMattersByField || {}),
  ].join('\n');
  test('no wedding-only words in what the host reads', () => {
    expect(hostText).not.toMatch(/wedding|first dance|parent dances|officiant/i);
  });
  test('the announcement item is still there, in words for any party', () => {
    expect(pb.commonPromises.find((p) => p.key === 'announcement_script').label).toBe('Announcement script / names to announce');
  });
});

// "Ask about insurance — Ask about insurance. This vendor will be…" — the label
// and the host copy were joined even when the copy already starts with it.
describe('the insurance line says it once', () => {
  test('copy that repeats the label is shown alone', () => {
    expect(coiLine({ label: 'Ask about insurance', hostCopy: 'Ask about insurance. This vendor will be working on-site.' }))
      .toBe('Ask about insurance. This vendor will be working on-site.');
  });
  test('copy that adds something keeps the label in front', () => {
    expect(coiLine({ label: 'Requested', hostCopy: 'Certificate requested — waiting on the vendor.' }))
      .toBe('Requested — Certificate requested — waiting on the vendor.');
  });
  test('no copy, just the label', () => {
    expect(coiLine({ label: 'Verified' })).toBe('Verified');
  });
});

// "No helpers yet" — the seeded demo had nobody to send a job to, so the
// helper link could not be shown. The seed now has one helper with one job.
describe('the demo seed has a helper to show', () => {
  const ev = buildDemoEvent(Date.UTC(2026, 10, 16));
  test('one checklist row is someone’s job', () => {
    const owned = (ev.timeline || []).filter((t) => t && String(t.owner || '').trim());
    expect(owned.length).toBeGreaterThanOrEqual(1);
  });
  test('the helper engine sees that person as a helper', () => {
    const { responsibilities } = deriveHelperResponsibilities(ev) || {};
    expect((responsibilities || []).length).toBeGreaterThanOrEqual(1);
  });
});

// "Take me there →" is pinned in the browser, not by reading the shell's source
// (hostv2/e2e/theDemoShowsWhatItSays.spec.mjs): the repo caps new source-text gates.
