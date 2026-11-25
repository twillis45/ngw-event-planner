// What everySheetKeepsTheCohesionRules still finds, by sheet and rule.
// Each entry is [the projects it shows at (mobile, desktop, tablet-tall, landscape), the violation]. The spec asserts
// this list EXACTLY per sheet and project, so a new violation fails and a
// fixed one that is still listed fails too: each batch deletes its own lines
// as it lands. Measured 11/24/2026 at mobile, desktop, tablet-tall and
// landscape on Wanda's 50th (cohesion batch B); the clip rule also at
// 1000x690 ("ipad-1000").
//
// Rule 9 (44x44) is clean on every sheet at every touch geometry since the
// vendor status picker's pills went to full height (audit #9). Batch B's
// own lines (the opened vendor, audit #7 and #8) left with the owner-approved
// vendor detail. The clip rule is clean everywhere since #256 fixed the
// board's hero (cb91bc95); its three lines left with the merge. Batch G's
// lines (Venue, Make it yours, Ask No Guesswork: fields named only by their
// placeholder, rule 2) left when every field got its visible label
// (cohesion G, 11/24/2026). The sweep finds nothing on any sheet now.

export const KNOWN = {};
