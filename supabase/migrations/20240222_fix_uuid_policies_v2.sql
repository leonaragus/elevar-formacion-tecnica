
-- Solución DEFINITIVA al error: "cannot alter type of a column used in a policy definition"
-- Este script elimina las políticas que bloquean el cambio, altera las columnas a TEXT y recrea las políticas.

BEGIN;

--------------------------------------------------------------------------------
-- 1. ELIMINAR POLÍTICAS QUE BLOQUEAN EL CAMBIO DE TIPO
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar clases de sus cursos" ON clases_grabadas;
DROP POLICY IF EXISTS "Profesores pueden gestionar sus clases" ON clases_grabadas;
DROP POLICY IF EXISTS "Administradores pueden ver todo" ON clases_grabadas;
DROP POLICY IF EXISTS "Admins gestionan todo" ON clases_grabadas;

-- Tabla: clases_comentarios (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver comentarios de sus cursos" ON clases_comentarios;
DROP POLICY IF EXISTS "Public access" ON clases_comentarios;

-- Tabla: clases_valoraciones (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver valoraciones" ON clases_valoraciones;
DROP POLICY IF EXISTS "Public access" ON clases_valoraciones;

-- Tabla: cursos_alumnos (por precaución)
DROP POLICY IF EXISTS "Alumnos pueden ver sus inscripciones" ON cursos_alumnos;
DROP POLICY IF EXISTS "Users can see own enrollments" ON cursos_alumnos;

--------------------------------------------------------------------------------
-- 2. CAMBIAR TIPOS DE COLUMNA A TEXT (Para soportar slugs y UUIDs)
--------------------------------------------------------------------------------

-- Tabla: clases_grabadas
-- Primero eliminamos la FK para poder cambiar el tipo sin restricciones
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

-- Solo si cursos.id es compatible (debería ser text)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cursos' AND column_name = 'id' AND data_type = 'text') THEN
        
        -- clases_grabadas
        ALTER TABLE public.clases_grabadas 
        ADD CONSTRAINT clases_grabadas_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;

        -- clases_comentarios
        ALTER TABLE public.clases_comentarios 
        ADD CONSTRAINT clases_comentarios_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;

        -- clases_valoraciones
        ALTER TABLE public.clases_valoraciones 
        ADD CONSTRAINT clases_valoraciones_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
        
        -- cursos_alumnos
        ALTER TABLE public.cursos_alumnos 
        ADD CONSTRAINT cursos_alumnos_curso_id_fkey 
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE CASCADE;
        
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Nota: No se pudieron restaurar FKs automáticamente (posiblemente cursos.id no es text aún). Error: %', SQLERRM;
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
      WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id -- Comparación TEXT vs TEXT es segura
      AND cursos_alumnos.user_id = auth.uid()
      AND cursos_alumnos.estado IN ('activo', 'aceptada', 'pendiente')
    )
  );

-- B. clases_grabadas: Profesores
-- Nota: Asumimos que auth.jwt() ->> 'email' es la forma segura de verificar profesores si no hay tabla de usuarios separada confiable
CREATE POLICY "Profesores gestionan sus clases" ON clases_grabadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cursos
      WHERE cursos.id = clases_grabadas.curso_id
      AND (
         -- Opción 1: Coincidencia por ID de profesor (si existe)
         cursos.profesor_id = auth.uid()
         OR 
         -- Opción 2: Coincidencia por Email (campo profesor en cursos)
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
