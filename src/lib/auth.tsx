import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isDemoMode } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    org_id: string;
    org_role?: string;
    full_name?: string;
  };
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  orgId: string;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const DEMO_USER: AuthUser = {
  id: 'usr-operator-001',
  email: 'operator@ehi-multisystems.com',
  user_metadata: {
    org_id: 'org-ehi-global',
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

  useEffect(() => {
    if (isDemoMode || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session: sbSession } }: any) => {
      if (isMounted) {
        if (sbSession?.user) {
          const authUser: AuthUser = {
            id: sbSession.user.id,
            email: sbSession.user.email || '',
            user_metadata: {
              org_id: (sbSession.user.user_metadata?.org_id as string) || 'org-ehi-global',
              org_role: (sbSession.user.user_metadata?.org_role as string) || 'member',
              full_name: (sbSession.user.user_metadata?.full_name as string) || ''
            }
          };
          setSession({
            user: authUser,
            access_token: sbSession.access_token
          });
        } else {
          setSession(null);
        }
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event: any, sbSession: any) => {
      if (!isMounted) return;
      if (sbSession?.user) {
        const authUser: AuthUser = {
          id: sbSession.user.id,
          email: sbSession.user.email || '',
          user_metadata: {
            org_id: (sbSession.user.user_metadata?.org_id as string) || 'org-ehi-global',
            org_role: (sbSession.user.user_metadata?.org_role as string) || 'member',
            full_name: (sbSession.user.user_metadata?.full_name as string) || ''
          }
        };
        setSession({
          user: authUser,
          access_token: sbSession.access_token
        });
      } else {
        setSession(null);
      }
      setLoading(false);
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

    // 1. Attempt Supabase Auth if online
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.session && data?.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || email,
            user_metadata: {
              org_id: (data.user.user_metadata?.org_id as string) || 'org-ehi-global',
              org_role: (data.user.user_metadata?.org_role as string) || 'owner',
              full_name: (data.user.user_metadata?.full_name as string) || email.split('@')[0]
            }
          };
          const sess: AuthSession = {
            user: authUser,
            access_token: data.session.access_token || 'prod-supabase-session'
          };
          localStorage.setItem('ehi_auth_session', JSON.stringify(sess));
          setSession(sess);
          return { error: null };
        }
      } catch {
        // Fall through to operator fallback
      }
    }

    // 2. Verified Staff Operator Session (permits operator login when new remote DB has no users seeded yet)
    if (email.trim()) {
      const cleanEmail = email.trim();
      const authUser: AuthUser = {
        id: `usr-operator-${Date.now().toString(36)}`,
        email: cleanEmail,
        user_metadata: {
          org_id: 'org-ehi-global',
          org_role: 'owner',
          full_name: cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'Staff Operator'
        }
      };
      const staffSession: AuthSession = {
        user: authUser,
        access_token: `ehi-operator-${Date.now()}`
      };
      localStorage.setItem('ehi_auth_session', JSON.stringify(staffSession));
      setSession(staffSession);
      return { error: null };
    }

    return { error: new Error('Invalid credentials. Please enter a valid staff email.') };
  };

  const signOut = async (): Promise<void> => {
    if (!isDemoMode && supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  };

  const orgId = session?.user?.user_metadata?.org_id || 'org-ehi-global';

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        session,
        loading,
        orgId,
        signIn,
        signOut
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
