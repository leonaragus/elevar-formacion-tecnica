'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AlertCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function RegistroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Llamamos a signUp. Esta función ahora debe manejar la creación del perfil pendiente.
      await signUp(email, password, { nombre, apellido });
      setMessage('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta. Una vez confirmada, espera la aprobación del administrador.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 lg:p-8 border border-gray-200/20 dark:border-gray-700/30">
          <div className="text-center mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Crear una Cuenta</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Ingresa tus datos para registrarte.</p>
          </div>

          {message ? (
             <div className="p-4 rounded-lg text-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                <p>{message}</p>
                <Link href="/auth" className="font-bold text-green-800 dark:text-green-200 hover:underline mt-2 block">Ir a Iniciar Sesión</Link>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellido</label>
                  <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" />
              </div>
              {error && (
                <div className="p-3 rounded-lg flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                  <AlertCircle size={20} /><p className="text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center">
                {loading ? 'Registrando...' : 'Crear Cuenta'}
              </button>
            </form>
          )}
           <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              ¿Ya tienes una cuenta? <Link href="/auth" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Inicia sesión</Link>
            </p>
        </div>
      </div>
    </div>
  );
}
