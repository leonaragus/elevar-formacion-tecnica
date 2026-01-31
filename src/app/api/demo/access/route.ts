import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("student_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });
  res.cookies.set("student_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  if (typeof email === "string" && email.includes("@")) {
    res.cookies.set("student_email", email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    try {
      const supabase = createSupabaseAdminClient();
      await supabase.from("alumnos_ingresos").insert({
        email,
        when: new Date().toISOString(),
      });
    } catch {}
  }
  return res;
}
