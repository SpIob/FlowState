import { useState, useEffect, useRef } from 'react';
import { saveAppState, loadAppState, checkPathExists, listModels, checkOllama } from '../../lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import { ResizablePanels } from './ResizablePanels';
import { OllamaModel } from '../../types/ai.types';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';

const REPO_PATH_KEY = 'repo_path';
const ACTIVE_MODEL_KEY = 'active_model';

export function WorkspaceShell() {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [ollamaReady, setOllamaReady] = useState(false);

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const completed = await loadAppState('onboarding_completed');
        if (completed === 'true') {
          setOnboardingCompleted(true);
          
          const savedPath = await loadAppState(REPO_PATH_KEY);
          if (savedPath) {
            const exists = await checkPathExists(savedPath).catch(() => false);
            if (exists) setRepoPath(savedPath);
            else await saveAppState(REPO_PATH_KEY, '');
          }
          const savedModel = await loadAppState(ACTIVE_MODEL_KEY);
          if (savedModel) setActiveModel(savedModel);
          
          const fetchedModels = await listModels();
          setModels(fetchedModels); 
          if (fetchedModels.length > 0 && !savedModel) {
            setActiveModel(fetchedModels[0].name);
            await saveAppState(ACTIVE_MODEL_KEY, fetchedModels[0].name);
          }
        } else {
          setOnboardingCompleted(false);
        }
        setOllamaReady(await checkOllama());
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    init();
  }, []);

  // FIX 2: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };
    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelSelector]);

  const handleSelectFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) { 
      const pathStr = Array.isArray(selected) ? selected[0] : selected;
      if (pathStr) {
        await saveAppState(REPO_PATH_KEY, pathStr); 
        setRepoPath(pathStr); 
      }
    }
  };

  const handleWizardComplete = (path: string, model: string) => {
    setRepoPath(path);
    setActiveModel(model);
    setOnboardingCompleted(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-base)]">
        <span className="text-sm text-[var(--text-muted)]">Loading workspace...</span>
      </div>
    );
  }

  if (onboardingCompleted === false) {
    return <OnboardingWizard onComplete={handleWizardComplete} />;
  }

  if (!repoPath) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--bg-base)] gap-4">
        <h1 className="text-2xl font-normal text-[var(--text-primary)] tracking-tight">FlowState</h1>
        <p className="text-sm text-[var(--text-muted)]">Open a repository to begin.</p>
        <button onClick={handleSelectFolder} className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-base)] hover:brightness-110 transition-all">
          Open Repository
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Level 3: Main content row */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex">
        <ResizablePanels repoPath={repoPath} activeModel={activeModel} />
      </div>
      
      {/* Level 6: Status Bar */}
      <div className="h-[22px] shrink-0 flex items-center px-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-[11px] gap-4 relative">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${ollamaReady ? 'bg-[var(--accent)]' : 'bg-[var(--text-muted)]'}`} />
          <span className="text-[var(--text-muted)]">{ollamaReady ? 'Local AI Ready' : 'AI Offline'}</span>
        </div>
        <span className="text-[var(--text-muted)] truncate max-w-[300px]">{repoPath}</span>
        
        {/* FIX 3: Model Selector with Dropdown UI */}
        <div className="ml-auto relative" ref={selectorRef}>
          <button 
            onClick={() => setShowModelSelector(prev => !prev)} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors bg-transparent border-none p-0 text-[11px] font-sans flex items-center gap-1"
          >
            {activeModel || 'No model selected'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {showModelSelector && (
            <div className="absolute bottom-full right-0 mb-1 w-[250px] max-h-[200px] bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-md shadow-xl z-50 overflow-y-auto">
              {models.length === 0 ? (
                <div className="p-2 text-xs text-[var(--text-muted)]">No local models found. Is Ollama running?</div>
              ) : (
                models.map((model) => (
                  <button
                    key={model.name}
                    onClick={async () => {
                      setActiveModel(model.name);
                      await saveAppState(ACTIVE_MODEL_KEY, model.name);
                      setShowModelSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] transition-colors flex justify-between items-center ${
                      activeModel === model.name ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate">{model.name}</span>
                    {activeModel === model.name && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}