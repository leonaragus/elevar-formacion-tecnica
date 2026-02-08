export async function extractPdfText(buffer: Buffer) {
  try {
    const mod: any = await import("pdf-parse");
    const pdfParse = mod?.default ?? mod;
    const parsed = await pdfParse(buffer);
    const text = String(parsed?.text || "");
    if (text.trim().length > 0) return text;
  } catch {}

  try {
    const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const maxPages = Math.min(pdf.numPages || 0, 30);
    let fullText = "";
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items || []).map((it: any) => String(it?.str || ""));
      const pageText = strings.join(" ").trim();
      if (pageText) {
        fullText += (fullText ? "\n\n" : "") + pageText;
      }
    }
    return fullText;
  } catch {
    return "";
  }
}
