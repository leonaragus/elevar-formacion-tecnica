export function parsearTiempoSrt(tiempo: string): number {
  const [tiempoParte] = tiempo.split(',');
  const [horas, minutos, segundos] = tiempoParte.split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

export interface TranscripcionItem {
  tiempo: number;
  texto: string;
}

export function parsearSrt(srt: string): TranscripcionItem[] {
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

export function parsearTexto(texto: string): TranscripcionItem[] {
  const oraciones = texto.split(/[.!?]+/).filter(s => s.trim().length > 0);
  // Asumimos una duración estimada para la transcripción de texto plano si no hay SRT
  // Esto es un placeholder, la duración real debería venir del video o ser calculada de forma más precisa
  const duracionEstimada = 600; 
  const tiempoPorOracion = oraciones.length > 0 ? duracionEstimada / oraciones.length : 0;
  
  return oraciones.map((oracion, index) => ({
    tiempo: index * tiempoPorOracion,
    texto: oracion.trim()
  }));
}
