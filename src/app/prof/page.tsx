import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfesorPage() {
  const cookieStore = await cookies();
  const ok = cookieStore.get("prof_code_ok")?.value === "1";
  if (!ok) {
    redirect("/auth?error=profesor_no_autorizado");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acceso de Profesor</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Tu acceso de profesor está habilitado. Elige una opción para continuar.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin"
            className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Panel de Administración</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gestionar cursos, alumnos y materiales.</p>
          </Link>
          <Link
            href="/cursos"
            className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ver Cursos</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Explorar contenidos y evaluaciones.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
