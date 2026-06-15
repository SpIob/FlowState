/* src/components/git/GitStatus.tsx */
import { useGitStatus } from '../../hooks/useGitStatus';
import type { GitFileStatus } from '../../types/git.types';

interface GitStatusProps {
  repoPath: string;
  onFileSelect: (path: string) => void;
}

type StatusCategory = 'modified' | 'added' | 'deleted' | 'untracked';

export function GitStatus({ repoPath, onFileSelect }: GitStatusProps) {
  const { status, loading, error } = useGitStatus(repoPath);

  if (loading) {
    return (
      <div className="px-4 py-3 text-xs text-[var(--text-secondary)]">
        Loading status...
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

  const staged = status.filter((f) => f.status === 'staged');
  const changes = status.filter((f) => f.status !== 'staged');

  return (
    <div>
      {/* Staged section */}
      <SectionHeader label="STAGED" count={staged.length} badgeType="accent" />
      {staged.map((file) => (
        <FileRow
          key={file.path}
          file={file}
          onClick={() => onFileSelect(file.path)}
        />
      ))}

      {/* Changes section */}
      <SectionHeader label="CHANGES" count={changes.length} badgeType="warning" />
      {changes.map((file) => (
        <FileRow
          key={file.path}
          file={file}
          onClick={() => onFileSelect(file.path)}
        />
      ))}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  badgeType,
}: {
  label: string;
  count: number;
  badgeType: 'accent' | 'warning';
}) {
  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <span className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-secondary)]">
        {label}
      </span>
      <span
        className={`text-[10px] font-bold px-1.5 rounded ${
          badgeType === 'accent'
            ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
            : 'bg-[#3d2a00] text-[var(--yellow)]'
        }`}
      >
        {count}
      </span>
    </div>
  );
}

function FileRow({
  file,
  onClick,
}: {
  file: GitFileStatus;
  onClick: () => void;
}) {
  const statusConfig = getStatusConfig(file.status as StatusCategory);

  return (
    <div
      className="h-7 px-4 flex items-center gap-2 cursor-pointer hover:bg-[#1a1a1a]"
      onClick={onClick}
    >
      <span
        className="w-4 text-center text-[11px] font-bold"
        style={{ color: statusConfig.iconColor }}
      >
        {statusConfig.icon}
      </span>
      <span className="flex-1 text-[12px] text-[var(--text-primary)] truncate">
        {file.path}
      </span>
      <span
        className="text-[10px] tracking-[0.05em]"
        style={{ color: statusConfig.labelColor }}
      >
        {statusConfig.label}
      </span>
    </div>
  );
}

function getStatusConfig(status: StatusCategory) {
  switch (status) {
    case 'modified':
      return { icon: 'M', iconColor: '#e5c07b', label: 'MODIFIED', labelColor: '#e5c07b' };
    case 'added':
      return { icon: 'A', iconColor: '#4ec9b0', label: 'ADDED', labelColor: '#4ec9b0' };
    case 'deleted':
      return { icon: 'D', iconColor: '#e06c75', label: 'DELETED', labelColor: '#e06c75' };
    case 'untracked':
      return { icon: '?', iconColor: '#e06c75', label: 'UNTRACKED', labelColor: '#e06c75' };
    default:
      return { icon: '?', iconColor: '#6e7681', label: (status as string).toUpperCase(), labelColor: '#6e7681' };
  }
}