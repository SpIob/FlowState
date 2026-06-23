import { useRef } from 'react';
import { useTerminal } from '../../hooks/useTerminal';

interface TerminalPanelProps { repoPath: string; }

export function TerminalPanel({ repoPath }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useTerminal(containerRef, repoPath);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-base)]">
      <div className="h-[28px] shrink-0 flex items-center px-3 gap-3">
        <span className="text-xs text-[var(--text-muted)]">Terminal</span>
        <span className="ml-auto text-xs text-[var(--text-muted)]">zsh</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden px-3 pb-2">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}