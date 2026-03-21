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
  const [currentPartIndex, setCurrentPartIndex] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [keyReinicio, setKeyReinicio] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const videoParts = useMemo(() => [videoUrl, videoUrlParte2, videoUrlParte3, videoUrlParte4].filter(Boolean) as string[], [videoUrl, videoUrlParte2, videoUrlParte3, videoUrlParte4]);
  const isMultipart = videoParts.length > 1;

  // Si cambia el curso/video principal, volvemos a la parte 1
  useEffect(() => {
    setCurrentPartIndex(0);
    setReproduciendo(false);
    setProgreso(0);
  }, [videoUrl]);

  // Lógica para reproducción secuencial automática
  const handleVideoEnded = () => {
    if (isMultipart && currentPartIndex < videoParts.length - 1) {
        console.log("Parte finalizada, cargando siguiente parte...");
        setCurrentPartIndex(prev => prev + 1);
        setReproduciendo(true);
    } else {
        setReproduciendo(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const actualizarTiempo = () => {
        setTiempoActual(video.currentTime);
        if (video.duration) {
            setProgreso((video.currentTime / video.duration) * 100);
        }
    };
    const actualizarDuracion = () => setVideoDuracion(Number.isFinite(video.duration) ? video.duration : null);
    
    // Mejorar estados de carga - Menos intrusivos
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
        setIsLoading(false);
        setReproduciendo(true);
    };
    const handlePause = () => setReproduciendo(false);
    const handleCanPlay = () => {
        setIsLoading(false);
        setLoadError(null);
    };
    const handleSeeked = () => setIsLoading(false);
    const handleError = () => {
        console.error("Error de carga de video:", video.error);
        setIsLoading(false);
        setLoadError("Error al cargar el video. Por favor, intenta reiniciar el reproductor.");
    };

    video.addEventListener('loadedmetadata', actualizarDuracion);
    video.addEventListener('durationchange', actualizarDuracion);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', actualizarDuracion);
      video.removeEventListener('durationchange', actualizarDuracion);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [currentPartIndex, isMultipart, videoParts, keyReinicio]);

  // Autoplay para transición entre multipartes
  useEffect(() => {
    if (isMultipart && currentPartIndex > 0 && videoRef.current) {
       videoRef.current.play().catch(e => console.error("Autoplay preventivo:", e));
    }
  }, [currentPartIndex, isMultipart, keyReinicio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const id = setInterval(() => {
      setTiempoActual(video.currentTime);
      if (video.duration) {
        setProgreso((video.currentTime / video.duration) * 100);
      }
    }, 250);

    return () => clearInterval(id);
  }, [currentPartIndex, keyReinicio]);
  
  const transcripcionParseada = useMemo(() => {
    if (transcripcionSrt) return parsearSrt(transcripcionSrt);
    if (transcripcionTexto) return parsearTexto(transcripcionTexto);
    return [];
  }, [transcripcionTexto, transcripcionSrt]);

  const indiceActual = useMemo(() => {
    if (transcripcionParseada.length === 0) return -1;
    // Encontrar el último elemento cuyo tiempo sea menor o igual al tiempo actual
    let index = -1;
    for (let i = 0; i < transcripcionParseada.length; i++) {
      if (tiempoActual >= transcripcionParseada[i].tiempo) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [tiempoActual, transcripcionParseada]);

  const togglePlay = () => {
      if (videoRef.current) {
          if (reproduciendo) {
              videoRef.current.pause();
          } else {
              videoRef.current.play().catch(() => {});
          }
      }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (videoRef.current && videoDuracion) {
          const nuevoTiempo = (parseFloat(e.target.value) / 100) * videoDuracion;
          videoRef.current.currentTime = nuevoTiempo;
          setTiempoActual(nuevoTiempo);
      }
  };

  const saltarATiempo = (tiempo: number) => {
    if (videoRef.current) {
        console.log("Saltando a tiempo:", tiempo);
        const video = videoRef.current;
        
        // Estrategia de salto más robusta para archivos con problemas de indexación
        const wasPlaying = !video.paused;
        video.pause();
        
        // Forzar el tiempo
        video.currentTime = tiempo;
        
        // Pequeño hack para forzar el renderizado del frame en algunos navegadores
        if (!wasPlaying) {
            video.play().then(() => {
                video.pause();
            }).catch(() => {});
        } else {
            video.play().catch(() => {});
        }
    }
  };

  const forzarRecarga = () => {
      if (videoRef.current) {
          const t = videoRef.current.currentTime;
          setKeyReinicio(prev => prev + 1);
          
          // Restaurar tiempo tras el re-montado
          setTimeout(() => {
              if (videoRef.current) {
                  videoRef.current.currentTime = t;
                  videoRef.current.play().catch(() => {});
              }
          }, 100);
      }
  };

  const cambiarDeParte = (index: number) => {
      setCurrentPartIndex(index);
      setReproduciendo(false);
  };

  useEffect(() => {
    if (indiceActual !== -1 && !busqueda && scrollRef.current) {
        const container = scrollRef.current;
        const items = Array.from(container.querySelectorAll('.transcripcion-item')) as HTMLElement[];
        const activeItem = items[indiceActual];
        
        if (activeItem) {
            const itemTop = activeItem.offsetTop;
            const containerHeight = container.clientHeight;
            const itemHeight = activeItem.clientHeight;
            let targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
            const maxScroll = container.scrollHeight - containerHeight;
            if (targetScroll < 0) targetScroll = 0;
            if (targetScroll > maxScroll) targetScroll = maxScroll;
            
            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }
  }, [indiceActual, busqueda]);

  const formatearTiempo = (segundos: number): string => {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  const descargarVideo = async () => {
    setIsDownloading(true);
    try {
        console.log("Iniciando descarga de parte:", currentPartIndex + 1);
        const url = videoParts[currentPartIndex];
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fallo en la descarga");
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        const nombreParte = isMultipart ? `_parte_${currentPartIndex + 1}` : '';
        const safeTitulo = titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeTitulo}${nombreParte}.mp4`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
        console.error('Error al descargar:', error);
        alert('Error al descargar el video. Por favor, intenta de nuevo.');
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="w-full">
        {/* Fila Principal: Video y Transcripción */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Contenedor del video simplificado al máximo para evitar bloqueos */}
              <div className="bg-black rounded-lg shadow-2xl border border-gray-800 overflow-hidden relative group">
                  <video
                      key={`${videoParts[currentPartIndex]}-${keyReinicio}`} 
                      ref={videoRef}
                      src={videoParts[currentPartIndex]}
                      className="w-full aspect-video block"
                      controls={false} // Usaremos controles personalizados para evitar que desaparezcan
                      preload="auto"
                      autoPlay={false}
                      playsInline
                      onClick={togglePlay}
                  >
                      Tu navegador no soporta el elemento de video.
                  </video>

                  {/* Overlay de Carga */}
                  {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                  )}

                  {/* Controles Personalizados que NUNCA desaparecen si hay error */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity">
                      {/* Barra de Progreso */}
                      <div className="relative w-full h-1.5 bg-gray-600 rounded-full mb-4 group/progress cursor-pointer">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={progreso}
                            onChange={handleSeekChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div 
                            className="absolute left-0 top-0 h-full bg-blue-500 rounded-full" 
                            style={{ width: `${progreso}%` }}
                          >
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform"></div>
                          </div>
                      </div>

                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <button 
                                onClick={togglePlay}
                                className="text-white hover:text-blue-400 transition-colors"
                              >
                                  {reproduciendo ? (
                                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                  ) : (
                                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  )}
                              </button>

                              <div className="text-white text-xs font-mono">
                                  {formatearTiempo(tiempoActual)} / {videoDuracion ? formatearTiempo(videoDuracion) : '--:--'}
                              </div>
                          </div>

                          <div className="flex items-center gap-4">
                              <button 
                                onClick={forzarRecarga}
                                className="text-gray-400 hover:text-white transition-colors"
                                title="Recargar video si falla"
                              >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Removí los botones duplicados de descarga aquí. Ahora solo existe el botón de la barra inferior. */}

              {/* Indicador de error discreto debajo */}
              {loadError && (
                  <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center justify-between">
                      <p className="text-red-400 text-sm font-medium">⚠️ {loadError}</p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="text-xs bg-red-900/40 text-red-200 px-2 py-1 rounded hover:bg-red-900/60"
                      >
                        Recargar Página
                      </button>
                  </div>
              )}

              {/* Playlist de partes si es multipart */}
              {isMultipart && (
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider text-blue-400 mb-3">Contenido de la clase:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {videoParts.map((_, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => cambiarDeParte(idx)}
                                  className={`px-3 py-2 rounded-md text-xs font-semibold transition-all border ${
                                      currentPartIndex === idx
                                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                                  }`}
                              >
                                  {currentPartIndex === idx ? '▶ ' : ''}Parte {idx + 1}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
            </div>

            {/* Panel de Transcripción */}
            <div className={`bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-lg h-[520px] lg:h-[650px] flex flex-col transition-all duration-300 ${mostrarTranscripcion ? 'opacity-100' : 'hidden'}`}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold text-white">Transcripción</h3>
                  <button onClick={() => setMostrarTranscripcion(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                <div className="px-4 py-2 border-b border-gray-700/50">
                  <input
                    type="text"
                    placeholder="Buscar en el texto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700" ref={scrollRef}>
                    {transcripcionParseada.length === 0 ? (
                        <p className="text-gray-400 text-sm p-4 text-center italic">No hay transcripción disponible para esta clase.</p>
                    ) : (
                        transcripcionParseada.map((item, index) => {
                            const isActivo = indiceActual === index;
                            if (busqueda && !item.texto.toLowerCase().includes(busqueda.toLowerCase())) return null;
                            
                            return (
                                <div
                                    key={index}
                                    ref={isActivo ? activeItemRef : null}
                                    className={`transcripcion-item p-3 rounded-lg cursor-pointer transition-all duration-200 text-left border-l-4 ${
                                        isActivo
                                        ? 'bg-blue-300 text-gray-900 border-blue-400 shadow-xl'
                                        : 'hover:bg-gray-800/50 border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                    onClick={() => saltarATiempo(item.tiempo)}
                                >
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActivo ? 'bg-blue-600 text-white' : 'text-blue-400 bg-blue-400/10'}`}>
                                        {formatearTiempo(item.tiempo)}
                                    </span>
                                    <p className={`text-sm mt-2 leading-relaxed ${isActivo ? 'text-gray-900 font-extrabold text-base' : 'text-gray-400'}`}>
                                        {item.texto}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>

        {/* Barra de Controles Adicionales */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                    {formatearTiempo(tiempoActual)} / {videoDuracion ? formatearTiempo(videoDuracion) : '--:--'}
                </span>
                {!mostrarTranscripcion && (
                    <button
                        onClick={() => setMostrarTranscripcion(true)}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                        Ver transcripción
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                    onClick={descargarVideo}
                    disabled={isDownloading || !!loadError}
                    className="w-full sm:w-auto px-6 py-3 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isDownloading ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Guardando...</>
                    ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          DESCARGAR ESTA CLASE (MP4)
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
}
