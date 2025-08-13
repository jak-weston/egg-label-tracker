import { put, list } from '@vercel/blob';
import { LabelEntry } from './types';

const BLOB_PATH = 'labels/entries.json';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// For local development, we'll use localStorage as a fallback
// This will be true when running locally without BLOB_READ_WRITE_TOKEN
const isLocalDev = isBrowser && !process.env.BLOB_READ_WRITE_TOKEN;

export async function readEntries(): Promise<LabelEntry[]> {
  try {
    // If we're in the browser and don't have blob token, use localStorage
    if (isLocalDev) {
      const stored = localStorage.getItem('egg-label-entries');
      return stored ? JSON.parse(stored) : [];
    }

    // If we're on the server side, try to use Vercel Blob
    if (!isBrowser) {
      try {
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
      } catch (blobError) {
        console.error('Vercel Blob error:', blobError);
        return [];
      }
    }

    // Fallback to localStorage if we're in browser but blob failed
    if (isBrowser) {
      const stored = localStorage.getItem('egg-label-entries');
      return stored ? JSON.parse(stored) : [];
    }

    return [];
  } catch (error) {
    console.error('Error reading entries:', error);
    
    // Final fallback to localStorage if we're in browser
    if (isBrowser) {
      try {
        const stored = localStorage.getItem('egg-label-entries');
        return stored ? JSON.parse(stored) : [];
      } catch (localStorageError) {
        console.error('localStorage error:', localStorageError);
        return [];
      }
    }
    
    return [];
  }
}

export async function writeEntries(entries: LabelEntry[]): Promise<void> {
  try {
    // If we're in the browser and don't have blob token, use localStorage
    if (isLocalDev) {
      localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
      return;
    }

    // If we're on the server side, try to use Vercel Blob
    if (!isBrowser) {
      try {
        const jsonContent = JSON.stringify(entries, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        
        await put(BLOB_PATH, blob, {
          access: 'public',
          addRandomSuffix: false,
        });
        return;
      } catch (blobError) {
        console.error('Vercel Blob write error:', blobError);
        throw new Error('Failed to write to Vercel Blob');
      }
    }

    // Fallback to localStorage if we're in browser but blob failed
    if (isBrowser) {
      localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
      return;
    }
  } catch (error) {
    console.error('Error writing entries:', error);
    
    // Final fallback to localStorage if we're in browser
    if (isBrowser) {
      try {
        localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
        return;
      } catch (localStorageError) {
        console.error('localStorage write error:', localStorageError);
        throw new Error('Failed to write entries to storage');
      }
    }
    
    throw error;
  }
}

export async function appendEntry(entry: LabelEntry): Promise<void> {
  const entries = await readEntries();
  entries.push(entry);
  await writeEntries(entries);
}

export async function deleteEntry(entryId: string): Promise<void> {
  const entries = await readEntries();
  const filteredEntries = entries.filter(entry => entry.id !== entryId);
  await writeEntries(filteredEntries);
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
