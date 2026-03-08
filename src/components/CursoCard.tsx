'use client';

import { Clock, Users, Star, BookText, UserCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg transition-transform hover:scale-[1.02]">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {curso.titulo}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {curso.descripcion || "Sin descripción"}
            </p>
          </div>
          {isActive && (
            <div className="flex-shrink-0 ml-2">
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                Activo
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-5">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <span>{curso.duracion || "Duración no especificada"}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            <span>{professor || "Profesor a asignar"}</span>
          </div>
        </div>

        {isAdminView && (curso.precio !== undefined && curso.precio !== null) && (
          <div className="flex items-center text-sm mb-4">
            <Star className="w-4 h-4 mr-2 text-yellow-500" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              {curso.precio === 0 ? "Gratis / Bonificado" : `$${curso.precio.toLocaleString()}`}
            </span>
          </div>
        )}

        <div className="mt-4">
          {estadoCurso === "activo" ? (
            <div className="flex flex-col space-y-3">
               <Link
                  href={`/materiales`}
                  className="w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <BookText className="w-4 h-4" />
                  Acceder al Material
                </Link>
                <Link
                  href="/perfil"
                  className="w-full text-center px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <UserCircle className="w-4 h-4" />
                  Completar mis datos
              </Link>
            </div>
          ) : estadoCurso === "pendiente" ? (
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Inscripción Pendiente
            </button>
          ) : (
            <button
              onClick={() => setAskData(true)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Solicitar Inscripción
            </button>
          )}

          {askData && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-sm">
                    <h4 className='text-lg font-bold mb-1 text-gray-900 dark:text-white'>Completa tus datos</h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>Necesitamos tu nombre y apellido para la inscripción.</p>
                    <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                          disabled={sending}
                        />
                        <input
                          type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                          disabled={sending}
                        />
                    </div>
                    {err && <div className="text-red-500 text-sm mt-3">{err}</div>}
                    <div className="mt-4 flex gap-3 justify-end">
                        <button
                          onClick={() => { setAskData(false); setErr(null); }}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium"
                          disabled={sending}
                        >Cancelar</button>
                        <button
                          onClick={async () => {
                            if (!nombre.trim() || !apellido.trim()) { setErr("Nombre y apellido son obligatorios"); return; }
                            setSending(true); setErr(null);
                            try {
                              const res = await fetch("/api/alumno/inscripcion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curso_id: curso.id, nombre: nombre.trim(), apellido: apellido.trim() }) });
                              if (res.ok) { window.location.href = "/auth?error=pendiente"; return; }
                              const data = await res.json();
                              setErr(data?.error || "Error al enviar la solicitud.");
                            } catch { setErr("Error de conexión."); } 
                            finally { setSending(false); }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                          disabled={sending}
                        >{sending ? "Enviando..." : "Enviar Solicitud"}</button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
