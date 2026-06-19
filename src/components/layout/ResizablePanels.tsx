// src/components/layout/ResizablePanels.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorWorkspace } from '../editor/EditorWorkspace';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { GitPanel } from '../git/GitPanel';

interface ResizablePanelsProps {
  repoPath: string;
  activeModel: string;
}

interface PanelState {
  editor: number;
  terminal: number;
  git: number;
}

export function ResizablePanels({ repoPath, activeModel }: ResizablePanelsProps) {
  const [panels, setPanels] = useState<PanelState>({
    editor: 50,
    terminal: 25,
    git: 25,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    dividerIndex: number;
    startX: number;
    startPanels: PanelState;
  } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current) return;

    const { dividerIndex, startX, startPanels } = dragStateRef.current;
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
    const delta = ((e.clientX - startX) / containerWidth) * 100;

    if (dividerIndex === 0) {
      const newEditor = startPanels.editor + delta;
      const newTerminal = startPanels.terminal - delta;

      if (newEditor >= 30 && newTerminal >= 15) {
        setPanels({ ...startPanels, editor: newEditor, terminal: newTerminal });
      } else if (newEditor < 30) {
        const clampedEditor = 30;
        const clampedTerminal = startPanels.terminal + (startPanels.editor - clampedEditor);
        if (clampedTerminal >= 15) {
          setPanels({ ...startPanels, editor: clampedEditor, terminal: clampedTerminal });
        }
      } else if (newTerminal < 15) {
        const clampedTerminal = 15;
        const clampedEditor = startPanels.editor + (startPanels.terminal - clampedTerminal);
        if (clampedEditor >= 30) {
          setPanels({ ...startPanels, editor: clampedEditor, terminal: clampedTerminal });
        }
      }
    } else {
      const newTerminal = startPanels.terminal + delta;
      const newGit = startPanels.git - delta;

      if (newTerminal >= 15 && newGit >= 15) {
        setPanels({ ...startPanels, terminal: newTerminal, git: newGit });
      } else if (newTerminal < 15) {
        const clampedTerminal = 15;
        const clampedGit = startPanels.git + (startPanels.terminal - clampedTerminal);
        if (clampedGit >= 15) {
          setPanels({ ...startPanels, terminal: clampedTerminal, git: clampedGit });
        }
      } else if (newGit < 15) {
        const clampedGit = 15;
        const clampedTerminal = startPanels.terminal + (startPanels.git - clampedGit);
        if (clampedTerminal >= 15) {
          setPanels({ ...startPanels, terminal: clampedTerminal, git: clampedGit });
        }
      }
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragStateRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const startDrag = (dividerIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragStateRef.current = {
      dividerIndex,
      startX: e.clientX,
      startPanels: { ...panels },
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Editor Panel */}
      <div className="h-full overflow-hidden" style={{ width: `${panels.editor}%` }}>
        <EditorWorkspace repoPath={repoPath} activeModel={activeModel} />
      </div>

      {/* Divider 1 */}
      <div
        className="w-px bg-[var(--border)] cursor-col-resize hover:bg-[var(--accent)] transition-colors shrink-0"
        onMouseDown={startDrag(0)}
      />

      {/* Terminal Panel */}
      <div className="h-full overflow-hidden" style={{ width: `${panels.terminal}%` }}>
        <TerminalPanel repoPath={repoPath} />
      </div>

      {/* Divider 2 */}
      <div
        className="w-px bg-[var(--border)] cursor-col-resize hover:bg-[var(--accent)] transition-colors shrink-0"
        onMouseDown={startDrag(1)}
      />

      {/* Git Panel */}
      <div className="h-full overflow-hidden" style={{ width: `${panels.git}%` }}>
        <GitPanel repoPath={repoPath} activeModel={activeModel} />
      </div>
    </div>
  );
}