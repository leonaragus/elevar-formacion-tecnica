'''"use client";

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

export default function CommentInput({ 
  claseId, 
  onCommentAdded 
}: { 
  claseId: string, 
  onCommentAdded: (newItem: any) => void 
}) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authorEmail = user?.email || 'Anónimo';

      const optimisticItem = {
        id: `temp-${Date.now()}`,
        clase_id: claseId,
        texto: text,
        author_email: authorEmail,
        created_at: new Date().toISOString(),
        isOptimistic: true, // Flag to show it's temporary
      };

      onCommentAdded(optimisticItem);
      setText('');

      const res = await fetch('/api/clases/comentarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clase_id: claseId, texto: text }),
      });

      const result = await res.json();

      if (!result.ok) {
        setError(result.error || 'No se pudo enviar el comentario.');
        // Here you might want to remove the optimistic item
      }
    } catch (e: any) {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      <Avatar text="Tú" />
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu comentario o pregunta..."
          className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
          rows={2}
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-red-500 h-4">{error}</p>
          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </form>
  );
}
'''