'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
// Aunque no podemos pasar <Database> al cliente, los tipos nos sirven para las operaciones.
import type { Database } from "@/lib/database.types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, userData: { nombre: string; apellido: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // CORREGIDO: Llamar a la función tal como está definida, sin argumentos de tipo.
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email: string, password?: string) => {
    const e = String(email || "").trim().toLowerCase();
    if (!e || !password) throw new Error("Email y contraseña son requeridos");

    const { error } = await supabase.auth.signInWithPassword({ email: e, password });

    if (error) {
      console.error("Error en signInWithPassword:", error);
      throw new Error("Credenciales inválidas. Por favor, verifica tu email y contraseña.");
    }
  };

  const signUp = async (email: string, password: string, userData: { nombre: string; apellido: string }) => {
    if (!email || !password) throw new Error("Email y contraseña son requeridos para el registro.");

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes("User already registered")) {
        throw new Error("Ya existe una cuenta con este correo electrónico.");
      }
      console.error("Error en supabase.auth.signUp:", authError);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("No se pudo crear el usuario. Inténtalo de nuevo.");
    }
    
    // Usamos el tipo 'usuarios' de nuestra Database importada para asegurar la forma de los datos
    const { error: profileError } = await supabase
      .from('usuarios') 
      .insert({
        id: authData.user.id,
        nombre: userData.nombre,
        apellido: userData.apellido,
        role: 'alumno', 
        status: 'pendiente'
      });

    if (profileError) {
      console.error("Error creando el perfil en la tabla usuarios:", profileError);
      throw new Error("Hubo un error al guardar tus datos de perfil.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
