// src/hooks/useGitStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { getGitStatus } from '../lib/tauri';
import { GitFileStatus } from '../types/git.types';

interface UseGitStatusResult {
  status: GitFileStatus[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGitStatus(repoPath: string): UseGitStatusResult {
  const [status, setStatus] = useState<GitFileStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!repoPath) {
      setStatus([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await getGitStatus(repoPath);
      setStatus(result);
    } catch (err: any) {
      setError(err?.message || err?.toString() || 'Failed to fetch git status');
      setStatus([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh when the app window regains focus
  useEffect(() => {
    const handleFocus = () => fetchStatus();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchStatus]);

  // NEW: Auto-refresh when a file is saved in the editor
  useEffect(() => {
    const handleFileSaved = () => {
      // 100ms delay ensures the OS file system has flushed the write 
      // before libgit2 reads the working directory status.
      setTimeout(fetchStatus, 100);
    };
    
    window.addEventListener('flowstate-file-saved', handleFileSaved);
    return () => window.removeEventListener('flowstate-file-saved', handleFileSaved);
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}