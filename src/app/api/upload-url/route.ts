import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function pickBucket(supabase: ReturnType<typeof createSupabaseAdminClient>, targetSize: number) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const names = Array.isArray(buckets) ? buckets.map((b: any) => b.name) : [];
    if (names.includes('videos')) return 'videos';
    if (names.includes('materiales')) return 'materiales';
    if (names.includes('clases-grabadas') && targetSize <= 50 * 1024 * 1024) return 'clases-grabadas';
    // Try to create 'videos' if service role is available
    try {
      await supabase.storage.createBucket('videos', { public: true });
      return 'videos';
    } catch {}
    return names[0] || 'videos';
  } catch {
    return 'videos';
  }
}

export async function POST(request: NextRequest) {
  try {
    const hasProfCookie = request.cookies.get('prof_code_ok')?.value === '1';
    if (!hasProfCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { filename, filetype, cursoId, fileSize } = body;

    if (!filename || !cursoId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    
    // Determine bucket
    const bucket = await pickBucket(supabase, fileSize || 0);
    
    // Create path
    // We expect filename to be already unique-ified by the client or we do it here.
    // To match previous logic: `${Date.now()}_${fileName}`
    // But if we are doing multipart, the client might need to send the exact path for parts 2,3,4.
    // Let's assume the client sends the full intended path or we generate it.
    // Better: Client sends "base filename", we generate base path, and return it.
    // BUT for parts 2,3,4, the client needs to know the path.
    
    // Strategy: Client generates a unique ID or timestamp, sends it.
    // Or we just trust the client's filename if it includes a timestamp.
    
    // Let's stick to: Client sends exact path they want to upload to.
    // Or simpler: Client sends "desiredFilename" and "folder".
    
    // Let's replicate the existing path logic: `cursos/${cursoId}/videos/${baseName}`
    // If the client sends `partSuffix` (e.g. ".part1"), we append it.
    
    const baseName = body.uniqueName || `${Date.now()}_${filename}`;
    const partSuffix = body.partSuffix || '';
    const filePath = `cursos/${cursoId}/videos/${baseName}${partSuffix}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('Error creating signed URL:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: filePath,
      bucket: bucket,
      token: data.token, // createSignedUploadUrl returns token + signedUrl
      fullPath: `${bucket}/${filePath}` // useful for client reference
    });

  } catch (error) {
    console.error('Error in upload-url:', error);
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    const errorCause = error instanceof Error ? String((error as any).cause) : '';
    
    return NextResponse.json({ 
      error: errorMessage,
      stack: errorStack,
      cause: errorCause
    }, { status: 500 });
  }
}
