"use client";

import { useState, useEffect } from "react";
import { Bell, Send, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import NotificationHistory from "@/components/NotificationHistory";

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message?: string;
  error?: string;
}

export default function PushNotificationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [cursos, setCursos] = useState<any[]>([]);
  const [isLoadingCursos, setIsLoadingCursos] = useState(true);

  const tests = [
    "Verificar soporte del navegador",
    "Comprobar permisos de notificación",
    "Registrar Service Worker",
    "Conectar con base de datos",
    "Probar suscripción a curso",
    "Enviar notificación de prueba",
    "Verificar historial de notificaciones"
  ];

  useEffect(() => {
    loadCursos();
  }, []);

  const loadCursos = async () => {
    setIsLoadingCursos(true);
    try {
      const response = await fetch('/api/cursos');
      if (response.ok) {
        const data = await response.json();
        setCursos(data.cursos || []);
        if (data.cursos && data.cursos.length > 0) {
          setSelectedCurso(data.cursos[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading cursos:", error);
    } finally {
      setIsLoadingCursos(false);
    }
  };

  const runTests = async () => {
    setIsTesting(true);
    setTestResults([]);

    // Test 1: Browser Support
    await runTest("Verificar soporte del navegador", async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error("Service Worker no soportado");
      }
      if (!('PushManager' in window)) {
        throw new Error("Push API no soportada");
      }
      if (!('Notification' in window)) {
        throw new Error("Notifications API no soportada");
      }
      return "Navegador compatible con notificaciones push";
    });

    // Test 2: Notification Permissions
    await runTest("Comprobar permisos de notificación", async () => {
      const permission = Notification.permission;
      if (permission === 'denied') {
        throw new Error("Notificaciones bloqueadas por el usuario");
      }
      return `Permiso actual: ${permission}`;
    });

    // Test 3: Service Worker Registration
    await runTest("Registrar Service Worker", async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        return "Service Worker registrado exitosamente";
      } catch (error) {
        throw new Error(`Error registrando Service Worker: ${error}`);
      }
    });

    // Test 4: Database Connection
    await runTest("Conectar con base de datos", async () => {
      try {
        const response = await fetch('/api/notifications/subscribe', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          throw new Error("Error de autenticación o conexión");
        }
        return "Conexión con base de datos establecida";
      } catch (error) {
        throw new Error(`Error de conexión: ${error}`);
      }
    });

    // Test 5: Course Subscription
    if (selectedCurso) {
      await runTest("Probar suscripción a curso", async () => {
        try {
          // Check subscription status first
          const response = await fetch(`/api/notifications/unsubscribe?curso_id=${selectedCurso}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          return data.subscribed ? "Ya suscrito al curso" : "Listo para suscribirse";
        } catch (error) {
          throw new Error(`Error verificando suscripción: ${error}`);
        }
      });
    }

    // Test 6: Send Test Notification
    if (selectedCurso) {
      await runTest("Enviar notificación de prueba", async () => {
        try {
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: "Notificación de Prueba",
              body: "Esta es una notificación de prueba del sistema",
              curso_id: selectedCurso,
              data: { test: true }
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error desconocido");
          }
          
          const result = await response.json();
          return `Notificación enviada a ${result.sent} suscriptor(es)`;
        } catch (error) {
          throw new Error(`Error enviando notificación: ${error}`);
        }
      });
    }

    // Test 7: Notification History
    await runTest("Verificar historial de notificaciones", async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCurso) params.append("curso_id", selectedCurso);
        params.append("limit", "5");
        
        const response = await fetch(`/api/notifications/send?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error("Error obteniendo historial");
        }
        
        const data = await response.json();
        return `Historial con ${data.notifications.length} notificaciones`;
      } catch (error) {
        throw new Error(`Error obteniendo historial: ${error}`);
      }
    });

    setIsTesting(false);
  };

  const runTest = async (testName: string, testFunction: () => Promise<string>) => {
    try {
      const message = await testFunction();
      setTestResults(prev => [...prev, {
        test: testName,
        status: 'pass',
        message
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: testName,
        status: 'fail',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }]);
    }
  };

  const sendManualNotification = async () => {
    if (!selectedCurso) return;
    
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "Notificación Manual de Prueba",
          body: "Esta notificación fue enviada manualmente desde la página de prueba",
          curso_id: selectedCurso,
          data: { manual: true, test: true }
        })
      });
      
      if (response.ok) {
        alert("Notificación enviada exitosamente");
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      alert("Error enviando notificación");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pruebas de Notificaciones Push</h1>
              <p className="text-gray-600">Sistema de notificaciones clasificadas por curso</p>
            </div>
          </div>

          {/* Curso Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Curso para pruebas:
            </label>
            <select
              value={selectedCurso}
              onChange={(e) => setSelectedCurso(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingCursos}
            >
              {isLoadingCursos ? (
                <option>Cargando cursos...</option>
              ) : cursos.length > 0 ? (
                cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.titulo}
                  </option>
                ))
              ) : (
                <option>No hay cursos disponibles</option>
              )}
            </select>
          </div>

          {/* Test Controls */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={runTests}
              disabled={isTesting || !selectedCurso}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isTesting ? "Ejecutando pruebas..." : "Ejecutar pruebas"}
            </button>

            <button
              onClick={sendManualNotification}
              disabled={!selectedCurso}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              Enviar notificación manual
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Resultados de las pruebas:</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.status === 'pass'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {result.status === 'pass' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.test}</div>
                      {result.message && (
                        <div className="text-sm text-gray-600">{result.message}</div>
                      )}
                      {result.error && (
                        <div className="text-sm text-red-600">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Demo */}
        {selectedCurso && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo: Control de Notificaciones</h3>
              <PushNotificationToggle
                cursoId={selectedCurso}
                cursoTitle={cursos.find(c => c.id === selectedCurso)?.titulo || "Curso"}
              />
              <p className="text-sm text-gray-600 mt-3">
                Usa este botón para activar o desactivar las notificaciones para este curso.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo: Historial de Notificaciones</h3>
              <NotificationHistory
                cursoId={selectedCurso}
                limit={5}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}