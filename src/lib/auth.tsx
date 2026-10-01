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
    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
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
    } = supabase.auth.onAuthStateChange((_event, sbSession) => {
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
    if (isDemoMode || !supabase) {
      if (password === 'invalid') {
        return { error: new Error('Invalid credentials') };
      }
      const demoUser: AuthUser = {
        id: `usr-${Date.now()}`,
        email,
        user_metadata: {
          org_id: 'org-ehi-global',
          org_role: 'admin',
          full_name: email.split('@')[0]
        }
      };
      setSession({
        user: demoUser,
        access_token: 'demo-token'
      });
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: new Error(error.message) };
    }
    if (data.session && data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        user_metadata: {
          org_id: (data.user.user_metadata?.org_id as string) || 'org-ehi-global',
          org_role: (data.user.user_metadata?.org_role as string) || 'member',
          full_name: (data.user.user_metadata?.full_name as string) || ''
        }
      };
      setSession({
        user: authUser,
        access_token: data.session.access_token
      });
    }
    return { error: null };
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
