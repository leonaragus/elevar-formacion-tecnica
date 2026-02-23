
-- Ensure curso_meta bucket is public and has policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('curso_meta', 'curso_meta', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- Create policies for curso_meta
CREATE POLICY "Public Access curso_meta"
ON storage.objects FOR SELECT
USING ( bucket_id = 'curso_meta' );

CREATE POLICY "Authenticated Upload curso_meta"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'curso_meta' );

CREATE POLICY "Admin Update curso_meta"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'curso_meta' );

CREATE POLICY "Admin Delete curso_meta"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'curso_meta' );
