import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { LabelEntry } from '../../../lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // List blobs to find the entries file
    const { blobs } = await list({ prefix: 'labels/' });
    const entriesBlob = blobs.find(blob => blob.pathname === 'labels/entries.json');

    if (!entriesBlob) {
      // Return empty array if file doesn't exist
      return NextResponse.json({ ok: true, entries: [] });
    }

    // Fetch the blob content directly from the URL
    const response = await fetch(entriesBlob.url);
    if (!response.ok) {
      return NextResponse.json({ ok: true, entries: [] });
    }
    
    const text = await response.text();
    
    let entries: LabelEntry[] = [];
    try {
      entries = JSON.parse(text);
      if (!Array.isArray(entries)) {
        entries = [];
      }
    } catch (parseError) {
      console.error('Error parsing entries JSON:', parseError);
      entries = [];
    }

    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error('Error reading entries:', error);
    return NextResponse.json(
      { error: 'Failed to read entries' },
      { status: 500 }
    );
  }
}
