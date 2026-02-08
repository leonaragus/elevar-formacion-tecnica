import { createCanvas } from "@napi-rs/canvas";

export async function renderPdfToPngPages(buffer: Buffer, options?: { maxPages?: number; scale?: number }) {
  const maxPages = Math.max(1, Math.min(options?.maxPages ?? 2, 5));
  const scale = Math.max(0.8, Math.min(options?.scale ?? 1.4, 2));

  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pages = Math.min(pdf.numPages || 0, maxPages);
  const pngBuffers: Buffer[] = [];

  const CanvasFactory = {
    create(width: number, height: number) {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");
      return { canvas, context };
    },
    reset(canvasAndContext: any, width: number, height: number) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    },
    destroy(canvasAndContext: any) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    },
  };

  for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const { canvas, context } = CanvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));

    await page.render({ canvasContext: context, viewport, canvasFactory: CanvasFactory }).promise;

    const png = canvas.toBuffer("image/png");
    pngBuffers.push(png);
    CanvasFactory.destroy({ canvas, context });
  }

  return pngBuffers;
}
