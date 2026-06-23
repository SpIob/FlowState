import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorWorkspace } from '../editor/EditorWorkspace';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { ActivityBar, ToolView } from './ActivityBar';
import { ToolPanel } from './ToolPanel';
import { useShortcuts } from '../../hooks/useShortcuts';

interface ResizablePanelsProps {
  repoPath: string;
  activeModel: string;
}

interface PanelState {
  left: number;
  right: number;
  editorHeight: number;
  terminalHeight: number;
}

export function ResizablePanels({ repoPath, activeModel }: ResizablePanelsProps) {
  const [panels, setPanels] = useState<PanelState>({
    left: 65,
    right: 35,
    editorHeight: 60,
    terminalHeight: 40,
  });
  
  const [activeView, setActiveView] = useState<ToolView>('git');
  useShortcuts(setActiveView);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    dividerIndex: number;
    startX: number;
    startY: number;
    startPanels: PanelState;
  } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current || !containerRef.current) return;
    const { dividerIndex, startX, startY, startPanels } = dragStateRef.current;

    if (dividerIndex === 0) {
      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = ((e.clientY - startY) / containerHeight) * 100;
      let newEditor = startPanels.editorHeight + deltaY;
      let newTerminal = startPanels.terminalHeight - deltaY;
      if (newEditor < 20) { newEditor = 20; newTerminal = 100 - newEditor; } 
      else if (newTerminal < 10) { newTerminal = 10; newEditor = 100 - newTerminal; }
      setPanels({ ...startPanels, editorHeight: newEditor, terminalHeight: newTerminal });
    } else {
      const containerWidth = containerRef.current.offsetWidth;
      const deltaX = ((e.clientX - startX) / containerWidth) * 100;
      let newLeft = startPanels.left + deltaX;
      let newRight = startPanels.right - deltaX;
      if (newLeft < 30) { newLeft = 30; newRight = 100 - newLeft; } 
      else if (newRight < 25) { newRight = 25; newLeft = 100 - newRight; }
      setPanels({ ...startPanels, left: newLeft, right: newRight });
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragStateRef.current = null;
    document.body.classList.remove('is-dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const startDrag = (dividerIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.classList.add('is-dragging');
    dragStateRef.current = {
      dividerIndex,
      startX: e.clientX,
      startY: e.clientY,
      startPanels: { ...panels },
    };
    document.body.style.cursor = dividerIndex === 0 ? 'row-resize' : 'col-resize';
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
    <>
      <style>{`
        .smooth-panel { transition: width 0.25s ease, height 0.25s ease; }
        .is-dragging .smooth-panel { transition: none !important; }
        .is-dragging { cursor: col-resize !important; }
      `}</style>

      <div ref={containerRef} className="flex flex-1 min-h-0 w-full h-full overflow-hidden">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden smooth-panel" style={{ width: `${panels.left}%` }}>
          <div className="min-h-0 overflow-hidden smooth-panel" style={{ height: `${panels.editorHeight}%` }}>
            <EditorWorkspace repoPath={repoPath} activeModel={activeModel} />
          </div>

          <div className="relative h-0 shrink-0">
            <div className="absolute inset-x-0 -top-1 -bottom-1 z-10 cursor-row-resize" onMouseDown={startDrag(0)} />
            <div className="absolute inset-x-0 top-0 h-px bg-[var(--border-subtle)] pointer-events-none" />
          </div>

          <div className="min-h-0 overflow-hidden smooth-panel" style={{ height: `${panels.terminalHeight}%` }}>
            <TerminalPanel repoPath={repoPath} />
          </div>
        </div>

        {/* VERTICAL DIVIDER */}
        <div className="relative w-0 shrink-0">
          <div className="absolute inset-y-0 -left-1 -right-1 z-10 cursor-col-resize" onMouseDown={startDrag(1)} />
          <div className="absolute inset-y-0 left-0 w-px bg-[var(--border-subtle)] pointer-events-none" />
        </div>

        {/* RIGHT COLUMN */}
        <div className="h-full flex min-h-0 overflow-hidden smooth-panel" style={{ width: `${panels.right}%` }}>
          <ActivityBar activeView={activeView} onViewChange={setActiveView} />
          <div className="flex-1 min-h-0 h-full overflow-hidden">
            <ToolPanel activeView={activeView} repoPath={repoPath} activeModel={activeModel} />
          </div>
        </div>
      </div>
    </>
  );
}