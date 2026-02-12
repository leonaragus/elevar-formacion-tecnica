"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  clase_id: string;
  author_id?: string | null;
  author_email?: string | null;
  texto: string;
  created_at: string;
};

export default function CommentsSection({ claseId }: { claseId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clases/comentarios?clase_id=${encodeURIComponent(claseId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) {
        setComments(Array.isArray(json.items) ? json.items : []);
      } else {
        setError(json?.error || "Error");
      }
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claseId]);

  const submit = async () => {
    const t = texto.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clases/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clase_id: claseId, texto: t }),
      });
      const json = await res.json();
      if (json?.ok) {
        setTexto("");
        load();
      } else {
        setError(json?.error || "Error");
      }
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">💬 Comentarios</h2>
      <div className="mb-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Deje su comentario o qué le pareció la clase"
          disabled={loading}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={submit}
            disabled={loading || !texto.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            Enviar
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Cargando comentarios...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-600">Aún no hay comentarios.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {c.author_email
                    ? c.author_email
                    : c.author_id
                    ? "Usuario"
                    : "Anónimo"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleString("es-ES")}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {c.texto}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
