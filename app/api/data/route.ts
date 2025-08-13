import { NextResponse } from 'next/server';
import { LabelEntry } from '../../../lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Direct fetch from the known public blob URL
    // This bypasses all the complex environment variable logic
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = `https://ftfkrzqiv0pq9s2d.public.blob.vercel-storage.com/labels/entries.json?t=${timestamp}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch from public blob URL:', response.status);
      return NextResponse.json({ ok: true, entries: [] });
    }
    
    const text = await response.text();
    
    let entries: LabelEntry[] = [];
    try {
      entries = JSON.parse(text);
      if (!Array.isArray(entries)) {
        entries = [];
      }
      console.log(`Successfully fetched ${entries.length} entries from public blob URL`);
    } catch (parseError) {
      console.error('Error parsing entries JSON:', parseError);
      entries = [];
    }

    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error('Error reading entries from public blob URL:', error);
    
    // Fallback: return empty array instead of error
    return NextResponse.json({ ok: true, entries: [] });
  }
}
