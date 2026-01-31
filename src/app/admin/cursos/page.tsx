"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { User, Activity, Users, BookOpen, DollarSign, AlertTriangle, Database, Settings, LogOut, Search, Filter, Download, Trash2, Plus, Edit, Eye, CheckCircle, Clock, XCircle } from "lucide-react";

type CursoRow = {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  modalidad: "presencial" | "virtual" | "semipresencial" | "a distancia";
  categoria: string;
  nivel: "inicial" | "intermedio" | "avanzado" | "especializacion";
  precio: number;
  estado: "activo" | "inactivo" | "en_desarrollo" | "suspendido";
  created_at: string;
  updated_at: string;
};

type AlumnoRow = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  telefono: string;
  curso_id?: string;
  created_at: string;
};

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: userData } } = await supabase.auth.getUser();
        setUser(userData);

        const token = process.env.ADMIN_TOKEN || "";
        const res = await fetch(`/api/admin/cursos`, {
          headers: { "X-Admin-Token": token },
          cache: "no-store",
        }).catch(() => null as any);
        const json = await res?.json().catch(() => null as any);

        setCursos(Array.isArray(json?.cursos) ? json.cursos : []);
        setAlumnos(Array.isArray(json?.alumnos) ? json.alumnos : []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterNivel, setFilterNivel] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const filteredCursos = cursos.filter(curso => {
    const searchMatch = !searchTerm || 
      curso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curso.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curso.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const estadoMatch = !filterEstado || curso.estado === filterEstado;
    const categoriaMatch = !filterCategoria || curso.categoria === filterCategoria;
    const nivelMatch = !filterNivel || curso.nivel === filterNivel;
    
    return searchMatch && estadoMatch && categoriaMatch && nivelMatch;
  });

  const totalPages = Math.ceil(filteredCursos.length / itemsPerPage);
  const paginatedCursos = filteredCursos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categorias = Array.from(new Set(cursos.map(c => c.categoria)));
  const niveles = Array.from(new Set(cursos.map(c => c.nivel)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
          <div className="text-sm font-semibold text-slate-50">Panel de administración</div>
          <div className="mt-1 text-xs text-slate-400">Gestión de cursos</div>
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
            <a href="/admin/legajos" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">
              <Users className="w-4 h-4 mr-2" />
              Legajos
            </a>
            <a href="/admin/cursos" className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-50">
              <Database className="w-4 h-4 mr-2" />
              Cursos
            </a>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-50">
                <Database className="w-5 h-5 mr-2 inline text-blue-400" />
                Gestión de Cursos
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Administración completa de cursos, categorías y matrículas
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <User className="w-5 h-5" />
              {user?.email || "Administrador"}
            </div>
          </header>

          {/* Panel de Búsqueda y Filtros */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por título, descripción o categoría..."
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
                  <option value="en_desarrollo">En desarrollo</option>
                  <option value="suspendido">Suspendidos</option>
                </select>
              </div>

              <div>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterNivel}
                  onChange={(e) => setFilterNivel(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos los niveles</option>
                  {niveles.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Panel de Acciones */}
          <div className="flex items-center justify-between mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-sm font-medium text-slate-50">
              {filteredCursos.length} cursos encontrados
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Lógica para crear nuevo curso
                  console.log("Crear nuevo curso...");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Nuevo Curso
              </button>
              <button
                onClick={() => {
                  // Lógica para exportar
                  console.log("Exportando cursos...");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <table className="w-full">
              <thead className="text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Curso</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Duración</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Modalidad</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Precio</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Alumnos</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white/5">
                {paginatedCursos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No se encontraron cursos con los criterios actuales</p>
                    </td>
                  </tr>
                ) : (
                  paginatedCursos.map((curso) => (
                    <tr key={curso.id} className="hover:bg-white/10">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-50">{curso.titulo}</div>
                        <div className="text-xs text-slate-400">ID: {curso.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-400 line-clamp-2">{curso.descripcion || "Sin descripción"}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-slate-50">{curso.duracion}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-slate-50 capitalize">{curso.modalidad}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-medium text-emerald-400">${curso.precio.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          curso.estado === "activo" ? "bg-green-600 text-green-100" :
                          curso.estado === "inactivo" ? "bg-red-600 text-red-100" :
                          curso.estado === "en_desarrollo" ? "bg-yellow-600 text-yellow-100" :
                          "bg-gray-600 text-gray-100"
                        }`}>
                          {curso.estado.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-slate-50 font-medium">
                          {alumnos.filter(al => al.curso_id === curso.id).length}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              // Lógica para ver detalles
                              console.log("Ver detalles de:", curso.id);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm">
                              <Eye className="w-4 h-4" />
                            </button>
                          <button
                            onClick={() => {
                              // Lógica para editar
                              console.log("Editar:", curso.id);
                            }}
                            className="text-green-400 hover:text-green-300 text-sm">
                              <Edit className="w-4 h-4" />
                            </button>
                          <button
                            onClick={() => {
                              if (confirm("¿Está seguro que desea cambiar el estado de este curso?")) {
                                // Lógica para cambiar estado
                                console.log("Cambiar estado:", curso.id);
                              }
                            }}
                            className="text-yellow-400 hover:text-yellow-300 text-sm">
                              <Clock className="w-4 h-4" />
                            </button>
                          <button
                            onClick={() => {
                              if (confirm("¿Está seguro que desea eliminar este curso?")) {
                                // Lógica para eliminar
                                console.log("Eliminar:", curso.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-sm">
                              <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Paginación */}
            {filteredCursos.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-slate-400">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCursos.length)} de {filteredCursos.length} cursos
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