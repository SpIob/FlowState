/* src/components/git/GitDiff.tsx */
import { useGitDiff } from '../../hooks/useGitDiff';

interface GitDiffProps {
  repoPath: string;
  filePath: string | null;
}

export function GitDiff({ repoPath, filePath }: GitDiffProps) {
  const { diff, loading, error } = useGitDiff(repoPath, filePath);

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)]">
        Select a file to view diff
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)]">
        Loading diff…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[var(--orange)]">
        Error: {error}
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)]">
        No diff available
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div className="overflow-auto scrollbar-thin h-full">
      <pre className="py-2 text-[12px] leading-[1.6] font-['JetBrains_Mono','Fira_Code',monospace] bg-[var(--bg-panel)]">
        {lines.map((line, index) => (
          <DiffLine key={index} line={line} />
        ))}
      </pre>
    </div>
  );
}

function DiffLine({ line }: { line: string }) {
  let bgColor = 'transparent';
  let textColor = 'var(--text-primary)';

  if (line.startsWith('+')) {
    bgColor = '#1a3a1a';
    textColor = '#4ec9b0';
  } else if (line.startsWith('-')) {
    bgColor = '#3a1a1a';
    textColor = '#e06c75';
  } else if (line.startsWith('@@')) {
    textColor = '#569cd6';
  }

  return (
    <div
      className="px-4 whitespace-pre font-mono"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {line || '\u00A0'}
    </div>
  );
}