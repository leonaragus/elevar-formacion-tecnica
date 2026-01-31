import { createSupabaseServerClient } from "@/lib/supabase/server";
import { User, Activity, Users, BookOpen, DollarSign, AlertTriangle, Database, Settings, LogOut, Search, Filter, Download, Trash2 } from "lucide-react";

type LegajoRow = {
  id: string;
  alumno_id: string;
  curso_id: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  fecha_inscripcion: string;
  estado: "activo" | "inactivo" | "graduado" | "suspendido";
  created_at: string;
  updated_at: string;
};

type CursoRow = {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  created_at: string;
};

export default async function AdminLegajosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const token = process.env.ADMIN_TOKEN || "";
  const res = await fetch(`/api/admin/legajos`, {
    headers: { "X-Admin-Token": token },
    cache: "no-store",
  }).catch(() => null as any);
  const json = await res?.json().catch(() => null as any);

  const legajos: LegajoRow[] = Array.isArray(json?.legajos) ? json.legajos : [];
  const cursos: CursoRow[] = Array.isArray(json?.cursos) ? json.cursos : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const filteredLegajos = legajos.filter(legajo => {
    const searchMatch = !searchTerm || 
      legajo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      legajo.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      legajo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      legajo.documento.includes(searchTerm);
    
    const estadoMatch = !filterEstado || legajo.estado === filterEstado;
    
    return searchMatch && estadoMatch;
  });

  const totalPages = Math.ceil(filteredLegajos.length / itemsPerPage);
  const paginatedLegajos = filteredLegajos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const cursoById = new Map();
  for (const curso of cursos) {
    cursoById.set(curso.id, curso);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
          <div className="text-sm font-semibold text-slate-50">Panel de administración</div>
          <div className="mt-1 text-xs text-slate-400">Gestión de legajos</div>
          <nav className="mt-4 grid gap-1">
            <a href="/admin/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
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
            <a href="/admin/legajos" className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-50">
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
                <Users className="w-5 h-5 mr-2 inline text-blue-400" />
                Gestión de Legajos
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Administración de registros de alumnos y su información académica
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <User className="w-5 h-5" />
              {user?.email || "Administrador"}
            </div>
          </header>

          {/* Panel de Búsqueda y Filtros */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apellido, email o documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                  <option value="graduado">Graduados</option>
                  <option value="suspendido">Suspendidos</option>
                </select>
              </div>

              <div>
                <button
                  onClick={() => {
                    // Lógica para exportar datos
                    console.log("Exportando legajos...");
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-slate-50">
                {filteredLegajos.length} registros encontrados
              </div>
              <div className="text-xs text-slate-400">
                Página {currentPage} de {totalPages}
              </div>
            </div>

            <table className="w-full">
              <thead className="text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Alumno</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Curso</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Documento</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white/5">
                {paginatedLegajos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No se encontraron legajos con los criterios actuales</p>
                    </td>
                  </tr>
                ) : (
                  paginatedLegajos.map((legajo) => (
                    <tr key={legajo.id} className="hover:bg-white/10">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-50">{legajo.apellido}, {legajo.nombre}</div>
                        <div className="text-xs text-slate-400">{legajo.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-50">
                          {(cursoById.get(legajo.curso_id) as any)?.titulo || "N/A"}
                        </div>
                        <div className="text-xs text-slate-400">
                          Inscripto: {new Date(legajo.fecha_inscripcion).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-50">{legajo.documento}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          legajo.estado === "activo" ? "bg-green-600 text-green-100" :
                          legajo.estado === "inactivo" ? "bg-red-600 text-red-100" :
                          legajo.estado === "graduado" ? "bg-blue-600 text-blue-100" :
                          "bg-yellow-600 text-yellow-100"
                        }`}>
                          {legajo.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Lógica para ver detalles
                              console.log("Ver detalles de:", legajo.id);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm">
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Lógica para editar
                              console.log("Editar:", legajo.id);
                            }}
                            className="text-green-400 hover:text-green-300 text-sm">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("¿Está seguro que desea eliminar este legajo?")) {
                                // Lógica para eliminar
                                console.log("Eliminar:", legajo.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Paginación */}
            {filteredLegajos.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-slate-400">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLegajos.length)} de {filteredLegajos.length} registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-slate-100 text-xs disabled:opacity-50">
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`px-3 py-1 rounded text-xs ${
                          currentPage === idx + 1
                            ? "bg-blue-600 text-white"
                            : "bg-white/10 text-slate-100 hover:bg-white/20"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-slate-100 text-xs disabled:opacity-50">
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}