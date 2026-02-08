import { extractPdfText } from "@/lib/glossary/extractPdfText";
import { renderPdfToPngPages } from "@/lib/glossary/renderPdfToPng";
import { generateGlossaryFromPngPages } from "@/lib/glossary/openaiGlossaryFromImages";

type EnsureGlossaryInput = {
  supabase: any;
  bucket: string;
  cursoId: string;
  materialName: string;
  materialMimeType?: string | null;
};

function toGlossaryFileName(materialName: string) {
  return materialName.replace(/\.[^.]+$/, ".md");
}

function isPlaceholderMarkdown(md: string) {
  const t = md.toLowerCase();
  return (
    t.includes("no se pudo extraer texto del pdf") ||
    t.includes("posible pdf escaneado") ||
    t.includes("se requiere ocr") ||
    t.includes("no se pudo extraer texto del archivo")
  );
}

function isPdfOrText(materialName: string, mimeType?: string | null) {
  const mt = String(mimeType || "").toLowerCase();
  const name = materialName.toLowerCase();
  const isPdf = mt.includes("pdf") || name.endsWith(".pdf");
  return isPdf;
}

async function extractTextFromMaterial(buffer: Buffer, materialName: string, mimeType?: string | null) {
  const mt = String(mimeType || "").toLowerCase();
  const name = materialName.toLowerCase();
  const isPdf = mt.includes("pdf") || name.endsWith(".pdf");
  if (isPdf) {
    return extractPdfText(buffer);
  }
  return buffer.toString("utf-8");
}

function buildFallbackGlossary(textContent: string) {
  const words = textContent
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const stop = new Set([
    "para",
    "como",
    "donde",
    "cuando",
    "entre",
    "sobre",
    "pero",
    "tambien",
    "esta",
    "este",
    "esas",
    "unos",
    "unas",
    "los",
    "las",
    "con",
    "del",
    "por",
    "ante",
    "bajo",
    "cabe",
    "contra",
    "desde",
    "hacia",
    "hasta",
    "segun",
    "sin",
    "so",
    "tras",
    "que",
    "solo",
    "cada",
    "toda",
    "todo",
    "muy",
    "más",
    "menos",
    "puede",
    "pueden",
    "se",
  ]);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([t]) => t);
  return `# Glosario\n\n${top.map((t) => `### ${t}\nDefinición general (pendiente de ampliar).`).join("\n\n")}`;
}

async function buildOpenAIGlossary(textContent: string) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const canUseOpenAI = typeof openaiKey === "string" && openaiKey.length > 20;
  if (!canUseOpenAI) {
    return { glossaryMd: "", glossaryError: "openai: falta OPENAI_API_KEY" };
  }

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: openaiKey });
    const prompt = `Genera un glosario breve y claro a partir del siguiente material.\n- Lista 15-25 términos clave (en español).\n- Para cada término: título del término y una definición de 1-2 oraciones, simple y apta para alumnos.\n- No inventes contenido ajeno al texto; si no hay suficiente contexto, indica "(definición general)".\n- Formato: Markdown, encabezado H1 con "Glosario" y luego subtítulos H3 por término.\n\nTexto:\n\n${textContent.slice(0, 12000)}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un experto en pedagogía que genera glosarios educativos claros y precisos." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });
    const out = completion.choices[0]?.message?.content || "";
    return { glossaryMd: String(out).trim(), glossaryError: null };
  } catch (e: any) {
    return { glossaryMd: "", glossaryError: `openai: ${e?.message || "error"}` };
  }
}

export async function ensureGlossaryForMaterial(input: EnsureGlossaryInput) {
  const { supabase, bucket, cursoId, materialName, materialMimeType } = input;
  if (!isPdfOrText(materialName, materialMimeType)) {
    return { ok: true, skipped: true, glossaryUrl: null as string | null, glossaryError: null as string | null };
  }

  const glossaryFileName = toGlossaryFileName(materialName);
  const glossaryPath = `${cursoId}/glosarios/${glossaryFileName}`;

  let shouldOverwriteExisting = false;

  const existing = await supabase.storage.from(bucket).download(glossaryPath);
  if (!existing?.error) {
    try {
      const blob = existing.data as Blob;
      if (typeof blob?.size === "number" && blob.size > 0) {
        const text = await blob.text();
        if (!isPlaceholderMarkdown(text)) {
          const pub = supabase.storage.from(bucket).getPublicUrl(glossaryPath);
          return { ok: true, skipped: false, glossaryUrl: pub.data.publicUrl as string, glossaryError: null as string | null };
        }
      }

      if (typeof blob?.size === "number" && blob.size === 0) {
        shouldOverwriteExisting = true;
      }
    } catch {}
  }

  const materialPath = `${cursoId}/${materialName}`;
  const dl = await supabase.storage.from(bucket).download(materialPath);
  if (dl?.error) {
    return { ok: false, skipped: false, glossaryUrl: null as string | null, glossaryError: dl.error.message as string };
  }

  const blob = dl.data as Blob;
  const ab = await blob.arrayBuffer();
  const buffer = Buffer.from(ab);
  const textContent = await extractTextFromMaterial(buffer, materialName, materialMimeType);

  let glossaryMd = "";
  let glossaryError: string | null = null;

  if (textContent.trim().length > 0) {
    const ai = await buildOpenAIGlossary(textContent);
    glossaryMd = ai.glossaryMd;
    glossaryError = ai.glossaryError;
    if (!glossaryMd) {
      glossaryMd = buildFallbackGlossary(textContent);
    }
  } else {
    const openaiKey = process.env.OPENAI_API_KEY;
    const canUseOpenAI = typeof openaiKey === "string" && openaiKey.length > 20;
    if (canUseOpenAI) {
      try {
        const pages = await renderPdfToPngPages(buffer, { maxPages: 2, scale: 1.4 });
        const ai = await generateGlossaryFromPngPages(pages);
        glossaryMd = ai.glossaryMd;
        glossaryError = ai.glossaryError;
      } catch (e: any) {
        glossaryError = `ocr: ${e?.message || "error"}`;
      }
    }

    if (!glossaryMd) {
      glossaryMd = `# Glosario\n\nNo se pudo extraer texto del PDF para generar un glosario automáticamente.\n\nSugerencias:\n- Re-exportar el PDF desde Google Docs (con texto seleccionable).\n- Si es un PDF escaneado, se requiere OCR.\n\nArchivo: ${materialName.replace(/\.[^.]+$/, "")}`;
      if (!glossaryError) glossaryError = "pdf: no se pudo extraer texto";
    }
  }

  const up = await supabase.storage
    .from(bucket)
    .upload(glossaryPath, Buffer.from(glossaryMd, "utf-8"), {
      upsert: shouldOverwriteExisting,
      contentType: "text/markdown",
    });

  if (up?.error) {
    return { ok: false, skipped: false, glossaryUrl: null as string | null, glossaryError: up.error.message as string };
  }

  const pub = supabase.storage.from(bucket).getPublicUrl(glossaryPath);
  return { ok: true, skipped: false, glossaryUrl: pub.data.publicUrl as string, glossaryError };
}
