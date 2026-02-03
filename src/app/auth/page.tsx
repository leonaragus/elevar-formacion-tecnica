"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { Mail, LogIn, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
const demoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";

function ModeEffect({ setIsLogin, setError }: { setIsLogin: (v: boolean) => void, setError: (v: string | null) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const mode = searchParams?.get('mode');
    setIsLogin(mode !== 'register');

    const error = searchParams?.get('error');
    if (error === 'pendiente') {
      setError("Tu solicitud está pendiente de aprobación. Por favor espera a ser contactado por el administrador.");
    }
  }, [searchParams, setIsLogin, setError]);
  return null;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const { signUp, signIn } = useAuth();
  const [profMode, setProfMode] = useState(false);
  const [profCode, setProfCode] = useState("");
  const [profError, setProfError] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);

    try {
      if (isLogin) {
        // Usar el endpoint de API en lugar de la función del cliente
        const formData = new FormData();
        formData.append("email", email);
        
        const response = await fetch("/api/auth/login", {
          method: "POST",
          body: formData,
        });
        
        const result = await response.json();

        if (!response.ok || !result?.ok) {
          if (result?.error === "pendiente") {
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("student_email", String(email || "").trim().toLowerCase());
                localStorage.setItem("student_ok", "0");
                localStorage.removeItem("student_course_id");
              }
            } catch {}
            router.replace("/auth?error=pendiente");
            return;
          }
          throw new Error(result?.error || "Error al iniciar sesión");
        }

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("student_email", String(email || "").trim().toLowerCase());
            localStorage.setItem("student_ok", result?.student_ok ? "1" : "0");
            if (result?.student_course_id) {
              localStorage.setItem("student_course_id", String(result.student_course_id));
            } else {
              localStorage.removeItem("student_course_id");
            }
          }
        } catch {}

        router.push(String(result?.redirect || "/cursos"));
      } else {
        await signUp(email, { nombre, apellido });
        setOk("Registro enviado. Revisa tu correo para confirmar la cuenta y espera la aprobación del administrador para comenzar a usar la plataforma.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleProfAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfError(null);
    try {
      const res = await fetch("/api/profesor/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: profCode }),
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Código inválido");
      router.push("/admin/dashboard");
    } catch (err) {
      setProfError(err instanceof Error ? err.message : "Error");
    }
  };
  const handleAdminAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    try {
      const res = await fetch("/api/profesor/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode }),
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Código inválido");
      router.push("/admin/dashboard");
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <Suspense fallback={null}>
    <ModeEffect setIsLogin={setIsLogin} setError={setError} />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Image src="/elevar-logo.svg" alt="Elevar Formación Técnica" width={160} height={80} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isLogin ? "Acceso alumnos" : "Registro de alumnos"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plataforma exclusiva para alumnos de Elevar Formación Técnica
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Tu apellido"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            

            

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {ok && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">{ok}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:shadow-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isLogin ? "Ingresar" : "Registrarme"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Acceso exclusivo para alumnos</p>
          </div>

          {/* Acceso profesor */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setProfMode(!profMode)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-2"
              aria-expanded={profMode}
            >
              <Shield className="w-4 h-4" />
              Acceso profesor
            </button>
            {profMode && (
              <form onSubmit={handleProfAccess} className="mt-3 flex items-center gap-2">
                <input
                  type="password"
                  value={profCode}
                  onChange={(e) => setProfCode(e.target.value)}
                  placeholder="Código"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  aria-label="Código profesor"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Entrar
                </button>
              </form>
            )}
            {profError && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">{profError}</div>
            )}
          </div>
          
          {/* Acceso admin */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setAdminMode(!adminMode)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-2"
              aria-expanded={adminMode}
            >
              <Shield className="w-4 h-4" />
              Acceso admin
            </button>
            {adminMode && (
              <form onSubmit={handleAdminAccess} className="mt-3 flex items-center gap-2">
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Código"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  aria-label="Código admin"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Entrar
                </button>
              </form>
            )}
            {adminError && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">{adminError}</div>
            )}
          </div>
          
          {/* Acceso demo alumnos */}
          {demoEnabled && (
            <div className="mt-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/demo/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
                    const json = await res.json().catch(() => null as any);
                    if (!res.ok || !json?.ok) throw new Error("No se pudo activar el acceso demo");
                    router.push("/cursos");
                  } catch (e) {}
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Acceso demo alumnos"
              >
                Ver Panel Alumno (demo)
              </button>
            </div>
          )}
        </div>

        {/* Cursos activos y interés */}
        <div className="mt-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cursos activos</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <div className="font-semibold text-gray-900 dark:text-white">Liquidación de Sueldos</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">300 horas (clases + estudio) • 6 meses</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Certificación nacional del Consejo Federal para la Capacitación Académica
              </div>
              <button
                className="mt-3 px-3 py-2 text-xs rounded-lg bg-blue-600 text-white"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/intereses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ curso_id: "liquidacion-sueldos", email }),
                    });
                    alert("Si estás interesado, el administrativo te pasará contenido y promociones para alumnos.");
                  } catch {}
                }}
              >
                Me interesa
              </button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <div className="font-semibold text-gray-900 dark:text-white">Diplomatura en Gestión y Control Documental</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">250 horas (clases + estudio) • 6 meses</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Certificación nacional de la Cámara Argentina para la Capacitación Permanente
              </div>
              <button
                className="mt-3 px-3 py-2 text-xs rounded-lg bg-blue-600 text-white"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/intereses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ curso_id: "gestion-documental", email }),
                    });
                    alert("Si estás interesado, el administrativo te pasará contenido y promociones para alumnos.");
                  } catch {}
                }}
              >
                Me interesa
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>“Formación que impulsa tu futuro • v2”</p>
          <p className="mt-2">Todos los derechos reservados a Elevar Formación Técnica</p>
        </div>
      </div>
    </div>
    </Suspense>
  );
}
