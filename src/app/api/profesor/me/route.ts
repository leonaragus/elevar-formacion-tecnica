import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const profCookie = req.cookies.get("prof_code_ok")?.value;
  const isProf = profCookie === "1";
  return NextResponse.json({ ok: true, isProf });
}
