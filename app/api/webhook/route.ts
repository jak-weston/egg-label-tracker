import { NextRequest, NextResponse } from 'next/server';
import { writeEntries, readEntries, generateNextEggId } from '../../../lib/storage';
import { LabelEntry } from '../../../lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook received from Notion');
    
    // Verify the request is from Notion (optional but recommended)
    const notionSignature = request.headers.get('x-notion-signature');
    if (!notionSignature) {
      console.log('No Notion signature found - request may not be from Notion');
    }
    
    const body = await request.json();
    console.log('Webhook body:', JSON.stringify(body, null, 2));
    
    // Extract the relevant data from the Notion webhook
    // The exact structure depends on your Notion database setup
    const notionData = extractNotionData(body);
    
    if (!notionData) {
      console.log('Could not extract valid data from webhook');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }
    
    // Read existing entries
    const existingEntries = await readEntries();
    
    // Generate the egg ID first so we can use it in the link
    const eggId = await generateNextEggId();
    
    // Create new entry
    const newEntry: LabelEntry = {
      id: generateId(),
      egg_id: eggId, // Use the generated egg ID
      name: notionData.name,
      cage: notionData.cage,
      link: `https://www.notion.so/${eggId}`, // Use EGG-# format for link
      createdAt: new Date().toISOString()
    };
    
    console.log('Creating new entry from webhook:', newEntry);
    
    // Add to existing entries
    const updatedEntries = [...existingEntries, newEntry];
    
    // Write back to storage
    await writeEntries(updatedEntries);
    
    console.log('Webhook entry created successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Entry created from webhook',
      entry: newEntry
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Function to extract data from Notion webhook payload
function extractNotionData(webhookBody: any) {
  try {
    console.log('Processing webhook body:', webhookBody);
    
    // Check if this is a Notion automation webhook
    if (webhookBody?.data?.properties) {
      console.log('Notion automation webhook detected');
      
      // Look for the formula field in properties
      const properties = webhookBody.data.properties;
      let formulaContent = '';
      
      // Find the formula field (it might have a different name)
      for (const [key, value] of Object.entries(properties)) {
        if (value && typeof value === 'object' && 'type' in value && value.type === 'formula') {
          const formulaValue = value as any; // Type assertion for Notion's structure
          if (formulaValue.formula?.type === 'string' && formulaValue.formula?.string) {
            formulaContent = formulaValue.formula.string;
            console.log('Found formula content:', formulaContent);
            break;
          }
        }
      }
      
      if (!formulaContent) {
        console.log('No formula content found in properties');
        return null;
      }
      
      // Parse the formula content (format: "Name|Cage")
      const parts = formulaContent.split('|');
      
      if (parts.length < 2) {
        console.log('Formula content format incorrect. Expected 2 parts (Name|Cage), got:', parts.length);
        console.log('Content:', formulaContent);
        return null;
      }
      
      const [name, cage] = parts.map((part: string) => part.trim());
      
      // Validate required fields
      if (!name || !cage) {
        console.log('Missing required fields after parsing:', { name, cage });
        return null;
      }
      
      console.log('Successfully extracted data:', { name, cage });
      
      return { name, cage };
    }
    
    // Fallback: try the old format
    const formulaContent = webhookBody?.formulaContent || webhookBody?.content || webhookBody?.text || '';
    
    if (!formulaContent) {
      console.log('No formula content found in webhook body');
      return null;
    }
    
    // Parse the formula content (assuming format: "Name|Cage")
    const parts = formulaContent.split('|');
    
    if (parts.length < 2) {
      console.log('Formula content format incorrect. Expected 2 parts (Name|Cage), got:', parts.length);
      console.log('Content:', formulaContent);
      return null;
    }
    
    const [name, cage] = parts.map((part: string) => part.trim());
    
    // Validate required fields
    if (!name || !cage) {
      console.log('Missing required fields after parsing:', { name, cage });
      return null;
    }
    
    console.log('Successfully extracted data:', { name, cage });
    
    return { name, cage };
    
  } catch (error) {
    console.error('Error extracting Notion data:', error);
    return null;
  }
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}


