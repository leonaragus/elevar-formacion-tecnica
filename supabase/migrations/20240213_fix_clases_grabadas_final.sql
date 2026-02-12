-- Final fix for clases_grabadas table and RLS policies
-- This ensures compatibility with the core schema and fixes broken policies

-- 1. IDENTIFICAR Y CORREGIR TIPOS Y COLUMNAS
-- Aseguramos que la columna profesor exista en la tabla cursos (por si acaso no se aplicó el core_schema)
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS profesor TEXT;

-- El error anterior indicaba conflicto UUID vs TEXT.
-- Vamos a detectar el tipo real de cursos.id y ajustar clases_grabadas.curso_id.
-- Si cursos.id es UUID, convertimos clases_grabadas.curso_id a UUID.
-- Si cursos.id es TEXT, convertimos clases_grabadas.curso_id a TEXT.

DO $$ 
DECLARE
    tipo_id text;
BEGIN
    -- Obtener el tipo de dato de cursos.id
    SELECT data_type INTO tipo_id 
    FROM information_schema.columns 
    WHERE table_name = 'cursos' AND column_name = 'id';

    -- Drop the foreign key if it exists to allow type change
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'clases_grabadas_curso_id_fkey' 
        AND table_name = 'clases_grabadas'
    ) THEN
        ALTER TABLE clases_grabadas DROP CONSTRAINT clases_grabadas_curso_id_fkey;
    END IF;

    -- Aplicar el cambio de tipo según corresponda
    IF tipo_id = 'uuid' THEN
        ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
    ELSE
        ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT;
    END IF;
END $$;

-- Re-agregar la Foreign Key apuntando a cursos(id)
ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey 
FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;

-- 2. CORREGIR POLÍTICAS RLS
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;

-- Política: Alumnos pueden ver clases si están inscritos y activos
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id::text = clases_grabadas.curso_id::text
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado = 'activo'
    )
  );

-- Política: Administradores (por email)
CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (
      'admin@plataforma.com',
      'leonardo@example.com'
    )
  );

-- Política: Profesores (si su email coincide con el campo profesor del curso)
CREATE POLICY "Profesores pueden gestionar sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND (
        cursos.profesor = auth.jwt() ->> 'email'
      )
    )
  );

-- 3. Asegurar columnas de control
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS es_activo BOOLEAN DEFAULT true;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS video_path_parte2 TEXT;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS video_public_url_parte2 TEXT;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS es_multipart BOOLEAN DEFAULT false;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS total_partes INTEGER DEFAULT 1;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS archivo_original_nombre TEXT;
