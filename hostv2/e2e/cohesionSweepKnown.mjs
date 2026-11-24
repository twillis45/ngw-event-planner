// What everySheetKeepsTheCohesionRules still finds, by sheet and rule.
// Each entry is [the projects it shows at, the violation]. The spec asserts
// this list EXACTLY per sheet and project, so a new violation fails and a
// fixed one that is still listed fails too: each batch deletes its own lines
// as it lands. Measured 11/24/2026 at mobile, desktop, tablet-tall and
// landscape on Wanda's 50th (cohesion batch B).
//
// Rule 9 (44x44) is clean on every sheet at every touch geometry since the
// vendor status picker's pills went to full height (audit #9). Batch B's
// own lines (the opened vendor, audit #7 and #8) left with the owner-approved
// vendor detail.
const ALL = ['mobile', 'desktop', 'tablet-tall', 'landscape'];

export const KNOWN = {
  // Batch G (small sheets): the Venue field is labeled only by its placeholder. Not in the audit table; found by this sweep.
  "Venue": {
    2: [
      [ALL, "input \"Venue\""],
    ],
  },
  // Batch G (Make it yours, audit #52): eight fields labeled only by placeholders. Found by this sweep.
  "Make it yours": {
    2: [
      [ALL, "input \"How the day should feel\""],
      [ALL, "input \"The line under your event’s name on the \""],
      [ALL, "input \"The one moment that must happen\""],
      [ALL, "input \"Who is it for?\""],
      [ALL, "input \"Who is the invitation from?\""],
      [ALL, "input \"Why this matters\""],
      [ALL, "input \"Your own hashtag\""],
      [ALL, "textarea \"Their story, in a line or two\""],
    ],
  },
  // Batch G (small sheets): the question field is labeled only by its placeholder. Found by this sweep.
  "Ask No Guesswork": {
    2: [
      [ALL, "input \"Ask a question about your plan\""],
    ],
  },
};
