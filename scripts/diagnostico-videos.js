// Script de diagnóstico para verificar problemas con videos multipart
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticar() {
  console.log('🔍 Iniciando diagnóstico de videos multipart...\n');

  // 1. Verificar si hay clases grabadas activas
  console.log('1. 📋 Verificando clases grabadas activas...');
  const { data: clases, error: clasesError } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('activo', true)
    .eq('es_activo', true)
    .limit(5);

  if (clasesError) {
    console.error('❌ Error al obtener clases:', clasesError);
    return;
  }

  if (!clases || clases.length === 0) {
    console.log('ℹ️ No hay clases grabadas activas');
    return;
  }

  console.log(`✅ Encontradas ${clases.length} clases activas`);

  // 2. Verificar URLs de cada clase
  for (const clase of clases) {
    console.log(`\n📹 Clase: ${clase.titulo} (ID: ${clase.id})`);
    console.log(`   Curso ID: ${clase.curso_id}`);
    console.log(`   Multipart: ${clase.es_multipart ? '✅ Sí' : '❌ No'}`);
    console.log(`   Total partes: ${clase.total_partes || 1}`);
    
    // Verificar URLs existentes
    const urls = [
      { nombre: 'URL Parte 1', url: clase.video_public_url },
      { nombre: 'URL Parte 2', url: clase.video_public_url_parte2 },
      { nombre: 'URL Parte 3', url: clase.video_public_url_parte3 },
      { nombre: 'URL Parte 4', url: clase.video_public_url_parte4 }
    ];

    for (const { nombre, url } of urls) {
      if (url) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          console.log(`   ${nombre}: ${response.ok ? '✅ Accesible' : '❌ Inaccesible'} (${response.status})`);
        } catch (error) {
          console.log(`   ${nombre}: ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`   ${nombre}: ❌ No definida`);
      }
    }

    // Verificar paths de almacenamiento
    const paths = [
      { nombre: 'Path Parte 1', path: clase.video_path },
      { nombre: 'Path Parte 2', path: clase.video_path_parte2 },
      { nombre: 'Path Parte 3', path: clase.video_path_parte3 },
      { nombre: 'Path Parte 4', path: clase.video_path_parte4 }
    ];

    for (const { nombre, path } of paths) {
      if (path) {
        // Intentar obtener URL pública
        try {
          const { data: publicData } = await supabase.storage.from('videos').getPublicUrl(path);
          const response = await fetch(publicData.publicUrl, { method: 'HEAD' });
          console.log(`   ${nombre}: ${response.ok ? '✅ Accesible' : '❌ Inaccesible'} (${response.status})`);
        } catch (error) {
          console.log(`   ${nombre}: ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`   ${nombre}: ❌ No definido`);
      }
    }
  }

  // 3. Verificar políticas RLS
  console.log('\n3. 🔐 Verificando políticas RLS...');
  
  // Verificar si hay alumnos inscritos en los cursos de las clases
  for (const clase of clases) {
    const { data: inscripciones, error: inscError } = await supabase
      .from('cursos_alumnos')
      .select('user_id')
      .eq('curso_id', clase.curso_id)
      .eq('estado', 'activo');

    if (inscError) {
      console.log(`   Curso ${clase.curso_id}: ❌ Error RLS: ${inscError.message}`);
    } else if (inscripciones && inscripciones.length > 0) {
      console.log(`   Curso ${clase.curso_id}: ✅ ${inscripciones.length} alumnos activos`);
    } else {
      console.log(`   Curso ${clase.curso_id}: ⚠️ Sin alumnos activos`);
    }
  }

  console.log('\n✅ Diagnóstico completado');
}

diagnosticar().catch(console.error);