import { put, list, del } from '@vercel/blob';
import { LabelEntry } from './types';

// Use timestamp in path to avoid CDN caching
const getBlobPath = () => `labels/entries-${Date.now()}.json`;

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

export async function readEntries(): Promise<LabelEntry[]> {
  try {
    console.log('Reading entries...');
    console.log('isBrowser:', isBrowser);
    console.log('hasBlobAccess:', hasBlobAccess());

    // Browser fallback to localStorage
    if (isBrowser) {
      console.log('Using localStorage fallback');
      const stored = localStorage.getItem('egg-label-entries');
      const entries = stored ? JSON.parse(stored) : [];
      console.log('Read from localStorage:', entries.length, 'entries');
      return entries;
    }

    // Server-side Vercel Blob access
    if (!isBrowser && hasBlobAccess()) {
      console.log('Using Vercel Blob');
      try {
        const { blobs } = await list({ 
          prefix: 'labels/',
          mode: 'folded'
        });
        
        console.log('Found blobs:', blobs.length);
        
        // Find the most recent entries file
        const entriesBlobs = blobs
          .filter(blob => blob.pathname.startsWith('labels/entries-'))
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        if (entriesBlobs.length === 0) {
          console.log('No entries blob found, returning empty array');
          return [];
        }
        
        const latestBlob = entriesBlobs[0];
        console.log('Using latest blob:', latestBlob.pathname, 'uploaded at:', latestBlob.uploadedAt);

        console.log('Fetching from blob URL:', latestBlob.url);
        
        // Add aggressive cache busting
        const cacheBustedUrl = `${latestBlob.url}?t=${Date.now()}&v=${Math.random()}`;
        console.log('Cache busted URL:', cacheBustedUrl);
        
        const response = await fetch(cacheBustedUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.error('Failed to fetch blob:', response.status);
          return [];
        }
        
        const text = await response.text();
        console.log('Blob response text length:', text.length);
        console.log('Blob response text preview:', text.substring(0, 100));
        
        const entries = JSON.parse(text);
        console.log('Parsed entries:', entries.length, 'entries');
        return Array.isArray(entries) ? entries : [];
      } catch (blobError) {
        console.error('Vercel Blob read error:', blobError);
        return [];
      }
    }

    console.log('No storage method available, returning empty array');
    return [];
  } catch (error) {
    console.error('Error reading entries:', error);
    return [];
  }
}

export async function writeEntries(entries: LabelEntry[]): Promise<void> {
  try {
    console.log(`Writing ${entries.length} entries...`);
    console.log('isBrowser:', isBrowser);
    console.log('hasBlobAccess:', hasBlobAccess());

    // Browser fallback to localStorage
    if (isBrowser) {
      console.log('Using localStorage');
      localStorage.setItem('egg-label-entries', JSON.stringify(entries, null, 2));
      console.log('Entries saved to localStorage');
      return;
    }

    // Server-side Vercel Blob
    if (!isBrowser && hasBlobAccess()) {
      console.log('Using Vercel Blob');
      try {
        // Clean up old blob files first
        try {
          const { blobs } = await list({ 
            prefix: 'labels/entries-',
            mode: 'folded'
          });
          
          console.log('Found old blobs to clean up:', blobs.length);
          
          // Delete old blob files (keep only the 2 most recent)
          const sortedBlobs = blobs
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          
          for (let i = 2; i < sortedBlobs.length; i++) {
            try {
              await del(sortedBlobs[i].pathname);
              console.log('Deleted old blob:', sortedBlobs[i].pathname);
            } catch (deleteError) {
              console.log('Failed to delete old blob:', sortedBlobs[i].pathname, deleteError);
            }
          }
        } catch (cleanupError) {
          console.log('Cleanup failed:', cleanupError);
        }
        
        const newBlobPath = getBlobPath();
        console.log('Using new blob path:', newBlobPath);
        
        const jsonContent = JSON.stringify(entries, null, 2);
        console.log('JSON content length:', jsonContent.length);
        console.log('JSON content preview:', jsonContent.substring(0, 100));
        
        const result = await put(newBlobPath, jsonContent, {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
          cacheControlMaxAge: 0
        });
        
        console.log('Successfully wrote to blob:', result.url);
        
        // No delay needed - new path means no caching
        console.log('No delay needed - using new blob path');
        
        return;
      } catch (blobError) {
        console.error('Vercel Blob write error:', blobError);
        const errorMessage = blobError instanceof Error ? blobError.message : String(blobError);
        throw new Error(`Failed to write to Vercel Blob: ${errorMessage}`);
      }
    }

    console.log('No storage method available');
    throw new Error('No storage method available');
  } catch (error) {
    console.error('Error writing entries:', error);
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