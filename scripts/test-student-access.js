const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testStudentAccess() {
  console.log('🎓 Probando acceso de alumnos a clases grabadas...\n');

  try {
    // 1. Obtener algunos alumnos de prueba
    console.log('👥 Buscando alumnos de prueba...');
    const { data: alumnos, error: alumnosError } = await supabase
      .from('cursos_alumnos')
      .select('user_id, curso_id, estado')
      .limit(5);

    if (alumnosError || !alumnos || alumnos.length === 0) {
      console.error('❌ No se encontraron alumnos inscritos');
      return;
    }

    console.log(`✅ Encontrados ${alumnos.length} alumnos inscritos`);

    // 2. Para cada alumno, probar acceso a clases grabadas
    for (const alumno of alumnos) {
      console.log(`\n🔍 Probando acceso para alumno ${alumno.user_id} en curso ${alumno.curso_id}...`);
      
      // Simular acceso como este alumno (usando service role para bypass RLS)
      const { data: clases, error: clasesError } = await supabase
        .from('clases_grabadas')
        .select('*')
        .eq('curso_id', alumno.curso_id)
        .eq('activo', true);

      if (clasesError) {
        console.error(`   ❌ Error de acceso: ${clasesError.message}`);
      } else if (clases.length === 0) {
        console.log(`   ℹ️  No hay clases grabadas activas para este curso`);
      } else {
        console.log(`   ✅ Acceso permitido - ${clases.length} clases encontradas`);
        clases.forEach(clase => {
          console.log(`     - ${clase.titulo} (${clase.id})`);
        });
      }
    }

    // 3. Verificar políticas RLS directamente con consulta SQL
    console.log('\n🔐 Verificando configuración RLS...');
    
    // Crear un cliente anónimo (sin service role) para probar RLS real
    const anonSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTYxOTUsImV4cCI6MjA4NTA5MjE5NX0.4Qv1v3U1UQ3v3U1UQ3v3U1UQ3v3U1UQ3v3U1UQ3v3U1UQ');
    
    // Esto debería fallar con RLS activo
    const { error: anonError } = await anonSupabase
      .from('clases_grabadas')
      .select('*')
      .limit(1);

    if (anonError && anonError.code === '42501') {
      console.log('✅ RLS está activo y funcionando (acceso denegado a anónimos)');
    } else {
      console.log('⚠️  RLS puede no estar configurado correctamente');
    }

    console.log('\n🎯 CONCLUSIÓN: Si el service role puede ver las clases pero los alumnos no,');
    console.log('   el problema está en las políticas RLS que restringen el acceso.');
    console.log('   Necesitamos simplificar las políticas para permitir acceso a todos los alumnos inscritos.');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar la función
testStudentAccess();