'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { 
  subscribeToCourseNotifications, 
  unsubscribeFromCourseNotifications, 
  isPushNotificationSupported,
  getNotificationPermission,
  initializePushNotifications
} from '@/lib/push-notifications/service';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface PushNotificationToggleProps {
  cursoId: string;
  cursoTitle?: string; // Añadido para mostrar mensajes más específicos
  className?: string;
}

export default function PushNotificationToggle({ cursoId, cursoTitle, className = "" }: PushNotificationToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'checking' | 'subscribed' | 'unsubscribed' | 'unsupported'>('checking');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const init = async () => {
      const supported = isPushNotificationSupported();
      if (!supported) {
        setSubscriptionStatus('unsupported');
        return;
      }
      
      try {
        // Asegurarse de que el Service Worker esté registrado con un timeout para evitar bloqueos
        const initPromise = initializePushNotifications();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al inicializar Service Worker')), 5000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        await checkSubscriptionStatus();
      } catch (error) {
        console.error('Error initializing notifications:', error);
        // No bloqueamos todo si falla la inicialización, pero marcamos como desuscrito por ahora
        setSubscriptionStatus('unsubscribed');
      }
    };
    
    init();
  }, [cursoId]);

  const checkSubscriptionStatus = async () => {
    try {
      let token: string | undefined;
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;

      const response = await fetch(`/api/notifications/status?curso_id=${cursoId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscribed ? 'subscribed' : 'unsubscribed');
        setIsEnabled(data.subscribed);
      } else if (response.status === 401) {
        // No autorizado suele significar que no hay sesión ni cookie válida
        setSubscriptionStatus('unsubscribed');
        setIsEnabled(false);
      } else {
        setSubscriptionStatus('unsubscribed');
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setSubscriptionStatus('unsubscribed');
    }
  };

  const handleToggle = async () => {
    if (subscriptionStatus === 'unsupported') return;

    setIsLoading(true);
    try {
      let token: string | undefined;
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;

      // Si no hay token, la API intentará usar la cookie automáticamente.
      // El helper getApiUser se encarga de eso.

      if (isEnabled) {
        const success = await unsubscribeFromCourseNotifications(cursoId, token);
        if (success) {
          setIsEnabled(false);
          setSubscriptionStatus('unsubscribed');
        } else {
          throw new Error('No se pudo cancelar la suscripción');
        }
      } else {
        const subscription = await subscribeToCourseNotifications(cursoId, token);
        if (subscription) {
          setIsEnabled(true);
          setSubscriptionStatus('subscribed');
        } else {
          throw new Error('No se pudo activar la suscripción');
        }
      }
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      alert(error.message || 'Error al actualizar las notificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const titleText = cursoTitle ? ` para "${cursoTitle}"` : '';

  if (subscriptionStatus === 'unsupported') {
    return (
      <div className={`flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <BellOff className="w-5 h-5 text-gray-500 mr-2" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Notificaciones no soportadas</span>
      </div>
    );
  }

  if (subscriptionStatus === 'checking') {
    return (
      <div className={`flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Verificando...</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center p-3 rounded-lg transition-colors w-full sm:w-auto justify-center ${
        isEnabled
          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : isEnabled ? (
        <Bell className="w-5 h-5 mr-2" />
      ) : (
        <BellOff className="w-5 h-5 mr-2" />
      )}
      <span className="text-sm font-medium">
        {isLoading
          ? 'Procesando...'
          : isEnabled
          ? `Notificaciones activadas${titleText}`
          : `Activar notificaciones${titleText}`}
      </span>
    </button>
  );
}
