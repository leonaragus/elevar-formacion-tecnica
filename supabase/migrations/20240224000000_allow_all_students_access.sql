-- Migración para permitir que todos los alumnos del curso accedan a las clases grabadas (Corregido y Estandarizado)

BEGIN;

-- Eliminar políticas existentes para clases_grabadas para garantizar la idempotencia
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Todos los alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores gestionan sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;

-- Crear política simple para alumnos: cualquier alumno inscrito puede ver las clases
CREATE POLICY "Todos los alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id
      AND cursos_alumnos.user_id = auth.uid()
    )
  );

-- Política para profesores (ESTANDARIZADO A UID)
CREATE POLICY "Profesores gestionan sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor = auth.uid()::text -- Estandarizado a UID
    )
  );

-- Política para administradores (simplificada)
CREATE POLICY "Admins gestionan todo" ON clases_grabadas
  FOR ALL
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

COMMIT;
