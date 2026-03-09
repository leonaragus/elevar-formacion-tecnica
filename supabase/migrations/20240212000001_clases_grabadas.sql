-- Migración para agregar videos de clases grabadas con transcripciones
-- Esta migración agrega soporte para videos descargados con transcripciones

-- Tabla de clases grabadas
CREATE TABLE IF NOT EXISTS clases_grabadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_clase DATE NOT NULL,
  duracion_minutos INTEGER,
  
  -- Información del video (almacenado en Supabase Storage)
  video_path TEXT NOT NULL, -- Ruta en Supabase Storage (ej: videos/clase-001.mp4)
  video_tipo VARCHAR(50) DEFAULT 'mp4', -- mp4, webm, etc.
  video_tamano_bytes BIGINT,
  video_public_url TEXT, -- URL pública generada por Supabase
  
  -- Información de la transcripción
  transcripcion_texto TEXT, -- Transcripción completa como texto
  transcripcion_srt TEXT, -- Transcripción en formato SRT para sincronización
  tiene_transcripcion BOOLEAN DEFAULT false,
  
  -- Metadatos
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_curso_id ON clases_grabadas(curso_id);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_fecha ON clases_grabadas(fecha_clase);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_activo ON clases_grabadas(activo);

-- RLS para clases grabadas (solo usuarios del curso pueden ver)
ALTER TABLE clases_grabadas ENABLE ROW LEVEL SECURITY;

-- Política: Los alumnos inscritos en el curso pueden ver las clases grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado = 'aceptada'
    )
  );

-- Política: Los profesores del curso pueden gestionar clases grabadas
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
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
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.role = 'admin'
    )
  );

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_clases_grabadas_updated_at ON clases_grabadas;
CREATE TRIGGER update_clases_grabadas_updated_at
  BEFORE UPDATE ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();