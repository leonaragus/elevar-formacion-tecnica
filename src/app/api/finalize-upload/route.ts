import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const hasProfCookie = request.cookies.get('prof_code_ok')?.value === '1';
    if (!hasProfCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      cursoId,
      titulo,
      descripcion,
      duracion,
      transcripcionTexto,
      transcripcionSrt,
      videoPath,
      videoPathParte2,
      videoPathParte3,
      videoPathParte4,
      fileSize,
      esMultipart,
      totalPartes,
      fileName,
      bucket
    } = body;

    if (!cursoId || !videoPath) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Generate public URLs
    // Note: If the bucket is public, we can just construct the URL.
    // supabase.storage.from(bucket).getPublicUrl(path)
    
    const getPublicUrl = (path: string) => {
      if (!path) return null;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    };

    const publicUrl = getPublicUrl(videoPath);
    const publicUrlParte2 = getPublicUrl(videoPathParte2);
    const publicUrlParte3 = getPublicUrl(videoPathParte3);
    const publicUrlParte4 = getPublicUrl(videoPathParte4);

    const duracionMin = duracion ? parseInt(duracion) : 0;

    let { data: insertData, error: insertError } = await supabase
      .from('clases_grabadas')
      .insert({
        curso_id: cursoId,
        titulo: titulo || 'Clase',
        descripcion: descripcion || null,
        fecha_clase: new Date().toISOString(),
        duracion_minutos: duracionMin,
        transcripcion_texto: transcripcionTexto || null,
        transcripcion_srt: transcripcionSrt || null,
        tiene_transcripcion: Boolean(transcripcionTexto || transcripcionSrt),
        orden: 1,
        es_activo: true,
        activo: true,
        video_path: videoPath,
        video_public_url: publicUrl,
        video_path_parte2: videoPathParte2 || null,
        video_public_url_parte2: publicUrlParte2 || null,
        video_path_parte3: videoPathParte3 || null,
        video_public_url_parte3: publicUrlParte3 || null,
        video_path_parte4: videoPathParte4 || null,
        video_public_url_parte4: publicUrlParte4 || null,
        es_multipart: esMultipart || false,
        total_partes: totalPartes || 1,
        archivo_original_nombre: fileName,
        video_tamano_bytes: fileSize,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting class:', insertError);
      return NextResponse.json({ error: 'Error al guardar en base de datos' }, { status: 500 });
    }

    const claseRowId = insertData.id;

    // Cleanup old videos logic (keep max 2 active)
    try {
      const { data: videosActuales, error: countError } = await supabase
        .from('clases_grabadas')
        .select('id, video_path, video_path_parte2, video_path_parte3, video_path_parte4, orden, video_public_url, created_at')
        .eq('curso_id', cursoId)
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true }); // Ensure oldest is first if orden is same

      if (!countError && Array.isArray(videosActuales) && videosActuales.length > 2) {
        // Remove the oldest ones until only 2 remain
        const videoAEliminar = videosActuales[0]; // Oldest
        
        // Mark as inactive in DB
        const { error: updateError } = await supabase
          .from('clases_grabadas')
          .update({ 
            activo: false, 
            es_activo: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', videoAEliminar.id);

        if (!updateError) {
          // Remove files from storage
          const toRemove = [videoAEliminar.video_path];
          if (videoAEliminar.video_path_parte2) toRemove.push(videoAEliminar.video_path_parte2);
          if (videoAEliminar.video_path_parte3) toRemove.push(videoAEliminar.video_path_parte3);
          if (videoAEliminar.video_path_parte4) toRemove.push(videoAEliminar.video_path_parte4);
          
          // Try to determine bucket
          let deleted = false;
          
          // 1. Try from public URL regex
          if (videoAEliminar.video_public_url) {
            const match = videoAEliminar.video_public_url.match(/\/storage\/v1\/object\/public\/([^\/]+)\//);
            if (match && match[1]) {
              const { error } = await supabase.storage.from(match[1]).remove(toRemove);
              if (!error) deleted = true;
            }
          }

          // 2. If not deleted, try known buckets
          if (!deleted) {
             const buckets = ['videos', 'materiales', 'clases-grabadas'];
             for (const b of buckets) {
               await supabase.storage.from(b).remove(toRemove);
             }
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old videos:', cleanupError);
      // Non-blocking error
    }

    return NextResponse.json({ success: true, claseId: claseRowId });

  } catch (error) {
    console.error('Error in finalize-upload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
