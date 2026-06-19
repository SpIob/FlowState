// src/hooks/useTerminal.ts
import { useEffect, useState, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { listen } from '@tauri-apps/api/event';
import { spawnShell, writeToShell, killShell } from '../lib/tauri';
import { useSignalCollector } from './useSignalCollector';
import 'xterm/css/xterm.css'; 

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>, repoPath: string) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const { recordKeystroke } = useSignalCollector();
  
  // Use a ref to prevent useEffect from re-running when the callback identity changes
  const recordKeystrokeRef = useRef(recordKeystroke);
  useEffect(() => {
    recordKeystrokeRef.current = recordKeystroke;
  }, [recordKeystroke]);

  useEffect(() => {
    if (!containerRef.current || !repoPath) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    setTerminal(term);

    spawnShell(repoPath).catch((err) => {
      term.write(`\r\n[Error spawning shell: ${err}]\r\n`);
    });

    let unlisten: (() => void) | undefined;
    listen<string>('terminal-output', (event) => {
      term.write(event.payload);
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    const dataDisposable = term.onData((data) => {
      writeToShell(data).catch(console.error);

      if (data === '\x7f' || data === '\b') {
        recordKeystrokeRef.current('Backspace', Date.now());
      } else if (data.length === 1) {
        recordKeystrokeRef.current(data, Date.now());
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      unlisten?.();
      term.dispose();
      // CRITICAL FIX: Kill the backend PTY process on unmount
      killShell().catch(console.error);
    };
  }, [containerRef, repoPath]); // recordKeystroke removed from deps

  return { terminal };
}