import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ADMIN_KEY;
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'V2 is alive with imports',
      env: {
        urlExists: !!url,
        urlLen: url?.length,
        urlPrefix: url?.substring(0, 8),
        keyExists: !!key,
        keyLen: key?.length,
        keyPrefix: key?.substring(0, 5)
      }
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
