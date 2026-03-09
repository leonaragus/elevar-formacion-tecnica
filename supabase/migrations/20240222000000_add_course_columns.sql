
-- Migration to add missing columns to 'cursos' table

ALTER TABLE public.cursos 
ADD COLUMN IF NOT EXISTS duracion text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nivel text DEFAULT 'inicial',
ADD COLUMN IF NOT EXISTS imagen text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profesor text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meses numeric DEFAULT 0;

-- Ensure RLS policies allow reading these columns (usually policies are on rows, so this is fine)
