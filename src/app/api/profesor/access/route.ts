import { NextRequest, NextResponse } from "next/server";

const CODE = "vanesa2025";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body || {};
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ ok: false, error: "Código requerido" }, { status: 400 });
    }
    if (code !== CODE) {
      return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    // Cookie de acceso profesor, dura 12 horas
    res.cookies.set("prof_code_ok", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}

