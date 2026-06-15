import { initializeDb, saveAppState, loadAppState } from './tauri';

/**
 * Initializes the SQLite database and applies migrations.
 */
export async function initDb(): Promise<void> {
  await initializeDb();
}

/**
 * Saves or updates a key-value pair in the local database.
 */
export async function saveState(key: string, value: string): Promise<void> {
  await saveAppState(key, value);
}

/**
 * Loads a value from the local database by its key.
 */
export async function loadState(key: string): Promise<string | null> {
  return await loadAppState(key);
}