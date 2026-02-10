import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { upsertPerfil } from "@/lib/devstore";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await req.json();
    const { nombre, apellido, documento, telefono, direccion, fecha_nacimiento, email } = body;

    const meta = {
        nombre,
        apellido,
        documento,
        telefono,
        direccion,
        fecha_nacimiento,
        profile_completed: true
    };

    if (user) {
        // Authenticated user
        const { error: updateError } = await supabase.auth.updateUser({ data: meta });
        if (updateError) throw updateError;
    } else {
        if (!email) throw new Error("No usuario ni email proporcionado");
        try {
          const admin = createSupabaseAdminClient();
          const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (!found) {
            upsertPerfil(email, meta);
            return NextResponse.json({ ok: true, fallback: true });
          }
          const { error: updateError } = await admin.auth.admin.updateUserById(found.id, { user_metadata: meta });
          if (updateError) {
            const msg = String(updateError.message || "").toLowerCase();
            const shouldFallback =
              msg.includes("invalid api key") ||
              msg.includes("permission denied") ||
              msg.includes("row-level security") ||
              msg.includes("undefined") ||
              msg.includes("not found");
            if (shouldFallback) {
              upsertPerfil(email, meta);
              return NextResponse.json({ ok: true, fallback: true });
            }
            throw updateError;
          }
        } catch (e: any) {
          const msg = String(e?.message || "").toLowerCase();
          const shouldFallback =
            msg.includes("invalid api key") ||
            msg.includes("permission denied") ||
            msg.includes("row-level security") ||
            msg.includes("undefined");
          if (shouldFallback) {
            upsertPerfil(email, meta);
            return NextResponse.json({ ok: true, fallback: true });
          }
          throw e;
        }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
