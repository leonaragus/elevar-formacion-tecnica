"use client";

import { useState, useEffect, Suspense } from "react";
import { Mail, LogIn, Shield, BookOpen, GraduationCap, PenTool } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
const demoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";

function AcademicIllustration() {
  return (
    <div className="relative h-full w-full flex items-center justify-center p-8">
      <div className="relative z-10 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
            <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Elevar Formación Técnica
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Formación que impulsa tu futuro
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          <div className="flex flex-col items-center p-4 bg-white/10 dark:bg-gray-800/20 rounded-lg backdrop-blur-sm">
            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Aprendizaje</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white/10 dark:bg-gray-800/20 rounded-lg backdrop-blur-sm">
            <PenTool className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Desarrollo</span>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="inline-flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 opacity-10">
        <svg width="220" height="170" viewBox="0 0 200 150" className="absolute top-12 left-12">
          <path d="M40,50 L80,50 L80,100 L40,100 Z" fill="none" stroke="#374151" strokeWidth="1.5"/>
          <path d="M80,50 L120,50 L120,100 L80,100 Z" fill="none" stroke="#374151" strokeWidth="1.5"/>
          <line x1="60" y1="60" x2="100" y2="60" stroke="#6b7280" strokeWidth="1"/>
          <line x1="60" y1="70" x2="100" y2="70" stroke="#6b7280" strokeWidth="1"/>
          <path d="M140,40 L150,30 L160,40 L155,45 Z" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
          <line x1="150" y1="30" x2="150" y2="80" stroke="#000" strokeWidth="1.5"/>
          <circle cx="180" cy="60" r="8" fill="none" stroke="#4b5563" strokeWidth="1.5"/>
          <circle cx="160" cy="60" r="8" fill="none" stroke="#4b5563" strokeWidth="1.5"/>
          <path d="M172,60 L168,60" stroke="#4b5563" strokeWidth="1.5"/>
        </svg>
        <div className="absolute bottom-10 right-10">
          <PenTool className="h-12 w-12 text-green-400" />
        </div>
        <div className="absolute top-1/2 left-1/4">
          <GraduationCap className="h-8 w-8 text-purple-400" />
        </div>
      </div>
    </div>
  );
}

function ModeEffect({ setError }: { setError: (v: string | null) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error === 'pendiente') {
      setError("Tu solicitud está pendiente de aprobación. Por favor espera a ser contactado por el administrador.");
    }
  }, [searchParams, setError]);
  return null;
}

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const [profMode, setProfMode] = useState(false);
  const [profCode, setProfCode] = useState("");
  const [profError, setProfError] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [cursosPublicos, setCursosPublicos] = useState<any[]>([]);
  const [cursosCargando, setCursosCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursosCargando(true);
    fetch("/api/admin/cursos?public=1", { headers: { "x-public": "1" } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.cursos)) {
          setCursosPublicos(data.cursos);
        }
      })
      .catch(() => {})
      .finally(() => setCursosCargando(false));
  }, []);

  const handleProfAccess = async () => {
    if (!profCode.trim()) {
      setProfError("Ingresa el código de profesor");
      return;
    }
    setProfError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/profesor/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: profCode }),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Código inválido");
      }
      router.push("/prof");
    } catch (err) {
      setProfError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = async () => {
    if (!adminCode.trim()) {
      setAdminError("Ingresa el código de administrador");
      return;
    }
    setAdminError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/profesor/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode }),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Código inválido");
      }
      router.push("/admin/dashboard");
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ModeEffect setError={setError} />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20">
        <div className="flex min-h-screen">
          {/* Panel lateral izquierdo - Ilustración académica */}
          <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900">
            <AcademicIllustration />
          </div>
          
          {/* Panel derecho - Formulario */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-md">
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 lg:p-8 border border-gray-200/20 dark:border-gray-700/30">
                <div className="text-center mb-6">
                  <div className="lg:hidden mb-4 flex items-center justify-center">
                    <svg width="140" height="110" viewBox="0 0 200 150" className="opacity-90">
                      <path d="M40,50 L80,50 L80,100 L40,100 Z" fill="none" stroke="#374151" strokeWidth="1.5"/>
                      <path d="M80,50 L120,50 L120,100 L80,100 Z" fill="none" stroke="#374151" strokeWidth="1.5"/>
                      <line x1="60" y1="60" x2="100" y2="60" stroke="#6b7280" strokeWidth="1"/>
                      <line x1="60" y1="70" x2="100" y2="70" stroke="#6b7280" strokeWidth="1"/>
                      <path d="M140,40 L150,30 L160,40 L155,45 Z" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
                      <line x1="150" y1="30" x2="150" y2="80" stroke="#000" strokeWidth="1.5"/>
                      <circle cx="180" cy="60" r="8" fill="none" stroke="#4b5563" strokeWidth="1.5"/>
                      <circle cx="160" cy="60" r="8" fill="none" stroke="#4b5563" strokeWidth="1.5"/>
                      <path d="M172,60 L168,60" stroke="#4b5563" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    Elevar Formación Técnica
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Ingreso de alumnos: escribí tu email para solicitar cursado
                  </p>
                </div>

            {profMode ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Acceso de Profesor
                  </h3>
                </div>
                
                <div>
                  <input
                    type="text"
                    placeholder="Código de profesor"
                    value={profCode}
                    onChange={(e) => setProfCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={loading}
                  />
                  {profError && (
                    <p className="text-red-500 text-sm mt-1">{profError}</p>
                  )}
                </div>
                
                <button
                  onClick={handleProfAccess}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Acceder como Profesor'}
                </button>
                
                <button
                  onClick={() => setProfMode(false)}
                  className="w-full text-gray-600 dark:text-gray-400 py-1 px-4 rounded-md hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                >
                  ← Volver al login
                </button>
              </div>
            ) : adminMode ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Acceso de Administrador
                  </h3>
                </div>
                
                <div>
                  <input
                    type="text"
                    placeholder="Código de administrador"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={loading}
                  />
                  {adminError && (
                    <p className="text-red-500 text-sm mt-1">{adminError}</p>
                  )}
                </div>
                
                <button
                  onClick={handleAdminAccess}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Acceder como Administrador'}
                </button>
                
                <button
                  onClick={() => setAdminMode(false)}
                  className="w-full text-gray-600 dark:text-gray-400 py-1 px-4 rounded-md hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                >
                  ← Volver al login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="tu.email@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      disabled={loading}
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
                    <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}
                
                {ok && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2">
                    <p className="text-green-600 dark:text-green-400 text-sm">{ok}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Ingresar
                    </>
                  )}
                </button>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="text-center space-y-1">
                    <button
                      type="button"
                      onClick={() => setProfMode(true)}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Acceso de profesor
                    </button>
                    <br />
                    <button
                      type="button"
                      onClick={() => setAdminMode(true)}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Acceso de administrador
                    </button>
                  </div>
                </div>
              </form>
            )}
            
            {demoEnabled && isLogin && !profMode && !adminMode && (
              <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-yellow-700 dark:text-yellow-400 text-xs text-center">
                  Modo demo activado. Usa cualquier email para probar.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 w-full max-w-3xl mx-auto">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Cursados disponibles
            </h2>
            {cursosCargando ? (
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Cargando cursados...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(cursosPublicos || []).slice(0, 4).map((c: any) => (
                  <Link
                    key={String(c.id)}
                    href={`/cursos/${String(c.id)}`}
                    className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {String(c.titulo ?? "Curso")}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {String(c.descripcion ?? "Explora este cursado para más información")}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {(cursosPublicos || []).length > 4 && (
                  <Link
                    href="/cursos"
                    className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition text-center"
                  >
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Ver todos los cursados
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium">&quot;Formación que impulsa tu futuro • v2&quot;</p>
            <p className="mt-1 text-xs opacity-75">Todos los derechos reservados a Elevar Formación Técnica</p>
          </div>
        </div>
      </div>
    </div>
      </div>
    </Suspense>
  );
}
