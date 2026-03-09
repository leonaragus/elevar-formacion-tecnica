-- Configuración del bucket de almacenamiento para clases grabadas
-- Este script crea el bucket y configura las políticas de seguridad

-- Crear bucket para videos de clases grabadas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clases-grabadas', 
  'clases-grabadas', 
  true, -- Bucket público para que los videos sean accesibles
  52428800, -- 50MB límite por archivo (50 * 1024 * 1024 bytes)
  ARRAY['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'text/plain', 'text/srt']
) ON CONFLICT (id) DO NOTHING;

-- Política de almacenamiento: Permitir upload a profesores y admin
CREATE POLICY "Profesores y admin pueden subir videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clases-grabadas' AND
    (
      EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.role IN ('profesor', 'admin')
      )
    )
  );

-- Política de almacenamiento: Permitir update a profesores y admin
CREATE POLICY "Profesores y admin pueden actualizar videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clases-grabadas' AND
    (
      EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.role IN ('profesor', 'admin')
      )
    )
  );

-- Política de almacenamiento: Permitir delete a profesores y admin
CREATE POLICY "Profesores y admin pueden eliminar videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'clases-grabadas' AND
    (
      EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.role IN ('profesor', 'admin')
      )
    )
  );

-- Política de almacenamiento: Permitir select (ver) a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'clases-grabadas');

-- Política de almacenamiento: Permitir select (ver) anónimo (para acceso público)
CREATE POLICY "Acceso público a videos" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'clases-grabadas');

-- Función para eliminar archivo de storage cuando se marca como inactivo
CREATE OR REPLACE FUNCTION eliminar_video_storage()
RETURNS TRIGGER AS $$
DECLARE
  video_path TEXT;
BEGIN
  -- Solo ejecutar si el video fue marcado como inactivo
  IF OLD.es_activo = true AND NEW.es_activo = false THEN
    video_path := OLD.video_path;
    
    -- Eliminar el archivo del storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'clases-grabadas' 
    AND name = video_path;
    
    RAISE NOTICE 'Video eliminado de storage: %', video_path;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para eliminar automáticamente de storage cuando se marca como inactivo
CREATE TRIGGER trigger_eliminar_video_storage
  AFTER UPDATE ON clases_grabadas
  FOR EACH ROW
  WHEN (OLD.es_activo = true AND NEW.es_activo = false)
  EXECUTE FUNCTION eliminar_video_storage();