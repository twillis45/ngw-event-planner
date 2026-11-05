// Native bootstrap installs the Keychain/Keystore adapter before importing
// the auth client. Web callers retain the existing localStorage behavior.
let platformStorage = null;

export function installPlatformAuthStorage(adapter) {
  if (!adapter || !['getItem', 'setItem', 'removeItem'].every(key => typeof adapter[key] === 'function')) {
    throw new Error('Native authentication storage is unavailable.');
  }
  platformStorage = adapter;
}

export function getPlatformAuthStorage() {
  return platformStorage || window.localStorage;
}
