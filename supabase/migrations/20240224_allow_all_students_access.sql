-- Migración para permitir que todos los alumnos del curso accedan a las clases grabadas
-- Elimina las restricciones de estado específico

BEGIN;

-- Eliminar políticas existentes para clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
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
      -- Sin restricción de estado, cualquier alumno inscrito puede ver
    )
  );

-- Política para profesores (mantener funcionalidad existente)
CREATE POLICY "Profesores gestionan sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor = auth.jwt() ->> 'email'
    )
  );

-- Política para administradores (mantener funcionalidad existente)
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