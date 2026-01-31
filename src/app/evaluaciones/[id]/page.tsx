"use client";

import { MainLayout } from "@/components/MainLayout";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function EvaluacionDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/evaluaciones/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error");
        setItem(json.item || null);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id]);

  useEffect(() => {
    if (item?.questions?.length) {
      setAnswers(new Array(item.questions.length).fill(-1));
    }
  }, [item]);

  const calculatedScore = useMemo(() => {
    if (!item?.questions || answers.length !== item.questions.length) return null;
    let correct = 0;
    for (let i = 0; i < item.questions.length; i++) {
      if (answers[i] === item.questions[i].correctAnswer) correct++;
    }
    return Math.round((correct / item.questions.length) * 100);
  }, [answers, item]);

  const onSelect = (qIndex: number, optIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  };

  const onSubmit = async () => {
    if (!item) return;
    const s = calculatedScore;
    setScore(s);
    setSubmitted(true);
    try {
      await fetch("/api/evaluaciones/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluacionId: item.id,
          userId: null,
          answers,
          score: s,
        }),
      });
    } catch {}
  };

  return (
    <MainLayout>
      <div className="p-8">
        {loading && (
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        )}
        {error && (
          <div className="text-red-600 dark:text-red-400">{error}</div>
        )}
        {!loading && item && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.title}
                </h1>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {item.course_name || "Sin curso"}
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {item.source_filename || "PDF"}
              </div>
            </div>
            <div className="space-y-4">
              {item.questions?.map((q: any, qi: number) => (
                <div
                  key={qi}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-3">
                    {qi + 1}. {q.question}
                  </div>
                  <div className="space-y-2">
                    {q.options?.map((opt: string, oi: number) => (
                      <button
                        key={oi}
                        onClick={() => onSelect(qi, oi)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                          answers[qi] === oi
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {submitted && score !== null ? `Puntaje: ${score}%` : ""}
              </div>
              <button
                onClick={onSubmit}
                disabled={submitted}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
              >
                {submitted ? "Enviado" : "Enviar evaluación"}
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
