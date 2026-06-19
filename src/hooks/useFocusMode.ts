// FILE 11: src/hooks/useFocusMode.ts
import { useState, useEffect, useRef } from 'react';
import type { CognitiveScoreResult } from '../types/cognitive.types';
import { triggerFocusMode } from '../lib/tauri';

export function useFocusMode(score: CognitiveScoreResult | null) {
  const [focusModeTriggered, setFocusModeTriggered] = useState(false);
  const previousIsHighLoad = useRef<boolean>(false);

  useEffect(() => {
    if (!score) return;

    // Detect transition from false to true
    if (score.is_high_load && !previousIsHighLoad.current) {
      triggerFocusMode()
        .then(() => {
          setFocusModeTriggered(true);
        })
        .catch((err) => {
          console.error('Failed to trigger focus mode:', err);
        });
    }

    previousIsHighLoad.current = score.is_high_load;
  }, [score]);

  return { focusModeTriggered };
}