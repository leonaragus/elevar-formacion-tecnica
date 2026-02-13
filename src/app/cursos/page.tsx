import { MainLayout } from "@/components/MainLayout";
import { BookOpen, Bell } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import CursoCard from "@/components/CursoCard";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import NotificationHistory from "@/components/NotificationHistory";
import { cookies, headers } from "next/headers";
import { devInscripciones, devIntereses } from "@/lib/devstore";

export const dynamic = "force-dynamic";

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

export default async function CursosPage(props: { searchParams: Promise<{ solicitud?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const resolvedSearchParams = searchParams;
  let studentEmail: string | undefined;
  let studentOk = false;
  let studentCourseId: string | undefined;
  try {
    const cookieStore = await cookies();
    studentEmail = cookieStore.get("student_email")?.value;
    studentOk = cookieStore.get("student_ok")?.value === "1";
    studentCourseId = cookieStore.get("student_course_id")?.value;
  } catch {}

  let supabase: any = null;
  let user: any = null;
  try {
    supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {}

  const solicitud = String(resolvedSearchParams?.solicitud ?? "");
  const errorMsg = String(resolvedSearchParams?.error ?? "");

  let cursos: CursoRow[] = [];
  let hasActive = false;
  let hasPending = false;
  let disponibles: Array<{ id: string; titulo: string }> = [];

  let activeCourseIds: string[] = [];
  let pendingCourseIds: string[] = [];
  let enrolledIds: string[] = [];
  let activeCourseTitle: string = "";

  // 1. Resolve enrollment via Cookie or DB (if no User)
  if (!user) {
    // Si no hay usuario y studentOk es false, no debería haber acceso a cursos privados
    if (studentEmail) {
      let adminClient: any = null;
      try { adminClient = createSupabaseAdminClient(); } catch { adminClient = null; }
      
      // Check pending requests (tolerante a fallos)
      try {
        if (adminClient) {
          const { data: intereses } = await adminClient
            .from("intereses")
            .select("course_id")
            .eq("email", studentEmail);
          if (intereses && intereses.length > 0) {
            hasPending = true;
            pendingCourseIds = intereses.map((i: any) => i.course_id).filter((id: any) => id != null).map((id: any) => String(id));
          }
        }
      } catch {}

      let foundUserId: string | null = null;
      try {
        const listed = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const users = Array.isArray(listed?.data?.users) ? listed.data.users : [];
        const found = users.find((u: any) => String(u?.email || "").toLowerCase() === studentEmail.toLowerCase());
        foundUserId = typeof found?.id === "string" ? found.id : null;
      } catch {
        foundUserId = null;
      }

      if (foundUserId && adminClient) {
        try {
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
        } catch {}
      }
    }

    // Cookie Override: solo si la base de datos no devolvió nada (fallback para offline/cache)
    if (!hasActive && !hasPending && studentOk && typeof studentCourseId === "string" && studentCourseId) {
        hasActive = true;
        if (!activeCourseIds.includes(studentCourseId)) {
          activeCourseIds.push(studentCourseId);
        }
        if (!enrolledIds.includes(studentCourseId)) {
          enrolledIds.push(studentCourseId);
        }
    }

    // Devstore Fallback (Cookies/Student)
    if (studentEmail) {
      const devInsc = devIntereses.filter(i => i.email === studentEmail);
      devInsc.forEach(i => {
        if (!enrolledIds.includes(i.curso_id)) {
          enrolledIds.push(i.curso_id);
          pendingCourseIds.push(i.curso_id);
          hasPending = true;
        }
      });
    }
  }

  // 2. Resolve enrollment via User (Supabase Auth)
  if (user?.id && supabase) {
    let insc: any[] = [];
    try {
      const { data } = await supabase
        .from("cursos_alumnos")
        .select("curso_id, estado")
        .eq("user_id", user.id)
        .limit(100);
      insc = Array.isArray(data) ? data : [];
    } catch {}
    
    // Also check by email, as some records might have been created with email before user had a UUID
    let inscEmail: any[] = [];
    if (user.email) {
       try {
         const { data } = await supabase
            .from("cursos_alumnos")
            .select("curso_id, estado")
            .eq("user_id", user.email)
            .limit(100);
         if (data) inscEmail = data;
       } catch {}
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
    } else {
        // IMPORTANTE: Si el usuario existe en Auth pero NO tiene inscripciones en DB,
        // debemos forzar hasActive a false para evitar que use cookies viejas.
        hasActive = false;
        activeCourseIds = [];
        enrolledIds = [];
    }

    // Devstore Fallback (Auth User) - Solo si no encontramos nada en DB real
    if (!hasActive && !hasPending) {
        const devInsc = devInscripciones.filter(i => i.user_id === user.id);
        devInsc.forEach(i => {
          if (!enrolledIds.includes(i.curso_id)) {
            enrolledIds.push(i.curso_id);
            if (i.estado === "activo") {
              activeCourseIds.push(i.curso_id);
              hasActive = true;
            } else {
              pendingCourseIds.push(i.curso_id);
              hasPending = true;
            }
          }
        });
    }
  }
  
  // 3. Fetch Active Courses
  if (enrolledIds.length > 0) {
      let adminClient: any = null;
      try { adminClient = createSupabaseAdminClient(); } catch { adminClient = null; }
      try {
        if (adminClient) {
          const { data, error } = await adminClient
            .from("cursos")
            .select("*")
            .in("id", enrolledIds)
            .order("orden", { ascending: true });
          if (!error && data && data.length > 0) {
            cursos = Array.isArray(data) ? (data as CursoRow[]) : [];
          }
        } else if (supabase) {
          const { data, error } = await supabase
            .from("cursos")
            .select("*")
            .in("id", enrolledIds)
            .order("orden", { ascending: true });
          if (!error && data && data.length > 0) {
            cursos = Array.isArray(data) ? (data as CursoRow[]) : [];
          }
        }
      } catch {}
  }

  // 4. Fetch All Courses for Disponibles
  let adminClient: any = null;
  try { adminClient = createSupabaseAdminClient(); } catch { adminClient = null; }
  let allCursos: any[] = [];
  try {
    if (adminClient) {
      const { data } = await adminClient
        .from("cursos")
        .select("*")
        .order("orden", { ascending: true });
      allCursos = Array.isArray(data) ? data : [];
    } else if (supabase) {
      const { data } = await supabase
        .from("cursos")
        .select("*")
        .order("orden", { ascending: true });
      allCursos = Array.isArray(data) ? data : [];
    }
  } catch {}

  const list = Array.isArray(allCursos) ? allCursos : [];
  const baseDisponibles = list.map((c: any) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso"), ...c }));
  
  // If active course not found in DB but present in cookies, try to find in ALL courses and append to 'cursos'
  if (hasActive && cursos.length === 0) {
      // Try to find in baseDisponibles
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
  if (!activeCourseTitle && cursosActivos.length > 0) {
    activeCourseTitle = String(cursosActivos[0]?.titulo || "");
  }
  if (!activeCourseTitle && activeCourseIds.length > 0) {
    try {
      let adminClient2: any = null;
      try { adminClient2 = createSupabaseAdminClient(); } catch { adminClient2 = null; }
      if (adminClient2) {
        const { data: row } = await adminClient2
          .from("cursos")
          .select("titulo")
          .eq("id", activeCourseIds[0])
          .single();
        if (row?.titulo) activeCourseTitle = String(row.titulo);
      } else if (supabase) {
        const { data: row } = await supabase
          .from("cursos")
          .select("titulo")
          .eq("id", activeCourseIds[0])
          .single();
        if (row?.titulo) activeCourseTitle = String(row.titulo);
      }
    } catch {}
  }

  // Safety check: Si el sistema creía que había activos (hasActive=true) pero no se encontró ninguno válido (cursosActivos.length=0),
  // entonces asumimos que hubo un error de sincronización (cookie vieja, id inválido) y permitimos ver disponibles de nuevo.
  if (hasActive && cursosActivos.length === 0) {
    // Solo reseteamos si tampoco hay pendientes que bloqueen
    if (!hasPending) {
       hasActive = false; // Reset hasActive since no real courses were found
       disponibles = baseDisponibles.filter((c) => !enrolledIds.includes(c.id));
    }
  }

  // Admin messages (solo visibles si hay curso activo)
  let mensajes: Array<{ titulo: string; contenido: string; created_at: string }> = [];
  if (hasActive && activeCourseIds.length > 0) {
    try {
      let adminClientMsg: any = null;
      try { adminClientMsg = createSupabaseAdminClient(); } catch { adminClientMsg = null; }
      let data: any[] | null = null;
      if (adminClientMsg) {
        const res = await adminClientMsg
          .from("mensajes")
          .select("titulo, contenido, created_at, curso_id")
          .order("created_at", { ascending: false })
          .limit(30)
          .or(`curso_id.is.null,curso_id.in.(${activeCourseIds.join(",")})`);
        data = res?.data || null;
      } else if (supabase) {
        const res = await supabase
          .from("mensajes")
          .select("titulo, contenido, created_at, curso_id")
          .order("created_at", { ascending: false })
          .limit(30)
          .or(`curso_id.is.null,curso_id.in.(${activeCourseIds.join(",")})`);
        data = res?.data || null;
      }
      if (data) {
        mensajes = data.map((m: any) => ({
             titulo: String(m.titulo || ""),
             contenido: String(m.contenido || ""),
             created_at: String(m.created_at || "")
        }));
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
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

        {/* Debug oculto para producción */}

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

        {/* Gestión de Notificaciones (solo si hay curso activo) */}
        {hasActive && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Notificaciones</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gestionar notificaciones por curso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cursosActivos.map((curso) => (
                  <div key={curso.id} className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {curso.titulo}
                    </div>
                    <PushNotificationToggle 
                      cursoId={curso.id}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
             </div>
             <div className="mt-6">
               <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Historial de notificaciones</h4>
               <NotificationHistory limit={5} />
             </div>
           </div>
         )}
 
          {/* Mensajes del Administrador (solo si hay curso activo) */}
        {hasActive && (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Mensajes del Administrador</h2>
            {mensajes.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6 text-sm text-gray-600 dark:text-gray-400 shadow-sm">
                No hay mensajes para tu curso.
              </div>
            ) : (
              <div className="space-y-6">
                {mensajes.map((m, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <article 
                      key={idx} 
                      className={`rounded-2xl overflow-hidden border shadow-sm transition-all ${
                        isLatest 
                          ? "border-blue-500/50 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 ring-1 ring-blue-500/20" 
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className={`px-6 py-4 border-b text-center ${
                        isLatest 
                          ? "bg-blue-600/10 dark:bg-blue-600/20 border-blue-500/20" 
                          : "bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800"
                      }`}>
                        <h3 className={`text-xl font-bold mb-1 ${
                          isLatest 
                            ? "text-blue-700 dark:text-blue-400" 
                            : "text-gray-900 dark:text-gray-100"
                        }`}>
                          {m.titulo}
                        </h3>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className={`px-6 py-6 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap ${
                        isLatest ? "text-lg" : "text-base"
                      }`}>
                        {m.contenido}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                  isAdminView={false}
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
                  isAdminView={false}
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
            <div className="grid grid-cols-1 gap-6">
              {disponibles.map((curso) => (
                <CursoCard
                  key={curso.id}
                  curso={curso as CursoRow}
                  professor="Profesor"
                  estadoCurso="ninguno"
                  isAdminView={false}
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
