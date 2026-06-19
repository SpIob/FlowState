// src/components/dashboard/CognitiveLoadGauge.tsx
interface CognitiveLoadGaugeProps {
  score: number;
  isHighLoad: boolean;
}

export function CognitiveLoadGauge({ score, isHighLoad }: CognitiveLoadGaugeProps) {
  const clamped = Math.max(0, Math.min(1, score));
  const color = isHighLoad ? 'var(--orange)' : 'var(--accent)';

  // Semicircle gauge: 180deg arc, stroke-dasharray trick
  const radius = 80;
  const circumference = Math.PI * radius;
  const fillLength = circumference * clamped;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="200" height="110" viewBox="0 0 200 110">
        {/* Track */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--border)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${fillLength} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }}
        />
      </svg>
      <span className="text-2xl font-semibold" style={{ color }}>
        {clamped.toFixed(2)}
      </span>
      <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-[0.08em]">
        {isHighLoad ? 'High Load' : 'Normal'}
      </span>
    </div>
  );
}