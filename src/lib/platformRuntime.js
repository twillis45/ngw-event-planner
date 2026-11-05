// The installed bridge determines native execution; web deployments remain unchanged.
export const isNativeApp = () => Boolean(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.());
