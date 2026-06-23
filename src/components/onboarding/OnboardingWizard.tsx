import { useState, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { saveAppState, listModels, checkOllama } from '../../lib/tauri';
import { OllamaModel } from '../../types/ai.types';

interface Props {
  onComplete: (repoPath: string, activeModel: string) => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [ollamaReady, setOllamaReady] = useState(false);
  
  const wizardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOllama().then(setOllamaReady);
    listModels().then(m => {
      setModels(m);
      if (m.length > 0) setActiveModel(m[0].name);
    });
  }, []);

  // Strict Focus Trap
  useEffect(() => {
    const dialog = wizardRef.current;
    if (!dialog) return;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = dialog.querySelectorAll(focusableSelectors);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable?.focus(); }
      } else {
        if (document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable?.focus(); }
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  const handleSelectFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      const pathStr = Array.isArray(selected) ? selected[0] : selected;
      setRepoPath(pathStr);
    }
  };

  const handleFinish = async () => {
    if (repoPath) await saveAppState('repo_path', repoPath);
    if (activeModel) await saveAppState('active_model', activeModel);
    await saveAppState('onboarding_completed', 'true');
    onComplete(repoPath || '', activeModel);
  };

  const canProceed = step === 1 ? !!repoPath : step === 2 ? !!activeModel : true;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={wizardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md shadow-2xl max-w-lg w-full p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest">Step {step} of 3</span>
          <h2 id="wizard-title" className="text-xl font-normal text-[var(--text-primary)]">
            {step === 1 && 'Select a workspace'}
            {step === 2 && 'Local AI setup'}
            {step === 3 && 'The Deep Work Engine'}
          </h2>
        </div>

        <div className="flex-1 min-h-[160px]">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-secondary)]">
                FlowState operates on a local repository. Select a folder to begin.
              </p>
              <button 
                onClick={handleSelectFolder}
                className="w-full py-3 px-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-colors text-left flex justify-between items-center"
              >
                <span className="truncate">{repoPath || 'Click to select folder...'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2 text-[var(--text-muted)]"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ollamaReady ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
                <span className="text-sm text-[var(--text-secondary)]">
                  {ollamaReady ? 'Ollama is running locally' : 'Ollama not detected. AI features will be disabled.'}
                </span>
              </div>
              {ollamaReady && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--text-muted)]">Default model</label>
                  <select 
                    value={activeModel} 
                    onChange={(e) => setActiveModel(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] outline-none appearance-none cursor-pointer"
                  >
                    {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4 text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                FlowState passively measures your cognitive load through behavioral signals like keystroke velocity, error rates, and pause proportions.
              </p>
              <p>
                When you enter a flow state, FlowState can automatically trigger OS-level Focus Mode to block interruptions and progressively simplify the UI to eliminate visual noise.
              </p>
              <p className="text-[var(--text-muted)] text-xs italic">
                All signal processing happens locally on your machine. Zero telemetry.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
          <button 
            onClick={() => setStep(s => s - 1)}
            className={`text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ${step === 1 ? 'invisible' : ''}`}
          >
            Back
          </button>
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed}
              className="px-4 py-2 text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] rounded-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleFinish}
              className="px-4 py-2 text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] rounded-md hover:brightness-110 transition-all"
            >
              Enter FlowState
            </button>
          )}
        </div>
      </div>
    </div>
  );
}