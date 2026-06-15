import { useState, useEffect, useCallback } from 'react';
import { getGitLog } from '../lib/tauri';
import { GitCommit } from '../types/git.types';

interface UseGitLogResult {
  commits: GitCommit[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGitLog(repoPath: string, limit: number = 50): UseGitLogResult {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    if (!repoPath) {
      setCommits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getGitLog(repoPath, limit);
      setCommits(result);
    } catch (err: any) {
      setError(err?.message || err?.toString() || 'Failed to fetch git log');
      setCommits([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath, limit]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  return { commits, loading, error, refetch: fetchLog };
}