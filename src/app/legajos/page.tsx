"use client";

import { MainLayout } from "@/components/MainLayout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Search, PlusCircle, UserSquare2, BadgeCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

type Legajo = {
  id: string;
  apellido: string;
  nombre: string;
  cuit_cuil: string;
  estado_id: number;
  estado?: string;
  foto_url?: string | null;
};

export default function LegajosPage() {
  const [items, setItems] = useState<Legajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estadosMap, setEstadosMap] = useState<Record<number, string>>({});
  const [hasGD, setHasGD] = useState(false);
  const [isProf, setIsProf] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: insc } = await supabase
          .from("cursos_alumnos")
          .select("curso_id, estado")
          .eq("user_id", user.id)
          .eq("curso_id", "gestion-documental")
          .eq("estado", "activo")
          .limit(1);
        setHasGD(Array.isArray(insc) && insc.length > 0);
      }
      try {
        const me = await fetch("/api/profesor/me");
        const j = await me.json().catch(() => null as any);
        setIsProf(Boolean(j?.isProf));
      } catch {}
      const { data: estados } = await supabase.from("estados_legajo").select("id,nombre").limit(20);
      const map: Record<number, string> = {};
      (Array.isArray(estados) ? estados : []).forEach((e: any) => {
        map[Number(e.id)] = String(e.nombre);
      });
      setEstadosMap(map);
      const { data } = await supabase.from("vista_onboarding").select("*").order("apellido", { ascending: true }).limit(200);
      const list = Array.isArray(data) ? data.map((r: any) => ({
        id: String(r.id),
        apellido: String(r.apellido ?? ""),
        nombre: String(r.nombre ?? ""),
        cuit_cuil: String(r.cuit_cuil ?? ""),
        estado_id: Number(r.estado_id ?? 1),
        estado: map[Number(r.estado_id ?? 1)] ?? "Borrador",
        foto_url: r.foto_url ?? null,
      })) : [];
      setItems(list);
      setLoading(false);
    };
    run();
  }, []);

  const filtered = items.filter((i) => {
    const t = `${i.apellido} ${i.nombre} ${i.cuit_cuil}`.toLowerCase();
    return t.includes(q.toLowerCase().trim());
  });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Legajos</h1>
            <p className="text-gray-600 dark:text-gray-400">Carga y visualización de empleados</p>
          </div>
          <Link href="/legajos/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <PlusCircle className="w-5 h-5" />
            Nuevo Legajo
          </Link>
        </div>

        {!hasGD && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-800 dark:text-yellow-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Módulo exclusivo del curso Gestión Documental</div>
                <p className="text-sm mt-1">
                  Para acceder, debes estar inscripto y aceptado en el curso “Gestión y Control Documental”.
                  Si te equivocaste de curso, ve a Ajustes y solicita la inscripción correcta. Luego espera la aceptación.
                </p>
                <ul className="text-sm mt-2 list-disc list-inside">
                  <li>Paso 1: En Ajustes, selecciona “Gestión y Control Documental”.</li>
                  <li>Paso 2: Espera la aceptación del administrativo.</li>
                  <li>Paso 3: Vuelve aquí para cargar y revisar tus legajos.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por apellido, nombre o CUIT/CUIL"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        ) : !hasGD ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <p className="text-gray-700 dark:text-gray-300">Acceso restringido al curso Gestión Documental.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <p className="text-gray-700 dark:text-gray-300">No hay resultados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((l) => (
              <div key={l.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-900/40 flex items-center justify-center overflow-hidden">
                      {l.foto_url ? (
                        <img src={l.foto_url} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <UserSquare2 className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{l.apellido}, {l.nombre}</h3>
                        {l.estado_id === 3 && <BadgeCheck className="w-5 h-5 text-green-600 dark:text-green-400" />}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{l.cuit_cuil}</p>
                      <div className="mt-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          l.estado_id === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" :
                          l.estado_id === 2 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                          l.estado_id === 3 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>{estadosMap[l.estado_id] ?? l.estado}</span>
                      </div>
                      {isProf && (
                        <div className="mt-3 flex gap-2">
                          <button
                            disabled={mutatingId === l.id}
                            onClick={async () => {
                              try {
                                setMutatingId(l.id);
                                const res = await fetch("/api/legajos/estado", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", "X-Admin-Token": process.env.NEXT_PUBLIC_DUMMY ?? "" },
                                  body: JSON.stringify({ cuit_cuil: l.cuit_cuil, estado_id: 2 }),
                                });
                                const j = await res.json().catch(() => null as any);
                                if (!res.ok || !j?.ok) throw new Error(j?.error || "Error");
                                setItems((prev) => prev.map((x) => x.id === l.id ? { ...x, estado_id: 2 } : x));
                              } finally {
                                setMutatingId(null);
                              }
                            }}
                            className="px-3 py-2 text-xs rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          >
                            Solicitar revisión
                          </button>
                          <button
                            disabled={mutatingId === l.id}
                            onClick={async () => {
                              try {
                                setMutatingId(l.id);
                                const res = await fetch("/api/legajos/estado", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", "X-Admin-Token": process.env.NEXT_PUBLIC_DUMMY ?? "" },
                                  body: JSON.stringify({ cuit_cuil: l.cuit_cuil, estado_id: 4 }),
                                });
                                const j = await res.json().catch(() => null as any);
                                if (!res.ok || !j?.ok) throw new Error(j?.error || "Error");
                                setItems((prev) => prev.map((x) => x.id === l.id ? { ...x, estado_id: 4 } : x));
                              } finally {
                                setMutatingId(null);
                              }
                            }}
                            className="px-3 py-2 text-xs rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          >
                            Marcar rechazado
                          </button>
                        </div>
                      )}
                    </div>
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
