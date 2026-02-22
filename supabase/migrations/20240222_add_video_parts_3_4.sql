-- Agregar soporte para partes 3 y 4 de video (hasta ~200MB)
ALTER TABLE clases_grabadas 
ADD COLUMN IF NOT EXISTS video_path_parte3 TEXT,
ADD COLUMN IF NOT EXISTS video_public_url_parte3 TEXT,
ADD COLUMN IF NOT EXISTS video_path_parte4 TEXT,
ADD COLUMN IF NOT EXISTS video_public_url_parte4 TEXT;
