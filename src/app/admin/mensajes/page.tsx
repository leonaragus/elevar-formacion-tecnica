import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { User, Activity, FileText, AlertTriangle, Plus, Trash2, Send, Globe } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default async function AdminMensajesPage(props: { searchParams: Promise<{ ok?: string, error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let supabaseAdmin: any = null;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    supabaseAdmin = null;
  }
  
  const client = supabaseAdmin || supabase;
  let dbError: string | null = null;
  
  // Cursos para selector
  let cursosOptions: Array<{ id: string; titulo: string }> = [];
  try {
    const { data } = await client.from("cursos").select("id, titulo").order("orden", { ascending: true }).limit(200);
    cursosOptions = Array.isArray(data) ? data.map((c: any) => ({ id: String(c.id), titulo: String(c.titulo || "Curso") })) : [];
  } catch {}

  // Mensajes publicados
  let mensajesLista: any[] = [];
  try {
     const { data: msgs, error } = await client.from("mensajes").select("*").order("created_at", { ascending: false }).limit(50);
     if (error) dbError = error.message;
     if (msgs) {
        const courseMap = new Map(cursosOptions.map(c => [c.id, c.titulo]));
        mensajesLista = msgs.map((m: any) => ({
             ...m,
             curso_titulo: m.curso_id ? (courseMap.get(m.curso_id) || "Curso desconocido") : "Global (Todos)"
        }));
     }
  } catch (e: any) {
      dbError = e?.message;
  }

  const okMsg = searchParams.ok;
  const errorMsg = searchParams.error;

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-400" />
                Gestión de Mensajes
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Envía avisos y notificaciones a tus alumnos por curso o de forma global
              </p>
            </div>
          </header>

          {okMsg && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm flex items-center gap-3">
               <Activity className="w-4 h-4" />
               {okMsg === 'published' ? 'Mensaje publicado con éxito' : 'Mensaje eliminado correctamente'}
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-3">
               <AlertTriangle className="w-4 h-4" />
               {decodeURIComponent(errorMsg)}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Formulario */}
            <div className="xl:col-span-1">
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sticky top-8">
                  <h2 className="text-lg font-semibold text-slate-50 mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-400" />
                    Nuevo Mensaje
                  </h2>
                  <form action="/api/admin/mensajes" method="POST" className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Título del aviso</label>
                      <input 
                        name="titulo" 
                        type="text" 
                        required 
                        placeholder="Ej: Inicio de clases"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Contenido del mensaje</label>
                      <textarea 
                        name="contenido" 
                        required 
                        rows={6} 
                        placeholder="Escribe aquí el comunicado..."
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Destinatarios</label>
                      <select 
                        name="curso_id" 
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                      >
                        <option value="">Global (Todos los alumnos)</option>
                        {cursosOptions.map(c => (
                          <option key={c.id} value={c.id}>{c.titulo}</option>
                        ))}
                      </select>
                    </div>
                    <input type="hidden" name="return_to" value="/admin/mensajes?ok=published" />
                    <button 
                        type="submit" 
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    >
                      <Send className="w-4 h-4" />
                      Publicar Mensaje
                    </button>
                  </form>
                </section>
            </div>

            {/* Lista de Mensajes */}
            <div className="xl:col-span-2">
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold text-slate-50 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Historial de Mensajes
                  </h2>
                  
                  {dbError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                        {dbError}
                    </div>
                  )}

                  {mensajesLista.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No hay mensajes publicados aún.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mensajesLista.map((m, idx) => (
                        <div key={m.id} className={`p-5 rounded-2xl border transition-all ${idx === 0 ? 'border-blue-500/30 bg-blue-600/5' : 'border-white/10 bg-white/5'}`}>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {m.curso_id ? (
                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                                            {m.curso_titulo}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            GLOBAL
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {new Date(m.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-50 truncate">{m.titulo}</h3>
                            </div>
                            <form action="/api/admin/mensajes" method="POST">
                              <input type="hidden" name="action" value="delete" />
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="return_to" value="/admin/mensajes?ok=deleted" />
                              <button 
                                type="submit" 
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                title="Eliminar mensaje"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          </div>
                          <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
                            {m.contenido}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
            </div>
          </div>
      </div>
    </AdminLayout>
  );
}
