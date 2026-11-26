// The owner, Thanksgiving morning 11/26/2026: the day-of checks he'd seen were
// gone, and the photo moment with them. Measured on live: "Before the big day"
// (thawed turkey, thermometer, two-hour rule, fire basics...) rendered only in
// the before-the-day view, so on the morning it is written for it vanished; the
// moment suggestion rendered only on the day itself, when there's no time left
// to plan it. One renderer each, in both views.
//
// HONEST LIMIT: reads the shell as text. A browser check renders a Thanksgiving
// plan dated today and tomorrow (PR record); this keeps the wiring from drifting.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/HostShellV2.jsx'), 'utf8');

const liveStart = src.indexOf("{stage === 'day' && liveDay && (");
const previewStart = src.indexOf("{stage === 'day' && !liveDay && (");
const live = src.slice(liveStart, previewStart);
const preview = src.slice(previewStart, previewStart + 20000);

test('one renderer for the day-of list and one for the moment', () => {
  expect(src.match(/const dayOfCard = \(eyebrow\) => \{/g)).toHaveLength(1);
  expect(src.match(/const momentSuggestion = \(\) => \{/g)).toHaveLength(1);
  expect(src.match(/playbookDayOfChecklist\(event\)/g)).toHaveLength(1);
});
test('on the day: the list ("Before guests arrive") and the moment', () => {
  // until the doors open; once the event is under way the timeline leads
  expect(live).toContain("{!doorsOpen && dayOfCard('Before guests arrive')}");
  // Not eventLive: that is true all day, so the list never showed (e2e
  // theListShowsBeforeTheDoorsOpen drives the screen with the clock set).
  expect(live).not.toContain("{!eventLive && dayOfCard(");
  expect(live).toContain('momentSuggestion()');
});
test('before the day: the list ("Before the big day") and the moment', () => {
  expect(preview).toContain("dayOfCard('Before the big day')");
  expect(preview).toContain('momentSuggestion()');
});
