"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { User, Activity, Users, Search, Trash2, ShieldAlert, AlertTriangle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

type UserRow = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  created_at: string;
  last_sign_in_at: string;
};

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.users)) {
        setUsuarios(json.users);
      } else {
        setError(json?.error || "Error al cargar la lista de usuarios.");
      }
    } catch (e: any) {
      setError(e.message || "Error de red al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const filteredUsuarios = usuarios.filter((u) => {
    const searchMatch =
      !searchTerm ||
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: string, email: string) => {
    const confirm1 = window.confirm(
      `ATENCIÓN: ¿Estás MUY seguro de que deseas eliminar permanentemente al usuario ${email}?\n\nEsto borrará su cuenta, inscripciones, compras y no se podrá deshacer.`
    );
    if (!confirm1) return;

    const confirm2 = window.prompt(
      `Para confirmar la eliminación definitiva, por favor escribe el email del usuario para confirmar:\n${email}`
    );
    if (confirm2 !== email) {
      alert("El correo no coincide. Eliminación cancelada.");
      return;
    }

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        alert("Usuario eliminado correctamente.");
      } else {
        alert(`Error al eliminar: ${json.error || "Desconocido"}`);
      }
    } catch (e: any) {
      alert("Error de red al intentar eliminar el usuario.");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">
              <Users className="w-5 h-5 mr-2 inline text-blue-400" />
              Gestión de Usuarios
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Administración global de cuentas de alumnos registradas en la plataforma
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-semibold">Zona Peligrosa</span>
            <span className="px-3">|</span>
            <User className="w-5 h-5" />
            {user?.email || "Administrador"}
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-red-200">
            <AlertTriangle className="inline w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o correo electrónico..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-transparent border border-white/10 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-slate-50">
              {filteredUsuarios.length} cuentas encontradas
            </div>
            <div className="text-xs text-slate-400">
              Página {currentPage} de {totalPages || 1}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="text-left border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Alumno</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Registro</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase text-right">Acciones Peligrosas</th>
                </tr>
              </thead>
              <tbody className="bg-transparent">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : paginatedUsuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>No se encontraron cuentas con los criterios actuales.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsuarios.map((u) => {
                    const fullName = [u.nombre, u.apellido].filter(Boolean).join(" ").trim();
                    const displayName = fullName || "Sin Nombre Especificado";
                    
                    return (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-slate-50">
                            {displayName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {u.id.substring(0,8)}...</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-blue-300">
                            {u.email}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-slate-300">
                            {new Date(u.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            Último acc: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Nunca'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleDelete(u.id, u.email)}
                            disabled={isDeleting === u.id}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-colors border border-red-600/30 text-xs font-medium disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            {isDeleting === u.id ? "Eliminando..." : "Eliminar Usuario"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredUsuarios.length > itemsPerPage && (
            <div className="flex items-center justify-end mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-100 text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <div className="text-sm text-slate-400 px-2">
                  Página {currentPage} de {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-100 text-xs disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
