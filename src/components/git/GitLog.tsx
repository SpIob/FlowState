import { useState, useEffect } from 'react';
import { getGitLog } from '../../lib/tauri';
import { GitCommit } from '../../types/git.types';

interface GitLogProps { repoPath: string; }

export function GitLog({ repoPath }: GitLogProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (repoPath) {
      getGitLog(repoPath, 1000)
        .then(setCommits)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [repoPath]);

  if (loading) return <div className="p-4 text-[var(--text-muted)] text-sm">Loading history...</div>;

  return (
    <div className="h-full w-full overflow-y-auto p-4">
      {commits.length === 0 ? (
        <div className="text-center text-[var(--text-muted)] text-sm mt-8">No commits found.</div>
      ) : (
        <ul className="flex flex-col" role="list" aria-label="Git Commit History">
          {commits.map((commit) => (
            <li key={commit.hash} className="py-3 px-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors cursor-default flex items-baseline justify-between gap-4" role="listitem" aria-label={`Commit by ${commit.author}: ${commit.message}`}>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm text-[var(--text-primary)] truncate">{commit.message}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{commit.hash.substring(0, 7)}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-[var(--text-muted)]">{commit.author}</span>
                <span className="text-xs text-[var(--text-muted)]">{new Date(commit.timestamp * 1000).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}