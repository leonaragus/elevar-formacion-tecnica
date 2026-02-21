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
    const fileBuffer = fs.readFileSync(tmpPath);
    const MAX_PART = 45 * 1024 * 1024;
    const mimeType = chunkFile.type || 'video/mp4';
    const bucket = await pickBucket(supabase, Math.min(fileBuffer.byteLength, MAX_PART));
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
    if (fileBuffer.byteLength > MAX_PART) {
      if (fileBuffer.byteLength > MAX_PART * 4) {
        fs.unlinkSync(tmpPath);
        return NextResponse.json({ 
          error: 'El archivo supera el límite permitido para dividir en 4 partes (≈180MB). Comprimí el video o subilo en menor calidad.' 
        }, { status: 413 });
      }
      esMultipart = true;
      totalPartes = Math.ceil(fileBuffer.byteLength / MAX_PART);
      
      const parte1 = fileBuffer.subarray(0, MAX_PART);
      const part1Path = `cursos/${cursoId}/videos/${baseName}.part1`;
      const { error: upErr1 } = await supabase.storage.from(bucket).upload(part1Path, parte1, { contentType: mimeType });
      if (upErr1) throw upErr1;
      videoPath = part1Path;
      publicUrl = supabase.storage.from(bucket).getPublicUrl(part1Path).data.publicUrl;

      if (totalPartes >= 2) {
        const parte2 = fileBuffer.subarray(MAX_PART, MAX_PART * 2);
        const part2Path = `cursos/${cursoId}/videos/${baseName}.part2`;
        const { error: upErr2 } = await supabase.storage.from(bucket).upload(part2Path, parte2, { contentType: mimeType });
        if (upErr2) throw upErr2;
        videoPathParte2 = part2Path;
        publicUrlParte2 = supabase.storage.from(bucket).getPublicUrl(part2Path).data.publicUrl;
      }

      if (totalPartes >= 3) {
        const parte3 = fileBuffer.subarray(MAX_PART * 2, MAX_PART * 3);
        const part3Path = `cursos/${cursoId}/videos/${baseName}.part3`;
        const { error: upErr3 } = await supabase.storage.from(bucket).upload(part3Path, parte3, { contentType: mimeType });
        if (upErr3) throw upErr3;
        videoPathParte3 = part3Path;
        publicUrlParte3 = supabase.storage.from(bucket).getPublicUrl(part3Path).data.publicUrl;
      }

      if (totalPartes >= 4) {
        const parte4 = fileBuffer.subarray(MAX_PART * 3, MAX_PART * 4);
        const part4Path = `cursos/${cursoId}/videos/${baseName}.part4`;
        const { error: upErr4 } = await supabase.storage.from(bucket).upload(part4Path, parte4, { contentType: mimeType });
        if (upErr4) throw upErr4;
        videoPathParte4 = part4Path;
        publicUrlParte4 = supabase.storage.from(bucket).getPublicUrl(part4Path).data.publicUrl;
      }
    } else {
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
        video_tamano_bytes: fileBuffer.byteLength,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    if (insertError) {
      const fallback = await supabase
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
          video_tamano_bytes: fileBuffer.byteLength,
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
      insertData = fallback.data;
      insertError = fallback.error;
      if (insertError) throw insertError;
    }
    claseRowId = String(insertData?.id || '');
      const { data: videosActuales, error: countError } = await supabase
        .from('clases_grabadas')
        .select('id, video_path, orden')
        .eq('curso_id', cursoId)
        .eq('activo', true)
        .order('orden', { ascending: true });
      if (countError) throw countError;
      let videoAEliminar: any = null;
      if (Array.isArray(videosActuales) && videosActuales.length > 2) {
        videoAEliminar = videosActuales[0];
      }
      if (videoAEliminar) {
        const { error: updateError } = await supabase
          .from('clases_grabadas')
          .update({ 
            activo: false, 
            es_activo: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', videoAEliminar.id);
        if (!updateError) {
          const toRemove = [videoAEliminar.video_path];
          if ((videoAEliminar as any).video_path_parte2) {
            toRemove.push((videoAEliminar as any).video_path_parte2);
          }
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove(toRemove);
        }
      }
      return NextResponse.json({
        success: true,
        videoPath,
        publicUrl,
        videoEliminado: videoAEliminar ? videoAEliminar.id : null,
        claseId: claseRowId
      });
    }

    const videoFile = formData.get('video') as File;
    if (!videoFile) {
      return NextResponse.json({ error: 'Falta video' }, { status: 400 });
    }
    let videoAEliminar: any = null;

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
      const fallback2 = await supabase
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
          video_tamano_bytes: videoFile.size,
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
      insertData2 = fallback2.data;
      insertError2 = fallback2.error;
      if (insertError2) throw insertError2;
    }
    claseRowId = String(insertData2?.id || '');
    const { data: videosActuales2 } = await supabase
      .from('clases_grabadas')
      .select('id, video_path, orden')
      .eq('curso_id', cursoId)
      .eq('activo', true)
      .order('orden', { ascending: true });
    if (Array.isArray(videosActuales2) && videosActuales2.length > 2) {
      videoAEliminar = videosActuales2[0];
      const { error: updateError2 } = await supabase
        .from('clases_grabadas')
        .update({ activo: false, es_activo: false, updated_at: new Date().toISOString() })
        .eq('id', videoAEliminar.id);
      if (!updateError2) {
        const toRemove = [videoAEliminar.video_path];
        if ((videoAEliminar as any).video_path_parte2) {
          toRemove.push((videoAEliminar as any).video_path_parte2);
        }
        const { error: deleteError2 } = await supabase.storage
          .from(bucket)
          .remove(toRemove);
      }
    }

    return NextResponse.json({
      success: true,
      videoPath,
      publicUrl,
      videoPathParte2,
      publicUrlParte2,
      videoEliminado: videoAEliminar ? videoAEliminar.id : null,
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
    const { error } = await supabase
      .from('clases_grabadas')
      .update({ activo: false, es_activo: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
