import { put, list } from '@vercel/blob';
import { LabelEntry } from './types';

const BLOB_PATH = 'labels/entries.json';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Check if we have access to Vercel Blob
const hasBlobAccess = () => {
  try {
    // Check if we're in a Node.js environment and have the token
    if (typeof process !== 'undefined' && process.env && process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('Blob access check: Token found, length:', process.env.BLOB_READ_WRITE_TOKEN.length);
      return true;
    }
    
    // Additional check for Vercel environment
    if (typeof process !== 'undefined' && process.env && process.env.VERCEL) {
      console.log('Blob access check: Running on Vercel, checking for token...');
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('Blob access check: Token found on Vercel, length:', process.env.BLOB_READ_WRITE_TOKEN.length);
        return true;
      }
    }
    
    console.log('Blob access check: No token found');
    return false;
  } catch (error) {
    console.log('Blob access check: Error checking access:', error);
    return false;
  }
};

// For local development, we'll use localStorage as a fallback
// This will be true when running locally without BLOB_READ_WRITE_TOKEN
const isLocalDev = isBrowser && !hasBlobAccess();

export async function readEntries(): Promise<LabelEntry[]> {
  try {
    console.log('Storage debug:', {
      isBrowser,
      isLocalDev,
      hasBlobAccess: hasBlobAccess(),
      envToken: process.env.BLOB_READ_WRITE_TOKEN ? 'present' : 'missing'
    });

    // If we're in the browser and don't have blob token, use localStorage
    if (isLocalDev) {
      console.log('Using localStorage fallback');
      const stored = localStorage.getItem('egg-label-entries');
      return stored ? JSON.parse(stored) : [];
    }

    // If we're on the server side, try to use Vercel Blob
    if (!isBrowser && hasBlobAccess()) {
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
        
        // Fallback: Try to fetch directly from the known public URL
        try {
          console.log('Trying direct URL fallback...');
          const directResponse = await fetch('https://ftfkrzqiv0pq9s2d.public.blob.vercel-storage.com/labels/entries.json');
          if (directResponse.ok) {
            const text = await directResponse.text();
            const fallbackEntries = JSON.parse(text);
            console.log('Direct URL fallback successful, found entries:', fallbackEntries.length);
            return Array.isArray(fallbackEntries) ? fallbackEntries : [];
          }
        } catch (fallbackError) {
          console.error('Direct URL fallback also failed:', fallbackError);
        }
        
        // If all else fails, return empty array
        return [];
      }
    }

    // If we're on server side but don't have Blob access, return empty array
    if (!isBrowser && !hasBlobAccess()) {
      console.log('No Blob access on server side, returning empty array');
      return [];
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
    if (!isBrowser && hasBlobAccess()) {
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
