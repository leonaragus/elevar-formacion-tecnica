import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devInscripciones, devIntereses, devPagos } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      supabase = null;
    }

    // Obtener estadísticas básicas
    const stats = {
      totalCursos: 2,
      totalAlumnos: devInscripciones.length,
      totalProfesores: 1,
      totalPagos: devPagos.length,
      cursosActivos: 1,
      alumnosActivos: devInscripciones.filter(i => i.estado === "activo").length,
      ingresosMes: 0,
      evaluacionesActivas: 0,
      materialesCargados: 3
    };

    // Obtener inscripciones pendientes con información detallada
    let pendientes: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("cursos_alumnos")
          .select("user_id, curso_id, estado, created_at")
          .eq("estado", "pendiente")
          .limit(50);
        
        if (!error && data) {
          pendientes = data;
        }

        // Consultar intereses (solicitudes por email)
        const { data: intereses, error: errorIntereses } = await supabase
          .from("intereses")
          .select("*")
          .limit(50);
        
        if (!errorIntereses && intereses) {
          const interesesMapeados = intereses.map((i: any) => ({
             user_id: i.email, 
             email: i.email,
             curso_id: i.course_id || i.curso_id, // Soporte para ambos nombres
             estado: "pendiente",
             created_at: i.created_at
          }));
          pendientes = [...pendientes, ...interesesMapeados];
        }
      } catch (e) {
        // Fallback a devstore si hay error
        pendientes = devInscripciones.filter(i => i.estado === "pendiente");
      }
    } else {
      pendientes = devInscripciones.filter(i => i.estado === "pendiente");
    }

    // Enriquecer con información de usuarios si es posible
    if (supabase && pendientes.length > 0) {
      try {
        const userIds = [...new Set(pendientes.map(p => p.user_id))];
        const { data: usersData } = await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds);
        
        if (usersData) {
          const userMap = new Map(usersData.map(u => [u.id, u]));
          pendientes = pendientes.map(p => ({
            ...p,
            email: userMap.get(p.user_id)?.email || p.user_id
          }));
        }
      } catch (e) {
        // Si falla, mantener los datos básicos
      }
    }

    // Obtener actividades recientes
    const actividades = [
      {
        descripcion: "Nueva solicitud de inscripción",
        fecha: new Date().toLocaleString("es-AR")
      }
    ];

    // Obtener registros recientes
    const recientes = pendientes.slice(0, 5).map(p => ({
      email: p.user_id,
      action: "Solicitud pendiente",
      fecha: new Date().toLocaleString("es-AR")
    }));

    return NextResponse.json({
      ok: true,
      stats,
      sistema: [],
      recientes,
      actividades,
      pendientes
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}