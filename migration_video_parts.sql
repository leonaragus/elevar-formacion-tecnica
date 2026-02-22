-- Add support for up to 4 video parts in clases_grabadas table

ALTER TABLE clases_grabadas
ADD COLUMN IF NOT EXISTS video_path_parte3 TEXT,
ADD COLUMN IF NOT EXISTS video_public_url_parte3 TEXT,
ADD COLUMN IF NOT EXISTS video_path_parte4 TEXT,
ADD COLUMN IF NOT EXISTS video_public_url_parte4 TEXT;

-- Update comments or descriptions if needed
COMMENT ON COLUMN clases_grabadas.video_path_parte3 IS 'Path to the 3rd part of the video file in storage';
COMMENT ON COLUMN clases_grabadas.video_public_url_parte3 IS 'Public URL for the 3rd part of the video';
COMMENT ON COLUMN clases_grabadas.video_path_parte4 IS 'Path to the 4th part of the video file in storage';
COMMENT ON COLUMN clases_grabadas.video_public_url_parte4 IS 'Public URL for the 4th part of the video';
