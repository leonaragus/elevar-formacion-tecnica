-- PRIMERO: Verificar la estructura actual de la tabla cursos
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cursos' 
ORDER BY ordinal_position;

-- SEGUNDO: Verificar si ya hay datos en la tabla
SELECT COUNT(*) as total_cursos FROM cursos;

-- TERCERO: Verificar la tabla cursos_alumnos (si existe)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cursos_alumnos' 
ORDER BY ordinal_position;