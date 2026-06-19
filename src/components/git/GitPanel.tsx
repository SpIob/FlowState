// src/components/git/GitPanel.tsx
import { useState } from 'react';
import { GitLog } from './GitLog';
import { GitDiff } from './GitDiff';
import { ChatPanel } from '../ai/ChatPanel';
import { DashboardPanel } from '../dashboard/DashboardPanel';
import { CommitStager } from './CommitStager';
import { BranchManager } from './BranchManager';
import { RemoteManager } from './RemoteManager';
import { CIPanel } from '../ci/CIPanel';
import { DatabasePanel } from '../database/DatabasePanel';
import { DocsPanel } from '../docs/DocsPanel';
import { PluginPanel } from '../plugins/PluginPanel';

interface GitPanelProps {
  repoPath: string;
  activeModel: string;
}

type ActiveTab = 'status' | 'branches' | 'remotes' | 'ci' | 'database' | 'docs' | 'plugins' | 'log' | 'diff' | 'chat' | 'dashboard';

const gitTabs: { id: ActiveTab; label: string }[] = [
  { id: 'status', label: 'STATUS' },
  { id: 'branches', label: 'BRANCHES' },
  { id: 'remotes', label: 'REMOTES' },
  { id: 'ci', label: 'CI' },
  { id: 'database', label: 'DATABASE' },
  { id: 'docs', label: 'DOCS' },
  { id: 'plugins', label: 'PLUGINS' },
  { id: 'log', label: 'LOG' },
  { id: 'diff', label: 'DIFF' },
  { id: 'chat', label: 'CHAT' },
  { id: 'dashboard', label: 'DASHBOARD' },
];

export function GitPanel({ repoPath, activeModel }: GitPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  
  // FIX: Removed `setSelectedFile` to satisfy TypeScript strict mode.
  // CommitStager handles its own internal file selection and inline diff preview.
  const [selectedFile] = useState<string | null>(null);

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

      {/* Panel body - Keep all mounted, toggle visibility to preserve state */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative">
        <div className={activeTab === 'status' ? 'h-full' : 'hidden'}>
          <CommitStager repoPath={repoPath} />
        </div>
        <div className={activeTab === 'branches' ? 'h-full' : 'hidden'}>
          <BranchManager repoPath={repoPath} />
        </div>
        <div className={activeTab === 'remotes' ? 'h-full' : 'hidden'}>
          <RemoteManager repoPath={repoPath} />
        </div>
        <div className={activeTab === 'ci' ? 'h-full' : 'hidden'}>
          <CIPanel repoPath={repoPath} />
        </div>
        <div className={activeTab === 'database' ? 'h-full' : 'hidden'}>
          <DatabasePanel />
        </div>
        <div className={activeTab === 'docs' ? 'h-full' : 'hidden'}>
          <DocsPanel repoPath={repoPath} />
        </div>
        <div className={activeTab === 'plugins' ? 'h-full' : 'hidden'}>
          <PluginPanel />
        </div>
        <div className={activeTab === 'log' ? 'h-full' : 'hidden'}>
          <GitLog repoPath={repoPath} />
        </div>
        <div className={activeTab === 'diff' ? 'h-full' : 'hidden'}>
          <GitDiff repoPath={repoPath} filePath={selectedFile} />
        </div>
        <div className={activeTab === 'chat' ? 'h-full' : 'hidden'}>
          <ChatPanel model={activeModel} />
        </div>
        <div className={activeTab === 'dashboard' ? 'h-full' : 'hidden'}>
          <DashboardPanel />
        </div>
      </div>
    </div>
  );
}