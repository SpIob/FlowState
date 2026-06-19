import { useCognitiveScore } from '../../hooks/useCognitiveScore';
import { CognitiveLoadGauge } from './CognitiveLoadGauge';
import { SignalBreakdown } from './SignalBreakdown';
import { WeightSettings } from './WeightSettings';

export function DashboardPanel() {
  // Removed unused 'loading' variable to satisfy strict TS compiler
  const { score, weights, setWeights } = useCognitiveScore();

  if (!score) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-6 opacity-20 text-[var(--text-primary)]">
          <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <text
              x="50%"
              y="54%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              F
            </text>
          </svg>
        </div>
        <h2 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
          Cognitive load tracking is collecting data.
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
          Insights will appear here once enough usage data is available.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 overflow-y-auto scrollbar-thin">
      <CognitiveLoadGauge score={score.score} isHighLoad={score.is_high_load} />
      <SignalBreakdown signals={score.signals} />
      {weights && <WeightSettings weights={weights} onSave={setWeights} />}
    </div>
  );
}