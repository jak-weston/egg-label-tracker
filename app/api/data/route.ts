import { NextResponse } from 'next/server';
import { readEntries } from '../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('GET /api/data called');
    
    const entries = await readEntries();
    console.log(`Successfully fetched ${entries.length} entries`);
    
    return NextResponse.json({ 
      ok: true, 
      entries,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in GET /api/data:', error);
    
    return NextResponse.json(
      { ok: true, entries: [], error: 'Failed to fetch entries' },
      { status: 200 }
    );
  }
}