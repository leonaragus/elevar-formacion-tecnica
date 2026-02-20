"use client";

import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import TranscriptionPanel from '@/components/TranscriptionPanel';
import { useRef, useState } from 'react';
import CommentsSection from '@/components/CommentsSection';
import CommentRatingFloatingButton from '@/components/CommentRatingFloatingButton';

interface MisClasesClientContentProps {
  clases: any[];
  claseSeleccionada: any;
  curso: any;
  urls: { url1: string; url2: string };
  cursoId: string;
  searchParams?: {
    curso_id?: string;
    clase_id?: string;
  };
}

export default function MisClasesClientContent({
  clases,
  claseSeleccionada,
  curso,
  urls,
  cursoId,
  searchParams,
}: MisClasesClientContentProps) {
  // Client-side state for video playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [commentRefreshKey, setCommentRefreshKey] = useState(0);

  const handleCommentSubmitted = () => {
    setCommentRefreshKey((prevKey) => prevKey + 1);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-4xl">📹</span> Clases Grabadas
            </h1>
            {curso && (
              <p className="text-xl text-gray-600 mt-1">
                📚 {curso.titulo}
              </p>
            )}
          </div>
          <Link
            href="/mis-clases"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            ← Cambiar curso
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Reproductor de video */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
            {claseSeleccionada ? (
              <VideoPlayer
                videoRef={videoRef}
                videoUrl={urls.url1 || claseSeleccionada.video_public_url}
                videoUrlParte2={urls.url2 || claseSeleccionada.video_public_url_parte2}
                titulo={claseSeleccionada.titulo}
                onTimeUpdate={setCurrentTime}
              />
            ) : (
              <div className="aspect-video bg-gray-200 flex items-center justify-center text-gray-500">
                No hay video disponible
              </div>
            )}
          </div>

          {/* Panel de Transcripción */}
          <div className="lg:col-span-1">
            {claseSeleccionada && (claseSeleccionada.transcripcion_texto || claseSeleccionada.transcripcion_srt) ? (
              <TranscriptionPanel
                transcripcionTexto={claseSeleccionada.transcripcion_texto}
                transcripcionSrt={claseSeleccionada.transcripcion_srt}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                No hay transcripción disponible para esta clase.
              </div>
            )}
          </div>
        </div>

        {claseSeleccionada ? (
          <>
            {/* Info de la Clase */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {claseSeleccionada.titulo}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  📅 {new Date(claseSeleccionada.fecha_clase).toLocaleDateString('es-ES', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                  })}
                </span>
                {claseSeleccionada.duracion_minutos && (
                  <span className="flex items-center gap-1">
                    ⏱️ {claseSeleccionada.duracion_minutos} min
                  </span>
                )}
                {claseSeleccionada.tiene_transcripcion && (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    📝 Transcripción disponible
                  </span>
                )}
              </div>
              {claseSeleccionada.descripcion && (
                <div className="prose prose-blue max-w-none text-gray-700">
                  {claseSeleccionada.descripcion}
                </div>
              )}
            </div>

            {/* Sección de Comentarios */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <CommentsSection claseId={String(claseSeleccionada.id)} key={commentRefreshKey} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center mb-8">
            <div className="text-6xl mb-4">📹</div>
            <h3 className="text-xl font-semibold text-gray-900">No hay clases disponibles</h3>
            <p className="text-gray-500 mt-2">Aún no se han subido videos para este curso.</p>
          </div>
        )}

        {/* Lista de Clases */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-8">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                📋 Lista de Clases
              </h3>
            </div>
            <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
              {clases && clases.length > 0 ? (
                clases.map((clase) => {
                  const isSelected = String(clase.id) === String(claseSeleccionada?.id);
                  return (
                    <Link
                      key={clase.id}
                      href={`/mis-clases?curso_id=${cursoId}&clase_id=${clase.id}`}
                      className={`block p-4 hover:bg-blue-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className="text-lg">▶️</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {clase.titulo}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            📅 {new Date(clase.fecha_clase).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No hay otras clases
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {claseSeleccionada && (
        <CommentRatingFloatingButton
          claseId={String(claseSeleccionada.id)}
          onCommentSubmitted={handleCommentSubmitted}
        />
      )}
    </div>
  );
}
