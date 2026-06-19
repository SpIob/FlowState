// src/components/dashboard/SignalBreakdown.tsx
interface SignalBreakdownProps {
  signals: {
    pause_proportion: number;
    iki_variance: number;
    backspace_latency: number;
    focus_duration: number;
  };
}

const SIGNAL_LABELS: Record<keyof SignalBreakdownProps['signals'], string> = {
  pause_proportion: 'Pause Proportion',
  iki_variance: 'Typing Variance',
  backspace_latency: 'Correction Latency',
  focus_duration: 'Focus Duration',
};

export function SignalBreakdown({ signals }: SignalBreakdownProps) {
  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(SIGNAL_LABELS) as Array<keyof typeof SIGNAL_LABELS>).map((key) => {
        const value = Math.max(0, Math.min(1, signals[key]));
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
              <span>{SIGNAL_LABELS[key]}</span>
              <span>{(value * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${value * 100}%`, transition: 'width 0.3s ease' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}