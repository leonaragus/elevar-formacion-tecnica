"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import CommentInput from "./CommentInput"; // Importamos el nuevo componente

type Item = {
  id: string;
  clase_id: string;
  clase_titulo?: string; // Lo hacemos opcional porque el input no lo necesita
  author_email?: string | null;
  author_id?: string | null;
  texto: string;
  created_at: string;
  isOptimistic?: boolean;
};

function Avatar({ text }: { text: string }) {
  const initial = (text || "A").charAt(0).toUpperCase();
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500'];
  const color = colors[initial.charCodeAt(0) % colors.length];
  
  return (
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initial}
    </div>
  );
}

function CommentItem({ item }: { item: Item }) {
  const authorName = item.author_email ? item.author_email.split('@')[0] : "Anónimo";
  
  return (
    <li className={`flex items-start gap-3 p-4 rounded-lg bg-gray-900/50 border border-gray-700/80 ${item.isOptimistic ? 'opacity-60' : ''}`}>
      <Avatar text={authorName} />
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-blue-400">
            {authorName}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap leading-relaxed">{item.texto}</p>
      </div>
    </li>
  );
}

export default function CommentsCourseSummary({ cursoId, claseId }: { cursoId: string, claseId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clases/comentarios?clase_id=${encodeURIComponent(claseId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) {
        setItems(Array.isArray(json.items) ? json.items : []);
      } else {
        setError(json?.error || "Error al cargar comentarios");
      }
    } catch (e: any) {
      setError(e?.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [claseId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleCommentAdded = (newItem: Item) => {
    setItems(prevItems => [newItem, ...prevItems]);
  };

  return (
    <div className="space-y-6">
      {/* El input para añadir un nuevo comentario */}
      <CommentInput claseId={claseId} onCommentAdded={handleCommentAdded} />

      {/* La lista de comentarios */}
      <div className="space-y-4">
        {loading && items.length === 0 ? (
          <p className="text-sm text-gray-400 p-4 text-center">Cargando comentarios...</p>
        ) : items.length === 0 && !loading ? (
          <div className="text-center py-8 px-4 bg-gray-900/50 rounded-lg border border-dashed border-gray-700">
            <h3 className="text-lg font-medium text-white">No hay comentarios todavía</h3>
            <p className="text-sm text-gray-400 mt-1">¡Sé el primero en dejar tu pregunta o aporte!</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <CommentItem key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
      
      {error && <p className="text-sm text-red-500 mt-3 p-4 text-center">{error}</p>}
    </div>
  );
}
