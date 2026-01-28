"use client";

import { useCallback, useEffect, useState } from "react";

export function CreateCourseModal() {
  const [open, setOpen] = useState(false);

  const onClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        Crear Nuevo Curso
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Crear nuevo curso"
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Nuevo curso</h2>
                <p className="mt-1 text-sm text-slate-400">Modal vacío por ahora.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/5 hover:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
              Aquí irá el formulario para crear cursos.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-50 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

