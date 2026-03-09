-- Solución al error: "invalid input syntax for type uuid" (v3, con gestión de RLS y ADD COLUMN)

-- 1. ELIMINAR POLÍTICAS CONFLICTIVAS DE clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON public.clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON public.clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON public.clases_grabadas;

-- 2. Modificar tablas (añadiendo columnas si no existen)

-- Asegurar que las columnas existen ANTES de intentar alterarlas
ALTER TABLE public.clases_comentarios ADD COLUMN IF NOT EXISTS curso_id text;
ALTER TABLE public.clases_valoraciones ADD COLUMN IF NOT EXISTS curso_id text;
ALTER TABLE public.cursos_alumnos ADD COLUMN IF NOT EXISTS curso_id text;


DO $$ BEGIN
    ALTER TABLE public.clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.clases_grabadas 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

DO $$ BEGIN
    ALTER TABLE public.clases_comentarios DROP CONSTRAINT IF EXISTS clases_comentarios_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Ahora esta línea es segura
ALTER TABLE public.clases_comentarios 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

DO $$ BEGIN
    ALTER TABLE public.clases_valoraciones DROP CONSTRAINT IF EXISTS clases_valoraciones_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Y esta
ALTER TABLE public.clases_valoraciones 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

DO $$ BEGIN
    ALTER TABLE public.cursos_alumnos DROP CONSTRAINT IF EXISTS cursos_alumnos_curso_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Y esta
ALTER TABLE public.cursos_alumnos 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- 3. RECREAR POLÍTICAS RLS en clases_grabadas
CREATE POLICY "Alumnos pueden ver clases de sus cursos" ON public.clases_grabadas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos_alumnos
      WHERE cursos_alumnos.curso_id::text = clases_grabadas.curso_id::text
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado = 'aceptada'
    )
  );

CREATE POLICY "Administradores pueden ver todo" ON public.clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.role = 'admin'
    )
  );

CREATE POLICY "Profesores pueden gestionar sus clases" ON public.clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos
      WHERE cursos.id::text = clases_grabadas.curso_id::text
      AND cursos.profesor = auth.uid()::text
    )
  );

-- 4. Intentar restaurar las claves foráneas (FK) apuntando a cursos.id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cursos' AND column_name = 'id' AND data_type = 'text') THEN
        ALTER TABLE public.clases_grabadas 
        ADD CONSTRAINT clases_grabadas_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;

        ALTER TABLE public.clases_comentarios 
        ADD CONSTRAINT clases_comentarios_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;

        ALTER TABLE public.clases_valoraciones 
        ADD CONSTRAINT clases_valoraciones_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;

        ALTER TABLE public.cursos_alumnos 
        ADD CONSTRAINT cursos_alumnos_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudieron restaurar algunas claves foráneas automáticamente. Error: %', SQLERRM;
END $$;
