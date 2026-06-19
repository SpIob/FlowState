// src/components/git/GitPanel.tsx
import { useState } from 'react';
import { GitStatus } from './GitStatus';
import { GitLog } from './GitLog';
import { GitDiff } from './GitDiff';
import { ChatPanel } from '../ai/ChatPanel';
import { DashboardPanel } from '../dashboard/DashboardPanel';

interface GitPanelProps {
  repoPath: string;
  activeModel: string;
}

type ActiveTab = 'status' | 'log' | 'diff' | 'chat' | 'dashboard';

const gitTabs: { id: ActiveTab; label: string }[] = [
  { id: 'status', label: 'STATUS' },
  { id: 'log', label: 'LOG' },
  { id: 'diff', label: 'DIFF' },
  { id: 'chat', label: 'CHAT' },
  { id: 'dashboard', label: 'DASHBOARD' },
];

export function GitPanel({ repoPath, activeModel }: GitPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)]">
      {/* Panel header / tab bar */}
      <div className="h-[35px] flex items-center bg-[var(--bg-titlebar)] border-b border-[var(--border)] shrink-0 overflow-x-auto scrollbar-thin">
        {gitTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              className={`h-full px-3 text-[11px] font-semibold tracking-[0.08em] uppercase whitespace-nowrap ${
                isActive
                  ? 'text-[var(--text-primary)] border-b-2 border-b-[var(--accent)] bg-transparent'
                  : 'text-[var(--text-secondary)] bg-transparent border-b-2 border-transparent'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'status' && (
          <GitStatus repoPath={repoPath} onFileSelect={setSelectedFile} />
        )}
        {activeTab === 'log' && <GitLog repoPath={repoPath} />}
        {activeTab === 'diff' && (
          <GitDiff repoPath={repoPath} filePath={selectedFile} />
        )}
        {activeTab === 'chat' && <ChatPanel model={activeModel} />}
        {activeTab === 'dashboard' && <DashboardPanel />}
      </div>
    </div>
  );
}