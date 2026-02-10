"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNotificationSender from "@/components/AdminNotificationSender";
import { Shield, ArrowLeft, Bell, Users, TrendingUp } from "lucide-react";

interface NotificationStats {
  total_courses: number;
  total_subscribers: number;
  total_notifications_sent: number;
  active_courses: number;
}

export default function AdminNotificacionesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminStatus();
    loadStats();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token'))?.split('=')[1];
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user?.role !== 'admin' && data.user?.role !== 'instructor') {
          router.push('/');
          return;
        }
        setIsAdmin(true);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token'))?.split('=')[1];
      
      if (!token) return;

      const response = await fetch('/api/admin/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          </div>
          <p className="text-gray-600 mt-2">Gestión de notificaciones push para cursos</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Notificaciones</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_notifications_sent}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Suscriptores</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_subscribers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cursos Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_courses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cursos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_courses}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <AdminNotificationSender />
          </div>
          
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Estadísticas por Curso</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Uso de Notificaciones</h4>
                  <div className="text-sm text-gray-600">
                    <p>• Las notificaciones se envían solo a usuarios suscritos</p>
                    <p>• Los usuarios pueden gestionar sus suscripciones individualmente</p>
                    <p>• Se recomienda no abusar del envío de notificaciones</p>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Mejores Prácticas</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Mantén los mensajes claros y relevantes</li>
                    <li>• Considera el horario al enviar</li>
                    <li>• No envíes demasiadas notificaciones</li>
                    <li>• Usa títulos descriptivos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}