import { LabelEntry } from './types';

const STORAGE_KEY = 'egg-label-entries';

export function readEntriesFromStorage(): LabelEntry[] {
  try {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

export function writeEntriesToStorage(entries: LabelEntry[]): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

export function appendEntryToStorage(entry: LabelEntry): void {
  const entries = readEntriesFromStorage();
  entries.push(entry);
  writeEntriesToStorage(entries);
}

export function deleteEntryFromStorage(entryId: string): void {
  const entries = readEntriesFromStorage();
  const filteredEntries = entries.filter(entry => entry.id !== entryId);
  writeEntriesToStorage(filteredEntries);
}
