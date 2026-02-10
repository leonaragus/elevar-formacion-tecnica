// Página de prueba para notificaciones de calendario
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/push-notifications/service';

interface Curso {
  id: string;
  titulo: string;
}

interface Alumno {
  id: string;
  email: string;
  nombre: string;
}

interface Entrega {
  id: string;
  titulo: string;
  fecha_entrega: string;
  curso_id: string;
}

export default function TestCalendarioNotificaciones() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selectedCurso, setSelectedCurso] = useState<string>('');
  const [selectedAlumno, setSelectedAlumno] = useState<string>('');
  const [selectedEntrega, setSelectedEntrega] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Cargar cursos
      const { data: cursosData } = await supabase
        .from('cursos')
        .select('id, titulo')
        .limit(10);
      
      if (cursosData) setCursos(cursosData);

      // Cargar alumnos
      const { data: alumnosData } = await supabase
        .from('profiles')
        .select('id, email, nombre')
        .eq('role', 'alumno')
        .limit(10);
      
      if (alumnosData) setAlumnos(alumnosData);

      // Cargar entregas
      const { data: entregasData } = await supabase
        .from('calendario_entregas')
        .select('id, titulo, fecha_entrega, curso_id')
        .limit(10);
      
      if (entregasData) setEntregas(entregasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const agregarTestResult = (mensaje: string, exito: boolean = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const icono = exito ? '✅' : '❌';
    setTestResults(prev => [...prev, `[${timestamp}] ${icono} ${mensaje}`]);
  };

  const probarNotificacion = async () => {
    if (!selectedCurso || !selectedAlumno || !selectedEntrega) {
      setNotificationStatus('Por favor selecciona curso, alumno y entrega');
      return;
    }

    setIsLoading(true);
    setNotificationStatus('Enviando notificación...');

    try {
      // Obtener datos del alumno
      const alumno = alumnos.find(a => a.id === selectedAlumno);
      const entrega = entregas.find(e => e.id === selectedEntrega);
      const curso = cursos.find(c => c.id === selectedCurso);

      if (!alumno || !entrega || !curso) {
        throw new Error('Datos no encontrados');
      }

      agregarTestResult(`Preparando notificación para ${alumno.email}`);

      // Calcular días restantes
      const fechaEntrega = new Date(entrega.fecha_entrega);
      const hoy = new Date();
      const diasRestantes = Math.ceil((fechaEntrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      // Preparar mensaje según días restantes
      let titulo = '';
      let mensaje = '';

      if (diasRestantes <= 1) {
        titulo = `🚨 Último día: ${entrega.titulo}`;
        mensaje = `Mañana vence la entrega de "${entrega.titulo}". ¡No te olvides!`;
      } else if (diasRestantes <= 3) {
        titulo = `⚠️ Próxima entrega: ${entrega.titulo}`;
        mensaje = `Solo quedan ${diasRestantes} días para entregar "${entrega.titulo}". ¡Es momento de finalizar!`;
      } else if (diasRestantes <= 7) {
        titulo = `📅 Entrega próxima: ${entrega.titulo}`;
        mensaje = `Faltan ${diasRestantes} días para la entrega de "${entrega.titulo}". No olvides preparar tu trabajo.`;
      } else {
        titulo = `📅 Entrega: ${entrega.titulo}`;
        mensaje = `Recuerda que tienes una entrega pendiente: "${entrega.titulo}"`;
      }

      agregarTestResult(`Enviando: "${titulo}" - "${mensaje}"`);

      // Enviar notificación
      const resultado = await sendPushNotification({
        userEmail: alumno.email,
        cursoId: selectedCurso,
        title: titulo,
        body: mensaje,
        data: {
          type: 'calendario_entrega',
          entrega_id: selectedEntrega,
          curso_id: selectedCurso,
          fecha_entrega: entrega.fecha_entrega,
          dias_restantes: diasRestantes.toString(),
          url: `/calendario`
        }
      });

      if (resultado.success) {
        agregarTestResult(`Notificación enviada exitosamente a ${alumno.email}`);
        setNotificationStatus(`✅ Notificación enviada a ${alumno.email}`);
      } else {
        agregarTestResult(`Error al enviar notificación: ${resultado.error}`, false);
        setNotificationStatus(`❌ Error: ${resultado.error}`);
      }

    } catch (error) {
      console.error('Error enviando notificación:', error);
      agregarTestResult(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, false);
      setNotificationStatus(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🧪 Test de Notificaciones de Calendario</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configuración de Prueba</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Curso:</label>
            <select 
              value={selectedCurso} 
              onChange={(e) => setSelectedCurso(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecciona un curso</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.titulo}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Alumno:</label>
            <select 
              value={selectedAlumno} 
              onChange={(e) => setSelectedAlumno(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecciona un alumno</option>
              {alumnos.map(alumno => (
                <option key={alumno.id} value={alumno.id}>{alumno.nombre} ({alumno.email})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Entrega:</label>
            <select 
              value={selectedEntrega} 
              onChange={(e) => setSelectedEntrega(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecciona una entrega</option>
              {entregas.map(entrega => (
                <option key={entrega.id} value={entrega.id}>{entrega.titulo}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={probarNotificacion}
            disabled={isLoading || !selectedCurso || !selectedAlumno || !selectedEntrega}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Enviando...' : 'Enviar Notificación Individual'}
          </button>
        </div>
        
        {notificationStatus && (
          <div className={`p-3 rounded ${notificationStatus.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notificationStatus}
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Resultados de las Pruebas</h2>
        <div className="bg-white rounded p-4 h-64 overflow-y-auto font-mono text-sm">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No hay pruebas ejecutadas aún</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <h3 className="font-semibold text-yellow-800">Instrucciones:</h3>
        <ul className="mt-2 text-yellow-700 text-sm space-y-1">
          <li>1. Asegúrate de que el alumno haya aceptado las notificaciones push</li>
          <li>2. El alumno debe estar suscrito al curso seleccionado</li>
          <li>3. Usa el navegador Chrome o Edge para mejor compatibilidad</li>
          <li>4. Si no llegan las notificaciones, revisa la consola del navegador</li>
          <li>5. También puedes probar con el endpoint: POST /api/notifications/send</li>
        </ul>
      </div>
    </div>
  );
}