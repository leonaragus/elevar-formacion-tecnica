'use client';

import { useState, useEffect, Suspense } from "react";
import { Mail, LogIn, Shield, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  const searchParams = useSearchParams();
  useEffect(() => {
    const err = searchParams?.get('error');
    const message = searchParams?.get('message');
    if (err === 'pendiente') {
      setError("Tu cuenta está pendiente de aprobación por un administrador.");
    }
    if (message === 'check_email') {
        setError("¡Gracias por registrarte! Por favor, revisa tu correo para confirmar tu cuenta antes de iniciar sesión.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      // El middleware se encargará de la redirección, así que solo limpiamos el error.
      router.push('/'); // Redirige a la raíz, el middleware decidirá el destino final.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email o contraseña incorrectos. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 lg:p-8 border border-gray-200/20 dark:border-gray-700/30">
      <div className="text-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Elevar Formación Técnica
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ingresa con tu email para acceder a la plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute h-5 w-5 text-gray-400 top-1/2 left-3 -translate-y-1/2 pointer-events-none" />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute h-5 w-5 text-gray-400 top-1/2 left-3 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
          </div>
        </div>
        
        {error && (
          <div className="p-3 rounded-lg flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center transition-all duration-200"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <LogIn className="h-5 w-5 mr-2" />
              Iniciar sesión
            </>
          )}
        </button>

         <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2">
            ¿No tienes una cuenta? <Link href="/registro" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Regístrate aquí</Link>
        </p>

      </form>

    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}> 
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
           <AuthForm />
           <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
             <p>&copy; {new Date().getFullYear()} Elevar Formación Técnica. Todos los derechos reservados.</p>
           </footer>
        </div>
      </div>
    </Suspense>
  );
}
