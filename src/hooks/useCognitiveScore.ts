// FILE 10: src/hooks/useCognitiveScore.ts
import { useState, useEffect, useCallback } from 'react';
import type { ScoringWeights, CognitiveScoreResult } from '../types/cognitive.types';
import {
  getScoringWeights,
  updateScoringWeights,
  computeCognitiveScore,
} from '../lib/tauri';

export function useCognitiveScore() {
  const [score, setScore] = useState<CognitiveScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeightsState] = useState<ScoringWeights | null>(null);

  const fetchScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await computeCognitiveScore();
      setScore(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute score');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeights = useCallback(async () => {
    try {
      const result = await getScoringWeights();
      setWeightsState(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weights');
    }
  }, []);

  const setWeights = useCallback(async (newWeights: ScoringWeights) => {
    try {
      await updateScoringWeights(newWeights);
      setWeightsState(newWeights);
      // Immediately re-fetch score after weight change
      await fetchScore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update weights');
    }
  }, [fetchScore]);

  useEffect(() => {
    fetchWeights();
    fetchScore();

    const interval = setInterval(() => {
      fetchScore();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchScore, fetchWeights]);

  return {
    score,
    loading,
    error,
    weights,
    setWeights,
  };
}