import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEggNumber, setCurrentEggNumber } from '../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Get the current egg number
export async function GET() {
  try {
    const currentNumber = await getCurrentEggNumber();
    return NextResponse.json({ 
      success: true, 
      currentEggNumber: currentNumber 
    });
  } catch (error) {
    console.error('Error getting current egg number:', error);
    return NextResponse.json(
      { error: 'Failed to get current egg number' },
      { status: 500 }
    );
  }
}

// POST: Set the current egg number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number } = body;
    
    if (typeof number !== 'number' || number < 1) {
      return NextResponse.json(
        { error: 'Invalid number. Must be a positive integer.' },
        { status: 400 }
      );
    }
    
    await setCurrentEggNumber(number);
    
    return NextResponse.json({ 
      success: true, 
      message: `Current egg number set to ${number}`,
      currentEggNumber: number
    });
  } catch (error) {
    console.error('Error setting current egg number:', error);
    return NextResponse.json(
      { error: 'Failed to set current egg number' },
      { status: 500 }
    );
  }
}
