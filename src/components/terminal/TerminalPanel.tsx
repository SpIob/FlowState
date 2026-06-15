/* src/components/terminal/TerminalPanel.tsx */
import { useRef } from 'react';
import { useTerminal } from '../../hooks/useTerminal';

export const TERMINAL_OPTIONS = {
  theme: {
    background: '#141414',
    foreground: '#d4d4d4',
    cursor: '#4ec9b0',
    selectionBackground: '#264f78',
    black: '#1e1e1e',
    green: '#4ec9b0',
    yellow: '#e5c07b',
    red: '#e06c75',
  },
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 13,
  lineHeight: 1.5,
  cursorBlink: true,
  cursorStyle: 'block' as const,
};

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useTerminal(containerRef);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)]">
      {/* Panel header */}
      <div className="h-[35px] flex items-center px-4 gap-3 bg-[var(--bg-titlebar)] border-b border-[var(--border)] shrink-0">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-secondary)]">
          TERMINAL
        </span>
        <div className="ml-auto">
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] text-[var(--text-secondary)] bg-[#1e1e1e] border border-[var(--border)] rounded-sm">
            zsh
          </span>
        </div>
      </div>

      {/* Terminal surface */}
      <div className="flex-1 overflow-hidden p-2">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}