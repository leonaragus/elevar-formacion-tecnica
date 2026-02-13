import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getApiUser } from '@/lib/api-auth';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { subscription, curso_id } = await request.json();

    if (!subscription || !curso_id) {
      return NextResponse.json(
        { error: 'Subscription and curso_id are required' },
        { status: 400 }
      );
    }

    // Get the current user using our helper
    const { user } = await getApiUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Check if user is enrolled in the course
    // Si el user.id es un email (cookie_only), usamos eso para buscar
    console.log('Verificando inscripción para:', { userId: user.id, email: user.email, cursoId: curso_id });
    
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('cursos_alumnos')
      .select('id, user_id, email, estado')
      .eq('curso_id', curso_id)
      .or(`user_id.eq."${user.id}",email.eq."${user.email}"`)
      .eq('estado', 'activo')
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      console.error('Error de inscripción o no encontrado:', enrollmentError, enrollment);
      return NextResponse.json(
        { error: 'User not enrolled in this course or enrollment not active' },
        { status: 403 }
      );
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('curso_id', curso_id)
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Subscription updated' });
    } else {
      // Create new subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          user_email: user.email,
          curso_id: curso_id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        });

      if (error) {
        console.error('Error creating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Subscription created' });
    }
  } catch (error) {
    console.error('Error in subscribe API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}