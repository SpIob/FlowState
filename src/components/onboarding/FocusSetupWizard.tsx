// src/components/onboarding/FocusSetupWizard.tsx
import { useState } from 'react';
import { Command } from '@tauri-apps/plugin-shell';
import { checkShortcutExists } from '../../lib/tauri';

interface FocusSetupWizardProps {
  onComplete: () => void;
}

export function FocusSetupWizard({ onComplete }: FocusSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleOpenShortcuts = async () => {
    try {
      // Bypasses the deprecated shell:allow-open URL regex validation entirely
      // by spawning the macOS 'open' binary directly.
      await Command.create('open-shortcuts', ['-a', 'Shortcuts']).execute();
    } catch (e) {
      console.error('Failed to open Shortcuts app', e);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setChecking(true);
    try {
      const exists = await checkShortcutExists();
      if (exists) {
        onComplete();
      } else {
        setError("Couldn't find 'FlowState Focus' — check the name matches exactly and try again");
      }
    } catch (e) {
      setError("An error occurred while checking for the shortcut.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-8 max-w-[420px] w-full shadow-2xl relative">
      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              s === step ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 text-center">
            One-time setup for Focus Mode
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 text-center leading-relaxed">
            FlowState detects when you're in deep focus and can automatically enable macOS Focus mode to reduce interruptions. This requires a one-time Shortcut setup since Apple doesn't allow apps to create Focus automations directly.
          </p>
          <button
            onClick={() => setStep(2)}
            className="w-full py-2.5 bg-[var(--accent)] hover:brightness-110 text-white font-medium rounded-md transition-all"
          >
            Get Started
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 text-center">
            Open Shortcuts App
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 text-center leading-relaxed">
            We'll need to create a new shortcut in the macOS Shortcuts app. Click below to open it.
          </p>
          <button
            onClick={handleOpenShortcuts}
            className="w-full py-2.5 bg-[var(--bg-tabbar)] border border-[var(--border)] hover:bg-[var(--bg-titlebar)] text-[var(--text-primary)] font-medium rounded-md transition-all mb-3"
          >
            Open Shortcuts App
          </button>
          <button
            onClick={() => setStep(3)}
            className="w-full py-2.5 bg-[var(--accent)] hover:brightness-110 text-white font-medium rounded-md transition-all mb-2"
          >
            Next
          </button>
          <button
            onClick={() => setStep(1)}
            className="w-full py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm bg-transparent border-none cursor-pointer transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 text-center">
            Create the Shortcut
          </h2>
          <ol className="text-sm text-[var(--text-secondary)] space-y-3 mb-6 list-decimal list-inside marker:text-[var(--accent)] marker:font-bold">
            <li>Click the <span className="font-semibold text-[var(--text-primary)]">+</span> button to create a new Shortcut</li>
            <li>Name it exactly <span className="font-mono bg-[var(--bg-tabbar)] px-1.5 py-0.5 rounded text-[var(--accent)]">FlowState Focus</span></li>
            <li>Search for and add the <span className="font-semibold text-[var(--text-primary)]">"Set Focus"</span> action</li>
            <li>Set the duration to <span className="font-semibold text-[var(--text-primary)]">"On until Turned Off"</span></li>
            <li>Save the Shortcut</li>
          </ol>
          
          <button
            onClick={handleVerify}
            disabled={checking}
            className="w-full py-2.5 bg-[var(--accent)] hover:brightness-110 text-white font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {checking ? 'Checking...' : "I've created it"}
          </button>
          <button
            onClick={() => { setError(null); setStep(2); }}
            className="w-full py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm bg-transparent border-none cursor-pointer transition-colors"
          >
            ← Back
          </button>

          {error && (
            <p className="mt-4 text-sm text-[var(--orange)] text-center bg-[var(--bg-base)] border border-[var(--orange)]/30 p-2 rounded">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}