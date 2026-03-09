
-- Solución DEFINITIVA al error: "cannot alter type of a column used in a policy definition"
-- Este script elimina las políticas que bloquean el cambio, altera las columnas a TEXT y recrea las políticas.

BEGIN;

--------------------------------------------------------------------------------
-- 1. ELIMINAR POLÍTICAS QUE BLOQUEAN EL CAMBIO DE TIPO
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;

-- Tabla: clases_comentarios (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver comentarios de sus cursos" ON clases_comentarios;
DROP POLICY IF EXISTS "Public access" ON clases_comentarios;

-- Tabla: clases_valoraciones (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver valoraciones" ON clases_valoraciones;
DROP POLICY IF EXISTS "Public access" ON clases_valoraciones;

-- Tabla: cursos_alumnos (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver sus inscripciones" ON cursos_alumnos;
DROP POLICY IF EXISTS "Users can see own enrollments" ON cursos_alumnos;

--------------------------------------------------------------------------------
-- 2. CAMBIAR TIPOS DE COLUMNA A TEXT (Para soportar slugs y UUIDs)
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

-- D. cursos_alumnos: Ver mis propias inscripciones
CREATE POLICY "Users can see own enrollments" ON cursos_alumnos
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
