// src/components/ai/ModelSwitcher.tsx
import { useState, useRef, useEffect } from 'react';
import { OllamaModel } from '../../types/ai.types';

interface ModelSwitcherProps {
  models: OllamaModel[];
  activeModel: string;
  onSelect: (name: string) => void;
  ollamaReady: boolean;
}

export function ModelSwitcher({ models, activeModel, onSelect, ollamaReady }: ModelSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(1)} MB`;
  };

  const displayName = activeModel.length > 20 ? activeModel.slice(0, 20) + '…' : activeModel;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-transparent border-none cursor-pointer text-[11px]"
      >
        {ollamaReady ? (
          <span className="text-[var(--text-secondary)]">{displayName} ▾</span>
        ) : (
          <span className="text-[var(--orange)]">Ollama offline ▾</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-[#111111] border border-[#2a2a2a] rounded min-w-[220px] shadow-[0_-4px_16px_rgba(0,0,0,0.5)] z-50 py-1">
          {models.map((model) => (
            <div
              key={model.name}
              onClick={() => {
                onSelect(model.name);
                setOpen(false);
              }}
              className="h-7 px-3 flex flex-row items-center gap-2 cursor-pointer hover:bg-[#1a1a1a]"
            >
              <div className="w-3 flex-shrink-0 flex items-center justify-center">
                {model.name === activeModel && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              <span className="text-[var(--text-primary)] text-xs flex-1 truncate">
                {model.name}
              </span>
              <span className="text-[var(--text-secondary)] text-[11px] text-right">
                {formatSize(model.size)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}