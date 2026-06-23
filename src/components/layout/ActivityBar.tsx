import React from 'react';

export type ToolView = 'git' | 'ci' | 'database' | 'docs' | 'plugins' | 'ai';

interface ActivityBarProps {
  activeView: ToolView;
  onViewChange: (view: ToolView) => void;
}

const tools: { id: ToolView; label: string; shortcut: string; icon: React.ReactNode }[] = [
  {
    id: 'git', label: 'Source Control', shortcut: '⌘1',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>,
  },
  {
    id: 'ci', label: 'CI/CD', shortcut: '⌘2',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  },
  {
    id: 'database', label: 'Database', shortcut: '⌘3',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  },
  {
    id: 'docs', label: 'Documentation', shortcut: '⌘4',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    id: 'plugins', label: 'Extensions', shortcut: '⌘5',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
  },
  {
    id: 'ai', label: 'AI Assistant', shortcut: '⌘6',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z" /><path d="M12 6v6l4 2" /></svg>,
  },
];

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div className="w-12 h-full min-h-0 bg-[var(--bg-base)] flex flex-col items-center py-3 shrink-0">
      {tools.map((tool) => {
        const isActive = tool.id === activeView;
        return (
          <button
            key={tool.id}
            onClick={() => onViewChange(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`relative w-10 h-10 flex items-center justify-center mb-2 transition-colors ${
              isActive
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tool.icon}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent)] rounded-r-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}