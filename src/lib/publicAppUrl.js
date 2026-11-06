// Public web destination for shared links and checkout returns.
// Native builds bundle HostV2 locally, so their runtime origin is not public.
export function publicAppUrl(location = window.location, native) {
  const isNative = native === undefined
    ? !!(window.Capacitor && window.Capacitor.isNativePlatform()) : native;
  const configured = process.env.REACT_APP_PUBLIC_APP_URL;
  try {
    if (!configured && isNative) throw new Error();
    const url = new URL(configured || location.origin + location.pathname);
    if (!['https:', 'http:'].includes(url.protocol)
      || (configured && url.protocol !== 'https:')
      || url.username || url.password || url.search || url.hash) throw new Error();
    return url.origin + url.pathname;
  } catch {
    throw new Error('The public web address is not configured correctly.');
  }
}
