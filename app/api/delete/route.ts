import { NextRequest, NextResponse } from 'next/server';
import { deleteEntry } from '../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/delete called');
    
    const body = await request.json();
    console.log('Request body received:', body);
    
    // Simple validation
    if (!body.entryId) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Deleting entry:', body.entryId);
    
    await deleteEntry(body.entryId);
    console.log('Entry deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/delete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}