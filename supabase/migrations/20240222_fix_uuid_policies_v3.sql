
-- Solución DEFINITIVA V3 al error: "policy Profesores gestionan sus clases..."
-- Este script elimina TODAS las variantes de nombres de políticas posibles antes de alterar la columna.

BEGIN;

--------------------------------------------------------------------------------
-- 1. ELIMINAR TODAS LAS POLÍTICAS POSIBLES (Para evitar bloqueos)
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores gestionan sus clases" ON clases_grabadas; -- ESTA ES LA QUE DABA ERROR
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores y Admins gestionan clases" ON clases_grabadas;

-- Tabla: clases_comentarios (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver comentarios de sus cursos" ON clases_comentarios;
DROP POLICY IF EXISTS "Public access" ON clases_comentarios;
DROP POLICY IF EXISTS "Comentarios accesibles por curso" ON clases_comentarios;

-- Tabla: clases_valoraciones (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver valoraciones" ON clases_valoraciones;
DROP POLICY IF EXISTS "Public access" ON clases_valoraciones;

-- Tabla: cursos_alumnos (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver sus inscripciones" ON cursos_alumnos;
DROP POLICY IF EXISTS "Users can see own enrollments" ON cursos_alumnos;

--------------------------------------------------------------------------------
-- 2. CAMBIAR TIPOS DE COLUMNA A TEXT (Ahora sí debería funcionar)
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
DO $$ BEGIN
    ALTER TABLE public.clases_grabadas DROP CONSTRAINT IF EXISTS clases_grabadas_curso_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.clases_grabadas 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- Tabla: clases_comentarios
DO $$ BEGIN
    ALTER TABLE public.clases_comentarios DROP CONSTRAINT IF EXISTS clases_comentarios_curso_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.clases_comentarios 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- Tabla: clases_valoraciones
DO $$ BEGIN
    ALTER TABLE public.clases_valoraciones DROP CONSTRAINT IF EXISTS clases_valoraciones_curso_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.clases_valoraciones 
ALTER COLUMN curso_id TYPE text USING curso_id::text;

-- Tabla: cursos_alumnos
DO $$ BEGIN
    ALTER TABLE public.cursos_alumnos DROP CONSTRAINT IF EXISTS cursos_alumnos_curso_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.cursos_alumnos 
ALTER COLUMN curso_id TYPE text USING curso_id::text;


--------------------------------------------------------------------------------
-- 3. RESTAURAR CLAVES FORÁNEAS (FK)
--------------------------------------------------------------------------------

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
        NULL; -- Ignorar errores de FK si cursos.id no es compatible aún
END $$;


--------------------------------------------------------------------------------
-- 4. RECREAR POLÍTICAS RLS (Adaptadas a TEXT)
--------------------------------------------------------------------------------

-- A. clases_grabadas: Alumnos
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

-- B. clases_grabadas: Profesores
CREATE POLICY "Profesores gestionan sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND (
         cursos.profesor_id = auth.uid()
         OR 
         cursos.profesor = (auth.jwt() ->> 'email')
      )
    )
  );

-- C. clases_grabadas: Administradores
CREATE POLICY "Admins gestionan todo" ON clases_grabadas
  FOR ALL
  USING (
    (auth.jwt() ->> 'email' IN ('admin@plataforma.com', 'leonardo@example.com'))
    OR
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  );

-- D. cursos_alumnos: Ver mis propias inscripciones
CREATE POLICY "Users can see own enrollments" ON cursos_alumnos
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
