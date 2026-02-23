const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- 1. Arreglando tabla intereses (Inscripciones) ---');
  // Intentamos agregar la constraint. Si falla porque existe, no pasa nada.
  // Usamos una función RPC si existe exec_sql, o intentamos una inserción dummy para probar comportamiento,
  // pero lo mejor es intentar alterar la tabla si tenemos permisos de admin via SQL editor...
  // Como no tenemos acceso directo a SQL editor via API client normal (salvo RPC 'exec_sql'),
  // vamos a verificar si tenemos una función 'exec_sql' disponible (vi scripts previos intentando crearla).
  
  // Vamos a intentar llamar a exec_sql
  const { error: rpcError } = await supabase.rpc('exec_sql', { 
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intereses_email_course_id_key') THEN
          ALTER TABLE intereses ADD CONSTRAINT intereses_email_course_id_key UNIQUE (email, course_id);
        END IF;
      END
      $$;
    ` 
  });

  if (rpcError) {
    console.log('No se pudo ejecutar SQL directo (probablemente falta la función exec_sql):', rpcError.message);
    console.log('Intentando método alternativo: Verificar duplicados manualmente...');
  } else {
    console.log('SQL ejecutado correctamente (Constraint UNIQUE asegurada).');
  }

  console.log('\n--- 2. Diagnóstico de Clases Grabadas ---');
  // Obtener todos los cursos
  const { data: cursos } = await supabase.from('cursos').select('id, titulo').limit(5);
  console.log('Cursos encontrados:', cursos ? cursos.length : 0);
  if (cursos) cursos.forEach(c => console.log(` - [${c.id}] ${c.titulo}`));

  // Ver clases grabadas
  const { data: clases, error: clasesError } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, curso_id, activo, video_path')
    .limit(10);
  
  if (clasesError) {
    console.error('Error al leer clases_grabadas:', clasesError.message);
  } else {
    console.log(`\nClases grabadas encontradas: ${clases.length}`);
    clases.forEach(c => {
      console.log(` - [${c.id}] Curso: ${c.curso_id} | Título: ${c.titulo} | Activo: ${c.activo} | Path: ${c.video_path}`);
    });
    
    if (clases.length === 0) {
      console.log('¡ALERTA! No hay clases grabadas en la base de datos.');
    }
  }

  console.log('\n--- 3. Verificando usuarios recientes e inscripciones ---');
  // Listar últimos usuarios
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });
  if (users) {
    for (const u of users) {
      console.log(`Usuario: ${u.email} (${u.id})`);
      // Ver inscripciones
      const { data: insc } = await supabase.from('cursos_alumnos').select('*').eq('user_id', u.id);
      console.log(`  Inscripciones: ${insc ? insc.length : 0}`);
      if (insc) insc.forEach(i => console.log(`    - Curso: ${i.curso_id} | Estado: ${i.estado}`));
    }
  }
}

run();
