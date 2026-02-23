// Componente para gestionar clases grabadas con video y transcripción
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { devCursos } from "@/lib/devstore";

interface ClaseGrabada {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha_clase: string;
  duracion_minutos?: number;
  tiene_transcripcion?: boolean;
  orden?: number;
  created_at?: string;
  es_activo?: boolean;
  video_public_url?: string;
  video_tamano_bytes?: number;
  curso_id?: string;
  video_path: string;
}

interface Curso {
  id: string;
  titulo: string;
}

export default function AdminClasesGrabadasClient() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [clases, setClases] = useState<ClaseGrabada[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [duracion, setDuracion] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [transcripcionFile, setTranscripcionFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // 45MB chunks to be safe with Supabase limits and VideoPlayer logic
  const PART_SIZE = 45 * 1024 * 1024; 

  // Cargar cursos del profesor
  useEffect(() => {
    verificarAutenticacion();
  }, []);

  // Verificar autenticación antes de cargar datos
  const verificarAutenticacion = async () => {
    try {
      const res = await fetch("/api/profesor/me", { cache: "no-store" });
      await res.json().catch(() => ({}));
      setIsAuthenticated(true);
      cargarCursos();
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setIsAuthenticated(true);
      cargarCursos();
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
      setLoading(true);
      setErrorMsg(null);
      let json: any = null;
      try {
        const res1 = await fetch("/api/admin/cursos", { cache: "no-store" });
        if (res1.ok) {
          json = await res1.json().catch(() => ({}));
        }
      } catch {}
      if (!json) {
        try {
          const res2 = await fetch("/api/admin/cursos?public=1", { cache: "no-store", headers: { "x-public": "1" } });
          if (res2.ok) {
            json = await res2.json().catch(() => ({}));
          }
        } catch {}
      }
      let list = Array.isArray(json?.cursos) ? json.cursos : [];
      if (list.length === 0 && Array.isArray(devCursos) && devCursos.length > 0) {
        list = devCursos.map(c => ({ id: String(c.id), titulo: String(c.titulo) }));
      }
      if (list.length === 0) {
        setErrorMsg("No se encontraron cursos para administrar. Verifica que existan cursos.");
      }
      setCursos(list.map((c: any) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso") })));
    } catch (error) {
      console.error('Error cargando cursos:', error);
      setErrorMsg("Error cargando cursos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cursoSeleccionado && cursos.length > 0) {
      setCursoSeleccionado(cursos[0].id);
    }
  }, [cursos, cursoSeleccionado]);

  const cargarClases = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/admin/clases/video?cursoId=${encodeURIComponent(cursoSeleccionado)}&public=1`, { cache: "no-store", headers: { "x-public": "1" } });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Error al cargar clases");
      }
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.clases) ? json.clases : [];
      setClases(list);
    } catch (error) {
      console.error('Error cargando clases:', error);
      setErrorMsg("Error cargando las clases del curso.");
    } finally {
      setLoading(false);
    }
  };

  const uploadFilePart = (url: string, fileChunk: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', fileChunk.type || 'video/mp4');
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(fileChunk);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionado || !videoFile || !titulo) return;

    // Validación de tamaño máximo (4 partes * 45MB = 180MB aprox)
    // Supabase allows more but we want to stick to the convention
    if (videoFile.size > 190 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máximo 180MB). Por favor comprímelo antes de subir.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStatusMessage('Iniciando subida...');
    
    try {
      const fileSize = videoFile.size;
      const totalPartes = Math.ceil(fileSize / PART_SIZE);
      const esMultipart = totalPartes > 1;
      
      if (totalPartes > 4) {
        throw new Error(`El archivo es demasiado grande para subirlo en partes (se requieren ${totalPartes} partes, máximo 4). Intenta comprimirlo.`);
      }

      // Use a timestamp and sanitized filename for unique ID
      const timestamp = Date.now();
      const sanitizedName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueName = `${timestamp}_${sanitizedName}`;
      
      const uploadedPaths: string[] = [];
      let bucketUsed = 'videos';

      for (let i = 0; i < totalPartes; i++) {
        const start = i * PART_SIZE;
        const end = Math.min(start + PART_SIZE, fileSize);
        const chunk = videoFile.slice(start, end);
        const partNum = i + 1; // 1-based index for parts
        const partSuffix = esMultipart && partNum > 1 ? `.part${partNum}` : (esMultipart && partNum === 1 ? '.part1' : '');

        setStatusMessage(`Subiendo parte ${partNum} de ${totalPartes}...`);

        // 1. Obtener URL firmada
        const resUrl = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: videoFile.name,
            filetype: videoFile.type,
            fileSize: fileSize,
            cursoId: cursoSeleccionado,
            uniqueName: uniqueName,
            partSuffix: partSuffix
          })
        });

        if (!resUrl.ok) {
          const errData = await resUrl.json().catch(() => ({}));
          throw new Error(errData.error || "Error al obtener URL de subida");
        }

        const { signedUrl, path, bucket } = await resUrl.json();
        uploadedPaths.push(path);
        bucketUsed = bucket;

        // 2. Subir el chunk directamente a Supabase
        await uploadFilePart(signedUrl, chunk);

        // Actualizar progreso
        const progress = Math.round((partNum / totalPartes) * 100);
        setUploadProgress(progress);
      }

      setStatusMessage('Procesando datos finales...');

      // 3. Preparar datos de transcripción
      let transcripcionTexto = '';
      let transcripcionSrt = '';
      if (transcripcionFile) {
        try {
          const text = await transcripcionFile.text();
          if (!text || text.trim().length === 0) {
            alert("⚠️ El archivo de transcripción está vacío. Se guardará la clase sin transcripción.");
          } else {
            console.log("Transcripción leída, longitud:", text.length);
            if (text.includes("-->") && /\d{2}:\d{2}:\d{2}/.test(text)) {
              transcripcionSrt = text;
            } else {
              transcripcionTexto = text;
            }
          }
        } catch (err) {
          console.error("Error leyendo archivo de transcripción:", err);
          alert("⚠️ Error al leer el archivo de transcripción. Verifique el formato.");
        }
      }

      // 4. Finalizar subida (guardar en DB)
      const finalizeBody = {
        cursoId: cursoSeleccionado,
        titulo,
        descripcion,
        duracion,
        transcripcionTexto,
        transcripcionSrt,
        fileName: videoFile.name,
        fileSize: fileSize,
        bucket: bucketUsed,
        videoPath: uploadedPaths[0],
        videoPathParte2: uploadedPaths[1] || null,
        videoPathParte3: uploadedPaths[2] || null,
        videoPathParte4: uploadedPaths[3] || null,
        esMultipart: esMultipart,
        totalPartes: totalPartes
      };

      const resFinalize = await fetch("/api/finalize-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalizeBody)
      });

      if (!resFinalize.ok) {
        const err = await resFinalize.json();
        throw new Error(err.error || "Error al guardar en base de datos");
      }

      // 5. Limpiar formulario y recargar
      setTitulo('');
      setDescripcion('');
      setDuracion('');
      setVideoFile(null);
      setTranscripcionFile(null);
      setUploadProgress(0);
      setStatusMessage('');
      
      await cargarClases();
      
      alert('¡Clase grabada subida exitosamente!');
      
    } catch (error) {
      console.error('Error subiendo clase:', error);
      setStatusMessage('');
      alert('Error al subir la clase: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const eliminarClase = async (claseId: string, videoPath: string) => {
    if (!confirm('¿Estás seguro de eliminar esta clase?')) return;

    try {
      const res = await fetch(`/api/admin/clases/video?id=${encodeURIComponent(claseId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        throw new Error(json?.error || "Error al eliminar la clase");
      }
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
        {errorMsg && (
          <div className="mb-3 text-sm text-red-600">{errorMsg}</div>
        )}
        {cursos.length > 0 ? (
          <select
            value={cursoSeleccionado}
            onChange={(e) => setCursoSeleccionado(e.target.value)}
            className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md"
          >
            <option value="">-- Selecciona un curso --</option>
            {cursos.map(curso => (
              <option key={curso.id} value={curso.id}>{curso.titulo}</option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ingresá el ID del curso manualmente"
              value={cursoSeleccionado}
              onChange={(e) => setCursoSeleccionado(e.target.value)}
              className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md"
            />
            <div className="text-xs text-gray-600">
              No se encontraron cursos. Si conocés el ID, ingresalo arriba.
            </div>
            <button
              type="button"
              onClick={cargarCursos}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Actualizar cursos
            </button>
          </div>
        )}
        {loading && (
          <div className="mt-2 text-xs text-gray-500">Cargando...</div>
        )}
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
                <input
                  type="number"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  min="1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Los videos grandes se dividen automáticamente en partes de 45MB.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Video (MP4, WebM, etc.)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check type
                      if (!file.type.startsWith('video/')) {
                         alert('Por favor selecciona un archivo de video válido.');
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
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept=".txt,.srt"
                    onChange={(e) => setTranscripcionFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded-md"
                  />
                  {transcripcionFile && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                      Archivo seleccionado: <strong>{transcripcionFile.name}</strong> ({Math.round(transcripcionFile.size / 1024)} KB)
                    </div>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={uploading || !videoFile}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {uploading ? `Subiendo... ${uploadProgress}%` : 'Subir Clase'}
              </button>
              
              {uploading && (
                <div className="mt-2">
                   <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-1">{statusMessage}</p>
                </div>
              )}
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
                      <Link
                        href={`/admin/clases/${encodeURIComponent(String(clase.id))}?curso=${encodeURIComponent(String(clase.curso_id || ""))}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        👁️ Ver clase →
                      </Link>
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
