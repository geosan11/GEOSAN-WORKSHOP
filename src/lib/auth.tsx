import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isDemoMode, SESSION_STORAGE_KEY } from './supabase';
import { checkOwner, restoreSessionWithPolicy, signInWithPolicy, type AuthSession, type AuthUser } from './authPolicy';

export type { AuthSession, AuthUser } from './authPolicy';

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  orgId: string;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Why the user was signed out without asking (e.g. 'This app is locked to its owner.'). */
  authError: string | null;
}

const DEMO_USER: AuthUser = {
  id: 'usr-operator-001',
  email: 'operator@ehi-multisystems.com',
  user_metadata: {
    org_id: 'org-geosan-workshop',
    org_role: 'owner',
    full_name: 'Lead Orchestrator'
  }
};

const DEMO_SESSION: AuthSession = {
  user: DEMO_USER,
  access_token: 'demo-operator-token'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(isDemoMode ? DEMO_SESSION : null);
  const [loading, setLoading] = useState<boolean>(!isDemoMode);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode || !supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let isMounted = true;

    // Restore the saved session (refreshing it if needed), owner check included.
    restoreSessionWithPolicy({ client })
      .then(({ session: restored, error }) => {
        if (!isMounted) return;
        setSession(restored);
        setAuthError(error?.message ?? null);
      })
      .catch(() => isMounted && setSession(null))
      .finally(() => isMounted && setLoading(false));

    // Token refreshes and sign-outs (e.g. a refresh that failed) from the client.
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((event, sbSession) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !sbSession?.user) {
        // Leave a local demo staff session alone; it has no Supabase session.
        setSession((prev) => (prev?.local_demo ? prev : null));
        return;
      }
      void checkOwner(sbSession, client).then(({ session: checked, error }) => {
        if (!isMounted) return;
        setSession(checked);
        if (error) setAuthError(error.message);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (password === 'invalid') {
      return { error: new Error('Invalid credentials') };
    }
    const { session: next, error } = await signInWithPolicy(email, password, { client: supabase });
    if (error) return { error };
    setAuthError(null);
    setSession(next);
    return { error: null };
  };

  const signOut = async (): Promise<void> => {
    if (!isDemoMode && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  };

  const orgId = session?.user?.user_metadata?.org_id || 'org-geosan-workshop';

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        session,
        loading,
        orgId,
        signIn,
        signOut,
        authError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
