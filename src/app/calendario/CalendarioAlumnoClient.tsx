// Componente de calendario para alumnos
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface FechaEntrega {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion: string;
  fecha_entrega: string;
  tipo_entrega: string;
  activo: boolean;
  cursos: {
    nombre: string;
  };
  entrega_alumno?: {
    estado: string;
    fecha_entrega: string | null;
    nota: number | null;
  };
}

const TIPOS_ENTREGA_COLORES = {
  trabajo_practico: 'bg-blue-100 border-blue-300 text-blue-800',
  proyecto: 'bg-green-100 border-green-300 text-green-800',
  examen: 'bg-red-100 border-red-300 text-red-800',
  tarea: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  otro: 'bg-purple-100 border-purple-300 text-purple-800'
};

const TIPOS_ENTREGA_ICONOS = {
  trabajo_practico: '📝',
  proyecto: '🚀',
  examen: '📊',
  tarea: '📋',
  otro: '📌'
};

const ESTADOS_COLORES = {
  pendiente: 'bg-gray-100 text-gray-800',
  entregado: 'bg-green-100 text-green-800',
  atrasado: 'bg-red-100 text-red-800',
  calificado: 'bg-blue-100 text-blue-800'
};

export default function CalendarioAlumnoClient() {
  const [entregas, setEntregas] = useState<FechaEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista');
  const [mesActual, setMesActual] = useState(new Date());

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    cargarEntregas();
  }, []);

  const cargarEntregas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      // Si no hay usuario, buscar curso en cookies
      let userCourseIds: string[] = [];
      
      if (user) {
        const { data: inscripciones } = await supabase
          .from('cursos_alumnos')
          .select('curso_id')
          .eq('user_id', user.id)
          .eq('estado', 'activo');
        if (inscripciones) {
          userCourseIds = inscripciones.map(i => String(i.curso_id));
        }
      } else {
        // Fallback a cookies si no hay sesión Auth activa
        const cookies = document.cookie.split('; ');
        const studentOk = cookies.find(c => c.trim().startsWith('student_ok='))?.split('=')[1] === '1';
        const studentCourseId = cookies.find(c => c.trim().startsWith('student_course_id='))?.split('=')[1];
        if (studentOk && studentCourseId) {
          userCourseIds = [String(studentCourseId)];
        }
      }

      if (userCourseIds.length === 0) {
        setEntregas([]);
        return;
      }

      const { data: entregasData, error } = await supabase
        .from('calendario_entregas')
        .select(`
          *,
          cursos!inner(titulo),
          entrega_alumno:entregas_alumnos!left(
            estado,
            fecha_entrega,
            nota
          )
        `)
        .eq('activo', true)
        .in('curso_id', userCourseIds)
        .order('fecha_entrega', { ascending: true });

      if (error) throw error;
      
      // Mapear 'titulo' a 'nombre' para mantener compatibilidad con la interfaz FechaEntrega si es necesario
      const mappedData = (entregasData || []).map((e: any) => ({
        ...e,
        cursos: { nombre: e.cursos?.titulo || 'Curso' }
      }));

      setEntregas(mappedData);
    } catch (error) {
      console.error('Error cargando entregas:', error);
      alert('Error al cargar las entregas');
    } finally {
      setLoading(false);
    }
  };

  const filtrarEntregas = () => {
    return entregas.filter(entrega => {
      const tipoMatch = filtroTipo === 'todos' || entrega.tipo_entrega === filtroTipo;
      const estadoMatch = filtroEstado === 'todos' || 
        (entrega.entrega_alumno?.[0]?.estado || 'pendiente') === filtroEstado;
      return tipoMatch && estadoMatch;
    });
  };

  const esEntregaProxima = (fechaEntrega: string) => {
    const hoy = new Date();
    const entrega = new Date(fechaEntrega);
    const diasDiferencia = Math.ceil((entrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diasDiferencia <= 7 && diasDiferencia >= 0;
  };

  const esEntregaAtrasada = (fechaEntrega: string) => {
    const hoy = new Date();
    const entrega = new Date(fechaEntrega);
    return isAfter(hoy, entrega) && !entrega.entrega_alumno?.[0]?.estado;
  };

  const handleEntregaClick = async (entregaId: string) => {
    // Aquí podrías abrir un modal para subir la entrega
    alert('Funcionalidad de entrega en desarrollo');
  };

  const entregasFiltradas = filtrarEntregas();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mi Calendario de Entregas</h1>
        
        <div className="flex items-center space-x-4">
          {/* Filtros */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los tipos</option>
            <option value="trabajo_practico">Trabajos Prácticos</option>
            <option value="proyecto">Proyectos</option>
            <option value="examen">Exámenes</option>
            <option value="tarea">Tareas</option>
            <option value="otro">Otros</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregados</option>
            <option value="calificado">Calificados</option>
            <option value="atrasado">Atrasados</option>
          </select>

          {/* Vista */}
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setVista('lista')}
              className={`px-3 py-2 rounded-l-lg ${
                vista === 'lista' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setVista('calendario')}
              className={`px-3 py-2 rounded-r-lg ${
                vista === 'calendario' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📅 Calendario
            </button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {entregasFiltradas.filter(e => !e.entrega_alumno?.[0]?.estado).length}
          </div>
          <div className="text-sm text-blue-800">Pendientes</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {entregasFiltradas.filter(e => e.entrega_alumno?.[0]?.estado === 'entregado').length}
          </div>
          <div className="text-sm text-green-800">Entregados</div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {entregasFiltradas.filter(e => esEntregaProxima(e.fecha_entrega)).length}
          </div>
          <div className="text-sm text-yellow-800">Próximas (7 días)</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">
            {entregasFiltradas.filter(e => esEntregaAtrasada(e.fecha_entrega)).length}
          </div>
          <div className="text-sm text-red-800">Atrasadas</div>
        </div>
      </div>

      {/* Vista de Lista */}
      {vista === 'lista' && (
        <div className="space-y-4">
          {entregasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay entregas para mostrar
            </div>
          ) : (
            entregasFiltradas.map((entrega) => (
              <div 
                key={entrega.id} 
                className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                  esEntregaProxima(entrega.fecha_entrega) 
                    ? 'border-orange-400 bg-orange-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">
                        {TIPOS_ENTREGA_ICONOS[entrega.tipo_entrega as keyof typeof TIPOS_ENTREGA_ICONOS]}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-800">{entrega.titulo}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        TIPOS_ENTREGA_COLORES[entrega.tipo_entrega as keyof typeof TIPOS_ENTREGA_COLORES]
                      }`}>
                        {entrega.tipo_entrega.replace('_', ' ')}
                      </span>
                      
                      {esEntregaProxima(entrega.fecha_entrega) && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          ⚠️ Próxima
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{entrega.descripcion}</p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-500">
                        📚 {entrega.cursos.nombre}
                      </span>
                      <span className="text-gray-500">
                        📅 {format(new Date(entrega.fecha_entrega), 'PPP', { locale: es })}
                      </span>
                      <span className="text-gray-500">
                        🕐 {format(new Date(entrega.fecha_entrega), 'p', { locale: es })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                      ESTADOS_COLORES[entrega.entrega_alumno?.[0]?.estado as keyof typeof ESTADOS_COLORES] || 
                      ESTADOS_COLORES.pendiente
                    }`}>
                      {entrega.entrega_alumno?.[0]?.estado || 'pendiente'}
                    </div>
                    
                    {entrega.entrega_alumno?.[0]?.nota && (
                      <div className="text-lg font-bold text-blue-600">
                        Nota: {entrega.entrega_alumno[0].nota}
                      </div>
                    )}
                    
                    {!entrega.entrega_alumno?.[0]?.estado && (
                      <button
                        onClick={() => handleEntregaClick(entrega.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Entregar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista de Calendario */}
      {vista === 'calendario' && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ←
            </button>
            <h2 className="text-xl font-bold">
              {format(mesActual, 'MMMM yyyy', { locale: es })}
            </h2>
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              →
            </button>
          </div>
          
          <div className="text-center text-gray-500">
            Vista de calendario en desarrollo...
          </div>
        </div>
      )}
    </div>
  );
}