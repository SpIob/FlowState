// src/components/layout/TitleBar.tsx
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitleBarProps {
  repoPath: string;
  onSelectRepo: () => void;
}

export function TitleBar({ repoPath, onSelectRepo }: TitleBarProps) {
  const [time, setTime] = useState<string>(formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const appWindow = getCurrentWindow();
  const handleClose    = () => appWindow.close();
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center select-none bg-[var(--bg-titlebar)] border-b border-[var(--border)] relative"
    >
      {/* Left section - traffic lights + logo + name */}
      <div className="flex items-center pl-3 gap-2">
        <div className="flex items-center gap-[6px]">
          <div
            onClick={handleClose}
            className="w-3 h-3 rounded-full cursor-pointer hover:brightness-75"
            style={{ backgroundColor: '#ff5f57' }}
          />
          <div
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full cursor-pointer hover:brightness-75"
            style={{ backgroundColor: '#febc2e' }}
          />
          <div
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full cursor-pointer hover:brightness-75"
            style={{ backgroundColor: '#28c840' }}
          />
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <img
            src="/logo.svg"
            alt="FlowState"
            width={16}
            height={16}
            className="w-4 h-4 object-contain"
            draggable={false}
          />
          <span className="text-[13px] font-medium text-[#8a8a8a]">FlowState</span>
        </div>
      </div>

      {/* Center - clickable repo path */}
      <button
        data-tauri-drag-region
        onClick={onSelectRepo}
        className="absolute left-1/2 -translate-x-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none"
        title="Click to change repository"
      >
        <PathDisplay path={formatRepoPath(repoPath)} />
      </button>

      {/* Right section - clock */}
      <div className="ml-auto pr-4 text-xs text-[var(--text-secondary)]">
        {time}
      </div>
    </div>
  );
}

function PathDisplay({ path }: { path: string }) {
  const segments = path.split('/');
  return (
    <span>
      {segments.map((segment, i) => (
        <span key={i}>
          {i > 0 && <span className="opacity-50">/</span>}
          {segment}
        </span>
      ))}
    </span>
  );
}

// Converts an absolute path to a tilde-prefixed display path
function formatRepoPath(fullPath: string): string {
  // Fix the invalid regex syntax from the original file by properly escaping slashes
  const homeMatch = fullPath.match(/^(\/Users\/[^\/]+|\/home\/[^\/]+)/);
  const home = homeMatch ? homeMatch[0] : null;
  const display = home ? fullPath.replace(home, '~') : fullPath;
  
  // Show last two segments separated by the styled divider
  const parts = display.split('/').filter(Boolean);
  if (parts.length <= 2) return display;
  return `…/${parts.slice(-2).join('/')}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}