import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
export const runtime = 'nodejs';

async function pickBucket(supabase: ReturnType<typeof createSupabaseAdminClient>, targetSize: number) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const names = Array.isArray(buckets) ? buckets.map((b: any) => b.name) : [];
    if (names.includes('videos')) return 'videos';
    if (names.includes('materiales')) return 'materiales';
    if (names.includes('clases-grabadas') && targetSize <= 50 * 1024 * 1024) return 'clases-grabadas';
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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || !serviceKey.startsWith('eyJ')) {
      return NextResponse.json({ 
        error: 'Configuración Supabase inválida: faltan SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE (formato JWT comienza con "eyJ")' 
      }, { status: 500 });
    }
    const supabase = createSupabaseAdminClient();

    const formData = await request.formData();
    const isChunked = String(formData.get('isChunked') || '') === '1';
    const cursoId = formData.get('cursoId') as string;
    const claseId = formData.get('claseId') as string;
    const titulo = String(formData.get('titulo') || '');
    const descripcion = String(formData.get('descripcion') || '');
    const duracionMin = String(formData.get('duracion') || '');
    const transcripcionTexto = String(formData.get('transcripcionTexto') || '');
    const transcripcionSrt = String(formData.get('transcripcionSrt') || '');
    const fileName = String(formData.get('fileName') || '');
    const uploadId = String(formData.get('uploadId') || '');
    const chunkIndex = Number(String(formData.get('chunkIndex') || '0'));
    const totalChunks = Number(String(formData.get('totalChunks') || '1'));

    if (!cursoId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    let claseRowId = claseId || '';

    if (isChunked) {
      const chunkFile = formData.get('videoChunk') as File;
      if (!chunkFile || !fileName || !uploadId) {
        return NextResponse.json({ error: 'Datos de chunk incompletos' }, { status: 400 });
      }
      const tmpDir = path.join(os.tmpdir(), 'clases_uploads');
      fs.mkdirSync(tmpDir, { recursive: true });
      const tmpPath = path.join(tmpDir, uploadId);
      const buf = Buffer.from(await chunkFile.arrayBuffer());
      fs.appendFileSync(tmpPath, buf);
      if (chunkIndex + 1 < totalChunks) {
        return NextResponse.json({ ok: true, receivedChunk: chunkIndex });
      }

    const stats = fs.statSync(tmpPath);
    const fileSize = stats.size;
    const MAX_PART = 45 * 1024 * 1024;
    const mimeType = chunkFile.type || 'video/mp4';
    const bucket = await pickBucket(supabase, Math.min(fileSize, MAX_PART));
    const baseName = `${Date.now()}_${fileName}`;
    let videoPath = `cursos/${cursoId}/videos/${baseName}`;
    let publicUrl = '';
    let videoPathParte2 = '';
    let publicUrlParte2 = '';
    let videoPathParte3 = '';
    let publicUrlParte3 = '';
    let videoPathParte4 = '';
    let publicUrlParte4 = '';
    let esMultipart = false;
    let totalPartes = 1;

    const readChunk = (start: number, end: number) => {
      const size = end - start;
      const buffer = Buffer.alloc(size);
      const fd = fs.openSync(tmpPath, 'r');
      try {
        fs.readSync(fd, buffer, 0, size, start);
      } finally {
        fs.closeSync(fd);
      }
      return buffer;
    };

    if (fileSize > MAX_PART) {
      if (fileSize > MAX_PART * 4) {
        fs.unlinkSync(tmpPath);
        return NextResponse.json({ 
          error: 'El archivo supera el límite permitido para dividir en 4 partes (≈180MB). Comprimí el video o subilo en menor calidad.' 
        }, { status: 413 });
      }
      esMultipart = true;
      totalPartes = Math.ceil(fileSize / MAX_PART);
      
      const parte1 = readChunk(0, MAX_PART);
      const part1Path = `cursos/${cursoId}/videos/${baseName}.part1`;
      const { error: upErr1 } = await supabase.storage.from(bucket).upload(part1Path, parte1, { contentType: mimeType });
      if (upErr1) throw upErr1;
      videoPath = part1Path;
      publicUrl = supabase.storage.from(bucket).getPublicUrl(part1Path).data.publicUrl;

      if (totalPartes >= 2) {
        const start = MAX_PART;
        const end = Math.min(MAX_PART * 2, fileSize);
        const parte2 = readChunk(start, end);
        const part2Path = `cursos/${cursoId}/videos/${baseName}.part2`;
        const { error: upErr2 } = await supabase.storage.from(bucket).upload(part2Path, parte2, { contentType: mimeType });
        if (upErr2) throw upErr2;
        videoPathParte2 = part2Path;
        publicUrlParte2 = supabase.storage.from(bucket).getPublicUrl(part2Path).data.publicUrl;
      }

      if (totalPartes >= 3) {
        const start = MAX_PART * 2;
        const end = Math.min(MAX_PART * 3, fileSize);
        const parte3 = readChunk(start, end);
        const part3Path = `cursos/${cursoId}/videos/${baseName}.part3`;
        const { error: upErr3 } = await supabase.storage.from(bucket).upload(part3Path, parte3, { contentType: mimeType });
        if (upErr3) throw upErr3;
        videoPathParte3 = part3Path;
        publicUrlParte3 = supabase.storage.from(bucket).getPublicUrl(part3Path).data.publicUrl;
      }

      if (totalPartes >= 4) {
        const start = MAX_PART * 3;
        const end = Math.min(MAX_PART * 4, fileSize);
        const parte4 = readChunk(start, end);
        const part4Path = `cursos/${cursoId}/videos/${baseName}.part4`;
        const { error: upErr4 } = await supabase.storage.from(bucket).upload(part4Path, parte4, { contentType: mimeType });
        if (upErr4) throw upErr4;
        videoPathParte4 = part4Path;
        publicUrlParte4 = supabase.storage.from(bucket).getPublicUrl(part4Path).data.publicUrl;
      }
    } else {
      const fileBuffer = readChunk(0, fileSize);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(videoPath, fileBuffer, { contentType: mimeType });
      if (uploadError) throw uploadError;
      publicUrl = supabase.storage.from(bucket).getPublicUrl(videoPath).data.publicUrl;
    }
    fs.unlinkSync(tmpPath);
    let { data: insertData, error: insertError } = await supabase
      .from('clases_grabadas')
      .insert({
        curso_id: cursoId,
        titulo: titulo || 'Clase',
        descripcion: descripcion || null,
        fecha_clase: new Date().toISOString(),
        duracion_minutos: duracionMin ? parseInt(duracionMin) : 0,
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
        es_multipart: esMultipart,
        total_partes: totalPartes,
        archivo_original_nombre: fileName,
        video_tamano_bytes: fileSize,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    if (insertError) {
        throw insertError;
    }
    claseRowId = String(insertData?.id || '');
      const { data: videosActuales, error: countError } = await supabase
        .from('clases_grabadas')
        .select('id, fecha_clase, video_path, video_path_parte2, video_path_parte3, video_path_parte4')
        .eq('curso_id', cursoId)
        .eq('activo', true)
        .order('fecha_clase', { ascending: true });

      if (countError) {
          console.error("Error al contar videos para rotación:", countError.message);
      } else if (Array.isArray(videosActuales) && videosActuales.length > 2) {
        const videoAEliminar = videosActuales[0];
        const filesToDelete = [videoAEliminar.video_path, videoAEliminar.video_path_parte2, videoAEliminar.video_path_parte3, videoAEliminar.video_path_parte4].filter(Boolean);
        
        if (filesToDelete.length > 0) {
            const buckets = ['videos', 'materiales', 'clases-grabadas'];
            for (const b of buckets) {
                await supabase.storage.from(b).remove(filesToDelete);
            }
        }

        const { error: deleteDbError } = await supabase.from('clases_grabadas').delete().eq('id', videoAEliminar.id);
        if (deleteDbError) {
            console.error('Error al borrar la fila de la clase antigua:', deleteDbError.message);
        }
      }
      return NextResponse.json({
        success: true,
        videoPath,
        publicUrl,
        claseId: claseRowId
      });
    }

    const videoFile = formData.get('video') as File;
    if (!videoFile) {
      return NextResponse.json({ error: 'Falta video' }, { status: 400 });
    }
    
    const MAX_PART = 45 * 1024 * 1024;
    const bucket = await pickBucket(supabase, Math.min(videoFile.size || 0, MAX_PART));
    const baseName = `${Date.now()}_${videoFile.name}`;
    let videoPath = `cursos/${cursoId}/videos/${baseName}`;
    let publicUrl = '';
    let videoPathParte2 = '';
    let publicUrlParte2 = '';
    let videoPathParte3 = '';
    let publicUrlParte3 = '';
    let videoPathParte4 = '';
    let publicUrlParte4 = '';
    let esMultipart = false;
    let totalPartes = 1;
    if ((videoFile.size || 0) > MAX_PART) {
      if ((videoFile.size || 0) > MAX_PART * 4) {
        return NextResponse.json({ 
          error: 'El archivo supera el límite permitido para dividir en 4 partes (≈180MB). Comprimí el video o subilo en menor calidad.' 
        }, { status: 413 });
      }
      esMultipart = true;
      totalPartes = Math.ceil((videoFile.size || 0) / MAX_PART);
      
      const ab = await videoFile.arrayBuffer();
      const buf = Buffer.from(ab);
      const mimeType = videoFile.type || 'video/mp4';
      
      const parte1 = buf.subarray(0, MAX_PART);
      const part1Path = `cursos/${cursoId}/videos/${baseName}.part1`;
      const { error: upErr1 } = await supabase.storage.from(bucket).upload(part1Path, parte1, { contentType: mimeType });
      if (upErr1) throw upErr1;
      videoPath = part1Path;
      publicUrl = supabase.storage.from(bucket).getPublicUrl(part1Path).data.publicUrl;

      if (totalPartes >= 2) {
        const parte2 = buf.subarray(MAX_PART, MAX_PART * 2);
        const part2Path = `cursos/${cursoId}/videos/${baseName}.part2`;
        const { error: upErr2 } = await supabase.storage.from(bucket).upload(part2Path, parte2, { contentType: mimeType });
        if (upErr2) throw upErr2;
        videoPathParte2 = part2Path;
        publicUrlParte2 = supabase.storage.from(bucket).getPublicUrl(part2Path).data.publicUrl;
      }

      if (totalPartes >= 3) {
        const parte3 = buf.subarray(MAX_PART * 2, MAX_PART * 3);
        const part3Path = `cursos/${cursoId}/videos/${baseName}.part3`;
        const { error: upErr3 } = await supabase.storage.from(bucket).upload(part3Path, parte3, { contentType: mimeType });
        if (upErr3) throw upErr3;
        videoPathParte3 = part3Path;
        publicUrlParte3 = supabase.storage.from(bucket).getPublicUrl(part3Path).data.publicUrl;
      }

      if (totalPartes >= 4) {
        const parte4 = buf.subarray(MAX_PART * 3, MAX_PART * 4);
        const part4Path = `cursos/${cursoId}/videos/${baseName}.part4`;
        const { error: upErr4 } = await supabase.storage.from(bucket).upload(part4Path, parte4, { contentType: mimeType });
        if (upErr4) throw upErr4;
        videoPathParte4 = part4Path;
        publicUrlParte4 = supabase.storage.from(bucket).getPublicUrl(part4Path).data.publicUrl;
      }
    } else {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(videoPath, videoFile);
      if (uploadError) throw uploadError;
      publicUrl = supabase.storage.from(bucket).getPublicUrl(videoPath).data.publicUrl;
    }

    let { data: insertData2, error: insertError2 } = await supabase
      .from('clases_grabadas')
      .insert({
        curso_id: cursoId,
        titulo: titulo || 'Clase',
        descripcion: descripcion || null,
        fecha_clase: new Date().toISOString(),
        duracion_minutos: duracionMin ? parseInt(duracionMin) : 0,
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
        es_multipart: esMultipart,
        total_partes: totalPartes,
        archivo_original_nombre: fileName || videoFile.name,
        video_tamano_bytes: videoFile.size,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    if (insertError2) {
        throw insertError2;
    }
    claseRowId = String(insertData2?.id || '');
    const { data: videosActuales2, error: countError2 } = await supabase
      .from('clases_grabadas')
      .select('id, fecha_clase, video_path, video_path_parte2, video_path_parte3, video_path_parte4')
      .eq('curso_id', cursoId)
      .eq('activo', true)
      .order('fecha_clase', { ascending: true });

      if (countError2) {
          console.error("Error al contar videos para rotación:", countError2.message);
      } else if (Array.isArray(videosActuales2) && videosActuales2.length > 2) {
        const videoAEliminar = videosActuales2[0];
        const filesToDelete = [videoAEliminar.video_path, videoAEliminar.video_path_parte2, videoAEliminar.video_path_parte3, videoAEliminar.video_path_parte4].filter(Boolean);
        
        if (filesToDelete.length > 0) {
            const buckets = ['videos', 'materiales', 'clases-grabadas'];
            for (const b of buckets) {
                await supabase.storage.from(b).remove(filesToDelete);
            }
        }

        const { error: deleteDbError } = await supabase.from('clases_grabadas').delete().eq('id', videoAEliminar.id);
        if (deleteDbError) {
            console.error('Error al borrar la fila de la clase antigua:', deleteDbError.message);
        }
      }

    return NextResponse.json({
      success: true,
      videoPath,
      publicUrl,
      videoPathParte2,
      publicUrlParte2,
      claseId: claseRowId
    });

  } catch (error: any) {
    console.error('Error en upload video:', error);
    return NextResponse.json(
      { error: String(error?.message || error || 'Error al procesar el video') },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const isPublic = request.nextUrl.searchParams.get('public') === '1' || request.headers.get('x-public') === '1';
    const hasProfCookie = request.cookies.get('prof_code_ok')?.value === '1';
    if (!isPublic && !hasProfCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const cursoId = searchParams.get('cursoId');

    if (!cursoId) {
      return NextResponse.json({ error: 'Falta cursoId' }, { status: 400 });
    }

    try {
      const { data: clases, error } = await supabase
        .from('clases_grabadas')
        .select('*')
        .eq('curso_id', cursoId)
        .eq('activo', true)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      const totalBytes = clases.reduce((sum, clase) => sum + (Number(clase.video_tamano_bytes) || 0), 0);
      const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
  
      return NextResponse.json({
        clases: clases,
        totalClases: clases.length,
        totalBytes,
        totalGB: parseFloat(totalGB),
        limiteClases: 2,
        espacioDisponible: Math.max(0, 2 - clases.length)
      });
    } catch {
      return NextResponse.json({
        clases: [],
        totalClases: 0,
        totalBytes: 0,
        totalGB: 0,
        limiteClases: 2,
        espacioDisponible: 2
      });
    }

  } catch (error) {
    return NextResponse.json({
      clases: [],
      totalClases: 0,
      totalBytes: 0,
      totalGB: 0,
      limiteClases: 2,
      espacioDisponible: 2
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const hasProfCookie = request.cookies.get('prof_code_ok')?.value === '1';
    if (!hasProfCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    }

    // 1. Obtener detalles de la clase para eliminar los archivos
    const { data: clase, error: fetchError } = await supabase
      .from('clases_grabadas')
      .select('id, video_path, video_path_parte2, video_path_parte3, video_path_parte4, video_public_url')
      .eq('id', id)
      .single();

    if (fetchError || !clase) {
      return NextResponse.json({ error: fetchError?.message || 'Clase no encontrada' }, { status: 404 });
    }

    // 2. Eliminar archivos del storage (Best Effort)
    try {
        const filesToDelete = [clase.video_path, clase.video_path_parte2, clase.video_path_parte3, clase.video_path_parte4].filter(p => p && typeof p === 'string' && p.trim() !== '');

        if (filesToDelete.length > 0) {
            let deleted = false;
            
            if (clase.video_public_url) {
                const match = clase.video_public_url.match(/\/storage\/v1\/object\/public\/([^\/]+)\//);
                if (match && match[1]) {
                    const { error } = await supabase.storage.from(match[1]).remove(filesToDelete);
                    if (!error) deleted = true;
                }
            }

            if (!deleted) {
                 const buckets = ['videos', 'materiales', 'clases-grabadas'];
                 for (const b of buckets) {
                   await supabase.storage.from(b).remove(filesToDelete);
                 }
            }
        }
    } catch (storageError) {
        console.error('Error eliminando archivos de storage (ignorable):', storageError);
    }

    // 3. Borrar de la base de datos
    const { error } = await supabase
      .from('clases_grabadas')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en DELETE video:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
