-- SOLUCIÓN FINAL V9.1: Detección Automática de FK (Estandarizado a UID)

BEGIN;

-- 1. Eliminar políticas para evitar bloqueos
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

-- 2. Detección y eliminación automática de constraints + Conversión
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name, 
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'cursos' 
          AND ccu.column_name = 'id'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.table_schema, r.table_name, r.constraint_name);
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE TEXT USING %I::text', r.table_schema, r.table_name, r.column_name, r.column_name);
        EXECUTE format('DELETE FROM %I.%I WHERE %I::text NOT IN (SELECT id::text FROM cursos)', r.table_schema, r.table_name, r.column_name);
    END LOOP;
END $$;

-- 3. CAMBIO CRÍTICO: Convertir cursos.id a TEXTO
ALTER TABLE cursos ALTER COLUMN id TYPE TEXT USING id::text;

-- 4. Restaurar FKs
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cursos_alumnos') THEN
        ALTER TABLE cursos_alumnos ADD CONSTRAINT cursos_alumnos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intereses') THEN
        ALTER TABLE intereses ADD CONSTRAINT intereses_course_id_fkey FOREIGN KEY (course_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materiales') THEN
        ALTER TABLE materiales ADD CONSTRAINT materiales_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
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
