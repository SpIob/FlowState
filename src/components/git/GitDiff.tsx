import { useState, useEffect } from 'react';
import { getGitDiff } from '../../lib/tauri';

interface GitDiffProps {
  repoPath: string;
  filePath: string | null;
}

export function GitDiff({ repoPath, filePath }: GitDiffProps) {
  const [diff, setDiff] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (repoPath) {
      setLoading(true);
      getGitDiff(repoPath, filePath)
        .then(setDiff)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [repoPath, filePath]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      {filePath && (
        <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)] shrink-0">
          {filePath}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-sm text-[var(--text-muted)]">Loading diff...</div>
        ) : diff ? (
          <pre className="font-mono text-[11px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
            {diff.split('\n').map((line, i) => (
              <div key={i} className={
                line.startsWith('+') ? 'text-[var(--success)]' :
                line.startsWith('-') ? 'text-[var(--danger)]' :
                line.startsWith('@@') ? 'text-[var(--accent)]' :
                ''
              }>
                {line}
              </div>
            ))}
          </pre>
        ) : (
          <div className="text-sm text-[var(--text-muted)] text-center mt-8">
            {filePath ? 'No changes in this file.' : 'Select a file to view diff.'}
          </div>
        )}
      </div>
    </div>
  );
}