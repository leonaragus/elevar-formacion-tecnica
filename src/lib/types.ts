import { type User } from "@supabase/supabase-js";

// 1. Perfil del Usuario (extiende la tabla auth.users)
// Se popula usando un trigger desde la funcion handle_new_user
export interface Profile {
  id: string; // user_id
  nombre: string | null;
  apellido: string | null;
  email: string | null; // email del usuario
  rol: "alumno" | "admin" | "profesor";
  avatar_url: string | null;
}

// 2. Cursos
export interface Curso {
  id: string; // UUID
  created_at: string;
  titulo: string;
  descripcion: string;
  estado: "borrador" | "activo" | "archivado";
  banner_url: string | null;
  // Relaciones (pueden ser opcionales)
  cursos_alumnos?: Inscripcion[]; // Lista de alumnos inscritos
}

// 3. Inscripciones (tabla intermedia cursos_alumnos)
// Conecta Usuarios con Cursos
export interface Inscripcion {
  curso_id: string;
  user_id: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  created_at: string;
  // Relaciones (para hacer joins)
  alumno?: Profile; // Datos del alumno inscrito
  curso?: Curso; // Datos del curso
}

// Tipo específico para la lista de pendientes del dashboard
// Es una Inscripcion pero nos aseguramos que trae las relaciones
export interface Pendiente extends Inscripcion {
  alumno: Profile;
  curso: Curso;
}

// Para Auth, usamos el tipo que ya provee Supabase
export type AuthUser = User;
