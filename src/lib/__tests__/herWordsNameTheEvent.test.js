// ─── HER WORDS NAME THE EVENT (owner ruling, 11/24/2026) ─────────────────────
//
// "Aunt Rosa's Thanksgiving Dinner for 14…" was saved as "Aunt Rosa’s
// Thanksgiving Hosting": the honoree plus the playbook's type, not what she
// called it. When her sentence opens with what the event is called, whose it
// is and the occasion, that phrase is the name, title-cased, her apostrophe as
// she typed it. The type is the fallback only when she gives no name.
//
// A census over phrasings across event types, named and unnamed, read the way
// creation reads them (HostShellV2 assemble: parseSmartEventText, then
// eventNameFrom with occasionShortName of the type). Made-up names only.
import { parseSmartEventText } from '../smartParseEvent';
import { eventNameFrom } from '../eventName';
import { occasionShortName } from '../occasionWords';

const nameOf = (s) => {
  const p = parseSmartEventText(s);
  return eventNameFrom({ sentence: s, honoree: p.honoree, hostName: p.hostName, milestoneName: occasionShortName(p.type) });
};

const NAMED = [
  ["Aunt Rosa's Thanksgiving Dinner for 14 on 11/26 at 3pm", "Aunt Rosa's Thanksgiving Dinner"],
  ['Aunt Rosa’s Thanksgiving Dinner for 14 on 11/26 at 3pm', 'Aunt Rosa’s Thanksgiving Dinner'],
  ["aunt rosa's thanksgiving dinner for 14", "Aunt Rosa's Thanksgiving Dinner"],
  ["Jordan's graduation party for 30 on June 6", "Jordan's Graduation Party"],
  ["Maya's baby shower for 20 on 3/14", "Maya's Baby Shower"],
  ['Dad’s retirement party for 40 on 5/1', 'Dad’s Retirement Party'],
  ["Grandpa's birthday dinner for 12 on 4/2", "Grandpa's Birthday Dinner"],
  ["The Reyes Family Reunion for 60 on 7/4", 'Reyes Family Reunion'],
];

const UNNAMED = [
  // Her words name the occasion but not whose: the honoree's name, as before.
  ['Birthday party for Vida on 5/2', 'Vida’s Birthday'],
  ['Retirement party for Bob on 5/1 for 40', 'Bob’s Retirement'],
  // Nobody's: her occasion phrase, as before.
  ['Thanksgiving dinner for 14 at my house on 11/26', 'Thanksgiving Dinner'],
  ["Game night at Vida's house on Friday", 'Game Night'],
];

describe('a named event keeps her words', () => {
  test.each(NAMED)('%s', (s, want) => {
    expect(nameOf(s)).toEqual({ name: want, placeholder: false });
  });
});

describe('an unnamed event falls back as before', () => {
  test.each(UNNAMED)('%s', (s, want) => {
    expect(nameOf(s).name).toBe(want);
  });
  test('nothing she said names it: the type, a placeholder', () => {
    expect(nameOf('50 people on 6/1, budget $500')).toEqual({ name: occasionShortName(parseSmartEventText('50 people on 6/1, budget $500').type) || 'Event', placeholder: true });
  });
});
