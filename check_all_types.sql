-- Verificar tipos de datos exactos
SELECT 
    table_name,
    column_name, 
    data_type, 
    udt_name,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('cursos', 'cursos_alumnos')
ORDER BY table_name, ordinal_position;