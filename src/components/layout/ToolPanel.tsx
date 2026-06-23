import { useState } from 'react';
import { ToolView } from './ActivityBar';
import { CommitStager } from '../git/CommitStager';
import { BranchManager } from '../git/BranchManager';
import { RemoteManager } from '../git/RemoteManager';
import { GitLog } from '../git/GitLog';
import { CIPanel } from '../ci/CIPanel';
import { DatabasePanel } from '../database/DatabasePanel';
import { DocsPanel } from '../docs/DocsPanel';
import { PluginPanel } from '../plugins/PluginPanel';
import { ChatPanel } from '../ai/ChatPanel';
import { DashboardPanel } from '../dashboard/DashboardPanel';

interface ToolPanelProps {
  activeView: ToolView;
  repoPath: string;
  activeModel: string;
}

type GitSubTab = 'status' | 'branches' | 'remotes' | 'log';
type AISubTab = 'chat' | 'dashboard';

export function ToolPanel({ activeView, repoPath, activeModel }: ToolPanelProps) {
  const [gitSubTab, setGitSubTab] = useState<GitSubTab>('status');
  const [aiSubTab, setAISubTab] = useState<AISubTab>('chat');

  const renderSubTabs = (tabs: { id: string; label: string }[], active: string, onChange: (id: any) => void) => (
    <div className="h-[36px] flex items-end bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] shrink-0 px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`relative h-full px-3 text-xs font-normal transition-colors ${
            active === tab.id
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {active === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--accent)]" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-surface)] overflow-hidden relative">

      {/* GIT */}
      <div className={activeView === 'git' ? 'flex flex-col h-full' : 'hidden'}>
        {renderSubTabs(
          [
            { id: 'status', label: 'Status' },
            { id: 'branches', label: 'Branches' },
            { id: 'remotes', label: 'Remotes' },
            { id: 'log', label: 'Log' },
          ],
          gitSubTab,
          setGitSubTab
        )}
        <div className="flex-1 overflow-y-auto relative">
          <div className={gitSubTab === 'status' ? 'h-full' : 'hidden'}><CommitStager repoPath={repoPath} /></div>
          <div className={gitSubTab === 'branches' ? 'h-full' : 'hidden'}><BranchManager repoPath={repoPath} /></div>
          <div className={gitSubTab === 'remotes' ? 'h-full' : 'hidden'}><RemoteManager repoPath={repoPath} /></div>
          <div className={gitSubTab === 'log' ? 'h-full' : 'hidden'}><GitLog repoPath={repoPath} /></div>
        </div>
      </div>

      {/* CI */}
      <div className={activeView === 'ci' ? 'h-full' : 'hidden'}>
        <CIPanel repoPath={repoPath} />
      </div>

      {/* DATABASE */}
      <div className={activeView === 'database' ? 'h-full' : 'hidden'}>
        <DatabasePanel />
      </div>

      {/* DOCS */}
      <div className={activeView === 'docs' ? 'h-full' : 'hidden'}>
        <DocsPanel repoPath={repoPath} />
      </div>

      {/* PLUGINS */}
      <div className={activeView === 'plugins' ? 'h-full' : 'hidden'}>
        <PluginPanel />
      </div>

      {/* AI */}
      <div className={activeView === 'ai' ? 'flex flex-col h-full' : 'hidden'}>
        {renderSubTabs(
          [
            { id: 'chat', label: 'Chat' },
            { id: 'dashboard', label: 'Dashboard' },
          ],
          aiSubTab,
          setAISubTab
        )}
        <div className="flex-1 overflow-y-auto relative">
          <div className={aiSubTab === 'chat' ? 'h-full' : 'hidden'}><ChatPanel model={activeModel} /></div>
          <div className={aiSubTab === 'dashboard' ? 'h-full' : 'hidden'}><DashboardPanel /></div>
        </div>
      </div>

    </div>
  );
}