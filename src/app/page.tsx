import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">Supabase + Next.js 14</h1>
        <p className="mt-2 text-slate-300">
          Usa el dashboard para ver los cursos reales desde la tabla <code>cursos</code>.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Ir al dashboard
          </Link>
          <Link
            href="/test"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-white/10"
          >
            Página de test
          </Link>
        </div>
      </div>
    </main>
  );
}

