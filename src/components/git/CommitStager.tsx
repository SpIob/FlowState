import { useState } from 'react';
import { useGitOps } from '../../hooks/useGitOps';
import { useGitDiff } from '../../hooks/useGitDiff';
import { initRepo } from '../../lib/tauri';

interface CommitStagerProps { repoPath: string; }

export function CommitStager({ repoPath }: CommitStagerProps) {
  const { status, loading, error, committing, stageFile, unstageFile, commit, refetch } = useGitOps(repoPath);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const { diff, loading: diffLoading } = useGitDiff(repoPath, selectedFile);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    await commit(commitMessage);
    setCommitMessage('');
    setSelectedFile(null);
  };

  const handleInitRepo = async () => {
    await initRepo(repoPath);
    refetch();
  };

  const isNotRepo = error?.includes('could not find repository');
  
  const getStatusBadge = (statusStr: string) => {
    if (statusStr.includes('untracked')) return { label: 'U', color: 'text-[var(--success)]' };
    if (statusStr.includes('modified')) return { label: 'M', color: 'text-[var(--accent)]' };
    if (statusStr.includes('deleted')) return { label: 'D', color: 'text-[var(--danger)]' };
    return { label: '?', color: 'text-[var(--text-muted)]' };
  };

  if (loading) return <div className="p-4 text-[var(--text-muted)] text-sm">Loading changes...</div>;

  if (isNotRepo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
        <p className="text-[var(--text-secondary)] text-sm">This folder is not a Git repository.</p>
        <button onClick={handleInitRepo} className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-base)] hover:brightness-110 transition-all">
          Initialize Repository
        </button>
      </div>
    );
  }

  if (error) return <div className="p-4 text-[var(--danger)] text-sm">Error: {error}</div>;

  return (
    <div className="flex flex-col h-full">
      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-end px-4 py-2 sticky top-0 z-10 bg-[var(--bg-surface)]">
          <button onClick={refetch} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" disabled={loading} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>

        {status.length === 0 ? (
          <div className="p-4 text-[var(--text-muted)] text-sm text-center">Working tree clean.</div>
        ) : (
          <ul role="list" aria-label="Git Changes" className="text-sm px-2">
            {status.map((file) => {
              const badge = getStatusBadge(file.status);
              return (
                <li
                  key={file.path}
                  role="listitem"
                  aria-label={`${file.status} ${file.path}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedFile(file.path);
                    }
                  }}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer outline-none focus:bg-[var(--bg-elevated)] ${selectedFile === file.path ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]'}`}
                  onClick={() => setSelectedFile(file.path)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-medium bg-[var(--bg-elevated)] border border-[var(--border-subtle)] ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="truncate text-[var(--text-primary)] text-sm">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); stageFile(file.path); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      Stage
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); unstageFile(file.path); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      Unstage
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Diff Preview */}
      <div className="h-[200px] overflow-auto bg-[var(--bg-base)] p-3 font-mono text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)] shrink-0">
        {selectedFile ? (
          diffLoading ? <div className="text-[var(--text-muted)]">Loading diff...</div> : <pre className="whitespace-pre-wrap">{diff || 'No changes in this file.'}</pre>
        ) : (
          <div className="text-center text-[var(--text-muted)] mt-8">Select a file to view diff</div>
        )}
      </div>

      {/* Commit Form */}
      <div className="p-4 border-t border-[var(--border-subtle)] shrink-0 bg-[var(--bg-surface)]">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full h-16 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:border-[var(--border-focus)] transition-colors"
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || committing}
          className="w-full mt-3 py-2 bg-[var(--accent)] text-[var(--bg-base)] font-medium rounded-md text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {committing ? 'Committing...' : 'Commit'}
        </button>
      </div>
    </div>
  );
}