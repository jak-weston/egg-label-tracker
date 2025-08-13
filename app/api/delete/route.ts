import { NextRequest, NextResponse } from 'next/server';
import { deleteEntry } from '../../../lib/storage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, entryId } = body;

    if (!secret || !entryId) {
      return NextResponse.json(
        { error: 'Missing secret or entryId' },
        { status: 400 }
      );
    }

    // Validate secret
    if (secret !== process.env.ADD_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the entry
    await deleteEntry(entryId);

    return NextResponse.json({ ok: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}
