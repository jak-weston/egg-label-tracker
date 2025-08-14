import { NextRequest, NextResponse } from 'next/server';
import { appendEntry } from '../../../lib/storage';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/add called');
    
    const body = await request.json();
    console.log('Request body received:', body);
    
    // Simple validation
    if (!body.egg_id || !body.name || !body.cage) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Creating entry...');
    
    // Create entry
    const entry = {
      id: uuidv4(),
      egg_id: body.egg_id,
      name: body.name,
      cage: body.cage,
      link: body.link || `https://www.notion.so/${body.egg_id}`,
      createdAt: new Date().toISOString(),
    };

    console.log('Entry to add:', entry);
    
    await appendEntry(entry);
    console.log('Entry added successfully');

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error in POST /api/add:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}