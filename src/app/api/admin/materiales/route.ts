
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/glossary/extractPdfText";

// Los imports de renderizado de PNG y OpenAI se eliminan porque canUseOpenAI es siempre falso
// y no queremos esa lógica en el código final para mantenerlo limpio.
// import { renderPdfToPngPages } from "@/lib/glossary/renderPdfToPng";
// import { generateGlossaryFromPngPages } from "@/lib/glossary/openaiGlossaryFromImages";

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
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  if (token && expected && token === expected) return true;

  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  if (hasProfCookie) return true;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return true; 
  } catch (e) {
    console.error("Auth check error in materials API:", e);
  }

  if (process.env.NODE_ENV === "development") {
      const referer = req.headers.get("referer") || "";
      if (referer.includes("/admin")) {
          console.log("Allowing admin access based on referer in dev mode");
          return true;
      }
  }

  return false;
}

// Las funciones GET, DELETE y PATCH se mantienen igual, no es necesario incluirlas de nuevo aquí...
// Solo modificamos la función POST que es la que genera el glosario.

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
    
    const nameSafe = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const basePrefix = getStagePrefix(curso_id, stage);
    
    const extIndex = nameSafe.lastIndexOf('.');
    const baseName = extIndex > 0 ? nameSafe.slice(0, extIndex) : nameSafe;
    const extension = extIndex > 0 ? nameSafe.slice(extIndex) : '';
    
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
    
    let glossaryUrl: string | null = null;
    let glossaryError: string | null = null;
    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const ab = await file.arrayBuffer();
        const buf = Buffer.from(ab);
        const textContent = await extractPdfText(buf);

        if (!textContent || textContent.trim().length === 0) {
          glossaryError = "No se pudo extraer texto del PDF. Asegúrate de que no sea un documento escaneado (imagen).";
        }

        let glossaryMd = "";

        if (textContent && textContent.trim().length > 0) {
          // --- INICIO DE LA NUEVA LÓGICA MEJORADA ---

          // 1. Mantener tu lógica de análisis de frecuencia (¡es buena!)
          const words = textContent
            .toLowerCase()
            .replace(/[^a-záéíóúñü\s]/gi, " ")
            .split(/\s+/)
            .filter((w) => w.length > 3); // Palabras de 4+ letras
            
          const stop = new Set(["para","como","donde","cuando","entre","sobre","pero","tambien","esta","este","esas","unos","unas","los","las","con","del","por","ante","bajo","cabe","contra","desde","hacia","hasta","segun","sin","so","tras","que","solo","cada","toda","todo","muy","más","menos","puede","pueden","se", "son", "del", "las", "los", "una", "uno"]);
          
          const freq: Record<string, number> = {};
          for (const w of words) {
            if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
          }

          const topTerms = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20) // Top 20 términos
            .map(([t]) => t);

          // 2. Lógica para extraer la primera frase como definición
          const sentences = textContent.split(/[.?!]/).filter(s => s.trim().length > 10);
          const glossaryItems: { term: string; definition: string }[] = [];

          for (const term of topTerms) {
            // Buscar la primera frase que contenga el término (insensible a mayúsculas/minúsculas)
            const definition = sentences.find(s => 
              s.toLowerCase().includes(term)
            );
            glossaryItems.push({
              term: term.charAt(0).toUpperCase() + term.slice(1), // Capitalizar término
              definition: definition ? definition.trim() + "." : "No se encontró un contexto claro para este término."
            });
          }

          // 3. Generar el Markdown final
          glossaryMd = `# Glosario del Documento\n\n` +
            glossaryItems.map(item => 
              `### ${item.term}\n${item.definition}`
            ).join("\n\n");

          // --- FIN DE LA NUEVA LÓGICA MEJORADA ---
        }

        if (!glossaryMd) {
          glossaryMd = `# Glosario\n\nNo se pudo generar un glosario para este documento.\n`;
        }

        const materialFileName = path.split("/").pop() || nameSafe;
        const glossaryFileName = materialToGlossaryFileName(materialFileName);
        const glossaryPath = `${basePrefix}/glosarios/${glossaryFileName}`;

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
    } catch (e: any) {
      console.error("Glossary generation error:", e);
      glossaryError = e?.message || "Error inesperado al generar el glosario.";
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

// El resto de las funciones (GET, DELETE, PATCH) no necesitan ser redefinidas,
// ya que la solicitud solo pide modificar la lógica de generación del glosario
// que se encuentra en POST. Para no enviar un bloque de código gigante, se omiten.

export async function GET(req: NextRequest) { 
    // ... la lógica existente de GET va aquí ...
    return NextResponse.json({ok: true, message: "GET logic not shown for brevity"})
}

export async function DELETE(req: NextRequest) { 
    // ... la lógica existente de DELETE va aquí ...
    return NextResponse.json({ok: true, message: "DELETE logic not shown for brevity"})
}

export async function PATCH(req: NextRequest) { 
    // ... la lógica existente de PATCH va aquí ...
    return NextResponse.json({ok: true, message: "PATCH logic not shown for brevity"})
}
