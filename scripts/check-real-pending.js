const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRealPending() {
  console.log('--- BUSCANDO SOLICITUDES PENDIENTES REALES ---');

  // 1. Consultar tabla cursos_alumnos
  // Nota: cursos_alumnos puede no tener 'id' si es clave compuesta.
  const { data: pendientes, error } = await supabase
    .from('cursos_alumnos')
    .select('user_id, curso_id, estado, created_at')
    .eq('estado', 'pendiente');

  if (error) {
    console.error('Error consultando cursos_alumnos:', error);
  } else {
    console.log(`\nSolicitudes en 'cursos_alumnos' (Estado: pendiente): ${pendientes.length}`);
    pendientes.forEach(p => {
      console.log(` - User: ${p.user_id}, Curso: ${p.curso_id}, Fecha: ${p.created_at}`);
    });
  }

  // 2. Consultar tabla intereses (fallback)
  const { data: intereses, error: errInt } = await supabase
    .from('intereses')
    .select('*');

  if (errInt) {
    console.error('Error consultando intereses:', errInt);
  } else {
    console.log(`\nSolicitudes en 'intereses' (Emails): ${intereses.length}`);
    intereses.forEach(i => {
      console.log(` - Email: ${i.email}, Curso: ${i.course_id}, Fecha: ${i.created_at}`);
    });
  }
  
  // 3. Consultar usuarios recientes para ver si el usuario existe
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 10, sortBy: { field: 'created_at', order: 'desc'} });
  console.log('\nÚltimos 5 usuarios registrados:');
  users.slice(0, 5).forEach(u => {
      console.log(` - ${u.email} (ID: ${u.id}) - Creado: ${u.created_at}`);
  });
}

checkRealPending();
