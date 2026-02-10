// Componente para gestionar fechas de entrega desde el panel de administrador
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface Curso {
  id: string;
  nombre: string;
  descripcion: string;
}

interface FechaEntrega {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion: string;
  fecha_entrega: string;
  tipo_entrega: string;
  activo: boolean;
  created_at: string;
}

const TIPOS_ENTREGA = [
  { value: 'trabajo_practico', label: 'Trabajo Práctico' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'examen', label: 'Examen' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'otro', label: 'Otro' }
];

export default function AdminCalendarioClient() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [entregas, setEntregas] = useState<FechaEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<FechaEntrega | null>(null);
  
  const [formData, setFormData] = useState({
    curso_id: '',
    titulo: '',
    descripcion: '',
    fecha_entrega: '',
    tipo_entrega: 'tarea'
  });

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar cursos
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('id, nombre, descripcion')
        .order('nombre');

      if (cursosError) throw cursosError;
      setCursos(cursosData || []);

      // Cargar fechas de entrega
      const { data: entregasData, error: entregasError } = await supabase
        .from('calendario_entregas')
        .select(`
          *,
          cursos:nombre(nombre)
        `)
        .order('fecha_entrega', { ascending: true });

      if (entregasError) throw entregasError;
      setEntregas(entregasData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const entregaData = {
        ...formData,
        fecha_entrega: new Date(formData.fecha_entrega).toISOString()
      };

      if (editingEntrega) {
        // Actualizar entrega existente
        const { error } = await supabase
          .from('calendario_entregas')
          .update(entregaData)
          .eq('id', editingEntrega.id);

        if (error) throw error;
        alert('Fecha de entrega actualizada exitosamente');
      } else {
        // Crear nueva entrega
        const { error } = await supabase
          .from('calendario_entregas')
          .insert([entregaData]);

        if (error) throw error;
        alert('Fecha de entrega creada exitosamente');
      }

      // Limpiar formulario
      setFormData({
        curso_id: '',
        titulo: '',
        descripcion: '',
        fecha_entrega: '',
        tipo_entrega: 'tarea'
      });
      setShowForm(false);
      setEditingEntrega(null);
      
      // Recargar datos
      cargarDatos();
    } catch (error) {
      console.error('Error guardando fecha:', error);
      alert('Error al guardar la fecha de entrega');
    }
  };

  const handleEdit = (entrega: FechaEntrega) => {
    setEditingEntrega(entrega);
    setFormData({
      curso_id: entrega.curso_id,
      titulo: entrega.titulo,
      descripcion: entrega.descripcion || '',
      fecha_entrega: format(new Date(entrega.fecha_entrega), "yyyy-MM-dd'T'HH:mm"),
      tipo_entrega: entrega.tipo_entrega
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta fecha de entrega?')) return;

    try {
      const { error } = await supabase
        .from('calendario_entregas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Fecha de entrega eliminada exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando fecha:', error);
      alert('Error al eliminar la fecha de entrega');
    }
  };

  const toggleActivo = async (id: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('calendario_entregas')
        .update({ activo: !activo })
        .eq('id', id);

      if (error) throw error;
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Calendario de Entregas</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nueva Fecha de Entrega
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingEntrega ? 'Editar' : 'Nueva'} Fecha de Entrega
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curso
                </label>
                <select
                  value={formData.curso_id}
                  onChange={(e) => setFormData({ ...formData, curso_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccione un curso</option>
                  {cursos.map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha y Hora de Entrega
                </label>
                <input
                  type="datetime-local"
                  value={formData.fecha_entrega}
                  onChange={(e) => setFormData({ ...formData, fecha_entrega: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Entrega
                </label>
                <select
                  value={formData.tipo_entrega}
                  onChange={(e) => setFormData({ ...formData, tipo_entrega: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIPOS_ENTREGA.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingEntrega ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEntrega(null);
                    setFormData({
                      curso_id: '',
                      titulo: '',
                      descripcion: '',
                      fecha_entrega: '',
                      tipo_entrega: 'tarea'
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {entregas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay fechas de entrega registradas
          </div>
        ) : (
          entregas.map((entrega) => (
            <div key={entrega.id} className="bg-white rounded-lg shadow-md p-4 border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{entrega.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-2">{entrega.descripcion}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      📅 {format(new Date(entrega.fecha_entrega), 'PPP', { locale: es })}
                    </span>
                    <span className="flex items-center">
                      🕐 {format(new Date(entrega.fecha_entrega), 'p', { locale: es })}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {TIPOS_ENTREGA.find(t => t.value === entrega.tipo_entrega)?.label}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleActivo(entrega.id, entrega.activo)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entrega.activo 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {entrega.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(entrega)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={() => handleDelete(entrega.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}