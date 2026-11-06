import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { installPlatformAuthStorage } from '../../../src/lib/platformAuthStorage.js';
import { acceptAuthCallback } from './authCallback.mjs';
const SecureAuthStorage = registerPlugin('SecureAuthStorage');
async function boot() {
  if (!Capacitor.isNativePlatform()) throw new Error('This bundled build must run in the installed app.');
  // Probe native availability before any module can create the auth client.
  await SecureAuthStorage.get({ key: '__ngw_probe__' });
  installPlatformAuthStorage({
    getItem: async key => (await SecureAuthStorage.get({ key })).value ?? null,
    setItem: (key, value) => SecureAuthStorage.set({ key, value }),
    removeItem: key => SecureAuthStorage.remove({ key }),
  });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ title, text, url }) => {
    await Share.share({ title, text, url, dialogTitle: title });
  } });
  window.__ngwNativeExport = async (data) => {
    const file = await Filesystem.writeFile({ path: 'my-events-' + Date.now() + '.json', data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    // Keep the cache file available while the receiving app reads its granted URI.
    await Share.share({ title: 'Your event backup', files: [file.uri], dialogTitle: 'Save or share your backup' });
  };
  const showAuthError = () => {
    const node = document.createElement('p');
    node.setAttribute('role', 'alert');
    node.textContent = 'Sign-in could not be completed. Request a new sign-in link from Settings.';
    node.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:12px;right:12px;z-index:99999;padding:16px;background:#322b29;color:white';
    document.body.append(node);
  };
  const handleUrl = async ({ url }) => {
    try {
      const { supabase } = await import('../../../src/lib/supabaseClient.js');
      await acceptAuthCallback(url, process.env.REACT_APP_AUTH_REDIRECT || 'com.noguessworksystems.events://auth-callback', supabase?.auth);
    } catch { showAuthError(); }
  };
  await App.addListener('appUrlOpen', handleUrl);
  await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) window.dispatchEvent(new Event('ngw-native-resume'));
  });
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handleUrl(launch);
  await App.addListener('backButton', ({ canGoBack }) => {
    const event = new Event('ngw-native-back', { cancelable: true });
    if (!window.dispatchEvent(event)) return;
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
  if (Capacitor.getPlatform() === 'ios') await Keyboard.setAccessoryBarVisible({ isVisible: true });
  await import('../../../hostv2/src/main.jsx');
}
boot().catch(() => {
  document.getElementById('root').textContent = 'This app could not finish opening. Close and reopen it. Your plan has not been changed.';
});
