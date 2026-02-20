// VideoPlayer simple con soporte para dividir en dos partes
'use client';

import { useState, useEffect, RefObject } from 'react';

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement>;
  videoUrl: string;
  videoUrlParte2?: string; // URL opcional para la segunda parte
  titulo: string;
  onTimeUpdate: (time: number) => void;
}

export default function VideoPlayer({ 
  videoRef,
  videoUrl, 
  videoUrlParte2, 
  titulo, 
  onTimeUpdate,
}: VideoPlayerProps) {
  const [videoDuracion, setVideoDuracion] = useState<number | null>(null);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
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

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const actualizarDuracion = () => {
      setVideoDuracion(Number.isFinite(video.duration) ? video.duration : null);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', actualizarDuracion);
    video.addEventListener('play', () => setEstaReproduciendo(true));
    video.addEventListener('pause', () => setEstaReproduciendo(false));

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', actualizarDuracion);
      video.removeEventListener('play', () => setEstaReproduciendo(true));
      video.removeEventListener('pause', () => setEstaReproduciendo(false));
    };
  }, [videoBlobUrl, onTimeUpdate, videoRef]);

  return (
    <div className="bg-black rounded-lg overflow-hidden relative">
      <video
        ref={videoRef}
        src={videoBlobUrl}
        style={{ width: '100%', height: '100%' }}
        controls
        playsInline
        disablePictureInPicture
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
  );
}
