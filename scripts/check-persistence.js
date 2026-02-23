const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTriggers() {
  console.log('--- BUSCANDO TRIGGERS O POLICIES QUE BORREN DATOS ---');

  // 1. Ver definición de tabla cursos_alumnos (simulado con query)
  // No podemos ver DDL directo, pero podemos ver si hay RLS policies que impidan insert
  
  // 2. Intentar insertar un registro de prueba y ver si persiste
  const testUserId = '1eebb930-d6ed-454b-869f-3854ed259c7d'; // ID generado en test anterior
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  
  console.log(`\nPrueba de persistencia para User: ${testUserId}, Curso: ${cursoId}`);
  
  // Insertar
  const { data: insertData, error: insertError } = await supabase
    .from('cursos_alumnos')
    .insert({
      user_id: testUserId,
      curso_id: cursoId,
      estado: 'pendiente',
      created_at: new Date().toISOString()
    })
    .select();
    
  if (insertError) {
      console.error('❌ Error al insertar:', insertError);
  } else {
      console.log('✅ Insertado correctamente:', insertData);
      
      // Esperar 2 segundos y verificar si sigue ahí
      console.log('Esperando 2 segundos para verificar persistencia...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: checkData, error: checkError } = await supabase
        .from('cursos_alumnos')
        .select('*')
        .eq('user_id', testUserId)
        .eq('curso_id', cursoId);
        
      if (checkError || checkData.length === 0) {
          console.error('❌ EL REGISTRO DESAPARECIÓ! Posible trigger o RLS issue.', checkError);
      } else {
          console.log('✅ El registro persiste correctamente.');
          
          // Limpiar
          await supabase.from('cursos_alumnos').delete().eq('user_id', testUserId);
          console.log('🧹 Registro de prueba eliminado.');
      }
  }
}

checkTriggers();
