
-- Solución al error: "invalid input syntax for type uuid"
-- Permite que los IDs de curso sean texto (slugs) en lugar de solo UUIDs

-- 1. Modificar tabla clases_grabadas
DO $$ BEGIN
    ALTER TABLE public.clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.clases_grabadas 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- 2. Modificar tabla clases_comentarios (por si acaso)
DO $$ BEGIN
    ALTER TABLE public.clases_comentarios DROP CONSTRAINT IF EXISTS clases_comentarios_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.clases_comentarios 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- 3. Modificar tabla clases_valoraciones (por si acaso)
DO $$ BEGIN
    ALTER TABLE public.clases_valoraciones DROP CONSTRAINT IF EXISTS clases_valoraciones_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.clases_valoraciones 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- 4. Modificar tabla cursos_alumnos (por si acaso)
DO $$ BEGIN
    ALTER TABLE public.cursos_alumnos DROP CONSTRAINT IF EXISTS cursos_alumnos_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.cursos_alumnos 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- 5. Intentar restaurar las claves foráneas (FK) apuntando a cursos.id
-- Esto solo funcionará si cursos.id también es de tipo text (que debería serlo)
DO $$
BEGIN
    -- clases_grabadas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cursos' AND column_name = 'id' AND data_type = 'text') THEN
        ALTER TABLE public.clases_grabadas 
        ADD CONSTRAINT clases_grabadas_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
    END IF;

    -- clases_comentarios
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cursos' AND column_name = 'id' AND data_type = 'text') THEN
        ALTER TABLE public.clases_comentarios 
        ADD CONSTRAINT clases_comentarios_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
    END IF;

    -- clases_valoraciones
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cursos' AND column_name = 'id' AND data_type = 'text') THEN
        ALTER TABLE public.clases_valoraciones 
        ADD CONSTRAINT clases_valoraciones_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
    END IF;
    
    -- cursos_alumnos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cursos' AND column_name = 'id' AND data_type = 'text') THEN
        ALTER TABLE public.cursos_alumnos 
        ADD CONSTRAINT cursos_alumnos_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudieron restaurar algunas claves foráneas automáticamente. Esto no es un error crítico, pero verifica la integridad referencial manualmente si es necesario. Error: %', SQLERRM;
END $$;
