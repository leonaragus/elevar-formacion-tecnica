"use client";

import { Clock, Users, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import PushNotificationToggle from "./PushNotificationToggle";

type CursoRow = {
  id: string;
  titulo?: string | null;
  descripcion?: string | null;
  duracion?: string | null;
  profesor?: string | null;
  teacher?: string | null;
  docente?: string | null;
  precio?: number | null;
  modalidad?: string | null;
  estado?: string | null;
  [key: string]: any;
};

interface CursoCardProps {
  curso: CursoRow;
  professor: string;
  estadoCurso: "ninguno" | "pendiente" | "activo";
  isAdminView?: boolean;
}

export default function CursoCard({ curso, professor, estadoCurso, isAdminView = false }: CursoCardProps) {
  const isActive = curso.estado === "activo";
  const [askData, setAskData] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-transform hover:scale-105">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {curso.titulo}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {curso.descripcion || "Sin descripción"}
            </p>
          </div>
          {isActive && (
            <div className="flex-shrink-0 ml-2">
              <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                Activo
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Clock className="w-4 h-4 mr-1" />
          <span>{curso.duracion || "Duración no especificada"}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Users className="w-4 h-4 mr-1" />
          <span>{professor || "Profesor a asignar"}</span>
        </div>

        {(curso.precio !== undefined && curso.precio !== null) && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Star className="w-4 h-4 mr-1" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              {curso.precio === 0 ? "Gratis / Bonificado" : `$${curso.precio.toLocaleString()}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          {estadoCurso === "activo" ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                Bienvenido al cursado de {curso.titulo}
              </div>
              <PushNotificationToggle 
                cursoId={curso.id}
                className="w-full"
              />
              <Link
                href="/perfil"
                className="w-full text-center px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Completar mis datos personales
              </Link>
            </div>
          ) : estadoCurso === "pendiente" ? (
            <button
              disabled
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Pendiente de aprobación
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/alumno/inscripcion', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ curso_id: curso.id }),
                  });
                  
                  if (response.ok) {
                    window.location.href = '/auth?error=pendiente';
                  } else {
                    let errorData: any = null;
                    try {
                      errorData = await response.json();
                    } catch {}
                    if (errorData?.requiere_datos && errorData?.curso_id) {
                      setAskData(true);
                      return;
                    }
                    if (errorData?.requiere_datos) {
                      setAskData(true);
                      return;
                    }
                    if (errorData?.requiere_registro) {
                      setAskData(true);
                      return;
                    }
                    alert((errorData && (errorData.error || errorData.message)) || 'Error al solicitar inscripción');
                  }
                } catch (error) {
                  alert('Error de conexión. Intenta nuevamente.');
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Solicitar inscripción
            </button>
          )}

          {askData && (
            <div className="mt-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={sending}
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={sending}
                />
              </div>
              {err && <div className="text-red-600 dark:text-red-400 text-sm mt-2">{err}</div>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { setAskData(false); setErr(null); }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm"
                  disabled={sending}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const n = nombre.trim();
                    const a = apellido.trim();
                    if (!n || !a) {
                      setErr("Nombre y apellido son obligatorios");
                      return;
                    }
                    setSending(true);
                    setErr(null);
                    try {
                      const res = await fetch("/api/alumno/inscripcion", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ curso_id: curso.id, nombre: n, apellido: a }),
                      });
                      if (res.ok) {
                        window.location.href = "/auth?error=pendiente";
                        return;
                      }
                      let data: any = null;
                      try { data = await res.json(); } catch {}
                      if (data?.ok) {
                        window.location.href = "/auth?error=pendiente";
                        return;
                      }
                      setErr(data?.error || "Error al enviar solicitud");
                    } catch {
                      setErr("Error de conexión");
                    } finally {
                      setSending(false);
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                  disabled={sending}
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {curso.modalidad && (
            <span className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {curso.modalidad}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
