import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreditCard, CheckCircle, CalendarDays } from "lucide-react";

type AnyRow = Record<string, unknown>;

function parseMeses(curso: AnyRow) {
  const mesesField = (curso as any)?.meses;
  if (typeof mesesField === "number" && mesesField > 0) return mesesField;
  const d = curso?.duracion;
  if (typeof d === "string") {
    const m = d.match(/(\d+)\s*mes/i);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return 6;
}

export default async function AdminPagosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const token = process.env.ADMIN_TOKEN || "";
  const res = await fetch(`/api/admin/pagos`, {
    headers: { "X-Admin-Token": token },
    cache: "no-store",
  }).catch(() => null as any);
  const json = await res?.json().catch(() => null as any);

  const activos: AnyRow[] = Array.isArray(json?.activos) ? json.activos : [];
  const cursos: AnyRow[] = Array.isArray(json?.cursos) ? json.cursos : [];
  const pagos: AnyRow[] = Array.isArray(json?.pagos) ? json.pagos : [];

  const cursoById = new Map<string, AnyRow>();
  for (const c of cursos) {
    const id = String((c as any)?.id ?? "");
    if (id) cursoById.set(id, c);
  }

  const paidCount = new Map<string, number>();
  for (const p of pagos) {
    if ((p as any)?.estado === "pagado") {
      const key = `${(p as any)?.user_id}:${(p as any)?.curso_id}`;
      paidCount.set(key, (paidCount.get(key) ?? 0) + 1);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
          <div className="text-sm font-semibold text-slate-50">Panel de pagos</div>
          <div className="mt-1 text-xs text-slate-400">Administración</div>
          <nav className="mt-4 grid gap-1">
            <a href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-50">Dashboard</a>
            <a href="/admin/pagos" className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-50">Pagos</a>
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-50">Pagos por curso</h1>
              <p className="mt-1 text-sm text-slate-400">Confirma pagos y revisa estados</p>
            </div>
          </header>

          {json?.ok !== true ? (
            <section className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">Error al cargar datos</div>
            </section>
          ) : activos.length === 0 ? (
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-base font-semibold text-slate-50">No hay alumnos activos</h2>
              <p className="mt-2 text-sm text-slate-300">Aprobar inscripciones para comenzar a gestionar pagos.</p>
            </section>
          ) : (
            <section className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activos.map((row, idx) => {
                  const curso_id = String((row as any)?.curso_id ?? "");
                  const user_id = String((row as any)?.user_id ?? "");
                  const curso = cursoById.get(curso_id) ?? {};
                  const mesesTotal = parseMeses(curso);
                  const key = `${user_id}:${curso_id}`;
                  const count = paidCount.get(key) ?? 0;
                  const restantes = Math.max(mesesTotal - count, 0);
                  return (
                    <article key={`${key}:${idx}`} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                      <h2 className="text-base font-semibold text-slate-50">
                        {(curso as any)?.titulo ?? "Curso"}
                      </h2>
                      <div className="mt-2 text-xs text-slate-400">Alumno: {user_id}</div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-300">
                          Restantes: <span className="font-semibold">{restantes}</span> / {mesesTotal}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <CalendarDays className="w-4 h-4" />
                          Habilitado hasta el día 13 de cada mes
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <form method="POST" action="/api/admin/pagos" className="inline-block">
                          <input type="hidden" name="user_id" value={user_id} />
                          <input type="hidden" name="curso_id" value={curso_id} />
                          <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Confirmar pago
                          </button>
                        </form>
                        <div className="px-3 py-2 bg-green-600/20 text-green-300 rounded-lg text-xs font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Pagados: {count}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
