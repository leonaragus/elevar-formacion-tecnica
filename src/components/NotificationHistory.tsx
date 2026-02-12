"use client";

import { useState, useEffect } from "react";
import { Clock, Bell, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  curso_id: string;
  curso_titulo: string;
  created_at: string;
  user_id: string;
  read: boolean;
}

interface NotificationHistoryProps {
  cursoId?: string;
  limit?: number;
}

export default function NotificationHistory({ cursoId, limit = 50 }: NotificationHistoryProps) {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadHistory();
  }, [cursoId, limit]);

  const loadHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/notifications/history?limit=${limit}${cursoId ? `&curso_id=${cursoId}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error loading notification history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      await fetch(`/api/notifications/history/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local state
      setHistory(prev => prev.map(item => 
        item.id === notificationId ? { ...item, read: true } : item
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Historial de Notificaciones</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Historial de Notificaciones</h3>
        </div>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No hay notificaciones en el historial</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <Bell className="w-5 h-5 mr-2 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Historial de Notificaciones</h3>
        <span className="ml-auto text-sm text-gray-500">
          {history.filter(h => !h.read).length} sin leer
        </span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {history.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition-colors ${
              notification.read 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.body}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{formatDate(notification.created_at)}</span>
                  <span className="mx-2">•</span>
                  <span className="text-blue-600 font-medium">
                    {notification.curso_titulo}
                  </span>
                </div>
              </div>
              
              {!notification.read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="ml-3 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors"
                  title="Marcar como leída"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}