import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

function env(name, optional = false) {
  const v = process.env[name];
  if (!v && !optional) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return v;
}

function nowISO() {
  return new Date().toISOString();
}

async function ensureUser(supabase, email) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found;
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (cErr) throw cErr;
  return created.user;
}

async function countRows(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return { count: 0, error: error.message };
  return { count: count || 0, error: null };
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE || env('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log('--- Verificando estado inicial ---');
  const tables = ['cursos', 'clases_grabadas', 'cursos_alumnos'];
  for (const t of tables) {
    try {
      const { count, error } = await countRows(supabase, t);
      if (error) {
        console.log(`Tabla ${t}: ERROR (${error})`);
      } else {
        console.log(`Tabla ${t}: ${count} filas`);
      }
    } catch (e) {
      console.log(`Tabla ${t}: ERROR (${e?.message || String(e)})`);
    }
  }
  try {
    const { data } = await supabase.from('cursos').select('id,titulo').order('orden', { ascending: true }).limit(20);
    if (Array.isArray(data)) {
      console.log('Cursos existentes:');
      for (const r of data) {
        console.log(`- ${r.id}: ${r.titulo}`);
      }
    }
  } catch {}

  const cursos = [
    {
      id: 'liquidacion-de-sueldos',
      titulo: 'Liquidación de Sueldos',
      descripcion: 'Curso práctico sobre liquidación de sueldos y normativa vigente.',
      duracion: '6 meses',
      modalidad: 'virtual',
      categoria: 'RRHH',
      nivel: 'inicial',
      precio: 0,
      estado: 'activo',
      orden: 1,
    },
    {
      id: 'gestion-documental',
      titulo: 'Diplomatura en Gestión y Control Documental',
      descripcion: 'Aprende a gestionar documentación técnica y legal de forma profesional.',
      duracion: '6 meses',
      modalidad: 'virtual',
      categoria: 'Administración',
      nivel: 'inicial',
      precio: 0,
      estado: 'activo',
      orden: 2,
    },
  ];

  console.log('--- Upsert de cursos ---');
  try {
    for (const c of cursos) {
      const { error: upErr } = await supabase
        .from('cursos')
        .upsert(c, { onConflict: 'id' });
      if (upErr) {
        console.log(`Curso ${c.id}: ERROR al upsert (${upErr.message})`);
      } else {
        console.log(`Curso ${c.id}: ok`);
      }
    }
  } catch (e) {
    console.log('Error upsert cursos:', e?.message || String(e));
  }

  let gestionCursoId = null;
  try {
    const { data: prefer } = await supabase.from('cursos').select('id,titulo').ilike('titulo', '%Liquidación%Sueldos%').limit(1);
    if (Array.isArray(prefer) && prefer.length > 0) gestionCursoId = prefer[0].id;
    if (!gestionCursoId) {
      const { data: anyCourse } = await supabase.from('cursos').select('id,titulo').order('orden', { ascending: true }).limit(1);
      if (Array.isArray(anyCourse) && anyCourse.length > 0) gestionCursoId = anyCourse[0].id;
    }
  } catch {}

  console.log('--- Insert de clase grabada demo ---');
  const demoVideo = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  try {
    if (!gestionCursoId) {
      console.log('No se pudo resolver el ID del curso "gestion-documental".');
    }
    const { data: existing } = await supabase
      .from('clases_grabadas')
      .select('id')
      .eq('curso_id', gestionCursoId || 'gestion-documental')
      .ilike('titulo', '%Introducción%')
      .limit(1);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log('Clase demo ya existe, saltando.');
    } else if (gestionCursoId) {
      const payload = {
        curso_id: gestionCursoId,
        titulo: 'Clase 1: Introducción – Gestión Documental',
        video_public_url: demoVideo,
        video_path: 'demo/bigbuckbunny.mp4',
        es_activo: true,
        activo: true,
        orden: 1,
        fecha_clase: nowISO(),
        es_multipart: false,
        total_partes: 1,
        archivo_original_nombre: 'demo-introduccion.mp4',
      };
      const { error: insErr } = await supabase.from('clases_grabadas').insert(payload);
      if (insErr) {
        console.log('Error insert clase demo:', insErr.message);
      } else {
        console.log('Clase demo insertada.');
      }
    } else {
      console.log('Saltando creación de clase demo por falta de cursoId.');
    }
  } catch (e) {
    console.log('Error en clase grabada demo:', e?.message || String(e));
  }

  console.log('--- Usuario demo e inscripción ---');
  const demoEmail = 'demo.alumno@elevar.edu';
  try {
    const user = await ensureUser(supabase, demoEmail);
    console.log(`Usuario demo: ${user.id} (${user.email})`);
    const { data: insc } = await supabase
      .from('cursos_alumnos')
      .select('id, estado')
      .eq('user_id', user.id)
      .eq('curso_id', gestionCursoId || 'gestion-documental')
      .limit(1);
    if (Array.isArray(insc) && insc.length > 0) {
      console.log('Inscripción demo ya existe.');
    } else if (gestionCursoId) {
      const { error: insErr } = await supabase.from('cursos_alumnos').insert({
        user_id: user.id,
        curso_id: gestionCursoId,
        estado: 'activo',
      });
      if (insErr) {
        console.log('Error insert inscripción demo:', insErr.message);
      } else {
        console.log('Inscripción demo creada (activo).');
      }
    } else {
      console.log('Saltando inscripción demo por falta de cursoId.');
    }
  } catch (e) {
    console.log('Error creando usuario/inscripción demo:', e?.message || String(e));
  }

  console.log('--- Verificando estado final ---');
  for (const t of tables) {
    try {
      const { count, error } = await countRows(supabase, t);
      if (error) {
        console.log(`Tabla ${t}: ERROR (${error})`);
      } else {
        console.log(`Tabla ${t}: ${count} filas`);
      }
    } catch (e) {
      console.log(`Tabla ${t}: ERROR (${e?.message || String(e)})`);
    }
  }

  console.log('--- Seed finalizado ---');
  console.log('Para probar como alumno:');
  console.log('- Ir a /auth e ingresar el email demo.alumno@elevar.edu');
  console.log('- Deberías ver el curso y la clase demo en /mis-clases');
}

main().catch(e => {
  console.error('Error fatal en seed:', e);
  process.exit(1);
});
