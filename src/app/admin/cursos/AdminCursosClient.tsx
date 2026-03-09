"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { Database, Search, Plus, Trash2, Edit, ExternalLink, AlertTriangle, Users } from "lucide-react";
import Link from "next/link";

// Tipos de datos simplificados que coinciden con la nueva API
type Curso = {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  modalidad: string;
  categoria: string;
  nivel: string;
  precio: number;
  estado: string;
  imagen: string | null;
  alumnos_count: number; // Nuevo campo de la API
};

type Pendiente = {
  user_id: string;
  curso_id: string;
  created_at: string;
  user_email: string | null;
  nombre: string | null;
  apellido: string | null;
  curso_titulo: string | null;
};

export default function AdminCursosClient() {
  // Estados principales
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para UI y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);

  // --- Carga de Datos ---
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/cursos", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Error al cargar los datos del servidor.");
      }

      setCursos(json.cursos || []);
      setPendientes(json.pendientes || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- CRUD de Cursos ---
  const handleSave = async (formData: Omit<Curso, 'alumnos_count'>) => {
    const isEditing = !!formData.id;
    const method = isEditing ? "PUT" : "POST";
    
    try {
      const res = await fetch("/api/admin/cursos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error);

      await loadData(); // Recargar todo para reflejar el cambio
      setShowNew(false);
      setEditingCurso(null);
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este curso? Esta acción es irreversible y borrará los alumnos inscritos y material relacionado.")) return;
    
    try {
      const res = await fetch(`/api/admin/cursos?id=${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error);

      await loadData(); // Recargar
    } catch (e: any) {
      alert(`Error al eliminar: ${e.message}`);
    }
  };
  
  // --- Gestión de Pendientes ---
  const handlePendiente = async (user_id: string, curso_id: string, action: 'aprobar' | 'rechazar') => {
    try {
        const res = await fetch("/api/admin/inscripciones", {
            method: action === 'aprobar' ? 'POST' : 'DELETE',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id, curso_id }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error);
        await loadData(); // Recargar para actualizar la lista de pendientes y contadores
    } catch (e: any) {
        alert(`Error al ${action} la inscripción: ${e.message}`);
    }
  };

  // --- Renderizado ---

  const filteredCursos = useMemo(() => 
    cursos.filter(c => 
      c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
    [cursos, searchTerm]
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando gestión de cursos...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-400">Error: {error} <button onClick={loadData} className="text-blue-400">Reintentar</button></div>;
  }

  return (
    <div className="p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Gestión de Cursos
          </h1>
          <p className="mt-1 text-sm text-slate-400">Administración de cursos, categorías y matrículas.</p>
        </div>
        <button onClick={() => { setEditingCurso(null); setShowNew(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Curso
        </button>
      </header>

      {showNew && <CursoForm curso={editingCurso} onSave={handleSave} onCancel={() => { setShowNew(false); setEditingCurso(null); }} />}

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por título o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tabla de Cursos */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Curso</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Estado</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase text-center">Alumnos</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredCursos.map(curso => (
              <tr key={curso.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/detalle-curso?id=${curso.id}`} className="group">
                    <div className="font-medium text-slate-50 group-hover:text-blue-400">{curso.titulo}</div>
                    <div className="text-xs text-slate-400">{curso.categoria} / {curso.nivel}</div>
                  </Link>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${curso.estado === 'activo' ? 'bg-green-600' : 'bg-yellow-600'}`}>{curso.estado}</span></td>
                <td className="px-4 py-3 text-center font-medium">{curso.alumnos_count}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingCurso(curso); setShowNew(true); }} className="p-2 hover:bg-white/10 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(curso.id)} className="p-2 hover:bg-white/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    <Link href={`/admin/detalle-curso?id=${curso.id}`} className="p-2 hover:bg-white/10 rounded-lg"><ExternalLink className="w-4 h-4" /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCursos.length === 0 && <p className="text-center py-8 text-slate-400">No se encontraron cursos.</p>}
      </div>

      {/* Solicitudes Pendientes */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Solicitudes de Ingreso Pendientes
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
          {pendientes.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No hay solicitudes pendientes.</p>
          ) : (
            pendientes.map(p => (
              <div key={`${p.user_id}:${p.curso_id}`} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.nombre} {p.apellido}</p>
                  <p className="text-xs text-slate-400">{p.user_email}</p>
                  <p className="text-sm">quiere inscribirse a <span className="font-semibold">{p.curso_titulo}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePendiente(p.user_id, p.curso_id, 'aprobar')} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs">Aprobar</button>
                  <button onClick={() => handlePendiente(p.user_id, p.curso_id, 'rechazar')} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs">Rechazar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de Formulario para Crear/Editar Curso
function CursoForm({ curso, onSave, onCancel }: { curso: Curso | null; onSave: (data: any) => void; onCancel: () => void; }) {
  const [formData, setFormData] = useState({
    id: curso?.id || '',
    titulo: curso?.titulo || '',
    descripcion: curso?.descripcion || '',
    duracion: curso?.duracion || '',
    modalidad: curso?.modalidad || 'virtual',
    categoria: curso?.categoria || '',
    nivel: curso?.nivel || 'inicial',
    precio: curso?.precio || 0,
    estado: curso?.estado || 'en_desarrollo',
    imagen: curso?.imagen || null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-lg font-semibold mb-4">{curso ? 'Editar Curso' : 'Nuevo Curso'}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="titulo" value={formData.titulo} onChange={handleChange} placeholder="Título del curso" className="md:col-span-2 w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg" required />
        <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Descripción" className="md:col-span-2 w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg" />
        <input name="duracion" value={formData.duracion} onChange={handleChange} placeholder="Duración (ej: 3 meses)" className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg" />
        <input name="categoria" value={formData.categoria} onChange={handleChange} placeholder="Categoría" className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg" />
        <select name="modalidad" value={formData.modalidad} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg">
            <option value="virtual">Virtual</option>
            <option value="presencial">Presencial</option>
        </select>
        <select name="nivel" value={formData.nivel} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg">
            <option value="inicial">Inicial</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
        </select>
        <input name="precio" type="number" value={formData.precio} onChange={handleChange} placeholder="Precio" className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg" />
        <select name="estado" value={formData.estado} onChange={handleChange} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg">
            <option value="en_desarrollo">En Desarrollo</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
        </select>
        <div className="md:col-span-2 flex items-center gap-2">
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Guardar</button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 text-sm">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
