// src/lib/tauri.ts
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
export async function getGitDiff(repoPath: string, filePath: string | null): Promise<string> {
  return await invoke<string>('get_diff', { repoPath, path: filePath });
}

/**
 * Spawns the default system shell as a child process.
 */
export async function spawnShell(repoPath: string): Promise<void> {
  await invoke<void>('spawn_shell', { repoPath });
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

export async function checkPathExists(path: string): Promise<boolean> {
  return await invoke<boolean>('check_path_exists', { path });
}

export async function commit(repoPath: string, message: string): Promise<string> {
  return await invoke<string>('commit', { repoPath, message });
}

export async function stageFile(repoPath: string, path: string): Promise<void> {
  await invoke('stage_file', { repoPath, path });
}

export async function unstageFile(repoPath: string, path: string): Promise<void> {
  await invoke('unstage_file', { repoPath, path });
}

export async function initRepo(repoPath: string): Promise<void> {
  await invoke('init_repo', { repoPath });
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export async function readDirectory(dirPath: string): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>('read_directory', { dirPath });
}

export async function readFile(filePath: string): Promise<string> {
  return await invoke<string>('read_file', { filePath });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await invoke('write_file', { filePath, content });
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
}

export interface RemoteInfo {
  name: string;
  url: string;
}

export async function listBranches(repoPath: string): Promise<BranchInfo[]> {
  return await invoke<BranchInfo[]>('list_branches', { repoPath });
}

export async function deleteBranch(repoPath: string, name: string): Promise<void> {
  await invoke('delete_branch', { repoPath, name });
}

export async function listRemotes(repoPath: string): Promise<RemoteInfo[]> {
  return await invoke<RemoteInfo[]>('list_remotes', { repoPath });
}

export async function addRemote(repoPath: string, name: string, url: string): Promise<void> {
  await invoke('add_remote', { repoPath, name, url });
}

export async function removeRemote(repoPath: string, name: string): Promise<void> {
  await invoke('remove_remote', { repoPath, name });
}

export async function checkoutBranch(repoPath: string, name: string): Promise<void> {
  await invoke('checkout_branch', { repoPath, name });
}

export async function createBranch(repoPath: string, name: string, startPoint: string | null): Promise<void> {
  await invoke('create_branch', { repoPath, name, startPoint });
}

export async function fetchRemote(repoPath: string, remoteName: string, username?: string, password?: string): Promise<void> {
  await invoke('fetch_remote', { repoPath, remoteName, username, password });
}

export async function pullRemote(repoPath: string, remoteName: string, branch: string, username?: string, password?: string): Promise<any> {
  return await invoke('pull_remote', { repoPath, remoteName, branch, username, password });
}

export async function pushRemote(repoPath: string, remoteName: string, branch: string, username?: string, password?: string): Promise<void> {
  await invoke('push_remote', { repoPath, remoteName, branch, username, password });
}

export async function killShell(): Promise<void> {
  await invoke<void>('kill_shell');
}

export interface TableInfo {
  name: string;
  row_count: number;
}

export interface DbQueryResult {
  columns: string[];
  rows: any[][];
  total_count: number;
}

export async function listTables(): Promise<TableInfo[]> {
  return await invoke<TableInfo[]>('list_tables');
}

export async function getSchema(table: string): Promise<string> {
  return await invoke<string>('get_schema', { table });
}

export async function queryData(
  table: string,
  limit: number,
  offset: number,
  sortBy?: string,
  filter?: string
): Promise<DbQueryResult> {
  return await invoke<DbQueryResult>('query_data', { table, limit, offset, sortBy, filter });
}

export async function runReadonlyQuery(query: string): Promise<DbQueryResult> {
  return await invoke<DbQueryResult>('run_readonly_query', { query });
}

export interface WorkflowRun {
  id: number;
  name: string | null;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export async function getOriginInfo(repoPath: string): Promise<[string, string]> {
  return await invoke<[string, string]>('get_origin_info', { repoPath });
}

export async function listWorkflowRuns(owner: string, repo: string, pat?: string): Promise<WorkflowRun[]> {
  return await invoke<WorkflowRun[]>('list_workflow_runs', { owner, repo, pat });
}

export async function getWorkflowJobs(owner: string, repo: string, runId: number, pat?: string): Promise<WorkflowJob[]> {
  return await invoke<WorkflowJob[]>('get_workflow_jobs', { owner, repo, runId, pat });
}

export async function getJobLogs(owner: string, repo: string, jobId: number, pat?: string): Promise<string> {
  return await invoke<string>('get_job_logs', { owner, repo, jobId, pat });
}

export interface PluginRecord {
  id: string;
  name: string;
  version: string;
  entry_point: string;
  permissions: string[];
  enabled: boolean;
}

export async function registerPlugin(manifestJson: string): Promise<PluginRecord> {
  return await invoke<PluginRecord>('register_plugin', { manifestJson });
}

export async function listInstalledPlugins(): Promise<PluginRecord[]> {
  return await invoke<PluginRecord[]>('list_installed_plugins');
}

export async function grantPermission(pluginId: string, permission: string): Promise<void> {
  await invoke('grant_permission', { pluginId, permission });
}