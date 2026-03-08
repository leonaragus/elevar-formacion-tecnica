'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

// --- PARSERS DE TRANSCRIPCIÓN (SIN CAMBIOS) ---
function parsearTiempoSrt(tiempo: string): number {
  if (!tiempo) return 0;
  const tiempoLimpio = tiempo.replace(/[,.]\d+$/, '');
  const partes = tiempoLimpio.split(':').map(part => parseInt(part, 10));
  if (partes.length === 3) {
    const [horas, minutos, segundos] = partes;
    return (horas || 0) * 3600 + (minutos || 0) * 60 + (segundos || 0);
  }
  return 0;
}

interface TranscripcionItem {
  tiempo: number;
  texto: string;
}

function parsearSrt(srt: string): TranscripcionItem[] {
  if (!srt) return [];
  const contenido = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const bloques = contenido.split(/\n\s*\n/);
  const items: TranscripcionItem[] = [];
  for (const bloque of bloques) {
    const lineas = bloque.trim().split('\n');
    if (lineas.length >= 2) {
      const lineaTiempoIndex = lineas.findIndex(l => l.includes('-->'));
      if (lineaTiempoIndex !== -1) {
        const [inicio] = lineas[lineaTiempoIndex].split(' --> ');
        const texto = lineas.slice(lineaTiempoIndex + 1).join(' ').replace(/<[^>]*>/g, '');
        if (texto.trim()) {
          items.push({ tiempo: parsearTiempoSrt(inicio), texto: texto.trim() });
        }
      }
    }
  }
  return items;
}

function parsearTexto(texto: string): TranscripcionItem[] {
  let oraciones = texto.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (oraciones.length === 0) {
    oraciones = texto.split(/\n+/).filter(s => s.trim().length > 0);
  }
  const duracionEstimada = 600;
  const tiempoPorOracion = oraciones.length > 0 ? duracionEstimada / oraciones.length : 0;
  return oraciones.map((oracion, index) => ({
    tiempo: index * tiempoPorOracion,
    texto: oracion.trim(),
  }));
}

// --- COMPONENTE VIDEO PLAYER REFACTORIZADO ---

interface VideoPlayerProps {
  videoUrl: string;
  videoUrlParte2?: string;
  videoUrlParte3?: string;
  videoUrlParte4?: string;
  titulo: string;
  transcripcionTexto?: string;
  transcripcionSrt?: string;
}

export default function VideoPlayer({ 
  videoUrl, 
  videoUrlParte2, 
  videoUrlParte3, 
  videoUrlParte4,
  titulo, 
  transcripcionTexto, 
  transcripcionSrt 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [videoDuracion, setVideoDuracion] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTranscripcion, setMostrarTranscripcion] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const videoParts = useMemo(() => [videoUrl, videoUrlParte2, videoUrlParte3, videoUrlParte4].filter(Boolean) as string[], [videoUrl, videoUrlParte2, videoUrlParte3, videoUrlParte4]);
  const isMultipart = videoParts.length > 1;

  useEffect(() => {
    if (!isMultipart || !videoRef.current) return;

    const videoElement = videoRef.current;
    const mediaSource = new MediaSource();
    videoElement.src = URL.createObjectURL(mediaSource);

    const onSourceOpen = async () => {
      console.log("MediaSource abierto, preparando buffer...");
      const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
      
      let partIndex = 0;

      const appendNextPart = async () => {
        if (partIndex >= videoParts.length) {
          if (!mediaSource.ended) {
            console.log("Todas las partes añadidas, finalizando stream.");
            mediaSource.endOfStream();
          }
          return;
        }

        try {
          console.log(`Cargando parte ${partIndex + 1}/${videoParts.length}...`);
          const response = await fetch(videoParts[partIndex]);
          if (!response.ok) throw new Error(`Error al cargar la parte ${partIndex + 1}`);
          const arrayBuffer = await response.arrayBuffer();
          
          sourceBuffer.appendBuffer(arrayBuffer);
          partIndex++;
        } catch (error) {
          console.error('Error en streaming de partes:', error);
        }
      };

      sourceBuffer.addEventListener('updateend', appendNextPart);
      
      // Iniciar la carga de la primera parte
      appendNextPart();
    };

    mediaSource.addEventListener('sourceopen', onSourceOpen);

    return () => {
      mediaSource.removeEventListener('sourceopen', onSourceOpen);
      if (videoElement && videoElement.src) {
        URL.revokeObjectURL(videoElement.src);
      }
    };
  }, [isMultipart, videoParts]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const actualizarTiempo = () => setTiempoActual(video.currentTime);
    const actualizarDuracion = () => setVideoDuracion(Number.isFinite(video.duration) ? video.duration : null);

    video.addEventListener('timeupdate', actualizarTiempo);
    video.addEventListener('loadedmetadata', actualizarDuracion);
    video.addEventListener('durationchange', actualizarDuracion);

    return () => {
      video.removeEventListener('timeupdate', actualizarTiempo);
      video.removeEventListener('loadedmetadata', actualizarDuracion);
      video.removeEventListener('durationchange', actualizarDuracion);
    };
  }, []);
  
  const transcripcionParseada = useMemo(() => {
    if (transcripcionSrt) return parsearSrt(transcripcionSrt);
    if (transcripcionTexto) return parsearTexto(transcripcionTexto);
    return [];
  }, [transcripcionTexto, transcripcionSrt]);

  const indiceActual = useMemo(() => {
    if (transcripcionParseada.length === 0) return -1;
    return transcripcionParseada.findIndex((_, i) => {
      const proximoTiempo = transcripcionParseada[i + 1]?.tiempo ?? Infinity;
      return tiempoActual >= transcripcionParseada[i].tiempo && tiempoActual < proximoTiempo;
    });
  }, [tiempoActual, transcripcionParseada]);

  const saltarATiempo = (tiempo: number) => {
    if (videoRef.current) videoRef.current.currentTime = tiempo;
  };

  const formatearTiempo = (segundos: number): string => {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };
  
  const transcripcionFiltrada = useMemo(() => {
      if (!busqueda) return transcripcionParseada;
      return transcripcionParseada.filter(item => 
        item.texto.toLowerCase().includes(busqueda.toLowerCase())
      );
  }, [busqueda, transcripcionParseada]);

  const descargarVideo = async () => {
    setIsDownloading(true);
    try {
        const blobs = await Promise.all(videoParts.map(url => fetch(url).then(r => r.blob())));
        const blob = new Blob(blobs, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error('Error al descargar:', error);
        alert('Error al descargar el video');
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="w-full">
        {/* Fila Principal: Video y Transcripción */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-black rounded-lg overflow-hidden relative aspect-video shadow-2xl">
                  <video
                      ref={videoRef}
                      src={isMultipart ? undefined : videoParts[0]} // Solo usar src directo si no es multipart
                      className="w-full h-full"
                      controls
                      preload="metadata"
                  >
                      Tu navegador no soporta el elemento de video.
                  </video>
                  
                  {isMultipart && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-mono">
                      STREAMING ({videoParts.length} partes)
                  </div>
                  )}
              </div>
            </div>

            {/* Panel de Transcripción con nuevos estilos oscuros */}
            <div className={`bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-lg h-full flex flex-col transition-all duration-300 ${mostrarTranscripcion ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold text-white">Transcripción</h3>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full p-2 mt-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {transcripcionFiltrada.length === 0 ? (
                        <p className="text-gray-400 text-sm p-4 text-center">No hay transcripción disponible.</p>
                    ) : (
                        transcripcionFiltrada.map((item, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg cursor-pointer transition-colors text-left ${
                                    transcripcionParseada[indiceActual] === item
                                    ? 'bg-blue-500/20'
                                    : 'hover:bg-gray-700/50'
                                }`}
                                onClick={() => saltarATiempo(item.tiempo)}
                            >
                                <span className="text-xs text-blue-400 font-mono">
                                    {formatearTiempo(item.tiempo)}
                                </span>
                                <p className={`text-sm mt-1 ${transcripcionParseada[indiceActual] === item ? 'text-white' : 'text-gray-300'}`}>
                                    {item.texto}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Barra de Controles Adicionales */}
        <div className="mt-4 flex items-center justify-between gap-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-3 rounded-lg">
            <span className="text-sm text-gray-400 font-mono">
                {formatearTiempo(tiempoActual)} / {videoDuracion ? formatearTiempo(videoDuracion) : '--:--'}
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={descargarVideo}
                    disabled={isDownloading}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                    {isDownloading ? 'Descargando...' : 'Descargar Video'}
                </button>
                <button
                  onClick={() => setMostrarTranscripcion(!mostrarTranscripcion)}
                  className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
                >
                  {mostrarTranscripcion ? 'Ocultar' : 'Mostrar'} Transcripción
                </button>
            </div>
        </div>
    </div>
  );
}
