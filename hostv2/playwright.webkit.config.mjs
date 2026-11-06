// Critical Safari-engine journeys; the full Chromium matrix remains canonical.
import { defineConfig } from '@playwright/test';
import canonical from './playwright.config.mjs';
import { previewUrl } from './deployBase.mjs';

const critical = [
  '**/e2e/gold01CreationTruth.spec.mjs',
  '**/e2e/moneyHasOneOwner.spec.mjs',
  '**/e2e/rsvpCapability.spec.mjs',
  '**/e2e/rsvpLocalReply.spec.mjs',
  '**/e2e/coreJourneyTruth.spec.mjs',
  '**/e2e/vendorRemovalUndo.spec.mjs',
  '**/e2e/aRefusedSaveIsNotCalledSaved.spec.mjs',
  '**/e2e/thePassSurvivesTheWebhookRace.spec.mjs',
];
const mainPort = 5293;
const syncPort = Number(process.env.PW_SYNCTEST_PORT || 5244);
const passPort = Number(process.env.PW_PASSGATE_PORT || 5266);
const serverFor = (mode, port) => {
  const original = canonical.webServer.find(server => server.url === previewUrl(mode === 'synctest' ? 5244 : 5266));
  return { ...original, command: original.command.replace(/--port \d+/, '--port ' + port), url: previewUrl(port) };
};

export default defineConfig({
  ...canonical,
  testDir: '.',
  // Failure is final in this targeted launch gate; Chromium retains its retry policy.
  retries: 0,
  workers: 1,
  // Mocked APIs must stay interceptable after shell-worker activation. Offline
  // worker behavior has its own canonical probes; it is not claimed by this gate.
  use: { ...canonical.use, browserName: 'webkit', serviceWorkers: 'block', launchOptions: {}, baseURL: previewUrl(mainPort), trace: 'retain-on-failure' },
  projects: [
    { name: 'webkit-engine', testMatch: '**/webkit/engine.spec.mjs' },
    { name: 'webkit-phone', dependencies: ['webkit-engine'], testMatch: critical,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
    { name: 'webkit-desktop', dependencies: ['webkit-engine'],
      testMatch: [...critical, '**/e2e/theWalkerReachesThePlan.spec.mjs'],
      use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    { ...canonical.webServer[0], command: canonical.webServer[0].command.replace('--port 5233', '--port ' + mainPort), url: previewUrl(mainPort) },
    serverFor('synctest', syncPort),
    serverFor('passgate', passPort),
  ],
});
