const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findLeonardo() {
  console.log('🔍 Buscando a Leonardo Morales en todas las tablas de usuarios...\n');

  try {
    // 1. Buscar en la tabla 'profiles'
    console.log('📋 Buscando en tabla "profiles"...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .or('full_name.ilike.%leonardo%,full_name.ilike.%morales%,email.ilike.%leonardo%')
      .limit(10);

    if (profilesError) {
      console.log('❌ Error en profiles:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      console.log(`✅ ${profiles.length} usuarios encontrados en profiles:`);
      profiles.forEach(user => {
        console.log(`   - ${user.full_name} (${user.email}) - ${user.id}`);
      });
    } else {
      console.log('ℹ️  No se encontraron usuarios en profiles');
    }

    // 2. Buscar en la tabla 'auth.users' (si es accesible)
    console.log('\n📋 Buscando en tabla "auth.users"...');
    try {
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email, raw_user_meta_data, created_at')
        .or('email.ilike.%leonardo%,raw_user_meta_data->>\'full_name\'.ilike.%leonardo%')
        .limit(10);

      if (authError) {
        console.log('❌ No se puede acceder a auth.users directamente');
      } else if (authUsers && authUsers.length > 0) {
        console.log(`✅ ${authUsers.length} usuarios encontrados en auth.users:`);
        authUsers.forEach(user => {
          const fullName = user.raw_user_meta_data?.full_name || 'Sin nombre';
          console.log(`   - ${fullName} (${user.email}) - ${user.id}`);
        });
      } else {
        console.log('ℹ️  No se encontraron usuarios en auth.users');
      }
    } catch (e) {
      console.log('❌ No se puede acceder a auth.users:', e.message);
    }

    // 3. Buscar en la tabla 'usuarios' (si existe)
    console.log('\n📋 Buscando en tabla "usuarios"...');
    try {
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, email, nombre, apellido, rol, created_at')
        .or('nombre.ilike.%leonardo%,apellido.ilike.%morales%,email.ilike.%leonardo%')
        .limit(10);

      if (usuariosError) {
        console.log('❌ La tabla "usuarios" no existe o no es accesible');
      } else if (usuarios && usuarios.length > 0) {
        console.log(`✅ ${usuarios.length} usuarios encontrados en usuarios:`);
        usuarios.forEach(user => {
          const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim();
          console.log(`   - ${nombreCompleto} (${user.email}) - ${user.rol} - ${user.id}`);
        });
      } else {
        console.log('ℹ️  No se encontraron usuarios en la tabla usuarios');
      }
    } catch (e) {
      console.log('❌ Error accediendo a tabla usuarios:', e.message);
    }

    // 4. Listar todos los usuarios en cursos_alumnos para ver inscripciones
    console.log('\n📋 Usuarios inscritos en cursos (cursos_alumnos)...');
    const { data: alumnos, error: alumnosError } = await supabase
      .from('cursos_alumnos')
      .select('user_id, curso_id, estado, created_at')
      .limit(10);

    if (alumnosError) {
      console.log('❌ Error accediendo a cursos_alumnos:', alumnosError.message);
    } else if (alumnos && alumnos.length > 0) {
      console.log(`✅ ${alumnos.length} inscripciones encontradas:`);
      
      // Obtener información de los usuarios
      for (const alumno of alumnos) {
        const { data: userInfo } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', alumno.user_id)
          .single();

        const userName = userInfo ? userInfo.full_name : `Usuario ${alumno.user_id}`;
        const userEmail = userInfo ? userInfo.email : 'Sin email';
        
        console.log(`   - ${userName} (${userEmail}) -> Curso: ${alumno.curso_id}, Estado: ${alumno.estado}`);
      }
    } else {
      console.log('ℹ️  No hay inscripciones en cursos_alumnos');
    }

    console.log('\n🎯 Si Leonardo Morales no aparece en la lista, necesitamos:');
    console.log('   1. Crear su usuario en auth.users (registro normal)');
    console.log('   2. Inscribirlo en el curso de gestión documental');
    console.log('   3. Asegurar que tenga acceso a las clases');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar la búsqueda
findLeonardo();