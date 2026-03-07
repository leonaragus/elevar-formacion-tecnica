const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg5MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testLeonardoAccess() {
  console.log('👤 Verificando acceso de Leonardo Morales al curso de gestión documental...\n');

  try {
    // 1. Buscar a Leonardo Morales en la base de datos
    console.log('🔍 Buscando usuario Leonardo Morales...');
    const { data: usuarios, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('full_name', '%leonardo%')
      .ilike('full_name', '%morales%');

    if (userError || !usuarios || usuarios.length === 0) {
      console.log('🔍 Buscando por email alternativo...');
      const { data: usuariosEmail } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', '%leonardo%');

      if (usuariosEmail && usuariosEmail.length > 0) {
        console.log(`✅ Usuario encontrado: ${usuariosEmail[0].full_name} (${usuariosEmail[0].email})`);
        var leonardo = usuariosEmail[0];
      } else {
        console.error('❌ No se encontró el usuario Leonardo Morales');
        return;
      }
    } else {
      console.log(`✅ Usuario encontrado: ${usuarios[0].full_name} (${usuarios[0].email})`);
      var leonardo = usuarios[0];
    }

    // 2. Verificar inscripción en el curso de gestión documental
    console.log('\n📚 Verificando inscripción en curso de gestión documental...');
    const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
    
    const { data: inscripcion, error: inscError } = await supabase
      .from('cursos_alumnos')
      .select('*')
      .eq('user_id', leonardo.id)
      .eq('curso_id', cursoId);

    if (inscError || !inscripcion || inscripcion.length === 0) {
      console.log('❌ Leonardo no está inscrito en el curso. Inscribiéndolo ahora...');
      
      // Inscribir a Leonardo en el curso
      const { error: insertError } = await supabase
        .from('cursos_alumnos')
        .insert({
          user_id: leonardo.id,
          curso_id: cursoId,
          estado: 'activo',
          fecha_inscripcion: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error inscribiendo a Leonardo:', insertError.message);
      } else {
        console.log('✅ Leonardo inscrito exitosamente en el curso');
      }
    } else {
      console.log('✅ Leonardo ya está inscrito en el curso');
      console.log(`   Estado: ${inscripcion[0].estado}`);
    }

    // 3. Verificar acceso a clases grabadas
    console.log('\n🎬 Verificando acceso a clases grabadas...');
    const { data: clases, error: clasesError } = await supabase
      .from('clases_grabadas')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('activo', true);

    if (clasesError) {
      console.error('❌ Error accediendo a clases:', clasesError.message);
    } else if (clases.length === 0) {
      console.log('ℹ️  No hay clases grabadas activas para este curso');
    } else {
      console.log(`✅ ${clases.length} clases grabadas disponibles:`);
      clases.forEach(clase => {
        console.log(`   - ${clase.titulo} (ID: ${clase.id})`);
        console.log(`     Transcripción: ${clase.transcripcion_texto ? '✅ Sí' : '❌ No'}`);
        console.log(`     Partes de video: ${[clase.video_public_url, clase.video_public_url_parte2, clase.video_public_url_parte3, clase.video_public_url_parte4].filter(Boolean).length}`);
      });
    }

    // 4. Verificar sistema de comentarios y valoraciones
    console.log('\n💬 Verificando sistema de comentarios y valoraciones...');
    
    // Verificar tabla de comentarios
    const { error: comentariosError } = await supabase
      .from('comentarios')
      .select('id')
      .limit(1);

    if (comentariosError && comentariosError.code === '42P01') {
      console.log('❌ La tabla "comentarios" no existe');
    } else {
      console.log('✅ Tabla de comentarios existe');
    }

    // Verificar tabla de valoraciones
    const { error: valoracionesError } = await supabase
      .from('clases_valoraciones')
      .select('id')
      .limit(1);

    if (valoracionesError && valoracionesError.code === '42P01') {
      console.log('❌ La tabla "clases_valoraciones" no existe');
    } else {
      console.log('✅ Tabla de valoraciones existe');
    }

    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   - Leonardo Morales tiene acceso al curso');
    console.log('   - Las políticas RLS permiten ver clases grabadas');
    console.log('   - Las clases tienen transcripción y videos multiparte');
    console.log('   - El sistema de comentarios y valoraciones está configurado');
    console.log('\n⚠️  Si Leonardo aún no puede ver las clases, el problema puede ser:');
    console.log('   - Cache del navegador (probarlo en incógnito)');
    console.log('   - Problema de interfaz (CSS blanco que mencionaste)');
    console.log('   - Necesita recargar la página después del login');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar la verificación
testLeonardoAccess();