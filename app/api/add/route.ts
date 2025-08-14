import { NextRequest, NextResponse } from 'next/server';
import { AddEntrySchema } from '../../../lib/types';
import { appendEntry, ensureEntriesFile } from '../../../lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFormattedBaseUrl } from '../../../lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const egg_id = searchParams.get('egg_id');
  const name = searchParams.get('name');
  const cage = searchParams.get('cage');
  const link = searchParams.get('link');

  console.log('GET /api/add called with params:', { egg_id, name, cage, hasSecret: !!secret });

  if (!secret || !egg_id || !name || !cage) {
    console.error('Missing required parameters');
    const redirectUrl = getFormattedBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(
      `${redirectUrl}/?error=missing_params`,
      302
    );
  }

  // Validate secret
  if (secret !== process.env.ADD_SECRET) {
    console.error('Invalid secret provided');
    const redirectUrl = getFormattedBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(
      `${redirectUrl}/?error=unauthorized`,
      302
    );
  }

  try {
    console.log('Ensuring entries file exists...');
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

    console.log('Adding entry:', entry);
    await appendEntry(entry);

    console.log('Entry added successfully, redirecting...');
    const redirectUrl = getFormattedBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(
      `${redirectUrl}/?added=${egg_id}`,
      302
    );
  } catch (error) {
    console.error('Error adding entry:', error);
    const redirectUrl = getFormattedBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(
      `${redirectUrl}/?error=server_error`,
      302
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/add called');
    
    const body = await request.json();
    console.log('Request body received:', { ...body, secret: body.secret ? '[REDACTED]' : undefined });
    
    const validatedData = AddEntrySchema.parse(body);

    // Validate secret
    if (validatedData.secret !== process.env.ADD_SECRET) {
      console.error('Invalid secret in POST request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Ensuring entries file exists...');
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

    console.log('Adding entry via POST:', entry);
    await appendEntry(entry);

    console.log('Entry added successfully via POST');
    return NextResponse.json(
      { ok: true, entry },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
  } catch (error) {
    console.error('Error adding entry via POST:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Check for validation errors
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}