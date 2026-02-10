"use client";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PendientesList({ pendientes }: { pendientes: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (pend: any) => {
    const email = typeof pend?.email === "string" ? pend.email : "";
    const user_id = typeof pend?.user_id === "string" ? pend.user_id : "";
    const curso_id = typeof pend?.curso_id === "string" ? pend.curso_id : "";
    const cursoTitulo = typeof pend?.curso_titulo === "string" ? pend.curso_titulo : "";
    const nombre = typeof pend?.nombre === "string" ? pend.nombre : "";
    const apellido = typeof pend?.apellido === "string" ? pend.apellido : "";
    const label = (email || user_id || "usuario").toString();
    const cursoLabel = cursoTitulo ? `${cursoTitulo} (${curso_id || "sin id"})` : (curso_id || "sin curso");
    if (!confirm(`¿Aprobar inscripción de ${label} para ${cursoLabel}?`)) return;
    const key = `${label}::${curso_id}`;
    setLoading(key);
    try {
        const res = await fetch("/api/admin/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, user_id, curso_id, nombre, apellido })
        });
        if (res.ok) {
            router.refresh();
        } else {
            const json = await res.json();
            alert("Error al aprobar: " + (json.error || "Desconocido"));
        }
    } catch (e) {
        alert("Error de conexión");
    } finally {
        setLoading(null);
    }
  };

  if (pendientes.length === 0) {
    return (
        <div className="text-center py-8 text-slate-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
        <p className="text-sm">No hay inscripciones pendientes</p>
        </div>
    );
  }

  return (
    <div className="max-h-96 overflow-auto">
      <div className="space-y-3">
          {[...pendientes].sort((a, b) => {
            const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
          }).map((pend, idx) => {
            const curso_id = typeof pend?.curso_id === "string" ? pend.curso_id : "";
            const cursoTitulo = typeof pend?.curso_titulo === "string" ? pend.curso_titulo : "";
            const cursoLabel = cursoTitulo ? `${cursoTitulo} (${curso_id || "sin id"})` : (curso_id || "Curso pendiente");
            const createdAt = typeof pend?.created_at === "string" ? pend.created_at : "";
            const createdLabel = createdAt ? new Date(createdAt).toLocaleString("es-AR") : "";
            const nameLabel = [pend?.nombre, pend?.apellido].filter(Boolean).join(" ").trim();
            const label = nameLabel || (pend?.email || pend?.user_id || "Usuario").toString();
            const key = `${label}::${curso_id}`;
            return (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-50 truncate">{label}</div>
                    <div className="text-xs text-slate-400 truncate">{cursoLabel}</div>
                    {createdLabel && <div className="text-[11px] text-slate-500 mt-0.5">{createdLabel}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Pendiente</span>
                      <button 
                          onClick={() => handleApprove(pend)}
                          disabled={loading === key}
                          className="p-1 hover:bg-green-900/30 rounded text-green-400 disabled:opacity-50"
                          title="Aprobar"
                      >
                          <CheckCircle className="w-5 h-5" />
                      </button>
                  </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
