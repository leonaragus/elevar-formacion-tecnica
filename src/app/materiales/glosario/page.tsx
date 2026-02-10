import { MainLayout } from "@/components/MainLayout";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GlosarioPage({
  searchParams,
}: {
  searchParams?: { curso_id?: string; name?: string };
}) {
  const params = searchParams;
  const cursoId = String(params?.curso_id || "");
  const name = String(params?.name || "");

  const cookieStore = await cookies();
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let selectedId = "";
  if (studentOk && typeof studentCourseId === "string" && studentCourseId) {
    selectedId = studentCourseId;
  }
  if (!selectedId && user?.id) {
    const { data } = await supabase
      .from("cursos_alumnos")
      .select("curso_id, estado")
      .eq("user_id", user.id)
      .eq("estado", "activo")
      .limit(1);
    const row = Array.isArray(data) ? data[0] : null;
    if (row?.curso_id != null) selectedId = String(row.curso_id);
  }

  const allowed = Boolean(selectedId && cursoId && selectedId === cursoId);

  let content = "";
  let error: string | null = null;

  if (!cursoId || !name) {
    error = "Faltan parámetros (curso_id, name).";
  } else if (!allowed) {
    error = "No autorizado para ver este glosario.";
  } else {
    try {
      const adminClient = createSupabaseAdminClient();
      const path = `${cursoId}/glosarios/${name}`;
      const dl = await adminClient.storage.from("materiales").download(path);
      if (dl.error) {
        error = dl.error.message;
      } else {
        const blob = dl.data as Blob;
        const ab = await blob.arrayBuffer();
        content = Buffer.from(ab).toString("utf-8");
        if (!content.trim()) {
          error = "El glosario está vacío o no se pudo generar todavía.";
        }
      }
    } catch (e: any) {
      error = e?.message || "Error";
    }
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Glosario</h1>
            <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/materiales"
              className="px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            >
              Volver
            </Link>
            {allowed && cursoId && name && (
              <Link
                href={`https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https:\/\//, "")}/storage/v1/object/public/materiales/${cursoId}/glosarios/${encodeURIComponent(name)}?download=1`}
                className="px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                Descargar
              </Link>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            <div className="font-semibold mb-1">No se pudo mostrar el glosario</div>
            <div className="text-sm break-words">{error}</div>
            <div className="text-xs text-amber-200/70 mt-2">
              Si recién subiste el material, recargá en unos segundos.
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-900 dark:text-gray-100">
            {content}
          </pre>
        )}
      </div>
    </MainLayout>
  );
}
