import { NextResponse } from 'next/server';
import { readEntries } from '../../../lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Use the storage utility which handles all the environment variable logic
    const entries = await readEntries();
    
    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error('Error reading entries:', error);
    return NextResponse.json(
      { error: 'Failed to read entries' },
      { status: 500 }
    );
  }
}
