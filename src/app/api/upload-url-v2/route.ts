import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST() {
  let step = 'init';
  try {
    step = 'createClient';
    const supabase = createSupabaseAdminClient();
    
    step = 'listBuckets';
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        step,
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'ok', 
      message: 'V2 buckets listed',
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
