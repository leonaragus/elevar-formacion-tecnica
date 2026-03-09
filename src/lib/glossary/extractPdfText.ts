// Importación dinámica: Esta es la clave.
// En lugar de importar 'pdfjs-dist' directamente, lo cargaremos solo cuando sea necesario.
// Esto evita que el código del navegador se ejecute en el servidor durante la compilación.

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // 1. Carga dinámica de la librería
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");

    // 2. Configuración del "worker" para el entorno de servidor
    // Esta es la forma recomendada para evitar errores en Next.js/Vercel.
    // Le decimos a pdf.js que no intente cargar un script de worker externo.
    await pdfjs.GlobalWorkerOptions.workerSrc(
      `data:application/javascript,importScripts("");`
    );

    // 3. Extracción del texto (lógica sin cambios)
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    let fullText = "";

    console.log(`Extracting text from PDF with ${numPages} pages...`);

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }

    if (fullText.trim().length > 0) {
      console.log("PDF text extracted successfully.");
      return fullText.trim();
    }

    console.warn("PDF text extraction resulted in empty content.");
    return "";

  } catch (error: any) {
    console.error("Error during PDF text extraction with pdf.js:", error.message);
    return "";
  }
}
