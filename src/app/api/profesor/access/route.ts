import { NextRequest, NextResponse } from "next/server";

const envCodes = [
  process.env.PROFESOR_CODE,
  process.env.ADMIN_TOKEN,
].filter(Boolean) as string[];
const allowedCodes = envCodes
  .flatMap((c) => String(c).split(","))
  .map((c) => c.trim())
  .filter((c) => c.length > 0);
if (!allowedCodes.includes("vanesa2025")) {
  allowedCodes.push("vanesa2025");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body || {};
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ ok: false, error: "Código requerido" }, { status: 400 });
    }
    if (!allowedCodes.includes(code.trim())) {
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
