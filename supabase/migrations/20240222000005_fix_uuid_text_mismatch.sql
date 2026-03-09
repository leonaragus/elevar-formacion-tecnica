-- Script para corregir tipos de datos UUID/TEXT (v2, con gestión de RLS)

DO $$ 
DECLARE
    tipo_id_curso text;
BEGIN
    -- 1. Obtener el tipo de dato de cursos.id
    SELECT data_type INTO tipo_id_curso 
    FROM information_schema.columns 
    WHERE table_name = 'cursos' AND column_name = 'id';

    RAISE NOTICE 'Tipo de ID de cursos detectado: %', tipo_id_curso;

    -- 2. Corregir tabla 'mensajes' (no tiene RLS complejo, es seguro)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        RAISE NOTICE 'Corrigiendo tabla mensajes...';
        ALTER TABLE mensajes DROP CONSTRAINT IF EXISTS mensajes_curso_id_fkey;
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;
        DELETE FROM mensajes WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
        RAISE NOTICE 'Tabla mensajes corregida.';
    END IF;

    -- 3. Corregir tabla 'clases_grabadas' (CON GESTIÓN DE RLS)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        RAISE NOTICE 'Corrigiendo tabla clases_grabadas...';

        -- **INICIO: GESTIÓN DE RLS**
        -- Eliminar políticas conflictivas ANTES de alterar la tabla
        DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
        DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
        DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;

        -- Procedimiento original de alteración de la tabla
        ALTER TABLE clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;
        DELETE FROM clases_grabadas WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;

        -- Recrear políticas DESPUÉS de alterar la tabla
        CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON clases_grabadas
          FOR SELECT USING (EXISTS (SELECT 1 FROM cursos_alumnos WHERE cursos_alumnos.curso_id::text = clases_grabadas.curso_id::text AND cursos_alumnos.user_id = auth.uid() AND cursos_alumnos.estado = 'aceptada'));

        CREATE POLICY "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas
          FOR ALL USING (EXISTS (SELECT 1 FROM cursos WHERE cursos.id::text = clases_grabadas.curso_id::text AND cursos.profesor = auth.uid()::text));

        CREATE POLICY "Administradores pueden ver todo" ON clases_grabadas
          FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin'));
        -- **FIN: GESTIÓN DE RLS**

        RAISE NOTICE 'Tabla clases_grabadas corregida.';
    END IF;
    
END $$;
