import { useState, useCallback } from 'react';
import { stageFile, unstageFile, commit as commitChanges } from '../lib/tauri';
import { useGitStatus } from './useGitStatus';

export function useGitOps(repoPath: string) {
  const { status, loading, error, refetch } = useGitStatus(repoPath);
  const [committing, setCommitting] = useState(false);

  const handleStage = useCallback(async (path: string) => {
    await stageFile(repoPath, path);
    refetch();
  }, [repoPath, refetch]);

  const handleUnstage = useCallback(async (path: string) => {
    await unstageFile(repoPath, path);
    refetch();
  }, [repoPath, refetch]);

  const handleCommit = useCallback(async (message: string) => {
    if (!message.trim()) return;
    setCommitting(true);
    try {
      await commitChanges(repoPath, message);
      refetch();
    } finally {
      setCommitting(false);
    }
  }, [repoPath, refetch]);

  return {
    status,
    loading,
    error,
    committing,
    stageFile: handleStage,
    unstageFile: handleUnstage,
    commit: handleCommit,
    refetch
  };
}