-- Agregar campo para controlar el orden y límite de videos (versión idempotente)
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 1;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS es_activo BOOLEAN DEFAULT true;

-- Índice para ordenar por fecha (si no existe)
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_orden ON clases_grabadas(curso_id, orden DESC);

-- Función para mantener solo los 2 videos más recientes por curso
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
    SELECT id, video_path INTO video_mas_antiguo
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
    -- Esto se hace mediante una función de Supabase o un trigger
    RAISE NOTICE 'Video % marcado para eliminación', video_mas_antiguo.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger si existe antes de crearlo
DROP TRIGGER IF EXISTS trigger_mantener_limite_videos ON clases_grabadas;

-- Trigger que se ejecuta después de insertar un nuevo video
CREATE TRIGGER trigger_mantener_limite_videos
  AFTER INSERT ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION mantener_limite_videos();
