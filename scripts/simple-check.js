const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzY5NTE2MTk1LCJleHAiOjIwODUwOTIxOTV9.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkInscripciones() {
  console.log('🔍 Verificando inscripciones en cursos_alumnos...\n');

  try {
    // 1. Contar inscripciones existentes
    const { count, error: countError } = await supabase
      .from('cursos_alumnos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Error contando inscripciones:', countError.message);
      return;
    }

    console.log(`📊 Total de inscripciones: ${count}`);

    // 2. Listar las últimas 5 inscripciones
    if (count > 0) {
      const { data: inscripciones, error: listError } = await supabase
        .from('cursos_alumnos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (listError) {
        console.log('❌ Error listando inscripciones:', listError.message);
      } else {
        console.log('\n📋 Últimas inscripciones:');
        inscripciones.forEach((ins, i) => {
          console.log(`${i + 1}. ${ins.user_id} -> ${ins.curso_id} (${ins.estado}) - ${ins.created_at}`);
        });
      }
    }

    // 3. Probar crear una inscripción
    console.log('\n🧪 Probando crear inscripción...');
    const testData = {
      user_id: 'test-user-' + Date.now(),
      curso_id: 'test-curso',
      estado: 'activo',
      created_at: new Date().toISOString()
    };

    const { data: nueva, error: insertError } = await supabase
      .from('cursos_alumnos')
      .insert(testData)
      .select();

    if (insertError) {
      console.log('❌ Error insertando:', insertError.message);
    } else {
      console.log('✅ Inscripción creada:', nueva[0].id);
      
      // Verificar persistencia
      setTimeout(async () => {
        console.log('🔍 Verificando persistencia después de 3 segundos...');
        const { data: verificada, error: verifyError } = await supabase
          .from('cursos_alumnos')
          .select('*')
          .eq('user_id', testData.user_id);

        if (verifyError) {
          console.log('❌ Error verificando:', verifyError.message);
        } else if (verificada && verificada.length > 0) {
          console.log('✅ La inscripción PERSISTE');
        } else {
          console.log('❌ La inscripción NO PERSISTIÓ');
        }
      }, 3000);
    }

  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

checkInscripciones();