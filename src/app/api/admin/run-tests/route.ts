
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Este es un arnés de pruebas temporal para verificar los flujos de trabajo de la aplicación
// después de la refactorización. Será eliminado una vez que se completen las pruebas.

type TestResult = {
  test: string;
  status: 'SUCCESS' | 'FAIL';
  details: string;
  error?: any;
};

// --- Casos de Prueba ---

// Test 1: Flujo de Aprobación de Inscripción
async function test_approve_inscription(): Promise<TestResult> {
  const supabase = createSupabaseAdminClient();
  const testEmail = `testuser-${Date.now()}@test.com`;
  const testCourseTitle = `Test Course ${Date.now()}`;
  let userId: string | null = null;
  let courseId: string | null = null;

  try {
    // 1. SETUP: Crear usuario y curso de prueba
    const { data: user, error: userError } = await supabase.from('usuarios').insert({ email: testEmail, rol: 'alumno', nombre: 'Test', apellido: 'User' }).select().single();
    if (userError) throw new Error(`SETUP FAILED: Cannot create user. ${userError.message}`);
    userId = user.id;

    const { data: course, error: courseError } = await supabase.from('cursos').insert({ titulo: testCourseTitle, estado: 'activo' }).select().single();
    if (courseError) throw new Error(`SETUP FAILED: Cannot create course. ${courseError.message}`);
    courseId = course.id;

    // 2. SETUP: Crear inscripción pendiente
    const { error: inscriptionError } = await supabase.from('cursos_alumnos').insert({ curso_id: courseId, user_id: userId, estado: 'pendiente' });
    if (inscriptionError) throw new Error(`SETUP FAILED: Cannot create pending inscription. ${inscriptionError.message}`);

    // 3. ACTION: Llamar a la API de acciones para aprobar
    // Usamos fetch para simular la llamada real del frontend
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/inscripciones/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso_id: courseId, user_id: userId, action: 'aprobado' }),
    });
    
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(`ACTION FAILED: API call failed. ${result.error || response.statusText}`);
    }

    // 4. VERIFICATION: Comprobar que el estado en la BD es 'aprobado'
    const { data: finalInscription, error: verifyError } = await supabase.from('cursos_alumnos').select('estado').eq('curso_id', courseId).eq('user_id', userId).single();
    if (verifyError) throw new Error(`VERIFICATION FAILED: Cannot query final state. ${verifyError.message}`);

    if (finalInscription.estado !== 'aprobado') {
      return { test: 'Aprobar Inscripción', status: 'FAIL', details: `Estado final esperado 'aprobado', pero se obtuvo '${finalInscription.estado}'` };
    }

    return { test: 'Aprobar Inscripción', status: 'SUCCESS', details: 'El usuario fue inscrito y el estado se actualizó a "aprobado" en la BD.' };

  } catch (e: any) {
    return { test: 'Aprobar Inscripción', status: 'FAIL', details: e.message, error: e };
  } finally {
    // 5. CLEANUP: Eliminar datos de prueba
    if (userId) await supabase.from('usuarios').delete().eq('id', userId);
    if (courseId) await supabase.from('cursos').delete().eq('id', courseId);
    // La tabla cursos_alumnos se limpia en cascada al borrar el curso/usuario
  }
}


// --- Controlador Principal de Pruebas ---

export async function POST(req: NextRequest) {
  try {
    const { test } = await req.json();

    if (!test) {
      return NextResponse.json({ error: "Se requiere un nombre de prueba ('test')." }, { status: 400 });
    }

    let result: TestResult;

    switch (test) {
      case 'approve_inscription':
        result = await test_approve_inscription();
        break;
      // Agregaremos más casos de prueba aquí
      default:
        return NextResponse.json({ error: `Prueba desconocida: ${test}` }, { status: 404 });
    }

    // Devolvemos el resultado con un estado 200, el status interno indica el éxito/fallo
    return NextResponse.json(result);

  } catch (e: any) {
    return NextResponse.json({ error: 'Error fatal en el arnés de pruebas.', details: e.message }, { status: 500 });
  }
}
