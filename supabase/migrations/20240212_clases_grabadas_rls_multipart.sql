-- Actualizar políticas RLS para incluir nuevos campos de multipart
-- Esta migración actualiza las políticas para que los usuarios puedan ver videos multipart

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;

-- Crear políticas actualizadas con los nuevos campos
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inscripciones
      WHERE inscripciones.curso_id = clases_grabadas.curso_id
      AND inscripciones.alumno_id = auth.uid()
      AND inscripciones.estado = 'aceptada'
    )
  );

CREATE POLICY "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor_id = auth.uid()
    )
  );

CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );