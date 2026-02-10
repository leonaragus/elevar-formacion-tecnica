"use client";

import { MainLayout } from "@/components/MainLayout";
import { ClipboardCheck, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ListItem = { id: string; title: string; course_name: string | null; created_at: string };

function readLocalStorage(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export default function EvaluacionesPage() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (user?.id) {
        // Check by ID
        const { data: insc } = await supabase
          .from("cursos_alumnos")
          .select("curso_id,estado")
          .eq("user_id", user.id)
          .limit(20);
        
        // Check by Email
        let inscEmail: any[] = [];
        if (user.email) {
           const { data } = await supabase
              .from("cursos_alumnos")
              .select("curso_id,estado")
              .eq("user_id", user.email)
              .limit(20);
           if (data) inscEmail = data;
        }

        const allInsc = [...(Array.isArray(insc) ? insc : []), ...inscEmail];

        const estados = allInsc.map((r: any) => r.estado);
        setHasActive(estados.includes("activo"));
        setHasPending(estados.includes("pendiente"));
        const activeRow = allInsc.find((r) => r?.estado === "activo" && r?.curso_id != null);
        const activeId = activeRow?.curso_id != null ? String(activeRow.curso_id) : "";
        if (activeId) {
          const { data: curso } = await supabase
            .from("cursos")
            .select("titulo")
            .eq("id", activeId)
            .limit(1)
            .single();
          const t = curso?.titulo != null ? String(curso.titulo) : null;
          setCourseTitle(t);
        } else {
          setCourseTitle(null);
        }
      } else {
        const ok = readLocalStorage("student_ok") === "1";
        const cid = readLocalStorage("student_course_id");
        setHasActive(ok);
        setHasPending(!ok && Boolean(readLocalStorage("student_email")));
        if (ok && cid) {
          try {
            const res = await fetch("/api/admin/cursos?public=1", { cache: "no-store", headers: { "x-public": "1" } });
            const json = await res.json().catch(() => null as any);
            const list = Array.isArray(json?.cursos) ? json.cursos : [];
            const found = list.find((c: any) => String(c?.id) === String(cid));
            setCourseTitle(found ? String(found?.titulo ?? "") : null);
          } catch {
            setCourseTitle(null);
          }
        } else {
          setCourseTitle(null);
        }
      }
    };
    run();
  }, [user?.id]);

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
        icon: Clock,
        label: "Pendiente",
      },
      completado: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        icon: CheckCircle,
        label: "Completado",
      },
      en_revision: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        icon: AlertCircle,
        label: "En Revisión",
      },
    };
    return badges[estado as keyof typeof badges] || badges.pendiente;
  };

  useEffect(() => {
    const fetchItems = async () => {
      if (!hasActive) return;
      if (!courseTitle) {
        setItems([]);
        return;
      }
      setLoadingItems(true);
      try {
        const res = await fetch(`/api/evaluaciones/listar?course=${encodeURIComponent(courseTitle)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error");
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [hasActive, courseTitle]);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Evaluaciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona tus exámenes y trabajos prácticos
            </p>
          </div>
        </div>

        {!hasActive ? (
          <div className="mb-8 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
            {hasPending
              ? "Tu solicitud de cursado está pendiente de aprobación. Cuando sea aceptada, podrás ver las evaluaciones asignadas."
              : "Debes seleccionar tu curso y esperar la aceptación para acceder a Evaluaciones."}
          </div>
        ) : null}

        {/* La generación de evaluaciones con IA está restringida al panel de administración */}

        {hasActive && (
          <div className="grid gap-4">
            {loadingItems && (
              <div className="text-gray-600 dark:text-gray-400">Cargando evaluaciones...</div>
            )}
            {!loadingItems && items.length === 0 && (
              <div className="text-gray-600 dark:text-gray-400">No hay evaluaciones asignadas</div>
            )}
            {!loadingItems &&
              items.map((it) => (
                <div
                  key={it.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <ClipboardCheck size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {it.title}
                          </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {it.course_name || "Sin curso"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(it.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`/evaluaciones/${encodeURIComponent(it.id)}`}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full md:w-auto justify-center"
                      >
                        <Play size={16} />
                        Comenzar
                      </a>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
