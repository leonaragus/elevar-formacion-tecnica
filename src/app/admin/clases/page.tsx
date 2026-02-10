import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClasesGrabadasClient from './AdminClasesGrabadasClient';

export const dynamic = 'force-dynamic';

export default async function AdminClasesPage() {
  const supabase = createSupabaseServerClient();
  
  // Verificar autenticación
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data?.session) {
    redirect('/login');
  }
  
  const session = data.session;

  // Verificar rol de profesor o admin
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (!usuario || (usuario.rol !== 'profesor' && usuario.rol !== 'admin')) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-8">
      <AdminClasesGrabadasClient />
    </div>
  );
}