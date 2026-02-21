
-- Agregar columnas para soportar hasta 4 partes de video
ALTER TABLE clases_grabadas
ADD COLUMN IF NOT EXISTS video_path_parte3 text,
ADD COLUMN IF NOT EXISTS video_public_url_parte3 text,
ADD COLUMN IF NOT EXISTS video_path_parte4 text,
ADD COLUMN IF NOT EXISTS video_public_url_parte4 text;

-- Comentario para documentar
COMMENT ON COLUMN clases_grabadas.video_path_parte3 IS 'Ruta de almacenamiento de la tercera parte del video (si existe)';
COMMENT ON COLUMN clases_grabadas.video_public_url_parte3 IS 'URL pública de la tercera parte del video';
COMMENT ON COLUMN clases_grabadas.video_path_parte4 IS 'Ruta de almacenamiento de la cuarta parte del video (si existe)';
COMMENT ON COLUMN clases_grabadas.video_public_url_parte4 IS 'URL pública de la cuarta parte del video';
