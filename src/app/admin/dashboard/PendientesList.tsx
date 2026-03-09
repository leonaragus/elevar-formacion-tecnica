'use client'
import { useState } from 'react';
import { Check, X, RefreshCw, User, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { type Pendiente } from '@/lib/types'; // Importa el tipo centralizado

// Props para el item individual, usando el tipo Pendiente
interface PendienteItemProps {
  pendiente: Pendiente;
  onAction: (curso_id: string, user_id: string) => void;
}

function PendienteItem({ pendiente, onAction }: PendienteItemProps) {
  const [loading, setLoading] = useState(false);

  // La función ahora es más robusta y da feedback claro
  const handleAction = async (action: 'aprobado' | 'rechazado') => {
    setLoading(true);
    const actionVerb = action === 'aprobado' ? 'aprobada' : 'rechazada';

    try {
      const response = await fetch('/api/admin/inscripciones/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso_id: pendiente.curso_id,
          user_id: pendiente.user_id,
          action: action,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Error desconocido al procesar la acción');
      }
      
      toast.success(`Inscripción ${actionVerb} correctamente.`);
      onAction(pendiente.curso_id, pendiente.user_id); // Notifica al padre para remover el item

    } catch (e: any) {
      toast.error(`Error al ${action} la inscripción: ${e.message}`);
      setLoading(false); // Solo detener carga en caso de error
    }
  };

  // Aseguramos que los nombres y títulos se muestren aunque sean nulos
  const labelName = [pendiente.alumno?.nombre, pendiente.alumno?.apellido].filter(Boolean).join(" ").trim();
  const labelEmail = pendiente.alumno?.email || 'Email no disponible';
  const cursoLabel = pendiente.curso?.titulo || 'Curso no disponible';

  return (
    <div className="p-3 hover:bg-slate-800/60 rounded-lg transition-colors border border-transparent hover:border-slate-700/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 bg-slate-700/80 p-2 rounded-lg">
              <User className="w-5 h-5 text-slate-300"/>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate" title={labelName || labelEmail}>{labelName || labelEmail}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate" title={cursoLabel}>
              <BookOpen className="w-3 h-3 flex-shrink-0"/> 
              <span>{cursoLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={() => handleAction('aprobado')}
            disabled={loading}
            aria-label="Aprobar"
            className="p-2 rounded-md text-green-400 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => handleAction('rechazado')}
            disabled={loading}
            aria-label="Rechazar"
            className="p-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
             {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal de la lista, ahora tipado
export function PendientesList({ initialPendientes }: { initialPendientes: Pendiente[] }) {
  const [pendientes, setPendientes] = useState<Pendiente[]>(initialPendientes);

  // La función para remover un item de la lista sigue igual pero con tipos seguros
  const handleActionComplete = (curso_id: string, user_id: string) => {
    setPendientes(current => current.filter(p => 
      !(p.curso_id === curso_id && p.user_id === user_id)
    ));
  };

  if (pendientes.length === 0) {
    return (
      <div className="border-2 border-dashed border-slate-700/80 rounded-2xl p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-200">¡Todo al día!</h3>
        <p className="text-sm text-slate-400 mt-2">No hay inscripciones pendientes de revisión.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl">
        <h2 className="text-base font-semibold text-slate-100 p-4 border-b border-slate-700/50">Inscripciones Pendientes</h2>
        <div className="p-2 space-y-1">
          {pendientes.map((p) => (
            <PendienteItem key={`${p.curso_id}-${p.user_id}`} pendiente={p} onAction={handleActionComplete} />
          ))}
        </div>
    </div>
  );
}
