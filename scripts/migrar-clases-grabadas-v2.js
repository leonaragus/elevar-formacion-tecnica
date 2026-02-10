// Script para ejecutar migraciones usando variables del proyecto
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Leer el archivo .env.local para obtener las variables
const envPath = path.join(process.cwd(), '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('❌ No se pudo leer .env.local:', error);
  process.exit(1);
}

// Parsear el archivo .env
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/"/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno necesarias');
  console.log('Variables encontradas:', Object.keys(envVars));
  process.exit(1);
}

console.log('🚀 Conectando a Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    RAISE NOTICE 'Video % marcado para eliminación', video_mas_antiguo.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta después de insertar un nuevo video
CREATE TRIGGER IF NOT EXISTS trigger_mantener_limite_videos
  AFTER INSERT ON clases_grabadas
  FOR EACH ROW
  EXECUTE FUNCTION mantener_limite_videos();
`;

async function ejecutarMigraciones() {
  try {
    console.log('🚀 Ejecutando migraciones de clases grabadas...');
    
    // Dividir el SQL en statements individuales
    const statements = sqlMigraciones.split(';').filter(s => s.trim().length > 0);
    
    console.log(`📋 Ejecutando ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`🔨 Ejecutando statement ${i + 1}...`);
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (error) {
            console.warn(`⚠️ Error en statement ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} ejecutado`);
          }
        } catch (err) {
          console.warn(`⚠️ Excepción en statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('🎉 Migraciones completadas');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

ejecutarMigraciones();