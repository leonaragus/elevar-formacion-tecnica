'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signUp: (email: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    const e = String(email || "").trim().toLowerCase();
    if (!e) throw new Error("Email es requerido");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        // Corrected: Redirect back to the courses page as originally intended.
        emailRedirectTo: `${window.location.origin}/cursos`,
      },
    });

    if (error) {
      console.error("Error sending magic link:", error);
      throw error;
    }
  };

  const signUp = async (email: string, userData: any) => {
    const supabase = createSupabaseBrowserClient();
    const password = Math.random().toString(36).slice(-16);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        // Corrected: Redirect back to the courses page as originally intended.
        emailRedirectTo: `${window.location.origin}/cursos`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    document.cookie = `student_email=; path=/; max-age=0`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
