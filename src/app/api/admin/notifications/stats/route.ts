import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el usuario es admin o instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: total_courses },
      { count: total_subscriptions },
      { count: total_notifications_sent },
      { count: notifications_today }
    ] = await Promise.all([
      supabase.from('cursos').select('*', { count: 'exact', head: true }),
      supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }),
      supabase.from('notification_history').select('*', { count: 'exact', head: true }),
      supabase.from('notification_history').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
    ]);

    return NextResponse.json({
      total_courses: total_courses || 0,
      total_subscribers: total_subscriptions || 0,
      total_notifications_sent: total_notifications_sent || 0,
      active_courses: total_courses || 0
    });

  } catch (error) {
    console.error('Error en GET /api/admin/notifications/stats:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}