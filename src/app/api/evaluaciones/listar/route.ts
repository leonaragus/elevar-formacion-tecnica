import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");
  const { data, error } = await supabase
    .from("evaluaciones")
    .select("id,title,course_name,created_at")
    .ilike("course_name", course ? `%${course}%` : "%")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}
