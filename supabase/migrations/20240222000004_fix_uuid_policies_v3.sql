
-- Solución DEFINITIVA V3.1 al error: "policy ... already exists"
-- Este script elimina TODAS las variantes de nombres de políticas posibles antes de alterar la columna y recrearlas.

BEGIN;

--------------------------------------------------------------------------------
-- 1. ELIMINAR TODAS LAS POLÍTICAS POSIBLES (Para evitar bloqueos)
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores gestionan sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores y Admins gestionan clases" ON clases_grabadas;

-- Tabla: cursos_alumnos (AÑADIDO PARA CORREGIR EL ERROR 'already exists')
DROP POLICY IF EXISTS "Users can see own enrollments" ON cursos_alumnos;


--------------------------------------------------------------------------------
-- 2. CAMBIAR TIPOS DE COLUMNA A TEXT (Ahora sí debería funcionar)
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
DO $$ BEGIN
    ALTER TABLE public.clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.clases_grabadas 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

--------------------------------------------------------------------------------
-- 3. RECREAR POLÍTICAS RLS (ESTANDARIZADAS)
--------------------------------------------------------------------------------

-- A. clases_grabadas: Alumnos
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

-- B. clases_grabadas: Profesores
CREATE POLICY "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor = auth.uid()::text
    )
  );

-- C. clases_grabadas: Administradores
CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.role = 'admin'
    )
  );

-- D. cursos_alumnos: Ver mis propias inscripciones (AHORA SEGURO)
CREATE POLICY "Users can see own enrollments" ON cursos_alumnos
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
