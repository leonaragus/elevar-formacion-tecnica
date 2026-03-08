'use client';

import { useState, useEffect, Suspense } from "react";
import { Mail, LogIn, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { signIn } = useAuth();

  const searchParams = useSearchParams();
  useEffect(() => {
    const err = searchParams?.get('error');
    if (err === 'pendiente') {
      setError("Tu solicitud de inscripción está pendiente. Recibirás una notificación cuando sea aprobada.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await signIn(email);
      setMessage("¡Revisa tu correo! Te hemos enviado un enlace para iniciar sesión. La ventana se puede cerrar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el enlace de acceso.");
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

      {message ? (
        <div className="p-4 rounded-lg flex flex-col items-center gap-3 text-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          <CheckCircle className="w-12 h-12" />
          <p className="font-semibold text-lg">¡Enlace enviado!</p>
          <p className="text-sm">{message}</p>
        </div>
      ) : (
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
                Enviar enlace de acceso
              </>
            )}
          </button>
        </form>
      )}
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
