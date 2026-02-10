"use client";

import { useState, useEffect } from "react";
import { Send, Users, Bell, AlertCircle, CheckCircle } from "lucide-react";

interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
}

interface NotificationStats {
  total_courses: number;
  total_subscriptions: number;
  total_notifications_sent: number;
  notifications_today: number;
}

export default function AdminNotificationSender() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [lastSent, setLastSent] = useState<string>("");

  useEffect(() => {
    loadCursos();
    loadStats();
  }, []);

  const loadCursos = async () => {
    try {
      const response = await fetch('/api/cursos', {
        headers: {
          'Authorization': `Bearer ${document.cookie.includes('sb-access-token') ? 'token' : ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCursos(data.cursos || []);
      }
    } catch (error) {
      console.error("Error loading cursos:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${document.cookie.includes('sb-access-token') ? 'token' : ''}`
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

  const handleSendNotification = async () => {
    if (!selectedCurso || !title.trim() || !body.trim()) {
      alert("Por favor completa todos los campos");
      return;
    }

    setIsSending(true);
    
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.includes('sb-access-token') ? 'token' : ''}`
        },
        body: JSON.stringify({
          curso_id: selectedCurso,
          title: title.trim(),
          body: body.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setTitle("");
        setBody("");
        setLastSent(`Notificación enviada exitosamente a ${result.recipients} usuarios`);
        loadStats();
        
        setTimeout(() => setLastSent(""), 5000);
      } else {
        alert(`Error: ${result.error || 'No se pudo enviar la notificación'}`);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Error al enviar la notificación");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Bell className="w-6 h-6 mr-3 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Enviar Notificación</h2>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Cursos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total_courses}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Bell className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Suscripciones</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_subscriptions}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Send className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Enviadas</p>
                <p className="text-2xl font-bold text-purple-600">{stats.total_notifications_sent}</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Hoy</p>
                <p className="text-2xl font-bold text-orange-600">{stats.notifications_today}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {lastSent && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">{lastSent}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="curso" className="block text-sm font-medium text-gray-700 mb-2">
            Curso
          </label>
          <select
            id="curso"
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecciona un curso</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.titulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Título de la notificación
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Nueva clase disponible"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el mensaje de la notificación..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSendNotification}
            disabled={isSending || !selectedCurso || !title.trim() || !body.trim()}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Notificación
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}