import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const link = searchParams.get('link');

    if (!link) {
      return NextResponse.json(
        { error: 'Missing link parameter' },
        { status: 400 }
      );
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(link, {
      type: 'png',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Return PNG with proper headers
    return new NextResponse(Buffer.from(qrBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
