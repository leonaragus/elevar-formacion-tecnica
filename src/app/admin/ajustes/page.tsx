import { createSupabaseServerClient } from "@/lib/supabase/server";
import { User, Cog, Shield, Settings, LogOut, Database, Users, BookOpen, DollarSign, AlertTriangle } from "lucide-react";

type AdminStats = {
  totalCursos: number;
  totalAlumnos: number;
  totalProfesores: number;
  totalPagos: number;
  cursosActivos: number;
  alumnosActivos: number;
  ingresosMes: number;
};

type SistemaRow = Record<string, unknown>;

function getSistemaValue(sistema: SistemaRow, key: string, fallback: string) {
  const v = sistema[key] ?? sistema[`${key}_value`] ?? sistema[key.toLowerCase()] ?? fallback;
  return typeof v === "string" && v.trim() ? v : fallback;
}

export default async function AjustesAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const token = process.env.ADMIN_TOKEN || "";
  const res = await fetch(`/api/admin/ajustes`, {
    headers: { "X-Admin-Token": token },
    cache: "no-store",
  }).catch(() => null as any);
  const json = await res?.json().catch(() => null as any);

  const sistema: SistemaRow[] = Array.isArray(json?.sistema) ? json.sistema : [];
  const stats: AdminStats = json?.stats || {
    totalCursos: 0,
    totalAlumnos: 0,
    totalProfesores: 0,
    totalPagos: 0,
    cursosActivos: 0,
    alumnosActivos: 0,
    ingresosMes: 0,
  };

  const sistemaMap = new Map<string, SistemaRow>();
  for (const s of sistema) {
    const key = String((s as any)?.clave ?? (s as any)?.key ?? "");
    if (key) sistemaMap.set(key, s);
  }

  const getSetting = (key: string, fallback: string) => {
    const s = sistemaMap.get(key) || {};
    return getSistemaValue(s, key, fallback);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
          <div className="text-sm font-semibold text-slate-50">Panel de administración</div>
          <div className="mt-1 text-xs text-slate-400">Configuración del sistema</div>
          <nav className="mt-4 grid gap-1">
            <a href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <BookOpen className="w-4 h-4 mr-2" />
              Dashboard
            </a>
            <a href="/admin/ajustes" className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-50">
              <Settings className="w-4 h-4 mr-2" />
              Ajustes
            </a>
            <a href="/admin/pagos" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
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
                <Settings className="w-5 h-5 mr-2 inline" />
                Ajustes del Sistema
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Configuración general y parametrización de la plataforma
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <User className="w-5 h-5" />
              {user?.email || "Administrador"}
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel de Información del Sistema */}
            <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <Shield className="w-5 h-5 mr-2 inline text-blue-400" />
                Información del Sistema
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-50">Versión de la Plataforma</div>
                    <div className="text-xs text-slate-400">v1.0.0</div>
                  </div>
                  <div className="text-xs text-slate-400">Instituto de Formación Técnica</div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-50">Base de Datos</div>
                    <div className="text-xs text-green-400">Conectada</div>
                  </div>
                  <div className="text-xs text-slate-400">Supabase - Online</div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-50">Servidor Web</div>
                    <div className="text-xs text-green-400">Activo</div>
                  </div>
                  <div className="text-xs text-slate-400">Next.js - Producción</div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-50">Estado del Sistema</div>
                    <div className="text-xs text-green-400">Operativo</div>
                  </div>
                  <div className="text-xs text-slate-400">Sin incidencias reportadas</div>
                </div>
              </div>
            </section>

            {/* Panel de Estadísticas Rápidas */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                <Cog className="w-5 h-5 mr-2 inline text-blue-400" />
                Estadísticas
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Total Cursos</div>
                  <div className="text-2xl font-bold text-blue-400">{stats.totalCursos}</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Alumnos Activos</div>
                  <div className="text-2xl font-bold text-green-400">{stats.alumnosActivos}</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Ingresos Mes</div>
                  <div className="text-2xl font-bold text-emerald-400">${stats.ingresosMes.toLocaleString()}</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-medium text-slate-50">Total Pagos</div>
                  <div className="text-2xl font-bold text-purple-400">{stats.totalPagos}</div>
                </div>
              </div>
            </section>
          </div>

          {/* Panel de Configuración General */}
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-6">
              <Settings className="w-5 h-5 mr-2 inline text-blue-400" />
              Configuración General
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Configuración de Email */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-semibold text-slate-50 mb-3">Configuración de Email</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Servidor SMTP</span>
                    <input
                      type="text"
                      value={getSetting("smtp_server", "smtp.gmail.com")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-32 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Puerto</span>
                    <input
                      type="text"
                      value={getSetting("smtp_port", "587")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-16 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Email Remitente</span>
                    <input
                      type="text"
                      value={getSetting("email_from", "admin@instituto.com")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-48 px-2 py-1 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración de Pagos */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-semibold text-slate-50 mb-3">Configuración de Pagos</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Moneda</span>
                    <input
                      type="text"
                      value={getSetting("moneda", "ARS")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-16 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Monto Mensual</span>
                    <input
                      type="text"
                      value={`$${getSetting("monto_mensual", "5000")}`}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-24 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Día Límite</span>
                    <input
                      type="text"
                      value={getSetting("dia_limite", "13")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-16 px-2 py-1 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración de Sistema */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-semibold text-slate-50 mb-3">Configuración de Sistema</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Nombre Institución</span>
                    <input
                      type="text"
                      value={getSetting("nombre_institucion", "Instituto de Formación Técnica")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-48 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Dirección</span>
                    <input
                      type="text"
                      value={getSetting("direccion", "Calle Falsa 123, CABA")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-48 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Teléfono</span>
                    <input
                      type="text"
                      value={getSetting("telefono", "011-4555-6789")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-32 px-2 py-1 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración de Seguridad */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-semibold text-slate-50 mb-3">Configuración de Seguridad</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">JWT Secret</span>
                    <input
                      type="text"
                      value={getSetting("jwt_secret", "[REDACTED]")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-48 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Max Intentos</span>
                    <input
                      type="text"
                      value={getSetting("max_intentos", "5")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-16 px-2 py-1 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Bloquear IP</span>
                    <input
                      type="text"
                      value={getSetting("bloquear_ip", "true")}
                      readOnly
                      className="bg-transparent text-xs text-slate-100 w-16 px-2 py-1 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Panel de Acciones del Sistema */}
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-6">
              <AlertTriangle className="w-5 h-5 mr-2 inline text-yellow-400" />
              Acciones del Sistema
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  if (confirm("¿Está seguro que desea resetear el esquema de la base de datos? Esta acción no se puede deshacer.")) {
                    const res = await fetch("/api/admin/reset-schema", {
                      method: "POST",
                      headers: { "X-Admin-Token": token },
                    });
                    const json = await res.json();
                    if (json.ok) {
                      alert("Esquema reseteado exitosamente");
                    } else {
                      alert("Error: " + (json.error || "Error desconocido"));
                    }
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Database className="w-5 h-5" />
                Resetear Esquema
              </button>

              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/backup", {
                    method: "POST",
                    headers: { "X-Admin-Token": token },
                  });
                  const json = await res.json();
                  if (json.ok) {
                    alert("Backup generado exitosamente");
                  } else {
                    alert("Error: " + (json.error || "Error desconocido"));
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Database className="w-5 h-5" />
                Generar Backup
              </button>

              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/clear-cache", {
                    method: "POST",
                    headers: { "X-Admin-Token": token },
                  });
                  const json = await res.json();
                  if (json.ok) {
                    alert("Caché limpiado exitosamente");
                  } else {
                    alert("Error: " + (json.error || "Error desconocido"));
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Database className="w-5 h-5" />
                Limpiar Caché
              </button>

              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/logs", {
                    method: "POST",
                    headers: { "X-Admin-Token": token },
                  });
                  const json = await res.json();
                  if (json.ok) {
                    alert("Logs descargados exitosamente");
                  } else {
                    alert("Error: " + (json.error || "Error desconocido"));
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Database className="w-5 h-5" />
                Descargar Logs
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}