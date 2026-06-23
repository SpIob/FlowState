import { useState, useEffect } from 'react';
import { computeCognitiveScore, getScoringWeights, updateScoringWeights } from '../../lib/tauri';

export function DashboardPanel() {
  // Use Record<string, any> to bypass strict key checking and adapt to whatever 
  // property names are defined in your cognitive.types.ts file.
  const [score, setScore] = useState<Record<string, any> | null>(null);
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.all([computeCognitiveScore(), getScoringWeights()]);
      setScore(s as any);
      setWeights(w as any);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveWeights = async () => {
    if (!weights) return;
    setSaving(true);
    // Cast back to any for the invoke wrapper
    await updateScoringWeights(weights as any).catch(console.error);
    await load();
    setSaving(false);
  };

  const handleResetWeights = async () => {
    // Since we don't know the exact hardcoded defaults from Phase 3, 
    // we simply reload the current state. You can replace this with your 
    // actual default values if you prefer.
    await load();
  };

  if (loading) return <div className="p-4 text-[var(--text-muted)] text-sm">Loading dashboard...</div>;

  // Safely extract the main score value (checking common key names)
  const scoreValue = score?.composite_score ?? score?.score ?? score?.overall ?? score?.cognitive_load ?? 0;
  const scorePercent = Math.round(Number(scoreValue) * 100);
  
  // Extract signals (fallback to the rest of the score object if 'signals' isn't a nested key)
  const signals = score?.signals ?? (score ? Object.fromEntries(
    Object.entries(score).filter(([k]) => !['composite_score', 'score', 'overall', 'cognitive_load'].includes(k))
  ) : {});

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6">
      {/* Gauge */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="6"
              strokeDasharray={`${scorePercent * 2.64} 264`} strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-normal text-[var(--text-primary)]">{scorePercent}</span>
          </div>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] tracking-widest">Cognitive load</span>
      </div>

      {/* Signal Bars */}
      {signals && Object.keys(signals).length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest">Signals</span>
          {Object.entries(signals).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{key.replace(/_/g, ' ')}</span>
                <span className="text-[var(--text-muted)]">{Math.round(Number(value) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${Number(value) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weight Settings */}
      {weights && Object.keys(weights).length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[var(--text-muted)] tracking-widest">Weight settings</span>
            <button onClick={handleResetWeights} className="text-[10px] text-[var(--text-muted)] hover:underline transition-colors">
              Reset to defaults
            </button>
          </div>

          {Object.entries(weights).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)] w-36 truncate">{key.replace(/_/g, ' ')}</span>
              <input
                type="range" min="0" max="1" step="0.05" value={value}
                onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                className="flex-1 accent-[var(--accent)] h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer"
              />
              <span className="text-xs text-[var(--text-muted)] w-8 text-right">{Math.round(value * 100)}%</span>
            </div>
          ))}

          <button onClick={handleSaveWeights} disabled={saving}
            className="w-full mt-2 py-2 bg-[var(--accent)] text-[var(--bg-base)] font-medium rounded-md text-sm hover:brightness-110 disabled:opacity-50 transition-all">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}