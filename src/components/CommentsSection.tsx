"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  clase_id: string;
  author_id?: string | null;
  author_email?: string | null;
  texto: string;
  created_at: string;
  calificacion_estrellas?: number | null;
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
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        💬 Comentarios de la Clase
      </h2>
      <div className="mb-8 bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-4 text-base focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 ease-in-out resize-y min-h-[100px]"
          rows={4}
          placeholder="¡Deja tu comentario o pregunta! 🤔 ¿Qué te pareció la clase?"
          disabled={loading}
          maxLength={500}
        />
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {texto.length}/500 caracteres
          </span>
          <button
            onClick={submit}
            disabled={loading || !texto.trim()}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
          >
            {loading ? 'Enviando...' : '🚀 Enviar Comentario'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-3 font-medium">⚠️ Error: {error}</p>}
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 text-center py-4">Cargando comentarios...</p>
      ) : comments.length === 0 ? (
        <p className="text-md text-gray-600 text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
          Aún no hay comentarios en esta clase. ¡Sé el primero en comentar! 👋
        </p>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-700 text-md font-bold flex-shrink-0">
                    {c.author_email ? c.author_email[0].toUpperCase() : '?'}{" "}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-gray-800">
                      {c.author_email
                        ? c.author_email.split("@")[0]
                        : c.author_id
                        ? "Usuario Anónimo"
                        : "Anónimo"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                {c.calificacion_estrellas && (
                  <div className="flex items-center text-yellow-400 text-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`${star <= c.calificacion_estrellas! ? "opacity-100" : "opacity-30"}`}>
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
                {c.texto}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
