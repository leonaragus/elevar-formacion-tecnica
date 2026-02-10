// Componente para gestionar clases grabadas con video y transcripción
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { splitFile, FilePart } from '@/lib/utils/fileSplitter';

interface ClaseGrabada {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion: string;
  fecha_clase: string;
  duracion_minutos: number;
  video_path: string;
  video_public_url: string;
  transcripcion_texto: string;
  tiene_transcripcion: boolean;
  orden: number;
  es_activo: boolean;
  created_at: string;
}

interface Curso {
  id: string;
  titulo: string;
  profesor: string;
}

export default function AdminClasesGrabadasClient() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [clases, setClases] = useState<ClaseGrabada[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaClase, setFechaClase] = useState('');
  const [duracion, setDuracion] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [transcripcionFile, setTranscripcionFile] = useState<File | null>(null);
  
  // Constantes de configuración
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - Límite Supabase free tier
  const CHUNK_SIZE = 45 * 1024 * 1024; // 45MB - Margen de seguridad
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/webm'];

  const supabase = createSupabaseBrowserClient();

  // Cargar cursos del profesor
  useEffect(() => {
    verificarAutenticacion();
  }, []);

  // Verificar autenticación antes de cargar datos
  const verificarAutenticacion = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        cargarCursos();
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    }
  };

  // Cargar clases cuando se selecciona un curso
  useEffect(() => {
    if (cursoSeleccionado) {
      cargarClases();
    }
  }, [cursoSeleccionado]);

  const cargarCursos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('cursos')
        .select('id, titulo, profesor')
        .eq('profesor', session.user.id) // El campo es 'profesor' (text), no 'profesor_id'
        .order('titulo');

      if (error) throw error;
      setCursos(data || []);
    } catch (error) {
      console.error('Error cargando cursos:', error);
    }
  };

  const cargarClases = async () => {
    try {
      const { data, error } = await supabase
        .from('clases_grabadas')
        .select('*')
        .eq('curso_id', cursoSeleccionado)
        .eq('activo', true)
        .order('orden', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClases(data || []);
    } catch (error) {
      console.error('Error cargando clases:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionado || !videoFile || !titulo) return;

    setUploading(true);
    
    try {
      let uploadedUrls: string[] = [];
      let uploadedPaths: string[] = [];
      let esMultipart = false;
      let totalPartes = 1;

      // Verificar si necesitamos dividir el archivo
      if (videoFile.size > MAX_FILE_SIZE) {
        esMultipart = true;
        const fileParts = splitFile(videoFile, CHUNK_SIZE);
        totalPartes = fileParts.length;
        
        // Subir cada parte
        for (let i = 0; i < fileParts.length; i++) {
          const part = fileParts[i];
          const partFileName = `clases/${cursoSeleccionado}/${Date.now()}_${videoFile.name}.part${i + 1}`;
          
          const { data, error } = await supabase.storage
            .from('clases-grabadas')
            .upload(partFileName, part.blob);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('clases-grabadas')
            .getPublicUrl(partFileName);

          uploadedUrls.push(publicUrl);
          uploadedPaths.push(partFileName);
        }
      } else {
        // Archivo pequeño, subir normalmente
        const videoFileName = `clases/${cursoSeleccionado}/${Date.now()}_${videoFile.name}`;
        const { data, error } = await supabase.storage
          .from('clases-grabadas')
          .upload(videoFileName, videoFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('clases-grabadas')
          .getPublicUrl(videoFileName);

        uploadedUrls.push(publicUrl);
        uploadedPaths.push(videoFileName);
      }

      // 3. Procesar transcripción si existe
      let transcripcionTexto = '';
      let transcripcionSrt = '';
      let tieneTranscripcion = false;
      
      if (transcripcionFile) {
        const text = await transcripcionFile.text();
        // Detectar si es SRT o texto plano
        if (text.includes('-->') && text.match(/\d{2}:\d{2}:\d{2}/)) {
          transcripcionSrt = text; // Es SRT
        } else {
          transcripcionTexto = text; // Es texto plano
        }
        tieneTranscripcion = true;
      }

      // 4. Calcular siguiente orden
      const siguienteOrden = clases.length > 0 ? Math.max(...clases.map(c => c.orden)) + 1 : 1;

      // 5. Guardar en base de datos con todos los campos requeridos
      const videoPath = esMultipart ? uploadedPaths[0] : `clases/${cursoSeleccionado}/${Date.now()}_${videoFile.name}`;
      const videoPublicUrl = esMultipart ? uploadedUrls[0] : uploadedUrls[0];
      const videoPathParte2 = esMultipart && uploadedPaths.length > 1 ? uploadedPaths[1] : null;
      const videoPublicUrlParte2 = esMultipart && uploadedUrls.length > 1 ? uploadedUrls[1] : null;
      
      const { error: dbError } = await supabase
        .from('clases_grabadas')
        .insert({
          curso_id: cursoSeleccionado,
          titulo,
          descripcion,
          fecha_clase: fechaClase,
          duracion_minutos: parseInt(duracion) || 0,
          video_path: videoPath,
          video_public_url: videoPublicUrl,
          video_path_parte2: videoPathParte2,
          video_public_url_parte2: videoPublicUrlParte2,
          video_tipo: videoFile.type.split('/')[1] || 'mp4',
          video_tamano_bytes: videoFile.size,
          transcripcion_texto: transcripcionTexto,
          transcripcion_srt: transcripcionSrt,
          tiene_transcripcion: tieneTranscripcion,
          orden: siguienteOrden,
          es_activo: true,
          activo: true,
          es_multipart: esMultipart,
          total_partes: totalPartes,
          parte_actual: 1,
          archivo_original_nombre: videoFile.name
        });

      if (dbError) throw dbError;

      // 6. Limpiar formulario y recargar
      setTitulo('');
      setDescripcion('');
      setFechaClase('');
      setDuracion('');
      setVideoFile(null);
      setTranscripcionFile(null);
      
      await cargarClases();
      
      alert('¡Clase grabada subida exitosamente!');
      
    } catch (error) {
      console.error('Error subiendo clase:', error);
      alert('Error al subir la clase: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const eliminarClase = async (claseId: string, videoPath: string) => {
    if (!confirm('¿Estás seguro de eliminar esta clase?')) return;

    try {
      // 1. Eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('clases_grabadas')
        .update({ activo: false, es_activo: false })
        .eq('id', claseId);

      if (dbError) throw dbError;

      // 2. Eliminar archivo de storage (opcional - podrías mantenerlo por seguridad)
      // await supabase.storage.from('videos').remove([videoPath]);

      await cargarClases();
      alert('Clase eliminada exitosamente');
      
    } catch (error) {
      console.error('Error eliminando clase:', error);
      alert('Error al eliminar la clase');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {!isAuthenticated ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Verificando autenticación...</p>
        </div>
      ) : (
        <>
      <h1 className="text-3xl font-bold mb-8">Gestión de Clases Grabadas</h1>
      
      {/* Selector de Curso */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Seleccionar Curso</label>
        <select
          value={cursoSeleccionado}
          onChange={(e) => setCursoSeleccionado(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="">-- Selecciona un curso --</option>
          {cursos.map(curso => (
            <option key={curso.id} value={curso.id}>{curso.titulo}</option>
          ))}
        </select>
      </div>

      {cursoSeleccionado && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de Subida */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Subir Nueva Clase</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full p-2 border rounded-md h-20"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Clase</label>
                  <input
                    type="date"
                    value={fechaClase}
                    onChange={(e) => setFechaClase(e.target.value)}
                    className="w-full p-2 border rounded-md"
                   required
                   disabled={uploading}
                 />
                 <p className="text-sm text-gray-500 mt-1">
                   Tamaño máximo por parte: 45MB. Los videos grandes se dividirán automáticamente.
                   Formatos: MP4, AVI, MOV, WebM
                 </p></div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Video (MP4, WebM, etc.)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
                        alert('Tipo de archivo no permitido. Solo se permiten: MP4, AVI, MOV, WebM');
                        e.target.value = '';
                        return;
                      }
                      if (file.size > MAX_FILE_SIZE) {
                        alert(`Archivo demasiado grande. Máximo permitido: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
                        e.target.value = '';
                        return;
                      }
                      setVideoFile(file);
                    }
                  }}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Transcripción (opcional)</label>
                <input
                  type="file"
                  accept=".txt,.srt"
                  onChange={(e) => setTranscripcionFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <button
                type="submit"
                disabled={uploading || !videoFile}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {uploading ? 'Subiendo...' : 'Subir Clase'}
              </button>
            </form>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                💡 <strong>Nota:</strong> Solo se mantendrán los 2 videos más recientes por curso. 
                Los videos antiguos se marcarán como inactivos.
              </p>
            </div>
          </div>

          {/* Lista de Clases Actuales */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Clases Actuales (Máx. 2)</h2>
            
            {clases.length === 0 ? (
              <p className="text-gray-500">No hay clases grabadas para este curso.</p>
            ) : (
              <div className="space-y-4">
                {clases.map((clase, index) => (
                  <div key={clase.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{clase.titulo}</h3>
                        <p className="text-sm text-gray-600 mt-1">{clase.descripcion}</p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-2">
                          <span>📅 {new Date(clase.fecha_clase).toLocaleDateString()}</span>
                          <span>⏱️ {clase.duracion_minutos} min</span>
                          {clase.tiene_transcripcion && <span>📝 Con transcripción</span>}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Orden: #{clase.orden} {index === 0 && '🟢 Más reciente'}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => eliminarClase(clase.id, clase.video_path)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <a
                        href={`/admin/clases/${clase.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        👁️ Ver clase →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}