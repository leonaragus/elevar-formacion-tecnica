"use client";
import { MainLayout } from "@/components/MainLayout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, CheckCircle, AlertTriangle, CalendarDays } from "lucide-react";

type CursoRow = Record<string, unknown>;

function parseMeses(curso: CursoRow) {
  const mesesField = (curso as any)?.meses;
  if (typeof mesesField === "number" && mesesField > 0) return mesesField;
  const d = curso?.duracion;
  if (typeof d === "string") {
    const m = d.match(/(\d+)\s*mes/i);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return 6;
}

function LegendHabilitado() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
      <CalendarDays className="w-4 h-4" />
      Habilitado hasta el día 13 de cada mes
    </div>
  );
}

function MesCard({
  index,
  pagado,
  onPagar,
}: {
  index: number;
  pagado: boolean;
  onPagar: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Mes {index}</div>
        <LegendHabilitado />
      </div>
      {pagado ? (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Pagado
        </div>
      ) : (
        <button
          onClick={onPagar}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Pagar ahora
        </button>
      )}
    </div>
  );
}

function PagosClient({
  cursoId,
  mesesTotal,
  estadoCurso,
}: {
  cursoId: string;
  mesesTotal: number;
  estadoCurso: "ninguno" | "pendiente" | "activo";
}) {
  const { user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [paidCount, setPaidCount] = useState<number>(0);
  const [success, setSuccess] = useState<boolean>(false);

  const storageKey = useMemo(() => {
    return user?.id ? `pagos:${user.id}:${cursoId}` : "";
  }, [user?.id, cursoId]);

  useEffect(() => {
    const s = search?.get("success");
    setSuccess(s === "1");
  }, [search]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? parseInt(raw, 10) : 0;
      if (!Number.isNaN(n) && n >= 0) setPaidCount(n);
    } catch {}
  }, [storageKey]);

  const handlePagar = () => {
    const next = Math.min(paidCount + 1, mesesTotal);
    setPaidCount(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {}
    }
    const base = `/pagos?curso_id=${encodeURIComponent(cursoId)}&success=1`;
    router.replace(base);
  };

  const meses = Array.from({ length: mesesTotal }, (_, i) => i + 1);
  const restantes = Math.max(mesesTotal - paidCount, 0);

  return (
    <div className="space-y-6">
      {estadoCurso === "pendiente" && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span>
            Tu solicitud fue enviada. Todas las opciones se habilitarán cuando el admin apruebe tu inicio en el cursado.
          </span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-300">
          Pago completado
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Meses restantes: <span className="font-semibold">{restantes}</span>
        </div>
        <LegendHabilitado />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meses.map((m) => (
          <MesCard key={m} index={m} pagado={m <= paidCount} onPagar={handlePagar} />
        ))}
      </div>
    </div>
  );
}

export default function PagosPage({ searchParams }: { searchParams?: { curso_id?: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(String(searchParams?.curso_id ?? ""));
  const [loading, setLoading] = useState(false);
  const [estadoCursoSeleccionado, setEstadoCursoSeleccionado] = useState<"ninguno" | "pendiente" | "activo">("ninguno");
  const [mesesTotal, setMesesTotal] = useState(0);
  const [curso, setCurso] = useState<CursoRow | null>(null);
  const [hasActiveOrPendingAny, setHasActiveOrPendingAny] = useState(false);
  const [cursos, setCursos] = useState<Array<{ id: string; titulo: string }>>([]);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      
      // Obtener datos del curso si hay selectedId
      if (selectedId) {
        const { data: c } = await supabase
          .from("cursos")
          .select("*")
          .eq("id", selectedId)
          .limit(1)
          .single();
        setCurso(c ?? null);
        setMesesTotal(parseMeses(c ?? {}));

        // Obtener estado de inscripción
        const { data: insc } = await supabase
          .from("cursos_alumnos")
          .select("estado")
          .eq("user_id", user.id)
          .eq("curso_id", selectedId)
          .limit(1);
        const e = Array.isArray(insc) && insc[0]?.estado;
        if (e === "pendiente") setEstadoCursoSeleccionado("pendiente");
        if (e === "activo") setEstadoCursoSeleccionado("activo");
      } else {
        // Verificar si tiene inscripciones activas/pendientes
        const { data: inscAny } = await supabase
          .from("cursos_alumnos")
          .select("estado")
          .eq("user_id", user.id)
          .limit(10);
        const estados = Array.isArray(inscAny) ? inscAny.map((r: any) => r.estado) : [];
        setHasActiveOrPendingAny(estados.includes("activo") || estados.includes("pendiente"));

        // Obtener cursos disponibles
        if (!hasActiveOrPendingAny) {
          const { data } = await supabase
            .from("cursos")
            .select("id, titulo")
            .order("orden", { ascending: true })
            .limit(50);
          setCursos(Array.isArray(data)
            ? (data as any[]).map((c) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso") }))
            : []);
        }
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user?.id, selectedId, supabase, hasActiveOrPendingAny]);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pagos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona tus pagos mensuales del curso
          </p>
        </div>

        {!selectedId && !hasActiveOrPendingAny ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Selecciona tu curso para solicitar acceso
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Elige el curso al que estás anotado. Luego el administrador aprobará tu inicio.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {cursos.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No hay cursos disponibles por el momento.
                </div>
              ) : (
                cursos.map((c) => (
                  <form
                    key={c.id}
                    action="/api/alumno/inscripcion"
                    method="POST"
                    className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input type="hidden" name="curso_id" value={c.id} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{c.titulo}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{c.id}</div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      Solicitar inscripción
                    </button>
                  </form>
                ))
              )}
            </div>
          </div>
        ) : selectedId && estadoCursoSeleccionado === "ninguno" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Solicita tu inscripción a este curso
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                El administrador aprobará tu inicio y se habilitarán las opciones.
              </p>
            </div>
            <div className="p-6">
              <form action="/api/alumno/inscripcion" method="POST" className="flex gap-3">
                <input type="hidden" name="curso_id" value={selectedId} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Solicitar inscripción
                </button>
              </form>
            </div>
          </div>
        ) : (
          <PagosClient cursoId={selectedId} mesesTotal={mesesTotal} estadoCurso={estadoCursoSeleccionado} />
        )}
      </div>
    </MainLayout>
  );
}
