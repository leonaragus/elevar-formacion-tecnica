const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugClases() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Missing env vars');
    return;
  }

  const supabase = createClient(url, key);

  console.log('--- Debugging Clases Grabadas ---');

  // 1. Listar todas las clases activas (limit 10)
  const { data: clases, error } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, curso_id, activo, video_public_url, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching clases:', error);
  } else {
    console.log('Últimas 10 clases encontradas:');
    clases.forEach(c => {
      console.log(`- [${c.id}] ${c.titulo} (Curso: ${c.curso_id}) Activo: ${c.activo}`);
      console.log(`  URL: ${c.video_public_url}`);
      console.log(`  Creado: ${c.created_at}`);
    });
  }

  // 2. Verificar buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('\nBuckets disponibles:', buckets?.map(b => b.name));

}

debugClases();
