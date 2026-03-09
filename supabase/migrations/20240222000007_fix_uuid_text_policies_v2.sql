-- SOLUCIÓN FINAL V2: Corregir tipos UUID/TEXT y Políticas RLS
-- Copiar y pegar todo este bloque en el Editor SQL de Supabase

BEGIN;

-- 1. Eliminar TODAS las políticas posibles que bloquean el cambio de tipo
-- Tabla clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas; -- La que causó el error
DROP POLICY IF EXISTS "Profesores y Admins gestionan clases" ON clases_grabadas;

-- Tabla mensajes
DROP POLICY IF EXISTS "Public read access" ON mensajes;
DROP POLICY IF EXISTS "Admin all access" ON mensajes;

-- 2. Detectar y corregir el tipo de dato de curso_id
DO $$ 
DECLARE
    tipo_id_curso text;
BEGIN
    -- Obtener el tipo de dato real de cursos.id
    SELECT data_type INTO tipo_id_curso 
    FROM information_schema.columns 
    WHERE table_name = 'cursos' AND column_name = 'id';

    RAISE NOTICE 'Tipo de ID de cursos detectado: %', tipo_id_curso;

    -- --- CORRECCIÓN TABLA MENSAJES ---
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        -- Eliminar FK
        ALTER TABLE mensajes DROP CONSTRAINT IF EXISTS mensajes_curso_id_fkey;
        
        -- Cambiar tipo
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;

        -- Limpiar huérfanos y restaurar FK
        DELETE FROM mensajes WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;

    -- --- CORRECCIÓN TABLA CLASES_GRABADAS ---
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        -- Eliminar FK
        ALTER TABLE clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
        
        -- Cambiar tipo
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;

        -- Limpiar huérfanos y restaurar FK
        DELETE FROM clases_grabadas WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Recrear Políticas RLS (Actualizadas para usar tablas correctas)

-- Políticas para 'mensajes'
CREATE POLICY "Public read access" ON mensajes FOR SELECT USING (true);
CREATE POLICY "Admin all access" ON mensajes FOR ALL USING (true);

-- Políticas para 'clases_grabadas'

-- A. Alumnos: Usamos 'cursos_alumnos' que es la tabla estándar en este proyecto
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

-- B. Profesores/Admins: Acceso unificado y estandarizado
CREATE POLICY "Profesores y Admins gestionan clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id::text = clases_grabadas.curso_id::text AND
      cursos.profesor = auth.uid()::text
    ) OR
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid() AND
        usuarios.role = 'admin'
    )
  );

COMMIT;
