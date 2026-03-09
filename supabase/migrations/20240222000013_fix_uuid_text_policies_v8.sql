-- SOLUCIÓN FINAL V8.1: Corrección de Sintaxis (Estandarizado a UID)

BEGIN;

-- 1. Eliminar políticas de seguridad para evitar bloqueos
DROP POLICY IF EXISTS "Enable read access for all users" ON cursos;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON cursos;
DROP POLICY IF EXISTS "Enable update for users based on email" ON cursos;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON cursos;
DROP POLICY IF EXISTS "Public read access" ON cursos;
DROP POLICY IF EXISTS "Admin all access" ON cursos;
DROP POLICY IF EXISTS "Profesores ven sus cursos" ON cursos;
DROP POLICY IF EXISTS "Admins y Profesores gestionan cursos" ON cursos;

DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores gestionan sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;

DROP POLICY IF EXISTS "Public read access" ON mensajes;
DROP POLICY IF EXISTS "Admin all access" ON mensajes;

-- 2. Eliminar restricciones de Clave Foránea (FK) existentes
ALTER TABLE mensajes DROP CONSTRAINT IF EXISTS mensajes_curso_id_fkey;
ALTER TABLE clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
ALTER TABLE cursos_alumnos DROP CONSTRAINT IF EXISTS cursos_alumnos_curso_id_fkey;
ALTER TABLE intereses DROP CONSTRAINT IF EXISTS intereses_course_id_fkey;

-- 3. CAMBIO CRÍTICO: Convertir cursos.id a TEXTO
ALTER TABLE cursos ALTER COLUMN id TYPE TEXT USING id::text;

-- 4. Convertir tablas dependientes a TEXTO y limpiar datos huérfanos
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        ALTER TABLE mensajes ALTER COLUMN curso_id TYPE TEXT USING curso_id::text;
        DELETE FROM mensajes WHERE curso_id NOT IN (SELECT id FROM cursos);
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT USING curso_id::text;
        DELETE FROM clases_grabadas WHERE curso_id NOT IN (SELECT id FROM cursos);
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cursos_alumnos') THEN
        ALTER TABLE cursos_alumnos ALTER COLUMN curso_id TYPE TEXT USING curso_id::text;
        DELETE FROM cursos_alumnos WHERE curso_id NOT IN (SELECT id FROM cursos);
        ALTER TABLE cursos_alumnos ADD CONSTRAINT cursos_alumnos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intereses') THEN
        ALTER TABLE intereses ALTER COLUMN course_id TYPE TEXT USING course_id::text;
        DELETE FROM intereses WHERE course_id NOT IN (SELECT id FROM cursos);
        ALTER TABLE intereses ADD CONSTRAINT intereses_course_id_fkey FOREIGN KEY (course_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Recrear Políticas RLS (ESTANDARIZADO A UID)

-- A. Cursos
CREATE POLICY "Public read access" ON cursos FOR SELECT USING (true);

CREATE POLICY "Admins y Profesores gestionan cursos" ON cursos
  FOR ALL
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR
    (profesor = auth.uid()::text) -- Estandarizado a UID
  );

-- B. Mensajes
CREATE POLICY "Public read access" ON mensajes FOR SELECT USING (true);
CREATE POLICY "Admin all access" ON mensajes FOR ALL USING (true);

-- C. Clases Grabadas
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cursos_alumnos
      WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado IN ('activo', 'aceptada', 'pendiente')
    )
  );

CREATE POLICY "Profesores gestionan sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND cursos.profesor = auth.uid()::text -- Estandarizado a UID
    )
  );

CREATE POLICY "Admins gestionan todo" ON clases_grabadas
  FOR ALL
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

COMMIT;
