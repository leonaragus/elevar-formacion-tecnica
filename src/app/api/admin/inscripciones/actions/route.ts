
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: This route is used by the Admin Dashboard to approve or reject course enrollments.
// It directly modifies the 'cursos_alumnos' table.

export async function POST(req: NextRequest) {
  const { curso_id, user_id, action } = await req.json();

  // 1. Validate input
  if (!curso_id || !user_id || !action) {
    return new NextResponse(JSON.stringify({ error: 'Faltan parámetros obligatorios (curso_id, user_id, action)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validActions = ['aprobado', 'rechazado'];
  if (!validActions.includes(action)) {
    return new NextResponse(JSON.stringify({ error: 'La acción no es válida.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Create a Supabase client with admin privileges
  // We use the service_role key to bypass RLS policies for this admin action.
  const supabase = createRouteHandlerClient({ cookies });

  // 3. Perform the database update
  const { error } = await supabase
    .from('cursos_alumnos')
    .update({ estado: action })
    .match({ curso_id: curso_id, user_id: user_id });

  // 4. Handle errors
  if (error) {
    console.error(`Error updating enrollment for user ${user_id} in course ${curso_id}:`, error);
    return new NextResponse(JSON.stringify({ error: 'Error al actualizar la inscripción en la base de datos.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. Return success
  return NextResponse.json({ ok: true });
}
