-- Agregar soporte para múltiples partes de video
-- Esta migración agrega campos para manejar videos divididos en partes

-- Agregar campos para múltiples partes
ALTER TABLE clases_grabadas 
ADD COLUMN IF NOT EXISTS video_path_parte2 TEXT,
ADD COLUMN IF NOT EXISTS video_public_url_parte2 TEXT,
ADD COLUMN IF NOT EXISTS es_multipart BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_partes INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parte_actual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS archivo_original_nombre TEXT;

-- Actualizar el trigger para manejar múltiples partes
CREATE OR REPLACE FUNCTION mantener_limite_videos()
RETURNS TRIGGER AS $$
DECLARE
  videos_activos INTEGER;
  video_mas_antiguo RECORD;
BEGIN
  -- Contar videos activos del curso
  SELECT COUNT(*) INTO videos_activos
  FROM clases_grabadas
  WHERE curso_id = NEW.curso_id
  AND es_activo = true
  AND activo = true;

  -- Si hay más de 2 videos, eliminar el más antiguo
  IF videos_activos > 2 THEN
    -- Encontrar el video más antiguo (menor orden)
    SELECT id, video_path, video_path_parte2 INTO video_mas_antiguo
    FROM clases_grabadas
    WHERE curso_id = NEW.curso_id
    AND es_activo = true
    AND activo = true
    ORDER BY orden ASC, created_at ASC
    LIMIT 1;

    -- Marcar como inactivo en la base de datos
    UPDATE clases_grabadas
    SET es_activo = false, activo = false, updated_at = NOW()
    WHERE id = video_mas_antiguo.id;

    -- Nota: El archivo físico en Storage debe ser eliminado por la aplicación
    RAISE NOTICE 'Video % marcado para eliminación', video_mas_antiguo.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;