// VideoPlayer simple con soporte para dividir en dos partes
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

function parsearTiempoSrt(tiempo: string): number {
  const [tiempoParte] = tiempo.split(',');
  const [horas, minutos, segundos] = tiempoParte.split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

interface TranscripcionItem {
  tiempo: number;
  texto: string;
}

function parsearSrt(srt: string): TranscripcionItem[] {
  const lineas = srt.trim().split('\n');
  const items: TranscripcionItem[] = [];
  
  for (let i = 0; i < lineas.length; i++) {
    if (lineas[i].match(/^\d+$/)) {
      const tiempoLinea = lineas[i + 1];
      const textoLineas = [];
      
      i += 2;
      while (i < lineas.length && lineas[i].trim() !== '') {
        textoLineas.push(lineas[i]);
        i++;
      }
      
      if (tiempoLinea && textoLineas.length > 0) {
        const [inicio] = tiempoLinea.split(' --> ');
        const tiempo = parsearTiempoSrt(inicio);
        
        items.push({
          tiempo,
          texto: textoLineas.join(' ')
        });
      }
    }
  }
  
  return items;
}

function parsearTexto(texto: string): TranscripcionItem[] {
  const oraciones = texto.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const duracionEstimada = 600;
  const tiempoPorOracion = oraciones.length > 0 ? duracionEstimada / oraciones.length : 0;
  
  return oraciones.map((oracion, index) => ({
    tiempo: index * tiempoPorOracion,
    texto: oracion.trim()
  }));
}

interface VideoPlayerProps {
  videoUrl: string;
  videoUrlParte2?: string; // URL opcional para la segunda parte
  titulo: string;
  transcripcionTexto?: string;
  transcripcionSrt?: string;
}

export default function VideoPlayer({ 
  videoUrl, 
  videoUrlParte2, 
  titulo, 
  transcripcionTexto, 
  transcripcionSrt 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [videoDuracion, setVideoDuracion] = useState<number | null>(null);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const transcripcionParseada = useMemo(() => {
    if (transcripcionSrt) return parsearSrt(transcripcionSrt);
    if (transcripcionTexto) return parsearTexto(transcripcionTexto);
    return [];
  }, [transcripcionTexto, transcripcionSrt]);
  const indiceActual = useMemo(() => {
    if (transcripcionParseada.length === 0) return 0;
    let indice = 0;
    for (let i = 0; i < transcripcionParseada.length; i++) {
      if (tiempoActual >= transcripcionParseada[i].tiempo) {
        indice = i;
      } else {
        break;
      }
    }
    return indice;
  }, [tiempoActual, transcripcionParseada]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTranscripcion, setMostrarTranscripcion] = useState(true);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string>(videoUrl);
  const esMultipart = !!videoUrlParte2;

  // Unir las dos partes del video si existe la segunda parte
  useEffect(() => {
    if (!videoUrlParte2) return;
    Promise.all([
      fetch(videoUrl).then(r => r.blob()),
      fetch(videoUrlParte2).then(r => r.blob())
    ])
    .then(([blob1, blob2]) => {
      const blob = new Blob([blob1, blob2], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoBlobUrl(url);
    })
    .catch(err => {
      console.error('Error al unir partes:', err);
      setVideoBlobUrl(videoUrl); // Fallback a la primera parte
    });
  }, [videoUrl, videoUrlParte2]);

  // Actualizar tiempo actual del video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const actualizarTiempo = () => {
      setTiempoActual(video.currentTime);
    };
    const actualizarDuracion = () => {
      setVideoDuracion(Number.isFinite(video.duration) ? video.duration : null);
    };

    video.addEventListener('timeupdate', actualizarTiempo);
    video.addEventListener('loadedmetadata', actualizarDuracion);
    video.addEventListener('play', () => setEstaReproduciendo(true));
    video.addEventListener('pause', () => setEstaReproduciendo(false));

    return () => {
      video.removeEventListener('timeupdate', actualizarTiempo);
      video.removeEventListener('loadedmetadata', actualizarDuracion);
      video.removeEventListener('play', () => setEstaReproduciendo(true));
      video.removeEventListener('pause', () => setEstaReproduciendo(false));
    };
  }, [videoBlobUrl]);

  const formatearTiempo = (segundos: number): string => {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  const saltarATiempo = (tiempo: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = tiempo;
    }
  };

  const buscarEnTranscripcion = () => {
    if (!busqueda) return transcripcionParseada;
    
    return transcripcionParseada.filter(item => 
      item.texto.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const transcripcionFiltrada = buscarEnTranscripcion();

  // Función para descargar el video
  const descargarVideo = async () => {
    try {
      if (videoUrlParte2) {
        // Si hay dos partes, unirlas antes de descargar
        const [response1, response2] = await Promise.all([
          fetch(videoUrl),
          fetch(videoUrlParte2)
        ]);
        
        const [blob1, blob2] = await Promise.all([
          response1.blob(),
          response2.blob()
        ]);
        
        const blob = new Blob([blob1, blob2], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        // Descargar directamente
        const response = await fetch(videoBlobUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar el video');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{titulo}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reproductor de Video */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              src={videoBlobUrl}
              className="w-full h-auto"
              controls
              preload="metadata"
            >
              Tu navegador no soporta el elemento de video.
            </video>
            
            {/* Indicador de multipart */}
            {esMultipart && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                2 partes
              </div>
            )}
          </div>

          {/* Controles adicionales */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {formatearTiempo(tiempoActual)} / {videoDuracion ? formatearTiempo(videoDuracion) : '--:--'}
              {esMultipart && (
                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  2 partes
                </span>
              )}
            </span>
            
            <button
              onClick={() => setMostrarTranscripcion(!mostrarTranscripcion)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {mostrarTranscripcion ? 'Ocultar' : 'Mostrar'} Transcripción
            </button>
            
            <button
              onClick={descargarVideo}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar Video
            </button>
          </div>
        </div>

        {/* Panel de Transcripción */}
        {mostrarTranscripcion && (
          <div className="bg-white border rounded-lg p-4 h-fit">
            <h3 className="font-semibold mb-3">Transcripción</h3>
            
            {/* Buscador */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar en transcripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
            </div>

            {/* Transcripción sincronizada */}
            <div className="max-h-96 overflow-y-auto">
              {transcripcionFiltrada.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay transcripción disponible.</p>
              ) : (
                <div className="space-y-2">
                  {transcripcionFiltrada.map((item, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        transcripcionParseada[indiceActual] === item
                          ? 'bg-blue-100 border-blue-300 border'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => saltarATiempo(item.tiempo)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-500">
                          {formatearTiempo(item.tiempo)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{item.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estadísticas */}
            {transcripcionParseada.length > 0 && (
              <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                <p>Total: {transcripcionParseada.length} segmentos</p>
                {busqueda && (
                  <p>Encontrados: {transcripcionFiltrada.length} resultados</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcripción completa debajo */}
      {transcripcionTexto && (
        <div className="mt-8">
          <h3 className="font-semibold mb-3">Transcripción Completa</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcripcionTexto}</p>
          </div>
        </div>
      )}
    </div>
  );
}
