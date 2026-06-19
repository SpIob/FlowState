// src/components/dashboard/WeightSettings.tsx
import { useState, useEffect } from 'react';

interface Weights {
  pause_proportion: number;
  iki_variance: number;
  backspace_latency: number;
  focus_duration: number;
}

interface WeightSettingsProps {
  weights: Weights;
  onSave: (weights: Weights) => void;
}

const DEFAULTS: Weights = {
  pause_proportion: 0.4,
  iki_variance: 0.25,
  backspace_latency: 0.20,
  focus_duration: 0.15,
};

const LABELS: Record<keyof Weights, string> = {
  pause_proportion: 'Pause Proportion',
  iki_variance: 'Typing Variance',
  backspace_latency: 'Correction Latency',
  focus_duration: 'Focus Duration',
};

export function WeightSettings({ weights, onSave }: WeightSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState<Weights>(weights);

  useEffect(() => {
    setLocal(weights);
  }, [weights]);

  const totalPct = Math.round(
    (local.pause_proportion + local.iki_variance + local.backspace_latency + local.focus_duration) * 100
  );
  const isValid = totalPct === 100;

  const handleSliderChange = (key: keyof Weights, pct: number) => {
    setLocal((prev) => ({ ...prev, [key]: pct / 100 }));
  };

  return (
    <div className="border-t border-[var(--border)] pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-[var(--text-secondary)] uppercase tracking-[0.08em] bg-transparent border-none cursor-pointer"
      >
        {expanded ? '▾' : '▸'} Weight Settings
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 mt-3">
          {(Object.keys(LABELS) as Array<keyof Weights>).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                <span>{LABELS[key]}</span>
                <span>{Math.round(local[key] * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(local[key] * 100)}
                onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}

          <div className="flex items-center justify-between mt-1">
            <span
              className="text-[11px]"
              style={{ color: isValid ? 'var(--accent)' : 'var(--orange)' }}
            >
              Total: {totalPct}%
            </span>
            <button
              onClick={() => setLocal(DEFAULTS)}
              className="text-[11px] text-[var(--text-secondary)] underline bg-transparent border-none cursor-pointer"
            >
              Reset to defaults
            </button>
          </div>

          <button
            onClick={() => onSave(local)}
            disabled={!isValid}
            className="text-[12px] font-medium px-3 py-1.5 rounded mt-1"
            style={{
              backgroundColor: isValid ? 'var(--accent)' : 'var(--bg-tab-active)',
              color: isValid ? '#0d0d0d' : 'var(--text-secondary)',
              cursor: isValid ? 'pointer' : 'default',
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}