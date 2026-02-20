'use client';

import { useState, useEffect, useMemo } from 'react';
import { parsearSrt, parsearTexto, TranscripcionItem } from '@/lib/transcription-utils';

interface TranscriptionPanelProps {
  transcripcionTexto?: string;
  transcripcionSrt?: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function TranscriptionPanel({
  transcripcionTexto,
  transcripcionSrt,
  currentTime,
  onSeek,
}: TranscriptionPanelProps) {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTranscripcion, setMostrarTranscripcion] = useState(true);

  const transcripcionParseada = useMemo(() => {
    if (transcripcionSrt) return parsearSrt(transcripcionSrt);
    if (transcripcionTexto) return parsearTexto(transcripcionTexto);
    return [];
  }, [transcripcionTexto, transcripcionSrt]);

  const indiceActual = useMemo(() => {
    if (transcripcionParseada.length === 0) return 0;
    let indice = 0;
    for (let i = 0; i < transcripcionParseada.length; i++) {
      if (currentTime >= transcripcionParseada[i].tiempo) {
        indice = i;
      } else {
        break;
      }
    }
    return indice;
  }, [currentTime, transcripcionParseada]);

  const transcripcionFiltrada = useMemo(() => {
    if (!busqueda) return transcripcionParseada;
    
    return transcripcionParseada.filter(item => 
      item.texto.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [busqueda, transcripcionParseada]);

  const formatearTiempo = (segundos: number): string => {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  if (transcripcionParseada.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-4 h-fit">
        <h3 className="font-semibold mb-3">Transcripción</h3>
        <p className="text-gray-500 text-sm">No hay transcripción disponible.</p>
      </div>
    );
  }

  return (
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
        <div className="space-y-2">
          {transcripcionFiltrada.map((item, index) => (
            <div
              key={index}
              className={`p-2 rounded cursor-pointer transition-colors ${
                transcripcionParseada[indiceActual] === item
                  ? 'bg-blue-100 border-blue-300 border'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => onSeek(item.tiempo)}
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
  );
}
