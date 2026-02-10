import { MainLayout } from "@/components/MainLayout";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureGlossaryForMaterialKey } from "@/lib/glossary/ensureGlossaryForKey";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function GlosarioPage({
  searchParams,
}: {
  searchParams?: { curso_id?: string; file?: string; url?: string };
}) {
  const resolved = searchParams;
  const cursoId = typeof resolved?.curso_id === "string" ? resolved.curso_id : "";
  const file = typeof resolved?.file === "string" ? resolved.file : "";
  const directUrl = typeof resolved?.url === "string" ? resolved.url : "";

  let content = "";
  let error: string | null = null;

  const isPlaceholder = (md: string) => {
    const t = md.toLowerCase();
    return (
      t.includes("no se pudo extraer texto del pdf") ||
      t.includes("no se pudo extraer texto del archivo") ||
      t.includes("posible pdf escaneado") ||
      t.includes("se requiere ocr")
    );
  };

  try {
    if (directUrl) {
      const res = await fetch(directUrl, { cache: "no-store" });
      if (!res.ok) {
        error = `No se pudo cargar el glosario (${res.status})`;
      } else {
        content = await res.text();
      }

      const needsRegenerate =
        isPlaceholder(content);

      if (!error && needsRegenerate && directUrl.includes("/glosarios/") && directUrl.includes("/materiales/")) {
        try {
          const m = directUrl.match(/\/materiales\/(.+?)\/(?:_pending\/)?glosarios\/(.+?\.md)/i);
          if (m?.[1] && m?.[2]) {
            const cursoIdFromUrl = m[1];
            const mdFileName = m[2];
            const mdBase = mdFileName.replace(/\.md$/i, "");
            const isPending = /\/materiales\/.+?\/_pending\/glosarios\//i.test(directUrl);
            const basePrefix = isPending ? `${cursoIdFromUrl}/_pending` : `${cursoIdFromUrl}`;
            const glossaryKey = `${basePrefix}/glosarios/${mdFileName}`;

            const slugParts = mdBase.split("-");
            const slug = slugParts.length > 1 && /^\d+$/.test(slugParts[0]) ? slugParts.slice(1).join("-") : mdBase;

            const supabase = createSupabaseAdminClient();

            let pdfName: string | null = null;
            let slugPdfNames: string[] = [];
            try {
              const { data: list } = await supabase.storage.from("materiales").list(basePrefix, {
                limit: 200,
                sortBy: { column: "created_at", order: "desc" },
              });
              const candidates = (list || [])
                .map((f: any) => String(f?.name || ""))
                .filter((n) => n.toLowerCase().endsWith(".pdf"));
              pdfName = candidates.find((n) => n.replace(/\.pdf$/i, "") === mdBase) || null;

              slugPdfNames = candidates.filter((n) => {
                  const base = n.replace(/\.pdf$/i, "");
                  const parts = base.split("-");
                  const s = parts.length > 1 && /^\d+$/.test(parts[0]) ? parts.slice(1).join("-") : base;
                  return s === slug;
                });
            } catch {}

            const orderedPdfNames = [
              ...(pdfName ? [pdfName] : []),
              ...slugPdfNames.filter((n) => n !== pdfName),
              `${mdBase}.pdf`,
            ].filter((v, i, a) => v && a.indexOf(v) === i);

            for (const n of orderedPdfNames.slice(0, 3)) {
              const materialKey = `${basePrefix}/${n}`;
              await ensureGlossaryForMaterialKey({
                supabase,
                bucket: "materiales",
                materialKey,
                targetGlossaryKey: glossaryKey,
                force: true,
              });

              const res2 = await fetch(directUrl, { cache: "no-store" });
              if (res2.ok) {
                const next = await res2.text();
                content = next;
                if (!isPlaceholder(next)) break;
              }
            }
          }
        } catch {}
      }
    } else if (cursoId && file) {
      const supabase = createSupabaseAdminClient();
      const path = `${cursoId}/glosarios/${file}`;
      const dl = await supabase.storage.from("materiales").download(path);
      if (dl.error) {
        error = dl.error.message;
      } else {
        const blob = dl.data as Blob;
        content = await blob.text();
      }
    } else {
      error = "Faltan parámetros (curso_id y file)";
    }
  } catch (e: any) {
    error = e?.message || "Error";
  }

  const empty = !content || content.trim().length === 0;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Glosario</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400 break-all">
            {directUrl ? directUrl : `${cursoId}/glosarios/${file}`}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 text-red-800 dark:text-red-200">
            {error}
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4 text-amber-900 dark:text-amber-200">
            Este glosario está vacío o no se pudo generar todavía.
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const txt = String(content || "");
              const lines = txt.split("\n");
              const sections: Array<{ title: string; body: string }> = [];
              let curTitle = "";
              let curBody: string[] = [];
              const flush = () => {
                const body = curBody.join("\n").trim();
                if (curTitle && body) sections.push({ title: curTitle, body });
                curTitle = "";
                curBody = [];
              };
              for (const raw of lines) {
                const line = raw.replace(/\r$/, "");
                if (line.startsWith("# ")) continue;
                if (line.startsWith("### ")) {
                  flush();
                  curTitle = line.replace(/^###\s+/, "").trim();
                } else {
                  curBody.push(line);
                }
              }
              flush();
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sections.length === 0 ? (
                    <div className="col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-300">
                      Este glosario no tiene secciones reconocibles.
                    </div>
                  ) : (
                    sections.map((s, i) => (
                      <div key={i} className="group rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:border-blue-500/40 transition-all">
                        <div className="text-base font-semibold text-gray-900 dark:text-white mb-2">{s.title}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{s.body}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
