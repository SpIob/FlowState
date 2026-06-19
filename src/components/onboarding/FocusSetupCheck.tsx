// src/components/onboarding/FocusSetupCheck.tsx
import { useEffect, useState } from 'react';
import { checkShortcutExists } from '../../lib/tauri';
import { FocusSetupWizard } from './FocusSetupWizard';

interface FocusSetupCheckProps {
  children: React.ReactNode;
}

export function FocusSetupCheck({ children }: FocusSetupCheckProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    checkShortcutExists()
      .then((exists) => {
        if (isMounted) {
          setNeedsSetup(!exists);
        }
      })
      .catch(() => {
        if (isMounted) {
          // If the check fails entirely, safely assume we don't show the wizard 
          // to avoid blocking the user unexpectedly
          setNeedsSetup(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // While resolving (initial loading state), render only children
  if (needsSetup === null) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {needsSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <FocusSetupWizard onComplete={() => setNeedsSetup(false)} />
        </div>
      )}
    </>
  );
}