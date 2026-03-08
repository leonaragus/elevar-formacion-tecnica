import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest) {
  try {
    const { curso_id, title, body, icon, data, user_email } = await request.json();

    if (!curso_id || !title || !body) {
      return NextResponse.json(
        { error: 'curso_id, title, and body are required' },
        { status: 400 }
      );
    }

    // Initialize web-push if not already done
    const webPushInitialized = initializeWebPush();
    if (!webPushInitialized) {
      return NextResponse.json(
        { error: 'Push notifications not properly configured' },
        { status: 500 }
      );
    }

    // Verify admin authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.rol !== 'admin' && profile.rol !== 'instructor')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get subscriptions based on parameters
    let subscriptions;
    
    if (user_email) {
      // Send to specific user
      const { data: userData, error: userError } = await supabase
        .from('perfiles')
        .select('id')
        .eq('email', user_email)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      const { data: subs, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('curso_id', curso_id)
        .eq('user_id', userData.id)
        .eq('status', 'active');

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return NextResponse.json({ error: 'Error al obtener suscripciones' }, { status: 500 });
      }

      subscriptions = subs;
    } else {
      // Send to all subscribers of the course
      const { data: subs, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('curso_id', curso_id)
        .eq('status', 'active');

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return NextResponse.json({ error: 'Error al obtener suscripciones' }, { status: 500 });
      }

      subscriptions = subs;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No hay suscripciones activas para este curso' }, { status: 200 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    // Send notifications to all subscribers
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: JSON.parse(subscription.keys)
        };

        const payload = JSON.stringify({
          title,
          body,
          icon: icon || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            curso_id,
            notification_id: Date.now().toString(),
            ...data
          },
          timestamp: Date.now()
        });

        const result = await webpush.sendNotification(
          pushSubscription,
          payload
        );

        sentCount++;
        results.push({
          user_id: subscription.user_id,
          status: 'sent',
          messageId: result.headers['location'] || 'unknown'
        });

      } catch (error: any) {
        failedCount++;
        console.error(`Error sending to user ${subscription.user_id}:`, error);
        
        // Handle specific error cases
        if (error.statusCode === 410) {
          // Subscription expired, mark as inactive
          await supabase
            .from('push_subscriptions')
            .update({ status: 'inactive' })
            .eq('id', subscription.id);
          
          results.push({
            user_id: subscription.user_id,
            status: 'expired',
            error: 'Subscription expired'
          });
        } else {
          results.push({
            user_id: subscription.user_id,
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    // Store notification history
    const { error: historyError } = await supabase
      .from('notification_history')
      .insert({
        curso_id,
        title,
        body,
        sent_by: user.id,
        sent_count: sentCount,
        failed_count: failedCount,
        results
      });

    if (historyError) {
      console.error('Error storing notification history:', historyError);
    }

    return NextResponse.json({
      message: 'Notificaciones enviadas',
      sent: sentCount,
      failed: failedCount,
      total: subscriptions.length,
      results
    });

  } catch (error: any) {
    console.error('Error en POST /api/notifications/send:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
