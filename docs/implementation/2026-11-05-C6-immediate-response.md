# C6 immediate save response — November 5, 2026

Actual WebKit's strict offline-save/Undo test reproduced a warning without the edit's Undo. The response was not artificially delayed: the mocked connection failure occurred at the explicit edit boundary after online hydration. Existing local persistence assertions stayed in place. Evidence: `/tmp/ngw-webkit-harness-focused.log` in the C7 lane.

Inspection found `toastActionRef` was populated only by a React effect. An immediate asynchronous save result can read it before that effect runs, so the follow-up warning sees no action. The existing toast function now updates its action ref synchronously with the state update. Dismissal, expiration, and action clicks also clear the ref synchronously. No response delay or lowered assertion is introduced.

This is an implementation candidate pending the unchanged WebKit regression and C7 matrix rerun. No green runtime claim yet; the lane will record the result before release certification.
