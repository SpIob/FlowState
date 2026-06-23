import { useEffect, useRef } from 'react';

interface Props {
  pluginId: string;
  permission: string;
  onDecision: (granted: boolean) => void;
}

export function PermissionDialog({ pluginId, permission, onDecision }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = dialog.querySelectorAll(focusableSelectors);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDecision(false);
        return;
      }
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [onDecision]);

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div 
        ref={dialogRef}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="permission-dialog-title"
        className="bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-md shadow-2xl p-6 max-w-sm w-full mx-4"
      >
        <h3 id="permission-dialog-title" className="text-base font-normal text-[var(--text-primary)] mb-2">Permission request</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The plugin <span className="font-mono text-[var(--text-primary)]">{pluginId}</span> is requesting access to:
        </p>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md px-3 py-2 mb-6 font-mono text-sm text-[var(--text-primary)]">
          {permission}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => onDecision(false)}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Deny
          </button>
          <button onClick={() => onDecision(true)}
            className="px-4 py-2 text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] rounded-md hover:brightness-110 transition-all">
            Grant access
          </button>
        </div>
      </div>
    </div>
  );
}