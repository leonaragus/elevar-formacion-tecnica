export type DevCurso = {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  modalidad: string;
  categoria: string;
  nivel: string;
  precio: number;
  estado: string;
  created_at: string;
  updated_at: string;
};

export type DevInscripcion = {
  user_id: string;
  curso_id: string;
  estado: "pendiente" | "activo" | "inactivo";
};

export type DevInteres = {
  email: string;
  curso_id: string;
  when: string;
};

export const devCursos: DevCurso[] = [];
export const devInscripciones: DevInscripcion[] = [];
export const devIntereses: DevInteres[] = [];
export type DevMaterial = {
  id: string;
  curso_id: string;
  titulo: string;
  curso: string;
  tipo: string;
  tamaño: string;
  fecha: string;
  descargas: number;
};
export const devMateriales: DevMaterial[] = [];
export type DevPago = {
  user_id: string;
  curso_id: string;
  estado: "pagado" | "pendiente";
};
export const devPagos: DevPago[] = [];

export type DevPerfil = {
  email: string;
  nombre?: string;
  apellido?: string;
  documento?: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  updated_at: string;
};
export const devPerfiles: DevPerfil[] = [];

export function upsertPerfil(email: string, meta: Partial<DevPerfil>) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return;
  const idx = devPerfiles.findIndex((p) => p.email.toLowerCase() === normalized);
  const payload: DevPerfil = {
    email: normalized,
    nombre: meta.nombre ?? "",
    apellido: meta.apellido ?? "",
    documento: meta.documento ?? "",
    telefono: meta.telefono ?? "",
    direccion: meta.direccion ?? "",
    fecha_nacimiento: meta.fecha_nacimiento ?? "",
    updated_at: new Date().toISOString(),
  };
  if (idx >= 0) {
    devPerfiles[idx] = { ...devPerfiles[idx], ...payload };
  } else {
    devPerfiles.push(payload);
  }
}


// Datos de prueba eliminados para evitar confusión en producción
// devInscripciones.push({ ... });
// devMateriales.push({ ... });


export function upsertInscripcion(user_id: string, curso_id: string, estado: DevInscripcion["estado"]) {
  const idx = devInscripciones.findIndex((i) => i.user_id === user_id && i.curso_id === curso_id);
  if (idx >= 0) {
    devInscripciones[idx].estado = estado;
  } else {
    devInscripciones.push({ user_id, curso_id, estado });
  }
}

export function deleteInscripcion(user_id: string, curso_id: string) {
  const idx = devInscripciones.findIndex((i) => i.user_id === user_id && i.curso_id === curso_id);
  if (idx >= 0) {
    devInscripciones.splice(idx, 1);
  }
}
export function addPago(user_id: string, curso_id: string) {
  devPagos.push({ user_id, curso_id, estado: "pagado" });
}

export type DevEvaluacionQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
};

export type DevEvaluacion = {
  id: string;
  title: string;
  course_name: string | null;
  source_filename: string | null;
  questions: DevEvaluacionQuestion[];
  created_at: string;
};

export const devEvaluaciones: DevEvaluacion[] = [];

export type DevRespuestaEvaluacion = {
  evaluacion_id: string;
  user_id: string | null;
  answers: number[];
  score: number | null;
  created_at: string;
};

export const devRespuestasEvaluacion: DevRespuestaEvaluacion[] = [];

// devEvaluaciones.push({ ... });
