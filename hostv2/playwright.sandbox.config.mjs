// TEMPORARY, local-only override — NOT committed, NOT part of the repo's
// checked-in test config. This sandbox's pre-installed Playwright browser
// revision (chromium-1194) doesn't match what this project's playwright.config.mjs
// expects (chrome-headless-shell-1228), so this points launchOptions at the
// working local chromium binary instead of re-downloading. It also drops the
// second (dist-synctest) webServer entry: that one runs a full `vite build`
// before serving (120s timeout on its own), which this sandbox's background
// task runner cannot outlast, and no spec run through this config needs it.
// Deleted after use.
import base from './playwright.config.mjs';

export default {
  ...base,
  use: {
    ...base.use,
    launchOptions: { executablePath: '/opt/pw-browsers/chromium' },
  },
  webServer: [{ ...base.webServer[0], reuseExistingServer: true }],
};
