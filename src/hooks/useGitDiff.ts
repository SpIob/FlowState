import { useState, useEffect } from 'react';
import { getGitDiff } from '../lib/tauri';

interface UseGitDiffResult {
  diff: string | null;
  loading: boolean;
  error: string | null;
}

export function useGitDiff(repoPath: string, filePath: string | null): UseGitDiffResult {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath || !filePath) {
      setDiff(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getGitDiff(repoPath, filePath)
      .then((result) => {
        if (isMounted) {
          setDiff(result);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || err?.toString() || 'Failed to fetch git diff');
          setDiff(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repoPath, filePath]);

  return { diff, loading, error };
}