// Service Worker for Push Notifications
const CACHE_NAME = 'push-notifications-v1';
const NOTIFICATION_ICON = '/icon-192x192.png'; // Add your app icon

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.log('[SW] Error parsing push data:', e);
    return;
  }

  const { title, body, icon, badge, tag, data: notificationData, actions } = data;

  const options = {
    body: body || 'Nueva notificación',
    icon: icon || NOTIFICATION_ICON,
    badge: badge || NOTIFICATION_ICON,
    tag: tag || 'default',
    data: notificationData || {},
    actions: actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true
  };

  // Add course-specific styling
  if (notificationData?.curso_id) {
    options.tag = `curso-${notificationData.curso_id}`;
    options.data.curso_id = notificationData.curso_id;
  }

  event.waitUntil(
    self.registration.showNotification(title || 'Notificación', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();

  const data = event.notification.data || {};
  const { curso_id, url } = data;

  // Handle action button clicks
  if (event.action) {
    // Handle specific actions if needed
    console.log('[SW] Action clicked:', event.action);
  }

  // Determine where to navigate
  let navigateUrl = '/';
  if (url) {
    navigateUrl = url;
  } else if (curso_id) {
    navigateUrl = `/cursos/${curso_id}`;
  }

  event.waitUntil(
    clients.openWindow(navigateUrl)
  );
});

// Handle background sync if needed
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(handleNotificationSync());
  }
});

async function handleNotificationSync() {
  try {
    // Sync notification delivery status with server
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      console.log('[SW] Notification sync successful');
    }
  } catch (error) {
    console.log('[SW] Notification sync failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription change event:', event);
  
  event.waitUntil(
    handlePushSubscriptionChange(event.oldSubscription, event.newSubscription)
  );
});

async function handlePushSubscriptionChange(oldSubscription, newSubscription) {
  try {
    // Notify the server about the subscription change
    const response = await fetch('/api/notifications/subscription-change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldSubscription: oldSubscription,
        newSubscription: newSubscription
      })
    });
    
    if (response.ok) {
      console.log('[SW] Subscription change handled successfully');
    }
  } catch (error) {
    console.log('[SW] Failed to handle subscription change:', error);
  }
}