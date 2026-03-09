-- SOLUCIÓN DEFINITIVA V6.1: Corregir tipos y Políticas en CURSOS (Estandarizado a UID)

BEGIN;

-- 1. Eliminar políticas problemáticas en la tabla 'cursos' y dependientes
DROP POLICY IF EXISTS "Enable read access for all users" ON cursos;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON cursos;
DROP POLICY IF EXISTS "Enable update for users based on email" ON cursos;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON cursos;
DROP POLICY IF EXISTS "Public read access" ON cursos;
DROP POLICY IF EXISTS "Admin all access" ON cursos;
DROP POLICY IF EXISTS "Profesores ven sus cursos" ON cursos;
DROP POLICY IF EXISTS "Admins y Profesores gestionan cursos" ON cursos;

-- Dependencias
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores gestionan sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Public read access" ON mensajes;
DROP POLICY IF EXISTS "Admin all access" ON mensajes;

-- 2. FORZAR cambio de tipo a TEXT en tablas dependientes (sin cambios)
DO $$ 
DECLARE
    tipo_id_curso text;
BEGIN
    SELECT data_type INTO tipo_id_curso 
    FROM information_schema.columns 
    WHERE table_name = 'cursos' AND column_name = 'id';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        ALTER TABLE mensajes DROP CONSTRAINT IF EXISTS mensajes_curso_id_fkey;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensajes' AND column_name = 'curso_id' AND data_type = 'uuid') THEN
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE TEXT USING curso_id::text;
        END IF;
        DELETE FROM mensajes WHERE curso_id NOT IN (SELECT id FROM cursos);
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        ALTER TABLE clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clases_grabadas' AND column_name = 'curso_id' AND data_type = 'uuid') THEN
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT USING curso_id::text;
        END IF;
        DELETE FROM clases_grabadas WHERE curso_id NOT IN (SELECT id FROM cursos);
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Recrear Políticas RLS para 'cursos' (ESTANDARIZADO)

CREATE POLICY "Public read access" ON cursos FOR SELECT USING (true);

CREATE POLICY "Admins y Profesores gestionan cursos" ON cursos
  FOR ALL
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR
    (profesor = auth.uid()::text) -- Estandarizado a UID
  );

-- 4. Recrear Políticas RLS para dependencias (ESTANDARIZADO)

-- Políticas para 'mensajes'
CREATE POLICY "Public read access" ON mensajes FOR SELECT USING (true);
CREATE POLICY "Admin all access" ON mensajes FOR ALL USING (true);

-- Políticas para 'clases_grabadas'
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
