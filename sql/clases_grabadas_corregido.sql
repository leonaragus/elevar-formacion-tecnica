-- ============================================
-- 📹 TABLA DE CLASES GRABADAS CON TRANSCRIPCIÓN
-- ============================================

-- Crear tabla de clases grabadas
CREATE TABLE IF NOT EXISTS clases_grabadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id text NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_clase DATE NOT NULL,
  duracion_minutos INTEGER,
  
  -- Información del video (almacenado en Supabase Storage)
  video_path TEXT NOT NULL, -- Ruta en Supabase Storage
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

-- ============================================
-- 🔍 ÍNDICES PARA BÚSQUEDA RÁPIDA
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clases_grabadas_curso_id ON clases_grabadas(curso_id);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_fecha ON clases_grabadas(fecha_clase);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_activo ON clases_grabadas(activo);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_orden ON clases_grabadas(curso_id, orden DESC);

-- ============================================
-- 🔒 RLS (ROW LEVEL SECURITY) - SEGURIDAD
-- ============================================

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
-- Nota: Asumiendo que el profesor está en el campo 'profesor' de la tabla cursos
CREATE POLICY "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor = auth.uid()::text
    )
  );

-- Política: Los administradores pueden ver todo
-- Nota: Necesitarás ajustar esto según cómo determines quién es admin
CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (true); -- Por ahora, dejemos que todos puedan ver, luego lo ajustamos

-- ============================================
-- ⏰ TRIGGER PARA updated_at
-- ============================================

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

-- ============================================
-- 🔄 FUNCIÓN PARA MANTENER LÍMITE DE 2 VIDEOS
-- ============================================

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
    RAISE NOTICE 'Video % marcado para eliminación', video_mas_antiguo.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ⚡ TRIGGER AUTOMÁTICO
-- ============================================

CREATE TRIGGER trigger_mantener_limite_videos
  AFTER INSERT ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION mantener_limite_videos();

-- ============================================
-- 📊 VISTA PARA VER ESTADÍSTICAS
-- ============================================

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

-- ============================================
-- 🎯 CONSULTAS ÚTILES
-- ============================================

-- Ver todas las clases de un curso (ordenadas por fecha)
SELECT * FROM clases_grabadas 
WHERE curso_id = 'TU_CURSO_ID' 
ORDER BY fecha_clase DESC;

-- Ver solo las clases activas de un curso
SELECT * FROM clases_grabadas 
WHERE curso_id = 'TU_CURSO_ID' 
AND es_activo = true 
ORDER BY orden DESC;

-- Ver estadísticas por curso
SELECT * FROM estadisticas_clases_grabadas;

-- ============================================
-- 🗂️ COMENTARIOS DE CLASES
-- ============================================

CREATE TABLE IF NOT EXISTS clases_comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clase_id UUID NOT NULL REFERENCES clases_grabadas(id) ON DELETE CASCADE,
  author_id UUID NULL,
  author_email TEXT NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_clase_id ON clases_comentarios(clase_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_created_at ON clases_comentarios(created_at DESC);
