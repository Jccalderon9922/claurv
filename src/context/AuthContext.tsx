import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setProfile(data as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
