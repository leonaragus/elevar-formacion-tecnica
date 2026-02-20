const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await s.rpc('get_table_columns', { table_name: 'push_subscriptions' });
  if (error) {
    // Si el RPC no existe, intentamos una consulta directa a information_schema
    const { data: cols, error: err2 } = await s.from('push_subscriptions').select().limit(0);
    console.log('COLUMNAS:', Object.keys(cols?.[0] || {}));
    console.log('ERROR:', err2);
  } else {
    console.log('COLUMNS:', data);
  }
}

test();
