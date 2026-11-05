// Reject unrelated links before handing credentials to the canonical auth client.
export async function acceptAuthCallback(rawUrl, redirectUrl, auth) {
  const url = new URL(rawUrl);
  const expected = new URL(redirectUrl);
  if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) return false;
  if (!auth) throw new Error('Sign-in is not configured for this build.');
  const params = new URLSearchParams(url.hash.slice(1));
  if (params.has('error') || url.searchParams.has('error')) throw new Error('Sign-in could not be completed. Request a new sign-in link.');
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  let result;
  if (access_token && refresh_token) result = await auth.setSession({ access_token, refresh_token });
  else if (url.searchParams.has('code')) result = await auth.exchangeCodeForSession(url.searchParams.get('code'));
  else throw new Error('This sign-in link is incomplete. Request a new sign-in link.');
  if (result?.error) throw new Error('Sign-in could not be completed. Request a new sign-in link.');
  return true;
}
