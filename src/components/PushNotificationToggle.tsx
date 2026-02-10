"use client";

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

interface PushNotificationToggleProps {
  cursoId: string;
  className?: string;
}

export default function PushNotificationToggle({ cursoId, className = "" }: PushNotificationToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'checking' | 'subscribed' | 'unsubscribed' | 'unsupported'>('checking');

  useEffect(() => {
    checkSubscriptionStatus();
  }, [cursoId]);

  const checkSubscriptionStatus = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setSubscriptionStatus('unsupported');
      return;
    }

    try {
      const response = await fetch(`/api/notifications/status?curso_id=${cursoId}`, {
        headers: {
          'Authorization': `Bearer ${document.cookie.includes('sb-access-token') ? 'token' : ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscribed ? 'subscribed' : 'unsubscribed');
        setIsEnabled(data.subscribed);
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
      if (isEnabled) {
        // Unsubscribe
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.includes('sb-access-token') ? 'token' : ''}`
          },
          body: JSON.stringify({ curso_id: cursoId })
        });

        if (response.ok) {
          setIsEnabled(false);
          setSubscriptionStatus('unsubscribed');
        }
      } else {
        // Subscribe
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            alert('Se requiere permiso para recibir notificaciones');
            setIsLoading(false);
            return;
          }
        }

        if (Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          });

          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${document.cookie.includes('sb-access-token') ? 'token' : ''}`
            },
            body: JSON.stringify({
              curso_id: cursoId,
              subscription: subscription.toJSON()
            })
          });

          if (response.ok) {
            setIsEnabled(true);
            setSubscriptionStatus('subscribed');
          }
        }
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Error al cambiar el estado de suscripción');
    } finally {
      setIsLoading(false);
    }
  };

  if (subscriptionStatus === 'unsupported') {
    return (
      <div className={`flex items-center p-3 bg-gray-100 rounded-lg ${className}`}>
        <BellOff className="w-5 h-5 text-gray-500 mr-2" />
        <span className="text-sm text-gray-600">Las notificaciones no son soportadas en este navegador</span>
      </div>
    );
  }

  if (subscriptionStatus === 'checking') {
    return (
      <div className={`flex items-center p-3 bg-gray-100 rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
        <span className="text-sm text-gray-600">Verificando estado...</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center p-3 rounded-lg transition-colors ${
        isEnabled
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
      ) : isEnabled ? (
        <Bell className="w-5 h-5 mr-2" />
      ) : (
        <BellOff className="w-5 h-5 mr-2" />
      )}
      <span className="text-sm font-medium">
        {isLoading ? 'Procesando...' : isEnabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
      </span>
    </button>
  );
}