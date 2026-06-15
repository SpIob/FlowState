/* src/components/git/GitLog.tsx */
import { useGitLog } from '../../hooks/useGitLog';
import type { GitCommit } from '../../types/git.types';

interface GitLogProps {
  repoPath: string;
}

export function GitLog({ repoPath }: GitLogProps) {
  const { commits, loading, error } = useGitLog(repoPath, 50);

  if (loading) {
    return (
      <div className="px-4 py-3 text-xs text-[var(--text-secondary)]">
        Loading log...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-xs text-[var(--orange)]">
        Error: {error}
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-[var(--text-secondary)]">
        No commits found.
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2">
        <span className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-secondary)]">
          LOG
        </span>
      </div>
      <div className="overflow-auto scrollbar-thin">
        {commits.map((commit) => (
          <CommitRow key={commit.hash} commit={commit} />
        ))}
      </div>
    </div>
  );
}

function CommitRow({ commit }: { commit: GitCommit }) {
  const shortHash = commit.hash.slice(0, 7);
  const relativeTime = formatRelativeTime(commit.timestamp);

  return (
    <div className="px-4 py-2 flex flex-col gap-0.5 border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[#1a1a1a]">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold font-mono text-[var(--accent)]">
          {shortHash}
        </span>
        <span className="flex-1 text-[12px] text-[var(--text-primary)] truncate">
          {commit.message}
        </span>
        <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
          {relativeTime}
        </span>
      </div>
      <div>
        <span className="text-[11px] text-[var(--text-secondary)]">
          {commit.author}
        </span>
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffSeconds = nowSeconds - timestamp;

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 172800) return 'yesterday';
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}