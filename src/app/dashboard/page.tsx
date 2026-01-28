import { createClient } from "../../lib/supabase";
import { CreateCourseModal } from "./CreateCourseModal";

type CursoRow = Record<string, unknown>;

function getCursoTitle(curso: CursoRow) {
  const v = curso.titulo ?? curso.title ?? curso.nombre ?? curso.name;
  return typeof v === "string" && v.trim() ? v : "Curso sin título";
}

function getCursoDescription(curso: CursoRow) {
  const v = curso.descripcion ?? curso.description ?? curso.detalle ?? curso.details;
  return typeof v === "string" && v.trim() ? v : "Sin descripción.";
}

function getCursoKey(curso: CursoRow, fallbackIndex: number) {
  const v = curso.id ?? curso.curso_id ?? curso.uuid;
  return typeof v === "string" || typeof v === "number" ? String(v) : String(fallbackIndex);
}

export default async function DashboardPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cursos")
    .select("*")
    .order("orden", { ascending: true })
    .limit(50);

  const cursos = Array.isArray(data) ? (data as CursoRow[]) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between md:block">
            <div>
              <div className="text-sm font-semibold text-slate-50">Panel docente</div>
              <div className="mt-1 text-xs text-slate-400">Plataforma educativa</div>
            </div>
          </div>

          <nav className="mt-4 grid gap-1">
            <a
              href="/dashboard"
              className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-50"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50"
            >
              Cursos
            </a>
            <a
              href="#"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50"
            >
              Alumnos
            </a>
            <a
              href="#"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50"
            >
              Ajustes
            </a>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-50">Cursos</h1>
              <p className="mt-1 text-sm text-slate-400">
                Gestiona tus cursos y comienza a crear contenido.
              </p>
            </div>
            <CreateCourseModal />
          </header>

          {error ? (
            <section className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">Error al conectar</div>
            </section>
          ) : cursos.length === 0 ? (
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-base font-semibold text-slate-50">Bienvenido, profesor</h2>
              <p className="mt-2 text-sm text-slate-300">
                Comienza creando tu primer curso.
              </p>
            </section>
          ) : (
            <section className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cursos.map((curso, idx) => (
                  <article
                    key={getCursoKey(curso, idx)}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <h2 className="text-base font-semibold text-slate-50">
                      {getCursoTitle(curso)}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-300">
                      {getCursoDescription(curso)}
                    </p>
                    <div className="mt-4 text-xs text-slate-400">
                      Ver detalles (próximamente)
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

