/**
 * Utilidad para dividir archivos grandes en partes
 * Maneja el límite de 50MB de Supabase free tier
 */

export interface FilePart {
  blob: Blob;
  partNumber: number;
  totalParts: number;
  originalName: string;
}

/**
 * Divide un archivo en partes de tamaño especificado
 */
export function splitFile(file: File, maxPartSize: number = 45 * 1024 * 1024): FilePart[] {
  const parts: FilePart[] = [];
  const totalSize = file.size;
  const totalParts = Math.ceil(totalSize / maxPartSize);
  
  for (let i = 0; i < totalParts; i++) {
    const start = i * maxPartSize;
    const end = Math.min(start + maxPartSize, totalSize);
    const blob = file.slice(start, end);
    
    parts.push({
      blob,
      partNumber: i + 1,
      totalParts,
      originalName: file.name
    });
  }
  
  return parts;
}

/**
 * Une partes de archivo en un solo Blob
 */
export async function joinFileParts(urls: string[]): Promise<Blob> {
  const blobs: Blob[] = [];
  
  for (const url of urls) {
    const response = await fetch(url);
    const blob = await response.blob();
    blobs.push(blob);
  }
  
  return new Blob(blobs);
}

/**
 * Crea una URL temporal para un Blob
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Libera memoria de una URL de blob
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}