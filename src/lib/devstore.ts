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

devCursos.push({
  id: "liquidacion-de-sueldos",
  titulo: "Liquidación de Sueldos",
  descripcion: "Curso práctico sobre liquidación de sueldos y normativa vigente.",
  duracion: "6 meses",
  modalidad: "virtual",
  categoria: "RRHH",
  nivel: "inicial",
  precio: 0,
  estado: "activo",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
devCursos.push({
  id: "gestion-documental",
  titulo: "Diplomatura en Gestión y Control Documental",
  descripcion: "Aprende a gestionar documentación técnica y legal de forma profesional.",
  duracion: "6 meses",
  modalidad: "virtual",
  categoria: "Administración",
  nivel: "inicial",
  precio: 0,
  estado: "activo",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Datos de prueba para Admin
devInscripciones.push({
  user_id: "alumno.pendiente@test.com",
  curso_id: "liquidacion-de-sueldos",
  estado: "pendiente"
});

devMateriales.push(
  {
    id: "mat-lds-1",
    curso_id: "liquidacion-de-sueldos",
    titulo: "Introducción a la Liquidación de Sueldos",
    curso: "Liquidación de Sueldos",
    tipo: "PDF",
    tamaño: "1.2 MB",
    fecha: new Date().toLocaleDateString("es-AR"),
    descargas: 0,
  },
  {
    id: "mat-lds-2",
    curso_id: "liquidacion-de-sueldos",
    titulo: "Convenios y Normativa Actual",
    curso: "Liquidación de Sueldos",
    tipo: "PDF",
    tamaño: "2.8 MB",
    fecha: new Date().toLocaleDateString("es-AR"),
    descargas: 0,
  },
  {
    id: "mat-lds-3",
    curso_id: "liquidacion-de-sueldos",
    titulo: "Ejercicios Prácticos",
    curso: "Liquidación de Sueldos",
    tipo: "PDF",
    tamaño: "900 KB",
    fecha: new Date().toLocaleDateString("es-AR"),
    descargas: 0,
  }
);

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

devEvaluaciones.push({
  id: "eval-lds-1",
  title: "Evaluación Inicial: Liquidación de Sueldos",
  course_name: "Liquidación de Sueldos",
  source_filename: "Normativa_Laboral_2026.pdf",
  questions: [
    {
      question: "¿Qué concepto corresponde a aportes obligatorios del empleado?",
      options: ["Obra social", "Sueldo básico", "Horas extra", "Premios"],
      correctAnswer: 0,
    },
    {
      question: "¿Cuál es el período habitual de liquidación mensual?",
      options: ["Del 1 al 10", "Del 1 al 30/31", "Del 15 al 30", "Del 20 al 20"],
      correctAnswer: 1,
    },
    {
      question: "¿Qué se considera remunerativo?",
      options: ["Viáticos no comprobables", "Bonificación no remunerativa", "Sueldo básico", "Asignaciones familiares"],
      correctAnswer: 2,
    },
    {
      question: "¿Qué organismo administra las contribuciones patronales?",
      options: ["AFIP", "ANSES", "SRT", "INDEC"],
      correctAnswer: 0,
    },
    {
      question: "¿Qué documento formaliza la relación laboral?",
      options: ["CUIL", "Convenio colectivo", "Recibo de sueldo", "Contrato de trabajo"],
      correctAnswer: 3,
    },
  ],
  created_at: new Date().toISOString(),
});
