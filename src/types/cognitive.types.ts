// FILE 8: src/types/cognitive.types.ts
export interface ScoringWeights {
  pause_proportion: number;
  iki_variance: number;
  backspace_latency: number;
  focus_duration: number;
}

export interface SignalBreakdown {
  pause_proportion: number;
  iki_variance: number;
  backspace_latency: number;
  focus_duration: number;
}

export interface CognitiveScoreResult {
  score: number;
  signals: SignalBreakdown;
  is_high_load: boolean;
}