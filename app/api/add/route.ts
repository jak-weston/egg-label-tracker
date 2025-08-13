import { NextRequest, NextResponse } from 'next/server';
import { AddEntrySchema } from '../../../lib/types';
import { appendEntry, ensureEntriesFile } from '../../../lib/storage';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const egg_id = searchParams.get('egg_id');
  const name = searchParams.get('name');
  const cage = searchParams.get('cage');
  const link = searchParams.get('link');

  if (!secret || !egg_id || !name || !cage) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?error=missing_params`,
      302
    );
  }

  // Validate secret
  if (secret !== process.env.ADD_SECRET) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?error=unauthorized`,
      302
    );
  }

  try {
    // Ensure entries file exists
    await ensureEntriesFile();

    // Create entry
    const entry = {
      id: uuidv4(),
      egg_id,
      name,
      cage,
      link: link || `https://www.notion.so/${egg_id}`,
      createdAt: new Date().toISOString(),
    };

    // Append to storage
    await appendEntry(entry);

    // Redirect with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?added=${egg_id}`,
      302
    );
  } catch (error) {
    console.error('Error adding entry:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?error=server_error`,
      302
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = AddEntrySchema.parse(body);

    // Validate secret
    if (validatedData.secret !== process.env.ADD_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure entries file exists
    await ensureEntriesFile();

    // Create entry
    const entry = {
      id: uuidv4(),
      egg_id: validatedData.egg_id,
      name: validatedData.name,
      cage: validatedData.cage,
      link: validatedData.link || `https://www.notion.so/${validatedData.egg_id}`,
      createdAt: new Date().toISOString(),
    };

    // Append to storage
    await appendEntry(entry);

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error('Error adding entry:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
