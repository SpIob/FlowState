/* src/components/layout/StatusBar.tsx */
export function StatusBar() {
  return (
    <div className="h-6 flex items-center px-3 text-[11px] bg-[var(--bg-statusbar)] border-t border-[var(--border)] text-[var(--text-secondary)]">
      {/* Left group */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--accent)]">main</span>
        </div>
      </div>

      {/* Center group */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span>Ln 22, Col 43</span>
      </div>

      {/* Right group */}
      <div className="ml-auto flex items-center gap-3">
        <span>Rust</span>
        <span className="text-[var(--text-tertiary)]">·</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--accent)]">Local AI Ready</span>
        </div>
      </div>
    </div>
  );
}