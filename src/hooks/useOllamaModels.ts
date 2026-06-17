// src/hooks/useOllamaModels.ts
import { useState, useEffect, useCallback } from 'react';
import { checkOllama, listModels } from '../lib/tauri';
import { loadState, saveState } from '../lib/db';
import type { OllamaModel } from '../types/ai.types';

export function useOllamaModels() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [activeModel, setActiveModelState] = useState<string>('qwen2.5-coder:1.5b');
  const [ollamaReady, setOllamaReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const savedModel = await loadState('activeModel');
        if (savedModel && mounted) {
          setActiveModelState(savedModel);
        }

        const isReady = await checkOllama();
        if (!mounted) return;
        setOllamaReady(isReady);

        if (!isReady) {
          setError("Ollama not running. Start it with: ollama serve");
          setLoading(false);
          return;
        }

        const fetchedModels = await listModels();
        if (!mounted) return;
        
        setModels(fetchedModels);
        
        if (fetchedModels.length > 0) {
          if (!savedModel || !fetchedModels.some(m => m.name === savedModel)) {
            setActiveModelState(fetchedModels[0].name);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Failed to connect to Ollama");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const setActiveModel = useCallback(async (name: string) => {
    setActiveModelState(name);
    try {
      await saveState('activeModel', name);
    } catch (err) {
      console.error("Failed to save active model", err);
    }
  }, []);

  return {
    models,
    activeModel,
    setActiveModel,
    ollamaReady,
    loading,
    error,
  };
}