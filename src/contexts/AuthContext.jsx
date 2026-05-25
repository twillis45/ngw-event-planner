// ─── Auth context — NGW Event Boss ───────────────────────────────────────────
// Provides the shared AuthCtx and the useAuth convenience hook.
// The session management logic lives in AuthGate.jsx (src/components/AuthGate.jsx).
// UI components should consume auth state via useAuth() — never read AuthCtx directly.
import { createContext, useContext } from 'react';

export const AuthCtx = createContext({
  configured: false, // true when Supabase env vars are present
  ready:      true,  // false during initial session resolution
  session:    null,  // raw Supabase session object
  user:       null,  // session.user shortcut
  signOut:    () => {},
});

// Convenience hook — call inside any component that needs auth state.
export const useAuth = () => useContext(AuthCtx);
