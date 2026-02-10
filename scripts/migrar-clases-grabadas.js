// Script para ejecutar las migraciones de clases grabadas
import { createSupabaseServerClient } from '@/lib/supabase/server';

const sqlMigraciones = `
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
  
  -- Control de límite de videos
  orden INTEGER DEFAULT 1,
  es_activo BOOLEAN DEFAULT true,
  
  -- Metadatos
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_curso_id ON clases_grabadas(curso_id);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_fecha ON clases_grabadas(fecha_clase);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_activo ON clases_grabadas(activo);
CREATE INDEX IF NOT EXISTS idx_clases_grabadas_orden ON clases_grabadas(curso_id, orden DESC);

-- RLS para clases grabadas (solo usuarios del curso pueden ver)
ALTER TABLE clases_grabadas ENABLE ROW LEVEL SECURITY;

-- Política: Los alumnos inscritos en el curso pueden ver las clases grabadas
CREATE POLICY IF NOT EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inscripciones
      WHERE inscripciones.curso_id = clases_grabadas.curso_id
      AND inscripciones.alumno_id = auth.uid()
      AND inscripciones.estado = 'aceptada'
    )
  );

-- Política: Los profesores del curso pueden gestionar clases grabadas
CREATE POLICY IF NOT EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor_id = auth.uid()
    )
  );

-- Política: Los administradores pueden ver todo
CREATE POLICY IF NOT EXISTS "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
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
CREATE TRIGGER IF NOT EXISTS update_clases_grabadas_updated_at
  BEFORE UPDATE ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

export async function ejecutarMigracionesClasesGrabadas() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Ejecutar el SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: sqlMigraciones
    });

    if (error) {
      console.error('Error ejecutando migraciones:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Migraciones ejecutadas correctamente' };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Si se ejecuta directamente
if (typeof window === 'undefined') {
  ejecutarMigracionesClasesGrabadas().then(result => {
    console.log('Resultado:', result);
    process.exit(result.success ? 0 : 1);
  });
}