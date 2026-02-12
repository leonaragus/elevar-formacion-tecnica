import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PendientesList } from "./PendientesList";
import { User, Activity, TrendingUp, Users, BookOpen, DollarSign, AlertTriangle, Database } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cookies } from "next/headers";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    supabaseAdmin = null;
  }
  
  const client = supabaseAdmin || supabase;
  
  let pendientes: any[] = [];
  let dbError: string | null = null;
  let stats = {
      totalCursos: 0,
      totalAlumnos: 0,
      totalProfesores: 1,
      totalPagos: 0,
      cursosActivos: 0,
      alumnosActivos: 0,
      ingresosMes: 0,
      evaluacionesActivas: 0,
      materialesCargados: 0
  };

  // Fetch directly from DB instead of API to avoid network/URL issues
  try {
    // Stats reales
    const { count: countCursos } = await client.from("cursos").select("*", { count: 'exact', head: true });
    const { count: countCursosActivos } = await client.from("cursos").select("*", { count: 'exact', head: true }).eq("estado", "activo");
    const { count: countInscripciones } = await client.from("cursos_alumnos").select("*", { count: 'exact', head: true });
    const { count: countInscripcionesActivas } = await client.from("cursos_alumnos").select("*", { count: 'exact', head: true }).eq("estado", "activo");
    
    stats.totalCursos = countCursos || 0;
    stats.cursosActivos = countCursosActivos || 0;
    stats.totalAlumnos = countInscripciones || 0;
    stats.alumnosActivos = countInscripcionesActivas || 0;

    const { data, error } = await client
        .from("cursos_alumnos")
        .select("user_id, curso_id, estado, created_at")
        .eq("estado", "pendiente")
        .limit(100);
      
    let combined: any[] = [];
    if (!error && data) {
      combined = [...(data as any[])];
    }

    // También traer de intereses (solicitudes por email)
    const { data: intereses, error: errorIntereses } = await client
      .from("intereses")
      .select("email, course_id, curso_id, created_at")
      .limit(100);

    if (Array.isArray(intereses) && intereses.length > 0 && !errorIntereses) {
      const mapped = intereses.map((i: any) => ({
        user_id: i.email,
        curso_id: i.course_id || i.curso_id,
        curso_titulo: null,
        user_email: i.email,
        estado: "pendiente",
        source: "intereses",
        created_at: i.created_at
      }));
      combined = [...combined, ...mapped];
    }

    const unique = combined.filter(
      (v, i, a) => a.findIndex((t) => t.user_id === v.user_id && t.curso_id === v.curso_id) === i
    );

    // Enrich with user details
    const userIds = unique.filter(item => !item.user_id.includes('@')).map(item => item.user_id);
    const courseIds = unique.map(item => item.curso_id);
    
    let userInfo: any = {};
    let courseInfo: any = {};
    
    if (userIds.length > 0) {
      try {
        const { data: users } = await client
          .from('users')
          .select('id, email, user_metadata->nombre, user_metadata->apellido')
          .in('id', userIds)
          .limit(100);
        
        if (users) {
          users.forEach((user: any) => {
            userInfo[user.id] = { email: user.email, nombre: user?.user_metadata?.nombre || "", apellido: user?.user_metadata?.apellido || "" };
          });
        }
      } catch {}
    }
    
    if (courseIds.length > 0) {
      try {
        const { data: courses } = await client
          .from('cursos')
          .select('id, titulo')
          .in('id', courseIds)
          .limit(100);
        
        if (courses) {
          courses.forEach((course: any) => {
            courseInfo[course.id] = { titulo: course.titulo };
          });
        }
      } catch {}
    }

    // Enriquecer
    const enriched = unique.map(item => {
       const isEmailId = item.user_id.includes("@");
       const email = item.user_email || (isEmailId ? item.user_id : userInfo[item.user_id]?.email) || item.user_id;
       
       let nombre = isEmailId ? "" : (userInfo[item.user_id]?.nombre || "");
       let apellido = isEmailId ? "" : (userInfo[item.user_id]?.apellido || "");
       
       return {
         ...item,
         email,
         nombre,
         apellido,
         curso_titulo: courseInfo[item.curso_id]?.titulo || item.curso_id
       };
    });

    pendientes = enriched;
    dbError = null;

  } catch (e: any) {
    dbError = e?.message || "Error desconocido";
    pendientes = [];
  }

  const actividades = [
      { descripcion: "Sistema iniciado", fecha: new Date().toLocaleTimeString() }
  ];
  const recientes: any[] = [];

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
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

          {dbError && (
            <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-red-200">
                    Error de conexión a la base de datos
                  </div>
                  <div className="mt-0.5 text-xs text-red-100/80">
                    {dbError}
                  </div>
                </div>
              </div>
            </div>
          )}

          {pendientes.length > 0 ? (
            <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-yellow-200">
                    Hay {pendientes.length} inscripción{pendientes.length === 1 ? "" : "es"} pendiente{pendientes.length === 1 ? "" : "s"} de aprobación
                  </div>
                  <div className="mt-2 grid gap-1">
                    {[...pendientes].sort((a, b) => {
                      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
                      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
                      return tb - ta;
                    }).slice(0, 3).map((p, idx) => {
                      const labelName = [p?.nombre, p?.apellido].filter(Boolean).join(" ").trim();
                      const labelEmail = String(p?.email ?? p?.user_email ?? p?.user_id ?? "Usuario");
                      const label = labelName || labelEmail;
                      const cursoLabel = String(p?.curso_titulo ?? p?.curso_id ?? "Curso");
                      return (
                        <div key={idx} className="text-xs text-yellow-100/90 truncate">
                          {label} — {cursoLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                No hay inscripciones pendientes
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
              <PendientesList pendientes={[...pendientes].sort((a, b) => {
                const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
                return tb - ta;
              })} />
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <Activity className="w-5 h-5 mr-2 inline text-blue-400" />
                Actividades Recientes
              </h2>
              <div className="space-y-3">
                {actividades.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-50">{act.descripcion || "Actividad"}</div>
                        <div className="text-xs text-slate-400">{act.fecha || "Hace unos minutos"}</div>
                      </div>
                    </div>
                ))}
              </div>
            </section>
          </div>

          {/* Panel de Indicadores del Sistema */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Estado BD
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-sm text-slate-400">Conexión</span>
                  <span className="text-xs text-green-400 font-bold">ACTIVA</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-sm text-slate-400">Cursos</span>
                  <span className="text-sm text-slate-200">{stats.totalCursos}</span>
                </div>
              </div>
            </section>
            
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Contenido
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-sm text-slate-400">Materiales</span>
                  <span className="text-sm text-slate-200">{stats.materialesCargados}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Finanzas
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-sm text-slate-400">Ingresos</span>
                  <span className="text-sm text-emerald-400 font-bold">${stats.ingresosMes}</span>
                </div>
              </div>
            </section>
          </div>
      </div>
    </AdminLayout>
  );
}
