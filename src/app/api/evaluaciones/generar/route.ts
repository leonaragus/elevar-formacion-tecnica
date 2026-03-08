import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs";

type ExamQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
};

type Exam = {
  title: string;
  questions: ExamQuestion[];
};

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function POST(req: NextRequest) {
  try {
    const teacher = isAuthorized(req);
    if (!teacher) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se ha subido ningún archivo" },
        { status: 400 }
      );
    }

    // 1. Convertir archivo a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extraer texto del PDF
    let pdfText = "";
    try {
      // **FIX**: Cargar 'pdf-parse' de una manera que sea robusta en diferentes entornos (local vs. Vercel).
      // El entorno de compilación de Vercel puede empaquetar los módulos de CommonJS de forma inesperada.
      const pdfParseModule = await import("pdf-parse");

      // La función real podría estar en .default (estándar) o anidada (error de empaquetado común).
      const PDFParse = pdfParseModule.default || pdfParseModule;

      if (typeof PDFParse !== 'function') {
        // Si después de todos los intentos no es una función, lanza un error claro.
        // Esto ayudará a depurar en Vercel en lugar de obtener "is not callable".
        console.error("pdf-parse no se cargó como una función. Módulo recibido:", pdfParseModule);
        throw new Error("Error interno: La librería para procesar PDFs no se cargó correctamente.");
      }
      
      const data = await PDFParse(buffer);
      pdfText = data.text;
    } catch (error) {
      console.error("Error al leer PDF con pdf-parse:", error);
      
      // Fallback simple: intentar extraer strings legibles del buffer si falla el parser
      try {
        const raw = buffer.toString('latin1');
        const matches = raw.match(/\\((.*?)\\)/g);
        if (matches && matches.length > 20) {
            pdfText = matches.map(m => m.slice(1, -1)).join(" ");
        }
      } catch (e) {
          console.error("Fallback extraction failed", e);
      }
      
      // Fallback avanzado con OCR (Tesseract) si el texto sigue siendo insuficiente
      if (!pdfText || pdfText.length < 50) {
        console.log("Intentando OCR con Tesseract...");
        try {
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker('spa');
          const { data: { text } } = await worker.recognize(buffer);
          await worker.terminate();
          
          if (text && text.trim().length > 10) {
             pdfText = text;
          }
        } catch (ocrErr) {
          console.error("Error OCR:", ocrErr);
        }
      }

      if (!pdfText || pdfText.length < 50) {
          return NextResponse.json(
            { error: "No se pudo extraer texto del PDF ni siquiera con OCR. Intente con otro archivo." },
            { status: 400 }
          );
      }
    }

    // Limpieza básica de texto extraído
    pdfText = pdfText.replace(/\\s+/g, " ").trim();

    // Validar longitud del texto
    if (pdfText.length < 20) {
      return NextResponse.json(
        { error: "El PDF no contiene suficiente texto legible (posiblemente escaneado)." },
        { status: 400 }
      );
    }

    // Recortar texto si es muy largo
    const truncatedText = pdfText.slice(0, 30000);

    // 3. Generar preguntas
    const exam = generateHeuristicExam(truncatedText, 15);
    return NextResponse.json(exam);

  } catch (error: any) {
    console.error("Error general:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ---------------- Heurística gratuita para generar preguntas ----------------
const STOPWORDS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","en","y","o","u","que","como","con","por",
  "para","sobre","entre","sin","desde","hasta","pero","más","menos","muy","también","esto","esa","ese","esa",
  "este","esta","estos","estas","lo","su","sus","ya","no","sí","se","es","son","fue","han","hay","ser","estar",
  "puede","pueden","cada","otros","otra","otro","donde","cuando","mientras","antes","después"
]);

function normalizeWord(w: string) {
  return w
    .toLowerCase()
    .replace(/[.,;:¡!¿?()\\\"\'\`]/g, "")
    .replace(/\\d+/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .split(/\\s+/)
    .map(normalizeWord)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function splitSentences(text: string): string[] {
  return text
    .split(/[\\.\\!\\?\\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);
}

function topKeywords(words: string[], max = 50): string[] {
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function pickDistractors(pool: string[], correct: string, count = 3): string[] {
  const shuffled = pool.filter((p) => p !== correct);
  // Fisher-Yates
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function generateHeuristicExam(text: string, count = 15): Exam {
  const words = tokenize(text);
  const sentences = splitSentences(text);
  const keywords = topKeywords(words, 80);

  const title = (keywords[0] || "Examen") + " - Evaluación automática";
  const questions: ExamQuestion[] = [];

  let usedKeywords = new Set<string>();
  let qid = 1;

  for (const sentence of sentences) {
    if (questions.length >= count) break;
    // Buscar un keyword presente en la oración
    const match = keywords.find((k) => !usedKeywords.has(k) && sentence.toLowerCase().includes(k));
    if (!match) continue;

    // Construir pregunta tipo cloze (rellenar hueco)
    const blanked = sentence.replace(new RegExp(match, "i"), "_____");
    const distractors = pickDistractors(keywords, match, 3);
    const options = [match, ...distractors];
    // Mezclar opciones
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const correctIndex = options.indexOf(match);

    questions.push({
      id: qid++,
      question: `Complete la oración: \"${blanked}\"`,
      options,
      correctAnswer: Math.max(0, correctIndex),
    });

    usedKeywords.add(match);
  }

  // Si no se llegaron a generar suficientes preguntas, crear preguntas genéricas
  while (questions.length < count && keywords.length >= 4) {
    const correct = keywords[questions.length % keywords.length];
    const distractors = pickDistractors(keywords, correct, 3);
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const correctIndex = options.indexOf(correct);
    questions.push({
      id: qid++,
      question: `Según el material, ¿cuál de las siguientes palabras clave está más relacionada con el tema central?`,
      options,
      correctAnswer: Math.max(0, correctIndex),
    });
  }

  return { title, questions };
}
