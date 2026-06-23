// src/hooks/useShortcuts.ts
import { useEffect } from 'react';
import { ToolView } from '../components/layout/ActivityBar';

export function useShortcuts(onViewChange: (view: ToolView) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') { e.preventDefault(); onViewChange('git'); }
        else if (e.key === '2') { e.preventDefault(); onViewChange('ci'); }
        else if (e.key === '3') { e.preventDefault(); onViewChange('database'); }
        else if (e.key === '4') { e.preventDefault(); onViewChange('docs'); }
        else if (e.key === '5') { e.preventDefault(); onViewChange('plugins'); }
        else if (e.key === '6') { e.preventDefault(); onViewChange('ai'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewChange]);
}