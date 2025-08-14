import { NextRequest, NextResponse } from 'next/server';
import { deleteEntry } from '../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/delete called');
    
    const body = await request.json();
    const { secret, entryId } = body;

    console.log('Delete request received for entryId:', entryId);

    if (!secret || !entryId) {
      console.error('Missing required parameters:', { hasSecret: !!secret, hasEntryId: !!entryId });
      return NextResponse.json(
        { error: 'Missing secret or entryId' },
        { status: 400 }
      );
    }

    // Validate secret
    if (secret !== process.env.ADD_SECRET) {
      console.error('Invalid secret provided for delete operation');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Attempting to delete entry:', entryId);
    
    // Delete the entry
    await deleteEntry(entryId);

    console.log('Entry deleted successfully:', entryId);
    
    return NextResponse.json(
      { ok: true, message: 'Entry deleted successfully', entryId },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
  } catch (error) {
    console.error('Error deleting entry:', error);
    
    // More detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to delete entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}