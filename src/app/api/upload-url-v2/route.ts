import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({ status: 'ok', message: 'V2 is alive' });
}
