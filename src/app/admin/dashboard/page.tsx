import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PendientesList } from "./PendientesList";
import { User, Activity, TrendingUp, Users, BookOpen, DollarSign, AlertTriangle, Database, Settings, LogOut } from "lucide-react";
import { headers } from "next/headers";
import { devInscripciones, devIntereses } from "@/lib/devstore";

type AdminStats = {
  // ... existing stats type
  totalCursos: number;
  totalAlumnos: number;
  totalProfesores: number;
  totalPagos: number;
  cursosActivos: number;
  alumnosActivos: number;
  ingresosMes: number;
  evaluacionesActivas: number;
  materialesCargados: number;
};

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch directly instead of using fetch API
  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    supabaseAdmin = null;
  }
  
  // Use admin client if available (bypass RLS), otherwise use user client (respect RLS)
  const client = supabaseAdmin || supabase;
  
  // Stats
  const stats = {
      totalCursos: 2,
      totalAlumnos: devInscripciones.length,
      totalProfesores: 1,
      totalPagos: 0,
      cursosActivos: 1,
      alumnosActivos: devInscripciones.filter(i => i.estado === "activo").length,
      ingresosMes: 0,
      evaluacionesActivas: 0,
      materialesCargados: 3
  };

  // Fetch pendientes
  let pendientes: any[] = [];
  try {
      const { data, error } = await client
        .from("cursos_alumnos")
        .select("user_id, curso_id, estado, created_at")
        .eq("estado", "pendiente")
        .limit(50);
      
      let combined: any[] = [];
      if (!error && data) {
        combined = [...data];
      }

      // Intereses
      const { data: intereses, error: errorIntereses } = await client
          .from("intereses")
          .select("*")
          .limit(50);
        
      if (!errorIntereses && intereses) {
          const interesesMapeados = intereses.map((i: any) => ({
             user_id: i.email, 
             email: i.email,
             curso_id: i.course_id || i.curso_id,
             estado: "pendiente",
             created_at: i.created_at,
             source: "intereses"
          }));
          combined = [...combined, ...interesesMapeados];
      }

      // Deduplicate
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.user_id === v.user_id && t.curso_id === v.curso_id) === i);
      pendientes = unique;

      if (pendientes.length === 0 && (!data && !intereses)) {
         // Fallback to devstore if DB failed completely
         const pend = devInscripciones.filter((i) => i.estado === "pendiente");
         pendientes = pend;
      }
  } catch (e) {
      console.error("Dashboard fetch error:", e);
      pendientes = devInscripciones.filter((i) => i.estado === "pendiente");
  }

  // Actividades & Recientes (mock)
  const actividades = [
      { descripcion: "Sistema iniciado", fecha: new Date().toLocaleTimeString() }
  ];
  const recientes: any[] = [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="bg-emerald-900 text-white text-xs py-1 px-4 text-center font-mono">
         Dashboard Build: {new Date().toLocaleString("es-AR")} (Direct Fetch)
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
         {/* ... (rest of the layout same as before) ... */}
         <aside className="border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
          <div className="text-sm font-semibold text-slate-50">Panel de administración</div>
          <div className="mt-1 text-xs text-slate-400">Dashboard principal</div>
          <nav className="mt-4 grid gap-1">
            <a href="/admin/dashboard" className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-50">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </a>
            <a href="/admin/ajustes" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <Settings className="w-4 h-4 mr-2" />
              Ajustes
            </a>
            <a href="/admin/pagos" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
            </a>
            <a href="/admin/legajos" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <Users className="w-4 h-4 mr-2" />
              Legajos
            </a>
            <a href="/admin/cursos" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <Database className="w-4 h-4 mr-2" />
              Cursos
            </a>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-50">
                <Activity className="w-5 h-5 mr-2 inline text-blue-400" />
                Dashboard Administrativo
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Resumen general del estado del sistema y actividades recientes
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <User className="w-5 h-5" />
              {user?.email || "Administrador"}
            </div>
          </header>

          {pendientes.length > 0 ? (
            <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-yellow-200">
                    Hay {pendientes.length} inscripción{pendientes.length === 1 ? "" : "es"} pendiente{pendientes.length === 1 ? "" : "s"} de aprobación
                  </div>
                  <div className="mt-0.5 text-xs text-yellow-100/80">
                    Revisá el curso solicitado antes de aprobar.
                  </div>
                  <div className="mt-2 grid gap-1">
                    {pendientes.slice(0, 3).map((p, idx) => {
                      const email = String((p as any)?.email ?? (p as any)?.user_id ?? "Usuario");
                      const cursoId = String((p as any)?.curso_id ?? "");
                      const cursoTitulo = String((p as any)?.curso_titulo ?? "");
                      const cursoLabel = cursoTitulo ? `${cursoTitulo} (${cursoId || "sin id"})` : (cursoId || "Curso pendiente");
                      return (
                        <div key={idx} className="text-xs text-yellow-100/90 truncate">
                          {email} — {cursoLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                No hay inscripciones pendientes (Direct check: {pendientes.length})
             </div>
          )}

          {/* Panel de Estadísticas Principales */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-50">Cursos Activos</div>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-400">{stats.cursosActivos}</div>
              <div className="text-xs text-slate-400">de {stats.totalCursos} totales</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-50">Alumnos Activos</div>
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400">{stats.alumnosActivos}</div>
              <div className="text-xs text-slate-400">de {stats.totalAlumnos} totales</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-50">Ingresos del Mes</div>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-emerald-400">${stats.ingresosMes.toLocaleString()}</div>
              <div className="text-xs text-slate-400">ARS</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-50">Evaluaciones Activas</div>
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400">{stats.evaluacionesActivas}</div>
              <div className="text-xs text-slate-400">pendientes</div>
            </div>
          </div>

          {/* Panel de Actividades Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <AlertTriangle className="w-5 h-5 mr-2 inline text-yellow-400" />
                Inscripciones Pendientes
              </h2>
              
              <PendientesList pendientes={pendientes} />
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <Activity className="w-5 h-5 mr-2 inline text-blue-400" />
                Actividades Recientes
              </h2>
              
              <div className="space-y-3">
                {actividades.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <p className="text-sm">No hay actividades recientes</p>
                  </div>
                ) : (
                  actividades.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-50">{act.descripcion || "Actividad"}</div>
                        <div className="text-xs text-slate-400">{act.fecha || "Hace unos minutos"}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <Users className="w-5 h-5 mr-2 inline text-green-400" />
                Últimos Registros
              </h2>
              
              <div className="space-y-3">
                {recientes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <p className="text-sm">No hay registros recientes</p>
                  </div>
                ) : (
                  recientes.slice(0, 5).map((reg, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-50">{reg.email || reg.user_id || "Usuario"}</div>
                        <div className="text-xs text-slate-400">{reg.action || "Registro"}</div>
                      </div>
                      <div className="text-xs text-slate-400">{reg.fecha || "Ahora"}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Panel de Indicadores del Sistema */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <Database className="w-5 h-5 mr-2 inline text-blue-400" />
                Estado de la Base de Datos
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Conexión</div>
                  <div className="text-xs text-green-400">Activa</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Tablas</div>
                  <div className="text-xs text-slate-400">{stats.totalCursos + 10} en uso</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Registros</div>
                  <div className="text-xs text-slate-400">{stats.totalAlumnos * 5} activos</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Espacio Usado</div>
                  <div className="text-xs text-slate-400">2.3 GB / 10 GB</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <BookOpen className="w-5 h-5 mr-2 inline text-purple-400" />
                Contenido Educativo
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Materiales Cargados</div>
                  <div className="text-2xl font-bold text-purple-400">{stats.materialesCargados}</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Videos</div>
                  <div className="text-xs text-slate-400">45 cargados</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Documentos</div>
                  <div className="text-xs text-slate-400">120 cargados</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Exámenes</div>
                  <div className="text-xs text-slate-400">25 activos</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <DollarSign className="w-5 h-5 mr-2 inline text-emerald-400" />
                Indicadores Financieros
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Ingresos Mensuales</div>
                  <div className="text-2xl font-bold text-emerald-400">${stats.ingresosMes.toLocaleString()}</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Pagos Pendientes</div>
                  <div className="text-xs text-slate-400">$45,000</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Pagos Confirmados</div>
                  <div className="text-xs text-slate-400">$120,000</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Deuda Total</div>
                  <div className="text-xs text-slate-400">$15,000</div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
