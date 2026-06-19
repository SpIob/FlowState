import { invoke } from '@tauri-apps/api/core';
import { GitFileStatus, GitCommit } from '../types/git.types';
import type { OllamaModel, ChatMessage } from '../types/ai.types';
import type { ScoringWeights, CognitiveScoreResult } from '../types/cognitive.types';

/**
 * Fetches the Git status (staged, unstaged, untracked) for a given repository.
 */
export async function getGitStatus(repoPath: string): Promise<GitFileStatus[]> {
  return await invoke<GitFileStatus[]>('get_status', { repoPath });
}

/**
 * Fetches the commit history for a given repository.
 */
export async function getGitLog(repoPath: string, limit: number): Promise<GitCommit[]> {
  return await invoke<GitCommit[]>('get_log', { repoPath, limit });
}

/**
 * Fetches the unified diff for a specific file.
 */
export async function getGitDiff(repoPath: string, filePath: string): Promise<string> {
  return await invoke<string>('get_diff', { repoPath, filePath });
}

/**
 * Spawns the default system shell as a child process.
 */
export async function spawnShell(): Promise<void> {
  await invoke<void>('spawn_shell');
}

/**
 * Writes input to the currently running shell's stdin.
 */
export async function writeToShell(input: string): Promise<void> {
  await invoke<void>('write_to_shell', { input });
}

/**
 * Initializes the SQLite database and runs migrations.
 */
export async function initializeDb(): Promise<void> {
  await invoke<void>('initialize_db');
}

/**
 * Saves or updates a key-value pair in the app_state table.
 */
export async function saveAppState(key: string, value: string): Promise<void> {
  await invoke<void>('save_app_state', { key, value });
}

/**
 * Loads a value from the app_state table by its key.
 */
export async function loadAppState(key: string): Promise<string | null> {
  return await invoke<string | null>('load_app_state', { key });
}

/**
 * Resizes the backend PTY to match the frontend terminal dimensions.
 */
export async function resizePty(cols: number, rows: number): Promise<void> {
  await invoke('resize_pty', { cols, rows });
}

export async function listModels(): Promise<OllamaModel[]> {
  return await invoke('list_models');
}

export async function chatStream(
  model: string,
  messages: ChatMessage[]
): Promise<void> {
  await invoke('chat_stream', { model, messages });
}

export async function completeCode(
  model: string,
  prefix: string,
  suffix: string
): Promise<string> {
  return await invoke('complete_code', { model, prefix, suffix });
}

export async function checkOllama(): Promise<boolean> {
  return await invoke('check_ollama');
}

/**
 * Records a generic signal event to the backend database.
 */
export async function recordSignal(eventType: string, payload: object): Promise<void> {
  await invoke('record_signal', { eventType, payload: JSON.stringify(payload) });
}

export async function getScoringWeights(): Promise<ScoringWeights> {
  return await invoke('get_scoring_weights');
}

export async function updateScoringWeights(weights: ScoringWeights): Promise<void> {
  await invoke('update_scoring_weights', { weights });
}

export async function computeCognitiveScore(): Promise<CognitiveScoreResult> {
  return await invoke('compute_cognitive_score');
}

export async function triggerFocusMode(): Promise<void> {
  await invoke('trigger_focus_mode');
}

export async function checkShortcutExists(): Promise<boolean> {
  return await invoke('check_shortcut_exists');
}