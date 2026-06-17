// src/components/layout/WorkspaceShell.tsx
import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { TitleBar } from './TitleBar';
import { ResizablePanels } from './ResizablePanels';
import { StatusBar } from './StatusBar';
import { saveAppState, loadAppState } from '../../lib/tauri';
import { useOllamaModels } from '../../hooks/useOllamaModels';

const REPO_PATH_KEY = 'repoPath';

export function WorkspaceShell() {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { models, activeModel, setActiveModel, ollamaReady } = useOllamaModels();

  // On mount, load the last used repo path from SQLite
  useEffect(() => {
    loadAppState(REPO_PATH_KEY)
      .then((saved) => {
        if (saved) setRepoPath(saved);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelectRepo = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Open Repository',
    });
    if (typeof selected === 'string') {
      setRepoPath(selected);
      await saveAppState(REPO_PATH_KEY, selected).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[var(--bg-base)] text-[var(--text-secondary)] text-sm">
        Loading…
      </div>
    );
  }

  if (!repoPath) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[var(--bg-base)] gap-4">
        <svg width="32" height="32" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#4ec9b0" strokeWidth="1.2" fill="none" />
          <path d="M5.5 5H10.5M5.5 8H9M5.5 5V11" stroke="#4ec9b0" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="text-[var(--text-secondary)] text-sm">No repository selected</p>
        <button
          onClick={handleSelectRepo}
          className="px-4 py-2 text-sm font-medium rounded bg-[var(--accent)] text-[#0d0d0d] hover:brightness-110 transition-all"
        >
          Open Repository
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-base)]">
      <TitleBar repoPath={repoPath} onSelectRepo={handleSelectRepo} />
      <ResizablePanels repoPath={repoPath} activeModel={activeModel} />
      <StatusBar
        activeModel={activeModel}
        models={models}
        onModelSelect={setActiveModel}
        ollamaReady={ollamaReady}
      />
    </div>
  );
}