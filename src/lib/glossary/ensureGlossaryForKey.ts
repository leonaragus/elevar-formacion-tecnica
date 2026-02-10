import { extractPdfText } from "@/lib/glossary/extractPdfText";
import { renderPdfToPngPages } from "@/lib/glossary/renderPdfToPng";
import { generateGlossaryFromPngPages } from "@/lib/glossary/openaiGlossaryFromImages";

function isPlaceholderMarkdown(md: string) {
  const t = md.toLowerCase();
  return (
    t.includes("no se pudo extraer texto del pdf") ||
    t.includes("posible pdf escaneado") ||
    t.includes("se requiere ocr") ||
    t.includes("no se pudo extraer texto del archivo")
  );
}

function buildFallbackGlossary(textContent: string) {
  const raw = String(textContent || "");
  const lower = raw.toLowerCase();
  const sentences = lower
    .split(/[\.\!\?\n]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  const tokens = lower
    .replace(/[^a-záéíóúñü\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const stop = new Set([
    "para","como","donde","cuando","entre","sobre","pero","tambien","esta","este","esas","unos","unas","los","las","con","del","por","ante","bajo","cabe","contra","desde","hacia","hasta","segun","sin","so","tras","que","solo","cada","toda","todo","muy","más","menos","puede","pueden","se","sus","mis","tus","su","ya","al","el","la","de","y","o","u","es","son","ser","fue","han","hay","en"
  ]);
  const words = tokens.filter((w) => !stop.has(w));
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const bigramFreq: Record<string, number> = {};
  const trigramFreq: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (!stop.has(a) && !stop.has(b)) {
      const bg = `${a} ${b}`;
      bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
    }
  }
  for (let i = 0; i < words.length - 2; i++) {
    const a = words[i], b = words[i + 1], c = words[i + 2];
    if (!stop.has(a) && !stop.has(b) && !stop.has(c)) {
      const tg = `${a} ${b} ${c}`;
      trigramFreq[tg] = (trigramFreq[tg] || 0) + 1;
    }
  }
  const topTrigrams = Object.entries(trigramFreq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  const topBigrams = Object.entries(bigramFreq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  const used = new Set<string>();
  const terms: string[] = [];
  for (const t of [...topTrigrams, ...topBigrams]) {
    if (!used.has(t)) {
      terms.push(t);
      for (const w of t.split(" ")) used.add(w);
    }
  }
  const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([t]) => t).filter((t) => !used.has(t)).slice(0, 12);
  const finalTerms = [...terms, ...topWords].slice(0, 20);
  const makeTitle = (t: string) => t.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  const findContext = (t: string) => {
    const idx = sentences.findIndex((s) => s.includes(t));
    if (idx >= 0) return sentences[idx].slice(0, 260);
    const w = t.split(" ")[0];
    const j = sentences.findIndex((s) => s.includes(w));
    if (j >= 0) return sentences[j].slice(0, 260);
    return "";
  };
  const sections = finalTerms.map((t) => {
    const ctx = findContext(t);
    const def = ctx ? `Se refiere a: ${ctx}.` : "Concepto clave del material. Explica un aspecto importante del tema tratado.";
    return `### ${makeTitle(t)}\n${def}`;
  });
  return `# Glosario\n\n${sections.join("\n\n")}`;
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
    return { glossaryMd: String(out).trim(), glossaryError: null as string | null };
  } catch (e: any) {
    return { glossaryMd: "", glossaryError: `openai: ${e?.message || "error"}` };
  }
}

export async function ensureGlossaryForMaterialKey(input: {
  supabase: any;
  bucket: string;
  materialKey: string;
  targetGlossaryKey?: string;
  force?: boolean;
}) {
  const { supabase, bucket, materialKey, targetGlossaryKey, force } = input;
  const key = materialKey.startsWith("/") ? materialKey.slice(1) : materialKey;
  const parts = key.split("/");
  if (parts.length < 2) {
    return { ok: false, glossaryUrl: null as string | null, glossaryError: "key inválida" };
  }

  const cursoId = parts[0];
  const isPending = parts[1] === "_pending";
  const fileName = parts[parts.length - 1] || "";
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    return { ok: true, glossaryUrl: null as string | null, glossaryError: null as string | null };
  }

  const basePrefix = isPending ? `${cursoId}/_pending` : `${cursoId}`;
  const glossaryFileName = fileName.replace(/\.[^.]+$/, ".md");
  const glossaryKey = (targetGlossaryKey || `${basePrefix}/glosarios/${glossaryFileName}`).startsWith("/")
    ? (targetGlossaryKey || `${basePrefix}/glosarios/${glossaryFileName}`).slice(1)
    : (targetGlossaryKey || `${basePrefix}/glosarios/${glossaryFileName}`);

  let shouldGenerate = !!force;
  if (!shouldGenerate) {
    const existing = await supabase.storage.from(bucket).download(glossaryKey);
    if (!existing?.error) {
      try {
        const blob = existing.data as Blob;
        if (typeof blob?.size === "number" && blob.size > 0) {
          const text = await blob.text();
          if (!isPlaceholderMarkdown(text)) {
            const pub = supabase.storage.from(bucket).getPublicUrl(glossaryKey);
            return { ok: true, glossaryUrl: pub.data.publicUrl as string, glossaryError: null as string | null };
          }
        }
      } catch {
        const pub = supabase.storage.from(bucket).getPublicUrl(glossaryKey);
        return { ok: true, glossaryUrl: pub.data.publicUrl as string, glossaryError: null as string | null };
      }
    }
    shouldGenerate = true;
  }

  if (!shouldGenerate) {
    const pub = supabase.storage.from(bucket).getPublicUrl(glossaryKey);
    return { ok: true, glossaryUrl: pub.data.publicUrl as string, glossaryError: null as string | null };
  }

  const dl = await supabase.storage.from(bucket).download(key);
  if (dl?.error) {
    return { ok: false, glossaryUrl: null as string | null, glossaryError: dl.error.message as string };
  }

  const blob = dl.data as Blob;
  const ab = await blob.arrayBuffer();
  const buffer = Buffer.from(ab);

  let glossaryMd = "";
  let glossaryError: string | null = null;

  const textContent = await extractPdfText(buffer);
  if (textContent.trim().length > 0) {
    const ai = await buildOpenAIGlossary(textContent);
    glossaryMd = ai.glossaryMd;
    glossaryError = ai.glossaryError;
    if (!glossaryMd) glossaryMd = buildFallbackGlossary(textContent);
  } else {
    glossaryError = "pdf: no se pudo extraer texto (posible PDF escaneado)";
    const openaiKey = process.env.OPENAI_API_KEY;
    const canUseOpenAI = typeof openaiKey === "string" && openaiKey.length > 20;
    if (canUseOpenAI) {
      try {
        const pages = await renderPdfToPngPages(buffer, { maxPages: 2, scale: 1.4 });
        const ai = await generateGlossaryFromPngPages(pages);
        glossaryMd = ai.glossaryMd;
        if (ai.glossaryError) glossaryError = ai.glossaryError;
      } catch (e: any) {
        glossaryError = `ocr: ${e?.message || "error"}`;
      }
    }

    if (!glossaryMd) {
      glossaryMd = `# Glosario\n\nNo se pudo extraer texto del PDF para generar un glosario automáticamente.\n\nSugerencias:\n- Re-exportar el PDF desde Google Docs (con texto seleccionable).\n- Si es un PDF escaneado, se requiere OCR.\n\nArchivo: ${fileName.replace(/\.[^.]+$/, "")}`;
    }
  }

  const up = await supabase.storage.from(bucket).upload(glossaryKey, Buffer.from(glossaryMd, "utf-8"), {
    upsert: true,
    contentType: "text/markdown",
  });

  if (up?.error) {
    return { ok: false, glossaryUrl: null as string | null, glossaryError: up.error.message as string };
  }

  const pub = supabase.storage.from(bucket).getPublicUrl(glossaryKey);
  return { ok: true, glossaryUrl: pub.data.publicUrl as string, glossaryError };
}
