import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// API para subir videos y gestionar el límite de 2 videos por curso
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea profesor o admin
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (!usuario || (usuario.rol !== 'profesor' && usuario.rol !== 'admin')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const cursoId = formData.get('cursoId') as string;
    const claseId = formData.get('claseId') as string;

    if (!videoFile || !cursoId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Verificar que el profesor sea el dueño del curso
    const { data: curso } = await supabase
      .from('cursos')
      .select('profesor_id')
      .eq('id', cursoId)
      .single();

    if (!curso || (curso.profesor_id !== session.user.id && usuario.rol !== 'admin')) {
      return NextResponse.json({ error: 'No tienes permisos para este curso' }, { status: 403 });
    }

    // 1. Verificar cuántos videos activos tiene el curso
    const { data: videosActuales, error: countError } = await supabase
      .from('clases_grabadas')
      .select('id, video_path, orden')
      .eq('curso_id', cursoId)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (countError) throw countError;

    // 2. Si hay 2 o más videos, identificar el más antiguo para eliminar
    let videoAEliminar = null;
    if (videosActuales.length >= 2) {
      videoAEliminar = videosActuales[0]; // El más antiguo (menor orden)
    }

    // 3. Subir el nuevo video a Supabase Storage
    const videoPath = `cursos/${cursoId}/videos/${Date.now()}_${videoFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(videoPath, videoFile);

    if (uploadError) throw uploadError;

    // 4. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(videoPath);

    // 5. Si hay un video para eliminar, marcarlo como inactivo
    if (videoAEliminar) {
      const { error: updateError } = await supabase
        .from('clases_grabadas')
        .update({ 
          activo: false, 
          es_activo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoAEliminar.id);

      if (updateError) throw updateError;

      // 6. Eliminar el archivo físico del video antiguo
      const { error: deleteError } = await supabase.storage
        .from('videos')
        .remove([videoAEliminar.video_path]);

      if (deleteError) {
        console.warn('Error al eliminar video antiguo:', deleteError);
        // No detenemos el proceso si no se puede eliminar el archivo
      }
    }

    // 7. Actualizar la clase con la nueva información del video
    const { error: updateClaseError } = await supabase
      .from('clases_grabadas')
      .update({
        video_path: videoPath,
        video_public_url: publicUrl,
        video_tamano_bytes: videoFile.size,
        updated_at: new Date().toISOString()
      })
      .eq('id', claseId);

    if (updateClaseError) throw updateClaseError;

    return NextResponse.json({
      success: true,
      videoPath,
      publicUrl,
      videoEliminado: videoAEliminar ? videoAEliminar.id : null
    });

  } catch (error) {
    console.error('Error en upload video:', error);
    return NextResponse.json(
      { error: 'Error al procesar el video' },
      { status: 500 }
    );
  }
}

// API para obtener información de almacenamiento usado
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cursoId = searchParams.get('cursoId');

    if (!cursoId) {
      return NextResponse.json({ error: 'Falta cursoId' }, { status: 400 });
    }

    // Obtener estadísticas de almacenamiento del curso
    const { data: clases, error } = await supabase
      .from('clases_grabadas')
      .select('id, titulo, video_tamano_bytes, created_at, es_activo')
      .eq('curso_id', cursoId)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalBytes = clases.reduce((sum, clase) => sum + (clase.video_tamano_bytes || 0), 0);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    return NextResponse.json({
      clases: clases,
      totalClases: clases.length,
      totalBytes,
      totalGB: parseFloat(totalGB),
      limiteClases: 2,
      espacioDisponible: Math.max(0, 2 - clases.length)
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}