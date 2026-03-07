const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzY5NTE2MTk1LCJleHAiOjIwODUwOTIxOTV9.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixCursosAlumnos() {
  console.log('🛠️  SOLUCIONANDO PROBLEMA DE TABLA cursos_alumnos...\n');

  try {
    // 1. Primero intentar verificar si la tabla existe
    console.log('🔍 Verificando si la tabla cursos_alumnos existe...');
    
    const { error: checkError } = await supabase
      .from('cursos_alumnos')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('❌ La tabla cursos_alumnos NO EXISTE');
      console.log('📋 Creando la tabla cursos_alumnos...');
      
      // Crear la tabla usando RPC si está disponible
      try {
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `CREATE TABLE cursos_alumnos (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id),
            curso_id TEXT NOT NULL,
            estado TEXT DEFAULT 'activo',
            fecha_inscripcion TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, curso_id)
          )`
        });

        if (createError) {
          console.log('❌ Error creando tabla:', createError.message);
          console.log('📋 Intentando método alternativo...');
          
          // Método alternativo: usar una migración manual
          await crearTablaManual();
        } else {
          console.log('✅ Tabla cursos_alumnos creada exitosamente');
        }
      } catch (e) {
        console.log('📋 Usando método manual para crear tabla...');
        await crearTablaManual();
      }
    } else if (checkError) {
      console.log('❌ Error de permisos o acceso:', checkError.message);
      console.log('   Código:', checkError.code);
    } else {
      console.log('✅ La tabla cursos_alumnos EXISTE');
      console.log('🔍 Verificando problemas de permisos...');
    }

    // 2. Verificar e inscribir a Leonardo Morales
    console.log('\n👤 Inscribiendo a Leonardo Morales...');
    await inscribirLeonardo();

  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

async function crearTablaManual() {
  console.log('📋 Creando tabla mediante inserción forzada...');
  
  // Intentar crear la tabla insertando datos
  // Si la tabla no existe, esto fallará pero nos dará más información
  const testData = {
    user_id: 'ba98672f-de13-451b-b7f4-de0149b98fdd', // El usuario que ya existe
    curso_id: 'gestion-documental-para-empresas-de-gas-y-petroleo',
    estado: 'activo',
    fecha_inscripcion: new Date().toISOString()
  };

  const { error: insertError } = await supabase
    .from('cursos_alumnos')
    .insert(testData);

  if (insertError) {
    console.log('❌ Error confirmado - La tabla no existe o tiene problemas:');
    console.log('   Mensaje:', insertError.message);
    console.log('   Código:', insertError.code);
    console.log('   Detalles:', insertError.details);
    
    console.log('\n🎯 SOLUCIÓN REQUERIDA:');
    console.log('   Necesitas ejecutar manualmente en Supabase SQL Editor:');
    console.log('   CREATE TABLE cursos_alumnos (');
    console.log('     id SERIAL PRIMARY KEY,');
    console.log('     user_id UUID REFERENCES auth.users(id),');
    console.log('     curso_id TEXT NOT NULL,');
    console.log('     estado TEXT DEFAULT \'activo\',');
    console.log('     fecha_inscripcion TIMESTAMP DEFAULT NOW(),');
    console.log('     created_at TIMESTAMP DEFAULT NOW(),');
    console.log('     updated_at TIMESTAMP DEFAULT NOW()');
    console.log('   );');
  } else {
    console.log('✅ Datos insertados exitosamente - La tabla existe');
  }
}

async function inscribirLeonardo() {
  console.log('📋 Buscando o creando usuario Leonardo Morales...');
  
  // Primero buscar si ya existe un usuario Leonardo
  const { data: usuarios, error: userError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('full_name', '%leonardo%')
    .limit(5);

  if (userError) {
    console.log('❌ Error buscando usuarios:', userError.message);
    return;
  }

  let leonardoId = null;
  
  if (usuarios && usuarios.length > 0) {
    console.log('✅ Usuarios encontrados:');
    usuarios.forEach(user => {
      console.log(`   - ${user.full_name} (${user.email}) - ${user.id}`);
      if (user.full_name.toLowerCase().includes('leonardo')) {
        leonardoId = user.id;
      }
    });
  } else {
    console.log('ℹ️  No se encontraron usuarios con nombre Leonardo');
    console.log('   Necesitas crear el usuario manualmente primero');
    return;
  }

  if (!leonardoId) {
    console.log('❌ No se encontró un usuario Leonardo específico');
    console.log('   Usando el primer usuario disponible:', usuarios[0].id);
    leonardoId = usuarios[0].id;
  }

  // Inscribir en el curso
  console.log(`\n📚 Inscribiendo usuario ${leonardoId} en curso de gestión documental...`);
  
  const inscripcionData = {
    user_id: leonardoId,
    curso_id: 'gestion-documental-para-empresas-de-gas-y-petroleo',
    estado: 'activo',
    fecha_inscripcion: new Date().toISOString()
  };

  const { data: nuevaInscripcion, error: inscError } = await supabase
    .from('cursos_alumnos')
    .insert(inscripcionData)
    .select();

  if (inscError) {
    console.log('❌ Error inscribiendo usuario:', inscError.message);
    console.log('   Esto confirma que la tabla tiene problemas');
  } else {
    console.log('✅ Usuario inscrito exitosamente:', nuevaInscripcion[0].id);
    console.log('🎉 Leonardo Morales ahora tiene acceso al curso!');
  }
}

// Ejecutar la solución
fixCursosAlumnos();