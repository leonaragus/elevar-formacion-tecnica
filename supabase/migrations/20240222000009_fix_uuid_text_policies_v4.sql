-- SOLUCIÓN FINAL V4.1: Corregir tipos, Políticas y nombres de columna

BEGIN;

-- 1. Eliminar TODAS las políticas posibles que bloquean el cambio de tipo
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores y Admins gestionan clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores gestionan sus clases" ON clases_grabadas; -- Agregada para seguridad
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas; -- Agregada para seguridad

-- Tabla mensajes
DROP POLICY IF EXISTS "Public read access" ON mensajes;
DROP POLICY IF EXISTS "Admin all access" ON mensajes;

-- 2. Detectar y corregir el tipo de dato de curso_id (sin cambios)
DO $$ 
DECLARE
    tipo_id_curso text;
BEGIN
    SELECT data_type INTO tipo_id_curso 
    FROM information_schema.columns 
    WHERE table_name = 'cursos' AND column_name = 'id';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        ALTER TABLE mensajes DROP CONSTRAINT IF EXISTS mensajes_curso_id_fkey;
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;
        DELETE FROM mensajes WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        ALTER TABLE clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;
        DELETE FROM clases_grabadas WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Recrear Políticas RLS (CON COLUMNA CORREGIDA)

-- Políticas para 'mensajes'
CREATE POLICY "Public read access" ON mensajes FOR SELECT USING (true);
CREATE POLICY "Admin all access" ON mensajes FOR ALL USING (true);

-- Políticas para 'clases_grabadas'

-- A. Alumnos
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id::text = clases_grabadas.curso_id::text
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado IN ('activo', 'aceptada', 'pendiente')
    )
  );

-- B. Profesores (CORREGIDO: profesor_id -> profesor)
CREATE POLICY "Profesores gestionan sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id::text = clases_grabadas.curso_id::text
      AND cursos.profesor = auth.uid()::text -- Columna corregida
    )
  );

-- C. Admins/Staff
CREATE POLICY "Admins gestionan todo" ON clases_grabadas
  FOR ALL
  USING (
    (auth.jwt() ->> 'email' IN ('admin@plataforma.com', 'leonardo@example.com'))
    OR
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  );

COMMIT;
