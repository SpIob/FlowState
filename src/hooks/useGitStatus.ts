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

  return { status, loading, error, refetch: fetchStatus };
}