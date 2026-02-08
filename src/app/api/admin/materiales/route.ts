
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/glossary/extractPdfText";
import { renderPdfToPngPages } from "@/lib/glossary/renderPdfToPng";
import { generateGlossaryFromPngPages } from "@/lib/glossary/openaiGlossaryFromImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(key: string) {
  return key.startsWith("/") ? key.slice(1) : key;
}

function getStagePrefix(cursoId: string, stage: string) {
  if (stage === "pending") return `${cursoId}/_pending`;
  return `${cursoId}`;
}

function materialToGlossaryFileName(materialFileName: string) {
  return materialFileName.replace(/\.[^.]+$/, ".md");
}

async function isAuthorized(req: NextRequest) {
  // 1. Check API Token (Legacy/Script access)
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  if (token && expected && token === expected) return true;

  // 2. Check Professor Cookie (Legacy)
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  if (hasProfCookie) return true;

  // 3. Check Supabase Auth Session (Standard)
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return true; 
  } catch (e) {
    console.error("Auth check error in materials API:", e);
  }

  // 4. Special check: If we are in local dev, maybe allow if referer is admin
  if (process.env.NODE_ENV === "development") {
      const referer = req.headers.get("referer") || "";
      if (referer.includes("/admin")) {
          console.log("Allowing admin access based on referer in dev mode");
          return true;
      }
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const curso_id = url.searchParams.get("curso_id") || "";
    const stage = url.searchParams.get("stage") || "published";
    const kind = url.searchParams.get("kind") || "materials";
    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    
    // Ensure bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.find(b => b.name === bucket);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucket, { public: true });
      }
    } catch (e) {
      console.error("Bucket check error:", e);
    }

    const basePrefix = getStagePrefix(curso_id, stage);
    const prefix = kind === "glossaries" ? `${basePrefix}/glosarios` : basePrefix;

    const list = await supabase.storage.from(bucket).list(prefix || undefined, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (list.error) {
       console.error("Storage list error:", list.error);
       return NextResponse.json({ ok: false, error: list.error.message }, { status: 500 });
    }

    const raw = Array.isArray(list?.data) ? list.data : [];
    const filtered = raw.filter((it: any) => {
      const name = String(it?.name || "");
      const mt = String(it?.metadata?.mimetype || "");
      const isDir = mt.includes("directory");
      if (isDir) return false;
      if (kind === "materials" && (name === "glosarios" || name === "_pending")) return false;
      if (kind === "glossaries" && !name.toLowerCase().endsWith(".md")) return false;
      return true;
    });

    const items = filtered.map((it: any) => ({
      name: it.name,
      key: `${prefix}/${it.name}`,
      id: it.id,
      size: it.metadata?.size ?? null,
      created_at: it.created_at,
      mimetype: it.metadata?.mimetype,
    }));
    
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Requiere form-data" }, { status: 400 });
    }
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") || "published";
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const curso_id_raw = form.get("curso_id");
    const titulo_raw = form.get("titulo");
    
    const curso_id = typeof curso_id_raw === "string" ? curso_id_raw : (curso_id_raw != null ? String(curso_id_raw) : "");
    const titulo = typeof titulo_raw === "string" ? titulo_raw : (titulo_raw != null ? String(titulo_raw) : "");
    
    if (!file || !curso_id) {
      console.error("Upload error: Missing file or curso_id", { hasFile: !!file, curso_id });
      return NextResponse.json({ ok: false, error: "Archivo y curso_id requeridos" }, { status: 400 });
    }

    const isPdfOnly = (file.type || "").toLowerCase().includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfOnly) {
      return NextResponse.json({ ok: false, error: "Solo se permiten archivos PDF" }, { status: 400 });
    }

    // Check Service Role Key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || serviceKey.length < 20 || !serviceKey.startsWith("eyJ")) {
       console.error("Upload error: Invalid or missing SUPABASE_SERVICE_ROLE_KEY. Key should start with 'eyJ'");
       return NextResponse.json({ 
         ok: false, 
         error: "Error de Configuración: La clave SUPABASE_SERVICE_ROLE_KEY no es válida o no tiene formato JWT (debe empezar con 'eyJ'). Revisa tu archivo .env.local" 
       }, { status: 500 });
    }

    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    
    // Ensure bucket exists
    try {
       console.log("Checking if bucket exists:", bucket);
       const { data: buckets } = await supabase.storage.listBuckets();
       const bucketExists = buckets?.find(b => b.name === bucket);
       if (!bucketExists) {
         console.log("Creating bucket:", bucket);
         await supabase.storage.createBucket(bucket, { public: true });
       }
    } catch (e) {
        console.error("Bucket creation/check error:", e);
    }

    // Sanitize filename: remove accents, special characters, and keep it clean
    const nameSafe = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-zA-Z0-9.-]/g, "-") // Keep only alphanumeric, dots and dashes
      .replace(/-+/g, "-")             // Remove double dashes
      .toLowerCase();

    const basePrefix = getStagePrefix(curso_id, stage);
    
    // Extraer extensión y nombre base
    const extIndex = nameSafe.lastIndexOf('.');
    const baseName = extIndex > 0 ? nameSafe.slice(0, extIndex) : nameSafe;
    const extension = extIndex > 0 ? nameSafe.slice(extIndex) : '';
    
    // Formato legible: nombre-original_YYYY-MM-DD-HH-MM-SS.ext
    const now = new Date();
    const formattedDate = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .slice(0, 19);
    
    const timestampedName = `${baseName}_${formattedDate}${extension}`;
    const path = `${basePrefix}/${timestampedName}`;
    console.log("Uploading file to path:", path);
    
    const res = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

    if (res.error) {
      console.error("Supabase upload error:", res.error);
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 400 });
    }

    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    
    // Optional: Generate glossary from uploaded material
    let glossaryUrl: string | null = null;
    let glossaryError: string | null = null;
    try {
      // Only attempt for PDF or plain text files
      const isPdf = (file.type || "").toLowerCase().includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const ab = await file.arrayBuffer();
        const buf = Buffer.from(ab);
        const textContent = await extractPdfText(buf);
        if (!textContent || textContent.trim().length === 0) {
          glossaryError = glossaryError || "pdf: no se pudo extraer texto (posible PDF escaneado)";
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        const canUseOpenAI = typeof openaiKey === "string" && openaiKey.length > 20;
        let glossaryMd = "";
        if (textContent && textContent.trim().length > 0) {
          if (!canUseOpenAI && !glossaryError) {
            glossaryError = "openai: falta OPENAI_API_KEY (se generó glosario simple)";
          }
          if (canUseOpenAI) {
            try {
              const { OpenAI } = await import("openai");
              const client = new OpenAI({ apiKey: openaiKey });
              const prompt = `Genera un glosario breve y claro a partir del siguiente material.\n- Lista 15-25 términos clave (en español).\n- Para cada término: título del término y una definición de 1-2 oraciones, simple y apta para alumnos.\n- No inventes contenido ajeno al texto; si no hay suficiente contexto, indica "(definición general)".\n- Formato: Markdown, encabezado H1 con "Glosario" y luego subtítulos H3 por término.\n\nTexto:\n\n${textContent.slice(0, 12000)}`;

              const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: "Eres un experto en pedagogía que genera glosarios educativos claros y precisos.",
                  },
                  { role: "user", content: prompt },
                ],
                temperature: 0.4,
              });

              const out = completion.choices[0]?.message?.content || "";
              glossaryMd = out.trim();
            } catch (e) {
              glossaryError = `openai: ${(e as any)?.message || "error"}`;
              console.error("OpenAI error:", e);
            }
          }

          if (!glossaryMd) {
            const words = textContent
              .toLowerCase()
              .replace(/[^a-záéíóúñü\s]/gi, " ")
              .split(/\s+/)
              .filter((w) => w.length > 3);
            const stop = new Set(["para","como","donde","cuando","entre","sobre","pero","tambien","esta","este","esas","unos","unas","los","las","con","del","por","ante","bajo","cabe","contra","desde","hacia","hasta","segun","sin","so","tras","que","solo","cada","toda","todo","muy","más","menos","puede","pueden","se"]);
            const freq: Record<string, number> = {};
            for (const w of words) {
              if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
            }
            const top = Object.entries(freq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20)
              .map(([t]) => t);
            glossaryMd = `# Glosario\n\n${top.map((t) => `### ${t}\nDefinición general (pendiente de ampliar).`).join("\n\n")}`;
          }
        }

        if (!glossaryMd && canUseOpenAI && (!textContent || textContent.trim().length === 0)) {
          try {
            const pages = await renderPdfToPngPages(buf, { maxPages: 2, scale: 1.4 });
            const ai = await generateGlossaryFromPngPages(pages);
            glossaryMd = ai.glossaryMd;
            if (ai.glossaryError) glossaryError = ai.glossaryError;
          } catch (e) {
            glossaryError = `ocr: ${(e as any)?.message || "error"}`;
          }
        }

        if (!glossaryMd) {
          const baseNameFallback = nameSafe.replace(/\.[^.]+$/, "");
          glossaryMd = `# Glosario\n\nNo se pudo extraer texto del PDF para generar un glosario automáticamente.\n\nSugerencias:\n- Re-exportar el PDF desde Google Docs (con texto seleccionable).\n- Si es un PDF escaneado, se requiere OCR.\n\nArchivo: ${baseNameFallback}`;
        }

        const materialFileName = path.split("/").pop() || nameSafe;
        const glossaryFileName = materialFileName.replace(/\.[^.]+$/, ".md");
        const glossaryPath = `${basePrefix}/glosarios/${glossaryFileName}`;

        const existingGloss = await supabase.storage.from(bucket).download(glossaryPath);
        let existingOk = false;
        if (!existingGloss.error) {
          try {
            const blob = existingGloss.data as Blob;
            existingOk = typeof blob?.size === "number" && blob.size > 0;
          } catch {
            existingOk = true;
          }
        }

        if (existingOk) {
          const pubG = supabase.storage.from(bucket).getPublicUrl(glossaryPath);
          glossaryUrl = pubG.data.publicUrl;
        } else {
          const uploadGloss = await supabase.storage
            .from(bucket)
            .upload(glossaryPath, Buffer.from(glossaryMd, "utf-8"), {
              upsert: true,
              contentType: "text/markdown",
            });
          if (!uploadGloss.error) {
            const pubG = supabase.storage.from(bucket).getPublicUrl(glossaryPath);
            glossaryUrl = pubG.data.publicUrl;
          } else {
            glossaryError = uploadGloss.error.message;
          }
        }
      }
    } catch (e) {
      console.error("Glossary generation error:", e);
      glossaryError = (e as any)?.message || "Error";
    }

    return NextResponse.json({ 
      ok: true, 
      url: pub.data.publicUrl, 
      path, 
      titulo: titulo || null,
      glossary_url: glossaryUrl,
      glossary_error: glossaryError,
      stage
    });
  } catch (e: any) {
    console.error("POST error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const curso_id = url.searchParams.get("curso_id") || "";
    const key = url.searchParams.get("key") || "";
    const alsoDeleteGlossary = url.searchParams.get("also_delete_glossary") !== "0";

    if (!curso_id || !key) {
      return NextResponse.json({ ok: false, error: "curso_id y key requeridos" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";

    const keys: string[] = [];
    const normalizedKey = normalizeKey(key);
    keys.push(normalizedKey);

    if (alsoDeleteGlossary && !normalizedKey.includes("/glosarios/")) {
      const fileName = normalizedKey.split("/").pop() || "";
      if (fileName.includes(".")) {
        const md = materialToGlossaryFileName(fileName);
        const isPending = normalizedKey.includes(`${curso_id}/_pending/`);
        const basePrefix = isPending ? `${curso_id}/_pending` : `${curso_id}`;
        keys.push(`${basePrefix}/glosarios/${md}`);
      }
    }

    const del = await supabase.storage.from(bucket).remove(keys);
    if (del.error) {
      return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, removed: keys });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({} as any));
    const action = typeof body?.action === "string" ? body.action : "";
    const curso_id = typeof body?.curso_id === "string" ? body.curso_id : "";
    const key = typeof body?.key === "string" ? body.key : "";

    if (action !== "publish" || !curso_id || !key) {
      return NextResponse.json({ ok: false, error: "action=publish, curso_id y key requeridos" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    const srcKey = normalizeKey(key);
    if (!srcKey.includes(`${curso_id}/_pending/`)) {
      return NextResponse.json({ ok: false, error: "El archivo no está en _pending" }, { status: 400 });
    }

    const fileName = srcKey.split("/").pop() || "";
    const dstKey = `${curso_id}/${fileName}`;

    const moved = await supabase.storage.from(bucket).move(srcKey, dstKey);
    if (moved.error) {
      return NextResponse.json({ ok: false, error: moved.error.message }, { status: 500 });
    }

    const md = fileName.includes(".") ? materialToGlossaryFileName(fileName) : "";
    let movedGlossary = false;
    let glossaryUrl: string | null = null;
    if (md) {
      const srcGloss = `${curso_id}/_pending/glosarios/${md}`;
      const dstGloss = `${curso_id}/glosarios/${md}`;
      const dl = await supabase.storage.from(bucket).download(srcGloss);
      if (!dl.error) {
        const mvG = await supabase.storage.from(bucket).move(srcGloss, dstGloss);
        if (!mvG.error) {
          movedGlossary = true;
          glossaryUrl = supabase.storage.from(bucket).getPublicUrl(dstGloss).data.publicUrl;
        }
      }
    }

    const urlPub = supabase.storage.from(bucket).getPublicUrl(dstKey).data.publicUrl;
    return NextResponse.json({ ok: true, url: urlPub, key: dstKey, glossary_url: glossaryUrl, moved_glossary: movedGlossary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
