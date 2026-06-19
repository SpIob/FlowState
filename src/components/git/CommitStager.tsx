// src/components/git/CommitStager.tsx
import { useState } from 'react';
import { useGitOps } from '../../hooks/useGitOps';
import { useGitDiff } from '../../hooks/useGitDiff';
import { initRepo } from '../../lib/tauri'; // Add this import

interface CommitStagerProps {
  repoPath: string;
}

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

  // Detect if the error is specifically because it's not a git repo
  const isNotRepo = error?.includes('could not find repository');

  if (loading) {
    return <div className="p-4 text-[var(--text-secondary)] text-sm">Loading changes...</div>;
  }

  if (isNotRepo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
        <svg width="32" height="32" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="var(--text-secondary)" strokeWidth="1.2" fill="none" />
        </svg>
        <p className="text-[var(--text-secondary)] text-sm">
          This folder is not a Git repository.
        </p>
        <button
          onClick={handleInitRepo}
          className="px-4 py-2 text-sm font-medium rounded bg-[var(--accent)] text-[#0d0d0d] hover:brightness-110 transition-all"
        >
          Initialize Repository
        </button>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-[var(--orange)] text-sm">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* File List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin border-b border-[var(--border)]">
        {/* NEW: Header with Refresh Button */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-titlebar)] border-b border-[var(--border)] sticky top-0 z-10">
          <span className="text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider">
            Changes
          </span>
          <button 
            onClick={refetch} 
            className="text-[11px] text-[var(--accent)] hover:underline disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {status.length === 0 ? (
          <div className="p-4 text-[var(--text-secondary)] text-sm text-center">
            No changes to commit. Working tree clean.
          </div>
        ) : (
          <ul className="text-sm">
            {status.map((file) => (
              <li
                key={file.path}
                className={`flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]/50 cursor-pointer hover:bg-[var(--bg-tabbar)] ${
                  selectedFile === file.path ? 'bg-[var(--bg-tab-active)]' : ''
                }`}
                onClick={() => setSelectedFile(file.path)}
              >
                <span className="truncate text-[var(--text-primary)]">{file.path}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-[var(--text-tertiary)]">{file.status}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stageFile(file.path);
                    }}
                    className="text-[11px] px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded hover:bg-[var(--accent)]/30"
                  >
                    Stage
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unstageFile(file.path);
                    }}
                    className="text-[11px] px-2 py-0.5 bg-[var(--orange)]/20 text-[var(--orange)] rounded hover:bg-[var(--orange)]/30"
                  >
                    Unstage
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Diff Preview */}
      <div className="h-[200px] overflow-auto scrollbar-thin bg-[var(--bg-base)] p-3 font-mono text-[11px] text-[var(--text-secondary)] border-b border-[var(--border)]">
        {selectedFile ? (
          diffLoading ? (
            <div>Loading diff...</div>
          ) : (
            <pre className="whitespace-pre-wrap">{diff || 'No changes in this file.'}</pre>
          )
        ) : (
          <div className="text-center text-[var(--text-tertiary)] mt-8">
            Select a file to view diff
          </div>
        )}
      </div>

      {/* Commit Form */}
      <div className="p-3 bg-[var(--bg-titlebar)]">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full h-16 bg-[var(--bg-panel)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || committing}
          className="w-full mt-2 py-1.5 bg-[var(--accent)] text-[#0d0d0d] font-medium rounded text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {committing ? 'Committing...' : 'Commit'}
        </button>
      </div>
    </div>
  );
}