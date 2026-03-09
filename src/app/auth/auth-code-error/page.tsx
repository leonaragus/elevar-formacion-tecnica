
import { MainLayout } from '@/components/MainLayout';
import { AlertTriangle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <MainLayout>
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Error de Autenticación</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          No se pudo iniciar la sesión. El enlace puede haber expirado o ya fue utilizado.
        </p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-300">
          Por favor, intenta iniciar sesión de nuevo. Si el problema persiste, contacta al soporte.
        </p>
      </div>
    </MainLayout>
  );
}
