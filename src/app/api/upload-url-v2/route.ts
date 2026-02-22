import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Analyze URL structure
  const urlAnalysis = {
    value: url, // Be careful with this in production, but needed for debugging
    length: url.length,
    hasWhitespace: /\s/.test(url),
    startsWithHttps: url.startsWith('https://'),
    endsWithCo: url.endsWith('.co'),
    endsWithCom: url.endsWith('.com'),
    endsWithCon: url.endsWith('.con'),
    parts: url.split('.'),
    whitespaceIndices: [] as number[],
    charCodes: [] as number[]
  };

  for (let i = 0; i < url.length; i++) {
    if (/\s/.test(url[i])) {
      urlAnalysis.whitespaceIndices.push(i);
    }
    // Log char codes for non-alphanumeric chars to detect hidden chars
    if (!/[a-zA-Z0-9:\/\.]/.test(url[i])) {
      urlAnalysis.charCodes.push(url.charCodeAt(i));
    }
  }

  return NextResponse.json({ 
    status: 'diagnostic', 
    urlAnalysis,
    keyPrefix: key.substring(0, 5),
    keyLength: key.length
  });
}
