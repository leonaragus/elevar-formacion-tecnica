-- Final fix for clases_grabadas table and RLS policies (v2, corrected order)
-- This ensures compatibility with the core schema and fixes broken policies

-- 1. DROP ALL POTENTIALLY CONFLICTING RLS POLICIES FIRST
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;

-- 2. IDENTIFY AND CORRECT COLUMN TYPES
-- Ensure the 'profesor' column exists in the 'cursos' table
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS profesor TEXT;

-- Detect the actual data type of 'cursos.id' and adjust 'clases_grabadas.curso_id' to match.
DO $$
DECLARE
    tipo_id text;
BEGIN
    -- Get the data type of cursos.id
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

    -- Apply the type change accordingly
    IF tipo_id = 'uuid' THEN
        ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
    ELSE
        ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT;
    END IF;
END $$;

-- 3. RE-ADD THE FOREIGN KEY CONSTRAINT
ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey
FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;

-- 4. RE-CREATE RLS POLICIES
-- Policy: Students can view classes for their enrolled and accepted courses
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id::text = clases_grabadas.curso_id::text
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado = 'aceptada'
    )
  );

-- Policy: Administrators can do anything
CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.role = 'admin'
    )
  );

-- Policy: Teachers can manage their own classes
CREATE POLICY "Profesores pueden gestionar sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND (
        cursos.profesor = auth.uid()::text
      )
    )
  );

-- 5. ENSURE ALL CONTROL COLUMNS EXIST
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS es_activo BOOLEAN DEFAULT true;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS video_path_parte2 TEXT;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS video_public_url_parte2 TEXT;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS es_multipart BOOLEAN DEFAULT false;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS total_partes INTEGER DEFAULT 1;
ALTER TABLE clases_grabadas ADD COLUMN IF NOT EXISTS archivo_original_nombre TEXT;
