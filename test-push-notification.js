// Script de prueba para notificaciones push
const testPushNotification = async () => {
  try {
    console.log('🧪 Iniciando prueba de notificaciones push...');
    
    const response = await fetch('http://localhost:3001/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-cron-key'
      },
      body: JSON.stringify({
        curso_id: 'test-curso-1',
        title: '🧪 Prueba de Notificación de Calendario',
        body: 'Esta es una notificación de prueba del sistema de calendario',
        icon: '/icon-192x192.png',
        data: {
          type: 'calendario_entrega',
          entrega_id: 'test-entrega-1',
          curso_id: 'test-curso-1',
          fecha_entrega: '2024-02-15T23:59:59Z',
          dias_restantes: '3'
        }
      })
    });

    const result = await response.json();
    console.log('✅ Respuesta del servidor:', result);
    
    if (response.ok) {
      console.log('🎉 Notificación enviada exitosamente!');
    } else {
      console.log('❌ Error:', result.error || 'Error desconocido');
    }
    
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
  }
};

// Ejecutar la prueba
testPushNotification();