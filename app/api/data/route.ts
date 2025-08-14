import { NextResponse } from 'next/server';
import { readEntries } from '../../../lib/storage';

export const runtime = 'nodejs';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('GET /api/entries called');
    
    // Read entries using the improved storage function
    const entries = await readEntries();
    
    console.log(`Successfully fetched ${entries.length} entries`);
    
    // Return with headers that prevent caching
    return new NextResponse(
      JSON.stringify({ ok: true, entries }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Add timestamp to help with debugging
          'X-Timestamp': new Date().toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/entries:', error);
    
    // Return empty array on error instead of failing
    return new NextResponse(
      JSON.stringify({ ok: true, entries: [], error: 'Failed to fetch entries' }),
      {
        status: 200, // Still return 200 to prevent client errors
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Error': 'true',
        },
      }
    );
  }
}