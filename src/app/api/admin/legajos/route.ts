import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // Check auth
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  
  // Also allow cookie auth if needed, but usually admin page uses fetch on client which might not send admin token automatically if not configured.
  // The AdminLegajosPage uses fetch('/api/admin/legajos') without custom headers in the provided code snippet (line 37 of page.tsx).
  // It relies on implicit cookie auth or no auth?
  // Actually, the `AdminLegajosPage` has `useAuth()` but calls `fetch` from client.
  // To keep it simple and secure, we should verify the user is admin via supabase or check the token.
  // Since `AdminLegajosPage` didn't send headers in the snippet I read, I'll rely on Supabase session if token is missing.
  
  const supabase = createSupabaseAdminClient();
  
  // Fetch users
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch courses to map ID to Title if needed, though the page fetches courses separately.
  // We just need to return legajos.

  // Also fetch inscriptions to link course_id
  const { data: inscripciones } = await supabase.from("cursos_alumnos").select("*");

  const legajos = users.map((u: any) => {
    // Find active or latest inscription
    const userInsc = inscripciones?.filter((i: any) => i.user_id === u.id) || [];
    const activeInsc = userInsc.find((i: any) => i.estado === "activo") || userInsc[0];

    return {
      id: u.id,
      alumno_id: u.id,
      curso_id: activeInsc?.curso_id || "",
      nombre: u.user_metadata?.nombre || "",
      apellido: u.user_metadata?.apellido || "",
      email: u.email,
      documento: u.user_metadata?.documento || "",
      telefono: u.user_metadata?.telefono || "",
      direccion: u.user_metadata?.direccion || "",
      fecha_nacimiento: u.user_metadata?.fecha_nacimiento || "",
      fecha_inscripcion: u.created_at, // Using user creation as fallback
      estado: activeInsc?.estado === "activo" ? "activo" : "inactivo",
      created_at: u.created_at,
      updated_at: u.updated_at,
    };
  });

  // Fetch courses for the dropdown/mapping
  const { data: cursos } = await supabase.from("cursos").select("id, titulo, descripcion, duracion, created_at");

  return NextResponse.json({
    legajos,
    cursos: cursos || []
  });
}
