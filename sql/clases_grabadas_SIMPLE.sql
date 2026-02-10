-- ============================================
-- 📹 SQL FINAL CORREGIDO - CLASES GRABADAS
-- ============================================
-- COPIAR Y PEGAR ESTO EN SUPABASE DASHBOARD → SQL EDITOR
-- ============================================

-- PASO 1: Crear tabla de clases grabadas (sin foreign key por ahora)
CREATE TABLE IF NOT EXISTS clases_grabadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id text NOT NULL, -- Referencia a cursos(id) pero sin FK por ahora
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_clase DATE NOT NULL,
  duracion_minutos INTEGER,
  
  -- Información del video (almacenado en Supabase Storage)
  video_path TEXT NOT NULL,
  video_tipo VARCHAR(50) DEFAULT 'mp4',
  video_tamano_bytes BIGINT,
  video_public_url TEXT, -- URL pública generada por Supabase
  
  -- Información de la transcripción
  transcripcion_texto TEXT, -- Transcripción completa como texto
  transcripcion_srt TEXT, -- Transcripción en formato SRT para sincronización
  tiene_transcripcion BOOLEAN DEFAULT false,
  
  -- Control de límite de videos (máximo 2 por curso)
  orden INTEGER DEFAULT 1,
  es_activo BOOLEAN DEFAULT true,
  
  -- Metadatos
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 2: Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_curso_id ON clases_grabadas(curso_id);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_fecha ON clases_grabadas(fecha_clase);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_activo ON clases_grabadas(activo);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_orden ON clases_grabadas(curso_id, orden DESC);

-- PASO 3: RLS (Seguridad) - CORREGIDO
ALTER TABLE clases_grabadas ENABLE ROW LEVEL SECURITY;

-- Política: Los alumnos inscritos en el curso pueden ver las clases grabadas
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado = 'activo'
    )
  );

-- Política: Los profesores del curso pueden gestionar clases grabadas
-- Asumiendo que el profesor está en el campo 'profesor' de la tabla cursos
CREATE POLICY "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor = auth.uid()::text
    )
  );

-- Política: Los administradores pueden ver todo (ajusta según tu sistema)
CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (true); -- Por ahora, dejemos abierto, luego lo ajustas

-- PASO 4: Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clases_grabadas_updated_at
  BEFORE UPDATE ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASO 5: Función para mantener límite de 2 videos
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
    -- Encontrar el video más antiguo
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

    RAISE NOTICE 'Video % marcado para eliminación', video_mas_antiguo.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Trigger automático
CREATE TRIGGER trigger_mantener_limite_videos
  AFTER INSERT ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION mantener_limite_videos();

-- PASO 7: Vista de estadísticas
CREATE OR REPLACE VIEW estadisticas_clases_grabadas AS
SELECT 
  cursos.titulo as curso_nombre,
  COUNT(*) as total_clases,
  COUNT(*) FILTER (WHERE es_activo = true) as clases_activas,
  AVG(duracion_minutos) as duracion_promedio,
  MAX(fecha_clase) as ultima_clase,
  SUM(video_tamano_bytes) as tamano_total_bytes
FROM clases_grabadas
JOIN cursos ON cursos.id = clases_grabadas.curso_id
WHERE clases_grabadas.activo = true
GROUP BY cursos.id, cursos.titulo;

-- PASO 8: Verificar que todo se creó correctamente
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'clases_grabadas';

-- Ver estructura de la tabla
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clases_grabadas' 
ORDER BY ordinal_position;