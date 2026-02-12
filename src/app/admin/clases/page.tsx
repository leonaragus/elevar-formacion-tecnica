import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClasesGrabadasClient from './AdminClasesGrabadasClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function AdminClasesPage() {
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  const hasProfCookie = cookieStore.get('prof_code_ok')?.value === '1';
  
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session ?? null;

  if (!hasProfCookie && (error || !session)) {
    redirect('/auth');
  }

  if (!hasProfCookie && session) {
    const { data: usuario } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();
    if (!usuario || (usuario.rol !== 'profesor' && usuario.rol !== 'admin')) {
      redirect('/admin/dashboard');
    }
  }

  return (
    <div className="container mx-auto py-8">
      <AdminClasesGrabadasClient />
    </div>
  );
}
