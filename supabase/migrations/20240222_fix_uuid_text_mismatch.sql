-- Script para corregir tipos de datos UUID/TEXT en tablas relacionadas con cursos
-- Este script soluciona el error "invalid input syntax for type uuid" al eliminar cursos
-- Ejecutar en el Editor SQL de Supabase

DO $$ 
DECLARE
    tipo_id_curso text;
BEGIN
    -- 1. Obtener el tipo de dato de cursos.id (puede ser 'uuid' o 'text')
    SELECT data_type INTO tipo_id_curso 
    FROM information_schema.columns 
    WHERE table_name = 'cursos' AND column_name = 'id';

    RAISE NOTICE 'Tipo de ID de cursos detectado: %', tipo_id_curso;

    -- 2. Corregir tabla 'mensajes'
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        RAISE NOTICE 'Corrigiendo tabla mensajes...';
        
        -- Eliminar FK existente para poder cambiar el tipo
        ALTER TABLE mensajes DROP CONSTRAINT IF EXISTS mensajes_curso_id_fkey;
        
        -- Cambiar el tipo de columna al tipo de cursos.id
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            -- Si es UUID, aseguramos que sea UUID (casting explícito)
            ALTER TABLE mensajes ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;

        -- Limpiar registros huérfanos que impedirían crear la FK
        DELETE FROM mensajes WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);

        -- Recrear FK con ON DELETE CASCADE
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Tabla mensajes corregida.';
    END IF;

    -- 3. Corregir tabla 'clases_grabadas'
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clases_grabadas') THEN
        RAISE NOTICE 'Corrigiendo tabla clases_grabadas...';

        -- Eliminar FK existente
        ALTER TABLE clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
        
        -- Cambiar el tipo de columna
        IF tipo_id_curso = 'text' THEN
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE TEXT;
        ELSE
            ALTER TABLE clases_grabadas ALTER COLUMN curso_id TYPE UUID USING curso_id::uuid;
        END IF;

        -- Limpiar registros huérfanos
        DELETE FROM clases_grabadas WHERE curso_id::text NOT IN (SELECT id::text FROM cursos);

        -- Recrear FK con ON DELETE CASCADE
        ALTER TABLE clases_grabadas ADD CONSTRAINT clases_grabadas_curso_id_fkey 
            FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;

        RAISE NOTICE 'Tabla clases_grabadas corregida.';
    END IF;
    
END $$;
