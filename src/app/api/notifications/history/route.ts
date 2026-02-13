import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const cookieStore = await cookies();
    const token = authHeader?.replace('Bearer ', '') || cookieStore.get('sb-access-token')?.value;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const cursoId = searchParams.get('curso_id');

    // Get notification history for the current user
    let query = supabase
      .from('notification_history')
      .select(`
        id,
        title,
        body,
        curso_id,
        cursos:notification_history_curso_id_fkey(titulo),
        created_at,
        user_id,
        read
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by course if specified
    if (cursoId) {
      query = query.eq('curso_id', cursoId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: history, error } = await query;

    if (error) {
      console.error('Error fetching notification history:', error);
      return NextResponse.json(
        { error: 'Error fetching notification history' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedHistory = (history || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      curso_id: item.curso_id,
      curso_titulo: item.cursos?.titulo || 'Curso desconocido',
      created_at: item.created_at,
      user_id: item.user_id,
      read: item.read
    }));

    return NextResponse.json({
      history: transformedHistory,
      total: transformedHistory.length
    });

  } catch (error) {
    console.error('Error in notification history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}