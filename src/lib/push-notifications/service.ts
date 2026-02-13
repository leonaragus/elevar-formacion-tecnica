// Push Notification Service
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    curso_id?: string;
    url?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }

  // Initialize the service worker
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.swRegistration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready');

      return true;
    } catch (error) {
      console.error('Failed to register Service Worker:', error);
      return false;
    }
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Subscribe to push notifications for a specific course
  async subscribeToCourse(cursoId: string, accessToken?: string): Promise<PushSubscriptionData | null> {
    if (!this.swRegistration) {
      console.error('Service Worker not registered');
      await this.initialize();
      if (!this.swRegistration) throw new Error('No se pudo inicializar el Service Worker');
    }

    if (!this.vapidPublicKey) {
      console.error('VAPID public key is missing');
      throw new Error('Configuración de notificaciones incompleta (VAPID)');
    }

    if (this.getPermissionStatus() !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }
    }

    try {
      console.log('Subscribing to push notifications...');
      // Convert VAPID public key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // Subscribe to push notifications with a timeout
      const subscribePromise = this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado al suscribir')), 15000)
      );

      const subscription = await Promise.race([subscribePromise, timeoutPromise]) as PushSubscription;
      console.log('Push subscription successful:', subscription);

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || '',
          auth: subscription.toJSON().keys?.auth || ''
        }
      };

      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionData, cursoId, accessToken);
      return subscriptionData;
    } catch (error: any) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications for a specific course
  async unsubscribeFromCourse(cursoId: string, accessToken?: string): Promise<boolean> {
    if (!this.swRegistration) {
      console.error('Service Worker not registered');
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (!subscription) {
        console.log('No active subscription');
        return true;
      }

      // Remove subscription from server
      const success = await this.removeSubscriptionFromServer(cursoId, accessToken);
      if (success) {
        await subscription.unsubscribe();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Get all active subscriptions
  async getActiveSubscriptions(): Promise<PushSubscriptionData[]> {
    if (!this.swRegistration) {
      return [];
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (!subscription) {
        return [];
      }

      return [{
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || '',
          auth: subscription.toJSON().keys?.auth || ''
        }
      }];
    } catch (error) {
      console.error('Failed to get active subscriptions:', error);
      return [];
    }
  }

  // Send subscription data to server
  private async sendSubscriptionToServer(subscription: PushSubscriptionData, cursoId: string, accessToken?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({
          subscription,
          curso_id: cursoId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error during subscription:', errorData);
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      return true;
    } catch (error: any) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(cursoId: string, accessToken?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({
          curso_id: cursoId
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      return false;
    }
  }

  // Convert URL base64 to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String) {
      throw new Error('VAPID public key is empty');
    }
    
    // Limpiar la clave de posibles espacios o comillas
    const cleanKey = base64String.trim().replace(/['"]/g, '');
    
    const padding = '='.repeat((4 - cleanKey.length % 4) % 4);
    const base64 = (cleanKey + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    try {
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (e) {
      console.error('Error decoding VAPID key with atob. Key length:', cleanKey.length, 'Base64 length:', base64.length);
      throw new Error('La clave VAPID no tiene un formato Base64 válido. Verifica las variables de entorno.');
    }
  }

  // Send a test notification
  async sendTestNotification(): Promise<void> {
    if (this.getPermissionStatus() !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      await this.swRegistration?.showNotification('Test Notification', {
        body: 'This is a test push notification!',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-notification',
        data: {
          url: '/'
        }
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }
}

// Create singleton instance
export const pushNotificationService = new PushNotificationService();

// Helper functions
export const initializePushNotifications = async (): Promise<boolean> => {
  return await pushNotificationService.initialize();
};

export const subscribeToCourseNotifications = async (cursoId: string, accessToken?: string): Promise<PushSubscriptionData | null> => {
  return await pushNotificationService.subscribeToCourse(cursoId, accessToken);
};

export const unsubscribeFromCourseNotifications = async (cursoId: string, accessToken?: string): Promise<boolean> => {
  return await pushNotificationService.unsubscribeFromCourse(cursoId, accessToken);
};

export const isPushNotificationSupported = (): boolean => {
  return pushNotificationService.isSupported();
};

export const getNotificationPermission = (): NotificationPermission => {
  return pushNotificationService.getPermissionStatus();
};

// Función para enviar notificación push a un usuario específico
export async function sendPushNotification({
  userEmail,
  cursoId,
  title,
  body,
  data = {}
}: {
  userEmail: string;
  cursoId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: userEmail,
        curso_id: cursoId,
        title,
        body,
        data
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: errorData.error || 'Failed to send notification' };
    }

    const result = await response.json();
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Network error' };
  }
}