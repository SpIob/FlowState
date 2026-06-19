import { useEffect, useRef, useCallback } from 'react';
import { recordSignal } from '../lib/tauri';

interface KeystrokeEvent {
  key: string;
  timestampMs: number;
}

export function useSignalCollector() {
  const keystrokeBuffer = useRef<KeystrokeEvent[]>([]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (keystrokeBuffer.current.length > 0) {
        const batch = [...keystrokeBuffer.current];
        keystrokeBuffer.current = [];
        recordSignal('keystroke_batch', { events: batch }).catch(console.error);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  const recordKeystroke = useCallback((key: string, timestampMs: number) => {
    keystrokeBuffer.current.push({ key, timestampMs });
  }, []);

  const recordFocusChange = useCallback((focused: boolean) => {
    recordSignal('focus_change', { focused, timestampMs: Date.now() }).catch(console.error);
  }, []);

  const recordError = useCallback((errorType: string, context: string) => {
    recordSignal('error', { errorType, context, timestampMs: Date.now() }).catch(console.error);
  }, []);

  return {
    recordKeystroke,
    recordFocusChange,
    recordError,
  };
}