import { OpenAI } from "openai";

function canUseOpenAI() {
  const k = process.env.OPENAI_API_KEY;
  return typeof k === "string" && k.length > 20;
}

export async function generateGlossaryFromPngPages(pngPages: Buffer[]) {
  if (!canUseOpenAI()) {
    return { glossaryMd: "", glossaryError: "openai: falta OPENAI_API_KEY" };
  }

  if (!pngPages.length) {
    return { glossaryMd: "", glossaryError: "ocr: no hay páginas" };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });
    const content: any[] = [
      {
        type: "text",
        text:
          "Genera un glosario breve y claro a partir de estas páginas (PDF escaneado).\n" +
          "- Lista 15-25 términos clave (en español).\n" +
          "- Para cada término: título del término y una definición de 1-2 oraciones, simple y apta para alumnos.\n" +
          "- No inventes contenido ajeno a lo que se ve; si no hay suficiente contexto, indica '(definición general)'.\n" +
          "- Formato: Markdown con H1 'Glosario' y luego H3 por término.",
      },
    ];

    for (const buf of pngPages.slice(0, 2)) {
      const b64 = buf.toString("base64");
      content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content }],
      temperature: 0.4,
    });

    const out = completion.choices[0]?.message?.content || "";
    return { glossaryMd: String(out).trim(), glossaryError: null as string | null };
  } catch (e: any) {
    return { glossaryMd: "", glossaryError: `openai: ${e?.message || "error"}` };
  }
}

