import { MainLayout } from "@/components/MainLayout";
import { BookOpen } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import CursoCard from "@/components/CursoCard";
import { cookies } from "next/headers";
import { devInscripciones, devCursos } from "@/lib/devstore";

type CursoRow = {
  id: string;
  titulo?: string | null;
  descripcion?: string | null;
  duracion?: string | null;
  profesor?: string | null;
  teacher?: string | null;
  docente?: string | null;
  precio?: number | null;
  modalidad?: string | null;
  estado?: string | null;
  orden?: number | null;
  [key: string]: any;
};

function getCursoProfessor(curso: CursoRow) {
  const v = curso.profesor ?? curso.teacher ?? curso.docente;
  return typeof v === "string" && v.trim() ? v : "Profesor";
}

export default async function CursosPage({ searchParams }: { searchParams?: Promise<{ solicitud?: string; error?: string }> }) {
  const cookieStore = await cookies();
  const studentEmail = cookieStore.get("student_email")?.value;
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const params = await searchParams;
  const solicitud = String(params?.solicitud ?? "");
  const errorMsg = String(params?.error ?? "");

  let cursos: CursoRow[] = [];
  let hasActive = false;
  let hasPending = false;
  let disponibles: Array<{ id: string; titulo: string }> = [];

  let activeCourseIds: string[] = [];
  let pendingCourseIds: string[] = [];
  let enrolledIds: string[] = [];

  // 1. Resolve enrollment via Cookie or DB (if no User)
  if (!user) {
    // Try to resolve via email if present
    if (studentEmail) {
      const adminClient = createSupabaseAdminClient();
      
      // Check pending requests
      const { data: intereses } = await adminClient
        .from("intereses")
        .select("course_id")
        .eq("email", studentEmail);
      
      if (intereses && intereses.length > 0) {
        hasPending = true;
        pendingCourseIds = intereses.map((i: any) => i.course_id).filter((id: any) => id != null).map((id: any) => String(id));
      }

      let foundUserId: string | null = null;
      try {
        const listed = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const users = Array.isArray(listed?.data?.users) ? listed.data.users : [];
        const found = users.find((u: any) => String(u?.email || "").toLowerCase() === studentEmail.toLowerCase());
        foundUserId = typeof found?.id === "string" ? found.id : null;
      } catch {
        foundUserId = null;
      }

      if (foundUserId) {
        const { data: insc } = await adminClient
          .from("cursos_alumnos")
          .select("curso_id, estado")
          .eq("user_id", foundUserId);

        if (Array.isArray(insc)) {
          const rows = insc.filter((r: any) => r?.curso_id != null);
          activeCourseIds = rows.filter((r: any) => r?.estado === "activo").map((r: any) => String(r.curso_id));
          const pendingFromInsc = rows.filter((r: any) => r?.estado === "pendiente").map((r: any) => String(r.curso_id));
          hasActive = activeCourseIds.length > 0;
          hasPending = hasPending || pendingFromInsc.length > 0;
          pendingCourseIds = [...new Set([...pendingCourseIds, ...pendingFromInsc])];
          enrolledIds = [...new Set([...activeCourseIds, ...pendingCourseIds])];
        }
      } else {
        const rows = devInscripciones.filter((i) => i.user_id === studentEmail);
        activeCourseIds = rows.filter((r) => r.estado === "activo").map((r) => r.curso_id);
        const pendingFromInsc = rows.filter((r) => r.estado === "pendiente").map((r) => r.curso_id);
        hasActive = activeCourseIds.length > 0;
        hasPending = hasPending || pendingFromInsc.length > 0;
        pendingCourseIds = [...new Set([...pendingCourseIds, ...pendingFromInsc])];
        enrolledIds = [...new Set([...activeCourseIds, ...pendingCourseIds])];
      }
    }

    // Cookie Override: if login says we are ok, we are ok.
    // We do this OUTSIDE the studentEmail check to ensure it works even if email cookie is missing/broken
    if (studentOk && typeof studentCourseId === "string" && studentCourseId) {
        hasActive = true;
        if (!activeCourseIds.includes(studentCourseId)) {
          activeCourseIds.push(studentCourseId);
        }
        if (!enrolledIds.includes(studentCourseId)) {
          enrolledIds.push(studentCourseId);
        }
    }
  }

  // 2. Resolve enrollment via User (Supabase Auth)
  if (user?.id) {
    const { data: insc } = await supabase
      .from("cursos_alumnos")
      .select("curso_id, estado")
      .eq("user_id", user.id)
      .limit(100);
    
    // Also check by email, as some records might have been created with email before user had a UUID
    let inscEmail: any[] = [];
    if (user.email) {
       const { data } = await supabase
          .from("cursos_alumnos")
          .select("curso_id, estado")
          .eq("user_id", user.email)
          .limit(100);
       if (data) inscEmail = data;
    }

    const allInsc = [...(Array.isArray(insc) ? insc : []), ...inscEmail];
    
    if (allInsc.length > 0) {
        const rows = allInsc.filter((r: any) => r?.curso_id != null);
        activeCourseIds = rows.filter((r: any) => r?.estado === "activo").map((r: any) => String(r.curso_id));
        const pendingFromInsc = rows.filter((r: any) => r?.estado === "pendiente").map((r: any) => String(r.curso_id));
        hasActive = activeCourseIds.length > 0;
        hasPending = hasPending || pendingFromInsc.length > 0;
        pendingCourseIds = [...new Set([...pendingCourseIds, ...pendingFromInsc])];
        enrolledIds = [...new Set([...activeCourseIds, ...pendingCourseIds])];
    }
  }
  
  // 3. Fetch Active Courses
  if (enrolledIds.length > 0) {
      // Use adminClient to be safe
      const adminClient = createSupabaseAdminClient();
      try {
        const { data, error } = await adminClient
          .from("cursos")
          .select("*")
          .in("id", enrolledIds)
          .order("orden", { ascending: true });
        
        if (error || !data || data.length === 0) {
           // Fallback to devCursos if DB is empty or error
           cursos = devCursos.filter(c => enrolledIds.includes(c.id)) as any;
        } else {
           cursos = Array.isArray(data) ? data as CursoRow[] : [];
        }
      } catch {
         // Fallback on crash
         cursos = devCursos.filter(c => enrolledIds.includes(c.id)) as any;
      }
  }

  // 4. Fetch All Courses for Disponibles
  const adminClient = createSupabaseAdminClient();
  let allCursos: any[] = [];
  try {
    const { data } = await adminClient
      .from("cursos")
      .select("*")
      .order("orden", { ascending: true });
    allCursos = Array.isArray(data) ? data : [];
  } catch {}

  if (allCursos.length === 0) {
    allCursos = devCursos;
  }
    
  const list = Array.isArray(allCursos) ? allCursos : [];
  const baseDisponibles = list.map((c: any) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso"), ...c }));
  
  // If active course not found in DB but present in cookies, try to find in ALL courses/devCursos and append to 'cursos'
  if (hasActive && cursos.length === 0) {
      // Try to find in baseDisponibles (which includes devCursos if DB empty)
      const foundInAll = baseDisponibles.filter(c => enrolledIds.includes(c.id));
      if (foundInAll.length > 0) {
          cursos = foundInAll as any;
      }
  }

  // Filter out enrolled
  disponibles = baseDisponibles.filter((c) => !enrolledIds.includes(c.id));

  if (hasActive) {
    disponibles = [];
  }

  if (hasPending && !hasActive) {
    cursos = baseDisponibles.filter((c) => pendingCourseIds.includes(c.id)) as any;
    disponibles = [];
  }

  const cursosActivos = cursos.filter((c) => activeCourseIds.includes(String(c.id)));
  const cursosPendientes = cursos.filter((c) => pendingCourseIds.includes(String(c.id)) && !activeCourseIds.includes(String(c.id)));

  // Safety check: Si el sistema creía que había activos (hasActive=true) pero no se encontró ninguno válido (cursosActivos.length=0),
  // entonces asumimos que hubo un error de sincronización (cookie vieja, id inválido) y permitimos ver disponibles de nuevo.
  if (hasActive && cursosActivos.length === 0) {
    // Solo reseteamos si tampoco hay pendientes que bloqueen
    if (!hasPending) {
       // Reset state to allow showing available courses
       // No cambiamos hasActive a false variable directamente porque se usa en render, pero re-llenamos disponibles
       disponibles = baseDisponibles.filter((c) => !enrolledIds.includes(c.id));
    }
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {(solicitud === "pendiente" || hasPending) && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-300 mb-6">
            Por favor esperar a la respuesta del administrador para comenzar a usar la plataforma.
            {pendingCourseIds.length > 0 && <span className="block mt-1 font-medium">Tienes solicitudes pendientes.</span>}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300 mb-6">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <div className="mb-4 p-2 text-xs text-gray-400 bg-gray-900/10 rounded font-mono">
           Debug: {user?.email || "No User"} | Active: {activeCourseIds.length} | Pending: {pendingCourseIds.length} | Enrolled: {enrolledIds.join(",")}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Mis Cursos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {cursosActivos.length > 0
                ? `Tienes ${cursosActivos.length} curso${cursosActivos.length !== 1 ? "s" : ""} activo${cursosActivos.length !== 1 ? "s" : ""}`
                : cursosPendientes.length > 0
                  ? "Tu inscripción está pendiente de aprobación"
                  : "Elige un curso para solicitar tu inscripción"}
            </p>
          </div>
        </div>

        {cursosActivos.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Cursos Activos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosActivos.map((curso) => (
                <CursoCard
                  key={curso.id}
                  curso={curso}
                  professor={getCursoProfessor(curso)}
                  estadoCurso="activo"
                />
              ))}
            </div>
          </div>
        )}

        {cursosPendientes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Curso Pendiente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosPendientes.map((curso) => (
                <CursoCard
                  key={curso.id}
                  curso={curso}
                  professor={getCursoProfessor(curso)}
                  estadoCurso="pendiente"
                />
              ))}
            </div>
          </div>
        )}

        {disponibles.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Cursos Disponibles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {disponibles.map((curso) => (
                <CursoCard
                  key={curso.id}
                  curso={curso as CursoRow}
                  professor="Profesor"
                  estadoCurso="ninguno"
                />
              ))}
            </div>
          </div>
        )}

        {cursosActivos.length === 0 && cursosPendientes.length === 0 && disponibles.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay cursos disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Pronto se agregarán nuevos cursos a la plataforma.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
