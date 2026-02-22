import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST() {
  let step = 'init';
  try {
    step = 'createClient';
    const supabase = createSupabaseAdminClient();
    
    // Check Auth connectivity
    step = 'checkAuth';
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authStatus = authError ? `Error: ${authError.message}` : `User: ${authData.user?.id || 'none'}`;

    // Check Storage connectivity
    step = 'listBuckets';
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      const originalErr = (error as any).originalError;
      return NextResponse.json({ 
        error: error.message, 
        step,
        authStatus,
        details: {
          ...error,
          originalError: {
            message: originalErr?.message,
            cause: originalErr?.cause ? String(originalErr.cause) : undefined,
            stack: originalErr?.stack,
            type: originalErr?.constructor?.name
          }
        }
      }, { status: 500 });
    }

    // Get the URL used by the client (indirectly)
    // We can't access private variables of the client easily, but we know createSupabaseAdminClient uses our sanitizer.
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'V2 connection successful',
      authStatus,
      buckets: data.map(b => b.name)
    });
  } catch (e) {
    const err = e as any;
    return NextResponse.json({ 
      error: String(err), 
      message: err.message,
      cause: err.cause ? String(err.cause) : undefined,
      stack: err.stack,
      step 
    }, { status: 500 });
  }
}
