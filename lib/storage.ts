import { put, list } from '@vercel/blob';
import { LabelEntry } from './types';

const BLOB_PATH = 'labels/entries.json';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Check if we have access to Vercel Blob
const hasBlobAccess = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.BLOB_READ_WRITE_TOKEN) {
      return true;
    }
    return false;
  } catch (error) {
    console.log('Blob access check: Error checking access:', error);
    return false;
  }
};

// For local development fallback
const isLocalDev = isBrowser && !hasBlobAccess();

export async function readEntries(): Promise<LabelEntry[]> {
  try {
    console.log('Reading entries...');

    // Browser fallback to localStorage
    if (isLocalDev) {
      console.log('Using localStorage fallback');
      const stored = localStorage.getItem('egg-label-entries');
      return stored ? JSON.parse(stored) : [];
    }

    // Server-side Vercel Blob access
    if (!isBrowser && hasBlobAccess()) {
      try {
        // First, try to list blobs to see if our file exists
        const { blobs } = await list({ 
          prefix: 'labels/',
          mode: 'folded' // This helps with consistency
        });
        
        const entriesBlob = blobs.find(blob => blob.pathname === BLOB_PATH);

        if (!entriesBlob) {
          console.log('No entries blob found, returning empty array');
          return [];
        }

        // Fetch with cache-busting and proper headers
        const response = await fetch(entriesBlob.url, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          // Add timestamp to URL to prevent caching
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.error('Failed to fetch blob:', response.status);
          return [];
        }
        
        const text = await response.text();
        
        let entries: LabelEntry[] = [];
        try {
          entries = JSON.parse(text);
          if (!Array.isArray(entries)) {
            console.warn('Entries is not an array, defaulting to empty array');
            entries = [];
          }
          console.log(`Successfully read ${entries.length} entries`);
        } catch (parseError) {
          console.error('Error parsing entries JSON:', parseError);
          entries = [];
        }

        return entries;
      } catch (blobError) {
        console.error('Vercel Blob read error:', blobError);
        
        // Fallback to direct URL with cache busting
        try {
          console.log('Trying direct URL fallback...');
          const timestamp = Date.now();
          const directResponse = await fetch(
            `https://ftfkrzqiv0pq9s2d.public.blob.vercel-storage.com/labels/entries.json?t=${timestamp}`,
            {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              cache: 'no-store'
            }
          );
          
          if (directResponse.ok) {
            const text = await directResponse.text();
            const fallbackEntries = JSON.parse(text);
            console.log('Direct URL fallback successful, found entries:', fallbackEntries.length);
            return Array.isArray(fallbackEntries) ? fallbackEntries : [];
          }
        } catch (fallbackError) {
          console.error('Direct URL fallback failed:', fallbackError);
        }
        
        return [];
      }
    }

    // Server without blob access
    if (!isBrowser && !hasBlobAccess()) {
      console.log('No Blob access on server side, returning empty array');
      return [];
    }

    // Browser fallback
    if (isBrowser) {
      const stored = localStorage.getItem('egg-label-entries');
      return stored ? JSON.parse(stored) : [];
    }

    return [];
  } catch (error) {
    console.error('Error reading entries:', error);
    
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
    console.log(`Writing ${entries.length} entries...`);

    // Browser fallback
    if (isLocalDev) {
      localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
      console.log('Entries saved to localStorage');
      return;
    }

    // Server-side Vercel Blob
    if (!isBrowser && hasBlobAccess()) {
      try {
        const jsonContent = JSON.stringify(entries, null, 2);
        
        // Create blob with proper options
        const result = await put(BLOB_PATH, jsonContent, {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
        });
        
        console.log('Successfully wrote to blob:', result.url);
        
        // Add a small delay to ensure the write is propagated
        // This helps with consistency issues
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return;
      } catch (blobError) {
        console.error('Vercel Blob write error:', blobError);
        const errorMessage = blobError instanceof Error ? blobError.message : String(blobError);
        throw new Error(`Failed to write to Vercel Blob: ${errorMessage}`);
      }
    }

    // Browser fallback
    if (isBrowser) {
      localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
      console.log('Entries saved to localStorage (browser fallback)');
      return;
    }

    throw new Error('No storage method available');
  } catch (error) {
    console.error('Error writing entries:', error);
    
    if (isBrowser) {
      try {
        localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
        console.log('Entries saved to localStorage (error fallback)');
        return;
      } catch (localStorageError) {
        console.error('localStorage write error:', localStorageError);
        throw new Error('Failed to write entries to any storage method');
      }
    }
    
    throw error;
  }
}

export async function appendEntry(entry: LabelEntry): Promise<void> {
  try {
    console.log('Appending entry:', entry.id);
    const entries = await readEntries();
    
    // Check for duplicates
    const existingEntry = entries.find(e => e.id === entry.id || e.egg_id === entry.egg_id);
    if (existingEntry) {
      console.warn('Entry with same ID or egg_id already exists, skipping append');
      return;
    }
    
    entries.push(entry);
    await writeEntries(entries);
    console.log('Entry appended successfully');
  } catch (error) {
    console.error('Error appending entry:', error);
    throw error;
  }
}

export async function deleteEntry(entryId: string): Promise<void> {
  try {
    console.log('Deleting entry:', entryId);
    const entries = await readEntries();
    const initialLength = entries.length;
    
    const filteredEntries = entries.filter(entry => entry.id !== entryId);
    
    if (filteredEntries.length === initialLength) {
      console.warn('No entry found with ID:', entryId);
      // Still write back to ensure consistency
    }
    
    await writeEntries(filteredEntries);
    console.log(`Entry deletion complete. Removed ${initialLength - filteredEntries.length} entries`);
  } catch (error) {
    console.error('Error deleting entry:', error);
    throw error;
  }
}

export async function ensureEntriesFile(): Promise<void> {
  try {
    console.log('Ensuring entries file exists...');
    
    // Try to read first
    const entries = await readEntries();
    console.log(`Entries file check: found ${entries.length} entries`);
    
    // Always write back to ensure file exists and is properly formatted
    await writeEntries(entries);
    console.log('Entries file ensured');
  } catch (error) {
    console.error('Error ensuring entries file:', error);
    // If all else fails, create empty file
    try {
      await writeEntries([]);
      console.log('Created empty entries file');
    } catch (createError) {
      console.error('Failed to create empty entries file:', createError);
      throw createError;
    }
  }
}