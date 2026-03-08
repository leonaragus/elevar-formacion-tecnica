import * as pdfjs from "pdfjs-dist/build/pdf.mjs";

// *********************************************************************************
// ESTA ES LA LÍNEA CLAVE QUE FALTA
// Desactiva el uso de "workers" en el servidor. pdf.js intentará usar un worker
// para no bloquear el hilo principal, pero en un entorno de servidor como el de 
// Next.js/Vercel, esto falla si el archivo del worker no se encuentra.
// Al establecer un worker falso, forzamos a que todo se ejecute en el hilo principal,
// lo que es más lento pero mucho más fiable en este contexto.
// *********************************************************************************
await pdfjs.GlobalWorkerOptions.workerSrc(
  `data:application/javascript,importScripts("");`
);

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Usamos el buffer de datos directamente
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    let fullText = "";

    console.log(`Extracting text from PDF with ${numPages} pages...`);

    // Extraer texto de todas las páginas
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Unir los fragmentos de texto de la página
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n"; // Añadir un salto de línea entre páginas
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
