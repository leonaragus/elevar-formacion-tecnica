import webpush from 'web-push';
import { SupabaseClient } from '@supabase/supabase-js';

// Configure web-push with error handling
function initializeWebPush() {
  try {
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@tuinstituto.com';
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys not configured');
      return false;
    }

    webpush.setVapidDetails(
      vapidSubject,
      publicKey,
      privateKey
    );
    return true;
  } catch (error) {
    console.error('Error initializing web-push:', error);
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export async function sendPushNotificationToServer(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushNotificationPayload
) {
  if (!initializeWebPush()) {
    throw new Error('Push notifications not configured');
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

export async function sendNotificationToUser(
  supabase: SupabaseClient,
  params: {
    userEmail: string;
    cursoId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }
) {
  const { userEmail, cursoId, title, body, data } = params;

  try {
    // 1. Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.error(`User not found for email ${userEmail}:`, userError);
      return { success: false, error: 'User not found' };
    }

    // 2. Get subscriptions for this user and course
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('user_id', userData.id);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return { success: false, error: 'Error fetching subscriptions' };
    }

    if (!subs || subs.length === 0) {
      console.log(`No subscriptions found for user ${userEmail} in course ${cursoId}`);
      return { success: false, error: 'No subscriptions found' };
    }

    // 3. Send notifications
    const payload: PushNotificationPayload = {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `notification-${cursoId}-${Date.now()}`,
      data
    };

    let sentCount = 0;
    const errors = [];

    for (const sub of subs) {
      const subscription = sub.subscription as { endpoint: string; keys: { p256dh: string; auth: string } };
      const result = await sendPushNotificationToServer(subscription, payload);
      
      if (result.success) {
        sentCount++;
      } else {
        errors.push(result.error);
        // Optional: Remove invalid subscription
        if ((result.error as any)?.statusCode === 410) {
           await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return { 
      success: sentCount > 0, 
      sentCount, 
      total: subs.length,
      errors: errors.length > 0 ? errors : undefined 
    };

  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    return { success: false, error };
  }
}
