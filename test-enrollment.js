const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const email = 'leonardomo2016@gmail.com';
const cursoId = '9dd98f3c-3d8a-433e-9350-33a4f416fef5';

async function test() {
  const { data: profile } = await s.from('profiles').select('id').eq('email', email).maybeSingle();
  console.log('PROFILE:', profile);

  if (profile) {
    const { data: insc } = await s.from('cursos_alumnos')
      .select('*')
      .eq('user_id', profile.id)
      .eq('curso_id', cursoId);
    console.log('INSCRIPCION:', JSON.stringify(insc, null, 2));
  }
}

test();
