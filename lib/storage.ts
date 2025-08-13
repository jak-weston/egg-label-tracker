import { put, list } from '@vercel/blob';
import { LabelEntry } from './types';

const BLOB_PATH = 'labels/entries.json';

export async function readEntries(): Promise<LabelEntry[]> {
  try {
    // List blobs to find the entries file
    const { blobs } = await list({ prefix: 'labels/' });
    const entriesBlob = blobs.find(blob => blob.pathname === BLOB_PATH);

    if (!entriesBlob) {
      return [];
    }

    // Fetch the blob content directly from the URL
    const response = await fetch(entriesBlob.url);
    if (!response.ok) {
      return [];
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
      entries = [];
    }

    return entries;
  } catch (error) {
    console.error('Error reading entries:', error);
    return [];
  }
}

export async function writeEntries(entries: LabelEntry[]): Promise<void> {
  try {
    const jsonContent = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    await put(BLOB_PATH, blob, {
      access: 'public',
      addRandomSuffix: false,
    });
  } catch (error) {
    console.error('Error writing entries:', error);
    throw new Error('Failed to write entries to blob storage');
  }
}

export async function appendEntry(entry: LabelEntry): Promise<void> {
  const entries = await readEntries();
  entries.push(entry);
  await writeEntries(entries);
}

export async function ensureEntriesFile(): Promise<void> {
  try {
    const entries = await readEntries();
    if (entries.length === 0) {
      // Initialize with empty array if file doesn't exist
      await writeEntries([]);
    }
  } catch (error) {
    // If reading fails, create the file
    await writeEntries([]);
  }
}
