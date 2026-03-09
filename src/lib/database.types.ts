export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ESTE ARCHIVO AHORA REFLEJA LA TABLA "usuarios" REAL

export interface Database {
  public: {
    Tables: {
      usuarios: { // CAMBIADO: de 'profiles' a 'usuarios'
        Row: {
          id: string;
          created_at: string;
          nombre: string | null;
          apellido: string | null;
          role: 'admin' | 'alumno'; // Asumiendo los mismos roles
          status: 'aprobado' | 'pendiente'; // Asumiendo los mismos estados
          // Agrega aquí otras columnas de tu tabla 'usuarios' si existen
        };
        Insert: {
          id: string;
          created_at?: string;
          nombre?: string | null;
          apellido?: string | null;
          role?: 'admin' | 'alumno';
          status?: 'aprobado' | 'pendiente';
        };
        Update: {
          id?: string;
          created_at?: string;
          nombre?: string | null;
          apellido?: string | null;
          role?: 'admin' | 'alumno';
          status?: 'aprobado' | 'pendiente';
        };
      };
      // Puedes agregar otras tablas aquí si es necesario
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key:string]: any;
    };
    Enums: {
      // Si tienes enums personalizados en Supabase, defínelos aquí
    };
    CompositeTypes: {
      [key: string]: any;
    };
  };
}
