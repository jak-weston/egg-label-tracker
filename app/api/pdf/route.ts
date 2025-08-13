import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { LabelEntry } from '../../../lib/types';
import { generateLabelPDF } from '../../../lib/pdf';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    // Read entries to find the requested entry
    const { blobs } = await list({ prefix: 'labels/' });
    const entriesBlob = blobs.find(blob => blob.pathname === 'labels/entries.json');

    if (!entriesBlob) {
      return NextResponse.json(
        { error: 'No entries found' },
        { status: 404 }
      );
    }

    // Fetch the blob content directly from the URL
    const response = await fetch(entriesBlob.url);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to read entries' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'Invalid entries data' },
        { status: 500 }
      );
    }

    // Find the entry by ID
    const entry = entries.find(e => e.id === id);
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateLabelPDF(entry);

    // Return PDF with proper headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${entry.egg_id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
