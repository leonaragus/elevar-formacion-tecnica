-- Verificar la estructura exacta de la tabla cursos
SELECT 
    column_name, 
    data_type, 
    udt_name,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cursos' 
ORDER BY ordinal_position;