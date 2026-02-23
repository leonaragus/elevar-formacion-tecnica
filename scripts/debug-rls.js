const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function debugRLS() {
  console.log('--- DEBUG RLS CLASES GRABADAS ---');
  
  const userId = 'ba98672f-de13-451b-b7f4-de0149b98fdd';
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';

  // 1. Obtener definición de políticas
  console.log('\n1. Políticas RLS en clases_grabadas:');
  const { data: policies, error: polError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', 'clases_grabadas');
  
  if (polError) console.error(polError);
  else console.table(policies);

  // 2. Verificar tipos de columnas
  console.log('\n2. Tipos de columnas (curso_id):');
  const { data: columns } = await supabase.rpc('exec_sql', { 
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clases_grabadas' AND column_name = 'curso_id'" 
  });
  // Note: exec_sql might not return data directly depending on implementation, but let's try or use direct query if possible.
  // Actually, we can't query information_schema easily with js client unless we use rpc or just check a row.
  
  const { data: sample } = await supabase.from('clases_grabadas').select('curso_id').limit(1);
  if (sample && sample.length > 0) {
      console.log('Sample curso_id type:', typeof sample[0].curso_id, 'Value:', sample[0].curso_id);
  }

  // 3. SIMULACIÓN DE ACCESO
  // Vamos a usar una función RPC personalizada para simular el usuario y hacer el select
  console.log('\n3. Simulando SELECT como el usuario...');
  
  const simSql = `
    set local role authenticated;
    set local "request.jwt.claim.sub" to '${userId}';
    select id, titulo, curso_id, activo from clases_grabadas where curso_id = '${cursoId}';
  `;

  // Necesitamos una función que ejecute SQL y retorne resultados.
  // Si 'exec_sql' devuelve void, no nos sirve para ver resultados.
  // Crearemos una función temporal 'test_access'
  
  const createFuncSql = `
    create or replace function test_access_clases(uid uuid, cid text)
    returns table (id uuid, titulo text, curso_id text, activo boolean)
    language plpgsql
    security definer
    as $$
    begin
      -- Simular contexto de usuario
      perform set_config('role', 'authenticated', true);
      perform set_config('request.jwt.claim.sub', uid::text, true);
      
      return query
      select c.id, c.titulo, c.curso_id::text, c.activo 
      from clases_grabadas c
      where c.curso_id = cid;
    end;
    $$;
  `;

  // Crear la función
  await supabase.rpc('exec_sql', { sql: createFuncSql });

  // Ejecutar la función
  const { data: accessResult, error: accessError } = await supabase.rpc('test_access_clases', { 
    uid: userId, 
    cid: cursoId 
  });

  if (accessError) {
    console.error('Error en simulación:', accessError);
  } else {
    console.log(`Resultados vistos por el usuario (${accessResult.length}):`);
    console.table(accessResult);
    
    if (accessResult.length === 0) {
        console.log('⚠️  EL USUARIO NO VE LAS CLASES. RLS BLOQUEANDO.');
        
        // Debug por qué bloquea
        console.log('\nDiagnóstico de bloqueo:');
        console.log('Chequeando existencia en cursos_alumnos...');
        
        const debugSql = `
            select count(*) from cursos_alumnos 
            where user_id = '${userId}' 
            and curso_id = '${cursoId}' 
            and estado = 'activo';
        `;
        // We can't easily get result from exec_sql if it returns void.
        // But we trusted inspect-enrollment.js which used service role.
        // The issue must be the casting in the policy.
        // "cursos_alumnos.curso_id::text = clases_grabadas.curso_id::text"
    } else {
        console.log('✅ El usuario DEBERÍA ver las clases. El problema puede estar en el frontend (fetch).');
    }
  }
}

debugRLS();
