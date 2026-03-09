import { AdminLayout } from "@/components/admin/AdminLayout";
import { PendientesList } from "./PendientesList";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Activity, AlertTriangle, BookOpen, TrendingUp, User as IconUser, Users } from "lucide-react";
import { Pendiente, Profile } from "@/lib/types"; // Importa los tipos centralizados
import { type User as AuthUser } from "@supabase/supabase-js";

// Define el tipo de retorno para la función de obtención de datos
interface DashboardData {
  user: AuthUser | null;
  pendientes: Pendiente[];
  stats: {
    totalCursos: number;
    cursosActivos: number;
    totalAlumnos: number;
    alumnosPendientes: number;
  };
  error: string | null;
}

// Tipo para la forma de los datos de cursos que necesitamos aquí
interface CursoInfo {
  id: string;
  estado: string;
}

// Función para obtener los datos del dashboard de forma segura y tipada
async function getAdminDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Las promesas ahora están correctamente tipadas
    const pendientesPromise = supabase
      .from("cursos_alumnos")
      .select(`
        curso_id,
        user_id,
        estado,
        created_at,
        alumno:usuarios!inner ( id, nombre, apellido, email ),
        curso:cursos!inner ( id, titulo )
      `)
      .eq("estado", "pendiente")
      .returns<Pendiente[]>();

    const cursosPromise = supabase.from("cursos").select("id, estado").returns<CursoInfo[]>();
    const totalAlumnosPromise = supabase.from("cursos_alumnos").select('id', { count: 'exact', head: true }).eq("estado", "aprobado");

    const [pendientesRes, cursosRes, totalAlumnosRes] = await Promise.all([
        pendientesPromise,
        cursosPromise,
        totalAlumnosPromise
    ]);

    // Manejo de errores específico para cada promesa
    if (pendientesRes.error) throw new Error(`Error al cargar pendientes: ${pendientesRes.error.message}`);
    if (cursosRes.error) throw new Error(`Error al cargar cursos: ${cursosRes.error.message}`);
    if (totalAlumnosRes.error) throw new Error(`Error al contar alumnos: ${totalAlumnosRes.error.message}`);

    const pendientes = pendientesRes.data || [];
    const cursos = cursosRes.data || [];
    const totalAlumnos = totalAlumnosRes.count ?? 0;

    // Las estadísticas ahora usan datos validados y tipados
    const stats = {
      totalCursos: cursos.length,
      cursosActivos: cursos.filter(c => c.estado === 'activo').length,
      totalAlumnos: totalAlumnos,
      alumnosPendientes: pendientes.length,
    };

    return { user, pendientes, stats, error: null };

  } catch (error: any) {
    console.error("Error al cargar datos del dashboard:", error);
    const emptyStats = { totalCursos: 0, cursosActivos: 0, totalAlumnos: 0, alumnosPendientes: 0 };
    return {
      user: null,
      pendientes: [],
      stats: emptyStats,
      error: error.message || "Error desconocido al cargar los datos.",
    };
  }
}

// Componente de tarjeta de estadística
function StatCard({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
      <div className="flex items-center gap-3">
        <div className="bg-slate-700/80 p-2 rounded-lg">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-xl font-semibold text-slate-50">{value}</p>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal de la Página ---
export default async function AdminDashboardPage() {
  const { user, pendientes, stats, error } = await getAdminDashboardData();

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-50 flex items-center">
              <Activity className="w-6 h-6 mr-3 text-blue-400" />
              Dashboard Administrativo
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Resumen general del estado de la plataforma.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-full px-4 py-2">
            <IconUser className="w-5 h-5" />
            <span>{user?.email || "Administrador"}</span>
          </div>
        </header>

        {/* Manejo de Errores de Carga */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-red-200">Error al Cargar Datos</div>
                <div className="mt-0.5 text-xs text-red-100/80">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Grid de Estadísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon={BookOpen} title="Cursos Totales" value={stats.totalCursos} />
          <StatCard icon={TrendingUp} title="Cursos Activos" value={stats.cursosActivos} />
          <StatCard icon={Users} title="Alumnos Aprobados" value={stats.totalAlumnos} />
          <StatCard icon={IconUser} title="Pendientes de Aprobación" value={stats.alumnosPendientes} />
        </div>

        {/* Lista de Pendientes (ahora recibe datos tipados) */}
        <PendientesList initialPendientes={pendientes} />

      </div>
    </AdminLayout>
  );
}
