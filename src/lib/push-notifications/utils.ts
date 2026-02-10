import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface NotificationData {
  title: string;
  body: string;
  curso_id: string;
  url?: string;
  [key: string]: any;
}

/**
 * Send push notification to all subscribers of a course
 * This function is designed to be called when admin sends a message
 */
export async function sendCoursePushNotification(data: NotificationData) {
  try {
    const { title, body, curso_id, ...additionalData } = data;

    if (!title || !body || !curso_id) {
      console.error("Missing required notification data");
      return { ok: false, error: "Missing required fields" };
    }

    // Call the API to send push notifications
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        curso_id,
        data: additionalData
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("Failed to send push notification:", errorData);
      return { ok: false, error: errorData.error };
    }

    const result = await response.json();
    console.log("Push notification sent successfully:", result);
    return result;

  } catch (error) {
    console.error("Error sending push notification:", error);
    return { ok: false, error: "Network error" };
  }
}

/**
 * Send push notification to a specific user
 */
export async function sendUserPushNotification(data: NotificationData & { user_id: string }) {
  try {
    const { title, body, user_id, curso_id, ...additionalData } = data;

    if (!title || !body || !user_id) {
      console.error("Missing required notification data");
      return { ok: false, error: "Missing required fields" };
    }

    const response = await fetch('/api/notifications/send', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        user_id,
        curso_id,
        data: additionalData
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("Failed to send user push notification:", errorData);
      return { ok: false, error: errorData.error };
    }

    const result = await response.json();
    console.log("User push notification sent successfully:", result);
    return result;

  } catch (error) {
    console.error("Error sending user push notification:", error);
    return { ok: false, error: "Network error" };
  }
}

/**
 * Get notification history for a course
 */
export async function getNotificationHistory(cursoId: string, limit: number = 50) {
  try {
    const response = await fetch(`/api/notifications/send?curso_id=${cursoId}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("Failed to get notification history:", errorData);
      return { ok: false, error: errorData.error };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error("Error getting notification history:", error);
    return { ok: false, error: "Network error" };
  }
}

/**
 * Integrate with existing admin messages - this function should be called
 * when an admin creates a new message to also send push notifications
 */
export async function notifyCourseSubscribers(messageData: {
  titulo: string;
  contenido: string;
  curso_id?: string;
}) {
  try {
    const { titulo, contenido, curso_id } = messageData;

    // Only send push notifications if there's a course ID
    if (!curso_id) {
      console.log("No course ID provided, skipping push notification");
      return { ok: true, message: "No course ID, push notification skipped" };
    }

    // Send push notification to course subscribers
    const result = await sendCoursePushNotification({
      title: titulo,
      body: contenido,
      curso_id: curso_id,
      url: `/cursos/${curso_id}`
    });

    return result;

  } catch (error) {
    console.error("Error notifying course subscribers:", error);
    return { ok: false, error: "Failed to notify subscribers" };
  }
}