"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  clase_id: string;
  clase_titulo: string;
  author_email?: string | null;
  author_id?: string | null;
  texto: string;
  created_at: string;
};

export default function CommentsCourseSummary({ cursoId }: { cursoId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [filterId, setFilterId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cursos/comentarios?curso_id=${encodeURIComponent(cursoId)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json?.ok) {
          setItems(Array.isArray(json.items) ? json.items : []);
        } else {
          setError(json?.error || "Error");
        }
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cursoId]);

  const clases = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((i) => {
      if (!unique.has(i.clase_id)) unique.set(i.clase_id, i.clase_titulo || "Clase");
    });
    return Array.from(unique.entries()).map(([id, titulo]) => ({ id, titulo }));
  }, [items]);

  const visible = useMemo(() => {
    return filterId ? items.filter((i) => i.clase_id === filterId) : items;
  }, [items, filterId]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">💬 Comentarios del curso</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filtrar por clase:</label>
          <select
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="text-sm border border-gray-300 rounded-md p-2"
          >
            <option value="">Todas</option>
            {clases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo || c.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando comentarios...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-600">Aún no hay comentarios en este curso.</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((c) => (
            <li key={c.id} className="border border-gray-200 rounded-md p-4">
              <div className="text-sm text-gray-900 font-medium">{c.clase_titulo || "Clase"}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {c.author_email ? c.author_email : c.author_id ? "Usuario" : "Anónimo"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleString("es-ES")}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{c.texto}</p>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
